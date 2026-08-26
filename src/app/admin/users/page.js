'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import DashboardShell from '../../../components/dashboard/DashboardShell';
import DashboardSidebar from '../../../components/dashboard/DashboardSidebar';
import DashboardHeader from '../../../components/dashboard/DashboardHeader';
import UsersWorkspace from '../../../components/admin/UsersWorkspace';
import { Spinner, Column, Row, Text, Button } from '@once-ui-system/core';
import { 
  Users, 
  UserPlus, 
  ArrowLeft, 
  Shield, 
  Building2, 
  AlertCircle,
  Loader2,
  Info,
  Download,
  RefreshCw,
  Share2, 
  BookOpen,
  BarChart3,
} from 'lucide-react';
import CollaborationDashboard from '../../../components/CollaborationDashboard';
import SmartFilters from '../../../components/SmartFilters';
import UserRoleTemplates from '../../../components/UserRoleTemplates';
import SCHOOL_NAMES from '../../../constants/schools';
import useAppToast from '../../../hooks/useAppToast';
import { downloadUsersCsv } from '../../../components/admin/UsersTable';
import Modal from '../../../components/ui/Modal';
// Same predicate the API enforces; see the note in UsersTable.js.
import { canManageTarget as canManageUser } from '../../../lib/canManageUser';

// Pulls in recharts, and only the analytics tab of the workspace ever renders it.
const UserAnalytics = dynamic(() => import('../../../components/UserAnalytics'), {
  loading: () => (
    <Column fillWidth horizontal="center" vertical="center" paddingY="48">
      <Spinner size="m" />
    </Column>
  ),
});

function AdminUsersPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const toast = useAppToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    level: 1,
    schoolName: '',
    title: '',
    isActive: true
  });
  
  // Advanced User Management States
  const [showAdvancedModal, setShowAdvancedModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showCsvImportModal, setShowCsvImportModal] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [bulkAction, setBulkAction] = useState('');
  const [auditLogs, setAuditLogs] = useState([]);
  const [csvData, setCsvData] = useState([]);
  const [csvPreview, setCsvPreview] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState(null);

  // Collaboration Dashboard State
  const initialTab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(
    initialTab === 'collaboration' || initialTab === 'analytics' || initialTab === 'templates'
      ? initialTab
      : 'users'
  );
  const [filteredUsers, setFilteredUsers] = useState([]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'collaboration' || tab === 'analytics' || tab === 'templates') {
      setActiveTab(tab);
    } else {
      setActiveTab('users');
    }
  }, [searchParams]);

  const selectTab = (tab) => {
    setActiveTab(tab);
    if (tab === 'users') {
      router.replace('/admin/users');
    } else {
      router.replace(`/admin/users?tab=${tab}`);
    }
  };

  // Handle authentication
  useEffect(() => {
    if (status === 'loading') return; // Still loading
    
    if (!session) {
      router.push('/login');
      return;
    }

    // Check if user has admin permission (Level 4)
    if (session.user.level < 4) {
      router.push('/dashboard');
      return;
    }
  }, [session, status, router]);

  // Fetch users when component mounts
  useEffect(() => {
    if (session && session.user.level >= 4) {
      fetchUsers();
    }
  }, [session]);

  // Initialize filtered users when users change
  useEffect(() => {
    setFilteredUsers(users);
  }, [users]);

  // Fetch audit logs when audit modal opens
  useEffect(() => {
    if (showAuditModal) {
      fetchAuditLogs();
    }
  }, [showAuditModal]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/users', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

             const data = await response.json();
       setUsers(data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      // Show empty state if API fails
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      level: 1,
      schoolName: session?.user?.level < 5 ? (session?.user?.schoolName || '') : '',
      title: '',
      isActive: true
    });
    setShowModal(true);
  };

  const handleEditUser = (user) => {
    if (!canManageUser(session?.user, user)) return;
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      level: user.level,
      schoolName: user.schoolName,
      title: user.title || '',
      isActive: user.isActive
    });
    setShowModal(true);
  };

  const handleDeleteUser = async (user) => {
    if (!canManageUser(session?.user, user)) return;
    if (!confirm(`Are you sure you want to delete ${user.name}? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch('/api/users', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user._id }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Refresh the users list
      fetchUsers();
      toast.success('User deleted');
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Error deleting user. Please try again.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error('Name and email are required');
      return;
    }

    try {
      const url = editingUser ? '/api/users' : '/api/users/create';
      const method = editingUser ? 'PUT' : 'POST';
      const body = editingUser 
        ? { userId: editingUser._id, ...formData }
        : formData;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Refresh the users list
      fetchUsers();
      setShowModal(false);
      toast.success(editingUser ? 'User updated' : 'User created');
    } catch (error) {
      console.error('Error saving user:', error);
      toast.error('Error saving user. Please try again.');
    }
  };

  // Advanced User Management Functions
  const handleBulkAction = async () => {
    if (selectedUsers.length === 0 || !bulkAction) {
      toast.error('Select users and choose an action');
      return;
    }

    try {
      const response = await fetch('/api/users/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userIds: selectedUsers.map(u => u._id),
          action: bulkAction
        }),
      });

      if (response.ok) {
        await fetchUsers();
        setShowBulkModal(false);
        setSelectedUsers([]);
        setBulkAction('');
        toast.success('Bulk action completed');
      }
    } catch (error) {
      console.error('Error performing bulk action:', error);
      toast.error('Error performing bulk action. Please try again.');
    }
  };

  const handlePermissionUpdate = async (userId, changes) => {
    try {
      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, ...changes }),
      });

      if (response.ok) {
        await fetchUsers();
        toast.success('User updated');
        return;
      }

      const error = await response.json().catch(() => ({}));
      toast.error(error.error || 'Could not update this user.');
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Error updating user. Please try again.');
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const response = await fetch('/api/users/audit-logs');
      if (response.ok) {
        const data = await response.json();
        setAuditLogs(data.logs || []);
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    }
  };

  // CSV Import Functions
  const handleCsvFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const csv = e.target.result;
      const lines = csv.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      
      const data = lines.slice(1).filter(line => line.trim()).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        const row = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        return row;
      });

      setCsvData(data);
      setCsvPreview(data.slice(0, 5)); // Show first 5 rows for preview
    };
    reader.readAsText(file);
  };

  const downloadCsvTemplate = () => {
    const template = [
      'name,email,level,schoolName,title',
      'John Doe,john.doe@schools.nyc.gov,3,Adult Education Center,Principal',
      'Jane Smith,jane.smith@schools.nyc.gov,3,Adult Education Center,Assistant Principal',
      'Bob Johnson,bob.johnson@schools.nyc.gov,4,Adult Education Center,Admin Principal'
    ].join('\n');

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'user_import_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const processCsvImport = async () => {
    if (csvData.length === 0) return;

    setImporting(true);
    setImportResults(null);

    try {
      const response = await fetch('/api/users/bulk-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ users: csvData }),
      });

      if (response.ok) {
        const result = await response.json();
        setImportResults(result);
        await fetchUsers(); // Refresh user list
        toast.success(
          `Import completed: ${result.successCount} created${result.errorCount ? `, ${result.errorCount} errors` : ''}`
        );
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Import failed');
      }
    } catch (error) {
      console.error('Error importing users:', error);
      toast.error('Error importing users. Please try again.');
    } finally {
      setImporting(false);
    }
  };

  const resetCsvImport = () => {
    setCsvData([]);
    setCsvPreview([]);
    setImportResults(null);
    setShowCsvImportModal(false);
  };

  // Handle filtered users from SmartFilters
  const handleFilteredUsers = (filtered) => {
    setFilteredUsers(filtered);
  };

  // Handle export filtered users
  const handleExportFiltered = () => {
    if (filteredUsers.length > 0) {
      downloadUsersCsv(filteredUsers);
    } else {
      toast.error('No filtered users to export');
    }
  };

  // Handle user creation from templates
  const handleUsersCreated = () => {
    fetchUsers(); // Refresh the user list
  };

  const toggleUserSelection = (user) => {
    setSelectedUsers(prev => 
      prev.find(u => u._id === user._id)
        ? prev.filter(u => u._id !== user._id)
        : [...prev, user]
    );
  };

  // Don't render until session is loaded
  if (status === 'loading' || !session) {
    return (
      <Column minHeight="100vh" horizontal="center" vertical="center" gap="16" background="page">
        <Spinner size="l" />
        <Text onBackground="neutral-weak">Loading...</Text>
      </Column>
    );
  }

  return (
    <DashboardShell
      sidebar={<DashboardSidebar session={session} userLevel={session.user.level} />}
      header={
        <DashboardHeader
          title={
            activeTab === 'collaboration'
              ? 'Collaboration'
              : activeTab === 'analytics'
                ? 'User analytics'
                : activeTab === 'templates'
                  ? 'Role templates'
                  : session.user.level === 4
                    ? 'School users'
                    : 'Users'
          }
          description={
            activeTab === 'collaboration'
              ? 'Share school plans with Level 3 staff'
              : session.user.level === 4
                ? 'Manage accounts and permissions for your school'
                : 'Manage accounts and permissions across all schools'
          }
          session={session}
          userLevel={session.user.level}
          actions={
            <Row gap="8" wrap>
              <Button size="s" onClick={handleCreateUser}>
                Add user
              </Button>
              <Button size="s" variant="secondary" onClick={() => setShowAdvancedModal(true)}>
                Advanced
              </Button>
              <Button size="s" variant="secondary" onClick={() => setShowBulkModal(true)}>
                Bulk actions
              </Button>
              {session.user.level === 5 && (
                <Button size="s" variant="secondary" href="/admin/logs">
                  System logs
                </Button>
              )}
              <Button size="s" variant="secondary" onClick={() => setShowAuditModal(true)}>
                Audit log
              </Button>
              <Button size="s" variant="secondary" onClick={() => setShowCsvImportModal(true)}>
                Import CSV
              </Button>
            </Row>
          }
        />
      }
    >
      <UsersWorkspace
        userLevel={session.user.level}
        actor={session.user}
        activeTab={activeTab}
        onTabChange={selectTab}
        users={users}
        filteredUsers={filteredUsers}
        loading={loading}
        selectedUsers={selectedUsers}
        onToggleSelect={toggleUserSelection}
        onEdit={handleEditUser}
        onDelete={handleDeleteUser}
        filters={
          <SmartFilters
            users={users}
            onFilteredUsers={handleFilteredUsers}
            onExportFiltered={handleExportFiltered}
          />
        }
        analytics={<UserAnalytics users={users} />}
        templates={<UserRoleTemplates onCreateUsers={handleUsersCreated} />}
        collaboration={<CollaborationDashboard user={session.user} />}
      />

      <div className="legacy-ui">
        {/* Modal for Create/Edit User */}
        {showModal && (
          <Modal onClose={() => setShowModal(false)} labelledBy="user-form-title">
            <div className="bg-white rounded-lg p-8 w-full max-w-lg max-h-90vh overflow-y-auto">
              <h3 id="user-form-title" className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
                <UserPlus className="w-6 h-6 mr-2 text-blue-600" />
                {editingUser ? 'Edit User' : 'Create New User'}
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    required
                    disabled={editingUser}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      editingUser ? 'bg-gray-100 cursor-not-allowed' : ''
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Level
                  </label>
                                     <select
                     value={formData.level}
                     onChange={(e) => setFormData({...formData, level: parseInt(e.target.value)})}
                     className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                   >
                     <option value={1}>Level 1 - Viewer (Can only view forms they're assigned to)</option>
                     <option value={2}>Level 2 - Other Titles (Can view and edit forms from their school)</option>
                     <option value={3}>Level 3 - Assistant Principal (Can view and edit forms they're assigned to)</option>
                     {session?.user?.level === 5 && (
                       <>
                         <option value={4}>Level 4 - Admin Principal (Can create forms, manage school users, assign forms)</option>
                         <option value={5}>Level 5 - Super Admin (Full access to everything, manage all users and forms)</option>
                       </>
                     )}
                   </select>
                </div>

                                                 <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    School Name *
                  </label>
                  <select
                    value={formData.schoolName}
                    onChange={(e) => setFormData({...formData, schoolName: e.target.value})}
                    required
                    disabled={session?.user?.level < 5}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      session?.user?.level < 5 ? 'bg-gray-100 cursor-not-allowed' : ''
                    }`}
                  >
                    <option value="">Select a school...</option>
                    {SCHOOL_NAMES.map((schoolName) => (
                      <option key={schoolName} value={schoolName}>
                        {schoolName}
                      </option>
                    ))}
                  </select>
                </div>

                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-2">
                     Professional Title
                   </label>
                   <input
                     type="text"
                     value={formData.title}
                     onChange={(e) => setFormData({...formData, title: e.target.value})}
                     placeholder="e.g., Principal, Assistant Principal, Teacher, Staff"
                     className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                   />
                 </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label className="ml-2 text-sm font-medium text-gray-700">
                    Active User
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors duration-200"
                  >
                    {editingUser ? 'Update User' : 'Create User'}
                  </button>
                </div>
              </form>
            </div>
          </Modal>
        )}

        {/* Advanced User Management Modal */}
        {showAdvancedModal && (
          <Modal
            onClose={() => setShowAdvancedModal(false)}
            size="wide"
            labelledBy="advanced-users-title"
          >
            <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl my-8 max-h-[95vh] flex flex-col">
              <div className="p-6 border-b border-gray-200 flex-shrink-0">
                <h3 id="advanced-users-title" className="text-2xl font-semibold text-gray-900 flex items-center">
                  <Shield className="w-6 h-6 mr-2 text-indigo-600" />
                  Advanced User Management
                </h3>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Account Status Management */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-800">Account Status Management</h4>
                  {users.map(user => (
                    <div key={user._id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-medium text-gray-900">{user.name}</p>
                          <p className="text-sm text-gray-600">{user.email}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">User Level</label>
                                                     <select
                             className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                             value={user.level}
                             onChange={(e) => handlePermissionUpdate(user._id, { level: parseInt(e.target.value) })}
                           >
                             <option value={1}>Level 1 - Viewer (Can only view forms they're assigned to)</option>
                             <option value={2}>Level 2 - Other Titles (Can view and edit forms from their school)</option>
                             <option value={3}>Level 3 - Assistant Principal (Can view and edit forms they're assigned to)</option>
                             {session?.user?.level === 5 && (
                               <>
                                 <option value={4}>Level 4 - Admin Principal (Can create forms, manage school users, assign forms)</option>
                                 <option value={5}>Level 5 - Super Admin (Full access to everything, manage all users and forms)</option>
                               </>
                             )}
                           </select>
                        </div>
                        
                                                 <div>
                           <label className="block text-sm font-medium text-gray-700 mb-1">Professional Title</label>
                           <input
                             type="text"
                             className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                             defaultValue={user.title || ''}
                             onBlur={(e) => {
                               const next = e.target.value.trim();
                               if (next !== (user.title || '')) {
                                 handlePermissionUpdate(user._id, { title: next });
                               }
                             }}
                             placeholder="e.g., Principal, Teacher, Staff"
                           />
                         </div>
                         
                         <div className="flex items-center">
                           <input
                             type="checkbox"
                             className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                             checked={user.isActive}
                             onChange={(e) => handlePermissionUpdate(user._id, { isActive: e.target.checked })}
                           />
                           <span className="ml-2 text-sm text-gray-700">Active Account</span>
                         </div>
                      </div>
                    </div>
                  ))}
                </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 p-6 border-t border-gray-200 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAdvancedModal(false)}
                  className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors duration-200"
                >
                  Close
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* Bulk Actions Modal */}
        {showBulkModal && (
          <Modal onClose={() => setShowBulkModal(false)} labelledBy="bulk-users-title">
            <div className="bg-white rounded-lg p-8 w-full max-w-2xl max-h-90vh overflow-y-auto">
              <h3 id="bulk-users-title" className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
                <Users className="w-6 h-6 mr-2 text-purple-600" />
                Bulk User Management
              </h3>
              
              <div className="space-y-6">
                {/* User Selection */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-3">Select Users</h4>
                  <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-3">
                    {users.map(user => (
                      <label key={user._id} className="flex items-center p-2 hover:bg-gray-50 rounded">
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                          checked={selectedUsers.find(u => u._id === user._id) ? true : false}
                          onChange={() => toggleUserSelection(user)}
                        />
                                                 <span className="ml-3 text-sm text-gray-900">{user.name}</span>
                         <span className="ml-2 text-xs text-gray-500">({user.email})</span>
                         {user.title && (
                           <span className="ml-2 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                             {user.title}
                           </span>
                         )}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Bulk Action Selection */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-3">Choose Action</h4>
                  <select
                    value={bulkAction}
                    onChange={(e) => setBulkAction(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="">Select an action...</option>
                    <option value="activate">Activate Selected Users</option>
                    <option value="deactivate">Deactivate Selected Users</option>
                    <option value="delete">Delete Selected Users</option>
                    <option value="level_up">Promote to Next Level</option>
                    <option value="level_down">Demote to Previous Level</option>
                  </select>
                </div>

                {/* Action Preview */}
                {selectedUsers.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      <strong>Selected:</strong> {selectedUsers.length} user(s)
                    </p>
                    <p className="text-sm text-blue-700 mt-1">
                      {selectedUsers.map(u => u.name).join(', ')}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowBulkModal(false);
                    setSelectedUsers([]);
                    setBulkAction('');
                  }}
                  className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBulkAction}
                  disabled={selectedUsers.length === 0 || !bulkAction}
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors duration-200"
                >
                  Execute Bulk Action
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* Audit Log Modal */}
        {showAuditModal && (
          <Modal onClose={() => setShowAuditModal(false)} size="full" labelledBy="audit-log-title">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl my-8 max-h-[95vh] flex flex-col">
              <div className="p-6 border-b border-gray-200 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <h3 id="audit-log-title" className="text-2xl font-semibold text-gray-900 flex items-center">
                    <BarChart3 className="w-6 h-6 mr-2 text-amber-600" />
                    User Activity Audit Log
                  </h3>
                  <button
                    onClick={fetchAuditLogs}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition-colors duration-200"
                  >
                    Refresh Logs
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-4">
                {auditLogs.length === 0 ? (
                  <div className="text-center py-12 text-gray-600">
                    <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <p>No audit logs found. Click "Refresh Logs" to load recent activity.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-full">
                      <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                        <tr>
                          <th className="text-left p-3 text-sm font-semibold text-gray-700 whitespace-nowrap">Timestamp</th>
                          <th className="text-left p-3 text-sm font-semibold text-gray-700 whitespace-nowrap">User</th>
                          <th className="text-left p-3 text-sm font-semibold text-gray-700 whitespace-nowrap">Action</th>
                          <th className="text-left p-3 text-sm font-semibold text-gray-700">Details</th>
                          <th className="text-left p-3 text-sm font-semibold text-gray-700 whitespace-nowrap">IP Address</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {auditLogs.map((log, index) => (
                          <tr key={log._id || `${log.timestamp}-${index}`} className="hover:bg-gray-50">
                            <td className="p-3 text-sm text-gray-600 whitespace-nowrap">
                              {new Date(log.timestamp).toLocaleString()}
                            </td>
                            <td className="p-3 text-sm font-medium text-gray-900 whitespace-nowrap">{log.userName}</td>
                            <td className="p-3 text-sm text-gray-700 whitespace-nowrap">{log.action}</td>
                            <td className="p-3 text-sm text-gray-700 max-w-md">{log.details}</td>
                            <td className="p-3 text-sm text-gray-600 whitespace-nowrap">{log.ipAddress || 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                </div>
              </div>

              <div className="flex justify-end gap-3 p-6 border-t border-gray-200 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAuditModal(false)}
                  className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors duration-200"
                >
                  Close
                </button>
              </div>
            </div>
          </Modal>
                 )}

         {/* CSV Import Modal */}
         {showCsvImportModal && (
           <Modal onClose={() => setShowCsvImportModal(false)} size="xl" labelledBy="csv-import-title">
             <div className="bg-white rounded-lg p-8 w-full max-w-4xl max-h-90vh overflow-y-auto">
               <div className="flex items-center justify-between mb-6">
                 <h3 id="csv-import-title" className="text-2xl font-semibold text-gray-900 flex items-center">
                   <Download className="w-6 h-6 mr-2 text-emerald-600" />
                   Bulk Import Users from CSV
                 </h3>
                 <button
                   onClick={downloadCsvTemplate}
                   className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors duration-200"
                 >
                   Download Template
                 </button>
               </div>

               <div className="space-y-6">
                 {/* File Upload */}
                 <div>
                   <h4 className="text-lg font-semibold text-gray-800 mb-3">Step 1: Upload CSV File</h4>
                   <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                     <input
                       type="file"
                       accept=".csv"
                       onChange={handleCsvFileUpload}
                       className="hidden"
                       id="csv-upload"
                     />
                     <label
                       htmlFor="csv-upload"
                       className="cursor-pointer inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors duration-200"
                     >
                       <Download className="w-4 h-4 mr-2" />
                       Choose CSV File
                     </label>
                     <p className="text-sm text-gray-600 mt-2">
                       Upload a CSV file with columns: name, email, level, schoolName, title
                     </p>
                   </div>
                 </div>

                 {/* CSV Preview */}
                 {csvPreview.length > 0 && (
                   <div>
                     <h4 className="text-lg font-semibold text-gray-800 mb-3">Step 2: Preview Data ({csvData.length} users)</h4>
                     <div className="overflow-x-auto border border-gray-200 rounded-lg">
                       <table className="w-full">
                         <thead className="bg-gray-50">
                           <tr>
                             <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                             <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                             <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Level</th>
                             <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">School</th>
                             <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                           </tr>
                         </thead>
                         <tbody className="bg-white divide-y divide-gray-200">
                           {csvPreview.map((row, index) => (
                             <tr key={index} className="hover:bg-gray-50">
                               <td className="px-3 py-2 text-sm text-gray-900">{row.name}</td>
                               <td className="px-3 py-2 text-sm text-gray-700">{row.email}</td>
                               <td className="px-3 py-2 text-sm text-gray-700">
                                 <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                                   row.level == 3 ? 'bg-indigo-100 text-indigo-800' :
                                   row.level == 4 ? 'bg-amber-100 text-amber-800' :
                                   'bg-gray-100 text-gray-800'
                                 }`}>
                                   Level {row.level} ({row.level == 3 ? 'Assistant Principal' : row.level == 4 ? 'Admin Principal' : 'Other'})
                                 </span>
                               </td>
                               <td className="px-3 py-2 text-sm text-gray-700">{row.schoolName}</td>
                               <td className="px-3 py-2 text-sm text-gray-700">{row.title}</td>
                             </tr>
                           ))}
                           {csvData.length > 5 && (
                             <tr>
                               <td colSpan="5" className="px-3 py-2 text-sm text-gray-500 text-center">
                                 ... and {csvData.length - 5} more users
                               </td>
                             </tr>
                           )}
                         </tbody>
                       </table>
                     </div>
                   </div>
                 )}

                 {/* Import Results */}
                 {importResults && (
                   <div>
                     <h4 className="text-lg font-semibold text-gray-800 mb-3">Import Results</h4>
                     <div className={`rounded-lg p-4 ${
                       importResults.errorCount === 0 ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'
                     }`}>
                       <div className="flex items-center justify-between">
                         <div>
                           <p className={`text-sm font-medium ${
                             importResults.errorCount === 0 ? 'text-green-800' : 'text-yellow-800'
                           }`}>
                             {importResults.errorCount === 0 ? '✅ Import Successful!' : '⚠️ Import Completed with Errors'}
                           </p>
                           <p className={`text-sm ${
                             importResults.errorCount === 0 ? 'text-green-700' : 'text-yellow-700'
                           }`}>
                             {importResults.successCount} users created successfully
                             {importResults.errorCount > 0 && `, ${importResults.errorCount} errors encountered`}
                           </p>
                         </div>
                         <div className="text-right">
                           <p className="text-2xl font-bold text-green-600">{importResults.successCount}</p>
                           <p className="text-sm text-green-600">Users Created</p>
                         </div>
                       </div>
                       
                       {importResults.errors && importResults.errors.length > 0 && (
                         <div className="mt-3 pt-3 border-t border-yellow-200">
                           <p className="text-sm font-medium text-yellow-800 mb-2">Errors:</p>
                           <div className="space-y-1">
                             {importResults.errors.slice(0, 5).map((error, index) => (
                               <p key={index} className="text-xs text-yellow-700">
                                 Row {error.row}: {error.message}
                               </p>
                             ))}
                             {importResults.errors.length > 5 && (
                               <p className="text-xs text-yellow-700">
                                 ... and {importResults.errors.length - 5} more errors
                               </p>
                             )}
                           </div>
                         </div>
                       )}
                     </div>
                   </div>
                 )}

                 {/* Action Buttons */}
                 <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                   <button
                     type="button"
                     onClick={resetCsvImport}
                     className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors duration-200"
                   >
                     Cancel
                   </button>
                   {csvData.length > 0 && (
                     <button
                       type="button"
                       onClick={processCsvImport}
                       disabled={importing}
                       className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors duration-200"
                     >
                       {importing ? (
                         <>
                           <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                           Importing...
                         </>
                       ) : (
                         <>
                           <Download className="w-4 h-4 mr-2" />
                           Import {csvData.length} Users
                         </>
                       )}
                     </button>
                   )}
                 </div>
               </div>
             </div>
           </Modal>
         )}
      </div>
    </DashboardShell>
  );
}

export default function AdminUsersPage() {
  return (
    <Suspense fallback={
      <Column minHeight="100vh" horizontal="center" vertical="center" gap="16" background="page">
        <Spinner size="l" />
        <Text onBackground="neutral-weak">Loading...</Text>
      </Column>
    }>
      <AdminUsersPageContent />
    </Suspense>
  );
}