// We need to have stability over dynamic values in test environments
// Used in Vitest tests
export const isTestEnv = () => import.meta.env.MODE === "test";
