USE pilarweb;

INSERT INTO warehouse_locations
  (code, name, is_loan_warehouse, is_active)
VALUES
  ('GOTO', 'GOTO Warehouse', 0, 1),
  ('GOSAVE', 'GOSAVE Warehouse', 0, 1),
  ('LOAN', 'Loan Warehouse', 1, 1)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  is_loan_warehouse = VALUES(is_loan_warehouse),
  is_active = VALUES(is_active);

-- Add other NetSuite source warehouses here when their exact master codes are confirmed.
