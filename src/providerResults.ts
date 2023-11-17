import { getProjectDetail, getChildAbsolutePath, IProjectDetail, ITestExecutionDetail, escapeHtml } from "./helper";
import { ENTRY_STATE } from "./types/entry";
import * as fs from 'fs';
import path = require("path");
import * as vscode from 'vscode';

interface IDisposable
{
	dispose(): void;
}

interface IStackFrame
{
	uri: vscode.Uri;
	line: number;
	code: string;
	args: string;
	message: string;
	time: number;
	depth: number;
	last: boolean;
}

interface IStackTrace
{
	error: string;
	overflow: number;
	frames: IStackFrame[];
}

interface IStepFail
{
	line: number;
	text: string;
	time: number;
	message: string;
	call: IResult[][];
}

interface IPass
{
	line: number;
}

interface IFail
{
	line: number;
	message: string;
	stepfails: IStepFail[];
}

interface IResult
{
	uri: vscode.Uri;
	path: string;
	line: number;
	callArgs: string;
	tags: string[];
	name: string;
	isOutline: boolean;
	isFeature: boolean;
	passes: IPass[];
	fails: IFail[];
	state: ENTRY_STATE;
	time: number;
}

interface IAggregateResult
{
	passes: IPass[];
	fails: IFail[];
	state: ENTRY_STATE;
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
		let projectDetail: IProjectDetail = getProjectDetail(e, vscode.FileType.File);
		let projectRootPath = projectDetail.projectRoot;

		let data: string = fs.readFileSync(e.fsPath, "utf8");
		let json: any = JSON.parse(data);

		json.projectRoot = projectRootPath;

		let getFileResults = (json: any, depth: number = 0): IResult[] =>
		{
			let results: IResult[] = [];

			let prefixedPath: string = json.prefixedPath.replace(/^classpath:/,'');
			let normalizedPrefixedPath: string = (path.sep === '/') ? prefixedPath.replace(/\\/g, '/') : prefixedPath.replace(/\//g, '\\');
			let normalizedRootPath: string = (path.sep === '/') ? projectRootPath.replace(/\\/g, '/') : projectRootPath.replace(/\//g, '\\');
			let resultFile: string = getChildAbsolutePath(normalizedRootPath, normalizedPrefixedPath);
			let resultUri: vscode.Uri = vscode.Uri.file(resultFile);
			
			let lastIndex = -1;
			let lastSectionIndex = -1;

			let result: IResult =
			{
				uri: null,
				path: null,
				line: null,
				callArgs: null,
				tags: null,
				name: null,
				isFeature: null,
				isOutline: null,
				passes: null,
				fails: null,
				state: null,
				time: null
			};
	
			for (let ndx = 0; ndx < json.scenarioResults.length; ndx++)
			{
				if (lastIndex !== -1 && lastSectionIndex === json.scenarioResults[ndx].sectionIndex)
				{
					switch (json.scenarioResults[ndx].failed)
					{
						case false:
							results[lastIndex].passes.push({ line: json.scenarioResults[ndx].line });
							break;
		
						case true:
							results[lastIndex].state = ENTRY_STATE.FAIL;
							
							let fail: IFail = { line: 0, message: "", stepfails: [] };
							fail.line = json.scenarioResults[ndx].line;
							fail.message = json.scenarioResults[ndx].error;
							
							json.scenarioResults[ndx].stepResults.forEach((stepResult: any) =>
							{
								if (stepResult.result.status.trim().toLowerCase() === "failed")
								{
									let stepFail: IStepFail = 
									{
										line: stepResult.step.line,
										text: `${stepResult.step.prefix} ${stepResult.step.text}`,
										time: stepResult.result.millis,
										message: stepResult.result.errorMessage,
										call: []
									};

									if (stepResult.callResults)
									{
										stepResult.callResults.forEach((callResult: any) =>
										{
											if (callResult.failedCount > 0)
											{
												stepFail.call.push(getFileResults(callResult, depth + 1));
											}
										});
									}

									fail.stepfails.push(stepFail);
								}
							});
	
							results[lastIndex].fails.push(fail);
							break;
					}
				}
				else
				{
					result = 
					{
						uri: resultUri,
						path: prefixedPath,
						line: json.scenarioResults[ndx].line,
						callArgs: (json.callArg) ? JSON.stringify(json.callArg) : null,
						tags: json.scenarioResults[ndx].tags,
						name: json.scenarioResults[ndx].name,
						isFeature: false,
						isOutline: (json.scenarioResults[ndx].exampleIndex === -1) ? false : true,
						passes: [],
						fails: [],
						state: ENTRY_STATE.NONE,
						time: json.scenarioResults[ndx].durationMillis
					};
	
					switch (json.scenarioResults[ndx].failed)
					{
						case false:
							result.passes.push({ line: json.scenarioResults[ndx].line });
							result.state = ENTRY_STATE.PASS;
							break;
		
						case true:
							let fail: IFail = { line: 0, message: "", stepfails: [] };
							fail.line = json.scenarioResults[ndx].line;
							fail.message = json.scenarioResults[ndx].error;
							
							json.scenarioResults[ndx].stepResults.forEach((stepResult: any) =>
							{
								if (stepResult.result.status.trim().toLowerCase() === "failed")
								{
									let stepFail: IStepFail = 
									{
										line: stepResult.step.line,
										text: `${stepResult.step.prefix} ${stepResult.step.text}`,
										time: stepResult.result.millis,
										message: stepResult.result.errorMessage,
										call: []
									};

									if (stepResult.callResults)
									{
										stepResult.callResults.forEach((callResult: any) =>
										{
											if (callResult.failedCount > 0)
											{
												stepFail.call.push(getFileResults(callResult, depth + 1));
											}
										});
									}

									fail.stepfails.push(stepFail);
								}
							});
	
							result.fails.push(fail);
							result.state = ENTRY_STATE.FAIL;
							break;
					}
	
					let targetIndex = results.findIndex((r) => r.name === result.name && r.path === result.path);
					if (targetIndex === -1)
					{
						results.push(result);
						targetIndex = results.length - 1;
					}
					else
					{
						results[targetIndex] = result;
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

			return results;
		}

		let fileResults = getFileResults(json);
		fileResults.forEach((fr) =>
		{
			let targetIndex = ProviderResults.results.findIndex((r) => r.name === fr.name && r.path === fr.path);

			if (targetIndex === -1)
			{
				ProviderResults.results.push(fr);
			}
			else
			{
				ProviderResults.results[targetIndex] = fr;
			}
		});

		let prefixedPath: string = json.prefixedPath.replace(/^classpath:/,'');
		let normalizedPrefixedPath: string = (path.sep === '/') ? prefixedPath.replace(/\\/g, '/') : prefixedPath.replace(/\//g, '\\');
		let normalizedRootPath: string = (path.sep === '/') ? projectRootPath.replace(/\\/g, '/') : projectRootPath.replace(/\//g, '\\');
		let resultFile: string = getChildAbsolutePath(normalizedRootPath, normalizedPrefixedPath);
		let resultUri: vscode.Uri = vscode.Uri.file(resultFile);

		let result = 
		{
			uri: resultUri,
			path: prefixedPath,
			line: 0,
			callArgs: null,
			tags: null,
			name: json.name,
			isFeature: true,
			isOutline: false,
			passes: [],
			fails: [],
			state: ENTRY_STATE.NONE,
			time: null
		};
		
		let results = ProviderResults.results.filter((r) => r.path === result.path && !r.isFeature);
		result.passes = results.reduce((total, {passes}) => total.concat(passes), []);
		result.fails = results.reduce((total, {fails}) => total.concat(fails), []);
		result.time = results.reduce((total, {time}) => total + time, 0);
		
		if (json.failedCount > 0 || result.fails.length > 0)
		{
			result.state = ENTRY_STATE.FAIL;
		}
		else
		{
			result.state = ENTRY_STATE.PASS;
		}
		
		let findIndex = ProviderResults.results.findIndex((r) => r.line === result.line && r.path === result.path);
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
			passes: [],
			fails: [],
			state: ENTRY_STATE.NONE
		};

		if (ProviderResults.results.length > 0)
		{
			let workspaceFolder = vscode.workspace.workspaceFolders.filter((folder) => folder.uri.scheme === 'file')[0];
			let workspacePath = workspaceFolder.uri.path + '/';
			let folderPath = uri.path.split(workspacePath)[1];
		
			let results = ProviderResults.results.filter((r) => r.path.startsWith(folderPath) && r.isFeature);
			if (results.length > 0)
			{
				folderResult.passes = results.reduce((total, {passes}) => total.concat(passes), []);
				folderResult.fails = results.reduce((total, {fails}) => total.concat(fails), []);
	
				if (folderResult.fails.length > 0)
				{
					folderResult.state = ENTRY_STATE.FAIL;
				}
				else if (folderResult.passes.length > 0)
				{
					folderResult.state = ENTRY_STATE.PASS;
				}
			}
		}

		return folderResult;
	}

	public static getFileResult(uri: vscode.Uri): IAggregateResult
	{
		let fileResult: IAggregateResult = 
		{
			passes: [],
			fails: [],
			state: ENTRY_STATE.NONE
		};

		let results = ProviderResults.results.filter((r) => uri.path.endsWith(r.path) && r.isFeature);
		if (results.length > 0)
		{
			fileResult.passes = results.reduce((total, {passes}) => total.concat(passes), []);
			fileResult.fails = results.reduce((total, {fails}) => total.concat(fails), []);

			if (fileResult.fails.length > 0)
			{
				fileResult.state = ENTRY_STATE.FAIL;
			}
			else if (fileResult.passes.length > 0)
			{
				fileResult.state = ENTRY_STATE.PASS;
			}
		}
	
		return fileResult;
	}

	public static getFileTagResult(uri: vscode.Uri, tag: String)
	{
		let fileTagResult: IAggregateResult = 
		{
			passes: [],
			fails: [],
			state: ENTRY_STATE.NONE
		};

		let results = ProviderResults.results.filter((r) => uri.path.endsWith(r.path) && !r.isFeature && r.tags.includes(tag.replace(/^@/, '')));
		if (results.length > 0)
		{
			fileTagResult.passes = results.reduce((total, {passes}) => total.concat(passes), []);
			fileTagResult.fails = results.reduce((total, {fails}) => total.concat(fails), []);

			if (fileTagResult.fails.length > 0)
			{
				fileTagResult.state = ENTRY_STATE.FAIL;
			}
			else if (fileTagResult.passes.length > 0)
			{
				fileTagResult.state = ENTRY_STATE.PASS;
			}
		}
	
		return fileTagResult;
	}

	public static getTagResult(tag: string): IAggregateResult
	{
		let tagResult: IAggregateResult = 
		{
			passes: [],
			fails: [],
			state: ENTRY_STATE.NONE
		};

		let results = ProviderResults.results.filter((r) => !r.isFeature && r.tags.includes(tag.replace(/^@/, '')));
		if (results.length > 0)
		{
			tagResult.passes = results.reduce((total, {passes}) => total.concat(passes), []);
			tagResult.fails = results.reduce((total, {fails}) => total.concat(fails), []);

			if (tagResult.fails.length > 0)
			{
				tagResult.state = ENTRY_STATE.FAIL;
			}
			else if (tagResult.passes.length > 0)
			{
				tagResult.state = ENTRY_STATE.PASS;
			}
		}
	
		return tagResult;
	}

	public static getTestResult(ted: ITestExecutionDetail): ENTRY_STATE
	{
		let result = ProviderResults.getResult(ted);
		return (result === null) ? ENTRY_STATE.NONE : result.state;
	}

	public static getTestTime(ted: ITestExecutionDetail): number
	{
		let result = ProviderResults.getResult(ted);
		return (result === null) ? null : result.time;
	}

	public static getResult(ted: ITestExecutionDetail): IResult
	{
		let path = ted.testUri.path;
		let result: IResult = null;
		
		if (ted.testTitle.startsWith("Feature:"))
		{
			path = path + ":0";
			let filteredResults = ProviderResults.results.filter((e) => e.isFeature && path.endsWith(e.path + ":" + e.line));	
			if (filteredResults.length === 1)
			{
				result = filteredResults[0];
			}
		}
		else
		{
			let filteredResults = ProviderResults.results.filter((e) => path.endsWith(e.path) && !e.isFeature && ted.testTitle.endsWith(e.name));
			if (filteredResults.length === 1)
			{
				result = filteredResults[0];
			}
			else
			{
				let testTitle = ted.testTitle;
				if (testTitle.startsWith("Scenario Outline:") &&
					testTitle.indexOf("<") !== -1 &&
					testTitle.indexOf(">") !== -1)
				{
					let newTestTitle = testTitle.replace(/^Scenario Outline:\s*/, "")
						.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')
						.replace(/<[^>]+>/g, "'*[^\\s]+'*");
					
					let regex = new RegExp(`^${newTestTitle}$`);
					filteredResults = ProviderResults.results.filter((e) => path.endsWith(e.path) && regex.test(e.name));
					if (filteredResults.length === 1)
					{
						result = filteredResults[0];
					}
					else
					{
						let newTestTitle = testTitle.replace(/^Scenario Outline:\s*/, "")
						.replace(/\s+/g, "")
						.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')
						.replace(/<[^>]+>/g, "'*[^\\s]+'*")
					
						let regex = new RegExp(`^${newTestTitle}$`);
						filteredResults = ProviderResults.results.filter((e) => path.endsWith(e.path) && regex.test(e.name.replace(/\s+/g, "")));
						if (filteredResults.length === 1)
						{
							result = filteredResults[0];
						}
					}
				}
			}
		}
	
		return result;
	}

	public static getFullSummary(ted: ITestExecutionDetail): vscode.MarkdownString[]
	{
		let summary: vscode.MarkdownString[] = [];

		let result = ProviderResults.getResult(ted);
		if (result)
		{
			let summaryHeader = new vscode.MarkdownString();
			let summaryFooter = new vscode.MarkdownString(undefined, true);

			summaryHeader.appendCodeblock(ted.testTitle, 'karate');
			summary.push(summaryHeader);

			if (result.fails)
			{
				result.fails.forEach((f) =>
				{
					let summaryBody = new vscode.MarkdownString(undefined, true);
					summaryBody.isTrusted = true;
					summaryBody.supportHtml = true;

					let stackTrace: IStackTrace = ProviderResults.getStackTrace(result, f);
					summaryBody.appendMarkdown(ProviderResults.getStackTraceMarkdown(stackTrace));
					summary.push(summaryBody);
				});

				summaryFooter.appendMarkdown(`$(error) ${result.fails.length} error(s)`);
			}
			else
			{
				summaryFooter.appendMarkdown(`$(error) 0 error(s)`);
			}

			summary.push(summaryFooter);
		}

		return summary;
	}

	public static getPartialSummary(ted: ITestExecutionDetail): vscode.MarkdownString
	{
		let summary = new vscode.MarkdownString(undefined, true);
		summary.isTrusted = true;
		summary.supportHtml = true;

		let result = ProviderResults.getResult(ted);
		if (result)
		{
			summary.appendCodeblock(ted.testTitle, 'karate');
			summary.appendMarkdown('<hr/>');
			summary.appendText('\n');
			
			if (result.fails)
			{
				if (result.fails.length > 0)
				{
					let stackTrace: IStackTrace = ProviderResults.getStackTrace(result, result.fails[0]);
					summary.appendMarkdown(ProviderResults.getStackTraceMarkdown(stackTrace, 30));
					summary.appendText('\n');
					summary.appendMarkdown('<hr/>');
					summary.appendText('\n');

					if (result.fails.length > 1)
					{
						summary.appendMarkdown(`$(error) ${result.fails.length - 1} more error(s)...`);
					}
					else
					{
						summary.appendMarkdown(`$(error) 1 error(s)`);
					}
				}
				else
				{
					summary.appendMarkdown(`$(error) 0 error(s)`);
				}
			}
			else
			{
				summary.appendMarkdown(`$(error) 0 error(s)`);
			}
		}

		return summary;
	}

	private static getStackTrace(result: IResult, fail: IFail, frameLimiter: number = 100, depth: number = 0): IStackTrace
	{
		let stackTrace: IStackTrace = { error: fail.message, overflow: 0, frames: [] };

		let stackFrame: IStackFrame = 
		{
			uri: result.uri,
			line: fail.line,
			code: result.name,
			args: result.callArgs,
			message: fail.message,
			time: result.time,
			depth: depth,
			last: false
		};

		stackTrace.frames.unshift(stackFrame);

		fail.stepfails.forEach((sf) =>
		{
			let stackFrame: IStackFrame = 
			{
				uri: result.uri,
				line: sf.line,
				code: sf.text,
				args: result.callArgs,
				message: sf.message,
				time: sf.time,
				depth: depth,
				last: false
			};

			stackTrace.frames.unshift(stackFrame);

			for (let ndx1 = 0; ndx1 < sf.call.length; ndx1++)
			{
				let _results: IResult[] = sf.call[ndx1];

				for (let ndx2 = 0; ndx2 < _results.length; ndx2++)
				{
					let _result: IResult = _results[ndx2];

					for (let ndx3 = 0; ndx3 < _result.fails.length; ndx3++)
					{
						let _stackTrace = ProviderResults.getStackTrace(_result, _result.fails[ndx3], frameLimiter, depth + 1);
						stackTrace.frames = _stackTrace.frames.concat(stackTrace.frames);
					}

					stackTrace.frames[0].last = true;
				}

				stackTrace.frames[0].last = true;
			}

			stackTrace.frames[0].last = true;
		});

		stackTrace.frames[0].last = true;

		if (depth === 0)
		{
			if (frameLimiter && stackTrace.frames.length > frameLimiter)
			{
				let overflow = stackTrace.frames.length - frameLimiter;
				stackTrace.frames.splice(frameLimiter);
				stackTrace.overflow = overflow;
			}
		}

		return stackTrace;
	}

	private static getStackTraceMarkdown(stackTrace: IStackTrace, frameLimiter: number = null): string
	{
		let stackTraceMarkdown = '';

		if (frameLimiter && frameLimiter > 0 && stackTrace.frames.length > frameLimiter)
		{
			let overflow = stackTrace.frames.length - frameLimiter;
			stackTrace.overflow += overflow;
			stackTrace.frames.splice(frameLimiter);
		}

		stackTrace.frames.forEach((f, ndx) =>
		{
			let markdownLine = '';

			if (ndx > 0)
			{
				markdownLine = '<br/>';
			}

			if (!f.last)
			{
				markdownLine += `${'$(arrow-small-up)'.repeat(f.depth + 1)}`;
			}
			else
			{
				markdownLine += `${'$(arrow-small-right)'.repeat(f.depth) + '$(debug-breakpoint) '}`;
			}

			let linkText = path.basename(f.uri.fsPath);
			let regexp: RegExp = new RegExp(`(.{${70 - (f.depth + 1 + linkText.length)}})..+`);
			let lineText = f.code.replace(/^\*\s*/, '').replace(regexp, "$1&hellip;");
			let frameArgs = encodeURIComponent(JSON.stringify([{ testUri: f.uri, testLine: f.line - 1 }]));
			let frameCmd = `command:karateRunner.tests.open?${frameArgs}`;
			let linkTooltip = `[time] ${f.time.toFixed(2)}ms - [error] ${escapeHtml(f.message)}`;
			
			if (f.args)
			{
				linkTooltip += ` - [args] ${escapeHtml(f.args)}`;
			}

			markdownLine += `${lineText} [${linkText}:${f.line}](${frameCmd} "${linkTooltip}")`;
			stackTraceMarkdown += markdownLine;
		});

		if (stackTrace.overflow > 0)
		{
			stackTraceMarkdown += `<br/>${stackTrace.overflow} more frame(s)...`;
		}

		return stackTraceMarkdown;
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