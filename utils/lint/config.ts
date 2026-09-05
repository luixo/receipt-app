import tanstackRouterPlugin from "@tanstack/eslint-plugin-router";
import tailwindPlugin from "eslint-plugin-better-tailwindcss";
import { configs as packageJsonConfigs } from "eslint-plugin-package-json";
import playwrightPlugin from "eslint-plugin-playwright";
import htmlTags from "html-tags";
import path from "node:path";
import type { DummyRule, DummyRuleMap, OxlintOverride } from "oxlint";
import { defineConfig } from "oxlint";
import { fromEntries, keys, omit } from "remeda";

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
		from: /~utils\/server.*/,
		message: "Do not import server-side utils from the client",
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
const getSelector = (input: string | RegExp) =>
	input instanceof RegExp
		? `/${input.source.replaceAll("/", String.raw`u002F`)}/`
		: `'${input}'`;
const noRestrictedSyntaxGeneral: NoRestrictedSyntaxElement[] = [
	{
		selector: "JSXAttribute[name.name='data-testid']",
		message: "Use testID from react-native instead",
		omitTags: ["web-only"],
	},
	...restrictedImports.flatMap(({ from, omitTags, ...rest }) => {
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

const restrictedSyntaxRules: [string[], RestrictedTag[]][] = [
	[["**/*"], []],
	// Web-only imports can be used in web app..
	[["apps/web/**/*"], ["web-only"]],
	// ..and in .web files (that also can import other .web files)
	[["**/*.web.ts{,x}"], ["web-only", "strict-web-only"]],
	// Native-only imports can be used in native app..
	[["apps/mobile/**/*"], ["native-only"]],
	// ..and in .web files (that also can import other .web files)
	[["**/*.native.ts{,x}"], ["native-only", "strict-native-only"]],
	// Server code is allowed in these locations
	[
		[
			"apps/web/src/handlers/**/*",
			"apps/web/src/pages/api/**/*",
			"testing/**",
			"apps/bot/src/**/*",
		],
		["client-only"],
	],
];

const overriddenRules = {
	// We assign `ref.current` a lot
	"no-param-reassign": [
		"error",
		{ props: true, ignorePropertyModificationsForRegex: ["ref$", "Ref$"] },
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
	// We use autoFocus on custom components hence we should ignore them (or better list every component it might be passed to)
	"jsx-a11y/no-autofocus": ["error", { ignoreNonDOM: true }],
	"unicorn/explicit-length-check": ["error", { "non-zero": "not-equal" }],
	"unicorn/switch-case-braces": ["error", "avoid"],
	// This number was figured out experimentally
	"unicorn/max-nested-calls": ["error", { max: 5 }],
	"react/jsx-no-literals": [
		"error",
		{
			noAttributeStrings: true,
			noStrings: true,
			ignoreProps: true,
			allowedStrings: ["&nbsp;"],
		},
	],
	"vitest/consistent-test-it": ["error", { fn: "test" }],
} satisfies DummyRuleMap;

const disabledRules = {
	// We see no evil in nested ternaries
	"no-nested-ternary": "off",
	"unicorn/no-nested-ternary": "off",
	// This is guarded by typescript
	"consistent-return": "off",
	// Typescript version is typescript/switch-exhaustiveness-check
	"default-case": "off",
	// We extensively spread props: `<Foo {...props} />`
	"react/jsx-props-no-spreading": "off",
	// Maintained by oxfmt (sortTailwindcss)
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
	// We don't need readonly parameter types
	"typescript/prefer-readonly-parameter-types": "off",
	// Typescript guards us good enough
	"typescript/explicit-function-return-type": "off",
	// I'll spend half my life changing those
	"typescript/strict-boolean-expressions": "off",
	// We use type assertions heavily (but with caution)
	"typescript/no-unsafe-type-assertion": "off",
	// This doesn't fit with us spreading options to the routes
	"@tanstack/router/create-route-property-order": "off",
	// These conflict with vitest/prefer-strict-boolean-matchers
	"vitest/prefer-to-be-falsy": "off",
	"vitest/prefer-to-be-truthy": "off",
	// This conflict with vitest/prefer-called-times
	"vitest/prefer-called-once": "off",
	// We don't need timeouts for every test
	"vitest/require-test-timeout": "off",
	// We don't need to know amount of assertions in every test
	"vitest/prefer-expect-assertions": "off",
	// No idea why it triggers on every expect
	"vitest/no-standalone-expect": "off",
	// This one is not ready for fixtures
	"vitest/prefer-importing-vitest-globals": "off",
	"vitest/no-importing-vitest-globals": "off",
	// This one does a bad job calculating what a hook is
	"vitest/require-hook": "off",
	// There are so many valid cases for conditionals in tests
	"vitest/no-conditional-in-test": "off",
	// This one conflicts with other similar rules
	"vitest/prefer-to-be": "off",
	// We want to run as many expects as needed
	"vitest/max-expects": "off",
	// We need before/after hooks
	"vitest/no-hooks": "off",
	// It's used only once and it false positives
	"vitest/prefer-snapshot-hint": "off",
	// We'll do titles ourselves
	"vitest/prefer-lowercase-title": "off",
	// Oxfmt lowercases hex numbers
	"unicorn/number-literal-case": "off",
	// Turn back on in case we introduce LTR layout
	"better-tailwindcss/enforce-logical-properties": "off",
	// This doesn't work out good with formatter
	"better-tailwindcss/enforce-consistent-line-wrapping": "off",
	// This creates more problem that solves
	"unicorn/prefer-spread": "off",
	// There are too many false positives
	"unicorn/no-useless-undefined": "off",
	// There are false positives on `z.foo().catch()`
	"unicorn/prefer-top-level-await": "off",
	// There's no particular reason not to use `window`
	"unicorn/prefer-global-this": "off",
	// We've got typescript for that
	"unicorn/no-array-callback-reference": "off",
	// No way we're not using reduce
	"unicorn/no-array-reduce": "off",
	// We're going to be using null literals
	"unicorn/no-null": "off",
	// There are false positives on `z.foo().catch()`
	"promise/prefer-await-to-then": "off",
	// There are no good usecases for that, all callbacks are valid
	"promise/prefer-await-to-callbacks": "off",
	// No idea why do we need that
	"import/unambiguous": "off",
	// When we don't assign import module a variable, we mean that
	"import/no-unassigned-import": "off",
	// There are a lot of proper usecases of namespace imports
	"import/no-namespace": "off",
	// We'll care about that ourselves
	"import/max-dependencies": "off",
	"import/no-relative-parent-imports": "off",
	// We prefer named exports
	"import/prefer-default-export": "off",
	"import/no-named-export": "off",
	// We export inline
	"import/exports-last": "off",
	"import/group-exports": "off",
	// These all should be addressed by React Compiler
	"react-perf/jsx-no-new-function-as-prop": "off",
	"react-perf/jsx-no-new-object-as-prop": "off",
	"react-perf/jsx-no-jsx-as-prop": "off",
	"react-perf/jsx-no-new-array-as-prop": "off",
	"react/no-object-type-as-default-prop": "off",
	// We'll manage these
	"react/jsx-handler-names": "off",
	// There's a forbid syntax rule for that
	"react/forbid-component-props": "off",
	// They say fast refresh won't work with these errors. Ok.
	"react/only-export-components": "off",
	// No need for that
	"react/jsx-filename-extension": "off",
	// I guess we're going to decide how many components file can hold
	"react/no-multi-comp": "off",
	// Compilers know how to manage this
	"react/react-in-jsx-scope": "off",
	// No problem with that
	"react/jsx-max-depth": "off",
	// This will probably be split amongst many rules later, for now it's a mess
	"react/react-compiler": "off",
	// We definitely want to use these features
	"oxc/no-async-await": "off",
	"oxc/no-rest-spread-properties": "off",
	"oxc/no-optional-chaining": "off",
	// This is not particulary good, but on out scale it doesn't matter
	"oxc/no-accumulating-spread": "off",
	"oxc/no-map-spread": "off",
	// This is too much at the moment
	"eslint/sort-keys": "off",
	// We use a lot of sensible magic numbers
	"eslint/no-magic-numbers": "off",
	// It took more time to fight it than to turn it off
	"eslint/id-length": "off",
	// We love ternaries
	"eslint/no-ternary": "off",
	// No need to control that
	"eslint/max-lines-per-function": "off",
	"eslint/max-lines": "off",
	"eslint/max-statements": "off",
	"eslint/max-params": "off",
	// ...
	"eslint/no-undefined": "off",
	// We don't care that much
	"eslint/capitalized-comments": "off",
	"eslint/no-inline-comments": "off",
	// False positives for type imports
	"eslint/no-duplicate-imports": "off",
	// Controlled by `typescript/require-await`
	"eslint/require-await": "off",
	// We don't do much regexping
	"eslint/require-unicode-regexp": "off",
	// TODO: fix this one
	"eslint/no-warning-comments": "off",
	// Why even?
	"eslint/no-continue": "off",
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
		...packageJsonConfigs.recommended.rules,
		...overriddenRules,
		...disabledRules,
	},
	overrides: [
		{
			files: ["testing/playwright/**/*", "**/__tests__/**"],
			rules: {
				...playwrightPlugin.configs["flat/recommended"].rules,
				"playwright/expect-expect": [
					"error",
					{
						assertFunctionNames: [
							"expectScreenshotWithSchemes",
							"snapshotQueries",
						],
					},
				],
			},
		},
		...((
			[
				[
					"apps/web",
					[
						"vite.config.ts",
						"vitest.config.ts",
						"**/test.*.ts",
						"**/*.test.ts",
						"**/*.spec.ts",
					],
				],
				["apps/bot"],
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
				["testing/utils", true],
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
			files: ["apps/mobile/**/*", "**/*.native.ts", "**/*.native.tsx"],
			rules: {
				// There are no tags in native environment
				"jsx-a11y/prefer-tag-over-role": "off",
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
			files: ["**/*.spec.ts"],
			rules: {
				// Playwright tests don't need vitest rules
				"vitest/consistent-test-filename": "off",
			},
		},
		{
			files: ["**/__tests__/**", "testing/playwright/**", "testing/vitest/**"],
			rules: {
				// We use `use` function in Playwright tests which clashes with this rule
				"react/rules-of-hooks": "off",
			},
		},
		{
			files: [
				"**/__tests__/**",
				"testing/utils/**",
				"testing/playwright/**",
				"testing/vitest/**",
				"**/*.test.ts",
				"**/config.ts",
				"**/*.config.ts",
				"utils/scripts/**",
				"apps/bot/src/**",
				"apps/web/src/handlers/**",
				"apps/web/src/pages/api/**",
				"apps/mobile/update-version.ts",
				"apps/mobile/generate-colors.ts",
				"packages/db/migration/**",
				"packages/utils/src/server/**",
			],
			rules: {
				// These are packages that allow server-side code
				"import/no-nodejs-modules": "off",
			},
		},
		{
			files: ["apps/web/src/pages/**"],
			rules: {
				// We use routes in function components that are defined before the component
				"no-use-before-define": "off",
			},
		},
		{
			files: [
				"apps/web/src/pages/**",
				"apps/mobile/app/**",
				"**/config.ts",
				"**/*.config.ts",
				"**/*.config.js",
				"**/*.setup.ts",
				"apps/web/src/entry/server.tsx",
				"apps/mobile/heroui-override.ts",
				"apps/mobile/heroui.ts",
				"packages/app/heroui.ts",
				"testing/playwright/server-reporter.ts",
				"testing/playwright/global/**",
			],
			rules: {
				// We have to export default exports in pages
				"import/no-default-export": "off",
			},
		},
		{
			files: [
				"**/*.config.ts",
				"testing/**/*",
				"apps/mobile/**/*",
				"utils/scripts/**",
			],
			rules: {
				"node/no-process-env": "off",
			},
		},
		{
			files: ["packages/app/features/playground/playground-screen.tsx"],
			rules: {
				// Maybe remove these later
				"react/jsx-no-literals": "off",
			},
		},
		...restrictedSyntaxRules.map(([files, tags]) => ({
			files,
			rules: {
				"eslint-js/no-restricted-syntax": getNoRestrictedSyntax(...tags),
			},
		})),
	],
	ignorePatterns: [
		".history/",
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
