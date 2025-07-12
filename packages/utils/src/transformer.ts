import { keys } from "remeda";
import { SuperJSON } from "superjson";

import type { TemporalMapping } from "~utils/date";
import {
	deserialize as deserializeDate,
	serialize as serializeDate,
	temporalClasses,
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
				input instanceof temporalClasses[key],
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
