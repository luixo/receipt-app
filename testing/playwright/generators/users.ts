import type { AccountId, UserId } from "~db/ids";

import type { GeneratorFnWithAmount } from "./utils";
import { generateAmount } from "./utils";

export type GenerateUsers = GeneratorFnWithAmount<{
	id: UserId;
	name: string;
	publicName: string | undefined;
	connectedAccount:
		| {
				id: AccountId;
				email: string;
				avatarUrl?: string;
		  }
		| undefined;
}>;

export const defaultGenerateUsers = ({
	faker,
	amount = { min: 3, max: 6 },
}: Parameters<GenerateUsers>[0]): ReturnType<GenerateUsers> =>
	generateAmount(faker, amount, () => ({
		id: faker.string.uuid(),
		name: faker.person.fullName(),
		publicName: undefined,
		connectedAccount: undefined,
	}));
