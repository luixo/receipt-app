const path = require("path");

// NODE_OPTIONS="--max-old-space-size=4096" is required to run lint on CI
// Otherwise it fails with OOM
// See https://github.com/typescript-eslint/typescript-eslint/issues/1192

const getExtraneousDependenciesConfig = (
	packageJsonDir = "",
	devDependencies = false,
) => ({
	devDependencies:
		devDependencies &&
		(Array.isArray(devDependencies)
			? devDependencies.map((filename) => path.join(packageJsonDir, filename))
			: devDependencies),
	optionalDependencies: false,
	packageDir: [".", packageJsonDir].filter(Boolean),
});

module.exports = {
	extends: [
		"eslint:recommended",
		"plugin:@typescript-eslint/recommended",
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
			getExtraneousDependenciesConfig(undefined, ["vitest.config.ts"]),
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
						pattern: "{next-app,@tests,app}/**",
						group: "internal",
						position: "before",
					},
				],
				pathGroupsExcludedImportTypes: [
					"react",
					"react-native",
					"app",
					"next-app",
					"@tests",
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
		"@typescript-eslint/restrict-template-expressions": "error",
		"@typescript-eslint/consistent-type-imports": "error",
		"sort-imports": ["error", { ignoreDeclarationSort: true }],
	},
	overrides: [
		{
			files: ["scripts/**/*"],
			rules: { "no-console": "off" },
		},
		...[
			["apps/next", ["next.config.js", "**/*.test.ts", "**/*.spec.ts"]],
			["apps/expo"],
			["packages/app"],
			["scripts", true],
			["testing/vitest", true],
			["testing/playwright", true],
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
		{
			rules: {
				"@typescript-eslint/no-var-requires": "off",
			},
			files: ["*.js"],
		},
	],
};
