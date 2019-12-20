import ProviderResults from "./providerResults";
import { runKarateTest } from "./commands";
import * as vscode from 'vscode';


interface ExecutionItem
{
  executionArgs: any;
  quickPickItem: vscode.QuickPickItem;
}

class ProviderExecutions
{
    private static executionHistory: ExecutionItem[] = [];
    public static executionArgs: any = null;
    private static jsonResultsData: any = null;

    constructor()
    {
        ProviderResults.onResultsJson((json) => { ProviderExecutions.jsonResultsData = json; });
    }

    public static addExecutionToHistory()
    {
      let json = ProviderExecutions.jsonResultsData;
      if(json === null)
      {
        return;
      }

      if(ProviderExecutions.executionArgs === null)
      {
        return;
      }

      let executionDate: string = `${json.lastModified}`;
      let executionStats: string = `Features: ${json.features} | Scenarios: ${json.scenarios} | Passed: ${json.passed} | Failed: ${json.failed} | Elapsed: ${(json.elapsedTime/1000).toFixed(2)}`;
      let executionIcon: string = (json.failed > 0) ? `$(bug) [F]` : `$(check) [P]`;
      let executionItem: ExecutionItem = 
        {
          executionArgs: ProviderExecutions.executionArgs,
          quickPickItem:
            {
              label: `${executionIcon} ${executionDate}`,
              description: ProviderExecutions.executionArgs[1],
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

      ProviderExecutions.jsonResultsData = null;
    }

    public static async showExecutionHistory()
    {
      if(ProviderExecutions.executionHistory.length <= 0)
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
          console.debug(execution[0].quickPickItem.label);
          runKarateTest(execution[0].executionArgs);
        }
        catch(e)
        {
          console.debug(e);
        }
      }
    }
}

export default ProviderExecutions;