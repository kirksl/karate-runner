import { getDarkIcon, getLightIcon, getTestExecutionDetail, ITestExecutionDetail } from "./helper";
import { ProviderResults } from "./providerResults";
import { ENTRY_TYPE, ENTRY_STATE } from "./types/entry";
import * as vscode from 'vscode';

class ProviderDecorations
{
	private timeout: NodeJS.Timeout;
	private context: vscode.ExtensionContext;

	private readonly decorationNone: vscode.TextEditorDecorationType;
	private readonly decorationPass: vscode.TextEditorDecorationType;
	private readonly decorationFail: vscode.TextEditorDecorationType;

	constructor(context: vscode.ExtensionContext)
	{
		this.context = context;

		this.decorationNone = this.getDecorationType(ENTRY_STATE.NONE);
		this.decorationPass = this.getDecorationType(ENTRY_STATE.PASS);
		this.decorationFail = this.getDecorationType(ENTRY_STATE.FAIL);

		vscode.window.onDidChangeActiveTextEditor(editor =>
		{
			if (editor)
			{
				this.triggerUpdateDecorations();
			}
		}, null, this.context.subscriptions);
	  
		vscode.workspace.onDidChangeTextDocument(event =>
		{
			this.triggerUpdateDecorations();
		}, null, this.context.subscriptions);

		ProviderResults.onTestResults((json) => 
		{
			this.triggerUpdateDecorations();
		});

		this.triggerUpdateDecorations();
	}

	public updateDecorations()
	{
		vscode.window.visibleTextEditors.forEach(async (editor) =>
		{
			if (editor.document.languageId !== 'karate')
			{
				return;
			}

			let decorationNone: vscode.DecorationOptions[] = [];
			let decorationPass: vscode.DecorationOptions[] = [];
			let decorationFail: vscode.DecorationOptions[] = [];
	
			if (Boolean(vscode.workspace.getConfiguration('karateRunner.editor').get('toggleResultsInGutter')))
			{
				let tedArray: ITestExecutionDetail[] = await getTestExecutionDetail(editor.document.uri, ENTRY_TYPE.FILE);
	
				tedArray.forEach((ted) =>
				{
					let state = ProviderResults.getTestResult(ted);
					let range = ted.testRange;
					let positionEnd: vscode.Position = new vscode.Position(range.start.line, range.start.character + 2);
					let rangeNew = new vscode.Range(range.start, positionEnd);
					let markdownResults: vscode.MarkdownString[] = [];

					if (state === ENTRY_STATE.FAIL)
					{
						markdownResults = ProviderResults.getFullSummary(ted);
					}

					let decorationOptions: vscode.DecorationOptions =
					{
						hoverMessage: markdownResults,
						range: rangeNew
					}
		
					switch (state)
					{
						case ENTRY_STATE.NONE:
							decorationNone.push(decorationOptions);
							break;
						
						case ENTRY_STATE.PASS:
							decorationPass.push(decorationOptions);
							break;
		
						case ENTRY_STATE.FAIL:
							decorationFail.push(decorationOptions);
							break;
					}
				});
			}
	
			editor.setDecorations(this.decorationPass, decorationPass);
			editor.setDecorations(this.decorationFail, decorationFail);
			editor.setDecorations(this.decorationNone, decorationNone);
		});
	}

	private getDecorationType(state: ENTRY_STATE): vscode.TextEditorDecorationType
	{
		let textDecorationLight = '';
		let textDecorationDark = '';

		if (state === ENTRY_STATE.FAIL)
		{
			textDecorationLight = 'dotted underline 2px #424242';
			textDecorationDark = 'dotted underline 2px #C5C5C5';
		}

		const decorationType = vscode.window.createTextEditorDecorationType(
		{
			overviewRulerColor: 'rgba(255, 255, 255, 0.5)',
			overviewRulerLane: vscode.OverviewRulerLane.Right,
			light:
			{
				textDecoration: textDecorationLight,
				gutterIconPath: getLightIcon(`karate-test-${state}.svg`),
				gutterIconSize: '85%'
			},
			dark:
			{
				textDecoration: textDecorationDark,
				gutterIconPath: getDarkIcon(`karate-test-${state}.svg`),
				gutterIconSize: '85%'
			}
		});

		return decorationType;
	}

	public triggerUpdateDecorations()
	{
		if (this.timeout)
		{
			clearTimeout(this.timeout);
			this.timeout = undefined;
		}

		this.timeout = setTimeout(() =>
		{
			this.updateDecorations();
		}, 250);
	}
}

export default ProviderDecorations;