import ProviderBuildReports from "./providerBuildReports";
import ProviderKarateTests from "./providerKarateTests";
import ProviderDebugAdapter from "./providerDebugAdapter";
import ProviderDebugConfiguration from "./providerDebugConfiguration";
import { ProviderResults } from "./providerResults";
import ProviderExecutions from "./providerExecutions";
import ProviderStatusBar from "./providerStatusBar";
import ProviderCodeLens from "./providerCodeLens";
import ProviderDefinition from "./providerDefinition";
import ProviderHoverRunDebug from './providerHoverRunDebug';
import ProviderCompletionItem from './providerCompletionItem';
import ProviderDecorations from './providerDecorations';
//import ProviderFoldingRange from "./providerFoldingRange";

import { smartPaste, getDebugFile, getDebugBuildFile, debugKarateTest, runKarateTest, runAllKarateTests, displayReportsTree, filterReportsTree, displayTestsTree, filterTestsTree, openBuildReport, openFileInEditor, openKarateSettings, toggleResultsInGutter } from "./commands";
import { createTreeViewWatcher } from "./helper";
import * as vscode from 'vscode';

let buildReportsWatcher = null;
let karateTestsWatcher = null;


export function activate(context: vscode.ExtensionContext)
{
	let resultsProvider = new ProviderResults();
	let buildReportsProvider = new ProviderBuildReports();
	let karateTestsProvider = new ProviderKarateTests();
	let debugAdapterProvider = new ProviderDebugAdapter();
	let debugConfigurationProvider = new ProviderDebugConfiguration();
	let executionsProvider = new ProviderExecutions();
	let statusBarProvider = new ProviderStatusBar(context);
	let codeLensProvider = new ProviderCodeLens();
	let definitionProvider = new ProviderDefinition();
	let hoverRunDebugProvider = new ProviderHoverRunDebug(context);
	let completionItemProvider = new ProviderCompletionItem();
	let decorationsProvider = new ProviderDecorations(context);
	//let foldingRangeProvider = new ProviderFoldingRange();
  
	let karateFile = { language: "karate", scheme: "file" };

	let smartPasteCommand = vscode.commands.registerCommand('karateRunner.paste', smartPaste);
	let getDebugFileCommand = vscode.commands.registerCommand("karateRunner.getDebugFile", getDebugFile);
	let getDebugBuildFileCommand = vscode.commands.registerCommand("karateRunner.getDebugBuildFile", getDebugBuildFile);
	let debugTestCommand = vscode.commands.registerCommand("karateRunner.tests.debug", debugKarateTest);
    let debugAllCommand = vscode.commands.registerCommand("karateRunner.tests.debugAll", debugKarateTest);
	let runTestCommand = vscode.commands.registerCommand("karateRunner.tests.run", runKarateTest);
	let runAllCommand = vscode.commands.registerCommand("karateRunner.tests.runAll", runAllKarateTests);
	let displayShallowReportsTreeCommand = vscode.commands.registerCommand("karateRunner.buildReports.displayShallow", () => displayReportsTree("Shallow"));
	let displayDeepReportsTreeCommand = vscode.commands.registerCommand("karateRunner.buildReports.displayDeep", () => displayReportsTree("Deep"));
	let displayShallowTestsTreeCommand = vscode.commands.registerCommand("karateRunner.tests.displayShallow", () => displayTestsTree("Shallow"));
	let displayDeepTestsTreeCommand = vscode.commands.registerCommand("karateRunner.tests.displayDeep", () => displayTestsTree("Deep"));
	let openReportCommand = vscode.commands.registerCommand("karateRunner.buildReports.open", openBuildReport);
	let refreshReportsTreeCommand = vscode.commands.registerCommand("karateRunner.buildReports.refreshTree", () => buildReportsProvider.refresh());
	let refreshTestsTreeCommand = vscode.commands.registerCommand("karateRunner.tests.refreshTree", () => karateTestsProvider.refresh());
	let filterReportsTreeCommand = vscode.commands.registerCommand("karateRunner.buildReports.filterTree", filterReportsTree);
	let filterTestsTreeCommand = vscode.commands.registerCommand("karateRunner.tests.filterTree", filterTestsTree);
	let clearResultsCommand = vscode.commands.registerCommand("karateRunner.tests.clearResults", () => { karateTestsProvider.clearResults(); decorationsProvider.triggerUpdateDecorations(); ProviderStatusBar.reset(); });
	let openSettingsCommand = vscode.commands.registerCommand("karateRunner.tests.openSettings", openKarateSettings);
	let toggleResultsInGutterCommand = vscode.commands.registerCommand("karateRunner.editor.toggleResultsInGutter", toggleResultsInGutter);
	let openFileCommand = vscode.commands.registerCommand("karateRunner.tests.open", openFileInEditor);

	let registerDebugAdapterProvider = vscode.debug.registerDebugAdapterDescriptorFactory('karate', debugAdapterProvider);
	let registerDebugConfigurationProvider = vscode.debug.registerDebugConfigurationProvider('karate', debugConfigurationProvider);
	let registerCodeLensProvider = vscode.languages.registerCodeLensProvider(karateFile, codeLensProvider);
	let registerDefinitionProvider = vscode.languages.registerDefinitionProvider(karateFile, definitionProvider);
	let registerProviderHoverRunDebug = vscode.languages.registerHoverProvider(karateFile, hoverRunDebugProvider);
	let registerCompletionItemProvider = vscode.languages.registerCompletionItemProvider(karateFile, completionItemProvider, ...['\'', '\"']);
	//let registerFoldingRangeProvider = vscode.languages.registerFoldingRangeProvider(karateFile, foldingRangeProvider);

    createTreeViewWatcher(
		buildReportsWatcher,
		String(vscode.workspace.getConfiguration('karateRunner.buildReports').get('toTarget')),
		buildReportsProvider
	);

	createTreeViewWatcher(
		karateTestsWatcher,
		String(vscode.workspace.getConfiguration('karateRunner.tests').get('toTarget')),
		karateTestsProvider
	);

	vscode.workspace.onDidChangeConfiguration((e) =>
	{
		let toggleResultsInGutter = e.affectsConfiguration("karateRunner.editor.toggleResultsInGutter");

		if (toggleResultsInGutter)
		{
			decorationsProvider.triggerUpdateDecorations();
		}

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

			createTreeViewWatcher(
				buildReportsWatcher,
				String(vscode.workspace.getConfiguration('karateRunner.buildReports').get('toTarget')),
				buildReportsProvider
			);
		}

		let karateTestsDisplayType = e.affectsConfiguration("karateRunner.tests.activityBarDisplayType");
        let karateTestsHideIgnored = e.affectsConfiguration("karateRunner.tests.hideIgnored");
		let karateTestsToTarget = e.affectsConfiguration("karateRunner.tests.toTarget");

		if (karateTestsDisplayType || karateTestsHideIgnored)
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

			createTreeViewWatcher(
				karateTestsWatcher,
				String(vscode.workspace.getConfiguration('karateRunner.tests').get('toTarget')),
				karateTestsProvider
			);
		}
	});

	context.subscriptions.push(smartPasteCommand);
	context.subscriptions.push(getDebugFileCommand);
	context.subscriptions.push(getDebugBuildFileCommand);
	context.subscriptions.push(debugTestCommand);
    context.subscriptions.push(debugAllCommand);
	context.subscriptions.push(runTestCommand);
	context.subscriptions.push(runAllCommand);
	context.subscriptions.push(displayShallowReportsTreeCommand);
	context.subscriptions.push(displayDeepReportsTreeCommand);
	context.subscriptions.push(displayShallowTestsTreeCommand);
	context.subscriptions.push(displayDeepTestsTreeCommand);
	context.subscriptions.push(openReportCommand);
	context.subscriptions.push(refreshReportsTreeCommand);
	context.subscriptions.push(refreshTestsTreeCommand);
	context.subscriptions.push(filterReportsTreeCommand);
	context.subscriptions.push(filterTestsTreeCommand);
	context.subscriptions.push(clearResultsCommand);
	context.subscriptions.push(openSettingsCommand);
	context.subscriptions.push(toggleResultsInGutterCommand);
	context.subscriptions.push(openFileCommand);
	context.subscriptions.push(registerDebugAdapterProvider);
	context.subscriptions.push(registerDebugConfigurationProvider);
	context.subscriptions.push(registerCodeLensProvider);
	context.subscriptions.push(registerDefinitionProvider);
	context.subscriptions.push(resultsProvider);
	context.subscriptions.push(registerProviderHoverRunDebug);
	context.subscriptions.push(registerCompletionItemProvider);
	//context.subscriptions.push(registerFoldingRangeProvider);
}

export function deactivate()
{
	buildReportsWatcher.dispose();
	karateTestsWatcher.dispose();
}