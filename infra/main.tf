# ============================================================
# Document AI Platform -- Azure Infrastructure
# ============================================================
# This Terraform configuration provisions the core Azure
# resources needed to run Document AI Platform in production.
#
# Prerequisites:
#   - Azure subscription with Contributor access
#   - Terraform >= 1.5
#   - az login completed
#
# Usage:
#   cd infra
#   terraform init
#   terraform plan -var-file=prod.tfvars
#   terraform apply -var-file=prod.tfvars
# ============================================================

terraform {
  required_version = ">= 1.5"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.100"
    }
  }

  # Uncomment for remote state
  # backend "azurerm" {
  #   resource_group_name  = "rg-docai-tfstate"
  #   storage_account_name = "stdocaitfstate"
  #   container_name       = "tfstate"
  #   key                  = "docai.tfstate"
  # }
}

provider "azurerm" {
  features {}
}

# ============================================================
# Variables
# ============================================================

variable "project" {
  type    = string
  default = "docai"
}

variable "environment" {
  type    = string
  default = "prod"
}

variable "location" {
  type    = string
  default = "East US 2"
}

variable "db_admin_password" {
  type      = string
  sensitive = true
}

variable "oidc_issuer_url" {
  type = string
}

variable "oidc_client_id" {
  type = string
}

variable "oidc_client_secret" {
  type      = string
  sensitive = true
}

variable "jwt_secret" {
  type      = string
  sensitive = true
}

variable "container_image" {
  type    = string
  default = ""
}

locals {
  prefix = "${var.project}-${var.environment}"
  tags = {
    project     = var.project
    environment = var.environment
    managed_by  = "terraform"
  }
}

# ============================================================
# Resource Group
# ============================================================

resource "azurerm_resource_group" "main" {
  name     = "rg-${local.prefix}"
  location = var.location
  tags     = local.tags
}

# ============================================================
# PostgreSQL Flexible Server
# ============================================================

resource "azurerm_postgresql_flexible_server" "main" {
  name                          = "psql-${local.prefix}"
  resource_group_name           = azurerm_resource_group.main.name
  location                      = azurerm_resource_group.main.location
  version                       = "16"
  administrator_login           = "docai_admin"
  administrator_password        = var.db_admin_password
  storage_mb                    = 32768
  sku_name                      = "B_Standard_B1ms"
  backup_retention_days         = 7
  geo_redundant_backup_enabled  = false
  public_network_access_enabled = true # Set false when using VNet

  tags = local.tags
}

resource "azurerm_postgresql_flexible_server_database" "main" {
  name      = "docai_db"
  server_id = azurerm_postgresql_flexible_server.main.id
  charset   = "UTF8"
  collation = "en_US.utf8"
}

# Allow Azure services to connect
resource "azurerm_postgresql_flexible_server_firewall_rule" "azure_services" {
  name             = "AllowAzureServices"
  server_id        = azurerm_postgresql_flexible_server.main.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}

# ============================================================
# Key Vault (secrets management)
# ============================================================

data "azurerm_client_config" "current" {}

resource "azurerm_key_vault" "main" {
  name                       = "kv-${local.prefix}"
  location                   = azurerm_resource_group.main.location
  resource_group_name        = azurerm_resource_group.main.name
  tenant_id                  = data.azurerm_client_config.current.tenant_id
  sku_name                   = "standard"
  soft_delete_retention_days = 7
  purge_protection_enabled   = false

  access_policy {
    tenant_id = data.azurerm_client_config.current.tenant_id
    object_id = data.azurerm_client_config.current.object_id

    secret_permissions = ["Get", "List", "Set", "Delete", "Purge"]
  }

  tags = local.tags
}

resource "azurerm_key_vault_secret" "db_password" {
  name         = "db-admin-password"
  value        = var.db_admin_password
  key_vault_id = azurerm_key_vault.main.id
}

resource "azurerm_key_vault_secret" "jwt_secret" {
  name         = "jwt-secret"
  value        = var.jwt_secret
  key_vault_id = azurerm_key_vault.main.id
}

resource "azurerm_key_vault_secret" "oidc_client_secret" {
  name         = "oidc-client-secret"
  value        = var.oidc_client_secret
  key_vault_id = azurerm_key_vault.main.id
}

# ============================================================
# Container Registry
# ============================================================

resource "azurerm_container_registry" "main" {
  name                = "cr${replace(local.prefix, "-", "")}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  sku                 = "Basic"
  admin_enabled       = true

  tags = local.tags
}

# ============================================================
# App Service (Container)
# ============================================================

resource "azurerm_service_plan" "main" {
  name                = "asp-${local.prefix}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  os_type             = "Linux"
  sku_name            = "B2"

  tags = local.tags
}

resource "azurerm_linux_web_app" "main" {
  name                = "app-${local.prefix}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  service_plan_id     = azurerm_service_plan.main.id

  site_config {
    always_on = true

    application_stack {
      docker_registry_url      = "https://${azurerm_container_registry.main.login_server}"
      docker_registry_username = azurerm_container_registry.main.admin_username
      docker_registry_password = azurerm_container_registry.main.admin_password
      docker_image_name        = var.container_image != "" ? var.container_image : "${azurerm_container_registry.main.login_server}/${var.project}:latest"
    }
  }

  app_settings = {
    DATABASE_URL       = "postgresql://docai_admin:${var.db_admin_password}@${azurerm_postgresql_flexible_server.main.fqdn}:5432/docai_db?sslmode=require"
    NEXTAUTH_URL       = "https://app-${local.prefix}.azurewebsites.net"
    NODE_ENV           = "production"
    OIDC_ISSUER_URL    = var.oidc_issuer_url
    OIDC_CLIENT_ID     = var.oidc_client_id
    OIDC_CLIENT_SECRET = var.oidc_client_secret
    JWT_SECRET         = var.jwt_secret
    AI_PROVIDER        = "anthropic_foundry"
  }

  tags = local.tags
}

# ============================================================
# Outputs
# ============================================================

output "app_url" {
  value = "https://${azurerm_linux_web_app.main.default_hostname}"
}

output "database_host" {
  value = azurerm_postgresql_flexible_server.main.fqdn
}

output "container_registry" {
  value = azurerm_container_registry.main.login_server
}

output "key_vault_name" {
  value = azurerm_key_vault.main.name
}
