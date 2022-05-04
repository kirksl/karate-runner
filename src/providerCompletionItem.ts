import { getProjectDetail, IProjectDetail, getTestExecutionDetail, getTestExecutionDetailTags, ITestExecutionDetail } from "./helper";
import * as vscode from 'vscode';
import path = require("path");
import fs = require("fs");
import { ENTRY_TYPE } from "./types/entry";

class ProviderCompletionItem implements vscode.CompletionItemProvider
{
	async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext): Promise<vscode.CompletionItem[]>
	{
		let lineText = document.lineAt(position).text;
		let linePrefix = document.lineAt(position).text.substring(0, position.character);

		console.debug(lineText);
		console.debug(linePrefix);

		let lineRegExp1 = new RegExp("^.*read\\([\'\"]{1}$");
		let lineRegExp2 = new RegExp("^.*read\\([\'\"]{1}([^@\'\"]+)@[^@\'\"]*$");
		let lineMatch1 = linePrefix.match(lineRegExp1);
		let lineMatch2 = linePrefix.match(lineRegExp2);

		if (lineMatch1 !== null && lineMatch1.index !== undefined)
		{
			return this.getFileCompletionItems(lineText, document, position);
		}

		if (lineMatch2 !== null && lineMatch2.index !== undefined)
		{
			if (lineMatch2.length === 2)
			{
				let completionItems = this.getFileCompletionItems(lineText, document, position);
				let completionItem = completionItems.find(item => item.label === lineMatch2[1]);
				
				if (completionItem !== undefined)
				{
					let testIgnored: boolean;
					let entryType: ENTRY_TYPE;
					let uri = vscode.Uri.file(completionItem.detail);
					
					entryType = ENTRY_TYPE.FILE;
					let tedArray: ITestExecutionDetail[] = await getTestExecutionDetail(uri, entryType);
					testIgnored = tedArray[0].testIgnored;

					let tags = getTestExecutionDetailTags(tedArray);
					tags = tags.filter(v => v !== '@ignore');

					for (let ndx = 0; ndx < tags.length; ndx++)
					{
						if (tags[ndx].startsWith('@'))
						{
							tags[ndx] = tags[ndx].substring(1);
						}
					}

					return this.getTagCompletionItems(lineText, tags, document, position);
				}

				return undefined;
			}
		}

		return undefined;
	}

	getFileCompletionItems(lineText: string, document: vscode.TextDocument, position: vscode.Position): vscode.CompletionItem[]
	{
		let parsedPath = path.parse(document.fileName); 
		let callerDir = parsedPath.dir;
		let callerFile = parsedPath.base;

		const getLocals = (completionItems) =>
		{
			let localFiles = fs.readdirSync(callerDir);

			localFiles.forEach((file) =>
			{
				let filePath = path.join(callerDir, file);
				if (fs.statSync(filePath).isFile() && file !== callerFile)
				{
					let ci = new vscode.CompletionItem(file, vscode.CompletionItemKind.Text);
					ci.detail = filePath;
					ci.sortText = 'a';
					ci.additionalTextEdits = [vscode.TextEdit.delete(new vscode.Range(position.line, lineText.indexOf("(") + 2, position.line, lineText.indexOf(")") - 1))];
					completionItems.push(ci);
				}                
			});

			return completionItems;
		}

		const getGlobals = (baseDir, subDir, completionItems, includeClassPath) =>
		{
			subDir = subDir || '';

			let searchDir = path.join(...[baseDir, subDir], path.sep);
			let globalFiles = fs.readdirSync(searchDir);

			globalFiles.forEach((file) =>
			{
				let filePath = path.join(searchDir, file);
				if (fs.statSync(filePath).isDirectory())
				{
					completionItems = getGlobals(baseDir, path.join(subDir, file), completionItems, includeClassPath)
				}
				else
				{
					if (path.parse(filePath).dir !== callerDir)
					{
						let fNormalized = filePath.substring(baseDir.length);
						fNormalized = fNormalized.replace(/\\/g, "/");
						let ci = new vscode.CompletionItem(includeClassPath ? `classpath:${fNormalized}` : `${fNormalized}`, vscode.CompletionItemKind.Text);
						ci.detail = filePath;
						ci.additionalTextEdits = [vscode.TextEdit.delete(new vscode.Range(position.line, lineText.indexOf("(") + 2, position.line, lineText.indexOf(")") - 1))];
						completionItems.push(ci);
					}
				}
			});
		  
			return completionItems;
		}

		let projectDetail: IProjectDetail = getProjectDetail(document.uri, vscode.FileType.File);
		let projectRootPath = projectDetail.projectRoot;
		
		let completionItems: vscode.CompletionItem[] = [];

		completionItems = getLocals(completionItems);

		let paths: string[] = [];
		paths[0] = path.join(...[projectRootPath, 'src', 'test', 'java'], path.sep);
		paths[1] = path.join(...[projectRootPath, 'src', 'test', 'resources'], path.sep);

		let workspaceFolders = vscode.workspace.workspaceFolders;
		for (var i = 0; i < workspaceFolders.length; i ++)
		{
			paths.push(path.join(...[projectRootPath, workspaceFolders[i].uri.fsPath], path.sep));
		}

		let pathFound : boolean = false;
		if (fs.existsSync(paths[0]))
		{
			completionItems = getGlobals(paths[0], null, completionItems, true);
			pathFound = true;
		}

		if (fs.existsSync(paths[1]))
		{
			completionItems = getGlobals(paths[1], null, completionItems, true);
			pathFound = true;
		}
		
		if (!pathFound)
		{
			for (var i = 2; i < paths.length; i ++)
			{
				completionItems.push(getGlobals(paths[i], null, completionItems, false));
			}
		}

		if (completionItems.length === 0)
		{
			return undefined;
		}

		return completionItems;
	}

	getTagCompletionItems(lineText: string, tags: string[], document: vscode.TextDocument, position: vscode.Position): vscode.CompletionItem[]
	{
		let completionItems: vscode.CompletionItem[] = [];

		tags.forEach(tag =>
		{
			let ci = new vscode.CompletionItem(tag, vscode.CompletionItemKind.Text);
			ci.additionalTextEdits = [vscode.TextEdit.delete(new vscode.Range(position.line, lineText.indexOf("@") + 1, position.line, lineText.indexOf(")") - 1))];
			completionItems.push(ci);
		});

		if (completionItems.length === 0)
		{
			return undefined;
		}

		return completionItems;
	}
}

export default ProviderCompletionItem;