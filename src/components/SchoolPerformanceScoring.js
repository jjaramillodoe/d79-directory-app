'use client';

import { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Award, 
  Target, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Users,
  Calendar,
  BarChart3,
  Star,
  Trophy,
  Medal,
  Filter,
  Download,
  Eye,
  ChevronUp,
  ChevronDown
} from 'lucide-react';

const SchoolPerformanceScoring = ({ forms }) => {
  const [sortBy, setSortBy] = useState('overallScore');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filterBy, setFilterBy] = useState('all');
  const [showDetails, setShowDetails] = useState(null);

  // Calculate performance metrics for each school
  const schoolPerformance = useMemo(() => {
    return forms.map(form => {
      const completedSteps = form.completedSteps?.length || 0;
      const totalSteps = 14;
      const completionRate = Math.round((completedSteps / totalSteps) * 100);
      
      // Calculate days since creation
      const daysSinceCreated = Math.floor((new Date() - new Date(form.createdAt)) / (1000 * 60 * 60 * 24));
      
      // Speed Score (0-100): Faster completion = higher score
      const speedScore = Math.max(0, Math.min(100, 100 - (daysSinceCreated * 1.5)));
      
      // Quality Score (0-100): Based on completion rate and status
      let qualityScore = completionRate;
      if (form.status === 'approved') qualityScore += 10;
      else if (form.status === 'rejected') qualityScore -= 20;
      qualityScore = Math.max(0, Math.min(100, qualityScore));
      
      // Compliance Score (0-100): Based on meeting deadlines and requirements
      const deadlineMet = daysSinceCreated <= 30 ? 100 : Math.max(0, 100 - ((daysSinceCreated - 30) * 2));
      const complianceScore = Math.round((deadlineMet + (form.status === 'approved' ? 100 : 0)) / 2);
      
      // Overall Score (weighted average)
      const overallScore = Math.round((speedScore * 0.3 + qualityScore * 0.4 + complianceScore * 0.3));
      
      // Performance Tier
      let tier = 'Bronze';
      if (overallScore >= 90) tier = 'Platinum';
      else if (overallScore >= 80) tier = 'Gold';
      else if (overallScore >= 70) tier = 'Silver';
      
      // Improvement calculation (based on completion rate vs expected)
      const expectedCompletionRate = Math.max(0, 100 - (daysSinceCreated * 2)); // Expected rate based on time
      const improvement = Math.round(completionRate - expectedCompletionRate);
      
      return {
        ...form,
        completionRate,
        speedScore,
        qualityScore,
        complianceScore,
        overallScore,
        tier,
        daysSinceCreated,
        improvement,
        lastSubmission: form.submittedAt || form.updatedAt || form.createdAt
      };
    }).sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }, [forms, sortBy, sortOrder]);

  // Filter schools based on tier
  const filteredSchools = useMemo(() => {
    if (filterBy === 'all') return schoolPerformance;
    return schoolPerformance.filter(school => school.tier.toLowerCase() === filterBy.toLowerCase());
  }, [schoolPerformance, filterBy]);

  // Calculate overall statistics
  const overallStats = useMemo(() => {
    const total = schoolPerformance.length;
    const avgOverallScore = Math.round(schoolPerformance.reduce((sum, school) => sum + school.overallScore, 0) / total);
    const avgCompletionRate = Math.round(schoolPerformance.reduce((sum, school) => sum + school.completionRate, 0) / total);
    const avgSpeedScore = Math.round(schoolPerformance.reduce((sum, school) => sum + school.speedScore, 0) / total);
    
    const tierDistribution = {
      Platinum: schoolPerformance.filter(s => s.tier === 'Platinum').length,
      Gold: schoolPerformance.filter(s => s.tier === 'Gold').length,
      Silver: schoolPerformance.filter(s => s.tier === 'Silver').length,
      Bronze: schoolPerformance.filter(s => s.tier === 'Bronze').length
    };

    return {
      total,
      avgOverallScore,
      avgCompletionRate,
      avgSpeedScore,
      tierDistribution
    };
  }, [schoolPerformance]);

  // Get tier styling
  const getTierStyle = (tier) => {
    const styles = {
      Platinum: { color: 'text-purple-600', bg: 'bg-purple-100', icon: Trophy },
      Gold: { color: 'text-yellow-600', bg: 'bg-yellow-100', icon: Award },
      Silver: { color: 'text-gray-600', bg: 'bg-gray-100', icon: Medal },
      Bronze: { color: 'text-orange-600', bg: 'bg-orange-100', icon: Star }
    };
    return styles[tier] || styles.Bronze;
  };

  // Export performance data
  const handleExport = () => {
    const csvData = schoolPerformance.map(school => ({
      'School Name': school.schoolName,
      'Principal': school.principalName,
      'Overall Score': school.overallScore,
      'Tier': school.tier,
      'Completion Rate': `${school.completionRate}%`,
      'Speed Score': school.speedScore,
      'Quality Score': school.qualityScore,
      'Compliance Score': school.complianceScore,
      'Days Since Created': school.daysSinceCreated,
      'Improvement': school.improvement > 0 ? `+${school.improvement}` : school.improvement,
      'Status': school.status,
      'Last Activity': new Date(school.lastSubmission).toLocaleDateString()
    }));

    const headers = Object.keys(csvData[0]).join(',');
    const rows = csvData.map(row => Object.values(row).join(','));
    const csvContent = [headers, ...rows].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `school-performance-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    alert('Performance data exported successfully!');
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">School Performance Scoring</h2>
          <p className="text-gray-600">Track and analyze school performance across multiple metrics</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Download className="w-4 h-4" />
          Export Data
        </button>
      </div>

      {/* Overall Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Average Overall Score</p>
              <p className="text-3xl font-bold text-gray-900">{overallStats.avgOverallScore}</p>
              <p className="text-sm text-green-600 flex items-center mt-1">
                <TrendingUp className="w-4 h-4 mr-1" />
                +5% from last month
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg. Completion Rate</p>
              <p className="text-3xl font-bold text-gray-900">{overallStats.avgCompletionRate}%</p>
              <p className="text-sm text-blue-600 flex items-center mt-1">
                <Target className="w-4 h-4 mr-1" />
                Target: 85%
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg. Speed Score</p>
              <p className="text-3xl font-bold text-gray-900">{overallStats.avgSpeedScore}</p>
              <p className="text-sm text-orange-600 flex items-center mt-1">
                <Clock className="w-4 h-4 mr-1" />
                Faster completion
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Schools</p>
              <p className="text-3xl font-bold text-gray-900">{overallStats.total}</p>
              <p className="text-sm text-purple-600 flex items-center mt-1">
                <Users className="w-4 h-4 mr-1" />
                All districts
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Tier Distribution */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Tier Distribution</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(overallStats.tierDistribution).map(([tier, count]) => {
            const style = getTierStyle(tier);
            const Icon = style.icon;
            const percentage = Math.round((count / overallStats.total) * 100);

            return (
              <div key={tier} className="text-center">
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-3 ${style.bg}`}>
                  <Icon className={`w-8 h-8 ${style.color}`} />
                </div>
                <p className="text-2xl font-bold text-gray-900">{count}</p>
                <p className={`text-sm font-medium ${style.color}`}>{tier}</p>
                <p className="text-xs text-gray-500">{percentage}%</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-4">
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="all">All Tiers</option>
              <option value="platinum">Platinum</option>
              <option value="gold">Gold</option>
              <option value="silver">Silver</option>
              <option value="bronze">Bronze</option>
            </select>
            <span className="text-sm text-gray-600">
              Showing {filteredSchools.length} of {schoolPerformance.length} schools
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            >
              <option value="overallScore">Overall Score</option>
              <option value="completionRate">Completion Rate</option>
              <option value="speedScore">Speed Score</option>
              <option value="qualityScore">Quality Score</option>
              <option value="schoolName">School Name</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-1 text-gray-600 hover:text-gray-800"
            >
              {sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Performance Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  School
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button 
                    onClick={() => handleSort('overallScore')}
                    className="flex items-center gap-1 hover:text-gray-700"
                  >
                    Overall Score
                    {sortBy === 'overallScore' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button 
                    onClick={() => handleSort('completionRate')}
                    className="flex items-center gap-1 hover:text-gray-700"
                  >
                    Completion
                    {sortBy === 'completionRate' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Speed
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quality
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Improvement
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSchools.map((school, index) => {
                const tierStyle = getTierStyle(school.tier);
                const TierIcon = tierStyle.icon;

                return (
                  <tr key={school._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className={`text-lg font-bold ${
                          index < 3 ? 'text-yellow-600' : 'text-gray-600'
                        }`}>
                          #{index + 1}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{school.schoolName}</div>
                        <div className="text-sm text-gray-500">{school.principalName}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-gray-900">{school.overallScore}</span>
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${tierStyle.bg.replace('100', '600')}`}
                            style={{ width: `${school.overallScore}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${tierStyle.bg} ${tierStyle.color}`}>
                        <TierIcon className="w-3 h-3" />
                        {school.tier}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">{school.completionRate}%</span>
                        <div className="w-12 bg-gray-200 rounded-full h-1.5">
                          <div 
                            className="bg-blue-600 h-1.5 rounded-full"
                            style={{ width: `${school.completionRate}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {school.speedScore}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {school.qualityScore}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium flex items-center gap-1 ${
                        school.improvement > 0 ? 'text-green-600' : 
                        school.improvement < 0 ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {school.improvement > 0 ? <TrendingUp className="w-3 h-3" /> : 
                         school.improvement < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                        {school.improvement > 0 ? `+${school.improvement}` : school.improvement}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => setShowDetails(showDetails === school._id ? null : school._id)}
                        className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        Details
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredSchools.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No schools match your current filter.</p>
          </div>
        )}
      </div>

      {/* Detailed View Modal */}
      {showDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Performance Details</h3>
                <button
                  onClick={() => setShowDetails(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-6">
              {(() => {
                const school = schoolPerformance.find(s => s._id === showDetails);
                if (!school) return null;

                const tierStyle = getTierStyle(school.tier);
                const TierIcon = tierStyle.icon;

                return (
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-lg ${tierStyle.bg}`}>
                        <TierIcon className={`w-8 h-8 ${tierStyle.color}`} />
                      </div>
                      <div>
                        <h4 className="text-xl font-bold text-gray-900">{school.schoolName}</h4>
                        <p className="text-gray-600">{school.principalName} • {school.principalEmail}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-blue-900">{school.overallScore}</div>
                          <div className="text-sm text-blue-700">Overall Score</div>
                        </div>
                      </div>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-green-900">{school.completionRate}%</div>
                          <div className="text-sm text-green-700">Completion Rate</div>
                        </div>
                      </div>
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-orange-900">{school.speedScore}</div>
                          <div className="text-sm text-orange-700">Speed Score</div>
                        </div>
                      </div>
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-purple-900">{school.qualityScore}</div>
                          <div className="text-sm text-purple-700">Quality Score</div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h5 className="font-semibold text-gray-900 mb-3">Timeline</h5>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Created:</span>
                            <span>{new Date(school.createdAt).toLocaleDateString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Days Active:</span>
                            <span>{school.daysSinceCreated} days</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Last Activity:</span>
                            <span>{new Date(school.lastSubmission).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h5 className="font-semibold text-gray-900 mb-3">Performance Metrics</h5>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Completed Steps:</span>
                            <span>{school.completedSteps?.length || 0}/14</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Current Status:</span>
                            <span className="capitalize">{school.status}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Improvement:</span>
                            <span className={school.improvement > 0 ? 'text-green-600' : 'text-red-600'}>
                              {school.improvement > 0 ? `+${school.improvement}` : school.improvement}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchoolPerformanceScoring;
