import { supabase } from '../supabaseClient.js';

/**
 * Get admin context including SuperAdmin status, assigned categories, and branches
 * @param {string} userId - The user ID to fetch context for
 * @returns {Promise<{isSuperAdmin: boolean, assignedCategories: string[], assignedBranches: string[], role: string}>}
 */
export async function getAdminContext(userId) {
  try {
    console.log('🔍 [AdminContext] Fetching context for user:', userId);
    
    const { data: adminUser, error } = await supabase
      .from('adminUser')
      .select('is_super_admin, assigned_categories, assigned_branches, role')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('❌ [AdminContext] Error fetching admin user:', error);
      // Return default context if not found
      return {
        isSuperAdmin: false,
        assignedCategories: [],
        assignedBranches: [],
        role: null
      };
    }

    if (!adminUser) {
      console.warn('⚠️ [AdminContext] Admin user not found for user:', userId);
      return {
        isSuperAdmin: false,
        assignedCategories: [],
        assignedBranches: [],
        role: null
      };
    }

    const isSuperAdmin = adminUser.is_super_admin === true;
    
    console.log('✅ [AdminContext] Admin user found:', {
      userId,
      is_super_admin: adminUser.is_super_admin,
      isSuperAdmin: isSuperAdmin,
      hasCategories: !!adminUser.assigned_categories,
      categoriesCount: adminUser.assigned_categories?.length || 0,
      hasBranches: !!adminUser.assigned_branches,
      branchesCount: adminUser.assigned_branches?.length || 0,
      role: adminUser.role
    });

    return {
      isSuperAdmin: isSuperAdmin,
      assignedCategories: adminUser.assigned_categories || [],
      assignedBranches: adminUser.assigned_branches || [],
      role: adminUser.role || null
    };
  } catch (error) {
    console.error('❌ [AdminContext] Exception:', error);
    return {
      isSuperAdmin: false,
      assignedCategories: [],
      assignedBranches: [],
      role: null
    };
  }
}

/**
 * Get admin categories for filtering
 * @param {string} userId - The user ID
 * @returns {Promise<string[]>}
 */
export async function getAdminCategories(userId) {
  const context = await getAdminContext(userId);
  return context.assignedCategories;
}

/**
 * Get admin branches for filtering
 * @param {string} userId - The user ID
 * @returns {Promise<string[]>}
 */
export async function getAdminBranches(userId) {
  const context = await getAdminContext(userId);
  return context.assignedBranches;
}

/**
 * Check if user is SuperAdmin
 * @param {string} userId - The user ID
 * @returns {Promise<boolean>}
 */
export async function isSuperAdmin(userId) {
  const context = await getAdminContext(userId);
  return context.isSuperAdmin;
}

