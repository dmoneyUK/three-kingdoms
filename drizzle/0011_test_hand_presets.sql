ALTER TABLE `players` ADD `is_test_player` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `rooms` ADD `test_room` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `rooms` ADD `test_hand_preset_json` text;--> statement-breakpoint
ALTER TABLE `rooms` ADD `test_hand_config_revision` integer DEFAULT 0 NOT NULL;
