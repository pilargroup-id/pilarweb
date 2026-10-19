-- Pilarweb migration 001: master configuration
-- Clean development baseline. MariaDB 10.11+.

CREATE DATABASE IF NOT EXISTS pilarweb
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_general_ci;

USE pilarweb;

CREATE TABLE IF NOT EXISTS master_request_purposes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(150) NOT NULL,
  description VARCHAR(500) DEFAULT NULL,
  return_type ENUM('NON_RETURNABLE','RETURNABLE') NOT NULL DEFAULT 'NON_RETURNABLE',
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_master_request_purposes_code (code),
  KEY idx_master_request_purposes_active_sort (is_active, sort_order),
  KEY idx_master_request_purposes_return_type (return_type, is_active)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS warehouse_locations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  internal_id BIGINT UNSIGNED DEFAULT NULL COMMENT 'Optional NetSuite Location Internal ID',
  code VARCHAR(80) NOT NULL,
  name VARCHAR(150) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_warehouse_locations_code (code),
  UNIQUE KEY uq_warehouse_locations_internal_id (internal_id),
  KEY idx_warehouse_locations_active (is_active)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS financial_closing_settings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  closing_day TINYINT UNSIGNED NOT NULL DEFAULT 7,
  timezone VARCHAR(100) NOT NULL DEFAULT 'Asia/Jakarta',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_by_user_id VARCHAR(36) DEFAULT NULL,
  created_by_name VARCHAR(255) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_financial_closing_settings_active (is_active)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS number_sequences (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  sequence_key VARCHAR(80) NOT NULL,
  period_key VARCHAR(20) NOT NULL,
  last_number BIGINT UNSIGNED NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_number_sequences_key_period (sequence_key, period_key)
) ENGINE=InnoDB;
