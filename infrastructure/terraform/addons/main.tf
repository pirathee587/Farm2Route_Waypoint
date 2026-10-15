terraform {
  required_version = ">= 1.10.0, < 2.0.0"
  backend "s3" {}
  required_providers {
    aws  = { source = "hashicorp/aws", version = "= 6.16.0" }
    helm = { source = "hashicorp/helm", version = "= 2.17.0" }
  }
}
variable "region" { default = "ap-southeast-1" }
variable "cluster_name" { type = string }
variable "vpc_id" { type = string }
provider "aws" { region = var.region }
data "aws_eks_cluster" "target" { name = var.cluster_name }
provider "helm" {
  kubernetes {
    host                   = data.aws_eks_cluster.target.endpoint
    cluster_ca_certificate = base64decode(data.aws_eks_cluster.target.certificate_authority[0].data)
    exec {
      api_version = "client.authentication.k8s.io/v1beta1"
      command     = "aws"
      args        = ["eks", "get-token", "--cluster-name", var.cluster_name, "--region", var.region]
    }
  }
}
resource "aws_iam_role" "alb" {
  name               = "${var.cluster_name}-alb-controller"
  assume_role_policy = jsonencode({ Version = "2012-10-17", Statement = [{ Effect = "Allow", Principal = { Service = "pods.eks.amazonaws.com" }, Action = ["sts:AssumeRole", "sts:TagSession"], Condition = { StringEquals = { "aws:RequestTag/eks-cluster-name" = var.cluster_name, "aws:RequestTag/kubernetes-namespace" = "kube-system", "aws:RequestTag/kubernetes-service-account" = "aws-load-balancer-controller" } } }] })
  tags               = { Project = "Waypoint", ManagedBy = "Terraform" }
}
# Upstream v2.14.1 controller policy: tag-constrained writes; describe APIs require '*'.
resource "aws_iam_role_policy" "alb" {
  role   = aws_iam_role.alb.id
  policy = file("${path.module}/alb-iam-policy.json")
}
resource "aws_eks_pod_identity_association" "alb" {
  cluster_name    = var.cluster_name
  namespace       = "kube-system"
  service_account = "aws-load-balancer-controller"
  role_arn        = aws_iam_role.alb.arn
}
resource "helm_release" "alb" {
  name       = "aws-load-balancer-controller"
  repository = "https://aws.github.io/eks-charts"
  chart      = "aws-load-balancer-controller"
  version    = "1.14.0"
  namespace  = "kube-system"
  atomic     = true
  timeout    = 600
  values     = [yamlencode({ clusterName = var.cluster_name, region = var.region, vpcId = var.vpc_id, replicaCount = 2, image = { tag = "v2.14.1" }, serviceAccount = { create = true, name = "aws-load-balancer-controller" } })]
  depends_on = [aws_eks_pod_identity_association.alb, aws_iam_role_policy.alb]
}
