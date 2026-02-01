import { useInfiniteScroll as useRawInfiniteScroll } from "@heroui/use-infinite-scroll";

export type InfiniteScrollProps = Parameters<typeof useRawInfiniteScroll>[0];
export const useInfiniteScroll = (props: InfiniteScrollProps) => {
	const [, scrollerRef] = useRawInfiniteScroll(props);
	return scrollerRef;
};
