import { ProviderResults } from "./providerResults";
import ProviderExecutions from "./providerExecutions";
import * as vscode from 'vscode';

class ProviderStatusBar
{
	private static statusBarItem: vscode.StatusBarItem;
	private static statusBarCommand: vscode.Disposable;
	private static statusBarCommandId: string = "karateRunner.tests.showExecutionHistory";
	
	constructor(context)
	{
		ProviderStatusBar.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 50);
		ProviderStatusBar.statusBarCommand = vscode.commands.registerCommand(ProviderStatusBar.statusBarCommandId, ProviderExecutions.showExecutionHistory);
		ProviderStatusBar.statusBarItem.command = ProviderStatusBar.statusBarCommandId;
		ProviderStatusBar.reset();
		
		context.subscriptions.push(ProviderStatusBar.statusBarItem);
		context.subscriptions.push(ProviderStatusBar.statusBarCommand);
		
		ProviderResults.onSummaryResults((json) => { ProviderStatusBar.setFromResults(json); });
	}
	
	public static set(passed, failed, tooltip)
	{
		ProviderStatusBar.statusBarItem.text = `Karate $(pass) ${passed} $(error) ${failed}`;
		ProviderStatusBar.statusBarItem.tooltip = tooltip;
		ProviderStatusBar.statusBarItem.show();
	}
	
	public static reset()
	{
		ProviderStatusBar.set(0, 0, "No Results");
	}
	
	private static setFromResults(json)
	{
		let resultsTime: string = `${json.lastModified}`;
		let resultsStats: string;
		
		if ("featuresPassed" in json)
		{
			resultsStats = `Features: ${json.featuresPassed + json.featuresFailed} | Scenarios: ${json.scenariosPassed + json.scenariosfailed} | Passed: ${json.scenariosPassed} | Failed: ${json.scenariosfailed} | Elapsed: ${(json.elapsedTime/1000).toFixed(2)}`;
		}
		else
		{
			resultsStats = `Features: ${json.features} | Scenarios: ${json.scenarios} | Passed: ${json.passed} | Failed: ${json.failed} | Elapsed: ${(json.elapsedTime/1000).toFixed(2)}`;
		}
		
		let resultsClassPath: any = null;
		if (ProviderExecutions.executionArgs !== null && ProviderExecutions.executionArgs.length >= 2)
		{
			resultsClassPath = `${ProviderExecutions.executionArgs[1]}`;
		}
		
		let tooltip: string;
		if (resultsClassPath !== null)
		{
			tooltip = `${resultsTime}\n${resultsClassPath}\n${resultsStats}`;
		}
		else
		{
			tooltip = `${resultsTime}\n${resultsStats}`;
		}
		
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