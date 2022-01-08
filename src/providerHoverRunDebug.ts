import * as vscode from 'vscode';
import { ENTRY_TYPE } from "./types/entry";

class ProviderHoverRunDebug implements vscode.HoverProvider
{
	private extensionContext: vscode.ExtensionContext;

	constructor(context: vscode.ExtensionContext)
	{
		this.extensionContext = context;
	}

	private getFooter(line): string
	{
		let footer: string = "";
		const lineArg = encodeURIComponent(JSON.stringify([[line]]));
		const moveRowUp = `command:karateRunner.file.moveLineUp?${lineArg}`;
		const moveRowDown = `command:karateRunner.file.moveLineDown?${lineArg}`;
		const cloneRow = `command:karateRunner.file.cloneLine?${lineArg}`;
		const removeRow = `command:karateRunner.file.deleteLine?${lineArg}`;

		footer += `[$(chevron-up)](${moveRowUp} "Move Row Up")`;
		footer += `&nbsp;&nbsp;[$(chevron-down)](${moveRowDown} "Move Row Down")`;
		footer += `&nbsp;&nbsp;[$(chrome-restore)](${cloneRow} "Clone Row")`;
		footer += `&nbsp;&nbsp;[$(trash)](${removeRow} "Delete Row")`;

		return footer;
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
						if (lineText.trim().startsWith('Examples:') || lineText.trim().startsWith('* table'))
						{
							let contents = new vscode.MarkdownString(undefined, true);
							contents.isTrusted = true;

							if (lineText.trim().startsWith('Examples:'))
							{
								const feature = `${document.uri.fsPath}:${position.line + 1}`;
								const runArgs = encodeURIComponent(JSON.stringify([[{ karateOptions: feature, karateJarOptions: feature, testUri: document.uri, fileType: ENTRY_TYPE.TEST }]]));
								const debugArgs = encodeURIComponent(JSON.stringify([[{ testUri: document.uri, debugLine: position.line + 1}]]));
								const runCmd = `command:karateRunner.tests.run?${runArgs}`;
								const debugCmd = `command:karateRunner.tests.debug?${debugArgs}`;
	
								contents.appendMarkdown(`[Karate: Run](${runCmd} "Karate: Run")`);
								contents.appendMarkdown(' | ');
								contents.appendMarkdown(`[Karate: Debug](${debugCmd} "Karate: Debug")`);
								contents.appendMarkdown(`\n\n`);
							}

							contents.appendMarkdown(this.getFooter(position.line));
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