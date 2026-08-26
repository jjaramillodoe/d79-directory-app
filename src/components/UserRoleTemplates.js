'use client';

import { useState } from 'react';
import { 
  Users, 
  Plus, 
  Check, 
  X, 
  Shield, 
  Building2, 
  UserCheck,
  Settings,
  BookOpen,
  Copy,
  Save,
  Trash2,
  Edit
} from 'lucide-react';
import useAppToast from '../hooks/useAppToast';
import Modal from './ui/Modal';

// Editable rows need an identity that survives a delete. Row content cannot supply one:
// name and email are being typed, so keying on them would remount the row on every
// keystroke and drop focus. A counter is stable for the life of the row instead.
let rowIdCounter = 0;
const nextRowId = () => `row-${rowIdCounter++}`;

const UserRoleTemplates = ({ onCreateUsers }) => {
  const toast = useAppToast();
  const [showModal, setShowModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [customTemplate, setCustomTemplate] = useState({
    name: '',
    description: '',
    users: []
  });
  const [isCreating, setIsCreating] = useState(false);

  // Predefined role templates
  const roleTemplates = [
    {
      id: 'school-leadership',
      name: 'School Leadership Team',
      description: 'Complete leadership setup for a new school',
      icon: Shield,
      color: 'blue',
      users: [
        { name: '', email: '', level: 4, title: 'Principal', schoolName: '' },
        { name: '', email: '', level: 3, title: 'Assistant Principal', schoolName: '' },
        { name: '', email: '', level: 3, title: 'Assistant Principal', schoolName: '' }
      ]
    },
    {
      id: 'district-admins',
      name: 'District Administrators',
      description: 'District-level administrative staff',
      icon: Building2,
      color: 'purple',
      users: [
        { name: '', email: '', level: 5, title: 'Super Admin', schoolName: 'District 79 Administration' },
        { name: '', email: '', level: 4, title: 'Admin Principal', schoolName: 'District 79 Administration' },
        { name: '', email: '', level: 4, title: 'Admin Principal', schoolName: 'District 79 Administration' }
      ]
    },
    {
      id: 'teaching-staff',
      name: 'Teaching Staff',
      description: 'Teachers and instructional staff',
      icon: UserCheck,
      color: 'green',
      users: [
        { name: '', email: '', level: 2, title: 'Teacher', schoolName: '' },
        { name: '', email: '', level: 2, title: 'Teacher', schoolName: '' },
        { name: '', email: '', level: 2, title: 'Teacher', schoolName: '' },
        { name: '', email: '', level: 2, title: 'Teacher', schoolName: '' }
      ]
    },
    {
      id: 'support-staff',
      name: 'Support Staff',
      description: 'Administrative and support personnel',
      icon: Settings,
      color: 'amber',
      users: [
        { name: '', email: '', level: 2, title: 'Office Manager', schoolName: '' },
        { name: '', email: '', level: 2, title: 'Guidance Counselor', schoolName: '' },
        { name: '', email: '', level: 2, title: 'IT Support', schoolName: '' }
      ]
    }
  ];

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    setCustomTemplate({
      name: template.name,
      description: template.description,
      users: template.users.map(user => ({ ...user, rowId: nextRowId() }))
    });
    setShowModal(true);
  };

  const handleUserChange = (index, field, value) => {
    setCustomTemplate(prev => ({
      ...prev,
      users: prev.users.map((user, i) => 
        i === index ? { ...user, [field]: value } : user
      )
    }));
  };

  const addUser = () => {
    setCustomTemplate(prev => ({
      ...prev,
      users: [...prev.users, { rowId: nextRowId(), name: '', email: '', level: 2, title: '', schoolName: '' }]
    }));
  };

  const removeUser = (index) => {
    setCustomTemplate(prev => ({
      ...prev,
      users: prev.users.filter((_, i) => i !== index)
    }));
  };

  const handleCreateUsers = async () => {
    setIsCreating(true);
    
    try {
      // Filter out users with empty names or emails
      const validUsers = customTemplate.users.filter(user => 
        user.name.trim() && user.email.trim()
      );

      if (validUsers.length === 0) {
        toast.error('Please add at least one user with name and email');
        return;
      }

      // Create users one by one
      const results = [];
      for (const user of validUsers) {
        try {
          // rowId is a client-side render key; it is not part of the user record.
          const { rowId, ...userPayload } = user;
          const response = await fetch('/api/users/create', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ...userPayload,
              isActive: true
            }),
          });

          if (response.ok) {
            results.push({ success: true, user: user.name });
          } else {
            results.push({ success: false, user: user.name, error: 'Failed to create user' });
          }
        } catch (error) {
          results.push({ success: false, user: user.name, error: error.message });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const errorCount = results.filter(r => !r.success).length;

      toast.success(`${successCount} users created${errorCount ? `, ${errorCount} errors` : ''}`);
      
      setShowModal(false);
      setSelectedTemplate(null);
      setCustomTemplate({ name: '', description: '', users: [] });
      
      // Notify parent component to refresh user list
      if (onCreateUsers) {
        onCreateUsers();
      }
    } catch (error) {
      console.error('Error creating users:', error);
      toast.error('Error creating users. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const getLevelDescription = (level) => {
    const descriptions = {
      1: 'Viewer (Can only view forms they\'re assigned to)',
      2: 'Other Titles (Can view forms they\'re assigned to)',
      3: 'Assistant Principal (Can view and edit forms they\'re assigned to)',
      4: 'Admin Principal (Can create forms, manage school users, assign forms)',
      5: 'Super Admin (Full access to everything, manage all users and forms)'
    };
    return descriptions[level] || '';
  };

  const getColorClasses = (color) => {
    const colors = {
      blue: 'bg-blue-100 text-blue-800 border-blue-200',
      purple: 'bg-purple-100 text-purple-800 border-purple-200',
      green: 'bg-green-100 text-green-800 border-green-200',
      amber: 'bg-amber-100 text-amber-800 border-amber-200'
    };
    return colors[color] || colors.blue;
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <BookOpen className="w-5 h-5 mr-2 text-indigo-600" />
              User Role Templates
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Quickly create multiple users with predefined roles and permissions
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {roleTemplates.map((template) => {
            const IconComponent = template.icon;
            return (
              <div
                key={template.id}
                onClick={() => handleTemplateSelect(template)}
                className={`p-4 rounded-lg border-2 border-dashed cursor-pointer transition-all hover:shadow-md ${getColorClasses(template.color)}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <IconComponent className="w-6 h-6" />
                  <Plus className="w-4 h-4" />
                </div>
                <h4 className="font-semibold text-sm mb-2">{template.name}</h4>
                <p className="text-xs opacity-80 mb-3">{template.description}</p>
                <div className="flex items-center justify-between text-xs">
                  <span>{template.users.length} users</span>
                  <span className="flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Ready
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Template Usage Guide */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center">
            <Settings className="w-4 h-4 mr-2" />
            How to Use Templates
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-gray-600">
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">1</span>
              <span>Click on a template to open the setup wizard</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">2</span>
              <span>Fill in the user details (names, emails, schools)</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">3</span>
              <span>Click "Create Users" to add all users at once</span>
            </div>
          </div>
        </div>
      </div>

      {/* Template Setup Modal */}
      {showModal && (
        <Modal
          onClose={isCreating ? undefined : () => setShowModal(false)}
          size="xl"
          labelledBy="role-template-title"
        >
          <div className="bg-white rounded-lg p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 id="role-template-title" className="text-2xl font-semibold text-gray-900 flex items-center">
                <BookOpen className="w-6 h-6 mr-2 text-indigo-600" />
                Setup: {customTemplate.name}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                aria-label="Close dialog"
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <p className="text-gray-600 mb-6">{customTemplate.description}</p>

            {/* Template Users */}
            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold text-gray-900">
                  Users to Create ({customTemplate.users.length})
                </h4>
                <button
                  onClick={addUser}
                  className="px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add User
                </button>
              </div>

              <div className="space-y-3">
                {customTemplate.users.map((user, index) => (
                  <div key={user.rowId} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-medium text-gray-900">User {index + 1}</h5>
                      {customTemplate.users.length > 1 && (
                        <button
                          onClick={() => removeUser(index)}
                          className="text-red-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
                        <input
                          type="text"
                          value={user.name}
                          onChange={(e) => handleUserChange(index, 'name', e.target.value)}
                          placeholder="Full name"
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
                        <input
                          type="email"
                          value={user.email}
                          onChange={(e) => handleUserChange(index, 'email', e.target.value)}
                          placeholder="email@schools.nyc.gov"
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Level</label>
                        <select
                          value={user.level}
                          onChange={(e) => handleUserChange(index, 'level', parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value={1}>Level 1 - Viewer</option>
                          <option value={2}>Level 2 - Other Titles</option>
                          <option value={3}>Level 3 - Assistant Principal</option>
                          <option value={4}>Level 4 - Admin Principal</option>
                          <option value={5}>Level 5 - Super Admin</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
                        <input
                          type="text"
                          value={user.title}
                          onChange={(e) => handleUserChange(index, 'title', e.target.value)}
                          placeholder="e.g., Principal, Teacher"
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className="mt-3">
                      <label className="block text-xs font-medium text-gray-700 mb-1">School</label>
                      <input
                        type="text"
                        value={user.schoolName}
                        onChange={(e) => handleUserChange(index, 'schoolName', e.target.value)}
                        placeholder="School name"
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div className="mt-2">
                      <p className="text-xs text-gray-500">
                        <strong>Level {user.level}:</strong> {getLevelDescription(user.level)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateUsers}
                disabled={isCreating || customTemplate.users.filter(u => u.name.trim() && u.email.trim()).length === 0}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                {isCreating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Users className="w-4 h-4" />
                    Create {customTemplate.users.filter(u => u.name.trim() && u.email.trim()).length} Users
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

export default UserRoleTemplates;
