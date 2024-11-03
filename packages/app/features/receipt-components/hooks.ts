import { useReceiptContext } from "./context";

const useSelfRole = () => {
	const { participants, selfUserId } = useReceiptContext();
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
