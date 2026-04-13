import { queryProduct, queryProducts, TENANT_A, TENANT_B } from '../../../../support/helpers';

describe('Products - queries', () => {
  const listPaging = { page: 0, pageSize: 100 };

  it('lists only tenant-a products', () => {
    queryProducts({ ...listPaging, tenantId: TENANT_A }).then((products) => {
      expect(products.length).to.be.greaterThan(0);
      products.forEach((p) => expect(p.tenantId).to.eq(TENANT_A));
    });
  });

  it('lists only tenant-b products', () => {
    queryProducts({ ...listPaging, tenantId: TENANT_B }).then((products) => {
      expect(products.length).to.be.greaterThan(0);
      products.forEach((p) => expect(p.tenantId).to.eq(TENANT_B));
    });
  });

  it('filters by name (case-insensitive)', () => {
    queryProducts({ ...listPaging, filter: { name: 'coffee' }, tenantId: TENANT_B }).then((products) => {
      expect(products.length).to.be.at.least(1);
      products.forEach((p) => expect(p.name.toLowerCase()).to.include('coffee'));
    });
  });

  it('filters by ACTIVE status', () => {
    queryProducts({ ...listPaging, filter: { status: 'ACTIVE' }, tenantId: TENANT_A }).then((products) => {
      expect(products.length).to.be.greaterThan(0);
      products.forEach((p) => expect(p.status).to.eq('ACTIVE'));
    });
  });

  it('filters by INACTIVE status', () => {
    queryProducts({ ...listPaging, filter: { status: 'INACTIVE' }, tenantId: TENANT_A }).then((products) => {
      expect(products.length).to.be.greaterThan(0);
      products.forEach((p) => expect(p.status).to.eq('INACTIVE'));
    });
  });

  it('filters by minPrice and maxPrice', () => {
    queryProducts({
      ...listPaging,
      filter: { minPrice: 10, maxPrice: 30 },
      tenantId: TENANT_A,
    }).then((products) => {
      expect(products.length).to.be.greaterThan(0);
      products.forEach((p) => {
        expect(p.price).to.be.at.least(10);
        expect(p.price).to.be.at.most(30);
      });
    });
  });

  it('supports combined filters: status + minPrice', () => {
    queryProducts({
      ...listPaging,
      filter: { status: 'ACTIVE', minPrice: 20 },
      tenantId: TENANT_A,
    }).then((products) => {
      expect(products.length).to.be.greaterThan(0);
      products.forEach((p) => {
        expect(p.status).to.eq('ACTIVE');
        expect(p.price).to.be.at.least(20);
      });
    });
  });

  it('supports combined filters: name + status + maxPrice', () => {
    queryProducts({
      ...listPaging,
      filter: { name: 'steel', status: 'ACTIVE', maxPrice: 100 },
      tenantId: TENANT_A,
    }).then((products) => {
      products.forEach((p) => {
        expect(p.name.toLowerCase()).to.include('steel');
        expect(p.status).to.eq('ACTIVE');
        expect(p.price).to.be.at.most(100);
      });
    });
  });

  it('pageSize=0 should return empty list or GraphQL error', () => {
    cy.graphql(
      `
      query Products($page: Int, $pageSize: Int) {
        products(page: $page, pageSize: $pageSize) {
          id
        }
      }
      `,
      { page: 1, pageSize: 0 },
      { tenantId: TENANT_A, allowGraphQLErrors: true },
    ).then((body) => {
      if (body.errors && body.errors.length) {
        expect(body.errors.length).to.be.greaterThan(0);
        return;
      }
      expect(body.data.products).to.be.an('array').with.length(0);
    });
  });

  it('page=999 should return empty list for tenant data set', () => {
    queryProducts({ page: 999, pageSize: 10, tenantId: TENANT_A }).then((products) => {
      expect(products).to.be.an('array').with.length(0);
    });
  });

  it('page 1 and page 2 should not overlap for same pageSize', () => {
    queryProducts({ page: 1, pageSize: 3, tenantId: TENANT_A }).then((page1) => {
      queryProducts({ page: 2, pageSize: 3, tenantId: TENANT_A }).then((page2) => {
        const ids1 = page1.map((p) => String(p.id));
        const ids2 = page2.map((p) => String(p.id));
        const overlap = ids1.filter((id) => ids2.includes(id));
        expect(overlap, 'pages should not overlap').to.have.length(0);
      });
    });
  });

  it('paginates: page 1 should include the first sorted product', () => {
    queryProducts({ page: 1, pageSize: 3, tenantId: TENANT_A }).then((page1) => {
      queryProducts({ ...listPaging, tenantId: TENANT_A }).then((all) => {
        const sorted = [...all].sort((a, b) => Number(a.id) - Number(b.id));
        const firstId = sorted[0].id;
        const idsOnPage1 = page1.map((p) => p.id);
        expect(idsOnPage1).to.include(firstId);
      });
    });
  });

  it('returns product by id for same tenant', () => {
    queryProducts({ ...listPaging, tenantId: TENANT_A }).then((list) => {
      const id = list[0].id;
      queryProduct(id, TENANT_A).then((product) => {
        expect(product.id).to.eq(id);
        expect(product.name).to.be.a('string');
      });
    });
  });

  it('does not leak tenant-b product to tenant-a by id', () => {
    queryProducts({ ...listPaging, tenantId: TENANT_B }).then((bList) => {
      const bId = Number(bList[0].id);
      cy.graphql(
        `
        query Product($id: Int!) {
          product(id: $id) {
            id
            tenantId
          }
        }
        `,
        { id: bId },
        { tenantId: TENANT_A, allowGraphQLErrors: true },
      ).then((body) => {
        const hasError = body.errors && body.errors.length > 0;
        const noData = body.data && body.data.product === null;
        expect(hasError || noData).to.be.true;
      });
    });
  });
});