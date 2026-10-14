CREATE TABLE `negation_window_submissions` (
	`room_id` text NOT NULL,
	`window_id` text NOT NULL,
	`player_id` text NOT NULL,
	`submission_json` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`window_id`, `player_id`)
);
--> statement-breakpoint
CREATE INDEX `idx_negation_window_submissions_room` ON `negation_window_submissions` (`room_id`);
