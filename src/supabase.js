import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mmtoczixvdgfljasrsji.supabase.co'; // pegue no painel
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1tdG9jeml4dmRnZmxqYXNyc2ppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc1ODYzNjYsImV4cCI6MjA2MzE2MjM2Nn0.3d87ISY1Ped0KVTHiXAOKQ-3JY9OqlZyNCsWQJn3Bpo'; // pegue no painel

export const supabase = createClient(supabaseUrl, supabaseKey);
