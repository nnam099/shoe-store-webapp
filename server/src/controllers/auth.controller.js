import {
  changeMemberPassword,
  getCurrentMember,
  loginMember,
  registerMember,
  sendPasswordSetupOtp,
  setupMemberPassword,
  updateMemberProfile,
} from '../services/auth.service.js';
import { linkGoogleIdentity, loginWithGoogle } from '../services/google-auth.service.js';
import { requestPasswordReset, resetPassword } from '../services/password-reset.service.js';
import { normalizeClientIp } from '../services/security-throttle.service.js';

export async function register(req, res, next) {
  try {
    const result = await registerMember(req.body || {});
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const result = await loginMember(req.body || {});
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function me(req, res, next) {
  try {
    const member = await getCurrentMember(req.member.id);
    res.status(200).json({ success: true, data: { member } });
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(req, res, next) {
  try {
    const member = await updateMemberProfile(req.member.id, req.body || {});
    res.status(200).json({ success: true, data: { member } });
  } catch (error) {
    next(error);
  }
}

export async function changePassword(req, res, next) {
  try {
    const result = await changeMemberPassword(req.member.id, req.body || {});
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function forgotPassword(req, res, next) {
  try {
    const result = await requestPasswordReset(req.body || {}, { ip: normalizeClientIp(req) });
    res.status(202).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function resetMemberPassword(req, res, next) {
  try {
    const result = await resetPassword(req.body || {});
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function googleLogin(req, res, next) {
  try {
    const result = await loginWithGoogle(req.body || {});
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function googleLink(req, res, next) {
  try {
    const member = await linkGoogleIdentity(req.member.id, req.body || {});
    res.status(200).json({ success: true, data: { member } });
  } catch (error) {
    next(error);
  }
}

export async function sendSetupPasswordOtp(req, res, next) {
  try {
    const result = await sendPasswordSetupOtp(req.member.id, { ip: normalizeClientIp(req) });
    res.status(202).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function setupPassword(req, res, next) {
  try {
    const result = await setupMemberPassword(req.member.id, req.body || {});
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}
