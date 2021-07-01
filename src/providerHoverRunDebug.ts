import * as vscode from 'vscode';
import { ENTRY_TYPE } from "./types/entry";

class ProviderHoverRunDebug implements vscode.HoverProvider
{
	private extensionContext: vscode.ExtensionContext;

	constructor(context: vscode.ExtensionContext)
	{
		this.extensionContext = context;
	}

	public provideHover(document: vscode.TextDocument, position: vscode.Position, _token: vscode.CancellationToken): vscode.ProviderResult<vscode.Hover>
	{
		let currentLineText = document.lineAt(position.line).text;
		if (currentLineText.trim().startsWith('|'))
		{
			let previousLineText = document.lineAt(position.line - 1).text;
			if (previousLineText.trim().startsWith('|'))
			{
				let currentLine = position.line - 2;
				for (let line = currentLine; currentLine > 0; line--)
				{
					let lineText = document.lineAt(line).text;
					if (!lineText.trim().startsWith('|'))
					{
						if (lineText.trim().startsWith('Examples:'))
						{
							const feature = `${document.uri.fsPath}:${position.line + 1}`;
							const runArgs = encodeURIComponent(JSON.stringify([[{ karateOptions: feature, karateJarOptions: feature, testUri: document.uri, fileType: ENTRY_TYPE.TEST }]]));
							const debugArgs = encodeURIComponent(JSON.stringify([[{ testUri: document.uri, debugLine: position.line + 1}]]));
							const runCmd = `command:karateRunner.tests.run?${runArgs}`;
							const debugCmd = `command:karateRunner.tests.debug?${debugArgs}`;

							let contents = new vscode.MarkdownString();
							contents.isTrusted = true;

							contents.appendMarkdown(`[Karate: Run](${runCmd} "Karate: Run")`);
							contents.appendMarkdown(' | ');
							contents.appendMarkdown(`[Karate: Debug](${debugCmd} "Karate: Debug")`);
			
							return new vscode.Hover(contents);
						}
						else
						{
							break;
						}
					}
				}
			}
		}

		return null;
	}
}

export default ProviderHoverRunDebug;