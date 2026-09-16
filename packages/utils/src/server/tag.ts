const TAG_DELIMITER = "\u001F";

export const encryptTag = (tag: string) =>
	`${TAG_DELIMITER}${tag}${TAG_DELIMITER}`;
export const decryptTag = (message: string) => {
	const parts = message.split(TAG_DELIMITER);
	if (parts.length >= 3) {
		return { tag: parts[1], message: parts.slice(2).join(TAG_DELIMITER) };
	}
};
