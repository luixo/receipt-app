/* eslint-disable no-template-curly-in-string -- GitHub Actions evaluates these expressions. */
import type { Config } from "@oxiul/configs";
import { DEFAULT_MACHINE, getCheckJob } from "@oxiul/configs/workflows";

const reportEnv = {
	REPORT_SCOPE:
		"${{ github.event_name == 'pull_request' && format('pr-{0}', github.event.pull_request.number) || github.ref == 'refs/heads/main' && 'main' || format('run-{0}', github.run_id) }}",
};

export const workflows: NonNullable<Config["workflows"]> = {
	jobs: {
		"replace-pr-number": {
			name: "Replace PR number in a message",
			"runs-on": DEFAULT_MACHINE,
			if: "${{ github.ref != 'refs/heads/main' }}",
			steps: [
				{
					name: "Replace Pull Request Body",
					uses: "step-security/update-pr-description@v1",
					with: {
						content: "${{ github.event.pull_request.number }}",
						regex: "{{PR_NUMBER}}",
						regexFlags: "g",
						appendContentOnMatchOnly: true,
						token: "${{ secrets.GITHUB_TOKEN }}",
					},
				},
			],
		},
		build: getCheckJob({
			name: "Build",
			needs: "typecheck",
			steps: [
				{
					name: "Build web app",
					// Test mode injects .env.test variables into the build.
					run: "bun run web:build --mode test",
					env: { ANALYZE_BUNDLE: true },
				},
				{
					name: "Upload web build dir",
					uses: "actions/upload-artifact@v7",
					with: {
						name: "web-build",
						path: "apps/web/.output",
						"retention-days": 0,
						"include-hidden-files": true,
						"if-no-files-found": "error",
					},
				},
				{
					name: "Upload bundle stats",
					uses: "actions/upload-artifact@v7",
					with: {
						name: "web-build-stats",
						path: "dist/stats.json",
						"retention-days": 0,
						"if-no-files-found": "error",
					},
				},
			],
		}),
		"backend-test": getCheckJob({
			name: "Backend tests",
			env: reportEnv,
			outputs: {
				coverage: "${{ steps.coverage-percent.outputs.coverage }}",
				"report-url": "${{ steps.publish.outputs.deployment-url }}",
			},
			steps: [
				{ name: "Run backend tests", run: "bun run backend:test" },
				{
					name: "Archive code coverage results",
					uses: "actions/upload-artifact@v7",
					with: {
						name: "backend-coverage-report",
						path: "testing/vitest/coverage",
						"if-no-files-found": "error",
					},
				},
				{
					name: "Report coverage",
					uses: "davelosert/vitest-coverage-report-action@v2",
					with: {
						name: "backend",
						"working-directory": "testing/vitest",
						"vite-config-path": "../../vitest.config.ts",
					},
				},
				{
					name: "Pass coverage percent to output",
					id: "coverage-percent",
					run: `COVERAGE=$(bun -e 'console.log(Object.entries(require("./testing/vitest/coverage/coverage-summary.json").total).reduce((acc, [, m]) => Math.min(acc, m.pct), 100))')
echo "Coverage is $COVERAGE"
echo "coverage=$COVERAGE" >> $GITHUB_OUTPUT
`,
				},
				{
					name: "Publish backend coverage report",
					id: "publish",
					if: "${{ !cancelled() && hashFiles('testing/vitest/coverage/index.html') != '' && (github.event_name != 'pull_request' || github.event.pull_request.head.repo.full_name == github.repository) }}",
					uses: "cloudflare/wrangler-action@v3",
					with: {
						apiToken: "${{ secrets.CLOUDFLARE_API_TOKEN }}",
						accountId: "${{ vars.CLOUDFLARE_ACCOUNT_ID }}",
						wranglerVersion: "4",
						preCommands: `: "\${CLOUDFLARE_ACCOUNT_ID:?Missing repository variable CLOUDFLARE_ACCOUNT_ID}"
: "\${CLOUDFLARE_API_TOKEN:?Missing repository secret CLOUDFLARE_API_TOKEN}"
`,
						command:
							"deploy --config .github/reports/wrangler.json --name receipt-ci-backend-${{ env.REPORT_SCOPE }} --assets testing/vitest/coverage",
					},
				},
			],
		}),
		"frontend-test": {
			name: "Frontend tests",
			"runs-on": DEFAULT_MACHINE,
			needs: "build",
			strategy: {
				"fail-fast": false,
				matrix: { shardIndex: [1, 2, 3, 4, 5, 6], shardTotal: [6] },
			},
			container: {
				image: "mcr.microsoft.com/playwright:v1.63.0",
				options: "--user pwuser",
			},
			steps: [
				{ uses: "actions/checkout@v6" },
				// Remove when https://github.com/oven-sh/setup-bun/issues/55 is solved.
				{
					name: "Install unzip",
					run: `mkdir -p "$RUNNER_TEMP/apt/lists/partial" "$RUNNER_TEMP/apt/cache/archives/partial" "$RUNNER_TEMP/unzip"
apt-get update -qq -o Dir::State::lists="$RUNNER_TEMP/apt/lists" -o Dir::Cache::archives="$RUNNER_TEMP/apt/cache/archives"
cd "$RUNNER_TEMP/apt"
apt-get download unzip -o Dir::State::lists="$RUNNER_TEMP/apt/lists" -o Dir::Cache::archives="$RUNNER_TEMP/apt/cache/archives"
dpkg-deb -x unzip_*.deb "$RUNNER_TEMP/unzip"
echo "$RUNNER_TEMP/unzip/usr/bin" >> "$GITHUB_PATH"
`,
				},
				{ uses: "./.github/actions/setup-env" },
				{
					name: "Fetch web build",
					uses: "actions/download-artifact@v8",
					with: { name: "web-build", path: "apps/web/.output" },
				},
				{
					name: "Run frontend tests",
					id: "tests",
					run: "bun run frontend:test --shard=${{ matrix.shardIndex }}/${{ matrix.shardTotal }}",
					env: { COVERAGE: true },
				},
				{
					name: "Upload Playwright report chunks",
					uses: "actions/upload-artifact@v7",
					if: "${{ !cancelled() }}",
					with: {
						name: "blob-report-${{ matrix.shardIndex }}",
						path: "testing/playwright/blob-report",
						"retention-days": 1,
					},
				},
				{
					name: "Upload frontend coverage data",
					uses: "actions/upload-artifact@v7",
					with: {
						name: "frontend-coverage-${{ matrix.shardIndex }}",
						path: "testing/playwright/coverage/data",
						"retention-days": 1,
						"if-no-files-found": "error",
					},
				},
			],
		},
		"merge-frontend-reports": getCheckJob({
			name: "Merge Playwright reports",
			if: "${{ !cancelled() }}",
			needs: "frontend-test",
			env: reportEnv,
			outputs: { "report-url": "${{ steps.publish.outputs.deployment-url }}" },
			steps: [
				{
					name: "Download blob reports from GitHub Actions Artifacts",
					uses: "actions/download-artifact@v8",
					with: {
						path: "all-blob-reports",
						pattern: "blob-report-*",
						"merge-multiple": true,
					},
				},
				{
					name: "Merge into HTML Report",
					run: "bunx playwright merge-reports --reporter html ./all-blob-reports",
				},
				{
					name: "Upload HTML report",
					uses: "actions/upload-artifact@v7",
					with: {
						name: "html-report-attempt-${{ github.run_attempt }}",
						path: "playwright-report",
						"retention-days": 30,
						"if-no-files-found": "error",
					},
				},
				{
					name: "Publish Playwright report",
					id: "publish",
					if: "${{ !cancelled() && hashFiles('playwright-report/index.html') != '' && (github.event_name != 'pull_request' || github.event.pull_request.head.repo.full_name == github.repository) }}",
					uses: "cloudflare/wrangler-action@v3",
					with: {
						apiToken: "${{ secrets.CLOUDFLARE_API_TOKEN }}",
						accountId: "${{ vars.CLOUDFLARE_ACCOUNT_ID }}",
						wranglerVersion: "4",
						preCommands: `: "\${CLOUDFLARE_ACCOUNT_ID:?Missing repository variable CLOUDFLARE_ACCOUNT_ID}"
: "\${CLOUDFLARE_API_TOKEN:?Missing repository secret CLOUDFLARE_API_TOKEN}"
`,
						command:
							"deploy --config .github/reports/wrangler.json --name receipt-ci-playwright-${{ env.REPORT_SCOPE }} --assets playwright-report",
					},
				},
			],
		}),
		"merge-frontend-coverage": getCheckJob({
			name: "Merge frontend coverage",
			needs: "frontend-test",
			env: reportEnv,
			outputs: {
				coverage: "${{ steps.coverage-percent.outputs.coverage }}",
				"report-url": "${{ steps.publish.outputs.deployment-url }}",
			},
			steps: [
				{
					name: "Download coverage data from shards",
					uses: "actions/download-artifact@v8",
					with: {
						path: "testing/playwright/coverage",
						pattern: "frontend-coverage-*",
					},
				},
				{ name: "Merge coverage reports", run: "bun frontend:merge-coverage" },
				{
					name: "Report coverage",
					uses: "davelosert/vitest-coverage-report-action@v2",
					with: {
						name: "frontend",
						"working-directory": "testing/playwright/coverage/report",
						"json-summary-path": "coverage-summary.json",
						"json-final-path": "coverage-final.json",
					},
				},
				{
					name: "Upload frontend coverage report",
					uses: "actions/upload-artifact@v7",
					with: {
						name: "frontend-coverage-report",
						path: "testing/playwright/coverage/report",
						"retention-days": 30,
						"if-no-files-found": "error",
					},
				},
				{
					name: "Pass coverage percent to output",
					id: "coverage-percent",
					run: `COVERAGE=$(bun -e 'console.log(Object.entries(require("./testing/playwright/coverage/report/coverage-summary.json").total).reduce((acc, [, m]) => Math.min(acc, m.pct), 100))')
echo "Coverage is $COVERAGE"
echo "coverage=$COVERAGE" >> $GITHUB_OUTPUT
`,
				},
				{
					name: "Publish frontend coverage report",
					id: "publish",
					if: "${{ !cancelled() && hashFiles('testing/playwright/coverage/report/index.html') != '' && (github.event_name != 'pull_request' || github.event.pull_request.head.repo.full_name == github.repository) }}",
					uses: "cloudflare/wrangler-action@v3",
					with: {
						apiToken: "${{ secrets.CLOUDFLARE_API_TOKEN }}",
						accountId: "${{ vars.CLOUDFLARE_ACCOUNT_ID }}",
						wranglerVersion: "4",
						preCommands: `: "\${CLOUDFLARE_ACCOUNT_ID:?Missing repository variable CLOUDFLARE_ACCOUNT_ID}"
: "\${CLOUDFLARE_API_TOKEN:?Missing repository secret CLOUDFLARE_API_TOKEN}"
`,
						command:
							"deploy --config .github/reports/wrangler.json --name receipt-ci-frontend-${{ env.REPORT_SCOPE }} --assets testing/playwright/coverage/report",
					},
				},
			],
		}),
		"update-report-links": {
			name: "Update PR report links",
			if: "${{ !cancelled() && github.event_name == 'pull_request' && github.event.pull_request.head.repo.full_name == github.repository }}",
			needs: [
				"backend-test",
				"merge-frontend-reports",
				"merge-frontend-coverage",
				"replace-pr-number",
				"update-badges",
			],
			"runs-on": DEFAULT_MACHINE,
			permissions: { "pull-requests": "write" },
			steps: [
				{
					name: "Upsert report links in PR description",
					uses: "step-security/update-pr-description@v1",
					with: {
						token: "${{ secrets.GITHUB_TOKEN }}",
						regex:
							"(?:\\r?\\n){0,2}<!-- ci-reports:start -->[\\s\\S]*?<!-- ci-reports:end -->(?:\\r?\\n)?",
						content: `

<!-- ci-reports:start -->
### CI reports
[Workflow run \${{ github.run_id }} (attempt \${{ github.run_attempt }})](\${{ github.server_url }}/\${{ github.repository }}/actions/runs/\${{ github.run_id }})

- Playwright: \${{ needs.merge-frontend-reports.outputs.report-url != '' && format('[Report]({0})', needs.merge-frontend-reports.outputs.report-url) || 'Not published for this run' }}
- Backend coverage: \${{ needs.backend-test.outputs.report-url != '' && format('[Report]({0})', needs.backend-test.outputs.report-url) || 'Not published for this run' }}
- Frontend coverage: \${{ needs.merge-frontend-coverage.outputs.report-url != '' && format('[Report]({0})', needs.merge-frontend-coverage.outputs.report-url) || 'Not published for this run' }}
<!-- ci-reports:end -->
`,
					},
				},
			],
		},
		"update-badges": {
			name: "Badges",
			"runs-on": DEFAULT_MACHINE,
			permissions: { "pull-requests": "write" },
			needs: ["backend-test", "merge-frontend-coverage"],
			steps: [
				{
					name: "Backend coverage badge",
					uses: "schneegans/dynamic-badges-action@v1.8.0",
					env: {
						branch:
							"${{ github.ref == 'refs/heads/main' && 'main' || github.event.pull_request.number }}",
					},
					with: {
						auth: "${{ secrets.GIST_SECRET }}",
						gistID: "878178ea4ba8d28122cc72204df909e7",
						filename: "backend_coverage_${{ env.branch }}.json",
						label: "Backend coverage",
						message: "${{ needs.backend-test.outputs.coverage }}%",
						valColorRange: "${{ needs.backend-test.outputs.coverage }}",
						minColorRange: 50,
						maxColorRange: 100,
					},
				},
				{
					name: "Frontend coverage badge",
					uses: "schneegans/dynamic-badges-action@v1.8.0",
					env: {
						branch:
							"${{ github.ref == 'refs/heads/main' && 'main' || github.event.pull_request.number }}",
					},
					with: {
						auth: "${{ secrets.GIST_SECRET }}",
						gistID: "878178ea4ba8d28122cc72204df909e7",
						filename: "frontend_coverage_${{ env.branch }}.json",
						label: "Frontend coverage",
						message: "${{ needs.merge-frontend-coverage.outputs.coverage }}%",
						valColorRange:
							"${{ needs.merge-frontend-coverage.outputs.coverage }}",
						minColorRange: 50,
						maxColorRange: 100,
					},
				},
				{
					name: "Bust badge cache",
					if: "${{ github.ref != 'refs/heads/main' }}",
					uses: "step-security/update-pr-description@v1",
					with: {
						content: "run=${{ github.run_id }}",
						regex: "run=[0-9]+",
						regexFlags: "g",
						appendContentOnMatchOnly: true,
						token: "${{ secrets.GITHUB_TOKEN }}",
					},
				},
			],
		},
		"check-generated-db-types": getCheckJob({
			name: "Check generated DB types",
			services: {
				postgres: {
					image: "postgres:18",
					env: {
						POSTGRES_USER: "postgres",
						POSTGRES_PASSWORD: "password",
						POSTGRES_DB: "postgres",
					},
					ports: ["5432:5432"],
					options:
						'--health-cmd "pg_isready -U postgres -d postgres" --health-interval 10s --health-timeout 5s --health-retries 5',
				},
			},
			env: {
				DATABASE_URL: "postgresql://postgres:password@localhost:5432/postgres",
			},
			steps: [
				{ name: "Apply database migrations", run: "bun run db:migrate" },
				{ name: "Run types generation", run: "bun run db:generate-types" },
				{
					name: "Check for uncommitted changes",
					run: `if [[ -n "$(git status --porcelain ./packages/db/src/types.gen.ts)" ]]; then
  echo "Database types are out of sync. Run 'bun run db:generate-types' and commit the results."
  git --no-pager diff ./packages/db/src/types.gen.ts
  exit 1
else
  echo "Database types are up-to-date."
fi
`,
				},
			],
		}),
		"check-generated-route-types": {
			name: "Check generated route types",
			"runs-on": DEFAULT_MACHINE,
			needs: "build",
			steps: [
				{
					name: "Check for uncommitted changes",
					run: `if [[ -n "$(git status --porcelain ./apps/web/src/entry/routeTree.gen.ts)" ]]; then
  echo "Route types are out of sync. Run 'bun run web:dev' or 'bun run web:build' and commit the results."
  git --no-pager diff ./apps/web/src/entry/routeTree.gen.ts
  exit 1
else
  echo "Route types are up-to-date."
fi
`,
				},
			],
		},
		analyze: getCheckJob({
			name: "Analyze bundle",
			if: "${{ github.ref != 'refs/heads/main' }}",
			needs: "build",
			permissions: { "pull-requests": "write" },
			steps: [
				{
					name: "Download stats from latest successful run on `main`",
					uses: "dawidd6/action-download-artifact@v21",
					with: {
						workflow: "ci.yml",
						workflow_conclusion: "completed",
						branch: "main",
						github_token: "${{ secrets.GITHUB_TOKEN }}",
						name: "web-build-stats",
						path: "./stats/base",
					},
				},
				{
					name: "Download stats from current run",
					uses: "actions/download-artifact@v8",
					with: { name: "web-build-stats", path: "./stats/current" },
				},
				{
					name: "Compare bundle size",
					uses: "wojtekmaj/vite-compare-bundle-size@v1",
					with: {
						"github-token": "${{ secrets.GITHUB_TOKEN }}",
						"current-stats-json-path": "./stats/current/stats.json",
						"base-stats-json-path": "./stats/base/stats.json",
					},
				},
			],
		}),
		"verify-native-health": getCheckJob({
			name: "Check native health",
			steps: [
				{
					name: "Run Expo doctor",
					run: "bun run native:doctor",
					env: { EXPO_DOCTOR_SKIP_DEPENDENCY_VERSION_CHECK: true },
				},
			],
		}),
		"verify-routers-match": getCheckJob({
			name: "Check routers match between web and native",
			steps: [
				{ name: "Run routers verification", run: "bun run verify-routers" },
			],
		}),
	},
	workflows: [
		{
			name: "cleanup-ci-reports",
			on: { schedule: [{ cron: "0 4 * * *" }], workflow_dispatch: {} },
			permissions: { contents: "read" },
			concurrency: { group: "cleanup-ci-reports", "cancel-in-progress": false },
			jobs: {
				cleanup: getCheckJob({
					"timeout-minutes": 15,
					steps: [
						{
							name: "Delete report Workers not deployed in 30 days",
							run: "bun run ci:cleanup-reports",
							env: {
								CLOUDFLARE_ACCOUNT_ID: "${{ vars.CLOUDFLARE_ACCOUNT_ID }}",
								CLOUDFLARE_API_TOKEN: "${{ secrets.CLOUDFLARE_API_TOKEN }}",
							},
						},
					],
				}),
			},
		},
		{
			name: "update-packages",
			on: { schedule: [{ cron: "0 0 * * 1" }], workflow_dispatch: {} },
			permissions: { contents: "write", "pull-requests": "write" },
			concurrency: { group: "update-packages", "cancel-in-progress": true },
			jobs: {
				update: {
					name: "Check for major package updates",
					"runs-on": DEFAULT_MACHINE,
					env: {
						GH_TOKEN: "${{ github.token }}",
						BRANCH: "chore/weekly-package-updates",
						TITLE: "Weekly package updates",
					},
					steps: [
						{ uses: "actions/checkout@v6", with: { ref: "main" } },
						{
							uses: "oven-sh/setup-bun@v2",
							with: { "bun-version-file": "package.json" },
						},
						{
							name: "Find and apply package updates",
							id: "updates",
							env: {
								REPORT: "${{ runner.temp }}/package-updates.txt",
								BODY: "${{ runner.temp }}/package-updates.md",
							},
							run: `bunx --yes npm-check-updates --workspaces --packageManager bun --dep prod,dev,optional --format group -u > "$REPORT"

if git diff --quiet; then
  echo "updated=false" >> "$GITHUB_OUTPUT"
  echo "All dependencies are up to date." >> "$GITHUB_STEP_SUMMARY"
else
  echo "updated=true" >> "$GITHUB_OUTPUT"
  bun install --lockfile-only
  {
    echo '## Suggested major package updates'
    echo
    echo 'Includes all workspaces and the root catalog. Review major upgrades and patched dependencies before merging.'
    echo
    echo '\`\`\`text'
    cat "$REPORT"
    echo '\`\`\`'
    echo
    echo "[Workflow run]($GITHUB_SERVER_URL/$GITHUB_REPOSITORY/actions/runs/$GITHUB_RUN_ID)"
  } > "$BODY"
  cat "$BODY" >> "$GITHUB_STEP_SUMMARY"
fi
`,
						},
						{
							name: "Find existing PR by title",
							id: "pr",
							run: `prs=$(gh pr list --state open --limit 1000 --json number,title,headRefName)
branch=$(jq -r --arg title "$TITLE" \\
  '[.[] | select(.title == $title) | .headRefName][0] // empty' <<< "$prs")
if [ -n "$branch" ] && [ "$branch" != "$BRANCH" ]; then
  echo "An open PR named '$TITLE' uses unexpected branch '$branch'." >&2
  exit 1
fi
pr=$(jq -r --arg title "$TITLE" \\
  '[.[] | select(.title == $title) | .number][0] // empty' <<< "$prs")
echo "number=$pr" >> "$GITHUB_OUTPUT"
`,
						},
						{
							name: "Publish updates",
							if: "steps.updates.outputs.updated == 'true'",
							env: {
								PR_NUMBER: "${{ steps.pr.outputs.number }}",
								BODY: "${{ runner.temp }}/package-updates.md",
							},
							run: `git config user.name 'github-actions[bot]'
git config user.email 'github-actions[bot]@users.noreply.github.com'
git switch -c "$BRANCH"
git add -u
git commit -m 'Chore: update packages'

# Only replace the branch if it has not changed since we looked it up.
previous=$(git ls-remote origin "refs/heads/$BRANCH" | cut -f1)
git push --force-with-lease="refs/heads/$BRANCH:$previous" origin "HEAD:refs/heads/$BRANCH"

if [ -n "$PR_NUMBER" ]; then
  gh pr edit "$PR_NUMBER" --body-file "$BODY"
else
  gh pr create --base main --head "$BRANCH" --title "$TITLE" --body-file "$BODY"
fi
`,
						},
						{
							name: "Close stale PR",
							if: "steps.updates.outputs.updated == 'false' && steps.pr.outputs.number != ''",
							env: { PR_NUMBER: "${{ steps.pr.outputs.number }}" },
							run: "gh pr close \"$PR_NUMBER\" --comment 'All dependencies are up to date.'",
						},
					],
				},
			},
		},
	],
};
