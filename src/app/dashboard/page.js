'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import ScrollToTop from '../../components/ScrollToTop';
import AnalyticsDashboard from '../../components/AnalyticsDashboard';
import SmartNotifications from '../../components/SmartNotifications';
import BulkOperations from '../../components/BulkOperations';
import SchoolPerformanceScoring from '../../components/SchoolPerformanceScoring';
import BulkFormCreation from '../../components/BulkFormCreation';
import { 
  Building2, 
  User, 
  LogOut, 
  FileText, 
  Search, 
  Users, 
  BarChart3, 
  Bell, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye, 
  Edit,
  Plus,
  FileSpreadsheet,
  AlertCircle,
  TrendingUp,
  Shield,
  GraduationCap,
  PieChart,
  BarChart,
  Settings,
  Award,
  Calendar
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showBulkCreate, setShowBulkCreate] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    submitted: 0,
    underReview: 0,
    approved: 0,
    rejected: 0,
    averageProgress: 0
  });
  const [statsView, setStatsView] = useState('cards'); // 'cards' or 'graph'
  const [timelineData, setTimelineData] = useState({
    timeline: {
      '30_days_ago': { submitted: 0, approved: 0, underReview: 0 },
      '20_days_ago': { submitted: 0, approved: 0, underReview: 0 },
      '10_days_ago': { submitted: 0, approved: 0, underReview: 0 },
      'today': { submitted: 0, approved: 0, underReview: 0 }
    },
    weekly: { submitted: 0, approved: 0 },
    totals: { submitted: 0, approved: 0, underReview: 0, total: 0 }
  });
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [activeTab, setActiveTab] = useState('comments');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      fetchForms();
      if (session.user.level < 4) {
        fetchNotifications();
      }
      if (session.user.level === 4) {
        fetchTimelineData();
      }
    }
  }, [session]);

  const fetchForms = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/forms');
      if (response.ok) {
        const data = await response.json();
        const formsData = data.forms || [];
        setForms(formsData);
        
        // Calculate statistics for admin users (level >= 4)
        if (session?.user?.level >= 4) {
          const statsData = calculateStats(formsData);
          setStats(statsData);
        }
      } else {
        console.error('Failed to fetch forms');
      }
    } catch (error) {
      console.error('Error fetching forms:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const fetchTimelineData = async () => {
    if (!session?.user || session.user.level !== 4) return;
    
    setLoadingTimeline(true);
    try {
      const response = await fetch('/api/admin/timeline');
      
      if (response.ok) {
        const data = await response.json();
        setTimelineData(data.data);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to fetch timeline data:', response.status, errorData);
        // Set empty timeline data to prevent errors
        setTimelineData({
          timeline: {
            '30_days_ago': { submitted: 0, approved: 0, underReview: 0 },
            '20_days_ago': { submitted: 0, approved: 0, underReview: 0 },
            '10_days_ago': { submitted: 0, approved: 0, underReview: 0 },
            'today': { submitted: 0, approved: 0, underReview: 0 }
          },
          weekly: { submitted: 0, approved: 0 },
          totals: { submitted: 0, approved: 0, underReview: 0, total: 0 }
        });
      }
    } catch (error) {
      console.error('Error fetching timeline data:', error);
      // Set empty timeline data to prevent errors
      setTimelineData({
        timeline: {
          '30_days_ago': { submitted: 0, approved: 0, underReview: 0 },
          '20_days_ago': { submitted: 0, approved: 0, underReview: 0 },
          '10_days_ago': { submitted: 0, approved: 0, underReview: 0 },
          'today': { submitted: 0, approved: 0, underReview: 0 }
        },
        weekly: { submitted: 0, approved: 0 },
        totals: { submitted: 0, approved: 0, underReview: 0, total: 0 }
      });
    } finally {
      setLoadingTimeline(false);
    }
  };

  const calculateStats = (formsData) => {
    const total = formsData.length;
    const draft = formsData.filter(f => f.status === 'draft').length;
    const submitted = formsData.filter(f => f.status === 'submitted').length;
    const underReview = formsData.filter(f => f.status === 'under_review').length;
    const approved = formsData.filter(f => f.status === 'approved').length;
    const rejected = formsData.filter(f => f.status === 'rejected').length;
    
    const totalProgress = formsData.reduce((sum, form) => {
      const completedSteps = form.completedSteps?.length || 0;
      return sum + (completedSteps / 14) * 100;
    }, 0);
    
    const averageProgress = total > 0 ? Math.round(totalProgress / total) : 0;

    return {
      total,
      draft,
      submitted,
      underReview,
      approved,
      rejected,
      averageProgress
    };
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-transparent border-t-primary-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-secondary-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const userLevel = session.user.level;
  const isAdmin = userLevel >= 4; // Level 4+ (Admin Principal and Super Admin)


  const handleSignOut = () => {
    signOut({ callbackUrl: '/login' });
  };

  return (
    <div className="min-h-screen bg-secondary-50">
      {/* Header */}
      <header className="bg-white shadow-lg border-b-2 border-primary-200">
        <div className="max-w-[140rem] mx-auto px-6">
          <div className="flex justify-between items-center py-8">
            <div>
              <h1 className="text-5xl font-extrabold text-secondary-800 mb-3 flex items-center gap-3">
                <Building2 size={48} className="text-primary-500" />
                District 79 Dashboard
              </h1>
              <p className="text-lg text-secondary-500">
                Welcome back, <span className="text-primary-500 font-semibold">{session.user.name}</span>
                <span className="ml-3 px-3 py-1 bg-secondary-100 rounded-lg text-sm font-semibold text-secondary-700">
                  Level {userLevel}
                </span>
              </p>
            </div>
            <div className="flex items-center gap-6">
              {session.user.level < 4 && notifications.length > 0 && (
                <div className="relative px-6 py-3 bg-gradient-to-r from-warning-500 to-warning-600 text-white rounded-xl text-base font-semibold shadow-lg border-2 border-white/10 animate-pulse-slow flex items-center gap-2">
                  <Bell size={20} />
                  {notifications.length} Review{notifications.length !== 1 ? 's' : ''} Available
                </div>
              )}
              <button
                onClick={handleSignOut}
                className="btn-danger flex items-center gap-2"
              >
                <LogOut size={20} />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[140rem] mx-auto px-6 py-8">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {/* Start New Form - Level 4+ (Principals and Super Admins) */}
          {userLevel >= 4 && (
            <Link
              href="/form/new"
              className="card group overflow-hidden relative cursor-pointer"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10 p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="bg-blue-100 group-hover:bg-white/20 transition-colors p-3 rounded-lg">
                    <FileText className="text-blue-600 group-hover:text-white transition-colors" size={32} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-white transition-colors mb-1">
                      Start New Form
                    </h3>
                    <p className="text-sm text-gray-600 group-hover:text-white/90 transition-colors">
                      Begin a new school plan submission
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          )}

          {/* Bulk Form Creation - Super Admin Only */}
          {userLevel === 5 && (
            <button
              onClick={() => setShowBulkCreate(!showBulkCreate)}
              className="card group overflow-hidden relative cursor-pointer text-left w-full"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10 p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="bg-blue-100 group-hover:bg-white/20 transition-colors p-3 rounded-lg">
                    <FileText className="text-blue-600 group-hover:text-white transition-colors" size={32} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-white transition-colors mb-1">
                      Bulk Form Creation
                    </h3>
                    <p className="text-sm text-gray-600 group-hover:text-white/90 transition-colors mb-2">
                      Create and assign forms to multiple principals at once
                    </p>
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-red-600 group-hover:text-white/90 transition-colors" />
                      <span className="text-xs text-red-600 group-hover:text-white/90 transition-colors font-semibold">
                        Super Admin Only
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </button>
          )}

          {/* Review All Submissions - Super Admin Only */}
          {userLevel === 5 && (
            <Link
              href="/admin/submissions"
              className="card group overflow-hidden relative cursor-pointer"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-green-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10 p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="bg-green-100 group-hover:bg-white/20 transition-colors p-3 rounded-lg">
                    <Search className="text-green-600 group-hover:text-white transition-colors" size={32} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-white transition-colors mb-1">
                      Review All Submissions
                    </h3>
                    <p className="text-sm text-gray-600 group-hover:text-white/90 transition-colors">
                      Review and approve all forms across all schools
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          )}

          {/* Manage All Users - Super Admin Only */}
          {userLevel === 5 && (
            <Link
              href="/admin/users"
              className="card group overflow-hidden relative cursor-pointer"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-green-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10 p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="bg-green-100 group-hover:bg-white/20 transition-colors p-3 rounded-lg">
                    <Users className="text-green-600 group-hover:text-white transition-colors" size={32} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-white transition-colors mb-1">
                      Manage All Users
                    </h3>
                    <p className="text-sm text-gray-600 group-hover:text-white/90 transition-colors">
                      Manage all users across all schools
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          )}
          {/* Manage Goals - Super Admin Only */}
          {userLevel === 5 && (
            <Link
              href="/admin/goals"
              className="card group overflow-hidden relative cursor-pointer"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-green-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10 p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="bg-green-100 group-hover:bg-white/20 transition-colors p-3 rounded-lg">
                    <Users className="text-green-600 group-hover:text-white transition-colors" size={32} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-white transition-colors mb-1">
                      Manage Goals
                    </h3>
                    <p className="text-sm text-gray-600 group-hover:text-white/90 transition-colors">
                      Manage goals across all schools
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          )}

          {/* Manage School Users - Admin Principal Only */}
          {userLevel === 4 && (
            <Link
              href="/admin/users"
              className="card group overflow-hidden relative cursor-pointer"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-green-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10 p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="bg-green-100 group-hover:bg-white/20 transition-colors p-3 rounded-lg">
                    <Users className="text-green-600 group-hover:text-white transition-colors" size={32} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-white transition-colors mb-1">
                      Manage School Users
                    </h3>
                    <p className="text-sm text-gray-600 group-hover:text-white/90 transition-colors">
                      Manage users from your school
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          )}

          {/* Collaboration Dashboard - Admin Principal Only */}
          {userLevel === 4 && (
            <Link
              href="/admin/users?tab=collaboration"
              className="card group overflow-hidden relative cursor-pointer"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-green-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10 p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="bg-green-100 group-hover:bg-white/20 transition-colors p-3 rounded-lg">
                    <Users className="text-green-600 group-hover:text-white transition-colors" size={32} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-white transition-colors mb-1">
                      Collaboration Dashboard
                    </h3>
                    <p className="text-sm text-gray-600 group-hover:text-white/90 transition-colors">
                      Manage staff and share forms for collaboration
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          )}

          {/* Collaboration Dashboard - Super Admin Only */}
          {userLevel === 5 && (
            <Link
              href="/admin/users?tab=collaboration"
              className="card group overflow-hidden relative cursor-pointer"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-green-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10 p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="bg-green-100 group-hover:bg-white/20 transition-colors p-3 rounded-lg">
                    <Users className="text-green-600 group-hover:text-white transition-colors" size={32} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-white transition-colors mb-1">
                      Collaboration Dashboard
                    </h3>
                    <p className="text-sm text-gray-600 group-hover:text-white/90 transition-colors">
                      Manage staff and share forms for collaboration
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          )}
        </div>

        {/* Bulk Form Creation Section - Super Admin Only */}
        {userLevel === 5 && showBulkCreate && (
          <div className="mb-12">
            <BulkFormCreation 
              onFormsCreated={() => {
                fetchForms();
                setShowBulkCreate(false);
              }} 
            />
          </div>
        )}

        {/* Enhanced Admin Dashboard */}
        {(userLevel === 4 || userLevel === 5) && (
          <div className="mb-12">
            {/* Tab Navigation */}
            <div className="card mb-6 overflow-hidden">
              <div className="card-header">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <BarChart3 size={28} />
                    Super Admin Dashboard
                  </h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setActiveTab('comments')}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                        activeTab === 'comments' 
                          ? 'bg-primary-500 text-white' 
                          : 'bg-white/10 text-white border border-white/20'
                      }`}
                    >
                      <FileText size={16} className="inline mr-2" />
                      Comments
                    </button>
                    <button
                      onClick={() => setActiveTab('analytics')}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                        activeTab === 'analytics' 
                          ? 'bg-primary-500 text-white' 
                          : 'bg-white/10 text-white border border-white/20'
                      }`}
                    >
                      <BarChart3 size={16} className="inline mr-2" />
                      Analytics
                    </button>
                    <button
                      onClick={() => setActiveTab('notifications')}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                        activeTab === 'notifications' 
                          ? 'bg-primary-500 text-white' 
                          : 'bg-white/10 text-white border border-white/20'
                      }`}
                    >
                      <Bell size={16} className="inline mr-2" />
                      Notifications
                    </button>
                    <button
                      onClick={() => setActiveTab('bulk')}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                        activeTab === 'bulk' 
                          ? 'bg-primary-500 text-white' 
                          : 'bg-white/10 text-white border border-white/20'
                      }`}
                    >
                      <Settings size={16} className="inline mr-2" />
                      Bulk Operations
                    </button>
                    <button
                      onClick={() => setActiveTab('performance')}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                        activeTab === 'performance' 
                          ? 'bg-primary-500 text-white' 
                          : 'bg-white/10 text-white border border-white/20'
                      }`}
                    >
                      <Award size={16} className="inline mr-2" />
                      Performance
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              {activeTab === 'comments' && (
                <div>
                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Review Comments & Feedback</h3>
                    <p className="text-gray-600">View all review comments from super admins on your Consolidated Plan submissions.</p>
                  </div>
                  
                  {forms.filter(form => {
                    // Check if form has comments (either in new comments array or legacy reviewComments field)
                    const hasComments = form.comments && form.comments.length > 0;
                    const hasLegacyComment = form.reviewComments && form.reviewComments.trim().length > 0;
                    return hasComments || hasLegacyComment;
                  }).length === 0 ? (
                    <div className="text-center py-12">
                      <FileText size={64} className="mx-auto text-gray-400 mb-4" />
                      <p className="text-lg text-gray-600 font-medium">No review comments yet</p>
                      <p className="text-sm text-gray-500 mt-2">Review comments will appear here once a super admin provides feedback on your form submissions.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {forms
                        .filter(form => {
                          // Check if form has comments (either in new comments array or legacy reviewComments field)
                          const hasComments = form.comments && form.comments.length > 0;
                          const hasLegacyComment = form.reviewComments && form.reviewComments.trim().length > 0;
                          return hasComments || hasLegacyComment;
                        })
                        .sort((a, b) => {
                          // Sort by reviewedAt date (most recent first)
                          // Use latest comment date if available, otherwise use form reviewedAt
                          const getLatestDate = (form) => {
                            if (form.comments && form.comments.length > 0) {
                              return new Date(form.comments[0].reviewedAt);
                            }
                            return form.reviewedAt ? new Date(form.reviewedAt) : new Date(0);
                          };
                          const dateA = getLatestDate(a);
                          const dateB = getLatestDate(b);
                          return dateB - dateA;
                        })
                        .map((form) => {
                          // Get the latest comment (from new collection or legacy field)
                          const latestComment = form.comments && form.comments.length > 0 
                            ? form.comments[0] 
                            : (form.reviewComments ? { comment: form.reviewComments, reviewedBy: form.reviewedBy, reviewedAt: form.reviewedAt } : null);
                          
                          return (
                          <div key={form._id} className="border-2 border-gray-200 rounded-lg p-6 hover:shadow-lg transition-all duration-200 bg-gradient-to-br from-white to-gray-50">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h4 className="text-lg font-bold text-gray-800">{form.schoolName}</h4>
                                  {form.status === 'approved' ? (
                                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      <CheckCircle size={12} className="text-emerald-500" />
                                      Approved
                                    </span>
                                  ) : form.status === 'rejected' ? (
                                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                                      <XCircle size={12} className="text-red-500" />
                                      Rejected
                                    </span>
                                  ) : form.status === 'under_review' ? (
                                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                      <Clock size={12} className="text-amber-500" />
                                      Under Review
                                    </span>
                                  ) : null}
                                </div>
                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                  <span className="flex items-center gap-1">
                                    <User size={14} />
                                    {form.principalName}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Calendar size={14} />
                                    {latestComment?.reviewedAt ? `Reviewed: ${new Date(latestComment.reviewedAt).toLocaleDateString()}` : form.reviewedAt ? `Reviewed: ${new Date(form.reviewedAt).toLocaleDateString()}` : 'Not reviewed'}
                                  </span>
                                  {(latestComment?.reviewedBy?.name || latestComment?.reviewedByName || form.reviewedBy?.name) && (
                                    <span className="flex items-center gap-1">
                                      <Shield size={14} />
                                      Reviewed by: {latestComment?.reviewedBy?.name || latestComment?.reviewedByName || form.reviewedBy?.name}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Link
                                  href={`/form/${form._id}`}
                                  className="btn-primary inline-flex items-center gap-2 whitespace-nowrap"
                                >
                                  <Edit size={16} />
                                  Edit Form
                                </Link>
                                <Link
                                  href={`/view/${form._id}`}
                                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
                                  title="View all steps in one page (print-friendly)"
                                >
                                  <Eye size={16} />
                                  View All
                                </Link>
                              </div>
                            </div>
                            
                            <div className="bg-blue-50 border-l-4 border-blue-500 rounded-r-lg p-4 mt-4">
                              <div className="flex items-start gap-3">
                                <FileText size={20} className="text-blue-600 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                  <h5 className="text-sm font-semibold text-blue-900 mb-2">
                                    {form.comments && form.comments.length > 1 
                                      ? `Review Comments (${form.comments.length} total):` 
                                      : 'Review Comments:'}
                                  </h5>
                                  {latestComment && (
                                    <div className="mb-3">
                                      <p className="text-base text-gray-800 leading-relaxed whitespace-pre-wrap">
                                        {latestComment.comment || latestComment}
                                      </p>
                                      
                                      {/* Show step-specific comments if any */}
                                      {form.comments && form.comments.some(c => c.stepNumber) && (
                                        <div className="mt-4 pt-4 border-t border-blue-200">
                                          <h6 className="text-xs font-semibold text-blue-900 mb-2">Step-Specific Comments:</h6>
                                          <div className="space-y-2">
                                            {form.comments
                                              .filter(c => c.stepNumber)
                                              .sort((a, b) => (a.stepNumber || 0) - (b.stepNumber || 0))
                                              .map((comment) => (
                                                <div key={comment._id} className={`bg-white rounded p-3 border-2 ${
                                                  comment.isFixed ? 'border-green-300 bg-green-50' : 'border-blue-200'
                                                }`}>
                                                  <div className="flex items-center justify-between mb-1">
                                                    <span className="text-xs font-semibold text-blue-900">
                                                      Step {comment.stepNumber}
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                      {comment.isFixed && (
                                                        <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded flex items-center gap-1">
                                                          <CheckCircle size={12} />
                                                          Fixed
                                                        </span>
                                                      )}
                                                      {comment.readBy && !comment.isFixed && (
                                                        <span className="text-xs text-gray-500">Read</span>
                                                      )}
                                                    </div>
                                                  </div>
                                                  <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                                                    {comment.comment}
                                                  </p>
                                                </div>
                                              ))}
                                          </div>
                                        </div>
                                      )}
                                      
                                      {form.comments && form.comments.length > 1 && !form.comments.some(c => c.stepNumber) && (
                                        <details className="mt-3">
                                          <summary className="text-sm text-blue-700 cursor-pointer hover:text-blue-900 font-medium">
                                            View all {form.comments.length} comments
                                          </summary>
                                          <div className="mt-3 space-y-3 pl-4 border-l-2 border-blue-300">
                                            {form.comments.slice(1).map((comment, idx) => (
                                              <div key={comment._id || idx} className="bg-white rounded p-3 border border-blue-200">
                                                <div className="text-xs text-gray-600 mb-1">
                                                  {comment.reviewedBy?.name || comment.reviewedByName} - {new Date(comment.reviewedAt).toLocaleDateString()}
                                                </div>
                                                <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                                                  {comment.comment}
                                                </p>
                                              </div>
                                            ))}
                                          </div>
                                        </details>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {form.status === 'rejected' || form.status === 'under_review' ? (
                              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                <p className="text-sm text-amber-800 flex items-center gap-2">
                                  <AlertCircle size={16} className="text-amber-600" />
                                  <span className="font-medium">Action Required:</span> Please review the comments above and make the necessary changes to your Consolidated Plan.
                                </p>
                              </div>
                            ) : null}
                          </div>
                        );
                        })}
                    </div>
                  )}
                </div>
              )}
              {activeTab === 'analytics' && <AnalyticsDashboard forms={forms} stats={stats} />}
              {activeTab === 'notifications' && <SmartNotifications forms={forms} stats={stats} />}
              {activeTab === 'bulk' && <BulkOperations forms={forms} onUpdateForms={setForms} />}
              {activeTab === 'performance' && <SchoolPerformanceScoring forms={forms} />}
            </div>
          </div>
        )}

        {/* Legacy Statistics (for non-super-admin users) */}
        {(userLevel >= 4 && userLevel < 5) && (
          <div className="card mb-12 overflow-hidden">
            <div className="card-header flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <BarChart3 size={28} />
                School Submission Statistics
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setStatsView('cards')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                    statsView === 'cards' 
                      ? 'bg-primary-500 text-white' 
                      : 'bg-white/10 text-white border border-white/20'
                  }`}
                >
                  <BarChart3 size={16} className="inline mr-2" />
                  Cards
                </button>
                <button
                  onClick={() => setStatsView('graph')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                    statsView === 'graph' 
                      ? 'bg-primary-500 text-white' 
                      : 'bg-white/10 text-white border border-white/20'
                  }`}
                >
                  <PieChart size={16} className="inline mr-2" />
                  Graph
                </button>
              </div>
            </div>
            
            <div className="p-10">
              {statsView === 'cards' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-8">
                  <div className="card text-center p-6">
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <BarChart3 size={32} className="text-secondary-800" />
                      <div className="text-5xl font-extrabold text-secondary-800">
                        {stats.total}
                      </div>
                    </div>
                    <div className="text-base text-secondary-600 font-semibold uppercase tracking-wide">
                      Total Submissions
                    </div>
                  </div>
                  
                  <div className="card text-center p-6">
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <TrendingUp size={32} className="text-primary-500" />
                      <div className="text-5xl font-extrabold text-primary-500">
                        {stats.submitted}
                      </div>
                    </div>
                    <div className="text-base text-secondary-600 font-semibold uppercase tracking-wide">
                      Submitted
                    </div>
                  </div>
                  
                  <div className="card text-center p-6">
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <Clock size={32} className="text-warning-500" />
                      <div className="text-5xl font-extrabold text-warning-500">
                        {stats.underReview}
                      </div>
                    </div>
                    <div className="text-base text-secondary-600 font-semibold uppercase tracking-wide">
                      Under Review
                    </div>
                  </div>
                  
                  <div className="card text-center p-6">
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <CheckCircle size={32} className="text-success-500" />
                      <div className="text-5xl font-extrabold text-success-500">
                        {stats.approved}
                      </div>
                    </div>
                    <div className="text-base text-secondary-600 font-semibold uppercase tracking-wide">
                      Approved
                    </div>
                  </div>
                  
                  <div className="card text-center p-6">
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <XCircle size={32} className="text-danger-500" />
                      <div className="text-5xl font-extrabold text-danger-500">
                        {stats.rejected}
                      </div>
                    </div>
                    <div className="text-base text-secondary-600 font-semibold uppercase tracking-wide">
                      Rejected
                    </div>
                  </div>
                  
                  <div className="card text-center p-6">
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <TrendingUp size={32} className="text-purple-500" />
                      <div className="text-5xl font-extrabold text-purple-500">
                        {stats.averageProgress}%
                      </div>
                    </div>
                    <div className="text-base text-secondary-600 font-semibold uppercase tracking-wide">
                      Avg. Progress
                    </div>
                  </div>
                </div>
              ) : (
                <div className="card text-center p-8">
                  <div className="flex items-center justify-center gap-4 mb-8">
                    <PieChart size={64} className="text-primary-500" />
                    <div>
                      <h3 className="text-2xl font-bold text-secondary-800 mb-2">
                        Submission Timeline
                      </h3>
                      <p className="text-base text-secondary-600">
                        Track submission trends over the last 30 days
                      </p>
                    </div>
                  </div>
                  
                  {/* Timeline Chart */}
                  <div className="w-full h-80 relative mb-8">
                    {loadingTimeline ? (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-secondary-50 to-secondary-100 rounded-xl border border-secondary-200">
                        <div className="text-center">
                          <div className="w-8 h-8 border-2 border-transparent border-t-primary-500 rounded-full animate-spin mx-auto mb-4"></div>
                          <p className="text-secondary-600 text-sm">Loading chart data...</p>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-full relative bg-gradient-to-b from-secondary-50 to-secondary-100 rounded-xl border border-secondary-200 p-8">
                        {/* Y-axis labels */}
                        <div className="absolute left-0 top-8 bottom-8 w-8 flex flex-col justify-between text-xs text-secondary-500 font-medium text-right">
                          <span>10</span>
                          <span>8</span>
                          <span>6</span>
                          <span>4</span>
                          <span>2</span>
                          <span>0</span>
                        </div>
                        
                        {/* Chart Area */}
                        <div className="absolute left-8 top-8 right-8 bottom-8 border-l-2 border-b-2 border-secondary-300">
                          {/* Grid Lines */}
                          {[0, 1, 2, 3, 4, 5].map((line) => (
                            <div key={line} className="absolute left-0 right-0 h-px bg-secondary-200 opacity-70"
                                 style={{ top: `${(line / 5) * 100}%` }} />
                          ))}
                          
                          {/* Timeline Labels */}
                          <div className="absolute -bottom-8 left-0 right-0 flex justify-between text-xs text-secondary-500 font-medium">
                            <span>30 days ago</span>
                            <span>20 days ago</span>
                            <span>10 days ago</span>
                            <span>Today</span>
                          </div>
                          
                          {/* Dynamic Chart Lines */}
                          {timelineData && (
                            <>
                              {/* Submitted Line */}
                              <svg className="absolute top-0 left-0 w-full h-full overflow-visible">
                                <path
                                  d={`M 0 ${100 - (timelineData.timeline['30_days_ago'].submitted / 10) * 100} Q 25 ${100 - (timelineData.timeline['20_days_ago'].submitted / 10) * 100} 50 ${100 - (timelineData.timeline['10_days_ago'].submitted / 10) * 100} Q 75 ${100 - (timelineData.timeline.today.submitted / 10) * 100} 100 ${100 - (timelineData.timeline.today.submitted / 10) * 100}`}
                                  stroke="#3b82f6"
                                  strokeWidth="3"
                                  fill="none"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                                <circle cx="0" cy={100 - (timelineData.timeline['30_days_ago'].submitted / 10) * 100} r="5" fill="#3b82f6" stroke="white" strokeWidth="2" />
                                <circle cx="25" cy={100 - (timelineData.timeline['20_days_ago'].submitted / 10) * 100} r="5" fill="#3b82f6" stroke="white" strokeWidth="2" />
                                <circle cx="50" cy={100 - (timelineData.timeline['10_days_ago'].submitted / 10) * 100} r="5" fill="#3b82f6" stroke="white" strokeWidth="2" />
                                <circle cx="75" cy={100 - (timelineData.timeline.today.submitted / 10) * 100} r="5" fill="#3b82f6" stroke="white" strokeWidth="2" />
                                <circle cx="100" cy={100 - (timelineData.timeline.today.submitted / 10) * 100} r="5" fill="#3b82f6" stroke="white" strokeWidth="2" />
                              </svg>
                              
                              {/* Approved Line */}
                              <svg className="absolute top-0 left-0 w-full h-full overflow-visible">
                                <path
                                  d={`M 0 ${100 - (timelineData.timeline['30_days_ago'].approved / 10) * 100} Q 25 ${100 - (timelineData.timeline['20_days_ago'].approved / 10) * 100} 50 ${100 - (timelineData.timeline['10_days_ago'].approved / 10) * 100} Q 75 ${100 - (timelineData.timeline.today.approved / 10) * 100} 100 ${100 - (timelineData.timeline.today.approved / 10) * 100}`}
                                  stroke="#10b981"
                                  strokeWidth="3"
                                  fill="none"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                                <circle cx="0" cy={100 - (timelineData.timeline['30_days_ago'].approved / 10) * 100} r="5" fill="#10b981" stroke="white" strokeWidth="2" />
                                <circle cx="25" cy={100 - (timelineData.timeline['20_days_ago'].approved / 10) * 100} r="5" fill="#10b981" stroke="white" strokeWidth="2" />
                                <circle cx="50" cy={100 - (timelineData.timeline['10_days_ago'].approved / 10) * 100} r="5" fill="#10b981" stroke="white" strokeWidth="2" />
                                <circle cx="75" cy={100 - (timelineData.timeline.today.approved / 10) * 100} r="5" fill="#10b981" stroke="white" strokeWidth="2" />
                                <circle cx="100" cy={100 - (timelineData.timeline.today.approved / 10) * 100} r="5" fill="#10b981" stroke="white" strokeWidth="2" />
                              </svg>
                              
                              {/* Under Review Line */}
                              <svg className="absolute top-0 left-0 w-full h-full overflow-visible">
                                <path
                                  d={`M 0 ${100 - (timelineData.timeline['30_days_ago'].underReview / 10) * 100} Q 25 ${100 - (timelineData.timeline['20_days_ago'].underReview / 10) * 100} 50 ${100 - (timelineData.timeline['10_days_ago'].underReview / 10) * 100} Q 75 ${100 - (timelineData.timeline.today.underReview / 10) * 100} 100 ${100 - (timelineData.timeline.today.underReview / 10) * 100}`}
                                  stroke="#f59e0b"
                                  strokeWidth="3"
                                  fill="none"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                                <circle cx="0" cy={100 - (timelineData.timeline['30_days_ago'].underReview / 10) * 100} r="5" fill="#f59e0b" stroke="white" strokeWidth="2" />
                                <circle cx="25" cy={100 - (timelineData.timeline['20_days_ago'].underReview / 10) * 100} r="5" fill="#f59e0b" stroke="white" strokeWidth="2" />
                                <circle cx="50" cy={100 - (timelineData.timeline['10_days_ago'].underReview / 10) * 100} r="5" fill="#f59e0b" stroke="white" strokeWidth="2" />
                                <circle cx="75" cy={100 - (timelineData.timeline.today.underReview / 10) * 100} r="5" fill="#f59e0b" stroke="white" strokeWidth="2" />
                                <circle cx="100" cy={100 - (timelineData.timeline.today.underReview / 10) * 100} r="5" fill="#f59e0b" stroke="white" strokeWidth="2" />
                              </svg>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Legend */}
                  <div className="flex justify-center gap-8 flex-wrap mb-8">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-primary-500 rounded-full"></div>
                      <span className="text-sm text-secondary-600 font-medium">Submitted</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-success-500 rounded-full"></div>
                      <span className="text-sm text-secondary-600 font-medium">Approved</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-warning-500 rounded-full"></div>
                      <span className="text-sm text-secondary-600 font-medium">Under Review</span>
                    </div>
                  </div>
                  
                  {/* Summary Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 bg-secondary-50 rounded-xl border border-secondary-200">
                    <div className="text-center p-4">
                      <div className="text-2xl font-bold text-primary-500 mb-2">
                        +{timelineData ? timelineData.weekly.submitted : 0}
                      </div>
                      <div className="text-sm text-secondary-600 font-medium">This Week</div>
                    </div>
                    <div className="text-center p-4">
                      <div className="text-2xl font-bold text-success-500 mb-2">
                        {timelineData ? Math.round((timelineData.totals.approved / Math.max(1, timelineData.totals.submitted)) * 100) : 0}%
                      </div>
                      <div className="text-sm text-secondary-600 font-medium">Approval Rate</div>
                    </div>
                    <div className="text-center p-4">
                      <div className="text-2xl font-bold text-warning-500 mb-2">
                        {timelineData ? Math.round((timelineData.totals.underReview / Math.max(1, timelineData.totals.total)) * 100) : 0}%
                      </div>
                      <div className="text-sm text-secondary-600 font-medium">Pending Review</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notifications for Principals */}
        {session.user.level < 4 && notifications.length > 0 && (
          <div className="card mb-12 overflow-hidden border-2 border-warning-500">
            <div className="card-header bg-gradient-to-r from-warning-700 to-warning-800">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <Bell size={28} />
                Review Notifications
              </h2>
            </div>
            
            <div className="p-10">
              <div className="flex flex-col gap-6">
                {notifications.map((notification) => (
                  <div key={notification._id} className={`p-6 border-2 border-warning-500 rounded-xl shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                    notification.status === 'approved' ? 'bg-success-50' : 
                    notification.status === 'rejected' ? 'bg-danger-50' : 'bg-warning-50'
                  }`}>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="text-xl font-bold text-secondary-800 mb-2">
                          {notification.schoolName} - {notification.status === 'approved' ? 'Approved' : 
                                                       notification.status === 'rejected' ? 'Rejected' : 'Under Review'}
                        </h4>
                        <p className="text-base text-secondary-600 font-medium">
                          Reviewed by {notification.reviewedBy?.name || 'Admin'} on {new Date(notification.reviewedAt).toLocaleDateString()}
                        </p>
                      </div>
                      {notification.status === 'approved' ? (
                        <span className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm">
                          <CheckCircle size={14} className="text-emerald-500" />
                          Approved
                        </span>
                      ) : notification.status === 'rejected' ? (
                        <span className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-semibold bg-red-50 text-red-700 border border-red-200 shadow-sm">
                          <XCircle size={14} className="text-red-500" />
                          Rejected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-semibold bg-amber-50 text-amber-700 border border-amber-200 shadow-sm">
                          <Clock size={14} className="text-amber-500" />
                          Under Review
                        </span>
                      )}
                    </div>
                    {notification.reviewComments && (
                      <div className="mt-4 p-4 bg-white rounded-xl border border-secondary-200 shadow-sm">
                        <p className="text-base text-secondary-700 italic leading-relaxed">
                          "{notification.reviewComments}"
                        </p>
                      </div>
                    )}
                    <div className="mt-4">
                      <Link
                        href={`/form/${notification._id}`}
                        className="btn-primary inline-flex items-center gap-2"
                      >
                        <Eye size={16} />
                        View Submission
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Forms Overview */}
        <div className="card overflow-hidden">
          <div className="card-header">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <FileSpreadsheet size={28} />
              {isAdmin ? 'All Form Submissions' : 'Your Form Submissions'}
            </h2>
          </div>
          
          <div className="p-10">
            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block w-12 h-12 border-3 border-transparent border-t-primary-500 rounded-full animate-spin mb-4"></div>
                <p className="text-lg text-secondary-600 font-medium">Loading forms...</p>
              </div>
            ) : forms.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-8xl mb-6 opacity-70 flex justify-center">
                  <FileSpreadsheet size={80} className="text-secondary-500" />
                </div>
                <p className="text-2xl text-secondary-600 mb-4 font-semibold">No forms found yet.</p>
                <p className="text-base text-secondary-500 mb-8 leading-relaxed">
                  {isAdmin 
                    ? 'No form submissions have been created yet.'
                    : 'This is where your school plan submissions will appear once you create them.'
                  }
                </p>
                {userLevel >= 4 && !isAdmin && (
                  <Link href="/form/new" className="btn-primary inline-flex items-center gap-2">
                    <Plus size={20} />
                    Create your first form
                  </Link>
                )}
                {userLevel === 3 && (
                  <p className="text-base text-secondary-500 mt-4">
                    Forms will appear here once your principal assigns them to you for collaboration.
                  </p>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-8xl">
                  <thead>
                    <tr className="border-b-2 border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
                      <th className="text-left p-5 text-base font-bold text-gray-800 border-b-2 border-gray-200 min-w-64">School</th>
                      <th className="text-left p-5 text-base font-bold text-gray-800 border-b-2 border-gray-200 min-w-48">Principal</th>
                      <th className="text-left p-5 text-base font-bold text-gray-800 border-b-2 border-gray-200 min-w-64">Email</th>
                      <th className="text-left p-5 text-base font-bold text-gray-800 border-b-2 border-gray-200 min-w-40">Status</th>
                      <th className="text-left p-5 text-base font-bold text-gray-800 border-b-2 border-gray-200 min-w-48">Progress</th>
                      <th className="text-left p-5 text-base font-bold text-gray-800 border-b-2 border-gray-200 min-w-48">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {forms.slice(0, 10).map((form, index) => (
                      <tr key={form._id} className="border-b border-gray-100 transition-all duration-300 hover:bg-gray-50 hover:scale-[1.01] animate-fade-in"
                          style={{ animationDelay: `${index * 0.1}s` }}>
                        <td className="p-5 text-base">
                          <div className="font-semibold text-secondary-800 text-lg">{form.schoolName}</div>
                        </td>
                        <td className="p-5 text-base text-secondary-700 font-medium">
                          {form.principalName}
                        </td>
                        <td className="p-5 text-base text-secondary-600 font-medium">
                          {form.principalEmail}
                        </td>
                        <td className="p-5">
                          {form.status === 'draft' ? (
                            <span className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-semibold bg-gray-50 text-gray-600 border border-gray-200 shadow-sm">
                              <FileText size={14} className="text-gray-500" />
                              Draft
                            </span>
                          ) : form.status === 'submitted' ? (
                            <span className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-semibold bg-blue-50 text-blue-700 border border-blue-200 shadow-sm">
                              <TrendingUp size={14} className="text-blue-500" />
                              Submitted
                            </span>
                          ) : form.status === 'under_review' ? (
                            <span className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-semibold bg-amber-50 text-amber-700 border border-amber-200 shadow-sm">
                              <Clock size={14} className="text-amber-500" />
                              Under Review
                            </span>
                          ) : form.status === 'approved' ? (
                            <span className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm">
                              <CheckCircle size={14} className="text-emerald-500" />
                              Approved
                            </span>
                          ) : form.status === 'rejected' ? (
                            <span className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-semibold bg-red-50 text-red-700 border border-red-200 shadow-sm">
                              <XCircle size={14} className="text-red-500" />
                              Rejected
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-semibold bg-gray-50 text-gray-600 border border-gray-200 shadow-sm">
                              <FileText size={14} className="text-gray-500" />
                              {form.status}
                            </span>
                          )}
                        </td>
                        <td className="p-5 text-base">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 bg-gray-200 rounded-full h-2.5 border border-gray-300 overflow-hidden">
                              <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full transition-all duration-1000 shadow-sm"
                                   style={{ width: `${(form.completedSteps?.length || 0) / 14 * 100}%` }}></div>
                            </div>
                            <span className="text-sm text-gray-600 min-w-14 font-semibold">
                              {form.completedSteps?.length || 0}/14
                            </span>
                          </div>
                        </td>
                        <td className="p-5">
                          <Link
                            href={`/form/${form._id}`}
                            className="btn-primary inline-flex items-center gap-2"
                          >
                            <Eye size={16} />
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {forms.length > 10 && (
                  <div className="text-center py-8 border-t-2 border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
                    <p className="text-base text-gray-600 font-medium">
                      Showing first 10 submissions. 
                      {userLevel === 5 && (
                        <Link href="/admin/submissions" className="ml-3 text-blue-600 no-underline font-semibold px-4 py-2 bg-white rounded-lg border-2 border-gray-200 transition-all duration-300 hover:bg-blue-600 hover:text-white hover:-translate-y-1">
                          View all submissions →
                        </Link>
                      )}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </main>
      
      {/* Scroll to Top Button */}
      <ScrollToTop />
    </div>
  );
}