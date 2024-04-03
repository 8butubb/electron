-- 创建 jkwj 数据库
CREATE DATABASE IF NOT EXISTS jkwj CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 使用 jkwj 数据库
USE jkwj;

-- 创建 jkwj 表
CREATE TABLE IF NOT EXISTS jkwj (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    body TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
