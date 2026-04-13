/**
 * Shared GraphQL helpers + assertions for Product and Image domains.
 * Uses cy.graphql — keep mutations as parameterized documents (safer than string interpolation).
 */

export const TENANT_A = 'tenant-a';
export const TENANT_B = 'tenant-b';

/** @typedef {'tenant-a' | 'tenant-b'} TenantId */

/**
 * GraphQL returns `ID` fields as strings in JSON; variables typed as `Int` must be real numbers.
 * @param {unknown} value
 * @returns {number|undefined}
 */
function asInt(value) {
  if (value === null || value === undefined) {
    return undefined;
  }
  const n = Number(value);
  if (Number.isNaN(n)) {
    throw new Error(`Expected integer-compatible value, got: ${String(value)}`);
  }
  return n;
}

// --- Products: validations ---------------------------------------------------

export function validateProductShape(product) {
  expect(product, 'product').to.be.an('object');
  expect(product).to.have.property('id');
  expect(product).to.have.property('name');
  expect(product).to.have.property('price');
  expect(product).to.have.property('status');
}

/**
 * @param {object} product - API product
 * @param {object} expected - subset to assert
 * @param {string} [expected.name]
 * @param {number} [expected.price]
 * @param {string} [expected.status]
 */
export function validateProduct(product, expected) {
  validateProductShape(product);
  if (expected.name !== undefined) {
    expect(product.name).to.eq(expected.name);
  }
  if (expected.price !== undefined) {
    expect(product.price).to.eq(expected.price);
  }
  if (expected.status !== undefined) {
    expect(product.status).to.eq(expected.status);
  }
}

// --- Products: CRUD + queries -----------------------------------------------

const M_CREATE_PRODUCT = `
  mutation CreateProduct($input: CreateProductInput!) {
    createProduct(input: $input) {
      id
      name
      price
      status
      tenantId
    }
  }
`;

const M_UPDATE_PRODUCT = `
  mutation UpdateProduct($id: Int!, $input: UpdateProductInput!) {
    updateProduct(id: $id, input: $input) {
      id
      name
      price
      status
    }
  }
`;

const M_DELETE_PRODUCT = `
  mutation DeleteProduct($id: Int!) {
    deleteProduct(id: $id)
  }
`;

const Q_PRODUCTS = `
  query Products($filter: ProductFilterInput, $page: Int, $pageSize: Int) {
    products(filter: $filter, page: $page, pageSize: $pageSize) {
      id
      name
      price
      status
      tenantId
      images {
        id
        url
        priority
      }
    }
  }
`;

const Q_PRODUCT = `
  query Product($id: Int!) {
    product(id: $id) {
      id
      name
      price
      status
      tenantId
      images {
        id
        url
        priority
        productId
      }
    }
  }
`;

/**
 * @param {object} input
 * @param {string} input.name
 * @param {number} input.price
 * @param {'ACTIVE'|'INACTIVE'} [input.status]
 * @param {TenantId} [tenantId]
 */
export function createProduct(input, tenantId = TENANT_A) {
  const variables = {
    input: {
      name: input.name,
      price: input.price,
      ...(input.status ? { status: input.status } : {}),
    },
  };
  return cy.graphql(M_CREATE_PRODUCT, variables, { tenantId }).then((data) => data.createProduct);
}

/**
 * @param {number} id
 * @param {object} input
 * @param {TenantId} [tenantId]
 */
export function updateProduct(id, input, tenantId = TENANT_A) {
  return cy
    .graphql(M_UPDATE_PRODUCT, { id: asInt(id), input }, { tenantId })
    .then((data) => data.updateProduct);
}

/**
 * @param {number} id
 * @param {TenantId} [tenantId]
 */
export function deleteProduct(id, tenantId = TENANT_A) {
  return cy
    .graphql(M_DELETE_PRODUCT, { id: asInt(id) }, { tenantId })
    .then((data) => data.deleteProduct);
}

/**
 * @param {object} [params]
 * @param {object} [params.filter]
 * @param {number} [params.page]
 * @param {number} [params.pageSize]
 * @param {TenantId} [params.tenantId]
 */
export function queryProducts(params = {}) {
  const { filter, page, pageSize, tenantId = TENANT_A } = params;
  const variables = {};
  if (filter !== undefined) variables.filter = filter;
  if (page !== undefined) variables.page = asInt(page);
  if (pageSize !== undefined) variables.pageSize = asInt(pageSize);
  return cy.graphql(Q_PRODUCTS, variables, { tenantId }).then((data) => data.products);
}

/**
 * @param {number} id
 * @param {TenantId} [tenantId]
 */
export function queryProduct(id, tenantId = TENANT_A) {
  return cy.graphql(Q_PRODUCT, { id: asInt(id) }, { tenantId }).then((data) => data.product);
}

// --- Images: validations -----------------------------------------------------

export function validateImageShape(image) {
  expect(image, 'image').to.be.an('object');
  expect(image).to.have.property('id');
  expect(image).to.have.property('url');
  expect(image).to.have.property('priority');
}

/**
 * @param {object} image
 * @param {object} expected
 * @param {string} [expected.url]
 * @param {number} [expected.priority]
 * @param {number|null} [expected.productId]
 */
export function validateImage(image, expected) {
  validateImageShape(image);
  if (expected.url !== undefined) {
    expect(image.url).to.eq(expected.url);
  }
  if (expected.priority !== undefined) {
    expect(image.priority).to.eq(expected.priority);
  }
  if (expected.productId !== undefined) {
    expect(image.productId).to.eq(expected.productId);
  }
}

// --- Images: CRUD + queries --------------------------------------------------

const M_CREATE_IMAGE = `
  mutation CreateImage($input: CreateImageInput!) {
    createImage(input: $input) {
      id
      url
      priority
      productId
      tenantId
    }
  }
`;

const M_UPDATE_IMAGE = `
  mutation UpdateImage($id: Int!, $input: UpdateImageInput!) {
    updateImage(id: $id, input: $input) {
      id
      url
      priority
      productId
    }
  }
`;

const M_DELETE_IMAGE = `
  mutation DeleteImage($id: Int!) {
    deleteImage(id: $id)
  }
`;

const Q_IMAGES = `
  query Images($productId: Int) {
    images(productId: $productId) {
      id
      url
      priority
      productId
      product {
        id
        name
      }
    }
  }
`;

const Q_IMAGE = `
  query Image($id: Int!) {
    image(id: $id) {
      id
      url
      priority
      productId
      product {
        id
        name
      }
    }
  }
`;

/**
 * @param {object} input
 * @param {string} input.url
 * @param {number} [input.priority]
 * @param {number} [input.productId]
 * @param {TenantId} [tenantId]
 */
export function createImage(input, tenantId = TENANT_A) {
  const payload = { ...input };
  if (payload.productId !== undefined && payload.productId !== null) {
    payload.productId = asInt(payload.productId);
  }
  if (payload.priority !== undefined && payload.priority !== null) {
    payload.priority = asInt(payload.priority);
  }
  const variables = { input: payload };
  return cy.graphql(M_CREATE_IMAGE, variables, { tenantId }).then((data) => data.createImage);
}

/**
 * @param {number} id
 * @param {object} input
 * @param {TenantId} [tenantId]
 */
export function updateImage(id, input, tenantId = TENANT_A) {
  const patch = { ...input };
  if (patch.productId !== undefined && patch.productId !== null) {
    patch.productId = asInt(patch.productId);
  }
  if (patch.priority !== undefined && patch.priority !== null) {
    patch.priority = asInt(patch.priority);
  }
  return cy
    .graphql(M_UPDATE_IMAGE, { id: asInt(id), input: patch }, { tenantId })
    .then((data) => data.updateImage);
}

/**
 * @param {number} id
 * @param {TenantId} [tenantId]
 */
export function deleteImage(id, tenantId = TENANT_A) {
  return cy
    .graphql(M_DELETE_IMAGE, { id: asInt(id) }, { tenantId })
    .then((data) => data.deleteImage);
}

/**
 * @param {object} [params]
 * @param {number} [params.productId]
 * @param {TenantId} [params.tenantId]
 */
export function queryImages(params = {}) {
  const { productId, tenantId = TENANT_A } = params;
  const variables = {};
  if (productId !== undefined) {
    variables.productId = asInt(productId);
  }
  return cy.graphql(Q_IMAGES, variables, { tenantId }).then((data) => data.images);
}

/**
 * @param {number} id
 * @param {TenantId} [tenantId]
 */
export function queryImage(id, tenantId = TENANT_A) {
  return cy.graphql(Q_IMAGE, { id: asInt(id) }, { tenantId }).then((data) => data.image);
}
