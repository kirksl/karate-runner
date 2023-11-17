import { ServiceLocalStorage } from './serviceLocalStorage';
import { openExternalUrl } from "./commands";
import { ENTRY_TYPE } from "./types/entry";
import path = require("path");
import net = require('net');
import fs = require("fs");
import * as vscode from 'vscode';
import os = require('os');
let dns = require('dns').promises;

interface IProjectDetail
{
	projectRoot: string;
	runFile: string;
}

interface ITestExecutionDetail
{
	fileType: ENTRY_TYPE;
	testUri: vscode.Uri;
	testTag: string;
	testTitle: string;
	testRange: vscode.Range;
	testLine: number;
	testIgnored: boolean;
	debugLine: number;
	karateOptions: string;
	karateJarOptions: string;
	codelensRunTitle: string;
	codelensDebugTitle: string;
	codelensLine: number;
}

async function isPortFree(port: number): Promise<boolean>
{
	return new Promise((resolve, reject) =>
	{
		let s = net.createServer();

		s.once('error', (err) =>
		{
			s.close();
			if (err["code"] == "EADDRINUSE")
			{
				resolve(false);
			}
			else
			{
				resolve(false);
			}
		});

		s.once('listening', () =>
		{
			resolve(true);
			s.close();
		});
	
		s.listen(port);
	});
}

function getProjectDetail(uri: vscode.Uri, type: vscode.FileType): IProjectDetail
{
	let defaultRootPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
	let filePathArray = uri.fsPath.split(path.sep);
	let projectRootPath = "";
	let runFilePath = "";
	
	if (type === vscode.FileType.File)
	{
		filePathArray.pop();
	}
	
	for (let ndx = filePathArray.length; ndx > 0; ndx--)
	{
		let karateJarFile = "karate.jar";
		let mavenBuildFile = "pom.xml";
		let gradleBuildGroovyFile = "build.gradle";
		let gradleBuildKotlinFile = "build.gradle.kts";
		let javaScriptBuildFile = "package.json";
		
		let runFileTestPath = filePathArray.join(path.sep);
		
		if (fs.existsSync(runFileTestPath + path.sep + karateJarFile))
		{
			projectRootPath = runFileTestPath;
			runFilePath = runFileTestPath + path.sep + karateJarFile;
			break;
		}
		
		if (fs.existsSync(runFileTestPath + path.sep + mavenBuildFile))
		{
			projectRootPath = runFileTestPath;
			runFilePath = runFileTestPath + path.sep + mavenBuildFile;
			break;
		}
		
		if (fs.existsSync(runFileTestPath + path.sep + gradleBuildGroovyFile))
		{
			projectRootPath = runFileTestPath;
			runFilePath = runFileTestPath + path.sep + gradleBuildGroovyFile;
			break;
		}
		
		if (fs.existsSync(runFileTestPath + path.sep + gradleBuildKotlinFile))
		{
			projectRootPath = runFileTestPath;
			runFilePath = runFileTestPath + path.sep + gradleBuildKotlinFile;
			break;
		}

		if (fs.existsSync(runFileTestPath + path.sep + javaScriptBuildFile))
		{
			projectRootPath = runFileTestPath;
			runFilePath = runFileTestPath + path.sep + javaScriptBuildFile;
			break;
		}

		if (defaultRootPath == runFileTestPath)
		{
			projectRootPath = defaultRootPath;
			break;
		}

		filePathArray.pop();
	}
	
	return { projectRoot: projectRootPath, runFile: runFilePath };
}

async function getTestExecutionDetail(uri: vscode.Uri, type: ENTRY_TYPE): Promise<ITestExecutionDetail[]>
{
	let tedArray: ITestExecutionDetail[] = [];
	
	if (type === ENTRY_TYPE.FILE)
	{
		let runTitle = "Karate: Run";
		let debugTitle = "Karate: Debug";
		let isIgnored = false;
		let scenarioCount = 0;
		let scenarioIgnoredCount = 0;
		
		let document = await vscode.workspace.openTextDocument(uri);
		
		let lineTestRegExp = new RegExp("^\\s*(Feature|Scenario|Scenario Outline):.*$");
		let lineTagRegExp = new RegExp("^\\s*@.+$");
		for (let line = 0; line < document.lineCount; line++)
		{
			let ted: ITestExecutionDetail =
			{
				fileType: type,
				testUri: uri,
				testTag: "",
				testTitle: "",
				testRange: null,
				testLine: 0,
				testIgnored: isIgnored,
				debugLine: 0,
				karateOptions: "",
				karateJarOptions: "",
				codelensRunTitle: "",
				codelensDebugTitle: "",
				codelensLine: 0
			};
			
			ted.karateOptions = uri.fsPath;
			ted.karateJarOptions = uri.fsPath;
			
			let lineText = document.lineAt(line).text;
			let lineTestMatch = lineText.match(lineTestRegExp);
			if (lineTestMatch !== null && lineTestMatch.index !== undefined)
			{
				ted.testTitle = lineText.trim();
				ted.testRange = new vscode.Range(line, document.lineAt(line).firstNonWhitespaceCharacterIndex, line, lineText.length);
				ted.codelensLine = line;
				
				if (line > 0)
				{
					let lineLastText = document.lineAt(line - 1).text;
					let lineTagMatch = lineLastText.match(lineTagRegExp);
					if (lineTagMatch !== null && lineTagMatch.index !== undefined)
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
				if (lineScenarioMatch !== null && lineScenarioMatch.index !== undefined)
				{
					scenarioCount++;
					if (isIgnored || ted.testTag.split(/\s+/).includes("@ignore"))
					{
						scenarioIgnoredCount++;
						ted.testIgnored = true;
					}

					ted.testLine = line;
					ted.debugLine = ted.testLine + 1;
					ted.codelensRunTitle = runTitle;
					ted.codelensDebugTitle = debugTitle;
					ted.karateOptions += `:${ted.testLine + 1}`;
					ted.karateJarOptions += `:${ted.testLine +  1}`;
				}
				else
				{
					if (ted.testTag.split(/\s+/).includes("@ignore"))
					{
						isIgnored = true;
						ted.testIgnored = true;
					}

					ted.testLine = line;
					ted.debugLine = 0;
					ted.codelensRunTitle = runTitle;
					ted.codelensDebugTitle = debugTitle;
				}
				
				tedArray.push(ted);
			}
		}

		if (scenarioCount > 0)
		{
			if (scenarioCount == scenarioIgnoredCount)
			{
				tedArray[0].testIgnored = true;
			}
		}
	}
	else
	{
		let glob = String(vscode.workspace.getConfiguration('karateRunner.tests').get('toTargetByGlob'));
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
		
		let ted: ITestExecutionDetail =
		{
			fileType: type,
			testUri: uri,
			testTag: "",
			testTitle: "",
			testRange: null,
			testLine: 0,
			testIgnored: false,
			debugLine: 0,
			karateOptions: classPathNormalized,
			karateJarOptions: classPathNormalized,
			codelensRunTitle: "",
			codelensDebugTitle: "",
			codelensLine: 0
		};
		
		tedArray.push(ted);
	}
	
	return tedArray;
}

function getTestExecutionDetailTags(tedArray: ITestExecutionDetail[]): string[]
{
	let tags: string[] = [];
		
	tedArray.forEach((ted) =>
	{
		let tedTags = ted.testTag.split(/\s+/);
		tedTags.forEach((tag) =>
		{
			if (!tags.includes(tag))
			{
				tags.push(tag);
			}
		});
	});

	return tags;
}

function oneElementsExist(elementsToFind: string[], elementsToSearch: string[]): boolean
{
	if (elementsToFind.length > 0 && elementsToFind[0].length > 0)
	{
		let foundOne = elementsToFind.some((etf) => 
		{
			let re = new RegExp(`^${etf.trim()}$`);
			return elementsToSearch.some((ets) => re.test(ets.trim()));
		});

		return foundOne;
	}
	else
	{
		return true;
	}
}

function getChildAbsolutePath(basePath: string, childPath: string): string
{
	try
	{
		let dirents = fs.readdirSync(basePath, { withFileTypes: true });
		let result = null;
		
		for (let ndx = 0; ndx < dirents.length; ndx++)
		{
			let newBasePath = path.join(basePath, dirents[ndx].name);
			
			if (dirents[ndx].isDirectory())
			{
				result = getChildAbsolutePath(newBasePath, childPath);
			}
			else
			{
				if (newBasePath.toLowerCase().endsWith(childPath.toLowerCase()))
				{
					result = newBasePath;
				}
			}
			
			if (result !== null)
			{
				break;
			}
		}
		
		return result;
	}
	catch (e)
	{
		return null;
	}
}

async function getActiveFeatureFile(): Promise<string>
{
	let activeFeatureFile: string = null;
	let activeTextEditor: vscode.TextEditor = vscode.window.activeTextEditor;
	
	if (activeTextEditor !== undefined)
	{
		let activeFile: string = activeTextEditor.document.fileName;
		
		if (activeFile.toLowerCase().endsWith(".feature"))
		{
			activeFeatureFile = activeFile;
		}
		else
		{
			let activeFiles: readonly vscode.TextDocument[] = vscode.workspace.textDocuments;
			let activeFeatureFiles = activeFiles.filter((e) => e.fileName.toLowerCase().endsWith(".feature"));
			
			if (activeFeatureFiles.length === 1)
			{
				activeFeatureFile = activeFeatureFiles[0].fileName;
			}
			else
			{
				if (activeFeatureFiles.length > 1)
				{
					let quickPickItems: string[] = activeFeatureFiles.map((e) => e.fileName);
					
					let quickPickOptions = <vscode.QuickPickOptions>
					{
						canPickMany: false,
						ignoreFocusOut: true,
						placeHolder: "Select feature file to debug..."
					};
					
					let quickPickFile = await vscode.window.showQuickPick(quickPickItems, quickPickOptions);
					
					if (quickPickFile !== undefined)
					{
						activeFeatureFile = quickPickFile;
					}
				}
			}
		}
	}
	
	return activeFeatureFile;
}

function createTreeViewWatcher(watcher, watcherGlob, provider)
{
	watcher = vscode.workspace.createFileSystemWatcher(watcherGlob);
	
	watcher.onDidCreate((e) => { provider.refresh() });
	watcher.onDidChange((e) => { provider.refresh() });
	watcher.onDidDelete((e) => { provider.refresh() });
	
	provider.refresh();
}

function showWhatsNew(context: vscode.ExtensionContext)
{
	const VERSION_KEY = 'karate.runner.version';
	
	let extVersionCurrent = context.extension.packageJSON.version;
	let extVersionLast = ServiceLocalStorage.instance.getValue(VERSION_KEY);

	if (extVersionLast == null || extVersionLast != extVersionCurrent)
	{
		ServiceLocalStorage.instance.setValue(VERSION_KEY, extVersionCurrent);
		openExternalUrl(`https://github.com/kirksl/karate-runner/releases/tag/v${extVersionCurrent}`);
	}
}

function getIcon(icon: string)
{
	let iconPath =
	{
		light: getLightIcon(icon),
		dark: getDarkIcon(icon)
	};

	return iconPath;
}

function getLightIcon(icon: string)
{
	return path.join(__dirname, '..', 'resources', 'light', icon);
}

function getDarkIcon(icon: string)
{
	return path.join(__dirname, '..', 'resources', 'dark', icon);
}

function truncateMiddle(input: string, length: number): string
{
	if (input.length > length)
	{
		length = length - 3;
		
		let lIndex = Math.ceil(length / 2);
		let rIndex = Math.floor(length / 2);
		let lInput = input.substring(0, lIndex);
		let rInput = input.substring(input.length - rIndex);

		return lInput + '...' + rInput;
	}

	return input;
}

async function getFqdns()
{
	let fqdns = [];
	let addresses = await dns.lookup(os.hostname(), { family: 4, hints: dns.ADDRCONFIG, all: true });

	for (let ndx = 0; ndx < addresses.length; ndx++)
	{
		let fqdn = await dns.lookupService(addresses[ndx].address, 0);
		if (fqdn.hostname.indexOf('.') !== -1)
		{
			fqdns.push(fqdn.hostname);
		}
	}

	return fqdns;
}

function escapeHtml(html: string): string
{
	return html
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;")
		.replace(/\n/g, "\\n");
}


export
{
	isPortFree,
	getProjectDetail,
	getTestExecutionDetail,
	getTestExecutionDetailTags,
	oneElementsExist,
	getChildAbsolutePath,
	getActiveFeatureFile,
	IProjectDetail,
	ITestExecutionDetail,
	createTreeViewWatcher,
	showWhatsNew,
	getIcon,
	getLightIcon,
	getDarkIcon,
	truncateMiddle,
	getFqdns,
	escapeHtml
};