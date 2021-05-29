import ProviderFileSystem from "./providerFileSystem";
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
}

export class ProviderBuildReports implements vscode.TreeDataProvider<IEntry>, IDisposable
{
    private treeView: vscode.TreeView<any>;
	private providerFileSystem: ProviderFileSystem;
	private _onDidChangeTreeData: vscode.EventEmitter<any> = new vscode.EventEmitter<any>();
	readonly onDidChangeTreeData: vscode.Event<any> = this._onDidChangeTreeData.event;

	constructor()
	{
		this.providerFileSystem = new ProviderFileSystem();
        this.treeView = vscode.window.createTreeView('karate-reports', { showCollapseAll: true, treeDataProvider: this });
	}

	public refresh(): any
	{
		this._onDidChangeTreeData.fire();
	}

	async getChildren(element?: IEntry): Promise<IEntry[]>
	{
		let glob = String(vscode.workspace.getConfiguration('karateRunner.buildReports').get('toTarget'));
		let buildReportFiles = await vscode.workspace.findFiles(glob).then((value) => { return value; });

		if (element)
		{
			let displayType = String(vscode.workspace.getConfiguration('karateRunner.buildReports').get('activityBarDisplayType'));

			if (displayType === "Shallow")
			{
				let buildReportFilesFiltered = buildReportFiles.filter((reportFile) =>
				{
					return reportFile.toString().startsWith(element.uri.toString());
				});

				return buildReportFilesFiltered.sort().map((reportFile) =>
					(
						{ uri: reportFile, type: vscode.FileType.File }
					)
				);
			}
			else
			{
				let children = await this.providerFileSystem.readDirectory(element.uri);

				let childrenFiltered = children.filter((child) =>
				{
					let childUri = vscode.Uri.file(path.join(element.uri.fsPath, child[0]));

					let found = buildReportFiles.find((file) =>
					{
						return file.toString().startsWith(childUri.toString());
					});

					return found !== undefined;
				});

				return childrenFiltered.map(([name, type]) =>
					(
						{ uri: vscode.Uri.file(path.join(element.uri.fsPath, name)), type: type }
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
				let found = buildReportFiles.find((file) =>
				{
					return file.toString().startsWith(childUri.toString());
				});

				return found !== undefined;
			});

			if (childrenFiltered.length <= 0)
			{
				return [{ uri: "No reports found...", type: vscode.FileType.Unknown }];
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

		return [{ uri: "No reports found...", type: vscode.FileType.Unknown }];
	}

	getTreeItem(element: IEntry): vscode.TreeItem
	{
		let treeItem = new vscode.TreeItem
		(
			element.uri,
			element.type === vscode.FileType.Directory ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None
		);

		if (element.type === vscode.FileType.File)
		{
			treeItem.command = { command: 'karateRunner.buildReports.open', title: "Open Build Report", arguments: [element.uri] };
			treeItem.contextValue = 'file';
        }
        else
        {
            if (element.uri != "No reports found...")
            {
                treeItem.iconPath =
                {
                    light: path.join(__dirname, '..', 'resources', 'light', 'folder-none.svg'),
                    dark: path.join(__dirname, '..', 'resources', 'dark', 'folder-none.svg')
                };
            }
        }

		return treeItem;
	}

    public dispose(): void
    {
        this.treeView.dispose();
    }
}

export default ProviderBuildReports;