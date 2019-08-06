import path = require("path");
import fs = require("fs");
import * as vscode from 'vscode';


interface ProjectDetail
{
	projectRoot: string;
  runFile: string;
}

interface TestExecutionDetail
{
  testTag: string;
  testTitle: string;
  testLine: number;
  karateOptions: string;
  karateJarOptions: string;
  codelensTitle: string;
  codelensLine: number;
}

function getProjectDetail(uri: vscode.Uri, type: vscode.FileType): ProjectDetail
{
  let filePathArray = uri.fsPath.split(path.sep);
  let projectRootPath = "";
  let runFilePath = "";

  if(type === vscode.FileType.File)
  {
    filePathArray.pop();
  }

  for(let ndx = filePathArray.length; ndx > 0; ndx--)
  {
    let mavenBuildFile = "pom.xml";
    let gradleBuildFile = "build.gradle";
    let karateJarFile = "karate.jar";

    let runFileTestPath = filePathArray.join(path.sep);

    if(fs.existsSync(runFileTestPath + path.sep + karateJarFile))
    {
      projectRootPath = runFileTestPath;
      runFilePath = runFileTestPath + path.sep + karateJarFile;
      break;
    }

    if(fs.existsSync(runFileTestPath + path.sep + mavenBuildFile))
    {
      projectRootPath = runFileTestPath;
      runFilePath = runFileTestPath + path.sep + mavenBuildFile;
      break;
    }

    if(fs.existsSync(runFileTestPath + path.sep + gradleBuildFile))
    {
      projectRootPath = runFileTestPath;
      runFilePath = runFileTestPath + path.sep + gradleBuildFile;
      break;
    }

    filePathArray.pop();
  }

  return { projectRoot: projectRootPath, runFile: runFilePath };
}

async function getTestExecutionDetail(uri: vscode.Uri, type: vscode.FileType): Promise<TestExecutionDetail[]>
{
  let tedArray: TestExecutionDetail[] = [];

  if(type === vscode.FileType.File)
  {
    let featureTitle = "Run Karate Tests";
    let scenarioTitle = "Run Karate Test";
  
    let document = await vscode.workspace.openTextDocument(uri);
    
    let lineTestRegExp = new RegExp("^\\s*(Feature|Scenario|Scenario Outline):.*$");
    let lineTagRegExp = new RegExp("^\\s*@.+$");
    for (let line = 0; line < document.lineCount; line++)
    {
      let ted: TestExecutionDetail = 
      {
        testTag: "",
        testTitle: "",
        testLine: 0,
        karateOptions: "",
        karateJarOptions: "",
        codelensTitle: "",
        codelensLine: 0
      };
      
      ted.karateOptions = `classpath:${uri.fsPath}`;
      ted.karateJarOptions = uri.fsPath;
  
      let lineText = document.lineAt(line).text;
      let lineTestMatch = lineText.match(lineTestRegExp);
      if(lineTestMatch !== null && lineTestMatch.index !== undefined)
      {
        ted.testTitle = lineText.trim();
        ted.codelensLine = line;
  
        if (line > 0)
        {
          let lineLastText = document.lineAt(line - 1).text;
          let lineTagMatch = lineLastText.match(lineTagRegExp);
          if(lineTagMatch !== null && lineTagMatch.index !== undefined)
          {
            ted.testTag = lineLastText.trim();
            ted.codelensLine--;
          }
          else
          {
            ted.testTag = "";
          }
        }
        let lineScenarioRegExp = new RegExp("^\\s*(Scenario|Scenario Outline):(.*)$");
        let lineScenarioMatch = lineText.match(lineScenarioRegExp);
        if(lineScenarioMatch !== null && lineScenarioMatch.index !== undefined)
        {
          ted.testLine = (line + 1);
          ted.codelensTitle = scenarioTitle;
          ted.karateOptions += `:${ted.testLine}`;
          ted.karateJarOptions += `:${ted.testLine}`;
        }
        else
        {
          ted.testLine = 0;
          ted.codelensTitle = featureTitle;
        }
  
        tedArray.push(ted);
      }
    }
  }
  else
  {
    let glob = String(vscode.workspace.getConfiguration('karateRunner.tests').get('toTarget'));
    let karateTestFiles = await vscode.workspace.findFiles(glob).then((value) => { return value; });

    let karateTestFilesFiltered = karateTestFiles.filter((karateTestFile) =>
    {
      return karateTestFile.toString().startsWith(uri.toString());
    });

    let karateTestFoldersFiltered: Array<string> = [];
    karateTestFilesFiltered.forEach((karateTestFile) => 
    {
      karateTestFoldersFiltered.push(karateTestFile.fsPath.substring(0, karateTestFile.fsPath.lastIndexOf(path.sep)));
    });

    let foundFolder = karateTestFoldersFiltered.find((folder) =>
    {
      return folder === uri.fsPath;
    });

    let classPathNormalized = "";
    if (foundFolder !== undefined)
    {
      classPathNormalized = uri.fsPath;
    }
    else
    {
      if (karateTestFoldersFiltered.length === 1)
      {
        classPathNormalized = karateTestFoldersFiltered[0];
      }
      else
      {
        let splitStrings = (a, sep = path.sep) => a.map(i => i.split(sep));
        let elAt = i => a => a[i];
        let rotate = a => a[0].map((e, i) => a.map(elAt(i)));
        let allElementsEqual = arr => arr.every(e => e === arr[0]);
        let commonPath = (input, sep = path.sep) => rotate(splitStrings(input, sep)).filter(allElementsEqual).map(elAt(0)).join(sep);

        classPathNormalized = commonPath(karateTestFoldersFiltered);
        
      }
    }

    let ted: TestExecutionDetail = 
    {
      testTag: "",
      testTitle: "",
      testLine: 0,
      karateOptions: `classpath:${classPathNormalized}`,
      karateJarOptions: classPathNormalized,
      codelensTitle: "",
      codelensLine: 0
    };

    tedArray.push(ted);
  }

  return tedArray;
}

export { getProjectDetail, getTestExecutionDetail, ProjectDetail, TestExecutionDetail };