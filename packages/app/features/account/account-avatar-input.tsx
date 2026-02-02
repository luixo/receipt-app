import React from "react";

import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { doNothing } from "remeda";
import { z } from "zod";

import { ConfirmModal } from "~app/components/confirm-modal";
import { suspendedFallback } from "~app/components/suspense-wrapper";
import { useBooleanState } from "~app/hooks/use-boolean-state";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import { useAppForm } from "~app/utils/forms";
import { useTRPC } from "~app/utils/trpc";
import { Avatar } from "~components/avatar";
import { Button } from "~components/button";
import { Card } from "~components/card";
import { FileInput } from "~components/file-input";
import { Icon } from "~components/icons";
import { ImageCropper, getFormData } from "~components/image-cropper";
import { SkeletonAvatar } from "~components/skeleton-avatar";
import { Slider } from "~components/slider";
import { Text } from "~components/text";
import { View } from "~components/view";
import { options as accountChangeAvatarOptions } from "~mutations/account/change-avatar";

const MAX_ZOOM = 5;

const OnlyAvatarButton = suspendedFallback<React.ComponentProps<typeof Button>>(
	(props) => {
		const trpc = useTRPC();
		const {
			data: { account },
		} = useSuspenseQuery(trpc.account.get.queryOptions());
		if (!account.avatarUrl) {
			return null;
		}
		return <Button {...props} />;
	},
	null,
);

const UserAvatar = suspendedFallback<{ onClick: () => void }>(
	({ onClick }) => {
		const trpc = useTRPC();
		const {
			data: { account },
		} = useSuspenseQuery(trpc.account.get.queryOptions());
		return (
			<Avatar
				hashId={account.id}
				image={
					account.avatarUrl
						? { url: account.avatarUrl, alt: account.email }
						: undefined
				}
				onPress={onClick}
				size="lg"
				className="cursor-pointer"
			/>
		);
	},
	<SkeletonAvatar size="lg" />,
);

const formSchema = z.strictObject({
	avatar: z.string(),
	croppedArea: z.strictObject({
		x: z.int().nonnegative(),
		y: z.int().nonnegative(),
		width: z.int().positive(),
		height: z.int().positive(),
	}),
});

type Form = z.infer<typeof formSchema>;

type Props = React.PropsWithChildren;

export const AccountAvatarInput: React.FC<Props> = ({ children }) => {
	const { t } = useTranslation("account");
	const trpc = useTRPC();
	const [
		isAvatarEditorOpen,
		{ setTrue: enableAvatarEdit, setFalse: disableAvatarEdit },
	] = useBooleanState();

	const updateAvatarMutation = useMutation(
		trpc.account.changeAvatar.mutationOptions(
			useTrpcMutationOptions(accountChangeAvatarOptions, {
				onSuccess: () => disableAvatarEdit(),
			}),
		),
	);
	const defaultValues: Partial<Form> = {
		croppedArea: {
			x: 0,
			y: 0,
			width: 0,
			height: 0,
		},
	};
	const form = useAppForm({
		defaultValues: defaultValues as Form,
		validators: {
			onMount: formSchema,
			onChange: formSchema,
			onSubmit: formSchema,
		},
		onSubmit: async ({ value, formApi }) => {
			const formData = await getFormData(value.avatar, value.croppedArea);
			updateAvatarMutation.mutate(formData, {
				onSuccess: () => formApi.reset(),
			});
		},
	});

	const removeAvatarMutation = useMutation(
		trpc.account.changeAvatar.mutationOptions(
			useTrpcMutationOptions(accountChangeAvatarOptions, {
				onSuccess: () => {
					disableAvatarEdit();
					form.reset();
				},
			}),
		),
	);

	const [zoom, setZoom] = React.useState(1);
	const [crop, setCrop] = React.useState<
		React.ComponentProps<typeof ImageCropper>["crop"]
	>({ x: 0, y: 0 });
	const inputClickRef = React.useRef<() => void>(doNothing);
	const onInputButtonClick = React.useCallback(() => {
		inputClickRef.current();
	}, []);

	const resetAvatar = React.useCallback(() => {
		removeAvatarMutation.mutate(new FormData());
	}, [removeAvatarMutation]);
	const resetEditor = React.useCallback(() => form.reset(), [form]);
	const avatar = <UserAvatar onClick={enableAvatarEdit} />;
	const onCropChange = React.useCallback<
		React.ComponentProps<typeof ImageCropper>["onCropChange"]
	>(
		(nextCrop) => {
			if (updateAvatarMutation.isPending || removeAvatarMutation.isPending) {
				return;
			}
			setCrop(nextCrop);
		},
		[removeAvatarMutation.isPending, updateAvatarMutation.isPending],
	);

	return (
		<form.AppForm>
			<form.Form className="flex flex-row gap-4">
				{isAvatarEditorOpen ? (
					<View className="h-80 flex-1 flex-row justify-between gap-4">
						<Slider
							className="z-10 h-full"
							label={t("avatar.slider.label")}
							minValue={1}
							maxValue={MAX_ZOOM}
							step={0.01}
							orientation="vertical"
							value={zoom}
							onChange={setZoom}
						/>

						<form.Subscribe selector={(state) => state.values.avatar}>
							{(selectedAvatar) =>
								selectedAvatar ? (
									<form.AppField name="croppedArea">
										{(field) => (
											<ImageCropper
												image={selectedAvatar}
												crop={crop}
												zoom={zoom}
												maxZoom={MAX_ZOOM}
												onCropChange={onCropChange}
												onCropComplete={(_area, areaPixels) =>
													field.setValue(areaPixels)
												}
												onZoomChange={setZoom}
											/>
										)}
									</form.AppField>
								) : (
									<Card
										className="w-full"
										bodyClassName="cursor-pointer items-center justify-center"
										onPress={onInputButtonClick}
									>
										<View className="absolute top-0 left-0 m-4 opacity-30">
											{avatar}
										</View>
										<Text>{t("avatar.uploadImage.text")}</Text>
									</Card>
								)
							}
						</form.Subscribe>
						<View className="gap-4">
							<Button
								color="warning"
								variant="bordered"
								isDisabled={
									updateAvatarMutation.isPending ||
									removeAvatarMutation.isPending
								}
								onPress={disableAvatarEdit}
								isIconOnly
							>
								<Icon name="close" className="size-6" />
							</Button>
							<ConfirmModal
								onConfirm={resetAvatar}
								isLoading={removeAvatarMutation.isPending}
								title={t("avatar.remove.title")}
								subtitle={t("avatar.remove.subtitle")}
								confirmText={t("avatar.remove.confirm")}
							>
								{({ openModal }) => (
									<OnlyAvatarButton
										color="danger"
										variant="bordered"
										isLoading={removeAvatarMutation.isPending}
										isDisabled={
											updateAvatarMutation.isPending ||
											removeAvatarMutation.isPending
										}
										onPress={openModal}
										isIconOnly
									>
										<Icon name="trash" className="size-6" />
									</OnlyAvatarButton>
								)}
							</ConfirmModal>
							<form.Subscribe selector={(state) => state.values.avatar}>
								{(selectedAvatar) => (
									<>
										<Button
											color="warning"
											variant="bordered"
											isDisabled={
												updateAvatarMutation.isPending ||
												removeAvatarMutation.isPending ||
												!selectedAvatar
											}
											onPress={resetEditor}
											isIconOnly
										>
											<Icon name="sync" className="size-6" />
										</Button>
										<Button
											color="success"
											variant="bordered"
											isLoading={updateAvatarMutation.isPending}
											isDisabled={
												updateAvatarMutation.isPending ||
												removeAvatarMutation.isPending ||
												!selectedAvatar
											}
											type="submit"
											isIconOnly
										>
											<Icon name="check" className="size-6" />
										</Button>
									</>
								)}
							</form.Subscribe>
						</View>
					</View>
				) : (
					<>
						{avatar}
						{children}
					</>
				)}

				<form.AppField name="avatar">
					{(field) => (
						<FileInput
							onFileUpdate={(dataUrl) => field.setValue(dataUrl)}
							onClickRef={inputClickRef}
						/>
					)}
				</form.AppField>
			</form.Form>
		</form.AppForm>
	);
};
