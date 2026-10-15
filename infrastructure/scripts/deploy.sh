#!/usr/bin/env bash
set -euo pipefail
# Called ONLY by the approved deployment stage. Patches pre-created deployments;
# infrastructure, Secrets, RBAC, RabbitMQ and PVCs remain administrator-owned.
: "${ECR_REGISTRY:?}" "${IMAGE_TAG:?}" "${EKS_CLUSTER:?}" "${API_BASE_URL:?}"
[[ "$IMAGE_TAG" =~ ^[a-f0-9]{40}$ ]] || exit 1
[[ "$API_BASE_URL" == https://* ]] || exit 1
export KUBECONFIG
KUBECONFIG=$(mktemp)
trap 'rm -f "$KUBECONFIG"' EXIT
aws eks update-kubeconfig --region ap-southeast-1 --name "$EKS_CLUSTER" >/dev/null
for svc in api-gateway auth-service order-service planning-service loading-delivery-service notification-service; do
  kubectl -n waypoint-dev set image "deployment/$svc" "$svc=$ECR_REGISTRY/waypoint-dev/$svc:$IMAGE_TAG"
done
for svc in api-gateway auth-service order-service planning-service loading-delivery-service notification-service; do
  kubectl -n waypoint-dev rollout status "deployment/$svc" --timeout=300s
done
# Public ingress only exposes /api; unauthenticated protected endpoint must reject.
status=$(curl -sS -o /dev/null -w '%{http_code}' "$API_BASE_URL/orders")
[[ "$status" == 401 ]] || { echo "Expected 401, got $status"; exit 1; }
curl --fail --silent --show-error -X OPTIONS "$API_BASE_URL/orders" \
 -H 'Origin: https://farm2-route-waypoint.vercel.app' \
 -H 'Access-Control-Request-Method: GET' \
 -D - -o /dev/null | tr -d '\r' | grep -qi '^access-control-allow-origin: https://farm2-route-waypoint.vercel.app$'
