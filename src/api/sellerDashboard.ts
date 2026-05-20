// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Seller dashboard API client (PR103)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// Calls the Sarana eSeller BFF read-only seller proxy routes (PR102),
// which themselves call the Negd internal S2S adapter (PR101). Mobile
// MUST NOT call Negd directly. The Sarana BFF carries the S2S
// integration key server-side; mobile only uses its existing Bearer
// token via the shared axios client in `src/services/api.ts`.
//
// All endpoints are GET-only and read-only. There are no mutation
// helpers in this file — PR103 mobile MUST NOT mutate seller dashboard
// data, MUST NOT compute wallet/commission client-side, MUST NOT show
// cash-out UI.
//
// Response shape (PR98/PR101/PR102 envelope):
//
//   { ok: true,  data: <payload>, correlationId, responseVersion: "seller-dashboard.v1",
//     bff: "sarana-eseller", upstream: "negd" }
//
// or on error:
//
//   { ok: false, error: { code, message, retryable, supportHint },
//     correlationId, responseVersion, bff, upstream }
//
// The legacy axios response interceptor only unwraps `{ success: bool }`
// envelopes, so this newer `{ ok }` shape passes through unchanged. The
// helpers below read `.data` from the envelope (or throw a typed error).

import { get, ApiError } from '../services/api';

// ─── Envelope ────────────────────────────────────────────────────────────

export type SellerErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NO_IDENTITY_LINK'
  | 'NO_SELLER_PROFILE'
  | 'SELLER_NOT_APPROVED'
  | 'SELLER_SUSPENDED'
  | 'DASHBOARD_NOT_READY'
  | 'STALE_COMPUTATION'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  | 'BFF_UPSTREAM_UNAVAILABLE'
  | 'IDENTITY_BRIDGE_UNAVAILABLE'
  | 'S2S_AUTH_FAILED'
  | 'S2S_NOT_CONFIGURED'
  | 'S2S_TIMESTAMP_INVALID'
  | 'NO_LINKED_USER';

export interface SellerErrorDetail {
  code: SellerErrorCode;
  message: string;
  retryable?: boolean;
  supportHint?: string | null;
}

export interface SellerEnvelopeSuccess<T> {
  ok: true;
  data: T;
  correlationId?: string;
  responseVersion?: string;
  bff?: string;
  upstream?: string;
}

export interface SellerEnvelopeFailure {
  ok: false;
  error: SellerErrorDetail;
  correlationId?: string;
  responseVersion?: string;
  bff?: string;
  upstream?: string;
}

export type SellerEnvelope<T> = SellerEnvelopeSuccess<T> | SellerEnvelopeFailure;

/**
 * Error thrown when the BFF returns a structured `{ ok: false, error }`
 * envelope. Carries the code so feature code can branch on
 * NO_IDENTITY_LINK / NO_SELLER_PROFILE / etc. without parsing strings.
 */
export class SellerApiError extends Error {
  code: SellerErrorCode;
  correlationId?: string;
  retryable?: boolean;

  constructor(detail: SellerErrorDetail, correlationId?: string) {
    super(detail.message || detail.code);
    this.code = detail.code;
    this.correlationId = correlationId;
    this.retryable = detail.retryable;
  }
}

type PayloadGuard<T> = (value: unknown) => value is T;
type RecordValue = Record<string, unknown>;

function isRecord(value: unknown): value is RecordValue {
  return !!value && typeof value === 'object';
}

function isStringOrNull(value: unknown): value is string | null {
  return typeof value === 'string' || value === null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isNumberRecord(value: unknown, keys: readonly string[]): boolean {
  if (!isRecord(value)) return false;
  return keys.every((key) => typeof value[key] === 'number');
}

function toSellerErrorDetail(value: unknown): SellerErrorDetail {
  if (isRecord(value) && typeof value.code === 'string' && typeof value.message === 'string') {
    return {
      code: value.code as SellerErrorCode,
      message: value.message,
      retryable: typeof value.retryable === 'boolean' ? value.retryable : undefined,
      supportHint: isStringOrNull(value.supportHint) ? value.supportHint : undefined,
    };
  }
  return { code: 'INTERNAL_ERROR', message: 'Серверийн алдаа гарлаа.' };
}

function malformedPayload(name: string): SellerApiError {
  return new SellerApiError(
    { code: 'INTERNAL_ERROR', message: `Серверийн өгөгдөл буруу байна. (${name})` },
    undefined,
  );
}

function unwrap<T>(envelope: unknown, isPayload: PayloadGuard<T>, payloadName: string): T {
  if (!isRecord(envelope)) {
    throw new SellerApiError(
      { code: 'INTERNAL_ERROR', message: 'Серверийн хариу хоосон байна.' },
      undefined,
    );
  }

  if ('ok' in envelope) {
    if (envelope.ok === true && 'data' in envelope) {
      if (isPayload(envelope.data)) return envelope.data;
      throw malformedPayload(payloadName);
    }
    if (envelope.ok === false) {
      throw new SellerApiError(
        toSellerErrorDetail(envelope.error),
        typeof envelope.correlationId === 'string' ? envelope.correlationId : undefined,
      );
    }
    throw malformedPayload(payloadName);
  }

  // Temporary compatibility: Sarana's legacy `{ success:true, data }`
  // interceptor may hand this client the direct payload. Canonical seller BFF
  // `{ ok:true, data }` is preferred; direct payloads must match the expected
  // route shape or they fail loudly.
  if (isPayload(envelope)) {
    if (__DEV__) console.warn('[sellerDashboard] accepted direct payload; canonical { ok, data } envelope is preferred');
    return envelope;
  }

  throw malformedPayload(payloadName);
}

// ─── Response shapes (mirror PR98/PR101 helper return types) ─────────────

export interface SellerMeResponse {
  user: {
    id: string;
    role: string;
    displayName: string | null;
  };
  resellerProfile: {
    id: string;
    displayName: string | null;
    status: string; // "PENDING" | "ACTIVE" | "SUSPENDED" | "REJECTED"
    kycStatus: string;
  };
  financeEligibility: string; // "NOT_AVAILABLE" in PR97 era
  identityLink: {
    provider: string;
    status: string;
    verifiedAt: string | null;
  } | null;
  warnings: string[];
}

export interface SellerWalletSummary {
  estimatedMnt: number;
  inReviewMnt: number;
  approvedNotPayableMnt: number;
  payableMnt: number; // ALWAYS 0 in PR97 era (effective=true rows only)
  paidOutMnt: number; // ALWAYS 0 (no cash-out flow exists)
  excludedMnt: number;
  sourceCounts: {
    dryRun: number;
    needsReview: number;
    approvedForFuturePosting: number;
    excluded: number;
    cancelled: number;
    effective: number; // ALWAYS 0 in PR97 era
  };
  invariants: {
    effectiveZeroExpected: boolean;
    payableSourcedOnlyFromEffectiveTrue: true;
  };
  warnings: string[];
  lastComputedAt: string;
}

export interface SellerReferralSummary {
  activeReferralCode: {
    id: string;
    code: string;
    activeFrom: string;
    rotationCount: number;
    abuseFlag: boolean;
  } | null;
  referralCodeCounts: {
    active: number;
    rotated: number;
    revoked: number;
    disabledForAbuse: number;
  };
  inviteLinkCounts: {
    active: number;
    expired: number;
    revoked: number;
    disabledForAbuse: number;
    totalUseCount: number;
  };
  warnings: string[];
}

export interface SellerLeadSummary {
  totals: {
    new: number;
    qualified: number;
    contacted: number;
    convertedToRequest: number;
    rejected: number;
    expired: number;
    duplicate: number;
    spam: number;
  };
  recentLeads: Array<{
    id: string;
    status: string;
    intent: string;
    source: string;
    createdAt: string;
    hasRegisteredCustomer: boolean;
    hasConvertedRequest: boolean;
    // NOTE: customer phone/email/name/note are NEVER exposed by the
    // BFF response. The UI must NOT request them.
  }>;
  warnings: string[];
}

export interface SellerCommissionSummary {
  effectiveZeroInvariant: boolean; // ALWAYS true in PR97 era
  totals: {
    dryRun: number;
    needsReview: number;
    approvedForFuturePosting: number;
    excluded: number;
    cancelled: number;
    effective: number; // ALWAYS 0 in PR97 era
  };
  proposedAmountsMnt: {
    dryRun: number;
    inReview: number;
    approvedNotPayable: number;
  };
  payableAmountMnt: number; // ALWAYS 0 in PR97 era
  recentTransactions: Array<{
    id: string;
    status: string;
    type: string;
    eligibilityReason: string | null;
    exclusionReason: string | null;
    amountMnt: number;
    effective: boolean;
    createdAt: string;
  }>;
  warnings: string[];
}

export interface SellerDashboardResponse {
  me: SellerMeResponse;
  referralSummary: SellerReferralSummary;
  leadSummary: SellerLeadSummary;
  commissionSummary: SellerCommissionSummary;
  walletSummary: SellerWalletSummary;
  notificationsSummary: {
    deferred: boolean;
    reason?: string;
  };
  warnings: string[];
  nextActions: Array<{
    code: string;
    message: string;
  }>;
}

// ─── API helpers (GET-only, no mutations) ────────────────────────────────

const WALLET_COUNT_KEYS = [
  'dryRun',
  'needsReview',
  'approvedForFuturePosting',
  'excluded',
  'cancelled',
  'effective',
] as const;

const LEAD_TOTAL_KEYS = [
  'new',
  'qualified',
  'contacted',
  'convertedToRequest',
  'rejected',
  'expired',
  'duplicate',
  'spam',
] as const;

function isIdentityLink(value: unknown): value is SellerMeResponse['identityLink'] {
  if (value === null) return true;
  return (
    isRecord(value) &&
    typeof value.provider === 'string' &&
    typeof value.status === 'string' &&
    isStringOrNull(value.verifiedAt)
  );
}

function isSellerMeResponse(value: unknown): value is SellerMeResponse {
  if (!isRecord(value) || !isRecord(value.user) || !isRecord(value.resellerProfile)) return false;
  return (
    typeof value.user.id === 'string' &&
    typeof value.user.role === 'string' &&
    isStringOrNull(value.user.displayName) &&
    typeof value.resellerProfile.id === 'string' &&
    isStringOrNull(value.resellerProfile.displayName) &&
    typeof value.resellerProfile.status === 'string' &&
    typeof value.resellerProfile.kycStatus === 'string' &&
    typeof value.financeEligibility === 'string' &&
    isIdentityLink(value.identityLink) &&
    isStringArray(value.warnings)
  );
}

function isSellerWalletSummary(value: unknown): value is SellerWalletSummary {
  if (!isRecord(value) || !isRecord(value.invariants)) return false;
  return (
    typeof value.estimatedMnt === 'number' &&
    typeof value.inReviewMnt === 'number' &&
    typeof value.approvedNotPayableMnt === 'number' &&
    typeof value.payableMnt === 'number' &&
    typeof value.paidOutMnt === 'number' &&
    typeof value.excludedMnt === 'number' &&
    isNumberRecord(value.sourceCounts, WALLET_COUNT_KEYS) &&
    typeof value.invariants.effectiveZeroExpected === 'boolean' &&
    value.invariants.payableSourcedOnlyFromEffectiveTrue === true &&
    isStringArray(value.warnings) &&
    typeof value.lastComputedAt === 'string'
  );
}

function isActiveReferralCode(value: unknown): value is SellerReferralSummary['activeReferralCode'] {
  if (value === null) return true;
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.code === 'string' &&
    typeof value.activeFrom === 'string' &&
    typeof value.rotationCount === 'number' &&
    typeof value.abuseFlag === 'boolean'
  );
}

function isSellerReferralSummary(value: unknown): value is SellerReferralSummary {
  return (
    isRecord(value) &&
    isActiveReferralCode(value.activeReferralCode) &&
    isNumberRecord(value.referralCodeCounts, ['active', 'rotated', 'revoked', 'disabledForAbuse']) &&
    isNumberRecord(value.inviteLinkCounts, ['active', 'expired', 'revoked', 'disabledForAbuse', 'totalUseCount']) &&
    isStringArray(value.warnings)
  );
}

function leadHasForbiddenPii(value: RecordValue): boolean {
  return [
    'phone',
    'email',
    'name',
    'note',
    'customerPhone',
    'customerEmail',
    'customerName',
    'customerNote',
  ].some((key) => key in value);
}

function isLeadItem(value: unknown): value is SellerLeadSummary['recentLeads'][number] {
  if (!isRecord(value) || leadHasForbiddenPii(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.status === 'string' &&
    typeof value.intent === 'string' &&
    typeof value.source === 'string' &&
    typeof value.createdAt === 'string' &&
    typeof value.hasRegisteredCustomer === 'boolean' &&
    typeof value.hasConvertedRequest === 'boolean'
  );
}

function isSellerLeadSummary(value: unknown): value is SellerLeadSummary {
  return (
    isRecord(value) &&
    isNumberRecord(value.totals, LEAD_TOTAL_KEYS) &&
    Array.isArray(value.recentLeads) &&
    value.recentLeads.every(isLeadItem) &&
    isStringArray(value.warnings)
  );
}

function isCommissionTransaction(value: unknown): value is SellerCommissionSummary['recentTransactions'][number] {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.status === 'string' &&
    typeof value.type === 'string' &&
    isStringOrNull(value.eligibilityReason) &&
    isStringOrNull(value.exclusionReason) &&
    typeof value.amountMnt === 'number' &&
    typeof value.effective === 'boolean' &&
    typeof value.createdAt === 'string'
  );
}

function isSellerCommissionSummary(value: unknown): value is SellerCommissionSummary {
  return (
    isRecord(value) &&
    typeof value.effectiveZeroInvariant === 'boolean' &&
    isNumberRecord(value.totals, WALLET_COUNT_KEYS) &&
    isNumberRecord(value.proposedAmountsMnt, ['dryRun', 'inReview', 'approvedNotPayable']) &&
    typeof value.payableAmountMnt === 'number' &&
    Array.isArray(value.recentTransactions) &&
    value.recentTransactions.every(isCommissionTransaction) &&
    isStringArray(value.warnings)
  );
}

function isSellerDashboardResponse(value: unknown): value is SellerDashboardResponse {
  if (!isRecord(value) || !isRecord(value.notificationsSummary)) return false;
  return (
    isSellerMeResponse(value.me) &&
    isSellerReferralSummary(value.referralSummary) &&
    isSellerLeadSummary(value.leadSummary) &&
    isSellerCommissionSummary(value.commissionSummary) &&
    isSellerWalletSummary(value.walletSummary) &&
    typeof value.notificationsSummary.deferred === 'boolean' &&
    (
      value.notificationsSummary.reason === undefined ||
      typeof value.notificationsSummary.reason === 'string'
    ) &&
    isStringArray(value.warnings) &&
    Array.isArray(value.nextActions) &&
    value.nextActions.every((item) =>
      isRecord(item) &&
      typeof item.code === 'string' &&
      typeof item.message === 'string'
    )
  );
}

export async function getSellerMe(): Promise<SellerMeResponse> {
  const env = await get('/seller/me');
  return unwrap<SellerMeResponse>(env, isSellerMeResponse, 'seller/me');
}

export async function getSellerDashboard(): Promise<SellerDashboardResponse> {
  const env = await get('/seller/dashboard');
  return unwrap<SellerDashboardResponse>(env, isSellerDashboardResponse, 'seller/dashboard');
}

export async function getSellerWalletSummary(): Promise<SellerWalletSummary> {
  const env = await get('/seller/wallet-summary');
  return unwrap<SellerWalletSummary>(env, isSellerWalletSummary, 'seller/wallet-summary');
}

export async function getSellerReferralSummary(): Promise<SellerReferralSummary> {
  const env = await get('/seller/referral-summary');
  return unwrap<SellerReferralSummary>(env, isSellerReferralSummary, 'seller/referral-summary');
}

export async function getSellerLeadSummary(): Promise<SellerLeadSummary> {
  const env = await get('/seller/lead-summary');
  return unwrap<SellerLeadSummary>(env, isSellerLeadSummary, 'seller/lead-summary');
}

export async function getSellerCommissionSummary(): Promise<SellerCommissionSummary> {
  const env = await get('/seller/commission-summary');
  return unwrap<SellerCommissionSummary>(env, isSellerCommissionSummary, 'seller/commission-summary');
}

// ─── Helpers for UI error mapping ────────────────────────────────────────

/**
 * Map an unknown error from a seller dashboard query to a small
 * presentation-layer descriptor. Does not include raw error messages
 * unless they look safe (no PII / no token text).
 */
export interface SellerUIError {
  /** A code the UI can branch on (matches SellerErrorCode where possible). */
  code: SellerErrorCode;
  /** A user-facing message in Mongolian. */
  message: string;
  /** correlationId from the BFF if the response carried one. */
  correlationId?: string;
  /** Retry hint from the BFF if available. */
  retryable?: boolean;
  /** True when the device appears to be offline (no HTTP response). */
  isOffline: boolean;
}

export function describeSellerError(err: unknown): SellerUIError {
  if (err instanceof SellerApiError) {
    return {
      code: err.code,
      message: errorMessageForCode(err.code, err.message),
      correlationId: err.correlationId,
      retryable: err.retryable,
      isOffline: false,
    };
  }
  const apiErr = err as ApiError | undefined;
  const isOffline = !!apiErr?.isOffline;
  if (apiErr?.code) {
    const code = apiErr.code as SellerErrorCode;
    return {
      code,
      message: errorMessageForCode(code, apiErr.message),
      correlationId: apiErr.correlationId,
      retryable: apiErr.retryable,
      isOffline,
    };
  }
  if (isOffline) {
    return {
      code: 'BFF_UPSTREAM_UNAVAILABLE',
      message: 'Сүлжээний холболт алдагдсан. Дахин оролдоно уу.',
      isOffline: true,
    };
  }
  const status = apiErr?.status;
  if (status === 401) {
    return { code: 'UNAUTHENTICATED', message: 'Дахин нэвтэрнэ үү.', isOffline: false };
  }
  if (status === 403) {
    return { code: 'FORBIDDEN', message: 'Хандалт хориотой.', isOffline: false };
  }
  if (status === 404) {
    return {
      code: 'NO_SELLER_PROFILE',
      message: 'Худалдагчийн профайл олдсонгүй.',
      isOffline: false,
    };
  }
  return {
    code: 'INTERNAL_ERROR',
    message: 'Сервэр түр алдаатай байна. Дахин оролдоно уу.',
    isOffline: false,
  };
}

function errorMessageForCode(code: SellerErrorCode, fallback: string): string {
  switch (code) {
    case 'UNAUTHENTICATED':
      return 'Дахин нэвтэрнэ үү.';
    case 'FORBIDDEN':
      return 'Хандалт хориотой.';
    case 'NO_IDENTITY_LINK':
      return 'Бүртгэл холбогдоогүй байна. Дэмжлэгийн багтай холбогдоно уу.';
    case 'NO_SELLER_PROFILE':
      return 'Худалдагчийн профайл олдсонгүй.';
    case 'SELLER_NOT_APPROVED':
      return 'Худалдагчийн өргөдөл татгалзагдсан.';
    case 'SELLER_SUSPENDED':
      return 'Худалдагчийн профайл түр түдгэлзүүлэгдсэн.';
    case 'DASHBOARD_NOT_READY':
      return 'Самбар бэлдэгдэж байна.';
    case 'STALE_COMPUTATION':
      return 'Мэдээлэл хуучирсан байна.';
    case 'RATE_LIMITED':
      return 'Хүсэлт олон удаа явуулсан байна. Хэсэг хүлээгээд дахин оролдоно уу.';
    case 'BFF_UPSTREAM_UNAVAILABLE':
    case 'IDENTITY_BRIDGE_UNAVAILABLE':
      return 'Үйлчилгээ түр боломжгүй байна.';
    case 'S2S_AUTH_FAILED':
    case 'S2S_NOT_CONFIGURED':
    case 'S2S_TIMESTAMP_INVALID':
    case 'NO_LINKED_USER':
    case 'INTERNAL_ERROR':
    default:
      return fallback || 'Сервэр түр алдаатай байна.';
  }
}
