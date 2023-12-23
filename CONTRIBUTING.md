# Prerequisites

- Node.js (version pinned in `.nvmrc`)
- Yarn v3 (use `corpack enable` to activate automatically)

## Getting code

Clone the repository

```sh
git clone git@github.com:luixo/receipt-app.git
cd receipt-app
```

Install dependencies

```sh
yarn install
```

To run a development build, you need to copy `.env.example` file as `.env.local` and fill with proper values.

Run development (web & mobile):

```sh
yarn dev
```

# Testing

## Backend

Backend tests only cover the API layer.

DB used in API is bootstrapped with empty (though migrated) database for each individual test.

To run backend tests:

```sh
yarn backend:test
```

In case snapshots need to be updated, run:

```sh
yarn backend:test --update
```

On completion tests provide coverage report in `testing/vitest/coverage` directory.

### Tests structure

Each test file is named after the file it tests, with `.test.ts` suffix.

Erroneous calls should verify inputs and all errors that might happen in an API call.

Succesful calls should verify the DB diff after the call as well as side effects (external services being called, cookies being set etc.). If possible, potential unintended effects on DB should be checked (e.g. if a call is supposed to affect a receipt, check other receipts are not affected).

Snapshots should preferably be used to verify DB diffs, but not call results.

## Frontend

Frontend tests only cover the UI layer (all data is mocked).

### Functional tests

To run (functional) frontend tests:

```sh
yarn frontend:test --project functional
```

### Visual regression tests

Visual regression tests are run in a docker image (to be consistent on CI environments).

#### Step by step

0. Prebuild the app locally (you can do that inside Docker image, but it will probably OOM)

```sh
NODE_ENV=test npx dotenv -c -- yarn web:build
```

1. Run a Playwright docker image with port 3000 exposed and current directory linked as `/work`

```sh
docker run --rm -v ${PWD}:/work/ -w /work/ -it -p 3000:3000 --entrypoint /bin/bash mcr.microsoft.com/playwright:v1.39.0-jammy
```

2. (in Docker) Enable yarn v3

```sh
corepack enable
```

3. (in Docker) Install platform-specific binaries (until `sharp` [utilize](https://github.com/lovell/sharp/issues/3750) `supportedArchitectures` in `.yarnrc.yml`)

```sh
yarn install
```

4a. (in Docker) Run tests

```sh
PW_SERVER=true yarn frontend:test
```

`PW_SERVER` env variable indicates Playwright should run web server itself.

4b. (in Docker) Run tests and update snapshots with current results

```sh
PW_SERVER=true yarn frontend:test --update-snapshots
```

#### One-liner with snapshot updating

Please, build an app on host machine inbefore (step 0 from above).

```sh
docker run --rm -v ${PWD}:/work/ -w /work/ -it -p 3000:3000 --entrypoint /bin/bash mcr.microsoft.com/playwright:v1.39.0-jammy -c "corepack enable && yarn install && PW_SERVER=true yarn frontend:test --update-snapshots"
```

### Tests structure

Each test file is named after the file it tests, with `.spec.ts` (functional tests) or `.visual.spec.ts` (visual regressions tests) suffix.

Functional tests should verify the query cache change on tested action as well as the amount of calls to the API (via `snapshotQueries` fixture). Page test should end with a switch to a different page.

Visual regression tests should verify against screenshots made with `expectScreenshotWithSchemes` fixture to ensure both color schemes are covered.

### Troubleshooting

If you're running on ARM Mac, you might want to use `linux/aarch64` platform.

To do that implicitly, you need to add `export DOCKER_DEFAULT_PLATFORM=linux/aarch64` in your rc file (`.zshrc` / `.bashrc`).
