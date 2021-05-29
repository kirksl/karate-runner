import { getTestExecutionDetail, ITestExecutionDetail } from "./helper";
import ProviderFileSystem from "./providerFileSystem";
import { ProviderResults } from "./providerResults";
import * as vscode from 'vscode';
import * as path from 'path';

interface IDisposable
{
	dispose(): void;
}

interface IEntry
{
	uri: any;
	type: vscode.FileType;
	command?: vscode.Command;
	state: ProviderResults.ENTRY_STATE;
    fails?: number;
    ignored: boolean;
}

export class ProviderKarateTests implements vscode.TreeDataProvider<IEntry>, IDisposable
{
    private treeView: vscode.TreeView<any>;
	private providerFileSystem: ProviderFileSystem;
	private _onDidChangeTreeData: vscode.EventEmitter<any> = new vscode.EventEmitter<any>();
	readonly onDidChangeTreeData: vscode.Event<any> = this._onDidChangeTreeData.event;

	constructor()
	{
		this.providerFileSystem = new ProviderFileSystem();
        this.treeView = vscode.window.createTreeView('karate-tests', { showCollapseAll: true, treeDataProvider: this });

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
        let hideIgnored = Boolean(vscode.workspace.getConfiguration('karateRunner.tests').get('hideIgnored'));

		if (element)
		{
			if (element.type === vscode.FileType.File)
			{
				let entries: IEntry[] = [];
				let tedArray: ITestExecutionDetail[] = await getTestExecutionDetail(element.uri, vscode.FileType.File);

				tedArray.forEach((ted) =>
				{
                    if (ted.testIgnored && hideIgnored)
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
    
                        entries.push(
                        {
                            uri: ted.testTitle,
                            type: vscode.FileType.Unknown,
                            command: testCommand,
                            state: ProviderResults.getTestResult(ted),
                            ignored: ted.testIgnored
                        });
                    }
				});

				return entries;
			}

			let displayType = String(vscode.workspace.getConfiguration('karateRunner.tests').get('activityBarDisplayType'));

			if (displayType === "Shallow")
			{
				let testFilesFiltered = testFiles.filter((testFile) =>
				{
					return testFile.toString().startsWith(element.uri.toString());
				});

                testFilesFiltered.sort();

                let entries: IEntry[] = [];
                for (let ndx = 0; ndx < testFilesFiltered.length; ndx++)
                {
                    let tedArray: ITestExecutionDetail[] = await getTestExecutionDetail(testFilesFiltered[ndx], vscode.FileType.File);

                    if (tedArray[0].testIgnored && hideIgnored)
                    {
                        // do nothing
                    }
                    else
                    {
                        let result = ProviderResults.getFileResult(testFilesFiltered[ndx]);

                        entries.push(
                        {
                            uri: testFilesFiltered[ndx],
                            type: vscode.FileType.File,
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

                return entries;
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

                let entries: IEntry[] = [];
                for (let ndx = 0; ndx < childrenFiltered.length; ndx++)
                {
                    let name = childrenFiltered[ndx][0];
                    let type = childrenFiltered[ndx][1];
                    let uri = vscode.Uri.file(path.join(element.uri.fsPath, name));

                    let tedArray: ITestExecutionDetail[] = await getTestExecutionDetail(uri, type);

                    if (tedArray[0].testIgnored && hideIgnored)
                    {
                        // do nothing
                    }
                    else
                    {
                        let cmd = (type === vscode.FileType.File) ? "karateRunner.tests.open" : "karateRunner.tests.runAll";
                        let result = (type === vscode.FileType.File) ? ProviderResults.getFileResult(uri) : ProviderResults.getFolderResult(uri);
                        
                        entries.push(
                        {
                            uri: uri,
                            type: type,
                            command:
                            {
                                arguments: [{ testUri: uri, debugLine: 0 }],
                                command: cmd,
                                title: cmd
                            },
                            state: result.state,
                            fails: result.fails,
                            ignored: tedArray[0].testIgnored
                        });
                    }
                }

                return entries;
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
				return [{ uri: "No tests found...", type: vscode.FileType.Unknown, state: ProviderResults.ENTRY_STATE.NONE, ignored: false }];
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
            {
                let uri = vscode.Uri.file(path.join(workspaceFolder.uri.fsPath, name));
                let result = ProviderResults.getFolderResult(uri);

                return {
                    uri: uri,
                    type: type,
                    state: result.state,
                    fails: result.fails,
                    ignored: false
                }
            });
		}

		return [{ uri: "No tests found...", type: vscode.FileType.Unknown, state: ProviderResults.ENTRY_STATE.NONE, ignored: false }];
	}

    getParent(element: IEntry): IEntry | undefined
    {
        return undefined;
    }

	getTreeItem(element: IEntry): vscode.TreeItem
	{
        let icon: string = '';

        let executionState: string = 'none';
        switch (element.state)
        {
            case ProviderResults.ENTRY_STATE.PASS:
                executionState = 'pass';
                break;

            case ProviderResults.ENTRY_STATE.FAIL:
                executionState = 'fail';
                break;
        }

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
            icon = `karate-test-${executionState}.svg`;

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
		else if (element.type === vscode.FileType.File)
		{
            icon = `folder-${executionState}.svg`;

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
		}
		else if (element.type === vscode.FileType.Directory)
		{
            icon = `folder-${executionState}.svg`;
			treeItem.contextValue = 'testDirectory';

            if (element.fails > 0)
            {
                treeItem.description = element.fails + '';
            }
		}

        treeItem.iconPath =
        {
            light: path.join(__dirname, '..', 'resources', 'light', icon),
            dark: path.join(__dirname, '..', 'resources', 'dark', icon)
        };

		return treeItem;
	}

    public dispose(): void
    {
        this.treeView.dispose();
    }
}

export default ProviderKarateTests;