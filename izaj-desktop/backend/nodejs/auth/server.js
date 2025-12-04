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
      // Check if user exists and account is deactivated, even when authentication fails
      try {
        // Use admin API to find user by email
        const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
        
        if (!listError && usersData?.users) {
          // Find user by email
          const foundUser = usersData.users.find(u => u.email === email);
          
          if (foundUser) {
            // Check if user is IT Maintenance (skip status check for them)
            const isITMaintenance = foundUser.user_metadata?.is_it_maintenance === true;
            
            if (!isITMaintenance) {
              // Check status in adminUser table
              const { data: adminUser, error: adminError } = await supabase
                .from('adminUser')
                .select('status')
                .eq('user_id', foundUser.id)
                .single();
              
              // If user exists in adminUser table and status is false, return deactivation message
              if (!adminError && adminUser && adminUser.status !== true) {
                await logAuditEvent(foundUser.id, AuditActions.LOGIN, {
                  email,
                  success: false,
                  error: 'Account deactivated'
                }, req);
                
                return res.status(403).json({ 
                  error: 'Your account is currently deactivated. Please contact your manager to activate your account.' 
                });
              }
            }
          }
        }
      } catch (checkError) {
        // If status check fails, fall back to generic error
        console.error('Error checking account status:', checkError);
      }
      
      // Default: return generic authentication error
      await logAuditEvent(null, AuditActions.LOGIN, {
        email,
        success: false,
        error: error.message
      }, req);
      
      return res.status(401).json({ error: error.message });
    }

    if (!data?.user?.email_confirmed_at) {
      await logAuditEvent(null, AuditActions.LOGIN, {
        email,
        success: false,
        error: 'Email not confirmed'
      }, req);

      return res.status(403).json({ error: 'Please confirm your email before logging in.' });
    }

    // Skip status check for IT MAINTENANCE account (check user_metadata)
    const isITMaintenance = data.user.user_metadata?.is_it_maintenance === true;
    
    if (!isITMaintenance) {
      // Check if the user is in adminUser table and if their status is active
      const { data: adminUser, error: adminError } = await supabase
        .from('adminUser')
        .select('status, is_super_admin, name')
        .eq('user_id', data.user.id)
        .single();

      if (adminError) {
        console.error('Error fetching admin user status:', adminError);
        await logAuditEvent(data.user.id, AuditActions.LOGIN, {
          email,
          success: false,
          error: 'Admin user not found'
        }, req);
        
        return res.status(403).json({ error: 'Admin user not found. Please contact administrator.' });
      }

      // Check if account is active (status must be true)
      if (adminUser.status !== true) {
        await logAuditEvent(data.user.id, AuditActions.LOGIN, {
          email,
          success: false,
          error: 'Account deactivated'
        }, req);
        
        return res.status(403).json({ error: 'Your account is currently deactivated. Please contact your manager to activate your account.' });
      }
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
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    // In development, use localhost with backend port (3001) since /update-password is served by backend
    // In production, use the production Railway URL
    const redirectUrl = process.env.PASSWORD_RESET_REDIRECT_URL 
      ? process.env.PASSWORD_RESET_REDIRECT_URL
      : (isDevelopment 
          ? 'http://localhost:3001/update-password'
          : (process.env.FRONTEND_URL || 'https://izaj-desktop-application-production.up.railway.app/update-password'));
    
    console.log(`[Password Reset] Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`[Password Reset] Redirect URL: ${redirectUrl}`);
    
    // Send password reset email using Supabase
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
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

    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token: access_token,
      refresh_token: refresh_token
    });

    if (sessionError || !sessionData.session) {
      await logAuditEvent(null, AuditActions.PASSWORD_RESET_COMPLETE, {
        success: false,
        error: sessionError?.message || 'Invalid or expired reset tokens'
      }, req);
      
      return res.status(400).json({ 
        error: sessionError?.message || 'Invalid or expired reset tokens. Please request a new password reset.' 
      });
    }

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