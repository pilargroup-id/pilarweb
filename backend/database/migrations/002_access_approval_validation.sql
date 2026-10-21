-- Pilarweb 002: access, approval, validation policy
USE pilarweb;

CREATE TABLE IF NOT EXISTS module_access_rules (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  module_code VARCHAR(80) NOT NULL,
  user_id VARCHAR(36) DEFAULT NULL,
  name VARCHAR(255) DEFAULT NULL COMMENT 'Human-readable person name for user-specific access rows',
  department_id INT DEFAULT NULL,
  company_id VARCHAR(100) DEFAULT NULL,
  min_job_level_value DECIMAL(10,2) DEFAULT NULL,
  max_job_level_value DECIMAL(10,2) DEFAULT NULL,
  priority INT NOT NULL DEFAULT 100,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_by_user_id VARCHAR(36) DEFAULT NULL,
  created_by_name VARCHAR(255) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_module_access_rules_lookup (module_code, is_active, priority),
  KEY idx_module_access_rules_user (user_id, is_active),
  KEY idx_module_access_rules_department (department_id, is_active)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS approval_rules (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(100) NOT NULL,
  name VARCHAR(150) NOT NULL,
  department_id INT DEFAULT NULL,
  department_name VARCHAR(255) DEFAULT NULL,
  requester_block_min_job_level_value INT DEFAULT NULL,
  approver_min_job_level_value INT NOT NULL,
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

CREATE TABLE IF NOT EXISTS validation_override_users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_by_user_id VARCHAR(36) DEFAULT NULL,
  created_by_name VARCHAR(255) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_validation_override_users_user (user_id),
  KEY idx_validation_override_users_active (is_active)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS validation_rules (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(80) NOT NULL,
  name VARCHAR(150) NOT NULL,
  description VARCHAR(500) DEFAULT NULL,
  block_scope ENUM('NONE','USER','DEPARTMENT') NOT NULL DEFAULT 'NONE',
  is_blocking TINYINT(1) NOT NULL DEFAULT 0,
  allow_override TINYINT(1) NOT NULL DEFAULT 1,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_validation_rules_code (code),
  KEY idx_validation_rules_active (is_active, is_blocking)
) ENGINE=InnoDB;
