import { ProviderResults } from "./providerResults";
import { runKarateTest } from "./commands";
import * as vscode from 'vscode';

interface IExecutionItem
{
	executionArgs: any;
	quickPickItem: vscode.QuickPickItem;
}

class ProviderExecutions
{
	private static executionHistory: IExecutionItem[] = [];
	public static executionArgs: any = null;
	private static summaryResultsData: any = null;

	constructor()
	{
		ProviderResults.onSummaryResults((json) => { ProviderExecutions.summaryResultsData = json; });
	}

	public static addExecutionToHistory()
	{
		let json = ProviderExecutions.summaryResultsData;
		if (json === null)
		{
			return;
		}

		if (ProviderExecutions.executionArgs === null)
		{
			return;
		}
		
		let executionDate: string = `${json.lastModified}`;
		let executionStats: string;
		let executionIcon: string;

		if ("featuresPassed" in json)
		{
			executionStats = `Features: ${json.featuresPassed + json.featuresFailed} | Scenarios: ${json.scenariosPassed + json.scenariosfailed} | Passed: ${json.scenariosPassed} | Failed: ${json.scenariosfailed} | Elapsed: ${(json.elapsedTime/1000).toFixed(2)}`;
			executionIcon = ((json.featuresFailed + json.scenariosfailed) > 0) ? `$(error) [F]` : `$(pass) [P]`;
		}
		else
		{
			executionStats = `Features: ${json.features} | Scenarios: ${json.scenarios} | Passed: ${json.passed} | Failed: ${json.failed} | Elapsed: ${(json.elapsedTime/1000).toFixed(2)}`;
			executionIcon = (json.failed > 0) ? `$(error) [F]` : `$(pass) [P]`;
		}

		let executionItem: IExecutionItem = 
		{
			executionArgs: ProviderExecutions.executionArgs,
			quickPickItem:
			{
				label: `${executionIcon} ${executionDate}`,
				description: ProviderExecutions.executionArgs.karateJarOptions,
				detail: `${executionStats}`
			}
		};
	
		let executionHistoryLimit: number = Number(vscode.workspace.getConfiguration('karateRunner.executionHistory').get('limit'));
		executionHistoryLimit = (executionHistoryLimit <= 0) ? 1 : executionHistoryLimit;

		while (ProviderExecutions.executionHistory.length >= executionHistoryLimit)
		{
			ProviderExecutions.executionHistory.pop();
		}

		ProviderExecutions.executionHistory.unshift(executionItem);

		ProviderExecutions.summaryResultsData = null;
	}

	public static async showExecutionHistory()
	{
		if (ProviderExecutions.executionHistory.length <= 0)
		{
			return;
		}
  
		let quickPickItems = ProviderExecutions.executionHistory.map(item => item.quickPickItem);
		let quickPickOptions = <vscode.QuickPickOptions>
		{
			canPickMany: false,
			ignoreFocusOut: false,
			placeHolder: `Select execution to run from history...`
		};
  
		let quickPickExecution = await vscode.window.showQuickPick(quickPickItems, quickPickOptions);
		if (quickPickExecution !== undefined)
		{
			try
			{
				let execution = ProviderExecutions.executionHistory.filter((item) => item.quickPickItem.label == quickPickExecution.label);
				runKarateTest([execution[0].executionArgs]);
			}
			catch(e)
			{
				// do nothing
			}
		}
	}
}

export default ProviderExecutions;