import { getDebugPort } from "./commands";
import { isPortFree, getProjectDetail, IProjectDetail } from "./helper";
import * as vscode from 'vscode';

class ProviderDebugAdapter implements vscode.DebugAdapterDescriptorFactory
{
	async createDebugAdapterDescriptor(session: vscode.DebugSession, executable: vscode.DebugAdapterExecutable | undefined): Promise<vscode.ProviderResult<vscode.DebugAdapterDescriptor>>
	{
		let projectRootPath = "";
		let settingsTimeout = Number(vscode.workspace.getConfiguration('karateRunner.debugger').get('serverPortTimeout'));
		settingsTimeout = (settingsTimeout <= 0) ? 1 : settingsTimeout;

		let featureFile = String(session.configuration.feature);
		featureFile = featureFile.replace(/^['"]|['"]$/g, '');
		if (featureFile.endsWith(".feature"))
		{
			let projectDetail: IProjectDetail = getProjectDetail(vscode.Uri.file(featureFile), vscode.FileType.File);
			projectRootPath = projectDetail.projectRoot;
		}
		else
		{
			projectRootPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
		}

		let debugCanceledByUser = false;
		let debugPort = Number(await getDebugPort(true));
		let waitDebugServer = (task: vscode.TaskExecution) =>
		{
			return new Promise<number>((resolve, reject) =>
			{
				vscode.window.withProgress(
				{
					location: vscode.ProgressLocation.Notification,
					title: "Waiting for debug server to start...",
					cancellable: true
				},
				async (progress, token) =>
				{
					token.onCancellationRequested(() =>
					{
						debugCanceledByUser = true;
					});

					let incrementer = 100 / settingsTimeout;

					progress.report({ increment: incrementer });

					await new Promise((resolve, reject) =>
					{
						let interval = setInterval(async () =>
						{
							if (debugCanceledByUser)
							{
								clearInterval(interval);
								clearTimeout(timeout);
								task.terminate();
								reject(new Error("Aborting debugger.  Canceled by user."));
							}

							let portFree = await isPortFree(debugPort);
							if (!portFree)
							{
								clearInterval(interval);
								clearTimeout(timeout);
								resolve(debugPort);
							}
							else
							{
								progress.report({ increment: incrementer });
							}
						}, 1000);

						let timeout = setTimeout(() =>
						{
							clearInterval(interval);
							task.terminate();
							reject(new Error("Aborting debugger.  Timed out waiting for debug server to start."));
						}, (settingsTimeout * 1000));
					}).then(
						(port) => { resolve(Number(port)); },
						(error) => { reject(error); }
					);
				});
			});
		};
  
		let seo: vscode.ShellExecutionOptions = { cwd: projectRootPath };
		let exec = new vscode.ShellExecution(session.configuration.karateCli, seo);
		let task = new vscode.Task
		(
			{ type: 'karate' },
			vscode.TaskScope.Workspace,
			'Karate Runner',
			'karate',
			exec,
			[]
		);
  
		return vscode.tasks.executeTask(task)
			.then((task) => waitDebugServer(task))
			.then((port) => new vscode.DebugAdapterServer(port));
	}
}

export default ProviderDebugAdapter;