/**
 * Verification specification test cases for HerMoney Studio Firestore Security Rules.
 * Covers the Dirty Dozen adversarial payloads against firestore.rules.
 */
export const DIRTY_DOZEN_CASES = [
  { id: 1, operation: 'get', path: '/articles/draft-1', expected: 'PERMISSION_DENIED', reason: 'Draft article inaccessible to public' },
  { id: 2, operation: 'list', path: '/articles', expected: 'PERMISSION_DENIED', reason: 'Public list must filter status == published' },
  { id: 3, operation: 'create', path: '/articles/art-1', expected: 'PERMISSION_DENIED', reason: 'Unverified email rejected' },
  { id: 4, operation: 'create', path: '/admins/attacker', expected: 'PERMISSION_DENIED', reason: 'Self-promotion to admin blocked' },
  { id: 5, operation: 'create', path: '/articles/art-1', expected: 'PERMISSION_DENIED', reason: 'Unlisted category rejected' },
  { id: 6, operation: 'create', path: '/articles/art-1', expected: 'PERMISSION_DENIED', reason: 'Shadow/ghost field rejected by hasOnly' },
  { id: 7, operation: 'create', path: '/articles/art-1', expected: 'PERMISSION_DENIED', reason: 'Author UID spoofing rejected' },
  { id: 8, operation: 'create', path: '/articles/art-1', expected: 'PERMISSION_DENIED', reason: 'Client-forged createdAt rejected' },
  { id: 9, operation: 'update', path: '/articles/art-1', expected: 'PERMISSION_DENIED', reason: 'Immutable createdAt/authorUid change rejected' },
  { id: 10, operation: 'create', path: '/articles/art-1', expected: 'PERMISSION_DENIED', reason: 'Unbounded or invalid tags array rejected' },
  { id: 11, operation: 'list', path: '/contactMessages', expected: 'PERMISSION_DENIED', reason: 'Contact PII inaccessible to public' },
  { id: 12, operation: 'create', path: '/contactMessages/msg-1', expected: 'PERMISSION_DENIED', reason: 'Consent false or oversized payload rejected' }
] as const;
