import { VALIDATIONS_CONSTANTS } from "app/utils/validation";
import { z } from "zod";

export const password = z
	.string()
	.min(VALIDATIONS_CONSTANTS.password.min)
	.max(VALIDATIONS_CONSTANTS.password.max);
export const name = z
	.string()
	.min(VALIDATIONS_CONSTANTS.name.min)
	.max(VALIDATIONS_CONSTANTS.name.min);

export const flavored = <T extends string>(x: string): x is T => true;
