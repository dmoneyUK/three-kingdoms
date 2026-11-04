CREATE TABLE `bot_room_scheduler` (
  `room_id` text PRIMARY KEY NOT NULL,
  `lease_token` text,
  `lease_until` integer DEFAULT 0 NOT NULL,
  `actions_reserved` integer DEFAULT 0 NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  CONSTRAINT `bot_room_scheduler_budget_check` CHECK (`actions_reserved` BETWEEN 0 AND 200)
);--> statement-breakpoint
CREATE TABLE `bot_work` (
  `decision_id` text PRIMARY KEY NOT NULL,
  `room_id` text NOT NULL,
  `bot_id` text NOT NULL,
  `action_revision` text NOT NULL,
  `status` text DEFAULT 'pending' NOT NULL,
  `attempts` integer DEFAULT 0 NOT NULL,
  `available_at` integer NOT NULL,
  `lease_token` text,
  `lease_until` integer,
  `budget_reserved` integer DEFAULT false NOT NULL,
  `error_code` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  CONSTRAINT `bot_work_status_check` CHECK (`status` IN ('pending', 'claimed', 'consumed', 'waiting_for_human', 'unsupported', 'stale', 'failed')),
  CONSTRAINT `bot_work_attempts_check` CHECK (`attempts` BETWEEN 0 AND 3)
);--> statement-breakpoint
CREATE UNIQUE INDEX `bot_work_room_bot_revision_unique` ON `bot_work` (`room_id`, `bot_id`, `action_revision`);--> statement-breakpoint
CREATE INDEX `bot_work_status_available_idx` ON `bot_work` (`status`, `available_at`, `lease_until`);
