import {
  queryImages,
  queryImage,
  queryProducts,
  createProduct,
  createImage,
  deleteImage,
  deleteProduct,
  TENANT_A,
  TENANT_B,
} from '../../../../support/helpers';

describe('Images - queries', () => {
  const listPaging = { page: 0, pageSize: 100 };

  it('lists images for tenant-a including orphan images', () => {
    queryImages({ tenantId: TENANT_A }).then((images) => {
      expect(images.length).to.be.greaterThan(0);
      const orphanImages = images.filter((img) => img.productId == null);
      expect(orphanImages.length).to.be.greaterThan(0);
    });
  });

  it('filters images by productId', () => {
    queryProducts({ ...listPaging, tenantId: TENANT_A }).then((products) => {
      const productId = Number(products[0].id);

      queryImages({ productId, tenantId: TENANT_A }).then((images) => {
        expect(images.length).to.be.greaterThan(0);
        images.forEach((img) => {
          expect(Number(img.productId)).to.eq(productId);
        });
      });
    });
  });

  it('returns single image with product relation when linked', () => {
    queryImages({ tenantId: TENANT_A }).then((images) => {
      const linked = images.find((img) => img.product && img.product.id);
      expect(linked, 'expected a linked image from seed').to.exist;

      queryImage(Number(linked.id), TENANT_A).then((img) => {
        expect(img.id).to.eq(linked.id);
        expect(img.product).to.exist;
        expect(img.product.name).to.be.a('string');
      });
    });
  });

  it('relationship: product query includes created image', () => {
    createProduct({ name: `Image relation ${Date.now()}`, price: 8, status: 'ACTIVE' }, TENANT_A).then(
      (product) => {
        createImage(
          {
            url: `https://example.com/rel-${Date.now()}.png`,
            priority: 5,
            productId: product.id,
          },
          TENANT_A,
        ).then((image) => {
          queryProducts({
            ...listPaging,
            filter: { name: product.name },
            tenantId: TENANT_A,
          }).then((productList) => {
            const found = productList.find((p) => Number(p.id) === Number(product.id));
            expect(found).to.exist;
            expect(found.images.map((i) => Number(i.id))).to.include(Number(image.id));
          });

          deleteImage(image.id, TENANT_A);
          deleteProduct(product.id, TENANT_A);
        });
      },
    );
  });

  it('tenant-b cannot query tenant-a image by id', () => {
    queryImages({ tenantId: TENANT_A }).then((aImages) => {
      const aImageId = Number(aImages[0].id);
      cy.graphql(
        `
        query Image($id: Int!) {
          image(id: $id) {
            id
          }
        }
        `,
        { id: aImageId },
        { tenantId: TENANT_B, allowGraphQLErrors: true },
      ).then((body) => {
        const hasError = body.errors && body.errors.length > 0;
        const hasNullData = body.data && body.data.image === null;
        expect(hasError || hasNullData).to.be.true;
      });
    });
  });
});