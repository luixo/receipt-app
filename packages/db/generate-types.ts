import { writeFile } from "node:fs/promises";
import Module from "node:module";
import typescript from "typescript-codegen";

// kysely-codegen uses the TypeScript 5 parser API, which TypeScript 7 removed.
type Load = (
	request: string,
	parent: NodeJS.Module | undefined,
	isMain: boolean,
) => unknown;
const loader = Module as unknown as { _load: Load };
// oxlint-disable-next-line eslint/no-underscore-dangle
const load = loader._load;
// oxlint-disable-next-line eslint/no-underscore-dangle
loader._load = (request, parent, isMain) => {
	if (
		request === "typescript" &&
		parent?.filename.includes("/kysely-codegen/")
	) {
		return typescript;
	}
	return load.call(Module, request, parent, isMain);
};

try {
	const [{ Cli }, { default: config }] = await Promise.all([
		import("kysely-codegen"),
		import("./kysely-codegen.config.ts"),
	]);
	const output = await new Cli().run({ config });
	// Preserve the existing enum casing and defaulted role type.
	if (
		!output.includes("export type Receiptrole =") ||
		!output.includes("role: Receiptrole;")
	) {
		throw new Error("Unexpected receipt role type in generated output.");
	}
	await writeFile(
		new URL("src/types.gen.ts", import.meta.url),
		output
			.replaceAll("Receiptrole", "ReceiptRole")
			.replace("role: ReceiptRole;", "role: Generated<ReceiptRole>;"),
	);
} finally {
	// oxlint-disable-next-line eslint/no-underscore-dangle
	loader._load = load;
}
