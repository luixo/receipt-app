export const getReceiptTexts = (variablesSet: { name: string }[]) =>
	variablesSet.map((variables) => `"${variables.name}"`).join(", ");
