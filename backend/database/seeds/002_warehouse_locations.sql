USE pilarweb;

INSERT INTO warehouse_locations (code, name, is_active)
VALUES
  ('GOTO', 'GOTO Warehouse', 1),
  ('GOSAVE', 'GOSAVE Warehouse', 1)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  is_active = VALUES(is_active);
