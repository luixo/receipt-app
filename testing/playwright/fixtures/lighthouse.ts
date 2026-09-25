// oxlint-disable-next-line import-js/no-extraneous-dependencies
import browserProtocol from "devtools-protocol/json/browser_protocol.json" with { type: "json" };
// oxlint-disable-next-line import-js/no-extraneous-dependencies
import jsProtocol from "devtools-protocol/json/js_protocol.json" with { type: "json" };
import lighthouse from "lighthouse";
import type { CDPSession } from "playwright";

import type { NavigationOptions, RouteTo } from "~app/utils/navigation";
import { setProxyHeaders } from "~tests/frontend/fixtures/page";
import type { ExtractFixture } from "~tests/frontend/types";
import { buildUrl } from "~utils/server/url";

import { apiFixtures as baseTest } from "./api";

type CategoryName =
	| "accessibility"
	| "best-practices"
	| "seo"
	| "agentic-browsing";

type Fixtures = {
	runAudit: <K extends RouteTo>(
		target: NavigationOptions<K>,
	) => Promise<Record<CategoryName, number>>;
};

const cdpEventNames = [
	...browserProtocol.domains,
	...jsProtocol.domains,
].flatMap(
	(domain) =>
		domain.events?.map((event) => `${domain.domain}.${event.name}`) ?? [],
) as Parameters<CDPSession["on"]>[0][];

const adaptCdpSession = (session: CDPSession) => {
	const wildcardListeners = new Map<
		(...args: unknown[]) => void,
		{
			name: Parameters<CDPSession["on"]>[0];
			listener: (...args: unknown[]) => void;
		}[]
	>();
	const originalOn = session.on.bind(session);
	const originalOff = session.off.bind(session);
	const originalSend = session.send.bind(session);
	const adaptedSession = Object.assign(session, {
		id: () => "playwright-page",
		send<T extends Parameters<CDPSession["send"]>[0]>(
			method: T,
			params?: Parameters<CDPSession["send"]>[1],
		) {
			return originalSend(method, params as never);
		},
		on<T extends Parameters<CDPSession["on"]>[0]>(
			event: T | "*",
			listener: (...args: unknown[]) => void,
		) {
			if (event !== "*") {
				originalOn(event, listener);
				return adaptedSession;
			}
			wildcardListeners.set(
				listener,
				cdpEventNames.map((name) => {
					const eventListener = (params: unknown) => listener(name, params);
					originalOn(name, eventListener);
					return { name, listener: eventListener };
				}),
			);
			return adaptedSession;
		},
		off<T extends Parameters<(typeof session)["off"]>[0]>(
			event: T | "*",
			listener: (...args: unknown[]) => void,
		) {
			if (event !== "*") {
				originalOff(event, listener);
				return adaptedSession;
			}
			for (const item of wildcardListeners.get(listener) ?? []) {
				originalOff(item.name, item.listener);
			}
			wildcardListeners.delete(listener);
			return adaptedSession;
		},
	});
	return adaptedSession;
};

const test = baseTest.extend<Fixtures>({
	runAudit: async ({ page, api, baseURL }, use, testInfo) => {
		await use(async (target) => {
			await setProxyHeaders(page, api, baseURL);
			const result = await lighthouse(
				new URL(buildUrl(target), baseURL).toString(),
				{
					disableStorageReset: true,
					output: "html",
					logLevel: "error",
				},
				undefined,
				// Puppeteer page is not the same as Playwright page but similar enough to make it work
				{
					url: () => page.url(),
					target: () => ({
						createCDPSession: async () =>
							adaptCdpSession(await page.context().newCDPSession(page)),
					}),
				} as never,
			);
			if (!result) {
				throw new Error("Lighthouse returned no result");
			}
			await testInfo.attach("lighthouse-report", {
				body: result.report as string,
				contentType: "text/html",
			});
			// We don't return performance as it varies significantly across machines
			return {
				accessibility: result.lhr.categories.accessibility?.score ?? 0,
				"best-practices": result.lhr.categories["best-practices"]?.score ?? 0,
				seo: result.lhr.categories.seo?.score ?? 0,
				"agentic-browsing":
					result.lhr.categories["agentic-browsing"]?.score ?? 0,
			};
		});
	},
});

export const lighthouseFixtures = test;
export type LighthouseFixture = ExtractFixture<typeof test>;
