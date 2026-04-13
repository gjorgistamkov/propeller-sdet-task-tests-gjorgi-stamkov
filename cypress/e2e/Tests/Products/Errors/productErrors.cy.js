import { createProduct, deleteProduct, TENANT_A } from '../../../../support/helpers';

describe('Products - errors and validation', () => {
  it('returns errors for invalid GraphQL syntax', () => {
    cy.graphql(
      `query { thisIsNotValid }`,
      {},
      { tenantId: TENANT_A, allowGraphQLErrors: true, failOnStatusCode: false },
    ).then((body) => {
      expect(body.errors).to.be.an('array').that.is.not.empty;
    });
  });

  it('fails on unknown Product field in query', () => {
    cy.graphql(
      `
      query {
        products {
          id
          notARealField
        }
      }
      `,
      {},
      { tenantId: TENANT_A, allowGraphQLErrors: true, failOnStatusCode: false },
    ).then((body) => {
      expect(body.errors).to.be.an('array').that.is.not.empty;
    });
  });

  it('rejects wrong variable type for product id', () => {
    cy.graphql(
      `
      query Product($id: Int!) {
        product(id: $id) {
          id
        }
      }
      `,
      { id: 'not-a-number' },
      { tenantId: TENANT_A, allowGraphQLErrors: true, failOnStatusCode: false },
    ).then((body) => {
      expect(body.errors).to.be.an('array').that.is.not.empty;
    });
  });

  it('rejects invalid enum status BROKEN_STATUS', () => {
    cy.graphql(
      `
      mutation ($input: CreateProductInput!) {
        createProduct(input: $input) { id }
      }
      `,
      {
        input: {
          name: `Bad enum ${Date.now()}`,
          price: 10,
          status: 'BROKEN_STATUS',
        },
      },
      { tenantId: TENANT_A, allowGraphQLErrors: true, failOnStatusCode: false },
    ).then((body) => {
      expect(body.errors && body.errors.length > 0).to.be.true;
    });
  });

  it('rejects invalid enum status PENDING_REVIEW', () => {
    cy.graphql(
      `
      mutation ($input: CreateProductInput!) {
        createProduct(input: $input) { id }
      }
      `,
      {
        input: {
          name: `Pending review ${Date.now()}`,
          price: 10,
          status: 'PENDING_REVIEW',
        },
      },
      { tenantId: TENANT_A, allowGraphQLErrors: true, failOnStatusCode: false },
    ).then((body) => {
      expect(body.errors && body.errors.length > 0).to.be.true;
    });
  });

  it('price=0 should be accepted as valid edge case', () => {
    createProduct({ name: `Zero ${Date.now()}`, price: 0, status: 'ACTIVE' }, TENANT_A).then((created) => {
      expect(created.price).to.eq(0);
      deleteProduct(created.id, TENANT_A);
    });
  });

  it('name length 256 chars should be rejected or constrained', () => {
    const tooLongName = 'P'.repeat(256);
    cy.graphql(
      `
      mutation ($input: CreateProductInput!) {
        createProduct(input: $input) {
          id
          name
        }
      }
      `,
      {
        input: {
          name: tooLongName,
          price: 20,
          status: 'ACTIVE',
        },
      },
      { tenantId: TENANT_A, allowGraphQLErrors: true },
    ).then((body) => {
      if (body.errors && body.errors.length > 0) {
        expect(body.errors.length).to.be.greaterThan(0);
        return;
      }

      const created = body.data.createProduct;
      expect(created.name.length).to.be.at.most(255);
      deleteProduct(created.id, TENANT_A);
    });
  });

  it('negative product price should be rejected', () => {
    cy.graphql(
      `
      mutation ($input: CreateProductInput!) {
        createProduct(input: $input) {
          id
          price
        }
      }
      `,
      {
        input: {
          name: `Negative ${Date.now()}`,
          price: -100,
          status: 'ACTIVE',
        },
      },
      { tenantId: TENANT_A, allowGraphQLErrors: true },
    ).then((body) => {
      if (body.errors && body.errors.length > 0) {
        expect(body.errors.length).to.be.greaterThan(0);
        return;
      }

      const created = body.data.createProduct;
      expect(created.price, 'API should not allow negative prices').to.be.at.least(0);
      deleteProduct(created.id, TENANT_A);
    });
  });

  it('updateProduct for unknown id should return error', () => {
    cy.graphql(
      `
      mutation ($id: Int!, $input: UpdateProductInput!) {
        updateProduct(id: $id, input: $input) { id }
      }
      `,
      { id: 999999999, input: { name: 'unknown' } },
      { tenantId: TENANT_A, allowGraphQLErrors: true },
    ).then((body) => {
      expect(body.errors && body.errors.length > 0).to.be.true;
    });
  });

  it('missing x-tenant-id header should fail transport or domain validation', () => {
    const apiUrl = Cypress.env('apiUrl') || 'http://localhost:3000/graphql';

    cy.request({
      method: 'POST',
      url: apiUrl,
      failOnStatusCode: false,
      headers: {
        'Content-Type': 'application/json',
      },
      body: {
        query: `query { products { id } }`,
      },
    }).then((response) => {
      expect(response.status).to.eq(200);
      const hasError = response.body.errors && response.body.errors.length > 0;
      expect(hasError).to.be.true;
    });
  });

  it('sanity: valid product creation still works', () => {
    createProduct({ name: `Valid ${Date.now()}`, price: 12, status: 'ACTIVE' }, TENANT_A).then(
      (created) => {
        expect(created.id).to.exist;
        deleteProduct(created.id, TENANT_A);
      },
    );
  });
});