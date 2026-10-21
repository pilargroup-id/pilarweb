USE pilarweb;
-- block_scope and is_blocking are Admin-configurable. These defaults can be changed without deployment.
INSERT INTO validation_rules (code,name,description,block_scope,is_blocking,allow_override,is_active) VALUES
('RECEIPT_AUTO_ACCEPTED','Receipt Auto Accepted','Requester did not confirm delivery before the receipt confirmation deadline.','USER',0,1,1),
('RETURN_OVERDUE','Return Overdue','Returnable PB passed its return due date before the final return cycle was completed.','DEPARTMENT',1,1,1),
('RETURN_SHORTFALL','Return Shortfall','Final return cycle completed with quantity not physically received back by Warehouse.','USER',1,1,1)
ON DUPLICATE KEY UPDATE name=VALUES(name),description=VALUES(description),block_scope=VALUES(block_scope),is_blocking=VALUES(is_blocking),allow_override=VALUES(allow_override),is_active=VALUES(is_active);
