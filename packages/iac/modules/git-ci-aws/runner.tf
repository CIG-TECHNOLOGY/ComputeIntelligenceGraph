# On-demand Forgejo Actions runner.
#
# Design (lean v1 — see docs/git-ci-outage-runbook.md "Deferred / out of
# scope"): the instance is provisioned STOPPED via aws_ec2_instance_state
# (Terraform-native — no Lambda/EventBridge needed). A CIG operator starts it
# manually for a dry-run or a real GitHub outage (`pnpm git-ci:runner:start`).
# It self-stops after 15 idle minutes via a systemd timer that calls
# `shutdown -h now` on the instance itself — EC2's default
# InstanceInitiatedShutdownBehavior is "stop" (not terminate), so this needs
# zero AWS API calls or IAM permissions to return to the stopped state.

locals {
  runner_user_data = templatefile("${path.module}/runner_user_data.sh.tftpl", {
    region                 = var.region
    domain                 = var.domain
    forgejo_runner_version = var.forgejo_runner_version
    infisical_token        = var.infisical_token
    infisical_url          = var.infisical_url
    infisical_project_id   = var.infisical_project_id
  })
}

resource "aws_security_group" "runner" {
  name        = "${local.name_prefix}-runner-sg"
  description = "Forgejo runner: outbound only - polls the Forgejo host and calls the GitHub API, never serves inbound traffic"
  vpc_id      = data.aws_vpc.default.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, { Name = "${local.name_prefix}-runner-sg" })
}

resource "aws_security_group_rule" "runner_ssh" {
  count             = var.ssh_public_key != "" ? 1 : 0
  type              = "ingress"
  from_port         = 22
  to_port           = 22
  protocol          = "tcp"
  security_group_id = aws_security_group.runner.id
  cidr_blocks       = ["0.0.0.0/0"]
  description       = "SSH"
}

resource "aws_iam_role" "runner" {
  name = "${local.name_prefix}-runner-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "runner_ssm" {
  role       = aws_iam_role.runner.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "runner" {
  name = "${local.name_prefix}-runner-profile"
  role = aws_iam_role.runner.name

  tags = local.common_tags
}

resource "aws_instance" "runner" {
  ami                    = data.aws_ami.amazon_linux_2023.id
  instance_type          = var.runner_instance_type
  subnet_id              = data.aws_subnet.first.id
  vpc_security_group_ids = [aws_security_group.runner.id]
  iam_instance_profile   = aws_iam_instance_profile.runner.name
  key_name               = var.ssh_public_key != "" ? aws_key_pair.host[0].key_name : null

  user_data                   = local.runner_user_data
  user_data_replace_on_change = false

  root_block_device {
    volume_type           = "gp3"
    volume_size           = var.runner_root_volume_size_gb
    delete_on_termination = true
    encrypted             = true

    tags = merge(local.common_tags, { Name = "${local.name_prefix}-runner-root" })
  }

  tags = merge(local.common_tags, { Name = "${local.name_prefix}-runner" })

  lifecycle {
    ignore_changes = [ami, user_data]
  }
}

# On-demand: NOT forced stopped by Terraform. aws_ec2_instance_state would
# race against user_data completion (Terraform issues the stop as soon as
# EC2 reports "running", which happens well before cloud-init finishes
# installing Docker/SSM/forgejo-runner, interrupting first boot in a way
# that can't be re-run since cloud-init only executes user_data once per
# instance). Instead, first boot completes fully, then
# git-ci-runner-idle-stop.timer (in runner_user_data.sh.tftpl) self-stops
# the instance after 15 idle minutes with zero AWS API calls needed.
