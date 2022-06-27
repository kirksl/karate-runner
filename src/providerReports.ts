import { getIcon } from "./helper";
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

class ProviderReports implements vscode.TreeDataProvider<IEntry>, IDisposable
{
	private treeView: vscode.TreeView<any>;
	private providerFileSystem: ProviderFileSystem;
	private reportGlob: string;
	private reportFiles: vscode.Uri[];
	private displayType: String;
	private _onDidChangeTreeData: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
	readonly onDidChangeTreeData: vscode.Event<any> = this._onDidChangeTreeData.event;
	private static _onRefreshStart: vscode.EventEmitter<any>;
	private static _onRefreshEnd: vscode.EventEmitter<any>;

	constructor()
	{
		this.providerFileSystem = new ProviderFileSystem();
		this.treeView = vscode.window.createTreeView('karate-reports', { showCollapseAll: true, treeDataProvider: this });

		ProviderReports._onRefreshStart = new vscode.EventEmitter<any>();
		ProviderReports._onRefreshEnd = new vscode.EventEmitter<any>();
		ProviderResults.onTestResults(() => { this.refresh(); });
	}

	public static get onRefreshStart(): vscode.Event<any>
	{
		return ProviderReports._onRefreshStart.event;
	}

	public static get onRefreshEnd(): vscode.Event<any>
	{
		return ProviderReports._onRefreshEnd.event;
	}

	public async refresh()
	{
		ProviderReports._onRefreshStart.fire(null);
		this.reportGlob = String(vscode.workspace.getConfiguration('karateRunner.reports').get('toTargetByGlob'));
		this.reportFiles = await vscode.workspace.findFiles(this.reportGlob).then((value) => { return value; });
		this.displayType = String(vscode.workspace.getConfiguration('karateRunner.reports').get('activityBarDisplayType'));
		this._onDidChangeTreeData.fire();
		ProviderReports._onRefreshEnd.fire(null);
	}

	async getChildren(element?: IEntry): Promise<IEntry[]>
	{
		if (element)
		{
			if (this.displayType === DISPLAY_TYPE.LIST || this.displayType === DISPLAY_TYPE.SHALLOW)
			{
				let reportFilesFiltered = this.reportFiles.filter((reportFile) =>
				{
					return reportFile.toString().startsWith(element.uri.toString());
				});

				return reportFilesFiltered.sort().map((reportFile) =>
					(
						{ uri: reportFile, type: ENTRY_TYPE.FILE }
					)
				);
			}
			else
			{
				let children = await this.providerFileSystem.readDirectory(element.uri);

				let childrenFiltered = children.filter((child) =>
				{
					let childUri = vscode.Uri.file(path.join(element.uri.fsPath, child[0]));

					let found = this.reportFiles.find((file) =>
					{
						return file.toString().startsWith(childUri.toString());
					});

					return found !== undefined;
				});

				let childrenFilteredMapped: IEntry[] = [];

				for (let ndx = 0; ndx < childrenFiltered.length; ndx++)
				{
					let uri = vscode.Uri.file(path.join(element.uri.fsPath, childrenFiltered[ndx][0]));
					let type = (childrenFiltered[ndx][1] === vscode.FileType.File) ? ENTRY_TYPE.FILE : ENTRY_TYPE.FOLDER;

					childrenFilteredMapped.push( { uri: uri, type: type } );
				}

				return childrenFilteredMapped;
			}
		}

		return this.getWorkspaceFolders();
	}

	getTreeItem(element: IEntry): vscode.TreeItem
	{
		const treeItem = new vscode.TreeItem(element.uri, vscode.TreeItemCollapsibleState.Collapsed);
		treeItem.iconPath = getIcon('folder-none.svg');

		switch (element.type)
		{
			case ENTRY_TYPE.ROOT:
			case ENTRY_TYPE.FOLDER:
				break;

			case ENTRY_TYPE.FILE:
				treeItem.collapsibleState = vscode.TreeItemCollapsibleState.None;
				treeItem.contextValue = 'file';
				treeItem.command = { command: 'karateRunner.reports.open', title: "Open Build Report", arguments: [element.uri] };
				break;
		}

		return treeItem;
	}

	private async getWorkspaceFolders(): Promise<IEntry[] | null>
	{
		if (this.reportFiles == null)
		{
			this.reportGlob = String(vscode.workspace.getConfiguration('karateRunner.reports').get('toTargetByGlob'));
			this.reportFiles = await vscode.workspace.findFiles(this.reportGlob).then((value) => { return value; });
		}

		let workspaceFolders = vscode.workspace.workspaceFolders;
		if (workspaceFolders)
		{
			let workspaceFolder = workspaceFolders.filter((folder) => folder.uri.scheme === 'file')[0];

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
		}

		return null;
	}

	public dispose(): void
	{
		this.treeView.dispose();
	}
}

export default ProviderReports;