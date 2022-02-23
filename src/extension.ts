import ProviderReports from "./providerReports";
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
import ProviderDocumentSymbol from './providerDocumentSymbol';
import ProviderTelemetry from './providerTelemetry';
import { ServiceLocalStorage } from './serviceLocalStorage';
//import ProviderFoldingRange from "./providerFoldingRange";

import { smartPaste, getDebugFile, getDebugBuildFile, debugKarateTest, runKarateTest, runAllKarateTests, runTagKarateTests, displayReportsTree, filterReportsTree, displayTestsTree, filterTestsTree, openExternalUri, openFileInEditor, moveLineUp, moveLineDown, cloneLine, deleteLine, openKarateSettings, toggleResultsInGutter } from "./commands";
import { createTreeViewWatcher, showWhatsNew } from "./helper";
import * as vscode from 'vscode';

let reportsWatcher = null;
let karateTestsWatcher = null;
let telemetryProvider = null;

export function activate(context: vscode.ExtensionContext)
{
	//showWhatsNew(context);
	ServiceLocalStorage.initialize(context.globalState);
	telemetryProvider = new ProviderTelemetry(context);

	let resultsProvider = new ProviderResults();
	let reportsProvider = new ProviderReports();
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
	let documentSymbolProvider = new ProviderDocumentSymbol();
	//let foldingRangeProvider = new ProviderFoldingRange();

	let karateFile = { language: "karate", scheme: "file" };

	let smartPasteCommand = vscode.commands.registerCommand("karateRunner.paste", smartPaste);
	let getDebugFileCommand = vscode.commands.registerCommand("karateRunner.getDebugFile", getDebugFile);
	let getDebugBuildFileCommand = vscode.commands.registerCommand("karateRunner.getDebugBuildFile", getDebugBuildFile);
	let debugTestCommand = vscode.commands.registerCommand("karateRunner.tests.debug", debugKarateTest);
	let debugAllCommand = vscode.commands.registerCommand("karateRunner.tests.debugAll", debugKarateTest);
	let runTestCommand = vscode.commands.registerCommand("karateRunner.tests.run", runKarateTest);
	let runAllCommand = vscode.commands.registerCommand("karateRunner.tests.runAll", runAllKarateTests);
	let runTagCommand = vscode.commands.registerCommand("karateRunner.tests.runTag", runTagKarateTests);
	let displayListReportsTreeCommand = vscode.commands.registerCommand("karateRunner.reports.displayList", () => displayReportsTree("List"));
	let displayTreeReportsTreeCommand = vscode.commands.registerCommand("karateRunner.reports.displayTree", () => displayReportsTree("Tree"));
	let displayListTestsTreeCommand = vscode.commands.registerCommand("karateRunner.tests.displayList", () => displayTestsTree("List"));
	let displayTreeTestsTreeCommand = vscode.commands.registerCommand("karateRunner.tests.displayTree", () => displayTestsTree("Tree"));
	let displayTagTestsTreeCommand = vscode.commands.registerCommand("karateRunner.tests.displayTag", () => displayTestsTree("Tag"));
	let openReportCommand = vscode.commands.registerCommand("karateRunner.reports.open", openExternalUri);
	let refreshReportsTreeCommand = vscode.commands.registerCommand("karateRunner.reports.refreshTree", () => reportsProvider.refresh());
	let refreshTestsTreeCommand = vscode.commands.registerCommand("karateRunner.tests.refreshTree", () => karateTestsProvider.refresh());
	let filterReportsTreeCommand = vscode.commands.registerCommand("karateRunner.reports.filterTree", () => filterReportsTree(context));
	let filterTestsTreeCommand = vscode.commands.registerCommand("karateRunner.tests.filterTree", () => filterTestsTree(context));
	let clearResultsCommand = vscode.commands.registerCommand("karateRunner.tests.clearResults", () => { karateTestsProvider.clearResults(); decorationsProvider.triggerUpdateDecorations(); ProviderStatusBar.reset(); });
	let openSettingsCommand = vscode.commands.registerCommand("karateRunner.tests.openSettings", openKarateSettings);
	let toggleResultsInGutterCommand = vscode.commands.registerCommand("karateRunner.editor.toggleResultsInGutter", toggleResultsInGutter);
	let openFileCommand = vscode.commands.registerCommand("karateRunner.tests.open", openFileInEditor);
	let moveLineUpCommand = vscode.commands.registerCommand("karateRunner.file.moveLineUp", moveLineUp);
	let moveLineDownCommand = vscode.commands.registerCommand("karateRunner.file.moveLineDown", moveLineDown);
	let cloneLineCommand = vscode.commands.registerCommand("karateRunner.file.cloneLine", cloneLine);
	let deleteLineCommand = vscode.commands.registerCommand("karateRunner.file.deleteLine", deleteLine);

	let registerDebugAdapterProvider = vscode.debug.registerDebugAdapterDescriptorFactory('karate', debugAdapterProvider);
	let registerDebugConfigurationProvider = vscode.debug.registerDebugConfigurationProvider('karate', debugConfigurationProvider);
	let registerCodeLensProvider = vscode.languages.registerCodeLensProvider(karateFile, codeLensProvider);
	let registerDefinitionProvider = vscode.languages.registerDefinitionProvider(karateFile, definitionProvider);
	let registerProviderHoverRunDebug = vscode.languages.registerHoverProvider(karateFile, hoverRunDebugProvider);
	let registerCompletionItemProvider = vscode.languages.registerCompletionItemProvider(karateFile, completionItemProvider, ...['\'', '\"', ' ']);
	let registerDocumentSymbolProvider = vscode.languages.registerDocumentSymbolProvider(karateFile, documentSymbolProvider);
	//let registerFoldingRangeProvider = vscode.languages.registerFoldingRangeProvider(karateFile, foldingRangeProvider);

	createTreeViewWatcher(
		reportsWatcher,
		String(vscode.workspace.getConfiguration('karateRunner.reports').get('toTargetByGlob')),
		reportsProvider
	);

	createTreeViewWatcher(
		karateTestsWatcher,
		String(vscode.workspace.getConfiguration('karateRunner.tests').get('toTargetByGlob')),
		karateTestsProvider
	);

	vscode.workspace.onDidChangeConfiguration((e) =>
	{
		let toggleResultsInGutter = e.affectsConfiguration("karateRunner.editor.toggleResultsInGutter");

		if (toggleResultsInGutter)
		{
			decorationsProvider.triggerUpdateDecorations();
		}

		let reportsDisplayType = e.affectsConfiguration("karateRunner.reports.activityBarDisplayType");
		let reportsToTarget = e.affectsConfiguration("karateRunner.reports.toTargetByGlob");

		if (reportsDisplayType)
		{
			reportsProvider.refresh();
		}

		if (reportsToTarget)
		{
			try
			{
				reportsWatcher.dispose();
			}
			catch(e)
			{
				// do nothing
			}

			createTreeViewWatcher(
				reportsWatcher,
				String(vscode.workspace.getConfiguration('karateRunner.reports').get('toTargetByGlob')),
				reportsProvider
			);
		}

		let karateTestsDisplayType = e.affectsConfiguration("karateRunner.tests.activityBarDisplayType");
		let karateTestsHideIgnored = e.affectsConfiguration("karateRunner.tests.hideIgnored");
		let karateTestsToTargetByGlob = e.affectsConfiguration("karateRunner.tests.toTargetByGlob");
		let karateTestsToTargetByTag = e.affectsConfiguration("karateRunner.tests.toTargetByTag");

		if (karateTestsDisplayType || karateTestsHideIgnored || karateTestsToTargetByTag)
		{
			karateTestsProvider.refresh();
		}

		if (karateTestsToTargetByGlob)
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
				String(vscode.workspace.getConfiguration('karateRunner.tests').get('toTargetByGlob')),
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
	context.subscriptions.push(runTagCommand);
	context.subscriptions.push(displayListReportsTreeCommand);
	context.subscriptions.push(displayTreeReportsTreeCommand);
	context.subscriptions.push(displayListTestsTreeCommand);
	context.subscriptions.push(displayTreeTestsTreeCommand);
	context.subscriptions.push(displayTagTestsTreeCommand);
	context.subscriptions.push(openReportCommand);
	context.subscriptions.push(refreshReportsTreeCommand);
	context.subscriptions.push(refreshTestsTreeCommand);
	context.subscriptions.push(filterReportsTreeCommand);
	context.subscriptions.push(filterTestsTreeCommand);
	context.subscriptions.push(clearResultsCommand);
	context.subscriptions.push(openSettingsCommand);
	context.subscriptions.push(toggleResultsInGutterCommand);
	context.subscriptions.push(openFileCommand);
	context.subscriptions.push(moveLineUpCommand);
	context.subscriptions.push(moveLineDownCommand);
	context.subscriptions.push(cloneLineCommand);
	context.subscriptions.push(deleteLineCommand);
	context.subscriptions.push(registerDebugAdapterProvider);
	context.subscriptions.push(registerDebugConfigurationProvider);
	context.subscriptions.push(registerCodeLensProvider);
	context.subscriptions.push(registerDefinitionProvider);
	context.subscriptions.push(resultsProvider);
	context.subscriptions.push(registerProviderHoverRunDebug);
	context.subscriptions.push(registerCompletionItemProvider);
	context.subscriptions.push(registerDocumentSymbolProvider);
	//context.subscriptions.push(registerFoldingRangeProvider);
}

export function deactivate()
{
	telemetryProvider.dispose();
	reportsWatcher.dispose();
	karateTestsWatcher.dispose();
}