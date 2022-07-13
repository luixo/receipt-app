import React from "react";
import * as ReactNative from "react-native";

import { useForm, Controller } from "react-hook-form";

import { PasswordFields } from "app/components/password-fields";
import { BackButton } from "app/components/utils/back-button";
import { MutationWrapper } from "app/components/utils/mutation-wrapper";
import { useSubmitHandler } from "app/hooks/use-submit-handler";
import { trpc } from "app/trpc";
import { TextInput, Text } from "app/utils/styles";
import { VALIDATIONS_CONSTANTS } from "app/utils/validation";

type RegistrationForm = {
	email: string;
	name: string;
	password: string;
	passwordRetype: string;
};

export const RegisterScreen: React.FC = () => {
	const form = useForm<RegistrationForm>({ mode: "onChange" });
	const {
		control,
		handleSubmit,
		formState: { isValid, errors },
	} = form;

	const registerMutation = trpc.useMutation("auth.register");
	const onSubmit = useSubmitHandler<RegistrationForm>(
		(data) =>
			registerMutation.mutateAsync({
				email: data.email,
				name: data.name,
				password: data.password,
			}),
		[registerMutation]
	);

	return (
		<>
			<BackButton href="/" />
			<Controller
				control={control}
				name="email"
				rules={{
					required: true,
					pattern: {
						value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
						message: "invalid email address",
					},
				}}
				render={({ field: { onChange, value = "", onBlur } }) => (
					<>
						<TextInput
							placeholder="Enter your email"
							textContentType="emailAddress"
							value={value}
							onBlur={onBlur}
							onChangeText={onChange}
						/>
						{errors.email ? <Text>{errors.email.message}</Text> : null}
					</>
				)}
			/>
			<Controller
				control={control}
				name="name"
				rules={{
					required: true,
					minLength: VALIDATIONS_CONSTANTS.accountName.min,
					maxLength: VALIDATIONS_CONSTANTS.accountName.max,
				}}
				render={({ field: { onChange, value = "", onBlur } }) => (
					<>
						<TextInput
							placeholder="Enter your name"
							textContentType="name"
							value={value}
							onBlur={onBlur}
							onChangeText={onChange}
						/>
						{errors.name ? (
							<Text>
								{errors.name.type === "minLength"
									? `Name should be at least ${VALIDATIONS_CONSTANTS.accountName.max} chars`
									: `Name should be at maximum ${VALIDATIONS_CONSTANTS.accountName.max} chars`}
							</Text>
						) : null}
					</>
				)}
			/>
			<PasswordFields form={form} />
			<ReactNative.Button
				title="Submit"
				disabled={!isValid || registerMutation.status === "success"}
				onPress={handleSubmit(onSubmit)}
			/>
			<MutationWrapper<"auth.register"> mutation={registerMutation}>
				{() => <Text>Register success!</Text>}
			</MutationWrapper>
		</>
	);
};
