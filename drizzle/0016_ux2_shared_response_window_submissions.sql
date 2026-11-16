CREATE TABLE `shared_response_window_submissions` (
	`room_id` text NOT NULL,
	`window_id` text NOT NULL,
	`player_id` text NOT NULL,
	`submission_json` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`room_id`, `window_id`, `player_id`),
	FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `rooms` ADD `shared_response_commit_id` text;