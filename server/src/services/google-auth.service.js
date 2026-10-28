import { OAuth2Client } from 'google-auth-library';
import prisma from '../config/db.js';
import { getGoogleAuthConfig } from '../config/googleAuth.js';
import { AppError } from '../utils/errors.js';
import { comparePassword } from '../utils/password.js';
import { issueMemberToken } from '../utils/memberToken.js';
import { serializePublicMember } from './auth.service.js';

let googleClient;
let googleClientId;

function getClient() {
  const { clientId } = getGoogleAuthConfig();
  if (!googleClient || googleClientId !== clientId) {
    googleClient = new OAuth2Client(clientId);
    googleClientId = clientId;
  }
  return { client: googleClient, clientId };
}

function googleTokenError() {
  return new AppError('Không thể xác minh tài khoản Google.', 401, 'GOOGLE_TOKEN_INVALID');
}

export async function verifyGoogleCredential(credential) {
  if (typeof credential !== 'string' || !credential.trim()) throw googleTokenError();
  try {
    const { client, clientId } = getClient();
    const ticket = await client.verifyIdToken({ idToken: credential.trim(), audience: clientId });
    const payload = ticket.getPayload();
    if (
      !payload
      || typeof payload.sub !== 'string'
      || !payload.sub
      || typeof payload.email !== 'string'
      || payload.email_verified !== true
    ) {
      throw googleTokenError();
    }
    const email = payload.email.trim().toLowerCase();
    if (!email || email.length > 150) throw googleTokenError();
    const fallbackName = email.split('@')[0].slice(0, 100) || 'STEP/LAB Member';
    const fullName = typeof payload.name === 'string' && payload.name.trim()
      ? payload.name.trim().slice(0, 100)
      : fallbackName;
    return { subject: payload.sub, email, fullName };
  } catch (error) {
    if (error instanceof AppError || error?.code === 'GOOGLE_AUTH_CONFIGURATION_ERROR') throw error;
    throw googleTokenError();
  }
}

const identityInclude = { externalIdentities: { select: { provider: true } } };

export async function loginWithGoogle(input, { verify = verifyGoogleCredential } = {}) {
  const identity = await verify(input?.credential);
  const existingIdentity = await prisma.externalIdentity.findUnique({
    where: { provider_providerSubject: { provider: 'GOOGLE', providerSubject: identity.subject } },
    include: { user: { include: identityInclude } },
  });

  if (existingIdentity) {
    if (!existingIdentity.user.isActive) {
      throw new AppError('Tài khoản hiện không hoạt động.', 403, 'ACCOUNT_INACTIVE');
    }
    return {
      member: serializePublicMember(existingIdentity.user),
      token: issueMemberToken(existingIdentity.user),
      isNewMember: false,
    };
  }

  const sameEmailUser = await prisma.user.findUnique({ where: { email: identity.email } });
  if (sameEmailUser) {
    throw new AppError(
      'Email đã thuộc tài khoản STEP/LAB. Vui lòng đăng nhập tài khoản cũ rồi liên kết Google trong phần bảo mật.',
      409,
      'ACCOUNT_LINK_REQUIRED'
    );
  }

  try {
    const user = await prisma.$transaction(async (tx) => tx.user.create({
      data: {
        email: identity.email,
        fullName: identity.fullName,
        passwordHash: null,
        phone: null,
        externalIdentities: {
          create: {
            provider: 'GOOGLE',
            providerSubject: identity.subject,
            providerEmail: identity.email,
          },
        },
      },
      include: identityInclude,
    }));
    return {
      member: serializePublicMember(user),
      token: issueMemberToken(user),
      isNewMember: true,
    };
  } catch (error) {
    if (error?.code !== 'P2002') throw error;
    const racedIdentity = await prisma.externalIdentity.findUnique({
      where: { provider_providerSubject: { provider: 'GOOGLE', providerSubject: identity.subject } },
      include: { user: { include: identityInclude } },
    });
    if (racedIdentity?.user?.isActive) {
      return {
        member: serializePublicMember(racedIdentity.user),
        token: issueMemberToken(racedIdentity.user),
        isNewMember: false,
      };
    }
    throw new AppError('Không thể liên kết tài khoản Google.', 409, 'GOOGLE_IDENTITY_CONFLICT');
  }
}

export async function linkGoogleIdentity(memberId, input, { verify = verifyGoogleCredential } = {}) {
  const [identity, user] = await Promise.all([
    verify(input?.credential),
    prisma.user.findUnique({ where: { id: memberId }, include: identityInclude }),
  ]);
  if (!user || !user.isActive) throw new AppError('Không thể xác thực thành viên.', 401, 'UNAUTHORIZED');
  if (identity.email !== user.email) {
    throw new AppError('Email Google không khớp email tài khoản STEP/LAB.', 409, 'GOOGLE_EMAIL_CONFLICT');
  }
  if (user.passwordHash) {
    const matches = await comparePassword(input?.currentPassword, user.passwordHash);
    if (!matches) throw new AppError('Sai thông tin đăng nhập.', 401, 'INVALID_CREDENTIALS');
  }

  const subjectIdentity = await prisma.externalIdentity.findUnique({
    where: { provider_providerSubject: { provider: 'GOOGLE', providerSubject: identity.subject } },
  });
  if (subjectIdentity) {
    if (subjectIdentity.userId !== user.id) {
      throw new AppError('Tài khoản Google đã được liên kết với tài khoản khác.', 409, 'GOOGLE_IDENTITY_CONFLICT');
    }
    return serializePublicMember(user);
  }

  const currentGoogle = user.externalIdentities.find((item) => item.provider === 'GOOGLE');
  if (currentGoogle) {
    throw new AppError('Tài khoản đã có một liên kết Google khác.', 409, 'GOOGLE_IDENTITY_CONFLICT');
  }

  try {
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        externalIdentities: {
          create: {
            provider: 'GOOGLE',
            providerSubject: identity.subject,
            providerEmail: identity.email,
          },
        },
      },
      include: identityInclude,
    });
    return serializePublicMember(updated);
  } catch (error) {
    if (error?.code === 'P2002') {
      throw new AppError('Không thể liên kết tài khoản Google do xung đột.', 409, 'GOOGLE_IDENTITY_CONFLICT');
    }
    throw error;
  }
}
