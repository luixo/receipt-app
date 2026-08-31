import React from "react";

import { promisifyEvent } from "~utils/promise";

export type Props = {
	onClickRef?: React.RefObject<() => void>;
	onFileUpdate?: (dataBlob: string) => void;
};

const convertFileToDataUrl = (file: File) => {
	const reader = new FileReader();
	return promisifyEvent<string>((listener, errorListener) => {
		const localListener = () => listener(reader.result as string);
		const localErrorListener = () =>
			errorListener(new Error("Problem converting file to data url"));
		reader.addEventListener("load", localListener, false);
		reader.addEventListener("error", localErrorListener);
		reader.readAsDataURL(file);
		return () => {
			reader.removeEventListener("load", localListener);
			reader.removeEventListener("error", localErrorListener);
		};
	});
};

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
			if (event.target.files && event.target.files.length !== 0) {
				// oxlint-disable-next-line typescript/no-non-null-assertion
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
