# 念念年年 — 用户登录与家人邀请系统 实现计划

> **For Hermes:** 按任务逐项实现，每完成一项构建验证。

**Goal:** 为念念年年添加手机号验证码登录系统 + 邀请家人功能，让不同用户拥有独立的家庭记忆空间，可以邀请其他用户成为家人共享照片和故事。

**Architecture:** 
- 新增 `users` 表存储用户（手机号+验证码登录），`family_members` 表替代 families.members JSON 数组
- 使用 JWT Token（存储在 localStorage）+ Cookie 双重认证
- 邀请码机制：创建者生成邀请码 → 被邀请者输入加入 → 自动关联家庭
- 所有现有API加上用户鉴权中间件

**Tech Stack:** Next.js 16, SQLite (better-sqlite3), JWT (jsonwebtoken), bcryptjs（用于邀请码）

---

## 数据库迁移

新增2张表：

```sql
-- 用户表
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  phone TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  avatar TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 验证码表（临时）
CREATE TABLE verify_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0
);

-- 家庭-用户关联表
CREATE TABLE family_users (
  family_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member', -- owner | member
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (family_id, user_id),
  FOREIGN KEY (family_id) REFERENCES families(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 邀请码表
CREATE TABLE invitations (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  created_by TEXT NOT NULL,
  expires_at TEXT,
  used_at TEXT,
  FOREIGN KEY (family_id) REFERENCES families(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- 用户表
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  phone TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  avatar TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 验证码表（临时）
CREATE TABLE verify_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0
);
