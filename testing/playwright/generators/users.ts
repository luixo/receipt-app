import type { AccountsId, UsersId } from "~db/models";

import type { GeneratorFnWithAmount } from "./utils";
import { generateAmount } from "./utils";

export type GenerateUsers = GeneratorFnWithAmount<{
	id: UsersId;
	name: string;
	publicName: string | undefined;
	connectedAccount:
		| {
				id: AccountsId;
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
