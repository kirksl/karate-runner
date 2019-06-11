import path = require("path");
import fs = require("fs");
import * as vscode from 'vscode';


interface BuildPaths
{
	projectRoot: string;
	buildFile: string;
}

interface TestExecutionDetail
{
  testTag: string;
  testTitle: string;
  testLine: number;
  karateOptions: string;
  codelensTitle: string;
  codelensLine: number;
}

function getBuildPaths(uri: vscode.Uri): BuildPaths
{
    let mavenBuildFile = "pom.xml";
    let gradleBuildFile = "build.gradle";

    let filePathArray = uri.fsPath.split(path.sep);
    let projectRootPath = "";
    let buildFilePath = "";
  
    for(let ndx = filePathArray.length - 1; ndx > 0; ndx--)
    {
      filePathArray.pop();
  
      let buildFileTestPath = filePathArray.join(path.sep);
  
      if(fs.existsSync(buildFileTestPath + path.sep + mavenBuildFile))
      {
        projectRootPath = buildFileTestPath;
        buildFilePath = buildFileTestPath + path.sep + mavenBuildFile;
        break;
      }

      if(fs.existsSync(buildFileTestPath + path.sep + gradleBuildFile))
      {
        projectRootPath = buildFileTestPath;
        buildFilePath = buildFileTestPath + path.sep + gradleBuildFile;
        break;
      }
    }

    return { projectRoot: projectRootPath, buildFile: buildFilePath };
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
  let lineTestRegExp = new RegExp("^.*(Feature|Scenario|Scenario Outline):.*$");
  let lineTagRegExp = new RegExp("^.*@.+$");
  for (let line = 0; line < document.lineCount; line++)
  {
    let ted: TestExecutionDetail = 
    {
      testTag: "",
      testTitle: "",
      testLine: 0,
      karateOptions: "",
      codelensTitle: "",
      codelensLine: 0
    };
    
    ted.karateOptions = ("classpath:" + classPathArray[1]);

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
      let lineScenarioRegExp = new RegExp("^.*(Scenario|Scenario Outline):.*$");
      let lineScenarioMatch = lineText.match(lineScenarioRegExp);
      if(lineScenarioMatch !== null && lineScenarioMatch.index !== undefined)
      {
        ted.testLine = (line + 1);
        ted.codelensTitle = scenarioTitle;
        ted.karateOptions += ":" + ted.testLine
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

export { getBuildPaths, getTestExecutionDetail, BuildPaths, TestExecutionDetail };