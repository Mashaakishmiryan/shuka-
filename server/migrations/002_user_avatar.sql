-- 002_user_avatar.sql — each user chooses their own profile portrait.
-- NULL means "not chosen yet" (a neutral stepped-diamond avatar is shown).
ALTER TABLE users ADD COLUMN avatar TEXT CHECK (avatar IN ('anahit', 'aram'));
