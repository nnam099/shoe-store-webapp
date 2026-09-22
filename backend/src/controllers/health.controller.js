export function createHealthController(healthService) {
  return {
    async getHealth(_request, response, next) {
      try {
        const health = await healthService.getHealth();
        response.status(200).json(health);
      } catch (error) {
        next(error);
      }
    },
  };
}
