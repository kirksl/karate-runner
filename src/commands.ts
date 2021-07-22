import { getProjectDetail, getTestExecutionDetail, getActiveFeatureFile, IProjectDetail, ITestExecutionDetail, getLightIcon, getDarkIcon } from "./helper";
import { Feature, ISection } from "./feature";
import { ENTRY_TYPE } from "./types/entry";
import ProviderStatusBar from "./providerStatusBar";
import ProviderExecutions from "./providerExecutions";
import parse = require('parse-curl');
import * as vscode from 'vscode';
import os = require('os');
import open = require('open');
import ProviderKarateTests from "./providerKarateTests";
import ProviderReports from "./providerReports";

let debugLineNumber: number = 0;
let debugFeatureFile: string = '';


async function smartPaste()
{
	const curlIgnores = ['accept-', 'upgrade-', 'user-', 'connection', 'referer', 'sec-', 'origin', 'host', 'content-length'];
	
	let curlIgnoreHeader = (header: string) =>
	{
		for (let ignore of curlIgnores)
		{
			if (header.toLowerCase().startsWith(ignore))
			{
				return true;
			}
		}
		
		return false;
	}
	
	let convertCurl = (raw: string) =>
	{
		let steps: Array<string> = [];
		raw = raw.replace('--data-binary', '--data');
		const curl: object = parse(raw);
		steps.push('* url \'' + curl['url'] + '\'');
		const headers: object = curl['header'] || {};
		
		for (let key of Object.keys(headers))
		{
			if (curlIgnoreHeader(key))
			{
				continue;
			}
			
			let val: string = headers[key];
			steps.push('* header ' + key + ' = \'' + val + '\'');
		}
		
		let method: string = curl['method'];
		let body = curl['body'];
		
		if (!body && (method === 'POST' || method === 'PUT' || method === 'PATCH'))
		{
			body = '\'\'';
		}
		
		if (body)
		{
			steps.push('* request ' + body);
		}
		
		steps.push('* method ' + method.toLowerCase());
		return steps.join('\n');
	}
	
	let editor = vscode.window.activeTextEditor;
	let start = editor.selection.start;
	
	vscode.commands.executeCommand('editor.action.clipboardPasteAction').then(() =>
	{
		let end = editor.selection.end;
		let selection = new vscode.Selection(start.line, start.character, end.line, end.character);
		let selectedText = editor.document.getText(selection).trim();
		
		if (selectedText.startsWith('curl'))
		{
			editor.edit((editBuilder: vscode.TextEditorEdit) =>
			{
				editBuilder.replace(selection, convertCurl(selectedText) + '\n');
				editor.revealRange(new vscode.Range(start, start));
			});
		}
	})
}

function getDebugFile()
{
	let debugLine: string = (debugLineNumber === 0) ? "" : `:${debugLineNumber}`;
	debugLineNumber = 0;

	let debugFile: string = debugFeatureFile;
	
	if (debugFile !== null)
	{
		return debugFile + debugLine;
	}
	else
	{
		return "";
	}
}

async function getDebugBuildFile()
{
	let debugFile: string = debugFeatureFile;
	debugFeatureFile = '';

	if (debugFile === '')
	{
		debugFile = await getActiveFeatureFile();
	}
	
	if (debugFile !== null && debugFile !== '')
	{
		let projectDetail: IProjectDetail = getProjectDetail(vscode.Uri.file(debugFile), vscode.FileType.File);
		return projectDetail.runFile;
	}
	else
	{
		return '';
	}
}

async function runTagKarateTests(args)
{
	args.karateOptions = `--tags ${args.tag}`;
	args.karateJarOptions = `-t ${args.tag}`;
	args.fileType = vscode.FileType.Directory;
	args.testUri = args.uri;
	runKarateTest([args]);
}

async function runAllKarateTests(args = null)
{
	if (args === null)
	{
		let activeEditor: vscode.TextEditor = vscode.window.activeTextEditor;
		if (activeEditor === undefined || activeEditor.document.languageId !== 'karate')
		{
			return;
		}

		args = { uri: activeEditor.document.uri, type: ENTRY_TYPE.FILE };
	}

	if (args.type !== ENTRY_TYPE.TEST)
	{
		let tedArray: ITestExecutionDetail[] = await getTestExecutionDetail(args.uri, args.type);
		let ted: ITestExecutionDetail = tedArray[0];

		if (ted === undefined)
		{
			return;
		}

		if (args.tag)
		{
			ted.karateOptions = `--tags ${args.tag} ${ted.karateOptions}`;
			ted.karateJarOptions = `-t ${args.tag} ${ted.karateJarOptions}`;
		}

		args = [];
		args[0] = 
		{
			karateOptions: ted.karateOptions,
			karateJarOptions: ted.karateJarOptions,
			testUri: ted.testUri,
			fileType: ted.fileType
		};
	}

	runKarateTest(args);
}

async function runKarateTest(args = null)
{
	let karateRunner = null;
	let karateOptions: String;
	let karateJarOptions: String;
	let targetTestUri: vscode.Uri;
	let targetTestUriType: vscode.FileType;

	if (args === null)
	{
		let activeEditor: vscode.TextEditor = vscode.window.activeTextEditor;
		if (activeEditor === undefined || activeEditor.document.languageId !== 'karate')
		{
			return;
		}

		let activeLine = activeEditor.selection.active.line;
		
		let feature: Feature = new Feature(activeEditor.document);
		let sections: ISection[] = feature.getTestSections();
		let activeSection = sections.find((section) =>
		{
			return activeLine >= section.startLine && activeLine <= section.endLine;
		});
		
		if (activeSection === undefined)
		{
			return;
		}
		
		let tedArray: ITestExecutionDetail[] = await getTestExecutionDetail(activeEditor.document.uri, ENTRY_TYPE.FILE);
		let ted: ITestExecutionDetail = tedArray.find((ted) =>
		{
			return ted.codelensLine === activeSection.startLine;
		});
		
		if (ted === undefined)
		{
			return;
		}
		
		args = {};
		args.karateOptions = ted.karateOptions;
		args.karateJarOptions = ted.karateJarOptions;
		args.testUri = activeEditor.document.uri;
		args.fileType = ted.fileType;
	}
	else
	{
		args = (args.command) ? args.command.arguments[0] : args[0];
	}

	karateOptions = args.karateOptions;
	karateJarOptions = args.karateJarOptions;
	targetTestUri = args.testUri;
	targetTestUriType = args.fileType;
	
	let mavenCmd = "mvn";
	let gradleCmd = "gradle";
	let mavenBuildFile = "pom.xml";
	let gradleGroovyBuildFile = "build.gradle";
	let gradleKotlinBuildFile = "build.gradle.kts";
	let standaloneBuildFile = "karate.jar";
	let mavenBuildFileSwitch = "-f";
	let gradleBuildFileSwitch = "-b";
	
	let runPhases = null;
	let runCommandPrefix = null;
	let runCommand = null;
	
	let projectDetail: IProjectDetail = getProjectDetail(targetTestUri, targetTestUriType);
	let projectRootPath = projectDetail.projectRoot;
	let runFilePath = projectDetail.runFile;
	
	if (runFilePath === "")
	{
		return;
	}
	
	if (!runFilePath.toLowerCase().endsWith(standaloneBuildFile))
	{
		if (Boolean(vscode.workspace.getConfiguration('karateRunner.buildSystem').get('useWrapper')))
		{
			if (os.platform() == 'win32')
			{
				mavenCmd = "mvnw";
				gradleCmd = "gradlew";
			}
			else
			{
				mavenCmd = "./mvnw";
				gradleCmd = "./gradlew";
			}
		}
		
		if (Boolean(vscode.workspace.getConfiguration('karateRunner.buildDirectory').get('cleanBeforeEachRun')))
		{
			runPhases = "clean test";
		}
		else
		{
			runPhases = "test";
		}
		
		let karateRunnerArgs = String(vscode.workspace.getConfiguration('karateRunner.karateRunner').get('commandLineArgs'));
		
		if (Boolean(vscode.workspace.getConfiguration('karateRunner.karateCli').get('overrideKarateRunner')))
		{
			let karateCliArgs = String(vscode.workspace.getConfiguration('karateRunner.karateCli').get('commandLineArgs'));
			
			if (karateCliArgs !== undefined && karateCliArgs !== "")
			{
				karateOptions = `${karateCliArgs} ${karateOptions}`
			}
			
			if (runFilePath.toLowerCase().endsWith(mavenBuildFile))
			{
				if (Boolean(vscode.workspace.getConfiguration('karateRunner.buildDirectory').get('cleanBeforeEachRun')))
				{
					runPhases = "clean test-compile";
				}
				else
				{
					runPhases = "";
				}
				
				// mvn clean test-compile -f pom.xml exec:java -Dexec.mainClass='com.intuit.karate.cli.Main' -Dexec.args='file.feature' -Dexec.classpathScope='test'
				runCommand = `${mavenCmd} ${runPhases} ${mavenBuildFileSwitch} "${runFilePath}"`;
				runCommand += ` exec:java -Dexec.mainClass="com.intuit.karate.cli.Main" -Dexec.args="${karateOptions}"`;
				runCommand += ` -Dexec.classpathScope="test" ${karateRunnerArgs}`;
			}
			
			if (runFilePath.toLowerCase().endsWith(gradleGroovyBuildFile)|| runFilePath.toLowerCase().endsWith(gradleKotlinBuildFile))
			{
				// gradle clean test -b build.gradle karateExecute -DmainClass='com.intuit.karate.cli.Main' --args='file.feature'
				runCommand = `${gradleCmd} ${runPhases} ${gradleBuildFileSwitch} "${runFilePath}"`;
				runCommand += ` karateExecute -DmainClass="com.intuit.karate.cli.Main" --args="${karateOptions}"`;
				runCommand += ` ${karateRunnerArgs}`;
			}
			
			if (runCommand === null)
			{
				return;
			}
		}
		else
		{
			if (Boolean(vscode.workspace.getConfiguration('karateRunner.karateRunner').get('promptToSpecify')))
			{
				karateRunner = await vscode.window.showInputBox
				(
					{
						prompt: "Karate Runner",
						value: String(vscode.workspace.getConfiguration('karateRunner.karateRunner').get('default'))
					}
				);

				if (karateRunner !== undefined && karateRunner !== "")
				{
					await vscode.workspace.getConfiguration().update('karateRunner.karateRunner.default', karateRunner)
				}
			}
			else
			{
				karateRunner = String(vscode.workspace.getConfiguration('karateRunner.karateRunner').get('default'));
			}
				
			if (karateRunner === undefined || karateRunner === "")
			{
				return;
			}
				
			if (runFilePath.toLowerCase().endsWith(mavenBuildFile))
			{
				runCommandPrefix = `${mavenCmd} ${runPhases} ${mavenBuildFileSwitch}`;
					
				if (runCommandPrefix === null)
				{
					return;
				}
					
				runCommand = `${runCommandPrefix} "${runFilePath}" -Dtest=${karateRunner} "-Dkarate.options=${karateOptions}" ${karateRunnerArgs}`;
			}
				
			if (runFilePath.toLowerCase().endsWith(gradleGroovyBuildFile)|| runFilePath.toLowerCase().endsWith(gradleKotlinBuildFile))
			{
				runCommandPrefix = `${gradleCmd} ${runPhases} ${gradleBuildFileSwitch}`;
					
				if (runCommandPrefix === null)
				{
					return;
				}
					
				runCommand = `${runCommandPrefix} "${runFilePath}" --tests ${karateRunner} -Dkarate.options="${karateOptions}" ${karateRunnerArgs}`;
			}
		}
	}
	else
	{
		let karateJarArgs = String(vscode.workspace.getConfiguration('karateRunner.karateJar').get('commandLineArgs'));
			
		if (karateJarArgs === undefined || karateJarArgs === "")
		{
			return;
		}
			
		runCommand = `${karateJarArgs} "${karateJarOptions}"`;
	}
		
	let relativePattern = new vscode.RelativePattern(projectRootPath, String(vscode.workspace.getConfiguration('karateRunner.reports').get('toTargetByGlob')));
	let watcher = vscode.workspace.createFileSystemWatcher(relativePattern);
	let reportUrisFound: vscode.Uri[] = [];
		
	watcher.onDidCreate((e) =>
	{
		if (reportUrisFound.toString().indexOf(e.toString()) === -1)
		{
			reportUrisFound.push(e);
		}
	});
		
	watcher.onDidChange((e) =>
	{
		if (reportUrisFound.toString().indexOf(e.toString()) === -1)
		{
			reportUrisFound.push(e);
		}
	});
		
	let seo: vscode.ShellExecutionOptions = { cwd: projectRootPath };
	if (os.platform() == 'win32')
	{
		seo.executable = "cmd.exe";
		seo.shellArgs = ["/d", "/c"];
	}
		
	let exec = new vscode.ShellExecution(runCommand, seo);
	let task = new vscode.Task
	(
		{ type: 'karate' },
		vscode.TaskScope.Workspace,
		'Karate Runner',
		'karate',
		exec,
		[]
	);
			
	/*
	vscode.tasks.onDidStartTask((e) => 
	{
		if (e.execution.task.name == 'Karate Runner')
		{
		}
	});
	*/
			
	vscode.tasks.onDidEndTask((e) =>
	{
		if (e.execution.task.name == 'Karate Runner')
		{
			isTaskExecuting = false;
			watcher.dispose();
					
			ProviderExecutions.addExecutionToHistory();
			ProviderExecutions.executionArgs = null;
					
			if (Boolean(vscode.workspace.getConfiguration('karateRunner.reports').get('openAfterEachRun')))
			{
				reportUrisFound.forEach((reportUri) =>
				{
					openExternalUri(reportUri);
				});
			}
		}
				
		reportUrisFound = [];
	});
			
	ProviderStatusBar.reset();
	ProviderExecutions.executionArgs = args;
			
	let showProgress = (task: vscode.TaskExecution) =>
	{
		vscode.window.withProgress(
		{
			location: { viewId: 'karate-tests' },
			cancellable: false
		},
		async (progress) =>
		{
			await new Promise<void>((resolve) =>
			{
				let interval = setInterval(() =>
				{
					if (!isTaskExecuting)
					{
						clearInterval(interval);
						resolve();
					}
				}, 1000);
			});
		});
	};
				
	let isTaskExecuting = true;
				
	vscode.tasks.executeTask(task).then(task => showProgress(task));
}

async function debugKarateTest(args = null)
{
	if (args !== null)
	{
		args = (args.command) ? args.command.arguments[0] : args[0];

		debugFeatureFile = args.testUri.fsPath;
		debugLineNumber = args.debugLine;
	}
	else
	{
		debugFeatureFile = await getActiveFeatureFile();
		debugLineNumber = 0;
	}
	
	vscode.commands.executeCommand('workbench.action.debug.start');
}

function displayReportsTree(displayType)
{
	vscode.workspace.getConfiguration().update('karateRunner.reports.activityBarDisplayType', displayType);
}

async function filterReportsTree(context: vscode.ExtensionContext)
{
	class InputButton implements vscode.QuickInputButton
	{
		constructor(public iconPath: { light: vscode.Uri; dark: vscode.Uri; }, public tooltip: string)
		{
		}
	}

	const resetButton = new InputButton(
	{
		dark: vscode.Uri.file(getDarkIcon('refresh.svg')),
		light: vscode.Uri.file(getLightIcon('refresh.svg')),
	}, 'Reset Filter');

	let filterByGlob = async () =>
	{
		let disposables: vscode.Disposable[] = [];
		try
		{
			await new Promise<string>((resolve) =>
			{
				let inputBox = vscode.window.createInputBox();
				inputBox.title = "Reports Filter"
				inputBox.step = 1;
				inputBox.totalSteps = 1;
				inputBox.value = String(vscode.workspace.getConfiguration('karateRunner.reports').get('toTargetByGlob'));
				inputBox.prompt = "Filter By Glob (e.g. text, **/*.html)";
				inputBox.buttons = [
					...([resetButton])
				];
				disposables.push(
					inputBox.onDidTriggerButton((item) =>
					{
						if (item === resetButton)
						{
							inputBox.value = context.extension.packageJSON.contributes.configuration.properties['karateRunner.reports.toTargetByGlob'].default;
						}
					}),
					inputBox.onDidAccept(async () =>
					{
						if (initialValue.trim() != inputBox.value.trim())
						{
							inputBox.busy = true;
							inputBox.enabled = false;
	
							await new Promise(resolve =>
							{
								ProviderReports.onRefreshEnd(() =>
								{
									resolve(null);
								});
	
								vscode.workspace.getConfiguration().update('karateRunner.reports.toTargetByGlob', inputBox.value);
							});
						}

						inputBox.enabled = true;
						inputBox.busy = false;
						inputBox.hide();
						resolve(null);			
					}),
					inputBox.onDidHide(() =>
					{
						resolve(null);
					})
				);

				let initialValue = inputBox.value;
				inputBox.show();
			});
		}
		finally
		{
			disposables.forEach(d => d.dispose());
		}
	}

	await filterByGlob();
}

function displayTestsTree(displayType)
{
	vscode.workspace.getConfiguration().update('karateRunner.tests.activityBarDisplayType', displayType);
}

async function filterTestsTree(context: vscode.ExtensionContext)
{
	class InputButton implements vscode.QuickInputButton
	{
		constructor(public iconPath: { light: vscode.Uri; dark: vscode.Uri; }, public tooltip: string)
		{
		}
	}

	const resetButton = new InputButton(
	{
		dark: vscode.Uri.file(getDarkIcon('refresh.svg')),
		light: vscode.Uri.file(getLightIcon('refresh.svg')),
	}, 'Reset Filter');

	let filterByGlob = async () =>
	{
		let disposables: vscode.Disposable[] = [];
		let accepted = false;
		try
		{
			await new Promise<string>((resolve) =>
			{
				let inputBox = vscode.window.createInputBox();
				inputBox.title = "Tests Filter"
				inputBox.step = 1;
				inputBox.totalSteps = 2;
				inputBox.value = String(vscode.workspace.getConfiguration('karateRunner.tests').get('toTargetByGlob'));
				inputBox.prompt = "Filter By Glob (e.g. text, **/*.feature)";
				inputBox.buttons = [
					...([resetButton])
				];
				disposables.push(
					inputBox.onDidTriggerButton((item) =>
					{
						if (item === resetButton)
						{
							inputBox.value = context.extension.packageJSON.contributes.configuration.properties['karateRunner.tests.toTargetByGlob'].default;
						}
					}),
					inputBox.onDidAccept(async () =>
					{
						if (initialValue.trim() != inputBox.value.trim())
						{
							inputBox.busy = true;
							inputBox.enabled = false;
	
							await new Promise(resolve =>
							{
								ProviderKarateTests.onRefreshEnd(() =>
								{
									resolve(null);
								});
	
								vscode.workspace.getConfiguration().update('karateRunner.tests.toTargetByGlob', inputBox.value);
							});
						}

						inputBox.enabled = true;
						inputBox.busy = false;
						accepted = true;
						resolve(null);			
					}),
					inputBox.onDidHide(() =>
					{
						resolve(null);
					})
				);

				let initialValue = inputBox.value;
				inputBox.show();
			});
		}
		finally
		{
			disposables.forEach(d => d.dispose());

			if (accepted)
			{
				filterByTag();
			}
		}
	}

	let filterByTag = async () =>
	{
		let disposables: vscode.Disposable[] = [];
		try
		{			
			await new Promise<string>((resolve) =>
			{
				let inputBox = vscode.window.createInputBox();
				inputBox.title = "Tests Filter"
				inputBox.step = 2;
				inputBox.totalSteps = 2;
				inputBox.value = String(vscode.workspace.getConfiguration('karateRunner.tests').get('toTargetByTag'));
				inputBox.prompt = "Filter By Tags (e.g. @abc, @def=.+, @.+=.+)";
				inputBox.buttons = [
					...([vscode.QuickInputButtons.Back]),
					...([resetButton])
				];
				disposables.push(
					inputBox.onDidTriggerButton((item) =>
					{
						if (item === vscode.QuickInputButtons.Back)
						{
							filterByGlob();
							resolve(null);
						}
	
						if (item === resetButton)
						{
							inputBox.value = context.extension.packageJSON.contributes.configuration.properties['karateRunner.tests.toTargetByTag'].default;
						}
					}),
					inputBox.onDidAccept(async () =>
					{
						if (initialValue.trim() != inputBox.value.trim())
						{
							inputBox.busy = true;
							inputBox.enabled = false;
	
							await new Promise(resolve =>
							{
								ProviderKarateTests.onRefreshEnd(() =>
								{
									resolve(null);
								});
	
								vscode.workspace.getConfiguration().update('karateRunner.tests.toTargetByTag', inputBox.value);
							});
						}

						inputBox.enabled = true;
						inputBox.busy = false;
						inputBox.hide();
						resolve(null);
					}),
					inputBox.onDidHide(() =>
					{
						resolve(null);
					})
				);
		
				let initialValue = inputBox.value;
				inputBox.show();
			});
		}
		finally
		{
			disposables.forEach(d => d.dispose());
		}
	}

	await filterByGlob();
}

function openExternalUri(uri)
{
	openExternalUrl(`${uri.scheme}://${uri.authority}${uri.path}`);
}

function openExternalUrl(url)
{
	open(url);
}

function openFileInEditor(args)
{
	args = (args.command) ? args.command.arguments[0] : args;

	if (args.testRange && args.testRange !== null)
	{
		vscode.window.showTextDocument(args.testUri, { selection: args.testRange });
	}
	else
	{
		vscode.window.showTextDocument(args.testUri);
	}
}

function openKarateSettings()
{
	vscode.commands.executeCommand('workbench.action.openSettings', 'Karate Runner');
	vscode.commands.executeCommand('workbench.action.openWorkspaceSettings');
}

function toggleResultsInGutter()
{
	let value = Boolean(vscode.workspace.getConfiguration('karateRunner.editor').get('toggleResultsInGutter'))
	vscode.workspace.getConfiguration().update('karateRunner.editor.toggleResultsInGutter', !value);
}

export
{
	smartPaste,
	getDebugFile,
	getDebugBuildFile,
	debugKarateTest,
	runKarateTest,
	runAllKarateTests,
	runTagKarateTests,
	displayReportsTree,
	filterReportsTree,
	displayTestsTree,
	filterTestsTree,
	openExternalUri,
	openExternalUrl,
	openFileInEditor,
	openKarateSettings,
	toggleResultsInGutter
};