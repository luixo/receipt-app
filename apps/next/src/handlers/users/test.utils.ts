import type { z } from "zod";

import type {
	insertAccount,
	insertConnectedUsers,
	insertUser,
} from "@tests/backend/utils/data";
import type { userItemSchema } from "app/utils/validation";

export const mapUserToSuggestResult = (
	users: (
		| Awaited<ReturnType<typeof insertUser>>
		| Awaited<ReturnType<typeof insertConnectedUsers>>[number]
	)[],
	accounts: Pick<Awaited<ReturnType<typeof insertAccount>>, "id" | "email">[],
) =>
	users.map((user) => {
		let connectedAccount: z.infer<typeof userItemSchema>["connectedAccount"];
		if ("connectedAccountId" in user) {
			const account = accounts.find(({ id }) => id === user.connectedAccountId);
			if (!account) {
				throw new Error(
					`Expected to have an account to match a connected id ${user.connectedAccountId}`,
				);
			}
			connectedAccount = {
				id: account.id,
				email: account.email,
			};
		}
		return {
			id: user.id,
			name: user.name,
			publicName: user.publicName,
			connectedAccount,
		};
	});
