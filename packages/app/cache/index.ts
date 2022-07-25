import * as accountConnections from "./account-connection-intentions";
import * as receiptItems from "./receipt-items";
import * as receipts from "./receipts";
import * as users from "./users";

export type { Revert } from "./utils";

export const cache = {
	users,
	receipts,
	receiptItems,
	accountConnections,
};

export namespace Cache {
	type CacheIndex = typeof cache;

	export namespace ReceiptItems {
		type ReceiptItemsIndex = CacheIndex["receiptItems"];

		export namespace Get {
			type GetIndex = ReceiptItemsIndex["get"];

			export type Input = Parameters<GetIndex["receiptItem"]["add"]>[1];
		}
	}
	export namespace Receipts {
		type ReceiptsIndex = CacheIndex["receipts"];

		export namespace Get {
			type GetIndex = ReceiptsIndex["get"];

			export type Input = Parameters<GetIndex["add"]>[1];
		}

		export namespace GetPaged {
			type GetPagedIndex = ReceiptsIndex["getPaged"];

			export type Input = Parameters<GetPagedIndex["add"]>[1];
		}
	}
	export namespace Users {
		type UsersIndex = CacheIndex["users"];

		export namespace Get {
			type GetIndex = UsersIndex["get"];

			export type Input = Parameters<GetIndex["add"]>[1];
		}
		export namespace GetPaged {
			type GetPagedIndex = UsersIndex["getPaged"];

			export type Input = Parameters<GetPagedIndex["add"]>[1];
		}
		export namespace GetNotConnected {
			type GetNotConnectedIndex = UsersIndex["getNotConnected"];

			export type Input = Parameters<GetNotConnectedIndex["add"]>[1];
		}
		export namespace GetAvailable {
			type GetAvailableIndex = UsersIndex["getAvailable"];

			export type Input = Parameters<GetAvailableIndex["add"]>[1];
			export type User = Parameters<GetAvailableIndex["add"]>[2];
		}
	}
	export namespace AccountConnections {
		type AccountConnectionsIndex = CacheIndex["accountConnections"];

		export namespace GetAll {
			type GetAllIndex = AccountConnectionsIndex["getAll"];

			export type Input = Parameters<GetAllIndex["inbound"]["add"]>[1];
		}
	}
}
