# Propeller GraphQL API — Cypress tests

Automated **API-only** tests (no UI) for the Propeller Junior SDET assignment. The API runs separately (for example via Docker in the official assignment repo).

## Prerequisites

- Node.js 20+
- The GraphQL API running locally (default `http://localhost:3000/graphql`) with the database **seeded**
- HTTP header `x-tenant-id` (`tenant-a` / `tenant-b`) on every request (handled by the custom `cy.graphql` command)

## Install

```bash
npm ci
```

## Configure API URL

Default URL is set in `cypress.config.js`. To override locally, copy the example env file:

```bash
copy cypress.env.example.json cypress.env.json   # Windows
# cp cypress.env.example.json cypress.env.json   # macOS/Linux
```

Edit `apiUrl` if your API is not on `http://localhost:3000/graphql`.

**Docker Desktop (Cypress inside a container):** use `http://host.docker.internal:3000/graphql` as `apiUrl`.

## Run tests

Open runner (interactive):

```bash
npm run test:open
```

Headless (CI-style):

```bash
npm test
```

## Project layout

- `cypress/support/commands.js` — `cy.graphql(query, variables, options)` (`allowGraphQLErrors`, `tenantId`, etc.)
- `cypress/support/helpers.js` — shared GraphQL operations and assertions
- `cypress/e2e/Tests/Products` and `Images` — `Queries`, `Mutations`, `Errors`

## CI (GitHub Actions)

Workflow: `.github/workflows/api-tests.yml`.

1. Add secrets on **this** test repository:
   - `PROP_API_REPO` — e.g. `your-org/propeller-sdet-task`
   - `PROP_API_TOKEN` — PAT with read access to that repo if it is private
2. Push to `main` / `master` or open a PR; the job checks out the API, runs `docker compose up`, seeds, then `npx cypress run`.

## Expected failures before backend fixes (Task 2)

With the **intentionally buggy** assignment API, several tests are meant to fail until the service is fixed. Examples:

| Area | What the test expects |
|------|------------------------|
| Product `price` | Decimal values persist as floats (Postgres `integer` column currently rejects or truncates) |
| `products` filter `status` | Filtering `ACTIVE` returns active rows only (logic currently inverted) |
| Pagination | Page `1` includes the first row (`skip` uses `page * pageSize` instead of `(page - 1) * pageSize`) |
| `product(id)` | Tenant A cannot load tenant B’s product by id |
| `updateProduct` | Tenant A cannot mutate tenant B’s product |
| `createImage` default `priority` | Defaults to **100** per README (DB default is currently **0**) |
| Image `priority` | Values outside 1–1000 are rejected |

After you fix the API in the assignment repository, these tests should turn green.

## Assumptions

- Seeded tenants `tenant-a` and `tenant-b` exist.
- GraphQL returns `ID` fields as **strings** in JSON; tests coerce to numbers when sending `Int` variables.
