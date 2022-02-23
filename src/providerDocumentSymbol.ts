import { getTestExecutionDetail, ITestExecutionDetail } from "./helper";
import { ENTRY_TYPE } from "./types/entry";
import * as vscode from 'vscode';

class ProviderDocumentSymbol implements vscode.DocumentSymbolProvider
{
	async provideDocumentSymbols(document: vscode.TextDocument, token: vscode.CancellationToken): Promise<vscode.DocumentSymbol[]>
	{
		let documentSymbols = [];
		let tedArray: ITestExecutionDetail[] = await getTestExecutionDetail(document.uri, ENTRY_TYPE.FILE);

		tedArray.forEach((ted) =>
		{
			let symbolName = ted.testTitle;
			let symbolDetail = "";
			let symbolKind = vscode.SymbolKind.Method;
			let symbolRange = ted.testRange;

			documentSymbols.push(new vscode.DocumentSymbol(symbolName, symbolDetail, symbolKind, symbolRange, symbolRange));
		});

		return documentSymbols;
	}

}

export default ProviderDocumentSymbol;