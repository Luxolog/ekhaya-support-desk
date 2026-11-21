import { describe, expect, it } from 'vitest';
import { getUnsubscribeExpiryDays, isConsentEligible, isIssuedConsentStillCurrent } from '../lib/marketing/policy';

describe('marketing consent eligibility', () => {
  it('allows email only when a current grant has a non-empty email', () => {
    expect(isConsentEligible({ status: 'granted', channel: 'email', email: 'person@example.com' })).toBe(true);
    expect(isConsentEligible({ status: 'granted', channel: 'email', email: '  ' })).toBe(false);
    expect(isConsentEligible({ status: 'granted', channel: 'email', phone: '+27123456789' })).toBe(false);
  });

  it('uses a phone number for SMS and WhatsApp, not an email address', () => {
    expect(isConsentEligible({ status: 'granted', channel: 'sms', phone: '+27123456789' })).toBe(true);
    expect(isConsentEligible({ status: 'granted', channel: 'whatsapp', email: 'person@example.com' })).toBe(false);
  });

  it('rejects withdrawn, unknown and missing consent states', () => {
    for (const status of ['withdrawn', 'unknown', null, undefined]) {
      expect(isConsentEligible({ status, channel: 'email', email: 'person@example.com' })).toBe(false);
    }
  });
});

describe('unsubscribe token policy', () => {
  it('defaults token expiry to 30 days and accepts the supported boundaries', () => {
    expect(getUnsubscribeExpiryDays(undefined)).toBe(30);
    expect(getUnsubscribeExpiryDays(1)).toBe(1);
    expect(getUnsubscribeExpiryDays(90)).toBe(90);
  });

  it('rejects invalid token lifetimes', () => {
    for (const days of [0, -1, 91, 1.5, Number.NaN]) {
      expect(() => getUnsubscribeExpiryDays(days)).toThrow();
    }
  });

  it('accepts an unsubscribe only for the exact still-current grant event', () => {
    expect(isIssuedConsentStillCurrent({ issuedEventId: 'event-a', latestEventId: 'event-a', latestStatus: 'granted' })).toBe(true);
    expect(isIssuedConsentStillCurrent({ issuedEventId: 'event-a', latestEventId: 'event-b', latestStatus: 'granted' })).toBe(false);
    expect(isIssuedConsentStillCurrent({ issuedEventId: 'event-a', latestEventId: 'event-a', latestStatus: 'withdrawn' })).toBe(false);
  });
});
