import type { TRPCError } from "@trpc/server";
import type { z } from "zod";
import { ZodError } from "zod";

const formatZodErrors = (error: z.ZodError) =>
	`Zod error${error.issues.length <= 1 ? "" : "s"}\n\n${error.issues
		.map((issue) => {
			const path =
				issue.path.length === 0
					? "<root>"
					: issue.path
							.map<string>((key) =>
								typeof key === "number" ? `[${key}]` : String(key),
							)
							.filter(Boolean)
							.join(".")
							.replaceAll(".[", "[");
			return `At "${path}": ${issue.message}`;
		})
		.join("\n\n")}`;

export const formatErrorMessage = (
	error: TRPCError,
	fallbackMessage: string,
) =>
	error.code === "BAD_REQUEST" && error.cause instanceof ZodError
		? formatZodErrors(error.cause)
		: fallbackMessage;
