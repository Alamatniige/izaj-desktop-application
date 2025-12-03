import { supabase } from '../supabaseClient.js';

export const AuditActions = {
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  CREATE_USER: 'CREATE_USER',
  UPDATE_USER: 'UPDATE_USER',
  DELETE_USER: 'DELETE_USER',
  UPDATE_STATUS: 'UPDATE_STATUS',
  UPDATE_PROFILE: 'UPDATE_PROFILE',
  VIEW_PROFILE: 'VIEW_PROFILE',
  VIEW_USERS: 'VIEW_USERS',
  VIEW_AUDIT_LOGS: 'VIEW_AUDIT_LOGS',
  VIEW_STOCK_SUMMARY: 'VIEW_STOCK_SUMMARY',
  PASSWORD_RESET_REQUEST: 'PASSWORD_RESET_REQUEST',
  PASSWORD_RESET_COMPLETE: 'PASSWORD_RESET_COMPLETE',
  VIEW_ORDERS: 'VIEW_ORDERS',
  VIEW_ORDER_DETAILS: 'VIEW_ORDER_DETAILS',
  UPDATE_ORDER_STATUS: 'UPDATE_ORDER_STATUS',
  UPDATE_PAYMENT_STATUS: 'UPDATE_PAYMENT_STATUS',
  APPROVE_ORDER: 'APPROVE_ORDER',
  CANCEL_ORDER: 'CANCEL_ORDER',
  MARK_ORDER_IN_TRANSIT: 'MARK_ORDER_IN_TRANSIT',
  MARK_ORDER_COMPLETE: 'MARK_ORDER_COMPLETE',
  BACKUP: 'BACKUP',
  RESTORE: 'RESTORE',
  SYSTEM_UPDATE: 'SYSTEM_UPDATE'
};

export async function logAuditEvent(userId, action, details, req) {
  try {
    let userName = 'unknown';

    // Check if it is the hidden IT Maintenance user (via req.user if available)
    if (req?.user?.user_metadata?.is_it_maintenance === true) {
        userName = 'IT Maintenance System';
    } else if (userId) {
        // Only query DB if not IT Maintenance
        const { data: user } = await supabase
        .from('adminUser')
        .select('name')
        .eq('user_id', userId)
        .single();
        
        if (user?.name) {
            userName = user.name;
        }
    }

    const ip =
      req.headers['x-forwarded-for']?.split(',').shift() ||
      req.socket?.remoteAddress ||
      null;

    const { error } = await supabase
      .from('audit_logs') 
      .insert([{
        user_id: userId,
        user_name: userName,
        action,
        details: details || null,
        ip_address: ip,
        user_agent: req?.headers?.['user-agent'] || null,
        created_at: new Date().toISOString()
      }]);

    if (error) {
      console.error('Audit log insertion error:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Audit log creation failed:', error);
    return false;
  }
}