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
	private readonly decorationTables: vscode.TextEditorDecorationType;

	constructor(context: vscode.ExtensionContext)
	{
		this.context = context;

		this.decorationNone = this.getDecorationType(ENTRY_STATE.NONE);
		this.decorationPass = this.getDecorationType(ENTRY_STATE.PASS);
		this.decorationFail = this.getDecorationType(ENTRY_STATE.FAIL);
		this.decorationTables = this.getTablesDecorationType();

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


			let foundTables = false;
			let foundTableHeaders = false;
			let tableDataRow = 1;
			let decorationTables: vscode.DecorationOptions[] = [];

			for (let line = 0; line < editor.document.lineCount; line++)
			{
				let lineText = editor.document.lineAt(line).text.trim();
				if (foundTables)
				{
					if (lineText.length > 1 && lineText.startsWith('|') && lineText.endsWith('|'))
					{
						if (foundTableHeaders)
						{
							let decorationOptions: vscode.DecorationOptions =
							{
								renderOptions:
								{
									after:
									{
										contentText: `${tableDataRow.toString()}`
									}
								},
								range: new vscode.Range(line, 0, line, lineText.length)
							}

							decorationTables.push(decorationOptions);
							tableDataRow++;
						}
						else
						{
							foundTableHeaders = true;
						}
					}
					else
					{
						if (tableDataRow == 2)
						{
							decorationTables.pop();
						}

						tableDataRow = 1;
						foundTableHeaders = false;
						foundTables = false;
					}
				}
				else
				{
					if (lineText.startsWith('Examples:') || lineText.startsWith('* table'))
					{
						foundTables = true;
					}
				}
			}

			if (tableDataRow == 2)
			{
				decorationTables.pop();
			}

			editor.setDecorations(this.decorationTables, decorationTables);
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

	private getTablesDecorationType(): vscode.TextEditorDecorationType
	{
		const workspaceConfig = vscode.workspace.getConfiguration("editor");
		const fontSize = parseInt(workspaceConfig.get("fontSize")) - 1;

		const decorationType = vscode.window.createTextEditorDecorationType(
		{
			isWholeLine: true,
			after:
			{
				backgroundColor: new vscode.ThemeColor('karateRunner.trailingLineBackgroundColor'),
				color: new vscode.ThemeColor('karateRunner.trailingLineForegroundColor'),
				fontWeight: '100',
				fontStyle: 'normal',
				textDecoration: `none;position: relative;border-style: solid;font-size: ${fontSize}px; border-color: transparent;border-width: 0px 10px 0px 5px;`
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
		}, 10);
	}
}

export default ProviderDecorations;