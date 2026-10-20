ALTER TABLE `vendors` ADD FULLTEXT KEY `ftx_vendors_search` (`business_name`, `description`);
