import providerCodeLens from "./providerCodeLens";
import providerFoldingRange from "./providerFoldingRange";
import { smartPaste, getKarateDebugFile, runKarateTest, runAllKarateTests, displayReportsTree, displayTestsTree, openBuildReport, openFileInEditor } from "./commands";
import { getProjectDetail, ProjectDetail } from "./helper";
import providerBuildReports from "./providerBuildReports";
import providerKarateTests from "./providerKarateTests";
import fs = require("fs");
import * as vscode from 'vscode';
import { settings } from "cluster";
import { rejects } from "assert";

let buildReportsTreeView = null;
let karateTestsTreeView = null;
let buildReportsWatcher = null;
let karateTestsWatcher = null;


export function activate(context: vscode.ExtensionContext)
{
  let buildReportsProvider = new providerBuildReports();
  let karateTestsProvider = new providerKarateTests();
  let codeLensProvider = new providerCodeLens();
  let foldingRangeProvider = new providerFoldingRange();
  let codeLensTarget = { language: "feature", scheme: "file" };
  let foldingRangeTarget = { language: "feature", scheme: "file" };

  let smartPasteCommand = vscode.commands.registerCommand('karateRunner.paste', smartPaste);
  let getDebugFileCommand = vscode.commands.registerCommand("karateRunner.getDebugFile", getKarateDebugFile);
  let runTestCommand = vscode.commands.registerCommand("karateRunner.tests.run", runKarateTest);
  let runAllCommand = vscode.commands.registerCommand("karateRunner.tests.runAll", runAllKarateTests);
  let displayShallowReportsTreeCommand = vscode.commands.registerCommand("karateRunner.buildReports.displayShallow", () => displayReportsTree("Shallow"));
  let displayDeepReportsTreeCommand = vscode.commands.registerCommand("karateRunner.buildReports.displayDeep", () => displayReportsTree("Deep"));
  let displayShallowTestsTreeCommand = vscode.commands.registerCommand("karateRunner.tests.displayShallow", () => displayTestsTree("Shallow"));
  let displayDeepTestsTreeCommand = vscode.commands.registerCommand("karateRunner.tests.displayDeep", () => displayTestsTree("Deep"));
  let openReportCommand = vscode.commands.registerCommand("karateRunner.buildReports.open", openBuildReport);
  let refreshReportsTreeCommand = vscode.commands.registerCommand("karateRunner.buildReports.refreshTree", () => buildReportsProvider.refresh());
  let refreshTestsTreeCommand = vscode.commands.registerCommand("karateRunner.tests.refreshTree", () => karateTestsProvider.refresh());
  let openFileCommand = vscode.commands.registerCommand("karateRunner.tests.open", openFileInEditor);

  let registerCodeLensProvider = vscode.languages.registerCodeLensProvider(codeLensTarget, codeLensProvider);
  let registerFoldingRangeProvider = vscode.languages.registerFoldingRangeProvider(foldingRangeTarget, foldingRangeProvider);

  buildReportsTreeView = vscode.window.createTreeView('karate-reports', { showCollapseAll: true, treeDataProvider: buildReportsProvider });
  karateTestsTreeView = vscode.window.createTreeView('karate-tests', { showCollapseAll: true, treeDataProvider: karateTestsProvider });

  setupWatcher(
    buildReportsWatcher,
    String(vscode.workspace.getConfiguration('karateRunner.buildReports').get('toTarget')),
    buildReportsProvider
  );

  setupWatcher(
    karateTestsWatcher,
    String(vscode.workspace.getConfiguration('karateRunner.tests').get('toTarget')),
    karateTestsProvider
  )

  vscode.workspace.onDidChangeConfiguration((e) =>
  {
    let buildReportsDisplayType = e.affectsConfiguration("karateRunner.buildReports.activityBarDisplayType");
    let buildReportsToTarget = e.affectsConfiguration("karateRunner.buildReports.toTarget");

    if (buildReportsDisplayType)
    {
      buildReportsProvider.refresh();
    }

    if (buildReportsToTarget)
    {
      try
      {
        buildReportsWatcher.dispose();
      }
      catch(e)
      {
        // do nothing
      }

      setupWatcher(
        buildReportsWatcher,
        String(vscode.workspace.getConfiguration('karateRunner.buildReports').get('toTarget')),
        buildReportsProvider
      );
    }

    let karateTestsDisplayType = e.affectsConfiguration("karateRunner.tests.activityBarDisplayType");
    let karateTestsToTarget = e.affectsConfiguration("karateRunner.tests.toTarget");

    if (karateTestsDisplayType)
    {
      karateTestsProvider.refresh();
    }

    if (karateTestsToTarget)
    {
      try
      {
        karateTestsWatcher.dispose();
      }
      catch(e)
      {
        // do nothing
      }

      setupWatcher(
        karateTestsWatcher,
        String(vscode.workspace.getConfiguration('karateRunner.tests').get('toTarget')),
        karateTestsProvider
      )
    }
  });

  context.subscriptions.push(smartPasteCommand);
  context.subscriptions.push(getDebugFileCommand);
  context.subscriptions.push(runTestCommand);
  context.subscriptions.push(runAllCommand);
  context.subscriptions.push(displayShallowReportsTreeCommand);
  context.subscriptions.push(displayDeepReportsTreeCommand);
  context.subscriptions.push(displayShallowTestsTreeCommand);
  context.subscriptions.push(displayDeepTestsTreeCommand);
  context.subscriptions.push(openReportCommand);
  context.subscriptions.push(refreshReportsTreeCommand);
  context.subscriptions.push(refreshTestsTreeCommand);
  context.subscriptions.push(openFileCommand);
  context.subscriptions.push(registerCodeLensProvider);
  context.subscriptions.push(registerFoldingRangeProvider);


  context.subscriptions.push(vscode.debug.registerDebugAdapterDescriptorFactory('karate',
  {
    createDebugAdapterDescriptor: (session: vscode.DebugSession, executable: vscode.DebugAdapterExecutable | undefined) =>
    {
      let projectRootPath = "";
      let settingsTimeout = Number(vscode.workspace.getConfiguration('karateRunner.debugger').get('serverPortTimeout'));

      let featureFile = String(session.configuration.feature);
      featureFile = featureFile.replace(/^['"]|['"]$/g, '');
      if (featureFile.endsWith(".feature"))
      {
        let projectDetail: ProjectDetail = getProjectDetail(vscode.Uri.file(featureFile), vscode.FileType.File);
        projectRootPath = projectDetail.projectRoot;
      }
      else
      {
        projectRootPath = vscode.workspace.rootPath;
      }

      let relativePattern = new vscode.RelativePattern(projectRootPath, '**/karate-debug-port.txt');
      let watcher = vscode.workspace.createFileSystemWatcher(relativePattern);
      let debugPortFile = null;

      let getDebugPort = new Promise<number>((resolve) =>
      {
        vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Karate Runner: Waiting for debug server to start...",
          cancellable: false
        },
        async (progress, token) =>
        {
          let incrementer = 100 / settingsTimeout;

          progress.report({ increment: 0 });

          await new Promise((resolve) =>
          {
            let timeout = setInterval(() =>
            {
              if (debugPortFile !== null)
              {
                clearInterval(timeout);
                let port = fs.readFileSync(debugPortFile.fsPath, { encoding: 'utf8' });
                console.log(`debug server ready on port: ${port}`);
  
                resolve(parseInt(port));
              }
              else
              {
                progress.report({ increment: incrementer });
              }
            }, 1000);
          }).then((port) => { resolve(Number(port)); });
        });
      });

      let timeoutDebugPort = new Promise<number>((resolve, reject) =>
      {
        setTimeout(() =>
        {
          reject(new Error("Aborting debugger.  Timed out waiting for debug server port."))
        }, (settingsTimeout * 1000));
      });

      watcher.onDidCreate((e) =>
      {
        watcher.dispose();
        debugPortFile = e;
      });

      watcher.onDidChange((e) =>
      {
        watcher.dispose();
        debugPortFile = e;
      });

      let seo: vscode.ShellExecutionOptions = { cwd: projectRootPath };
      let exec = new vscode.ShellExecution(session.configuration.karateCli, seo);
      let task = new vscode.Task
      (
        { type: 'karate' },
        vscode.TaskScope.Workspace,
        'Karate Runner',
        'karate',
        exec,
        []
      );

      return vscode.tasks.executeTask(task)
      .then(() => Promise.race([getDebugPort, timeoutDebugPort]))
      .then(port => new vscode.DebugAdapterServer(port));
    }
  }));
}

export function deactivate()
{
  buildReportsTreeView.dispose();
  karateTestsTreeView.dispose();
  buildReportsWatcher.dispose();
  karateTestsWatcher.dispose();
}

function setupWatcher(watcher, watcherGlob, provider)
{
  watcher = vscode.workspace.createFileSystemWatcher(watcherGlob);

  watcher.onDidCreate((e) => { provider.refresh() });
  watcher.onDidChange((e) => { provider.refresh() });
  watcher.onDidDelete((e) => { provider.refresh() });

  provider.refresh();
}