import { useReceiptContext } from "./context";

const useSelfRole = () => {
	const { participants, selfPeerId, ownerPeerId } = useReceiptContext();
	if (selfPeerId === ownerPeerId) {
		return "owner";
	}
	return (
		participants.find((participant) => participant.peerId === selfPeerId)
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
