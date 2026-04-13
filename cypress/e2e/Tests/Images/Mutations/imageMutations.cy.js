import {
  createImage,
  updateImage,
  deleteImage,
  createProduct,
  deleteProduct,
  validateImage,
  TENANT_A,
  TENANT_B,
} from '../../../../support/helpers';

describe('Images - mutations', () => {
  it('creates image with default priority when omitted', () => {
    const url = `https://example.com/default-${Date.now()}.png`;
    createImage({ url }, TENANT_A).then((created) => {
      expect(created.id).to.exist;
      expect(created.priority).to.eq(100);
      deleteImage(created.id, TENANT_A);
    });
  });

  it('creates image linked to a product (tenant-a)', () => {
    createProduct({ name: `Image parent A ${Date.now()}`, price: 1, status: 'ACTIVE' }, TENANT_A).then(
      (product) => {
        createImage(
          {
            url: `https://example.com/linked-a-${Date.now()}.png`,
            priority: 50,
            productId: product.id,
          },
          TENANT_A,
        ).then((created) => {
          validateImage(created, {
            url: created.url,
            priority: 50,
            productId: Number(product.id),
          });
          deleteImage(created.id, TENANT_A);
          deleteProduct(product.id, TENANT_A);
        });
      },
    );
  });

  it('creates image linked to a product (tenant-b CRUD mirror)', () => {
    createProduct({ name: `Image parent B ${Date.now()}`, price: 2, status: 'ACTIVE' }, TENANT_B).then(
      (product) => {
        createImage(
          {
            url: `https://example.com/linked-b-${Date.now()}.png`,
            priority: 55,
            productId: product.id,
          },
          TENANT_B,
        ).then((created) => {
          validateImage(created, {
            url: created.url,
            priority: 55,
            productId: Number(product.id),
          });
          deleteImage(created.id, TENANT_B);
          deleteProduct(product.id, TENANT_B);
        });
      },
    );
  });

  it('updates image url and priority (tenant-a)', () => {
    createImage({ url: `https://example.com/before-a-${Date.now()}.png`, priority: 10 }, TENANT_A).then(
      (created) => {
        const nextUrl = `https://example.com/after-a-${Date.now()}.png`;
        updateImage(created.id, { url: nextUrl, priority: 20 }, TENANT_A).then((updated) => {
          expect(updated.url).to.eq(nextUrl);
          expect(updated.priority).to.eq(20);
        });
        deleteImage(created.id, TENANT_A);
      },
    );
  });

  it('updates image url and priority (tenant-b CRUD mirror)', () => {
    createImage({ url: `https://example.com/before-b-${Date.now()}.png`, priority: 11 }, TENANT_B).then(
      (created) => {
        const nextUrl = `https://example.com/after-b-${Date.now()}.png`;
        updateImage(created.id, { url: nextUrl, priority: 21 }, TENANT_B).then((updated) => {
          expect(updated.url).to.eq(nextUrl);
          expect(updated.priority).to.eq(21);
        });
        deleteImage(created.id, TENANT_B);
      },
    );
  });

  it('deletes image and can no longer query it (tenant-a)', () => {
    createImage({ url: `https://example.com/delete-a-${Date.now()}.png`, priority: 1 }, TENANT_A).then(
      (created) => {
        deleteImage(created.id, TENANT_A).then((ok) => expect(ok).to.eq(true));

        cy.graphql(
          `query($id: Int!) { image(id: $id) { id } }`,
          { id: Number(created.id) },
          { tenantId: TENANT_A, allowGraphQLErrors: true },
        ).then((body) => {
          const gone =
            (body.errors && body.errors.length > 0) ||
            (body.data && body.data.image === null);
          expect(gone).to.be.true;
        });
      },
    );
  });

  it('deletes image and can no longer query it (tenant-b CRUD mirror)', () => {
    createImage({ url: `https://example.com/delete-b-${Date.now()}.png`, priority: 2 }, TENANT_B).then(
      (created) => {
        deleteImage(created.id, TENANT_B).then((ok) => expect(ok).to.eq(true));

        cy.graphql(
          `query($id: Int!) { image(id: $id) { id } }`,
          { id: Number(created.id) },
          { tenantId: TENANT_B, allowGraphQLErrors: true },
        ).then((body) => {
          const gone =
            (body.errors && body.errors.length > 0) ||
            (body.data && body.data.image === null);
          expect(gone).to.be.true;
        });
      },
    );
  });

  it('fails updateImage for unknown image id', () => {
    cy.graphql(
      `
      mutation ($id: Int!, $input: UpdateImageInput!) {
        updateImage(id: $id, input: $input) { id }
      }
      `,
      { id: 999999999, input: { url: 'https://example.com/unknown.png' } },
      { tenantId: TENANT_A, allowGraphQLErrors: true },
    ).then((body) => {
      expect(body.errors && body.errors.length > 0, JSON.stringify(body)).to.be.true;
    });
  });

  it('tenant-a cannot update tenant-b image', () => {
    createImage({ url: `https://example.com/cross-update-${Date.now()}.png`, priority: 9 }, TENANT_B).then(
      (created) => {
        cy.graphql(
          `
          mutation ($id: Int!, $input: UpdateImageInput!) {
            updateImage(id: $id, input: $input) { id url }
          }
          `,
          { id: Number(created.id), input: { url: 'https://example.com/hacked.png' } },
          { tenantId: TENANT_A, allowGraphQLErrors: true },
        ).then((body) => {
          expect(body.errors && body.errors.length > 0, JSON.stringify(body)).to.be.true;
        });
        deleteImage(created.id, TENANT_B);
      },
    );
  });

  it('tenant-a cannot delete tenant-b image', () => {
    createImage({ url: `https://example.com/cross-delete-${Date.now()}.png`, priority: 8 }, TENANT_B).then(
      (created) => {
        cy.graphql(
          `mutation ($id: Int!) { deleteImage(id: $id) }`,
          { id: Number(created.id) },
          { tenantId: TENANT_A, allowGraphQLErrors: true },
        ).then((body) => {
          const hasError = body.errors && body.errors.length > 0;
          const denied = hasError || (body.data && body.data.deleteImage === false);
          expect(denied).to.be.true;
        });
        deleteImage(created.id, TENANT_B);
      },
    );
  });
});