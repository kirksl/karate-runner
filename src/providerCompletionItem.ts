import { getProjectDetail, IProjectDetail } from "./helper";
import * as vscode from 'vscode';
import path = require("path");
import fs = require("fs");

class ProviderCompletionItem implements vscode.CompletionItemProvider
{
	provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList>
	{
		let lineText = document.lineAt(position).text;
		let linePrefix = document.lineAt(position).text.substr(0, position.character);
		let lineRegExp = new RegExp("^.*read\\([\'\"]{1}[^\'\"\)]*$");
		let lineMatch = linePrefix.match(lineRegExp);
		if (lineMatch === null || lineMatch.index === undefined)
		{
			return undefined;
		}

		let parsedPath = path.parse(document.fileName); 
		let callerDir = parsedPath.dir;
		let callerFile = parsedPath.base;

		const getLocals = (completionItems) =>
		{
			let localFiles = fs.readdirSync(callerDir);

			localFiles.forEach((file) =>
			{
				if (fs.statSync(callerDir + path.sep + file).isFile() && file !== callerFile)
				{
					let ci = new vscode.CompletionItem(file, vscode.CompletionItemKind.Text);
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
				if (fs.statSync(searchDir + path.sep + file).isDirectory())
				{
					completionItems = getGlobals(baseDir, subDir + path.sep + file, completionItems, includeClassPath)
				}
				else
				{
					let f = path.join(searchDir, path.sep, file);
					if (path.parse(f).dir !== callerDir)
					{
						f = f.substring(baseDir.length);
						f = f.replace(/\\/g, "/");
						let ci = new vscode.CompletionItem(includeClassPath ? `classpath:${f}` : `${f}`, vscode.CompletionItemKind.Text);
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
}

export default ProviderCompletionItem;