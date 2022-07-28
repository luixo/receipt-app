import { TRPCInfiniteQueryInput, TRPCQueryOutput } from "app/trpc";

export type AvailableUsersResult = TRPCQueryOutput<"users.get-available">;
export type AvailableUser = AvailableUsersResult["items"][number];
export type Input = TRPCInfiniteQueryInput<"users.get-available">;
export type RequiredInput = Pick<Input, "receiptId">;
export type OmittedInput = Omit<Input, keyof RequiredInput>;
