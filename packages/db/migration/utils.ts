// We need to have stability over dynamic values in test environments
// Used in Vitest tests
export const isTestEnv = () =>
	// Migration doesn't have import.meta
	(import.meta.env as ImportMetaEnv | undefined)
		? import.meta.env.MODE === "test"
		: false;
