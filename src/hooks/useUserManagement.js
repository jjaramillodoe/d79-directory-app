'use client';

import { useEffect, useState } from 'react';
import { canManageTarget as canManageUser } from '../lib/canManageUser';
import { downloadUsersCsv } from '../components/admin/UsersTable';
import * as logger from '../lib/logger';

const EMPTY_FORM = {
  name: '',
  email: '',
  level: 1,
  schoolName: '',
  title: '',
  isActive: true,
};

export default function useUserManagement({ session, toast }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
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
  const [filteredUsers, setFilteredUsers] = useState([]);

  useEffect(() => {
    if (session && session.user.level >= 4) {
      fetchUsers();
    }
    // session object identity changes often; reload when the actor changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.email, session?.user?.level]);

  useEffect(() => {
    setFilteredUsers(users);
  }, [users]);

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
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      logger.error('Error fetching users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = () => {
    setEditingUser(null);
    setFormData({
      ...EMPTY_FORM,
      schoolName: session?.user?.level < 5 ? session?.user?.schoolName || '' : '',
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
      isActive: user.isActive,
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user._id }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      fetchUsers();
      toast.success('User deleted');
    } catch (error) {
      logger.error('Error deleting user:', error);
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
      const body = editingUser ? { userId: editingUser._id, ...formData } : formData;
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      fetchUsers();
      setShowModal(false);
      toast.success(editingUser ? 'User updated' : 'User created');
    } catch (error) {
      logger.error('Error saving user:', error);
      toast.error('Error saving user. Please try again.');
    }
  };

  const handleBulkAction = async () => {
    if (selectedUsers.length === 0 || !bulkAction) {
      toast.error('Select users and choose an action');
      return;
    }

    try {
      const response = await fetch('/api/users/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds: selectedUsers.map((u) => u._id),
          action: bulkAction,
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
      logger.error('Error performing bulk action:', error);
      toast.error('Error performing bulk action. Please try again.');
    }
  };

  const handlePermissionUpdate = async (userId, changes) => {
    try {
      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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
      logger.error('Error updating user:', error);
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
      logger.error('Error fetching audit logs:', error);
    }
  };

  const handleCsvFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const csv = e.target.result;
      const lines = csv.split('\n');
      const headers = lines[0].split(',').map((h) => h.trim().replace(/"/g, ''));
      const data = lines
        .slice(1)
        .filter((line) => line.trim())
        .map((line) => {
          const values = line.split(',').map((v) => v.trim().replace(/"/g, ''));
          const row = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          return row;
        });
      setCsvData(data);
      setCsvPreview(data.slice(0, 5));
    };
    reader.readAsText(file);
  };

  const downloadCsvTemplate = () => {
    const template = [
      'name,email,level,schoolName,title',
      'John Doe,john.doe@schools.nyc.gov,3,Adult Education Center,Principal',
      'Jane Smith,jane.smith@schools.nyc.gov,3,Adult Education Center,Assistant Principal',
      'Bob Johnson,bob.johnson@schools.nyc.gov,4,Adult Education Center,Admin Principal',
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users: csvData }),
      });
      if (response.ok) {
        const result = await response.json();
        setImportResults(result);
        await fetchUsers();
        toast.success(
          `Import completed: ${result.successCount} created${result.errorCount ? `, ${result.errorCount} errors` : ''}`
        );
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Import failed');
      }
    } catch (error) {
      logger.error('Error importing users:', error);
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

  const closeBulkModal = () => {
    setShowBulkModal(false);
    setSelectedUsers([]);
    setBulkAction('');
  };

  const toggleUserSelection = (user) => {
    setSelectedUsers((prev) =>
      prev.find((u) => u._id === user._id) ? prev.filter((u) => u._id !== user._id) : [...prev, user]
    );
  };

  const handleExportFiltered = () => {
    if (filteredUsers.length > 0) {
      downloadUsersCsv(filteredUsers);
    } else {
      toast.error('No filtered users to export');
    }
  };

  return {
    users,
    loading,
    filteredUsers,
    setFilteredUsers,
    selectedUsers,
    fetchUsers,
    handleCreateUser,
    handleEditUser,
    handleDeleteUser,
    handleUsersCreated: fetchUsers,
    handleFilteredUsers: setFilteredUsers,
    handleExportFiltered,
    toggleUserSelection,
    showAdvancedModal,
    setShowAdvancedModal,
    showBulkModal,
    setShowBulkModal,
    showAuditModal,
    setShowAuditModal,
    showCsvImportModal,
    setShowCsvImportModal,
    modals: {
      session,
      users,
      formData,
      setFormData,
      editingUser,
      showModal,
      onCloseModal: () => setShowModal(false),
      onSubmit: handleSubmit,
      showAdvancedModal,
      onCloseAdvanced: () => setShowAdvancedModal(false),
      onPermissionUpdate: handlePermissionUpdate,
      showBulkModal,
      onCloseBulk: closeBulkModal,
      selectedUsers,
      bulkAction,
      setBulkAction,
      onToggleSelect: toggleUserSelection,
      onBulkAction: handleBulkAction,
      showAuditModal,
      onCloseAudit: () => setShowAuditModal(false),
      auditLogs,
      onRefreshAudit: fetchAuditLogs,
      showCsvImportModal,
      csvData,
      csvPreview,
      importing,
      importResults,
      onCsvFileUpload: handleCsvFileUpload,
      onDownloadTemplate: downloadCsvTemplate,
      onProcessImport: processCsvImport,
      onCloseCsv: () => setShowCsvImportModal(false),
      onResetCsv: resetCsvImport,
    },
  };
}
