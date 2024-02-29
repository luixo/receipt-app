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
		"plugin:tailwindcss/recommended",
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
		"@next/next/no-html-link-for-pages": ["warn", "./apps/web/src/pages"],
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
						pattern: "{~*/**,~*}",
						group: "internal",
						position: "before",
					},
				],
				pathGroupsExcludedImportTypes: ["react", "react-native", "{~*/**,~*}"],
			},
		],
		"import/extensions": "off",
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
		"@typescript-eslint/no-floating-promises": "error",
		// Maintained by prettier plugin
		"tailwindcss/classnames-order": "off",
		"tailwindcss/enforces-negative-arbitrary-values": "error",
		"tailwindcss/enforces-shorthand": "error",
		"tailwindcss/migration-from-tailwind-2": "error",
		"tailwindcss/no-arbitrary-value": "off",
		"tailwindcss/no-custom-classname": "error",
	},
	overrides: [
		{
			files: ["**/scripts/**/*"],
			rules: { "no-console": "off" },
		},
		...[
			["apps/web", ["next.config.js", "**/*.test.ts", "**/*.spec.ts"]],
			["apps/mobile"],
			["packages/components"],
			["packages/mutations"],
			["packages/queries"],
			["packages/db", ["scripts/**/*", "**/*.test.ts"]],
			["packages/app", ["**/*.spec.ts"]],
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
		{
			files: ["apps/web/src/email/**/*"],
			rules: {
				"tailwindcss/no-custom-classname": "off",
			},
		},
		{
			files: ["testing/vitest/**", "*.test.ts"],
			plugins: ["vitest"],
			extends: ["plugin:vitest/recommended"],
			rules: {
				"vitest/valid-title": "off",
			},
		},
	],
	settings: {
		tailwindcss: {
			callees: ["tv"],
			config: "apps/web/tailwind.config.ts",
			ignoredKeys: ["responsiveVariants"],
			whitelist: [
				"text-foreground",
				"text-primary",
				"text-warning",
				"text-danger",
				"text-success",
				"text-default-\\d+",
			],
		},
	},
};
