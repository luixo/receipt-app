# Formatting

Run `bun run format` to apply. Run `bun run format:prepare` after adding a new workspace or a new generated-file pattern.

## Ignore files

- `.prettierignore` is fully generated — never edit it directly. It aggregates every `.gitignore` and `.prettierignore` found across the repo and is overwritten on each `format:prepare`.
- Re-run `bun run format:prepare` whenever a new workspace is added so the new package's ignored paths are included.
- To add prettier-specific ignores (files that aren't git-ignored), edit `.prettierignore-root` — the only hand-maintained file.
