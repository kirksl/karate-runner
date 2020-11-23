import { getProjectDetail, getTestExecutionDetail, getActiveFeatureFile, IProjectDetail, ITestExecutionDetail } from "./helper";
import { Feature, ISection } from "./feature";
import ProviderStatusBar from "./providerStatusBar";
import ProviderExecutions from "./providerExecutions";
import parse = require('parse-curl');
import * as vscode from 'vscode';
let os = require('os')

let debugLineNumber: number = 0;


async function smartPaste()
{
  const curlIgnores = ['accept-', 'upgrade-', 'user-', 'connection', 'referer', 'sec-', 'origin', 'host', 'content-length'];

  let curlIgnoreHeader = (header: string) =>
  {
    for (let ignore of curlIgnores)
    {
      if (header.toLowerCase().startsWith(ignore))
      {
        return true;
      }
    }

    return false;
  }

  let convertCurl = (raw: string) =>
  {
    let steps: Array<string> = [];
    raw = raw.replace('--data-binary', '--data');
    const curl: object = parse(raw);
    steps.push('* url \'' + curl['url'] + '\'');
    const headers: object = curl['header'] || {};

    for (let key of Object.keys(headers))
    {
      if (curlIgnoreHeader(key))
      {
        continue;
      }

      let val: string = headers[key];
      steps.push('* header ' + key + ' = \'' + val + '\'');
    }

    let method: string = curl['method'];
    let body = curl['body'];

    if (!body && (method === 'POST' || method === 'PUT' || method === 'PATCH'))
    {
      body = '\'\'';
    }

    if (body)
    {
      steps.push('* request ' + body);
    }

    steps.push('* method ' + method.toLowerCase());
    return steps.join('\n');
  }

  let editor = vscode.window.activeTextEditor;
  let start = editor.selection.start;

  vscode.commands.executeCommand('editor.action.clipboardPasteAction').then(() =>
  {
    let end = editor.selection.end;
    let selection = new vscode.Selection(start.line, start.character, end.line, end.character);
    let selectedText = editor.document.getText(selection).trim();

    if (selectedText.startsWith('curl'))
    {
      editor.edit((editBuilder: vscode.TextEditorEdit) =>
      {
        editBuilder.replace(selection, convertCurl(selectedText) + '\n');
        editor.revealRange(new vscode.Range(start, start));
      });
    }
  })
}

async function getDebugFile()
{
  let debugLine: string = (debugLineNumber === 0) ? "" : `:${debugLineNumber}`;
  debugLineNumber = 0;

  let activeKarateFile: string = await getActiveFeatureFile();

  if (activeKarateFile !== null)
  {
    return activeKarateFile + debugLine;
  }
  else
  {
    return "";
  }
}

async function getDebugBuildFile()
{
  let activeKarateFile: string = await getActiveFeatureFile();

  if (activeKarateFile !== null)
  {
    let projectDetail: IProjectDetail = getProjectDetail(vscode.Uri.file(activeKarateFile), vscode.FileType.File);
    return projectDetail.runFile;
  }
  else
  {
    return "";
  }
}

async function runAllKarateTests(args = null)
{
  if (args === null)
  {
    args = {};
    args.uri = vscode.window.activeTextEditor.document.uri;
    args.type = vscode.FileType.File;
  }

  let tedArray: ITestExecutionDetail[] = await getTestExecutionDetail(args.uri, args.type);

  let commandArgs = new Array();
  commandArgs.push(tedArray[0].karateOptions);
  commandArgs.push(tedArray[0].karateJarOptions);
  commandArgs.push(args.uri);
  commandArgs.push(args.type);

  runKarateTest(commandArgs);
}

async function runKarateTest(args = null)
{
  if (args === null)
  {
    let activeEditor: vscode.TextEditor = vscode.window.activeTextEditor;
    let activeLine = activeEditor.selection.active.line;

    let feature: Feature = new Feature(activeEditor.document);
    let sections: ISection[] = feature.getTestSections();
    let activeSection = sections.find((section) =>
    {
      return activeLine >= section.startLine && activeLine <= section.endLine;
    });

    if (activeSection === undefined) { return; }

    let tedArray: ITestExecutionDetail[] = await getTestExecutionDetail(activeEditor.document.uri, vscode.FileType.File);
    let ted: ITestExecutionDetail = tedArray.find((ted) =>
    {
      return ted.codelensLine === activeSection.startLine;
    });

    if (ted === undefined) { return; }

    args = [];
    args[0] = ted.karateOptions;
    args[1] = ted.karateJarOptions;
    args[2] = activeEditor.document.uri;
    args[3] = vscode.FileType.File;
  }

  let karateRunner = null;
  let karateOptions: String = args[0];
  let karateJarOptions: String = args[1];
  let targetTestUri: vscode.Uri = args[2];
  let targetTestUriType: vscode.FileType = args[3];

  let mavenCmd = "mvn";
  let gradleCmd = "gradle";
  let mavenBuildFile = "pom.xml";
  let gradleGroovyBuildFile = "build.gradle";
  let gradleKotlinBuildFile = "build.gradle.kts";
  let standaloneBuildFile = "karate.jar";
  let mavenBuildFileSwitch = "-f";
  let gradleBuildFileSwitch = "-b";

  let runPhases = null;
  let runCommandPrefix = null;
  let runCommand = null;

  let projectDetail: IProjectDetail = getProjectDetail(targetTestUri, targetTestUriType);
  let projectRootPath = projectDetail.projectRoot;
  let runFilePath = projectDetail.runFile;


  if (runFilePath === "")
  {
    return;
  }

  if (!runFilePath.toLowerCase().endsWith(standaloneBuildFile))
  {
    if (Boolean(vscode.workspace.getConfiguration('karateRunner.buildSystem').get('useWrapper')))
    {
      if (os.platform() == 'win32')
      {
        mavenCmd = "mvnw";
        gradleCmd = "gradlew";
      }
      else
      {
        mavenCmd = "./mvnw";
        gradleCmd = "./gradlew";
      }
    }

    if (Boolean(vscode.workspace.getConfiguration('karateRunner.buildDirectory').get('cleanBeforeEachRun')))
    {
      runPhases = "clean test";
    }
    else
    {
      runPhases = "test";
    }

    let karateRunnerArgs = String(vscode.workspace.getConfiguration('karateRunner.karateRunner').get('commandLineArgs'));
  
    if (Boolean(vscode.workspace.getConfiguration('karateRunner.karateCli').get('overrideKarateRunner')))
    {
      let karateCliArgs = String(vscode.workspace.getConfiguration('karateRunner.karateCli').get('commandLineArgs'));

      if(karateCliArgs !== undefined && karateCliArgs !== "")
      {
        karateOptions = `${karateCliArgs} ${karateOptions}`
      }
    
      if(runFilePath.toLowerCase().endsWith(mavenBuildFile))
      {
        if (Boolean(vscode.workspace.getConfiguration('karateRunner.buildDirectory').get('cleanBeforeEachRun')))
        {
          runPhases = "clean test-compile";
        }
        else
        {
          runPhases = "";
        }

        // mvn clean test-compile -f pom.xml exec:java -Dexec.mainClass='com.intuit.karate.cli.Main' -Dexec.args='file.feature' -Dexec.classpathScope='test'
        runCommand = `${mavenCmd} ${runPhases} ${mavenBuildFileSwitch} "${runFilePath}"`;
        runCommand += ` exec:java -Dexec.mainClass="com.intuit.karate.cli.Main" -Dexec.args="${karateOptions}"`;
        runCommand += ` -Dexec.classpathScope="test" ${karateRunnerArgs}`;
      }
    
      if(runFilePath.toLowerCase().endsWith(gradleGroovyBuildFile)|| runFilePath.toLowerCase().endsWith(gradleKotlinBuildFile))
      {
        // gradle clean test -b build.gradle karateExecute -DmainClass='com.intuit.karate.cli.Main' --args='file.feature'
        runCommand = `${gradleCmd} ${runPhases} ${gradleBuildFileSwitch} "${runFilePath}"`;
        runCommand += ` karateExecute -DmainClass="com.intuit.karate.cli.Main" --args="${karateOptions}"`;
        runCommand += ` ${karateRunnerArgs}`;
      }
    
      if(runCommand === null)
      {
        return;
      }
    }
    else
    {
      if (Boolean(vscode.workspace.getConfiguration('karateRunner.karateRunner').get('promptToSpecify')))
      {
        karateRunner = await vscode.window.showInputBox
          (
            {
              prompt: "Karate Runner",
              value: String(vscode.workspace.getConfiguration('karateRunner.karateRunner').get('default'))
            }
          );
  
        if (karateRunner !== undefined && karateRunner !== "")
        {
          await vscode.workspace.getConfiguration().update('karateRunner.karateRunner.default', karateRunner)
        }
      }
      else
      {
        karateRunner = String(vscode.workspace.getConfiguration('karateRunner.karateRunner').get('default'));
      }
  
      if (karateRunner === undefined || karateRunner === "")
      {
        return;
      }
  
      if (runFilePath.toLowerCase().endsWith(mavenBuildFile))
      {
        runCommandPrefix = `${mavenCmd} ${runPhases} ${mavenBuildFileSwitch}`;

        if (runCommandPrefix === null)
        {
          return;
        }

        runCommand = `${runCommandPrefix} "${runFilePath}" -Dtest=${karateRunner} "-Dkarate.options=${karateOptions}" ${karateRunnerArgs}`;
      }
  
      if (runFilePath.toLowerCase().endsWith(gradleGroovyBuildFile)|| runFilePath.toLowerCase().endsWith(gradleKotlinBuildFile))
      {
        runCommandPrefix = `${gradleCmd} ${runPhases} ${gradleBuildFileSwitch}`;

        if (runCommandPrefix === null)
        {
          return;
        }

        runCommand = `${runCommandPrefix} "${runFilePath}" --tests ${karateRunner} -Dkarate.options="${karateOptions}" ${karateRunnerArgs}`;
      }
    }
  }
  else
  {
    let karateJarArgs = String(vscode.workspace.getConfiguration('karateRunner.karateJar').get('commandLineArgs'));

    if (karateJarArgs === undefined || karateJarArgs === "")
    {
      return;
    }

    runCommand = `${karateJarArgs} "${karateJarOptions}"`;
  }

  let relativePattern = new vscode.RelativePattern(projectRootPath, String(vscode.workspace.getConfiguration('karateRunner.buildReports').get('toTarget')));
  let watcher = vscode.workspace.createFileSystemWatcher(relativePattern);
  let reportUrisFound: vscode.Uri[] = [];

  watcher.onDidCreate((e) =>
  {
    if (reportUrisFound.toString().indexOf(e.toString()) === -1)
    {
      reportUrisFound.push(e);
    }
  });

  watcher.onDidChange((e) =>
  {
    if (reportUrisFound.toString().indexOf(e.toString()) === -1)
    {
      reportUrisFound.push(e);
    }
  });

  let seo: vscode.ShellExecutionOptions = { cwd: projectRootPath }
  let exec = new vscode.ShellExecution(runCommand, seo);
  let task = new vscode.Task
    (
      { type: 'karate' },
      vscode.TaskScope.Workspace,
      'Karate Runner',
      'karate',
      exec,
      []
    );

  /*
  vscode.tasks.onDidStartTask((e) => 
  {
    if (e.execution.task.name == 'Karate Runner')
    {
    }
  });
  */

  vscode.tasks.onDidEndTask((e) =>
  {
    if (e.execution.task.name == 'Karate Runner')
    {
      isTaskExecuting = false;
      watcher.dispose();

      ProviderExecutions.addExecutionToHistory();
      ProviderExecutions.executionArgs = null;

      if (Boolean(vscode.workspace.getConfiguration('karateRunner.buildReports').get('openAfterEachRun')))
      {
        reportUrisFound.forEach((reportUri) =>
        {
          openBuildReport(reportUri);
        });
      }
    }

    reportUrisFound = [];
  });

  ProviderStatusBar.reset();
  ProviderExecutions.executionArgs = args;

  let showProgress = (task: vscode.TaskExecution) =>
  {
    vscode.window.withProgress(
      {
        location: { viewId: 'karate-tests' },
        cancellable: false
      },
      async (progress) =>
      {
        await new Promise((resolve) =>
        {
          let interval = setInterval(() =>
          {
            if (!isTaskExecuting)
            {
              clearInterval(interval);
              resolve();
            }
          }, 1000);
        });
      });
  };

  let isTaskExecuting = true;

  vscode.tasks.executeTask(task)
  .then(task => showProgress(task));
}

function debugKarateTest(args = null)
{
  if (args !== null)
  {
    debugLineNumber = args[0];
  }
  else
  {
    debugLineNumber = 0;
  }

  vscode.commands.executeCommand('workbench.action.debug.start');
}

function displayReportsTree(displayType)
{
  vscode.workspace.getConfiguration().update('karateRunner.buildReports.activityBarDisplayType', displayType);
}

function displayTestsTree(displayType)
{
  vscode.workspace.getConfiguration().update('karateRunner.tests.activityBarDisplayType', displayType);
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

export { smartPaste, getDebugFile, getDebugBuildFile, debugKarateTest, runKarateTest, runAllKarateTests, displayReportsTree, displayTestsTree, openBuildReport, openFileInEditor };