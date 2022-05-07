import { Project, ts } from "ts-morph";

const project = new Project();

const updateVersionNumbers = (input: string): string => {
	const buildNumberParts = input.split(".");
	return [...buildNumberParts]
		.reverse()
		.map((part, index) => {
			if (index !== 0) {
				return part;
			}
			const numPart = Number(part);
			if (isNaN(numPart)) {
				throw new Error("buildNumber property last part is not a number!");
			}
			return String(numPart + 1);
		})
		.reverse()
		.join(".");
};

const main = async () => {
	console.log("Updating dynamic app buildNumber");
	const sourceFile = project.addSourceFileAtPath("./app.config.ts");
	sourceFile
		.getExportAssignmentOrThrow(() => true)
		.transform((control) => {
			const node = control.visitChildren();
			if (ts.isPropertyAssignment(node)) {
				if (node.name.getText() === "buildNumber") {
					const initializer = node.initializer;
					if (ts.isStringLiteral(initializer)) {
						const nextVersion = updateVersionNumbers(initializer.text);
						console.log(`Updated dynamic app buildNumber to ${nextVersion}`);
						return ts.factory.createPropertyAssignment(
							node.name,
							ts.factory.createStringLiteral(nextVersion)
						);
					}
				}
			}
			return node;
		});
	await sourceFile.save();
	console.log("Saved app.config.ts successfully");
};

void main();
