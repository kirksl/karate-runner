import TelemetryReporter, { TelemetryEventProperties } from '@vscode/extension-telemetry';
import { ServiceLocalStorage } from './serviceLocalStorage';
import { getFqdns } from "./helper";
import * as vscode from 'vscode';

interface IDisposable
{
	dispose(): void;
}

class ProviderTelemetry implements IDisposable
{
	private static telemetryReporter: TelemetryReporter;
	private static telemetryEnabled: boolean = false;

	constructor(context: vscode.ExtensionContext)
	{
		ProviderTelemetry.init(context);
	}

	private static async init(context)
	{
		const TELEMETRY_KEY = 'karate.runner.telemetry';

		const extId = context.extension.id;
		const extVersion = context.extension.packageJSON.version;
		const appInsightsId = context.extension.packageJSON.appInsightsId;

		let extTelemetryNow = new Date();
		let extTelemetryCurrent = extTelemetryNow.setDate(extTelemetryNow.getDate());
		let extTelemetryLast = ServiceLocalStorage.instance.getValue(TELEMETRY_KEY);

		if (extTelemetryLast == null || extTelemetryCurrent > extTelemetryLast)
		{
			ProviderTelemetry.telemetryEnabled = true;
			ServiceLocalStorage.instance.setValue(TELEMETRY_KEY, extTelemetryNow.setDate(extTelemetryNow.getDate() + 1));
			ProviderTelemetry.telemetryReporter = new TelemetryReporter(extId, extVersion, appInsightsId);

			let fqdns = await getFqdns();
			fqdns.forEach(fqdn =>
			{
				ProviderTelemetry.sendTelemetryEvent('fqdn', { fqdn: fqdn });
			});

			context.subscriptions.push(ProviderTelemetry.telemetryReporter);
		}
	}

	public static sendTelemetryEvent(eventName: string, eventProps: TelemetryEventProperties)
	{
		if (ProviderTelemetry.telemetryEnabled)
		{
			ProviderTelemetry.telemetryReporter.sendTelemetryEvent(eventName, eventProps);
		}
	}

	public dispose(): void
	{
		if (ProviderTelemetry.telemetryEnabled)
		{
			ProviderTelemetry.telemetryReporter.dispose();
		}
	}
}

export default ProviderTelemetry;