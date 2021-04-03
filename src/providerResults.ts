import { getProjectDetail, IProjectDetail, ITestExecutionDetail } from "./helper";
import * as fs from 'fs';
import * as vscode from 'vscode';

interface IDisposable
{
	dispose(): void;
}

interface IResult
{
	path: string;
	line: number;
	name: string;
	isOutline: boolean;
	isFeature: boolean;
    passes: number;
    fails: number;
	state: ProviderResults.ENTRY_STATE;
}

interface IAggregateResult
{
    passes: number;
    fails: number;
    state: ProviderResults.ENTRY_STATE;
}

export class ProviderResults implements IDisposable
{
	public static results: IResult[] = [];
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
	
	private static publishTestResults(e: vscode.Uri)
	{
		let data: string = fs.readFileSync(e.fsPath, "utf8");
		let json: any = JSON.parse(data);
		
		let lastIndex = -1;
		let lastSectionIndex = -1;
        let result: IResult =
        {
            path: null,
            line: null,
            name: null,
            isFeature: null,
            isOutline: null,
            passes: null,
            fails: null,
            state: null
        };

		for (let ndx = 0; ndx < json.scenarioResults.length; ndx++)
		{	
			if (lastIndex !== -1 && lastSectionIndex === json.scenarioResults[ndx].sectionIndex)
			{
				if (json.scenarioResults[ndx].failed)
				{
					ProviderResults.results[lastIndex].state = ProviderResults.ENTRY_STATE.FAIL;
				}

                switch (json.scenarioResults[ndx].failed)
                {
                    case false:
                        ProviderResults.results[lastIndex].passes += 1;
                        break;
    
                    case true:
                        ProviderResults.results[lastIndex].fails += 1;
                        break;
                }
			}
			else
			{
                result = 
                {
                    path: json.prefixedPath,
                    line: json.scenarioResults[ndx].line,
                    name: json.scenarioResults[ndx].name,
                    isFeature: false,
                    isOutline: (json.scenarioResults[ndx].exampleIndex === -1) ? false : true,
                    passes: 0,
                    fails: 0,
                    state: ProviderResults.ENTRY_STATE.NONE
                };

                switch (json.scenarioResults[ndx].failed)
                {
                    case false:
                        result.passes = 1;
                        result.state = ProviderResults.ENTRY_STATE.PASS;
                        break;
    
                    case true:
                        result.fails = 1;
                        result.state = ProviderResults.ENTRY_STATE.FAIL;
                        break;
                }

				let targetIndex = ProviderResults.results.findIndex(r => r.name === result.name && r.path === result.path);
				if (targetIndex === -1)
				{
					ProviderResults.results.push(result);
					targetIndex = ProviderResults.results.length - 1;
				}
				else
				{
					ProviderResults.results[targetIndex] = result;
				}
				
				if (result.isOutline)
				{
					lastIndex = targetIndex;
					lastSectionIndex = json.scenarioResults[ndx].sectionIndex;
				}
				else
				{
					lastIndex = -1;
					lastSectionIndex = -1;
				}
			}
		}
		
		result = 
		{
			path: json.prefixedPath,
			line: 0,
			name: null,
			isFeature: true,
			isOutline: false,
            passes: 0,
            fails: 0,
			state: ProviderResults.ENTRY_STATE.NONE
		};
		
        let results = ProviderResults.results.filter(r => r.path === result.path && !r.isFeature);
        result.passes = results.reduce((n, {passes}) => n + passes, 0);
        result.fails = results.reduce((n, {fails}) => n + fails, 0);
		
		if (json.failedCount > 0 || result.fails > 0)
		{
			result.state = ProviderResults.ENTRY_STATE.FAIL;
		}
		else
		{
			result.state = ProviderResults.ENTRY_STATE.PASS;
		}
		
		let findIndex = ProviderResults.results.findIndex(r => r.line === result.line && r.path === result.path);
		if (findIndex === -1)
		{
			ProviderResults.results.push(result);
		}
		else
		{
			ProviderResults.results[findIndex] = result;
		}
		
		ProviderResults._onTestResults.fire(json);
	}
	
	public static clearTestResults()
	{
		ProviderResults.results = [];
	}
	
    public static getFolderResult(uri: vscode.Uri): IAggregateResult
    {
        let folderResult: IAggregateResult = 
        {
            passes: 0,
            fails: 0,
            state: ProviderResults.ENTRY_STATE.NONE
        };

        if (ProviderResults.results.length > 0)
        {
            let workspaceFolder = vscode.workspace.workspaceFolders.filter(folder => folder.uri.scheme === 'file')[0];
            let workspacePath = workspaceFolder.uri.path + '/';
            let folderPath = uri.path.split(workspacePath)[1];
        
            let results = ProviderResults.results.filter(r => r.path.startsWith(folderPath) && r.isFeature);
            if (results.length > 0)
            {
                folderResult.passes = results.reduce((n, {passes}) => n + passes, 0);
                folderResult.fails = results.reduce((n, {fails}) => n + fails, 0);
    
                if (folderResult.fails > 0)
                {
                    folderResult.state = ProviderResults.ENTRY_STATE.FAIL;
                }
                else if (folderResult.passes > 0)
                {
                    folderResult.state = ProviderResults.ENTRY_STATE.PASS;
                }
            }
        }

        return folderResult;
    }

    public static getFileResult(uri: vscode.Uri): IAggregateResult
    {
        let fileResult: IAggregateResult = 
        {
            passes: 0,
            fails: 0,
            state: ProviderResults.ENTRY_STATE.NONE
        };

        let results = ProviderResults.results.filter(r => uri.path.endsWith(r.path) && r.isFeature);
        if (results.length > 0)
        {
            fileResult.passes = results.reduce((n, {passes}) => n + passes, 0);
            fileResult.fails = results.reduce((n, {fails}) => n + fails, 0);

            if (fileResult.fails > 0)
            {
                fileResult.state = ProviderResults.ENTRY_STATE.FAIL;
            }
            else if (fileResult.passes > 0)
            {
                fileResult.state = ProviderResults.ENTRY_STATE.PASS;
            }
        }
    
        return fileResult;
    }

    public static getTestResult(ted: ITestExecutionDetail): ProviderResults.ENTRY_STATE
    {
        let path = ted.testUri.path;
        let state = ProviderResults.ENTRY_STATE.NONE;
        
        if (ted.testTitle.startsWith("Feature:"))
        {
            path = path + ":0";
            let filteredResults = ProviderResults.results.filter(e => path.endsWith(e.path + ":" + e.line));	
            if (filteredResults.length === 1)
            {
                state = filteredResults[0].state;
            }
        }
        else
        {
            let filteredResults = ProviderResults.results.filter(e => path.endsWith(e.path) && ted.testTitle.endsWith(e.name));
            if (filteredResults.length === 1)
            {
                state = filteredResults[0].state;
            }
        }
    
        return state;
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

export namespace ProviderResults
{
	export enum ENTRY_STATE
	{
		NONE,
		PASS,
		FAIL
	}
}