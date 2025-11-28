import express from 'express';
import crypto from 'crypto';
import { supabase } from '../supabaseClient.js';
import authenticate from '../util/middlerware.js';
import { logAuditEvent, AuditActions } from '../util/auditLogger.js';
import { isSuperAdmin } from '../util/adminContext.js';
import { emailService } from '../util/emailService.js';

const router = express.Router();

router.post('/addUsers', authenticate, async (req, res) => {
  try {
    // Check if requester is SuperAdmin
    const requesterIsSuperAdmin = await isSuperAdmin(req.user.id);
    if (!requesterIsSuperAdmin) {
      return res.status(403).json({ error: 'Access denied. Only SuperAdmin can add users.' });
    }

    const { email, name, role, is_super_admin, assigned_categories, assigned_branches } = req.body;

    if (!email || !name || !role) {
      return res.status(400).json({ error: 'Email, name, and role are required' });
    }

    const allowedRoles = ['Admin', 'Customer Support'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ error: 'Role must be Admin or Customer Support' });
    }

    // If user is SuperAdmin, categories and branches are optional
    const isSuperAdminUser = is_super_admin === true;
    
    const defaultPassword = 'admin1234';
    
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: defaultPassword,
      email_confirm: true, // User is confirmed immediately
    });

    if (error) {
      await logAuditEvent(req.user.id, AuditActions.CREATE_USER, {
        targetUser: { email, name, role, is_super_admin: isSuperAdminUser },
        success: false,
        error: error.message
      }, req);
      
      return res.status(400).json({ error: error.message });
    }

    const userId = data.user.id;

    // Generate invite token and expiration (7 days from now)
    const inviteToken = crypto.randomBytes(32).toString('hex');
    const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    
    // Prepare adminUser data
    const adminUserData = {
      user_id: userId,
      name,
      role,
      is_super_admin: isSuperAdminUser || false
    };

    // Only add categories/branches if not SuperAdmin
    if (!isSuperAdminUser) {
      if (assigned_categories && Array.isArray(assigned_categories)) {
        adminUserData.assigned_categories = assigned_categories;
      }
      if (assigned_branches && Array.isArray(assigned_branches)) {
        adminUserData.assigned_branches = assigned_branches;
      }
    }

    adminUserData.status = false;
    
    const { error: dbError } = await supabase
      .from('adminUser')
      .insert([adminUserData]);

    if (dbError) {
      await logAuditEvent(req.user.id, AuditActions.CREATE_USER, {
        targetUser: { email, name, role, is_super_admin: isSuperAdminUser },
        success: false,
        error: dbError.message
      }, req);
      
      return res.status(500).json({ error: dbError.message });
    }

    // Store invite token in admin_invites table
    const { error: inviteDbError } = await supabase
      .from('admin_invites')
      .insert([{
        user_id: userId,
        email,
        token: inviteToken,
        expires_at: inviteExpiresAt
      }]);

    if (inviteDbError) {
      console.error('❌ [Invite] Failed to store invite token:', inviteDbError.message);
      return res.status(500).json({ error: 'Failed to create invite token' });
    }

    try {
      await new Promise(resolve => setTimeout(resolve, 100));

      const { error: profileDeleteError, data: deletedProfiles } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId)
        .select();

      if (profileDeleteError) {
        console.error(`❌ [Admin User] Failed to delete profile for admin user ${userId}:`, profileDeleteError.message);
        // Try one more time after a short delay
        await new Promise(resolve => setTimeout(resolve, 200));
        const { error: retryError } = await supabase
          .from('profiles')
          .delete()
          .eq('id', userId);
        
        if (retryError) {
          console.error(`❌ [Admin User] Retry also failed for ${userId}:`, retryError.message);
        } else {
          console.log(`✅ [Admin User] Successfully deleted profile on retry for admin user ${userId}`);
        }
      } else {
        const deletedCount = deletedProfiles ? deletedProfiles.length : 0;
        if (deletedCount > 0) {
          console.log(`✅ [Admin User] Cleaned up ${deletedCount} profile entry/entries for admin user ${userId}`);
        } else {
          console.log(`ℹ️ [Admin User] No profile entry found for admin user ${userId} (already clean)`);
        }
      }

      // Also try to delete from user_profiles table if it exists (might be a view/alias)
      try {
        const { error: userProfilesDeleteError } = await supabase
          .from('user_profiles')
          .delete()
          .eq('id', userId);

        if (userProfilesDeleteError && !userProfilesDeleteError.message.includes('does not exist')) {
          console.warn(`⚠️ [Admin User] Could not delete from user_profiles for ${userId}:`, userProfilesDeleteError.message);
        }
      } catch (userProfilesErr) {
        // Non-fatal: user_profiles might not exist or might be a view
        console.log(`ℹ️ [Admin User] user_profiles cleanup skipped for ${userId}`);
      }

      // Final verification: Check if profile still exists
      const { data: remainingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (!checkError && remainingProfile) {
        console.error(`❌ [Admin User] WARNING: Profile still exists for admin user ${userId} after cleanup attempt!`);
        // Try one final deletion
        await supabase
          .from('profiles')
          .delete()
          .eq('id', userId);
      } else {
        console.log(`✅ [Admin User] Verified: No profile entry exists for admin user ${userId}`);
      }
    } catch (cleanupError) {
      console.error(`❌ [Admin User] Exception during profile cleanup for ${userId}:`, cleanupError);
      // Non-fatal error, but log it for monitoring
    }

    // Send invitation email via SendGrid (using EmailService)
    let inviteEmailSent = false;
    try {
      // Determine the redirect URL based on environment
      // For development, use localhost. For production, use the production URL
      const isDevelopment = process.env.NODE_ENV !== 'production';
      const baseRedirectUrl = isDevelopment 
        ? 'http://localhost:3000/accept-invite'
        : (process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/accept-invite` : 'http://localhost:3000/accept-invite');

      const inviteUrl = `${baseRedirectUrl}?token=${inviteToken}`;
      
      console.log(`📧 [Invite] Sending invite (SendGrid) to ${email} with invite URL: ${inviteUrl}`);
      
      const subject = 'You have been invited to IZAJ Admin';

      const html = `
        <p>Hi ${name || ''},</p>
        <p>You have been invited to access the IZAJ Admin panel${role ? ` as <strong>${role}</strong>` : ''}.</p>
        <p>Please click the button below to activate your account and open the app:</p>
        <p>
          <a href="${inviteUrl}" style="display:inline-block;padding:10px 20px;background-color:#000;color:#fff;text-decoration:none;border-radius:4px;">
            Accept Invite
          </a>
        </p>
        <p>If the button does not work, copy and paste this link into your browser:</p>
        <p><a href="${inviteUrl}">${inviteUrl}</a></p>
        <p>Thank you,<br/>IZAJ Trading</p>
      `;

      const text = `Hi ${name || ''},

You have been invited to access the IZAJ Admin panel${role ? ` as ${role}` : ''}.

Please open this link to activate your account and open the app:
${inviteUrl}

Thank you,
IZAJ Trading`;

      await emailService.sendEmail({
        to: email,
        subject,
        html,
        text,
      });

      inviteEmailSent = true;
      console.log(`✅ [Invite] Invite email sent successfully via SendGrid to ${email}`);
    } catch (inviteEx) {
      console.error('❌ [Invite] Exception sending invite email via SendGrid:', inviteEx);
    }

    await logAuditEvent(req.user.id, AuditActions.CREATE_USER, {
      targetUser: { 
        id: userId, 
        email, 
        name, 
        role,
        is_super_admin: isSuperAdminUser
      },
      success: true,
      meta: {
        inviteEmailSent
      }
    }, req);

    res.status(201).json({
      success: true,
      message: inviteEmailSent
        ? 'User created. Confirmation email sent via SendGrid.'
        : 'User created. Failed to send confirmation email via SendGrid. You can resend the invite later.',
      inviteEmailSent,
      user: { id: userId, email, name, role, is_super_admin: isSuperAdminUser }
    });
  } catch (error) {
    console.error('Error creating admin user:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// GET - Get list of all admin desktop side users (SuperAdmin only)
router.get('/users', authenticate, async (req, res) => {
  try {
    // Check if requester is SuperAdmin
    const requesterIsSuperAdmin = await isSuperAdmin(req.user.id);
    if (!requesterIsSuperAdmin) {
      return res.status(403).json({ 
        error: 'Access denied. Only SuperAdmin can view all users.' 
      });
    }

    const { data: users, error } = await supabase
      .from('adminUser')
      .select('*');

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const usersWithEmail = [];
    
    for (const user of users || []) {
      try {
        const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(user.user_id);
        
        if (!authError && authUser?.user?.email) {
          usersWithEmail.push({
            ...user,
            email: authUser.user.email,
          });
        } else {
          usersWithEmail.push({
            ...user,
            email: 'Email not available',
          });
        }
      } catch (emailError) {
        console.warn(`Exception getting email for user ${user.user_id}:`, emailError);
        usersWithEmail.push({
          ...user,
          email: 'Email error',
        });
      }
    }

    res.status(200).json({ 
      success: true, 
      users: usersWithEmail,
      debug: {
        totalUsers: usersWithEmail.length
      }
    });
    
  } catch (error) {
    console.error('Error fetching admin users:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
});

// PUT - Enable/disable user account (SuperAdmin only)
router.put('/users/:id/status', authenticate, async (req, res) => {
  try {
    // Check if requester is SuperAdmin
    const requesterIsSuperAdmin = await isSuperAdmin(req.user.id);
    if (!requesterIsSuperAdmin) {
      return res.status(403).json({ error: 'Access denied. Only SuperAdmin can edit users.' });
    }

    const { status } = req.body;
    const { id } = req.params;

    if (typeof status !== 'boolean') {
      return res.status(400).json({ error: 'Status must be a boolean.' });
    }

    const { data: targetUser } = await supabase
      .from('adminUser')
      .select('name, role')
      .eq('user_id', id)
      .single();

    const { error: updateError } = await supabase
      .from('adminUser')
      .update({ status })
      .eq('user_id', id);

    if (updateError) {
      await logAuditEvent(req.user.id, AuditActions.UPDATE_STATUS, {
        targetUser: {
          id,
          name: targetUser?.name,
          role: targetUser?.role
        },
        newStatus: status,
        success: false,
        error: updateError.message
      }, req);
      
      return res.status(500).json({ error: updateError.message });
    }

    await logAuditEvent(req.user.id, AuditActions.UPDATE_STATUS, {
      targetUser: {
        id,
        name: targetUser?.name,
        role: targetUser?.role
      },
      newStatus: status,
      success: true
    }, req);

    res.json({ success: true, message: 'User status updated.' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// DELETE - Delete user account (SuperAdmin only)
router.delete('/users/:id', authenticate, async (req, res) => {
  try {
    // Check if requester is SuperAdmin
    const requesterIsSuperAdmin = await isSuperAdmin(req.user.id);
    if (!requesterIsSuperAdmin) {
      return res.status(403).json({ error: 'Access denied. Only SuperAdmin can delete users.' });
    }

    const { id } = req.params;

    const { data: targetUser } = await supabase
      .from('adminUser')
      .select('name, role')
      .eq('user_id', id)
      .single();

    const { error: deleteError } = await supabase
      .from('adminUser')
      .delete()
      .eq('user_id', id);

    if (deleteError) {
      await logAuditEvent(req.user.id, AuditActions.DELETE_USER, {
        targetUser: {
          id,
          name: targetUser?.name,
          role: targetUser?.role
        },
        success: false,
        error: deleteError.message
      }, req);
      
      return res.status(500).json({ error: deleteError.message });
    }

    await logAuditEvent(req.user.id, AuditActions.DELETE_USER, {
      targetUser: {
        id,
        name: targetUser?.name,
        role: targetUser?.role
      },
      success: true
    }, req);

    res.json({ success: true, message: 'User deleted.' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// POST - Accept invite using custom token (no authentication required)
router.post('/accept-invite', async (req, res) => {
  try {
    const { token } = req.body || {};

    if (!token) {
      return res.status(400).json({ success: false, error: 'Missing invite token' });
    }

    // Look up invite by token
    const { data: invite, error: inviteError } = await supabase
      .from('admin_invites')
      .select('id, user_id, email, expires_at, used_at')
      .eq('token', token)
      .maybeSingle();

    if (inviteError) {
      console.error('❌ [Accept Invite] Error fetching invite:', inviteError.message);
      return res.status(500).json({ success: false, error: 'Failed to lookup invite token' });
    }

    if (!invite) {
      return res.status(400).json({ success: false, error: 'Invalid invite token' });
    }

    // Check if already used
    if (invite.used_at) {
      return res.status(400).json({ success: false, error: 'Invite link has already been used' });
    }

    // Check expiration
    if (invite.expires_at) {
      const now = new Date();
      const expiresAt = new Date(invite.expires_at);
      if (expiresAt < now) {
        return res.status(400).json({ success: false, error: 'Invite link has expired' });
      }
    }

    // Activate admin user account
    const { error: updateError } = await supabase
      .from('adminUser')
      .update({ status: true })
      .eq('user_id', invite.user_id);

    if (updateError) {
      console.error('❌ [Accept Invite] Failed to activate admin user:', updateError.message);
      return res.status(500).json({ success: false, error: 'Failed to activate user account' });
    }

    try {
      await supabase.auth.admin.updateUserById(invite.user_id, {
        email_confirmed_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('❌ [Accept Invite] Failed to confirm email:', error.message);
    }

    // Mark invite as used (non-fatal if this fails)
    const usedAt = new Date().toISOString();
    const { error: markUsedError } = await supabase
      .from('admin_invites')
      .update({ used_at: usedAt })
      .eq('id', invite.id);

    if (markUsedError) {
      console.warn('⚠️ [Accept Invite] Failed to mark invite as used:', markUsedError.message);
    }

    return res.json({
      success: true,
      message: 'Invite accepted. You can now log in.',
      user_id: invite.user_id,
      email: invite.email,
    });
  } catch (error) {
    console.error('❌ [Accept Invite] Unexpected error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error', details: error.message });
  }
});

// GET - Get admin assignments (categories and branches)
router.get('/users/:id/assignments', authenticate, async (req, res) => {
  try {
    // Check if requester is SuperAdmin
    const requesterIsSuperAdmin = await isSuperAdmin(req.user.id);
    if (!requesterIsSuperAdmin) {
      return res.status(403).json({ error: 'Access denied. Only SuperAdmin can view assignments.' });
    }

    const { id } = req.params;

    const { data: adminUser, error } = await supabase
      .from('adminUser')
      .select('assigned_categories, assigned_branches, is_super_admin')
      .eq('user_id', id)
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!adminUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      assignments: {
        assigned_categories: adminUser.assigned_categories || [],
        assigned_branches: adminUser.assigned_branches || [],
        is_super_admin: adminUser.is_super_admin || false
      }
    });
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// PUT - Update admin assignments (categories and branches)
router.put('/users/:id/assignments', authenticate, async (req, res) => {
  try {
    // Check if requester is SuperAdmin
    const requesterIsSuperAdmin = await isSuperAdmin(req.user.id);
    if (!requesterIsSuperAdmin) {
      return res.status(403).json({ error: 'Access denied. Only SuperAdmin can update assignments.' });
    }

    const { id } = req.params;
    const { assigned_categories, assigned_branches, is_super_admin } = req.body;

    // Check if target user exists
    const { data: targetUser, error: fetchError } = await supabase
      .from('adminUser')
      .select('user_id, name')
      .eq('user_id', id)
      .single();

    if (fetchError || !targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updateData = {};

    // Update SuperAdmin status if provided
    if (typeof is_super_admin === 'boolean') {
      updateData.is_super_admin = is_super_admin;
      // If setting as SuperAdmin, clear categories/branches
      if (is_super_admin) {
        updateData.assigned_categories = null;
        updateData.assigned_branches = null;
      }
    }

    // Only update categories/branches if not SuperAdmin
    if (!is_super_admin) {
      if (Array.isArray(assigned_categories)) {
        updateData.assigned_categories = assigned_categories;
      }
      if (Array.isArray(assigned_branches)) {
        updateData.assigned_branches = assigned_branches;
      }
    }

    const { error: updateError } = await supabase
      .from('adminUser')
      .update(updateData)
      .eq('user_id', id);

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    await logAuditEvent(req.user.id, AuditActions.UPDATE_USER, {
      targetUser: {
        id,
        name: targetUser.name
      },
      assignments: updateData,
      success: true
    }, req);

    res.json({
      success: true,
      message: 'Assignments updated successfully'
    });
  } catch (error) {
    console.error('Error updating assignments:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// POST - Activate user when they accept invite (no auth required, uses user_id from client)
router.post('/activate-invite', async (req, res) => {
  try {
    const { user_id } = req.body || {};

    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    // Check if user exists in adminUser table
    const { data: adminUser, error: fetchError } = await supabase
      .from('adminUser')
      .select('user_id, name, role, status')
      .eq('user_id', user_id)
      .single();

    if (fetchError || !adminUser) {
      console.error('Admin user not found:', fetchError?.message);
      return res.status(404).json({ error: 'User not found. Please contact administrator.' });
    }

    // Update status to true (active) if not already active
    if (adminUser.status !== true) {
      const { error: updateError } = await supabase
        .from('adminUser')
        .update({ status: true })
        .eq('user_id', user_id);

      if (updateError) {
        console.error('Error updating user status:', updateError.message);
        return res.status(500).json({ error: 'Failed to activate account. Please contact administrator.' });
      }

      console.log(`✅ User ${adminUser.name} (${user_id}) activated after accepting invite`);
    }

    // ALSO confirm the Supabase auth email, similar to other flows
    try {
      const nowIso = new Date().toISOString();
      const { error: confirmError } = await supabase.auth.admin.updateUserById(user_id, {
        email_confirmed_at: nowIso,
      });

      if (confirmError) {
        console.error('❌ [Activate Invite] Failed to confirm email in Supabase auth:', confirmError.message || confirmError);
        // Do not fail the whole request; account is already activated in adminUser
      } else {
        console.log(`✅ [Activate Invite] Email confirmed in Supabase auth for user ${user_id}`);
      }
    } catch (confirmEx) {
      console.error('❌ [Activate Invite] Exception while confirming email in Supabase auth:', confirmEx);
      // Non-fatal: keep activation success
    }

    res.json({ 
      success: true, 
      message: 'Account activated successfully',
      user: {
        id: user_id,
        name: adminUser.name,
        role: adminUser.role
      }
    });
  } catch (error) {
    console.error('Error activating invite:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// GET - Get current user's admin context (for frontend)
router.get('/me', authenticate, async (req, res) => {
  try {
    // Removed verbose log to reduce terminal noise
    
    const { data: adminUser, error } = await supabase
      .from('adminUser')
      .select('is_super_admin, assigned_categories, assigned_branches, role')
      .eq('user_id', req.user.id)
      .single();

    if (error) {
      console.error('❌ [Admin Context] Error fetching admin user:', error);
      return res.status(500).json({ error: error.message });
    }

    if (!adminUser) {
      // Only log warnings in development
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ [Admin Context] Admin user not found for user:', req.user.id);
      }
      return res.status(404).json({ error: 'Admin user not found' });
    }

    // Explicitly check for true value (handle null, undefined, false)
    const isSuperAdmin = adminUser.is_super_admin === true;
    
    // Removed verbose success log to reduce terminal noise

    res.json({
      success: true,
      is_super_admin: isSuperAdmin,
      assigned_categories: adminUser.assigned_categories || [],
      assigned_branches: adminUser.assigned_branches || [],
      role: adminUser.role
    });
  } catch (error) {
    console.error('❌ [Admin Context] Exception:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// POST - Cleanup: Remove admin users from profiles table (SuperAdmin only)
router.post('/cleanup-profiles', authenticate, async (req, res) => {
  try {
    // Check if requester is SuperAdmin
    const requesterIsSuperAdmin = await isSuperAdmin(req.user.id);
    if (!requesterIsSuperAdmin) {
      return res.status(403).json({ error: 'Access denied. Only SuperAdmin can cleanup profiles.' });
    }

    // Get all admin user IDs
    const { data: adminUsers, error: adminUsersError } = await supabase
      .from('adminUser')
      .select('user_id');

    if (adminUsersError) {
      return res.status(500).json({ error: `Failed to fetch admin users: ${adminUsersError.message}` });
    }

    if (!adminUsers || adminUsers.length === 0) {
      return res.json({
        success: true,
        message: 'No admin users found. Nothing to cleanup.',
        deleted: 0
      });
    }

    const adminUserIds = adminUsers.map(admin => admin.user_id);
    
    // Delete profiles for all admin users from 'profiles' table
    const { data: deletedProfiles, error: deleteError } = await supabase
      .from('profiles')
      .delete()
      .in('id', adminUserIds)
      .select();

    if (deleteError) {
      console.error('Error deleting admin user profiles:', deleteError);
      return res.status(500).json({ error: `Failed to delete profiles: ${deleteError.message}` });
    }

    const deletedCount = deletedProfiles ? deletedProfiles.length : 0;

    // Also try to delete from 'user_profiles' table if it exists (might be a view/alias)
    try {
      const { error: userProfilesDeleteError } = await supabase
        .from('user_profiles')
        .delete()
        .in('id', adminUserIds);

      if (userProfilesDeleteError) {
        // Non-fatal: user_profiles might not exist or might be a view
        console.log('Note: Could not delete from user_profiles (might be a view or not exist)');
      }
    } catch (err) {
      // Non-fatal error
      console.log('Note: user_profiles cleanup skipped');
    }

    await logAuditEvent(req.user.id, AuditActions.DELETE_USER, {
      action: 'cleanup_profiles',
      adminUserIds: adminUserIds,
      deletedCount: deletedCount,
      success: true
    }, req);

    res.json({
      success: true,
      message: `Successfully removed ${deletedCount} admin user profile(s) from profiles table.`,
      deleted: deletedCount,
      adminUserIds: adminUserIds
    });
  } catch (error) {
    console.error('Error cleaning up admin user profiles:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

export default router;