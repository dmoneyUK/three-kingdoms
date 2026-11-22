ALTER TABLE `rooms` ADD `turn_epoch` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `rooms` ADD `turn_start_public_sequence` integer;