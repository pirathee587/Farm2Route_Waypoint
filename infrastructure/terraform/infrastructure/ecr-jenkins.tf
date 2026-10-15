resource "aws_ecr_repository" "service" {
  for_each             = local.services
  name                 = "${local.name}/${each.key}"
  image_tag_mutability = "IMMUTABLE"
  force_delete         = false
  image_scanning_configuration { scan_on_push = true }
  encryption_configuration { encryption_type = "AES256" }
}
# No automatic image expiration: retain rollback SHAs until an explicit retention policy is reviewed.
resource "aws_iam_role" "jenkins" {
  name               = "${local.name}-delivery"
  assume_role_policy = jsonencode({ Version = "2012-10-17", Statement = [{ Effect = "Allow", Principal = { AWS = local.runner_trusted_role_arn }, Action = "sts:AssumeRole" }] })
}
resource "aws_iam_role_policy" "jenkins" {
  role = aws_iam_role.jenkins.id
  policy = jsonencode({ Version = "2012-10-17", Statement = [
    { Effect = "Allow", Action = ["ecr:GetAuthorizationToken"], Resource = "*" },
    { Effect = "Allow", Action = ["ecr:BatchCheckLayerAvailability", "ecr:InitiateLayerUpload", "ecr:UploadLayerPart", "ecr:CompleteLayerUpload", "ecr:PutImage", "ecr:BatchGetImage", "ecr:GetDownloadUrlForLayer", "ecr:DescribeImages"], Resource = [for r in aws_ecr_repository.service : r.arn] },
    { Effect = "Allow", Action = ["eks:DescribeCluster"], Resource = aws_eks_cluster.waypoint.arn }
  ] })
}
resource "aws_eks_access_entry" "jenkins" {
  cluster_name      = aws_eks_cluster.waypoint.name
  principal_arn     = aws_iam_role.jenkins.arn
  kubernetes_groups = ["waypoint-delivery"]
  type              = "STANDARD"
}
output "cluster_name" { value = aws_eks_cluster.waypoint.name }
output "vpc_id" { value = aws_vpc.waypoint.id }
output "alb_security_group_id" { value = aws_security_group.alb.id }
output "private_subnet_ids" { value = [for s in aws_subnet.private : s.id] }
output "public_subnet_ids" { value = [for s in aws_subnet.public : s.id] }
output "ecr_repositories" { value = { for k, r in aws_ecr_repository.service : k => r.repository_url } }
output "delivery_role_arn" { value = aws_iam_role.jenkins.arn }
