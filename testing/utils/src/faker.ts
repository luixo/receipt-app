import { createHash } from "node:crypto";

import type { ExtendedFaker } from "~tests/frontend/fixtures/mock";

const HASH_MAGNITUDE = 10 ** 30;

export const setSeed = (instance: ExtendedFaker, input: string) => {
	instance.seed(
		parseInt(createHash("sha1").update(input).digest("hex"), 16) /
			HASH_MAGNITUDE,
	);
};
