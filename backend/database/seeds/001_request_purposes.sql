USE pilarweb;

INSERT INTO master_request_purposes
  (code, name, description, sort_order, is_active)
VALUES
  ('TIKTOK_SHIPMENT', 'TikTok Shipment', 'Goods requested for TikTok-related shipment or operational needs.', 10, 1),
  ('YOUTUBE_SHIPMENT', 'YouTube Shipment', 'Goods requested for YouTube-related shipment or operational needs.', 20, 1),
  ('INTERNAL_USE', 'Internal Use', 'Goods requested for internal company use.', 30, 1),
  ('MARKETING_REQUEST', 'Marketing Request', 'Goods requested for marketing activities.', 40, 1),
  ('PRODUCT_SAMPLE', 'Product Sample', 'Goods requested as product samples.', 50, 1)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  sort_order = VALUES(sort_order),
  is_active = VALUES(is_active);
