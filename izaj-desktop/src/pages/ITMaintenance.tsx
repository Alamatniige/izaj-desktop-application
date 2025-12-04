import React, { useState, useEffect, useCallback } from 'react';
import { Icon } from '@iconify/react';
import { Session } from '@supabase/supabase-js';
import API_URL from '../../config/api';
import { AdminUser } from '../types/index';
import { toast } from 'react-hot-toast';

interface ITMaintenanceProps {
  session: Session | null;
  handleNavigation: (page: string) => void;
  onMaintenanceToggle?: (newStatus: boolean) => void;
}

const ITMaintenance: React.FC<ITMaintenanceProps> = ({ session, onMaintenanceToggle }) => {
  const [activeTab, setActiveTab] = useState('system'); // 'system' | 'users'
  
  // Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem('darkMode');
      return savedMode === 'true' || document.documentElement.classList.contains('dark');
    }
    return false;
  });

  // System State
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [isLoadingMaintenance, setIsLoadingMaintenance] = useState(false);
  
  // Backup State
  const [isBackingUp, setIsBackingUp] = useState(false);

  // User Management State
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [isAddAdminModalOpen, setIsAddAdminModalOpen] = useState(false);
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);
  const [newAdmin, setNewAdmin] = useState({
    email: '',
    name: '',
    is_super_admin: false,
    assigned_categories: [] as string[],
    assigned_branches: [] as string[]
  });

  const [availableBranches, setAvailableBranches] = useState<string[]>([]);
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    action: 'edit' | 'delete' | null;
    user: AdminUser | null;
    newStatus?: boolean;
  }>({ open: false, action: null, user: null });
  const [maintenanceModal, setMaintenanceModal] = useState<{
    open: boolean;
    newStatus: boolean;
  }>({ open: false, newStatus: false });

  // Fetch Maintenance Status
  const fetchMaintenanceStatus = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/maintenance/status`, {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      const result = await response.json();
      if (result.success) {
        setIsMaintenanceMode(result.maintenance);
      }
    } catch (error) {
      console.error('Failed to fetch maintenance status:', error);
    }
  }, [session?.access_token]);

  // Toggle Maintenance Mode
  const toggleMaintenance = async (newStatus: boolean) => {
    setIsLoadingMaintenance(true);
    try {
      const response = await fetch(`${API_URL}/api/maintenance/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ maintenance: newStatus }),
      });
      const result = await response.json();
      if (result.success) {
        setIsMaintenanceMode(newStatus);
        toast.success(result.message);
        // Notify parent component about maintenance status change
        if (onMaintenanceToggle) {
          onMaintenanceToggle(newStatus);
        }
      } else {
        toast.error(result.error || 'Failed to toggle maintenance mode');
      }
    } catch (error) {
      toast.error('Error connecting to server: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsLoadingMaintenance(false);
      setMaintenanceModal({ open: false, newStatus: false });
    }
  };

  // Backup Data
  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      const response = await fetch(`${API_URL}/api/backup/export`, {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      const result = await response.json();
      if (result.success) {
        const dataStr = JSON.stringify(result.data, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `orders_backup_${new Date().toISOString().split('T')[0]}.json`;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        const summary = result.summary || {};
        toast.success(
          `Backup downloaded successfully!\n` +
          `Orders: ${summary.totalOrders || 0} | Order Items: ${summary.totalOrderItems || 0}\n` +
          `Paid: ${summary.paidOrders || 0} | Pending: ${summary.pendingPayments || 0}`,
          { duration: 5000 }
        );
      } else {
        toast.error(result.error || 'Backup failed');
      }
    } catch (error) {
      toast.error('Backup failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsBackingUp(false);
    }
  };

  // Restore Data (Placeholder)
  const handleRestore = async () => {
     alert('Restore functionality is disabled for safety. Please contact database administrator for manual restore.');
  };

  // Fetch Admin Users
  const fetchAdminUsers = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/users`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const result = await response.json();
      if (result.success) {
        setAdminUsers(result.users.map((user: any) => ({
          id: user.user_id, // Backend returns user_id
          name: user.name,
          email: user.email,
          role: user.role || 'Admin',
          status: user.status === true,
          is_super_admin: user.is_super_admin || false,
          assigned_categories: user.assigned_categories || [],
          assigned_branches: user.assigned_branches || [],
        })));
      }
    } catch (error) {
      console.error('Failed to fetch admin users: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }, [session?.access_token]);

  // Fetch available categories
  const fetchCategories = useCallback(async () => {
    if (!session?.access_token) return;
    try {
      const response = await fetch(`${API_URL}/api/admin/categories`, {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });
      const result = await response.json();
      if (result.success) {
        (result.categories || []);
      }
    } catch {
      console.error('Failed to fetch categories');
    }
  }, [session?.access_token]);

  // Fetch available branches
  const fetchBranches = useCallback(async () => {
    if (!session?.access_token) return;
    try {
      const response = await fetch(`${API_URL}/api/admin/branches`, {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });
      const result = await response.json();
      if (result.success) {
        setAvailableBranches(result.branches || []);
      }
    } catch (error) {
      console.error('Failed to fetch branches:', error);
    }
  }, [session?.access_token]);

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingAdmin(true);
    try {
      const response = await fetch(`${API_URL}/api/admin/addUsers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          email: newAdmin.email,
          name: newAdmin.name,
          role: 'Admin',
          is_super_admin: true,
          assigned_categories: [],
          assigned_branches: newAdmin.assigned_branches,
        }),
      });
      const result = await response.json();
      if (result.success) {
        toast.success('Admin user added successfully');
        fetchAdminUsers();
        setIsAddAdminModalOpen(false);
        setNewAdmin({ email: '', name: '', is_super_admin: false, assigned_categories: [], assigned_branches: [] });
      } else {
        toast.error(result.error || 'Failed to add user');
      }
    } catch {
      toast.error('Error adding user');
    } finally {
      setIsAddingAdmin(false);
    }
  };

  const handleEditStatus = async (userId: string, newStatus: boolean) => {
     try {
      const response = await fetch(`${API_URL}/api/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      const result = await response.json();
      if (result.success) {
        toast.success('Status updated');
        fetchAdminUsers();
      } else {
        toast.error(result.error || 'Failed to update status');
      }
    } catch {
      toast.error('Error updating status');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const result = await response.json();
      if (result.success) {
        toast.success('User deleted');
        fetchAdminUsers();
      } else {
        toast.error(result.error || 'Failed to delete user');
      }
    } catch {
      toast.error('Error deleting user');
    }
  };

  // Dark Mode Toggle
  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    }
  };

  useEffect(() => {
    if (session?.access_token) {
      fetchMaintenanceStatus();
      fetchAdminUsers();
      fetchCategories();
      fetchBranches();
    }
  }, [session, fetchMaintenanceStatus, fetchAdminUsers, fetchCategories, fetchBranches]);

  return (
    <div className="flex-1 h-screen overflow-hidden flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="px-8 pt-6">
        <div className="bg-gradient-to-r from-white via-gray-50 to-white dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 rounded-2xl p-6 mb-6 border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                <Icon icon="mdi:shield-account" className="text-2xl text-white" />
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-800 dark:text-gray-100" style={{ fontFamily: "'Jost', sans-serif" }}>IT Maintenance Panel</h1>
                <p className="text-gray-600 dark:text-gray-400 text-base" style={{ fontFamily: "'Jost', sans-serif" }}>System Control & User Management</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Dark Mode Toggle */}
              <button
                onClick={toggleDarkMode}
                className="p-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-amber-900/20 border border-gray-200 dark:border-slate-700 shadow-md hover:shadow-lg transition-all duration-300 relative group"
                title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                <Icon 
                  icon={isDarkMode ? "mdi:weather-sunny" : "mdi:weather-night"} 
                  className="w-6 h-6 text-gray-700 dark:text-amber-300 group-hover:text-gray-900 dark:group-hover:text-amber-200 transition-colors duration-300" 
                />
              </button>

              <button
                onClick={() => {
                   fetch(`${API_URL}/api/admin/logout`, {
                      method: 'POST',
                      headers: {
                          'Authorization': `Bearer ${session?.access_token || ''}`,
                          'Content-Type': 'application/json',
                      },
                   }).then(() => {
                       window.location.href = '/';
                   });
                }}
                className="p-3 rounded-xl bg-red-500 hover:bg-red-600 text-white shadow-md hover:shadow-lg transition-all duration-300 group"
                title="Log Out"
              >
                <Icon icon="mdi:logout" className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-8">
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('system')}
            className={`py-3 px-6 font-medium text-sm rounded-xl transition-all ${
              activeTab === 'system'
                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30'
                : 'bg-white dark:bg-gray-800 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 border border-gray-200 dark:border-gray-700 hover:shadow-md'
            }`}
            style={{ fontFamily: "'Jost', sans-serif" }}
          >
            <div className="flex items-center gap-2">
              <Icon icon="mdi:server-network" className="w-5 h-5" />
              System Control
            </div>
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`py-3 px-6 font-medium text-sm rounded-xl transition-all ${
              activeTab === 'users'
                ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg shadow-purple-500/30'
                : 'bg-white dark:bg-gray-800 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 border border-gray-200 dark:border-gray-700 hover:shadow-md'
            }`}
            style={{ fontFamily: "'Jost', sans-serif" }}
          >
            <div className="flex items-center gap-2">
              <Icon icon="mdi:account-group" className="w-5 h-5" />
              User Management
            </div>
          </button>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-8 pb-8">
        <div className="max-w-7xl mx-auto space-y-8">
            {activeTab === 'system' && (
                <div className="space-y-8">
                    {/* Maintenance Mode Card */}
                    <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-slate-700 dark:to-slate-800 rounded-2xl shadow-lg border border-orange-100 dark:border-slate-600 p-6 transition-all duration-200 hover:scale-[1.01] hover:shadow-2xl hover:border-orange-200 dark:hover:border-slate-500">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-orange-500 rounded-xl shadow-lg">
                                    <Icon icon="mdi:traffic-cone" className="text-2xl text-white" />
                                </div>
                                <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>
                                    Maintenance Mode
                                </h2>
                            </div>
                            <div className={`px-4 py-2 rounded-full text-sm font-semibold shadow-md ${isMaintenanceMode ? 'bg-orange-500 text-white' : 'bg-green-500 text-white'}`} style={{ fontFamily: "'Jost', sans-serif" }}>
                                {isMaintenanceMode ? 'ACTIVE' : 'INACTIVE'}
                            </div>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 mb-6" style={{ fontFamily: "'Jost', sans-serif" }}>
                            When enabled, the system will be in maintenance mode. Regular users might be restricted from accessing the application.
                        </p>
                        <button
                            onClick={() => setMaintenanceModal({ open: true, newStatus: !isMaintenanceMode })}
                            disabled={isLoadingMaintenance}
                            className={`w-full py-3 rounded-xl font-bold transition-all shadow-lg hover:shadow-2xl flex items-center justify-center gap-2 ${
                                isMaintenanceMode 
                                ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white' 
                                : 'bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white'
                            }`}
                            style={{ fontFamily: "'Jost', sans-serif" }}
                        >
                            {isLoadingMaintenance ? (
                                <Icon icon="mdi:loading" className="animate-spin w-6 h-6" />
                            ) : (
                                <Icon icon={isMaintenanceMode ? "mdi:check-circle" : "mdi:alert-circle"} className="w-6 h-6" />
                            )}
                            {isMaintenanceMode ? 'Disable Maintenance Mode' : 'Enable Maintenance Mode'}
                        </button>
                    </div>

                    {/* Backup & Restore Card */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-700 dark:to-slate-800 rounded-2xl shadow-lg border border-blue-100 dark:border-slate-600 p-6 transition-all duration-200 hover:scale-[1.01] hover:shadow-2xl hover:border-blue-200 dark:hover:border-slate-500">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-blue-500 rounded-xl shadow-lg">
                                <Icon icon="mdi:database" className="text-2xl text-white" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>
                                Orders & Payment Backup
                            </h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white dark:bg-slate-700 rounded-xl shadow-md p-6 border border-gray-100 dark:border-slate-600 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg">
                                <div className="flex items-center gap-2 mb-3">
                                    <Icon icon="mdi:download" className="text-blue-500 w-6 h-6" />
                                    <h3 className="font-semibold text-lg text-gray-800 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>Export Data</h3>
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4" style={{ fontFamily: "'Jost', sans-serif" }}>Download all orders, order items, and payment information as JSON backup.</p>
                                <button 
                                    onClick={handleBackup}
                                    disabled={isBackingUp}
                                    className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
                                    style={{ fontFamily: "'Jost', sans-serif" }}
                                >
                                    {isBackingUp ? <Icon icon="mdi:loading" className="animate-spin" /> : <Icon icon="mdi:download" />}
                                    Download Backup
                                </button>
                            </div>
                            <div className="bg-white dark:bg-slate-700 rounded-xl shadow-md p-6 border border-gray-100 dark:border-slate-600 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg">
                                <div className="flex items-center gap-2 mb-3">
                                    <Icon icon="mdi:upload" className="text-gray-500 w-6 h-6" />
                                    <h3 className="font-semibold text-lg text-gray-800 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>Import Data</h3>
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4" style={{ fontFamily: "'Jost', sans-serif" }}>Restore system data from a backup file.</p>
                                <button 
                                    onClick={handleRestore}
                                    className="w-full py-3 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg"
                                    style={{ fontFamily: "'Jost', sans-serif" }}
                                >
                                    <Icon icon="mdi:upload" />
                                    Restore Backup
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'users' && (
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-slate-700 dark:to-slate-800 rounded-2xl shadow-lg border border-purple-100 dark:border-slate-600 overflow-hidden transition-all duration-200 hover:shadow-2xl">
                    <div className="p-6 flex justify-between items-center border-b border-purple-100 dark:border-slate-600 bg-white/50 dark:bg-slate-800/50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg">
                                <Icon icon="mdi:account-tie" className="text-2xl text-white" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>
                                Admin Users
                            </h2>
                        </div>
                        <button 
                            onClick={() => setIsAddAdminModalOpen(true)}
                            className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center gap-2 font-medium"
                            style={{ fontFamily: "'Jost', sans-serif" }}
                        >
                            <Icon icon="mdi:plus" className="w-5 h-5" />
                            Add User
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                         <table className="min-w-full divide-y divide-purple-100 dark:divide-slate-600">
                            <thead className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-slate-800 dark:to-slate-700">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider" style={{ fontFamily: "'Jost', sans-serif" }}>Name</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider" style={{ fontFamily: "'Jost', sans-serif" }}>Email</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider" style={{ fontFamily: "'Jost', sans-serif" }}>Type</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider" style={{ fontFamily: "'Jost', sans-serif" }}>Assignments</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider" style={{ fontFamily: "'Jost', sans-serif" }}>Status</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider" style={{ fontFamily: "'Jost', sans-serif" }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-slate-800 divide-y divide-purple-100 dark:divide-slate-700">
                                {adminUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-purple-50 dark:hover:bg-slate-700/50 transition-all duration-150">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>{user.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-slate-400" style={{ fontFamily: "'Jost', sans-serif" }}>{user.email}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {user.is_super_admin ? (
                                                <span className="px-3 py-1.5 inline-flex text-xs leading-5 font-semibold rounded-lg bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 text-purple-800 dark:text-purple-300 shadow-sm" style={{ fontFamily: "'Jost', sans-serif" }}>
                                                    Manager
                                                </span>
                                            ) : (
                                                <span className="px-3 py-1.5 inline-flex text-xs leading-5 font-semibold rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-slate-200 shadow-sm" style={{ fontFamily: "'Jost', sans-serif" }}>
                                                    Product Manager
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {user.is_super_admin ? (
                                                <span className="text-xs text-gray-500 dark:text-slate-400" style={{ fontFamily: "'Jost', sans-serif" }}>All access</span>
                                            ) : (
                                                <div className="text-xs text-gray-700 dark:text-slate-300" style={{ fontFamily: "'Jost', sans-serif" }}>
                                                    {user.assigned_branches && user.assigned_branches.length > 0 && (
                                                        <div>
                                                            <span className="font-semibold">Branches:</span> {user.assigned_branches.join(', ')}
                                                        </div>
                                                    )}
                                                    {(!user.assigned_branches || user.assigned_branches.length === 0) && (
                                                        <span className="text-gray-400 dark:text-slate-500">No assignments</span>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-3 py-1.5 inline-flex text-xs leading-5 font-semibold rounded-lg shadow-sm ${user.status ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'}`} style={{ fontFamily: "'Jost', sans-serif" }}>
                                                {user.status ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setConfirmModal({ open: true, action: 'edit', user, newStatus: !user.status })}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm hover:shadow-md ${
                                                        user.status
                                                            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50'
                                                            : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50'
                                                    }`}
                                                    style={{ fontFamily: "'Jost', sans-serif" }}
                                                >
                                                    {user.status ? 'Deactivate' : 'Activate'}
                                                </button>
                                                <button
                                                    onClick={() => setConfirmModal({ open: true, action: 'delete', user })}
                                                    className="px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50 rounded-lg text-xs font-semibold transition-all shadow-sm hover:shadow-md"
                                                    style={{ fontFamily: "'Jost', sans-serif" }}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
      </main>

      {/* Add User Modal */}
       {isAddAdminModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-gradient-to-br from-white to-gray-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden border border-purple-200 dark:border-slate-700 animate-slideUp">
                <div className="p-6 border-b border-purple-100 dark:border-slate-700 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-slate-800 dark:to-slate-700">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg">
                                <Icon icon="mdi:account-plus" className="text-xl text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>Add New Admin</h3>
                        </div>
                        <button
                            onClick={() => setIsAddAdminModalOpen(false)}
                            className="p-2 hover:bg-white/50 dark:hover:bg-slate-700 rounded-lg transition-all"
                        >
                            <Icon icon="mdi:close" className="w-5 h-5 text-gray-500 dark:text-slate-400" />
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-6">
                    <form onSubmit={handleAddAdmin} className="space-y-5">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2" style={{ fontFamily: "'Jost', sans-serif" }}>Name</label>
                        <input 
                            type="text" 
                            required
                            value={newAdmin.name}
                            onChange={e => setNewAdmin({...newAdmin, name: e.target.value})}
                            className="w-full border-2 border-gray-200 dark:border-slate-600 rounded-xl px-4 py-2.5 dark:bg-slate-700 dark:text-white focus:border-purple-500 dark:focus:border-purple-400 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-900/30 transition-all"
                            style={{ fontFamily: "'Jost', sans-serif" }}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2" style={{ fontFamily: "'Jost', sans-serif" }}>Email</label>
                        <input 
                            type="email" 
                            required
                            value={newAdmin.email}
                            onChange={e => setNewAdmin({...newAdmin, email: e.target.value})}
                            className="w-full border-2 border-gray-200 dark:border-slate-600 rounded-xl px-4 py-2.5 dark:bg-slate-700 dark:text-white focus:border-purple-500 dark:focus:border-purple-400 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-900/30 transition-all"
                            style={{ fontFamily: "'Jost', sans-serif" }}
                        />
                    </div>
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300" style={{ fontFamily: "'Jost', sans-serif" }}>Assigned Branches</label>
                            {newAdmin.assigned_branches.length > 0 && (
                                <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-1 rounded-full font-semibold" style={{ fontFamily: "'Jost', sans-serif" }}>
                                    {newAdmin.assigned_branches.length} selected
                                </span>
                            )}
                        </div>
                        <div className="border-2 border-gray-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 max-h-40 overflow-y-auto p-3">
                            {availableBranches.length > 0 ? (
                                <div className="space-y-2">
                                    {availableBranches.map(branch => (
                                        <label
                                            key={branch}
                                            className="flex items-center gap-2 p-2 rounded-lg hover:bg-purple-50 dark:hover:bg-slate-600 cursor-pointer transition-colors"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={newAdmin.assigned_branches.includes(branch)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setNewAdmin({
                                                            ...newAdmin,
                                                            assigned_branches: [...newAdmin.assigned_branches, branch]
                                                        });
                                                    } else {
                                                        setNewAdmin({
                                                            ...newAdmin,
                                                            assigned_branches: newAdmin.assigned_branches.filter(b => b !== branch)
                                                        });
                                                    }
                                                }}
                                                className="rounded text-purple-600 focus:ring-purple-500"
                                            />
                                            <span className="text-sm text-gray-700 dark:text-slate-300" style={{ fontFamily: "'Jost', sans-serif" }}>{branch}</span>
                                        </label>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500 dark:text-slate-400 text-center py-2" style={{ fontFamily: "'Jost', sans-serif" }}>No branches available</p>
                            )}
                        </div>
                    </div>
                    </form>
                </div>
                <div className="flex justify-end gap-3 p-6 border-t border-purple-100 dark:border-slate-700 bg-gradient-to-r from-purple-50/50 to-pink-50/50 dark:from-slate-800/50 dark:to-slate-700/50">
                    <button 
                        type="button"
                        onClick={() => setIsAddAdminModalOpen(false)}
                        className="px-5 py-2.5 text-gray-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all font-medium shadow-sm"
                        style={{ fontFamily: "'Jost', sans-serif" }}
                    >
                        Cancel
                    </button>
                    <button 
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            handleAddAdmin(e as any);
                        }}
                        disabled={isAddingAdmin}
                        className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white rounded-xl disabled:opacity-50 flex items-center gap-2 font-medium shadow-lg hover:shadow-xl transition-all"
                        style={{ fontFamily: "'Jost', sans-serif" }}
                    >
                        {isAddingAdmin ? (
                            <>
                                <Icon icon="mdi:loading" className="animate-spin" />
                                Adding...
                            </>
                        ) : (
                            <>
                                <Icon icon="mdi:check" />
                                Add User
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
       )}

      {/* Confirmation Modal */}
      {confirmModal.open && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
              <div className="bg-gradient-to-br from-white to-gray-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-gray-200 dark:border-slate-700 animate-slideUp">
                  <div className="flex items-center gap-3 mb-3">
                      <div className={`p-2 rounded-xl shadow-lg ${confirmModal.action === 'delete' ? 'bg-gradient-to-br from-red-500 to-red-600' : 'bg-gradient-to-br from-blue-500 to-indigo-600'}`}>
                          <Icon icon={confirmModal.action === 'delete' ? "mdi:delete-alert" : "mdi:alert-circle"} className="text-2xl text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>Confirm Action</h3>
                  </div>
                  <p className="text-gray-600 dark:text-slate-300 mb-6 ml-14" style={{ fontFamily: "'Jost', sans-serif" }}>
                      {confirmModal.action === 'delete' 
                          ? `Are you sure you want to delete ${confirmModal.user?.name}? This action cannot be undone.` 
                          : `${confirmModal.newStatus ? 'Activate' : 'Deactivate'} user ${confirmModal.user?.name}?`}
                  </p>
                  <div className="flex justify-end gap-3">
                       <button 
                            onClick={() => setConfirmModal({ open: false, action: null, user: null })}
                            className="px-5 py-2.5 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-all font-medium shadow-sm"
                            style={{ fontFamily: "'Jost', sans-serif" }}
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={() => {
                                if (confirmModal.action === 'delete') handleDeleteUser(confirmModal.user!.id);
                                else handleEditStatus(confirmModal.user!.id, confirmModal.newStatus!);
                                setConfirmModal({ open: false, action: null, user: null });
                            }}
                            className={`px-5 py-2.5 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all ${confirmModal.action === 'delete' ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700' : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700'}`}
                            style={{ fontFamily: "'Jost', sans-serif" }}
                        >
                            Confirm
                        </button>
                  </div>
              </div>
          </div>
      )}

      {/* Maintenance Mode Confirmation Modal */}
      {maintenanceModal.open && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
              <div className="bg-gradient-to-br from-white to-gray-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-6 border border-gray-200 dark:border-slate-700 animate-slideUp">
                  <div className="flex items-center gap-3 mb-4">
                      <div className={`p-3 rounded-xl shadow-lg ${maintenanceModal.newStatus ? 'bg-gradient-to-br from-orange-500 to-red-600' : 'bg-gradient-to-br from-green-500 to-emerald-600'}`}>
                          <Icon icon={maintenanceModal.newStatus ? "mdi:alert-octagon" : "mdi:check-circle"} className="text-3xl text-white" />
                      </div>
                      <div>
                          <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100" style={{ fontFamily: "'Jost', sans-serif" }}>
                              {maintenanceModal.newStatus ? 'Enable Maintenance Mode?' : 'Disable Maintenance Mode?'}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-slate-400" style={{ fontFamily: "'Jost', sans-serif" }}>
                              Confirm your action
                          </p>
                      </div>
                  </div>
                  
                  <div className={`p-4 rounded-xl mb-6 ${maintenanceModal.newStatus ? 'bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-200 dark:border-orange-800' : 'bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800'}`}>
                      <div className="flex items-start gap-3">
                          <Icon icon="mdi:information" className={`w-5 h-5 mt-0.5 ${maintenanceModal.newStatus ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`} />
                          <div className="flex-1">
                              <p className={`text-sm font-medium mb-2 ${maintenanceModal.newStatus ? 'text-orange-900 dark:text-orange-200' : 'text-green-900 dark:text-green-200'}`} style={{ fontFamily: "'Jost', sans-serif" }}>
                                  {maintenanceModal.newStatus ? 'Warning: This will affect all users' : 'This will restore normal operations'}
                              </p>
                              <p className={`text-xs ${maintenanceModal.newStatus ? 'text-orange-700 dark:text-orange-300' : 'text-green-700 dark:text-green-300'}`} style={{ fontFamily: "'Jost', sans-serif" }}>
                                  {maintenanceModal.newStatus 
                                      ? 'When enabled, the system will be in maintenance mode. Regular users might be restricted from accessing the application.' 
                                      : 'Users will be able to access the system normally once maintenance mode is disabled.'}
                              </p>
                          </div>
                      </div>
                  </div>

                  <p className="text-gray-600 dark:text-slate-300 mb-6 text-center font-medium" style={{ fontFamily: "'Jost', sans-serif" }}>
                      Are you sure you want to {maintenanceModal.newStatus ? 'enable' : 'disable'} maintenance mode?
                  </p>

                  <div className="flex gap-3">
                       <button 
                            onClick={() => setMaintenanceModal({ open: false, newStatus: false })}
                            disabled={isLoadingMaintenance}
                            className="flex-1 px-5 py-3 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-all font-semibold shadow-sm border-2 border-gray-200 dark:border-slate-600"
                            style={{ fontFamily: "'Jost', sans-serif" }}
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={() => toggleMaintenance(maintenanceModal.newStatus)}
                            disabled={isLoadingMaintenance}
                            className={`flex-1 px-5 py-3 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${maintenanceModal.newStatus ? 'bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700' : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'}`}
                            style={{ fontFamily: "'Jost', sans-serif" }}
                        >
                            {isLoadingMaintenance ? (
                                <>
                                    <Icon icon="mdi:loading" className="animate-spin w-5 h-5" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <Icon icon="mdi:check-bold" className="w-5 h-5" />
                                    Yes, {maintenanceModal.newStatus ? 'Enable' : 'Disable'}
                                </>
                            )}
                        </button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default ITMaintenance;

