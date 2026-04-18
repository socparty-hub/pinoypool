-- ═══════════════════════════════════════════════════════════════
-- PinoyPool Production Schema
-- Run this in phpMyAdmin on: u158923821_pinoypool_main
-- ═══════════════════════════════════════════════════════════════

SET NAMES utf8mb4;
SET foreign_key_checks = 0;

-- ── Users: players, hall owners (both pending and approved) ────
CREATE TABLE IF NOT EXISTS `users` (
  `id`                  VARCHAR(64)  NOT NULL,
  `name`                VARCHAR(200) NOT NULL,
  `username`            VARCHAR(20)  NOT NULL,
  `email`               VARCHAR(200) DEFAULT NULL,
  `phone`               VARCHAR(20)  DEFAULT NULL,
  `dob`                 VARCHAR(20)  DEFAULT NULL,
  `role`                VARCHAR(20)  NOT NULL DEFAULT 'player',
  `region`              VARCHAR(200) DEFAULT NULL,
  `moniker`             VARCHAR(100) DEFAULT NULL,
  `hall_name`           VARCHAR(200) DEFAULT NULL,
  `city`                VARCHAR(200) DEFAULT NULL,
  `password_hash`       VARCHAR(255) DEFAULT NULL,
  `verification_status` VARCHAR(20)  NOT NULL DEFAULT 'pending',
  `career_status`       VARCHAR(50)  DEFAULT NULL,
  `ppr`                 DECIMAL(10,2) NOT NULL DEFAULT 0,
  `ppr9`                DECIMAL(10,2) NOT NULL DEFAULT 0,
  `ppr10`               DECIMAL(10,2) NOT NULL DEFAULT 0,
  `initial_ppr`         DECIMAL(10,2) NOT NULL DEFAULT 0,
  `wins`                INT NOT NULL DEFAULT 0,
  `losses`              INT NOT NULL DEFAULT 0,
  `wins9`               INT NOT NULL DEFAULT 0,
  `losses9`             INT NOT NULL DEFAULT 0,
  `wins10`              INT NOT NULL DEFAULT 0,
  `losses10`            INT NOT NULL DEFAULT 0,
  `fmt`                 VARCHAR(20)  NOT NULL DEFAULT '9-Ball',
  `colors`              VARCHAR(20)  NOT NULL DEFAULT '#1a3a22',
  `submitted_at`        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `approved_at`         DATETIME     DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_username` (`username`),
  KEY `idx_email`  (`email`),
  KEY `idx_role`   (`role`),
  KEY `idx_status` (`verification_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Halls: billiard halls (pending and approved) ───────────────
CREATE TABLE IF NOT EXISTS `halls` (
  `id`             VARCHAR(64)  NOT NULL,
  `name`           VARCHAR(200) NOT NULL,
  `owner_name`     VARCHAR(200) DEFAULT NULL,
  `owner_username` VARCHAR(20)  DEFAULT NULL,
  `owner_email`    VARCHAR(200) DEFAULT NULL,
  `city`           VARCHAR(200) DEFAULT NULL,
  `region`         VARCHAR(200) DEFAULT NULL,
  `phone`          VARCHAR(20)  DEFAULT NULL,
  `fb_page`        VARCHAR(300) DEFAULT NULL,
  `tables_count`   INT NOT NULL DEFAULT 0,
  `status`         VARCHAR(20)  NOT NULL DEFAULT 'pending',
  `submitted_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `approved_at`    DATETIME     DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_status`          (`status`),
  KEY `idx_owner_username`  (`owner_username`),
  KEY `idx_owner_email`     (`owner_email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Matches: all recorded matches across all statuses ──────────
CREATE TABLE IF NOT EXISTS `matches` (
  `id`              VARCHAR(64)  NOT NULL,
  `p1_name`         VARCHAR(200) DEFAULT NULL,
  `p2_name`         VARCHAR(200) DEFAULT NULL,
  `score`           VARCHAR(20)  DEFAULT NULL,
  `fmt`             VARCHAR(20)  NOT NULL DEFAULT '9-Ball',
  `match_type`      VARCHAR(50)  NOT NULL DEFAULT 'Exhibition',
  `venue`           VARCHAR(300) DEFAULT NULL,
  `match_date`      VARCHAR(20)  DEFAULT NULL,
  `status`          VARCHAR(50)  NOT NULL DEFAULT 'pending',
  `p1_ok`           TINYINT(1)   NOT NULL DEFAULT 0,
  `p2_ok`           TINYINT(1)   NOT NULL DEFAULT 0,
  `venue_ok`        TINYINT(1)   NOT NULL DEFAULT 0,
  `winner`          VARCHAR(200) DEFAULT NULL,
  `race_to`         INT NOT NULL DEFAULT 9,
  `tournament_name` VARCHAR(200) DEFAULT NULL,
  `hcp_label`       VARCHAR(300) DEFAULT NULL,
  `hcp_rack`        VARCHAR(50)  DEFAULT NULL,
  `owner_name`      VARCHAR(200) DEFAULT NULL,
  `p1_career`       VARCHAR(50)  DEFAULT NULL,
  `p2_career`       VARCHAR(50)  DEFAULT NULL,
  `admin_recorded`  TINYINT(1)   NOT NULL DEFAULT 0,
  `submitted_at`    DATETIME     DEFAULT NULL,
  `approved_at`     DATETIME     DEFAULT NULL,
  `approved_by`     VARCHAR(200) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_status`     (`status`),
  KEY `idx_match_date` (`match_date`),
  KEY `idx_venue`      (`venue`(100))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Tournaments ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `tournaments` (
  `id`          VARCHAR(64)  NOT NULL,
  `name`        VARCHAR(200) NOT NULL,
  `fmt`         VARCHAR(20)  NOT NULL DEFAULT '9-Ball',
  `venue`       VARCHAR(300) DEFAULT NULL,
  `start_date`  VARCHAR(20)  DEFAULT NULL,
  `end_date`    VARCHAR(20)  DEFAULT NULL,
  `status`      VARCHAR(20)  NOT NULL DEFAULT 'pending',
  `owner_name`  VARCHAR(200) DEFAULT NULL,
  `owner_email` VARCHAR(200) DEFAULT NULL,
  `notes`       TEXT         DEFAULT NULL,
  `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `approved_at` DATETIME     DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Notifications ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `notifications` (
  `id`         INT          NOT NULL AUTO_INCREMENT,
  `notif_id`   VARCHAR(64)  NOT NULL,
  `username`   VARCHAR(20)  NOT NULL,
  `type`       VARCHAR(50)  DEFAULT NULL,
  `message`    TEXT         DEFAULT NULL,
  `is_read`    TINYINT(1)   NOT NULL DEFAULT 0,
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_notif_id` (`notif_id`),
  KEY `idx_username` (`username`),
  KEY `idx_read`     (`is_read`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Push subscriptions ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `push_subscriptions` (
  `id`         INT          NOT NULL AUTO_INCREMENT,
  `username`   VARCHAR(20)  NOT NULL,
  `endpoint`   TEXT         NOT NULL,
  `p256dh`     TEXT         DEFAULT NULL,
  `auth_key`   TEXT         DEFAULT NULL,
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Misc key-value store (passwords, manual-pending, overflow) ─
CREATE TABLE IF NOT EXISTS `pp_store` (
  `key`   VARCHAR(100) NOT NULL,
  `value` LONGTEXT     NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET foreign_key_checks = 1;
