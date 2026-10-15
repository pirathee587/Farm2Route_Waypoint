variable "vpc_cidr" {
  default = "10.20.0.0/16"
  validation {
    condition     = can(cidrnetmask(var.vpc_cidr)) && endswith(var.vpc_cidr, "/16")
    error_message = "Supply an IPv4 /16; review network-policy CIDRs when changing it."
  }
}
variable "known_network_cidrs" {
  type        = list(string)
  default     = ["10.0.0.0/16", "172.31.0.0/16"]
  description = "Known Singapore ranges only; reconcile other regions, VPNs, on-premises and future peerings before approval."
}
variable "az_ids" {
  type    = list(string)
  default = ["apse1-az2", "apse1-az1"]
  validation {
    condition     = length(var.az_ids) == 2 && length(distinct(var.az_ids)) == 2
    error_message = "Exactly two distinct AZ IDs are required."
  }
}
variable "eks_version" { type = string }
variable "node_instance_types" { default = ["t3.medium"] }
variable "node_min" { default = 2 }
variable "node_desired" { default = 2 }
variable "node_max" { default = 3 }
variable "nat_per_az" { default = false }
variable "admin_role_arn" { type = string }
variable "jenkins_trusted_role_arn" {
  type        = string
  default     = ""
  description = "Existing, separately managed private runner role allowed to assume the application delivery role. Optional when create_runner is true."
}
variable "addon_versions" {
  type        = map(string)
  description = "Explicit compatible versions: vpc-cni, kube-proxy, coredns, eks-pod-identity-agent, aws-ebs-csi-driver."
  validation {
    condition     = alltrue([for k in ["vpc-cni", "kube-proxy", "coredns", "eks-pod-identity-agent", "aws-ebs-csi-driver"] : contains(keys(var.addon_versions), k)])
    error_message = "Supply all five pinned add-on versions."
  }
}
locals {
  name                    = "waypoint-${var.environment}"
  services                = toset(["api-gateway", "auth-service", "order-service", "planning-service", "loading-delivery-service", "notification-service"])
  zones                   = { for i, az in var.az_ids : tostring(i) => az }
  runner_trusted_role_arn = var.create_runner ? aws_iam_role.runner[0].arn : var.jenkins_trusted_role_arn
}
data "aws_partition" "current" {}
