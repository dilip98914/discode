-- migrate:up
ALTER TABLE `rooms` ADD COLUMN `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE `rooms` ADD COLUMN `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
ALTER TABLE `rooms` ADD COLUMN `expires_at` DATETIME DEFAULT (CURRENT_TIMESTAMP + INTERVAL 30 DAY);

CREATE TABLE IF NOT EXISTS `code_history` (
    `id` int NOT NULL AUTO_INCREMENT,
    `room_id` varchar(36) NOT NULL,
    `author_name` varchar(100) NOT NULL,
    `code_snapshot` mediumtext,
    `input_snapshot` mediumtext,
    `language` varchar(30),
    `action` varchar(50) DEFAULT 'edit',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `expires_at` DATETIME DEFAULT (CURRENT_TIMESTAMP + INTERVAL 30 DAY),
    PRIMARY KEY (`id`),
    INDEX `idx_room_id` (`room_id`),
    INDEX `idx_expires_at` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- migrate:down
DROP TABLE IF EXISTS `code_history`;
ALTER TABLE `rooms` DROP COLUMN `expires_at`;
ALTER TABLE `rooms` DROP COLUMN `updated_at`;
ALTER TABLE `rooms` DROP COLUMN `created_at`;