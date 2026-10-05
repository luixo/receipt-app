# Receipt participants: remaining visual and permission cases

Add focused cases to `packages/app/features/receipt-components/__tests__/receipt-participant*.{spec.ts,visual.spec.ts}` and `packages/app/features/receipt/__tests__/receipt-participant-actions.*`.

- **Debt warning visuals:** clip the participant row's amount and tooltip for owner missing/mismatched outgoing debt, connected peer missing/mismatched reverse debt and the warning-free state. Assert warning text and color after `debts.get` and peer queries settle. Keep these in the row suite, not the receipt page screenshot.
- **Per-peer action visuals:** capture matching-debt `DebtSyncStatus` (including reverse-only mismatch directions) and the suspended debt-query fallback. The row warning's optional `useQuery` and the action's suspense lookup have different loading/error behavior; do not conflate them.
- **Preview edge states:** capture loading preview and guest foreign-avatar variants; mask rows in preview/picker captures and keep row-owned visuals separate.
- **Permissions decision:** the participant row currently exposes receipt-level payer-part controls to a guest. Decide whether guests should edit payer parts before writing a test requiring them disabled; if behavior is intentionally supported, test it with a coherent guest receipt and exact mutation input.

Do not pause an SSR-prefetched receipt query to manufacture a loading screenshot. Use `TRPCError` for expected failures, named participant/action locators and cleaned-up toasts.
