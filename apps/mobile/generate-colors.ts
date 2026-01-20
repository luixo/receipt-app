import fs from "node:fs/promises";
import { entries } from "remeda";

import { dark, light } from "./heroui-override";

type CSSTree = { name: string; content: CSSTree[] } | string;

const mapTheme = (theme: typeof light) =>
	entries(theme).map(([key, value]) => `--heroui-${key}: ${value};`);

const generateTree = (input: CSSTree, indent = ""): string => {
	if (typeof input === "string") {
		return indent + input;
	}
	return [
		`${indent}${input.name} {`,
		...input.content.map((el) => generateTree(el, `${indent}\t`)),
		`${indent}}`,
	].join("\n");
};

const generateVariablesFile = async () => {
	const lines: CSSTree = {
		name: "@layer theme",
		content: [
			{
				name: ":root",
				content: [
					{
						name: "@variant light",
						content: mapTheme(light),
					},
					{
						name: "@variant dark",
						content: mapTheme(dark),
					},
				],
			},
		],
	};
	await fs.writeFile("./variables.css", `${generateTree(lines)}\n`, "utf8");
};

void generateVariablesFile();
