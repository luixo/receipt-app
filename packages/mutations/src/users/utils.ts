export const getUsersText = (variablesSet: { name: string }[]) =>
	variablesSet.map((variables) => `"${variables.name}"`).join(", ");
