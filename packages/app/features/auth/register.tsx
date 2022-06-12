import React from "react";
import * as ReactNative from "react-native";
import { useForm, Controller } from "react-hook-form";
import { trpc } from "../../trpc";
import { BackButton } from "../../components/utils/back-button";
import { TextInput, Text } from "../../utils/styles";
import { VALIDATIONS_CONSTANTS } from "../../utils/validation";
import { MutationWrapper } from "../../components/utils/mutation-wrapper";

type RegistrationForm = {
	email: string;
	name: string;
	password: string;
	passwordRetype: string;
};

export const RegisterScreen: React.FC = () => {
	const {
		control,
		handleSubmit,
		formState: { isValid, errors },
		watch,
	} = useForm<RegistrationForm>({ mode: "onChange" });

	const registerMutation = trpc.useMutation("auth.register");
	const onSubmit = (data: RegistrationForm) => {
		registerMutation.mutate({
			email: data.email,
			name: data.name,
			password: data.password,
		});
	};

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
					minLength: VALIDATIONS_CONSTANTS.name.min,
					maxLength: VALIDATIONS_CONSTANTS.name.max,
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
									? `Name should be at least ${VALIDATIONS_CONSTANTS.name.max} chars`
									: `Name should be at maximum ${VALIDATIONS_CONSTANTS.name.max} chars`}
							</Text>
						) : null}
					</>
				)}
			/>
			<Controller
				control={control}
				name="password"
				rules={{
					required: true,
					minLength: VALIDATIONS_CONSTANTS.password.min,
					maxLength: VALIDATIONS_CONSTANTS.password.max,
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
						{errors.password ? (
							<Text>
								{errors.password.type === "minLength"
									? `Password should be at least ${VALIDATIONS_CONSTANTS.password.min} chars`
									: `Password should be at maximum ${VALIDATIONS_CONSTANTS.password.max} chars`}
							</Text>
						) : null}
					</>
				)}
			/>
			<Controller
				control={control}
				name="passwordRetype"
				rules={{
					required: true,
					validate: (input) =>
						input !== watch("password") ? "Password should match" : undefined,
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
						{errors.passwordRetype ? (
							<Text>{errors.passwordRetype.message}</Text>
						) : null}
					</>
				)}
			/>
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
