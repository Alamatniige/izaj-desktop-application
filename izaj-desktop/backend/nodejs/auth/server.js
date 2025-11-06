import express from 'express';
import { supabase } from '../supabaseClient.js';
import authenticate from '../util/middlerware.js';
import { logAuditEvent, AuditActions } from '../util/auditLogger.js';
import sessionHandler from '../sessionHandler.js';


const router = express.Router();

// POST /api/admin/login - Admin user login with email and password
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      await logAuditEvent(null, AuditActions.LOGIN, {
        email,
        success: false,
        error: error.message
      }, req);
      
      return res.status(401).json({ error: error.message });
    }

    // Enforce email confirmation before allowing login (using service key requires manual check)
    if (!data?.user?.email_confirmed_at) {
      await logAuditEvent(null, AuditActions.LOGIN, {
        email,
        success: false,
        error: 'Email not confirmed'
      }, req);

      return res.status(403).json({ error: 'Please confirm your email before logging in.' });
    }

    await logAuditEvent(data.user.id, AuditActions.LOGIN, {
      email,
      success: true
    }, req);

    await sessionHandler.saveAdminSession(data.session);
    res.json({ 
      message: 'Login successful', 
      user: data.user, 
      session: data.session 
    });
  } catch (err) {
    console.error('Internal error:', err);
    return res.status(500).json({ 
      error: 'Request timed out or something went wrong', 
      details: err.message 
    });
  }
});

// POST /api/admin/logout - Log out current admin user and clear session
router.post('/logout', authenticate, async (req, res) => {
  try {
    await logAuditEvent(req.user.id, AuditActions.LOGOUT, {
      success: true
    }, req);

    const result = await sessionHandler.logoutAdmin();
    if (result.error) {
      console.error("Logout Error:", result.error);
      return res.status(500).json({ 
        error: 'Logout failed',
        details: result.error
      });
    }
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('Internal error during logout:', err);
    res.status(500).json({ 
      error: 'Request timed out or something went wrong',
      details: err.message 
    });
  }
});

// POST /api/admin/forgot-password - Send password reset email
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Send password reset email using Supabase
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      // Use custom desktop deep link scheme handled by Tauri
      redirectTo: 'izaj://update-password',
    });

    if (error) {
      await logAuditEvent(null, AuditActions.PASSWORD_RESET_REQUEST, {
        email,
        success: false,
        error: error.message
      }, req);
      
      return res.status(400).json({ error: error.message });
    }

    await logAuditEvent(null, AuditActions.PASSWORD_RESET_REQUEST, {
      email,
      success: true
    }, req);

    res.json({ 
      message: 'Password reset email sent successfully',
      success: true 
    });
  } catch (err) {
    console.error('Internal error during password reset:', err);
    return res.status(500).json({ 
      error: 'Request timed out or something went wrong',
      details: err.message 
    });
  }
});

// POST /api/admin/update-password - Update password with token
router.post('/update-password', async (req, res) => {
  const { password, access_token, refresh_token } = req.body;

  try {
    if (!password || !access_token || !refresh_token) {
      return res.status(400).json({ error: 'Password and tokens are required' });
    }

    // Update password using Supabase
    const { data, error } = await supabase.auth.updateUser({
      password: password
    });

    if (error) {
      await logAuditEvent(null, AuditActions.PASSWORD_RESET_COMPLETE, {
        success: false,
        error: error.message
      }, req);
      
      return res.status(400).json({ error: error.message });
    }

    await logAuditEvent(data.user?.id, AuditActions.PASSWORD_RESET_COMPLETE, {
      success: true
    }, req);

    res.json({ 
      message: 'Password updated successfully',
      success: true 
    });
  } catch (err) {
    console.error('Internal error during password update:', err);
    return res.status(500).json({ 
      error: 'Request timed out or something went wrong',
      details: err.message 
    });
  }
});

export default router;