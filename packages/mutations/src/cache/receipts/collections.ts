import { createCollection } from "@tanstack/db";
import {
	parseLoadSubsetOptions,
	queryCollectionOptions,
} from "@tanstack/query-db-collection";
import type { QueryClient } from "@tanstack/react-query";

import type { TRPCQueryInput, TRPCQueryOutput, Utils } from "~app/trpc";
import type { ReceiptId } from "~db/ids";

export type ReceiptListItem =
	TRPCQueryOutput<"receipts.getPaged">["items"][number] & { rank: number };

export type ReceiptListParams = Pick<
	TRPCQueryInput<"receipts.getPaged">,
	"orderBy" | "filters"
>;

export type ReceiptDetail = TRPCQueryOutput<"receipts.get">;

const listCollectionsByClient = new WeakMap<
	QueryClient,
	Map<string, ReturnType<typeof createListCollection>>
>();
const detailCollectionsByClient = new WeakMap<
	QueryClient,
	ReturnType<typeof createDetailCollection>
>();

const createListCollection = (
	queryClient: QueryClient,
	trpc: Utils,
	params: ReceiptListParams,
) =>
	createCollection(
		queryCollectionOptions({
			id: "receipts-list",
			queryKey: ["receipts-list", params],
			queryClient,
			getKey: (item: ReceiptListItem) => item.id,
			// `limit` omitted -- the server returns every matching row in one
			// call (see `apps/web/src/handlers/receipts/get-paged.ts`).
			queryFn: async () => {
				const response = await queryClient.fetchQuery(
					trpc.receipts.getPaged.queryOptions({
						cursor: 0,
						orderBy: params.orderBy,
						filters: params.filters,
					}),
				);
				return response.items.map((item, index) => ({
					...item,
					rank: index,
				}));
			},
		}),
	);

const createDetailCollection = (queryClient: QueryClient, trpc: Utils) =>
	createCollection(
		queryCollectionOptions({
			id: "receipt-detail",
			syncMode: "on-demand",
			queryClient,
			getKey: (receipt: ReceiptDetail) => receipt.id,
			// A stable synthetic prefix -- every derived key must extend the base
			// key (queryKey(undefined)), which tRPC's own queryKey() does NOT do
			// (its `{input:{}}` base isn't a prefix of `{input:{id}}` per-id keys).
			// SSR reuse still happens: the queryFn below calls `fetchQuery` with
			// tRPC's *own* queryKey internally, which is what actually lands on
			// the SSR-prefetched cache entry from `receipts/$id.tsx`'s loader.
			//
			// The base key (queryKey(undefined), no filter) must be a strict,
			// shorter prefix of every derived key -- append the id rather than
			// filling a fixed slot with it, or a `null` placeholder there reads
			// as a sibling key, not an extension of the base.
			queryKey: (opts) => {
				const { filters } = parseLoadSubsetOptions(opts);
				const idFilter = filters.find(
					(filter) =>
						filter.field.join(".") === "id" && filter.operator === "eq",
				);
				const key: unknown[] = ["receipt-detail"];
				if (idFilter) {
					key.push(idFilter.value);
				}
				return key;
			},
			queryFn: async (ctx) => {
				const { filters } = parseLoadSubsetOptions(ctx.meta?.loadSubsetOptions);
				const idFilter = filters.find(
					(filter) =>
						filter.field.join(".") === "id" && filter.operator === "eq",
				);
				if (!idFilter) {
					throw new Error(
						"receipt-detail collection requires a where(id) filter",
					);
				}
				const receipt = await queryClient.fetchQuery(
					trpc.receipts.get.queryOptions({ id: idFilter.value as ReceiptId }),
				);
				return [receipt];
			},
		}),
	);

export const getReceiptsListCollection = (
	queryClient: QueryClient,
	trpc: Utils,
	params: ReceiptListParams,
) => {
	let byParams = listCollectionsByClient.get(queryClient);
	if (!byParams) {
		byParams = new Map();
		listCollectionsByClient.set(queryClient, byParams);
	}
	const paramsKey = JSON.stringify(params);
	const existing = byParams.get(paramsKey);
	if (existing) {
		return existing;
	}
	const created = createListCollection(queryClient, trpc, params);
	byParams.set(paramsKey, created);
	return created;
};

export const getAllReceiptsListCollections = (queryClient: QueryClient) => [
	...(listCollectionsByClient.get(queryClient)?.values() ?? []),
];

export const getReceiptDetailCollection = (
	queryClient: QueryClient,
	trpc: Utils,
) => {
	const existing = detailCollectionsByClient.get(queryClient);
	if (existing) {
		return existing;
	}
	const created = createDetailCollection(queryClient, trpc);
	detailCollectionsByClient.set(queryClient, created);
	return created;
};
