'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  Target,
  BarChart3,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  XCircle,
  FileText,
  ArrowLeft,
  RefreshCw,
  Download,
  Filter,
  Search,
  Loader2,
  Brain,
  Activity,
  Info
} from 'lucide-react';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis
} from 'recharts';

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

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

  const fetchAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/goals');
      if (!response.ok) {
        throw new Error('Failed to fetch analysis data');
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Error fetching analysis:', err);
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

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading analysis...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center">
              <AlertCircle className="w-6 h-6 text-red-600 mr-3" />
              <div>
                <h3 className="text-lg font-semibold text-red-900">Error Loading Analysis</h3>
                <p className="text-red-700 mt-1">{error}</p>
                <button
                  onClick={fetchAnalysis}
                  className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const filteredQuestions = getFilteredQuestions();
  const topNA = data?.topNAQuestions || [];
  const highestNA = data?.highestNAPercentage || [];

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-4">
            <div className="mb-4 lg:mb-0">
              <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
                <Brain className="w-8 h-8 mr-3 text-purple-600" />
                Form Goals & NLP Analysis
              </h1>
              <p className="text-gray-600">
                Machine learning analysis of form submissions to identify N/A questions and quantify completion rates
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleAnalyze}
                disabled={analyzing}
                className="inline-flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Re-analyze
                  </>
                )}
              </button>
              {filteredQuestions.length > 0 && (
                <button
                  onClick={exportToCSV}
                  className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </button>
              )}
              <Link href="/admin/submissions">
                <button className="inline-flex items-center px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* Overall Statistics */}
        {data?.overallStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Forms</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{data.overallStats.totalForms}</p>
                </div>
                <FileText className="w-12 h-12 text-blue-600 opacity-50" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">
                    {data.overallStats.averageCompletionRate}%
                  </p>
                </div>
                <CheckCircle className="w-12 h-12 text-green-600 opacity-50" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">N/A Rate</p>
                  <p className="text-3xl font-bold text-orange-600 mt-2">
                    {data.overallStats.averageNARate}%
                  </p>
                </div>
                <XCircle className="w-12 h-12 text-orange-600 opacity-50" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Empty Rate</p>
                  <p className="text-3xl font-bold text-gray-600 mt-2">
                    {data.overallStats.averageEmptyRate}%
                  </p>
                </div>
                <AlertCircle className="w-12 h-12 text-gray-600 opacity-50" />
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <BarChart3 className="w-4 h-4 inline mr-2" />
              Overview
            </button>
            <button
              onClick={() => setActiveTab('questions')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'questions'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Target className="w-4 h-4 inline mr-2" />
              All Questions
            </button>
            <button
              onClick={() => setActiveTab('topna')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'topna'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <TrendingUp className="w-4 h-4 inline mr-2" />
              Top N/A Questions
            </button>
            <button
              onClick={() => setActiveTab('graphs')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'graphs'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <BarChart3 className="w-4 h-4 inline mr-2" />
              Graphs & Charts
            </button>
            <button
              onClick={() => setActiveTab('clustering')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'clustering'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Brain className="w-4 h-4 inline mr-2" />
              Clustering Analysis
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-start">
                <Info className="w-6 h-6 text-blue-600 mr-3 mt-1" />
                <div>
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">NLP Analysis Methodology</h3>
                  <p className="text-blue-800 text-sm mb-2">
                    This analysis uses natural language processing to identify questions marked as "Not Applicable" (N/A) across all form submissions.
                  </p>
                  <ul className="text-blue-700 text-sm list-disc list-inside space-y-1">
                    <li>Detects common N/A patterns: "N/A", "not applicable", "does not apply", etc.</li>
                    <li>Quantifies completion rates for each question</li>
                    <li>Identifies questions that are frequently marked as N/A</li>
                    <li>Helps identify which questions may need to be optional or removed</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Top N/A Questions Summary */}
            {topNA.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2 text-orange-600" />
                  Top Questions Marked as N/A
                </h2>
                <div className="space-y-3">
                  {topNA.slice(0, 10).map((q, idx) => (
                    <div key={q.questionId} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            <span className="text-sm font-medium text-gray-500 mr-2">
                              #{idx + 1} - Step {q.stepId}: {q.stepTitle}
                            </span>
                            <span className="text-xs px-2 py-1 rounded bg-orange-100 text-orange-800">
                              Q{q.questionNumber}
                            </span>
                            {q.required && (
                              <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-800 ml-2">
                                Required
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-900 font-medium mb-2">{q.title}</p>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-orange-600 font-semibold">
                              {q.naCount} forms marked as N/A ({q.naPercentage}%)
                            </span>
                            <span className="text-gray-600">
                              {q.answeredCount} answered ({q.answerPercentage}%)
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'questions' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 lg:mb-0">
                All Questions Analysis ({filteredQuestions.length})
              </h2>
              <div className="flex gap-3">
                <div className="relative">
                  <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search questions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <select
                  value={filterRequired}
                  onChange={(e) => setFilterRequired(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="all">All Questions</option>
                  <option value="required">Required Only</option>
                  <option value="optional">Optional Only</option>
                </select>
              </div>
            </div>

            <div className="ag-theme-alpine w-full" style={{ height: '600px' }}>
              <AgGridReact
                columnDefs={questionColumnDefs}
                rowData={filteredQuestions}
                onGridReady={onGridReady}
                pagination={true}
                paginationPageSize={50}
                defaultColDef={{
                  sortable: true,
                  filter: true,
                  resizable: true
                }}
              />
            </div>
          </div>
        )}

        {activeTab === 'topna' && (
          <div className="space-y-6">
            {/* By Count */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Top N/A Questions by Count
              </h2>
              <div className="ag-theme-alpine w-full" style={{ height: '400px' }}>
                <AgGridReact
                  columnDefs={questionColumnDefs}
                  rowData={topNA}
                  pagination={true}
                  paginationPageSize={25}
                />
              </div>
            </div>

            {/* By Percentage */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Top N/A Questions by Percentage (min 3 responses)
              </h2>
              <div className="ag-theme-alpine w-full" style={{ height: '400px' }}>
                <AgGridReact
                  columnDefs={questionColumnDefs}
                  rowData={highestNA}
                  pagination={true}
                  paginationPageSize={25}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'graphs' && data?.chartData && (
          <div className="space-y-6">
            {/* Status Distribution Pie Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Form Status Distribution</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data.chartData.statusDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {data.chartData.statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Question Status Distribution</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Answered', value: data.chartData.questionStatusDistribution.answered },
                        { name: 'N/A', value: data.chartData.questionStatusDistribution.na },
                        { name: 'Empty', value: data.chartData.questionStatusDistribution.empty }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      <Cell fill="#10b981" />
                      <Cell fill="#f59e0b" />
                      <Cell fill="#6b7280" />
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Step Completion Rates */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Step Completion Rates</h2>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={data.chartData.stepCompletion} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis dataKey="step" type="category" width={100} />
                  <Tooltip formatter={(value) => [`${value}%`, 'Completion Rate']} />
                  <Bar dataKey="percentage" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* N/A by Step */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">N/A Questions by Step</h2>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={data.chartData.naByStep}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="step" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="naCount" fill="#f59e0b" name="N/A Count" />
                  <Bar dataKey="totalCount" fill="#e5e7eb" name="Total Responses" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Trends Over Time */}
            {data.chartData.trends && data.chartData.trends.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Completion Trends Over Time</h2>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={data.chartData.trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="avgCompletion" stroke="#3b82f6" strokeWidth={2} name="Avg Completion %" />
                    <Line type="monotone" dataKey="forms" stroke="#10b981" strokeWidth={2} name="Forms Updated" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {activeTab === 'clustering' && data?.clustering && (
          <div className="space-y-6">
            {/* Form Clusters */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Brain className="w-5 h-5 mr-2 text-purple-600" />
                Form Clusters (K-means: {data.clustering.forms.optimalK} clusters)
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Forms grouped by similarity in completion patterns, N/A rates, and step progress
              </p>
              <div className="space-y-4">
                {data.clustering.forms.clusters.map((cluster, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Cluster {idx + 1} ({cluster.formCount} forms)
                      </h3>
                      <div className="flex gap-4 text-sm">
                        <span className="text-green-600">Avg Completion: {cluster.avgCompletionRate}%</span>
                        <span className="text-orange-600">Avg N/A Rate: {cluster.avgNARate}%</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {cluster.forms.slice(0, 9).map((form, fIdx) => (
                        <div key={fIdx} className="text-sm p-2 bg-gray-50 rounded">
                          <div className="font-medium">{form.schoolName}</div>
                          <div className="text-xs text-gray-600">
                            Completion: {form.completionRate}% | N/A: {form.naRate}%
                          </div>
                        </div>
                      ))}
                      {cluster.forms.length > 9 && (
                        <div className="text-sm p-2 bg-gray-50 rounded flex items-center justify-center">
                          +{cluster.forms.length - 9} more
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Question Clusters */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Brain className="w-5 h-5 mr-2 text-purple-600" />
                Question Clusters (K-means: {data.clustering.questions.optimalK} clusters)
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Questions grouped by similarity in response patterns (N/A, answered, empty percentages)
              </p>
              <div className="space-y-4">
                {data.clustering.questions.clusters.map((cluster, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Cluster {idx + 1} ({cluster.questionCount} questions)
                      </h3>
                      <div className="flex gap-4 text-sm">
                        <span className="text-orange-600">Avg N/A: {cluster.avgNAPercentage}%</span>
                        <span className="text-green-600">Avg Answered: {cluster.avgAnswerPercentage}%</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {cluster.questions.slice(0, 5).map((q, qIdx) => (
                        <div key={qIdx} className="text-sm p-2 bg-gray-50 rounded">
                          <div className="font-medium">{q.stepTitle}: {q.title.substring(0, 80)}...</div>
                          <div className="text-xs text-gray-600">
                            N/A: {q.naPercentage}% | Answered: {q.answerPercentage}%
                          </div>
                        </div>
                      ))}
                      {cluster.questions.length > 5 && (
                        <div className="text-sm text-gray-600 italic">
                          +{cluster.questions.length - 5} more questions in this cluster
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* School Clusters */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Brain className="w-5 h-5 mr-2 text-purple-600" />
                School Clusters (K-means: {data.clustering.schools.optimalK} clusters)
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Schools grouped by similarity in form completion patterns and N/A rates
              </p>
              <div className="space-y-4">
                {data.clustering.schools.clusters.map((cluster, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Cluster {idx + 1} ({cluster.schoolCount} schools)
                      </h3>
                      <div className="flex gap-4 text-sm">
                        <span className="text-green-600">Avg Completion: {cluster.avgCompletion}%</span>
                        <span className="text-orange-600">Avg N/A Rate: {cluster.avgNARate}%</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {cluster.schools.map((school, sIdx) => (
                        <div key={sIdx} className="text-sm p-2 bg-gray-50 rounded">
                          <div className="font-medium">{school.schoolName}</div>
                          <div className="text-xs text-gray-600">
                            {school.formCount} form(s) | Completion: {school.avgCompletion}% | N/A: {school.avgNARate}%
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Clustering Visualization */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Form Clustering Visualization</h2>
              <p className="text-sm text-gray-600 mb-4">
                Scatter plot showing forms grouped by completion rate vs N/A rate
              </p>
              <ResponsiveContainer width="100%" height={500}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" dataKey="completionRate" name="Completion Rate" unit="%" domain={[0, 100]} />
                  <YAxis type="number" dataKey="naRate" name="N/A Rate" unit="%" domain={[0, 100]} />
                  <ZAxis type="number" dataKey="stepProgress" name="Step Progress" range={[50, 400]} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                  <Legend />
                  {data.clustering.forms.clusters.map((cluster, idx) => {
                    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
                    return (
                      <Scatter
                        key={idx}
                        name={`Cluster ${idx + 1}`}
                        data={cluster.forms.map(f => ({
                          completionRate: parseFloat(f.completionRate),
                          naRate: parseFloat(f.naRate),
                          stepProgress: parseFloat(f.stepProgress)
                        }))}
                        fill={colors[idx % colors.length]}
                      />
                    );
                  })}
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminGoalsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <AdminGoalsPageContent />
    </Suspense>
  );
}

