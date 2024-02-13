import { trpc } from "app/trpc";
import type { UsersId } from "next-app/db/models";

export const useUserName = (userId: UsersId | undefined, isOwner: boolean) => {
	const userQuery = trpc.users.get.useQuery(
		{ id: userId || "unknown" },
		{ enabled: isOwner && Boolean(userId) },
	);
	const foreignUserQuery = trpc.users.getForeign.useQuery(
		{ id: userId || "unknown" },
		{ enabled: !isOwner && Boolean(userId) },
	);
	return (
		(isOwner ? userQuery.data?.name : foreignUserQuery.data?.name) || "..."
	);
};
