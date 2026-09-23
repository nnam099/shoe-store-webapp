export function createAdminCatalogController(service) {
  return {
    async list(request, response) {
      response
        .status(200)
        .json(await service.list(request.validated.params.resource, request.validated.query));
    },

    async create(request, response) {
      const item = await service.create(request.validated.params.resource, request.body);
      response.status(201).json({ item });
    },

    async update(request, response) {
      const item = await service.update(
        request.validated.params.resource,
        request.validated.params.id,
        request.body,
      );
      response.status(200).json({ item });
    },

    async delete(request, response) {
      await service.delete(request.validated.params.resource, request.validated.params.id);
      response.status(204).send();
    },
  };
}
