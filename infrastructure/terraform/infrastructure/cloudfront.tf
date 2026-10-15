# ── Phase 7b: CloudFront → VPC Origin → internal ALB ─────────────────────────
# TLS terminates at CloudFront (*.cloudfront.net default cert).
# Origin speaks plain HTTP:80 to the internal ALB inside the VPC.
# WebSocket upgrade headers pass through via AllViewerExceptHostHeader policy.
#
# Workflow:
#   1. Run this plan to see resource counts (alb_arn can be empty — dummy used).
#   2. After go: apply NetworkPolicy + Ingress → ALB provisions → get ALB ARN.
#   3. Set alb_arn = "<real arn>" in terraform.tfvars, re-plan, then apply.

variable "alb_arn" {
  type        = string
  description = "ARN of the internal ALB created by the ALB Ingress controller. Set after kubectl apply provisions the ALB."
  default     = ""
}

variable "alb_dns_name" {
  type        = string
  description = "DNS name of the internal ALB. Set after ALB is live."
  default     = ""
}

variable "cf_origin_secret" {
  type        = string
  description = "Secret header value (X-Origin-Verify) CloudFront injects per request. Rotate via SSM — never commit the real value."
  sensitive   = true
  default     = "ROTATE_ME"
}

# ── VPC Origin ────────────────────────────────────────────────────────────────
# Registers the internal ALB as a CloudFront VPC origin endpoint.
# CloudFront provisions ENIs inside the VPC to route requests to the ALB.
resource "aws_cloudfront_vpc_origin" "api_gateway" {
  vpc_origin_endpoint_config {
    name                   = "${local.name}-api-gateway"
    arn                    = var.alb_arn
    http_port              = 80
    https_port             = 443          # schema required even for http-only
    origin_protocol_policy = "http-only"

    origin_ssl_protocols {
      items    = ["TLSv1.2"]             # schema required; not evaluated for http-only
      quantity = 1
    }
  }

  tags = { Name = "${local.name}-api-gateway-vpc-origin" }
}

data "aws_security_group" "cloudfront_vpc_origin_service" {
  name       = "CloudFront-VPCOrigins-Service-SG"
  vpc_id     = aws_vpc.waypoint.id
  depends_on = [aws_cloudfront_vpc_origin.api_gateway]
}

# ── CloudFront Distribution ───────────────────────────────────────────────────
# Managed policy UUIDs (AWS-managed, globally stable):
#   CachingDisabled              = 4135ea2d-6df8-44a3-9df3-4b5a84be39ad
#   AllViewerExceptHostHeader    = b689b0a8-53d0-40ab-baf2-68738e2966ac
resource "aws_cloudfront_distribution" "api_gateway" {
  enabled         = true
  is_ipv6_enabled = true
  comment         = "Waypoint ${var.environment} – API Gateway via VPC Origin"
  price_class     = "PriceClass_100"     # US/EU/AP PoPs — sufficient for Singapore + global dev

  origin {
    origin_id = "${local.name}-alb"
    # domain_name is a schema requirement. Traffic is routed via VPC Origin
    # ENIs, not over the public DNS. Will be the real ALB DNS after step 2.
    domain_name = var.alb_dns_name != "" ? var.alb_dns_name : "placeholder.internal"

    vpc_origin_config {
      vpc_origin_id            = aws_cloudfront_vpc_origin.api_gateway.id
      origin_keepalive_timeout = 5
      origin_read_timeout      = 60      # 60s: covers SSE / WS upgrade handshake
    }

    response_completion_timeout = 0

    custom_header {
      # Future WAF rule: reject requests missing this header to prevent
      # ALB bypass. Store real value in SSM; inject via TF_VAR_cf_origin_secret.
      name  = "X-Origin-Verify"
      value = var.cf_origin_secret
    }
  }

  default_cache_behavior {
    target_origin_id = "${local.name}-alb"

    # All HTTP methods: REST endpoints + WebSocket (needs DELETE/PATCH/POST etc.)
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    viewer_protocol_policy = "redirect-to-https"
    compress               = false       # JSON/binary; skip edge compression

    # CachingDisabled: every request forwarded to origin, 0-TTL.
    cache_policy_id = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"

    # AllViewerExceptHostHeader: forwards Authorization, Origin, Cookie, and
    # WebSocket Upgrade/Connection headers. Strips Host to avoid ALB 400.
    origin_request_policy_id = "b689b0a8-53d0-40ab-baf2-68738e2966ac"
  }

  # Default *.cloudfront.net certificate — no ACM cert needed.
  viewer_certificate {
    cloudfront_default_certificate = true
  }

  restrictions {
    geo_restriction { restriction_type = "none" }
  }

  depends_on = [aws_cloudfront_vpc_origin.api_gateway]
  tags       = { Name = "${local.name}-api-gateway" }
}

# ── ALB SG ingress: swap internet HTTPS → VPC-only HTTP ──────────────────────
# PAIRED CHANGE: aws_vpc_security_group_ingress_rule.https (port 443 /
# 0.0.0.0/0) is REMOVED from network.tf below and replaced by this rule.
# Restrict origin access to the service-managed SG attached to CloudFront's
# VPC-origin ENIs.
resource "aws_vpc_security_group_ingress_rule" "http_vpc_origin" {
  security_group_id            = aws_security_group.alb.id
  referenced_security_group_id = data.aws_security_group.cloudfront_vpc_origin_service.id
  ip_protocol                  = "tcp"
  from_port                    = 80
  to_port                      = 80
  description                  = "HTTP:80 from CloudFront VPC Origin service SG"
}

# ── Outputs ───────────────────────────────────────────────────────────────────
output "cloudfront_domain" {
  value       = aws_cloudfront_distribution.api_gateway.domain_name
  description = "CloudFront domain — set on Vercel as NEXT_PUBLIC_API_URL (prefix https://)."
}

output "api_base_url" {
  value       = "https://${aws_cloudfront_distribution.api_gateway.domain_name}"
  description = "Full API base URL for Vercel NEXT_PUBLIC_API_URL."
}

output "ws_base_url" {
  value       = "wss://${aws_cloudfront_distribution.api_gateway.domain_name}"
  description = "WebSocket base URL for Vercel NEXT_PUBLIC_WS_URL."
}
