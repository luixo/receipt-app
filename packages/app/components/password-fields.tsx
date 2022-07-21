import React from "react";

import { Controller, Path, UseFormReturn } from "react-hook-form";

import { Text, TextInput } from "app/utils/styles";

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
						<Text>{form.formState.errors.password.message}</Text>
					) : null}
				</>
			)}
		/>
		<Controller
			control={form.control}
			name={"passwordRetype" as Path<T>}
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
