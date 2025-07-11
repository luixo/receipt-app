import { keys } from "remeda";
import { SuperJSON } from "superjson";

import type { TemporalMapping } from "~utils/date";
import {
	deserialize as deserializeDate,
	isTemporalObject,
	serialize as serializeDate,
	temporalSchemas,
} from "~utils/date";

const superJSONInstance = new SuperJSON({ dedupe: true });
keys(temporalSchemas).forEach((key) => {
	superJSONInstance.registerCustom<
		TemporalMapping[keyof TemporalMapping],
		string
	>(
		{
			isApplicable: (input): input is TemporalMapping[typeof key] =>
				isTemporalObject(input) && input.type === key,
			serialize: serializeDate,
			deserialize: (input) => {
				const deserializedData = deserializeDate(input);
				if (!deserializedData) {
					throw new Error(`Could not deserialize date "${input}"`);
				}
				return deserializedData;
			},
		},
		key,
	);
});
export const transformer = {
	serialize: superJSONInstance.serialize.bind(superJSONInstance),
	deserialize: superJSONInstance.deserialize.bind(superJSONInstance),
};
export type TransformerResult = ReturnType<
	(typeof superJSONInstance)["serialize"]
>;
