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
  PASSWORD_RESET_COMPLETE: 'PASSWORD_RESET_COMPLETE'
};

export async function logAuditEvent(userId, action, details, req) {
  try {
    const { data: user } = await supabase
      .from('adminUser')
      .select('name')
      .eq('user_id', userId)
      .single();

    const ip =
      req.headers['x-forwarded-for']?.split(',').shift() ||
      req.socket?.remoteAddress ||
      null;

    const { error } = await supabase
      .from('audit_logs') 
      .insert([{
        user_id: userId,
        user_name: user?.name || 'unknown',
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