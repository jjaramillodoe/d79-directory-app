'use client';

import { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import { 
  Users, 
  TrendingUp, 
  TrendingDown, 
  Activity,
  Calendar,
  Clock,
  Award,
  Shield,
  Building2,
  UserCheck,
  UserX,
  AlertCircle
} from 'lucide-react';

const UserAnalytics = ({ users }) => {
  const [timeRange, setTimeRange] = useState('30d');
  const [selectedMetric, setSelectedMetric] = useState('activity');

  // Calculate user analytics data
  const calculateAnalytics = () => {
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.isActive).length;
    const inactiveUsers = totalUsers - activeUsers;
    
    // Level distribution
    const levelDistribution = users.reduce((acc, user) => {
      acc[user.level] = (acc[user.level] || 0) + 1;
      return acc;
    }, {});

    // School distribution
    const schoolDistribution = users.reduce((acc, user) => {
      const school = user.schoolName || 'Unassigned';
      acc[school] = (acc[school] || 0) + 1;
      return acc;
    }, {});

    // Recent activity (simulated based on creation date)
    const recentActivity = users
      .filter(u => u.createdAt)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10);

    // Title distribution
    const titleDistribution = users.reduce((acc, user) => {
      const title = user.title || 'No Title';
      acc[title] = (acc[title] || 0) + 1;
      return acc;
    }, {});

    return {
      totalUsers,
      activeUsers,
      inactiveUsers,
      levelDistribution,
      schoolDistribution,
      recentActivity,
      titleDistribution
    };
  };

  const analytics = calculateAnalytics();

  // Prepare chart data
  const levelChartData = Object.entries(analytics.levelDistribution).map(([level, count]) => ({
    level: `Level ${level}`,
    count,
    fill: getLevelColor(parseInt(level))
  }));

  const schoolChartData = Object.entries(analytics.schoolDistribution)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([school, count]) => ({
      school: school.length > 20 ? school.substring(0, 20) + '...' : school,
      count,
      fullName: school
    }));

  const titleChartData = Object.entries(analytics.titleDistribution)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 8)
    .map(([title, count]) => ({
      title: title.length > 15 ? title.substring(0, 15) + '...' : title,
      count,
      fullTitle: title
    }));

  function getLevelColor(level) {
    const colors = {
      1: '#6B7280', // gray
      2: '#3B82F6', // blue
      3: '#8B5CF6', // purple
      4: '#F59E0B', // amber
      5: '#EF4444'  // red
    };
    return colors[level] || '#6B7280';
  }

  // Activity timeline data (simulated)
  const activityData = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      newUsers: Math.floor(Math.random() * 5) + (i % 7 === 0 ? 2 : 0),
      activeUsers: Math.floor(Math.random() * 15) + 5,
      logins: Math.floor(Math.random() * 25) + 10
    };
  });

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-600 text-sm font-medium">Total Users</p>
              <p className="text-3xl font-bold text-blue-900">{analytics.totalUsers}</p>
              <p className="text-blue-700 text-xs mt-1">
                <TrendingUp className="w-3 h-3 inline mr-1" />
                +{Math.floor(Math.random() * 5) + 1} this week
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-600 text-sm font-medium">Active Users</p>
              <p className="text-3xl font-bold text-green-900">{analytics.activeUsers}</p>
              <p className="text-green-700 text-xs mt-1">
                {Math.round((analytics.activeUsers / analytics.totalUsers) * 100)}% of total
              </p>
            </div>
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
              <UserCheck className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-amber-600 text-sm font-medium">Admin Principals</p>
              <p className="text-3xl font-bold text-amber-900">{analytics.levelDistribution[4] || 0}</p>
              <p className="text-amber-700 text-xs mt-1">
                <Shield className="w-3 h-3 inline mr-1" />
                Level 4 users
              </p>
            </div>
            <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-600 text-sm font-medium">Schools Covered</p>
              <p className="text-3xl font-bold text-purple-900">{Object.keys(analytics.schoolDistribution).length}</p>
              <p className="text-purple-700 text-xs mt-1">
                <Building2 className="w-3 h-3 inline mr-1" />
                Active schools
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Level Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Award className="w-5 h-5 mr-2 text-indigo-600" />
              User Level Distribution
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedMetric('level')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  selectedMetric === 'level' 
                    ? 'bg-indigo-100 text-indigo-700' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Levels
              </button>
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={levelChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="level" stroke="#666" fontSize={12} />
                <YAxis stroke="#666" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb', 
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* School Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Building2 className="w-5 h-5 mr-2 text-blue-600" />
              Users by School
            </h3>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={schoolChartData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" stroke="#666" fontSize={12} />
                <YAxis dataKey="school" type="category" stroke="#666" fontSize={11} width={100} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb', 
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                  formatter={(value, name, props) => [value, props.payload.fullName]}
                />
                <Bar dataKey="count" fill="#3B82F6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Activity className="w-5 h-5 mr-2 text-green-600" />
            User Activity Timeline
          </h3>
          <div className="flex gap-2">
            {['7d', '30d', '90d'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  timeRange === range 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={activityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" stroke="#666" fontSize={12} />
              <YAxis stroke="#666" fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb', 
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Area 
                type="monotone" 
                dataKey="newUsers" 
                stackId="1" 
                stroke="#3B82F6" 
                fill="#3B82F6" 
                fillOpacity={0.6}
                name="New Users"
              />
              <Area 
                type="monotone" 
                dataKey="activeUsers" 
                stackId="1" 
                stroke="#10B981" 
                fill="#10B981" 
                fillOpacity={0.6}
                name="Active Users"
              />
              <Area 
                type="monotone" 
                dataKey="logins" 
                stackId="1" 
                stroke="#8B5CF6" 
                fill="#8B5CF6" 
                fillOpacity={0.6}
                name="Daily Logins"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Professional Titles Distribution */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Users className="w-5 h-5 mr-2 text-purple-600" />
            Professional Titles Distribution
          </h3>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={titleChartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                paddingAngle={5}
                dataKey="count"
              >
                {titleChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getLevelColor(index + 1)} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb', 
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                formatter={(value, name, props) => [value, props.payload.fullTitle]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
          {titleChartData.map((item, index) => (
            <div key={index} className="flex items-center">
              <div 
                className="w-3 h-3 rounded-full mr-2" 
                style={{ backgroundColor: getLevelColor(index + 1) }}
              ></div>
              <span className="text-xs text-gray-600 truncate">{item.fullTitle}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent User Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-amber-600" />
            Recent User Activity
          </h3>
        </div>
        <div className="space-y-3">
          {analytics.recentActivity.slice(0, 8).map((user, index) => (
            <div key={user._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                  <Users className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">
                  {new Date(user.createdAt).toLocaleDateString()}
                </p>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  user.isActive 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {user.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UserAnalytics;
