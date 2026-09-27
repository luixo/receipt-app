import { fromEntries } from "remeda";

import type { CurrencyCode } from "~app/utils/currency";

type Consumer = { peerId: string; part: number };

export const getConsumeAllocation = (
	consumers: Consumer[],
	price: number,
	quantity: number,
	currencyCode: CurrencyCode,
) => {
	const digits =
		new Intl.NumberFormat("en", {
			style: "currency",
			currency: currencyCode,
		}).resolvedOptions().maximumFractionDigits ?? 2;
	const factor = 10 ** digits;
	const total = Math.round(price * quantity * factor);
	const parts = consumers.reduce((sum, consumer) => sum + consumer.part, 0);
	if (!parts || !total) {
		return fromEntries(consumers.map(({ peerId }) => [peerId, 0]));
	}
	const allocations = consumers.map(({ peerId, part }) => {
		const exact = (total * part) / parts;
		return {
			peerId,
			units: Math.floor(exact),
			remainder: exact - Math.floor(exact),
		};
	});
	let remaining =
		total - allocations.reduce((sum, allocation) => sum + allocation.units, 0);
	for (const allocation of allocations.toSorted(
		(a, b) => b.remainder - a.remainder || a.peerId.localeCompare(b.peerId),
	)) {
		if (remaining <= 0) {
			break;
		}
		allocation.units += 1;
		remaining -= 1;
	}
	return fromEntries(
		allocations.map(({ peerId, units }) => [peerId, units / factor]),
	);
};

export const getPartForFraction = (
	consumers: Consumer[],
	peerId: string,
	fraction: number,
) => {
	const others = consumers.reduce(
		(sum, consumer) => sum + (consumer.peerId === peerId ? 0 : consumer.part),
		0,
	);
	if (!others) {
		return null;
	}
	return Math.min(
		10 ** 9 - 1,
		Math.max(
			0.00001,
			Math.round(((others * fraction) / (1 - fraction)) * 1e5) / 1e5,
		),
	);
};
