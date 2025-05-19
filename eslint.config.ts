import js from "@eslint/js";
import type { Linter } from "eslint";
import * as airbnbPlugin from "eslint-config-airbnb-extended";
import prettierConfig from "eslint-config-prettier";
import importPlugin from "eslint-plugin-import-x";
import jsxAccessibilityPlugin from "eslint-plugin-jsx-a11y";
import packageJson from "eslint-plugin-package-json";
import playwrightPlugin from "eslint-plugin-playwright";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import tailwindPlugin from "eslint-plugin-tailwindcss";
import vitestPlugin from "eslint-plugin-vitest";
import globals from "globals";
import path from "node:path";
import { entries, fromEntries } from "remeda";
import ts from "typescript-eslint";

const getExtraneousDependenciesConfig = (
	packageJsonDir = "",
	devDependencies: string[] | boolean = false,
) => ({
	devDependencies:
		devDependencies &&
		(Array.isArray(devDependencies)
			? devDependencies.map((filename) => path.join(packageJsonDir, filename))
			: devDependencies),
	optionalDependencies: false,
	packageDir: [".", packageJsonDir].filter(Boolean),
});

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
];

const overriddenRules = {
	name: "local/overridden",
	rules: {
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
			"error",
			{
				selector:
					"MemberExpression[object.name='Object'][property.name='keys']",
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
			{
				selector: "ExportAllDeclaration",
				message: "Do not use barrel export, prefer named export",
			},
		] as Linter.RuleSeverityAndOptions,

		// Custom devDependencies
		"import-x/no-extraneous-dependencies": [
			"error",
			getExtraneousDependenciesConfig(undefined, [
				"vitest.config.ts",
				"eslint.config.ts",
			]),
		],
		// Custom order
		"import-x/order": [
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
		"import-x/no-useless-path-segments": ["error", { noUselessIndex: false }],

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
		"react/jsx-fragments": ["error", "syntax"],

		// 'warn' recommended for those 4
		"tailwindcss/enforces-negative-arbitrary-values": "error",
		"tailwindcss/enforces-shorthand": "error",
		"tailwindcss/migration-from-tailwind-2": "error",
		"tailwindcss/no-custom-classname": "error",
	},
} satisfies Linter.Config;

const typescriptFiles = ["ts", "mts", "tsx"].map((ext) => `**/*.${ext}`);

const typescriptOverriddenRules = {
	name: "local/overridden-disable-type-checked",
	files: typescriptFiles,
	rules: {
		// These 2 are off by default
		"@typescript-eslint/switch-exhaustiveness-check": [
			"error",
			{ considerDefaultExhaustiveForUnions: true },
		],
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
			{ varsIgnorePattern: "React" },
		],
		// We want to trigger on deprecated code
		"@typescript-eslint/no-deprecated": "error",
		// This catches floating promises instead of @typescript-eslint/promise-function-async
		"@typescript-eslint/no-floating-promises": "error",
	},
} satisfies Linter.Config;

const disabledRules = {
	name: "local/disabled",
	rules: {
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
		// We use typescript to validate optional props are used correctly
		"react/require-default-props": "off",
		// TODO: enable later and fix
		"react/jsx-sort-props": "off",
		// We use mostly named exports
		"import-x/prefer-default-export": "off",
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
		// We have typescript strict enough to have implicit boundary types
		"@typescript-eslint/explicit-module-boundary-types": "off",
		// This is replaced by @typescript-eslint/no-floating-promises
		"@typescript-eslint/promise-function-async": "off",
	},
} satisfies Linter.Config;

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
				// eslint-disable-next-line n/no-unsupported-features/node-builtins
				tsconfigRootDir: import.meta.dirname,
			},
		},
		settings: {
			"import-x/resolver": {
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
			node: {
				version: "20.0.0",
			},
		},
	},
	importPlugin.flatConfigs.recommended,
	importPlugin.flatConfigs.react,
	importPlugin.flatConfigs["react-native"],
	importPlugin.flatConfigs["stage-0"],
	reactHooksPlugin.configs["recommended-latest"],
	airbnbPlugin.plugins.stylistic,
	airbnbPlugin.plugins.node,
	airbnbPlugin.configs.base.recommended,
	airbnbPlugin.rules.base.strict,
	airbnbPlugin.configs.node.recommended,
	airbnbPlugin.configs.react.recommended,
	airbnbPlugin.rules.react.strict,
	tailwindPlugin.configs["flat/recommended"],
	jsxAccessibilityPlugin.flatConfigs.recommended,
	// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
	reactPlugin.configs.flat.recommended!,
	// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
	reactPlugin.configs.flat["jsx-runtime"]!,
	js.configs.recommended,
	prettierConfig,
	{
		...playwrightPlugin.configs["flat/recommended"],
		files: ["testing/playwright/**/*", "**/__tests__/**"],
		rules: {
			...playwrightPlugin.configs["flat/recommended"].rules,
			"playwright/expect-expect": [
				"error",
				{ assertFunctionNames: ["expectScreenshotWithSchemes"] },
			],
		},
	},
	/* Typescript section */
	ts.configs.strictTypeChecked,
	ts.configs.stylisticTypeChecked,
	ts.configs.disableTypeChecked,
	importPlugin.flatConfigs.typescript,
	airbnbPlugin.configs.base.typescript,
	airbnbPlugin.rules.typescript.typescriptEslintStrict,
	airbnbPlugin.configs.react.typescript,
	/* Overrides section */
	overriddenRules,
	typescriptOverriddenRules,
	disabledRules,
	// Disabling stylistic rules as it is Prettier's matter
	{
		rules: fromEntries(
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			entries(airbnbPlugin.rules.base.stylistic.rules!).map(([key]) => [
				key,
				"off" as const,
			]),
		),
	},
	...(
		[
			[
				"apps/web",
				["next.config.mjs", "vitest.config.ts", "**/*.test.ts", "**/*.spec.ts"],
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
		] satisfies Parameters<typeof getExtraneousDependenciesConfig>[]
	).map(([dir, devDependencies]) => ({
		files: [`${dir}/**/*`],
		rules: {
			"import-x/no-extraneous-dependencies": [
				"error",
				getExtraneousDependenciesConfig(dir, devDependencies),
			] satisfies Linter.RuleSeverityAndOptions,
		},
	})),
	{
		files: [`packages/components/src/*`],
		rules: {
			"import-x/no-extraneous-dependencies": ["off"],
		},
	},
	{
		files: ["**/*.{mjs,js,jsx}"],
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
		files: [
			"apps/mobile/metro.config.js",
			"apps/web/next.config.js",
			"apps/mobile/babel.config.js",
		],
		rules: {
			// We still have some CJS files in the project
			"@typescript-eslint/no-require-imports": "off",
		},
		languageOptions: {
			globals: {
				...globals.commonjs,
				...globals.node,
			},
		},
	},
	{
		...packageJson.configs.recommended,
		languageOptions: {
			parserOptions: {
				projectService: {},
				// eslint-disable-next-line n/no-unsupported-features/node-builtins
				tsconfigRootDir: import.meta.dirname,
			},
		},
	},
	{
		files: ["**/package.json"],
		rules: {
			// Remove when `eslint-plugin-package-json` migrates to a proper parser
			// Also, remove `jsonc-eslint-parser` package from the project
			// see https://github.com/JoshuaKGoldberg/eslint-plugin-package-json/issues/655
			"@typescript-eslint/no-unused-expressions": "off",
		},
	},
	{
		files: ["**/__tests__/**", "testing/playwright/**", "testing/vitest/**"],
		rules: {
			// We use `use` function in Playwright tests which clashes with this rule
			"react-hooks/rules-of-hooks": "off",
		},
	},
	{
		files: ["testing/playwright/**"],
		rules: {
			// We use `expect`s inside fixtures and this is not supported by the rule
			"playwright/no-standalone-expect": "off",
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
			"apps/mobile/ios",
		],
	},
);
