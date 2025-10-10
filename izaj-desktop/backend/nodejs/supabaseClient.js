import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rhckwqhpnzjqfsjohvzk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoY2t3cWhwbnpqcWZzam9odnprIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODE3NTY5MywiZXhwIjoyMDYzNzUxNjkzfQ.G5z39k1UXNrmCNh1hxHLCC4YJuDfpVMyE__9lShW0e4';

export const supabase = createClient(supabaseUrl, supabaseKey);