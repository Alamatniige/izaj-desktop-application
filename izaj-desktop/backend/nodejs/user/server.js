import express from 'express';
import { supabase } from '../supabaseClient.js';
import authenticate from '../util/middlerware.js';
import { logAuditEvent, AuditActions } from '../util/auditLogger.js';

const router = express.Router();


// POST - Create new admin desktop side user (Admin role required)
router.post('/addUsers', authenticate, async (req, res) => {
  try {
    const { data: adminUser, error: adminError } = await supabase
      .from('adminUser')
      .select('role')
      .eq('user_id', req.user.id)
      .single();

    if (adminError || !adminUser || adminUser.role !== 'Admin') {
      return res.status(403).json({ error: 'Access denied. Only Admins can add users.' });
    }

    const { email, name, role } = req.body;

    if (!email || !name || !role) {
      return res.status(400).json({ error: 'Email, name, and role are required' });
    }

    const allowedRoles = ['Admin', 'Customer Support'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ error: 'Role must be Admin or Customer Support' });
    }

    const defaultPassword = 'admin1234';
    const { data, error } = await supabase.auth.signUp({
      email,
      password: defaultPassword,
    });

    if (error) {
      await logAuditEvent(req.user.id, AuditActions.CREATE_USER, {
        targetUser: { email, name, role },
        success: false,
        error: error.message
      }, req);
      
      return res.status(400).json({ error: error.message });
    }

    const userId = data.user.id;
    const { error: dbError } = await supabase
      .from('adminUser')
      .insert([{ user_id: userId, name, role }]);

    if (dbError) {
      await logAuditEvent(req.user.id, AuditActions.CREATE_USER, {
        targetUser: { email, name, role },
        success: false,
        error: dbError.message
      }, req);
      
      return res.status(500).json({ error: dbError.message });
    }

    await logAuditEvent(req.user.id, AuditActions.CREATE_USER, {
      targetUser: { 
        id: userId, 
        email, 
        name, 
        role 
      },
      success: true
    }, req);

    res.status(201).json({
      success: true,
      message: 'User created. Confirmation email sent.',
      user: { id: userId, email, name, role }
    });
  } catch (error) {
    console.error('Error creating admin user:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// GET - Get list of all admin desktop side users (Admin role required)
router.get('/users', authenticate, async (req, res) => {
  try {
    const { data: adminUser, error: adminError } = await supabase
      .from('adminUser')
      .select('*')
      .eq('user_id', req.user.id)
      .single();

    if (adminError) {
      return res.status(500).json({ 
        error: 'Database error while checking admin status',
        details: adminError.message 
      });
    }

    if (!adminUser) {
      return res.status(404).json({ 
        error: 'Admin user profile not found. Please contact system administrator.' 
      });
    }

    if (adminUser.role !== 'Admin') {
      return res.status(403).json({ 
        error: `Access denied. Your role is '${adminUser.role}' but only 'Admin' users can view all users.` 
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
        currentUserRole: adminUser.role,
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

// PUT - Enable/disable user account (Admin role required)
router.put('/users/:id/status', authenticate, async (req, res) => {
  try {
    const { data: adminUser, error: adminError } = await supabase
      .from('adminUser')
      .select('role')
      .eq('user_id', req.user.id)
      .single();

    if (adminError || !adminUser || adminUser.role !== 'Admin') {
      return res.status(403).json({ error: 'Access denied. Only Admins can edit users.' });
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

// DELETE - Delete user account (Admin role required)
router.delete('/users/:id', authenticate, async (req, res) => {
  try {
    const { data: adminUser, error: adminError } = await supabase
      .from('adminUser')
      .select('role')
      .eq('user_id', req.user.id)
      .single();

    if (adminError || !adminUser || adminUser.role !== 'Admin') {
      return res.status(403).json({ error: 'Access denied. Only Admins can delete users.' });
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

export default router;