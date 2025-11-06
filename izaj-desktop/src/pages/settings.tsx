import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Icon } from "@iconify/react";
import { Session } from "@supabase/supabase-js";
import API_URL from "../../config/api";
import { AdminUser,  SettingsState, Users } from "../types/index";

interface SettingsProps {
  handleNavigation?: (page: string) => void;
  session: Session | null;
}

const Settings: React.FC<SettingsProps> = ({ session }) => {
  const [activeTab, setActiveTab] = useState('auditLogs');
  const [isAddAdminModalOpen, setIsAddAdminModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [downloadRange, setDownloadRange] = useState({ from: '', to: '' });
  const [subscriptionMessage, setSubscriptionMessage] = useState('');
  const [isSavingMessage, setIsSavingMessage] = useState(false);
  const [messageSaveStatus, setMessageSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isSendingToAll, setIsSendingToAll] = useState(false);
  const [sendToAllStatus, setSendToAllStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [subscriberCount, setSubscriberCount] = useState<number | null>(null);

  const [newAdmin, setNewAdmin] = useState({
    email: '',
    name: '',
    is_super_admin: false,
    assigned_categories: [] as string[],
    assigned_branches: [] as string[]
  });
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [availableBranches, setAvailableBranches] = useState<string[]>([]);
  
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

  const [sendConfirmModal, setSendConfirmModal] = useState<{
    open: boolean;
  }>({ open: false });

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
              role: user.role || 'Admin',
              status: user.status === true ? 'active' : 'inactive',
              is_super_admin: user.is_super_admin || false,
              assigned_categories: user.assigned_categories || [] as string[],
              assigned_branches: user.assigned_branches || [] as string[],
            })),
          }
        }));
      }
    } catch (error) {
      console.error('Failed to fetch admin users:', error);
    }
  }, [session?.access_token]);

  // Fetch current user's admin context
  const fetchCurrentUserContext = useCallback(async () => {
    if (!session?.access_token) return;
    try {
      const response = await fetch(`${API_URL}/api/admin/me`, {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });
      const result = await response.json();
      console.log('Admin context response:', result); // Debug log
      if (result.success) {
        setIsSuperAdmin(result.is_super_admin === true);
      } else {
        console.error('Failed to fetch admin context:', result.error);
        setIsSuperAdmin(false);
      }
    } catch (error) {
      console.error('Failed to fetch current user context:', error);
      setIsSuperAdmin(false);
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
        setAvailableCategories(result.categories || []);
      } else {
        console.error('Failed to fetch categories:', result.error);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
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
      } else {
        console.error('Failed to fetch branches:', result.error);
      }
    } catch (error) {
      console.error('Failed to fetch branches:', error);
    }
  }, [session?.access_token]);

  useEffect(() => {
    if (!session?.access_token) return;
    // Always fetch current user context first
    fetchCurrentUserContext();
  }, [fetchCurrentUserContext, session?.access_token]);

  useEffect(() => {
    if (!session?.access_token) return;
    // Only fetch admin users if SuperAdmin
    if (isSuperAdmin) {
      fetchAdminUsers();
    }
  }, [fetchAdminUsers, session?.access_token, isSuperAdmin]);

  useEffect(() => {
    if (!session?.access_token) return;
    // Fetch categories and branches when needed
    if (isSuperAdmin || activeTab === 'userManagement') {
      fetchCategories();
      fetchBranches();
    }
  }, [fetchCategories, fetchBranches, session?.access_token, isSuperAdmin, activeTab]);

  const tabs = useMemo(() => [
    ...(isSuperAdmin ? [{ id: 'userManagement', label: 'User Management', icon: 'mdi:account-group' }] : []),
    { id: 'auditLogs', label: 'Audit Logs', icon: 'mdi:history' },
    { id: 'subscriptionMessage', label: 'Subscription Message', icon: 'mdi:email-newsletter' },
  ], [isSuperAdmin]);

  // Debug: Log SuperAdmin status
  useEffect(() => {
    console.log('Current SuperAdmin status:', isSuperAdmin);
    console.log('Available tabs:', tabs.map(t => t.id));
  }, [isSuperAdmin, tabs]);

  // Removed handleSave - no longer needed since we removed outer form

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
          role: 'Admin', // Default role since field was removed from UI
          is_super_admin: newAdmin.is_super_admin,
          assigned_categories: newAdmin.assigned_categories,
          assigned_branches: newAdmin.assigned_branches,
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

      setNewAdmin({ email: '', name: '', is_super_admin: false, assigned_categories: [], assigned_branches: [] });
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

    // Function to properly escape CSV values
    const escapeCsvValue = (value: string | number | null | undefined): string => {
      if (value === null || value === undefined) return '';
      
      const stringValue = String(value);
      
      // If the value contains comma, quote, or newline, wrap it in quotes
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
        // Escape quotes by doubling them
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      
      return stringValue;
    };

    // Convert logs to CSV format
    const csvHeaders = ['Time', 'User', 'User ID', 'Action', 'IP Address'];

    const csvRows = result.logs.map((log: Users) => [
      escapeCsvValue(new Date(log.created_at).toLocaleString()),
      escapeCsvValue(log.user_name),
      escapeCsvValue(log.user_id),
      escapeCsvValue(log.action),
      escapeCsvValue(log.ip_address || ""),
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map((row: string[]) => row.join(','))
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const fromStr = formatDateForFileName(from);
    const toStr = formatDateForFileName(to);
    const fileName = fromStr && toStr
      ? `Audit-Logs(${fromStr} - ${toStr}).csv`
      : "Audit-Logs.csv";
    
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  const fetchSubscriptionMessage = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/subscription-message`, {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });
      const result = await response.json();
      if (result.success && result.message) {
        setSubscriptionMessage(result.message);
      }
    } catch (error) {
      console.error('Failed to fetch subscription message:', error);
    }
  }, [session?.access_token]);

  const fetchSubscriberCount = useCallback(async () => {
    try {
      console.log('Fetching subscriber count from:', `${API_URL}/api/admin/subscription-message/subscriber-count`);
      const response = await fetch(`${API_URL}/api/admin/subscription-message/subscriber-count`, {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });
      
      console.log('Subscriber count response status:', response.status);
      const result = await response.json();
      console.log('Subscriber count result:', result);
      
      if (result.success && result.count !== undefined) {
        console.log('Setting subscriber count to:', result.count);
        setSubscriberCount(result.count);
      } else {
        console.warn('Invalid response format:', result);
      }
    } catch (error) {
      console.error('Failed to fetch subscriber count:', error);
    }
  }, [session?.access_token]);

  const handleSendToAllSubscribers = async () => {
    if (!subscriptionMessage.trim()) {
      alert('Please save a message first before sending to all subscribers.');
      return;
    }

    // Open confirmation modal
    setSendConfirmModal({ open: true });
  };

  const confirmSendToAll = async () => {
    setSendConfirmModal({ open: false });
    setIsSendingToAll(true);
    setSendToAllStatus('idle');

    try {
      const response = await fetch(`${API_URL}/api/admin/subscription-message/send-to-all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      const result = await response.json();

      if (result.success) {
        setSendToAllStatus('success');
        setTimeout(() => setSendToAllStatus('idle'), 5000);
      } else {
        setSendToAllStatus('error');
        setTimeout(() => setSendToAllStatus('idle'), 5000);
        alert(result.error || 'Failed to send messages');
      }
    } catch (error) {
      console.error('Error sending to all subscribers:', error);
      setSendToAllStatus('error');
      setTimeout(() => setSendToAllStatus('idle'), 5000);
      alert('Failed to send messages. Please try again.');
    } finally {
      setIsSendingToAll(false);
    }
  };

  const handleSaveSubscriptionMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event bubbling
    setIsSavingMessage(true);
    setMessageSaveStatus('idle');

    try {
      const response = await fetch(`${API_URL}/api/admin/subscription-message`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ message: subscriptionMessage }),
      });

      // Check if response is ok before parsing JSON
      if (!response.ok) {
        // If unauthorized, don't redirect - just show error
        if (response.status === 401 || response.status === 403) {
          setMessageSaveStatus('error');
          setTimeout(() => setMessageSaveStatus('idle'), 3000);
          alert('Session expired. Please refresh the page and try again.');
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setMessageSaveStatus('success');
        setTimeout(() => setMessageSaveStatus('idle'), 3000);
      } else {
        setMessageSaveStatus('error');
        setTimeout(() => setMessageSaveStatus('idle'), 3000);
        alert(result.error || 'Failed to save message');
      }
    } catch (error) {
      console.error('Error saving subscription message:', error);
      setMessageSaveStatus('error');
      setTimeout(() => setMessageSaveStatus('idle'), 3000);
      // Don't show alert for network errors, status message is enough
    } finally {
      setIsSavingMessage(false);
    }
  };

  useEffect(() => {
  if (!session?.access_token) return;
  fetchAdminUsers();
  if (activeTab === 'auditLogs') {
    fetchAuditLogs();
  }
  if (activeTab === 'subscriptionMessage') {
    fetchSubscriptionMessage();
    fetchSubscriberCount();
  }
  }, [session, activeTab, fetchAdminUsers, fetchAuditLogs, fetchSubscriptionMessage, fetchSubscriberCount]);

  const getActionColor = (action: string) => {
  switch (action) {
    case 'LOGIN':
      return 'bg-green-100 text-green-800';
    case 'LOGOUT':
      return 'bg-red-100 text-red-800';
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
    <div className="flex-1 overflow-y-auto">
      <main className="flex-1 px-8 py-6">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-white via-gray-50 to-white rounded-2xl p-6 mb-8 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-xl shadow-lg">
              <Icon icon="mdi:cog" className="text-2xl text-white" />
            </div>
            <div>
              <h2 className="text-2xl lg:text-3xl font-bold text-gray-800" style={{ fontFamily: "'Jost', sans-serif" }}>
                Settings
              </h2>
              <p className="text-gray-600 text-base" style={{ fontFamily: "'Jost', sans-serif" }}>
                Manage your application settings and system configuration
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden"
            style={{
              boxShadow: '0 4px 32px 0 rgba(251, 191, 36, 0.07)',
            }}>
            
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
                        ? 'border-yellow-500 text-yellow-600 font-semibold'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }
                    `}
                  >
                    <Icon icon={tab.icon} className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span style={{ fontFamily: "'Jost', sans-serif" }}>{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-4 sm:p-6">
              <div className="space-y-6 sm:space-y-8">

                {/* User Management Settings */}
                {activeTab === 'userManagement' && (
                  <div className="space-y-6 sm:space-y-8">
                    {!isSuperAdmin ? (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
                        <Icon icon="mdi:alert" className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-yellow-800 mb-2">Access Denied</h3>
                        <p className="text-yellow-700">Only SuperAdmin users can access User Management.</p>
                      </div>
                    ) : (
                    <>
                    {/* Admin Users Section */}
                    <div className="bg-white rounded-3xl border border-gray-100 p-4 sm:p-6 shadow-lg">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0 mb-4 sm:mb-6">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-800 flex items-center gap-2">
                          <Icon icon="mdi:account-tie" className="text-yellow-400" />
                          Admin Users
                        </h3>
                        <button 
                          onClick={() => setIsAddAdminModalOpen(true)}
                          className="px-4 py-2 bg-yellow-500 text-white rounded-xl hover:bg-yellow-600 transition shadow-lg hover:shadow-xl flex items-center justify-center gap-2 font-semibold"
                          style={{ fontFamily: "'Jost', sans-serif" }}
                        >
                          <Icon icon="mdi:plus" className="w-5 h-5" />
                          Add Admin
                        </button>
                      </div>

                      {/* Add Admin Modal */}
                      {isAddAdminModalOpen && (
                        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50 p-4">
                          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden">
                            {/* Fixed Header */}
                            <div className="flex justify-between items-center p-8 border-b border-gray-200 flex-shrink-0">
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
                            
                            {/* Scrollable Form Content */}
                            <div className="flex-1 overflow-y-auto p-8">
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
                                  <label className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={newAdmin.is_super_admin}
                                      onChange={(e) => {
                                        const isSuper = e.target.checked;
                                        setNewAdmin({ 
                                          ...newAdmin, 
                                          is_super_admin: isSuper,
                                          // Clear categories/branches if SuperAdmin
                                          assigned_categories: isSuper ? [] : newAdmin.assigned_categories,
                                          assigned_branches: isSuper ? [] : newAdmin.assigned_branches
                                        });
                                      }}
                                      className="w-4 h-4 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500"
                                    />
                                    <span className="text-sm font-semibold text-gray-700">Super Admin (can see everything)</span>
                                  </label>
                                </div>
                                {!newAdmin.is_super_admin && (
                                  <>
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between">
                                        <label className="block text-sm font-semibold text-gray-700">
                                          Assigned Categories
                                        </label>
                                        {newAdmin.assigned_categories.length > 0 && (
                                          <span className="text-xs text-yellow-600 font-medium">
                                            {newAdmin.assigned_categories.length} selected
                                          </span>
                                        )}
                                      </div>
                                      <div className="relative border border-gray-300 rounded-xl bg-white min-h-[120px] max-h-[200px] overflow-y-auto">
                                        <div className="absolute left-3 top-3 flex items-center pointer-events-none z-10">
                                          <Icon icon="mdi:tag-multiple" className="w-5 h-5 text-gray-400" />
                                        </div>
                                        {availableCategories.length > 0 ? (
                                          <div className="pl-10 pr-4 py-3 space-y-2">
                                            {availableCategories.map(category => (
                                              <label
                                                key={category}
                                                className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                                              >
                                                <input
                                                  type="checkbox"
                                                  checked={newAdmin.assigned_categories.includes(category)}
                                                  onChange={(e) => {
                                                    if (e.target.checked) {
                                                      setNewAdmin({
                                                        ...newAdmin,
                                                        assigned_categories: [...newAdmin.assigned_categories, category]
                                                      });
                                                    } else {
                                                      setNewAdmin({
                                                        ...newAdmin,
                                                        assigned_categories: newAdmin.assigned_categories.filter(c => c !== category)
                                                      });
                                                    }
                                                  }}
                                                  className="w-4 h-4 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500 cursor-pointer"
                                                />
                                                <span className="text-sm text-gray-700">{category}</span>
                                              </label>
                                            ))}
                                          </div>
                                        ) : (
                                          <div className="pl-10 pr-4 py-3">
                                            <p className="text-sm text-gray-500">No categories available. Please add categories to products first.</p>
                                          </div>
                                        )}
                                      </div>
                                      <p className="text-xs text-gray-500">Select multiple categories by clicking the checkboxes</p>
                                    </div>
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between">
                                        <label className="block text-sm font-semibold text-gray-700">
                                          Assigned Branches
                                        </label>
                                        {newAdmin.assigned_branches.length > 0 && (
                                          <span className="text-xs text-yellow-600 font-medium">
                                            {newAdmin.assigned_branches.length} selected
                                          </span>
                                        )}
                                      </div>
                                      <div className="relative border border-gray-300 rounded-xl bg-white min-h-[120px] max-h-[200px] overflow-y-auto">
                                        <div className="absolute left-3 top-3 flex items-center pointer-events-none z-10">
                                          <Icon icon="mdi:store" className="w-5 h-5 text-gray-400" />
                                        </div>
                                        {availableBranches.length > 0 ? (
                                          <div className="pl-10 pr-4 py-3 space-y-2">
                                            {availableBranches.map(branch => (
                                              <label
                                                key={branch}
                                                className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
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
                                                  className="w-4 h-4 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500 cursor-pointer"
                                                />
                                                <span className="text-sm text-gray-700">{branch}</span>
                                              </label>
                                            ))}
                                          </div>
                                        ) : (
                                          <div className="pl-10 pr-4 py-3">
                                            <p className="text-sm text-gray-500">No branches available. Please add branches to products first.</p>
                                          </div>
                                        )}
                                      </div>
                                      <p className="text-xs text-gray-500">Select multiple branches by clicking the checkboxes</p>
                                    </div>
                                  </>
                                )}
                              </form>
                            </div>
                            
                            {/* Fixed Footer with Buttons */}
                            <div className="flex justify-end gap-4 p-8 border-t border-gray-200 bg-gray-50 flex-shrink-0">
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
                          </div>
                        </div>
                      )}

                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-100">
                          <thead className="bg-gradient-to-r from-gray-50 to-white">
                            <tr>
                              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Name</th>
                              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Email</th>
                              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Role</th>
                              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Type</th>
                              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Assignments</th>
                              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-100">
                            {settings.userManagement.adminUsers.map((user) => (
                              <tr key={user.id} className="hover:bg-gray-50 transition-colors duration-200">
                                <td className="px-6 py-4 whitespace-nowrap">
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
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">{user.email}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-xl bg-blue-100 text-blue-800 shadow-sm">
                                    {user.role}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {user.is_super_admin ? (
                                    <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-xl bg-purple-100 text-purple-800 shadow-sm">
                                      Super Admin
                                    </span>
                                  ) : (
                                    <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-xl bg-gray-100 text-gray-800 shadow-sm">
                                      Regular Admin
                                    </span>
                                  )}
                                </td>
                                <td className="px-6 py-4">
                                  {user.is_super_admin ? (
                                    <span className="text-xs text-gray-500">All access</span>
                                  ) : (
                                    <div className="text-xs">
                                      {user.assigned_categories && user.assigned_categories.length > 0 && (
                                        <div className="mb-1">
                                          <span className="font-semibold">Categories:</span> {user.assigned_categories.join(', ')}
                                        </div>
                                      )}
                                      {user.assigned_branches && user.assigned_branches.length > 0 && (
                                        <div>
                                          <span className="font-semibold">Branches:</span> {user.assigned_branches.join(', ')}
                                        </div>
                                      )}
                                      {(!user.assigned_categories || user.assigned_categories.length === 0) && 
                                       (!user.assigned_branches || user.assigned_branches.length === 0) && (
                                        <span className="text-gray-400">No assignments</span>
                                      )}
                                    </div>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-xl shadow-sm ${
                                    user.status === true ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                  }`}>
                                    {user.status}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
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
                    </>
                    )}
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
                          title="Download as CSV"
                        >
                          <Icon icon="mdi:file-excel" />
                          Download CSV
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

                    <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-lg">
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-100">
                          <thead className="bg-gradient-to-r from-gray-50 to-white">
                            <tr>
                              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Time</th>
                              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">User</th>
                              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Action</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-100">
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

                {/* Subscription Message Section */}
                {activeTab === 'subscriptionMessage' && (
                  <div className="space-y-6 sm:space-y-8">
                    <div className="bg-white rounded-3xl border border-gray-100 p-4 sm:p-6 shadow-lg">
                      <div className="mb-6">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-800 flex items-center gap-2 mb-2">
                          <Icon icon="mdi:email-newsletter" className="text-yellow-400" />
                          Subscription Welcome Message
                        </h3>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <p className="text-sm text-gray-600">
                            Set a custom message that will be automatically sent to all users who subscribe to your newsletter.
                            This message will be included in the subscription confirmation email.
                          </p>
                          {subscriberCount !== null && (
                            <div className="text-sm text-gray-700 bg-gray-50 px-4 py-2 rounded-lg">
                              <span className="font-semibold">{subscriberCount}</span> active subscribers
                            </div>
                          )}
                        </div>
                      </div>

                      <form onSubmit={handleSaveSubscriptionMessage} className="space-y-6">
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-gray-700">
                            Message Content
                          </label>
                          <textarea
                            value={subscriptionMessage}
                            onChange={(e) => setSubscriptionMessage(e.target.value)}
                            rows={12}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-200 focus:border-yellow-400 transition-colors duration-200 resize-none"
                            placeholder="Enter your subscription welcome message here. This message will be sent to all new subscribers..."
                          />
                          <p className="text-xs text-gray-500">
                            This message will be sent to all subscribers when you use the "Send to All" button.
                          </p>
                        </div>

                        <div className="flex flex-col gap-4 pt-4 border-t border-gray-200">
                          <div className="flex items-center gap-3">
                            {messageSaveStatus === 'success' && (
                              <div className="flex items-center gap-2 text-green-600">
                                <Icon icon="mdi:check-circle" className="w-5 h-5" />
                                <span className="text-sm font-medium">Message saved successfully!</span>
                              </div>
                            )}
                            {messageSaveStatus === 'error' && (
                              <div className="flex items-center gap-2 text-red-600">
                                <Icon icon="mdi:alert-circle" className="w-5 h-5" />
                                <span className="text-sm font-medium">Failed to save message. Please try again.</span>
                              </div>
                            )}
                            {sendToAllStatus === 'success' && (
                              <div className="flex items-center gap-2 text-green-600">
                                <Icon icon="mdi:check-circle" className="w-5 h-5" />
                                <span className="text-sm font-medium">Message sent to all subscribers!</span>
                              </div>
                            )}
                            {sendToAllStatus === 'error' && (
                              <div className="flex items-center gap-2 text-red-600">
                                <Icon icon="mdi:alert-circle" className="w-5 h-5" />
                                <span className="text-sm font-medium">Failed to send messages. Please try again.</span>
                              </div>
                            )}
                          </div>
                          <div className="flex gap-3">
                            <button
                              type="submit"
                              disabled={isSavingMessage}
                              className="px-6 py-3 bg-yellow-500 text-white rounded-xl hover:bg-yellow-600 transition shadow-lg hover:shadow-xl flex items-center gap-2 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                              style={{ fontFamily: "'Jost', sans-serif" }}
                            >
                              {isSavingMessage ? (
                                <>
                                  <Icon icon="mdi:loading" className="w-5 h-5 animate-spin" />
                                  Saving...
                                </>
                              ) : (
                                <>
                                  <Icon icon="mdi:content-save" className="w-5 h-5" />
                                  Save Message
                                </>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={handleSendToAllSubscribers}
                              disabled={isSendingToAll || !subscriptionMessage.trim()}
                              className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition shadow-lg hover:shadow-xl flex items-center gap-2 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                              style={{ fontFamily: "'Jost', sans-serif" }}
                            >
                              {isSendingToAll ? (
                                <>
                                  <Icon icon="mdi:loading" className="w-5 h-5 animate-spin" />
                                  Sending...
                                </>
                              ) : (
                                <>
                                  <Icon icon="mdi:email-send" className="w-5 h-5" />
                                  Send to All 
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

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
                ? `Are you sure you want to delete ${confirmModal.user?.name}? This action cannot be undone.`
                : `Are you sure you want to ${confirmModal.newStatus ? 'activate' : 'deactivate'} the account for ${confirmModal.user?.name}?`}
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

      {/* Send to All Subscribers Confirmation Modal */}
      {sendConfirmModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-xl">
                <Icon icon="mdi:email-send" className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">
                Send to All
              </h3>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-700 mb-4">
                Are you sure you want to send this message to <span className="font-semibold text-blue-600">{subscriberCount || 0} active subscriber{subscriberCount !== 1 ? 's' : ''}</span>?
              </p>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <Icon icon="mdi:alert-circle" className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-yellow-800 mb-1">Important</p>
                    <p className="text-sm text-yellow-700">
                      This action cannot be undone. All active subscribers will receive an email with your custom message.
                    </p>
                  </div>
                </div>
              </div>

              {subscriptionMessage.trim() && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Message Preview:</p>
                  <div 
                    className="text-sm text-gray-700 line-clamp-3"
                    dangerouslySetInnerHTML={{ __html: subscriptionMessage.substring(0, 200) + (subscriptionMessage.length > 200 ? '...' : '') }}
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-4">
              <button
                onClick={() => setSendConfirmModal({ open: false })}
                className="px-6 py-3 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium transition-colors"
                style={{ fontFamily: "'Jost', sans-serif" }}
              >
                Cancel
              </button>
              <button
                onClick={confirmSendToAll}
                className="px-6 py-3 rounded-xl bg-blue-500 text-white hover:bg-blue-600 font-semibold transition-colors flex items-center gap-2 shadow-lg hover:shadow-xl"
                style={{ fontFamily: "'Jost', sans-serif" }}
              >
                <Icon icon="mdi:email-send" className="w-5 h-5" />
                Send to All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
