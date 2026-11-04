ALTER TABLE `players` ADD `controller_type` text DEFAULT 'human' NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `controller_request_id` text;--> statement-breakpoint
UPDATE `players` SET `controller_type` = 'test' WHERE `is_test_player` = 1;--> statement-breakpoint
CREATE UNIQUE INDEX `players_room_controller_request_unique` ON `players` (`room_id`,`controller_request_id`);