// `react-native-reanimated` uses `global.__some_var` expression
// Bundling this in Vite results in `self.__some_var` expression in SSR
// A simple way to mitigate this problem is to override global `self` in globalThis
// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
if (globalThis.self === undefined) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	(globalThis as any).self = globalThis;
}
