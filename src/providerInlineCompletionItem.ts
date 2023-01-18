import * as vscode from 'vscode';
import { Feature, ISection, SECTION_TYPE } from './feature';

interface IDisposable
{
	dispose(): void;
}

class ProviderInlineCompletionItem implements vscode.InlineCompletionItemProvider, IDisposable
{
	inlineCompletionItemProvider: vscode.Disposable;
	featureCompletionItem: vscode.InlineCompletionItem;
	backgroundCompletionItem: vscode.InlineCompletionItem;
	scenarioCompletionItem: vscode.InlineCompletionItem;
	scenarioOutlineCompletionItem: vscode.InlineCompletionItem;
	outlineCompletionItem: vscode.InlineCompletionItem;
	givenCompletionItem: vscode.InlineCompletionItem;
	whenCompletionItem: vscode.InlineCompletionItem;
	thenCompletionItem: vscode.InlineCompletionItem;
	andCompletionItem: vscode.InlineCompletionItem;
	asteriskCompletionItem: vscode.InlineCompletionItem;
	exampleCompletionItem: vscode.InlineCompletionItem;

	constructor()
	{
		this.featureCompletionItem = new vscode.InlineCompletionItem("Feature:");
		this.featureCompletionItem.insertText = new vscode.SnippetString("Feature: ${1:<feature name>}");

		this.backgroundCompletionItem = new vscode.InlineCompletionItem("Background:");

		this.scenarioCompletionItem = new vscode.InlineCompletionItem("Scenario:");
		this.scenarioCompletionItem.insertText = new vscode.SnippetString("Scenario: ${1:<scenario name>}");

		this.scenarioOutlineCompletionItem = new vscode.InlineCompletionItem("Scenario Outline:");
		this.scenarioOutlineCompletionItem.insertText = new vscode.SnippetString("Scenario Outline: ${1:<scenario outline name>}");

		this.outlineCompletionItem = new vscode.InlineCompletionItem("Outline:");
		this.outlineCompletionItem.insertText = new vscode.SnippetString("Outline: ${1:<scenario outline name>}");

		this.givenCompletionItem = new vscode.InlineCompletionItem("Given");
		this.givenCompletionItem.insertText = new vscode.SnippetString("Given ${1:<given arguments>}");

		this.whenCompletionItem = new vscode.InlineCompletionItem("When");
		this.whenCompletionItem.insertText = new vscode.SnippetString("When ${1:<when arguments>}");
		this.whenCompletionItem.command = { command: 'editor.action.inlineSuggest.trigger', title: 'Re-trigger completions...' };

		this.thenCompletionItem = new vscode.InlineCompletionItem("Then");
		this.thenCompletionItem.insertText = new vscode.SnippetString("Then ${1:<then arguments>}");

		this.andCompletionItem = new vscode.InlineCompletionItem("And");
		this.andCompletionItem.insertText = new vscode.SnippetString("And ${1:<and arguments>}");

		this.asteriskCompletionItem = new vscode.InlineCompletionItem("*");
		this.asteriskCompletionItem.insertText = new vscode.SnippetString("* ${1:<* arguments>}");

		this.exampleCompletionItem = new vscode.InlineCompletionItem("Example:");

		vscode.workspace.onDidChangeConfiguration((e) =>
		{
			if (e.affectsConfiguration("karateRunner.editor.inlineCompletion"))
			{
				this.registerInlineCompletionItem();
			}
		});

		this.registerInlineCompletionItem();
	}

	provideInlineCompletionItems(document: vscode.TextDocument, position: vscode.Position, context: vscode.InlineCompletionContext, token: vscode.CancellationToken): vscode.ProviderResult<vscode.InlineCompletionItem[] | vscode.InlineCompletionList> {
		let line = document.lineAt(position);
		let lineNumber = position.line;
		let lineText = line.text;

		let feature: Feature = new Feature(document);
		let sections: ISection[] = feature.getTestSections();
		let inlineCompletionItems: vscode.InlineCompletionItem[] = [];

		let activeSection = sections.find((section) =>
		{
			return lineNumber >= section.startLine && lineNumber <= section.endLine;
		});
		
		if (activeSection === undefined)
		{
			if (!/^\s*\w+\s/.test(lineText))
			{
				inlineCompletionItems.push(this.featureCompletionItem);
			}
		}
		else
		{
			if (lineNumber > activeSection.startLine)
			{
				let previousLine = document.lineAt(lineNumber - 1);
				let previousLineText = previousLine.text.trim();

				switch(activeSection.type)
				{
					case SECTION_TYPE.FEATURE:
						if (previousLineText.length > 0)
						{
							break;
						}

						if (/^\s*Scenario\s/.test(lineText))
						{
							inlineCompletionItems.push(this.outlineCompletionItem);
						}

						if (/^\s*\w+\s/.test(lineText))
						{
							break;
						}

						let backgroundSection = sections.find((section) =>
						{
							return section.type === SECTION_TYPE.BACKGROUND;
						});
		
						if (backgroundSection === undefined)
						{
							inlineCompletionItems.push(this.backgroundCompletionItem);
						}
		
						inlineCompletionItems.push(this.scenarioCompletionItem);
						inlineCompletionItems.push(this.scenarioOutlineCompletionItem);
						break;
		
					case SECTION_TYPE.BACKGROUND:
						if (previousLineText.length > 0)
						{
							if (/^\s*\*/.test(lineText))
							{
								break;
							}

							inlineCompletionItems.push(this.asteriskCompletionItem);
							break;
						}

						if (/^\s*Scenario\s/.test(lineText))
						{
							inlineCompletionItems.push(this.outlineCompletionItem);
						}

						if (/^\s*\w+\s/.test(lineText))
						{
							break;
						}

						inlineCompletionItems.push(this.scenarioCompletionItem);
						inlineCompletionItems.push(this.scenarioOutlineCompletionItem);

						break;

					case SECTION_TYPE.SCENARIO:
					case SECTION_TYPE.SCENARIO_OUTLINE:
						if (previousLineText.length === 0)
						{
							inlineCompletionItems.push(this.scenarioCompletionItem);
							inlineCompletionItems.push(this.scenarioOutlineCompletionItem);

							if (activeSection.type === SECTION_TYPE.SCENARIO_OUTLINE)
							{
								inlineCompletionItems.push(this.exampleCompletionItem);
							}
						}

						if (/^\s*(\w+|\*)\s/.test(lineText))
						{
							break;
						}

						if (feature.isTestSection(previousLineText))
						{
							inlineCompletionItems.push(this.givenCompletionItem);
							inlineCompletionItems.push(this.asteriskCompletionItem);
						}

						if (/^Given/.test(previousLineText))
						{
							inlineCompletionItems.push(this.whenCompletionItem);
							inlineCompletionItems.push(this.andCompletionItem);
							inlineCompletionItems.push(this.asteriskCompletionItem);
						}

						if (/^When/.test(previousLineText))
						{
							inlineCompletionItems.push(this.thenCompletionItem);
							inlineCompletionItems.push(this.andCompletionItem);
							inlineCompletionItems.push(this.asteriskCompletionItem);
						}

						if (/^Then/.test(previousLineText))
						{
							inlineCompletionItems.push(this.andCompletionItem);
							inlineCompletionItems.push(this.asteriskCompletionItem);
						}

						if (/^And/.test(previousLineText))
						{
							inlineCompletionItems.push(this.whenCompletionItem);
							inlineCompletionItems.push(this.thenCompletionItem);
							inlineCompletionItems.push(this.andCompletionItem);
							inlineCompletionItems.push(this.asteriskCompletionItem);
						}

						break;
				}
			}
		}

		return inlineCompletionItems;
	}

	registerInlineCompletionItem()
	{
		if (Boolean(vscode.workspace.getConfiguration('karateRunner.editor').get('inlineCompletion')))
		{
			let karateFile = { language: "karate", scheme: "file" };
			this.inlineCompletionItemProvider = vscode.languages.registerInlineCompletionItemProvider(karateFile, this);
		}
		else
		{
			if (this.inlineCompletionItemProvider && this.inlineCompletionItemProvider instanceof vscode.Disposable)
			{
				this.inlineCompletionItemProvider.dispose();
			}
		}
	}

	public dispose(): void
	{
		if (this.inlineCompletionItemProvider && this.inlineCompletionItemProvider instanceof vscode.Disposable)
		{
			this.inlineCompletionItemProvider.dispose();
		}
	}
}

export default ProviderInlineCompletionItem;