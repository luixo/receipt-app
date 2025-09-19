const trigramsForWord = (word: string) => {
	const paddedWord = `  ${word} `;
	return paddedWord
		.slice(0, -2)
		.split("")
		.map((_, index) => paddedWord.slice(index, index + 3));
};

const jaccardSize = (a: Set<string>, b: Set<string>) => {
	const intersectionSize = a.intersection(b).size;
	const unionSize = a.union(b).size;
	if (unionSize === 0) {
		return 0;
	}
	return intersectionSize / unionSize;
};

export const trigramsForString = (text: string): Set<string> =>
	new Set(text.toLowerCase().split(" ").flatMap(trigramsForWord));

export const trigramSimilarity = (a: string, b: string) => {
	const trigramsA = trigramsForString(a);
	const trigramsB = trigramsForString(b);
	return jaccardSize(trigramsA, trigramsB);
};

export const wordSimilarity = (a: string, b: string) => {
	const trigramsA = trigramsForString(a);
	const trigramsB = trigramsForString(b);
	const intersectionSize = trigramsA.intersection(trigramsB).size;
	return intersectionSize / trigramsA.size;
};

export const SIMILARTY_THRESHOLD = 0.33;
