import React from "react";
import * as ReactNative from "react-native";

import { Picker } from "@react-native-picker/picker";

import { Role } from "next-app/handlers/receipts/utils";

export type AssignableRole = Exclude<Role, "owner">;

type Props = {
	initialRole: AssignableRole;
	close: () => void;
	changeRole: (nextRole: AssignableRole) => void;
	disabled?: boolean;
};

const ROLES: AssignableRole[] = ["editor", "viewer"];

export const ReceiptParticipantRoleChange: React.FC<Props> = ({
	initialRole,
	close,
	changeRole,
	disabled,
}) => {
	const [selectedRole, setSelectedRole] = React.useState(initialRole);
	return (
		<>
			<Picker selectedValue={selectedRole} onValueChange={setSelectedRole}>
				{ROLES.map((role) => (
					<Picker.Item key={role} label={role} value={role} />
				))}
			</Picker>
			<ReactNative.Button
				title={`Change to ${selectedRole}`}
				onPress={() => changeRole(selectedRole)}
				disabled={initialRole === selectedRole || disabled}
			/>
			<ReactNative.Button title="Close" onPress={close} />
		</>
	);
};
