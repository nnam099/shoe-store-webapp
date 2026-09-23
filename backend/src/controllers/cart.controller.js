export function createCartController(cartMergeService, cartItemService) {
  return {
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
