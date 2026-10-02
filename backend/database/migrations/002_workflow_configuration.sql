-- Pilarweb migration 002: workflow configuration and approval rules

USE pilarweb;

CREATE TABLE IF NOT EXISTS workflow_definitions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(80) NOT NULL,
  name VARCHAR(150) NOT NULL,
  version INT NOT NULL DEFAULT 1,
  description VARCHAR(500) DEFAULT NULL,
  requires_return TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_workflow_definitions_code_version (code, version),
  KEY idx_workflow_definitions_active (is_active)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS workflow_steps (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  workflow_definition_id BIGINT UNSIGNED NOT NULL,
  step_order INT NOT NULL,
  step_code VARCHAR(80) NOT NULL,
  step_name VARCHAR(150) NOT NULL,
  step_type VARCHAR(80) NOT NULL,
  is_required TINYINT(1) NOT NULL DEFAULT 1,
  config_json LONGTEXT DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_workflow_steps_order (workflow_definition_id, step_order),
  UNIQUE KEY uq_workflow_steps_code (workflow_definition_id, step_code),
  KEY idx_workflow_steps_definition (workflow_definition_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS request_purpose_workflows (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  request_purpose_id BIGINT UNSIGNED NOT NULL,
  workflow_definition_id BIGINT UNSIGNED NOT NULL,
  effective_from DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  effective_to DATETIME DEFAULT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_by_user_id VARCHAR(36) DEFAULT NULL,
  created_by_name VARCHAR(255) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_purpose_workflows_lookup (request_purpose_id, is_active, effective_from, effective_to),
  KEY idx_purpose_workflows_definition (workflow_definition_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS approval_rules (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(100) NOT NULL,
  name VARCHAR(150) NOT NULL,
  department_id INT DEFAULT NULL,
  department_name VARCHAR(255) DEFAULT NULL,
  requester_block_min_job_level_value INT DEFAULT NULL,
  approver_min_job_level_value INT DEFAULT NULL,
  approver_job_level_name VARCHAR(150) DEFAULT NULL,
  allow_higher_job_level TINYINT(1) NOT NULL DEFAULT 1,
  priority INT NOT NULL DEFAULT 100,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_approval_rules_code (code),
  KEY idx_approval_rules_department (department_id, is_active, priority)
) ENGINE=InnoDB;
