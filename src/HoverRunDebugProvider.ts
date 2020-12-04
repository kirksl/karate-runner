'use strict';

import * as vscode from 'vscode';

/**
 * HoverProvider that creates a tooltip with Karate run/debug buttons for this line.
 */
export default class HoverRunDebugProvider implements vscode.HoverProvider {
    private extensionContext: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.extensionContext = context;
    }

    public provideHover(document: vscode.TextDocument, position: vscode.Position, _token: vscode.CancellationToken): vscode.ProviderResult<vscode.Hover> {
        const textLine = document.lineAt(position.line).text;

        if (textLine.trim().startsWith('|')) {
            const previousTextLine = document.lineAt(position.line - 1).text;
            if (previousTextLine.trim().startsWith('|')) {
                // is not the Examples Header or single row
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
        }
        return null;
    }
}
