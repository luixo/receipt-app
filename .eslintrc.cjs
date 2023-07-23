const path = require("path");

const getExtraneousDependenciesConfig = (
	packageJsonDir = "",
	devDependencies = false,
) => ({
	devDependencies:
		devDependencies &&
		devDependencies.map((filename) => path.join(packageJsonDir, filename)),
	optionalDependencies: false,
	packageDir: [".", packageJsonDir].filter(Boolean),
});

module.exports = {
	extends: [
		"airbnb",
		"airbnb-typescript",
		"airbnb/hooks",
		"plugin:@next/next/recommended",
		"prettier",
	],
	parserOptions: {
		project: true,
	},
	rules: {
		"react/function-component-definition": [
			"error",
			{
				namedComponents: "arrow-function",
				unnamedComponents: "arrow-function",
			},
		],
		"import/no-extraneous-dependencies": [
			"error",
			getExtraneousDependenciesConfig(undefined, ["dev.ts"]),
		],
		"no-void": ["error", { allowAsStatement: true }],
		"react/require-default-props": "off",
		"@next/next/no-html-link-for-pages": ["warn", "./apps/next/src/pages"],
		// Typescript version of default-case below
		"default-case": "off",
		"@typescript-eslint/switch-exhaustiveness-check": "error",
		"eact/jsx-props-no-spreading": "off",
		"jsx-a11y/aria-role": "off",
		"no-return-assign": ["error", "except-parens"],
		"react/jsx-no-useless-fragment": ["error", { allowExpressions: true }],
		"no-nested-ternary": "off",
		"import/prefer-default-export": "off",
		"react/prop-types": "off",
		"react/jsx-props-no-spreading": "off",
		"consistent-return": "off",
		"import/order": [
			"error",
			{
				groups: [["builtin", "external"], "internal", "parent", "sibling"],
				warnOnUnassignedImports: false,
				"newlines-between": "always",
				alphabetize: {
					order: "asc",
				},
				pathGroups: [
					{
						pattern: "{react,react-native}",
						group: "builtin",
						position: "before",
					},
					{
						pattern: "{next-,}app/**",
						group: "internal",
						position: "before",
					},
				],
				pathGroupsExcludedImportTypes: [
					"react",
					"react-native",
					"app",
					"next-app",
				],
			},
		],
		"no-console": "error",
		"no-alert": "error",
		"react-hooks/exhaustive-deps": [
			"error",
			{
				additionalHooks: "(useWindowSizeChange)",
			},
		],
		"no-param-reassign": ["error", { props: false }],
	},
	overrides: [
		{
			files: ["scripts/**/*"],
			rules: { "no-console": "off" },
		},
		...[
			["apps/next", ["next.config.js"]],
			["apps/expo"],
			["packages/app"],
			["scripts"],
		].map(([dir, devDependencies]) => ({
			files: `${dir}/**/*`,
			rules: {
				"import/no-extraneous-dependencies": [
					"error",
					getExtraneousDependenciesConfig(dir, devDependencies),
				],
			},
		})),
		{
			extends: ["plugin:@typescript-eslint/disable-type-checked"],
			files: ["*.cjs", "*.js"],
		},
	],
};
