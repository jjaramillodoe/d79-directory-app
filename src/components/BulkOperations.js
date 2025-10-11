'use client';

import { useState } from 'react';
import { 
  CheckSquare, 
  Square, 
  Settings, 
  Mail, 
  FileText, 
  Download, 
  Upload,
  Trash2,
  Edit,
  Copy,
  Filter,
  Search,
  ChevronDown,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';

const BulkOperations = ({ forms, onUpdateForms }) => {
  const [selectedForms, setSelectedForms] = useState([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkAction, setBulkAction] = useState('');
  const [showEmailComposer, setShowEmailComposer] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Filter and search forms
  const filteredForms = forms.filter(form => {
    const matchesStatus = filterStatus === 'all' || form.status === filterStatus;
    const matchesSearch = form.schoolName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         form.principalName?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Handle form selection
  const handleSelectForm = (formId) => {
    if (selectedForms.includes(formId)) {
      setSelectedForms(selectedForms.filter(id => id !== formId));
    } else {
      setSelectedForms([...selectedForms, formId]);
    }
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedForms.length === filteredForms.length) {
      setSelectedForms([]);
    } else {
      setSelectedForms(filteredForms.map(form => form._id));
    }
  };

  // Bulk status update
  const handleBulkStatusUpdate = async (newStatus) => {
    if (selectedForms.length === 0) return;

    try {
      // Simulate API call for bulk update
      console.log(`Updating ${selectedForms.length} forms to status: ${newStatus}`);
      
      // Update local state (in real app, this would be handled by the parent component)
      const updatedForms = forms.map(form => {
        if (selectedForms.includes(form._id)) {
          return { ...form, status: newStatus, updatedAt: new Date().toISOString() };
        }
        return form;
      });

      onUpdateForms?.(updatedForms);
      setSelectedForms([]);
      setShowBulkActions(false);
      
      alert(`Successfully updated ${selectedForms.length} forms to ${newStatus} status!`);
    } catch (error) {
      console.error('Error updating forms:', error);
      alert('Error updating forms. Please try again.');
    }
  };

  // Bulk email
  const handleBulkEmail = async () => {
    if (selectedForms.length === 0 || !emailSubject || !emailMessage) return;

    try {
      const selectedFormData = forms.filter(form => selectedForms.includes(form._id));
      console.log('Sending email to:', selectedFormData.map(f => f.schoolName));
      console.log('Subject:', emailSubject);
      console.log('Message:', emailMessage);
      
      setSelectedForms([]);
      setShowEmailComposer(false);
      setEmailSubject('');
      setEmailMessage('');
      
      alert(`Email sent to ${selectedForms.length} schools!`);
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Error sending email. Please try again.');
    }
  };

  // Export selected forms
  const handleExport = () => {
    if (selectedForms.length === 0) return;

    const selectedFormData = forms.filter(form => selectedForms.includes(form._id));
    const csvData = selectedFormData.map(form => ({
      'School Name': form.schoolName,
      'Principal': form.principalName,
      'Email': form.principalEmail,
      'Status': form.status,
      'Progress': `${form.completedSteps?.length || 0}/14`,
      'Created': new Date(form.createdAt).toLocaleDateString(),
      'Updated': new Date(form.updatedAt || form.createdAt).toLocaleDateString()
    }));

    // Convert to CSV
    const headers = Object.keys(csvData[0]).join(',');
    const rows = csvData.map(row => Object.values(row).join(','));
    const csvContent = [headers, ...rows].join('\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `school-plans-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    alert(`Exported ${selectedForms.length} forms to CSV!`);
  };

  // Bulk delete forms
  const handleBulkDelete = async () => {
    if (selectedForms.length === 0) return;

    const confirmMessage = `Are you sure you want to permanently delete ${selectedCount} form${selectedCount > 1 ? 's' : ''}?\n\nThis action cannot be undone.`;
    
    if (!confirm(confirmMessage)) return;

    try {
      // Show loading state
      const deletePromises = selectedForms.map(formId => 
        fetch(`/api/forms/${formId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );

      const responses = await Promise.all(deletePromises);
      
      // Check if all deletions were successful
      const failedDeletions = responses.filter(response => !response.ok);
      
      if (failedDeletions.length > 0) {
        throw new Error(`${failedDeletions.length} deletion${failedDeletions.length > 1 ? 's' : ''} failed`);
      }

      // Update local state by removing deleted forms
      const updatedForms = forms.filter(form => !selectedForms.includes(form._id));
      onUpdateForms?.(updatedForms);
      
      // Clear selection and close bulk actions
      setSelectedForms([]);
      setShowBulkActions(false);
      
      alert(`Successfully deleted ${selectedCount} form${selectedCount > 1 ? 's' : ''}!`);
    } catch (error) {
      console.error('Error deleting forms:', error);
      alert(`Error deleting forms: ${error.message}. Please try again.`);
    }
  };

  // Get status color and icon
  const getStatusStyle = (status) => {
    const styles = {
      draft: { color: 'text-gray-600', bg: 'bg-gray-100', icon: Edit },
      submitted: { color: 'text-blue-600', bg: 'bg-blue-100', icon: FileText },
      under_review: { color: 'text-orange-600', bg: 'bg-orange-100', icon: Clock },
      approved: { color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircle },
      rejected: { color: 'text-red-600', bg: 'bg-red-100', icon: AlertCircle }
    };
    return styles[status] || styles.draft;
  };

  const selectedCount = selectedForms.length;
  const totalCount = filteredForms.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Bulk Operations</h2>
        <div className="flex items-center gap-3">
          {selectedCount > 0 && (
            <span className="text-sm text-gray-600">
              {selectedCount} of {totalCount} selected
            </span>
          )}
          <button
            onClick={() => setShowBulkActions(!showBulkActions)}
            disabled={selectedCount === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Settings className="w-4 h-4" />
            Bulk Actions
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search schools or principals..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="under_review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bulk Actions Panel */}
      {showBulkActions && selectedCount > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-blue-900">
              Bulk Actions for {selectedCount} Selected Forms
            </h3>
            <button
              onClick={() => setShowBulkActions(false)}
              className="text-blue-600 hover:text-blue-800"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Status Updates */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-blue-800">Update Status</h4>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleBulkStatusUpdate('draft')}
                  className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
                >
                  Mark Draft
                </button>
                <button
                  onClick={() => handleBulkStatusUpdate('submitted')}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                  Mark Submitted
                </button>
                <button
                  onClick={() => handleBulkStatusUpdate('under_review')}
                  className="px-3 py-1 bg-orange-600 text-white text-sm rounded hover:bg-orange-700"
                >
                  Mark Under Review
                </button>
                <button
                  onClick={() => handleBulkStatusUpdate('approved')}
                  className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleBulkStatusUpdate('rejected')}
                  className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                >
                  Reject
                </button>
              </div>
            </div>

            {/* Communication */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-blue-800">Communication</h4>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setShowEmailComposer(true)}
                  className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 flex items-center gap-1"
                >
                  <Mail className="w-3 h-3" />
                  Send Email
                </button>
              </div>
            </div>

            {/* Data Operations */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-blue-800">Data Operations</h4>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleExport}
                  className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 flex items-center gap-1"
                >
                  <Download className="w-3 h-3" />
                  Export CSV
                </button>
                <button
                  onClick={() => alert('Duplicate feature coming soon!')}
                  className="px-3 py-1 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  Duplicate
                </button>
              </div>
            </div>

            {/* Advanced */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-blue-800">Advanced</h4>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleBulkDelete}
                  className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Forms Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedCount === totalCount && totalCount > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300"
                    />
                    <span className="ml-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Select All
                    </span>
                  </label>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  School
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Principal
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Progress
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Updated
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredForms.map((form) => {
                const statusStyle = getStatusStyle(form.status);
                const StatusIcon = statusStyle.icon;
                const isSelected = selectedForms.includes(form._id);

                return (
                  <tr key={form._id} className={isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectForm(form._id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{form.schoolName}</div>
                        <div className="text-sm text-gray-500">{form.principalEmail}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{form.principalName}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {form.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${((form.completedSteps?.length || 0) / 14) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600">
                          {form.completedSteps?.length || 0}/14
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(form.updatedAt || form.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {filteredForms.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No forms match your current filters.</p>
          </div>
        )}
      </div>

      {/* Email Composer Modal */}
      {showEmailComposer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Send Email to Selected Schools</h3>
                <button
                  onClick={() => setShowEmailComposer(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Email subject..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message
                </label>
                <textarea
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Type your message here..."
                />
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Recipients:</strong> {selectedCount} schools selected
                </p>
              </div>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowEmailComposer(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkEmail}
                  disabled={!emailSubject || !emailMessage}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  Send Email
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkOperations;
