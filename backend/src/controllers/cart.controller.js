export function createCartController(cartMergeService) {
  return {
    async merge(request, response) {
      const result = await cartMergeService.mergeGuestCart({
        customerId: request.auth.accountId,
        items: request.body.items,
      });
      response.status(200).json(result);
    },
  };
}
