import type { Area, Point } from "react-easy-crop";
import Cropper from "react-easy-crop";

import { MAX_AVATAR_SIDE_SIZE } from "~utils/images";
import { promisifyEvent } from "~utils/promise";

export type Props = {
	image: string;
	crop: Point;
	zoom: number;
	maxZoom: number;
	onCropChange: (location: Point) => void;
	onCropComplete: (area: Area, areaPixels: Area) => void;
	onZoomChange: (zoom: number) => void;
};

const convertDataUrlToImageElement = async (url: string) =>
	promisifyEvent<HTMLImageElement>((listener, errorListener) => {
		const image = new Image();
		const localListener = () => listener(image);
		const localErrorListener = (error: ErrorEvent) =>
			errorListener(new Error(error.message));
		image.addEventListener("load", localListener);
		image.addEventListener("error", localErrorListener);
		image.src = url;
		return () => {
			image.removeEventListener("load", localListener);
			image.removeEventListener("error", localErrorListener);
		};
	});

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

export const getFormData = async (imageSrc: string, pixelCrop: Area) => {
	const formData = new FormData();
	const croppedCanvas = await getCroppedCanvas(imageSrc, pixelCrop);
	const type = "image/png";
	const croppedBlob = await promisifyEvent<File>((listener) => {
		croppedCanvas.toBlob(
			// It is not clear in which case `file` in `null`
			// oxlint-disable-next-line typescript/no-non-null-assertion
			(file) => listener(new File([file!], "avatar.png", { type })),
			type,
		);
	});
	formData.append("avatar", croppedBlob);
	return formData;
};

export const ImageCropper = ({
	image,
	crop,
	zoom,
	maxZoom,
	onCropChange,
	onCropComplete,
	onZoomChange,
}: Props) => (
	<Cropper
		image={image}
		crop={crop}
		zoom={zoom}
		maxZoom={maxZoom}
		aspect={1}
		onCropChange={onCropChange}
		onCropComplete={onCropComplete}
		onZoomChange={onZoomChange}
		classes={{
			cropAreaClassName: "rounded-full !text-background !text-opacity-50",
			mediaClassName: "rounded-lg",
		}}
	/>
);
