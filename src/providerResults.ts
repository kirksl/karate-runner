import { getProjectDetail, IProjectDetail } from "./helper";
import * as fs from 'fs';
import * as vscode from 'vscode';

interface IDisposable
{
  dispose(): void;
}

class ProviderResults implements IDisposable
{
  private static summaryResultsWatcher: vscode.FileSystemWatcher;
  private static testResultsWatcher: vscode.FileSystemWatcher;
  private static _onSummaryResults: vscode.EventEmitter<any>;
  private static _onTestResults: vscode.EventEmitter<any>;

  constructor()
  {
    ProviderResults.summaryResultsWatcher = vscode.workspace.createFileSystemWatcher("**/{results,karate-reports/karate-summary}-json.txt");
    ProviderResults.summaryResultsWatcher.onDidCreate((e) => { ProviderResults.publishSummaryResults(e); });
    ProviderResults.summaryResultsWatcher.onDidChange((e) => { ProviderResults.publishSummaryResults(e); });

    ProviderResults._onSummaryResults = new vscode.EventEmitter<any>();

    ProviderResults.testResultsWatcher = vscode.workspace.createFileSystemWatcher("**/karate-reports/*.karate-json.txt");
    ProviderResults.testResultsWatcher.onDidCreate((e) => { ProviderResults.publishTestResults(e); });
    ProviderResults.testResultsWatcher.onDidChange((e) => { ProviderResults.publishTestResults(e); });

    ProviderResults._onTestResults = new vscode.EventEmitter<any>();
  }

  private static publishSummaryResults(e: vscode.Uri)
  {
    let projectDetail: IProjectDetail = getProjectDetail(e, vscode.FileType.File);
    let projectRootPath: string = projectDetail.projectRoot;

    let data: string = fs.readFileSync(e.fsPath, "utf8");
    let stats: fs.Stats = fs.statSync(e.fsPath);
    let json: any = JSON.parse(data);

    json.projectRoot = projectRootPath;

    let lastModified: Date = stats.mtime;
    let month: string = (lastModified.getMonth() + 1).toString().padStart(2, '0');
    let day: string = lastModified.getDate().toString().padStart(2, '0');
    let year: string = lastModified.getFullYear().toString();
    let hour: string = lastModified.getHours().toString().padStart(2, '0');
    let minute: string = lastModified.getMinutes().toString().padStart(2, '0');
    let second: string = lastModified.getSeconds().toString().padStart(2, '0');
    let milli: string = lastModified.getMilliseconds().toString().padEnd(3, '0');

    json.lastModified = `${month}/${day}/${year} ${hour}:${minute}:${second}.${milli}`;

    ProviderResults._onSummaryResults.fire(json);
  }

  public static publishTestResults(e: vscode.Uri)
  {
		let data: string = fs.readFileSync(e.fsPath, "utf8");
		let json: any = JSON.parse(data);

    ProviderResults._onTestResults.fire(json);
  }

  public static get onSummaryResults(): vscode.Event<any>
  {
		return ProviderResults._onSummaryResults.event;
	}

  public static get onTestResults(): vscode.Event<any>
  {
		return ProviderResults._onTestResults.event;
	}

  public dispose(): void
  {
    ProviderResults._onSummaryResults.dispose();
    ProviderResults.summaryResultsWatcher.dispose();
    ProviderResults._onTestResults.dispose();
    ProviderResults.testResultsWatcher.dispose();
  }
}

export default ProviderResults;