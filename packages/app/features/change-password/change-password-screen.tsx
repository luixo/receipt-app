import React from "react";
import * as ReactNative from "react-native";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { BackButton } from "app/components/back-button";
import { MutationWrapper } from "app/components/mutation-wrapper";
import { PasswordFields } from "app/components/password-fields";
import { Spacer } from "app/components/spacer";
import { useSubmitHandler } from "app/hooks/use-submit-handler";
import { trpc } from "app/trpc";
import { styled, H1, TextInput, Text } from "app/utils/styles";
import { passwordSchema } from "app/utils/validation";

const Wrapper = styled(ReactNative.View)({
	flex: 1,
	justifyContent: "center",
	alignItems: "center",
	padding: "md",
});

const Header = styled(H1)({
	fontWeight: "bold",
	textAlign: "center",
});

type ChangePasswordForm = {
	prevPassword: string;
	password: string;
	passwordRetype: string;
};

export const ChangePasswordScreen: React.FC = () => {
	const form = useForm<ChangePasswordForm>({
		mode: "onChange",
		// TODO: open a PR in react-hook-form
		// After "password" change the "passwordRetype" doesn't get error
		// probably because the field "passwordRetype" didn't change
		resolver: zodResolver(
			z
				.object({
					prevPassword: passwordSchema,
					password: passwordSchema,
					passwordRetype: passwordSchema,
				})
				.refine((obj) => obj.password === obj.passwordRetype, {
					path: ["passwordRetype"],
					message: "Passwords don't match",
				})
		),
	});

	const changePasswordMutation = trpc.useMutation(["account.change-password"]);
	const onSubmit = useSubmitHandler<ChangePasswordForm>(
		(data) =>
			changePasswordMutation.mutateAsync({
				prevPassword: data.prevPassword,
				password: data.password,
			}),
		[changePasswordMutation]
	);

	return (
		<Wrapper>
			<Header>Change password</Header>
			<Controller
				control={form.control}
				name="prevPassword"
				render={({ field: { onChange, value = "", onBlur } }) => (
					<TextInput
						placeholder="Enter your current password"
						textContentType="password"
						value={value}
						onBlur={onBlur}
						onChangeText={onChange}
						secureTextEntry
					/>
				)}
			/>
			<Spacer />
			<PasswordFields form={form} />
			<Spacer />
			<ReactNative.Button
				title="Change"
				disabled={!form.formState.isValid}
				onPress={form.handleSubmit(onSubmit)}
			/>
			<Spacer />
			<BackButton href="/" />
			<MutationWrapper<"account.change-password">
				mutation={changePasswordMutation}
			>
				{() => <Text>Change password success!</Text>}
			</MutationWrapper>
		</Wrapper>
	);
};
