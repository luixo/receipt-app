import type { AccountsId, UsersId } from "~db/models";

import type { GeneratorFnWithFaker } from "./utils";

export type GenerateSelfAccount = GeneratorFnWithFaker<{
	accountId: AccountsId;
	email: string;
	avatarUrl: string | undefined;
	userId: UsersId;
	name: string;
}>;

export const defaultGenerateSelfAccount: GenerateSelfAccount = ({ faker }) => {
	const accountId = faker.string.uuid();
	return {
		accountId,
		email: faker.internet.email(),
		avatarUrl: undefined,
		userId: accountId as UsersId,
		name: "Me",
	};
};
