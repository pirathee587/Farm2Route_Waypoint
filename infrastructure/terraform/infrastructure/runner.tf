# Private Jenkins / management runner.
# - Private subnet A, no public IP, no inbound rules (existing runner SG). Access is SSM only.
# - Jenkins listens on 127.0.0.1:8080; reach it with an SSM port-forward session.
# - Instance role: SSM core + permission to assume the restricted delivery role, nothing else.
#   The runner can reach the private EKS endpoint (runner_api rule in network.tf).

variable "create_runner" {
  type        = bool
  default     = true
  description = "Create the private Jenkins runner EC2 host. When false, jenkins_trusted_role_arn must name an existing runner role."
}
variable "runner_instance_type" {
  type        = string
  default     = "t3.medium"
  description = "Budgeted in COSTS.md. Jenkins plus Maven/.NET/Docker builds on 4 GiB is tight; t3.large is the next step if builds are memory-bound."
}
variable "runner_root_volume_gb" {
  type    = number
  default = 50
}

data "aws_ssm_parameter" "al2023" {
  name = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64"
}

resource "aws_iam_role" "runner" {
  count              = var.create_runner ? 1 : 0
  name               = "${local.name}-runner"
  assume_role_policy = jsonencode({ Version = "2012-10-17", Statement = [{ Effect = "Allow", Principal = { Service = "ec2.amazonaws.com" }, Action = "sts:AssumeRole" }] })
}
resource "aws_iam_role_policy_attachment" "runner_ssm" {
  count      = var.create_runner ? 1 : 0
  role       = aws_iam_role.runner[0].name
  policy_arn = "arn:${data.aws_partition.current.partition}:iam::aws:policy/AmazonSSMManagedInstanceCore"
}
resource "aws_iam_role_policy" "runner_assume_delivery" {
  count = var.create_runner ? 1 : 0
  role  = aws_iam_role.runner[0].id
  policy = jsonencode({ Version = "2012-10-17", Statement = [
    { Effect = "Allow", Action = "sts:AssumeRole", Resource = aws_iam_role.jenkins.arn }
  ] })
}
resource "aws_iam_instance_profile" "runner" {
  count = var.create_runner ? 1 : 0
  name  = "${local.name}-runner"
  role  = aws_iam_role.runner[0].name
}

resource "aws_instance" "runner" {
  count                       = var.create_runner ? 1 : 0
  ami                         = data.aws_ssm_parameter.al2023.value
  instance_type               = var.runner_instance_type
  subnet_id                   = aws_subnet.private["0"].id
  vpc_security_group_ids      = [aws_security_group.runner.id]
  iam_instance_profile        = aws_iam_instance_profile.runner[0].name
  associate_public_ip_address = false
  user_data_replace_on_change = false
  user_data = templatefile("${path.module}/runner-user-data.sh.tftpl", {
    kubectl_minor = var.eks_version
    go_version    = "1.25.3"
  })

  metadata_options {
    http_tokens                 = "required" # IMDSv2 only
    http_put_response_hop_limit = 1          # containers on the host cannot reach instance credentials
    http_endpoint               = "enabled"
  }
  root_block_device {
    volume_type           = "gp3"
    volume_size           = var.runner_root_volume_gb
    encrypted             = true
    delete_on_termination = true
  }
  monitoring = false
  tags       = { Name = "${local.name}-runner", Role = "jenkins-private-runner" }

  lifecycle {
    # A newer AL2023 AMI must not silently replace the host (and its Jenkins home).
    ignore_changes = [ami, user_data]
  }
  depends_on = [aws_route.egress, aws_iam_role_policy_attachment.runner_ssm]
}

output "runner_instance_id" { value = var.create_runner ? aws_instance.runner[0].id : null }
output "runner_role_arn" { value = var.create_runner ? aws_iam_role.runner[0].arn : var.jenkins_trusted_role_arn }
output "jenkins_port_forward_command" {
  value = var.create_runner ? "aws ssm start-session --region ${var.region} --target ${aws_instance.runner[0].id} --document-name AWS-StartPortForwardingSession --parameters portNumber=8080,localPortNumber=8080" : null
}
