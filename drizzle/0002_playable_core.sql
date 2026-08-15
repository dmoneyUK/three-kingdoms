ALTER TABLE `rooms` ADD `turn_seat` integer;
--> statement-breakpoint
ALTER TABLE `rooms` ADD `phase` text;
--> statement-breakpoint
ALTER TABLE `rooms` ADD `deck_json` text;
--> statement-breakpoint
ALTER TABLE `rooms` ADD `discard_json` text;
--> statement-breakpoint
ALTER TABLE `rooms` ADD `log_json` text;
--> statement-breakpoint
ALTER TABLE `rooms` ADD `pending_json` text;
--> statement-breakpoint
ALTER TABLE `players` ADD `hand_json` text;
--> statement-breakpoint
ALTER TABLE `players` ADD `alive` integer DEFAULT true NOT NULL;
--> statement-breakpoint
PRAGMA optimize;
