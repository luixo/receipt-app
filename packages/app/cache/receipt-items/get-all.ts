import type * as utils from "app/cache/utils";
import type { ReceiptsId } from "next-app/db/models";

export const getController = ({ trpcContext }: utils.ControllerContext) => {
	const controller = trpcContext.receiptItems.get;
	return {
		get: (receiptId: ReceiptsId) => controller.getData({ receiptId }),
	};
};
