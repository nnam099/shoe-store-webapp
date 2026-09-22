import { toPublicAccount } from "../utils/public-account.js";

export function createAuthController(authService) {
  return {
    async register(request, response) {
      const account = await authService.registerCustomer(request.body);

      response.status(201).json({
        message: "Đăng ký thành công. Vui lòng đăng nhập.",
        account,
      });
    },

    async login(request, response) {
      const result = await authService.loginCustomer(request.body);
      response.status(200).json(result);
    },

    session(request, response) {
      response.status(200).json({
        account: toPublicAccount(request.auth.account, request.auth.role),
      });
    },
  };
}
