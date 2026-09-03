// CwdChanged hook: allocate a free dev-server port for a new worktree.
// Run with `node --env-file-if-exists=.env.local`, so process.env.PORT
// reflects any port .env.local already has.
import { appendFile } from "node:fs/promises";

import { getFreePort } from "../../packages/utils/src/server/port.ts";

if (!process.cwd().includes("/.claude/worktrees/") || process.env.PORT) {
	process.exit(0);
}

const port = await getFreePort();
await appendFile(".env.local", `PORT=${port}\n`);
