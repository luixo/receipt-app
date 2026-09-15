import { Temporal } from "@js-temporal/polyfill";

/* c8 ignore start */
if (!("Temporal" in globalThis)) {
	(globalThis as unknown as { Temporal: typeof Temporal }).Temporal = Temporal;
}
/* c8 ignore stop */
