import React from "react";
import * as ReactNative from "react-native";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";

import { cache } from "app/cache";
import { BackButton } from "app/components/back-button";
import { MutationWrapper } from "app/components/mutation-wrapper";
import { useSubmitHandler } from "app/hooks/use-submit-handler";
import { trpc } from "app/trpc";
import { TextInput, Text } from "app/utils/styles";
import { passwordSchema, emailSchema } from "app/utils/validation";

type LoginForm = {
	email: string;
	password: string;
};

export const LoginScreen: React.FC = () => {
	const {
		control,
		handleSubmit,
		formState: { isValid, errors },
	} = useForm<LoginForm>({
		mode: "onChange",
		resolver: zodResolver(
			z.object({ email: emailSchema, password: passwordSchema })
		),
	});

	const trpcContext = trpc.useContext();
	const loginMutation = trpc.useMutation("auth.login");
	const onSubmit = useSubmitHandler<LoginForm>(
		(data) => loginMutation.mutateAsync(data),
		[loginMutation, trpcContext],
		() => cache.account.get.invalidate(trpcContext, { refetchInactive: true })
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
				name="password"
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
