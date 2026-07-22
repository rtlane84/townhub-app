export const BUSINESS_SELLER_AGREEMENT_VERSION = "2026-07-21";

/** Production applications are blocked until counsel has approved this published agreement version. */
export function isBusinessSellerAgreementApprovedForProduction(
  nodeEnv: string | undefined = process.env.NODE_ENV,
  approvedVersion: string | undefined = process.env.BUSINESS_SELLER_AGREEMENT_APPROVED_VERSION,
): boolean {
  return nodeEnv !== "production" || approvedVersion === BUSINESS_SELLER_AGREEMENT_VERSION;
}
