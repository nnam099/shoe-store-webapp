import { AppError } from "../errors/app-error.js";
import { normalizeSearchText } from "../utils/product-slug.js";
import { toStorefrontProductDetail, toStorefrontProductSummary } from "../utils/public-product.js";

export function createProductService(repository) {
  return {
    async list(input) {
      const query = {
        q: normalizeSearchText(input.q),
        brandIds: input.brandId,
        categoryIds: input.categoryId,
        sizeIds: input.sizeId,
        colorIds: input.colorId,
        minPrice: input.minPrice,
        maxPrice: input.maxPrice,
        sort: input.sort,
        page: input.page,
      };
      const result = await repository.list(query);

      return {
        products: result.rows.map(toStorefrontProductSummary),
        pagination: {
          page: input.page,
          pageSize: result.pageSize,
          totalItems: result.total,
          totalPages: Math.ceil(result.total / result.pageSize),
        },
      };
    },

    getOptions() {
      return repository.getOptions();
    },

    async getDetail(slug) {
      const product = await repository.findActiveBySlug(slug);
      if (!product) {
        throw new AppError({
          statusCode: 404,
          code: "PRODUCT_NOT_FOUND",
          message: "Không tìm thấy sản phẩm.",
        });
      }

      const [images, variants] = await Promise.all([
        repository.findImages(product.id),
        repository.findActiveVariants(product.id),
      ]);
      return toStorefrontProductDetail(product, images, variants);
    },
  };
}
