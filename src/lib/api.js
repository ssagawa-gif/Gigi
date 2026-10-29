// Picks the backend: Supabase when keys are set (see .env.example), otherwise the in-browser demo.
import { demoBackend } from './demoBackend.js';
import { makeSupabaseBackend } from './supabaseBackend.js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const api = url && key ? makeSupabaseBackend(url, key) : demoBackend;
export const IS_DEMO = api.mode === 'demo';
export const WAITLIST_URL = import.meta.env.VITE_WAITLIST_URL || '';
