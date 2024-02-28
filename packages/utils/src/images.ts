export const convertFileToDataUrl = (file: File) =>
	new Promise<string>((resolve) => {
		const reader = new FileReader();
		reader.addEventListener(
			"load",
			() => resolve(reader.result as string),
			false,
		);
		reader.readAsDataURL(file);
	});

export const convertDataUrlToImageElement = (url: string) =>
	new Promise<HTMLImageElement>((resolve, reject) => {
		const image = new Image();
		image.addEventListener("load", () => resolve(image));
		image.addEventListener("error", (error) => reject(error));
		image.src = url;
	});

export const MAX_AVATAR_SIDE_SIZE = 360;
export const MAX_AVATAR_BYTESIZE = 2 * 1024 * 1024;
