import { getProjectDetail, getTestExecutionDetail, ProjectDetail, TestExecutionDetail } from "./helper";
import * as vscode from 'vscode';


async function runAllKarateTests(args)
{
  let tedArray: TestExecutionDetail[] = await getTestExecutionDetail(args.uri, args.type);

  let commandArgs = new Array();
  commandArgs.push(tedArray[0].karateOptions);
  commandArgs.push(tedArray[0].karateJarOptions);
  commandArgs.push(args.uri);
  commandArgs.push(args.type);

  runKarateTest(commandArgs);
}

async function runKarateTest(args)
{  
  let karateRunner = null;
  let karateOptions: String = args[0];
  let karateJarOptions: String = args[1];
  let targetTestUri: vscode.Uri = args[2];
  let targetTestUriType: vscode.FileType = args[3];

  let mavenCmd = "mvn";
  let gradleCmd = "gradle";
  let karateJarCmd = "java -jar karate.jar";
  let mavenBuildFile = "pom.xml";
  let gradleBuildFile = "build.gradle";
  let standaloneBuildFile = "karate.jar";
  let mavenBuildFileSwitch = "-f";
  let gradleBuildFileSwitch = "-b";

  let runPhases = null;
  let runCommandPrefix = null;
  let runCommand = null;

  let projectDetail: ProjectDetail = getProjectDetail(targetTestUri, targetTestUriType);
  let projectRootPath = projectDetail.projectRoot;
  let runFilePath = projectDetail.runFile;


  if(runFilePath == "")
  {
    return;
  }

  if(!runFilePath.toLowerCase().endsWith(standaloneBuildFile))
  {
    if(Boolean(vscode.workspace.getConfiguration('karateRunner.karateRunner').get('promptToSpecify')))
    {
      karateRunner = await vscode.window.showInputBox
      (
        {
          prompt: "Karate Runner",
          value: String(vscode.workspace.getConfiguration('karateRunner.karateRunner').get('default'))
        }
      );
  
      if(karateRunner !== undefined && karateRunner !== "")
      {
        await vscode.workspace.getConfiguration().update('karateRunner.karateRunner.default', karateRunner)
      }
    }
    else
    {
      karateRunner = String(vscode.workspace.getConfiguration('karateRunner.karateRunner').get('default'));
    }

    if(karateRunner === undefined || karateRunner === "")
    {
      return;
    }

    if(Boolean(vscode.workspace.getConfiguration('karateRunner.buildDirectory').get('cleanBeforeEachRun')))
    {
      runPhases = "clean test";
    }
    else
    {
      runPhases = "test";
    }
  
    if(runFilePath.toLowerCase().endsWith(mavenBuildFile))
    {
      runCommandPrefix = `${mavenCmd} ${runPhases} ${mavenBuildFileSwitch}`;
    }
  
    if(runFilePath.toLowerCase().endsWith(gradleBuildFile))
    {
      runCommandPrefix = `${gradleCmd} ${runPhases} ${gradleBuildFileSwitch}`;
    }
  
    if(runCommandPrefix == null)
    {
      return;
    }

    runCommand = `${runCommandPrefix} "${runFilePath}" -Dtest=${karateRunner} -Dkarate.options="${karateOptions}"`; 
  }
  else
  {
    let karateJarArgs = String(vscode.workspace.getConfiguration('karateRunner.karateJar').get('commandLineArgs'));

    if(karateJarArgs !== undefined && karateJarArgs !== "")
    {
      karateJarArgs = `${karateJarArgs} `;
    }
    else
    {
      karateJarArgs = "";
    }

    runCommand = `${karateJarCmd} ${karateJarArgs}${karateJarOptions}`;
  }

  let relativePattern = new vscode.RelativePattern(projectRootPath, String(vscode.workspace.getConfiguration('karateRunner.buildReports').get('toTarget')));
  let watcher = vscode.workspace.createFileSystemWatcher(relativePattern);
  let reportUrisFound: vscode.Uri[] = [];

  watcher.onDidCreate((e) => 
  {
    if(reportUrisFound.toString().indexOf(e.toString()) === -1)
    {
      reportUrisFound.push(e);
    }
  });

  watcher.onDidChange((e) =>
  {
    if(reportUrisFound.toString().indexOf(e.toString()) === -1)
    {
      reportUrisFound.push(e);
    }
  });

  let seo: vscode.ShellExecutionOptions = { cwd: projectRootPath }
  let exec = new vscode.ShellExecution(runCommand, seo);
  let task = new vscode.Task
  (
    { type: 'karate' },
    vscode.TaskScope.Global,
    'Karate Runner',
    'karate',
    exec,
    []
  );

  /*
  tasks.onDidStartTask((e) => 
  {
    if(e.execution.task.name == 'Karate Runner')
    {
    }
  });
  */

  vscode.tasks.onDidEndTask((e) => 
  {
    if(e.execution.task.name == 'Karate Runner')
    {
      watcher.dispose();

      if(Boolean(vscode.workspace.getConfiguration('karateRunner.buildReports').get('openAfterEachRun')))
      {
        reportUrisFound.forEach((reportUri) => 
        {
          openBuildReport(reportUri);
        });
      }
    }

    reportUrisFound = [];
  });

  vscode.tasks.executeTask(task);
}

function openBuildReport(reportUri)
{
  vscode.env.openExternal(reportUri);
}

function openFileInEditor(args)
{
  let fileUri = args.uri;
  vscode.window.showTextDocument(fileUri);
}

export { runKarateTest, runAllKarateTests, openBuildReport, openFileInEditor };