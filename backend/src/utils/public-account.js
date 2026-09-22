export function toPublicAccount(account, role) {
  const publicAccount = {
    id: account.id,
    role,
    fullName: account.full_name,
    email: account.email,
  };

  if (role === "customer") {
    publicAccount.phone = account.phone;
  }

  return publicAccount;
}
