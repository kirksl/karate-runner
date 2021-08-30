import { truncateMiddle } from "./helper";
import { ProviderResults } from "./providerResults";
import ProviderExecutions from "./providerExecutions";
import * as vscode from 'vscode';

class ProviderStatusBar
{
	private static statusBarText: string;
	private static isExecuting: boolean;
	private static statusBarItem: vscode.StatusBarItem;
	private static statusBarCommand: vscode.Disposable;
	private static statusBarCommandId: string = "karateRunner.tests.showExecutionHistory";
	
	constructor(context: vscode.ExtensionContext)
	{
		ProviderStatusBar.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 50);
		ProviderStatusBar.statusBarCommand = vscode.commands.registerCommand(ProviderStatusBar.statusBarCommandId, ProviderExecutions.showExecutionHistory);
		ProviderStatusBar.statusBarItem.command = ProviderStatusBar.statusBarCommandId;
		ProviderStatusBar.statusBarItem.name = "Karate Runner";
		ProviderStatusBar.isExecuting = false;
		ProviderStatusBar.reset();
		
		context.subscriptions.push(ProviderStatusBar.statusBarItem);
		context.subscriptions.push(ProviderStatusBar.statusBarCommand);
		
		ProviderResults.onSummaryResults((json) => { ProviderStatusBar.setFromResults(json); });
	}

	private static getFooter(): string
	{
		let footer: string = "\n\n";
		const clearResults = `command:karateRunner.tests.clearResults`;
		const openSettings = `command:karateRunner.tests.openSettings`;

		if (ProviderExecutions.executionArgs !== null)
		{
			const runArgs = encodeURIComponent(JSON.stringify([[ProviderExecutions.executionArgs]]));
			const runCmd = `command:karateRunner.tests.run?${runArgs}`;
			footer += `[$(debug-rerun)](${runCmd} "Re-Run")&nbsp;&nbsp;`;
		}

		footer += `[$(clear-all)](${clearResults} "Clear Results")`;
		footer += `&nbsp;&nbsp;[$(gear)](${openSettings} "Open Settings")`;
		footer += `&nbsp;&nbsp;&nbsp;&nbsp;[$(github)](https://github.com/intuit/karate "Karate")`;
		footer += `&nbsp;&nbsp;[$(extensions)](https://marketplace.visualstudio.com/items?itemName=kirkslota.karate-runner "Karate Runner")`;

		return footer;
	}
	
	public static setExecutionState(executing: boolean)
	{
		ProviderStatusBar.isExecuting = executing;

		if (executing)
		{
			ProviderStatusBar.statusBarItem.text = ProviderStatusBar.statusBarText + `  $(sync~spin)`;
		}
		else
		{
			ProviderStatusBar.statusBarItem.text = ProviderStatusBar.statusBarText;
		}

		ProviderStatusBar.statusBarItem.show();
	}

	public static set(passed: number, failed: number, tooltip: vscode.MarkdownString)
	{
		ProviderStatusBar.statusBarText = `Karate $(pass) ${passed} $(error) ${failed}`;

		if (ProviderStatusBar.isExecuting)
		{
			ProviderStatusBar.statusBarItem.text = ProviderStatusBar.statusBarText + `  $(sync~spin)`
		}
		else
		{
			ProviderStatusBar.statusBarItem.text = ProviderStatusBar.statusBarText;
		}

		ProviderStatusBar.statusBarItem.tooltip = tooltip;

		let failureActual = (passed + failed == 0) ? 0 : failed / (passed + failed);
		let failureThreshold = parseFloat(vscode.workspace.getConfiguration('karateRunner.statusBar').get('colorOnFailureThreshold')) / 100;

		if (failureActual >= failureThreshold)
		{
			ProviderStatusBar.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
		}
		else
		{
			ProviderStatusBar.statusBarItem.backgroundColor = undefined;
		}

		ProviderStatusBar.statusBarItem.show();
	}
	
	public static reset()
	{
		let tooltip = new vscode.MarkdownString(undefined, true);
		tooltip.isTrusted = true;

		tooltip.appendMarkdown(`No Results`);
		tooltip.appendMarkdown(ProviderStatusBar.getFooter());
		ProviderStatusBar.set(0, 0, tooltip);
	}
	
	private static setFromResults(json)
	{
		let resultsTime: string = `${json.lastModified}`;
		let resultsStats: string;
		let resultsIcon: string;
		
		if ("featuresPassed" in json)
		{
			resultsStats = `Features: ${json.featuresPassed + json.featuresFailed} | Scenarios: ${json.scenariosPassed + json.scenariosfailed} | Passed: ${json.scenariosPassed} | Failed: ${json.scenariosfailed} | Elapsed: ${(json.elapsedTime/1000).toFixed(2)}`;
			resultsIcon = ((json.featuresFailed + json.scenariosfailed) > 0) ? `$(error)` : `$(pass)`;
		}
		else
		{
			resultsStats = `Features: ${json.features} | Scenarios: ${json.scenarios} | Passed: ${json.passed} | Failed: ${json.failed} | Elapsed: ${(json.elapsedTime/1000).toFixed(2)}`;
			resultsIcon = (json.failed > 0) ? `$(error)` : `$(pass)`;
		}
		
		let resultsClassPath: any = null;
		if (ProviderExecutions.executionArgs !== null)
		{
			resultsClassPath = truncateMiddle(ProviderExecutions.executionArgs.karateJarOptions, 70);
		}
		
		let tooltip = new vscode.MarkdownString(undefined, true)
		tooltip.isTrusted = true;
		if (resultsClassPath !== null)
		{
			tooltip.appendMarkdown(`
${resultsIcon} ${resultsTime}  
${resultsClassPath}  
${resultsStats}
			`);
		}
		else
		{
			tooltip.appendMarkdown(`
${resultsIcon} ${resultsTime}  
${resultsStats}
			`);
		}

		tooltip.appendMarkdown(ProviderStatusBar.getFooter());
		
		if ("featuresPassed" in json)
		{
			ProviderStatusBar.set(json.scenariosPassed, json.scenariosfailed, tooltip);
		}
		else
		{
			ProviderStatusBar.set(json.passed, json.failed, tooltip);
		}
	}
}

export default ProviderStatusBar;