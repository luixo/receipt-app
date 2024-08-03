import { fixupPluginRules } from "@eslint/compat";
import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import nextJsPlugin from "@next/eslint-plugin-next";
import airbnbConfig from "eslint-config-airbnb";
import airbnbHooksConfig from "eslint-config-airbnb/hooks";
import airbnbTypescriptConfig from "eslint-config-airbnb-typescript";
import prettierConfig from "eslint-config-prettier";
import importPlugin from "eslint-plugin-import";
import jsxAccessibilityPlugin from "eslint-plugin-jsx-a11y";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import tailwindPlugin from "eslint-plugin-tailwindcss";
import vitestPlugin from "eslint-plugin-vitest";
import globals from "globals";
import path from "node:path";
import ts from "typescript-eslint";

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

const withoutPlugins = ({ plugins: _plugins, ...obj }) => obj;

const compat = new FlatCompat({
	baseDirectory: import.meta.dirname,
	recommendedConfig: js.configs.recommended,
	allConfig: js.configs.all,
});

const overridenRules = {
	// We assign `ref.current` a lot
	"no-param-reassign": [
		"error",
		{ ignorePropertyModificationsForRegex: ["ref$"] },
	],
	// We enjoy sorting imports
	"sort-imports": ["error", { ignoreDeclarationSort: true }],
	// 'warn' recommended
	"no-console": "error",
	// 'warn' recommended
	"no-alert": "error",
	// `void foo` is a mark of deliberately floating promise
	"no-void": ["error", { allowAsStatement: true }],

	// Custom devDependencies
	"import/no-extraneous-dependencies": [
		"error",
		getExtraneousDependenciesConfig(undefined, [
			"vitest.config.ts",
			"eslint.config.js",
		]),
	],
	// Custom order
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

	// These 2 are off by default
	"@typescript-eslint/switch-exhaustiveness-check": "error",
	"@typescript-eslint/consistent-type-imports": "error",
	// We want to allow `Amount ${amount}` to be used
	"@typescript-eslint/restrict-template-expressions": [
		"error",
		{ allowNumber: true },
	],
	// Default option is `interface`
	"@typescript-eslint/consistent-type-definitions": ["error", "type"],
	// Allowing `while(true)`
	"@typescript-eslint/no-unnecessary-condition": [
		"error",
		{ allowConstantLoopConditions: true },
	],

	// Airbnb forces them to be functional components
	"react/function-component-definition": [
		"error",
		{
			namedComponents: "arrow-function",
			unnamedComponents: "arrow-function",
		},
	],
	// Allow expressions for stuff like `<>{children}</>
	"react/jsx-no-useless-fragment": ["error", { allowExpressions: true }],

	// 'warn' recommended, also additionalHooks
	"react-hooks/exhaustive-deps": [
		"error",
		{
			additionalHooks: "(useWindowSizeChange)",
		},
	],

	// 'warn' recommended, also custom path
	"@next/next/no-html-link-for-pages": ["error", "./apps/web/src/pages"],

	// 'warn' recommended for those 4
	"tailwindcss/enforces-negative-arbitrary-values": "error",
	"tailwindcss/enforces-shorthand": "error",
	"tailwindcss/migration-from-tailwind-2": "error",
	"tailwindcss/no-custom-classname": "error",
};

const disabledRules = {
	// We see no evil in nested ternaries
	"no-nested-ternary": "off",
	// This is guarded by typescript
	"consistent-return": "off",
	// Typescript version is `@typescript-eslint/switch-exhaustiveness-check`
	"default-case": "off",
	// Rule is enabled by `eslint-config-airbnb-typescript`
	// it is deprecated by maintainer, see https://typescript-eslint.io/rules/no-throw-literal/
	"@typescript-eslint/no-throw-literal": "off",
	// We don't really need react components names
	"react/display-name": "off",
	// Rule doesn't seems to work properly
	"react/prop-types": "off",
	// We extensively spread props: `<Foo {...props} />`
	"react/jsx-props-no-spreading": "off",
	// We use mostly named exports
	"import/prefer-default-export": "off",
	// Maintained by prettier plugin
	"tailwindcss/classnames-order": "off",
	// `(object | undefined) || number` is assumed incorrect by this rule
	// it should be `(object | undefined) ?? number`
	"@typescript-eslint/prefer-nullish-coalescing": "off",
};

const temporaryDisabledRules = {
	"@typescript-eslint/array-type": "off",
	"@typescript-eslint/consistent-indexed-object-style": "off",
	"@typescript-eslint/no-confusing-non-null-assertion": "off",
	"@typescript-eslint/no-confusing-void-expression": "off",
	"@typescript-eslint/no-dynamic-delete": "off",
	"@typescript-eslint/no-invalid-void-type": "off",
	"@typescript-eslint/no-meaningless-void-operator": "off",
	"@typescript-eslint/no-misused-promises": "off",
	"@typescript-eslint/no-redundant-type-constituents": "off",
	"@typescript-eslint/no-require-imports": "off",
	"@typescript-eslint/no-unnecessary-template-expression": "off",
	"@typescript-eslint/no-unnecessary-type-arguments": "off",
	"@typescript-eslint/no-unnecessary-type-assertion": "off",
	"@typescript-eslint/no-unnecessary-type-parameters": "off",
	"@typescript-eslint/no-unsafe-argument": "off",
	"@typescript-eslint/no-unsafe-assignment": "off",
	"@typescript-eslint/no-unsafe-call": "off",
	"@typescript-eslint/no-unsafe-member-access": "off",
	"@typescript-eslint/no-unsafe-return": "off",
	"@typescript-eslint/no-unsafe-unary-minus": "off",
	"@typescript-eslint/no-unused-vars": "off",
	"@typescript-eslint/non-nullable-type-assertion-style": "off",
	"@typescript-eslint/prefer-find": "off",
	"@typescript-eslint/prefer-optional-chain": "off",
	"@typescript-eslint/prefer-promise-reject-errors": "off",
	"@typescript-eslint/prefer-reduce-type-parameter": "off",
	"@typescript-eslint/prefer-regexp-exec": "off",
	"@typescript-eslint/require-await": "off",
	"@typescript-eslint/restrict-plus-operands": "off",
	"@typescript-eslint/use-unknown-in-catch-callback-variable": "off",
	"jsx-a11y/no-autofocus": "off",
};

export default ts.config(
	{ files: ["**/*.{js,jsx,ts,tsx}"] },
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.es2017,
				...globals.node,
			},
			parserOptions: {
				projectService: true,
			},
		},
		plugins: {
			// remove fixupPluginRules on resolution: https://github.com/import-js/eslint-plugin-import/issues/2948
			import: fixupPluginRules(importPlugin),
			// remove fixupPluginRules on resolution: https://github.com/facebook/react/issues/28313
			"react-hooks": fixupPluginRules(reactHooksPlugin),
			// remove fixupPluginRules on resolution: https://github.com/vercel/next.js/issues/64409
			"@next/next": fixupPluginRules(nextJsPlugin),
		},
		settings: {
			"import/resolver": {
				typescript: {
					project: true,
				},
			},
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
			react: {
				version: "detect",
			},
		},
	},
	// remove compat on resolution: https://github.com/airbnb/javascript/issues/2804
	...compat.config(airbnbConfig).map(withoutPlugins),
	...compat.config(airbnbHooksConfig).map(withoutPlugins),
	// remove compat on resolution: https://github.com/import-js/eslint-plugin-import/issues/2948
	...compat.config(importPlugin.configs.recommended).map(withoutPlugins),
	// remove compat on resolution: https://github.com/facebook/react/issues/28313
	...compat.config(reactHooksPlugin.configs.recommended).map(withoutPlugins),
	// remove compat on resolution: https://github.com/vercel/next.js/issues/64409
	{ rules: nextJsPlugin.configs.recommended.rules },
	...tailwindPlugin.configs["flat/recommended"],
	jsxAccessibilityPlugin.flatConfigs.recommended,
	reactPlugin.configs.flat.recommended,
	reactPlugin.configs.flat["jsx-runtime"],
	js.configs.recommended,
	prettierConfig,
	...ts.configs.strictTypeChecked,
	...ts.configs.stylisticTypeChecked,
	// remove compat on resolution: https://github.com/airbnb/javascript/issues/2804
	...compat
		.config(airbnbTypescriptConfig)
		.map(withoutPlugins)
		.map((config) => ({
			...config,
			// Some rules do not exist in `typescript-eslint` anymore
			// but airbnb-typescript still tried to turn them on
			rules: {
				...config.rules,
				"@typescript-eslint/quotes": "off",
				"@typescript-eslint/brace-style": "off",
				"@typescript-eslint/comma-dangle": "off",
				"@typescript-eslint/comma-spacing": "off",
				"@typescript-eslint/func-call-spacing": "off",
				"@typescript-eslint/indent": "off",
				"@typescript-eslint/keyword-spacing": "off",
				"@typescript-eslint/no-extra-semi": "off",
				"@typescript-eslint/object-curly-spacing": "off",
				"@typescript-eslint/semi": "off",
				"@typescript-eslint/space-before-blocks": "off",
				"@typescript-eslint/space-before-function-paren": "off",
				"@typescript-eslint/space-infix-ops": "off",
				"@typescript-eslint/lines-between-class-members": "off",
			},
		})),
	// remove compat on resolution: https://github.com/import-js/eslint-plugin-import/issues/2948
	...compat.config(importPlugin.configs.typescript).map(withoutPlugins),
	{ rules: overridenRules },
	{ rules: disabledRules },
	...[
		[
			"apps/web",
			["next.config.js", "vitest.config.ts", "**/*.test.ts", "**/*.spec.ts"],
		],
		["apps/mobile"],
		["packages/components"],
		["packages/mutations"],
		["packages/queries"],
		["packages/utils"],
		["packages/db", ["scripts/**/*", "**/*.test.ts", "vitest.config.ts"]],
		["packages/app", ["**/*.spec.ts", "**/__tests__/**"]],
		["scripts", true],
		["testing/vitest", true],
		["testing/playwright", true],
	].map(([dir, devDependencies]) => ({
		files: [`${dir}/**/*`],
		rules: {
			"import/no-extraneous-dependencies": [
				"error",
				getExtraneousDependenciesConfig(dir, devDependencies),
			],
		},
	})),
	{ rules: temporaryDisabledRules },
	{
		files: ["**/*.{js,jsx}"],
		...ts.configs.disableTypeChecked,
	},
	{
		files: ["**/scripts/**/*"],
		rules: { "no-console": "off" },
	},
	{
		files: ["apps/web/src/email/**/*"],
		rules: {
			"tailwindcss/no-custom-classname": "off",
		},
	},
	{
		files: ["packages/db/src/models/*"],
		rules: {
			// DB types are generated via interfaces
			"@typescript-eslint/consistent-type-definitions": "off",
		},
	},
	{
		files: ["testing/vitest/**", "*.test.ts"],
		plugins: {
			vitest: vitestPlugin,
		},
		rules: {
			...vitestPlugin.configs.recommended.rules,
			"vitest/valid-title": "off",
		},
	},
	{
		files: ["apps/web/src/email/*"],
		rules: {
			// see https://github.com/typescript-eslint/typescript-eslint/issues/8324
			"@typescript-eslint/consistent-type-imports": "off",
		},
	},
	{
		// see https://eslint.org/docs/latest/use/configure/configuration-files#globally-ignoring-files-with-ignores
		ignores: [
			".history/",
			".yarn/",
			"**/.next/",
			"**/.expo/",
			"**/coverage/",
			"**/playwright-report/",
			"**/test-results/",
		],
	},
);
