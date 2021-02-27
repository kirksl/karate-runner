import { getTestExecutionDetail, ITestExecutionDetail, getTestResult } from "./helper";
import ProviderFileSystem from "./providerFileSystem";
import { ProviderResults } from "./providerResults";
import * as vscode from 'vscode';
import * as path from 'path';


interface IEntry
{
	uri: any;
	type: vscode.FileType;
	command?: vscode.Command;
	state?: ProviderResults.ENTRY_STATE;
}

export class ProviderKarateTests implements vscode.TreeDataProvider<IEntry>
{
	private providerFileSystem: ProviderFileSystem;
	private _onDidChangeTreeData: vscode.EventEmitter<any> = new vscode.EventEmitter<any>();
	readonly onDidChangeTreeData: vscode.Event<any> = this._onDidChangeTreeData.event;

	constructor()
	{
		this.providerFileSystem = new ProviderFileSystem();
		ProviderResults.onTestResults((json) => { this.refresh(); });
	}

	public refresh()
	{
		this._onDidChangeTreeData.fire();
	}

	public clearResults(): any
	{
		ProviderResults.clearTestResults();
		this.refresh();
	}

	async getChildren(element?: IEntry): Promise<IEntry[]>
	{
		let glob = String(vscode.workspace.getConfiguration('karateRunner.tests').get('toTarget'));
		let testFiles = await vscode.workspace.findFiles(glob).then((value) => { return value; });

		if (element)
		{
			if (element.type === vscode.FileType.File)
			{
				let tests: IEntry[] = [];
				let tedArray: ITestExecutionDetail[] = await getTestExecutionDetail(element.uri, vscode.FileType.File);

				tedArray.forEach((ted) =>
				{
					let testCommand: vscode.Command =
					{
						arguments: [ted],
						command: "karateRunner.tests.open",
						title: ted.codelensRunTitle
					};

					let state = getTestResult(ted);
					tests.push(
					{
						uri: ted.testTitle,
						type: vscode.FileType.Unknown,
						command: testCommand,
						state: state
					});
				});

				return tests;
			}

			let displayType = String(vscode.workspace.getConfiguration('karateRunner.tests').get('activityBarDisplayType'));

			if (displayType === "Shallow")
			{
				let testFilesFiltered = testFiles.filter((testFile) =>
				{
					return testFile.toString().startsWith(element.uri.toString());
				});

				return testFilesFiltered.sort().map((testFile) =>
					(
						{
							uri: testFile,
							type: vscode.FileType.File,
							command: {
                                arguments: [{ testUri: testFile, debugLine: 0 }],
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

					let found = testFiles.find((file) =>
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
                                    arguments: [{ testUri: vscode.Uri.file(path.join(element.uri.fsPath, name)), debugLine: 0 }],
									command: "karateRunner.tests.open",
									title: "karateRunner.tests.open"
								}
								:
								{
                                    arguments: [{ testUri: vscode.Uri.file(path.join(element.uri.fsPath, name)), debugLine: 0 }],
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

				let found = testFiles.find((file) =>
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
					{
                        uri: vscode.Uri.file(path.join(workspaceFolder.uri.fsPath, name)),
                        type: type
                    }
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

			if (element.state === ProviderResults.ENTRY_STATE.PASS)
			{
				icon = 'karate-test-pass.svg';
			}
			else if (element.state === ProviderResults.ENTRY_STATE.FAIL)
			{
				icon = 'karate-test-fail.svg';
			}

			treeItem.iconPath =
			{
				light: path.join(__dirname, '..', 'resources', 'light', icon),
				dark: path.join(__dirname, '..', 'resources', 'dark', icon)
			};

			treeItem.command = element.command;
			treeItem.contextValue = (element.uri.startsWith('Feature:') ? 'testFeature' : 'testScenario');
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