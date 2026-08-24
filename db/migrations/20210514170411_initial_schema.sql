-- migrate:up
CREATE TABLE IF NOT EXISTS `rooms` (
    `id` varchar(36) NOT NULL,
    `title` varchar(100) NOT NULL,
    `body` mediumtext,
    `input` mediumtext,
    `language` varchar(30) DEFAULT 'python',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `expires_at` DATETIME DEFAULT (CURRENT_TIMESTAMP + INTERVAL 30 DAY),
    PRIMARY KEY (`id`),
    INDEX `idx_rooms_expires_at` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `code_history` (
    `id` int NOT NULL AUTO_INCREMENT,
    `room_id` varchar(36) NOT NULL,
    `author_name` varchar(100) NOT NULL,
    `code_snapshot` mediumtext,
    `input_snapshot` mediumtext,
    `language` varchar(30) DEFAULT 'python',
    `action` varchar(50) DEFAULT 'edit',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `expires_at` DATETIME DEFAULT (CURRENT_TIMESTAMP + INTERVAL 30 DAY),
    PRIMARY KEY (`id`),
    INDEX `idx_code_history_room_id` (`room_id`),
    INDEX `idx_code_history_expires_at` (`expires_at`),
    CONSTRAINT `fk_code_history_room_id` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- migrate:down
DROP TABLE IF EXISTS `code_history`;
DROP TABLE IF EXISTS `rooms`;