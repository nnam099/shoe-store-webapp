import {
  changeMemberPassword,
  forgotMemberPassword,
  getCurrentMember,
  loginMember,
  registerMember,
  updateMemberProfile,
} from '../services/auth.service.js';

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
    const result = await forgotMemberPassword(req.body || {});
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}
