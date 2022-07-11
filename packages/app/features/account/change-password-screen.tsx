import React from "react";
import * as ReactNative from "react-native";
import { Controller, useForm } from "react-hook-form";
import { styled, H1, TextInput, Text } from "../../utils/styles";
import { trpc } from "../../trpc";
import { MutationWrapper } from "../../components/utils/mutation-wrapper";
import { useSubmitHandler } from "../../hooks/use-submit-handler";
import { PasswordFields } from "../../components/password-fields";
import { BackButton } from "../../components/utils/back-button";

const Wrapper = styled(ReactNative.View)({
	flex: 1,
	justifyContent: "center",
	alignItems: "center",
	padding: "$m",
});

const Header = styled(H1)({
	fontWeight: "$bold",
	textAlign: "center",
});

const Spacer = styled(ReactNative.View)({ marginTop: "$l" });

type ChangePasswordForm = {
	prevPassword: string;
	password: string;
	passwordRetype: string;
};

export const ChangePasswordScreen: React.FC = () => {
	const form = useForm<ChangePasswordForm>({ mode: "onChange" });

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
				rules={{ required: true }}
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
