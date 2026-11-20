# Security Specification & Red Team Test Plan

## Data Invariants
1. Only authenticated, email-verified store administrators (`zonottp@gmail.com` or `/admins/{uid}`) may create, update, or delete `/products/{productId}`, `/settings/{settingId}`, `/adminConfig/{configId}`, or `/admins/{uid}`.
2. Storefront products (`/products/{productId}`) are readable by anyone for catalog browsing, while sensitive admin credentials (`/adminConfig/{configId}`) and customer PII (`/orders/{orderId}`) are strictly isolated.
3. Orders in `/orders/{orderId}` cannot be listed or read by unauthenticated guests or non-owner customers; only admins or the matching authenticated `customerUid` may read them.
4. All document IDs (`productId`, `orderId`, `settingId`, `configId`, `uid`) must satisfy `^[a-zA-Z0-9_\-]+$` and length `<= 128`.
5. Every document creation and update enforces strict key allowlists (`hasAll` + `hasOnly` / `affectedKeys().hasOnly()`) and strict type + size bounds (`is string && size() <= MAX`).
6. Timestamps (`createdAt`, `updatedAt`) are validated against `request.time`.

## The Dirty Dozen Payloads (Attack Vectors)
1. Unauthenticated `DELETE /products/p-1` -> **DENIED**
2. Non-admin verified user `CREATE /products/p-99` -> **DENIED**
3. Admin `CREATE /products/invalid.id` (ID poisoning with `.` or >128 chars) -> **DENIED**
4. Admin `CREATE /products/p-99` with shadow field `{ ..., isAdminOnly: true }` -> **DENIED**
5. Unauthenticated `READ /adminConfig/telegram` (Telegram Bot Token / PIN theft) -> **DENIED**
6. Unauthenticated `LIST /orders` (Customer phone/address PII scraping) -> **DENIED**
7. Non-admin user `GET /orders/MSPN-123456` belonging to another customer -> **DENIED**
8. Unverified email admin spoof (`email: "zonottp@gmail.com", email_verified: false`) -> **DENIED**
9. Guest creating `/orders/o-1` with forged `paymentStatus: "delivered"` instead of `"pending"` or `"verified"` -> **DENIED**
10. Guest creating `/orders/o-1` with client-backdated `createdAt` (`!= request.time`) -> **DENIED**
11. Non-admin customer updating `/orders/o-1` to change `totalUsd` or `paymentStatus` -> **DENIED**
12. Non-admin creating `/admins/{uid}` to escalate privileges -> **DENIED**
