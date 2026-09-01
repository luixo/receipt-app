// `react-native-reanimated` uses `global.__some_var` expression
// Bundling this in Vite results in `self.__some_var` expression in SSR
// A simple way to mitigate this problem is to override global `self` in globalThis
// oxlint-disable-next-line typescript/no-unnecessary-condition
if (globalThis.self === undefined) {
	// oxlint-disable-next-line typescript/no-explicit-any typescript/no-unsafe-member-access
	(globalThis as any).self = globalThis;
}
