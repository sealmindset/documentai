# ============================================================
# ECS Fargate — Serverless Container
# ============================================================

resource "aws_cloudwatch_log_group" "app" {
  name              = "/ecs/${local.prefix}"
  retention_in_days = 14
  tags              = local.tags
}

resource "aws_ecs_cluster" "main" {
  name = "${local.prefix}-cluster"
  tags = local.tags
}

resource "aws_ecs_task_definition" "app" {
  family                   = "${local.prefix}-app"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.container_cpu
  memory                   = var.container_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name  = "docai"
    image = "${aws_ecr_repository.app.repository_url}:${var.container_image_tag}"

    portMappings = [{
      containerPort = 3000
      protocol      = "tcp"
    }]

    environment = [
      { name = "NODE_ENV", value = "production" },
      { name = "PORT", value = "3000" },
      { name = "HOSTNAME", value = "0.0.0.0" },
      { name = "DATABASE_URL", value = "postgresql://docai_admin:${var.db_password}@${aws_db_instance.main.address}:5432/docai_db" },
      { name = "NEXTAUTH_URL", value = "http://${aws_lb.main.dns_name}" },
      { name = "OIDC_ISSUER_URL", value = var.oidc_issuer_url },
      { name = "OIDC_CLIENT_ID", value = var.oidc_client_id },
      { name = "OIDC_CLIENT_SECRET", value = var.oidc_client_secret },
      { name = "JWT_SECRET", value = var.jwt_secret },
      { name = "AI_PROVIDER", value = "claude" },
      { name = "ANTHROPIC_API_KEY", value = var.anthropic_api_key },
      { name = "ENFORCE_SECRETS", value = "true" },
      { name = "S3_DOCUMENTS_BUCKET", value = aws_s3_bucket.documents.id },
      { name = "AWS_REGION", value = var.aws_region },
      { name = "M365_TENANT_ID", value = var.m365_tenant_id },
      { name = "M365_SENDER_EMAIL", value = var.m365_sender_email },
      { name = "DB_HOST", value = aws_db_instance.main.address },
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.app.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "ecs"
      }
    }

    healthCheck = {
      command     = ["CMD-SHELL", "node -e \"const http=require('http');http.get('http://127.0.0.1:3000',r=>{process.exit(r.statusCode<500?0:1)}).on('error',()=>process.exit(1))\""]
      interval    = 30
      timeout     = 10
      retries     = 3
      startPeriod = 60
    }
  }])

  tags = local.tags
}

resource "aws_ecs_service" "app" {
  name            = "${local.prefix}-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.public[*].id
    security_groups  = [aws_security_group.app.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = "docai"
    container_port   = 3000
  }

  depends_on = [aws_lb_listener.http]

  tags = local.tags
}
