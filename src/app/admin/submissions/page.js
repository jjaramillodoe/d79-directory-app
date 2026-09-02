'use client';

import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import ScrollToTop from '../../../components/ScrollToTop';
import PrincipalEmailAutocomplete from '../../../components/PrincipalEmailAutocomplete';
import DashboardShell from '../../../components/dashboard/DashboardShell';
import DashboardSidebar from '../../../components/dashboard/DashboardSidebar';
import DashboardHeader from '../../../components/dashboard/DashboardHeader';
import SubmissionsWorkspace from '../../../components/admin/SubmissionsWorkspace';
import DuplicateFormModal from '../../../components/admin/DuplicateFormModal';
import { Spinner, Column, Row, Text, Heading, Button, Card } from '@once-ui-system/core';
import { currentSchoolYear } from '../../../lib/schoolYear';
import useAppToast from '../../../hooks/useAppToast';
import Modal from '../../../components/ui/Modal';
import * as logger from '../../../lib/logger';

// FormViewer drags in jspdf and html2canvas, the two largest client dependencies in the app,
// and it renders only inside the print dialog. `ssr: false` because html2canvas needs a real
// DOM to rasterize against.
const FormViewer = dynamic(() => import('../../../components/FormViewer'), {
  ssr: false,
  loading: () => (
    <Column fillWidth horizontal="center" vertical="center" paddingY="48" gap="12">
      <Spinner size="m" />
      <Text onBackground="neutral-weak">Preparing document...</Text>
    </Column>
  ),
});

export default function AdminSubmissionsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const toast = useAppToast();
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
  const [schoolYearFilter, setSchoolYearFilter] = useState('all');
  const [schoolFilter, setSchoolFilter] = useState('all');
  const [principalFilter, setPrincipalFilter] = useState('all');
  const [formToDuplicate, setFormToDuplicate] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const year = new URLSearchParams(window.location.search).get('year');
    if (year) setSchoolYearFilter(year);
  }, []);

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
      logger.error('Error fetching submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLive = async (submission, live) => {
    try {
      const response = await fetch('/api/admin/forms/live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formId: submission._id, live }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Could not update plan lock');
      await fetchSubmissions();
      toast.success(
        live
          ? `${submission.schoolName} is live so the principal can finish ${submission.schoolYear || 'this year'}.`
          : `${submission.schoolName} is archived again.`
      );
    } catch (error) {
      toast.error(error.message);
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
      logger.error('Error updating submission:', error);
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
      logger.error('Error generating report:', error);
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
      logger.error('Error deleting submission:', error);
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
        toast.success(result.message || 'Ownership transferred');
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Could not transfer ownership');
      }
    } catch (error) {
      logger.error('Error transferring ownership:', error);
      toast.error('Error transferring ownership. Please try again.');
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
      a.download = `submissions-${schoolYearFilter === 'all' ? 'all-years' : schoolYearFilter}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      logger.error('Error exporting to JSON:', error);
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
      a.download = `submissions-${schoolYearFilter === 'all' ? 'all-years' : schoolYearFilter}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      logger.error('Error exporting to CSV:', error);
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
          <title>Submissions Report - ${schoolYearFilter === 'all' ? 'All years' : schoolYearFilter} - ${currentDate}</title>
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
      logger.error('Error exporting to PDF:', error);
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

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const schoolYears = Array.from(
    new Set(submissions.map((submission) => submission.schoolYear).filter(Boolean))
  ).sort().reverse();

  const schools = Array.from(
    new Set(submissions.map((submission) => submission.schoolName).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  const principals = Array.from(
    new Map(
      submissions
        .filter((submission) => submission.principalEmail || submission.principalName)
        .map((submission) => {
          const key = submission.principalEmail || submission.principalName;
          return [
            key,
            {
              value: key,
              name: submission.principalName || submission.principalEmail,
              email: submission.principalEmail || '',
            },
          ];
        })
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name));

  const filteredSubmissions = submissions
    .filter(submission => {
      const matchesStatus = filterStatus === 'all' || submission.status === filterStatus;
      const matchesSearch = searchTerm === '' || 
        (submission.schoolName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (submission.principalName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (submission.principalEmail || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesYear = schoolYearFilter === 'all' || (submission.schoolYear || '') === schoolYearFilter;
      const matchesSchool = schoolFilter === 'all' || submission.schoolName === schoolFilter;
      const matchesPrincipal =
        principalFilter === 'all' ||
        submission.principalEmail === principalFilter ||
        submission.principalName === principalFilter;
      
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
      
      return (
        matchesStatus &&
        matchesSearch &&
        matchesYear &&
        matchesSchool &&
        matchesPrincipal &&
        matchesDateRange &&
        matchesProgress
      );
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

  const stats = {
    total: submissions.length,
    draft: submissions.filter((s) => s.status === 'draft').length,
    submitted: submissions.filter((s) => s.status === 'submitted').length,
    underReview: submissions.filter((s) => s.status === 'under_review').length,
    approved: submissions.filter((s) => s.status === 'approved').length,
    rejected: submissions.filter((s) => s.status === 'rejected').length,
  };

  if (status === 'loading' || !session) {
    return (
      <Column minHeight="100vh" horizontal="center" vertical="center" gap="16" background="page">
        <Spinner size="l" />
        <Text onBackground="neutral-weak">Loading...</Text>
      </Column>
    );
  }

  if (session.user.level < 5) {
    return (
      <Column minHeight="100vh" horizontal="center" vertical="center" gap="16" background="page" padding="24">
        <Heading variant="heading-strong-l">Access denied</Heading>
        <Text onBackground="neutral-weak" align="center">
          {session.user.level === 4
            ? 'This page is for Super Admins. Use your school views from the dashboard.'
            : 'You need Super Admin access to view this page.'}
        </Text>
        <Row gap="8">
          {session.user.level === 4 && (
            <Button href="/admin/users?tab=collaboration">Go to school management</Button>
          )}
          <Button href="/dashboard" variant="secondary">Back to dashboard</Button>
        </Row>
      </Column>
    );
  }

  return (
    <DashboardShell
      sidebar={<DashboardSidebar session={session} userLevel={session.user.level} />}
      header={
        <DashboardHeader
          title="Forms"
          description="Review and approve school plans across all schools"
          session={session}
          userLevel={session.user.level}
          actions={
            <Row gap="8" wrap>
              <Button
                size="s"
                variant="secondary"
                onClick={exportToJSON}
                disabled={exporting || filteredSubmissions.length === 0}
              >
                JSON
              </Button>
              <Button
                size="s"
                variant="secondary"
                onClick={exportToCSV}
                disabled={exporting || filteredSubmissions.length === 0}
              >
                CSV
              </Button>
              <Button
                size="s"
                variant="secondary"
                onClick={exportToPDF}
                disabled={exporting || filteredSubmissions.length === 0}
              >
                PDF list
              </Button>
              <Button
                size="s"
                variant="secondary"
                onClick={() => {
                  const year = schoolYearFilter === 'all' ? currentSchoolYear() : schoolYearFilter;
                  window.open(`/api/admin/forms/export?schoolYear=${encodeURIComponent(year)}&format=csv`, '_blank');
                }}
              >
                Year answers CSV
              </Button>
              <Button
                size="s"
                variant="secondary"
                onClick={() => {
                  const year = schoolYearFilter === 'all' ? currentSchoolYear() : schoolYearFilter;
                  window.open(`/api/admin/forms/export?schoolYear=${encodeURIComponent(year)}&format=html`, '_blank');
                }}
              >
                Year print/PDF
              </Button>
              <Button size="s" variant="primary" onClick={() => setShowReportModal(true)}>
                Report
              </Button>
            </Row>
          }
        />
      }
    >
      <SubmissionsWorkspace
        submissions={submissions}
        filteredSubmissions={filteredSubmissions}
        loading={loading}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        progressFilter={progressFilter}
        setProgressFilter={setProgressFilter}
        dateRange={dateRange}
        setDateRange={setDateRange}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        schoolYearFilter={schoolYearFilter}
        setSchoolYearFilter={setSchoolYearFilter}
        schoolYears={schoolYears}
        schoolFilter={schoolFilter}
        setSchoolFilter={setSchoolFilter}
        schools={schools}
        principalFilter={principalFilter}
        setPrincipalFilter={setPrincipalFilter}
        principals={principals}
        sortField={sortField}
        handleSort={handleSort}
        stats={stats}
        onView={(submission) => window.open(`/form/${submission._id}`, '_blank')}
        onPrint={(submission) => {
          setPrintSubmission(submission);
          setShowPrintModal(true);
        }}
        onReview={(submission) => {
          setSelectedSubmission(submission);
          setShowReviewModal(true);
        }}
        onTransfer={openTransferModal}
        onDuplicate={(submission) => setFormToDuplicate(submission)}
        onToggleLive={handleToggleLive}
        onDelete={(submission) => {
          setSubmissionToDelete(submission);
          setShowDeleteModal(true);
        }}
      />

      {formToDuplicate && (
        <DuplicateFormModal
          form={formToDuplicate}
          onClose={() => setFormToDuplicate(null)}
          onDuplicated={() => fetchSubmissions()}
        />
      )}

      {showReviewModal && selectedSubmission && (
        <Modal onClose={() => setShowReviewModal(false)} labelledBy="review-submission-title">
          <Card padding="24" radius="l" direction="column" style={{ width: '100%', maxWidth: '32rem' }}>
            <Column gap="16">
              <Heading id="review-submission-title" variant="heading-strong-m">Review submission</Heading>
              <Column gap="4">
                <Text variant="body-default-s">School: {selectedSubmission.schoolName}</Text>
                <Text variant="body-default-s">Principal: {selectedSubmission.principalName}</Text>
                <Text variant="body-default-s">
                  Current status: {getStatusBadge(selectedSubmission.status || 'draft')}
                </Text>
              </Column>
              <Column gap="8">
                <Text variant="label-default-s">New status</Text>
                <select
                  className="app-field"
                  value={reviewData.status}
                  onChange={(e) => setReviewData({ ...reviewData, status: e.target.value })}
                >
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="under_review">Under Review</option>
                </select>
              </Column>
              <Column gap="8">
                <Text variant="label-default-s">Comments</Text>
                <textarea
                  className="app-field"
                  rows={4}
                  value={reviewData.comments}
                  onChange={(e) => setReviewData({ ...reviewData, comments: e.target.value })}
                  placeholder="Feedback for the principal..."
                />
              </Column>
              <Row gap="8" horizontal="end">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowReviewModal(false);
                    setSelectedSubmission(null);
                    setReviewData({ status: 'approved', comments: '' });
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleReview}>Submit review</Button>
              </Row>
            </Column>
          </Card>
        </Modal>
      )}

      {showReportModal && (
        <Modal onClose={() => setShowReportModal(false)} labelledBy="generate-report-title">
          <Card padding="24" radius="l" direction="column" style={{ width: '100%', maxWidth: '32rem' }}>
            <Column gap="16">
              <Heading id="generate-report-title" variant="heading-strong-m">Generate report</Heading>
              <Column gap="8">
                <Text as="label" htmlFor="report-start-date" variant="label-default-s">Start date</Text>
                <input
                  id="report-start-date"
                  className="app-field"
                  type="date"
                  value={reportData.startDate}
                  onChange={(e) => setReportData({ ...reportData, startDate: e.target.value })}
                />
              </Column>
              <Column gap="8">
                <Text as="label" htmlFor="report-end-date" variant="label-default-s">End date</Text>
                <input
                  id="report-end-date"
                  className="app-field"
                  type="date"
                  value={reportData.endDate}
                  onChange={(e) => setReportData({ ...reportData, endDate: e.target.value })}
                />
              </Column>
              <Column gap="8">
                <Text as="label" htmlFor="report-status" variant="label-default-s">Status</Text>
                <select
                  id="report-status"
                  className="app-field"
                  value={reportData.status}
                  onChange={(e) => setReportData({ ...reportData, status: e.target.value })}
                >
                  <option value="all">All statuses</option>
                  <option value="draft">Draft</option>
                  <option value="submitted">Submitted</option>
                  <option value="under_review">Under Review</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </Column>
              <Row gap="8" horizontal="end">
                <Button variant="secondary" onClick={() => setShowReportModal(false)}>
                  Cancel
                </Button>
                <Button onClick={generateReport}>Generate report</Button>
              </Row>
            </Column>
          </Card>
        </Modal>
      )}

      {showDeleteModal && submissionToDelete && (
        <Modal onClose={() => setShowDeleteModal(false)} labelledBy="delete-submission-title">
          <Card padding="24" radius="l" direction="column" style={{ width: '100%', maxWidth: '32rem' }}>
            <Column gap="16">
              <Heading id="delete-submission-title" variant="heading-strong-m">Delete submission</Heading>
              <Text onBackground="neutral-weak">
                This cannot be undone. The school plan for {submissionToDelete.schoolName} will be permanently removed.
              </Text>
              <Column gap="4" padding="16" background="danger-alpha-weak" radius="m">
                <Text variant="body-default-s">School: {submissionToDelete.schoolName}</Text>
                <Text variant="body-default-s">Principal: {submissionToDelete.principalName}</Text>
                <Text variant="body-default-s">
                  Status: {getStatusBadge(submissionToDelete.status || 'draft')}
                </Text>
              </Column>
              <Row gap="8" horizontal="end">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSubmissionToDelete(null);
                  }}
                >
                  Cancel
                </Button>
                <Button variant="danger" onClick={handleDelete}>
                  Delete permanently
                </Button>
              </Row>
            </Column>
          </Card>
        </Modal>
      )}

      {showTransferModal && submissionToTransfer && (
        <Modal onClose={() => setShowTransferModal(false)} labelledBy="transfer-ownership-title">
          <Card padding="24" radius="l" direction="column" style={{ width: '100%', maxWidth: '32rem' }}>
            <Column gap="16">
              <Heading id="transfer-ownership-title" variant="heading-strong-m">Transfer ownership</Heading>
              <Text onBackground="neutral-weak">
                The new owner will have full control of this form and must be a Level 4 principal.
              </Text>
              <Column gap="4" padding="16" background="brand-alpha-weak" radius="m">
                <Text variant="body-default-s">
                  Current owner: {submissionToTransfer.principalName} ({submissionToTransfer.principalEmail})
                </Text>
                <Text variant="body-default-s">School: {submissionToTransfer.schoolName}</Text>
                <Text variant="body-default-s">
                  Status: {getStatusBadge(submissionToTransfer.status || 'draft')}
                </Text>
              </Column>
              <Column gap="8">
                <Text as="label" htmlFor="transfer-new-owner" variant="label-default-s">New owner email</Text>
                <PrincipalEmailAutocomplete
                  id="transfer-new-owner"
                  value={transferData.newOwnerEmail}
                  onChange={(email) => setTransferData({ newOwnerEmail: email })}
                  placeholder="Enter principal email"
                  required
                />
              </Column>
              <Row gap="8" horizontal="end">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowTransferModal(false);
                    setSubmissionToTransfer(null);
                    setTransferData({ newOwnerEmail: '' });
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleTransferOwnership}
                  disabled={!transferData.newOwnerEmail || transferring}
                >
                  {transferring ? 'Transferring...' : 'Transfer ownership'}
                </Button>
              </Row>
            </Column>
          </Card>
        </Modal>
      )}

      {showPrintModal && printSubmission && (
        <Modal onClose={() => setShowPrintModal(false)} size="wide" labelledBy="print-preview-title">
          <Card
            padding="0"
            radius="l"
            direction="column"
            style={{ width: '100%', maxWidth: '72rem', maxHeight: '90vh', overflow: 'hidden' }}
          >
            <Row
              fillWidth
              horizontal="between"
              vertical="center"
              padding="20"
              style={{ borderBottom: '1px solid var(--neutral-alpha-medium)' }}
            >
              <Heading id="print-preview-title" variant="heading-strong-m">
                Print view · {printSubmission.schoolName}
              </Heading>
              <Button
                size="s"
                variant="secondary"
                onClick={() => {
                  setShowPrintModal(false);
                  setPrintSubmission(null);
                }}
              >
                Close
              </Button>
            </Row>
            <Column padding="24" style={{ overflow: 'auto', maxHeight: 'calc(90vh - 5rem)' }}>
              <FormViewer form={printSubmission} />
            </Column>
          </Card>
        </Modal>
      )}

      <ScrollToTop />
    </DashboardShell>
  );
}
