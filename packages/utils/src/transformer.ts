import { SuperJSON } from "superjson";

const superJSONInstance = new SuperJSON({ dedupe: true });
export const transformer = {
	serialize: superJSONInstance.serialize.bind(superJSONInstance),
	deserialize: superJSONInstance.deserialize.bind(superJSONInstance),
};
export type TransformerResult = ReturnType<
	(typeof superJSONInstance)["serialize"]
>;
