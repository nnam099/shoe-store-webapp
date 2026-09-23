export function createCartController(cartMergeService, cartItemService, cartManagementService) {
  return {
    async validate(request, response) {
      const result = await cartManagementService.validateGuestCart(request.body.items);
      response.status(200).json(result);
    },

    async get(request, response) {
      const result = await cartManagementService.getCustomerCart(request.auth.accountId);
      response.status(200).json(result);
    },

    async updateItem(request, response) {
      const result = await cartManagementService.updateCustomerItem({
        customerId: request.auth.accountId,
        productVariantId: request.validated.params.productVariantId,
        quantity: request.body.quantity,
      });
      response.status(200).json(result);
    },

    async deleteItem(request, response) {
      const result = await cartManagementService.deleteCustomerItem({
        customerId: request.auth.accountId,
        productVariantId: request.validated.params.productVariantId,
      });
      response.status(200).json(result);
    },

    async merge(request, response) {
      const result = await cartMergeService.mergeGuestCart({
        customerId: request.auth.accountId,
        items: request.body.items,
      });
      response.status(200).json(result);
    },

    async addItem(request, response) {
      const result = await cartItemService.addItem({
        customerId: request.auth.accountId,
        ...request.body,
      });
      response.status(200).json(result);
    },
  };
}
