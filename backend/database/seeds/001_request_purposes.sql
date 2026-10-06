USE pilarweb;

INSERT INTO master_request_purposes
  (code, name, description, sort_order, is_active)
VALUES
  ('TIKTOK_AFFILIATE', 'TikTok Affiliate', 'Goods requested for TikTok affiliate activities.', 10, 1),
  ('YOUTUBE_AFFILIATE', 'YouTube Affiliate', 'Goods requested for YouTube affiliate activities.', 20, 1),
  ('EXTERNAL_DELIVERY', 'External Delivery', 'Goods sent or handed over to an external party.', 30, 1),
  ('INTERNAL_USE', 'Internal Use', 'Goods requested for internal company use.', 40, 1),
  ('LOAN', 'Loan', 'Goods borrowed temporarily and expected to be returned.', 50, 1)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  sort_order = VALUES(sort_order),
  is_active = VALUES(is_active);
