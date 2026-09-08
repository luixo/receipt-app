import { procedure as cleanup } from "./cleanup";
import { procedure as isBotAuthorized } from "./is-bot-authorized";
import { procedure as linkBot } from "./link-bot";

export const router = {
	cleanup,
	isBotAuthorized,
	linkBot,
};
