import { procedure as add } from "./add";
import { procedure as get } from "./get";
import { procedure as getAll } from "./get-all";
import { procedure as getAllPeer } from "./get-all-peer";
import { procedure as getByPeerPaged } from "./get-by-peer-paged";
import { procedure as getPeersPaged } from "./get-peers-paged";
import { procedure as remove } from "./remove";
import { procedure as update } from "./update";

export const router = {
	getAll,
	getAllPeer,
	getPeersPaged,
	getByPeerPaged,
	get,
	update,
	remove,
	add,
};
