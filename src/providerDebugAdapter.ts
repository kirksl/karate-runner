import { getProjectDetail, IProjectDetail } from "./helper";
import fs = require("fs");
import * as vscode from 'vscode';


class ProviderDebugAdapter implements vscode.DebugAdapterDescriptorFactory
{
    createDebugAdapterDescriptor(session: vscode.DebugSession, executable: vscode.DebugAdapterExecutable | undefined): vscode.ProviderResult<vscode.DebugAdapterDescriptor>
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
  
        let relativePattern = new vscode.RelativePattern(projectRootPath, '**/karate-debug-port.txt');
        let watcher = vscode.workspace.createFileSystemWatcher(relativePattern);
        let debugCanceledByUser = false;
        let debugPortFile = null;
  
        let getDebugPort = (task: vscode.TaskExecution) =>
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
                let interval = setInterval(() =>
                {
                  if (debugCanceledByUser)
                  {
                    clearInterval(interval);
                    clearTimeout(timeout);
                    task.terminate();
                    reject(new Error("Aborting debugger.  Canceled by user."));
                  }

                  if (debugPortFile !== null)
                  {
                    clearInterval(interval);
                    clearTimeout(timeout);
                    let port = fs.readFileSync(debugPortFile.fsPath, { encoding: 'utf8' });
                    console.log(`debug server ready on port: ${port}`);
    
                    resolve(parseInt(port));
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
  
        watcher.onDidCreate((e) =>
        {
          watcher.dispose();
          debugPortFile = e;
        });
  
        watcher.onDidChange((e) =>
        {
          watcher.dispose();
          debugPortFile = e;
        });
  
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
        .then(task => getDebugPort(task))
        .then(port => new vscode.DebugAdapterServer(port));
    }
}

export default ProviderDebugAdapter;