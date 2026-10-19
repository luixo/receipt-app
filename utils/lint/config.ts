import { getLintConfig } from "@oxiul/configs";
import htmlTags from "html-tags";
import type { DummyRule } from "oxlint";
import { omit } from "remeda";

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
		message: "Please use granular exports from heroui-native",
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
		from: /~coverage.*/,
		message: "Do not import coverage tools from the client",
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
		selector:
			// oxlint-disable-next-line eslint-js/no-restricted-syntax -- The rule must name the forbidden attribute.
			"Literal[value=/data-slot/], TemplateElement[value.raw=/data-slot/], JSXAttribute[name.name='data-slot']",
		message:
			// oxlint-disable-next-line eslint-js/no-restricted-syntax -- The diagnostic must name the forbidden attribute.
			"Do not use data-slot; use semantic locators such as getByRole or explicit test IDs (getByTestId).",
	},
	{
		selector:
			"Literal[value=/xpath[ ]*=/], TemplateElement[value.raw=/xpath[ ]*=/]",
		message:
			"Do not use XPath selectors; use semantic locators such as getByRole or explicit test IDs (getByTestId).",
	},
	{
		selector: String.raw`CallExpression[callee.property.name=/^(locator|\$|\$\$|waitForSelector)$/] > Literal[value=/^[ ]*[(]*[.]?\u002F\u002F|^[ ]*[.][.](?:\u002F|$)/], CallExpression[callee.property.name=/^(locator|\$|\$\$|waitForSelector)$/] > TemplateLiteral > TemplateElement[value.raw=/^[ ]*[(]*[.]?\u002F\u002F|^[ ]*[.][.](?:\u002F|$)/]`,
		message:
			"Do not use XPath selectors; use semantic locators such as getByRole or explicit test IDs (getByTestId).",
	},
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
			const actualExpression = `ImportSpecifier[local.name=${importSelector}]`;
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
		selector: "MemberExpression[object.name='page'][property.name='goto']",
		message: "Use page.navigate instead of page.goto",
	},
	{
		selector:
			"MemberExpression[object.callee.name='expect'][object.arguments.0.name='page'][property.name='toHaveURL']",
		message: "Use page.navigate instead of page.goto",
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
			"apps/web/src/entry/server.tsx",
			"apps/web/src/email/**/*",
			"testing/**",
			"utils/**",
		],
		["client-only"],
	],
];

export const config = getLintConfig({
	tailwind: {
		entryPoint: "apps/web/src/app.css",
	},
	tanstackRouter: {
		routes: ["apps/web/src/pages/**"],
	},
	packageJson: true,
	playwright: {
		files: ["testing/playwright/**/*", "**/__tests__/**"],
		assertFunctionNames: [
			"expectScreenshotWithSchemes",
			"expectBodyScreenshot",
			"snapshotQueries",
			"expectUrl",
			"page.expectUrl",
		],
	},
	jsPlugins: [{ name: "eslint-js", specifier: "oxlint-plugin-eslint" }],
	env: {
		node: true,
	},
	ignorePatterns: [
		"**/.output/",
		"**/.expo/",
		"testing/*/coverage/",
		"**/playwright-report/",
		"**/test-results/",
		"**/uniwind-types.d.ts",
		"apps/mobile/ios",
		"apps/mobile/android",
	],
	restricted: {
		globals: [
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
		properties: [
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
	},
	react: {
		allowedStrings: ["&nbsp;"],
		additionalHooks: ["useWindowSizeChange"],
		banMemo: true,
	},
	i18n: {
		ignore: ["packages/app/features/playground/**/*"],
	},
	vitest: {
		files: ["testing/vitest/**", "**/*.test.ts"],
	},
	serverSide: {
		files: [
			"**/__tests__/**",
			"testing/utils/**",
			"testing/playwright/**",
			"testing/vitest/**",
			"**/*.test.ts",
			"utils/scripts/**",
			"apps/web/src/handlers/**",
			"apps/web/src/pages/api/**",
			"apps/web/src/utils/server/**",
			"apps/web/src/entry/server.tsx",
			"apps/mobile/update-version.ts",
			"apps/mobile/generate-colors.ts",
			"packages/db/migration/**",
			"packages/utils/src/server/**",
			"packages/coverage/**",
			".opencode/**",
		],
		allowConsole: ["**/scripts/**/*"],
		allowProcess: [
			"**/*.config.ts",
			"testing/**/*",
			"apps/mobile/**/*",
			"utils/**",
		],
	},
	import: {
		allowDefault: [
			"apps/web/src/pages/**",
			"apps/mobile/app/**",
			"apps/web/src/entry/server.tsx",
			"apps/mobile/src/heroui-override.ts",
			"apps/mobile/src/heroui.ts",
			"packages/app/heroui.ts",
			"testing/vitest/global.setup.ts",
			"testing/playwright/server-reporter.ts",
			"testing/playwright/global/**",
		],
		banBarrel: true,
	},
	rules: {
		// Unfortunately, this rule fails on spreading function result
		"@tanstack/router/create-route-property-order": "off",
		// Migrate later, we don't have RTL right now
		"better-tailwindcss/enforce-logical-properties": "off",
		// There are too many magic numbers in the project
		"eslint/no-magic-numbers": "off",
		// That's too many keys to sort right now
		"eslint/sort-keys": "off",
		// We don't really need this unicode-specific stuff in regexps
		"eslint/require-unicode-regexp": "off",
		// If we call await on top-level - that's intended
		"node/no-top-level-await": "off",
		// If we supress the rule - we know what we are doing
		"react/rule-suppression": "off",
		// Unfortunately, it's a group of rules and we can't turn it off one-by-one
		"react/hooks": "off",
		// There's a false positive in `z.foo().catch(...)`
		"unicorn/prefer-top-level-await": "off",

		// We assign `ref.current` a lot
		"no-param-reassign": [
			"error",
			{ props: true, ignorePropertyModificationsForRegex: ["ref$", "Ref$"] },
		],
		// We use autoFocus on custom components hence we should ignore them (or better list every component it might be passed to)
		"jsx-a11y/no-autofocus": ["error", { ignoreNonDOM: true }],
		// We don't want `next` to trigger this rule
		"node/callback-return": ["error", ["callback", "cb"]],
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
	},
	overrides: [
		{
			files: ["apps/web/src/email/**/*"],
			rules: {
				// Email uses react-email which uses a different set of classes (for now)
				"better-tailwindcss/no-unknown-classes": "off",
			},
		},
		{
			files: ["apps/web/**/*", "testing/**/*", "**/*.web.ts", "**/*.web.tsx"],
			rules: {
				// We use tags in these elements
				"react/forbid-elements": "off",
				// We use `document` and `window` in these files
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
			files: ["packages/mutations/src/**"],
			rules: {
				// We just use them there, maybe migrate some day
				"import/no-relative-parent-imports": "off",
			},
		},
		...restrictedSyntaxRules.map(([files, tags]) => ({
			files,
			rules: {
				"eslint-js/no-restricted-syntax": getNoRestrictedSyntax(...tags),
			},
		})),
		{
			files: ["**/*.spec.ts", "**/__tests__/**/*.{ts,tsx}"],
			rules: {
				"eslint-js/no-restricted-syntax": [
					"error",
					...noRestrictedSyntaxGeneral.map(omit(["omitTags"])),
					{
						selector: "Literal[value=/.-icon$/]",
						message:
							"Use the `icon` locator instead of an icon test ID literal.",
					},
					{
						selector: "TemplateElement[value.raw=/-icon$/]",
						message:
							"Use the `icon` locator instead of an icon test ID template.",
					},
				],
			},
		},
	],
});
