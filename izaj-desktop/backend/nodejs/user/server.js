import express from 'express';
import { supabase } from '../supabaseClient.js';
import authenticate from '../util/middlerware.js';
import { logAuditEvent, AuditActions } from '../util/auditLogger.js';
import { isSuperAdmin } from '../util/adminContext.js';

const router = express.Router();


// POST - Create new admin desktop side user (SuperAdmin only)
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
    const { data, error } = await supabase.auth.signUp({
      email,
      password: defaultPassword,
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

    // Also set user_type in profiles table to 'admin'
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({ 
        id: userId, 
        name, 
        user_type: 'admin',
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (profileError) {
      console.error('Error setting admin user_type in profiles:', profileError);
      // Don't fail the request, just log the error
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

export default router;