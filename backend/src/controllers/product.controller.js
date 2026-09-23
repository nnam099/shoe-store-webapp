export function createProductController(service) {
  return {
    async list(request, response) {
      response.status(200).json(await service.list(request.validated.query));
    },

    async options(_request, response) {
      response.status(200).json(await service.getOptions());
    },

    async detail(request, response) {
      response.status(200).json({
        product: await service.getDetail(request.validated.params.slug),
      });
    },
  };
}
