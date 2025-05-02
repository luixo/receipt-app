// We need to have stability over dynamic values in test environments
// Used in Vitest tests
export const isTestEnv = () => process.env.NODE_ENV === "test";
