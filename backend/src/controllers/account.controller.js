export function createAccountController(accountService) {
  return {
    async getProfile(request, response) {
      const account = await accountService.getProfile(request.auth.accountId);
      response.status(200).json({ account });
    },

    async updateProfile(request, response) {
      const account = await accountService.updateProfile(request.auth.accountId, request.body);
      response.status(200).json({ account });
    },

    async changePassword(request, response) {
      await accountService.changePassword(request.auth.accountId, request.body);
      response.status(200).json({ message: "Đổi mật khẩu thành công." });
    },
  };
}
