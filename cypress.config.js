const { defineConfig } = require('cypress');

/**
 * API runs separately (Docker). Point tests at it with:
 * - cypress.env.json: { "apiUrl": "http://localhost:3000/graphql" }
 * - or env: CYPRESS_apiUrl=http://host.docker.internal:3000/graphql
 */
module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: 'cypress/support/e2e.js',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    video: false,
    screenshotOnRunFailure: true,
    env: {
      apiUrl: 'http://localhost:3000/graphql',
    },
  },
});
