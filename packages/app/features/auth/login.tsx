import React from "react";
import * as ReactNative from "react-native";
import { useForm, Controller } from "react-hook-form";
import { trpc } from "../../trpc";
import { BackButton } from "../../components/utils/back-button";
import { TextInput, Text } from "../../utils/styles";
import { MutationWrapper } from "../../components/utils/mutation-wrapper";

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
	const onSubmit = async (data: LoginForm) => {
		await loginMutation.mutateAsync({
			email: data.email,
			password: data.password,
		});
		trpcContext.invalidateQueries(["account.get"]);
		trpcContext.refetchQueries(["account.get"]);
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
				name="password"
				rules={{ required: true }}
				render={({ field: { onChange, value = "", onBlur } }) => (
					<>
						<TextInput
							placeholder="Enter your password"
							textContentType="password"
							value={value}
							onBlur={onBlur}
							onChangeText={onChange}
							secureTextEntry
						/>
					</>
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
