terraform {
  required_version = ">= 1.10.0, < 2.0.0"
  required_providers { aws = { source = "hashicorp/aws", version = "= 6.16.0" } }
}
provider "aws" {
  region = var.region
  default_tags { tags = { Project = "Waypoint", Environment = var.environment, Owner = var.owner, ManagedBy = "Terraform" } }
}
variable "region" { default = "ap-southeast-1" }
variable "environment" { default = "dev" }
variable "owner" { type = string }
