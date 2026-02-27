-- TDEE Tracker Database Schema
-- Run this in Supabase SQL Editor to set up your database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES TABLE (extends auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    settings JSONB DEFAULT '{"unit": "kg", "theme": "dark", "targetWeightChange": -0.5}'::jsonb
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policy: Users can only see their own profile
CREATE POLICY "Users can view own profile"
    ON public.profiles
    FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON public.profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- ============================================
-- WEIGHT ENTRIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.weight_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    weight DECIMAL(5,2) NOT NULL,
    calories INTEGER,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one entry per day per user
    UNIQUE(user_id, date)
);

-- Enable Row Level Security
ALTER TABLE public.weight_entries ENABLE ROW LEVEL SECURITY;

-- Weight entries policy: Users can only see/edit their own entries
CREATE POLICY "Users can view own weight entries"
    ON public.weight_entries
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weight entries"
    ON public.weight_entries
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weight entries"
    ON public.weight_entries
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own weight entries"
    ON public.weight_entries
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_weight_entries_user_date 
    ON public.weight_entries(user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_weight_entries_date 
    ON public.weight_entries(date DESC);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, settings)
    VALUES (
        NEW.id,
        NEW.email,
        '{"unit": "kg", "theme": "dark", "targetWeightChange": -0.5}'::jsonb
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to profiles
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Apply to weight_entries
CREATE TRIGGER update_weight_entries_updated_at
    BEFORE UPDATE ON public.weight_entries
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- INITIAL DATA (Optional - for testing)
-- ============================================
-- This will be populated by your existing LocalStorage data on first login

-- ============================================
-- VERIFICATION
-- ============================================
-- Run these to verify setup:
-- SELECT * FROM public.profiles;
-- SELECT * FROM public.weight_entries;
-- SELECT * FROM auth.users;
