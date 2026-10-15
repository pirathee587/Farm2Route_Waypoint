# Phase C files

Created:

- `infrastructure/COSTS.md`
- `infrastructure/README.md`
- `infrastructure/SECURITY-REVIEW.md`
- `infrastructure/SERVICE-INVENTORY.md`
- `infrastructure/VALIDATION.md`
- `infrastructure/kubernetes/applications.yaml`
- `infrastructure/kubernetes/configmap.yaml`
- `infrastructure/kubernetes/ingress.yaml`
- `infrastructure/kubernetes/jenkins-rbac.yaml`
- `infrastructure/kubernetes/kustomization.yaml`
- `infrastructure/kubernetes/namespace.yaml`
- `infrastructure/kubernetes/network-policies.yaml`
- `infrastructure/kubernetes/rabbitmq.yaml`
- `infrastructure/kubernetes/secrets.env.example`
- `infrastructure/kubernetes/storage.yaml`
- `infrastructure/scripts/ci-test.sh`
- `infrastructure/scripts/deploy.sh`
- `infrastructure/scripts/images.sh`
- `infrastructure/scripts/loading-integration.sh`
- `infrastructure/scripts/validate.py`
- `infrastructure/terraform/addons/.terraform.lock.hcl`
- `infrastructure/terraform/addons/alb-iam-policy.json`
- `infrastructure/terraform/addons/backend.hcl.example`
- `infrastructure/terraform/addons/main.tf`
- `infrastructure/terraform/addons/terraform.tfvars.example`
- `infrastructure/terraform/bootstrap/.terraform.lock.hcl`
- `infrastructure/terraform/bootstrap/backend.hcl.example`
- `infrastructure/terraform/bootstrap/main.tf`
- `infrastructure/terraform/bootstrap/terraform.tfvars.example`
- `infrastructure/terraform/bootstrap/versions.tf`
- `infrastructure/terraform/infrastructure/.terraform.lock.hcl`
- `infrastructure/terraform/infrastructure/backend.hcl.example`
- `infrastructure/terraform/infrastructure/backend.tf`
- `infrastructure/terraform/infrastructure/ecr-jenkins.tf`
- `infrastructure/terraform/infrastructure/eks.tf`
- `infrastructure/terraform/infrastructure/network.tf`
- `infrastructure/terraform/infrastructure/terraform.tfvars.example`
- `infrastructure/terraform/infrastructure/variables.tf`
- `infrastructure/terraform/infrastructure/versions.tf`
- `infrastructure/FILES.md`
- `Jenkinsfile`
- `services/api-gateway/.dockerignore`
- `services/auth-service/.dockerignore`
- `services/loading-delivery-service/.dockerignore`
- `services/notification-service/.dockerignore`

Modified: `.gitignore`, `.dockerignore`, `services/notification-service/Dockerfile`.

Provider lockfiles are included for review. Downloaded `.terraform` directories are ignored.
The pre-existing modified driver SQL and untracked `infra/postgres/repair-api-schema.sh` were not changed.

## Phase D application changes

The following working-tree application/configuration paths were changed during the review.
The existing SQL modification and `infra/postgres/repair-api-schema.sh` were preserved.

- `.dockerignore`
- `.gitignore`
- `frontend/src/features/notifications/connectNotifications.ts`
- `services/api-gateway/.dockerignore`
- `services/api-gateway/Gateway.Api/Config/GatewayTransformProvider.cs`
- `services/api-gateway/Gateway.Api/Config/JwtSafety.cs`
- `services/api-gateway/Gateway.Api/Config/WebSocketTickets.cs`
- `services/api-gateway/Gateway.Api/Middleware/JwtValidationMiddleware.cs`
- `services/api-gateway/Gateway.Api/Program.cs`
- `services/api-gateway/Gateway.Api/appsettings.json`
- `services/api-gateway/Gateway.Tests/SecurityBoundaryTests.cs`
- `services/auth-service/.dockerignore`
- `services/auth-service/Auth.Api/appsettings.json`
- `services/auth-service/src/Auth.Api/Configuration/StartupSafety.cs`
- `services/auth-service/src/Auth.Api/Controllers/UserController.cs`
- `services/auth-service/src/Auth.Api/Program.cs`
- `services/auth-service/src/Auth.Application/Services/AuthService.cs`
- `services/auth-service/src/Auth.Application/Services/DevelopmentAccounts.cs`
- `services/auth-service/src/Auth.Application/Services/JwtSafety.cs`
- `services/auth-service/src/Auth.Application/Services/TokenService.cs`
- `services/auth-service/tests/Auth.UnitTests/Services/StartupSafetyTests.cs`
- `services/loading-delivery-service/.dockerignore`
- `services/loading-delivery-service/cmd/server/main.go`
- `services/loading-delivery-service/config/config.go`
- `services/loading-delivery-service/config/config.yaml`
- `services/loading-delivery-service/internal/handler/health_handler.go`
- `services/loading-delivery-service/internal/handler/health_handler_test.go`
- `services/loading-delivery-service/internal/planningpb/planning.pb.go`
- `services/loading-delivery-service/internal/planningpb/planning_grpc.pb.go`
- `services/loading-delivery-service/internal/repository/integration_test.go`
- `services/loading-delivery-service/internal/repository/postgres.go`
- `services/loading-delivery-service/internal/repository/tls_test.go`
- `services/loading-delivery-service/internal/service/planning_client.go`
- `services/loading-delivery-service/internal/service/planning_client_test.go`
- `services/loading-delivery-service/internal/service/storage.go`
- `services/loading-delivery-service/internal/service/storage_security_test.go`
- `services/notification-service/.dockerignore`
- `services/notification-service/Dockerfile`
- `services/notification-service/cmd/server/main.go`
- `services/notification-service/config/config.go`
- `services/notification-service/config/config.yaml`
- `services/notification-service/internal/handler/notification_handler.go`
- `services/notification-service/internal/handler/security_test.go`
- `services/notification-service/internal/messaging/consumer.go`
- `services/notification-service/internal/repository/postgres.go`
- `services/notification-service/internal/repository/tls_test.go`
- `services/order-service/src/main/java/com/waypoint/order/config/DatabaseTlsGuard.java`
- `services/order-service/src/main/resources/META-INF/spring.factories`
- `services/order-service/src/main/resources/application.yml`
- `services/order-service/src/test/java/com/waypoint/order/config/DatabaseTlsGuardTest.java`
- `services/planning-service/src/main/java/com/waypoint/planning/config/DatabaseTlsGuard.java`
- `services/planning-service/src/main/resources/META-INF/spring.factories`
- `services/planning-service/src/main/resources/application.yml`
- `services/planning-service/src/test/java/com/waypoint/planning/config/DatabaseTlsGuardTest.java`
- `services/planning-service/src/test/java/com/waypoint/planning/integration/PlanningPostgresIntegrationTest.java`

Phase D also updates the Terraform EKS/add-on example, application manifests and ConfigMap,
README, SECURITY-REVIEW and VALIDATION; adds PHASE-D-REVIEW and the isolated-source snapshot
script. Generated Go protobuf bindings are included; local snapshots/build outputs are ignored.
