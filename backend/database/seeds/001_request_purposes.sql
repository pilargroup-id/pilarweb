USE pilarweb;
INSERT INTO master_request_purposes (code,name,description,return_type,is_system,sort_order,is_active) VALUES
('TIKTOK_AFFILIATE','TikTok Affiliate','Goods requested for TikTok affiliate activities.','NON_RETURNABLE',0,10,1),
('YOUTUBE_AFFILIATE','YouTube Affiliate','Goods requested for YouTube affiliate activities.','NON_RETURNABLE',0,20,1),
('EXTERNAL_DELIVERY','External Delivery','Goods sent or handed over to an external party.','NON_RETURNABLE',0,30,1),
('INTERNAL_USE','Internal Use','Goods requested for internal company use.','NON_RETURNABLE',0,40,1),
('LOAN','Loan','Goods that must be returned after receipt.','RETURNABLE',0,50,1),
('RETURN_SHORTFALL','Return Shortfall','System-generated non-returnable PB for quantity not returned in the one final return cycle.','NON_RETURNABLE',1,900,1)
ON DUPLICATE KEY UPDATE name=VALUES(name),description=VALUES(description),return_type=VALUES(return_type),is_system=VALUES(is_system),sort_order=VALUES(sort_order),is_active=VALUES(is_active);
