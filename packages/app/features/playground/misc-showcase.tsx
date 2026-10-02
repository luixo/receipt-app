import React from "react";

import { Accordion, AccordionItem } from "~components/accordion";
import { Avatar } from "~components/avatar";
import { Badge } from "~components/badge";
import { Button } from "~components/button";
import { Card } from "~components/card";
import { Divider } from "~components/divider";
import { FileInput } from "~components/file-input";
import { Icon } from "~components/icons";
import { ImageCropper } from "~components/image-cropper";
import { Pagination } from "~components/pagination";
import { ScrollView } from "~components/scroll-view";
import { Slider } from "~components/slider";
import { Spinner } from "~components/spinner";
import { Text } from "~components/text";
import { View } from "~components/view";

import { Group, Section } from "./showcase-section";

const AccordionShowcase = () => (
	<Section title="Accordion">
		<Accordion>
			{["First", "Second"].map((title) => (
				<AccordionItem
					key={title}
					textValue={title}
					title={<Text>{title}</Text>}
				>
					<Text>{title} panel content</Text>
				</AccordionItem>
			))}
		</Accordion>
	</Section>
);

const BadgeShowcase = () => (
	<Section title="Badge">
		<View className="flex flex-row flex-wrap gap-6">
			{(["warning", "danger"] as const).map((color) => (
				<Badge
					key={color}
					color={color}
					content={color === "danger" ? 99 : 3}
					className="flex"
				>
					<Avatar hashId={color} />
				</Badge>
			))}
		</View>
	</Section>
);

const CardShowcase = () => (
	<Section title="Card">
		<Card
			header={<Text variant="h3">Card header</Text>}
			footer={<Text>Card footer</Text>}
		>
			<Text>Card body</Text>
		</Card>
	</Section>
);

const DividerShowcase = () => (
	<Section title="Divider">
		<Text>Above</Text>
		<Divider />
		<Text>Below</Text>
	</Section>
);

const IconShowcase = () => {
	const [selected, setSelected] = React.useState("none");
	return (
		<Section title="Icon">
			<View className="flex flex-row gap-2">
				{(["eye", "plus", "login"] as const).map((name) => (
					<Icon
						key={name}
						name={name}
						className="size-8"
						onClick={() => setSelected(name)}
					/>
				))}
			</View>
			<Text>Selected icon: {selected}</Text>
		</Section>
	);
};

const ImageCropperShowcase = () => {
	const clickRef = React.useRef<() => void>(() => undefined);
	const [image, setImage] = React.useState("");
	const [crop, setCrop] = React.useState({ x: 0, y: 0 });
	const [zoom, setZoom] = React.useState(1);
	const [area, setArea] = React.useState("");
	return (
		<Section title="ImageCropper">
			<FileInput onClickRef={clickRef} onFileUpdate={setImage} />
			<Button onPress={() => clickRef.current()}>Choose image to crop</Button>
			{image ? (
				<>
					<View className="relative h-64 w-full overflow-hidden rounded-md">
						<ImageCropper
							image={image}
							crop={crop}
							zoom={zoom}
							maxZoom={3}
							onCropChange={setCrop}
							onZoomChange={setZoom}
							onCropComplete={(_, pixels) =>
								setArea(
									`${Math.round(pixels.width)} × ${Math.round(pixels.height)}`,
								)
							}
						/>
					</View>
					<Slider
						label="Zoom"
						minValue={1}
						maxValue={3}
						step={0.1}
						value={zoom}
						onChange={setZoom}
					/>
					<Text>Crop: {area}</Text>
				</>
			) : (
				<Text>Choose an image to try the cropper</Text>
			)}
		</Section>
	);
};

const PaginationShowcase = () => {
	const [page, setPage] = React.useState(1);
	return (
		<Section title="Pagination">
			<Pagination total={20} page={page} onChange={setPage} />
			<Text>Page: {page}</Text>
		</Section>
	);
};

const ScrollViewShowcase = () => (
	<Section title="ScrollView">
		<ScrollView className="h-28 rounded-md border p-2">
			{Array.from({ length: 12 }, (_, index) => (
				<Text key={index}>Scrollable row {index + 1}</Text>
			))}
		</ScrollView>
	</Section>
);

const SpinnerShowcase = () => (
	<Section title="Spinner">
		<View className="flex flex-row items-center gap-3">
			{(["xs", "sm", "md", "lg"] as const).map((size) => (
				<Spinner key={size} size={size} />
			))}
		</View>
	</Section>
);

const ViewShowcase = () => (
	<Section title="View">
		<View className="rounded-md bg-blue-500 p-3">
			<Text>Styled container</Text>
		</View>
	</Section>
);

export const MiscShowcase = () => (
	<Group title="Misc">
		<AccordionShowcase />
		<BadgeShowcase />
		<CardShowcase />
		<DividerShowcase />
		<IconShowcase />
		<ImageCropperShowcase />
		<PaginationShowcase />
		<ScrollViewShowcase />
		<SpinnerShowcase />
		<ViewShowcase />
	</Group>
);
