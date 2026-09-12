ALTER TABLE `rooms` ADD `last_activity_at` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
UPDATE `rooms` SET `last_activity_at` = `created_at` WHERE `last_activity_at` = 0;
--> statement-breakpoint
CREATE TRIGGER `touch_room_activity` AFTER UPDATE OF `status`, `turn_seat`, `phase`, `deck_json`, `discard_json`, `log_json`, `pending_json` ON `rooms`
WHEN NEW.`status` = 'playing' AND NEW.`last_activity_at` = OLD.`last_activity_at`
BEGIN
	UPDATE `rooms` SET `last_activity_at` = CAST(strftime('%s','now') AS INTEGER) * 1000 WHERE `id` = NEW.`id`;
END;
--> statement-breakpoint
PRAGMA optimize;
