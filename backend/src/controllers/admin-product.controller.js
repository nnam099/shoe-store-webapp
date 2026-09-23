export function createAdminProductController(service) {
  return {
    async list(request, response) {
      response.status(200).json(await service.list(request.validated.query));
    },

    async options(_request, response) {
      response.status(200).json(await service.getOptions());
    },

    async detail(request, response) {
      response.status(200).json({
        product: await service.getDetail(request.validated.params.productId),
      });
    },

    async create(request, response) {
      const product = await service.create(request.productData, request.files);
      response.status(201).json({ product });
    },

    async update(request, response) {
      const product = await service.update(request.validated.params.productId, request.body);
      response.status(200).json({ product });
    },

    async delete(request, response) {
      await service.delete(request.validated.params.productId);
      response.status(204).send();
    },

    async addImages(request, response) {
      const product = await service.addImages(request.validated.params.productId, request.files);
      response.status(201).json({ product });
    },

    async reorderImages(request, response) {
      const product = await service.reorderImages(
        request.validated.params.productId,
        request.body.imageIds,
      );
      response.status(200).json({ product });
    },

    async removeImage(request, response) {
      await service.removeImage(
        request.validated.params.productId,
        request.validated.params.imageId,
      );
      response.status(204).send();
    },

    async addVariant(request, response) {
      const product = await service.addVariant(request.validated.params.productId, request.body);
      response.status(201).json({ product });
    },

    async updateVariant(request, response) {
      const product = await service.updateVariant(
        request.validated.params.productId,
        request.validated.params.variantId,
        request.body.stockQuantity,
      );
      response.status(200).json({ product });
    },

    async removeVariant(request, response) {
      await service.removeVariant(
        request.validated.params.productId,
        request.validated.params.variantId,
      );
      response.status(204).send();
    },
  };
}
