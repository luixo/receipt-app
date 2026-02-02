import type { Props } from "~components/image-cropper";
import { Text } from "~components/text";
import { View } from "~components/view";

export const getFormData = async () => new FormData();

export const ImageCropper: React.FC<Props> = () => (
	<View className="border-warning rounded-md border p-2">
		<Text>ImageCropper TBD</Text>
	</View>
);
