# Phase D — implementation review, 2026-10-13

Status: **not approved for deployment or infrastructure provisioning**. No AWS resources,
Supabase data, remote Terraform state or ECR images were changed. No Terraform plan,
apply/destroy/import, state migration or Kubernetes deployment was performed.

## Application changes and evidence

| Area | Implementation | Local evidence / remaining gate |
|---|---|---|
| Auth startup | Schema creation and development seeding default off; either flag fails outside Development; DB/schema failures stop startup | Auth unit suite: 22 passed. Existing one-test integration project is a placeholder, not integration evidence |
| JWT | Reject missing, short and known development keys; HS256 only, issuer/audience/lifetime checked; Auth preserves original claim names | Startup/JWT tests passed; production key rotation and real login/refresh still required |
| Development identities | Known seeded emails cannot login/refresh/reset outside Development; existing rows are preserved | Unit test verifies deny rule; existing issued tokens require signing-key rotation and account inventory |
| Gateway boundary | Strip spoofed identity headers on all paths; exact public-path allowlist; preserve Authorization only for Auth cluster; users endpoints require authenticated claims | Gateway suite: 12 passed, including origin, ticket, algorithm, expiry and forwarding-policy tests. Live YARP-to-Auth requests still required |
| Browser WebSockets | Authenticated origin-checked POST `/api/notify/ws-ticket`; 30-second separate-audience ticket sent in subprotocol; gateway removes ticket before proxying; notification has exact origin allowlist | Middleware and Go origin tests passed. Frontend connection helper added; UI integration/browser handshake is not verified |
| PostgreSQL TLS | Npgsql VerifyFull; pgx rejects insecure TLS/fallbacks; Java JDBC URL guard requires verify-full outside explicit local/test profiles | Auth and Go negative tests passed; Java tests tracked below. No external DB connection made; trusted CA distribution remains required |
| Planning gRPC | Generated Go bindings from shared `proto/planning.proto`; protobuf replaces JSON codec; validate response trip identity and map contract fields | Go protobuf request/response tests with race detection passed. Live Java-to-Go contract fixture remains outstanding |
| Uploads | Respect UPLOAD_DIR; persist image plus owner metadata; authenticated owner/dispatcher retrieval, no listing/symlinks; Supabase shortfall now performs upload | Local restart/reopen, retrieval, deny-access and fake Supabase upload tests passed. Actual Kubernetes PVC restart/restore not tested |
| Readiness | Auth DB check; loading unavailable DB returns 503; notification requires DB and connected broker consumer; Java broker health enabled in manifests | Go dependency-state tests passed. Gateway health is process readiness, not downstream business readiness |
| Test safety | Destructive loading fixtures require explicit TEST URLs, loopback hosts and the fixture DB/vhost; never fall back to application credentials | Fixture guard reviewed; isolated integration suite remains a separate validation gate |

Tickets are reusable during their 30-second validity and authenticate the handshake only;
they are not one-time credentials and do not disconnect established sessions at expiry.
Do not log Authorization or Sec-WebSocket-Protocol headers. CORS and notification origins
are limited to the exact production Vercel origin. Existing notification UI does not yet
call the new helper. Protected image URLs require authenticated fetch/Blob handling, not
an unauthenticated `<img src>`. Access policy currently allows the uploading user and
DISPATCHER/ADMIN; outlet/driver sharing must be explicitly designed if required.

Old upload files without owner metadata return 404; no data migration was attempted.
Supabase object upload tests do not prove private signed retrieval or bucket policy.
The prepared deployment selects local storage. Internal gRPC and AMQP remain plaintext
inside the private network and must be assessed for production transport requirements.

Notification acknowledgment (addressed 2026-10-14, locally unit-tested only): `HandleEvent`
now returns persistence failures, treats a missing DB as a transient failure, and broadcasts
only after a first-time commit. The consumer retries up to 5 attempts (0.5s–8s back-off),
then publishes to durable `notification.dead-letter` on a confirm-mode channel and acks only
after broker confirmation; a failed DLQ publish requeues the message instead of dropping it.
Malformed driver pushes are permanent and are dead-lettered without retries. A DB-ping gate
requeues messages while the DB is unreachable, so outages do not flood the DLQ. Idempotency
uses a SHA-256 key of event type + body, stored in the same transaction as fan-out rows in
new table `notification_event_receipts` (migration `20261014000001`, **not applied**).
AMQP MessageId is not used because the outbox sets it to the aggregate reference.
Remaining gates: review/apply that migration **before** deploying this build (otherwise all
events dead-letter); live RabbitMQ/Postgres redelivery and DLQ tests; DLQ alerting, replay
tooling and receipt pruning. Source queue arguments are unchanged; the DLQ is a new queue.

## Infrastructure review

- New VPC only: `10.20.0.0/16` is disjoint from known `10.0.0.0/16` and
  `172.31.0.0/16`. Other regions, VPNs, peering and on-premises ranges are not cleared.
  No existing EC2, disks or custom VPC resources are imported or referenced for adoption.
- Public `/24` and private `/20` subnets span distinct `apse1-az2` and `apse1-az1`.
  Both private routes use NAT A for development; production per-AZ mode avoids that
  shared failure path and cross-AZ NAT traffic. Public subnets use the new IGW.
- EKS endpoint stays private. Selected runner location: **a separate EC2 management host
  in private subnet A of the new VPC**, with the prepared runner SG, no public IP or
  inbound SSH/RDP. It is not provisioned by these roots. Its separately managed instance
  role needs SSM and permission to assume the delivery role; do not use application nodes.
  Before pipeline enablement, verify private DNS/TCP443, STS role assumption, cluster
  identity and Kubernetes authorization from that host. No VPN path is being assumed.
- Delivery IAM scopes image writes to six ECR repos and DescribeCluster to this cluster;
  ECR authorization-token API necessarily uses `*`. Kubernetes permission is restricted
  to the six deployment names. Trusted checkout and restricted approval identities remain
  essential because a deployment editor can change pod specifications, not only images.
- ALB controller uses the vendored upstream policy, which includes broad SG ingress,
  WAF/Shield and listener operations. Its tag checks are not uniformly specific to this
  cluster. This is an **open least-privilege gate**, not evidence of project-only access.
  Review/remove unused integrations and qualify a scoped policy before controller installation.
- EBS CSI IAM roles now carry `eks-cluster-name` explicitly, matching Pod Identity trust
  conditions/session tags and the cluster-scoped policy. Driver-created volumes must carry
  `ebs.csi.aws.com/cluster-name`. Managed nodes receive the EKS cluster-name instance tag used by the attachment condition.
  Verify resulting volume tags and attachment permissions
  in an approved fresh-volume smoke test; never retag existing unrelated disks.
- CNI `enableNetworkPolicy=true`, explicitly **standard** enforcement mode. Namespace
  default-deny policies take effect after reconciliation; there is a startup allowance
  window. Strict mode is not enabled because all system workloads, including CoreDNS,
  would need reviewed policies first. Neither configuration nor YAML proves live enforcement.
- Encrypted gp3 roots and Retain PVCs are configured. Retain is not a backup, multi-AZ
  storage or tested recovery. Uploads use one replica/Recreate; RabbitMQ is one replica.
- Backend bootstrap remains separate. No state bucket is assumed to exist. Three state
  keys stay distinct. Bootstrap migration needs a later approved operation. Replacement
  risk is unverified without state and a plan; fail review on any unrelated resource action.

AWS guidance: [EBS policy and required tags](https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AmazonEBSCSIDriverEKSClusterScopedPolicy.html),
[CNI standard/strict behavior](https://docs.aws.amazon.com/eks/latest/userguide/cni-network-policy-configure.html).

### EKS candidate comparison

Read-only Singapore EKS API returned these standard-support end dates:

| Version | End date | Decision |
|---|---|---|
| 1.34 | 2026-12-02 | Short runway for new cluster |
| 1.35 | 2027-03-27 | Candidate in example variables; not deployment approval |
| 1.36 | 2027-08-02 | Longer runway; stack qualification not done |
| 1.37 | 2027-12-01 | Longer runway; stack qualification not done |

The 1.35 API catalog returned CNI `v1.23.2-eksbuild.1`, kube-proxy
`v1.35.3-eksbuild.49`, CoreDNS `v1.14.7-eksbuild.11`, Pod Identity
`v1.4.0-eksbuild.3`, EBS CSI `v1.66.0-eksbuild.1`; example inputs now use these.
This proves AWS catalog compatibility only. ALB controller/chart, admission policies,
application images, capacity and runtime behavior still need qualification. No cluster was
created/upgraded. Pod Security 1.34 labels currently remain pinned and need version review.

## Validation status

- PASS: both Go service suites with `go test -race -mod=readonly ./...`; notification module
  re-run 2026-10-14 with `go vet` plus 13 new consumer/service retry, DLQ and idempotency tests.
- PASS: Auth 22 unit tests; gateway 12 tests after correcting a compiler name collision.
- PASS: Terraform formatting and provider-schema validation for all three roots.
- PASS: Python structural validation of 45 Kubernetes objects; shell syntax; diff whitespace.
- Incomplete: Java tests, six complete image builds and Trivy scans.
  Frontend SDK image pull failed with `no route to host`; frontend tests/build did not run.
  Maven 3.9.11 downloads failed twice with registry/DNS errors; 3.9.6 fallback
  downloaded, but both Java runs remained in dependency resolution for over 20 minutes
  without reaching tests. The task-owned containers were stopped and public dependency
  caches preserved in ignored `infrastructure/local/`. No Java pass is claimed.
- Pending: actual Jenkins execution/approver identity resolution, actual browser/YARP traffic,
  Java/Go cross-process gRPC, TLS positive/negative certificate fixtures, isolated DB/broker
  integration coverage, live CNI deny/allow tests and PVC restart/backup restore.

Test containers use a secret-excluded source snapshot under ignored `infrastructure/local/`.
No production `.env`, AWS credentials or existing database endpoints are passed to them.
Auth claim-mapping configuration received a subsequent explicit `MapInboundClaims=false`
setting; host-level role-policy behavior still requires integration testing.

## Next review gates

1. Finish all local build/test/scan and integration gates above; do not treat placeholder or
   skipped tests as coverage. Supply the trusted Supabase CA via `supabase-db-ca` ConfigMap
   for all five database clients; Java, Npgsql and pgx root-certificate settings point
   to `/etc/db-ca/root.crt`. The CA is public, but its
   authenticity must be established out of band; no placeholder certificate is supplied.
2. Inventory/disable any other development accounts, rotate historical signing keys, review
   schema migrations separately, and establish rollback/backup recovery. No seed/migration
   runs against existing Supabase during this review.
3. Approve CIDR clearance, candidate EKS stack, runner prerequisites and budget. Current
   planning baseline is in [COSTS.md](COSTS.md): approximately $277.45/month including a
   separately managed runner, before usage-dependent charges. This is not a final quote.
4. Only then authorize read-only plan review using the exact staged commands in
   [README.md](README.md). Confirm identity, state key and every create/update/delete/replace;
   reject unrelated resources. Backend locking requires writes, so strictly read-only review
   uses a serialized plan with locking disabled and never publishes a secret-bearing plan.
5. Provisioning, state migration, image publication and deployment each remain outside this
   work and require their explicit approvals.

Architecture/subnet diagram: [README.md](README.md). Resource cost breakdown: [COSTS.md](COSTS.md).

## Repeating isolated validation

Use the native tool commands in `infrastructure/scripts/ci-test.sh` on a trusted runner
with working dependency access. It fails if Java Testcontainers coverage is skipped.
The local review used .NET SDK 8, Go 1.25.3 and Maven 3.9.6/Java 21 containers with
only the source snapshot mounted. No live application environment file was loaded.
Go race tests covered both service modules; Auth command was `dotnet test
services/auth-service/Auth.sln --configuration Release`; gateway command was
`dotnet test services/api-gateway/Gateway.Tests/Gateway.Tests.csproj --configuration Release`.
Maven commands were `mvn -B -ntp -f services/<service>/pom.xml test`. Frontend command
was intended to run `npm ci --no-audit --no-fund && npm test && npm run build`, but
its Node image download failed before execution. Six-image builds/scans and live integration
checks remain explicit gates rather than assumed successes.
