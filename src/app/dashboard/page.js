'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import ScrollToTop from '../../components/ScrollToTop';
import DeadlineReminders from '../../components/dashboard/DeadlineReminders';
import DashboardHeader from '../../components/dashboard/DashboardHeader';
import DashboardShell from '../../components/dashboard/DashboardShell';
import DashboardSidebar from '../../components/dashboard/DashboardSidebar';
import FormsOverview from '../../components/dashboard/FormsOverview';
import SuperAdminPanel from '../../components/dashboard/SuperAdminPanel';
import RoleHowTo from '../../components/dashboard/RoleHowTo';
import RolePreviewCard from '../../components/dashboard/RolePreviewCard';
import DashboardStatsGrid from '../../components/dashboard/DashboardStatsGrid';
import { completedStepCount } from '../../lib/formProgress';
import DashboardSection from '../../components/dashboard/DashboardSection';
import CommentsOverview from '../../components/dashboard/CommentsOverview';
import ReviewNotifications from '../../components/dashboard/ReviewNotifications';
import { Spinner, Column, Text, SegmentedControl } from '@once-ui-system/core';
import * as logger from '../../lib/logger';
import { 
  PieChart,
} from 'lucide-react';

// Every widget below is gated behind a non-default `activeView`, and the five year-setup
// panels additionally require level 5. Importing them eagerly meant every principal opening
// the dashboard downloaded the whole admin surface — including recharts, via
// AnalyticsDashboard — to render an overview that uses none of it.
const widgetFallback = () => (
  <Column fillWidth horizontal="center" vertical="center" paddingY="48">
    <Spinner size="m" />
  </Column>
);

function calculateStats(formsData) {
  const total = formsData.length;
  const draft = formsData.filter((f) => f.status === 'draft').length;
  const submitted = formsData.filter((f) => f.status === 'submitted').length;
  const underReview = formsData.filter((f) => f.status === 'under_review').length;
  const approved = formsData.filter((f) => f.status === 'approved').length;
  const rejected = formsData.filter((f) => f.status === 'rejected').length;

  const totalProgress = formsData.reduce((sum, form) => {
    const completedSteps = completedStepCount(form);
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
    averageProgress,
  };
}

const AnalyticsDashboard = dynamic(() => import('../../components/AnalyticsDashboard'), {
  loading: widgetFallback,
});
const SmartNotifications = dynamic(() => import('../../components/SmartNotifications'), {
  loading: widgetFallback,
});
const BulkOperations = dynamic(() => import('../../components/BulkOperations'), {
  loading: widgetFallback,
});
const SchoolPerformanceScoring = dynamic(
  () => import('../../components/SchoolPerformanceScoring'),
  { loading: widgetFallback }
);
const BulkFormCreation = dynamic(() => import('../../components/BulkFormCreation'), {
  loading: widgetFallback,
});
const SetupNextYear = dynamic(() => import('../../components/admin/SetupNextYear'), {
  loading: widgetFallback,
});
const YearRollover = dynamic(() => import('../../components/admin/YearRollover'), {
  loading: widgetFallback,
});
const ContactTableMigrate = dynamic(() => import('../../components/admin/ContactTableMigrate'), {
  loading: widgetFallback,
});
const YearLockPanel = dynamic(() => import('../../components/admin/YearLockPanel'), {
  loading: widgetFallback,
});
const YearSettingsPanel = dynamic(() => import('../../components/admin/YearSettingsPanel'), {
  loading: widgetFallback,
});

function DashboardPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
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
  const [setupYear, setSetupYear] = useState('');
  const activeView = searchParams.get('view') || 'overview';

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // isCancelled defaults to false so the refresh handlers can still call these directly.
  const fetchForms = useCallback(async (isCancelled = /** @type {() => boolean} */ (() => false)) => {
    setLoading(true);
    try {
      const response = await fetch('/api/forms');
      if (response.ok) {
        const data = await response.json();
        if (isCancelled()) return;
        const formsData = data.forms || [];
        setForms(formsData);
        
        // Calculate statistics for admin users (level >= 4)
        if (session?.user?.level >= 4) {
          const statsData = calculateStats(formsData);
          setStats(statsData);
        }
      } else {
        logger.error('Failed to fetch forms');
      }
    } catch (error) {
      logger.error('Error fetching forms:', error);
    } finally {
      if (!isCancelled()) setLoading(false);
    }
  }, [session]);

  const fetchNotifications = useCallback(async (isCancelled = /** @type {() => boolean} */ (() => false)) => {
    try {
      const response = await fetch('/api/notifications');
      if (response.ok) {
        const data = await response.json();
        if (isCancelled()) return;
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      logger.error('Error fetching notifications:', error);
    }
  }, []);

  const fetchTimelineData = useCallback(async (isCancelled = /** @type {() => boolean} */ (() => false)) => {
    if (!session?.user || session.user.level !== 4) return;
    
    setLoadingTimeline(true);
    try {
      const response = await fetch('/api/admin/timeline');
      
      if (isCancelled()) return;
      if (response.ok) {
        const data = await response.json();
        if (isCancelled()) return;
        setTimelineData(data.data);
      } else {
        const errorData = await response.json().catch(() => ({}));
        logger.error('Failed to fetch timeline data:', response.status, errorData);
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
      if (isCancelled()) return;
      logger.error('Error fetching timeline data:', error);
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
      if (!isCancelled()) setLoadingTimeline(false);
    }
  }, [session]);

  useEffect(() => {
    if (session?.user) {
      let cancelled = false;
      const isCancelled = () => cancelled;
      fetchForms(isCancelled);
      if (session.user.level < 4) {
        fetchNotifications(isCancelled);
      }
      if (session.user.level === 4) {
        fetchTimelineData(isCancelled);
      }
      return () => {
        cancelled = true;
      };
    }
  }, [session, fetchForms, fetchNotifications, fetchTimelineData]);

  if (status === 'loading') {
    return (
      <Column minHeight="100vh" horizontal="center" vertical="center" gap="16" background="page">
        <Spinner size="l" />
        <Text onBackground="neutral-weak">Loading...</Text>
      </Column>
    );
  }

  if (!session) {
    return null;
  }

  const userLevel = session.user.level;
  const isAdmin = userLevel >= 4; // Level 4+ (Admin Principal and Super Admin)
  const isOverview = activeView === 'overview';
  const viewTitles = {
    overview: 'Overview',
    forms: 'Forms',
    howto: 'How to',
    comments: 'Comments',
    analytics: 'Analytics',
    notifications: 'Notifications',
    bulk: 'Bulk operations',
    performance: 'Performance',
    'bulk-create': 'Bulk create',
  };

  return (
    <DashboardShell
      sidebar={
        <DashboardSidebar
          session={session}
          userLevel={userLevel}
        />
      }
      header={
        <DashboardHeader
          title={viewTitles[activeView] || 'Overview'}
          description={
            activeView === 'analytics'
              ? 'Track submission trends, completion, and school performance'
              : activeView === 'notifications'
                ? 'Deadlines, quality issues, and plans waiting for review'
                : activeView === 'performance'
                  ? 'Compare school plan scores, tiers, and completion speed'
                  : activeView === 'howto'
                    ? 'What you can do in this role, and what stays with someone else'
                    : activeView === 'bulk-create'
                    ? 'Set up the next school year, copy last year’s plans, or create blank drafts'
                    : activeView === 'forms'
                    ? 'Open a school plan to continue editing, compare years, or duplicate it'
                    : undefined
          }
          session={session}
          userLevel={userLevel}
          notificationsCount={notifications.length}
        />
      }
    >
        {isOverview && userLevel < 5 && (
          <RoleHowTo userLevel={userLevel} compact />
        )}

        {activeView === 'howto' && (
          <RoleHowTo userLevel={userLevel} />
        )}

        {userLevel === 5 && isOverview && !session.impersonating && (
          <RolePreviewCard />
        )}

        {userLevel === 5 && isOverview && (
          <DashboardStatsGrid stats={stats} />
        )}

        {isOverview && userLevel >= 4 && (
          <DeadlineReminders forms={forms} userLevel={userLevel} />
        )}

        {userLevel === 5 && activeView === 'bulk-create' && (
          <Column gap="24" fillWidth>
            <SetupNextYear
              onCreated={(year) => {
                setSetupYear(year);
                fetchForms();
              }}
            />
            <YearRollover onComplete={() => fetchForms()} />
            <ContactTableMigrate />
            <YearLockPanel />
            <YearSettingsPanel focusYear={setupYear} />
            <BulkFormCreation
              onFormsCreated={() => {
                fetchForms();
              }}
            />
          </Column>
        )}

        {(userLevel === 4 || userLevel === 5) && (
          <>
            {activeView === 'comments' && (
              <SuperAdminPanel>
                <CommentsOverview forms={forms} />
              </SuperAdminPanel>
            )}
            {activeView === 'analytics' && (
              <AnalyticsDashboard forms={forms} stats={stats} />
            )}
            {activeView === 'notifications' && (
              <SmartNotifications forms={forms} stats={stats} />
            )}
            {activeView === 'bulk' && (
              <SuperAdminPanel>
                <BulkOperations forms={forms} onUpdateForms={setForms} />
              </SuperAdminPanel>
            )}
            {activeView === 'performance' && (
              <SchoolPerformanceScoring forms={forms} />
            )}
          </>
        )}

        {userLevel >= 4 && userLevel < 5 && isOverview && (
          <DashboardSection
            title="School Submission Statistics"
            description="Track submission trends for your school"
            actions={
              <SegmentedControl
                buttons={[
                  { value: 'cards', label: 'Cards' },
                  { value: 'graph', label: 'Graph' },
                ]}
                selected={statsView}
                onToggle={setStatsView}
                compact
              />
            }
          >
              {statsView === 'cards' ? (
                <DashboardStatsGrid stats={stats} />
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
          </DashboardSection>
        )}

        {isOverview && session.user.level < 4 && (
          <ReviewNotifications notifications={notifications} />
        )}

        {(isOverview || activeView === 'forms') && (
          <FormsOverview
            forms={forms}
            loading={loading}
            isAdmin={isAdmin}
            userLevel={userLevel}
            showAll={activeView === 'forms'}
            onDuplicated={fetchForms}
          />
        )}

      <ScrollToTop />
    </DashboardShell>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <Column minHeight="100vh" horizontal="center" vertical="center" gap="16" background="page">
          <Spinner size="l" />
          <Text onBackground="neutral-weak">Loading...</Text>
        </Column>
      }
    >
      <DashboardPageContent />
    </Suspense>
  );
}