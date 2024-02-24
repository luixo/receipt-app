import type { Faker } from "@faker-js/faker";

export type Amount = number | { min: number; max: number };
export const generateAmount = (faker: Faker, amount: Amount) =>
	typeof amount === "number"
		? amount
		: amount.min + faker.number.int(amount.max - amount.min);
