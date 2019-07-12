import providerCodeLens from "./providerCodeLens";
import { runKarateTest, openBuildReport, openFileInEditor } from "./commands";
import providerBuildReports from "./providerBuildReports";
import providerKarateTests from "./providerKarateTests";
import * as vscode from 'vscode';

let buildReportsTreeView = null;
let karateTestsTreeView = null;
let buildReportsWatcher = null;
let karateTestsWatcher = null;

export function activate(context: vscode.ExtensionContext)
{
  let buildReportsProvider = new providerBuildReports();
  let karateTestsProvider = new providerKarateTests();
  let codeLensProvider = new providerCodeLens();
  let codeLensTarget = { language: "feature", scheme: "file" };

  let runTestCommand = vscode.commands.registerCommand("karateRunner.runKarateTest", runKarateTest);
  let openReportCommand = vscode.commands.registerCommand("karateRunner.openBuildReport", openBuildReport);
  let refreshReportsTreeCommand = vscode.commands.registerCommand("karateRunner.refreshBuildReportsTree", () => buildReportsProvider.refresh());
  let refreshTestsTreeCommand = vscode.commands.registerCommand("karateRunner.refreshTestsTree", () => karateTestsProvider.refresh());
  let openFileCommand = vscode.commands.registerCommand("karateRunner.openFile", openFileInEditor);

  let registerCodeLensProvider = vscode.languages.registerCodeLensProvider(codeLensTarget, codeLensProvider);
  
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

    if(buildReportsDisplayType)
    {
      buildReportsProvider.refresh();
    }

    if(buildReportsToTarget)
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

    if(karateTestsDisplayType)
    {
      karateTestsProvider.refresh();
    }

    if(karateTestsToTarget)
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

  context.subscriptions.push(runTestCommand);
  context.subscriptions.push(openReportCommand);
  context.subscriptions.push(refreshReportsTreeCommand);
  context.subscriptions.push(refreshTestsTreeCommand);
  context.subscriptions.push(registerCodeLensProvider);
  context.subscriptions.push(openFileCommand);
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
