-- Add ban fields to profiles table
ALTER TABLE profiles ADD COLUMN is_banned INTEGER NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN ban_reason TEXT;
