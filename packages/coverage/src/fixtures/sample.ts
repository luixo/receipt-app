export const pick = (value: number, fallback = 10) => {
	if (value > 5) {
		return "big";
	}
	// Braceless branches have different V8 ranges than blocks
	// oxlint-disable-next-line curly
	if (value < 0) return "negative";
	// oxlint-disable-next-line curly
	else if (value === 0) return "zero";
	const label = value % 2 ? "odd" : "even";
	return (label === "odd" && fallback > 5) || label;
};

export const curried = (a: number) => (b: number) => a + b;

export const neverCalled = () => "never";

const lazy = () => String(Math.random());

export class Box {
	private readonly label = "box";

	public static create() {
		return new Box();
	}

	public unused() {
		return [this.label, lazy()].join(" ");
	}
}

export const kind = (input: string) => {
	switch (input) {
		case "a":
		case "b":
			return 1;
		default:
			return 2;
	}
};

// V8 cuts the continuation range after `return` at the ternary,
// the rest of the function should not be reported as covered
export const earlyExit = (value: boolean, suffix?: string) => {
	if (value) {
		return "early";
	}
	const label = suffix === undefined ? "none" : suffix;
	return label.toUpperCase();
};

const cleanup = () => {
	(globalThis as Record<string, unknown>).cleaned = true;
};

// Continuation after `throw` ends with the `try` block, `finally` runs anyway
export const guarded = (fail: boolean) => {
	try {
		if (fail) {
			throw new Error("fail");
		}
		return "ok";
	} catch {
		return "caught";
	} finally {
		cleanup();
	}
};

// V8 doesn't report functions nested in a function that never ran,
// bundlers may inline them - either way the declaration never ran
export const neverRuns = (name: string) => {
	const inner = () => name;
	return inner;
};

// Bundlers inline single-use constants, so the declaration has no generated code
export const inlined = (value: number) => {
	const defaults = {};
	return JSON.stringify([defaults, value]);
};
