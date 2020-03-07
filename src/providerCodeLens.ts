import { getTestExecutionDetail, ITestExecutionDetail } from "./helper";
import path = require("path");
import * as vscode from 'vscode';


class ProviderCodeLens implements vscode.CodeLensProvider
{
  async provideCodeLenses(document: vscode.TextDocument): Promise<vscode.CodeLens[]>
  {
    let codeLensArray = [];
    let tedArray: ITestExecutionDetail[] = await getTestExecutionDetail(document.uri, vscode.FileType.File);

    tedArray.forEach((ted) =>
    {
      let codeLensLocation = new vscode.Range(ted.codelensLine, 0, ted.codelensLine, 0);

      let commandRunArgs = new Array();
      commandRunArgs.push(ted.karateOptions);
      commandRunArgs.push(ted.karateJarOptions);
      commandRunArgs.push(document.uri);
      commandRunArgs.push(vscode.FileType.File);

      let codeLensRunCommand: vscode.Command =
      {
        arguments: [commandRunArgs],
        command: "karateRunner.tests.run",
        title: ted.codelensRunTitle
      };

      let commandDebugArgs = new Array();
      commandDebugArgs.push(ted.debugLine);

      let codeLensDebugCommand: vscode.Command = 
      {
        arguments: [commandDebugArgs],
        command: "karateRunner.tests.debug",
        title: ted.codelensDebugTitle
      };

      codeLensArray.push(new vscode.CodeLens(codeLensLocation, codeLensRunCommand));
      codeLensArray.push(new vscode.CodeLens(codeLensLocation, codeLensDebugCommand));
    });

    return codeLensArray;
  }
}

export default ProviderCodeLens;
