CREATE TABLE `bot_demo_rate_limits` (
	`hour_bucket` integer PRIMARY KEY NOT NULL,
	`bot_add_count` integer DEFAULT 0 NOT NULL,
	CONSTRAINT "bot_demo_rate_limits_add_count_check" CHECK("bot_demo_rate_limits"."bot_add_count" BETWEEN 0 AND 12)
);
