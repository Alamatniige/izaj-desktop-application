import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '..', '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables for authentication.');
}

const authClient = createClient(supabaseUrl, supabaseAnonKey);

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ [Auth] No authorization header');
      return res.status(401).json({ error: 'Authorization token required' });
    }

    const token = authHeader.split(' ')[1];
    
    // Use separate auth client to validate user token
    const { data: { user }, error } = await authClient.auth.getUser(token);

    if (error || !user) {
      console.log('❌ [Auth] Invalid token:', error?.message);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    console.log('✅ [Auth] User authenticated:', user.id);
    req.user = user;
    next();
  } catch (error) {
    console.error('❌ [Auth] Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

export default authenticate;
