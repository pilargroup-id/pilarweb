-- Pilarweb migration 004: department approval and Finance review

USE pilarweb;

CREATE TABLE IF NOT EXISTS request_approvals (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  request_id VARCHAR(36) NOT NULL,
  approval_rule_id BIGINT UNSIGNED DEFAULT NULL,
  approval_order INT NOT NULL DEFAULT 1,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  approver_user_id VARCHAR(36) DEFAULT NULL,
  approver_internal_id INT DEFAULT NULL,
  approver_name VARCHAR(255) DEFAULT NULL,
  approver_job_level_value INT DEFAULT NULL,
  approver_job_level_name VARCHAR(150) DEFAULT NULL,
  note TEXT DEFAULT NULL,
  decided_at DATETIME DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_request_approvals_request (request_id, approval_order),
  KEY idx_request_approvals_status (status),
  KEY idx_request_approvals_approver (approver_user_id, status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS finance_reviews (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  request_id VARCHAR(36) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  reviewer_user_id VARCHAR(36) DEFAULT NULL,
  reviewer_internal_id INT DEFAULT NULL,
  reviewer_name VARCHAR(255) DEFAULT NULL,
  note TEXT DEFAULT NULL,
  reviewed_at DATETIME DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_finance_reviews_request (request_id),
  KEY idx_finance_reviews_status (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS finance_review_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  finance_review_id BIGINT UNSIGNED NOT NULL,
  request_item_id BIGINT UNSIGNED NOT NULL,
  requested_qty_snapshot DECIMAL(18,4) DEFAULT NULL,
  decision VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  approved_qty DECIMAL(18,4) DEFAULT NULL,
  rejected_qty DECIMAL(18,4) NOT NULL DEFAULT 0,
  note VARCHAR(500) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_finance_review_items_review_item (finance_review_id, request_item_id),
  KEY idx_finance_review_items_request_item (request_item_id)
) ENGINE=InnoDB;
