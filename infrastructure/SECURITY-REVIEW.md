# Release blockers — Phase D update

**Not deployment-ready.** Source fixes and local evidence are recorded in
[PHASE-D-REVIEW.md](PHASE-D-REVIEW.md); that record supersedes the original Phase C
findings. No AWS resources, remote state or live database data were changed.

Implemented: safe Auth startup/seed defaults, production denial of known seeded identities,
JWT configuration checks, Auth-only bearer forwarding, browser WebSocket tickets and exact
origins, strict database TLS checks, protobuf Loading-to-Planning client, authenticated
persistent upload retrieval, and dependency-aware Go readiness. EBS IAM principal tags,
CNI enforcement mode and private runner topology are explicit.

Release gates still open:

1. Complete Java/frontend/image builds and vulnerability scans; qualify the candidate
   EKS 1.35 stack and ALB controller. Successful Terraform validation is not compatibility proof.
2. Exercise actual Auth/Gateway login, refresh and role boundaries with isolated fixtures;
   rotate exposed historical JWT keys and inventory all seeded accounts. Existing tokens
   are not revoked by an email-deny rule alone. No automated production data cleanup occurred.
3. Integrate/test the browser notification helper and authenticated image retrieval.
   Tickets allow bounded 30-second replay and do not expire an established WebSocket.
4. Verify real Java/Go gRPC interoperability, CA/hostname rejection and successful DB TLS;
   provide the authenticated Supabase CA. Java local/test profiles must never be used in production.
5. Prove CNI deny/allow behavior. Standard mode permits traffic during policy reconciliation;
   strict mode requires a separate system-namespace policy review. Header trust depends
   on network isolation. Internal gRPC/AMQP remains plaintext.
6. Test a real PVC pod restart and restore, broker reconnects and business readiness.
   Notification persistence failures can still be acknowledged: implement/test retry,
   idempotency and dead-letter behavior before release.
   One upload replica and one RabbitMQ are development constraints. Local file tests
   do not establish EBS durability. Old files without owner metadata are not auto-migrated.
7. Provision/verify the separate private management runner only after approval; validate
   DNS, routing, SGs, IAM assumption, RBAC, Jenkins plugins and approval-group membership.
8. Narrow/qualify the upstream ALB controller IAM policy: several SG, listener and
   optional WAF/Shield operations remain broader than this project.
9. Clear unknown network ranges, resolve inputs/backend ownership, review budget and
   a separately authorized plan. No replacement safety claim is possible without that plan.

No provisioning, state migration, image push or Kubernetes deployment is authorized by
these files. Preserve all existing EC2/EBS/VPC resources and unrelated working-tree changes.
