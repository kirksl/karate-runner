import { getDarkIcon, getLightIcon, getTestExecutionDetail, ITestExecutionDetail } from "./helper";
import { ProviderResults } from "./providerResults";
import { ENTRY_TYPE, ENTRY_STATE } from "./types/entry";
import { Feature, ISection } from "./feature";
import * as vscode from 'vscode';

class ProviderDecorations
{
	private timeout: NodeJS.Timeout;
	private context: vscode.ExtensionContext;
	private activeEditor: vscode.TextEditor;

	private readonly decorTestResultNone: vscode.TextEditorDecorationType;
	private readonly decorTestResultPass: vscode.TextEditorDecorationType;
	private readonly decorTestResultFail: vscode.TextEditorDecorationType;
	private readonly decorTestResultGutterNone: vscode.TextEditorDecorationType;
	private readonly decorTestResultGutterPass: vscode.TextEditorDecorationType;
	private readonly decorTestResultGutterFail: vscode.TextEditorDecorationType;
	private readonly decorTableResultPass: vscode.TextEditorDecorationType;
	private readonly decorTableResultFail: vscode.TextEditorDecorationType;
	private readonly decorTableResultGutterPass: vscode.TextEditorDecorationType;
	private readonly decorTableResultGutterFail: vscode.TextEditorDecorationType;
	private readonly decorTableRowNumber: vscode.TextEditorDecorationType;

	constructor(context: vscode.ExtensionContext)
	{
		this.context = context;
		this.activeEditor = vscode.window.activeTextEditor;

		this.decorTestResultNone = this.getTestResultDecorType(ENTRY_STATE.NONE, false);
		this.decorTestResultPass = this.getTestResultDecorType(ENTRY_STATE.PASS, false);
		this.decorTestResultFail = this.getTestResultDecorType(ENTRY_STATE.FAIL, false);
		this.decorTestResultGutterNone = this.getTestResultDecorType(ENTRY_STATE.NONE, true);
		this.decorTestResultGutterPass = this.getTestResultDecorType(ENTRY_STATE.PASS, true);
		this.decorTestResultGutterFail = this.getTestResultDecorType(ENTRY_STATE.FAIL, true);
		this.decorTableResultPass = this.getTableResultDecorType(ENTRY_STATE.PASS, false);
		this.decorTableResultFail = this.getTableResultDecorType(ENTRY_STATE.FAIL, false);
		this.decorTableResultGutterPass = this.getTableResultDecorType(ENTRY_STATE.PASS, true);
		this.decorTableResultGutterFail = this.getTableResultDecorType(ENTRY_STATE.FAIL, true);
		this.decorTableRowNumber = this.getTableRowNumberDecorType();

		vscode.window.onDidChangeActiveTextEditor((editor) =>
		{
			this.activeEditor = editor;

			if (editor)
			{
				this.triggerUpdateDecorations();
			}
		}, null, this.context.subscriptions);
	  
		vscode.workspace.onDidChangeTextDocument((event) =>
		{
			if (this.activeEditor &&
				event.document === this.activeEditor.document &&
				event.document.languageId === 'karate')
			{
				this.triggerUpdateDecorations();
			}
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

			await this.updateResultDecorations(editor);
			this.updateDataTableDecorations(editor);
		});
	}

	public async updateResultDecorations(editor: vscode.TextEditor)
	{
		let decorTestResultNone: vscode.DecorationOptions[] = [];
		let decorTestResultPass: vscode.DecorationOptions[] = [];
		let decorTestResultFail: vscode.DecorationOptions[] = [];
		let decorTestResultGutterNone: vscode.DecorationOptions[] = [];
		let decorTestResultGutterPass: vscode.DecorationOptions[] = [];
		let decorTestResultGutterFail: vscode.DecorationOptions[] = [];
		let decorTableResultPass: vscode.DecorationOptions[] = [];
		let decorTableResultFail: vscode.DecorationOptions[] = [];
		let decorTableResultGutterPass: vscode.DecorationOptions[] = [];
		let decorTableResultGutterFail: vscode.DecorationOptions[] = [];

		let showResultsInGutter = Boolean(vscode.workspace.getConfiguration('karateRunner.editor').get('toggleResultsInGutter'));

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

			let decorOptions: vscode.DecorationOptions =
			{
				hoverMessage: markdownResults,
				range: rangeNew
			}

			switch (state)
			{
				case ENTRY_STATE.NONE:
					if (showResultsInGutter)
					{
						decorTestResultGutterNone.push(decorOptions);
					}
					else
					{
						decorTestResultNone.push(decorOptions);
					}

					break;
				
				case ENTRY_STATE.PASS:
					if (showResultsInGutter)
					{
						decorTestResultGutterPass.push(decorOptions);
					}
					else
					{
						decorTestResultPass.push(decorOptions);
					}

					break;

				case ENTRY_STATE.FAIL:
					if (showResultsInGutter)
					{
						decorTestResultGutterFail.push(decorOptions);
					}
					else
					{
						decorTestResultFail.push(decorOptions);
					}

					break;
			}

			if (ted.testTitle.startsWith("Feature:"))
			{
				return;
			}

			let result = ProviderResults.getResult(ted);
			if (result && result.isOutline)
			{
				let processedLines = [];

				result.fails.forEach((fail) =>
				{
					if (!processedLines.includes(fail.line - 1))
					{
						processedLines.push(fail.line - 1);
						let range = new vscode.Range(fail.line - 1, 0, fail.line - 1, 0);
						let decorOptions: vscode.DecorationOptions = { range: range };

						if (showResultsInGutter)
						{
							decorTableResultGutterFail.push(decorOptions);
						}
						else
						{
							decorTableResultFail.push(decorOptions);
						}
					}
				});

				result.passes.forEach((pass) =>
				{
					if (!processedLines.includes(pass.line - 1))
					{
						processedLines.push(pass.line - 1);
						let range = new vscode.Range(pass.line - 1, 0, pass.line - 1, 0);
						let decorOptions: vscode.DecorationOptions = { range: range };

						if (showResultsInGutter)
						{
							decorTableResultGutterPass.push(decorOptions);
						}
						else
						{
							decorTableResultPass.push(decorOptions);
						}
					}
				});
			}
		});

		editor.setDecorations(this.decorTestResultPass, decorTestResultPass);
		editor.setDecorations(this.decorTestResultFail, decorTestResultFail);
		editor.setDecorations(this.decorTestResultNone, decorTestResultNone);
		editor.setDecorations(this.decorTestResultGutterPass, decorTestResultGutterPass);
		editor.setDecorations(this.decorTestResultGutterFail, decorTestResultGutterFail);
		editor.setDecorations(this.decorTestResultGutterNone, decorTestResultGutterNone);
		editor.setDecorations(this.decorTableResultPass, decorTableResultPass);
		editor.setDecorations(this.decorTableResultFail, decorTableResultFail);
		editor.setDecorations(this.decorTableResultGutterPass, decorTableResultGutterPass);
		editor.setDecorations(this.decorTableResultGutterFail, decorTableResultGutterFail);
	}

	public updateDataTableDecorations(editor: vscode.TextEditor)
	{
		let edits: vscode.DecorationOptions[] = [];
		let feature: Feature = new Feature(editor.document);
		let sections: ISection[] = feature.getTestSections();

		sections.forEach((section) =>
		{
			let dataTableSections: ISection[] = feature.getDataTableSections(section);
			dataTableSections.forEach((dataTableSection) =>
			{
				let foundHeader = false;
				let tableRowNum = 1;
				let tableEdits: vscode.DecorationOptions[] = [];
				for(let line = dataTableSection.startLine; line <= dataTableSection.endLine; line++)
				{
					let lineAt = editor.document.lineAt(line);
					let text = lineAt.text.trim();

					if (text.match(/^\|.+\|$/))
					{
						if (foundHeader)
						{
							let decorOptions: vscode.DecorationOptions =
							{
								renderOptions:
								{
									after:
									{
										contentText: `${tableRowNum.toString()}`
									}
								},
								range: new vscode.Range(line, 0, line, text.length)
							}
	
							tableEdits.push(decorOptions);
							tableRowNum++;
						}
						else
						{
							foundHeader = true;
						}
					}
				}

				if (tableEdits.length > 1)
				{
					edits = edits.concat(tableEdits);
				}
			});
		});

		editor.setDecorations(this.decorTableRowNumber, edits);
	}

	private getTestResultDecorType(state: ENTRY_STATE, gutterIcon: Boolean): vscode.TextEditorDecorationType
	{
		let textDecorationLight = '';
		let textDecorationDark = '';

		if (state === ENTRY_STATE.FAIL)
		{
			textDecorationLight = 'wavy underline #EA3713';
			textDecorationDark = 'wavy underline #BA2B0E';
		}

		let options: vscode.DecorationRenderOptions = 
		{
			overviewRulerColor: this.getRGBAByState(state),
			overviewRulerLane: vscode.OverviewRulerLane.Center,
			light:
			{
				textDecoration: textDecorationLight
			},
			dark:
			{
				textDecoration: textDecorationDark
			}
		};

		if (gutterIcon)
		{
			options.light.gutterIconPath = getLightIcon(`karate-test-${state}.svg`);
			options.light.gutterIconSize = '85%';
			options.dark.gutterIconPath = getDarkIcon(`karate-test-${state}.svg`);
			options.dark.gutterIconSize = '85%';
		}

		let decorType = vscode.window.createTextEditorDecorationType(options);
		return decorType;
	}

	private getTableResultDecorType(state: ENTRY_STATE, gutterIcon: Boolean): vscode.TextEditorDecorationType
	{
		let options: vscode.DecorationRenderOptions = 
		{
			overviewRulerColor: this.getRGBAByState(state),
			overviewRulerLane: vscode.OverviewRulerLane.Right,
			light: {},
			dark: {}
		};

		if (gutterIcon)
		{
			options.light.gutterIconPath = getLightIcon(`karate-test-${state}.svg`);
			options.light.gutterIconSize = '70%';
			options.dark.gutterIconPath = getDarkIcon(`karate-test-${state}.svg`);
			options.dark.gutterIconSize = '70%';
		}

		let decorType = vscode.window.createTextEditorDecorationType(options);
		return decorType;
	}

	private getTableRowNumberDecorType(): vscode.TextEditorDecorationType
	{
		const workspaceConfig = vscode.workspace.getConfiguration("editor");
		const fontSize = parseInt(workspaceConfig.get("fontSize")) - 1;

		const decorType = vscode.window.createTextEditorDecorationType(
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

		return decorType;
	}

	private getRGBAByState(state: ENTRY_STATE): string
	{
		let rgba = 'rgba(255, 255, 255, 0.5)';

		switch (state)
		{
			case ENTRY_STATE.PASS:
				rgba = 'rgb(67, 163, 61, 0.5)';
				break;

			case ENTRY_STATE.FAIL:
				rgba = 'rgba(186, 43, 14, 0.5)';
				break;
		}

		return rgba;
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