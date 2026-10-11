import { Router } from 'express';
import {
  changePassword,
  forgotPassword,
  login,
  me,
  register,
  updateProfile,
} from '../controllers/auth.controller.js';
import { requireMember } from '../middlewares/memberAuth.js';

const router = Router();

router.post('/auth/register', register);
router.post('/auth/login', login);
router.get('/auth/me', requireMember, me);
router.patch('/auth/me', requireMember, updateProfile);
router.post('/auth/change-password', requireMember, changePassword);
router.post('/auth/forgot-password', forgotPassword);

export default router;
