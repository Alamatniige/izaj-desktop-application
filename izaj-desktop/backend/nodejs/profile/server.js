import express from 'express';
import { logAuditEvent, AuditActions } from '../util/auditLogger.js';
import authenticate from '../util/middlerware.js';
import { supabase } from '../supabaseClient.js';

const router = express.Router();

// Helper function: Generate avatar URL with fallback to default profile image
const generateAvatarUrl = (avatarPath) => {
  if (!avatarPath) {
    return '/profile.jpg';
  }

  try {
    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(avatarPath);
    
    return `${data.publicUrl}?t=${Date.now()}`;
  } catch (error) {
    console.error("Error generating avatar URL:", error);
    return '/profile.jpg';
  }
};

// PUT /api/profile/:userId - Update user profile (name, phone, address, password, avatar)
router.put('/profile/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, phone, address, password, avatar } = req.body;

    if (!userId) {
      return res.status(400).json({ 
        error: 'User ID is required' 
      });
    }

    if (req.user.id !== userId) {
      return res.status(403).json({ 
        error: 'Access denied. You can only update your own profile.' 
      });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ 
        error: 'Name is required' 
      });
    }

    let cleanAvatarPath = null;
    if (avatar) {
      cleanAvatarPath = avatar.replace(/^https?:\/\/[^/]+\/storage\/v1\/object\/public\/avatars\//, '');
    }

    const { data: updatedUser, error: updateError } = await supabase
      .from('adminUser')
      .update({
        name,
        contact: phone || null,
        address: address || null,
        avatar: cleanAvatarPath,
        last_login: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating profile:", updateError);
      return res.status(500).json({ 
        error: 'Failed to update profile',
        details: updateError.message 
      });
    }

    if (!updatedUser) {
      return res.status(404).json({ 
        error: 'No rows were updated' 
      });
    }

    let passwordUpdated = false;
    if (password && password.trim()) {
      if (password.length < 6) {
        return res.status(400).json({ 
          error: 'Password must be at least 6 characters long' 
        });
      }

      const { error: passwordError } = await supabase.auth.admin.updateUserById(
        userId,
        { password }
      );

      if (passwordError) {
        console.error("Error updating password:", passwordError);
        console.warn("Password update failed, but profile was updated successfully");
      } else {
        passwordUpdated = true;
      }
    }

    await logAuditEvent(userId, AuditActions.UPDATE_PROFILE, {
      fieldsUpdated: {
        name: !!name,
        phone: !!phone,
        address: !!address,
        avatar: !!avatar,
        password: passwordUpdated
      },
      success: true
    }, req);

    let avatarUrl = generateAvatarUrl(updatedUser.avatar);

    const profileData = {
      name: updatedUser.name || '',
      email: req.user.email || '',
      phone: updatedUser.contact || '',
      role: updatedUser.role || '',
      address: updatedUser.address || '',
      avatar: avatarUrl,
      userId: updatedUser.user_id
    };

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      profile: profileData
    });

  } catch (error) {
    console.error("Server error in profile update:", error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// GET /api/profile/:userId - Get user profile by user ID
router.get('/profile/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ 
        error: 'User ID is required' 
      });
    }

    if (req.user.id !== userId) {
      return res.status(403).json({ 
        error: 'Access denied. You can only view your own profile.' 
      });
    }

    const { data: adminUser, error: adminError } = await supabase
      .from('adminUser')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (adminError) {
      console.error("Supabase error:", adminError);
      
      if (adminError.code === 'PGRST116') {
        return res.status(404).json({ 
          error: 'User profile not found' 
        });
      }
      
      return res.status(500).json({ 
        error: 'Database error occurred',
        details: adminError.message 
      });
    }

    if (!adminUser) {
      return res.status(404).json({ 
        error: 'User profile not found' 
      });
    }

    const userEmail = req.user.email || '';
    let avatarUrl = generateAvatarUrl(adminUser.avatar);

    const profileData = {
      name: adminUser.name || '',
      email: userEmail,
      phone: adminUser.contact || '',
      role: adminUser.role || '',
      address: adminUser.address || '',
      avatar: avatarUrl,
      userId: adminUser.user_id
    };

    res.status(200).json({
      success: true,
      profile: profileData
    });

  } catch (error) {
    console.error("Server error in profile fetch:", error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// GET /api/profile - Get current user's profile (without userId in URL)
router.get('/profile', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const { data: adminUser, error: adminError } = await supabase
      .from('adminUser')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (adminError) {
      console.error("Supabase error:", adminError);
      
      if (adminError.code === 'PGRST116') {
        return res.status(404).json({ 
          error: 'User profile not found' 
        });
      }
      
      return res.status(500).json({ 
        error: 'Database error occurred',
        details: adminError.message 
      });
    }

    if (!adminUser) {
      return res.status(404).json({ 
        error: 'User profile not found' 
      });
    }

    const profileData = {
      name: adminUser.name || '',
      email: req.user.email || '',
      phone: adminUser.contact || '',
      role: adminUser.role || '',
      address: adminUser.address || '',
      avatar: '/profile.jpg',
      userId: adminUser.user_id
    };

    res.status(200).json({
      success: true,
      profile: profileData
    });

  } catch (error) {
    console.error("Server error in profile fetch:", error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});


export default router;