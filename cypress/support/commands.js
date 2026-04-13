/// <reference types="cypress" />

/**
 * POST a GraphQL operation to the API.
 *
 * @param {string} query - GraphQL query or mutation document
 * @param {Record<string, unknown>} [variables]
 * @param {object} [options]
 * @param {boolean} [options.failOnStatusCode=false] - passed to cy.request
 * @param {boolean} [options.returnFullResponse=false] - return full cy.request response
 * @param {string} [options.tenantId='tenant-a'] - x-tenant-id header
 * @param {boolean} [options.allowGraphQLErrors=false] - if true, do not throw when body.errors is set; returns full body { data, errors }
 */
Cypress.Commands.add('graphql', (query, variables = {}, options = {}) => {
  const {
    failOnStatusCode = false,
    returnFullResponse = false,
    tenantId = 'tenant-a',
    allowGraphQLErrors = false,
  } = options;

  const apiUrl = Cypress.env('apiUrl') || 'http://localhost:3000/graphql';

  return cy
    .request({
      method: 'POST',
      url: apiUrl,
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': tenantId,
      },
      body: {
        query,
        variables,
      },
      failOnStatusCode,
    })
    .then((response) => {
      const body = response.body;

      if (!allowGraphQLErrors && body.errors && body.errors.length) {
        throw new Error(JSON.stringify(body.errors, null, 2));
      }

      if (returnFullResponse) {
        return response;
      }

      if (allowGraphQLErrors) {
        return body;
      }

      return body.data;
    });
});
