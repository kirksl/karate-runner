import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class LoggingEventVO {
    '@timestamp': string;
    '@version': string;
    thread_name: string;
    logger_name: string;
    level: string;
    message: string;
}

export interface ITreeEntry {
    asTreeItem(): vscode.TreeItem;
}

export class ThreadTreeEntry implements ITreeEntry {
    networkLogs: NetworkRequestResponseLog[] = [];
    constructor(public threadName: string) {}

    asTreeItem() {
        return new vscode.TreeItem(`Thread: ${this.threadName}`, vscode.TreeItemCollapsibleState.Expanded);
    }
}

export class NetworkRequestResponseLog implements ITreeEntry {
    parent: ThreadTreeEntry;
    method: string;
    url: string;
    status = 'pending';
    request: NetworkLog;
    response: NetworkLog;

    constructor(partial: Partial<NetworkRequestResponseLog>) {
        Object.assign(this, partial);
    }

    asTreeItem() {
        return new vscode.TreeItem(`${this.method} ${this.url} (${this.status})`, vscode.TreeItemCollapsibleState.Collapsed);
    }
}

export class NetworkLog implements ITreeEntry {
    parent: NetworkRequestResponseLog;
    headers: Headers = new Headers(this);
    payload: Payload | null;

    constructor(private label: 'Request' | 'Response') {}

    asTreeItem() {
        return new vscode.TreeItem(`${this.label}:`, vscode.TreeItemCollapsibleState.Collapsed);
    }
}

export class Headers implements ITreeEntry {
    headers: Header[] = [];
    constructor(public parent: NetworkLog) {}
    asTreeItem() {
        return new vscode.TreeItem(`Headers:`, vscode.TreeItemCollapsibleState.Collapsed);
    }
}

export class Header implements ITreeEntry {
    constructor(public parent: Headers, public key: string, public value: string) {}
    asTreeItem() {
        return new vscode.TreeItem(`${this.key}: ${this.value}`);
    }
}

export class Payload implements ITreeEntry {
    properties: PayloadProperty[];
    constructor(public parent: NetworkLog, public payload: string) {
        try {
            const json = JSON.parse(payload);
            this.properties = Object.entries(json).map(([key, value]) => new PayloadProperty(this, key, value));
        } catch (e) {
            console.log(e);
        }
    }
    asTreeItem() {
        const treeItem = new vscode.TreeItem(`Payload:`, vscode.TreeItemCollapsibleState.Collapsed);
        treeItem.tooltip = this.payload;
        treeItem.description = this.payload;
        return treeItem;
    }
}

export class PayloadProperty implements ITreeEntry {
    properties: PayloadProperty[];
    constructor(public parent: Payload | PayloadProperty, public key: string, public value: any) {
        try {
            if (typeof value === 'object') {
                this.properties = Object.entries(value).map(([nestedKey, nestedValue]) => new PayloadProperty(this, nestedKey, nestedValue));
            }
        } catch (e) {
            console.log(e);
        }
    }
    asTreeItem() {
        if (this.properties && this.properties.length) {
            return new vscode.TreeItem(`${this.key}:`, vscode.TreeItemCollapsibleState.Collapsed);
        } else {
            return new vscode.TreeItem(`${this.key}: ${this.value}`, vscode.TreeItemCollapsibleState.None);
        }
    }
}

export default class KarateNetworkLogsProvider implements vscode.TreeDataProvider<ITreeEntry> {
    private eventLogsTree: { [key: string]: ThreadTreeEntry } = {};

    private _onDidChangeTreeData: vscode.EventEmitter<any> = new vscode.EventEmitter<any>();
    readonly onDidChangeTreeData: vscode.Event<any> = this._onDidChangeTreeData.event;

    public clear(): any {
        this.eventLogsTree = {};
        this._onDidChangeTreeData.fire();
    }

    public processLoggingEvent(data: Buffer) {
        data.toString()
            .split('\n')
            .forEach(log => {
                const json = JSON.parse(log);
                this.processLoggingEventVO(json);
            });
    }

    processLoggingEventVO(event: LoggingEventVO) {
        if ('com.intuit.karate' === event.logger_name) {
            if (event.message.startsWith('request:')) {
                const tokens = event.message.split('\n');
                const [one, gt, method, url] = tokens[1].split(' ');
                const request = new NetworkLog('Request');
                for (let i = 2; i < tokens.length; i++) {
                    const token = tokens[i];
                    if (token.startsWith('1 > ') && token.includes(': ')) {
                        const [key, value] = token.replace('1 > ', '').split(': ');
                        request.headers.headers.push(new Header(request.headers, key, value));
                    } else if (token != '') {
                        request.payload = new Payload(request, token);
                    }
                }
                this.addRequestEventLog(method, url, request);
            }
            if (event.message.startsWith('response')) {
                const tokens = event.message.split('\n');
                const [one, gt, statusCode] = tokens[1].split(' ');
                const response = new NetworkLog('Response');
                for (let i = 2; i < tokens.length; i++) {
                    const token = tokens[i];
                    if (token.startsWith('1 < ') && token.includes(': ')) {
                        const [key, value] = token.replace('1 < ', '').split(': ');
                        response.headers.headers.push(new Header(response.headers, key, value));
                    } else if (token != '') {
                        response.payload = new Payload(response, token);
                    }
                }
                this.addResponseEventLog(statusCode, response);
            }
        }
    }

    addRequestEventLog(method, url, request: NetworkLog, threadName = 'main'): any {
        const threadTree: ThreadTreeEntry = this.eventLogsTree[threadName] || new ThreadTreeEntry(threadName);
        threadTree.networkLogs.push(new NetworkRequestResponseLog({ request, method, url }));
        this.eventLogsTree[threadName] = threadTree;
        // refresh tree
        this._onDidChangeTreeData.fire();
    }

    addResponseEventLog(status: string, response: NetworkLog, threadName = 'main'): any {
        const threadTree: ThreadTreeEntry = this.eventLogsTree[threadName];
        const requestResponse = threadTree.networkLogs[threadTree.networkLogs.length - 1];
        requestResponse.status = status;
        requestResponse.response = response;
        this.eventLogsTree[threadName] = threadTree;
        // refresh tree
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: ITreeEntry): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element.asTreeItem();
    }
    getChildren(element?: ITreeEntry): vscode.ProviderResult<ITreeEntry[]> {
        if (!element) {
            return Object.values(this.eventLogsTree);
        } else if (element instanceof ThreadTreeEntry) {
            return element.networkLogs;
        } else if (element instanceof NetworkRequestResponseLog) {
            return [element.request, element.response];
        } else if (element instanceof NetworkLog) {
            return [element.headers, element.payload];
        } else if (element instanceof Headers) {
            return element.headers;
        } else if (element instanceof Payload || element instanceof PayloadProperty) {
            return element.properties;
        }
        return null;
    }
}
