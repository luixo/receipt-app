import React from "react";

import { Controller, Path, UseFormReturn } from "react-hook-form";

import { Text, TextInput } from "app/utils/styles";
import { VALIDATIONS_CONSTANTS } from "app/utils/validation";

type MinimalPasswordForm = {
	password: string;
	passwordRetype: string;
};

type Props<T extends MinimalPasswordForm> = {
	form: UseFormReturn<T>;
};

export const PasswordFields = <T extends MinimalPasswordForm>({
	form,
}: Props<T>) => (
	<>
		<Controller
			control={form.control}
			name={"password" as Path<T>}
			rules={{
				required: true,
				minLength: VALIDATIONS_CONSTANTS.accountPassword.min,
				maxLength: VALIDATIONS_CONSTANTS.accountPassword.max,
			}}
			render={({ field: { onChange, value = "", onBlur } }) => (
				<>
					<TextInput
						placeholder="Enter your password"
						textContentType="newPassword"
						value={value}
						onBlur={onBlur}
						onChangeText={onChange}
						secureTextEntry
					/>
					{form.formState.errors.password ? (
						<Text>
							{form.formState.errors.password.type === "minLength"
								? `Password should be at least ${VALIDATIONS_CONSTANTS.accountPassword.min} chars`
								: `Password should be at maximum ${VALIDATIONS_CONSTANTS.accountPassword.max} chars`}
						</Text>
					) : null}
				</>
			)}
		/>
		<Controller
			control={form.control}
			name={"passwordRetype" as Path<T>}
			rules={{
				required: true,
				validate: (input) =>
					input !== form.watch("password" as Path<T>)
						? "Password should match"
						: undefined,
			}}
			render={({ field: { onChange, value = "", onBlur } }) => (
				<>
					<TextInput
						placeholder="Enter password again"
						textContentType="newPassword"
						value={value}
						onBlur={onBlur}
						onChangeText={onChange}
						secureTextEntry
					/>
					{form.formState.errors.passwordRetype ? (
						<Text>{form.formState.errors.passwordRetype.message}</Text>
					) : null}
				</>
			)}
		/>
	</>
);
