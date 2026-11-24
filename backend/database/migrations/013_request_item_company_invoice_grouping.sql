-- Pilarweb 013: item-company snapshot + Finance invoice grouping
USE pilarweb;

ALTER TABLE requests
  ADD COLUMN item_company_code VARCHAR(20) DEFAULT NULL AFTER company_name,
  ADD COLUMN item_company_name VARCHAR(255) DEFAULT NULL AFTER item_company_code,
  ADD COLUMN invoice_status ENUM('NOT_READY','READY_TO_INVOICE','INVOICED') NOT NULL DEFAULT 'NOT_READY' AFTER item_company_name,
  ADD KEY idx_requests_item_company (item_company_code, status, invoice_status),
  ADD KEY idx_requests_invoice_status (invoice_status, completed_at);

CREATE TABLE finance_invoice_groups (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  invoice_number VARCHAR(120) NOT NULL,
  item_company_code VARCHAR(20) NOT NULL,
  item_company_name VARCHAR(255) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
  note TEXT DEFAULT NULL,
  created_by_user_id VARCHAR(36) NOT NULL,
  created_by_name VARCHAR(255) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_finance_invoice_groups_number (invoice_number),
  KEY idx_finance_invoice_groups_company (item_company_code, created_at)
) ENGINE=InnoDB;

CREATE TABLE finance_invoice_group_requests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  invoice_group_id BIGINT UNSIGNED NOT NULL,
  request_id VARCHAR(36) NOT NULL,
  assigned_by_user_id VARCHAR(36) NOT NULL,
  assigned_by_name VARCHAR(255) DEFAULT NULL,
  assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  removed_at DATETIME DEFAULT NULL,
  removed_by_user_id VARCHAR(36) DEFAULT NULL,
  removed_by_name VARCHAR(255) DEFAULT NULL,
  removal_reason TEXT DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_finance_invoice_group_requests_group (invoice_group_id, removed_at, assigned_at),
  KEY idx_finance_invoice_group_requests_request (request_id, removed_at, assigned_at)
) ENGINE=InnoDB;
