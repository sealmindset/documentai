output "app_url" {
  value       = "http://${aws_lb.main.dns_name}"
  description = "Application URL (ALB DNS)"
}

output "ecr_repository_url" {
  value       = aws_ecr_repository.app.repository_url
  description = "ECR repository URL for Docker push"
}

output "database_endpoint" {
  value       = aws_db_instance.main.address
  description = "RDS PostgreSQL endpoint"
  sensitive   = true
}

output "s3_bucket_name" {
  value       = aws_s3_bucket.documents.id
  description = "S3 bucket for document storage"
}

output "github_actions_role_arn" {
  value       = aws_iam_role.github_actions.arn
  description = "IAM role ARN for GitHub Actions OIDC"
}

output "ecs_cluster_name" {
  value       = aws_ecs_cluster.main.name
  description = "ECS cluster name"
}

output "ecs_service_name" {
  value       = aws_ecs_service.app.name
  description = "ECS service name"
}

output "splashdown_url" {
  value       = "http://${aws_lb.main.dns_name}/portal"
  description = "SplashDown Document Portal URL"
}

output "splashdown_ecr_url" {
  value       = aws_ecr_repository.splashdown.repository_url
  description = "SplashDown ECR repository URL"
}

output "splashdown_ecs_service" {
  value       = aws_ecs_service.splashdown.name
  description = "SplashDown ECS service name"
}
