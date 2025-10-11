'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  X, 
  Users, 
  Building2, 
  Shield, 
  Calendar,
  SortAsc,
  SortDesc,
  Download,
  RefreshCw,
  Save,
  BookOpen
} from 'lucide-react';

const SmartFilters = ({ users, onFilteredUsers, onExportFiltered }) => {
  const [filters, setFilters] = useState({
    search: '',
    level: '',
    school: '',
    status: '',
    title: '',
    dateRange: '',
    sortBy: 'name',
    sortOrder: 'asc'
  });

  const [savedFilters, setSavedFilters] = useState([]);
  const [showSavedFilters, setShowSavedFilters] = useState(false);
  const [filterName, setFilterName] = useState('');

  // Get unique values for filter options
  const uniqueSchools = [...new Set(users.map(u => u.schoolName).filter(Boolean))];
  const uniqueTitles = [...new Set(users.map(u => u.title).filter(Boolean))];
  const uniqueLevels = [...new Set(users.map(u => u.level))].sort();

  // Apply filters and sorting using useMemo to avoid infinite loops
  const filteredUsers = useMemo(() => {
    let filtered = [...users];

    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(user => 
        user.name.toLowerCase().includes(searchTerm) ||
        user.email.toLowerCase().includes(searchTerm) ||
        (user.title && user.title.toLowerCase().includes(searchTerm)) ||
        (user.schoolName && user.schoolName.toLowerCase().includes(searchTerm))
      );
    }

    // Level filter
    if (filters.level) {
      filtered = filtered.filter(user => user.level === parseInt(filters.level));
    }

    // School filter
    if (filters.school) {
      filtered = filtered.filter(user => user.schoolName === filters.school);
    }

    // Status filter
    if (filters.status) {
      const isActive = filters.status === 'active';
      filtered = filtered.filter(user => user.isActive === isActive);
    }

    // Title filter
    if (filters.title) {
      filtered = filtered.filter(user => user.title === filters.title);
    }

    // Date range filter
    if (filters.dateRange) {
      const now = new Date();
      const daysAgo = parseInt(filters.dateRange);
      const cutoffDate = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
      
      filtered = filtered.filter(user => {
        const userDate = new Date(user.createdAt);
        return userDate >= cutoffDate;
      });
    }

    // Sorting
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (filters.sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'email':
          aValue = a.email.toLowerCase();
          bValue = b.email.toLowerCase();
          break;
        case 'level':
          aValue = a.level;
          bValue = b.level;
          break;
        case 'school':
          aValue = (a.schoolName || '').toLowerCase();
          bValue = (b.schoolName || '').toLowerCase();
          break;
        case 'created':
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }

      if (filters.sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [filters, users]);

  // Update parent component with filtered users
  useEffect(() => {
    onFilteredUsers(filteredUsers);
  }, [filteredUsers]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      level: '',
      school: '',
      status: '',
      title: '',
      dateRange: '',
      sortBy: 'name',
      sortOrder: 'asc'
    });
  };

  const saveFilter = () => {
    if (!filterName.trim()) return;
    
    const newFilter = {
      id: Date.now(),
      name: filterName,
      filters: { ...filters },
      createdAt: new Date().toISOString()
    };
    
    setSavedFilters(prev => [...prev, newFilter]);
    setFilterName('');
    setShowSavedFilters(false);
  };

  const loadFilter = (savedFilter) => {
    setFilters(savedFilter.filters);
    setShowSavedFilters(false);
  };

  const deleteSavedFilter = (filterId) => {
    setSavedFilters(prev => prev.filter(f => f.id !== filterId));
  };

  const getActiveFiltersCount = () => {
    return Object.values(filters).filter(value => 
      value !== '' && value !== 'name' && value !== 'asc'
    ).length;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Filter className="w-5 h-5 mr-2 text-blue-600" />
          Smart Filters & Search
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSavedFilters(!showSavedFilters)}
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            <BookOpen className="w-4 h-4" />
            Saved Filters ({savedFilters.length})
          </button>
          <button
            onClick={clearFilters}
            className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Clear All
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search users by name, email, title, or school..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
          {filters.search && (
            <button
              onClick={() => handleFilterChange('search', '')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
        {/* Level Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">User Level</label>
          <select
            value={filters.level}
            onChange={(e) => handleFilterChange('level', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Levels</option>
            {uniqueLevels.map(level => (
              <option key={level} value={level}>Level {level}</option>
            ))}
          </select>
        </div>

        {/* School Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">School</label>
          <select
            value={filters.school}
            onChange={(e) => handleFilterChange('school', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Schools</option>
            {uniqueSchools.map(school => (
              <option key={school} value={school}>{school}</option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* Title Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
          <select
            value={filters.title}
            onChange={(e) => handleFilterChange('title', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Titles</option>
            {uniqueTitles.map(title => (
              <option key={title} value={title}>{title}</option>
            ))}
          </select>
        </div>

        {/* Date Range Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Created</label>
          <select
            value={filters.dateRange}
            onChange={(e) => handleFilterChange('dateRange', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Time</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
        </div>
      </div>

      {/* Sort Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Sort by:</label>
            <select
              value={filters.sortBy}
              onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="name">Name</option>
              <option value="email">Email</option>
              <option value="level">Level</option>
              <option value="school">School</option>
              <option value="created">Created Date</option>
            </select>
            <button
              onClick={() => handleFilterChange('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              title={`Sort ${filters.sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
            >
              {filters.sortOrder === 'asc' ? (
                <SortAsc className="w-4 h-4 text-gray-600" />
              ) : (
                <SortDesc className="w-4 h-4 text-gray-600" />
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onExportFiltered()}
            className="px-3 py-2 bg-green-100 hover:bg-green-200 text-green-700 text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export Filtered
          </button>
          <button
            onClick={saveFilter}
            className="px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save Filter
          </button>
        </div>
      </div>

      {/* Save Filter Modal */}
      {showSavedFilters && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-900">Save Current Filter</h4>
            <button
              onClick={() => setShowSavedFilters(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex items-center gap-2 mb-3">
            <input
              type="text"
              placeholder="Filter name..."
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={saveFilter}
              disabled={!filterName.trim()}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm font-medium rounded transition-colors"
            >
              Save
            </button>
          </div>

          {/* Saved Filters List */}
          {savedFilters.length > 0 && (
            <div>
              <h5 className="text-xs font-medium text-gray-700 mb-2">Saved Filters:</h5>
              <div className="space-y-1">
                {savedFilters.map(filter => (
                  <div key={filter.id} className="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
                    <button
                      onClick={() => loadFilter(filter)}
                      className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-2"
                    >
                      <BookOpen className="w-3 h-3" />
                      {filter.name}
                    </button>
                    <button
                      onClick={() => deleteSavedFilter(filter.id)}
                      className="text-red-400 hover:text-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Active Filters Indicator */}
      {getActiveFiltersCount() > 0 && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">
                {getActiveFiltersCount()} filter(s) active
              </span>
            </div>
            <button
              onClick={clearFilters}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Clear all
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartFilters;
