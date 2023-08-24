import type { router } from "next-app/handlers";

export type RouterCaller = ReturnType<(typeof router)["createCaller"]>;
