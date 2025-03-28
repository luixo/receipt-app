import React from "react";
import { View } from "react-native";

import { zodResolver } from "@hookform/resolvers/zod";
import type { Area, Point } from "react-easy-crop";
import Cropper from "react-easy-crop";
import type { SubmitHandler } from "react-hook-form";
import { useForm } from "react-hook-form";
import { doNothing } from "remeda";
import { z } from "zod";

import { UserAvatar } from "~app/components/app/user-avatar";
import { ConfirmModal } from "~app/components/confirm-modal";
import { useBooleanState } from "~app/hooks/use-boolean-state";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { TRPCQueryOutput } from "~app/trpc";
import { trpc } from "~app/trpc";
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
import type { UsersId } from "~db/models";
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

type Form = {
	avatar: string;
	croppedArea: Area;
};

type Props = React.PropsWithChildren<{
	account: TRPCQueryOutput<"account.get">["account"];
}>;

export const AccountAvatarInput: React.FC<Props> = ({ account, children }) => {
	const [
		isAvatarEditorOpen,
		{ setTrue: enableAvatarEdit, setFalse: disableAvatarEdit },
	] = useBooleanState();
	const form = useForm<Form>({
		resolver: zodResolver(
			z.strictObject({
				avatar: z.string(),
				croppedArea: z.strictObject({
					x: z.number(),
					y: z.number(),
					width: z.number(),
					height: z.number(),
				}),
			}),
		),
		defaultValues: {
			croppedArea: {
				x: 0,
				y: 0,
				width: 0,
				height: 0,
			},
		},
	});

	const updateAvatarMutation = trpc.account.changeAvatar.useMutation(
		useTrpcMutationOptions(accountChangeAvatarOptions, {
			onSuccess: () => {
				disableAvatarEdit();
				form.reset();
			},
		}),
	);
	const removeAvatarMutation = trpc.account.changeAvatar.useMutation(
		useTrpcMutationOptions(accountChangeAvatarOptions, {
			onSuccess: () => {
				disableAvatarEdit();
				form.reset();
			},
		}),
	);

	const onFileUpdate = React.useCallback(
		async (file: File) => {
			form.setValue("avatar", await convertFileToDataUrl(file), {
				shouldValidate: true,
			});
		},
		[form],
	);
	const selectedAvatar = form.watch("avatar");
	const [zoom, setZoom] = React.useState(1);
	const [crop, setCrop] = React.useState<Point>({ x: 0, y: 0 });
	const onCropComplete = React.useCallback<
		NonNullable<React.ComponentProps<typeof Cropper>["onCropComplete"]>
	>(
		async (_area, areaPixels) => form.setValue("croppedArea", areaPixels),
		[form],
	);
	const inputClickRef = React.useRef<() => void>(doNothing);
	const onInputButtonClick = React.useCallback(() => {
		inputClickRef.current();
	}, []);

	const submitHandler = React.useCallback<SubmitHandler<Form>>(
		async ({ avatar, croppedArea }) => {
			const formData = new FormData();
			const croppedCanvas = await getCroppedCanvas(avatar, croppedArea);
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
			updateAvatarMutation.mutate(formData);
		},
		[updateAvatarMutation],
	);
	const resetAvatar = React.useCallback(() => {
		removeAvatarMutation.mutate(new FormData());
	}, [removeAvatarMutation]);
	const resetEditor = React.useCallback(() => form.reset(), [form]);
	const avatar = (
		<UserAvatar
			id={account.id as UsersId}
			connectedAccount={account}
			onClick={enableAvatarEdit}
			size="lg"
			className="cursor-pointer"
		/>
	);

	return (
		<View className="flex-row gap-4">
			{isAvatarEditorOpen ? (
				<View className="h-80 flex-1 flex-row justify-between gap-4">
					<Slider
						className="z-10 h-full"
						aria-label="Change scale"
						minValue={1}
						maxValue={MAX_ZOOM}
						step={0.01}
						orientation="vertical"
						value={zoom}
						onChange={
							setZoom as React.Dispatch<React.SetStateAction<number | number[]>>
						}
					/>
					{selectedAvatar ? (
						<Cropper
							image={selectedAvatar}
							crop={crop}
							zoom={zoom}
							maxZoom={MAX_ZOOM}
							aspect={1}
							onCropChange={setCrop}
							onCropComplete={onCropComplete}
							onZoomChange={setZoom}
							classes={{
								cropAreaClassName:
									"rounded-full !text-background !text-opacity-50",
								mediaClassName: "rounded-lg",
							}}
						/>
					) : (
						<Card className="w-full">
							<CardBody
								className="cursor-pointer items-center justify-center"
								onClick={onInputButtonClick}
							>
								<View className="absolute left-0 top-0 m-4 opacity-30">
									{avatar}
								</View>
								<Text>Click to upload an image</Text>
							</CardBody>
						</Card>
					)}
					<View className="gap-4">
						<Button
							color="warning"
							variant="bordered"
							isDisabled={
								updateAvatarMutation.isPending || removeAvatarMutation.isPending
							}
							onPress={disableAvatarEdit}
							isIconOnly
						>
							<CloseIcon size={24} />
						</Button>
						{account.avatarUrl ? (
							<ConfirmModal
								action={resetAvatar}
								isLoading={removeAvatarMutation.isPending}
								title="Remove avatar"
								subtitle="Do you want to remove your avatar?"
								confirmText="Are you sure?"
							>
								{({ openModal }) => (
									<Button
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
									</Button>
								)}
							</ConfirmModal>
						) : null}
						<Button
							color="warning"
							variant="bordered"
							isDisabled={
								updateAvatarMutation.isPending || removeAvatarMutation.isPending
							}
							onPress={resetEditor}
							isIconOnly
						>
							<SyncIcon size={24} />
						</Button>
						{form.watch("avatar") ? (
							<Button
								color="success"
								variant="bordered"
								isLoading={updateAvatarMutation.isPending}
								isDisabled={
									updateAvatarMutation.isPending ||
									removeAvatarMutation.isPending
								}
								onPress={() => form.handleSubmit(submitHandler)()}
								isIconOnly
							>
								<CheckMark size={24} />
							</Button>
						) : null}
					</View>
				</View>
			) : (
				<>
					{avatar}
					{children}
				</>
			)}

			<FileInput onFileUpdate={onFileUpdate} onClickRef={inputClickRef} />
		</View>
	);
};
