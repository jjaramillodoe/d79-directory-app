'use client';

import { useState, useEffect } from 'react';
import { 
  Users, 
  FileText, 
  Plus, 
  CheckCircle, 
  X, 
  AlertCircle,
  Building2,
  Send,
  Loader2,
  UserCheck,
  Shield,
  Download,
  Upload
} from 'lucide-react';

const BulkFormCreation = ({ onFormsCreated }) => {
  const [principals, setPrincipals] = useState([]);
  const [selectedPrincipals, setSelectedPrincipals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [results, setResults] = useState(null);

  useEffect(() => {
    fetchPrincipals();
  }, []);

  const fetchPrincipals = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        // Filter for principals and assistant principals (level 3 and 4)
        const principalUsers = data.users.filter(user => 
          user.level >= 3 && user.isActive
        );
        setPrincipals(principalUsers);
      }
    } catch (error) {
      console.error('Error fetching principals:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePrincipal = (principal) => {
    setSelectedPrincipals(prev => {
      const exists = prev.find(p => p._id === principal._id);
      if (exists) {
        return prev.filter(p => p._id !== principal._id);
      } else {
        return [...prev, principal];
      }
    });
  };

  const selectAll = () => {
    const filtered = getFilteredPrincipals();
    setSelectedPrincipals(filtered);
  };

  const deselectAll = () => {
    setSelectedPrincipals([]);
  };

  const getFilteredPrincipals = () => {
    return principals.filter(principal => {
      const matchesSearch = searchTerm === '' || 
        principal.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        principal.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        principal.schoolName?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesLevel = filterLevel === '' || principal.level === parseInt(filterLevel);
      
      return matchesSearch && matchesLevel;
    });
  };

  const handleBulkCreate = async () => {
    if (selectedPrincipals.length === 0) {
      alert('Please select at least one principal');
      return;
    }

    if (!confirm(`Are you sure you want to create ${selectedPrincipals.length} new form(s)?\n\nThis will create a blank form for each selected principal.`)) {
      return;
    }

    setCreating(true);
    setResults(null);

    const createResults = {
      success: [],
      errors: []
    };

    for (const principal of selectedPrincipals) {
      try {
        const response = await fetch('/api/forms', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            schoolName: principal.schoolName,
            initialOwnerEmail: principal.email
          }),
        });

        if (response.ok) {
          const data = await response.json();
          // API returns { success: true, formId: ..., message: ... }
          const formId = data?.formId || data?.form?._id || data?._id || 'unknown';
          createResults.success.push({
            principal: principal.name,
            school: principal.schoolName,
            formId: formId
          });
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          createResults.errors.push({
            principal: principal.name,
            error: errorData.error || errorData.message || 'Failed to create form'
          });
        }
      } catch (error) {
        createResults.errors.push({
          principal: principal.name,
          error: error.message || 'Unknown error occurred'
        });
      }
    }

    setResults(createResults);
    setCreating(false);
    
    if (createResults.success.length > 0 && onFormsCreated) {
      onFormsCreated();
    }
  };

  const downloadTemplate = () => {
    const template = [
      'name,email,schoolName,level',
      'John Doe,john.doe@schools.nyc.gov,Adult Education Center,3',
      'Jane Smith,jane.smith@schools.nyc.gov,Alternative Learning Center,3',
      'Bob Johnson,bob.johnson@schools.nyc.gov,Evening Academy,4'
    ].join('\n');

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'principals_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredPrincipals = getFilteredPrincipals();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <FileText className="w-7 h-7" />
              Bulk Form Creation & Assignment
            </h2>
            <p className="text-blue-100 mt-2">
              Create and assign forms to multiple principals at once
            </p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-3">
            <p className="text-white text-sm">Selected</p>
            <p className="text-white text-3xl font-bold">{selectedPrincipals.length}</p>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Principals
            </label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name, email, or school..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Level
            </label>
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Levels</option>
              <option value="3">Level 3 - Assistant Principal</option>
              <option value="4">Level 4 - Admin Principal</option>
              <option value="5">Level 5 - Super Admin</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {filteredPrincipals.length} of {principals.length} principals
          </div>
          <div className="flex gap-2">
            <button
              onClick={selectAll}
              className="px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 text-sm font-medium rounded-lg transition-colors"
            >
              Select All ({filteredPrincipals.length})
            </button>
            <button
              onClick={deselectAll}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
            >
              Deselect All
            </button>
          </div>
        </div>
      </div>

      {/* Principals List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-blue-600" />
          Select Principals
        </h3>

        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading principals...</p>
          </div>
        ) : filteredPrincipals.length === 0 ? (
          <div className="text-center py-12 text-gray-600">
            <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p>No principals found matching your criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
            {filteredPrincipals.map((principal) => {
              const isSelected = selectedPrincipals.find(p => p._id === principal._id);
              return (
                <div
                  key={principal._id}
                  onClick={() => togglePrincipal(principal)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Shield className={`w-4 h-4 ${
                          principal.level === 5 ? 'text-red-600' :
                          principal.level === 4 ? 'text-amber-600' :
                          'text-indigo-600'
                        }`} />
                        <span className="font-semibold text-gray-900 text-sm">
                          {principal.name}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mb-1">{principal.email}</p>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Building2 className="w-3 h-3" />
                        <span className="truncate">{principal.schoolName || 'No school'}</span>
                      </div>
                      <span className={`inline-block mt-2 px-2 py-0.5 rounded text-xs font-medium ${
                        principal.level === 5 ? 'bg-red-100 text-red-800' :
                        principal.level === 4 ? 'bg-amber-100 text-amber-800' :
                        'bg-indigo-100 text-indigo-800'
                      }`}>
                        Level {principal.level}
                      </span>
                    </div>
                    <div>
                      {isSelected && (
                        <div className="bg-blue-600 rounded-full p-1">
                          <CheckCircle className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Results */}
      {results && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Creation Results</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="bg-green-600 rounded-full p-2">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-700">{results.success.length}</p>
                  <p className="text-sm text-green-600">Forms Created</p>
                </div>
              </div>
            </div>
            
            {results.errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="bg-red-600 rounded-full p-2">
                    <AlertCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-700">{results.errors.length}</p>
                    <p className="text-sm text-red-600">Errors</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {results.success.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-green-800 mb-2">Successfully Created:</h4>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {results.success.map((item, index) => (
                  <div key={`success-${item.formId}-${index}`} className="text-sm text-gray-700 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span><strong>{item.principal}</strong> - {item.school}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.errors.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-red-800 mb-2">Errors:</h4>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {results.errors.map((item, index) => (
                  <div key={`error-${item.principal}-${item.error}-${index}`} className="text-sm text-gray-700 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                    <span><strong>{item.principal}</strong>: {item.error}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={() => {
                setResults(null);
                setSelectedPrincipals([]);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Create More Forms
            </button>
          </div>
        </div>
      )}

      {/* Action Button */}
      {!results && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                Ready to Create Forms?
              </h3>
              <p className="text-sm text-gray-600">
                {selectedPrincipals.length > 0
                  ? `${selectedPrincipals.length} principal(s) selected`
                  : 'Select principals from the list above'}
              </p>
            </div>
            <button
              onClick={handleBulkCreate}
              disabled={selectedPrincipals.length === 0 || creating}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed text-white text-sm font-bold rounded-lg transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
            >
              {creating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating Forms...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Create {selectedPrincipals.length} Form{selectedPrincipals.length !== 1 ? 's' : ''}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          How It Works
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-800">
          <div className="flex items-start gap-2">
            <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
            <span>Select principals by clicking on their cards. Use search and filters to find specific principals.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
            <span>Review your selection. You can use "Select All" to choose all filtered principals.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
            <span>Click "Create Forms" to generate blank forms for each selected principal automatically.</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkFormCreation;
