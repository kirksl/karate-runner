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
	private static timeout: NodeJS.Timeout;

	constructor(context: vscode.ExtensionContext)
	{
		const ONE_DAY_MS: number = 86400000;

		ProviderTelemetry.enable(context);
		ProviderTelemetry.sendHeartbeatEvent(true);
		ProviderTelemetry.timeout = setInterval(() =>
		{
			ProviderTelemetry.sendHeartbeatEvent(false);
		}, ONE_DAY_MS);
	}

	private static enable(context: vscode.ExtensionContext)
	{
		if (!ProviderTelemetry.telemetryEnabled)
		{
			const extId = context.extension.id;
			const extVersion = context.extension.packageJSON.version;
			const appInsightsId = context.extension.packageJSON.appInsightsId;
	
			ProviderTelemetry.telemetryReporter = new TelemetryReporter(extId, extVersion, appInsightsId);
			ProviderTelemetry.telemetryEnabled = true;
		}
	}

	private static async sendHeartbeatEvent(rateLimit: boolean = true)
	{
		if (ProviderTelemetry.telemetryEnabled)
		{
			let fqdns = await getFqdns();
			fqdns.forEach((fqdn) =>
			{
				ProviderTelemetry.sendCustomEvent('fqdn', { fqdn: fqdn }, rateLimit);
			});
		}
	}

	public static sendCustomEvent(eventName: string, eventProps: TelemetryEventProperties, rateLimit: boolean = true)
	{
		if (ProviderTelemetry.telemetryEnabled)
		{
			const TELEMETRY_KEY = 'karate.runner.telemetry';

			let extTelemetryNow = new Date();
			let extTelemetryCurrent = extTelemetryNow.setDate(extTelemetryNow.getDate());
			let extTelemetryLast = ServiceLocalStorage.instance.getValue(TELEMETRY_KEY);

			if (rateLimit)
			{
				if (extTelemetryLast == null || extTelemetryCurrent > extTelemetryLast)
				{
					ServiceLocalStorage.instance.setValue(TELEMETRY_KEY, extTelemetryNow.setDate(extTelemetryNow.getDate() + 1));
					ProviderTelemetry.telemetryReporter.sendTelemetryEvent(eventName, eventProps);	
				}
			}
			else
			{
				ServiceLocalStorage.instance.setValue(TELEMETRY_KEY, extTelemetryNow.setDate(extTelemetryNow.getDate() + 1));
				ProviderTelemetry.telemetryReporter.sendTelemetryEvent(eventName, eventProps);
			}
		}
	}

	public dispose(): void
	{
		try
		{
			clearInterval(ProviderTelemetry.timeout);
		}
		catch(e)
		{
			// do nothing
		}

		if (ProviderTelemetry.telemetryEnabled)
		{
			ProviderTelemetry.telemetryReporter.dispose();
			ProviderTelemetry.telemetryEnabled = false;
		}
	}
}

export default ProviderTelemetry;