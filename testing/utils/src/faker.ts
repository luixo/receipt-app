import type { Faker } from "@faker-js/faker";
import { createHash } from "node:crypto";

const HASH_MAGNITUDE = 10 ** 30;

export const setSeed = (instance: Faker, input: string) => {
	instance.seed(
		parseInt(createHash("sha1").update(input).digest("hex"), 16) /
			HASH_MAGNITUDE,
	);
};
