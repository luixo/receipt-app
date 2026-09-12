# Visual Flakiness Report

Command: `PW_SERVER=true bun run frontend:test --project <project> --repeat-each=10`

Results will be appended after each project completes.

## 1440-chrome

- Command started with `--repeat-each=10`.
- 990 cases scheduled (99 visual tests x 10 repeats).
- Timed out after 30 minutes before completion; no flaky-test conclusion.
- Progress output showed passing cases only before timeout.
- A four-worker rerun also timed out after 30 minutes before completion.
- A 16-worker rerun was aborted before completion; no flaky-test conclusion.

### 1440-chrome shards

- Shard 1/4: 239 passed, 9 skipped; failed during global setup because 3 unknown server errors occurred. No individual flaky test identified.
- Shard 2/4: 237 passed, 11 skipped; failed during global setup because 2 unknown server errors occurred. No individual flaky test identified.
- Shard 3/4: 238 passed, 9 skipped; failed during global setup because 3 unknown server errors occurred. No individual flaky test identified.
- Shard 4/4: 236 passed, 11 skipped; failed during global setup because 2 unknown server errors occurred. No individual flaky test identified.
- Project conclusion: all executed test cases passed; the project could not exit cleanly because the global server-error check reported unknown errors in every shard.

## 1280-firefox

- Shard 1/4 scheduled 248 cases with 16 workers.
- Timed out after 15 minutes before any completed-case summary; no flaky-test conclusion.

## 600-chrome

- Shard 1/4: 167 passed, 81 skipped; failed during global setup because 3 unknown server errors occurred.
- No individual flaky test identified in this shard.

## 320-safari

- Shard 1/4: 164 passed, 79 skipped, 5 failed, plus 1 global server error.
- Candidates: `packages/app/features/confirm-email/__tests__/confirm-email-screen.visual.spec.ts:16` (`Error`) failed 3 times; `packages/app/features/debts-exchange-all/__tests__/planned-debts.visual.spec.ts:10` (`Form`) failed twice.
- Independent 20-repeat run of confirm-email `Error`: all 20 repeats had the same snapshot mismatch, so it is a deterministic baseline mismatch, not flakiness.

## Summary

- No confirmed visual flake was found.
- The planned-debts `Form` mismatch is deterministic on WebKit.
- The confirm-email `Error` mismatch is deterministic on Safari-sized Chromium.
- Visual runs were also blocked from clean completion by recurring global server errors and Firefox execution timeouts; see entries above.

## 834-webkit

- Shard 1/4: 165 passed, 81 skipped, 2 failed, plus 1 global server error.
- Visual mismatch observed: `packages/app/features/debts-exchange-all/__tests__/planned-debts.visual.spec.ts:10` (`Form`), failing twice during the 10-repeat shard.
- Independent 20-repeat run: all 20 repeats produced the same 42-pixel snapshot mismatch (20 failed, 20 skipped, 20 passed due soft assertions). This is a deterministic baseline mismatch, not flakiness.
