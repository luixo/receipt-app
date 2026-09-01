import type { Props } from "~components/image-cropper";
import { Text } from "~components/text";
import { View } from "~components/view";

export const getFormData = () => Promise.resolve(new FormData());

export const ImageCropper: React.FC<Props> = () => (
	<View className="border-warning rounded-md border p-2">
		{/* oxlint-disable-next-line react/jsx-no-literals */}
		<Text>ImageCropper TBD</Text>
	</View>
);
