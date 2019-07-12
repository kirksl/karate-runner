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

function getProjectDetail(uri: vscode.Uri): ProjectDetail
{
  let filePathArray = uri.fsPath.split(path.sep);
  let projectRootPath = "";
  let runFilePath = "";

  for(let ndx = filePathArray.length - 1; ndx > 0; ndx--)
  {
    let mavenBuildFile = "pom.xml";
    let gradleBuildFile = "build.gradle";
    let karateJarFile = "karate.jar";

    filePathArray.pop();

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
  }

  return { projectRoot: projectRootPath, runFile: runFilePath };
}

async function getTestExecutionDetail(uri: vscode.Uri): Promise<TestExecutionDetail[]>
{
  let tedArray: TestExecutionDetail[] = [];

  let featureTitle = "Run Karate Tests";
  let scenarioTitle = "Run Karate Test";

  let pathSep = (path.sep == "\\" ? path.sep + path.sep : path.sep);
  let classPathRegExp = new RegExp(".*src" + pathSep + "test" + pathSep + "java" + pathSep);
  let classPathArray = uri.fsPath.split(classPathRegExp);

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
    
    ted.karateOptions = ("classpath:" + classPathArray[1]);
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
        ted.karateOptions += ":" + ted.testLine
        ted.karateJarOptions = "-n \"" + lineScenarioMatch[2].trim() + "\" " + ted.karateJarOptions;
      }
      else
      {
        ted.testLine = 0;
        ted.codelensTitle = featureTitle;
      }

      tedArray.push(ted);
    }
  }

  return tedArray;
}

export { getProjectDetail, getTestExecutionDetail, ProjectDetail, TestExecutionDetail };