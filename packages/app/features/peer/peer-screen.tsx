import React from "react";

import { NavigationContext } from "~app/contexts/navigation-context";
import { getPathHooks } from "~app/utils/navigation";

import { Peer } from "./peer";

export const PeerScreen = () => {
	const { useNavigate } = React.use(NavigationContext);
	const { useParams } = getPathHooks("/_protected/peers/$id");
	const { id } = useParams();
	const navigate = useNavigate();

	const onPeerRemove = React.useCallback(() => {
		navigate({ to: "/peers", replace: true });
	}, [navigate]);

	return <Peer id={id} onRemove={onPeerRemove} />;
};
