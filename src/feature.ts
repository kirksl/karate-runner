import * as vscode from 'vscode';

interface ISection
{
	tag: string;
	title: string;
	type: string;
	startLine: number;
	endLine: number;
}

interface IUriToken
{
	isClassPath: boolean;
	path: string;
	tag: string;
}

interface ILineToken
{
	text: string;
	line: number;
	startIndex: number;
	endIndex: number;
	scope: number;
}

const SECTION_TYPE = 
{
	FEATURE: 'feature:',
	BACKGROUND: 'background:',
	SCENARIO: 'scenario:',
	SCENARIO_OUTLINE: 'scenario outline:',
	EXAMPLES: 'example:',
	TAG: '@',
	COMMENT: '#'
};

class Feature
{
	public document: vscode.TextDocument = null;
	public sections: ISection[] = [];

	constructor(document: vscode.TextDocument)
	{
		this.document = document;
	}

	public getLine(line: number): vscode.TextLine
	{
		return this.document.lineAt(line);
	}

	public getLineTokens(line: vscode.TextLine): ILineToken[]
	{
		let regexp = new RegExp(/[()]{1}|[^\s()"']+|'[^']*'|"[^"]*"{1,2}|[^\s"']+/g);
		let tokens: ILineToken[] = [];
		let lParens: number = 0;
		let rParens: number = 0;
		let scope: number = 0;
		let readScope: boolean = false;
		let match;

		while ((match = regexp.exec(line.text)) !== null)
		{
			if (match[0].toLowerCase() === 'read')
			{
				readScope = true;
				scope++;
			}

			let token: ILineToken =
			{
				text: match[0],
				line: line.lineNumber,
				startIndex: match.index,
				endIndex: regexp.lastIndex,
				scope: scope
			};

			if (match[0] === '(') { lParens++; }
			if (match[0] === ')') { rParens++; }

			if (lParens > 0 && lParens === rParens && readScope === true)
			{
				lParens = 0;
				rParens = 0;
				scope++;
				readScope = false;
			}

			tokens.push(token);
		}

		return tokens;
	}

	public getPositionalTokens(tokens: ILineToken[], position: vscode.Position): ILineToken[]
	{
		let positionalTokens: ILineToken[] = [];
		let scopedTokens: ILineToken[] = [];
		let scopedIndex: number = null;
		let charPosition: number = position.character;
		let lParens: number = 0;
		let rParens: number = 0;
		let canConcat: boolean = false;

		for (let ndx = 0; ndx < tokens.length; ndx++)
		{
			if (tokens[ndx].startIndex <= charPosition
				&& tokens[ndx].endIndex >= charPosition
				&& !this.isKeyword(tokens[ndx].text.toLowerCase()))
			{
				positionalTokens.push(tokens[ndx]);
				scopedTokens = tokens.filter((t) => t.scope === tokens[ndx].scope);
				break;
			}
		}

		for (let ndx = 0; ndx < scopedTokens.length; ndx++)
		{
			if (scopedTokens[ndx].startIndex <= charPosition && scopedTokens[ndx].endIndex >= charPosition)
			{
				scopedIndex = ndx;
			}
		}

		if (scopedIndex !== null)
		{
			if (scopedIndex > 1)
			{
				for (let ndx = scopedIndex - 1; ndx > 0; ndx--)
				{
					if (scopedTokens[ndx].text === '+')
					{
						canConcat = true;
						continue;
					}

					if (scopedTokens[ndx].text === '(')
					{
						lParens++;
						continue;
					}

					if (scopedTokens[ndx].text === ')')
					{
						rParens++;
						continue;
					}

					if (scopedTokens[ndx].text.toLowerCase() === 'read')
					{
						continue;
					}

					if (this.isKeyword(scopedTokens[ndx].text.toLowerCase()))
					{
						break;
					}

					if (canConcat)
					{
						positionalTokens.unshift(scopedTokens[ndx]);
						canConcat = false;
					}
					else
					{
						break;
					}
				}
			}

			canConcat = false;
	
			if (scopedIndex < scopedTokens.length - 1)
			{
				for (let ndx = scopedIndex + 1; ndx < scopedTokens.length; ndx++)
				{
					if (scopedTokens[ndx].text === '+')
					{
						canConcat = true;
						continue;
					}
					
					if (scopedTokens[ndx].text === '(')
					{
						lParens++;                        
						continue;
					}
					
					if (scopedTokens[ndx].text === ')')
					{
						rParens++;
						continue;
					}

					if (this.isKeyword(scopedTokens[ndx].text.toLowerCase()))
					{
						break;
					}

					if (canConcat)
					{
						positionalTokens.push(scopedTokens[ndx]);
						canConcat = false;
					}
					else
					{
						break;
					}
				}
			}
		}

		if (lParens === rParens)
		{
			return positionalTokens;
		}
		else
		{
			return [];
		}
	}

	public getStringFromTokens(tokens: ILineToken[], recurseLimiter = 10000): string
	{
		if (recurseLimiter <= 0)
		{
			return null;
		}

		let stringBuilder: string[] = [];

		for (let ndx = 0; ndx < tokens.length; ndx++)
		{
			if (/^'.*'$|^".*"$/.test(tokens[ndx].text))
			{
				stringBuilder.push(tokens[ndx].text.replace(/^['"]|['"]$/g, ''));
			}
			else
			{
				let deref = this.dereferenceToken(tokens[ndx]);

				if (deref === null && ndx < tokens.length)
				{
					continue;
				}
				else if (deref === null)
				{
					return null;
				}

				let lTokens = this.getLineTokens(deref);
				let position: vscode.Position = new vscode.Position(0, deref.text.length);
				let pTokens = this.getPositionalTokens(lTokens, position);
				
				stringBuilder.push(this.getStringFromTokens(pTokens, --recurseLimiter));
			}
		}

		if (stringBuilder.length === 0 || stringBuilder.join('') === '')
		{
			return null;
		}
		else
		{
			return stringBuilder.join('');
		}
	}

	public getUriToken(reference: string): IUriToken
	{
		let uriToken: IUriToken = { isClassPath: false, path: null, tag: null };

		let match1: RegExpMatchArray = reference.match(/\w{2,}:(.+)/);
		if (match1 !== null && match1.length === 2)
		{
			uriToken.isClassPath = true;
			uriToken.path = match1[1];
		}
		else
		{
			uriToken.isClassPath = false;
			uriToken.path = reference;
		}

		let match2: RegExpMatchArray = uriToken.path.match(/(.+)(@.+)/);
		if (match2 !== null && match2.length === 3)
		{
			uriToken.path = match2[1];
			uriToken.tag = match2[2];
		}
		else
		{
			uriToken.tag = null;
		}

		return uriToken;
	}

	public getSectionType(line: string): string
	{
		if (this.isBackgroundSection(line)) { return SECTION_TYPE.BACKGROUND }
		if (this.isFeatureSection(line)) { return SECTION_TYPE.FEATURE; }
		if (this.isScenarioSection(line)) { return SECTION_TYPE.SCENARIO; }
		if (this.isScenarioOutlineSection(line)) { return SECTION_TYPE.SCENARIO_OUTLINE; }
		if (this.isExamplesSection(line)) { return SECTION_TYPE.EXAMPLES; }
		if (this.isTagSection(line)) { return SECTION_TYPE.TAG; }
		if (this.isCommentSection(line)) { return SECTION_TYPE.COMMENT; }

		return null;
	}

	public getTestSections(useCache = true): ISection[]
	{
		if (useCache && this.sections.length > 0)
		{
			return this.sections;
		}

		for (let line = 0; line < this.document.lineCount; line++)
		{
			let lineText = this.getLine(line).text;

			if (this.isTestSection(lineText))
			{
				let section: ISection = 
				{
					tag: "",
					title: lineText,
					type: this.getSectionType(lineText),
					startLine: line,
					endLine: this.document.lineCount
				};

				if (line > 0)
				{
					let lineLastText = this.getLine(line - 1).text;

					if (/^@.+/.test(lineLastText.trim()))
					{
						section.tag = lineLastText;
						section.startLine -= 1;
					}
				}

				if (this.sections.length > 0)
				{
					this.sections[this.sections.length - 1].endLine = section.startLine - 1;
				}

				this.sections.push(section);
			}
		}

		return this.sections;
	}

	public dereferenceToken(token: ILineToken): vscode.TextLine
	{
		let sections: ISection[] = this.getTestSections().filter((section) => 
		{
			return section.type !== SECTION_TYPE.FEATURE && section.startLine < token.line;
		});

		let targetSections: ISection[] = [];

		if (sections.length > 0)
		{
			sections[sections.length - 1].endLine = token.line;
			targetSections.push(sections[sections.length - 1]);

			if (sections.length > 1)
			{
				if (this.isBackgroundSection(sections[0].title))
				{
					targetSections.unshift(sections[0]);
				}
			}
	
			let regexp: RegExp = new RegExp(`\\s*\\*\\s+def\\s+${token.text}\\s+=(.+)`, 'i');
			for (let ndx1 = targetSections.length - 1; ndx1 >= 0; ndx1--)
			{
				for (let ndx2 = targetSections[ndx1].endLine; ndx2 > targetSections[ndx1].startLine; ndx2--)
				{
					let line: vscode.TextLine = this.getLine(ndx2);
					let match: RegExpMatchArray = line.text.match(regexp);
	
					if (match !== null && match.length === 2)
					{
						return line;
					}
				}
			}
		}

		return null;
	}

	public isFeatureSection(line: string): boolean
	{
		return line.toLowerCase().trim().startsWith(SECTION_TYPE.FEATURE);
	}

	public isBackgroundSection(line: string): boolean
	{
		return line.toLowerCase().trim().startsWith(SECTION_TYPE.BACKGROUND);
	}
	
	public isScenarioSection(line: string): boolean
	{
		return line.toLowerCase().trim().startsWith(SECTION_TYPE.SCENARIO);
	}

	public isScenarioOutlineSection(line: string): boolean
	{
		return line.toLowerCase().trim().startsWith(SECTION_TYPE.SCENARIO_OUTLINE);
	}

	public isExamplesSection(line: string): boolean
	{
		return line.toLowerCase().trim().startsWith(SECTION_TYPE.EXAMPLES);
	}

	public isTagSection(line: string): boolean
	{
		return line.toLowerCase().trim().startsWith(SECTION_TYPE.TAG);
	}

	public isCommentSection(line: string): boolean
	{
		return line.toLowerCase().trim().startsWith(SECTION_TYPE.COMMENT);
	}

	public isSection(line: string): boolean
	{
		if (this.isBackgroundSection(line)) { return true; }
		if (this.isFeatureSection(line)) { return true; }
		if (this.isScenarioSection(line)) { return true; }
		if (this.isScenarioOutlineSection(line)) { return true; }
		if (this.isExamplesSection(line)) { return true; }
		if (this.isTagSection(line)) { return true; }
		if (this.isCommentSection(line)) { return true; }

		return false;
	}

	public isTestSection(line: string): boolean
	{
		if (this.isFeatureSection(line)) { return true; }
		if (this.isBackgroundSection(line)) { return true; }
		if (this.isScenarioSection(line)) { return true; }
		if (this.isScenarioOutlineSection(line)) { return true; }

		return false;
	}

	public isKeyword(word: string): boolean
	{
		let steps = ['given', 'when', 'then', 'and', 'but', "*"];
		if (steps.includes(word.toLowerCase())) { return true; }

		let symbols = [':', '=', '==', '!=', '+', '"""', '(', ')', '[', ']', '{', '}']
		if (symbols.includes(word)) { return true; }

		let variables = ['def', 'text', 'table', 'yaml', 'csv', 'string', 'json', 'xml', 'xmlstring', 'bytes', 'copy'];
		if (variables.includes(word.toLowerCase())) { return true; }

		let actions = ['assert', 'print', 'replace', 'get', 'set', 'remove', 'configure', 'call', 'callonce', 'eval', 'read', 'karate', 'java.type'];
		if (actions.includes(word.toLowerCase())) { return true; }

		let https = ['url', 'path', 'request', 'method', 'status', 'soap', 'action', 'retry', 'until', 'soap action', 'retry until'];
		if (https.includes(word.toLowerCase())) { return true; }

		let requests = ['param', 'params', 'header', 'headers', 'cookie', 'cookies', 'form', 'field', 'fields', 'multipart', 'file', 'files', 'entity', 'form field', 'multipart file', 'multipart field', 'multipart entity', 'form fields', 'multipart files', 'multipart fields'];
		if (requests.includes(word.toLowerCase())) { return true; }

		let responses = ['response', 'responsebytes', 'responsestatus', 'responseheaders', 'responsecookies', 'responsetime', 'responsetimestamp'];
		if (responses.includes(word.toLowerCase())) { return true; }

		let asserts = ['match', 'contains', '!contains', 'only', 'any', 'each', 'match ==', 'match !=', 'match contains', 'match contains only', 'match contains any', 'match !contains', 'match each', 'match header'];
		if (asserts.includes(word.toLowerCase())) { return true; }

		if (word.startsWith('<') && word.endsWith('>')) { return true; }

		return false;
	}
}

export { Feature, ISection, IUriToken, ILineToken };