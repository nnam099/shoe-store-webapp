import { z } from "zod";

const phone = z.string().regex(/^0[0-9]{9}$/, "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0.");

const defaultAddress = z
  .object({
    province: z.string().trim().min(1, "Tỉnh/thành là bắt buộc.").max(120),
    district: z.string().trim().min(1, "Quận/huyện là bắt buộc.").max(120),
    ward: z.string().trim().min(1, "Phường/xã là bắt buộc.").max(120),
    addressLine: z.string().trim().min(1, "Địa chỉ chi tiết là bắt buộc.").max(255),
  })
  .strict();

export const updateProfileSchema = z
  .object({
    fullName: z.string().trim().min(1, "Họ tên là bắt buộc.").max(120).optional(),
    phone: phone.optional(),
    defaultAddress: z.union([defaultAddress, z.null()]).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Cần cung cấp ít nhất một trường để cập nhật.",
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Mật khẩu hiện tại là bắt buộc.").max(128),
    newPassword: z.string().min(8, "Mật khẩu mới phải có ít nhất 8 ký tự.").max(128),
    newPasswordConfirmation: z.string(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.newPassword !== value.newPasswordConfirmation) {
      context.addIssue({
        code: "custom",
        path: ["newPasswordConfirmation"],
        message: "Mật khẩu xác nhận không khớp.",
      });
    }
  });
