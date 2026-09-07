const TAG_TEMPLATE = `<<<%tag%>>>`;

export const encryptTag = (tag: string) => TAG_TEMPLATE.replace("tag", tag);
export const decryptTag = (message: string) => {
	const match = new RegExp(
		`${TAG_TEMPLATE.replace("tag", "(?<tag>.*)")}(?<message>.*)`,
	).exec(message);
	if (match) {
		return {
			// oxlint-disable-next-line typescript/no-non-null-assertion
			tag: match.groups!.tag!,
			// oxlint-disable-next-line typescript/no-non-null-assertion
			message: match.groups!.message!,
		};
	}
};
