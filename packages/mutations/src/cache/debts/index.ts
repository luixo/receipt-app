import { getUpdaters } from "../utils";

import * as get from "./get";
import * as getAll from "./get-all";
import * as getAllPeer from "./get-all-peer";
import * as getByPeerPaged from "./get-by-peer-paged";
import * as getIntentions from "./get-intentions";
import * as getPeersPaged from "./get-peers-paged";

export const { updateRevert, update } = getUpdaters({
	get,
	getAll,
	getAllPeer,
	getPeersPaged,
	getByPeerPaged,
	getIntentions,
});
