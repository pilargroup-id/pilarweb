-- Pilarweb 007: dynamic requester/user/department restriction + audited override
USE pilarweb;

CREATE TABLE IF NOT EXISTS validation_violations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  validation_rule_id BIGINT UNSIGNED NOT NULL,
  validation_code VARCHAR(80) NOT NULL,
  request_id VARCHAR(36) DEFAULT NULL,
  return_id BIGINT UNSIGNED DEFAULT NULL,
  user_id VARCHAR(36) DEFAULT NULL,
  name VARCHAR(255) DEFAULT NULL,
  department_id INT DEFAULT NULL,
  department_name VARCHAR(255) DEFAULT NULL,
  status ENUM('ACTIVE','RESOLVED','OVERRIDDEN') NOT NULL DEFAULT 'ACTIVE',
  detected_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME DEFAULT NULL,
  resolution_note TEXT DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_validation_violations_active_user (status, user_id, validation_code),
  KEY idx_validation_violations_active_department (status, department_id, validation_code),
  KEY idx_validation_violations_request (request_id, status),
  KEY idx_validation_violations_return (return_id, status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS validation_overrides (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  violation_id BIGINT UNSIGNED NOT NULL,
  reason TEXT NOT NULL,
  valid_from DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  valid_until DATETIME DEFAULT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_by_user_id VARCHAR(36) NOT NULL,
  created_by_name VARCHAR(255) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_by_user_id VARCHAR(36) DEFAULT NULL,
  revoked_by_name VARCHAR(255) DEFAULT NULL,
  revoked_at DATETIME DEFAULT NULL,
  revoke_reason TEXT DEFAULT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_validation_overrides_violation (violation_id, is_active, valid_from, valid_until)
) ENGINE=InnoDB;
