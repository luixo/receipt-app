import React from "react";

export type Props = {
	onClickRef?: React.RefObject<() => void>;
	onFileUpdate?: (dataBlob: string) => void;
};

const convertFileToDataUrl = (file: File) =>
	new Promise<string>((resolve) => {
		const reader = new FileReader();
		reader.addEventListener(
			"load",
			() => resolve(reader.result as string),
			false,
		);
		reader.readAsDataURL(file);
	});

export const FileInput: React.FC<Props> = ({ onClickRef, onFileUpdate }) => {
	const inputRef = React.useRef<HTMLInputElement>(null);
	React.useEffect(() => {
		if (!onClickRef) {
			return;
		}
		onClickRef.current = () => inputRef.current?.click();
	}, [onClickRef]);
	const onChange = React.useCallback<
		React.ChangeEventHandler<HTMLInputElement>
	>(
		async (event) => {
			if (event.target.files && event.target.files.length > 0) {
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				const file = event.target.files[0]!;
				const dataUrl = await convertFileToDataUrl(file);
				onFileUpdate?.(dataUrl);
			}
		},
		[onFileUpdate],
	);
	return (
		<input ref={inputRef} className="hidden" onChange={onChange} type="file" />
	);
};
