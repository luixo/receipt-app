# Receipt item: remaining edge cases

Extend the appropriate `packages/app/features/receipt-components/__tests__/receipt-item*.spec.ts` and `.visual.spec.ts` files.

- **Consumed-item removal:** with consumers present, opening the item menu should show confirmation; cancel preserves item and its consumer parts, confirm calls `receiptItems.remove({ id })`, and failed removal restores the item and shares. Check the pending state if the optimistic removal keeps the card mounted. Clip confirmation in a card-owned light/dark visual; mask fields with independent screenshots.
- **Corrupted consumer association:** with at least two consumers, one unmatched by receipt participants should produce the card's orphan error (with peer ID) instead of a peer/part row. Give fixture data enough valid participants for upstream sums; also assert the one-consumer boundary does not render per-consumer rows. Capture the orphan card without re-snapshotting child input internals.
- **Consumer part to zero:** edit a matched consumer's part to zero and assert `receiptItemConsumers.remove({ itemId, peerId })`, disappearance of the peer/share, updated denominator and rollback on failure.
- **Select removal and pending scope:** deselect a previously added item payer and consumer and assert their respective remove mutations, cache reconciliation/error rollback, and peer-specific disabled options while another consumer mutation is pending. Check multi-consumer names and avatar overflow, including foreign peer lookups for a guest editor.
- **Visual edges:** capture independently clipped dirty validation, pending/error and read-only field variants only where not already covered; an open consumer/payer selector and orphan/removal modal belong to their own component. Keep card-composition screenshots masked over independently owned fields.

“Consumed by everyone” currently needs an explicit permissions decision: do not assert viewer behavior contrary to the rendered implementation just to fill a coverage branch.
