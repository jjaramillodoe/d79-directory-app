'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import {
  AlertCircle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import {
  Spinner,
  Column,
  Row,
  Text,
  Heading,
  Button,
  Card,
  Grid,
  SegmentedControl,
  Tag,
} from '@once-ui-system/core';
import DashboardShell from '../../../components/dashboard/DashboardShell';
import DashboardSidebar from '../../../components/dashboard/DashboardSidebar';
import DashboardHeader from '../../../components/dashboard/DashboardHeader';
import StatCard from '../../../components/dashboard/StatCard';
import DashboardSection from '../../../components/dashboard/DashboardSection';
import { currentSchoolYear } from '../../../lib/schoolYear';
import * as logger from '../../../lib/logger';

// ag-grid and recharts are the two heaviest dependencies on this page and neither is
// reachable from the default "overview" tab, so both load on demand. `ssr: false` because
// both measure the DOM to size themselves and have nothing useful to render on the server.
const ChartFallback = ({ height }) => (
  <Column fillWidth horizontal="center" vertical="center" style={{ height }}>
    <Spinner size="m" />
  </Column>
);

const DataGrid = dynamic(() => import('../../../components/admin/DataGrid'), {
  ssr: false,
  loading: () => <ChartFallback height={200} />,
});

const GoalsChartsPanel = dynamic(() => import('../../../components/admin/GoalsChartsPanel'), {
  ssr: false,
  loading: () => <ChartFallback height={280} />,
});

const ClusterScatterChart = dynamic(() => import('../../../components/admin/ClusterScatterChart'), {
  ssr: false,
  loading: () => <ChartFallback height={420} />,
});

function AdminGoalsPageContent() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRequired, setFilterRequired] = useState('all'); // all, required, optional
  const [gridApi, setGridApi] = useState(null);
  const [schoolYear, setSchoolYear] = useState(currentSchoolYear());

  // Handle authentication
  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/login');
      return;
    }

    // Only Super Admin (Level 5) can access
    if (session.user.level !== 5) {
      router.push('/dashboard');
      return;
    }
  }, [session, status, router]);

  // Fetch analysis data
  useEffect(() => {
    if (session?.user?.level === 5) {
      fetchAnalysis();
    }
  }, [session]);

  useEffect(() => {
    if (session?.user?.level === 5) {
      fetchAnalysis();
    }
  }, [schoolYear]);

  const fetchAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/goals?schoolYear=${encodeURIComponent(schoolYear)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch analysis data');
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      logger.error('Error fetching analysis:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    await fetchAnalysis();
    setAnalyzing(false);
  };

  // Filter questions based on search and filter
  const getFilteredQuestions = () => {
    if (!data?.questionStatistics) return [];
    
    let filtered = data.questionStatistics;
    
    // Filter by search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(q => 
        q.title.toLowerCase().includes(search) ||
        q.stepTitle.toLowerCase().includes(search) ||
        q.questionNumber.includes(search)
      );
    }
    
    // Filter by required/optional
    if (filterRequired === 'required') {
      filtered = filtered.filter(q => q.required);
    } else if (filterRequired === 'optional') {
      filtered = filtered.filter(q => !q.required);
    }
    
    return filtered;
  };

  // AG Grid column definitions for question statistics
  const questionColumnDefs = [
    {
      headerName: 'Step',
      field: 'stepTitle',
      sortable: true,
      filter: true,
      width: 200,
      pinned: 'left'
    },
    {
      headerName: 'Q#',
      field: 'questionNumber',
      sortable: true,
      filter: true,
      width: 80
    },
    {
      headerName: 'Question Title',
      field: 'title',
      sortable: true,
      filter: true,
      flex: 2,
      cellRenderer: (params) => (
        <div className="text-sm" title={params.value}>
          {params.value?.substring(0, 100)}{params.value?.length > 100 ? '...' : ''}
        </div>
      )
    },
    {
      headerName: 'Required',
      field: 'required',
      sortable: true,
      filter: true,
      width: 100,
      cellRenderer: (params) => (
        <span className={`inline-flex items-center px-2 py-1 rounded text-xs ${
          params.value 
            ? 'bg-red-100 text-red-800' 
            : 'bg-gray-100 text-gray-800'
        }`}>
          {params.value ? 'Yes' : 'No'}
        </span>
      )
    },
    {
      headerName: 'N/A Count',
      field: 'naCount',
      sortable: true,
      filter: true,
      width: 120,
      cellRenderer: (params) => (
        <div className="flex items-center">
          <XCircle className="w-4 h-4 mr-1 text-orange-600" />
          <span className="font-semibold">{params.value}</span>
        </div>
      )
    },
    {
      headerName: 'N/A %',
      field: 'naPercentage',
      sortable: true,
      filter: true,
      width: 120,
      cellRenderer: (params) => {
        const percentage = parseFloat(params.value);
        return (
          <div className="flex items-center">
            <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
              <div 
                className="bg-orange-600 h-2 rounded-full" 
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
            <span className="text-sm font-medium">{percentage}%</span>
          </div>
        );
      }
    },
    {
      headerName: 'Answered',
      field: 'answeredCount',
      sortable: true,
      filter: true,
      width: 120,
      cellRenderer: (params) => (
        <div className="flex items-center">
          <CheckCircle className="w-4 h-4 mr-1 text-green-600" />
          <span className="font-semibold">{params.value}</span>
        </div>
      )
    },
    {
      headerName: 'Answer %',
      field: 'answerPercentage',
      sortable: true,
      filter: true,
      width: 120,
      cellRenderer: (params) => {
        const percentage = parseFloat(params.value);
        return (
          <div className="flex items-center">
            <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
              <div 
                className="bg-green-600 h-2 rounded-full" 
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
            <span className="text-sm font-medium">{percentage}%</span>
          </div>
        );
      }
    },
    {
      headerName: 'Empty',
      field: 'emptyCount',
      sortable: true,
      filter: true,
      width: 100,
      cellRenderer: (params) => (
        <div className="flex items-center">
          <AlertCircle className="w-4 h-4 mr-1 text-gray-600" />
          <span>{params.value}</span>
        </div>
      )
    },
    {
      headerName: 'Total Responses',
      field: 'totalResponses',
      sortable: true,
      filter: true,
      width: 140
    }
  ];

  const onGridReady = (params) => {
    setGridApi(params.api);
  };

  const exportToCSV = () => {
    if (gridApi) {
      gridApi.exportDataAsCsv({
        fileName: `form-goals-analysis-${new Date().toISOString().split('T')[0]}.csv`
      });
    }
  };

  if (status === 'loading') {
    return (
      <Column minHeight="100vh" horizontal="center" vertical="center" gap="16" background="page">
        <Spinner size="l" />
        <Text onBackground="neutral-weak">Loading...</Text>
      </Column>
    );
  }

  if (!session || session.user.level !== 5) {
    return null;
  }

  const filteredQuestions = getFilteredQuestions();
  const topNA = data?.topNAQuestions || [];
  const highestNA = data?.highestNAPercentage || [];
  const stats = data?.overallStats || {};

  return (
    <DashboardShell
      sidebar={<DashboardSidebar session={session} userLevel={session.user.level} />}
      header={
        <DashboardHeader
          title="Goals"
          description={`N/A patterns and completion for ${schoolYear === 'all' ? 'all years' : schoolYear}`}
          session={session}
          userLevel={session.user.level}
          actions={
            <Row gap="8" wrap>
              <select
                className="app-field"
                value={schoolYear}
                onChange={(e) => setSchoolYear(e.target.value)}
              >
                <option value={currentSchoolYear()}>{currentSchoolYear()}</option>
                <option value="2025-2026">2025-2026</option>
                <option value="all">All years</option>
              </select>
              <Button size="s" variant="secondary" onClick={handleAnalyze} disabled={analyzing || loading}>
                {analyzing ? 'Analyzing…' : 'Re-analyze'}
              </Button>
              {filteredQuestions.length > 0 && (
                <Button size="s" variant="tertiary" onClick={exportToCSV}>
                  Export CSV
                </Button>
              )}
            </Row>
          }
        />
      }
    >
      {loading && !data && (
        <Column fillWidth horizontal="center" paddingY="40" gap="12">
          <Spinner size="l" />
          <Text onBackground="neutral-weak">Loading analysis...</Text>
        </Column>
      )}

      {error && (
        <Card padding="20" radius="l" fillWidth direction="column">
          <Column gap="12">
            <Heading variant="heading-strong-s">Could not load analysis</Heading>
            <Text onBackground="neutral-weak">{error}</Text>
            <Button size="s" onClick={fetchAnalysis}>Retry</Button>
          </Column>
        </Card>
      )}

      {data?.overallStats && (
        <Grid columns="4" gap="16" fillWidth s={{ columns: '2' }}>
          <StatCard accentKey="total" label="Total forms" value={stats.totalForms || 0} />
          <StatCard accentKey="approved" label="Completion rate" value={stats.averageCompletionRate || 0} suffix="%" />
          <StatCard accentKey="underReview" label="N/A rate" value={stats.averageNARate || 0} suffix="%" />
          <StatCard accentKey="draft" label="Empty rate" value={stats.averageEmptyRate || 0} suffix="%" />
        </Grid>
      )}

      {data && (
      <>
      <SegmentedControl
        buttons={[
          { value: 'overview', label: 'Overview' },
          { value: 'questions', label: 'Questions' },
          { value: 'topna', label: 'Top N/A' },
          { value: 'graphs', label: 'Charts' },
          { value: 'clustering', label: 'Clusters' },
        ]}
        selected={activeTab}
        onToggle={setActiveTab}
        fillWidth
      />

      {activeTab === 'overview' && (
        <Column gap="24" fillWidth>
          <Card padding="24" radius="l" fillWidth direction="column">
            <Column gap="8">
              <Heading variant="heading-strong-s">How N/A is detected</Heading>
              <Text variant="body-default-s" onBackground="neutral-weak">
                Answers matching “N/A”, “not applicable”, “does not apply”, and similar phrases are counted across all submissions so you can see which questions are often skipped.
              </Text>
              <Text variant="body-default-s" onBackground="neutral-weak">
                Use the rates below to decide which questions should stay required, become optional, or be removed from the bank.
              </Text>
            </Column>
          </Card>

          <DashboardSection title="Top questions marked N/A" description="Highest N/A counts across current forms">
            {topNA.length === 0 ? (
              <Text onBackground="neutral-weak">No N/A answers found yet.</Text>
            ) : (
              <Column gap="12" fillWidth>
                {topNA.slice(0, 10).map((q, idx) => (
                  <Row
                    key={q.questionId}
                    fillWidth
                    gap="16"
                    padding="16"
                    border="neutral-medium"
                    radius="m"
                    vertical="center"
                    wrap
                  >
                    <Text variant="label-strong-s" style={{ width: 28 }}>{idx + 1}</Text>
                    <Column gap="4" style={{ flex: 1, minWidth: 200 }}>
                      <Row gap="8" wrap vertical="center">
                        <Text variant="label-default-s" onBackground="neutral-weak">
                          {q.stepTitle} · Q{q.questionNumber}
                        </Text>
                        {q.required && <Tag size="s" variant="danger" label="Required" />}
                      </Row>
                      <Text weight="strong">{q.title}</Text>
                      <Text variant="body-default-s" onBackground="neutral-weak">
                        {q.naCount} N/A ({q.naPercentage}%) · {q.answeredCount} answered ({q.answerPercentage}%)
                      </Text>
                    </Column>
                  </Row>
                ))}
              </Column>
            )}
          </DashboardSection>
        </Column>
      )}

      {activeTab === 'questions' && (
        <DashboardSection
          title={`All questions (${filteredQuestions.length})`}
          actions={
            <Row gap="8" wrap>
              <input
                className="app-field"
                type="search"
                placeholder="Search questions"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ minWidth: 200 }}
              />
              <select
                className="app-field"
                value={filterRequired}
                onChange={(e) => setFilterRequired(e.target.value)}
              >
                <option value="all">All questions</option>
                <option value="required">Required</option>
                <option value="optional">Optional</option>
              </select>
            </Row>
          }
        >
          <div className="legacy-ui ag-theme-alpine w-full" style={{ height: 600 }}>
            <DataGrid
              columnDefs={questionColumnDefs}
              rowData={filteredQuestions}
              onGridReady={onGridReady}
              pagination={true}
              paginationPageSize={50}
              defaultColDef={{ sortable: true, filter: true, resizable: true }}
            />
          </div>
        </DashboardSection>
      )}

      {activeTab === 'topna' && (
        <Column gap="24" fillWidth>
          <DashboardSection title="Top N/A by count">
            <div className="legacy-ui ag-theme-alpine w-full" style={{ height: 400 }}>
              <DataGrid
                columnDefs={questionColumnDefs}
                rowData={topNA}
                pagination={true}
                paginationPageSize={25}
              />
            </div>
          </DashboardSection>
          <DashboardSection title="Top N/A by percentage" description="At least 3 responses">
            <div className="legacy-ui ag-theme-alpine w-full" style={{ height: 400 }}>
              <DataGrid
                columnDefs={questionColumnDefs}
                rowData={highestNA}
                pagination={true}
                paginationPageSize={25}
              />
            </div>
          </DashboardSection>
        </Column>
      )}

      {activeTab === 'graphs' && data?.chartData && (
        <GoalsChartsPanel chartData={data.chartData} />
      )}

      {activeTab === 'clustering' && data?.clustering && (
        <Column gap="24" fillWidth>
          <DashboardSection
            title={`Form clusters (${data.clustering.forms.optimalK})`}
            description="Forms grouped by completion, N/A rate, and step progress"
          >
            <Column gap="12" fillWidth>
              {data.clustering.forms.clusters.map((cluster, idx) => (
                <Column key={idx} gap="8" padding="16" border="neutral-medium" radius="m">
                  <Row fillWidth horizontal="between" wrap gap="8">
                    <Text weight="strong">Cluster {idx + 1} · {cluster.formCount} forms</Text>
                    <Text variant="label-default-s" onBackground="neutral-weak">
                      Completion {cluster.avgCompletionRate}% · N/A {cluster.avgNARate}%
                    </Text>
                  </Row>
                  <Grid columns="3" gap="8" fillWidth s={{ columns: '1' }} m={{ columns: '2' }}>
                    {cluster.forms.slice(0, 9).map((form, fIdx) => (
                      <Column key={fIdx} gap="4" padding="8" background="neutral-weak" radius="m">
                        <Text variant="label-strong-s">{form.schoolName}</Text>
                        <Text variant="label-default-s" onBackground="neutral-weak">
                          {form.completionRate}% complete · {form.naRate}% N/A
                        </Text>
                      </Column>
                    ))}
                  </Grid>
                  {cluster.forms.length > 9 && (
                    <Text variant="label-default-s" onBackground="neutral-weak">
                      +{cluster.forms.length - 9} more
                    </Text>
                  )}
                </Column>
              ))}
            </Column>
          </DashboardSection>

          <DashboardSection
            title={`Question clusters (${data.clustering.questions.optimalK})`}
            description="Questions grouped by N/A, answered, and empty rates"
          >
            <Column gap="12" fillWidth>
              {data.clustering.questions.clusters.map((cluster, idx) => (
                <Column key={idx} gap="8" padding="16" border="neutral-medium" radius="m">
                  <Row fillWidth horizontal="between" wrap gap="8">
                    <Text weight="strong">Cluster {idx + 1} · {cluster.questionCount} questions</Text>
                    <Text variant="label-default-s" onBackground="neutral-weak">
                      N/A {cluster.avgNAPercentage}% · answered {cluster.avgAnswerPercentage}%
                    </Text>
                  </Row>
                  {cluster.questions.slice(0, 5).map((q, qIdx) => (
                    <Column key={qIdx} gap="4" padding="8" background="neutral-weak" radius="m">
                      <Text variant="label-strong-s">
                        {q.stepTitle}: {q.title.substring(0, 90)}{q.title.length > 90 ? '…' : ''}
                      </Text>
                      <Text variant="label-default-s" onBackground="neutral-weak">
                        N/A {q.naPercentage}% · answered {q.answerPercentage}%
                      </Text>
                    </Column>
                  ))}
                  {cluster.questions.length > 5 && (
                    <Text variant="label-default-s" onBackground="neutral-weak">
                      +{cluster.questions.length - 5} more
                    </Text>
                  )}
                </Column>
              ))}
            </Column>
          </DashboardSection>

          <DashboardSection
            title={`School clusters (${data.clustering.schools.optimalK})`}
            description="Schools grouped by completion and N/A patterns"
          >
            <Column gap="12" fillWidth>
              {data.clustering.schools.clusters.map((cluster, idx) => (
                <Column key={idx} gap="8" padding="16" border="neutral-medium" radius="m">
                  <Row fillWidth horizontal="between" wrap gap="8">
                    <Text weight="strong">Cluster {idx + 1} · {cluster.schoolCount} schools</Text>
                    <Text variant="label-default-s" onBackground="neutral-weak">
                      Completion {cluster.avgCompletion}% · N/A {cluster.avgNARate}%
                    </Text>
                  </Row>
                  <Grid columns="3" gap="8" fillWidth s={{ columns: '1' }} m={{ columns: '2' }}>
                    {cluster.schools.map((school, sIdx) => (
                      <Column key={sIdx} gap="4" padding="8" background="neutral-weak" radius="m">
                        <Text variant="label-strong-s">{school.schoolName}</Text>
                        <Text variant="label-default-s" onBackground="neutral-weak">
                          {school.formCount} form(s) · {school.avgCompletion}% · N/A {school.avgNARate}%
                        </Text>
                      </Column>
                    ))}
                  </Grid>
                </Column>
              ))}
            </Column>
          </DashboardSection>

          <DashboardSection title="Cluster scatter" description="Completion vs N/A rate">
            <ClusterScatterChart clusters={data.clustering.forms.clusters} />
          </DashboardSection>
        </Column>
      )}
      </>
      )}
    </DashboardShell>
  );
}

export default function AdminGoalsPage() {
  return (
    <Suspense fallback={
      <Column minHeight="100vh" horizontal="center" vertical="center" gap="16" background="page">
        <Spinner size="l" />
        <Text onBackground="neutral-weak">Loading...</Text>
      </Column>
    }>
      <AdminGoalsPageContent />
    </Suspense>
  );
}
