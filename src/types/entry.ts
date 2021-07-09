import * as vscode from 'vscode';

enum ENTRY_TYPE
{
	ROOT,
	TAG,
	FOLDER,
	FILE,
	TEST
}

enum ENTRY_STATE
{
	NONE = "none",
	PASS = "pass",
	FAIL = "fail"
}

interface IEntry
{
	uri: any;
	type: ENTRY_TYPE;
	tag?: string;
	tooltip?: vscode.MarkdownString;
	command?: vscode.Command;
	state?: ENTRY_STATE;
	fails?: number;
	ignored?: boolean;
}

export { ENTRY_TYPE, ENTRY_STATE, IEntry };