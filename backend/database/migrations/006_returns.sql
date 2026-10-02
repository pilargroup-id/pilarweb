-- Pilarweb migration 006: returnable goods tracking

USE pilarweb;

CREATE TABLE IF NOT EXISTS returns (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  request_id VARCHAR(36) NOT NULL,
  return_number VARCHAR(80) NOT NULL,
  status VARCHAR(80) NOT NULL DEFAULT 'PENDING',
  returned_by_user_id VARCHAR(36) DEFAULT NULL,
  returned_by_name VARCHAR(255) DEFAULT NULL,
  received_by_user_id VARCHAR(36) DEFAULT NULL,
  received_by_name VARCHAR(255) DEFAULT NULL,
  returned_at DATETIME DEFAULT NULL,
  inspected_at DATETIME DEFAULT NULL,
  note TEXT DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_returns_number (return_number),
  KEY idx_returns_request (request_id),
  KEY idx_returns_status (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS return_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  return_id BIGINT UNSIGNED NOT NULL,
  request_item_id BIGINT UNSIGNED NOT NULL,
  item_code VARCHAR(100) NOT NULL,
  item_name VARCHAR(255) NOT NULL,
  returned_qty DECIMAL(18,4) NOT NULL,
  condition_code VARCHAR(80) NOT NULL DEFAULT 'GOOD',
  condition_note VARCHAR(500) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_return_items_return (return_id),
  KEY idx_return_items_request_item (request_item_id)
) ENGINE=InnoDB;
