import React from "react";
import * as ReactNative from "react-native";

import { useForm, Controller } from "react-hook-form";

import { BackButton } from "../../components/utils/back-button";
import { MutationWrapper } from "../../components/utils/mutation-wrapper";
import { useSubmitHandler } from "../../hooks/use-submit-handler";
import { trpc } from "../../trpc";
import { TextInput, Text } from "../../utils/styles";

type LoginForm = {
	email: string;
	password: string;
};

export const LoginScreen: React.FC = () => {
	const {
		control,
		handleSubmit,
		formState: { isValid, errors },
	} = useForm<LoginForm>({ mode: "onChange" });

	const trpcContext = trpc.useContext();
	const loginMutation = trpc.useMutation("auth.login");
	const onSubmit = useSubmitHandler<LoginForm>(
		(data) => loginMutation.mutateAsync(data),
		[loginMutation, trpcContext],
		() => {
			trpcContext.invalidateQueries(["account.get"]);
			trpcContext.refetchQueries(["account.get"]);
		}
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
				name="password"
				rules={{ required: true }}
				render={({ field: { onChange, value = "", onBlur } }) => (
					<TextInput
						placeholder="Enter your password"
						textContentType="password"
						value={value}
						onBlur={onBlur}
						onChangeText={onChange}
						secureTextEntry
					/>
				)}
			/>
			<ReactNative.Button
				title="Login"
				disabled={!isValid || loginMutation.status === "success"}
				onPress={handleSubmit(onSubmit)}
			/>
			<MutationWrapper<"auth.login"> mutation={loginMutation}>
				{() => <Text>Auth success!</Text>}
			</MutationWrapper>
		</>
	);
};
