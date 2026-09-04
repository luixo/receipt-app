import { getLocalTimeZone, today } from "@internationalized/date";
import { createTRPCClient, httpLink } from "@trpc/client";

import type { AppRouter } from "~app/trpc";
import type { ReceiptId } from "~db/ids";
import { getNow } from "~utils/date";
import { transformer } from "~utils/transformer";

const BASE_URL = process.env.SEED_BASE_URL ?? "http://localhost:3000";

const RECEIPT_NAMES = [
	"Grocery run",
	"Coffee with friends",
	"Hardware store",
	"Movie night",
	"Pharmacy",
	"Gas station",
	"Bookstore",
	"Farmers market",
	"Electronics shop",
	"Pizza night",
	"Bike repair",
	"Office supplies",
];

let cookie: string | undefined = undefined;

const client = createTRPCClient<AppRouter>({
	links: [
		httpLink({
			url: `${BASE_URL}/api/trpc`,
			transformer,
			fetch: async (url, init) => {
				const headers = new Headers(init?.headers);
				if (cookie) {
					headers.set("cookie", cookie);
				}
				const response = await fetch(url, { ...init, headers });
				const setCookie = response.headers.get("set-cookie");
				if (setCookie) {
					[cookie] = setCookie.split(";");
				}
				return response;
			},
		}),
	],
});

const email = `tanstack-db-spike-${getNow.zonedDateTime().toDate().getTime()}@example.com`;
const password = "Sup3rSecret!1";

const registerResult = await client.auth.register.mutate({
	email,
	password,
	name: "TanStack DB Spike",
});
console.log("Registered account", email, registerResult.account.id);

const zone = getLocalTimeZone();
const base = today(zone);
const receiptIds: ReceiptId[] = [];
for (const [index, name] of RECEIPT_NAMES.entries()) {
	const issued = base.subtract({ days: index });
	// eslint-disable-next-line no-await-in-loop
	const added = await client.receipts.add.mutate({
		name,
		currencyCode: "USD",
		issued,
	});
	receiptIds.push(added.id);
	console.log("Added receipt", added.id, name);
}

const contact = await client.users.add.mutate({ name: "Jamie Contact" });
console.log("Added local contact user", contact.id);

const [firstReceiptId] = receiptIds;
if (firstReceiptId) {
	const debt = await client.debts.add.mutate({
		note: "Shared groceries",
		currencyCode: "USD",
		userId: contact.id,
		amount: 42.5,
		receiptId: firstReceiptId,
	});
	console.log("Added debt", debt.id, "tied to receipt", firstReceiptId);
}

console.log(`Done. Login with email=${email} password=${password}`);
console.log(`Cookie: ${cookie}`);
console.log(`First receipt id: ${firstReceiptId}`);
