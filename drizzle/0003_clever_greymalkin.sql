CREATE TABLE `game_audit` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`room_id` text NOT NULL,
	`event_key` text,
	`event_type` text NOT NULL,
	`actor_id` text,
	`actor_name` text,
	`action` text,
	`phase_before` text,
	`phase_after` text,
	`turn_seat_before` integer,
	`turn_seat_after` integer,
	`acting_player_before` text,
	`acting_player_after` text,
	`detail_json` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_game_audit_room_id` ON `game_audit` (`room_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `game_audit_room_event_unique` ON `game_audit` (`room_id`,`event_key`);--> statement-breakpoint
CREATE TRIGGER `audit_room_transition` AFTER UPDATE OF `status`, `turn_seat`, `phase`, `pending_json`, `log_json` ON `rooms`
BEGIN
	INSERT INTO `game_audit` (`room_id`,`event_type`,`phase_before`,`phase_after`,`turn_seat_before`,`turn_seat_after`,`acting_player_before`,`acting_player_after`,`detail_json`,`created_at`)
	VALUES (OLD.`id`,'state_transition',OLD.`phase`,NEW.`phase`,OLD.`turn_seat`,NEW.`turn_seat`,CASE WHEN OLD.`phase` IN ('response','dying') THEN COALESCE(json_extract(OLD.`pending_json`,'$.actorId'),json_extract(OLD.`pending_json`,'$.targetId')) ELSE (SELECT `id` FROM `players` WHERE `room_id`=OLD.`id` AND `seat`=OLD.`turn_seat`) END,CASE WHEN NEW.`phase` IN ('response','dying') THEN COALESCE(json_extract(NEW.`pending_json`,'$.actorId'),json_extract(NEW.`pending_json`,'$.targetId')) ELSE (SELECT `id` FROM `players` WHERE `room_id`=NEW.`id` AND `seat`=NEW.`turn_seat`) END,json_object('statusBefore',OLD.`status`,'statusAfter',NEW.`status`,'pendingBefore',OLD.`pending_json`,'pendingAfter',NEW.`pending_json`),CAST(strftime('%s','now') AS INTEGER)*1000);
END;--> statement-breakpoint
CREATE TRIGGER `audit_new_game_events` AFTER UPDATE OF `log_json` ON `rooms`
BEGIN
	INSERT OR IGNORE INTO `game_audit` (`room_id`,`event_key`,`event_type`,`actor_name`,`phase_after`,`turn_seat_after`,`acting_player_after`,`detail_json`,`created_at`)
	SELECT NEW.`id`,CASE WHEN value LIKE '@event:%' THEN json_extract(substr(value,8),'$.id') WHEN value LIKE '@card:%' THEN json_extract(substr(value,7),'$.id') WHEN value LIKE '@history:%' THEN json_extract(substr(value,10),'$.id') ELSE 'legacy-'||hex(value) END,'game_event',CASE WHEN value LIKE '@card:%' THEN json_extract(substr(value,7),'$.player') ELSE NULL END,NEW.`phase`,NEW.`turn_seat`,CASE WHEN NEW.`phase` IN ('response','dying') THEN COALESCE(json_extract(NEW.`pending_json`,'$.actorId'),json_extract(NEW.`pending_json`,'$.targetId')) ELSE (SELECT `id` FROM `players` WHERE `room_id`=NEW.`id` AND `seat`=NEW.`turn_seat`) END,value,CAST(strftime('%s','now') AS INTEGER)*1000 FROM json_each(COALESCE(NEW.`log_json`,'[]'));
END;--> statement-breakpoint
PRAGMA optimize;
