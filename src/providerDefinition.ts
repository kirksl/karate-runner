import { getProjectDetail, getChildAbsolutePath, IProjectDetail } from "./helper";
import { Feature, IUriToken, ILineToken } from "./feature";
import path = require("path");
import fs = require("fs");
import * as vscode from 'vscode';

class ProviderDefinition implements vscode.DefinitionProvider
{
	constructor()
	{
	}
	
	async provideDefinition(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Promise<vscode.Definition>
	{
		try
		{
			let feature: Feature = new Feature(document);
			let peekLine: vscode.TextLine = feature.getLine(position.line);
	
			if (feature.isSection(peekLine.text)) { return null; }
	
			let lineTokens: ILineToken[] = feature.getLineTokens(peekLine);
			if (lineTokens.length === 0) { return null; }
	
			let positionalTokens: ILineToken[] = feature.getPositionalTokens(lineTokens, position);
			if (positionalTokens.length === 0) { return null; }
	
			let peekString: string = feature.getStringFromTokens(positionalTokens);
			if (peekString === null) { return null; }
	
			let uriToken: IUriToken = feature.getUriToken(peekString);
	
			let path: string = this.getDefinitionPath(document, uriToken);
			if (path === null) { return null; }
	
			let positions: vscode.Position[] = await this.getDefinitionPositions(uriToken.tag, path);
	
			return positions.map((position) => new vscode.Location(vscode.Uri.file(path), position));
		}
		catch (e)
		{
			return null;
		}
	}

	private getDefinitionPath(document: vscode.TextDocument, uriToken: IUriToken): string
	{
		let normalizedPath: string = (path.sep === '/') ? uriToken.path.replace(/\\/g, '/') : uriToken.path.replace(/\//g, '\\');

		if (fs.existsSync(normalizedPath) && fs.lstatSync(normalizedPath).isFile())
		{
			return normalizedPath;
		}

		if (uriToken.isClassPath)
		{
			let projectDetail: IProjectDetail = getProjectDetail(document.uri, vscode.FileType.File);
			let projectRootPath = projectDetail.projectRoot;

			let paths: string[] = [];
			paths.push(path.join(projectRootPath, 'src', 'test'));
			paths.push(path.join(projectRootPath, 'src'));
			paths.push(projectRootPath);

			for (let ndx = 0; ndx < paths.length; ndx++)
			{
				if (fs.existsSync(paths[ndx]) && fs.lstatSync(paths[ndx]).isDirectory())
				{
					let uriPath = getChildAbsolutePath(paths[ndx], normalizedPath);

					if (uriPath !== null)
					{
						if (fs.existsSync(uriPath) && fs.lstatSync(uriPath).isFile())
						{
							return uriPath;
						}
					}
				}
			}
		}
		else
		{
			let cwd: string = path.parse(document.uri.fsPath).dir;
			let uriPath = path.join(cwd, normalizedPath);
			
			if (fs.existsSync(uriPath) && fs.lstatSync(uriPath).isFile())
			{
				return uriPath;
			}
			
			let workspaceFolders = vscode.workspace.workspaceFolders;
			for (var ndx = 0; ndx < workspaceFolders.length; ndx++)
			{
				let workspaceUriPath = path.join(workspaceFolders[ndx].uri.fsPath, normalizedPath);
				if (fs.existsSync(workspaceUriPath) && fs.lstatSync(workspaceUriPath).isFile())
				{
					return workspaceUriPath;
				}
			}
		}
		
		return null;
	}

	private async getDefinitionPositions(tag: string, path: string): Promise<vscode.Position[]>
	{
		let positions: vscode.Position[] = [];

		if (tag !== null)
		{
			try
			{
				let document = await vscode.workspace.openTextDocument(path);
				
				for (let line = 0; line < document.lineCount; line++)
				{
					let lineText = document.lineAt(line).text;
		
					if (lineText.trim().toLowerCase().split(/\s+/)[0] === tag)
					{
						positions.push(new vscode.Position(line, 0));
					}
				}
			}
			catch (e)
			{
				// do nothing
			}
		}

		if (positions.length === 0)
		{
			positions.push(new vscode.Position(0, 0));
		}

		return positions;
	}
}

export default ProviderDefinition;