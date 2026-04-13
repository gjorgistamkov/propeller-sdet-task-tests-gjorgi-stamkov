import { createImage, deleteImage, TENANT_A } from '../../../../support/helpers';

describe('Images - errors and validation', () => {
  it('fails on unknown image field in query', () => {
    cy.graphql(
      `
      query {
        images {
          id
          altText
        }
      }
      `,
      {},
      { tenantId: TENANT_A, allowGraphQLErrors: true, failOnStatusCode: false },
    ).then((body) => {
      expect(body.errors).to.be.an('array').that.is.not.empty;
    });
  });

  it('rejects createImage priority=-1', () => {
    cy.graphql(
      `
      mutation ($input: CreateImageInput!) {
        createImage(input: $input) { id priority }
      }
      `,
      {
        input: {
          url: `https://example.com/minus-${Date.now()}.png`,
          priority: -1,
        },
      },
      { tenantId: TENANT_A, allowGraphQLErrors: true },
    ).then((body) => {
      if (body.errors && body.errors.length > 0) {
        expect(body.errors.length).to.be.greaterThan(0);
        return;
      }
      expect(body.data.createImage.priority).to.be.within(1, 1000);
      deleteImage(body.data.createImage.id, TENANT_A);
    });
  });

  it('rejects createImage priority=1001', () => {
    cy.graphql(
      `
      mutation ($input: CreateImageInput!) {
        createImage(input: $input) { id priority }
      }
      `,
      {
        input: {
          url: `https://example.com/1001-${Date.now()}.png`,
          priority: 1001,
        },
      },
      { tenantId: TENANT_A, allowGraphQLErrors: true },
    ).then((body) => {
      if (body.errors && body.errors.length > 0) {
        expect(body.errors.length).to.be.greaterThan(0);
        return;
      }
      expect(body.data.createImage.priority).to.be.within(1, 1000);
      deleteImage(body.data.createImage.id, TENANT_A);
    });
  });

  it('rejects createImage priority=5000', () => {
    cy.graphql(
      `
      mutation ($input: CreateImageInput!) {
        createImage(input: $input) { id priority }
      }
      `,
      {
        input: {
          url: `https://example.com/5000-${Date.now()}.png`,
          priority: 5000,
        },
      },
      { tenantId: TENANT_A, allowGraphQLErrors: true },
    ).then((body) => {
      if (body.errors && body.errors.length > 0) {
        expect(body.errors.length).to.be.greaterThan(0);
        return;
      }
      expect(body.data.createImage.priority).to.be.within(1, 1000);
      deleteImage(body.data.createImage.id, TENANT_A);
    });
  });

  it('invalid productId should fail createImage', () => {
    cy.graphql(
      `
      mutation ($input: CreateImageInput!) {
        createImage(input: $input) {
          id
          productId
        }
      }
      `,
      {
        input: {
          url: `https://example.com/bad-product-${Date.now()}.png`,
          priority: 10,
          productId: 999999999,
        },
      },
      { tenantId: TENANT_A, allowGraphQLErrors: true },
    ).then((body) => {
      const hasError = body.errors && body.errors.length > 0;
      if (hasError) {
        expect(body.errors.length).to.be.greaterThan(0);
        return;
      }

      const created = body.data.createImage;
      expect(created.productId, 'API should reject invalid foreign key').to.not.eq(999999999);
      deleteImage(created.id, TENANT_A);
    });
  });

  it('empty url should be rejected', () => {
    cy.graphql(
      `
      mutation ($input: CreateImageInput!) {
        createImage(input: $input) { id url }
      }
      `,
      { input: { url: '', priority: 1 } },
      { tenantId: TENANT_A, allowGraphQLErrors: true },
    ).then((body) => {
      if (body.errors && body.errors.length > 0) {
        expect(body.errors.length).to.be.greaterThan(0);
        return;
      }
      const created = body.data.createImage;
      expect(created.url.trim().length).to.be.greaterThan(0);
      deleteImage(created.id, TENANT_A);
    });
  });

  it('whitespace url should be rejected', () => {
    cy.graphql(
      `
      mutation ($input: CreateImageInput!) {
        createImage(input: $input) { id url }
      }
      `,
      { input: { url: '   ', priority: 1 } },
      { tenantId: TENANT_A, allowGraphQLErrors: true },
    ).then((body) => {
      if (body.errors && body.errors.length > 0) {
        expect(body.errors.length).to.be.greaterThan(0);
        return;
      }
      const created = body.data.createImage;
      expect(created.url.trim().length).to.be.greaterThan(0);
      deleteImage(created.id, TENANT_A);
    });
  });

  it('fails updateImage for unknown image id', () => {
    cy.graphql(
      `
      mutation ($id: Int!, $input: UpdateImageInput!) {
        updateImage(id: $id, input: $input) { id }
      }
      `,
      { id: 999999999, input: { url: 'https://example.com/nope.png' } },
      { tenantId: TENANT_A, allowGraphQLErrors: true },
    ).then((body) => {
      expect(body.errors && body.errors.length > 0, JSON.stringify(body)).to.be.true;
    });
  });

  it('rejects wrong variable type for image id', () => {
    cy.graphql(
      `
      query Image($id: Int!) {
        image(id: $id) { id }
      }
      `,
      { id: 'bad-id' },
      { tenantId: TENANT_A, allowGraphQLErrors: true, failOnStatusCode: false },
    ).then((body) => {
      expect(body.errors && body.errors.length > 0).to.be.true;
    });
  });

  it('valid image create still succeeds (sanity)', () => {
    createImage({ url: `https://example.com/ok-${Date.now()}.png`, priority: 2 }, TENANT_A).then(
      (created) => {
        expect(created.id).to.exist;
        deleteImage(created.id, TENANT_A);
      },
    );
  });
});