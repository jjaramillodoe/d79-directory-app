'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { 
  Users, 
  UserPlus, 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Shield, 
  Building2, 
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  BarChart3,
  Info,
  User,
  Download,
  RefreshCw,
  Share2,
  BookOpen,
  Clock
} from 'lucide-react';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import CollaborationDashboard from '../../../components/CollaborationDashboard';
import UserAnalytics from '../../../components/UserAnalytics';
import SmartFilters from '../../../components/SmartFilters';
import UserRoleTemplates from '../../../components/UserRoleTemplates';
import SCHOOL_NAMES from '../../../constants/schools';

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

function AdminUsersPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
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
  const [permissionData, setPermissionData] = useState({
    canEditUsers: false,
    canDeleteUsers: false,
    canManagePermissions: false,
    canViewAuditLogs: false,
    canBulkActions: false
  });

  // Collaboration Dashboard State
  const [activeTab, setActiveTab] = useState('users');
  const [filteredUsers, setFilteredUsers] = useState([]);

  // Check for tab parameter in URL
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'collaboration') {
      setActiveTab('collaboration');
    }
  }, [searchParams]);

  // AG Grid configuration
  const [gridApi, setGridApi] = useState(null);
  const [gridColumnApi, setGridColumnApi] = useState(null);

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
      schoolName: '',
      title: '',
      isActive: true
    });
    setShowModal(true);
  };

  const handleEditUser = (user) => {
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
      alert('User deleted successfully!');
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Error deleting user. Please try again.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.email.trim()) {
      alert('Name and email are required');
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
      alert(editingUser ? 'User updated successfully!' : 'User updated successfully!');
    } catch (error) {
      console.error('Error saving user:', error);
      alert('Error saving user. Please try again.');
    }
  };

  // Advanced User Management Functions
  const handleBulkAction = async () => {
    if (selectedUsers.length === 0 || !bulkAction) {
      alert('Please select users and choose an action');
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
        alert('Bulk action completed successfully!');
      }
    } catch (error) {
      console.error('Error performing bulk action:', error);
      alert('Error performing bulk action. Please try again.');
    }
  };

  const handlePermissionUpdate = async (userId, permissions) => {
    try {
      const response = await fetch(`/api/users/${userId}/permissions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ permissions }),
      });

      if (response.ok) {
        await fetchUsers();
        alert('User permissions updated successfully!');
      }
    } catch (error) {
      console.error('Error updating permissions:', error);
      alert('Error updating permissions. Please try again.');
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
        alert(`Import completed! ${result.successCount} users created, ${result.errorCount} errors.`);
      } else {
        const errorData = await response.json();
        alert(`Import failed: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error importing users:', error);
      alert('Error importing users. Please try again.');
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
    if (gridApi && filteredUsers.length > 0) {
      gridApi.exportDataAsCsv({
        fileName: `filtered-users-${new Date().toISOString().split('T')[0]}.csv`
      });
    } else {
      alert('No filtered users to export');
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

  // AG Grid event handlers
  const onGridReady = (params) => {
    setGridApi(params.api);
    setGridColumnApi(params.columnApi);
  };

  // AG Grid column definitions
  const columnDefs = [
         {
       headerName: '',
       field: 'select',
       width: 50,
       pinned: 'left',
       sortable: false,
       filter: false,
       resizable: false
     },
    {
      headerName: 'Name',
      field: 'name',
      sortable: true,
      filter: true,
      resizable: true,
      width: 200,
      cellRenderer: (params) => (
        <div className="font-medium text-gray-900">{params.value}</div>
      )
    },
    {
      headerName: 'Email',
      field: 'email',
      sortable: true,
      filter: true,
      resizable: true,
      width: 250,
      cellRenderer: (params) => (
        <div className="text-sm text-gray-700">{params.value}</div>
      )
    },
    {
      headerName: 'Level',
      field: 'level',
      sortable: true,
      filter: true,
      resizable: true,
      width: 180,
      cellRenderer: (params) => getLevelBadge(params.value)
    },
    {
      headerName: 'School',
      field: 'schoolName',
      sortable: true,
      filter: true,
      resizable: true,
      width: 200,
      cellRenderer: (params) => (
        <div className="flex items-center text-sm text-gray-700">
          <Building2 className="w-4 h-4 mr-2 text-gray-400" />
          {params.value || '-'}
        </div>
      )
    },
    {
      headerName: 'Title',
      field: 'title',
      sortable: true,
      filter: true,
      resizable: true,
      width: 180,
      cellRenderer: (params) => (
        <div className="flex items-center text-sm text-gray-700">
          <User className="w-4 h-4 mr-2 text-gray-400" />
          {params.value || '-'}
        </div>
      )
    },
    {
      headerName: 'Status',
      field: 'isActive',
      sortable: true,
      filter: true,
      resizable: true,
      width: 120,
      cellRenderer: (params) => getStatusBadge(params.value)
    },
    {
      headerName: 'Created',
      field: 'createdAt',
      sortable: true,
      filter: true,
      resizable: true,
      width: 150,
      cellRenderer: (params) => (
        <div className="flex items-center text-sm text-gray-700">
          <Calendar className="w-4 h-4 mr-2 text-gray-400" />
          {new Date(params.value).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })}
        </div>
      )
    },
    {
      headerName: 'Last Login',
      field: 'lastLogin',
      sortable: true,
      filter: true,
      resizable: true,
      width: 180,
      cellRenderer: (params) => {
        if (!params.value) {
          return (
            <div className="flex items-center text-sm text-gray-400 italic">
              <Clock className="w-4 h-4 mr-2" />
              Never
            </div>
          );
        }
        const lastLogin = new Date(params.value);
        const now = new Date();
        const diffMs = now - lastLogin;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        
        let timeAgo = '';
        let colorClass = 'text-gray-700';
        
        if (diffDays > 30) {
          timeAgo = `${diffDays} days ago`;
          colorClass = 'text-red-600';
        } else if (diffDays > 7) {
          timeAgo = `${diffDays} days ago`;
          colorClass = 'text-orange-600';
        } else if (diffDays > 0) {
          timeAgo = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
          colorClass = 'text-yellow-600';
        } else if (diffHours > 0) {
          timeAgo = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
          colorClass = 'text-green-600';
        } else if (diffMinutes > 0) {
          timeAgo = `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
          colorClass = 'text-green-600';
        } else {
          timeAgo = 'Just now';
          colorClass = 'text-green-600';
        }
        
        return (
          <div className="flex items-center text-sm">
            <Clock className={`w-4 h-4 mr-2 ${colorClass}`} />
            <div>
              <div className={colorClass}>{timeAgo}</div>
              <div className="text-xs text-gray-500">
                {lastLogin.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })} {lastLogin.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
          </div>
        );
      }
    },
    {
      headerName: 'Actions',
      field: 'actions',
      sortable: false,
      filter: false,
      resizable: false,
      width: 150,
      cellRenderer: (params) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleEditUser(params.data)}
            className="inline-flex items-center px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium rounded-md transition-colors duration-200"
          >
            <Edit className="w-3 h-3 mr-1" />
            Edit
          </button>
          <button
            onClick={() => handleDeleteUser(params.data)}
            className="inline-flex items-center px-2 py-1 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded-md transition-colors duration-200"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Delete
          </button>
        </div>
      )
    }
  ];

  // AG Grid default column properties
  const defaultColDef = {
    sortable: true,
    filter: true,
    resizable: true,
    minWidth: 100,
    flex: 1
  };

     // AG Grid row selection
   const onSelectionChanged = () => {
     const selectedRows = gridApi?.getSelectedRows() || [];
     setSelectedUsers(selectedRows);
   };

   // AG Grid options with modern configuration
   const gridOptions = {
     rowSelection: {
       type: 'multiple',
       headerCheckbox: true,
       checkboxes: true,
       enableClickSelection: false
     },
     pagination: true,
     paginationPageSize: 20,
     paginationPageSizeSelector: [20, 50, 100]
   };

  const getLevelBadge = (level) => {
    const levelConfig = {
      1: { color: 'bg-gray-100 text-gray-800 border-gray-200', label: 'Viewer' },
      2: { color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Other Titles' },
      3: { color: 'bg-indigo-100 text-indigo-800 border-indigo-200', label: 'Assistant Principal' },
      4: { color: 'bg-amber-100 text-amber-800 border-amber-200', label: 'Admin Principal' },
      5: { color: 'bg-red-100 text-red-800 border-red-200', label: 'Super Admin' }
    };
    
    const config = levelConfig[level] || levelConfig[1];
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border ${config.color}`}>
        <Shield className="w-3 h-3" />
        Level {level} ({config.label})
      </span>
    );
  };

  const getStatusBadge = (isActive) => {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border ${
        isActive 
          ? 'bg-green-100 text-green-800 border-green-200' 
          : 'bg-red-100 text-red-800 border-red-200'
      }`}>
        {isActive ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
        {isActive ? 'Active' : 'Inactive'}
      </span>
    );
  };

  // Don't render until session is loaded
  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-transparent border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

     return (
     <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-8xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-4">
            <div className="mb-4 lg:mb-0">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {session?.user?.level === 4 ? 'School User Management' : 'All Users Management'}
              </h1>
              <p className="text-gray-600">
                {session?.user?.level === 4 
                  ? 'Manage user accounts and permissions for your school' 
                  : 'Manage all user accounts and permissions across all schools'
                }
              </p>
              <div className="flex items-center mt-2">
                <span className="text-sm text-gray-500">Logged in as: </span>
                <span className="ml-2 inline-flex items-center px-2 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded-md border border-amber-200">
                  <Shield className="w-3 h-3 mr-1" />
                  {session?.user?.name} (Level {session?.user?.level})
                </span>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCreateUser}
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors duration-200"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Add User
              </button>
              
              {/* Advanced User Management Actions */}
              <button
                onClick={() => setShowAdvancedModal(true)}
                className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors duration-200"
                title="Advanced User Management"
              >
                <Shield className="w-4 h-4 mr-2" />
                Advanced
              </button>
              
              <button
                onClick={() => setShowBulkModal(true)}
                className="inline-flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors duration-200"
                title="Bulk User Management"
              >
                <Users className="w-4 h-4 mr-2" />
                Bulk Actions
              </button>
              
              {session?.user?.level === 5 && (
                <Link href="/admin/logs">
                  <button
                    className="inline-flex items-center px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition-colors duration-200"
                    title="System Audit Logs (Super Admin Only)"
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    System Logs
                  </button>
                </Link>
              )}
              <button
                onClick={() => setShowAuditModal(true)}
                className="inline-flex items-center px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors duration-200"
                title="User Activity Audit"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Audit Log
              </button>
               
               <button
                 onClick={() => setShowCsvImportModal(true)}
                 className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors duration-200"
                 title="Bulk Import Users from CSV"
               >
                 <Download className="w-4 h-4 mr-2" />
                 Import CSV
               </button>
              
              <button
                onClick={() => setActiveTab('collaboration')}
                className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors duration-200"
                title="Collaboration Dashboard"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Collaboration
              </button>
              
              <Link href="/dashboard">
                <button className="inline-flex items-center px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors duration-200">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('users')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              {session?.user?.level === 4 ? 'School Users' : 'All Users'}
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'analytics'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <BarChart3 className="w-4 h-4 inline mr-2" />
              Analytics
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'templates'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <BookOpen className="w-4 h-4 inline mr-2" />
              Role Templates
            </button>
            <button
              onClick={() => setActiveTab('collaboration')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'collaboration'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Share2 className="w-4 h-4 inline mr-2" />
              Collaboration Dashboard
            </button>
          </nav>
        </div>

        {/* User Analytics Dashboard */}
        {activeTab === 'analytics' && (
          <UserAnalytics users={users} />
        )}

        {/* User Role Templates */}
        {activeTab === 'templates' && (
          <UserRoleTemplates onCreateUsers={handleUsersCreated} />
        )}

        {/* Collaboration Dashboard */}
        {activeTab === 'collaboration' && (
          <CollaborationDashboard user={session.user} />
        )}

        {/* User Management Content */}
        {activeTab === 'users' && (
          <>
            {/* Smart Filters */}
            <SmartFilters 
              users={users} 
              onFilteredUsers={handleFilteredUsers}
              onExportFiltered={handleExportFiltered}
            />

            {/* User Statistics */}
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{users.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Active Users</p>
                <p className="text-2xl font-bold text-gray-900">{users.filter(u => u.isActive).length}</p>
              </div>
            </div>
          </div>
          
                     <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
             <div className="flex items-center">
               <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                 <Shield className="w-5 h-5 text-indigo-600" />
               </div>
               <div>
                 <p className="text-sm font-medium text-gray-600">Principals</p>
                 <p className="text-2xl font-bold text-gray-900">{users.filter(u => u.level === 3).length}</p>
               </div>
             </div>
           </div>
           
           <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
             <div className="flex items-center">
               <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                 <User className="w-5 h-5 text-purple-600" />
               </div>
               <div>
                 <p className="text-sm font-medium text-gray-600">Staff with Titles</p>
                 <p className="text-2xl font-bold text-gray-900">{users.filter(u => u.title && u.title.trim() !== '').length}</p>
               </div>
             </div>
           </div>
          
                     <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
             <div className="flex items-center">
               <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center mr-3">
                 <Shield className="w-5 h-5 text-amber-600" />
               </div>
               <div>
                 <p className="text-sm font-medium text-gray-600">Admin Principals</p>
                 <p className="text-2xl font-bold text-gray-900">{users.filter(u => u.level === 4).length}</p>
               </div>
             </div>
           </div>
           
           <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
             <div className="flex items-center">
               <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                 <Shield className="w-5 h-5 text-red-600" />
               </div>
               <div>
                 <p className="text-sm font-medium text-gray-600">Super Admins</p>
                 <p className="text-2xl font-bold text-gray-900">{users.filter(u => u.level === 5).length}</p>
               </div>
             </div>
           </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Users className="w-5 h-5 mr-2 text-blue-600" />
              District 79 Users ({filteredUsers.length} of {users.length})
            </h2>
            <div className="flex gap-2 mt-2 lg:mt-0">
              <button
                onClick={() => gridApi?.exportDataAsCsv()}
                className="inline-flex items-center px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors duration-200"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </button>
              <button
                onClick={() => gridApi?.setFilterModel(null)}
                className="inline-flex items-center px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors duration-200"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Clear Filters
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-2 border-transparent border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading users...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-gray-600">
              <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p>No users match your filters.</p>
            </div>
          ) : (
                                      <div className="ag-theme-alpine w-full" style={{ height: '600px' }}>
               <AgGridReact
                 columnDefs={columnDefs}
                 rowData={filteredUsers}
                 defaultColDef={defaultColDef}
                 onGridReady={onGridReady}
                 onSelectionChanged={onSelectionChanged}
                 gridOptions={gridOptions}
                 domLayout="normal"
                 suppressCellFocus={true}
                 className="w-full"
                 rowHeight={60}
                 headerHeight={50}
                 theme="legacy"
               />
             </div>
          )}
        </div>



                 {/* Enhanced User Management Features Section */}
         <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6 mt-6">
           <div className="flex items-start justify-between">
             <div className="flex-1">
               <h3 className="text-green-800 font-bold text-lg mb-3 flex items-center">
                 <CheckCircle className="w-5 h-5 mr-2" />
                 User Management Features (Now Available!)
               </h3>
               <p className="text-green-700 text-sm mb-4">
                 Advanced user management capabilities are now fully implemented and ready to use. Take advantage of these powerful tools to manage your user base effectively.
               </p>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                 <div className="flex items-center text-green-700 text-sm">
                   <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                   ✅ Edit user levels and permissions
                 </div>
                 <div className="flex items-center text-green-700 text-sm">
                   <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                   ✅ Activate/deactivate user accounts
                 </div>
                 <div className="flex items-center text-green-700 text-sm">
                   <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                   ✅ Bulk user management tools
                 </div>
                 <div className="flex items-center text-green-700 text-sm">
                   <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                   ✅ User activity audit logs
                 </div>
                 <div className="flex items-center text-green-700 text-sm">
                   <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                   ✅ CSV bulk import for multiple users
                 </div>
               </div>
             </div>
             <div className="ml-4 flex-shrink-0">
               <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                 <CheckCircle className="w-8 h-8 text-green-600" />
               </div>
             </div>
           </div>
           
           {/* How to Use Section */}
           <div className="mt-6 pt-4 border-t border-green-200">
             <h4 className="text-green-800 font-semibold text-sm mb-2 flex items-center">
               <Info className="w-4 h-4 mr-2" />
               How to Use These Features
             </h4>
             <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-xs text-green-600">
               <span>• Click "Advanced" for permissions & status</span>
               <span>• Use "Bulk Actions" for multiple users</span>
               <span>• View "Audit Log" for activity tracking</span>
               <span>• Use "Import CSV" for bulk user creation</span>
             </div>
           </div>
         </div>

         {/* CSV Import Information Section */}
         <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 mt-6">
           <div className="flex items-start justify-between">
             <div className="flex-1">
               <h3 className="text-blue-800 font-bold text-lg mb-3 flex items-center">
                 <Download className="w-5 h-5 mr-2" />
                 CSV Bulk Import - Perfect for Onboarding Multiple Principals!
               </h3>
               <p className="text-blue-700 text-sm mb-4">
                 Need to add 24 principals and assistant principals quickly? Use our CSV import feature to create multiple users at once with proper validation and error handling.
               </p>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                 <div className="flex items-center text-blue-700 text-sm">
                   <CheckCircle className="w-4 h-4 mr-2 text-blue-600" />
                   ✅ Download CSV template with correct format
                 </div>
                 <div className="flex items-center text-blue-700 text-sm">
                   <CheckCircle className="w-4 h-4 mr-2 text-blue-600" />
                   ✅ Preview data before importing
                 </div>
                 <div className="flex items-center text-blue-700 text-sm">
                   <CheckCircle className="w-4 h-4 mr-2 text-blue-600" />
                   ✅ Automatic validation and error reporting
                 </div>
                 <div className="flex items-center text-blue-700 text-sm">
                   <CheckCircle className="w-4 h-4 mr-2 text-blue-600" />
                   ✅ Batch processing for large imports
                 </div>
               </div>
             </div>
             <div className="ml-4 flex-shrink-0">
               <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                 <Download className="w-8 h-8 text-blue-600" />
               </div>
             </div>
           </div>
           
           {/* CSV Format Section */}
           <div className="mt-6 pt-4 border-t border-blue-200">
             <h4 className="text-blue-800 font-semibold text-sm mb-2 flex items-center">
               <Info className="w-4 h-4 mr-2" />
               CSV Format Requirements
             </h4>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-blue-600">
               <span>• Required columns: name, email, level, schoolName</span>
               <span>• Optional columns: title</span>
               <span>• Level values: 1=Viewer, 2=Other, 3=Assistant Principal, 4=Admin Principal, 5=Super Admin</span>
               <span>• Email must be valid format (e.g., john.doe@schools.nyc.gov)</span>
             </div>
           </div>
         </div>
          </>
        )}

        {/* Modal for Create/Edit User */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-8 w-full max-w-lg max-h-90vh overflow-y-auto">
              <h3 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
          </div>
        )}

        {/* Advanced User Management Modal */}
        {showAdvancedModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl my-8 max-h-[95vh] flex flex-col">
              <div className="p-6 border-b border-gray-200 flex-shrink-0">
                <h3 className="text-2xl font-semibold text-gray-900 flex items-center">
                  <Shield className="w-6 h-6 mr-2 text-indigo-600" />
                  Advanced User Management
                </h3>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* User Permissions Management */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-800">User Permissions</h4>
                  {users.map(user => (
                    <div key={user._id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-medium text-gray-900">{user.name}</p>
                          <p className="text-sm text-gray-600">{user.email}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                            onChange={(e) => handlePermissionUpdate(user._id, { canEditUsers: e.target.checked })}
                          />
                          <span className="ml-2 text-sm text-gray-700">Can Edit Users</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                            onChange={(e) => handlePermissionUpdate(user._id, { canDeleteUsers: e.target.checked })}
                          />
                          <span className="ml-2 text-sm text-gray-700">Can Delete Users</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                            onChange={(e) => handlePermissionUpdate(user._id, { canManagePermissions: e.target.checked })}
                          />
                          <span className="ml-2 text-sm text-gray-700">Can Manage Permissions</span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>

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
                             value={user.title || ''}
                             onChange={(e) => handlePermissionUpdate(user._id, { title: e.target.value })}
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
          </div>
        )}

        {/* Bulk Actions Modal */}
        {showBulkModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-8 w-full max-w-2xl max-h-90vh overflow-y-auto">
              <h3 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
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
          </div>
        )}

        {/* Audit Log Modal */}
        {showAuditModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl my-8 max-h-[95vh] flex flex-col">
              <div className="p-6 border-b border-gray-200 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-semibold text-gray-900 flex items-center">
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
                          <tr key={index} className="hover:bg-gray-50">
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
          </div>
                 )}

         {/* CSV Import Modal */}
         {showCsvImportModal && (
           <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
             <div className="bg-white rounded-lg p-8 w-full max-w-4xl max-h-90vh overflow-y-auto">
               <div className="flex items-center justify-between mb-6">
                 <h3 className="text-2xl font-semibold text-gray-900 flex items-center">
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
           </div>
         )}
       </div>
     </div>
   );
 }

// Wrap the component that uses useSearchParams in Suspense
export default function AdminUsersPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-transparent border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <AdminUsersPageContent />
    </Suspense>
  );
}