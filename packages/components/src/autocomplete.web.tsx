import {
	AutocompleteItem,
	Autocomplete as AutocompleteRaw,
	AutocompleteSection,
} from "@heroui/autocomplete";
import { useInfiniteScroll } from "@heroui/use-infinite-scroll";

import { cn } from "~components/utils";
import type { ViewReactNode } from "~components/view.web";

export type Props = Pick<
	React.ComponentProps<typeof AutocompleteRaw>,
	"inputValue" | "onInputChange" | "placeholder" | "isDisabled"
> & {
	children: {
		key: string;
		title?: string;
		items: {
			key: string;
			className?: string;
			textValue: string;
			children?: ViewReactNode;
		}[];
	}[];
	label?: string;
	endContent?: ViewReactNode;
	selectedKey: string | null;
	onSelectionChange: (nextKey: string | null) => void;
	emptyContent: string;
	onClear?: () => void;
	scroll?: {
		loadMore: () => void;
		hasMore: boolean;
		isDisabled?: boolean;
	};
};
export const Autocomplete: React.FC<Props> = ({
	children,
	emptyContent,
	onClear,
	onSelectionChange,
	scroll,
	...rest
}) => {
	const [, scrollRef] = useInfiniteScroll(
		scroll
			? {
					hasMore: scroll.hasMore,
					isEnabled: !scroll.isDisabled,
					onLoadMore: scroll.loadMore,
					shouldUseLoader: false,
				}
			: {},
	);
	return (
		<AutocompleteRaw
			labelPlacement="outside"
			variant="bordered"
			listboxProps={{
				classNames: { list: "m-0" },
				emptyContent,
			}}
			clearButtonProps={
				onClear
					? {
							onPress: onClear,
						}
					: undefined
			}
			items={[]}
			onSelectionChange={(nextSelection) =>
				onSelectionChange(
					nextSelection === null ? null : nextSelection.toString(),
				)
			}
			scrollRef={scrollRef}
			{...rest}
		>
			{children.map(({ items, key, ...section }) => (
				<AutocompleteSection key={key} {...section}>
					{items.map(({ key: itemKey, className, ...item }) => (
						<AutocompleteItem
							key={itemKey}
							{...item}
							classNames={{ title: "flex" }}
							className={cn("p-1", className)}
						/>
					))}
				</AutocompleteSection>
			))}
		</AutocompleteRaw>
	);
};
