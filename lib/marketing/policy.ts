export type MarketingChannel = 'email' | 'whatsapp' | 'sms';
export type ConsentStatus = 'granted' | 'withdrawn' | 'unknown';

/** A channel is eligible only with a current grant and the matching contact field. */
export function isConsentEligible(input: {
  status: ConsentStatus | string | null | undefined;
  channel: MarketingChannel;
  email?: string | null;
  phone?: string | null;
}): boolean {
  if (input.status !== 'granted') return false;
  const contact = input.channel === 'email' ? input.email : input.phone;
  return typeof contact === 'string' && contact.trim().length > 0;
}

/** Validate and normalize the lifetime used when issuing a one-time opt-out token. */
export function getUnsubscribeExpiryDays(value: number | undefined): number {
  const days = value ?? 30;
  if (!Number.isInteger(days) || days < 1 || days > 90) {
    throw new Error('Unsubscribe token expiry must be between 1 and 90 days.');
  }
  return days;
}

/** Old links must not withdraw consent after a newer grant or withdrawal event. */
export function isIssuedConsentStillCurrent(input: {
  issuedEventId: string;
  latestEventId: string | null | undefined;
  latestStatus: ConsentStatus | string | null | undefined;
}): boolean {
  return input.latestStatus === 'granted' &&
    Boolean(input.issuedEventId) &&
    input.latestEventId === input.issuedEventId;
}
