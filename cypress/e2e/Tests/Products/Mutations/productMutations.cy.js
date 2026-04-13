import {
  createProduct,
  updateProduct,
  deleteProduct,
  deleteImage,
  queryProduct,
  queryImages,
  validateProduct,
  TENANT_A,
  TENANT_B,
} from '../../../../support/helpers';

describe('Products - mutations', () => {
  it('creates product for tenant-a and validates fields', () => {
    const name = `Product A ${Date.now()}`;
    createProduct({ name, price: 42, status: 'ACTIVE' }, TENANT_A).then((created) => {
      validateProduct(created, { name, price: 42, status: 'ACTIVE' });
      deleteProduct(created.id, TENANT_A);
    });
  });

  it('creates product for tenant-b with INACTIVE status', () => {
    const name = `Product B ${Date.now()}`;
    createProduct({ name, price: 7, status: 'INACTIVE' }, TENANT_B).then((created) => {
      validateProduct(created, { name, price: 7, status: 'INACTIVE' });
      deleteProduct(created.id, TENANT_B);
    });
  });

  it('creates product with price 0 (edge case)', () => {
    const name = `Zero price ${Date.now()}`;
    createProduct({ name, price: 0, status: 'ACTIVE' }, TENANT_A).then((created) => {
      expect(created.price).to.eq(0);
      deleteProduct(created.id, TENANT_A);
    });
  });

  it('supports rapid concurrent creates for tenant-a', () => {
    const apiUrl = Cypress.env('apiUrl') || 'http://localhost:3000/graphql';
    const mutation = `
      mutation ($input: CreateProductInput!) {
        createProduct(input: $input) { id name price status }
      }
    `;

    cy.then(async () => {
      const requests = Array.from({ length: 5 }).map((_, index) => {
        const payload = {
          query: mutation,
          variables: {
            input: {
              name: `Concurrent ${Date.now()}-${index}`,
              price: 10 + index,
              status: 'ACTIVE',
            },
          },
        };

        return fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-tenant-id': TENANT_A,
          },
          body: JSON.stringify(payload),
        }).then((res) => res.json());
      });

      const results = await Promise.all(requests);
      const createdIds = results
        .filter((r) => r && r.data && r.data.createProduct)
        .map((r) => r.data.createProduct.id);

      expect(createdIds.length).to.eq(5);

      for (const id of createdIds) {
        await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-tenant-id': TENANT_A,
          },
          body: JSON.stringify({
            query: `mutation ($id: Int!) { deleteProduct(id: $id) }`,
            variables: { id: Number(id) },
          }),
        });
      }
    });
  });

  it('updates product name, price and status for tenant-a', () => {
    const baseName = `Updatable ${Date.now()}`;
    createProduct({ name: baseName, price: 10, status: 'ACTIVE' }, TENANT_A).then((created) => {
      updateProduct(
        created.id,
        { name: `${baseName}-v2`, price: 20, status: 'INACTIVE' },
        TENANT_A,
      ).then((updated) => {
        validateProduct(updated, {
          name: `${baseName}-v2`,
          price: 20,
          status: 'INACTIVE',
        });
      });
      deleteProduct(created.id, TENANT_A);
    });
  });

  it('updates product for tenant-b CRUD mirror', () => {
    const baseName = `TenantB-updatable ${Date.now()}`;
    createProduct({ name: baseName, price: 14, status: 'ACTIVE' }, TENANT_B).then((created) => {
      updateProduct(
        created.id,
        { name: `${baseName}-v2`, price: 18, status: 'INACTIVE' },
        TENANT_B,
      ).then((updated) => {
        validateProduct(updated, {
          name: `${baseName}-v2`,
          price: 18,
          status: 'INACTIVE',
        });
      });
      deleteProduct(created.id, TENANT_B);
    });
  });

  it('bulk delete: deletes 3 created products and verifies they are gone', () => {
    const ids = [];
    createProduct({ name: `Bulk 1 ${Date.now()}`, price: 3, status: 'ACTIVE' }, TENANT_A).then((p1) => {
      ids.push(p1.id);
      createProduct({ name: `Bulk 2 ${Date.now()}`, price: 4, status: 'ACTIVE' }, TENANT_A).then((p2) => {
        ids.push(p2.id);
        createProduct({ name: `Bulk 3 ${Date.now()}`, price: 5, status: 'ACTIVE' }, TENANT_A).then((p3) => {
          ids.push(p3.id);
          ids.forEach((id) => {
            deleteProduct(id, TENANT_A).then((ok) => expect(ok).to.eq(true));
          });

          ids.forEach((id) => {
            cy.graphql(
              `query ($id: Int!) { product(id: $id) { id } }`,
              { id: Number(id) },
              { tenantId: TENANT_A, allowGraphQLErrors: true },
            ).then((body) => {
              const gone =
                (body.errors && body.errors.length > 0) ||
                (body.data && body.data.product === null);
              expect(gone).to.be.true;
            });
          });
        });
      });
    });
  });

  it('deleteProduct returns true and product is not queryable anymore', () => {
    createProduct({ name: `To delete ${Date.now()}`, price: 1, status: 'ACTIVE' }, TENANT_A).then(
      (created) => {
        deleteProduct(created.id, TENANT_A).then((ok) => expect(ok).to.eq(true));

        cy.graphql(
          `query ($id: Int!) { product(id: $id) { id } }`,
          { id: Number(created.id) },
          { tenantId: TENANT_A, allowGraphQLErrors: true },
        ).then((body) => {
          const gone =
            (body.errors && body.errors.length > 0) ||
            (body.data && body.data.product === null);
          expect(gone).to.be.true;
        });
      },
    );
  });

  it('delete with related image should cascade or fail clearly', () => {
    createProduct({ name: `Product with image ${Date.now()}`, price: 5, status: 'ACTIVE' }, TENANT_A).then(
      (created) => {
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
              url: `https://example.com/product-img-${Date.now()}.png`,
              priority: 10,
              productId: Number(created.id),
            },
          },
          { tenantId: TENANT_A },
        ).then((data) => {
          const imageId = Number(data.createImage.id);

          cy.graphql(
            `mutation ($id: Int!) { deleteProduct(id: $id) }`,
            { id: Number(created.id) },
            { tenantId: TENANT_A, allowGraphQLErrors: true },
          ).then((body) => {
            if (body.errors && body.errors.length > 0) {
              const errorText = JSON.stringify(body.errors);
              expect(errorText.includes('foreign key') || errorText.includes('FK_')).to.be.true;
              deleteImage(imageId, TENANT_A);
              deleteProduct(created.id, TENANT_A);
              return;
            }

            expect(body.data.deleteProduct).to.eq(true);
            queryImages({ tenantId: TENANT_A }).then((images) => {
              const orphan = images.find(
                (img) => Number(img.id) === imageId && Number(img.productId) === Number(created.id),
              );
              expect(orphan).to.be.undefined;
            });
          });
        });
      },
    );
  });

  it('supports decimal prices per GraphQL Float contract', () => {
    const decimalPrice = 19.99;
    createProduct({ name: `Decimal ${Date.now()}`, price: decimalPrice, status: 'ACTIVE' }, TENANT_A).then(
      (created) => {
        queryProduct(created.id, TENANT_A).then((fetched) => {
          expect(fetched.price).to.eq(decimalPrice);
        });
        deleteProduct(created.id, TENANT_A);
      },
    );
  });

  it('rejects update on unknown product id', () => {
    cy.graphql(
      `
      mutation ($id: Int!, $input: UpdateProductInput!) {
        updateProduct(id: $id, input: $input) {
          id
        }
      }
      `,
      { id: 999999999, input: { name: 'nope' } },
      { tenantId: TENANT_A, allowGraphQLErrors: true },
    ).then((body) => {
      expect(body.errors && body.errors.length > 0, JSON.stringify(body)).to.be.true;
    });
  });

  it('tenant-a cannot update tenant-b product', () => {
    createProduct({ name: `Tenant B only ${Date.now()}`, price: 3, status: 'ACTIVE' }, TENANT_B).then(
      (bProduct) => {
        cy.graphql(
          `
          mutation ($id: Int!, $input: UpdateProductInput!) {
            updateProduct(id: $id, input: $input) {
              id
              name
            }
          }
          `,
          { id: Number(bProduct.id), input: { name: 'hacked' } },
          { tenantId: TENANT_A, allowGraphQLErrors: true },
        ).then((body) => {
          expect(body.errors && body.errors.length > 0, JSON.stringify(body)).to.be.true;
        });
        deleteProduct(bProduct.id, TENANT_B);
      },
    );
  });
});