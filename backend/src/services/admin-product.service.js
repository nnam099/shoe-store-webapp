import { AppError } from "../errors/app-error.js";
import {
  inspectProductImage,
  MAX_PRODUCT_IMAGES,
  writeProductImage,
} from "../utils/product-image.js";
import { createSlugBase, createSlugCandidate, normalizeSearchText } from "../utils/product-slug.js";
import { toProductDetail, toProductSummary } from "../utils/public-product.js";

function notFoundError() {
  return new AppError({
    statusCode: 404,
    code: "PRODUCT_NOT_FOUND",
    message: "Không tìm thấy sản phẩm đang bán.",
  });
}

function invalidReferenceError(fields) {
  return new AppError({
    statusCode: 400,
    code: "INVALID_PRODUCT_REFERENCE",
    message: "Loại, thương hiệu, size hoặc màu không hợp lệ.",
    fields,
  });
}

async function validateReferences(repository, input) {
  const variants = input.variants ?? [];
  const references = await repository.referencesExist({
    categoryId: input.categoryId,
    brandId: input.brandId,
    variants,
  });
  const fields = {};
  if (!references.category_exists) fields.categoryId = "Loại giày không tồn tại.";
  if (!references.brand_exists) fields.brandId = "Thương hiệu không tồn tại.";
  if (references.size_count !== references.expectedSizeCount) fields.variants = "Có size không tồn tại.";
  if (references.color_count !== references.expectedColorCount) fields.variants = "Có màu không tồn tại.";
  if (Object.keys(fields).length > 0) throw invalidReferenceError(fields);
}

export function createAdminProductService(repository, { uploadDirectory }) {
  async function getDetail(productId, source = repository) {
    const product = await source.findActiveById(productId);
    if (!product) throw notFoundError();
    const [images, variants] = await Promise.all([
      source.findImages(productId),
      source.findActiveVariants(productId),
    ]);
    return toProductDetail(product, images, variants);
  }

  return {
    async list(query) {
      const normalizedQuery = { ...query, q: normalizeSearchText(query.q) };
      const result = await repository.list(normalizedQuery);
      return {
        items: result.rows.map(toProductSummary),
        pagination: {
          page: query.page,
          pageSize: result.pageSize,
          totalItems: result.total,
          totalPages: Math.ceil(result.total / result.pageSize),
        },
      };
    },

    getOptions() {
      return repository.getOptions();
    },

    getDetail,

    async create(input, files) {
      if (!files || files.length === 0) {
        throw new AppError({
          statusCode: 400,
          code: "PRODUCT_IMAGE_REQUIRED",
          message: "Sản phẩm phải có ít nhất một ảnh.",
          fields: { images: "Hãy chọn ít nhất một ảnh." },
        });
      }
      await Promise.all(files.map(inspectProductImage));

      const productId = await repository.transaction(async (transaction) => {
        await validateReferences(transaction, input);
        const base = createSlugBase(input.name);
        let id = null;

        for (let attempt = 1; attempt <= 100 && id === null; attempt += 1) {
          id = await transaction.insertProduct(
            input,
            createSlugCandidate(base, attempt),
            normalizeSearchText(input.name),
          );
        }
        if (!id) {
          throw new AppError({
            statusCode: 409,
            code: "PRODUCT_SLUG_CONFLICT",
            message: "Không thể tạo slug duy nhất cho sản phẩm.",
          });
        }

        await transaction.insertVariants(id, input.variants);
        const filenames = [];
        for (const file of files) filenames.push(await writeProductImage(file, uploadDirectory));
        await transaction.insertImages(id, filenames);
        return id;
      });

      return getDetail(productId);
    },

    async update(productId, input) {
      await repository.transaction(async (transaction) => {
        const current = await transaction.findActiveById(productId, { lock: true });
        if (!current) throw notFoundError();

        const finalPrice = input.price ?? Number(current.price);
        const finalSalePrice = Object.hasOwn(input, "salePrice")
          ? input.salePrice
          : current.sale_price === null
            ? null
            : Number(current.sale_price);
        if (finalSalePrice !== null && finalSalePrice >= finalPrice) {
          throw new AppError({
            statusCode: 400,
            code: "VALIDATION_ERROR",
            message: "Giá khuyến mãi phải nhỏ hơn giá bán.",
            fields: { salePrice: "Giá khuyến mãi phải nhỏ hơn giá bán." },
          });
        }

        if (input.categoryId !== undefined || input.brandId !== undefined) {
          await validateReferences(transaction, {
            categoryId: input.categoryId ?? current.category_id,
            brandId: input.brandId ?? current.brand_id,
            variants: [],
          });
        }
        await transaction.updateProduct(
          productId,
          input,
          input.name ? normalizeSearchText(input.name) : current.search_name,
        );
      });
      return getDetail(productId);
    },

    async delete(productId) {
      if (!(await repository.softDelete(productId))) throw notFoundError();
    },

    async addImages(productId, files) {
      if (!files || files.length === 0) {
        throw new AppError({
          statusCode: 400,
          code: "PRODUCT_IMAGE_REQUIRED",
          message: "Hãy chọn ít nhất một ảnh.",
          fields: { images: "Hãy chọn ít nhất một ảnh." },
        });
      }
      await Promise.all(files.map(inspectProductImage));

      await repository.transaction(async (transaction) => {
        if (!(await transaction.findActiveById(productId, { lock: true }))) throw notFoundError();
        const images = await transaction.lockImages(productId);
        if (images.length + files.length > MAX_PRODUCT_IMAGES) {
          throw new AppError({
            statusCode: 400,
            code: "PRODUCT_IMAGE_LIMIT",
            message: "Mỗi sản phẩm chỉ được có tối đa 8 ảnh.",
            fields: { images: `Chỉ còn có thể thêm ${MAX_PRODUCT_IMAGES - images.length} ảnh.` },
          });
        }

        const filenames = [];
        for (const file of files) filenames.push(await writeProductImage(file, uploadDirectory));
        await transaction.insertImages(productId, filenames, images.length + 1);
      });
      return getDetail(productId);
    },

    async reorderImages(productId, imageIds) {
      await repository.transaction(async (transaction) => {
        if (!(await transaction.findActiveById(productId, { lock: true }))) throw notFoundError();
        const images = await transaction.lockImages(productId);
        const currentIds = images.map((image) => image.id).sort();
        const requestedIds = [...imageIds].map(String).sort();
        if (
          currentIds.length !== requestedIds.length ||
          currentIds.some((id, index) => id !== requestedIds[index])
        ) {
          throw new AppError({
            statusCode: 400,
            code: "INVALID_IMAGE_ORDER",
            message: "Danh sách sắp xếp phải chứa đúng toàn bộ ảnh hiện tại của sản phẩm.",
            fields: { imageIds: "Danh sách ảnh không khớp sản phẩm." },
          });
        }
        await transaction.updateImagePositions(productId, imageIds);
      });
      return getDetail(productId);
    },

    async removeImage(productId, imageId) {
      await repository.transaction(async (transaction) => {
        if (!(await transaction.findActiveById(productId, { lock: true }))) throw notFoundError();
        const images = await transaction.lockImages(productId);
        if (!images.some((image) => image.id === String(imageId))) {
          throw new AppError({
            statusCode: 404,
            code: "PRODUCT_IMAGE_NOT_FOUND",
            message: "Không tìm thấy ảnh thuộc sản phẩm này.",
          });
        }
        if (images.length <= 1) {
          throw new AppError({
            statusCode: 409,
            code: "LAST_PRODUCT_IMAGE",
            message: "Sản phẩm phải còn ít nhất một ảnh.",
          });
        }
        const removedPosition = await transaction.deleteImage(productId, imageId);
        await transaction.compactImagePositions(productId, removedPosition);
      });
    },

    async addVariant(productId, input) {
      await repository.transaction(async (transaction) => {
        if (!(await transaction.findActiveById(productId, { lock: true }))) throw notFoundError();
        const references = await transaction.variantReferencesExist(input.sizeId, input.colorId);
        if (!references.size_exists || !references.color_exists) {
          throw invalidReferenceError({
            ...(!references.size_exists ? { sizeId: "Size không tồn tại." } : {}),
            ...(!references.color_exists ? { colorId: "Màu không tồn tại." } : {}),
          });
        }

        const existing = await transaction.findVariantPair(productId, input.sizeId, input.colorId);
        if (existing && existing.deleted_at === null) {
          throw new AppError({
            statusCode: 409,
            code: "PRODUCT_VARIANT_CONFLICT",
            message: "Cặp size và màu đã tồn tại trong sản phẩm.",
          });
        }
        if (existing) {
          await transaction.restoreVariant(existing.id, input.stockQuantity);
        } else {
          await transaction.insertVariant(productId, input);
        }
      });
      return getDetail(productId);
    },

    async updateVariant(productId, variantId, stockQuantity) {
      await repository.transaction(async (transaction) => {
        if (!(await transaction.findActiveById(productId, { lock: true }))) throw notFoundError();
        await transaction.lockActiveVariants(productId);
        if (!(await transaction.updateVariantStock(productId, variantId, stockQuantity))) {
          throw new AppError({
            statusCode: 404,
            code: "PRODUCT_VARIANT_NOT_FOUND",
            message: "Không tìm thấy biến thể đang bán thuộc sản phẩm này.",
          });
        }
      });
      return getDetail(productId);
    },

    async removeVariant(productId, variantId) {
      await repository.transaction(async (transaction) => {
        if (!(await transaction.findActiveById(productId, { lock: true }))) throw notFoundError();
        const variants = await transaction.lockActiveVariants(productId);
        if (!variants.some((variant) => variant.id === String(variantId))) {
          throw new AppError({
            statusCode: 404,
            code: "PRODUCT_VARIANT_NOT_FOUND",
            message: "Không tìm thấy biến thể đang bán thuộc sản phẩm này.",
          });
        }
        if (variants.length <= 1) {
          throw new AppError({
            statusCode: 409,
            code: "LAST_PRODUCT_VARIANT",
            message: "Sản phẩm phải còn ít nhất một biến thể đang bán.",
          });
        }
        await transaction.softDeleteVariant(productId, variantId);
      });
    },
  };
}
