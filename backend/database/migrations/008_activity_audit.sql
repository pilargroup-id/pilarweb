-- Pilarweb migration 008: comments and append-only business activity log

USE pilarweb;

CREATE TABLE IF NOT EXISTS request_comments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  request_id VARCHAR(36) NOT NULL,
  comment_text TEXT NOT NULL,
  created_by_user_id VARCHAR(36) NOT NULL,
  created_by_name VARCHAR(255) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_request_comments_request (request_id, created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS activity_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  request_id VARCHAR(36) DEFAULT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id VARCHAR(100) DEFAULT NULL,
  action_code VARCHAR(100) NOT NULL,
  actor_user_id VARCHAR(36) DEFAULT NULL,
  actor_name VARCHAR(255) DEFAULT NULL,
  before_json LONGTEXT DEFAULT NULL,
  after_json LONGTEXT DEFAULT NULL,
  metadata_json LONGTEXT DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_activity_logs_request (request_id, created_at),
  KEY idx_activity_logs_entity (entity_type, entity_id),
  KEY idx_activity_logs_action (action_code, created_at)
) ENGINE=InnoDB;
