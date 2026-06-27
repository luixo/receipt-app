import tanstackRouterPlugin from "@tanstack/eslint-plugin-router";
import tailwindPlugin from "eslint-plugin-better-tailwindcss";
import packageJson from "eslint-plugin-package-json";
import playwrightPlugin from "eslint-plugin-playwright";
import htmlTags from "html-tags";
import path from "node:path";
import type { DummyRule, DummyRuleMap, OxlintOverride } from "oxlint";
import { defineConfig } from "oxlint";
import { fromEntries, keys, omit } from "remeda";

// Currently doesn't work properly
// see https://github.com/oxc-project/oxc/issues/22364
// TODO: re-enable when oxc solved package.json problem
const getExtraneousDependenciesConfig = (
	packageJsonDir: string,
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

type RestrictedTag =
	// These can be used in server environment
	| "client-only"
	// These can be used in web environment
	| "web-only"
	// These can be used in .web files
	| "strict-web-only"
	// These can be used in native environment
	| "native-only"
	// These can be used in .native files
	| "strict-native-only";

const restrictedImports: ((
	| {
			imports: ({ actual: string | RegExp } & (
				| { expected: string }
				| { message: string }
			))[];
	  }
	| {
			message: string;
	  }
) & {
	from: string | RegExp;
	omitTags?: RestrictedTag[];
})[] = [
	{
		// see https://eslint.org/docs/latest/extend/selectors#known-issues
		from: String.raw`~mutations\u002F.*`,
		imports: [
			{
				actual: "options",
				expected: "<router><Procedure>Options",
			},
		],
	},
	{
		from: String.raw`~mutations\u002Fcache\u002F.*`,
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
		from: "react-native",
		imports: [
			{
				actual: "Text",
				message: "Please use Text from `components `package",
			},
			{
				actual: "View",
				message: "Please use View from `components `package",
			},
			{
				actual: "Button",
				message: "Please use Button from `components `package",
			},
			{
				actual: "ScrollView",
				message: "Please use ScrollView from `components `package",
			},
		],
	},
	{
		from: /^@heroui/,
		message: "Please use ~components or heroui-native in native components",
		omitTags: ["web-only"],
	},
	{
		from: "heroui-native",
		message: "Please use ~components or @heroui/react in web components",
		omitTags: ["native-only"],
	},
	{
		from: "~web/handlers/validation",
		message:
			"Do not import from web validation, it includes heavy currency data!",
		omitTags: ["client-only"],
	},
	{
		from: /\.web/,
		message: "Don't import from `./foo.web`, import from `./foo`",
		omitTags: ["strict-web-only"],
	},
	{
		from: /\.native/,
		message: "Don't import from `./foo.native`, import from `./native`",
		omitTags: ["strict-native-only"],
	},
];

type NoRestrictedSyntaxElement = {
	selector: string;
	message: string;
	omitTags?: RestrictedTag[];
};
const noRestrictedSyntaxGeneral: NoRestrictedSyntaxElement[] = [
	{
		selector: "JSXAttribute[name.name='data-testid']",
		message: "Use testID from react-native instead",
		omitTags: ["web-only"],
	},
	...restrictedImports.flatMap(({ from, omitTags, ...rest }) => {
		const getSelector = (input: string | RegExp) =>
			input instanceof RegExp
				? `/${input.source.replaceAll("/", String.raw`u002F`)}/`
				: `'${input}'`;
		const valueSelector = getSelector(from);
		if ("message" in rest) {
			return [
				{
					selector: `ImportDeclaration[importKind!='type'][source.value=${valueSelector}]`,
					message: rest.message,
					omitTags,
				},
				{
					selector: `ExportNamedDeclaration[exportKind!='type'][source.value=${valueSelector}]`,
					message: rest.message,
					omitTags,
				},
			];
		}
		return rest.imports.flatMap(({ actual, ...importValue }) => {
			const message =
				"expected" in importValue
					? `Prefer renaming '${actual.toString()}' to '${importValue.expected}'`
					: importValue.message;
			const importSelector = getSelector(actual);
			const actualExpression = actual
				? `ImportSpecifier[local.name=${importSelector}]`
				: undefined;
			return [
				{
					selector: `ImportDeclaration[source.value=${valueSelector}]${actualExpression ? ` > ${actualExpression}` : ""}`,
					message,
					omitTags,
				},
				{
					selector: `ExportNamedDeclaration[source.value=${valueSelector}]${actualExpression ? ` > ${actualExpression}` : ""}`,
					message,
					omitTags,
				},
			];
		});
	}),
	{
		selector: "ExportAllDeclaration",
		message: "Do not use barrel export, prefer named export",
	},
	{
		selector: "NewExpression[callee.name='Date']",
		message:
			"Using `new Date()` is forbidden, use '~utils/date' `parse` object.",
	},
	{
		selector:
			"CallExpression[callee.object.name='Date'][callee.property.name='now']",
		message:
			"Using `Date.now()` is forbidden, use '~utils/date' `getNow` object.",
	},
	{
		selector: "TSTypeReference[typeName.name='Date']",
		message:
			"Using `Date` type is forbidden, use '~utils/date' Temporal types.",
	},
	{
		selector: "MemberExpression[object.name='React'][property.name='memo']",
		message: "No need to use `React.memo`, we have a react compiler turned on",
	},
] as const;

const getNoRestrictedSyntax = (...omittedTags: RestrictedTag[]): DummyRule => [
	"error",
	...noRestrictedSyntaxGeneral
		.filter((element) =>
			element.omitTags
				? !element.omitTags.some((tag) => omittedTags.includes(tag))
				: true,
		)
		.map(omit(["omitTags"])),
];

const restrictedSyntaxRules: [string, RestrictedTag[]][] = [
	["**/*", []],
	// Web-only imports can be used in web app..
	["apps/web/**/*", ["web-only"]],
	// ..and in .web files (that also can import other .web files)
	["**/*.web.ts{,x}", ["web-only", "strict-web-only"]],
	// Native-only imports can be used in native app..
	["apps/mobile/**/*", ["native-only"]],
	// ..and in .web files (that also can import other .web files)
	["**/*.native.ts{,x}", ["native-only", "strict-native-only"]],
	// Handlers is the only place where handlers validation is allowed to be imported from
	["apps/web/src/handlers/**/*", ["client-only"]],
];

const overriddenRules = {
	// We assign `ref.current` a lot
	"no-param-reassign": [
		"error",
		{ props: true, ignorePropertyModificationsForRegex: ["ref$"] },
	],
	// We enjoy sorting imports
	"sort-imports": ["error", { ignoreDeclarationSort: true }],
	// 'warn' recommended
	"no-console": "error",
	// 'warn' recommended
	"no-alert": "error",
	// `void foo` is a mark of deliberately floating promise
	"no-void": ["error", { allowAsStatement: true }],
	"no-restricted-properties": [
		"error",
		{
			object: "Object",
			property: "keys",
			message:
				"Use strongly typed function `keys` from `remeda` package instead.",
		},
		{
			object: "Object",
			property: "values",
			message:
				"Use strongly typed function `values` from `remeda` package instead.",
		},
		{
			object: "Object",
			property: "entries",
			message:
				"Use strongly typed function `entries` (or `mapValues`) from `remeda` package instead.",
		},
		{
			object: "Object",
			property: "fromEntries",
			message:
				"Use strongly typed function `fromEntries` (or `mapValues`) from `remeda` package instead.",
		},
	],

	"no-restricted-globals": [
		"error",
		{
			name: "window",
			message:
				"Move this code to `web` package or create a context for this action",
		},
		{
			name: "document",
			message:
				"Move this code to `web` package or create a context for this action",
		},
	],

	// Custom devDependencies
	"import-js/no-extraneous-dependencies": [
		"error",
		getExtraneousDependenciesConfig("", ["*.config.ts"]),
	],
	// Custom order
	"import-js/order": [
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
	"import-js/no-useless-path-segments": ["error", { noUselessIndex: false }],

	// Allow expressions for stuff like `<>{children}</>`
	"react/jsx-no-useless-fragment": ["error", { allowExpressions: true }],
	// We forbid all HTML elements for react-native
	"react/forbid-elements": [
		"error",
		{
			forbid: htmlTags.map((tag) => ({
				element: tag,
				message:
					"Move this code to `web` package and provide native alternative",
			})),
		},
	],
	// 'warn' recommended, also additionalHooks
	"react/exhaustive-deps": [
		"error",
		{
			additionalHooks: "(useWindowSizeChange)",
		},
	],
	"react/jsx-fragments": ["error", "syntax"],

	// These 2 are off by default
	"typescript/switch-exhaustiveness-check": [
		"error",
		{ considerDefaultExhaustiveForUnions: true },
	],
	"typescript/consistent-type-imports": "error",
	// We want to allow `Amount ${amount}` to be used
	"typescript/restrict-template-expressions": ["error", { allowNumber: true }],
	// Default option is `interface`
	"typescript/consistent-type-definitions": ["error", "type"],
	// Allowing `while(true)`
	"typescript/no-unnecessary-condition": [
		"error",
		{ allowConstantLoopConditions: true },
	],
	// We want to pass `() => Promise<void>` to a prop / arg expecting `() => void`
	"typescript/no-misused-promises": [
		"error",
		{
			checksVoidReturn: {
				arguments: false,
				attributes: false,
			},
		},
	],
	// We need to use React
	"no-unused-vars": ["error", { varsIgnorePattern: "React" }],
	// We want to trigger on deprecated code
	"typescript/no-deprecated": "error",
	// This catches floating promises instead of typescript/promise-function-async
	"typescript/no-floating-promises": "error",
} satisfies DummyRuleMap;

const disabledRules = {
	// We see no evil in nested ternaries
	"no-nested-ternary": "off",
	// This is guarded by typescript
	"consistent-return": "off",
	// Typescript version is typescript/switch-exhaustiveness-check
	"default-case": "off",
	// We extensively spread props: `<Foo {...props} />`
	"react/jsx-props-no-spreading": "off",
	// Maintained by prettier plugin
	"better-tailwindcss/enforce-consistent-class-order": "off",
	// `(object | undefined) || number` is assumed incorrect by this rule
	// it should be `(object | undefined) ?? number`
	"typescript/prefer-nullish-coalescing": "off",
	// Rule emits false positives on `const fn = <T>(value: T) => {...}`
	// see https://github.com/typescript-eslint/typescript-eslint/issues/9667
	"typescript/no-unnecessary-type-parameters": "off",
	// We enjoy confusing fellow developers with void expressions
	// Mainly used for:
	// - returning `void` from a function, assigning that to a value and validating value is undefined
	// - shorthanding functions returns that don't matter (because they're void)
	"typescript/no-confusing-void-expression": "off",
	// That's a weird thing to forbid
	"typescript/no-dynamic-delete": "off",
	// We use a few `void` types around
	"typescript/no-invalid-void-type": "off",
	// We have typescript strict enough to have implicit boundary types
	"typescript/explicit-module-boundary-types": "off",
	// This is replaced by typescript/no-floating-promises
	"typescript/promise-function-async": "off",
	// This doesn't fit with us spreading options to the routes
	"@tanstack/router/create-route-property-order": "off",
	// It conflicts with vitest/prefer-strict-boolean-matchers
	"vitest/prefer-to-be-falsy": "off",
	// We don't need timeouts for every test
	"vitest/require-test-timeout": "off",
	// We don't need to know amount of assertions in every test
	"vitest/prefer-expect-assertions": "off",
} satisfies DummyRuleMap;

const temporaryDisabledRules = {
	// tailwindcss
	"better-tailwindcss/enforce-consistent-line-wrapping": "off",
	"better-tailwindcss/no-deprecated-classes": "off",
	"better-tailwindcss/enforce-logical-properties": "off",
	// typescript
	"typescript/prefer-readonly-parameter-types": "off", // 4266 cases
	"typescript/explicit-function-return-type": "off", // 1205 cases
	"typescript/strict-boolean-expressions": "off", // 289 cases
	"typescript/no-unsafe-type-assertion": "off", // 206 cases
	"typescript/strict-void-return": "off", // 77 cases
	"typescript/require-await": "off", // 32 cases
	"typescript/no-unsafe-assignment": "off", // 29 cases
	"typescript/no-unsafe-member-access": "off", // 26 cases
	"typescript/no-unnecessary-type-conversion": "off", // 20 cases
	"typescript/explicit-member-accessibility": "off", // 14 cases
	"typescript/no-unsafe-call": "off", // 11 cases
	"typescript/no-meaningless-void-operator": "off", // 7 cases
	"typescript/no-unsafe-argument": "off", // 6 cases
	"typescript/unbound-method": "off", // 3 cases
	"typescript/ban-types": "off", // 2 cases
	"typescript/no-useless-default-assignment": "off", // 2 cases
	// unicorn
	"unicorn/no-null": "off", // 168 cases
	"unicorn/max-nested-calls": "off", // 83 cases
	"unicorn/switch-case-braces": "off", // 58 cases
	"unicorn/no-array-reduce": "off", // 48 cases
	"unicorn/no-array-callback-reference": "off", // 46 cases
	"unicorn/catch-error-name": "off", // 41 cases
	"unicorn/no-array-for-each": "off", // 40 cases
	"unicorn/explicit-length-check": "off", // 34 cases
	"unicorn/no-nested-ternary": "off", // 30 cases
	"unicorn/no-negated-condition": "off", // 25 cases
	"unicorn/prefer-global-this": "off", // 24 cases
	"unicorn/prefer-top-level-await": "off", // 19 cases
	"unicorn/consistent-function-scoping": "off", // 18 cases
	"unicorn/no-useless-undefined": "off", // 16 cases
	"unicorn/no-new-array": "off", // 15 cases
	"unicorn/prefer-object-from-entries": "off", // 13 cases
	"unicorn/consistent-assert": "off", // 11 cases
	"unicorn/numeric-separators-style": "off", // 9 cases
	"unicorn/prefer-number-coercion": "off", // 9 cases
	"unicorn/prefer-number-properties": "off", // 8 cases
	"unicorn/prefer-spread": "off", // 8 cases
	"unicorn/prefer-module": "off", // 4 cases
	"unicorn/no-abusive-eslint-disable": "off", // 2 cases
	"unicorn/prefer-import-meta-properties": "off", // 2 cases
	// eslint
	"eslint/sort-keys": "off", // 1693 cases
	"eslint/no-magic-numbers": "off", // 1240 cases
	"eslint/id-length": "off", // 672 cases
	"eslint/no-ternary": "off", // 653 cases
	"eslint/max-lines-per-function": "off", // 413 cases
	"eslint/no-undefined": "off", // 385 cases
	"eslint/capitalized-comments": "off", // 182 cases
	"eslint/max-statements": "off", // 181 cases
	"eslint/no-duplicate-imports": "off", // 151 cases
	"eslint/require-await": "off", // 73 cases
	"eslint/require-unicode-regexp": "off", // 64 cases
	"eslint/max-params": "off", // 62 cases
	"eslint/no-inline-comments": "off", // 42 cases
	"eslint/max-lines": "off", // 40 cases
	"eslint/no-negated-condition": "off", // 28 cases
	"eslint/no-param-reassign": "off", // 26 cases
	"eslint/prefer-destructuring": "off", // 23 cases
	"eslint/no-empty-pattern": "off", // 11 cases
	"eslint/new-cap": "off", // 10 cases
	"eslint/no-empty-function": "off", // 9 cases
	"eslint/init-declarations": "off", // 8 cases
	"eslint/prefer-named-capture-group": "off", // 7 cases
	"eslint/no-warning-comments": "off", // 6 cases
	"eslint/array-callback-return": "off", // 5 cases
	"eslint/func-style": "off", // 4 cases
	// oxc
	"oxc/no-async-await": "off", // 1324 cases
	"oxc/no-rest-spread-properties": "off", // 440 cases
	"oxc/no-optional-chaining": "off", // 196 cases
	"oxc/no-accumulating-spread": "off", // 23 cases
	"oxc/no-map-spread": "off", // 14 cases
	// promise
	"promise/prefer-await-to-callbacks": "off", // 98 cases
	"promise/prefer-await-to-then": "off", // 25 cases
	"promise/avoid-new": "off", // 20 cases
	"promise/no-multiple-resolved": "off", // 3 cases
	// node
	"node/no-process-env": "off", // 42 cases
	"node/callback-return": "off", // 3 cases
	// a11y
	"jsx-a11y/prefer-tag-over-role": "off", // 3 cases
	"jsx-a11y/no-autofocus": "off", // 2 cases
	"jsx-a11y/control-has-associated-label": "off", // 2 cases
	// import
	"import/no-named-export": "off", // 1292 cases
	"import/group-exports": "off", // 731 cases
	"import/prefer-default-export": "off", // 369 cases
	"import/exports-last": "off", // 229 cases
	"import/no-relative-parent-imports": "off", // 129 cases
	"import/max-dependencies": "off", // 113 cases
	"import/no-default-export": "off", // 59 cases
	"import/consistent-type-specifier-style": "off", // 48 cases
	"import/no-namespace": "off", // 42 cases
	"import/no-nodejs-modules": "off", // 41 cases
	"import-js/no-extraneous-dependencies": "off", // 34 cases
	"import/no-unassigned-import": "off", // 18 cases
	"import/no-named-as-default-member": "off", // 7 cases
	"import/unambiguous": "off", // 2 cases
	// react
	"react/forbid-component-props": "off", // 595 cases
	"react/jsx-max-depth": "off", // 329 cases
	"react/jsx-filename-extension": "off", // 247 cases
	"react/react-in-jsx-scope": "off", // 89 cases
	"react/react-compiler": "off", // 64 cases
	"react/no-multi-comp": "off", // 61 cases
	"react/only-export-components": "off", // 47 cases
	"react/jsx-no-literals": "off", // 46 cases
	"react/jsx-handler-names": "off", // 39 cases
	"react/no-react-children": "off", // 5 cases
	"react/jsx-no-constructed-context-values": "off", // 3 cases
	"react/no-object-type-as-default-prop": "off", // 2 cases
	// react-perf
	"react-perf/jsx-no-new-function-as-prop": "off", // 135 cases
	"react-perf/jsx-no-new-object-as-prop": "off", // 133 cases
	"react-perf/jsx-no-jsx-as-prop": "off", // 105 cases
	"react-perf/jsx-no-new-array-as-prop": "off", // 23 cases
	// vitest
	"vitest/no-standalone-expect": "off", // 324 cases
	"vitest/prefer-importing-vitest-globals": "off", // 102 cases
	"vitest/require-hook": "off", // 101 cases
	"vitest/no-conditional-in-test": "off", // 93 cases
	"vitest/no-importing-vitest-globals": "off", // 83 cases
	"vitest/prefer-strict-equal": "off", // 40 cases
	"vitest/consistent-test-filename": "off", // 23 cases
	"vitest/prefer-to-have-length": "off", // 12 cases
	"vitest/prefer-to-be-truthy": "off", // 8 cases
	"vitest/prefer-to-be": "off", // 5 cases
	"vitest/max-expects": "off", // 5 cases
	"vitest/require-top-level-describe": "off", // 4 cases
	"vitest/no-hooks": "off", // 3 cases
	"vitest/no-alias-methods": "off", // 3 cases
	"vitest/no-conditional-expect": "off", // 3 cases
	"vitest/prefer-lowercase-title": "off", // 2 cases
	"vitest/prefer-called-once": "off", // 2 cases
	"vitest/prefer-snapshot-hint": "off", // 2 cases
} satisfies DummyRuleMap;

export default defineConfig({
	options: {
		typeAware: true,
		reportUnusedDisableDirectives: "error",
		denyWarnings: true,
	},
	plugins: [
		"eslint",
		"typescript",
		"unicorn",
		"oxc",
		"import",
		"vitest",
		"jsx-a11y",
		"react",
		"react-perf",
		"promise",
		"node",
	],
	categories: {
		correctness: "error",
		suspicious: "error",
		pedantic: "error",
		perf: "error",
		style: "error",
		restriction: "error",
		nursery: "error",
	},
	jsPlugins: [
		{ name: "import-js", specifier: "eslint-plugin-import" },
		{ name: "eslint-js", specifier: "oxlint-plugin-eslint" },
		{
			name: "better-tailwindcss",
			specifier: "eslint-plugin-better-tailwindcss",
		},
		{ name: "@tanstack/router", specifier: "@tanstack/eslint-plugin-router" },
		{ name: "playwright", specifier: "eslint-plugin-playwright" },
		{ name: "package-json", specifier: "eslint-plugin-package-json" },
	],
	env: {
		browser: true,
		es2017: true,
		node: true,
	},
	settings: {
		"import-js/resolver": {
			typescript: {
				project: true,
			},
		},
		"better-tailwindcss": {
			entryPoint: "apps/web/src/app.css",
			callees: ["tv", "cn"],
		},
		react: {
			version: "19.2.0",
		},
	},
	rules: {
		...fromEntries(
			keys(tailwindPlugin.rules).map((key) => [
				`better-tailwindcss/${key}`,
				"error",
			]),
		),
		...tanstackRouterPlugin.configs["flat/recommended"][0]?.rules,
		...packageJson.configs.recommended.rules,
		...overriddenRules,
		...disabledRules,
		...temporaryDisabledRules,
	},
	overrides: [
		{
			files: ["testing/playwright/**/*", "**/__tests__/**"],
			rules: {
				...playwrightPlugin.configs["flat/recommended"].rules,
				"playwright/expect-expect": [
					"error",
					{ assertFunctionNames: ["expectScreenshotWithSchemes"] },
				],
			},
		},
		...((
			[
				[
					"apps/web",
					[
						"vite.config.ts",
						"src/entry/ssr.tsx",
						"vitest.config.ts",
						"**/test.*.ts",
						"**/*.test.ts",
						"**/*.spec.ts",
					],
				],
				["apps/mobile", ["babel.config.js", "metro.config.ts"]],
				["packages/components"],
				["packages/mutations"],
				["packages/queries"],
				["packages/utils"],
				["packages/db", ["scripts/**/*", "**/*.test.ts", "vitest.config.ts"]],
				["packages/app", ["**/*.spec.ts", "**/__tests__/**"]],
				["utils/scripts", true],
				["utils/lint", true],
				["utils/format", true],
				["testing/vitest", true],
				["testing/playwright", true],
			] satisfies Parameters<typeof getExtraneousDependenciesConfig>[]
		).map(([dir, devDependencies]) => ({
			files: [`${dir}/**/*`],
			rules: {
				"import-js/no-extraneous-dependencies": [
					"error",
					getExtraneousDependenciesConfig(dir, devDependencies),
				],
			},
		})) satisfies OxlintOverride[]),
		{
			files: ["packages/components/src/*"],
			rules: {
				"import-js/no-extraneous-dependencies": "off",
			},
		},
		{
			files: ["**/scripts/**/*"],
			rules: {
				"no-console": "off",
				// There's no need to limit us to throwing Errors in node.js env
				"unicorn/no-process-exit": "off",
			},
		},
		{
			files: ["apps/web/src/email/**/*"],
			rules: {
				"better-tailwindcss/no-unknown-classes": "off",
			},
		},
		{
			files: ["apps/web/**/*", "testing/**/*", "**/*.web.ts", "**/*.web.tsx"],
			rules: {
				"react/forbid-elements": "off",
				"no-restricted-globals": "off",
			},
		},
		{
			files: ["packages/db/src/models/*"],
			rules: {
				// DB types are generated via interfaces
				"typescript/consistent-type-definitions": "off",
			},
		},
		{
			files: ["testing/vitest/**", "*.test.ts"],
			rules: {
				"vitest/valid-title": ["error", { allowArguments: true }],
			},
		},
		{
			files: [
				"**/__tests__/**",
				"testing/playwright/**",
				"testing/vitest/**",
				"**/*.spec.ts",
				"**/*.spec.tsx",
			],
			rules: {
				// We use `use` function in Playwright tests which clashes with this rule
				"react/rules-of-hooks": "off",
			},
		},
		{
			files: ["apps/web/src/pages/**"],
			rules: {
				// We use routes in function components that are defined before the component
				"no-use-before-define": "off",
			},
		},
		...restrictedSyntaxRules.map(([file, tags]) => ({
			files: [file],
			rules: {
				"eslint-js/no-restricted-syntax": getNoRestrictedSyntax(...tags),
			},
		})),
	],
	ignorePatterns: [
		".history/",
		".yarn/",
		"**/.output/",
		"**/.vercel/",
		"**/.tanstack/",
		"**/.nitro/",
		"**/.expo/",
		"**/coverage/",
		"**/playwright-report/",
		"**/test-results/",
		"**/*.gen.ts",
		"**/uniwind-types.d.ts",
		"apps/mobile/ios",
		"apps/mobile/android",
	],
});
