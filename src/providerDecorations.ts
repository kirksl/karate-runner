import { getTestExecutionDetail, ITestExecutionDetail } from "./helper";
import { ProviderResults } from "./providerResults";
import * as path from 'path';
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

		this.decorationNone = this.getDecorationType(ProviderResults.ENTRY_STATE.NONE);
		this.decorationPass = this.getDecorationType(ProviderResults.ENTRY_STATE.PASS);
		this.decorationFail = this.getDecorationType(ProviderResults.ENTRY_STATE.FAIL);

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
				let tedArray: ITestExecutionDetail[] = await getTestExecutionDetail(editor.document.uri, vscode.FileType.File);
	
				tedArray.forEach((ted) =>
				{
					let state = ProviderResults.getTestResult(ted);
					let range = new vscode.Range(ted.testLine, 0, ted.testLine, 0);
		
					switch (state)
					{
						case ProviderResults.ENTRY_STATE.NONE:
							rangeNone.push({ range });
							break;
						
						case ProviderResults.ENTRY_STATE.PASS:
							rangePass.push({ range });
							break;
		
						case ProviderResults.ENTRY_STATE.FAIL:
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

	private getDecorationType(state: ProviderResults.ENTRY_STATE): vscode.TextEditorDecorationType
	{
		let icon = 'karate-test-none.svg';

		if (state === ProviderResults.ENTRY_STATE.PASS)
		{
			icon = 'karate-test-pass.svg';
		}
		else if (state === ProviderResults.ENTRY_STATE.FAIL)
		{
			icon = 'karate-test-fail.svg';
		}

		const decorationType = vscode.window.createTextEditorDecorationType(
		{
			light:
			{
				gutterIconPath: path.join(__dirname, '..', 'resources', 'light', icon),
				gutterIconSize: '85%',
			},
			dark:
			{
				gutterIconPath: path.join(__dirname, '..', 'resources', 'dark', icon),
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