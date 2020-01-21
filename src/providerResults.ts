import { getProjectDetail, IProjectDetail } from "./helper";
import * as fs from 'fs';
import * as vscode from 'vscode';


interface IDisposable
{
  dispose(): void;
}

class ProviderResults implements IDisposable
{
  private static resultsJsonWatcher: vscode.FileSystemWatcher;
  private static _onResultsJson: vscode.EventEmitter<any>;

  constructor()
  {
    ProviderResults.resultsJsonWatcher = vscode.workspace.createFileSystemWatcher("**/results-json.txt");
    ProviderResults.resultsJsonWatcher.onDidCreate((e) => { ProviderResults.publish(e); });
    ProviderResults.resultsJsonWatcher.onDidChange((e) => { ProviderResults.publish(e); });

    ProviderResults._onResultsJson = new vscode.EventEmitter<any>();
  }

  private static publish(e: vscode.Uri)
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
    let milli: string = lastModified.getMilliseconds().toString();

    json.lastModified = `${month}/${day}/${year} ${hour}:${minute}:${second}.${milli}`;

    ProviderResults._onResultsJson.fire(json);
  }

  public static get onResultsJson(): vscode.Event<any>
  {
		return ProviderResults._onResultsJson.event;
	}

  public dispose(): void
  {
    ProviderResults._onResultsJson.dispose();
    ProviderResults.resultsJsonWatcher.dispose();
  }
}

export default ProviderResults;