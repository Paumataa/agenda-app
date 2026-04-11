// ====================================
// SUPABASE CONFIGURATION
// 1. Go to https://app.supabase.com
// 2. Open your project → Settings → API
// 3. Copy "Project URL" and "anon public" key below
// ====================================

const SUPABASE_URL = 'https://zsexiopkvljkbordxhbi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzZXhpb3Brdmxqa2JvcmR4aGJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5MDYxOTksImV4cCI6MjA5MTQ4MjE5OX0.8ZaUE5DSjaXuhbHWUqqf0nee4sBP46_qeePcM4rS-wI';

const { createClient } = window.supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
