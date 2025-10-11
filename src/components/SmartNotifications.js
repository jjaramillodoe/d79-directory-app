'use client';

import { useState, useEffect } from 'react';
import { 
  Bell, 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Mail,
  Calendar,
  TrendingUp,
  Users,
  Settings,
  Filter,
  Send
} from 'lucide-react';

const SmartNotifications = ({ forms, stats }) => {
  const [notifications, setNotifications] = useState([]);
  const [showCompose, setShowCompose] = useState(false);
  const [selectedSchools, setSelectedSchools] = useState([]);
  const [message, setMessage] = useState('');
  const [notificationType, setNotificationType] = useState('reminder');

  // Generate smart notifications based on form data
  useEffect(() => {
    const generatedNotifications = [];
    
    // Deadline alerts
    const overdueForms = forms.filter(form => {
      const daysSinceCreated = Math.floor((new Date() - new Date(form.createdAt)) / (1000 * 60 * 60 * 24));
      return daysSinceCreated > 30 && form.status === 'draft';
    });

    overdueForms.forEach(form => {
      generatedNotifications.push({
        id: `overdue-${form._id}`,
        type: 'deadline',
        priority: 'high',
        title: 'Overdue Submission',
        message: `${form.schoolName} has not submitted their plan in over 30 days`,
        school: form.schoolName,
        timestamp: new Date(),
        action: 'Send Reminder'
      });
    });

    // Quality alerts
    const incompleteForms = forms.filter(form => {
      const completedSteps = form.completedSteps?.length || 0;
      return completedSteps > 0 && completedSteps < 14 && form.status !== 'draft';
    });

    incompleteForms.forEach(form => {
      generatedNotifications.push({
        id: `incomplete-${form._id}`,
        type: 'quality',
        priority: 'medium',
        title: 'Incomplete Submission',
        message: `${form.schoolName} submitted with only ${form.completedSteps?.length || 0}/14 steps completed`,
        school: form.schoolName,
        timestamp: new Date(),
        action: 'Review Submission'
      });
    });

    // Review alerts
    const pendingReviews = forms.filter(form => 
      ['submitted', 'under_review'].includes(form.status)
    );

    if (pendingReviews.length > 5) {
      generatedNotifications.push({
        id: 'review-backlog',
        type: 'workflow',
        priority: 'high',
        title: 'Review Backlog',
        message: `${pendingReviews.length} submissions are waiting for review`,
        school: 'Multiple Schools',
        timestamp: new Date(),
        action: 'Assign Reviewers'
      });
    }

    // Success notifications
    const recentApprovals = forms.filter(form => {
      if (form.status !== 'approved') return false;
      const daysSinceApproval = Math.floor((new Date() - new Date(form.updatedAt || form.createdAt)) / (1000 * 60 * 60 * 24));
      return daysSinceApproval <= 7;
    });

    recentApprovals.forEach(form => {
      generatedNotifications.push({
        id: `approved-${form._id}`,
        type: 'success',
        priority: 'low',
        title: 'Plan Approved',
        message: `${form.schoolName} plan has been approved`,
        school: form.schoolName,
        timestamp: new Date(),
        action: 'View Details'
      });
    });

    setNotifications(generatedNotifications);
  }, [forms]);

  // Get notification icon and color
  const getNotificationStyle = (type, priority) => {
    const styles = {
      deadline: { icon: Clock, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
      quality: { icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
      workflow: { icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
      success: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' }
    };
    return styles[type] || styles.workflow;
  };

  // Send bulk notification
  const sendBulkNotification = async () => {
    if (selectedSchools.length === 0 || !message.trim()) return;

    try {
      // Simulate API call
      console.log('Sending notification to:', selectedSchools);
      console.log('Message:', message);
      console.log('Type:', notificationType);
      
      // Reset form
      setSelectedSchools([]);
      setMessage('');
      setShowCompose(false);
      
      alert(`Notification sent to ${selectedSchools.length} schools!`);
    } catch (error) {
      console.error('Error sending notification:', error);
      alert('Error sending notification. Please try again.');
    }
  };

  // Filter notifications
  const [filter, setFilter] = useState('all');
  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'all') return true;
    return notification.type === filter;
  });

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-900">Smart Notifications</h2>
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600" />
            <span className="text-sm text-gray-600">{notifications.length} active notifications</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">All Types</option>
            <option value="deadline">Deadlines</option>
            <option value="quality">Quality</option>
            <option value="workflow">Workflow</option>
            <option value="success">Success</option>
          </select>
          <button
            onClick={() => setShowCompose(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Send className="w-4 h-4" />
            Send Notification
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-red-600" />
            <div>
              <p className="text-sm font-medium text-red-800">Deadline Alerts</p>
              <p className="text-2xl font-bold text-red-900">
                {notifications.filter(n => n.type === 'deadline').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <div>
              <p className="text-sm font-medium text-orange-800">Quality Issues</p>
              <p className="text-2xl font-bold text-orange-900">
                {notifications.filter(n => n.type === 'quality').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-blue-800">Workflow</p>
              <p className="text-2xl font-bold text-blue-900">
                {notifications.filter(n => n.type === 'workflow').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-800">Success</p>
              <p className="text-2xl font-bold text-green-900">
                {notifications.filter(n => n.type === 'success').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Active Notifications</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {filteredNotifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Bell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No notifications match your current filter.</p>
            </div>
          ) : (
            filteredNotifications.map((notification) => {
              const style = getNotificationStyle(notification.type, notification.priority);
              const Icon = style.icon;
              
              return (
                <div key={notification.id} className={`p-6 hover:bg-gray-50 transition-colors ${style.bg}`}>
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${style.bg} ${style.border}`}>
                      <Icon className={`w-5 h-5 ${style.color}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-gray-900">{notification.title}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          notification.priority === 'high' ? 'bg-red-100 text-red-800' :
                          notification.priority === 'medium' ? 'bg-orange-100 text-orange-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {notification.priority}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-2">{notification.message}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {notification.school}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {notification.timestamp.toLocaleString()}
                          </span>
                        </div>
                        <button className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          notification.priority === 'high' ? 'bg-red-600 hover:bg-red-700 text-white' :
                          notification.priority === 'medium' ? 'bg-orange-600 hover:bg-orange-700 text-white' :
                          'bg-green-600 hover:bg-green-700 text-white'
                        }`}>
                          {notification.action}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Send Notification</h3>
                <button
                  onClick={() => setShowCompose(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notification Type
                </label>
                <select 
                  value={notificationType} 
                  onChange={(e) => setNotificationType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="reminder">Deadline Reminder</option>
                  <option value="update">Status Update</option>
                  <option value="instruction">Instruction</option>
                  <option value="congratulations">Congratulations</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Schools
                </label>
                <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-md p-3 space-y-2">
                  {forms.map((form) => (
                    <label key={form._id} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input
                        type="checkbox"
                        checked={selectedSchools.includes(form._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSchools([...selectedSchools, form._id]);
                          } else {
                            setSelectedSchools(selectedSchools.filter(id => id !== form._id));
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">{form.schoolName}</span>
                      <span className="text-xs text-gray-500">({form.status})</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Type your notification message here..."
                />
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowCompose(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={sendBulkNotification}
                  disabled={selectedSchools.length === 0 || !message.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send to {selectedSchools.length} Schools
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartNotifications;
