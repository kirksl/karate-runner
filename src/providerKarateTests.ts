import { getTestExecutionDetail, ITestExecutionDetail, getIcon } from "./helper";
import { ENTRY_TYPE, ENTRY_STATE, IEntry } from "./types/entry";
import { DISPLAY_TYPE } from "./types/display";
import ProviderFileSystem from "./providerFileSystem";
import { ProviderResults } from "./providerResults";
import * as vscode from 'vscode';
import * as path from 'path';

interface IDisposable
{
	dispose(): void;
}

class ProviderKarateTests implements vscode.TreeDataProvider<IEntry>, IDisposable
{
	private treeView: vscode.TreeView<any>;
	private providerFileSystem: ProviderFileSystem;
	private testGlob: string;
	private testFiles: vscode.Uri[];
	private hideIgnored: boolean;
	private displayType: String;
	private _onDidChangeTreeData: vscode.EventEmitter<any> = new vscode.EventEmitter<any>();
	readonly onDidChangeTreeData: vscode.Event<any> = this._onDidChangeTreeData.event;

	constructor()
	{
		this.providerFileSystem = new ProviderFileSystem();
		this.treeView = vscode.window.createTreeView('karate-tests', { showCollapseAll: true, treeDataProvider: this });
		this.treeView.message = null;

		ProviderResults.onTestResults(() => { this.refresh(); });
	}

	public async refresh()
	{
		this.treeView.message = null;
		this.testGlob = String(vscode.workspace.getConfiguration('karateRunner.tests').get('toTarget'));
		this.testFiles = await vscode.workspace.findFiles(this.testGlob).then((value) => { return value; });
		this.hideIgnored = Boolean(vscode.workspace.getConfiguration('karateRunner.tests').get('hideIgnored'));
		this.displayType = String(vscode.workspace.getConfiguration('karateRunner.tests').get('activityBarDisplayType'));
		this._onDidChangeTreeData.fire();
	}

	public clearResults()
	{
		ProviderResults.clearTestResults();
		this.refresh();
	}

	async getChildren(element?: IEntry): Promise<IEntry[]>
	{
		if (element)
		{
			switch (element.type)
			{
				case ENTRY_TYPE.ROOT:
				case ENTRY_TYPE.FOLDER:
					switch (this.displayType)
					{
						case DISPLAY_TYPE.LIST: // returns ENTRY_TYPE.FILE array for all files below incoming folder
						case DISPLAY_TYPE.SHALLOW:
							return this.getAllFiles(element);

						case DISPLAY_TYPE.TREE: // returns ENTRY_TYPE.FILE|FOLDER array for all files/folders for incoming folder
						case DISPLAY_TYPE.DEEP:
							return this.getFilesFolders(element);

						case DISPLAY_TYPE.TAG: // returns ENTRY_TYPE.TAG array for all files for incoming tag
							return this.getTags(element);

						default:
							return null;
					}

				case ENTRY_TYPE.FILE: // returns ENTRY_TYPE.TEST array for TEDs of incoming file (TAG aware)
					return this.getTests(element);

				case ENTRY_TYPE.TAG: // returns ENTRY_TYPE.FILE array for all files per tag accumulated (TAG aware)
					return this.getAllFiles(element);

				case ENTRY_TYPE.TEST: // null, we're done
					return null;
			}
		}

		return this.getWorkspaceFolders();
	}

	getParent(element: IEntry): IEntry | undefined
	{
		return undefined;
	}

	getTreeItem(element: IEntry): vscode.TreeItem
	{
		const treeItem = new vscode.TreeItem(element.uri, vscode.TreeItemCollapsibleState.Collapsed);

		switch (element.type)
		{
			case ENTRY_TYPE.ROOT:
				treeItem.iconPath = getIcon(`folder-none.svg`);
				treeItem.label = element.tag;
				break;

			case ENTRY_TYPE.TAG:
				treeItem.iconPath = getIcon(`tag-${element.state}.svg`);
				treeItem.label = element.tag;
				treeItem.tooltip = element.tag;

				if (element.tag == '@ignore')
				{
					treeItem.contextValue = 'testTagIgnore'
					treeItem.description = 'ignored';
				}
				else
				{
					treeItem.contextValue = 'testTag';

					if (element.fails > 0)
					{
						treeItem.description = element.fails + '';
					}
				}

				break;
			
			case ENTRY_TYPE.FOLDER:
				treeItem.iconPath = getIcon(`folder-${element.state}.svg`);
				treeItem.contextValue = 'testDirectory';
	
				if (element.fails > 0)
				{
					treeItem.description = element.fails + '';
				}

				break;

			case ENTRY_TYPE.FILE:
				treeItem.iconPath = getIcon(`folder-${element.state}.svg`);

				if (element.ignored)
				{
					treeItem.contextValue = 'testFileIgnored';
					treeItem.description = 'ignored';
				}
				else
				{
					treeItem.contextValue = 'testFile';
	
					if (element.fails > 0)
					{
						treeItem.description = element.fails + '';
					}
				}

				break;

			case ENTRY_TYPE.TEST:
				treeItem.iconPath = getIcon(`karate-test-${element.state}.svg`);
				treeItem.collapsibleState = vscode.TreeItemCollapsibleState.None;

				if (element.ignored)
				{
					treeItem.command = element.command;
					treeItem.contextValue = 'testIgnored';
					treeItem.description = 'ignored';
				}
				else
				{
					treeItem.command = element.command;
					treeItem.contextValue = (element.uri.startsWith('Feature:') ? 'testFeature' : 'testScenario');
				}
		}

		return treeItem;
	}

	private async getWorkspaceFolders(): Promise<IEntry[]>
	{
		if (this.testFiles == null)
		{
			this.testGlob = String(vscode.workspace.getConfiguration('karateRunner.tests').get('toTarget'));
			this.testFiles = await vscode.workspace.findFiles(this.testGlob).then((value) => { return value; });
		}

		let workspaceFolder = vscode.workspace.workspaceFolders.filter(folder => folder.uri.scheme === 'file')[0];

		let entries: IEntry[] = [];
		entries.push(
		{
			uri: workspaceFolder.uri,
			type: ENTRY_TYPE.ROOT,
			state: ENTRY_STATE.NONE,
			ignored: false
		});

		if (entries.length > 0)
		{
			return entries;
		}

		this.treeView.message = "No tests found...";
		return null;
	}

	private async getTags(directory: IEntry): Promise<IEntry[]>
	{
		let testFilesFiltered = this.testFiles.filter((testFile) =>
		{
			return testFile.toString().startsWith(directory.uri.toString());
		});

		testFilesFiltered.sort();

		let tags: string[] = [];
		for (let ndx = 0; ndx < testFilesFiltered.length; ndx++)
		{
			let tedArray = await getTestExecutionDetail(testFilesFiltered[ndx], ENTRY_TYPE.FILE);

			if (tedArray[0].testIgnored && this.hideIgnored)
			{
				// do nothing
			}
			else
			{
				tedArray.forEach((ted) =>
				{
					let tedTags = ted.testTag.split(/\s+/);
					tedTags.forEach((tag) =>
					{
						if (tag == "@ignore" && this.hideIgnored)
						{
							// do nothing
						}
						else
						{
							if (!tags.includes(tag))
							{
								tags.push(tag);
							}
						}
					});
				});
			}
		}

		let entries: IEntry[] = [];
		for (let ndx = 0; ndx < tags.length; ndx++)
		{
			let tagResult = ProviderResults.getTagResult(tags[ndx]);
			let tagCommand: vscode.Command =
			{
				arguments: [],
				command: "karateRunner.tests.open",
				title: "karateRunner.tests.open"
			};

			entries.push({
				uri: directory.uri,
				tag: tags[ndx],
				type: ENTRY_TYPE.TAG,
				command: tagCommand,
				state: tagResult.state,
				fails: tagResult.fails,
				ignored: null
			});
		}

		return entries;
	}

	private async getTests(file: IEntry): Promise<IEntry[]>
	{
		let entries: IEntry[] = [];
		let tedArray: ITestExecutionDetail[] = await getTestExecutionDetail(file.uri, ENTRY_TYPE.FILE);

		tedArray.forEach((ted) =>
		{
			if (ted.testIgnored && this.hideIgnored)
			{
				// do nothing
			}
			else
			{
				let testCommand: vscode.Command =
				{
					arguments: [ted],
					command: "karateRunner.tests.open",
					title: ted.codelensRunTitle
				};

				if (file.tag)
				{
					let tagArray = ted.testTag.split(/\s+/);
					if (tagArray.includes(file.tag))
					{
						entries.push(
						{
							uri: ted.testTitle,
							type: ENTRY_TYPE.TEST,
							command: testCommand,
							state: ProviderResults.getTestResult(ted),
							ignored: ted.testIgnored
						});                                
					}
				}
				else
				{
					entries.push(
					{
						uri: ted.testTitle,
						type: ENTRY_TYPE.TEST,
						command: testCommand,
						state: ProviderResults.getTestResult(ted),
						ignored: ted.testIgnored
					});
				}
			}
		});

		return entries;
	}

	private async getFilesFolders(directory: IEntry): Promise<IEntry[]>
	{
		let children = await this.providerFileSystem.readDirectory(directory.uri);

		let childrenFiltered = children.filter((child) =>
		{
			let childUri = vscode.Uri.file(path.join(directory.uri.fsPath, child[0]));

			let found = this.testFiles.find((file) =>
			{
				return file.toString().startsWith(childUri.toString());
			});

			return found !== undefined;
		});

		let entries: IEntry[] = [];
		for (let ndx = 0; ndx < childrenFiltered.length; ndx++)
		{
			let name = childrenFiltered[ndx][0];
			let type = childrenFiltered[ndx][1];
			let uri = vscode.Uri.file(path.join(directory.uri.fsPath, name));
			let entryType: ENTRY_TYPE;
			let testIgnored: boolean;

			if (type === vscode.FileType.Directory)
			{
				entryType = ENTRY_TYPE.FOLDER;
				testIgnored = false;
			}
			else
			{
				entryType = ENTRY_TYPE.FILE;
				let tedArray: ITestExecutionDetail[] = await getTestExecutionDetail(uri, entryType);
				testIgnored = tedArray[0].testIgnored;
			}
			

			if (testIgnored && this.hideIgnored)
			{
				// do nothing
			}
			else
			{
				let cmd = (entryType == ENTRY_TYPE.FILE) ? "karateRunner.tests.open" : "karateRunner.tests.runAll";
				let result = (entryType == ENTRY_TYPE.FILE) ? ProviderResults.getFileResult(uri) : ProviderResults.getFolderResult(uri);
				
				entries.push(
				{
					uri: uri,
					type: entryType,
					command:
					{
						arguments: [{ testUri: uri, debugLine: 0 }],
						command: cmd,
						title: cmd
					},
					state: result.state,
					fails: result.fails,
					ignored: testIgnored
				});
			}
		}

		return entries;
	}

	private async getAllFiles(directory: IEntry): Promise<IEntry[]>
	{
		let testFilesFiltered = this.testFiles.filter((testFile) =>
		{
			return testFile.toString().startsWith(directory.uri.toString());
		});

		testFilesFiltered.sort();

		let entries: IEntry[] = [];
		for (let ndx = 0; ndx < testFilesFiltered.length; ndx++)
		{
			let tedArray = await getTestExecutionDetail(testFilesFiltered[ndx], ENTRY_TYPE.FILE);

			if (tedArray[0].testIgnored && this.hideIgnored)
			{
				// do nothing
			}
			else
			{
				if (directory.tag)
				{
					let tags: string[] = [];
					tedArray.forEach((ted) =>
					{
						let tedTags = ted.testTag.split(/\s+/);
						tedTags.forEach((tag) =>
						{
							if (!tags.includes(tag))
							{
								tags.push(tag);
							}
						});
					});

					if (tags.includes(directory.tag))
					{
						let result = ProviderResults.getFileTagResult(testFilesFiltered[ndx], directory.tag);
						entries.push(
						{
							uri: testFilesFiltered[ndx],
							tag: directory.tag,
							type: ENTRY_TYPE.FILE,
							command:
							{
								arguments: [{ testUri: testFilesFiltered[ndx], debugLine: 0 }],
								command: "karateRunner.tests.open",
								title: "karateRunner.tests.open"
							},
							state: result.state,
							fails: result.fails,
							ignored: tedArray[0].testIgnored
						});
					}
				}
				else
				{
					let result = ProviderResults.getFileResult(testFilesFiltered[ndx]);
					entries.push(
					{
						uri: testFilesFiltered[ndx],
						type: ENTRY_TYPE.FILE,
						command:
						{
							arguments: [{ testUri: testFilesFiltered[ndx], debugLine: 0 }],
							command: "karateRunner.tests.open",
							title: "karateRunner.tests.open"
						},
						state: result.state,
						fails: result.fails,
						ignored: tedArray[0].testIgnored
					});
				}
			}
		}

		return entries;
	}

	public dispose(): void
	{
		this.treeView.dispose();
	}
}

export default ProviderKarateTests;