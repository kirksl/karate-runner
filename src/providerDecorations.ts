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

			let rangeNone = [];
			let rangePass = [];
			let rangeFail = [];
	
			if (Boolean(vscode.workspace.getConfiguration('karateRunner.editor').get('toggleResultsInGutter')))
			{
				let tedArray: ITestExecutionDetail[] = await getTestExecutionDetail(editor.document.uri, ENTRY_TYPE.FILE);
	
				tedArray.forEach((ted) =>
				{
					let state = ProviderResults.getTestResult(ted);
					let range = new vscode.Range(ted.testLine, 0, ted.testLine, 0);
		
					switch (state)
					{
						case ENTRY_STATE.NONE:
							rangeNone.push({ range });
							break;
						
						case ENTRY_STATE.PASS:
							rangePass.push({ range });
							break;
		
						case ENTRY_STATE.FAIL:
							rangeFail.push({ range });
							break;
					}
				});
			}
	
			editor.setDecorations(this.decorationPass, rangePass);
			editor.setDecorations(this.decorationFail, rangeFail);
			editor.setDecorations(this.decorationNone, rangeNone);
		});
	}

	private getDecorationType(state: ENTRY_STATE): vscode.TextEditorDecorationType
	{
		const decorationType = vscode.window.createTextEditorDecorationType(
		{
			light:
			{
				gutterIconPath: getLightIcon(`karate-test-${state}.svg`),
				gutterIconSize: '85%',
			},
			dark:
			{
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