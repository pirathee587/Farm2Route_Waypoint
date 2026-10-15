#!/usr/bin/env bash
set -euo pipefail
mode=${1:?build or push}
: "${ECR_REGISTRY:?}" "${IMAGE_TAG:?}"
[[ "$IMAGE_TAG" =~ ^[a-f0-9]{40}$ ]] || { echo 'Use full commit SHA'; exit 1; }
[[ "$ECR_REGISTRY" =~ ^[0-9]{12}\.dkr\.ecr\.ap-southeast-1\.amazonaws\.com$ ]] || exit 1
for svc in api-gateway auth-service order-service planning-service loading-delivery-service notification-service; do
  image="$ECR_REGISTRY/waypoint-dev/$svc:$IMAGE_TAG"
  case "$mode" in
    build)
      context="services/$svc"
      case "$svc" in order-service|planning-service) context=.; esac
      docker build --pull --platform linux/amd64 -f "services/$svc/Dockerfile" -t "$image" "$context"
      trivy image --severity HIGH,CRITICAL --exit-code 1 "$image"
      ;;
    push) docker push "$image" ;;
    *) exit 2 ;;
  esac
done
