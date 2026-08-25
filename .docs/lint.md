# Linting & formatting

Run `bun run lint` to lint; `bun run lint:fix` to auto-fix.
Run `bun run format` to format.

## Replacements for banned APIs

When the linter flags a banned API, use these alternatives:

- **Date/time**: use `~utils/date` utilities (`parse`, `getNow`, `Temporal` types) instead of `Date`, `new Date()`, or `Date.now()`.
- **Object iteration**: use `remeda`'s `keys`, `values`, `entries`, `fromEntries`, `mapValues` instead of `Object.*` equivalents.

## Inline disable comments

Stale disable comments are errors (`reportUnusedDisableDirectives: "error"`). Remove them when the violation they suppressed no longer exists.

Only suppress a rule when you are certain the lint concern doesn't apply to that specific line — not to silence noise generally.
