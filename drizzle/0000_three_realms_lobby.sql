CREATE TABLE `rooms` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`host_player_id` text NOT NULL,
	`status` text DEFAULT 'lobby' NOT NULL,
	`max_players` integer DEFAULT 8 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rooms_code_unique` ON `rooms` (`code`);
--> statement-breakpoint
CREATE TABLE `players` (
	`id` text PRIMARY KEY NOT NULL,
	`room_id` text NOT NULL,
	`name` text NOT NULL,
	`token_hash` text NOT NULL,
	`seat` integer NOT NULL,
	`role` text,
	`hero` text,
	`hp` integer,
	`connected_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `players_room_seat_unique` ON `players` (`room_id`,`seat`);
--> statement-breakpoint
CREATE INDEX `idx_players_room_id` ON `players` (`room_id`);
--> statement-breakpoint
PRAGMA optimize;
