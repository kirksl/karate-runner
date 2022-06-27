import * as vscode from 'vscode';

interface IDisposable
{
	dispose(): void;
}

export class ProviderOutputChannel implements IDisposable
{
	private static outputChannel: vscode.OutputChannel;

	constructor()
	{
		ProviderOutputChannel.outputChannel = vscode.window.createOutputChannel('Karate Runner');
	}

	public static writeLine(message: string): void
	{
		ProviderOutputChannel.outputChannel.appendLine(message);
	}

	public static show(): void
	{
		ProviderOutputChannel.outputChannel.show();
	}

	public static clear(): void
	{
		ProviderOutputChannel.outputChannel.clear();
	}

	public dispose(): void
	{
		ProviderOutputChannel.outputChannel.dispose();
	}
}