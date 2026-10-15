resource "aws_vpc" "waypoint" {
  lifecycle {
    precondition {
      condition = alltrue([for c in var.known_network_cidrs :
        cidrhost("${cidrhost(var.vpc_cidr, 0)}/${min(tonumber(split("/", var.vpc_cidr)[1]), tonumber(split("/", c)[1]))}", 0) !=
        cidrhost("${cidrhost(c, 0)}/${min(tonumber(split("/", var.vpc_cidr)[1]), tonumber(split("/", c)[1]))}", 0)
      ])
      error_message = "Waypoint VPC overlaps a declared known network."
    }
  }
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags                 = { Name = local.name }
}
resource "aws_subnet" "public" {
  for_each                = local.zones
  vpc_id                  = aws_vpc.waypoint.id
  availability_zone_id    = each.value
  cidr_block              = cidrsubnet(var.vpc_cidr, 8, tonumber(each.key))
  map_public_ip_on_launch = false
  tags                    = { Name = "${local.name}-public-${each.key}", "kubernetes.io/role/elb" = "1" }
}
resource "aws_subnet" "private" {
  for_each                = local.zones
  vpc_id                  = aws_vpc.waypoint.id
  availability_zone_id    = each.value
  cidr_block              = cidrsubnet(var.vpc_cidr, 4, tonumber(each.key) + 1)
  map_public_ip_on_launch = false
  tags                    = { Name = "${local.name}-private-${each.key}", "kubernetes.io/role/internal-elb" = "1" }
}
resource "aws_internet_gateway" "waypoint" { vpc_id = aws_vpc.waypoint.id }
resource "aws_route_table" "public" { vpc_id = aws_vpc.waypoint.id }
resource "aws_route" "internet" {
  route_table_id         = aws_route_table.public.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.waypoint.id
}
resource "aws_route_table_association" "public" {
  for_each       = local.zones
  subnet_id      = aws_subnet.public[each.key].id
  route_table_id = aws_route_table.public.id
}
resource "aws_eip" "nat" {
  for_each = var.nat_per_az ? local.zones : { "0" = var.az_ids[0] }
  domain   = "vpc"
}
resource "aws_nat_gateway" "waypoint" {
  for_each      = aws_eip.nat
  allocation_id = each.value.id
  subnet_id     = aws_subnet.public[each.key].id
  depends_on    = [aws_internet_gateway.waypoint]
}
resource "aws_route_table" "private" {
  for_each = local.zones
  vpc_id   = aws_vpc.waypoint.id
}
resource "aws_route" "egress" {
  for_each               = local.zones
  route_table_id         = aws_route_table.private[each.key].id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = aws_nat_gateway.waypoint[var.nat_per_az ? each.key : "0"].id
}
resource "aws_route_table_association" "private" {
  for_each       = local.zones
  subnet_id      = aws_subnet.private[each.key].id
  route_table_id = aws_route_table.private[each.key].id
}
resource "aws_vpc_endpoint" "s3" {
  vpc_id            = aws_vpc.waypoint.id
  service_name      = "com.amazonaws.${var.region}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = [for r in aws_route_table.private : r.id]
}
resource "aws_security_group" "alb" {
  name        = "${local.name}-alb"
  description = "Public HTTPS only; application ingress"
  vpc_id      = aws_vpc.waypoint.id
}
# ⚠️  Phase 7b: aws_vpc_security_group_ingress_rule.https (port 443 / 0.0.0.0/0)
# was here and is intentionally REMOVED. The ALB is now internal-only.
# CloudFront terminates TLS at the edge; HTTP:80 from VPC CIDR rule is in
# cloudfront.tf → aws_vpc_security_group_ingress_rule.http_vpc_origin.
resource "aws_vpc_security_group_egress_rule" "alb" {
  security_group_id            = aws_security_group.alb.id
  referenced_security_group_id = aws_eks_cluster.waypoint.vpc_config[0].cluster_security_group_id
  ip_protocol                  = "tcp"
  from_port                    = 8080
  to_port                      = 8080
}
resource "aws_vpc_security_group_ingress_rule" "gateway" {
  security_group_id            = aws_eks_cluster.waypoint.vpc_config[0].cluster_security_group_id
  referenced_security_group_id = aws_security_group.alb.id
  ip_protocol                  = "tcp"
  from_port                    = 8080
  to_port                      = 8080
}
# EKS owns its cluster SG; managed nodes inherit it. No SSH/RDP rules.

resource "aws_security_group" "runner" {
  name        = "${local.name}-management-runner"
  description = "Reserved for separate private Jenkins and administration host; no inbound access"
  vpc_id      = aws_vpc.waypoint.id
}
resource "aws_vpc_security_group_egress_rule" "runner_https" {
  security_group_id = aws_security_group.runner.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "tcp"
  from_port         = 443
  to_port           = 443
}
resource "aws_vpc_security_group_ingress_rule" "runner_api" {
  security_group_id            = aws_eks_cluster.waypoint.vpc_config[0].cluster_security_group_id
  referenced_security_group_id = aws_security_group.runner.id
  ip_protocol                  = "tcp"
  from_port                    = 443
  to_port                      = 443
}
output "runner_security_group_id" { value = aws_security_group.runner.id }
