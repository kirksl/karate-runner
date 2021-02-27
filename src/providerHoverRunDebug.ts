import * as vscode from 'vscode';

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
							let contents: vscode.MarkdownString = new vscode.MarkdownString();
							contents.isTrusted = true;
							const runArgs = encodeURIComponent(JSON.stringify([[feature, feature, document.uri, vscode.FileType.File]]));
							const debugArgs = encodeURIComponent(JSON.stringify([[position.line + 1]]));
							contents.appendMarkdown(`[Karate: Run](command:karateRunner.tests.run?${runArgs} "Karate: Run")`);
							contents.appendMarkdown(' | ');
							contents.appendMarkdown(`[Karate: Debug](command:karateRunner.tests.debug?${debugArgs} "Karate: Debug")`);
			
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