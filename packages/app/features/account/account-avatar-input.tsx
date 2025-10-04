import React from "react";
import { View } from "react-native";

import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import type { Area, Point } from "react-easy-crop";
import Cropper from "react-easy-crop";
import { useTranslation } from "react-i18next";
import { doNothing } from "remeda";
import { z } from "zod";

import {
	SkeletonUserAvatar,
	UserAvatar as UserAvatarRaw,
} from "~app/components/app/user-avatar";
import { ConfirmModal } from "~app/components/confirm-modal";
import { suspendedFallback } from "~app/components/suspense-wrapper";
import { useBooleanState } from "~app/hooks/use-boolean-state";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import { useAppForm } from "~app/utils/forms";
import { useTRPC } from "~app/utils/trpc";
import { Button } from "~components/button";
import { Card, CardBody } from "~components/card";
import { FileInput } from "~components/file-input";
import {
	CheckMark,
	CloseIcon,
	SyncIcon,
	TrashBinIcon,
} from "~components/icons";
import { Slider } from "~components/slider";
import { Text } from "~components/text";
import type { UserId } from "~db/ids";
import { options as accountChangeAvatarOptions } from "~mutations/account/change-avatar";
import {
	MAX_AVATAR_SIDE_SIZE,
	convertDataUrlToImageElement,
	convertFileToDataUrl,
} from "~utils/images";

const MAX_ZOOM = 5;

const getCroppedCanvas = async (imageSrc: string, pixelCrop: Area) => {
	const image = await convertDataUrlToImageElement(imageSrc);
	const canvas = document.createElement("canvas");
	const ctx = canvas.getContext("2d");
	if (!ctx) {
		throw new Error("Expected to get 2d context for canvas");
	}

	canvas.width = image.width;
	canvas.height = image.height;

	ctx.drawImage(image, 0, 0);

	const croppedCanvas = document.createElement("canvas");
	const croppedCtx = croppedCanvas.getContext("2d");
	if (!croppedCtx) {
		throw new Error("Expected to get 2d context for cropped canvas");
	}

	const constrainedWidth = Math.min(pixelCrop.width, MAX_AVATAR_SIDE_SIZE);
	const constrainedHeight = Math.min(pixelCrop.height, MAX_AVATAR_SIDE_SIZE);
	croppedCanvas.width = constrainedWidth;
	croppedCanvas.height = constrainedHeight;

	croppedCtx.drawImage(
		canvas,
		pixelCrop.x,
		pixelCrop.y,
		pixelCrop.width,
		pixelCrop.height,
		0,
		0,
		constrainedWidth,
		constrainedHeight,
	);
	return croppedCanvas;
};

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
			<UserAvatarRaw
				id={account.id as UserId}
				connectedAccount={account}
				onClick={onClick}
				size="lg"
				className="cursor-pointer"
			/>
		);
	},
	<SkeletonUserAvatar size="lg" />,
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
			const formData = new FormData();
			const croppedCanvas = await getCroppedCanvas(
				value.avatar,
				value.croppedArea,
			);
			const croppedBlob = await new Promise<File>((resolve) => {
				const type = "image/png";
				croppedCanvas.toBlob(
					// It is not clear in which case `file` in `null`
					// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
					(file) => resolve(new File([file!], "avatar.png", { type })),
					type,
				);
			});
			formData.append("avatar", croppedBlob);
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
	const [crop, setCrop] = React.useState<Point>({ x: 0, y: 0 });
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
		React.ComponentProps<typeof Cropper>["onCropChange"]
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
							aria-label={t("avatar.slider.label")}
							minValue={1}
							maxValue={MAX_ZOOM}
							step={0.01}
							orientation="vertical"
							value={zoom}
							onChange={
								setZoom as React.Dispatch<
									React.SetStateAction<number | number[]>
								>
							}
						/>

						<form.Subscribe selector={(state) => state.values.avatar}>
							{(selectedAvatar) =>
								selectedAvatar ? (
									<form.AppField name="croppedArea">
										{(field) => (
											<Cropper
												image={selectedAvatar}
												crop={crop}
												zoom={zoom}
												maxZoom={MAX_ZOOM}
												aspect={1}
												onCropChange={onCropChange}
												onCropComplete={(_area, areaPixels) =>
													field.setValue(areaPixels)
												}
												onZoomChange={setZoom}
												classes={{
													cropAreaClassName:
														"rounded-full !text-background !text-opacity-50",
													mediaClassName: "rounded-lg",
												}}
											/>
										)}
									</form.AppField>
								) : (
									<Card className="w-full">
										<CardBody
											className="cursor-pointer items-center justify-center"
											onClick={onInputButtonClick}
										>
											<View className="absolute top-0 left-0 m-4 opacity-30">
												{avatar}
											</View>
											<Text>{t("avatar.uploadImage.text")}</Text>
										</CardBody>
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
								<CloseIcon size={24} />
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
										<TrashBinIcon size={24} />
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
											<SyncIcon size={24} />
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
											<CheckMark size={24} />
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
							onFileUpdate={async (file) =>
								field.setValue(await convertFileToDataUrl(file))
							}
							onClickRef={inputClickRef}
						/>
					)}
				</form.AppField>
			</form.Form>
		</form.AppForm>
	);
};
