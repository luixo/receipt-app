import type { AccountId, PeerId } from "~db/ids";

import type { GeneratorFnWithAmount } from "./utils";
import { generateAmount } from "./utils";

export type GeneratePeers = GeneratorFnWithAmount<{
	id: PeerId;
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

export const defaultGeneratePeers = ({
	faker,
	amount = { min: 3, max: 6 },
}: Parameters<GeneratePeers>[0]): ReturnType<GeneratePeers> =>
	generateAmount(faker, amount, () => ({
		id: faker.string.uuid(),
		name: faker.person.fullName(),
		publicName: undefined,
		connectedAccount: undefined,
	}));
