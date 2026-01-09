import type { ConfigFunction, PluginObj } from "@babel/core";
// Let's skip this for now
// eslint-disable-next-line import-x/no-extraneous-dependencies
import { statement } from "@babel/template";

// We use `unstable_transformImportMeta` to have `import.meta` in Expo environment
// But it doesn't have `import.meta.env` so we provide it manually
const injectImportMetaEnv = (): PluginObj => ({
	name: "inject-import-meta-env",
	visitor: {
		MetaProperty: (path) => {
			const { node } = path;
			if (node.meta.name === "import" && node.property.name === "meta") {
				const program = path.findParent((subNode) => subNode.isProgram());
				const body =
					program?.node.type === "Program" ? program.node.body : null;
				if (!body) {
					return;
				}
				body.unshift(
					statement(`
					  Object.defineProperty(globalThis.__ExpoImportMetaRegistry, "env", { value: process.env, enumerable: true });
					`)(),
				);
			}
		},
	},
});

const config: ConfigFunction = (api) => {
	api.cache.forever();
	return {
		presets: [
			[
				"babel-preset-expo",
				{
					// Enable the transform for import.meta
					unstable_transformImportMeta: true,
				},
			],
		],
		plugins: ["react-native-reanimated/plugin", injectImportMetaEnv],
	};
};

export default config;
