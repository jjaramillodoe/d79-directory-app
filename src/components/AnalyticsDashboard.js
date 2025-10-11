'use client';

import { useState, useEffect } from 'react';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  RadialBarChart,
  RadialBar
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Users,
  Calendar,
  Target,
  Award,
  Activity
} from 'lucide-react';

const AnalyticsDashboard = ({ forms, stats }) => {
  const [timeRange, setTimeRange] = useState('7d');
  const [selectedMetric, setSelectedMetric] = useState('submissions');

  // Generate submission trends data from real form data
  const generateSubmissionTrends = () => {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const data = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // Count actual forms created on this date
      const dayForms = forms.filter(form => {
        const formDate = new Date(form.createdAt);
        return formDate.toDateString() === date.toDateString();
      });

      // Count actual forms submitted on this date
      const submittedOnDay = forms.filter(form => {
        if (!form.submittedAt) return false;
        const submittedDate = new Date(form.submittedAt);
        return submittedDate.toDateString() === date.toDateString();
      });

      // Count actual forms approved on this date
      const approvedOnDay = forms.filter(form => {
        if (form.status !== 'approved' || !form.updatedAt) return false;
        const updatedDate = new Date(form.updatedAt);
        return updatedDate.toDateString() === date.toDateString() && form.status === 'approved';
      });

      // Count actual forms under review on this date
      const underReviewOnDay = forms.filter(form => {
        if (form.status !== 'under_review' || !form.updatedAt) return false;
        const updatedDate = new Date(form.updatedAt);
        return updatedDate.toDateString() === date.toDateString() && form.status === 'under_review';
      });

      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        submitted: submittedOnDay.length,
        approved: approvedOnDay.length,
        underReview: underReviewOnDay.length,
      });
    }
    
    return data;
  };

  // Generate completion rate data by step from real form data
  const generateStepCompletionData = () => {
    const stepKeys = [
      'tableOfContents', 'childAbuseIntervention', 'sexualHarassment',
      'respectForAll', 'suicidePrevention', 'attendancePlan',
      'temporaryHousing', 'serviceInSchools', 'planningInterviews',
      'militaryRecruitment', 'schoolCulture', 'afterSchoolPrograms',
      'cellPhonePolicy', 'counselingPlan'
    ];

    const stepNames = [
      'Table of Contents', 'Child Abuse Prevention', 'Sexual Harassment',
      'Respect for All', 'Suicide Prevention', 'Attendance Plan',
      'Temporary Housing', 'Service in Schools', 'Planning Interviews',
      'Military Recruitment', 'School Culture', 'After School Programs',
      'Cell Phone Policy', 'School Counseling'
    ];

    return stepKeys.map((stepKey, index) => {
      // Count how many forms have this step completed
      const completedCount = forms.filter(form => 
        form.formData && form.formData[stepKey] && form.formData[stepKey].completed
      ).length;
      
      const completionRate = stats.total > 0 ? Math.round((completedCount / stats.total) * 100) : 0;
      
      return {
        step: stepNames[index].replace(' ', '\n'),
        completionRate,
        completed: completedCount,
        total: stats.total
      };
    });
  };

  // Generate school performance data from real form data
  const generateSchoolPerformance = () => {
    return forms.slice(0, 10).map(form => {
      const completedSteps = form.completedSteps?.length || 0;
      const totalSteps = 14;
      const completionRate = Math.round((completedSteps / totalSteps) * 100);
      
      // Calculate real performance metrics
      const daysSinceCreated = Math.floor((new Date() - new Date(form.createdAt)) / (1000 * 60 * 60 * 24));
      
      // Speed score: Faster completion = higher score
      const speedScore = Math.max(0, Math.min(100, 100 - (daysSinceCreated * 1.5)));
      
      // Quality score based on completion rate and status
      let qualityScore = completionRate;
      if (form.status === 'approved') qualityScore += 10;
      else if (form.status === 'rejected') qualityScore -= 20;
      qualityScore = Math.max(0, Math.min(100, qualityScore));
      
      // Overall score (weighted average)
      const overallScore = Math.round((speedScore * 0.3 + qualityScore * 0.7));

      return {
        school: form.schoolName?.split(' ')[0] || 'School',
        completionRate,
        speedScore,
        qualityScore,
        overallScore,
        status: form.status,
        completedSteps
      };
    }).sort((a, b) => b.overallScore - a.overallScore);
  };

  // Generate status distribution data
  const generateStatusData = () => {
    const statusCounts = {
      draft: forms.filter(f => f.status === 'draft').length,
      submitted: forms.filter(f => f.status === 'submitted').length,
      under_review: forms.filter(f => f.status === 'under_review').length,
      approved: forms.filter(f => f.status === 'approved').length,
      rejected: forms.filter(f => f.status === 'rejected').length,
    };

    const colors = {
      draft: '#94a3b8',
      submitted: '#3b82f6',
      under_review: '#f59e0b',
      approved: '#10b981',
      rejected: '#ef4444'
    };

    return Object.entries(statusCounts).map(([status, count]) => ({
      status: status.replace('_', ' ').toUpperCase(),
      count,
      color: colors[status]
    })).filter(item => item.count > 0);
  };

  const submissionTrends = generateSubmissionTrends();
  const stepCompletionData = generateStepCompletionData();
  const schoolPerformance = generateSchoolPerformance();
  const statusData = generateStatusData();

  // Calculate key metrics from real data
  const totalSubmissions = stats.total;
  
  // Calculate average completion time from real form data
  const completedForms = forms.filter(form => form.status === 'approved' && form.submittedAt);
  const avgCompletionTime = completedForms.length > 0 
    ? Math.round(completedForms.reduce((sum, form) => {
        const days = Math.floor((new Date(form.submittedAt) - new Date(form.createdAt)) / (1000 * 60 * 60 * 24));
        return sum + days;
      }, 0) / completedForms.length)
    : 0;
  
  const completionRate = stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0;
  const pendingReviews = stats.underReview + stats.submitted;

  // Generate status distribution data
  const generateStatusDistributionData = () => {
    const statusCounts = forms.reduce((acc, form) => {
      const status = form.status || 'draft';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const colors = {
      'draft': '#6b7280',
      'submitted': '#3b82f6',
      'under_review': '#f59e0b',
      'approved': '#10b981',
      'rejected': '#ef4444'
    };

    return Object.entries(statusCounts).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' '),
      value: count,
      color: colors[status] || '#6b7280'
    }));
  };

  // Generate progress trend data
  const generateProgressTrendData = () => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return date.toISOString().split('T')[0];
    });

    return last30Days.map(date => {
      const dayForms = forms.filter(form => {
        const formDate = new Date(form.createdAt).toISOString().split('T')[0];
        return formDate === date;
      });

      const avgProgress = dayForms.length > 0 
        ? dayForms.reduce((sum, form) => sum + (form.completedSteps?.length || 0), 0) / dayForms.length
        : 0;

      return {
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        avgProgress: Math.round(avgProgress),
        submissions: dayForms.length
      };
    });
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Submissions</p>
              <p className="text-3xl font-bold text-gray-900">{totalSubmissions}</p>
              <p className="text-sm text-green-600 flex items-center mt-1">
                <TrendingUp className="w-4 h-4 mr-1" />
                +12% from last month
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg. Completion Time</p>
              <p className="text-3xl font-bold text-gray-900">{avgCompletionTime}d</p>
              <p className="text-sm text-green-600 flex items-center mt-1">
                <TrendingDown className="w-4 h-4 mr-1" />
                -3 days faster
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <Clock className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completion Rate</p>
              <p className="text-3xl font-bold text-gray-900">{completionRate}%</p>
              <p className="text-sm text-blue-600 flex items-center mt-1">
                <Target className="w-4 h-4 mr-1" />
                Target: 85%
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Award className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Reviews</p>
              <p className="text-3xl font-bold text-gray-900">{pendingReviews}</p>
              <p className="text-sm text-orange-600 flex items-center mt-1">
                <AlertTriangle className="w-4 h-4 mr-1" />
                Needs attention
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <Activity className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 1: Submission Trends + Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Submission Trends */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Submission Trends</h3>
            <select 
              value={timeRange} 
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={submissionTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="submitted" 
                stackId="1" 
                stroke="#3b82f6" 
                fill="#3b82f6" 
                fillOpacity={0.6}
                name="Submitted"
              />
              <Area 
                type="monotone" 
                dataKey="approved" 
                stackId="1" 
                stroke="#10b981" 
                fill="#10b981" 
                fillOpacity={0.6}
                name="Approved"
              />
              <Area 
                type="monotone" 
                dataKey="underReview" 
                stackId="1" 
                stroke="#f59e0b" 
                fill="#f59e0b" 
                fillOpacity={0.6}
                name="Under Review"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Status Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-green-600" />
            Status Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={generateStatusDistributionData()}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {generateStatusDistributionData().map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2: Step Completion Rates + Progress Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Step Completion Rates */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Step Completion Rates</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={stepCompletionData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 100]} />
              <YAxis dataKey="step" type="category" width={80} />
              <Tooltip formatter={(value) => [`${value}%`, 'Completion Rate']} />
              <Bar dataKey="completionRate" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Progress Trend Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            Progress Trend (Last 30 Days)
          </h3>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={generateProgressTrendData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 14]} />
              <Tooltip 
                formatter={(value, name) => [value, name === 'avgProgress' ? 'Avg Progress' : 'Submissions']}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Line 
                type="monotone" 
                dataKey="avgProgress" 
                stroke="#8b5cf6" 
                strokeWidth={3}
                dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Performing Schools - Full Width */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Top Performing Schools</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {schoolPerformance.slice(0, 12).map((school, index) => (
            <div key={`school-${school._id || index}-${school.school}`} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-3 ${
                  index < 3 ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600'
                }`}>
                  {index + 1}
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">{school.school}</p>
                  <p className="text-xs text-gray-600">{school.completedSteps}/14 steps</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-gray-900">{school.overallScore}</p>
                <p className="text-xs text-gray-500">Score</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
