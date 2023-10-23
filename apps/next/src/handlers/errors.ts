import type { TRPCError } from "@trpc/server";
import { ZodError, type z } from "zod";
import { generateErrorMessage } from "zod-error";

export const formatZodErrors = (error: z.ZodError) =>
	generateErrorMessage(error.issues, {
		prefix: `Zod error${error.issues.length <= 1 ? "" : "s"}\n\n`,
		delimiter: {
			error: "\n\n",
			component: "\n",
		},
		message: {
			enabled: true,
			label: null,
		},
		path: {
			enabled: true,
			type: "objectNotation",
			label: null,
		},
		transform: (params) =>
			`At "${params.pathComponent || "<root>"}": ${params.messageComponent}`,
		code: { enabled: false },
	});

export const formatErrorMessage = (
	error: TRPCError,
	fallbackMessage: string,
) =>
	error.code === "BAD_REQUEST" && error.cause instanceof ZodError
		? formatZodErrors(error.cause)
		: fallbackMessage;
