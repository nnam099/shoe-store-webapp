import { Router } from 'express';
import {
  changePassword,
  forgotPassword,
  googleLink,
  googleLogin,
  login,
  me,
  register,
  resetMemberPassword,
  sendSetupPasswordOtp,
  setupPassword,
  updateProfile,
} from '../controllers/auth.controller.js';
import { requireMember } from '../middlewares/memberAuth.js';

const router = Router();

router.post('/auth/register', register);
router.post('/auth/login', login);
router.post('/auth/google', googleLogin);
router.post('/auth/google/link', requireMember, googleLink);
router.get('/auth/me', requireMember, me);
router.patch('/auth/me', requireMember, updateProfile);
router.post('/auth/change-password', requireMember, changePassword);
router.post('/auth/forgot-password', forgotPassword);
router.post('/auth/password/forgot', forgotPassword);
router.post('/auth/password/reset', resetMemberPassword);
router.post('/auth/password/setup/otp/send', requireMember, sendSetupPasswordOtp);
router.post('/auth/password/setup', requireMember, setupPassword);

export default router;
