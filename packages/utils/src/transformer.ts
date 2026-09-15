import { keys } from "remeda";
import { SuperJSON } from "superjson";

import type { TemporalMapping } from "~utils/temporal";

const superJSONInstance = new SuperJSON({ dedupe: true });
const temporalEntries = {
	plainTime: Temporal.PlainTime,
	plainDate: Temporal.PlainDate,
	plainDateTime: Temporal.PlainDateTime,
	zonedDateTime: Temporal.ZonedDateTime,
} satisfies Record<keyof TemporalMapping, unknown>;
for (const key of keys(temporalEntries)) {
	const Class = temporalEntries[key];
	superJSONInstance.registerCustom<
		TemporalMapping[keyof TemporalMapping],
		string
	>(
		{
			isApplicable: (input): input is TemporalMapping[typeof key] =>
				input instanceof Class,
			serialize: (input) => input.toString(),
			deserialize: (input) => {
				switch (key) {
					case "plainTime":
						return Temporal.PlainTime.from(input);
					case "plainDate":
						return Temporal.PlainDate.from(input);
					case "plainDateTime":
						return Temporal.PlainDateTime.from(input);
					case "zonedDateTime":
						return Temporal.ZonedDateTime.from(input);
				}
			},
		},
		key,
	);
}
export const transformer = {
	serialize: superJSONInstance.serialize.bind(superJSONInstance),
	deserialize: superJSONInstance.deserialize.bind(superJSONInstance),
};
export type TransformerResult = ReturnType<
	(typeof superJSONInstance)["serialize"]
>;
