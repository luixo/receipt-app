import { expect, test } from "~tests/frontend/fixtures";

test.beforeEach(async ({ api, page, awaitCacheKey }) => {
	api.mockUtils.noAuthPage();
	await page.navigate({ to: "/login" });
	await awaitCacheKey("user.get", { error: 1 });
	await api.getActions();
	api.clearActions();
});

test("Actions wait for requests before interception, including new arrivals", async ({
	api,
	page,
}) => {
	api.mockFirst("debts.getAll", { items: [] });
	const firstStarted = Promise.withResolvers<void>();
	const secondStarted = Promise.withResolvers<void>();
	const firstRelease = Promise.withResolvers<void>();
	const secondRelease = Promise.withResolvers<void>();
	await page.route("**/api/trpc/debts.getAll?request=*", async (route) => {
		const first =
			new URL(route.request().url()).searchParams.get("request") === "1";
		(first ? firstStarted : secondStarted).resolve();
		await (first ? firstRelease : secondRelease).promise;
		await route.fallback();
	});

	const firstResponse = page.evaluate(() =>
		fetch("/api/trpc/debts.getAll?request=1").then((response) =>
			response.json(),
		),
	);
	await firstStarted.promise;
	let resolved = false;
	const actions = api.getActions().then((value) => {
		resolved = true;
		return value;
	});
	await Promise.resolve();
	expect(resolved).toBe(false);

	const secondResponse = page.evaluate(() =>
		fetch("/api/trpc/debts.getAll?request=2").then((response) =>
			response.json(),
		),
	);
	await secondStarted.promise;
	firstRelease.resolve();
	await firstResponse;
	expect(resolved).toBe(false);
	secondRelease.resolve();
	expect(await actions).toStrictEqual([
		["client", "debts.getAll", undefined],
		["client", "debts.getAll", undefined],
	]);
	await secondResponse;
});

test("Actions include the whole POST batch without waiting for paused handlers", async ({
	api,
	page,
}) => {
	const pause = api.createPause();
	const handlersStarted = Promise.withResolvers<void>();
	api.mockFirst("debts.getAll", async () => {
		await pause.promise;
		return { items: [] };
	});
	api.mockFirst("debtIntentions.getAll", async () => {
		handlersStarted.resolve();
		await pause.promise;
		return { items: [] };
	});
	const response = page.evaluate(() =>
		fetch("/api/trpc/debts.getAll,debtIntentions.getAll?batch=1", {
			method: "POST",
			body: "{}",
		}).then((result) => result.json()),
	);
	await handlersStarted.promise;
	expect(await api.getActions()).toStrictEqual([
		["client", "debts.getAll", undefined],
		["client", "debtIntentions.getAll", undefined],
	]);
	pause.resolve();
	await response;
});

for (const outcome of ["abort", "fulfill"] as const) {
	const ignoredMessages = outcome === "abort" ? ["net::ERR_FAILED"] : [];

	test(`Actions unlock when a request is handled by another route: ${outcome}`, async ({
		api,
		page,
		consoleManager,
	}) => {
		for (const message of ignoredMessages) {
			consoleManager.ignore(message);
		}
		const started = Promise.withResolvers<void>();
		const release = Promise.withResolvers<void>();
		await page.route("**/api/trpc/debts.getAll", async (route) => {
			started.resolve();
			await release.promise;
			await (outcome === "abort" ? route.abort() : route.fulfill({ json: {} }));
		});
		const response = page.evaluate(() =>
			fetch("/api/trpc/debts.getAll")
				.then((result) => result.json())
				.catch(() => undefined),
		);
		await started.promise;
		let resolved = false;
		const actions = api.getActions().then((value) => {
			resolved = true;
			return value;
		});
		await Promise.resolve();
		expect(resolved).toBe(false);
		release.resolve();
		expect(await actions).toStrictEqual([]);
		await response;
	});
}
