export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: boolean;
}

export interface Users {
    id: string;
    user_id: string;
    user_name: string;
    action: string;
    details: string;
    created_at: Date;
    ip_address: string;
    user_agent: string;
}

export interface CustomerAccount {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'blocked';
  lastLogin: string;
}

export interface AuditLog {
  ip_address?: string;
  id: string;
  userId: string;
  userName: string;
  action: string;
  created_at: Date;
  details: string;
}

export interface SettingsState {
  general: {
    websiteName: string;
    logo: string;
    favicon: string;
    timezone: string;
    language: string;
    currency: string;
    storeAddress: string;
  };
  userManagement: {
    adminUsers: AdminUser[];
    customerAccounts: CustomerAccount[];
  };
  auditLogs: AuditLog[];
}