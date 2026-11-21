# HerMoney Studio — Firestore Security Specification

## 1. Data Invariants
1. **Public Draft Isolation**: Unauthenticated visitors and non-admin users can NEVER read (`get` or `list`) any article whose `status` is `'draft'`. Only `status == 'published'` documents in `/articles/{articleId}` are publicly readable.
2. **Strict Category Containment**: Every article's `category` MUST be one of the exact 6 permitted categories (`Make Money Online`, `Work From Home`, `Freelancing`, `Small Business Ideas`, `Passive Income`, `Blogging & Pinterest`).
3. **Administrator Verification**: Administrative reads and mutations require `request.auth != null` AND `request.auth.token.email_verified == true` AND either membership in `/admins/{uid}` or matching the verified bootstrap administrator email. Unverified email tokens (`email_verified: false`) are always rejected.
4. **PII Isolation (`contactMessages`)**: Public visitors can only `create` a contact inquiry with `consentAccepted == true` and server timestamp `request.time`. Public visitors cannot `get`, `list`, `update`, or `delete` contact messages.
5. **No Self-Elevation (`admins`)**: No client can create or modify `/admins/{uid}` unless already a verified administrator, preventing privilege escalation.
6. **Temporal & Schema Integrity**: Every document enforces exact key allowlists (`hasAll` + `hasOnly`), bounded string `.size()` limits, bounded array `.size() <= 15`, `createdAt == request.time` on creation, `updatedAt == request.time` on updates, and immutable `createdAt` / `authorUid`.

## 2. The "Dirty Dozen" Adversarial Payloads
1. Unauthenticated `get` on `/articles/draft-1` (`status: 'draft'`) -> `PERMISSION_DENIED`.
2. Unauthenticated `list` on `/articles` without `where('status', '==', 'published')` -> `PERMISSION_DENIED`.
3. Unverified email spoof (`email: admin`, `email_verified: false`) attempting `create` on `/articles/art-1` -> `PERMISSION_DENIED`.
4. Non-admin authenticated user attempting `create` on `/admins/attacker-uid` -> `PERMISSION_DENIED`.
5. Admin attempting `create` on `/articles/art-1` with an invalid 7th category (`category: 'Crypto'`) -> `PERMISSION_DENIED`.
6. Admin attempting `create` on `/articles/art-1` with a Ghost Field (`isFeaturedOverride: true`) -> `PERMISSION_DENIED`.
7. Admin attempting `create` on `/articles/art-1` with spoofed `authorUid != request.auth.uid` -> `PERMISSION_DENIED`.
8. Admin attempting `create` on `/articles/art-1` with client-forged `createdAt` (`!= request.time`) -> `PERMISSION_DENIED`.
9. Admin attempting `update` on `/articles/art-1` changing immutable `createdAt` or `authorUid` -> `PERMISSION_DENIED`.
10. Admin attempting `create` on `/articles/art-1` with `tags` array exceeding 15 items or non-string first element -> `PERMISSION_DENIED`.
11. Unauthenticated visitor attempting `list` or `get` on `/contactMessages` -> `PERMISSION_DENIED`.
12. Public visitor attempting `create` on `/contactMessages/msg-1` with `consentAccepted: false` or an oversized `> 4000` char message -> `PERMISSION_DENIED`.
