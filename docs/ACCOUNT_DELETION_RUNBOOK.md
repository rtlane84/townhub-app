# Account Deletion Operations

TownHub lets every signed-in user initiate account deletion from **Account → Delete TownHub account**. The request is recorded immediately and scheduled for processing within 30 days. Users can cancel while it remains pending.

Account deletion is an operational workflow because customer orders, business ownership, Stripe subscriptions, refunds, disputes, tax records, and public business content can require different treatment. Do not mark a request complete until every applicable step below is verified.

## Schema rollout

The feature adds `account_deletion_status` and `account_deletion_requests`. This repository uses Drizzle `push`, not checked-in migrations.

1. Back up the target database.
2. Apply and verify the schema in staging first with the staging `DATABASE_URL`:

   ```bash
   pnpm --filter @workspace/db run push
   ```

3. Test request, status, cancellation, and the Admin → Users queue in staging.
4. Schedule the production schema push, verify the target `DATABASE_URL`, and obtain explicit production approval before running it.

Never use `push-force` for this rollout.

## Daily queue review

Open **Admin → Users → Account deletion requests**. Prioritize requests by their **Process by** date. The API source for this queue is `GET /api/admin/account-deletion-requests` and requires an active admin session.

## Processing checklist

For each pending request:

1. Confirm the request ID, Clerk user ID, email snapshot, role, request date, and scheduled date.
2. Check for business ownership, pending applications, active orders, refunds, disputes, and legal holds.
3. For a business owner, decide with the owner whether each business is transferred to another verified owner or archived. Do not orphan an active business.
4. Resolve any TownHub business subscription in Stripe Billing. Stripe Connect customer-payment records are a separate payment domain and must not be treated as the TownHub subscription.
5. Remove device tokens and notification preferences. Remove or anonymize personal profile and user-created content unless a documented legal or transactional retention requirement applies.
6. Retain only the minimum order, refund, payment, tax, fraud-prevention, dispute, and audit records required by policy or law. Document the category, reason, and retention period; do not leave retained records publicly accessible.
7. Delete the identity from Clerk. If the account used Sign in with Apple, verify that the Apple authorization/token is revoked as required by Apple before closing the request.
8. Confirm the user can no longer authenticate and that personal data no longer appears in customer, owner, admin, notification, log, analytics, or media surfaces beyond documented retained records.
9. Update `account_deletion_requests.status` to `COMPLETED`, set `completed_at` and `updated_at`, and send confirmation to the request email before removing it from active communication systems.

Completion intentionally has no one-click admin button. Identity deletion, provider actions, ownership transfer, retention decisions, and data cleanup must succeed first.

## Cancellation

Users can cancel a pending request from the Account page. Cancellation changes the request to `CANCELED` and records `canceled_at`. Do not process canceled requests. A later request renews the same row with a new request and scheduled date.

## Incident handling

If processing cannot finish by the scheduled date:

1. Record the exact blocker and affected data categories.
2. Notify the user with a specific revised date.
3. Escalate provider, payment, security, or legal blockers to the platform owner.
4. Do not mark the request complete merely to clear the queue.
