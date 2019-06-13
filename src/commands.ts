import * as vscode from 'vscode';


async function runKarateTest(args)
{  
  let karateRunner = null;
  let karateOptions = String(args[0]);
  let projectRootPath = String(args[1]);
  let buildFilePath = String(args[2]);

  if(buildFilePath == "")
  {
    return;
  }

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

  if(karateRunner !== undefined && karateRunner !== "")
  {
    let mavenCmd = "mvn";
    let gradleCmd = "gradle";
    let mavenBuildFile = "pom.xml";
    let gradleBuildFile = "build.gradle";
    let mavenBuildFileSwitch = "-f";
    let gradleBuildFileSwitch = "-b";

    let runPhases = null;
    let runCommandPrefix = null;

    if(Boolean(vscode.workspace.getConfiguration('karateRunner.buildDirectory').get('cleanBeforeEachRun')))
    {
      runPhases = "clean test";
    }
    else
    {
      runPhases = "test";
    }

    if(buildFilePath.toLowerCase().endsWith(mavenBuildFile))
    {
      runCommandPrefix = mavenCmd + " " + runPhases + " " + mavenBuildFileSwitch;
    }

    if(buildFilePath.toLowerCase().endsWith(gradleBuildFile))
    {
      runCommandPrefix = gradleCmd + " " + runPhases + " " + gradleBuildFileSwitch;
    }

    if(runCommandPrefix == null)
    {
      return;
    }

    let runCommand = runCommandPrefix + " \"" + buildFilePath + "\" -Dtest=" + karateRunner + " -Dkarate.options=\"" + karateOptions + "\""; 
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
}

function openBuildReport(reportUri)
{
  vscode.env.openExternal(reportUri);
}

export { runKarateTest, openBuildReport };
