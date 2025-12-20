'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import ScrollToTop from '../../../components/ScrollToTop';
import { 
  FileText, 
  BarChart3, 
  Download, 
  FileSpreadsheet, 
  ArrowLeft, 
  Eye, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Search,
  Filter,
  Users,
  Calendar,
  TrendingUp,
  AlertCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronUp,
  ChevronDown,
  Printer,
  X
} from 'lucide-react';
import PrincipalEmailAutocomplete from '../../../components/PrincipalEmailAutocomplete';
import FormViewer from '../../../components/FormViewer';

export default function AdminSubmissionsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState('desc');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [progressFilter, setProgressFilter] = useState('all');
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewData, setReviewData] = useState({
    status: 'approved',
    comments: ''
  });
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportData, setReportData] = useState({
    startDate: '',
    endDate: '',
    status: 'all'
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [submissionToDelete, setSubmissionToDelete] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [submissionToTransfer, setSubmissionToTransfer] = useState(null);
  const [transferData, setTransferData] = useState({
    newOwnerEmail: ''
  });
  const [transferring, setTransferring] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printSubmission, setPrintSubmission] = useState(null);

  // Handle authentication
  useEffect(() => {
    if (status === 'loading') return; // Still loading
    
    if (!session) {
      router.push('/login');
      return;
    }

    // Only Level 5 (Super Admin) can access this global admin view
    // Level 4 (Principals) should use their school-specific views
    if (session.user.level < 5) {
      if (session.user.level === 4) {
        // Redirect principals to their school-specific dashboard or users page
        router.push('/admin/users?tab=collaboration');
      } else {
        // Other levels go to main dashboard
        router.push('/dashboard');
      }
      return;
    }
  }, [session, status, router]);

  // Fetch submissions
  useEffect(() => {
    if (session?.user?.level === 5) {
      fetchSubmissions();
    }
  }, [session]);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/forms');
      if (response.ok) {
        const data = await response.json();
        setSubmissions(data.forms || []);
      }
    } catch (error) {
      console.error('Error fetching submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async () => {
    if (!selectedSubmission || !reviewData.status) return;

    try {
      const response = await fetch(`/api/forms/${selectedSubmission._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'review',
          status: reviewData.status,
          comments: reviewData.comments
        }),
      });

      if (response.ok) {
        await fetchSubmissions();
        setShowReviewModal(false);
        setSelectedSubmission(null);
        setReviewData({ status: 'approved', comments: '' });
      }
    } catch (error) {
      console.error('Error updating submission:', error);
    }
  };

  const generateReport = async () => {
    try {
      const response = await fetch('/api/admin/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reportData),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `submissions-report-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        setShowReportModal(false);
      }
    } catch (error) {
      console.error('Error generating report:', error);
    }
  };

  const handleDelete = async () => {
    if (!submissionToDelete) return;

    try {
      const response = await fetch(`/api/forms/${submissionToDelete._id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchSubmissions();
        setShowDeleteModal(false);
        setSubmissionToDelete(null);
      }
    } catch (error) {
      console.error('Error deleting submission:', error);
    }
  };

  const handleTransferOwnership = async () => {
    if (!submissionToTransfer || !transferData.newOwnerEmail) return;

    setTransferring(true);
    try {
      const response = await fetch('/api/forms/transfer-ownership', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formId: submissionToTransfer._id,
          newOwnerEmail: transferData.newOwnerEmail
        }),
      });

      if (response.ok) {
        const result = await response.json();
        await fetchSubmissions();
        setShowTransferModal(false);
        setSubmissionToTransfer(null);
        setTransferData({ newOwnerEmail: '' });
        alert(`Ownership transferred successfully! ${result.message}`);
      } else {
        const errorData = await response.json();
        alert(`Error transferring ownership: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error transferring ownership:', error);
      alert('Error transferring ownership. Please try again.');
    } finally {
      setTransferring(false);
    }
  };

  const openTransferModal = (submission) => {
    setSubmissionToTransfer(submission);
    setTransferData({ newOwnerEmail: '' });
    setShowTransferModal(true);
  };

  const exportToJSON = () => {
    setExporting(true);
    try {
      const dataStr = JSON.stringify(filteredSubmissions, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = window.URL.createObjectURL(dataBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `submissions-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting to JSON:', error);
    } finally {
      setExporting(false);
    }
  };

  const exportToCSV = () => {
    setExporting(true);
    try {
      const headers = ['School', 'Principal', 'Email', 'Status', 'Progress', 'Submitted', 'Created', 'Edit Rights', 'Shared with Level 3', 'Shared with Emails'];
      const csvData = filteredSubmissions.map(sub => {
        const level3Info = sub.hasLevel3Collaborators && sub.level3Collaborators?.length > 0
          ? sub.level3Collaborators.map(c => `${c.name} (${c.permissions})`).join('; ')
          : 'No';
        const sharedEmailsInfo = sub.sharedWithEmails && sub.sharedWithEmails.length > 0
          ? sub.sharedWithEmails.map(s => `${s.email} (${s.permissions})`).join('; ')
          : 'No';
        return [
          sub.schoolName || '',
          sub.principalName || '',
          sub.principalEmail || '',
          getStatusBadge(sub.status || 'draft'),
          `${sub.completedSteps?.length || 0}/14`,
          sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString() : '-',
          sub.createdAt ? new Date(sub.createdAt).toLocaleDateString() : '-',
          sub.userPermission || 'N/A',
          level3Info,
          sharedEmailsInfo
        ];
      });
      
      const csvContent = [headers, ...csvData]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `submissions-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting to CSV:', error);
    } finally {
      setExporting(false);
    }
  };

  const exportToPDF = () => {
    setExporting(true);
    try {
      // Create a new window with formatted content
      const printWindow = window.open('', '_blank');
      const currentDate = new Date().toLocaleDateString();
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Submissions Report - ${currentDate}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #1f2937; text-align: center; margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; font-size: 12px; }
            th { background-color: #f3f4f6; font-weight: bold; }
            .status-approved { background-color: #dcfce7; }
            .status-rejected { background-color: #fef2f2; }
            .status-under-review { background-color: #fef3c7; }
            .status-submitted { background-color: #dbeafe; }
            .status-draft { background-color: #f3f4f6; }
            .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <h1>School Plan Submissions Report</h1>
          <p><strong>Generated:</strong> ${currentDate}</p>
          <p><strong>Total Submissions:</strong> ${filteredSubmissions.length}</p>
          
          <table>
            <thead>
              <tr>
                <th>School</th>
                <th>Principal</th>
                <th>Email</th>
                <th>Status</th>
                <th>Progress</th>
                <th>Submitted</th>
                <th>Created</th>
                <th>Edit Rights</th>
                <th>Shared with Level 3</th>
              </tr>
            </thead>
            <tbody>
              ${filteredSubmissions.map(sub => `
                <tr>
                  <td>${sub.schoolName || ''}</td>
                  <td>${sub.principalName || ''}</td>
                  <td>${sub.principalEmail || ''}</td>
                  <td class="status-${sub.status || 'draft'}">${getStatusBadge(sub.status || 'draft')}</td>
                  <td>${sub.completedSteps?.length || 0}/14</td>
                  <td>${sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString() : '-'}</td>
                  <td>${sub.createdAt ? new Date(sub.createdAt).toLocaleDateString() : '-'}</td>
                  <td>${sub.userPermission || 'N/A'}</td>
                  <td>${
                    sub.hasLevel3Collaborators && sub.level3Collaborators?.length > 0
                      ? sub.level3Collaborators.map(c => `${c.name} (${c.permissions})`).join('<br>')
                      : 'No'
                  }</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="footer">
            <p>Report generated from School Plan Management System</p>
          </div>
        </body>
        </html>
      `;
      
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      // Wait for content to load, then print
      printWindow.onload = () => {
        printWindow.print();
        printWindow.close();
      };
      
    } catch (error) {
      console.error('Error exporting to PDF:', error);
    } finally {
      setExporting(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusLabels = {
      'draft': 'Draft',
      'submitted': 'Submitted',
      'under_review': 'Under Review',
      'approved': 'Approved',
      'rejected': 'Rejected'
    };
    return statusLabels[status] || status;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      case 'under_review': return <Clock className="w-4 h-4" />;
      case 'submitted': return <TrendingUp className="w-4 h-4" />;
      case 'draft': return <FileText className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'under_review': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'submitted': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'draft': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    }
    return sortDirection === 'asc' ? 
      <ArrowUp className="w-4 h-4 text-blue-600" /> : 
      <ArrowDown className="w-4 h-4 text-blue-600" />;
  };

  const filteredSubmissions = submissions
    .filter(submission => {
      const matchesStatus = filterStatus === 'all' || submission.status === filterStatus;
      const matchesSearch = searchTerm === '' || 
        submission.schoolName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        submission.principalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        submission.principalEmail.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Date range filter
      const matchesDateRange = (!dateRange.startDate || !dateRange.endDate) || 
        (submission.createdAt && 
         new Date(submission.createdAt) >= new Date(dateRange.startDate) &&
         new Date(submission.createdAt) <= new Date(dateRange.endDate));
      
      // Progress filter
      const completedSteps = submission.completedSteps?.length || 0;
      const matchesProgress = progressFilter === 'all' || 
        (progressFilter === 'complete' && completedSteps === 14) ||
        (progressFilter === 'incomplete' && completedSteps < 14) ||
        (progressFilter === 'not_started' && completedSteps === 0) ||
        (progressFilter === 'partial' && completedSteps > 0 && completedSteps < 14);
      
      return matchesStatus && matchesSearch && matchesDateRange && matchesProgress;
    })
    .sort((a, b) => {
      let aValue, bValue;
      
      switch (sortField) {
        case 'schoolName':
          aValue = a.schoolName?.toLowerCase() || '';
          bValue = b.schoolName?.toLowerCase() || '';
          break;
        case 'principalName':
          aValue = a.principalName?.toLowerCase() || '';
          bValue = b.principalName?.toLowerCase() || '';
          break;
        case 'principalEmail':
          aValue = a.principalEmail?.toLowerCase() || '';
          bValue = b.principalEmail?.toLowerCase() || '';
          break;
        case 'status':
          const statusOrder = { 'draft': 1, 'submitted': 2, 'under_review': 3, 'approved': 4, 'rejected': 5 };
          aValue = statusOrder[a.status] || 0;
          bValue = statusOrder[b.status] || 0;
          break;
        case 'progress':
          aValue = a.completedSteps?.length || 0;
          bValue = b.completedSteps?.length || 0;
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt || 0);
          bValue = new Date(b.createdAt || 0);
          break;
        case 'submittedAt':
          aValue = new Date(a.submittedAt || 0);
          bValue = new Date(b.submittedAt || 0);
          break;
        default:
          aValue = a[sortField] || '';
          bValue = b[sortField] || '';
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

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

  // Check if user is Super Admin (Level 5)
  if (session.user.level < 5) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center">
          <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4 mx-auto">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Access Denied
          </h1>
          <p className="text-gray-600 mb-6">
            {session.user.level === 4 
              ? 'This page is for Super Admins only. As a Principal, please use your school-specific views from the dashboard.'
              : 'You need Level 5 (Super Admin) access to view this page.'
            }
          </p>
          <div className="flex gap-3 justify-center">
            {session.user.level === 4 && (
              <Link
                href="/admin/users?tab=collaboration"
                className="inline-flex items-center px-6 py-3 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors duration-200"
              >
                <Users className="w-4 h-4 mr-2" />
                Go to School Management
              </Link>
            )}
            <Link
              href="/dashboard"
              className="inline-flex items-center px-6 py-3 bg-gray-500 text-white text-sm font-medium rounded-lg hover:bg-gray-600 transition-colors duration-200"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-[140rem] mx-auto px-6">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center py-6">
            <div className="mb-4 lg:mb-0">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                All Form Submissions
              </h1>
              <p className="text-gray-600">
                Review and approve all school plan submissions across all schools
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={exportToJSON}
                disabled={exporting || filteredSubmissions.length === 0}
                className="inline-flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg transition-colors duration-200 disabled:cursor-not-allowed"
              >
                {exporting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-transparent border-t-white rounded-full animate-spin mr-2"></div>
                    Exporting...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    Export JSON
                  </>
                )}
              </button>
              <button
                onClick={exportToCSV}
                disabled={exporting || filteredSubmissions.length === 0}
                className="inline-flex items-center px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg transition-colors duration-200 disabled:cursor-not-allowed"
              >
                {exporting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-transparent border-t-white rounded-full animate-spin mr-2"></div>
                    Exporting...
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Export CSV
                  </>
                )}
              </button>
              <button
                onClick={exportToPDF}
                disabled={exporting || filteredSubmissions.length === 0}
                className="inline-flex items-center px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg transition-colors duration-200 disabled:cursor-not-allowed"
              >
                {exporting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-transparent border-t-white rounded-full animate-spin mr-2"></div>
                    Exporting...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    Export PDF
                  </>
                )}
              </button>
              <button
                onClick={() => setShowReportModal(true)}
                className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors duration-200"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Generate Report
              </button>
              <Link
                href="/dashboard"
                className="inline-flex items-center px-4 py-2 text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors duration-200"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[140rem] mx-auto px-6 py-8">
        {/* Enhanced Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8 p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
            {/* Status Filter */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Status Filter:
              </label>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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

            {/* Progress Filter */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Progress Filter:
              </label>
              <div className="relative">
                <TrendingUp className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={progressFilter}
                  onChange={(e) => setProgressFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Progress</option>
                  <option value="not_started">Not Started (0/14)</option>
                  <option value="partial">Partial (1-13/14)</option>
                  <option value="complete">Complete (14/14)</option>
                  <option value="incomplete">Incomplete (&lt;14/14)</option>
                </select>
              </div>
            </div>

            {/* Date Range Filter */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Created Date Range:
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Start Date"
                />
              </div>
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                To Date:
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="End Date"
                />
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">
              Search:
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by school name, principal name, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Sort Controls */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-700">Sort by:</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSort('schoolName')}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                      sortField === 'schoolName' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    School {getSortIcon('schoolName')}
                  </button>
                  <button
                    onClick={() => handleSort('principalName')}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                      sortField === 'principalName' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Principal {getSortIcon('principalName')}
                  </button>
                  <button
                    onClick={() => handleSort('principalEmail')}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                      sortField === 'principalEmail' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Email {getSortIcon('principalEmail')}
                  </button>
                  <button
                    onClick={() => handleSort('status')}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                      sortField === 'status' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Status {getSortIcon('status')}
                  </button>
                  <button
                    onClick={() => handleSort('progress')}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                      sortField === 'progress' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Progress {getSortIcon('progress')}
                  </button>
                  <button
                    onClick={() => handleSort('createdAt')}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                      sortField === 'createdAt' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Created {getSortIcon('createdAt')}
                  </button>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                Showing {filteredSubmissions.length} of {submissions.length} submissions
              </div>
            </div>
          </div>
        </div>

        {/* Submissions List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-2 lg:mb-0">
                Submissions ({filteredSubmissions.length})
              </h2>
              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                <span className="flex items-center">
                  <Users className="w-4 h-4 mr-1" />
                  Total: {submissions.length}
                </span>
                <span className="flex items-center">
                  <CheckCircle className="w-4 h-4 mr-1 text-green-600" />
                  Approved: {submissions.filter(s => s.status === 'approved').length}
                </span>
                <span className="flex items-center">
                  <Clock className="w-4 h-4 mr-1 text-yellow-600" />
                  Pending: {submissions.filter(s => ['draft', 'submitted', 'under_review'].includes(s.status)).length}
                </span>
                <span className="flex items-center">
                  <XCircle className="w-4 h-4 mr-1 text-red-600" />
                  Rejected: {submissions.filter(s => s.status === 'rejected').length}
                </span>
              </div>
            </div>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-2 border-transparent border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Loading submissions...</p>
              </div>
            ) : filteredSubmissions.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📋</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No submissions found
                </h3>
                <p className="text-gray-600 mb-6 text-sm">
                  {searchTerm || filterStatus !== 'all' 
                    ? 'Try adjusting your search criteria or filters.'
                    : 'When principals submit their school plans, they will appear here for your review and approval.'
                  }
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full min-w-8xl">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th 
                        className="text-left p-4 text-sm font-semibold text-gray-700 min-w-56 cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort('schoolName')}
                      >
                        <div className="flex items-center gap-2">
                          School
                          {getSortIcon('schoolName')}
                        </div>
                      </th>
                      <th 
                        className="text-left p-4 text-sm font-semibold text-gray-700 min-w-44 cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort('principalName')}
                      >
                        <div className="flex items-center gap-2">
                          Principal
                          {getSortIcon('principalName')}
                        </div>
                      </th>
                      <th 
                        className="text-left p-4 text-sm font-semibold text-gray-700 min-w-64 cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort('principalEmail')}
                      >
                        <div className="flex items-center gap-2">
                          Email
                          {getSortIcon('principalEmail')}
                        </div>
                      </th>
                      <th 
                        className="text-left p-4 text-sm font-semibold text-gray-700 min-w-40 cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort('status')}
                      >
                        <div className="flex items-center gap-2">
                          Status
                          {getSortIcon('status')}
                        </div>
                      </th>
                      <th 
                        className="text-left p-4 text-sm font-semibold text-gray-700 min-w-40 cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort('progress')}
                      >
                        <div className="flex items-center gap-2">
                          Progress
                          {getSortIcon('progress')}
                        </div>
                      </th>
                      <th 
                        className="text-left p-4 text-sm font-semibold text-gray-700 min-w-36 cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort('createdAt')}
                      >
                        <div className="flex items-center gap-2">
                          Created
                          {getSortIcon('createdAt')}
                        </div>
                      </th>
                      <th 
                        className="text-left p-4 text-sm font-semibold text-gray-700 min-w-36 cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort('submittedAt')}
                      >
                        <div className="flex items-center gap-2">
                          Submitted
                          {getSortIcon('submittedAt')}
                        </div>
                      </th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-700 min-w-32">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          Edit Rights
                        </div>
                      </th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-700 min-w-40">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          Shared with Level 3
                        </div>
                      </th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-700 min-w-48">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          Shared with Emails
                        </div>
                      </th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-700 min-w-48">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredSubmissions.map((submission) => {

                      return (
                        <tr 
                          key={submission._id} 
                          className="hover:bg-gray-50 transition-colors duration-200"
                        >
                        <td className="p-4">
                          <div className="font-medium text-gray-900">{submission.schoolName}</div>
                        </td>
                        <td className="p-4 text-sm text-gray-700">
                          {submission.principalName}
                        </td>
                        <td className="p-4 text-sm text-gray-600">
                          {submission.principalEmail}
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(submission.status || 'draft')}`}>
                            {getStatusIcon(submission.status || 'draft')}
                            {getStatusBadge(submission.status || 'draft')}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${((submission.completedSteps?.length || 0) / 14) * 100}%` }}
                              ></div>
                            </div>
                            <span className="text-xs text-gray-600 min-w-12">
                              {submission.completedSteps?.length || 0}/14
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-sm text-gray-600">
                          {submission.createdAt ? new Date(submission.createdAt).toLocaleDateString() : '-'}
                        </td>
                        <td className="p-4 text-sm text-gray-600">
                          {submission.submittedAt ? new Date(submission.submittedAt).toLocaleDateString() : '-'}
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                            submission.userPermission === 'owner'
                              ? 'bg-green-100 text-green-800'
                              : submission.userPermission === 'edit'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {submission.userPermission === 'owner' && <CheckCircle className="w-3 h-3" />}
                            {submission.userPermission === 'edit' && <FileText className="w-3 h-3" />}
                            {submission.userPermission === 'view' && <Eye className="w-3 h-3" />}
                            {submission.userPermission || 'N/A'}
                          </span>
                        </td>
                        <td className="p-4">
                          {submission.hasLevel3Collaborators && submission.level3Collaborators?.length > 0 ? (
                            <div className="space-y-1">
                              {submission.level3Collaborators.map((collab, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                                    collab.permissions === 'edit'
                                      ? 'bg-blue-100 text-blue-800'
                                      : collab.permissions === 'view'
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-gray-100 text-gray-600'
                                  }`}>
                                    {collab.permissions === 'edit' && <CheckCircle className="w-3 h-3" />}
                                    {collab.permissions === 'view' && <Eye className="w-3 h-3" />}
                                    <span className="font-semibold">{collab.name}</span>
                                    <span className="text-xs">({collab.permissions})</span>
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
                              <XCircle className="w-3 h-3" />
                              No
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          {submission.sharedWithEmails && submission.sharedWithEmails.length > 0 ? (
                            <div className="space-y-1">
                              {submission.sharedWithEmails.map((share, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                                    share.permissions === 'edit'
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-blue-100 text-blue-800'
                                  }`}>
                                    {share.permissions === 'edit' && <CheckCircle className="w-3 h-3" />}
                                    {share.permissions === 'view' && <Eye className="w-3 h-3" />}
                                    <span className="font-semibold text-xs">{share.email}</span>
                                    <span className="text-xs">({share.permissions})</span>
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
                              <XCircle className="w-3 h-3" />
                              No
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                window.open(`/form/${submission._id}`, '_blank');
                              }}
                              className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors flex items-center gap-1"
                              title="View Form in New Tab"
                            >
                              <Eye className="w-3 h-3" />
                              View
                            </button>
                            <button
                              onClick={() => {
                                setPrintSubmission(submission);
                                setShowPrintModal(true);
                              }}
                              className="px-3 py-1 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700 transition-colors flex items-center gap-1"
                              title="Print View"
                            >
                              <FileText className="w-3 h-3" />
                              Print
                            </button>
                            <button
                              onClick={() => {
                                setSelectedSubmission(submission);
                                setShowReviewModal(true);
                              }}
                              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                            >
                              Review
                            </button>
                            {session?.user?.level === 5 && (
                              <button
                                onClick={() => openTransferModal(submission)}
                                className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 transition-colors"
                                title="Transfer Ownership"
                              >
                                Transfer
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setSubmissionToDelete(submission);
                                setShowDeleteModal(true);
                              }}
                              className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Review Modal */}
      {showReviewModal && selectedSubmission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-8 max-w-lg w-full max-h-90vh overflow-auto">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Review Submission
            </h3>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                <strong>School:</strong> {selectedSubmission.schoolName}
              </p>
              <p className="text-sm text-gray-600 mb-2">
                <strong>Principal:</strong> {selectedSubmission.principalName}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Current Status:</strong> {getStatusBadge(selectedSubmission.status || 'draft')}
              </p>
            </div>
            <div className="mb-4">
              <label className="block mb-2 text-sm font-medium text-gray-700">
                New Status:
              </label>
              <select
                value={reviewData.status}
                onChange={(e) => setReviewData({ ...reviewData, status: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="under_review">Under Review</option>
              </select>
            </div>
            <div className="mb-6">
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Comments/Feedback:
              </label>
              <textarea
                value={reviewData.comments}
                onChange={(e) => setReviewData({ ...reviewData, comments: e.target.value })}
                placeholder="Provide feedback and comments for the principal..."
                rows={4}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowReviewModal(false);
                  setSelectedSubmission(null);
                  setReviewData({ status: 'approved', comments: '' });
                }}
                className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleReview}
                className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors duration-200"
              >
                Submit Review
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-8 max-w-lg w-full max-h-90vh overflow-auto">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Generate Report
            </h3>
            <div className="mb-4">
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Start Date:
              </label>
              <input
                type="date"
                value={reportData.startDate}
                onChange={(e) => setReportData({ ...reportData, startDate: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="mb-4">
              <label className="block mb-2 text-sm font-medium text-gray-700">
                End Date:
              </label>
              <input
                type="date"
                value={reportData.endDate}
                onChange={(e) => setReportData({ ...reportData, endDate: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="mb-6">
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Status Filter:
              </label>
              <select
                value={reportData.status}
                onChange={(e) => setReportData({ ...reportData, status: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="under_review">Under Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowReportModal(false)}
                className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={generateReport}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors duration-200"
              >
                Generate Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && submissionToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-8 max-w-lg w-full max-h-90vh overflow-auto">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900">
                Delete Submission
              </h3>
            </div>
            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-4">
                Are you sure you want to delete this submission? This action cannot be undone.
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800 mb-2">
                  <strong>School:</strong> {submissionToDelete.schoolName}
                </p>
                <p className="text-sm text-red-800 mb-2">
                  <strong>Principal:</strong> {submissionToDelete.principalName}
                </p>
                <p className="text-sm text-red-800">
                  <strong>Status:</strong> {getStatusBadge(submissionToDelete.status || 'draft')}
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSubmissionToDelete(null);
                }}
                className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors duration-200"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Ownership Modal */}
      {showTransferModal && submissionToTransfer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-8 max-w-lg w-full max-h-90vh overflow-auto">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900">
                Transfer Form Ownership
              </h3>
            </div>
            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-4">
                Transfer ownership of this form to another principal. The new owner will have full control over the form.
              </p>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-purple-800 mb-2">
                  <strong>Current Owner:</strong> {submissionToTransfer.principalName} ({submissionToTransfer.principalEmail})
                </p>
                <p className="text-sm text-purple-800 mb-2">
                  <strong>School:</strong> {submissionToTransfer.schoolName}
                </p>
                <p className="text-sm text-purple-800">
                  <strong>Form Status:</strong> {getStatusBadge(submissionToTransfer.status || 'draft')}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Owner Email *
                </label>
                <PrincipalEmailAutocomplete
                  value={transferData.newOwnerEmail}
                  onChange={(email) => setTransferData({ newOwnerEmail: email })}
                  placeholder="Enter principal email (must be Level 4)"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  The new owner must be a Level 4 (Admin Principal) user
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowTransferModal(false);
                  setSubmissionToTransfer(null);
                  setTransferData({ newOwnerEmail: '' });
                }}
                className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleTransferOwnership}
                disabled={!transferData.newOwnerEmail || transferring}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors duration-200"
              >
                {transferring ? 'Transferring...' : 'Transfer Ownership'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Modal */}
      {showPrintModal && printSubmission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 print-hidden">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Printer className="w-5 h-5" />
                Form Viewer - {printSubmission.schoolName}
              </h3>
              <button
                onClick={() => {
                  setShowPrintModal(false);
                  setPrintSubmission(null);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body - Form Viewer Component */}
            <div className="flex-1 overflow-auto p-8">
              <FormViewer form={printSubmission} />
            </div>
          </div>
        </div>
      )}
      
      {/* Scroll to Top */}
      <ScrollToTop />

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-content,
          .print-content * {
            visibility: visible;
          }
          .print-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
          @page {
            margin: 1cm;
          }
        }
      `}</style>
    </div>
  );
}