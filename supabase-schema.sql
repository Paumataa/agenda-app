-- ====================================
-- AGENDA APP — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor
-- ====================================

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title       TEXT NOT NULL,
    description TEXT,
    date        DATE NOT NULL,
    time        TIME,
    priority    TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
    category    TEXT DEFAULT 'Other',
    completed   BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Planning templates table
CREATE TABLE IF NOT EXISTS planning_templates (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name        TEXT NOT NULL,
    type        TEXT DEFAULT 'weekly' CHECK (type IN ('weekly', 'monthly')),
    description TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (users can only see their own data)
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE planning_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies — tasks
CREATE POLICY "Users view own tasks"   ON tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own tasks" ON tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own tasks" ON tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own tasks" ON tasks FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies — planning_templates
CREATE POLICY "Users view own templates"   ON planning_templates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own templates" ON planning_templates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own templates" ON planning_templates FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own templates" ON planning_templates FOR DELETE USING (auth.uid() = user_id);
