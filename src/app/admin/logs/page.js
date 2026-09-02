'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { 
  FileText, 
  Filter, 
  Search, 
  Download, 
  RefreshCw,
  Calendar,
  User,
  Shield,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  ArrowLeft,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import Link from 'next/link';
import AppFooter from '../../../components/AppFooter';
import * as logger from '../../../lib/logger';

function AdminLogsPageContent() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    action: '',
    userEmail: '',
    targetType: '',
    startDate: '',
    endDate: '',
    search: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(50);

  // Handle authentication
  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/login');
      return;
    }

    // Only Super Admin (Level 5) can access logs
    if (session.user.level !== 5) {
      router.push('/dashboard');
      return;
    }
  }, [session, status, router]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.action) params.append('action', filters.action);
      if (filters.userEmail) params.append('userEmail', filters.userEmail);
      if (filters.targetType) params.append('targetType', filters.targetType);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      params.append('limit', pageSize.toString());
      params.append('skip', (currentPage * pageSize).toString());

      const response = await fetch(`/api/users/audit-logs?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      let logsData = data.logs || [];

      // Apply search filter if provided
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        logsData = logsData.filter(log => 
          log.userName?.toLowerCase().includes(searchLower) ||
          log.userEmail?.toLowerCase().includes(searchLower) ||
          log.action?.toLowerCase().includes(searchLower) ||
          log.details?.toLowerCase().includes(searchLower)
        );
      }

      setLogs(logsData);
      setTotal(data.total || 0);
    } catch (error) {
      logger.error('Error fetching logs:', error);
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [filters, currentPage, pageSize]);

  useEffect(() => {
    if (session && session.user.level === 5) {
      fetchLogs();
    }
  }, [session, fetchLogs]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(0); // Reset to first page when filters change
  };

  const clearFilters = () => {
    setFilters({
      action: '',
      userEmail: '',
      targetType: '',
      startDate: '',
      endDate: '',
      search: '',
    });
    setCurrentPage(0);
  };

  const exportLogs = () => {
    const escapeCsv = (str) => {
      if (!str) return '';
      return str.replace(/"/g, '""');
    };
    
    const csvContent = [
      ['Timestamp', 'User', 'Email', 'Action', 'Target Type', 'Details', 'IP Address'].join(','),
      ...logs.map(log => [
        new Date(log.timestamp).toISOString(),
        `"${escapeCsv(log.userName || '')}"`,
        log.userEmail || '',
        log.action || '',
        log.targetType || '',
        `"${escapeCsv(log.details || '')}"`,
        log.ipAddress || '',
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getActionIcon = (action) => {
    if (action?.includes('login')) return <CheckCircle className="w-4 h-4 text-green-600" />;
    if (action?.includes('created')) return <FileText className="w-4 h-4 text-blue-600" />;
    if (action?.includes('updated') || action?.includes('edited')) return <RefreshCw className="w-4 h-4 text-yellow-600" />;
    if (action?.includes('deleted')) return <XCircle className="w-4 h-4 text-red-600" />;
    if (action?.includes('approved')) return <CheckCircle className="w-4 h-4 text-green-600" />;
    if (action?.includes('rejected')) return <XCircle className="w-4 h-4 text-red-600" />;
    return <AlertCircle className="w-4 h-4 text-gray-600" />;
  };

  const getActionColor = (action) => {
    if (action?.includes('login')) return 'bg-green-100 text-green-800 border-green-200';
    if (action?.includes('created')) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (action?.includes('updated') || action?.includes('edited')) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (action?.includes('deleted')) return 'bg-red-100 text-red-800 border-red-200';
    if (action?.includes('approved')) return 'bg-green-100 text-green-800 border-green-200';
    if (action?.includes('rejected')) return 'bg-red-100 text-red-800 border-red-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    let timeAgo = '';
    if (diffDays > 0) {
      timeAgo = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      timeAgo = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffMinutes > 0) {
      timeAgo = `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    } else {
      timeAgo = 'Just now';
    }

    return {
      timeAgo,
      fullDate: date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
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

  if (session.user.level !== 5) {
    return null; // Will redirect
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex-1 p-4">
      <div className="max-w-8xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-4">
            <div className="mb-4 lg:mb-0">
              <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
                <FileText className="w-8 h-8 mr-3 text-blue-600" />
                System Audit Logs
              </h1>
              <p className="text-gray-600">
                Comprehensive activity logs for all system actions
              </p>
              <div className="flex items-center mt-2">
                <span className="text-sm text-gray-500">Total logs: </span>
                <span className="ml-2 inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-md border border-blue-200">
                  {total.toLocaleString()}
                </span>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors duration-200"
              >
                <Filter className="w-4 h-4 mr-2" />
                {showFilters ? 'Hide' : 'Show'} Filters
              </button>
              <button
                onClick={fetchLogs}
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors duration-200"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </button>
              <button
                onClick={exportLogs}
                className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors duration-200"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </button>
              <Link href="/admin/users">
                <button className="inline-flex items-center px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors duration-200">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Users
                </button>
              </Link>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search logs by user, action, or details..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
                  <select
                    value={filters.action}
                    onChange={(e) => handleFilterChange('action', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Actions</option>
                    <option value="login">Login</option>
                    <option value="user_created">User Created</option>
                    <option value="user_updated">User Updated</option>
                    <option value="user_deleted">User Deleted</option>
                    <option value="form_created">Form Created</option>
                    <option value="form_duplicated">Form Duplicated</option>
                    <option value="form_edited">Form Edited</option>
                    <option value="form_submitted">Form Submitted</option>
                    <option value="form_approved">Form Approved</option>
                    <option value="form_rejected">Form Rejected</option>
                    <option value="form_shared">Form Shared</option>
                    <option value="school_created">School Created</option>
                    <option value="school_updated">School Updated</option>
                    <option value="school_deleted">School Deleted</option>
                    <option value="permission_changed">Permission Changed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">User Email</label>
                  <input
                    type="email"
                    value={filters.userEmail}
                    onChange={(e) => handleFilterChange('userEmail', e.target.value)}
                    placeholder="user@schools.nyc.gov"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Type</label>
                  <select
                    value={filters.targetType}
                    onChange={(e) => handleFilterChange('targetType', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Types</option>
                    <option value="user">User</option>
                    <option value="form">Form</option>
                    <option value="school">School</option>
                    <option value="system">System</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors duration-200"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Logs Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-2 border-transparent border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-gray-600">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p>No logs found matching your criteria.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700">Timestamp</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700">User</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700">Action</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700">Details</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700">IP Address</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {logs.map((log, index) => {
                      const timeInfo = formatTimestamp(log.timestamp);
                      return (
                        <tr key={log._id || index} className="hover:bg-gray-50">
                          <td className="p-3">
                            <div className="flex items-center text-sm text-gray-600">
                              <Clock className="w-4 h-4 mr-2 text-gray-400" />
                              <div>
                                <div className="font-medium">{timeInfo.timeAgo}</div>
                                <div className="text-xs text-gray-500">{timeInfo.fullDate}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center text-sm">
                              <User className="w-4 h-4 mr-2 text-gray-400" />
                              <div>
                                <div className="font-medium text-gray-900">{log.userName || 'Unknown'}</div>
                                <div className="text-xs text-gray-500">{log.userEmail || ''}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border ${getActionColor(log.action)}`}>
                              {getActionIcon(log.action)}
                              {log.action || 'Unknown'}
                            </span>
                          </td>
                          <td className="p-3 text-sm text-gray-700 max-w-md">
                            <div className="truncate" title={log.details || ''}>
                              {log.details || '-'}
                            </div>
                          </td>
                          <td className="p-3 text-sm text-gray-600">
                            {log.ipAddress || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Showing {currentPage * pageSize + 1} to {Math.min((currentPage + 1) * pageSize, total)} of {total} logs
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                      disabled={currentPage === 0}
                      className="px-4 py-2 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors duration-200"
                    >
                      Previous
                    </button>
                    <span className="px-4 py-2 text-sm text-gray-700">
                      Page {currentPage + 1} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                      disabled={currentPage >= totalPages - 1}
                      className="px-4 py-2 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors duration-200"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      </div>
      <AppFooter />
    </div>
  );
}

export default function AdminLogsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-transparent border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <AdminLogsPageContent />
    </Suspense>
  );
}

