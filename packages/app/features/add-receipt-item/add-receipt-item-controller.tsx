import React from "react";

import { Button, Spacer } from "@nextui-org/react";
import { MdAdd as AddIcon } from "react-icons/md";
import { v4 } from "uuid";

import { ReceiptsId } from "next-app/db/models";

import { AddReceiptItemForm } from "./add-receipt-item-form";

type Props = {
	receiptId: ReceiptsId;
	isLoading: boolean;
};

export const AddReceiptItemController: React.FC<Props> = ({
	receiptId,
	isLoading,
}) => {
	const [ids, setIds] = React.useState<string[]>([]);
	const addId = React.useCallback(
		() => setIds((prevIds) => [...prevIds, v4()]),
		[setIds]
	);
	const removeId = React.useCallback(
		(id: string) =>
			setIds((prevIds) => prevIds.filter((lookupId) => lookupId !== id)),
		[setIds]
	);

	const addButton = (
		<Button
			bordered
			icon={<AddIcon size={24} />}
			disabled={ids.length >= 10}
			onClick={addId}
			css={{ margin: "0 auto" }}
		>
			Item
		</Button>
	);

	return (
		<>
			{addButton}
			<Spacer y={1} />
			{ids.map((id, index) => (
				<React.Fragment key={id}>
					{index === 0 ? null : <Spacer y={1} />}
					<AddReceiptItemForm
						receiptId={receiptId}
						isLoading={isLoading}
						onDone={() => removeId(id)}
					/>
				</React.Fragment>
			))}
			{ids.length === 0 ? null : (
				<>
					<Spacer y={1} />
					{addButton}
				</>
			)}
		</>
	);
};
