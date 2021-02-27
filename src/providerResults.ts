import { getProjectDetail, IProjectDetail } from "./helper";
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
		for (let ndx = 0; ndx < json.scenarioResults.length; ndx++)
		{
			let result: IResult = 
			{
				path: json.prefixedPath,
				line: json.scenarioResults[ndx].line,
				name: json.scenarioResults[ndx].name,
				isFeature: false,
				isOutline: (json.scenarioResults[ndx].exampleIndex === -1) ? false : true,
				state: ProviderResults.ENTRY_STATE.NONE
			};
			
			switch (json.scenarioResults[ndx].failed)
			{
				case false:
				    result.state = ProviderResults.ENTRY_STATE.PASS;
				    break;

				case true:
				    result.state = ProviderResults.ENTRY_STATE.FAIL;
				    break;
			}
			
			if (lastIndex !== -1 && lastSectionIndex === json.scenarioResults[ndx].sectionIndex)
			{
				if (result.state === ProviderResults.ENTRY_STATE.FAIL)
				{
					ProviderResults.results[lastIndex].state = ProviderResults.ENTRY_STATE.FAIL;
				}
			}
			else
			{
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
		
		let result: IResult = 
		{
			path: json.prefixedPath,
			line: 0,
			name: null,
			isFeature: true,
			isOutline: false,
			state: ProviderResults.ENTRY_STATE.NONE
		};
		
		let filteredResults = ProviderResults.results.filter((e) => 
		{
			return e.path === result.path && !e.isFeature && e.state === ProviderResults.ENTRY_STATE.FAIL;
		});
		
		if (json.failedCount > 0 || filteredResults.length > 0)
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