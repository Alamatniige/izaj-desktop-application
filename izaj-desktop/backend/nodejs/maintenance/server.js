import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import authenticate from '../util/middlerware.js';
import { logAuditEvent, AuditActions } from '../util/auditLogger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const router = express.Router();

// GET /status - Get maintenance status
router.get('/status', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('maintenance_mode')
      .eq('setting_key', 'system_under_maintenance')
      .single();

    if (error && error.code !== 'PGRST116') {
      return res.status(500).json({ error: error.message });
    }

    // If not found, default to false
    const isMaintenance = data?.maintenance_mode === true;

    res.json({ success: true, maintenance: isMaintenance });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /toggle - Toggle maintenance mode
router.post('/toggle', authenticate, async (req, res) => {
  try {
    // Check if user is IT Maintenance
    if (req.user.user_metadata?.is_it_maintenance !== true) {
        return res.status(403).json({ error: 'Access denied. Only IT Maintenance can toggle maintenance mode.' });
    }

    const { maintenance } = req.body;

    if (typeof maintenance !== 'boolean') {
      return res.status(400).json({ error: 'Maintenance status must be a boolean' });
    }

    // Upsert setting using maintenance_mode column
    // Following the pattern from settings/server.js where subscription_message 
    // is stored in its own column in the app_settings table
    const { error } = await supabase
      .from('app_settings')
      .upsert({
        setting_key: 'system_under_maintenance',
        maintenance_mode: maintenance,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'setting_key'
      });

    if (error) {
        console.error('Error setting maintenance:', error);
        return res.status(500).json({ 
          success: false,
          error: 'Failed to update maintenance mode: ' + error.message 
        });
    }

    await logAuditEvent(req.user.id, AuditActions.SYSTEM_UPDATE, {
        action: 'toggle_maintenance',
        status: maintenance,
        success: true
    }, req);

    res.json({ success: true, message: `System is now ${maintenance ? 'under maintenance' : 'active'}` });

  } catch (error) {
    console.error('Error toggling maintenance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

