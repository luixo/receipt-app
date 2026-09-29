import type { Props } from "#components/image-cropper.tsx";
import { Text } from "#components/text.tsx";
import { View } from "#components/view.tsx";

export const getFormData = () => Promise.resolve(new FormData());

export const ImageCropper: React.FC<Props> = () => (
	<View className="border-warning rounded-md border p-2">
		{/* oxlint-disable-next-line react/jsx-no-literals */}
		<Text>ImageCropper TBD</Text>
	</View>
);
