-- Migration: Add ban columns to profiles table
-- Adds is_banned and ban_reason columns for user suspension functionality

ALTER TABLE profiles ADD COLUMN is_banned INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN ban_reason TEXT;
