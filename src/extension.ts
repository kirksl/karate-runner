import ProviderBuildReports from "./providerBuildReports";
import ProviderKarateTests from "./providerKarateTests";
import ProviderDebugAdapter from "./providerDebugAdapter";
import ProviderDebugConfiguration from "./providerDebugConfiguration";
import ProviderResults from "./providerResults";
import ProviderExecutions from "./providerExecutions";
import ProviderStatusBar from "./providerStatusBar";
import ProviderCodeLens from "./providerCodeLens";
import ProviderDefinition from "./providerDefinition";
import KarateNetworkLogsProvider from './KarateNetworkLogsProvider';
import LogsServerSocketAppender  from './LogsServerSocketAppender';
import HoverRunDebugProvider from './HoverRunDebugProvider';
//import ProviderFoldingRange from "./providerFoldingRange";
import { smartPaste, getDebugFile, getDebugBuildFile, debugKarateTest, runKarateTest, runAllKarateTests, displayReportsTree, displayTestsTree, openBuildReport, openFileInEditor } from "./commands";
import * as vscode from 'vscode';

let buildReportsTreeView = null;
let karateTestsTreeView = null;
let buildReportsWatcher = null;
let karateTestsWatcher = null;
let karateNetworkTreeView = null;


export function activate(context: vscode.ExtensionContext)
{
  let buildReportsProvider = new ProviderBuildReports();
  let karateTestsProvider = new ProviderKarateTests();
  let debugAdapterProvider = new ProviderDebugAdapter();
  let debugConfigurationProvider = new ProviderDebugConfiguration();
  let resultsProvider = new ProviderResults();
  let executionsProvider = new ProviderExecutions();
  let statusBarProvider = new ProviderStatusBar(context);
  let codeLensProvider = new ProviderCodeLens();
  let definitionProvider = new ProviderDefinition();
  //let foldingRangeProvider = new ProviderFoldingRange();
  
  let codeLensTarget = { language: "karate", scheme: "file" };
  let definitionTarget = { language: "karate", scheme: "file" };
  //let foldingRangeTarget = { language: "karate", scheme: "file" };

  let smartPasteCommand = vscode.commands.registerCommand('karateRunner.paste', smartPaste);
  let getDebugFileCommand = vscode.commands.registerCommand("karateRunner.getDebugFile", getDebugFile);
  let getDebugBuildFileCommand = vscode.commands.registerCommand("karateRunner.getDebugBuildFile", getDebugBuildFile);
  let debugTestCommand = vscode.commands.registerCommand("karateRunner.tests.debug", debugKarateTest);
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

  let registerDebugAdapterProvider = vscode.debug.registerDebugAdapterDescriptorFactory('karate', debugAdapterProvider);
  let registerDebugConfigurationProvider = vscode.debug.registerDebugConfigurationProvider('karate', debugConfigurationProvider);
  let registerCodeLensProvider = vscode.languages.registerCodeLensProvider(codeLensTarget, codeLensProvider);
  let registerDefinitionProvider = vscode.languages.registerDefinitionProvider(definitionTarget, definitionProvider);
  //let registerFoldingRangeProvider = vscode.languages.registerFoldingRangeProvider(foldingRangeTarget, foldingRangeProvider);

  buildReportsTreeView = vscode.window.createTreeView('karate-reports', { showCollapseAll: true, treeDataProvider: buildReportsProvider });
  karateTestsTreeView = vscode.window.createTreeView('karate-tests', { showCollapseAll: true, treeDataProvider: karateTestsProvider });

  const registerHoverRunDebugProvider = vscode.languages.registerHoverProvider(codeLensTarget, new HoverRunDebugProvider(context));
  const karateNetworkLogsProvider = new KarateNetworkLogsProvider();
  const clearNetworkLogsTreeCommand = vscode.commands.registerCommand('karateRunner.karateNetworkLogs.clearTree', () => karateNetworkLogsProvider.clear());
  const logsServerSocketAppender = new LogsServerSocketAppender(data => karateNetworkLogsProvider.processLoggingEvent(data));
  karateNetworkTreeView = vscode.window.createTreeView('karate-network-logs', {
    showCollapseAll: true,
    treeDataProvider: karateNetworkLogsProvider,
  });
  const logsServerPort: number = vscode.workspace.getConfiguration('karateRunner.logsServerSocketAppender').get('port');
  if (logsServerPort) {
    logsServerSocketAppender.start(logsServerPort);
  }

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

    const port: number = vscode.workspace.getConfiguration('karateRunner.logsServerSocketAppender').get('port');
    if (logsServerSocketAppender.port !== port) {
      logsServerSocketAppender.stop();
      if (port) {
        logsServerSocketAppender.start(port);
      }
    }
  });

  context.subscriptions.push(smartPasteCommand);
  context.subscriptions.push(getDebugFileCommand);
  context.subscriptions.push(getDebugBuildFileCommand);
  context.subscriptions.push(debugTestCommand);
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
  context.subscriptions.push(registerDebugAdapterProvider);
  context.subscriptions.push(registerDebugConfigurationProvider);
  context.subscriptions.push(registerCodeLensProvider);
  context.subscriptions.push(registerDefinitionProvider);
  context.subscriptions.push(resultsProvider);
  //context.subscriptions.push(registerFoldingRangeProvider);
  context.subscriptions.push(registerHoverRunDebugProvider);
  context.subscriptions.push(karateNetworkTreeView);
  context.subscriptions.push(clearNetworkLogsTreeCommand);
}

export function deactivate()
{
  buildReportsTreeView.dispose();
  karateTestsTreeView.dispose();
  buildReportsWatcher.dispose();
  karateTestsWatcher.dispose();
  karateNetworkTreeView.dispose();
}

function setupWatcher(watcher, watcherGlob, provider)
{
  watcher = vscode.workspace.createFileSystemWatcher(watcherGlob);

  watcher.onDidCreate((e) => { provider.refresh() });
  watcher.onDidChange((e) => { provider.refresh() });
  watcher.onDidDelete((e) => { provider.refresh() });

  provider.refresh();
}