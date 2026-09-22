import { toPublicAccount } from "../utils/public-account.js";

export function createAdminAuthController(authService) {
  return {
    async login(request, response) {
      const result = await authService.loginAdmin(request.body);
      response.status(200).json(result);
    },

    index(request, response) {
      response.status(200).json({
        message: "Khu vực quản trị.",
        account: toPublicAccount(request.auth.account, "admin"),
      });
    },
  };
}
