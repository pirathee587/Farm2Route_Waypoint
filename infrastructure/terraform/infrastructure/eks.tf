resource "aws_iam_role" "cluster" {
  name               = "${local.name}-cluster"
  assume_role_policy = jsonencode({ Version = "2012-10-17", Statement = [{ Effect = "Allow", Principal = { Service = "eks.amazonaws.com" }, Action = "sts:AssumeRole" }] })
}
resource "aws_iam_role_policy_attachment" "cluster" {
  role       = aws_iam_role.cluster.name
  policy_arn = "arn:${data.aws_partition.current.partition}:iam::aws:policy/AmazonEKSClusterPolicy"
}
resource "aws_cloudwatch_log_group" "eks" {
  name              = "/aws/eks/${local.name}/cluster"
  retention_in_days = 14
}
resource "aws_eks_cluster" "waypoint" {
  name                      = local.name
  role_arn                  = aws_iam_role.cluster.arn
  version                   = var.eks_version
  enabled_cluster_log_types = ["api", "audit", "authenticator", "controllerManager", "scheduler"]
  access_config {
    authentication_mode                         = "API"
    bootstrap_cluster_creator_admin_permissions = false
  }
  vpc_config {
    subnet_ids              = [for s in aws_subnet.private : s.id]
    endpoint_private_access = true
    endpoint_public_access  = false
  }
  depends_on = [aws_iam_role_policy_attachment.cluster, aws_cloudwatch_log_group.eks]
}
resource "aws_eks_access_entry" "admin" {
  cluster_name  = aws_eks_cluster.waypoint.name
  principal_arn = var.admin_role_arn
  type          = "STANDARD"
}
resource "aws_eks_access_policy_association" "admin" {
  cluster_name  = aws_eks_cluster.waypoint.name
  principal_arn = aws_eks_access_entry.admin.principal_arn
  policy_arn    = "arn:${data.aws_partition.current.partition}:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy"
  access_scope { type = "cluster" }
}
resource "aws_iam_role" "nodes" {
  name               = "${local.name}-nodes"
  assume_role_policy = jsonencode({ Version = "2012-10-17", Statement = [{ Effect = "Allow", Principal = { Service = "ec2.amazonaws.com" }, Action = "sts:AssumeRole" }] })
}
resource "aws_iam_role_policy_attachment" "nodes" {
  for_each   = toset(["AmazonEKSWorkerNodePolicy", "AmazonEC2ContainerRegistryPullOnly"])
  role       = aws_iam_role.nodes.name
  policy_arn = "arn:${data.aws_partition.current.partition}:iam::aws:policy/${each.value}"
}
resource "aws_launch_template" "nodes" {
  name_prefix = "${local.name}-"
  metadata_options {
    http_tokens                 = "required"
    http_put_response_hop_limit = 1
  }
  block_device_mappings {
    device_name = "/dev/xvda"
    ebs {
      volume_size           = 30
      volume_type           = "gp3"
      encrypted             = true
      delete_on_termination = true
    }
  }
}
resource "aws_eks_node_group" "apps" {
  cluster_name    = aws_eks_cluster.waypoint.name
  node_group_name = "applications"
  node_role_arn   = aws_iam_role.nodes.arn
  subnet_ids      = [for s in aws_subnet.private : s.id]
  instance_types  = var.node_instance_types
  ami_type        = "AL2023_x86_64_STANDARD"
  capacity_type   = "ON_DEMAND"
  launch_template {
    id      = aws_launch_template.nodes.id
    version = aws_launch_template.nodes.latest_version
  }
  scaling_config {
    min_size     = var.node_min
    desired_size = var.node_desired
    max_size     = var.node_max
  }
  update_config { max_unavailable = 1 }
  depends_on = [aws_iam_role_policy_attachment.nodes, aws_eks_addon.cni, aws_eks_addon.identity, aws_route.egress]
}
resource "aws_iam_role" "pods" {
  for_each           = { cni = "AmazonEKS_CNI_Policy", ebs = "AmazonEBSCSIDriverEKSClusterScopedPolicy" }
  name               = "${local.name}-${each.key}"
  tags               = { "eks-cluster-name" = local.name }
  assume_role_policy = jsonencode({ Version = "2012-10-17", Statement = [{ Effect = "Allow", Principal = { Service = "pods.eks.amazonaws.com" }, Action = ["sts:AssumeRole", "sts:TagSession"], Condition = { StringEquals = { "aws:RequestTag/eks-cluster-name" = local.name, "aws:RequestTag/kubernetes-namespace" = "kube-system", "aws:RequestTag/kubernetes-service-account" = each.key == "cni" ? "aws-node" : "ebs-csi-controller-sa" } } }] })
}
resource "aws_iam_role_policy_attachment" "pods" {
  for_each   = { cni = "AmazonEKS_CNI_Policy", ebs = "AmazonEBSCSIDriverEKSClusterScopedPolicy" }
  role       = aws_iam_role.pods[each.key].name
  policy_arn = "arn:${data.aws_partition.current.partition}:iam::aws:policy/${each.value}"
}
resource "aws_eks_addon" "identity" {
  cluster_name  = aws_eks_cluster.waypoint.name
  addon_name    = "eks-pod-identity-agent"
  addon_version = var.addon_versions["eks-pod-identity-agent"]
}
resource "aws_eks_addon" "cni" {
  cluster_name         = aws_eks_cluster.waypoint.name
  addon_name           = "vpc-cni"
  addon_version        = var.addon_versions["vpc-cni"]
  configuration_values = jsonencode({ enableNetworkPolicy = "true", env = { NETWORK_POLICY_ENFORCING_MODE = "standard" } })
  pod_identity_association {
    role_arn        = aws_iam_role.pods["cni"].arn
    service_account = "aws-node"
  }
  depends_on = [aws_iam_role_policy_attachment.pods]
}
resource "aws_eks_addon" "core" {
  for_each      = toset(["coredns", "kube-proxy"])
  cluster_name  = aws_eks_cluster.waypoint.name
  addon_name    = each.key
  addon_version = var.addon_versions[each.key]
  depends_on    = [aws_eks_node_group.apps]
}
resource "aws_eks_addon" "ebs" {
  cluster_name  = aws_eks_cluster.waypoint.name
  addon_name    = "aws-ebs-csi-driver"
  addon_version = var.addon_versions["aws-ebs-csi-driver"]
  pod_identity_association {
    role_arn        = aws_iam_role.pods["ebs"].arn
    service_account = "ebs-csi-controller-sa"
  }
  depends_on = [aws_eks_node_group.apps, aws_iam_role_policy_attachment.pods]
}
