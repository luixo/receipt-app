import type React from "react";

import { useFormattedCurrency } from "~app/hooks/use-formatted-currency";
import { useSsrFormat } from "~app/hooks/use-ssr-format";
import type { TRPCQueryOutput } from "~app/trpc";
import { Text } from "~components";
import { ReceiptIcon } from "~components/icons";

type Props = {
	receipt: TRPCQueryOutput<"receiptTransferIntentions.getAll">["inbound"][number]["receipt"];
};

export const ReceiptSnippet: React.FC<Props> = ({ receipt }) => {
	const currency = useFormattedCurrency(receipt.currencyCode);
	const { formatDate } = useSsrFormat();
	return (
		<Text testID="receipt-snippet">
			<ReceiptIcon className="mr-1 inline" size={24} />
			{`"${receipt.name}" (sum ${
				receipt.sum
			} ${currency}) issued on ${formatDate(receipt.issued)}`}
		</Text>
	);
};
