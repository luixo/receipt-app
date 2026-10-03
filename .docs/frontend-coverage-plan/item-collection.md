# Receipt item collection and creation

Owners: `packages/app/features/receipt-components/__tests__/receipt-items.{spec.ts,visual.spec.ts}`, `receipt-empty-items.{spec.ts,visual.spec.ts}`, `add-receipt-item-form.{spec.ts,visual.spec.ts}` and shared named locators in `receipt-items.utils.ts`. Reuse `packages/app/features/receipt/__tests__/utils.ts`. Override its default 3–8 items and all-participants-consume-every-item generators for an empty receipt or unconsumed items; use explicit item timestamps for ordering. Successful `receiptItems.add` returns `{ id, createdAt }` and initially inserts an item with no consumers/payers.

## Collection

- Empty owned receipt shows the “Item” add button followed by the empty card “You have no receipt items yet” and its prompt, with neither item cards nor no-participants warning. Opening the form leaves the empty card in place until an item is saved. A guest cannot open the disabled add control.
- A populated receipt displays item cards oldest-created-first, even when the API array arrives in another order; the source array must not be mutated. The warning section is absent when every item has a consumer. Keep collection screenshot ownership to order, gaps, button and empty/warning placement: **mask all item cards** in populated collection shots, since card internals belong to [item-controls.md](item-controls.md).
- Structural skeleton renders three item cards on receipt detail fallback; do not invent a paused SSR-prefetch test. The fallback does not render `SkeletonAddReceiptItemController`; verify it only where a real client transition exposes the skeleton.

## Unconsumed-item navigation

- Give two items no consumers and another at least one. Only the first two appear under “Items with no participants”; their labels contain name and formatted rounded quantity × price. Warning rows follow original item-array order, even though cards are sorted by creation time. With every item consumed the whole warning disappears.
- Put an unconsumed item below the fold. Selecting its warning row scrolls the **matching item card** into view, without assigning a consumer or leaving the warning checkbox unchecked. Assert observable scroll and the correct target, not a direct DOM method call. Clip the warning section for its own light/dark screenshot; leave warning text, arrows and selected checkboxes unmasked while masking card bodies in any wider shot.

## Add-item form

- Clicking “Item” reveals the form, focuses “Receipt item name”, starts with blank name/price and quantity one, and disables Save. One-character names, zero price/quantity, excess precision and out-of-range numbers do not submit; a valid name and positive price allow Save. Use textbox-role number locators and blur to commit values. Report actual validation behavior rather than assuming negative typed input survives React Aria normalization.
- Saving sends `receiptItems.add({ receiptId, name, price, quantity })`. Pause the handler to assert Save loading/disabled, disabled price and quantity, and optimistic appearance of a new unconsumed card/warning. The name field is **not** explicitly disabled during pending; do not assert all inputs are. On success the card persists with server ID/timestamp, form stays open, name resets and refocuses, price becomes zero and quantity becomes one; no success toast is defined.
- On `TRPCError`, optimistic card and warning roll back, entered values remain for retry, and the item-specific error toast appears. Verify/consume it, and compare query/cache snapshots for pending/success/error when helpful. Add clipped light/dark form screenshots for pristine, validation, valid, pending and failure; leave the form's controls unmasked. Use named locator and an interior pixel sample if the rounded Card edge causes screenshot noise.
