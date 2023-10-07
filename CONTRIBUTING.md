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

On completion tests provide coverage report in `coverage/backend` directory.

### Tests structure

Each test file is named after the file it tests, with `.test.ts` suffix.

Erroneous calls should verify inputs and all errors that might happen in an API call.

Succesful calls should verify the DB diff after the call as well as side effects (external services being called, cookies being set etc.). If possible, potential unintended effects on DB should be checked (e.g. if a call is supposed to affect a receipt, check other receipts are not affected).
