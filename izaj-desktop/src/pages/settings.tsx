import React, { useState, useEffect, useCallback } from "react";
import { Icon } from "@iconify/react";
import { Session } from "@supabase/supabase-js";
import API_URL from "../../config/api";
import { AdminUser,  SettingsState, Users } from "../types/index";
import * as XLSX from 'xlsx';

interface SettingsProps {
  handleNavigation?: (page: string) => void;
  session: Session | null;
}

const Settings: React.FC<SettingsProps> = ({ handleNavigation, session }) => {
  
  const [isMobileView, setIsMobileView] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [isAddAdminModalOpen, setIsAddAdminModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [downloadRange, setDownloadRange] = useState({ from: '', to: '' });

  const [newAdmin, setNewAdmin] = useState({
    email: '',
    name: '',
    role: ''
  });
  
  const [settings, setSettings] = useState<SettingsState>({
    general: {
      websiteName: "IZAJ Store",
      logo: "",
      favicon: "",
      timezone: "Asia/Manila",
      language: "English",
      currency: "PHP",
      storeAddress: "San Pablo",
    },
    userManagement: {
      adminUsers: [],
      customerAccounts: [],
    },
    auditLogs: [],
  });
  
  function formatDateForFileName(dateStr: string) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${mm}-${dd}-${yyyy}`;
  }

  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    action: 'edit' | 'delete' | null;
    user: AdminUser | null;
    newStatus?: boolean;
  }>({ open: false, action: null, user: null });

  // Wrap fetchAdminUsers in useCallback
  const fetchAdminUsers = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/users`, {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });
      const result = await response.json();
      if (result.success) {
        setSettings(prev => ({
          ...prev,
          userManagement: {
            ...prev.userManagement,
            adminUsers: result.users.map((user: AdminUser) => ({
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
              status: user.status === true ? 'active' : 'inactive',
            })),
          }
        }));
      }
    } catch (error) {
      console.error('Failed to fetch admin users:', error);
    }
  }, [session?.access_token]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 1024);
    };

    handleResize(); 
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!session?.access_token) return;
    fetchAdminUsers();
  }, [fetchAdminUsers, session]);

  const tabs = [
    { id: 'general', label: 'General', icon: 'mdi:cog' },
    { id: 'userManagement', label: 'User Management', icon: 'mdi:account-group' },
    { id: 'auditLogs', label: 'Audit Logs', icon: 'mdi:history' },
  ];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
  };

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
          role: newAdmin.role,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to add user');
      }

      const newAdminUser: AdminUser = {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
        status: true,
      };

      setSettings(prevSettings => ({
        ...prevSettings,
        userManagement: {
          ...prevSettings.userManagement,
          adminUsers: [...prevSettings.userManagement.adminUsers, newAdminUser],
        }
      }));

      setNewAdmin({ email: '', name: '', role: 'Customer Support' });
      setIsAddAdminModalOpen(false);
    } catch (error) {
      alert('Error adding admin: ' + (error as Error).message);
      console.error('Error adding admin:', error);
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
        await fetchAdminUsers();
      } else {
        alert(result.error || 'Failed to update status');
      }
    } catch (error) {
      alert(error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      const response = await fetch(`${API_URL}/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });
      const result = await response.json();
      if (result.success) {
        setSettings(prev => ({
          ...prev,
          userManagement: {
            ...prev.userManagement,
            adminUsers: prev.userManagement.adminUsers.filter(user => user.id !== userId),
          }
        }));
      } else {
        alert(result.error || 'Failed to delete user');
      }
    } catch (error) {
      alert(error);
    }
  };

  const handleDownloadAuditLogs = async (from: string, to: string) => {
    const params = new URLSearchParams();
    if (from) params.append("from", from);
    if (to) params.append("to", to);

    const response = await fetch(`${API_URL}/api/admin/export?${params.toString()}`, {
      headers: { Authorization: `Bearer ${session?.access_token}` }
    });
    const result = await response.json();
    if (!result.success) {
      alert("Failed to fetch audit logs");
      return;
    }

    const data = result.logs.map((log: Users) => ({
      Time: new Date(log.created_at).toLocaleString(),
      User: log.user_name,
      UserID: log.user_id ,
      Action: log.action,
      IP: log.ip_address || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Audit Logs");

    const fromStr = formatDateForFileName(from);
    const toStr = formatDateForFileName(to);
    const fileName = fromStr && toStr
      ? `Audit-Logs(${fromStr} - ${toStr}).xlsx`
      : "Audit-Logs.xlsx";

    XLSX.writeFile(workbook, fileName);
  };

  // Wrap fetchAuditLogs in useCallback
  const fetchAuditLogs = useCallback(async () => {
  try {
    const response = await fetch(`${API_URL}/api/admin/audit-logs`, {
      headers: {
        Authorization: `Bearer ${session?.access_token}`,
      },
    });
    
    const result = await response.json();
    
    if (result.success) {
      setSettings(prev => ({
        ...prev,
        auditLogs: result.logs.map((log: Users) => ({
          id: log.id,
          userId: log.user_id,
          userName: log.user_name,
          action: log.action,
          details: log.details,
          created_at: new Date(log.created_at),
          ip_address: log.ip_address,
          user_agent: log.user_agent
        }))
      }));
    } else {
      console.error('Failed to fetch audit logs:', result.error);
    }
  } catch (error) {
    console.error('Failed to fetch audit logs:', error);
  }
  }, [session?.access_token]);

  useEffect(() => {
  if (!session?.access_token) return;
  fetchAdminUsers();
  if (activeTab === 'auditLogs') {
    fetchAuditLogs();
  }
  }, [session, activeTab, fetchAdminUsers, fetchAuditLogs]);

  const getActionColor = (action: string) => {
  switch (action) {
    case 'LOGIN':
      return 'bg-green-100 text-green-800';
    case 'LOGOUT':
      return 'bg-gray-100 text-gray-800';
    case 'CREATE_USER':
      return 'bg-blue-100 text-blue-800';
    case 'UPDATE_USER':
    case 'UPDATE_PROFILE':
    case 'UPDATE_STATUS':
      return 'bg-yellow-100 text-yellow-800';
    case 'DELETE_USER':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
  };
  
  const getFilteredLogs = () => {
    return settings.auditLogs.filter(log => {
      const userName = log.userName || '';
      const action = log.action || '';
      const matchesSearch =
        userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        action.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesAction = filterAction ? action === filterAction : true;

      const matchesDate = dateRange.from && dateRange.to
        ? new Date(log.created_at) >= new Date(dateRange.from) &&
          new Date(log.created_at) <= new Date(dateRange.to)
        : true;

      return matchesSearch && matchesAction && matchesDate;
    });
  };
  
  const clearFilters = () => {
    setSearchTerm('');
    setFilterAction('');
    setDateRange({ from: '', to: '' });
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Main Header */}
      <header className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 bg-white shadow-sm border-b border-gray-200 flex-shrink-0">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            {isMobileView && (
              <button
                onClick={() => handleNavigation?.('DASHBOARD')}
                className="p-2 hover:bg-yellow-50 rounded-lg transition"
              >
                <Icon icon="mdi:arrow-left" className="w-6 h-6 text-gray-600" />
              </button>
            )}
            <h2 className="flex items-center gap-2 sm:gap-3 text-2xl sm:text-3xl font-bold text-gray-800">
              <Icon icon="mdi:cog" className="text-yellow-400 w-6 h-6 sm:w-8 sm:h-8" />
              Settings
            </h2>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden">
            
            {/* Tabs Navigation */}
            <div className="border-b border-gray-200 overflow-x-auto">
              <nav className="flex space-x-4 sm:space-x-8 px-4 sm:px-6" aria-label="Tabs">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm flex items-center gap-1 sm:gap-2 whitespace-nowrap
                      ${activeTab === tab.id
                        ? 'border-yellow-400 text-yellow-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }
                    `}
                  >
                    <Icon icon={tab.icon} className="w-4 h-4 sm:w-5 sm:h-5" />
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-4 sm:p-6">
              <form onSubmit={handleSave} className="space-y-6 sm:space-y-8">
                
                {/* General Settings */}
                {activeTab === 'general' && (
                  <div className="space-y-4 sm:space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Website Name</label>
                        <input
                          type="text"
                          value={settings.general.websiteName}
                          onChange={(e) => setSettings({
                            ...settings,
                            general: { ...settings.general, websiteName: e.target.value }
                          })}
                          className="w-full px-3 sm:px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-yellow-200 focus:border-yellow-400"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Timezone</label>
                        <select
                          value={settings.general.timezone}
                          onChange={(e) => setSettings({
                            ...settings,
                            general: { ...settings.general, timezone: e.target.value }
                          })}
                          className="w-full px-3 sm:px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-yellow-200 focus:border-yellow-400"
                        >
                          <option value="Asia/Manila">Asia/Manila</option>
                          <option value="UTC">UTC</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Language</label>
                        <select
                          value={settings.general.language}
                          onChange={(e) => setSettings({
                            ...settings,
                            general: { ...settings.general, language: e.target.value }
                          })}
                          className="w-full px-3 sm:px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-yellow-200 focus:border-yellow-400"
                        >
                          <option value="English">English</option>
                          <option value="Filipino">Filipino</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Currency</label>
                        <select
                          value={settings.general.currency}
                          onChange={(e) => setSettings({
                            ...settings,
                            general: { ...settings.general, currency: e.target.value }
                          })}
                          className="w-full px-3 sm:px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-yellow-200 focus:border-yellow-400"
                        >
                          <option value="PHP">PHP (₱)</option>
                          <option value="USD">USD ($)</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Store Address</label>
                      <textarea
                        value={settings.general.storeAddress}
                        onChange={(e) => setSettings({
                          ...settings,
                          general: { ...settings.general, storeAddress: e.target.value }
                        })}
                        rows={3}
                        className="w-full px-3 sm:px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-yellow-200 focus:border-yellow-400"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Logo</label>
                      <div className="mt-1 flex justify-center px-4 sm:px-6 pt-4 sm:pt-5 pb-4 sm:pb-6 border-2 border-gray-300 border-dashed rounded-lg">
                        <div className="space-y-1 text-center">
                          <Icon icon="mdi:upload" className="mx-auto h-8 w-8 sm:h-12 sm:w-12 text-gray-400" />
                          <div className="flex flex-col sm:flex-row text-sm text-gray-600 items-center gap-1 sm:gap-0">
                            <label className="relative cursor-pointer bg-white rounded-md font-medium text-yellow-600 hover:text-yellow-500 focus-within:outline-none">
                              <span>Upload a file</span>
                              <input type="file" className="sr-only" />
                            </label>
                            <p className="sm:pl-1">or drag and drop</p>
                          </div>
                          <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* User Management Settings */}
                {activeTab === 'userManagement' && (
                  <div className="space-y-6 sm:space-y-8">
                    
                    {/* Admin Users Section */}
                    <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0 mb-4 sm:mb-6">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-800 flex items-center gap-2">
                          <Icon icon="mdi:account-tie" className="text-yellow-400" />
                          Admin Users
                        </h3>
                        <button 
                          onClick={() => setIsAddAdminModalOpen(true)}
                          className="px-3 sm:px-4 py-2 bg-yellow-400 text-white rounded-lg hover:bg-yellow-500 flex items-center justify-center gap-2"
                        >
                          <Icon icon="mdi:plus" className="w-4 h-4 sm:w-5 sm:h-5" />
                          Add Admin
                        </button>
                      </div>

                      {/* Add Admin Modal */}
                      {isAddAdminModalOpen && (
                        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50 p-4">
                          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
                            <div className="flex justify-between items-center mb-8">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-yellow-100 rounded-lg">
                                  <Icon icon="mdi:account-plus" className="w-6 h-6 text-yellow-600" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900">Add New Admin</h3>
                              </div>
                              <button
                                onClick={() => setIsAddAdminModalOpen(false)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                              >
                                <Icon icon="mdi:close" className="w-6 h-6 text-gray-500" />
                              </button>
                            </div>
                            <form 
                              onSubmit={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleAddAdmin(e);
                              }} 
                              className="space-y-6"
                            >
                              <div className="space-y-2">
                                <label className="block text-sm font-semibold text-gray-700">
                                  Full Name
                                </label>
                                <div className="relative">
                                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Icon icon="mdi:account" className="w-5 h-5 text-gray-400" />
                                  </div>
                                  <input
                                    type="text"
                                    value={newAdmin.name}
                                    onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-200 focus:border-yellow-400 transition-colors duration-200"
                                    placeholder="Enter full name"
                                    required
                                  />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <label className="block text-sm font-semibold text-gray-700">
                                  Email Address
                                </label>
                                <div className="relative">
                                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Icon icon="mdi:email" className="w-5 h-5 text-gray-400" />
                                  </div>
                                  <input
                                    type="email"
                                    value={newAdmin.email}
                                    onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-200 focus:border-yellow-400 transition-colors duration-200"
                                    placeholder="Enter email address"
                                    required
                                  />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <label className="block text-sm font-semibold text-gray-700">
                                  Role
                                </label>
                                <div className="relative">
                                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Icon icon="mdi:shield-account" className="w-5 h-5 text-gray-400" />
                                  </div>
                                  <select
                                    value={newAdmin.role}
                                    onChange={(e) => setNewAdmin({ ...newAdmin, role: e.target.value })}
                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-200 focus:border-yellow-400 transition-colors duration-200 appearance-none bg-white"
                                    required
                                  >
                                    <option value="Customer Support">Customer Support</option>
                                    <option value="Admin">Admin</option>
                                  </select>
                                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                    <Icon icon="mdi:chevron-down" className="w-5 h-5 text-gray-400" />
                                  </div>
                                </div>
                              </div>
                              <div className="flex justify-end gap-4 pt-6">
                                <button
                                  type="button"
                                  onClick={() => setIsAddAdminModalOpen(false)}
                                  className="px-6 py-3 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors duration-200"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleAddAdmin(e);
                                  }}
                                  disabled={isAddingAdmin}
                                  className="px-6 py-3 text-sm font-medium text-white bg-yellow-400 hover:bg-yellow-500 rounded-xl transition-colors duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {isAddingAdmin ? (
                                    <>
                                      <Icon icon="mdi:loading" className="w-5 h-5 animate-spin" />
                                      Adding...
                                    </>
                                  ) : (
                                    <>
                                      <Icon icon="mdi:check" className="w-5 h-5" />
                                      Add Admin
                                    </>
                                  )}
                                </button>
                              </div>
                            </form>
                          </div>
                        </div>
                      )}

                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead>
                            <tr>
                              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {settings.userManagement.adminUsers.map((user) => (
                              <tr key={user.id}>
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <div className="flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10">
                                      <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                        <Icon icon="mdi:account" className="w-4 h-4 sm:w-6 sm:h-6 text-gray-500" />
                                      </div>
                                    </div>
                                    <div className="ml-3 sm:ml-4">
                                      <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">{user.email}</div>
                                </td>
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                    {user.role}
                                  </span>
                                </td>
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                    user.status === true ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                  }`}>
                                    {user.status}
                                  </span>
                                </td>
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                                  <button
                                    onClick={() =>
                                      setConfirmModal({
                                        open: true,
                                        action: 'edit',
                                        user,
                                        newStatus: user.status === true ? false : true,
                                      })
                                    }
                                    className="text-yellow-600 hover:text-yellow-900 mr-3"
                                    title={user.status === true ? 'Deactivate' : 'Activate'}
                                  >
                                    <Icon icon="mdi:pencil" />
                                  </button>
                                  <button
                                    onClick={() =>
                                      setConfirmModal({
                                        open: true,
                                        action: 'delete',
                                        user,
                                      })
                                    }
                                    className="text-red-600 hover:text-red-900"
                                    title="Delete"
                                  >
                                    <Icon icon="mdi:delete" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              
                {/* Audit Logs Section */}
                {activeTab === 'auditLogs' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Icon icon="mdi:history" className="text-yellow-400" />
                        System Activity Logs
                      </h3>
                      <div className="flex gap-4">
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Search logs..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-200 focus:border-yellow-400"
                          />
                          <Icon 
                            icon="mdi:magnify" 
                            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" 
                          />
                        </div>
                        <button
                          onClick={() => setIsDownloadModalOpen(true)}
                          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2"
                          title="Download as Excel"
                        >
                          <Icon icon="mdi:file-excel" />
                          Download Excel
                        </button>
                        <button 
                          onClick={() => setIsFilterModalOpen(true)}
                          className="px-4 py-2 bg-yellow-400 text-white rounded-lg hover:bg-yellow-500 flex items-center gap-2"
                        >
                          <Icon icon="mdi:filter" />
                          Filter
                          {(filterAction || dateRange.from || dateRange.to) && (
                            <span className="w-2 h-2 rounded-full bg-white" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Filter Modal */}
                    {isFilterModalOpen && (
                      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold">Filter Logs</h3>
                            <button 
                              onClick={() => setIsFilterModalOpen(false)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <Icon icon="mdi:close" className="w-6 h-6" />
                            </button>
                          </div>
                          
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Action Type
                              </label>
                              <select
                                value={filterAction}
                                onChange={(e) => setFilterAction(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                              >
                                <option value="">All Actions</option>
                                <option value="LOGIN">Login</option>
                                <option value="LOGOUT">Logout</option>
                                <option value="CREATE_USER">Create User</option>
                                <option value="UPDATE_USER">Update User</option>
                                <option value="DELETE_USER">Delete User</option>
                                <option value="UPDATE_STATUS">Update Status</option>
                                <option value="UPDATE_PROFILE">Update Profile</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Date Range
                              </label>
                              <div className="grid grid-cols-2 gap-4">
                                <input
                                  type="date"
                                  value={dateRange.from}
                                  onChange={(e) => setDateRange(prev => ({
                                    ...prev,
                                    from: e.target.value
                                  }))}
                                  className="border border-gray-300 rounded-lg px-3 py-2"
                                />
                                <input
                                  type="date"
                                  value={dateRange.to}
                                  onChange={(e) => setDateRange(prev => ({
                                    ...prev,
                                    to: e.target.value
                                  }))}
                                  className="border border-gray-300 rounded-lg px-3 py-2"
                                />
                              </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                              <button
                                onClick={clearFilters}
                                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                              >
                                Clear Filters
                              </button>
                              <button
                                onClick={() => setIsFilterModalOpen(false)}
                                className="px-4 py-2 bg-yellow-400 text-white rounded-lg hover:bg-yellow-500"
                              >
                                Apply Filters
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Download Confirmation Modal */}
                      {isDownloadModalOpen && (
                      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold">Download Audit Logs</h3>
                            <button 
                              onClick={() => setIsDownloadModalOpen(false)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <Icon icon="mdi:close" className="w-6 h-6" />
                            </button>
                          </div>
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Date Range
                              </label>
                              <div className="grid grid-cols-2 gap-4">
                                <input
                                  type="date"
                                  value={downloadRange.from}
                                  onChange={e => setDownloadRange(r => ({ ...r, from: e.target.value }))}
                                  className="border border-gray-300 rounded-lg px-3 py-2"
                                />
                                <input
                                  type="date"
                                  value={downloadRange.to}
                                  onChange={e => setDownloadRange(r => ({ ...r, to: e.target.value }))}
                                  className="border border-gray-300 rounded-lg px-3 py-2"
                                />
                              </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                              <button
                                onClick={() => setIsDownloadModalOpen(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={async () => {
                                  await handleDownloadAuditLogs(downloadRange.from, downloadRange.to);
                                  setIsDownloadModalOpen(false);
                                }}
                                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                                disabled={!downloadRange.from || !downloadRange.to}
                              >
                                Download
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {getFilteredLogs().length > 0 ? (
                              getFilteredLogs().map((log) => (
                                <tr key={log.id} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {new Date(log.created_at).toLocaleString()}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                      <div className="flex-shrink-0 h-8 w-8">
                                        <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center">
                                          <Icon icon="mdi:account" className="w-4 h-4 text-yellow-600" />
                                        </div>
                                      </div>
                                      <div className="ml-4">
                                        <div className="text-sm font-medium text-gray-900">{log.userName}</div>
                                        <div className="text-sm text-gray-500">{log.userId}</div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                                      ${getActionColor(log.action)}`}>
                                      {log.action}
                                    </span>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                                  No audit logs available
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmModal.open && confirmModal.user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8">
            <div className="mb-6 flex items-center gap-3">
              <Icon icon={confirmModal.action === 'delete' ? "mdi:delete" : "mdi:pencil"} className={`w-7 h-7 ${confirmModal.action === 'delete' ? 'text-red-500' : 'text-yellow-500'}`} />
              <h3 className="text-xl font-bold text-gray-900">
                {confirmModal.action === 'delete'
                  ? 'Delete Admin User'
                  : confirmModal.newStatus
                    ? 'Activate Account'
                    : 'Deactivate Account'}
              </h3>
            </div>
            <p className="mb-8 text-gray-700">
              {confirmModal.action === 'delete'
                ? `Are you sure you want to delete ${confirmModal.user.name}? This action cannot be undone.`
                : `Are you sure you want to ${confirmModal.newStatus ? 'activate' : 'deactivate'} the account for ${confirmModal.user.name}?`}
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setConfirmModal({ open: false, action: null, user: null })}
                className="px-5 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                Cancel
              </button>
              {confirmModal.action === 'delete' ? (
                <button
                  onClick={async () => {
                    await handleDeleteUser(confirmModal.user!.id);
                    setConfirmModal({ open: false, action: null, user: null });
                  }}
                  className="px-5 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600"
                >
                  Delete
                </button>
              ) : (
                <button
                  onClick={async () => {
                    await handleEditStatus(confirmModal.user!.id, confirmModal.newStatus!);
                    setConfirmModal({ open: false, action: null, user: null });
                  }}
                  className="px-5 py-2 rounded-lg bg-yellow-400 text-white hover:bg-yellow-500"
                >
                  {confirmModal.newStatus ? 'Activate' : 'Deactivate'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
