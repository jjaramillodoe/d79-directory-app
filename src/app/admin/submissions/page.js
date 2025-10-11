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
  AlertCircle
} from 'lucide-react';
import FormViewer from '../../../components/FormViewer'; // Added import for FormViewer
import PrincipalEmailAutocomplete from '../../../components/PrincipalEmailAutocomplete';

export default function AdminSubmissionsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
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
  const [showFormViewer, setShowFormViewer] = useState(false);
  const [selectedForm, setSelectedForm] = useState(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [submissionToTransfer, setSubmissionToTransfer] = useState(null);
  const [transferData, setTransferData] = useState({
    newOwnerEmail: ''
  });
  const [transferring, setTransferring] = useState(false);

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
      const headers = ['School', 'Principal', 'Email', 'Status', 'Progress', 'Submitted', 'Created'];
      const csvData = filteredSubmissions.map(sub => [
        sub.schoolName || '',
        sub.principalName || '',
        sub.principalEmail || '',
        getStatusBadge(sub.status || 'draft'),
        `${sub.completedSteps?.length || 0}/14`,
        sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString() : '-',
        sub.createdAt ? new Date(sub.createdAt).toLocaleDateString() : '-'
      ]);
      
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

  const filteredSubmissions = submissions.filter(submission => {
    const matchesStatus = filterStatus === 'all' || submission.status === filterStatus;
    const matchesSearch = searchTerm === '' || 
      submission.schoolName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.principalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.principalEmail.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
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
        <div className="max-w-7xl mx-auto px-4">
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
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8 p-6">
          <div className="flex flex-col lg:flex-row gap-4 lg:items-end">
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Status Filter:
              </label>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
            <div className="flex-1 lg:min-w-80">
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
                <table className="w-full min-w-4xl">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700 min-w-48">School</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700 min-w-36">Principal</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700 min-w-32">Status</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700 min-w-32">Progress</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700 min-w-28">Created</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700 min-w-28">Submitted</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700 min-w-48">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredSubmissions.map((submission) => {

                      return (
                        <tr 
                          key={submission._id} 
                          className="hover:bg-gray-50 transition-colors duration-200"
                        >
                        <td className="p-3">
                          <div>
                            <div className="font-medium text-gray-900">{submission.schoolName}</div>
                            <div className="text-xs text-gray-500">{submission.principalEmail}</div>
                          </div>
                        </td>
                        <td className="p-3 text-sm text-gray-700">
                          {submission.principalName}
                        </td>
                        <td className="p-3">
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(submission.status || 'draft')}`}>
                            {getStatusIcon(submission.status || 'draft')}
                            {getStatusBadge(submission.status || 'draft')}
                          </span>
                        </td>
                        <td className="p-3">
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
                        <td className="p-3 text-sm text-gray-600">
                          {submission.createdAt ? new Date(submission.createdAt).toLocaleDateString() : '-'}
                        </td>
                        <td className="p-3 text-sm text-gray-600">
                          {submission.submittedAt ? new Date(submission.submittedAt).toLocaleDateString() : '-'}
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setSelectedSubmission(submission);
                                setShowReviewModal(true);
                              }}
                              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                            >
                              Review
                            </button>
                            {submission.status === 'approved' && (
                              <button
                                onClick={() => {
                                  setSelectedForm(submission);
                                  setShowFormViewer(true);
                                }}
                                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
                              >
                                View Form
                              </button>
                            )}
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

      {/* Form Viewer Modal */}
      {showFormViewer && selectedForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Approved Form Viewer</h2>
                  <p className="text-green-100 mt-1">
                    {selectedForm.schoolName} • {selectedForm.principalName}
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowFormViewer(false);
                      setSelectedForm(null);
                    }}
                    className="px-4 py-2 bg-white text-green-600 rounded-lg font-medium hover:bg-green-50 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
            
            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <FormViewer form={selectedForm} />
            </div>
          </div>
        </div>
      )}
      
      {/* Scroll to Top */}
      <ScrollToTop />
    </div>
  );
}