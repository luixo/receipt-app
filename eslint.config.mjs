import { fixupPluginRules } from "@eslint/compat";
import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import nextJsPlugin from "@next/eslint-plugin-next";
import airbnbConfig from "eslint-config-airbnb";
import airbnbHooksConfig from "eslint-config-airbnb/hooks";
import airbnbTypescriptConfig from "eslint-config-airbnb-typescript";
import prettierConfig from "eslint-config-prettier";
import deprecationPlugin from "eslint-plugin-deprecation";
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

const compatAirbnbConfigs = compat.config(airbnbConfig).map(withoutPlugins);
const originalNoUnusedVars = compatAirbnbConfigs
	.map((config) => config.rules?.["no-unused-vars"])
	.find(Boolean);
const originalRestrictedSyntax = compatAirbnbConfigs
	.map((config) => config.rules?.["no-restricted-syntax"])
	.find(Boolean);

const restrictedImports = [
	{
		// see https://eslint.org/docs/latest/extend/selectors#known-issues
		from: "~mutations\\u002F.*",
		imports: [
			{
				actual: "options",
				expected: "<router><Procedure>Options",
			},
		],
	},
	{
		from: "~mutations\\u002Fcache\\u002F.*",
		imports: [
			{
				actual: "update",
				expected: "update<Router>",
			},
			{
				actual: "updateRevert",
				expected: "updateRevert<Router>",
			},
			{
				actual: /invalidate.*/,
				expected: "invalidate*<Router>",
			},
		],
	},
	{
		from: "~queries\\u002F.*",
		imports: [
			{
				actual: "useStore",
				expected: "use<Router><Procedure>Store",
			},
			{
				actual: "useSyncQueryParams",
				expected: "use<router><Procedure>SyncQueryParams",
			},
			{
				actual: "inputStore",
				expected: "<router><Procedure>InputStore",
			},
		],
	},
];

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
	"no-restricted-syntax": [
		...originalRestrictedSyntax,
		{
			selector: "MemberExpression[object.name='Object'][property.name='keys']",
			message:
				"Use strongly typed function `keys` from `remeda` package instead.",
		},
		{
			selector:
				"MemberExpression[object.name='Object'][property.name='values']",
			message:
				"Use strongly typed function `values` from `remeda` package instead.",
		},
		{
			selector:
				"MemberExpression[object.name='Object'][property.name='entries']",
			message:
				"Use strongly typed function `entries` (or `mapValues`) from `remeda` package instead.",
		},
		{
			selector:
				"MemberExpression[object.name='Object'][property.name='fromEntries']",
			message:
				"Use strongly typed function `fromEntries` (or `mapValues`) from `remeda` package instead.",
		},
		...restrictedImports.flatMap(({ from, imports }) =>
			imports.map(({ actual, expected }) => ({
				selector: `ImportDeclaration[source.value=/${from}/] > ImportSpecifier[local.name=${
					actual instanceof RegExp ? `/${actual.source}/` : `'${actual}'`
				}]`,
				message: `Prefer renaming '${actual.toString()}' to '${expected}'`,
			})),
		),
	],

	// Custom devDependencies
	"import/no-extraneous-dependencies": [
		"error",
		getExtraneousDependenciesConfig(undefined, [
			"vitest.config.ts",
			"eslint.config.mjs",
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
	// We want to pass `() => Promise<void>` to a prop / arg expecting `() => void`
	"@typescript-eslint/no-misused-promises": [
		"error",
		{
			checksVoidReturn: {
				arguments: false,
				attributes: false,
			},
		},
	],
	// We need to use React
	"@typescript-eslint/no-unused-vars": [
		"error",
		{ ...originalNoUnusedVars[1], varsIgnorePattern: "React" },
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
	// Rule emits false positives on `const fn = <T>(value: T) => {...}`
	// see https://github.com/typescript-eslint/typescript-eslint/issues/9667
	"@typescript-eslint/no-unnecessary-type-parameters": "off",
	// We enjoy confusing fellow developers with void expressions
	// Mainly used for:
	// - returning `void` from a function, assigning that to a value and validating value is undefined
	// - shorthanding functions returns that don't matter (because they're void)
	"@typescript-eslint/no-confusing-void-expression": "off",
	// That's a weird thing to forbid
	"@typescript-eslint/no-dynamic-delete": "off",
	// We use a few `void` types around
	"@typescript-eslint/no-invalid-void-type": "off",
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
			// remove fixupPluginRules on resolution: https://github.com/gund/eslint-plugin-deprecation/issues/78
			deprecation: fixupPluginRules(deprecationPlugin),
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
	// remove compat on resolution: https://github.com/gund/eslint-plugin-deprecation/issues/78
	...compat.config(deprecationPlugin.configs.recommended).map(withoutPlugins),
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
	{
		files: ["**/*.{mjs,js,jsx}"],
		...ts.configs.disableTypeChecked,
		rules: {
			// remove compat on resolution: https://github.com/gund/eslint-plugin-deprecation/issues/78
			"deprecation/deprecation": "off",
			...ts.configs.disableTypeChecked.rules,
		},
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
		files: ["apps/mobile/metro.config.js", "apps/web/next.config.js"],
		rules: {
			// We still have some CJS files in the project
			"@typescript-eslint/no-require-imports": "off",
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
