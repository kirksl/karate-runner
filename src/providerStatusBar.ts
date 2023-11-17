import { truncateMiddle } from "./helper";
import { ProviderResults } from "./providerResults";
import ProviderExecutions from "./providerExecutions";
import * as vscode from 'vscode';

class ProviderStatusBar
{
	private static passed: number = 0;
	private static failed: number = 0;
	private static thresholdViolation: boolean = false;
	private static env: string = "-";
	private static executing: string = "";
	private static tooltip: vscode.MarkdownString;

	private static statusBarItem: vscode.StatusBarItem;
	private static statusBarCommand: vscode.Disposable;
	private static statusBarCommandId: string = "karateRunner.tests.showExecutionHistory";
	
	constructor(context: vscode.ExtensionContext)
	{
		ProviderStatusBar.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 50);
		ProviderStatusBar.statusBarCommand = vscode.commands.registerCommand(ProviderStatusBar.statusBarCommandId, ProviderExecutions.showExecutionHistory);
		ProviderStatusBar.statusBarItem.command = ProviderStatusBar.statusBarCommandId;
		ProviderStatusBar.statusBarItem.name = "Karate Runner";
		ProviderStatusBar.setEnvironment();      
		ProviderStatusBar.resetStatus();

		context.subscriptions.push(ProviderStatusBar.statusBarItem);
		context.subscriptions.push(ProviderStatusBar.statusBarCommand);
		
		ProviderResults.onSummaryResults((json) => { ProviderStatusBar.setFromResults(json); });

		vscode.workspace.onDidChangeConfiguration((e) =>
		{
			if (e.affectsConfiguration("karateRunner.core.environment"))
			{
				ProviderStatusBar.setEnvironment();
				ProviderStatusBar.setStatus();
			}
		});
	}

	private static setResults(passed: number, failed: number)
	{
		ProviderStatusBar.passed = passed;
		ProviderStatusBar.failed = failed;

		let failureActual = (passed + failed == 0) ? 0 : failed / (passed + failed);
		let failureThreshold = parseFloat(vscode.workspace.getConfiguration('karateRunner.statusBar').get('colorOnFailureThreshold')) / 100;

		if (failureActual >= failureThreshold)
		{
			ProviderStatusBar.thresholdViolation = true;
		}
		else
		{
			ProviderStatusBar.thresholdViolation = false;
		}
	}

	public static setEnvironment()
	{
		let env = String(vscode.workspace.getConfiguration('karateRunner.core').get('environment'));

		if (env.trim() === "")
		{
			ProviderStatusBar.env = "-";
		}
		else
		{
			ProviderStatusBar.env = env;
		}
	}

	public static setExecutionState(executing: boolean)
	{
		ProviderStatusBar.executing = executing ? "  $(sync~spin)" : "";
	}

	public static setTooltip(tooltip: vscode.MarkdownString)
	{
		ProviderStatusBar.tooltip = tooltip;
	}

	public static setStatus()
	{
		ProviderStatusBar.statusBarItem.text = `Karate $(pass) ${ProviderStatusBar.passed} $(error) ${ProviderStatusBar.failed} $(vm) ${ProviderStatusBar.env}${ProviderStatusBar.executing}`;

		ProviderStatusBar.statusBarItem.tooltip = ProviderStatusBar.tooltip;

		if (ProviderStatusBar.thresholdViolation)
		{
			ProviderStatusBar.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
		}
		else
		{
			ProviderStatusBar.statusBarItem.backgroundColor = undefined;
		}

		ProviderStatusBar.statusBarItem.show();
	}

	private static getFooter(): string
	{
		let footer: string = "\n\n";
		const clearResults = `command:karateRunner.tests.clearResults`;
		const openSettings = `command:karateRunner.tests.openSettings`;
		const setEnvironment = `command:karateRunner.tests.setEnvironment`;

		if (ProviderExecutions.executionArgs !== null)
		{
			const runArgs = encodeURIComponent(JSON.stringify([[ProviderExecutions.executionArgs]]));
			const runCmd = `command:karateRunner.tests.run?${runArgs}`;
			footer += `[$(debug-rerun)](${runCmd} "Re-Run")&nbsp;&nbsp;`;
		}

		footer += `[$(vm)](${setEnvironment} "Set Environment")`;
		footer += `&nbsp;&nbsp;[$(clear-all)](${clearResults} "Clear Results")`;
		footer += `&nbsp;&nbsp;[$(gear)](${openSettings} "Open Settings")`;
		footer += `&nbsp;&nbsp;&nbsp;&nbsp;[$(github)](https://github.com/karatelabs/karate "Karate")`;
		footer += `&nbsp;&nbsp;[$(extensions)](https://marketplace.visualstudio.com/items?itemName=kirkslota.karate-runner "Karate Runner")`;

		return footer;
	}
	
	public static resetStatus()
	{
		ProviderStatusBar.setResults(0, 0);

		let tooltip = new vscode.MarkdownString(undefined, true);
		tooltip.isTrusted = true;

		tooltip.appendMarkdown(`No Results`);
		tooltip.appendMarkdown(ProviderStatusBar.getFooter());

		ProviderStatusBar.setTooltip(tooltip);
		ProviderStatusBar.setStatus();
	}
	
	private static setFromResults(json)
	{
		let resultsTime: string = `${json.lastModified}`;
		let resultsStats: string;
		let resultsIcon: string;
		
		if ("featuresPassed" in json)
		{
			resultsStats = `Features: ${json.featuresPassed + json.featuresFailed} | Scenarios: ${json.scenariosPassed + json.scenariosfailed} | Passed: ${json.scenariosPassed} | Failed: ${json.scenariosfailed} | Elapsed: ${(json.elapsedTime/1000).toFixed(2)}ms`;
			resultsIcon = ((json.featuresFailed + json.scenariosfailed) > 0) ? `$(error)` : `$(pass)`;
		}
		else
		{
			resultsStats = `Features: ${json.features} | Scenarios: ${json.scenarios} | Passed: ${json.passed} | Failed: ${json.failed} | Elapsed: ${(json.elapsedTime/1000).toFixed(2)}ms`;
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
			ProviderStatusBar.setResults(json.scenariosPassed, json.scenariosfailed);
			ProviderStatusBar.setTooltip(tooltip);
			ProviderStatusBar.setStatus();
		}
		else
		{
			ProviderStatusBar.setResults(json.passed, json.failed);
			ProviderStatusBar.setTooltip(tooltip);
			ProviderStatusBar.setStatus();
		}
	}
}

export default ProviderStatusBar;