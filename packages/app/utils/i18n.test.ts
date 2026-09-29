import enDefault from "@ra/web/public/locales/en/default.json" with { type: "json" };
import ruDefault from "@ra/web/public/locales/ru/default.json" with { type: "json" };
import { createInstance } from "i18next";
import { expect, test } from "vitest";

import { getValidatorMessageFactory } from "~app/utils/i18n";
import {
	emailSchema,
	passwordSchema,
	peerNameSchema,
	priceSchema,
} from "~app/utils/validation";

test.describe("Zod validation", () => {
	test.describe("translates", async () => {
		const i18n = createInstance();
		await i18n.init({
			lng: "en",
			resources: { en: { default: enDefault }, ru: { default: ruDefault } },
			defaultNS: "default",
		});
		const validatorMessageEn = getValidatorMessageFactory(i18n, "en");
		const validatorMessageRu = getValidatorMessageFactory(i18n, "ru");

		test("regular translation", () => {
			expect(
				priceSchema.safeParse(0, { error: validatorMessageEn }).error?.issues[0]
					?.message,
			).toBe("Price should be non-zero");
		});

		test("with parameter", () => {
			expect(
				passwordSchema.safeParse("x", { error: validatorMessageEn }).error
					?.issues[0]?.message,
			).toBe("Minimal length for password is 6");
		});

		test("with target", () => {
			expect(
				peerNameSchema.safeParse("", { error: validatorMessageEn }).error
					?.issues[0]?.message,
			).toBe("Minimal length for peer name is 1");
		});

		test("non-base language", () => {
			expect(
				priceSchema.safeParse(0.001, { error: validatorMessageRu }).error
					?.issues[0]?.message,
			).toBe("Цена: не более 2 знаков после запятой");
		});
	});

	test.describe("fallbacks", () => {
		test("falls back to english in case english is found", async () => {
			const i18n = createInstance();
			await i18n.init({
				lng: "en",
				resources: { en: { default: enDefault } },
				defaultNS: "default",
			});
			const validatorMessageRu = getValidatorMessageFactory(i18n, "ru");
			expect(
				emailSchema.safeParse("not-an-email", { error: validatorMessageRu })
					.error?.issues[0]?.message,
			).toBe("Invalid email address");
		});

		test("falls back to default in case no resource is found", async () => {
			const i18n = createInstance();
			await i18n.init({
				lng: "en",
				defaultNS: "default",
			});
			const validatorMessageRu = getValidatorMessageFactory(i18n, "ru");
			expect(
				emailSchema.safeParse("not-an-email", { error: validatorMessageRu })
					.error?.issues[0]?.message,
			).toBe("Invalid input");
		});
	});
});
