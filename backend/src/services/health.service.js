export class ServiceUnavailableError extends Error {
  constructor() {
    super("Dịch vụ tạm thời không khả dụng.");
    this.name = "ServiceUnavailableError";
    this.statusCode = 503;
    this.code = "SERVICE_UNAVAILABLE";
  }
}

export function createHealthService(healthRepository) {
  return {
    async getHealth() {
      try {
        const database = await healthRepository.checkDatabase();

        if (!database.pgTrgmAvailable) {
          throw new ServiceUnavailableError();
        }

        return {
          status: "ok",
          database: "ok",
        };
      } catch (error) {
        if (error instanceof ServiceUnavailableError) {
          throw error;
        }

        throw new ServiceUnavailableError();
      }
    },
  };
}
