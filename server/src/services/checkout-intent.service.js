import { randomUUID } from 'node:crypto';
import prisma from '../config/db.js';
import { getShippingFee } from '../config/shipping.js';
import { renderOrderCreatedEmail } from '../email/templates.js';
import { AppError } from '../utils/errors.js';
import { generateOrderCode } from '../utils/orderCode.js';
import { constantTimeEqual, createOpaqueToken, hashOpaqueToken } from '../utils/secureToken.js';
import { enqueueEmail } from './email-outbox.service.js';
import { consumeEmailChallenge, sendEmailChallenge } from './email-challenge.service.js';
import { computeCheckoutQuote, isValidPhone, normalizeItems, resolveCatalogItems } from './order.service.js';

const INTENT_TTL_MS = 30 * 60_000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

class StockRevalidationSignal extends Error {
  constructor(issues, expectedVersion, current) {
    super('Stock changed during COD confirmation');
    this.issues = issues;
    this.expectedVersion = expectedVersion;
    this.current = current;
  }
}

function validateIntentId(id) {
  if (typeof id !== 'string' || !UUID_PATTERN.test(id)) {
    throw new AppError('Checkout Intent không hợp lệ.', 400, 'VALIDATION_ERROR');
  }
  return id;
}

function normalizeEmail(value) {
  if (typeof value !== 'string') throw new AppError('Email is required', 400, 'VALIDATION_ERROR');
  const email = value.trim().toLowerCase();
  if (!email || email.length > 150 || !EMAIL_PATTERN.test(email)) {
    throw new AppError('Email is invalid', 400, 'VALIDATION_ERROR');
  }
  return email;
}

function normalizeReceiver(input) {
  const receiverName = typeof input?.receiverName === 'string' ? input.receiverName.trim() : '';
  const receiverPhone = typeof input?.receiverPhone === 'string' ? input.receiverPhone.trim() : '';
  const receiverAddress = typeof input?.receiverAddress === 'string' ? input.receiverAddress.trim() : '';
  const note = input?.note === null || input?.note === undefined ? null : String(input.note).trim() || null;
  if (!receiverName || receiverName.length > 100) {
    throw new AppError('Receiver name is required and must be between 1 and 100 characters', 400, 'VALIDATION_ERROR');
  }
  if (!isValidPhone(receiverPhone)) throw new AppError('Receiver phone is invalid', 400, 'VALIDATION_ERROR');
  if (!receiverAddress || receiverAddress.length > 2000) throw new AppError('Receiver address is invalid', 400, 'VALIDATION_ERROR');
  if (note && note.length > 2000) throw new AppError('Order note is too long', 400, 'VALIDATION_ERROR');
  return { receiverName, receiverPhone, receiverAddress, note };
}

function itemsForSnapshot(quote) {
  return quote.items.map((item) => ({
    productSlug: item.productSlug,
    colorwaySlug: item.colorwaySlug,
    size: item.size,
    quantity: item.quantity,
  }));
}

function quoteSnapshot(quote, availabilityIssues = undefined) {
  return {
    items: quote.items,
    subtotal: quote.subtotal,
    shippingFee: quote.shippingFee,
    total: quote.total,
    paymentMethod: 'COD',
    ...(availabilityIssues ? { availabilityIssues } : {}),
  };
}

function publicIntent(intent, guestToken) {
  return {
    intent: {
      id: intent.id,
      email: intent.email,
      status: intent.status,
      verified: Boolean(intent.verifiedAt),
      verifiedAt: intent.verifiedAt,
      expiresAt: intent.expiresAt,
      quoteVersion: intent.quoteVersion,
      quote: intent.quoteSnapshot,
      receiverName: intent.receiverName,
      receiverPhone: intent.receiverPhone,
      receiverAddress: intent.receiverAddress,
      note: intent.note,
    },
    ...(guestToken ? { guestToken } : {}),
  };
}

function assertOwnership(intent, { memberId = null, guestToken = null }) {
  if (intent.userId !== null) {
    if (memberId !== intent.userId) throw new AppError('Không có quyền truy cập Checkout Intent.', 403, 'CHECKOUT_INTENT_ACCESS_DENIED');
    return;
  }
  if (memberId !== null || typeof guestToken !== 'string' || !guestToken) {
    throw new AppError('Không có quyền truy cập Checkout Intent.', 403, 'CHECKOUT_INTENT_ACCESS_DENIED');
  }
  const suppliedHash = hashOpaqueToken(guestToken);
  if (!constantTimeEqual(suppliedHash, intent.guestTokenHash)) {
    throw new AppError('Không có quyền truy cập Checkout Intent.', 403, 'CHECKOUT_INTENT_ACCESS_DENIED');
  }
}

async function loadOwnedIntent(id, actor, { allowCompleted = true, now = new Date() } = {}) {
  validateIntentId(id);
  const intent = await prisma.checkoutIntent.findUnique({ where: { id }, include: { order: { include: { orderItems: true } } } });
  if (!intent) throw new AppError('Không tìm thấy Checkout Intent.', 404, 'CHECKOUT_INTENT_NOT_FOUND');
  assertOwnership(intent, actor);
  if (intent.expiresAt <= now && intent.status !== 'COMPLETED') {
    await prisma.checkoutIntent.updateMany({
      where: { id: intent.id, status: { in: ['OPEN', 'EMAIL_VERIFIED'] } },
      data: { status: 'EXPIRED' },
    });
    throw new AppError('Checkout Intent đã hết hạn.', 410, 'CHECKOUT_INTENT_EXPIRED');
  }
  if (!allowCompleted && intent.status === 'COMPLETED') {
    throw new AppError('Checkout Intent đã hoàn tất.', 409, 'CHECKOUT_INTENT_ALREADY_USED');
  }
  return intent;
}

export async function createCheckoutIntent(input, { memberId = null, now = new Date() } = {}) {
  const allowedFields = new Set(['email', 'receiverName', 'receiverPhone', 'receiverAddress', 'note', 'items']);
  const unsupportedFields = Object.keys(input || {}).filter((key) => !allowedFields.has(key));
  if (unsupportedFields.length) {
    throw new AppError('Checkout Intent contains unsupported fields', 400, 'VALIDATION_ERROR', [{ fields: unsupportedFields }]);
  }
  const receiver = normalizeReceiver(input);
  let email;
  if (memberId !== null) {
    if (Object.hasOwn(input || {}, 'email')) {
      throw new AppError('Member email is read-only during checkout.', 400, 'MEMBER_EMAIL_READ_ONLY');
    }
    const user = await prisma.user.findUnique({ where: { id: memberId }, select: { email: true, isActive: true } });
    if (!user?.isActive) throw new AppError('Không thể xác thực thành viên.', 401, 'UNAUTHORIZED');
    email = user.email;
  } else {
    email = normalizeEmail(input?.email);
  }
  const quote = await computeCheckoutQuote(input?.items);
  const rawGuestToken = memberId === null ? createOpaqueToken() : null;
  const intent = await prisma.checkoutIntent.create({
    data: {
      userId: memberId,
      guestTokenHash: rawGuestToken ? hashOpaqueToken(rawGuestToken) : null,
      email,
      ...receiver,
      itemsSnapshot: itemsForSnapshot(quote),
      quoteSnapshot: quoteSnapshot(quote),
      quotedSubtotal: quote.subtotal,
      quotedShippingFee: quote.shippingFee,
      quotedTotal: quote.total,
      expiresAt: new Date(now.getTime() + INTENT_TTL_MS),
    },
  });
  return publicIntent(intent, rawGuestToken);
}

export async function getCheckoutIntent(id, actor) {
  return publicIntent(await loadOwnedIntent(id, actor));
}

export async function updateCheckoutIntent(id, input, actor) {
  const intent = await loadOwnedIntent(id, actor, { allowCompleted: false });
  const allowed = new Set(['email', 'receiverName', 'receiverPhone', 'receiverAddress', 'note', 'items']);
  const unsupported = Object.keys(input || {}).filter((key) => !allowed.has(key));
  if (unsupported.length) throw new AppError('Checkout update contains unsupported fields', 400, 'VALIDATION_ERROR');
  if (intent.userId !== null && Object.hasOwn(input || {}, 'email')) {
    throw new AppError('Member email is read-only during checkout.', 400, 'MEMBER_EMAIL_READ_ONLY');
  }

  const receiver = normalizeReceiver({
    receiverName: Object.hasOwn(input, 'receiverName') ? input.receiverName : intent.receiverName,
    receiverPhone: Object.hasOwn(input, 'receiverPhone') ? input.receiverPhone : intent.receiverPhone,
    receiverAddress: Object.hasOwn(input, 'receiverAddress') ? input.receiverAddress : intent.receiverAddress,
    note: Object.hasOwn(input, 'note') ? input.note : intent.note,
  });
  const nextEmail = intent.userId === null && Object.hasOwn(input, 'email')
    ? normalizeEmail(input.email)
    : intent.email;
  const emailChanged = nextEmail !== intent.email;
  const itemsChanged = Object.hasOwn(input || {}, 'items');
  const quote = itemsChanged ? await computeCheckoutQuote(input.items) : intent.quoteSnapshot;

  const updated = await prisma.$transaction(async (tx) => {
    if (emailChanged) {
      await tx.emailChallenge.updateMany({
        where: { checkoutIntentId: intent.id, consumedAt: null, invalidatedAt: null },
        data: { invalidatedAt: new Date() },
      });
    }
    return tx.checkoutIntent.update({
      where: { id: intent.id },
      data: {
        ...receiver,
        email: nextEmail,
        ...(itemsChanged ? {
          itemsSnapshot: itemsForSnapshot(quote),
          quoteSnapshot: quoteSnapshot(quote),
          quotedSubtotal: quote.subtotal,
          quotedShippingFee: quote.shippingFee,
          quotedTotal: quote.total,
          quoteVersion: { increment: 1 },
        } : {}),
        ...(emailChanged ? { verifiedAt: null, status: 'OPEN' } : {}),
      },
    });
  });
  return { ...publicIntent(updated), requiresQuoteConfirmation: itemsChanged };
}

export async function sendCheckoutOtp(id, actor, { ip } = {}) {
  const intent = await loadOwnedIntent(id, actor, { allowCompleted: false });
  const actorKey = intent.userId !== null ? `member:${intent.userId}` : `guest:${intent.id}`;
  return sendEmailChallenge({
    purpose: 'CHECKOUT',
    email: intent.email,
    checkoutIntentId: intent.id,
    actorKey,
    ip: ip || 'unknown',
  });
}

export async function verifyCheckoutOtp(id, input, actor) {
  const intent = await loadOwnedIntent(id, actor, { allowCompleted: false });
  await consumeEmailChallenge({
    challengeId: input?.challengeId,
    code: input?.otp,
    purpose: 'CHECKOUT',
    checkoutIntentId: intent.id,
    onVerified: async (tx, challenge, now) => {
      const current = await tx.checkoutIntent.findUnique({ where: { id: intent.id } });
      if (!current || current.email !== challenge.email || current.userId !== intent.userId || current.status === 'COMPLETED') {
        throw new AppError('Mã xác thực không còn phù hợp với checkout.', 409, 'CHALLENGE_CONTEXT_MISMATCH');
      }
      await tx.checkoutIntent.update({
        where: { id: current.id },
        data: { verifiedAt: now, status: 'EMAIL_VERIFIED' },
      });
    },
  });
  const updated = await prisma.checkoutIntent.findUnique({ where: { id: intent.id } });
  return { verified: true, verifiedAt: updated.verifiedAt, quoteVersion: updated.quoteVersion };
}

function sameQuote(stored, fresh) {
  if (stored?.availabilityIssues?.length) return false;
  const comparable = (value) => ({
    items: (value?.items || []).map((item) => ({
      productSlug: item.productSlug,
      productName: item.productName,
      colorwaySlug: item.colorwaySlug,
      colorwayName: item.colorwayName,
      size: item.size,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      lineTotal: Number(item.lineTotal),
      thumbnail: item.thumbnail ?? null,
    })),
    subtotal: Number(value?.subtotal),
    shippingFee: Number(value?.shippingFee),
    total: Number(value?.total),
    paymentMethod: value?.paymentMethod,
  });
  return JSON.stringify(comparable(stored)) === JSON.stringify(comparable(fresh));
}

async function persistLatestQuote(intentId, expectedVersion, freshQuote, availabilityIssues) {
  const data = availabilityIssues
    ? { quoteSnapshot: { ...freshQuote, availabilityIssues }, quoteVersion: { increment: 1 } }
    : {
        quoteSnapshot: quoteSnapshot(freshQuote),
        quotedSubtotal: freshQuote.subtotal,
        quotedShippingFee: freshQuote.shippingFee,
        quotedTotal: freshQuote.total,
        quoteVersion: { increment: 1 },
      };
  await prisma.checkoutIntent.updateMany({
    where: { id: intentId, quoteVersion: expectedVersion, status: { in: ['OPEN', 'EMAIL_VERIFIED'] } },
    data,
  });
  return prisma.checkoutIntent.findUnique({ where: { id: intentId } });
}

function serializeOrder(order, idempotentReplay) {
  return {
    orderCode: order.orderCode,
    status: order.status,
    subtotal: Number(order.subtotal),
    shippingFee: Number(order.shippingFee),
    total: Number(order.total),
    paymentMethod: order.paymentMethod,
    idempotentReplay,
    items: order.orderItems.map((item) => ({
      productName: item.productName,
      colorwayName: item.colorwayName,
      size: item.size,
      unitPrice: Number(item.unitPrice),
      quantity: item.quantity,
      lineTotal: Number(item.unitPrice) * item.quantity,
      colorwayImage: item.colorwayImage,
    })),
  };
}

export async function confirmCodOrder(id, input, actor) {
  let intent = await loadOwnedIntent(id, actor);
  if (intent.status === 'COMPLETED' && intent.order) return serializeOrder(intent.order, true);
  if (!intent.verifiedAt || intent.status !== 'EMAIL_VERIFIED') {
    throw new AppError('Email chưa được xác thực cho checkout này.', 409, 'EMAIL_NOT_VERIFIED');
  }

  try {
    const fresh = await computeCheckoutQuote(intent.itemsSnapshot);
    if (!sameQuote(intent.quoteSnapshot, fresh)) {
      intent = await persistLatestQuote(intent.id, intent.quoteVersion, fresh);
      throw new AppError('Thông tin đơn hàng đã thay đổi.', 409, 'CHECKOUT_CHANGED', undefined, {
        quote: intent.quoteSnapshot,
        quoteVersion: intent.quoteVersion,
      });
    }
  } catch (error) {
    if (error?.code !== 'CHECKOUT_UNAVAILABLE') throw error;
    const existingIssues = intent.quoteSnapshot?.availabilityIssues || null;
    if (JSON.stringify(existingIssues) !== JSON.stringify(error.issues || [])) {
      intent = await persistLatestQuote(intent.id, intent.quoteVersion, intent.quoteSnapshot, error.issues || []);
    }
    throw new AppError('Một hoặc nhiều sản phẩm hiện không thể đặt.', 409, 'CHECKOUT_UNAVAILABLE', error.issues, {
      quote: intent.quoteSnapshot,
      quoteVersion: intent.quoteVersion,
    });
  }

  if (!Number.isInteger(input?.acceptedQuoteVersion) || input.acceptedQuoteVersion !== intent.quoteVersion) {
    throw new AppError('Vui lòng xác nhận báo giá mới nhất.', 409, 'CHECKOUT_CHANGED', undefined, {
      quote: intent.quoteSnapshot,
      quoteVersion: intent.quoteVersion,
    });
  }

  const MAX_CODE_RETRIES = 5;
  for (let attempt = 0; attempt < MAX_CODE_RETRIES; attempt++) {
    const orderCode = generateOrderCode();
    try {
      const result = await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "checkout_intents" WHERE "id" = ${intent.id}::uuid FOR UPDATE`;
        const locked = await tx.checkoutIntent.findUnique({
          where: { id: intent.id },
          include: { order: { include: { orderItems: true } } },
        });
        if (!locked) throw new AppError('Không tìm thấy Checkout Intent.', 404, 'CHECKOUT_INTENT_NOT_FOUND');
        assertOwnership(locked, actor);
        if (locked.status === 'COMPLETED' && locked.order) return { order: locked.order, replay: true };
        if (locked.expiresAt <= new Date()) throw new AppError('Checkout Intent đã hết hạn.', 410, 'CHECKOUT_INTENT_EXPIRED');
        if (locked.status !== 'EMAIL_VERIFIED' || !locked.verifiedAt) {
          throw new AppError('Email chưa được xác thực cho checkout này.', 409, 'EMAIL_NOT_VERIFIED');
        }
        if (locked.quoteVersion !== input.acceptedQuoteVersion) {
          return { requote: locked.quoteSnapshot, expectedVersion: locked.quoteVersion };
        }

        const normalized = normalizeItems(locked.itemsSnapshot);
        const { resolved, issues } = await resolveCatalogItems(normalized, tx);
        if (issues.length) return { unavailable: issues, expectedVersion: locked.quoteVersion, current: locked.quoteSnapshot };
        const subtotal = resolved.reduce((sum, item) => sum + item.lineTotal, 0);
        const shippingFee = getShippingFee();
        const fresh = {
          items: resolved.map((item) => ({
            productSlug: item.productSlug, productName: item.productName,
            colorwaySlug: item.colorwaySlug, colorwayName: item.colorwayName,
            size: item.size, quantity: item.quantity, unitPrice: item.unitPrice,
            lineTotal: item.lineTotal, thumbnail: item.colorwayImage,
          })),
          subtotal,
          shippingFee,
          total: subtotal + shippingFee,
          paymentMethod: 'COD',
        };
        if (!sameQuote(locked.quoteSnapshot, fresh)) {
          return { requote: quoteSnapshot(fresh), fresh, expectedVersion: locked.quoteVersion };
        }

        for (const item of resolved) {
          const changed = await tx.variant.updateMany({
            where: { id: item.variantId, stock: { gte: item.quantity } },
            data: { stock: { decrement: item.quantity } },
          });
          if (changed.count !== 1) {
            throw new StockRevalidationSignal([{
              productSlug: item.productSlug, colorwaySlug: item.colorwaySlug,
              size: item.size, requestedQuantity: item.quantity,
              reason: 'INSUFFICIENT_STOCK',
            }], locked.quoteVersion, locked.quoteSnapshot);
          }
        }

        const order = await tx.order.create({
          data: {
            orderCode,
            userId: locked.userId,
            checkoutIntentId: locked.id,
            checkoutEmail: locked.email,
            status: 'PENDING',
            paymentMethod: 'COD',
            receiverName: locked.receiverName,
            receiverPhone: locked.receiverPhone,
            receiverAddress: locked.receiverAddress,
            note: locked.note,
            subtotal,
            shippingFee,
            total: subtotal + shippingFee,
            orderItems: { create: resolved.map((item) => ({
              variantId: item.variantId, productName: item.productName,
              colorwayName: item.colorwayName, size: item.size,
              unitPrice: item.unitPrice, quantity: item.quantity,
              colorwayImage: item.colorwayImage,
            })) },
            statusHistories: { create: { status: 'PENDING' } },
          },
          include: { orderItems: true },
        });
        const orderData = serializeOrder(order, false);
        const appBaseUrl = (process.env.APP_BASE_URL || 'http://localhost:5173').replace(/\/$/, '');
        const rendered = renderOrderCreatedEmail({
          order: {
            ...orderData,
            receiverName: locked.receiverName,
            receiverPhone: locked.receiverPhone,
            receiverAddress: locked.receiverAddress,
          },
          trackingUrl: `${appBaseUrl}/order-lookup?orderCode=${encodeURIComponent(order.orderCode)}`,
        });
        await enqueueEmail(tx, {
          eventKey: `order.created:${order.id}`,
          recipient: locked.email,
          ...rendered,
        });
        await tx.checkoutIntent.update({
          where: { id: locked.id },
          data: { status: 'COMPLETED', completedAt: new Date() },
        });
        return { order, replay: false };
      });

      if (result.requote) {
        const latest = result.fresh
          ? await persistLatestQuote(intent.id, result.expectedVersion, result.fresh)
          : await prisma.checkoutIntent.findUnique({ where: { id: intent.id } });
        throw new AppError('Thông tin đơn hàng đã thay đổi.', 409, 'CHECKOUT_CHANGED', undefined, {
          quote: latest.quoteSnapshot,
          quoteVersion: latest.quoteVersion,
        });
      }
      if (result.unavailable) {
        const latest = await persistLatestQuote(intent.id, result.expectedVersion, result.current, result.unavailable);
        throw new AppError('Một hoặc nhiều sản phẩm hiện không thể đặt.', 409, 'CHECKOUT_UNAVAILABLE', result.unavailable, {
          quote: latest.quoteSnapshot,
          quoteVersion: latest.quoteVersion,
        });
      }
      return serializeOrder(result.order, result.replay);
    } catch (error) {
      if (error instanceof StockRevalidationSignal) {
        const latest = await persistLatestQuote(intent.id, error.expectedVersion, error.current, error.issues);
        throw new AppError('Một hoặc nhiều sản phẩm hiện không thể đặt.', 409, 'CHECKOUT_UNAVAILABLE', error.issues, {
          quote: latest.quoteSnapshot,
          quoteVersion: latest.quoteVersion,
        });
      }
      const collision = error?.code === 'P2002' && (
        error.message?.includes('order_code') || error.meta?.target?.includes('orderCode')
      );
      if (collision && attempt < MAX_CODE_RETRIES - 1) continue;
      throw error;
    }
  }
  throw new AppError('Unable to generate unique order code', 500, 'ORDER_CODE_GENERATION_FAILED');
}
