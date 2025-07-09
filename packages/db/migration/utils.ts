// We need to have stability over dynamic values in test environments
// Used in Vitest tests
export const isTestEnv = () =>
	// Migration doesn't have import.meta
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
	import.meta.env ? import.meta.env.MODE === "test" : false;
