# ============================================================
# SplashDown — Document Portal (isolated from DocAI deploys)
# ============================================================
# Shares: VPC, ALB, S3 bucket, IAM roles, ECS cluster
# Independent: ECR repo, ECS task/service, deploy pipeline

resource "aws_ecr_repository" "splashdown" {
  name                 = "${local.prefix}-splashdown"
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = local.tags
}

resource "aws_ecr_lifecycle_policy" "splashdown" {
  repository = aws_ecr_repository.splashdown.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 5 images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 5
      }
      action = {
        type = "expire"
      }
    }]
  })
}

resource "aws_cloudwatch_log_group" "splashdown" {
  name              = "/ecs/${local.prefix}-splashdown"
  retention_in_days = 14
  tags              = local.tags
}

resource "aws_ecs_task_definition" "splashdown" {
  family                   = "${local.prefix}-splashdown"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name  = "splashdown"
    image = "${aws_ecr_repository.splashdown.repository_url}:${var.container_image_tag}"

    portMappings = [{
      containerPort = 3000
      protocol      = "tcp"
    }]

    environment = [
      { name = "NODE_ENV", value = "production" },
      { name = "PORT", value = "3000" },
      { name = "BASE_URL", value = "http://${aws_lb.main.dns_name}" },
      { name = "OIDC_ISSUER_URL", value = var.oidc_issuer_url },
      { name = "OIDC_CLIENT_ID", value = var.oidc_client_id },
      { name = "OIDC_CLIENT_SECRET", value = var.oidc_client_secret },
      { name = "SESSION_SECRET", value = var.splashdown_session_secret },
      { name = "S3_DOCUMENTS_BUCKET", value = aws_s3_bucket.documents.id },
      { name = "AWS_REGION", value = var.aws_region },
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.splashdown.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "ecs"
      }
    }

    healthCheck = {
      command     = ["CMD-SHELL", "node -e \"const http=require('http');http.get('http://127.0.0.1:3000/health',r=>{process.exit(r.statusCode===200?0:1)}).on('error',()=>process.exit(1))\""]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 15
    }
  }])

  tags = local.tags
}

resource "aws_ecs_service" "splashdown" {
  name            = "${local.prefix}-splashdown"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.splashdown.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.public[*].id
    security_groups  = [aws_security_group.app.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.splashdown.arn
    container_name   = "splashdown"
    container_port   = 3000
  }

  depends_on = [aws_lb_listener_rule.splashdown]

  tags = local.tags
}

# ALB target group for SplashDown
resource "aws_lb_target_group" "splashdown" {
  name        = "${local.prefix}-splash-tg"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    path                = "/health"
    port                = "traffic-port"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200"
  }

  tags = local.tags
}

# ALB path rule: /portal* → SplashDown (priority 100, checked before default)
resource "aws_lb_listener_rule" "splashdown" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.splashdown.arn
  }

  condition {
    path_pattern {
      values = ["/portal", "/portal/*"]
    }
  }
}
