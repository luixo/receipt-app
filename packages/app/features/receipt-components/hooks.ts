import { useReceiptContext } from "./context";

const useSelfRole = () => {
	const { participants, selfUserId, ownerUserId } = useReceiptContext();
	if (selfUserId === ownerUserId) {
		return "owner";
	}
	return (
		participants.find((participant) => participant.userId === selfUserId)
			?.role ?? "owner"
	);
};

export const useCanEdit = () => {
	const selfRole = useSelfRole();
	return selfRole !== "viewer";
};

export const useIsOwner = () => {
	const selfRole = useSelfRole();
	return selfRole === "owner";
};
