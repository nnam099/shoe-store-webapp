import { z } from "zod";

const password = z.string().min(8, "Mật khẩu phải có ít nhất 8 ký tự.").max(128);

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(1, "Họ tên là bắt buộc.").max(120),
    email: z
      .string()
      .trim()
      .max(254)
      .email("Email không đúng định dạng.")
      .transform((value) => value.toLowerCase()),
    phone: z.string().regex(/^0[0-9]{9}$/, "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0."),
    password,
    passwordConfirmation: z.string(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.password !== value.passwordConfirmation) {
      context.addIssue({
        code: "custom",
        path: ["passwordConfirmation"],
        message: "Mật khẩu xác nhận không khớp.",
      });
    }
  });

export const loginSchema = z
  .object({
    identifier: z.string().trim().min(1, "Tài khoản là bắt buộc.").max(254),
    password: z.string().min(1, "Mật khẩu là bắt buộc.").max(128),
  })
  .strict();

export const adminLoginSchema = z
  .object({
    email: z
      .string()
      .trim()
      .max(254)
      .email("Email không đúng định dạng.")
      .transform((value) => value.toLowerCase()),
    password: z.string().min(1, "Mật khẩu là bắt buộc.").max(128),
  })
  .strict();
