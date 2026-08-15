ALTER TABLE `players` ADD `max_hp` integer;
--> statement-breakpoint
ALTER TABLE `players` ADD `hero_options_json` text;
--> statement-breakpoint
PRAGMA optimize;
