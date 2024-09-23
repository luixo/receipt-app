import { Faker, en } from "@faker-js/faker";
import { test } from "@playwright/test";
import { freeze as freezeTime, reset as resetTime } from "timekeeper";

import { setSeed } from "~tests/utils/faker";

type MockFixtures = {
	faker: Faker;
};
type MockWorkerFixtures = {
	timekeeper: void;
	withResolvers: void;
};

export const mockFixtures = test.extend<MockFixtures, MockWorkerFixtures>({
	// eslint-disable-next-line no-empty-pattern
	faker: async ({}, use, testInfo) => {
		const localFaker = new Faker({ locale: en });
		// Remove first element as it is a file name
		setSeed(localFaker, testInfo.titlePath.slice(1).join(" / "));
		await use(localFaker);
	},
	timekeeper: [
		// eslint-disable-next-line no-empty-pattern
		async ({}, use) => {
			freezeTime(new Date("2020-01-01"));
			await use();
			resetTime();
		},
		{ auto: true, scope: "worker" },
	],
	withResolvers: [
		// eslint-disable-next-line no-empty-pattern
		async ({}, use) => {
			const withResolvers: (typeof Promise)["withResolvers"] = <T>() => {
				let resolve: (value: T | PromiseLike<T>) => void;
				let reject: (error: unknown) => void;
				const promise = new Promise<T>((localResolve, localReject) => {
					resolve = localResolve;
					reject = localReject;
				});
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				return { promise, resolve: resolve!, reject: reject! };
			};
			if (typeof Promise.withResolvers === "undefined") {
				Promise.withResolvers = withResolvers;
			} else if (Promise.withResolvers !== withResolvers) {
				throw new Error("Remove withResolvers polyfill!");
			}
			await use();
		},
		{ auto: true, scope: "worker" },
	],
});
