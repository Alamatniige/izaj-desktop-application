import express from 'express';
import { supabase } from '../supabaseClient.js';
import authenticate from '../util/middlerware.js';
import { logAuditEvent, AuditActions } from '../util/auditLogger.js';
import { isSuperAdmin } from '../util/adminContext.js';

const router = express.Router();


// POST - Create new admin desktop side user (SuperAdmin only)
// IMPORTANT: Admin users are ONLY stored in adminUser table, NOT in profiles table
// Any profile entries that might be auto-created by database triggers are immediately deleted
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
    
    // Use admin.createUser instead of signUp to ensure the user is immediately
    // available in auth.users for the foreign key constraint
    // email_confirm: false means they still need to confirm their email before logging in
    // NOTE: This might trigger a database function that auto-creates a profile entry,
    // but we will immediately delete it to ensure admin users only exist in adminUser table
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: defaultPassword,
      email_confirm: false, // User must confirm email before first login
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

    // Insert into adminUser table
    // The user_id references auth.users(id) which was created by admin.createUser above
    // admin.createUser ensures the user is immediately available in auth.users
    // Set initial status to false (inactive) - will be set to true when user accepts invite
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

    // CRITICAL: Clean up any profile entry that might have been auto-created for this admin user
    // Admin users should ONLY exist in adminUser table, NOT in profiles table
    // This prevents admin users from being counted as customers in dashboard stats
    try {
      // Wait a brief moment in case there's a database trigger that creates the profile asynchronously
      await new Promise(resolve => setTimeout(resolve, 100));

      // Delete from profiles table
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

    // Send invitation email via Supabase (uses your configured SMTP — set Gmail in Supabase Auth settings)
    try {
      // Determine the redirect URL based on environment
      // For development, use localhost. For production, use the production URL
      const isDevelopment = process.env.NODE_ENV !== 'production';
      const redirectUrl = isDevelopment 
        ? 'http://localhost:3000/accept-invite'
        : (process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/accept-invite` : 'http://localhost:3000/accept-invite');
      
      console.log(`📧 [Invite] Sending invite to ${email} with redirect URL: ${redirectUrl}`);
      console.log(`📧 [Invite] IMPORTANT: Make sure "${redirectUrl}" is added to Supabase Dashboard > Authentication > URL Configuration > Redirect URLs`);
      console.log(`📧 [Invite] Also check: Site URL should be set to your frontend URL (e.g., http://localhost:3000)`);
      
      // Use data parameter to get the invite link if needed
      const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
        redirectTo: redirectUrl,
        data: {
          redirect_url: redirectUrl // Additional data that might be used
        }
      });
      
      if (inviteError) {
        // Non-fatal: user is created; frontend can offer manual resend later
        console.error('❌ [Invite] Failed to send invite email:', inviteError.message);
        console.error('❌ [Invite] Error details:', JSON.stringify(inviteError, null, 2));
      } else {
        console.log(`✅ [Invite] Invite email sent successfully to ${email}`);
        if (inviteData) {
          console.log(`📧 [Invite] Invite data:`, JSON.stringify(inviteData, null, 2));
        }
      }
    } catch (inviteEx) {
      console.error('❌ [Invite] Exception sending invite email:', inviteEx);
    }

    await logAuditEvent(req.user.id, AuditActions.CREATE_USER, {
      targetUser: { 
        id: userId, 
        email, 
        name, 
        role,
        is_super_admin: isSuperAdminUser
      },
      success: true
    }, req);

    res.status(201).json({
      success: true,
      message: 'User created. Confirmation email sent.',
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

// POST - Activate user when they accept invite (no auth required, uses tokens from invite)
router.post('/activate-invite', async (req, res) => {
  try {
    const { access_token, refresh_token } = req.body;

    if (!access_token || !refresh_token) {
      return res.status(400).json({ error: 'Access token and refresh token are required' });
    }

    // Set session using the tokens from invite
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token: access_token,
      refresh_token: refresh_token
    });

    if (sessionError || !sessionData.session) {
      console.error('Invalid invite tokens:', sessionError?.message);
      return res.status(400).json({ 
        error: sessionError?.message || 'Invalid or expired invite tokens. Please request a new invitation.' 
      });
    }

    const userId = sessionData.session.user.id;

    // Check if user exists in adminUser table
    const { data: adminUser, error: fetchError } = await supabase
      .from('adminUser')
      .select('user_id, name, role, status')
      .eq('user_id', userId)
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
        .eq('user_id', userId);

      if (updateError) {
        console.error('Error updating user status:', updateError.message);
        return res.status(500).json({ error: 'Failed to activate account. Please contact administrator.' });
      }

      console.log(`✅ User ${adminUser.name} (${userId}) activated after accepting invite`);
    }

    res.json({ 
      success: true, 
      message: 'Account activated successfully',
      user: {
        id: userId,
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