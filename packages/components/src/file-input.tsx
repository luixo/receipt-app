import React from "react";

type Props = {
	onClickRef?: React.RefObject<() => void>;
	onFileUpdate?: (file: File) => void;
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
			if (event.target.files && event.target.files.length > 0) {
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				const file = event.target.files[0]!;
				onFileUpdate?.(file);
			}
		},
		[onFileUpdate],
	);
	return (
		<input ref={inputRef} className="hidden" onChange={onChange} type="file" />
	);
};
