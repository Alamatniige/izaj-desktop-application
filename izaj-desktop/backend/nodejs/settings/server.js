import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import authenticate from '../util/middlerware.js';
import { emailService } from '../util/emailService.js';

// Create fresh supabase client for this route
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

// GET subscription message
router.get('/subscription-message', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    const { data: adminUser, error: adminError } = await supabase
      .from('adminUser')
      .select('role')
      .eq('user_id', req.user.id)
      .single();

    if (adminError || !adminUser || adminUser.role !== 'Admin') {
      return res.status(403).json({ 
        success: false,
        error: 'Access denied. Only Admins can view subscription messages.' 
      });
    }

    // Get subscription message from settings table
    const { data, error } = await supabase
      .from('app_settings')
      .select('subscription_message')
      .eq('setting_key', 'subscription_message')
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error fetching subscription message:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch subscription message' 
      });
    }

    // If no setting exists, return empty string
    const message = data?.subscription_message || '';

    res.json({
      success: true,
      message: message
    });
  } catch (error) {
    console.error('Error in GET /subscription-message:', error);
    res.status(500).json({ 
      success: false, 
      error: 'An unexpected error occurred' 
    });
  }
});

// PUT subscription message
router.put('/subscription-message', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    const { data: adminUser, error: adminError } = await supabase
      .from('adminUser')
      .select('role')
      .eq('user_id', req.user.id)
      .single();

    if (adminError || !adminUser || adminUser.role !== 'Admin') {
      return res.status(403).json({ 
        success: false,
        error: 'Access denied. Only Admins can update subscription messages.' 
      });
    }

    const { message } = req.body;

    if (typeof message !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'Message must be a string' 
      });
    }

    // Upsert subscription message in settings table
    const { data, error } = await supabase
      .from('app_settings')
      .upsert({
        setting_key: 'subscription_message',
        subscription_message: message,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'setting_key'
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving subscription message:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to save subscription message' 
      });
    }

    res.json({
      success: true,
      message: 'Subscription message saved successfully'
    });
  } catch (error) {
    console.error('Error in PUT /subscription-message:', error);
    res.status(500).json({ 
      success: false, 
      error: 'An unexpected error occurred' 
    });
  }
});

// GET subscriber count
router.get('/subscription-message/subscriber-count', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    const { data: adminUser, error: adminError } = await supabase
      .from('adminUser')
      .select('role')
      .eq('user_id', req.user.id)
      .single();

    if (adminError || !adminUser || adminUser.role !== 'Admin') {
      return res.status(403).json({ 
        success: false,
        error: 'Access denied. Only Admins can view subscriber count.' 
      });
    }

    // Get count of active subscribers
    // Removed verbose logs to reduce terminal noise
    
    // Query active subscribers directly
    const { data: activeSubscribers, error: fetchError, count } = await supabase
      .from('newsletter_subscribers')
      .select('email, is_active, id', { count: 'exact' })
      .eq('is_active', true);
    
    if (fetchError) {
      console.error('Error fetching active subscribers:', fetchError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch subscriber count: ' + fetchError.message
      });
    }
    
    const activeCount = activeSubscribers ? activeSubscribers.length : 0;
    // Removed verbose log to reduce terminal noise

    res.json({
      success: true,
      count: activeCount
    });
  } catch (error) {
    console.error('Error in GET /subscriber-count:', error);
    res.status(500).json({ 
      success: false, 
      error: 'An unexpected error occurred' 
    });
  }
});

// POST send message to all subscribers
router.post('/subscription-message/send-to-all', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    const { data: adminUser, error: adminError } = await supabase
      .from('adminUser')
      .select('role')
      .eq('user_id', req.user.id)
      .single();

    if (adminError || !adminUser || adminUser.role !== 'Admin') {
      return res.status(403).json({ 
        success: false,
        error: 'Access denied. Only Admins can send messages to subscribers.' 
      });
    }

    // Get subscription message
    const { data: settingsData, error: settingsError } = await supabase
      .from('app_settings')
      .select('subscription_message')
      .eq('setting_key', 'subscription_message')
      .single();

    if (settingsError || !settingsData?.subscription_message) {
      return res.status(400).json({ 
        success: false, 
        error: 'No subscription message found. Please save a message first.' 
      });
    }

    const customMessage = settingsData.subscription_message;

    // Get all active subscribers
    const { data: subscribers, error: subscribersError } = await supabase
      .from('newsletter_subscribers')
      .select('email')
      .eq('is_active', true);

    if (subscribersError) {
      console.error('Error fetching subscribers:', subscribersError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch subscribers' 
      });
    }

    if (!subscribers || subscribers.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No active subscribers found' 
      });
    }

    // Send emails directly using local email service
    const webAppUrl = process.env.WEB_APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://izaj-lighting-centre.netlify.app';
    const results = [];
    const errors = [];

    // Removed verbose log to reduce terminal noise

    for (const subscriber of subscribers) {
      try {
        const normalizedEmail = subscriber.email.toLowerCase().trim();
        await emailService.sendSubscriptionMessage(normalizedEmail, customMessage, webAppUrl);
        results.push({ email: normalizedEmail, success: true });
      } catch (error) {
        console.error(`Failed to send email to ${subscriber.email}:`, error);
        errors.push({ 
          email: subscriber.email, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    const successful = results.length;
    const failed = errors.length;

    // Removed verbose log to reduce terminal noise

    if (successful === 0) {
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to send all emails',
        details: errors
      });
    }

    res.json({
      success: true,
      message: `Message sent to ${successful} subscriber(s)`,
      count: successful,
      stats: {
        total: subscribers.length,
        successful: successful,
        failed: failed
      },
      errors: failed > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Error in POST /send-to-all:', error);
    res.status(500).json({ 
      success: false, 
      error: 'An unexpected error occurred' 
    });
  }
});

export default router;

