'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, 
  Share2, 
  UserPlus, 
  XCircle,
  Activity,
  School,
  UserCheck,
  UserX,
  Eye
} from 'lucide-react';
import useAppToast from '../hooks/useAppToast';
import Modal from './ui/Modal';
import * as logger from '../lib/logger';

const CollaborationDashboard = ({ user }) => {
  const router = useRouter();
  const toast = useAppToast();
  const [schoolUsers, setSchoolUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showShareForm, setShowShareForm] = useState(false);
  const [userForms, setUserForms] = useState([]);
  const [activeTab, setActiveTab] = useState('collaboration');
  const [shares, setShares] = useState([]);
  const [sharesError, setSharesError] = useState(null);
  const [removingKey, setRemovingKey] = useState(null);

  // Form creation state
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    title: '',
    level: 3,
    canCollaborate: true,
    collaborationLevel: 'edit'
  });

  // Form sharing state
  const [shareFormData, setShareFormData] = useState({
    formId: '',
    userIds: [],
    permissions: 'edit'
  });

  const fetchSchoolUsers = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch('/api/admin/users/school');
      if (response.ok) {
        const data = await response.json();
        setSchoolUsers(data.users || []);
      } else {
        const data = await response.json().catch(() => ({}));
        setError(data.error || 'Failed to load school users');
        setSchoolUsers([]);
      }
    } catch (err) {
      logger.error('Error fetching school users:', err);
      setError('Failed to load school users');
      setSchoolUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUserForms = useCallback(async () => {
    try {
      const response = await fetch('/api/forms');
      if (response.ok) {
        const data = await response.json();
        let forms = data.forms || [];
        
        // For Level 4, only show forms from their school
        // For Level 5, show all forms from all schools
        if (user?.level === 4) {
          forms = forms.filter(form => form.schoolName === user.schoolName);
        }
        // Level 5 users see all forms, no filtering needed
        
        setUserForms(forms);
      }
    } catch (error) {
      logger.error('Error fetching forms:', error);
    }
  }, [user]);

  const fetchShares = useCallback(async () => {
    try {
      setSharesError(null);
      const response = await fetch('/api/admin/forms/share');
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        setShares(data.shares || []);
      } else {
        setSharesError(data.error || 'Failed to load who forms are shared with');
      }
    } catch (err) {
      logger.error('Error fetching form shares:', err);
      setSharesError('Failed to load who forms are shared with');
    }
  }, []);

  useEffect(() => {
    if (user && user.level >= 4) {
      fetchSchoolUsers();
      fetchUserForms();
      fetchShares();
    }
  }, [user, fetchSchoolUsers, fetchUserForms, fetchShares]);

  const handleShareForm = async (formId) => {
    // Reset state
    setShareFormData({
      formId: formId,
      userIds: [],
      permissions: 'edit'
    });
    setShowShareForm(true);
  };

  const submitShareForm = async (e) => {
    e.preventDefault();
    
    if (!shareFormData.formId || shareFormData.userIds.length === 0) {
      toast.error('Please select at least one user to share with.');
      return;
    }

    try {
      const response = await fetch('/api/admin/forms/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formId: shareFormData.formId,
          userIds: shareFormData.userIds,
          permissions: shareFormData.permissions,
          sections: []
        })
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Form shared');
        setShowShareForm(false);
        fetchUserForms();
        fetchShares();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Request failed');
      }
    } catch (error) {
      logger.error('Error sharing form:', error);
      toast.error('Failed to share form');
    }
  };

  const handleUnshareForm = async (formId, schoolName) => {
    const message = user?.level === 5
      ? `Remove everyone this form is shared with${schoolName ? ` (${schoolName})` : ''}, including email shares?`
      : `Remove everyone this form is shared with${schoolName ? ` (${schoolName})` : ''}?`;
    if (!confirm(message)) {
      return;
    }

    try {
      const response = await fetch('/api/admin/forms/share', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formId })
      });

      if (response.ok) {
        toast.success('Form unshared');
        fetchUserForms();
        fetchShares();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Request failed');
      }
    } catch (error) {
      logger.error('Error unsharing form:', error);
      toast.error('Failed to unshare form');
    }
  };

  const handleRemovePerson = async (formId, person) => {
    const who = person.name && person.name !== person.email ? `${person.name} (${person.email})` : person.email;
    if (!confirm(`Remove ${who} from this form?`)) return;

    setRemovingKey(`${formId}:${person.key}`);
    try {
      const response = await fetch('/api/admin/forms/share', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          person.kind === 'email' ? { formId, email: person.email } : { formId, userId: person.userId }
        ),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        toast.success(
          person.retainsAccess
            ? `Share removed. ${person.name} can still open it as school staff.`
            : `${person.name} no longer has access`
        );
        fetchUserForms();
        fetchShares();
      } else {
        toast.error(data.error || 'Request failed');
      }
    } catch (err) {
      logger.error('Error removing person from form:', err);
      toast.error('Failed to remove access');
    } finally {
      setRemovingKey(null);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/admin/users/school', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });

      if (response.ok) {
        const data = await response.json();
        setSchoolUsers(prev => [...prev, data.user]);
        setShowCreateUser(false);
        setNewUser({ name: '', email: '', title: '', level: 3, canCollaborate: true, collaborationLevel: 'edit' });
        toast.success('User created');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Request failed');
      }
    } catch (error) {
      logger.error('Error creating user:', error);
      toast.error('Failed to create user');
    }
  };

  if (!user || user.level < 4) {
    return (
      <div className="text-center py-8">
        <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-700">Access Denied</h2>
        <p className="text-gray-500">Only principals (Level 4) and super admins (Level 5) can access this dashboard.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const level3Users = schoolUsers.filter(
    (u) => u.level === 3 && u.isActive !== false && u.canCollaborate !== false
  );

  // Forms stay shareable after the first share, so more people can be added later.
  const shareableForms = userForms.filter(
    (form) => user?.level === 5 || form.schoolName === user?.schoolName
  );
  const shareCountByForm = new Map(shares.map((entry) => [entry.formId, entry.people.length]));

  return (
    <div>
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          {user?.level === 5 ? (
            <>
              <strong>Super Admin:</strong> sharing across all schools
              <span className="ml-4">
                <strong>Level 3 users:</strong> {level3Users.length}
              </span>
            </>
          ) : (
            <>
              <strong>School:</strong> {user?.schoolName}
              <span className="ml-4">
                <strong>Level 3 users:</strong> {level3Users.length}
              </span>
            </>
          )}
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('collaboration')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'collaboration'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Share2 className="w-4 h-4 inline mr-2" />
            Form Sharing
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'users'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            Level 3 Users ({level3Users.length})
          </button>
        </nav>
      </div>

      {/* Collaboration Tab */}
      {activeTab === 'collaboration' && (
        <div className="space-y-6">
          {/* My Forms - Available to Share */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                My Forms - Available to Share
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {user?.level === 5 
                  ? 'Forms from all schools that can be shared with Level 3 users'
                  : `Forms from ${user?.schoolName} that can be shared with Level 3 users`
                }
              </p>
            </div>
            <div className="divide-y divide-gray-200">
              {shareableForms.length === 0 ? (
                <div className="px-6 py-8 text-center text-gray-500">
                  <p>No forms available to share from your school.</p>
                  <p className="text-sm mt-2">Create a new form to get started.</p>
                </div>
              ) : (
                shareableForms
                  .map((form) => (
                    <div key={form._id || form.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-gray-900">{form.schoolName}</h4>
                          {shareCountByForm.get(String(form._id || form.id)) ? (
                            <span className="px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full font-medium">
                              Shared with {shareCountByForm.get(String(form._id || form.id))}
                            </span>
                          ) : null}
                        </div>
                        <p className="text-sm text-gray-600">
                          Status: <span className="font-medium">{form.status}</span> | 
                          Progress: {form.completedSteps?.length || 0}/14 steps
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Created: {new Date(form.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => router.push(`/form/${form._id || form.id}`)}
                          className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors flex items-center gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </button>
                        <button
                          onClick={() => handleShareForm(form._id || form.id)}
                          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center gap-2"
                        >
                          <Share2 className="w-4 h-4" />
                          Share
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>

          {/* Who each form is shared with */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="px-6 py-4 bg-green-50 border-b border-green-200">
              <h3 className="text-lg font-semibold text-gray-900">Shared With</h3>
              <p className="text-sm text-gray-600 mt-1">
                Everyone each form has been shared with. Remove one person, or unshare the form from everyone.
              </p>
            </div>
            {sharesError ? (
              <div className="px-6 py-4 text-sm text-red-800 bg-red-50">{sharesError}</div>
            ) : shares.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                <p>No forms have been shared yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {shares.map((entry) => (
                  <div key={entry.formId} className="px-6 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900">{entry.schoolName}</h4>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {entry.schoolYear}
                          {entry.status ? ` · ${entry.status}` : ''}
                          {` · ${entry.people.length} ${entry.people.length === 1 ? 'person' : 'people'}`}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => router.push(`/form/${entry.formId}`)}
                          className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors flex items-center gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          Open
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUnshareForm(entry.formId, entry.schoolName)}
                          className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors flex items-center gap-2"
                        >
                          <UserX className="w-4 h-4" />
                          Unshare all
                        </button>
                      </div>
                    </div>
                    <ul className="border border-gray-200 rounded-md divide-y divide-gray-100">
                      {entry.people.map((person) => {
                        const canRemove = person.kind === 'user' || user?.level === 5;
                        const busy = removingKey === `${entry.formId}:${person.key}`;
                        return (
                          <li key={person.key} className="px-3 py-2 flex flex-wrap items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 break-words">
                                {person.name}
                                {person.title ? <span className="font-normal text-gray-500"> · {person.title}</span> : null}
                              </p>
                              <p className="text-xs text-gray-500 break-all">
                                {person.name !== person.email ? `${person.email} · ` : ''}
                                {person.permissions === 'view' ? 'View only' : 'Can edit'}
                                {person.kind === 'email' ? ' · Shared by email' : ''}
                                {person.sharedAt ? ` · ${new Date(person.sharedAt).toLocaleDateString()}` : ''}
                                {person.sharedBy ? ` by ${person.sharedBy}` : ''}
                              </p>
                              {person.retainsAccess ? (
                                <p className="text-xs text-amber-700 mt-0.5">
                                  Still has access as school staff after removal
                                </p>
                              ) : null}
                            </div>
                            {canRemove ? (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => handleRemovePerson(entry.formId, person)}
                                aria-label={`Remove ${person.name} from ${entry.schoolName}`}
                                className="px-3 py-1 text-xs text-red-700 border border-red-200 rounded hover:bg-red-50 disabled:opacity-50"
                              >
                                {busy ? 'Removing…' : 'Remove'}
                              </button>
                            ) : (
                              <span className="text-xs text-gray-400">Super Admin can remove</span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Level 3 Users {user?.level === 5 ? '(All Schools)' : `- ${user?.schoolName}`}
            </h2>
            <button
              onClick={() => setShowCreateUser(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Add Level 3 User
            </button>
          </div>

          {/* Users Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {level3Users.length === 0 ? (
              <div className="col-span-full text-center py-12 bg-white rounded-lg shadow-md">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">
                  {user?.level === 5 
                    ? 'No Level 3 users found across all schools.' 
                    : 'No Level 3 users found in your school.'
                  }
                </p>
                {user?.level === 4 && (
                  <button
                    onClick={() => setShowCreateUser(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg inline-flex items-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    Create First Level 3 User
                  </button>
                )}
              </div>
            ) : (
              level3Users.map((level3User) => (
                <div key={level3User.id} className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">{level3User.name}</h3>
                    <p className="text-sm text-gray-600">{level3User.title}</p>
                    <p className="text-sm text-gray-500">{level3User.email}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center text-sm">
                      <School className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-gray-600">{level3User.schoolName}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <UserCheck className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-green-600 font-medium">Level 3 - Can collaborate</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <Share2 className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-gray-600">{level3User.assignedFormsCount || 0} forms shared</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateUser && (
        <Modal onClose={() => setShowCreateUser(false)} labelledBy="create-level3-title">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 id="create-level3-title" className="text-lg font-semibold mb-4">Create Level 3 User</h3>
            <p className="text-sm text-gray-600 mb-4">
              This user will be added to <strong>{user?.schoolName}</strong> and can collaborate on shared forms.
            </p>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="John Doe"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="john.doe@schools.nyc.gov"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Must be @schools.nyc.gov email</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Job Title *</label>
                <input
                  type="text"
                  value={newUser.title}
                  onChange={(e) => setNewUser(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Teacher / Admin / Staff"
                  required
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 font-medium"
                >
                  Create User
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateUser(false);
                    setNewUser({ name: '', email: '', title: '', level: 3, canCollaborate: true, collaborationLevel: 'edit' });
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* Share Form Modal */}
      {showShareForm && (
        <Modal onClose={() => setShowShareForm(false)} labelledBy="share-level3-title">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h3 id="share-level3-title" className="text-lg font-semibold mb-4">Share Form with Level 3 Users</h3>
            
            <form onSubmit={submitShareForm} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Level 3 Users {user?.level === 5 ? 'from any school' : `from ${user?.schoolName}`}
                </label>
                {level3Users.length === 0 ? (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-sm text-yellow-800">
                      No Level 3 users available. Please create Level 3 users first.
                    </p>
                  </div>
                ) : (
                  <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-md p-3 space-y-2">
                    {level3Users.map((level3User) => (
                      <label key={level3User.id} className="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          value={level3User.id}
                          checked={shareFormData.userIds.includes(level3User.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setShareFormData(prev => ({
                                ...prev,
                                userIds: [...prev.userIds, level3User.id]
                              }));
                            } else {
                              setShareFormData(prev => ({
                                ...prev,
                                userIds: prev.userIds.filter(id => id !== level3User.id)
                              }));
                            }
                          }}
                          className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{level3User.name}</p>
                          <p className="text-xs text-gray-600">{level3User.title}</p>
                          <p className="text-xs text-gray-500">{level3User.email}</p>
                          {user?.level === 5 && level3User.schoolName && (
                            <p className="text-xs text-blue-600 mt-1">School: {level3User.schoolName}</p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Permissions</label>
                <select
                  value={shareFormData.permissions}
                  onChange={(e) => setShareFormData(prev => ({ ...prev, permissions: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="view">View Only</option>
                  <option value="edit">Edit</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="p-3 bg-gray-50 rounded-md">
                <p className="text-sm text-gray-600">
                  Selected: <strong>{shareFormData.userIds.length}</strong> user(s)
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={level3Users.length === 0}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Share Form
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowShareForm(false);
                    setShareFormData({ formId: '', userIds: [], permissions: 'edit' });
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default CollaborationDashboard;
