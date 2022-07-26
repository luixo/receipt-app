import React from "react";
import * as ReactNative from "react-native";

import { Button, Loading, Spacer } from "@nextui-org/react";
import { IoTrashBin as TrashBin } from "react-icons/io5";
import { UseMutationResult } from "react-query";

import { MutationErrorMessage } from "app/components/mutation-error-message";
import { TRPCError } from "app/trpc";
import { styled, Text } from "app/utils/styles";

const RemoveButtons = styled(ReactNative.View)({
	marginTop: "sm",
	flexDirection: "row",
});

type Props = {
	mutation: UseMutationResult<any, TRPCError, any>;
	onRemove: () => void;
	children: string;
};

export const RemoveButton: React.FC<Props> = ({
	mutation,
	onRemove,
	children,
}) => {
	const [showDeleteConfirmation, setShowDeleteConfimation] =
		React.useState(false);

	if (!showDeleteConfirmation) {
		return (
			<Button auto onClick={() => setShowDeleteConfimation(true)} color="error">
				<TrashBin size={24} />
				<Spacer x={0.5} />
				{children}
			</Button>
		);
	}

	return (
		<>
			<Text>Are you sure?</Text>
			<RemoveButtons>
				<Button
					auto
					onClick={onRemove}
					disabled={mutation.isLoading}
					color="error"
				>
					{mutation.isLoading ? (
						<Loading color="currentColor" size="sm" />
					) : (
						"Yes"
					)}
				</Button>
				<Spacer x={0.5} />
				<Button
					auto
					onClick={() => setShowDeleteConfimation(false)}
					disabled={mutation.isLoading}
				>
					No
				</Button>
			</RemoveButtons>
			{mutation.error ? <MutationErrorMessage mutation={mutation} /> : null}
		</>
	);
};
