-- Pilarweb 006: one final return cycle + automatic non-returnable PB shortfall
USE pilarweb;

CREATE TABLE returns (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  return_number VARCHAR(32) NOT NULL COMMENT 'RB[yy][mm][xxxxx]',
  request_id VARCHAR(36) NOT NULL,
  status ENUM('PENDING_REQUESTER','SUBMITTED','COMPLETED') NOT NULL DEFAULT 'PENDING_REQUESTER',
  due_at DATETIME NOT NULL,
  expected_total_qty DECIMAL(18,4) NOT NULL DEFAULT 0,
  requester_declared_total_qty DECIMAL(18,4) DEFAULT NULL,
  warehouse_received_total_qty DECIMAL(18,4) DEFAULT NULL,
  shortfall_total_qty DECIMAL(18,4) DEFAULT NULL,
  requester_submitted_by_user_id VARCHAR(36) DEFAULT NULL,
  requester_submitted_by_name VARCHAR(255) DEFAULT NULL,
  requester_submitted_at DATETIME DEFAULT NULL,
  warehouse_received_by_user_id VARCHAR(36) DEFAULT NULL,
  warehouse_received_by_name VARCHAR(255) DEFAULT NULL,
  warehouse_received_at DATETIME DEFAULT NULL,
  generated_shortfall_request_id VARCHAR(36) DEFAULT NULL,
  completed_at DATETIME DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_returns_number (return_number),
  UNIQUE KEY uq_returns_request (request_id),
  KEY idx_returns_status_due (status, due_at)
) ENGINE=InnoDB;

CREATE TABLE return_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  return_id BIGINT UNSIGNED NOT NULL,
  request_item_id BIGINT UNSIGNED NOT NULL,
  item_code VARCHAR(100) NOT NULL,
  item_name VARCHAR(255) NOT NULL,
  expected_qty DECIMAL(18,4) NOT NULL,
  requester_return_qty DECIMAL(18,4) DEFAULT NULL,
  warehouse_received_qty DECIMAL(18,4) DEFAULT NULL,
  shortfall_qty DECIMAL(18,4) DEFAULT NULL,
  note VARCHAR(500) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_return_items_request_item (return_id, request_item_id),
  KEY idx_return_items_return (return_id),
  KEY idx_return_items_request_item (request_item_id)
) ENGINE=InnoDB;
