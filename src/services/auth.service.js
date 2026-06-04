import crypto from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";
import { sendPasswordResetEmail, sendVerificationEmail } from "./email.service.js";
import { comparePassword, hashPassword } from "../utils/passwords.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/tokens.js";

const publicUserSelect = {
  id: true,
  organisationId: true,
  name: true,
  email: true,
  role: true,
  profileImageUrl: true,
  isVerified: true,
  createdAt: true
};

const issueTokens = async (user) => {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  const refreshTokenHash = await hashPassword(refreshToken);

  await prisma.user.update({
    where: { id: user.id },
    data: { refreshTokenHash, lastLoginAt: new Date() }
  });

  return { accessToken, refreshToken };
};

const hashOneTimeToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

const googleClient = env.googleClientId ? new OAuth2Client(env.googleClientId) : null;

const verifyGoogleCredential = async (credential) => {
  if (!googleClient || !env.googleClientId) {
    throw new AppError("Google sign-in is not configured", 503, "GOOGLE_AUTH_NOT_CONFIGURED");
  }

  let ticket;
  try {
    ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: env.googleClientId
    });
  } catch {
    throw new AppError("Google sign-in token could not be verified", 401, "INVALID_GOOGLE_TOKEN");
  }

  const profile = ticket.getPayload();
  if (!profile?.email || !profile.email_verified) {
    throw new AppError("Google account email is not verified", 403, "GOOGLE_EMAIL_NOT_VERIFIED");
  }

  return profile;
};

export const signup = async (payload) => {
  const existing = await prisma.user.findUnique({ where: { email: payload.email } });
  if (existing) throw new AppError("Email is already registered", 409, "EMAIL_EXISTS");

  const verificationToken = crypto.randomBytes(32).toString("hex");
  const passwordHash = await hashPassword(payload.password);

  const user = await prisma.$transaction(async (tx) => {
    const organisation = await tx.organisation.create({
      data: {
        name: payload.organisationName,
        industry: payload.industry
      }
    });

    return tx.user.create({
      data: {
        organisationId: organisation.id,
        name: payload.name,
        email: payload.email,
        passwordHash,
        role: payload.role,
        verificationToken
      },
      select: publicUserSelect
    });
  });

  let emailStatus = { sent: false };
  try {
    emailStatus = await sendVerificationEmail({ user, verificationToken });
  } catch (error) {
    emailStatus = { sent: false, error: error.message };
    console.warn(`[mail] Verification email failed for ${user.email}: ${error.message}`);
  }

  return {
    user,
    emailSent: emailStatus.sent,
    emailError: emailStatus.error,
    devVerificationToken: !emailStatus.sent && process.env.NODE_ENV !== "production" ? verificationToken : undefined
  };
};

export const login = async ({ email, password }) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");

  const isValid = await comparePassword(password, user.passwordHash);
  if (!isValid) throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
  if (!user.isVerified) throw new AppError("Email verification required", 403, "EMAIL_NOT_VERIFIED");

  const tokens = await issueTokens(user);
  const safeUser = await prisma.user.findUnique({ where: { id: user.id }, select: publicUserSelect });
  return { user: safeUser, ...tokens };
};

export const loginWithGoogle = async ({ credential }) => {
  const profile = await verifyGoogleCredential(credential);
  const existingUser = await prisma.user.findUnique({ where: { email: profile.email } });

  if (!existingUser) {
    return {
      needsOnboarding: true,
      googleProfile: {
        name: profile.name ?? profile.email,
        email: profile.email,
        picture: profile.picture,
        hostedDomain: profile.hd
      }
    };
  }

  const user = await prisma.user.update({
    where: { id: existingUser.id },
    data: {
      name: profile.name ?? profile.email,
      profileImageUrl: profile.picture,
      isVerified: true,
      verificationToken: null
    }
  });

  const tokens = await issueTokens(user);
  const safeUser = await prisma.user.findUnique({ where: { id: user.id }, select: publicUserSelect });
  return { user: safeUser, ...tokens };
};

export const completeGoogleProfile = async ({ credential, organisationName, role }) => {
  const profile = await verifyGoogleCredential(credential);
  const existingUser = await prisma.user.findUnique({ where: { email: profile.email } });

  if (existingUser) {
    const tokens = await issueTokens(existingUser);
    const safeUser = await prisma.user.findUnique({ where: { id: existingUser.id }, select: publicUserSelect });
    return { user: safeUser, ...tokens };
  }

  const user = await prisma.user.create({
    data: {
      name: profile.name ?? profile.email,
      email: profile.email,
      passwordHash: await hashPassword(crypto.randomBytes(48).toString("hex")),
      role,
      isVerified: true,
      profileImageUrl: profile.picture,
      organisation: {
        create: {
          name: organisationName
        }
      }
    }
  });

  const tokens = await issueTokens(user);
  const safeUser = await prisma.user.findUnique({ where: { id: user.id }, select: publicUserSelect });
  return { user: safeUser, ...tokens };
};

export const verifyEmail = async (token) => {
  const user = await prisma.user.findFirst({ where: { verificationToken: token } });
  if (!user) throw new AppError("Invalid verification token", 400, "INVALID_VERIFICATION_TOKEN");

  return prisma.user.update({
    where: { id: user.id },
    data: { isVerified: true, verificationToken: null },
    select: publicUserSelect
  });
};

export const requestPasswordReset = async ({ email }) => {
  const user = await prisma.user.findUnique({ where: { email }, select: publicUserSelect });

  if (!user) {
    return { emailSent: true };
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  const resetTokenHash = hashOneTimeToken(resetToken);

  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken: resetTokenHash }
  });

  let emailStatus = { sent: false };
  try {
    emailStatus = await sendPasswordResetEmail({ user, resetToken });
  } catch (error) {
    emailStatus = { sent: false, error: error.message };
    console.warn(`[mail] Password reset email failed for ${user.email}: ${error.message}`);
  }

  return {
    emailSent: emailStatus.sent,
    emailError: emailStatus.error,
    devResetToken: !emailStatus.sent && process.env.NODE_ENV !== "production" ? resetToken : undefined
  };
};

export const resetPassword = async ({ token, password }) => {
  const resetTokenHash = hashOneTimeToken(token);
  const user = await prisma.user.findFirst({ where: { resetToken: resetTokenHash } });
  if (!user) throw new AppError("Invalid or expired reset link", 400, "INVALID_RESET_TOKEN");

  const isSamePassword = await comparePassword(password, user.passwordHash);
  if (isSamePassword) {
    throw new AppError("New password must be different from your current password", 400, "PASSWORD_REUSED");
  }

  const passwordHash = await hashPassword(password);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      resetToken: null,
      refreshTokenHash: null
    }
  });

  return { success: true };
};

export const refreshSession = async (refreshToken) => {
  const payload = verifyRefreshToken(refreshToken);
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user?.refreshTokenHash) throw new AppError("Invalid refresh token", 401, "INVALID_REFRESH_TOKEN");

  const isValid = await comparePassword(refreshToken, user.refreshTokenHash);
  if (!isValid) throw new AppError("Invalid refresh token", 401, "INVALID_REFRESH_TOKEN");

  const tokens = await issueTokens(user);
  const safeUser = await prisma.user.findUnique({ where: { id: user.id }, select: publicUserSelect });
  return { user: safeUser, ...tokens };
};

export const logout = async (userId) => {
  await prisma.user.update({
    where: { id: userId },
    data: { refreshTokenHash: null }
  });
};
