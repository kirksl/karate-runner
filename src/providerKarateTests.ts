import { getTestExecutionDetail, ITestExecutionDetail } from "./helper";
import ProviderFileSystem from "./providerFileSystem";
import ProviderResults from "./providerResults";
import * as vscode from 'vscode';
import * as path from 'path';

enum EntryState
{
	None,
	Pass,
	Fail
}

interface IEntry
{
	uri: any;
	type: vscode.FileType;
	command?: vscode.Command;
	state?: EntryState;
}

interface IResult
{
	path: string;
	line: number;
	isOutline: boolean;
	isFeature: boolean;
	state: EntryState;
}

export class ProviderKarateTests implements vscode.TreeDataProvider<IEntry>
{
	private results: IResult[] = [];
	private providerFileSystem: ProviderFileSystem;
	private _onDidChangeTreeData: vscode.EventEmitter<any> = new vscode.EventEmitter<any>();
	readonly onDidChangeTreeData: vscode.Event<any> = this._onDidChangeTreeData.event;

	constructor()
	{
		this.providerFileSystem = new ProviderFileSystem();
		ProviderResults.onTestResults((json) => { this.storeResults(json); });
	}

	public refresh()
	{
		this._onDidChangeTreeData.fire();
	}

	private storeResults(json)
	{
		let lastIndex = -1;
		let lastSectionIndex = -1;
		for (let ndx = 0; ndx < json.scenarioResults.length; ndx++)
		{
			let result: IResult = 
			{
				path: json.prefixedPath,
				line: json.scenarioResults[ndx].line,
				isFeature: false,
				isOutline: (json.scenarioResults[ndx].exampleIndex === -1) ? false : true,
				state: EntryState.None
			};

			switch (json.scenarioResults[ndx].failed)
			{
				case false:
					result.state = EntryState.Pass;
					break;
				case true:
					result.state = EntryState.Fail;
					break;
			}

			if (lastIndex !== -1 && lastSectionIndex === json.scenarioResults[ndx].sectionIndex)
			{
				if (result.state === EntryState.Fail)
				{
					this.results[lastIndex].state = EntryState.Fail;
				}
			}
			else
			{
				let targetIndex = this.results.findIndex(r => r.line === result.line && r.path === result.path);
				if (targetIndex === -1)
				{
					this.results.push(result);
					targetIndex = this.results.length - 1;
				}
				else
				{
					this.results[targetIndex] = result;
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
			isFeature: true,
			isOutline: false,
			state: EntryState.None
		};

		let filteredResults = this.results.filter((e) => 
		{
			return e.path === result.path && !e.isFeature && e.state === EntryState.Fail;
		});

		if (json.failedCount > 0 || filteredResults.length > 0)
		{
			result.state = EntryState.Fail;
		}
		else
		{
			result.state = EntryState.Pass;
		}

		let findIndex = this.results.findIndex(r => r.line === result.line && r.path === result.path);
		if (findIndex === -1)
		{
			this.results.push(result);
		}
		else
		{
			this.results[findIndex] = result;
		}

		this.refresh();
	}

	public clearResults(): any
	{
		this.results = [];
		this.refresh();
	}

	async getChildren(element?: IEntry): Promise<IEntry[]>
	{
		let glob = String(vscode.workspace.getConfiguration('karateRunner.tests').get('toTarget'));
		let karateTestFiles = await vscode.workspace.findFiles(glob).then((value) => { return value; });

		if (element)
		{
			if (element.type === vscode.FileType.File)
			{
				let karateTests: IEntry[] = [];
				let tedArray: ITestExecutionDetail[] = await getTestExecutionDetail(element.uri, vscode.FileType.File);

				tedArray.forEach((ted) =>
				{
					let commandArgs = new Array();
					commandArgs.push(ted.karateOptions);
					commandArgs.push(ted.karateJarOptions);
					commandArgs.push(element.uri);
					commandArgs.push(vscode.FileType.File);
					let karateTestCommand: vscode.Command =
					{
						arguments: [commandArgs],
						command: "karateRunner.tests.run",
						title: ted.codelensRunTitle
					};

					let state = EntryState.None;
					if (ted.testTitle.startsWith("Feature:"))
					{
						let path = element.uri.path + ":0";
						let filteredResults = this.results.filter(e => path.endsWith(e.path + ":" + e.line));	
						if (filteredResults.length === 1)
						{
							state = filteredResults[0].state;
						}
					}
					else if (ted.testTitle.startsWith("Scenario:"))
					{
						let path = element.uri.path + ":" + ted.debugLine;
						let filteredResults = this.results.filter(e => path.endsWith(e.path + ":" + e.line));	
						if (filteredResults.length === 1)
						{
							state = filteredResults[0].state;
						}
					}
					else if (ted.testTitle.startsWith("Scenario Outline:"))
					{
						let path = element.uri.path + ":" + ted.debugLine;
						let filteredResults = this.results.filter((e) =>
						{
							let re = new RegExp(e.path + ":" + "[0-9]+");
							return e.isOutline && re.test(path) && e.line > ted.debugLine;
						});

						filteredResults.sort((a, b) =>
						{
							return a.line - b.line;
						});

						let found = filteredResults.find((e) =>
						{
						  	return e.line > ted.debugLine;
						});

						if (found !== undefined)
						{
							state = found.state;
						}
					}

					karateTests.push(
					{
						uri: ted.testTitle,
						type: vscode.FileType.Unknown,
						command: karateTestCommand,
						state: state
					});
				});

				return karateTests;
			}

			let displayType = String(vscode.workspace.getConfiguration('karateRunner.tests').get('activityBarDisplayType'));

			if (displayType === "Shallow")
			{
				let karateTestFilesFiltered = karateTestFiles.filter((karateTestFile) =>
				{
					return karateTestFile.toString().startsWith(element.uri.toString());
				});

				return karateTestFilesFiltered.sort().map((karateTestFile) =>
					(
						{
							uri: karateTestFile,
							type: vscode.FileType.File,
							command: {
								command: "karateRunner.tests.open",
								title: "karateRunner.tests.open"
							}
						}
					)
				);
			}
			else
			{
				let children = await this.providerFileSystem.readDirectory(element.uri);

				let childrenFiltered = children.filter((child) =>
				{
					let childUri = vscode.Uri.file(path.join(element.uri.fsPath, child[0]));

					let found = karateTestFiles.find((file) =>
					{
						return file.toString().startsWith(childUri.toString());
					});

					return found !== undefined;
				});

				return childrenFiltered.map(([name, type]) =>
					(
						{
							uri: vscode.Uri.file(path.join(element.uri.fsPath, name)),
							type: type,
							command: (type === vscode.FileType.File) ?
								{
									command: "karateRunner.tests.open",
									title: "karateRunner.tests.open"
								}
								:
								{
									command: "karateRunner.tests.runAll",
									title: "karateRunner.tests.runAll"
								}
						}
					)
				);
			}
		}

		let workspaceFolder = vscode.workspace.workspaceFolders.filter(folder => folder.uri.scheme === 'file')[0];
		if (workspaceFolder)
		{
			let children = await this.providerFileSystem.readDirectory(workspaceFolder.uri);

			let childrenFiltered = children.filter((child) =>
			{
				let childUri = vscode.Uri.file(path.join(workspaceFolder.uri.fsPath, child[0]));

				let found = karateTestFiles.find((file) =>
				{
					return file.toString().startsWith(childUri.toString());
				});

				return found !== undefined;
			});

			if (childrenFiltered.length <= 0)
			{
				return [{ uri: "No tests found...", type: vscode.FileType.Unknown }];
			}

			childrenFiltered.sort((a, b) =>
			{
				if (a[1] === b[1])
				{
					return a[0].localeCompare(b[0]);
				}

				return a[1] === vscode.FileType.Directory ? -1 : 1;
			});

			return childrenFiltered.map(([name, type]) =>
				(
					{ uri: vscode.Uri.file(path.join(workspaceFolder.uri.fsPath, name)), type: type }
				)
			);
		}

		return [{ uri: "No tests found...", type: vscode.FileType.Unknown }];
	}

	getTreeItem(element: IEntry): vscode.TreeItem
	{
		let collapsibleState: vscode.TreeItemCollapsibleState;
		switch (element.type)
		{
			case vscode.FileType.Directory:
			{
				collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
				break;
			}
			case vscode.FileType.File:
			{
				collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
				break;
			}
			default:
			{
				collapsibleState = vscode.TreeItemCollapsibleState.None;
				break;
			}
		}

		const treeItem = new vscode.TreeItem
		(
			element.uri,
			collapsibleState
		);

		if (collapsibleState === vscode.TreeItemCollapsibleState.None && element.command !== undefined)
		{
			let icon: string = 'karate-test.svg';

			if (element.state === EntryState.Pass)
			{
				icon = 'karate-test-pass.svg';
			}
			else if (element.state === EntryState.Fail)
			{
				icon = 'karate-test-fail.svg';
			}

			treeItem.iconPath =
			{
				light: path.join(__dirname, '..', 'resources', 'light', icon),
				dark: path.join(__dirname, '..', 'resources', 'dark', icon)
			};

			treeItem.command = element.command;
			treeItem.contextValue = 'test';
		}
		else if (element.type === vscode.FileType.File)
		{
			treeItem.contextValue = 'testFile';
		}
		else if (element.type === vscode.FileType.Directory)
		{
			treeItem.contextValue = 'testDirectory';
		}

		return treeItem;
	}
}

export default ProviderKarateTests;