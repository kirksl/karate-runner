import { getProjectDetail, getTestExecutionDetail, ProjectDetail, TestExecutionDetail } from "./helper";
import path = require("path");
import * as vscode from 'vscode';


class ProviderCodeLens implements vscode.CodeLensProvider
{
  async provideCodeLenses(document: vscode.TextDocument): Promise<vscode.CodeLens[]>
  {
    let codeLensArray = [];
    let projectDetail: ProjectDetail = getProjectDetail(document.uri);
    let tedArray: TestExecutionDetail[] = await getTestExecutionDetail(document.uri);

    tedArray.forEach((ted) =>
    {
      let codeLensLocation = new vscode.Range(ted.codelensLine, 0, ted.codelensLine, 0);
      let commandArgs = new Array();
      commandArgs.push(ted.karateOptions);
      commandArgs.push(ted.karateJarOptions);
      commandArgs.push(projectDetail.projectRoot);
      commandArgs.push(projectDetail.runFile);
      let codeLensCommand: vscode.Command = 
      {
        arguments: [commandArgs],
        command: "karateRunner.runKarateTest",
        title: ted.codelensTitle
      };
    
      codeLensArray.push(new vscode.CodeLens(codeLensLocation, codeLensCommand));
    });
    
    return codeLensArray;
  }
}

export default ProviderCodeLens;
