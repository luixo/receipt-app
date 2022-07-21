import React from "react";
import * as ReactNative from "react-native";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";

import { BackButton } from "app/components/back-button";
import { MutationWrapper } from "app/components/mutation-wrapper";
import { PasswordFields } from "app/components/password-fields";
import { useSubmitHandler } from "app/hooks/use-submit-handler";
import { trpc } from "app/trpc";
import { TextInput, Text } from "app/utils/styles";
import {
	accountNameSchema,
	passwordSchema,
	emailSchema,
} from "app/utils/validation";

type RegistrationForm = {
	email: string;
	name: string;
	password: string;
	passwordRetype: string;
};

export const RegisterScreen: React.FC = () => {
	const form = useForm<RegistrationForm>({
		mode: "onChange",
		resolver: zodResolver(
			z.object({
				email: emailSchema,
				name: accountNameSchema,
				password: passwordSchema,
				passwordRetype: passwordSchema,
			})
		),
	});
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
				render={({ field: { onChange, value = "", onBlur } }) => (
					<>
						<TextInput
							placeholder="Enter your name"
							textContentType="name"
							value={value}
							onBlur={onBlur}
							onChangeText={onChange}
						/>
						{errors.name ? <Text>{errors.name.message}</Text> : null}
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
