import * as vscode from 'vscode';

const DEFAULT_CONFIG =
{
	"type": "karate",
	"name": "Karate (debug): Standalone",
	"request": "launch",
	"feature": "${command:karateRunner.getDebugFile}",
	"karateOptions": "",
	"karateCli": "${config:karateRunner.karateJar.commandLineArgs} -d"
};

class ProviderDebugConfiguration implements vscode.DebugConfigurationProvider
{
	provideDebugConfigurations(folder: vscode.WorkspaceFolder | undefined, token?: vscode.CancellationToken): vscode.ProviderResult<vscode.DebugConfiguration[]>
	{
		// auto-fill new launch.json with default config
		return Promise.resolve([DEFAULT_CONFIG]);
	}

	async resolveDebugConfiguration(folder: vscode.WorkspaceFolder | undefined, config: vscode.DebugConfiguration, token?: vscode.CancellationToken): Promise<vscode.DebugConfiguration>
	{
		if (!config.type && !config.request && !config.name)
		{
			// open debug configurations/launch.json if non-existent 
			return null;
		}

		// future space to further shape and process karate debug configurations

		return config;
	}
}

export default ProviderDebugConfiguration;