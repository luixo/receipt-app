# Published CI reports

The final step of each report job deploys its HTML report as a Cloudflare Worker with static assets using `cloudflare/wrangler-action@v3` (Wrangler 4).

## Setup

1. Enable a `workers.dev` subdomain in the Cloudflare account.
1. Set the GitHub repository variable `CLOUDFLARE_ACCOUNT_ID` to that account ID.
1. Set the GitHub repository secret `CLOUDFLARE_API_TOKEN` to an API token scoped to that account with **Account / Workers Scripts / Edit** permission and **Account / Account Settings / Read** permission.

## URLs and PR description

Each report has its own Worker: `receipt-ci-backend-<scope>`, `receipt-ci-playwright-<scope>`, and `receipt-ci-frontend-<scope>`. The scope is `pr-<number>` for PRs, `main` for main, or `run-<id>` for manual runs on other branches. Reruns overwrite the same Workers rather than accumulating deployments. CI cancels older runs on the same ref to avoid older runs overwriting newer reports or PR links.

After the report jobs finish, the workflow upserts the section between `<!-- ci-reports:start -->` and `<!-- ci-reports:end -->` in the PR description, preserving the rest of the description. Reports that did not publish are shown as unavailable, rather than linking to an older run. The section includes the workflow run link. The existing PR-description updater is used because `peter-evans/create-or-update-comment` only updates comments.

Reports are **public**, do not include production secrets or sensitive test data. GitHub artifact upload still works if deployment fails.

## Cleanup

The `Clean up expired CI reports` workflow runs daily. Only Workers matching `receipt-ci-(backend|playwright|frontend)-(pr|run)-<number>` are eligible, `main` report Workers are not deleted. Workers whose latest deployment is older than 30 days are deleted.
