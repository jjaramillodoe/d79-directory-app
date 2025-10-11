'use client';

import Link from 'next/link';
import { useState } from 'react';
import { 
  BookOpen, 
  Shield, 
  Users, 
  CheckCircle, 
  Save, 
  BarChart3, 
  ArrowLeft, 
  ArrowRight,
  GraduationCap,
  Heart,
  Phone,
  Calendar,
  FileText,
  Settings,
  Star,
  Building2,
  UserCheck,
  Lock
} from 'lucide-react';

export default function AboutPage() {
  const [hoveredButton, setHoveredButton] = useState(null);

  const handleMouseEnter = (buttonId) => {
    setHoveredButton(buttonId);
  };

  const handleMouseLeave = () => {
    setHoveredButton(null);
  };

  const getButtonStyle = (buttonId, baseColor, hoverColor) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.875rem 2rem',
    backgroundColor: hoveredButton === buttonId ? hoverColor : baseColor,
    color: 'white',
    fontSize: '0.875rem',
    fontWeight: '600',
    borderRadius: '0.5rem',
    textDecoration: 'none',
    marginRight: '1rem',
    transition: 'all 0.2s ease-in-out',
    boxShadow: hoveredButton === buttonId ? '0 4px 12px rgba(0, 0, 0, 0.15)' : '0 2px 4px rgba(0, 0, 0, 0.1)',
    transform: hoveredButton === buttonId ? 'translateY(-1px)' : 'translateY(0)'
  });

  const planComponents = [
    { id: 1, title: 'Table of Contents', icon: FileText },
    { id: 2, title: 'Child Abuse Prevention Plan', icon: Shield },
    { id: 3, title: 'Student to Student Sexual Harassment', icon: Users },
    { id: 4, title: 'Respect For All Plan', icon: Heart },
    { id: 5, title: 'Suicide Prevention Plan', icon: Heart },
    { id: 6, title: 'School Attendance Plan', icon: Calendar },
    { id: 7, title: 'Students in Temporary Housing Plan', icon: Building2 },
    { id: 8, title: 'Service In Schools Plan', icon: Settings },
    { id: 9, title: 'Planning Interviews', icon: UserCheck },
    { id: 10, title: 'Military Recruitment OPT-OUT', icon: Star },
    { id: 11, title: 'School Culture Plan', icon: BookOpen },
    { id: 12, title: 'After School Programs', icon: Calendar },
    { id: 13, title: 'Cell Phone Policy', icon: Phone },
    { id: 14, title: 'School Counseling Plan', icon: Heart }
  ];

  const features = [
    { icon: FileText, title: '14-screen comprehensive form system', description: 'Complete all required plan components' },
    { icon: Lock, title: 'Secure access for @schools.nyc.gov users only', description: 'Restricted to authorized personnel' },
    { icon: Users, title: 'Multi-level user permissions (Levels 1-4)', description: 'Role-based access control' },
    { icon: CheckCircle, title: 'Admin review and approval workflow', description: 'Streamlined approval process' },
    { icon: Save, title: 'Auto-save and progress tracking', description: 'Never lose your work' },
    { icon: BarChart3, title: 'Dashboard for submission management', description: 'Track all submissions' }
  ];

  const accessLevels = [
    { level: 'Level 1-2', description: 'View access to approved plans', color: 'bg-gray-500' },
    { level: 'Level 3', description: 'Create and edit school plans', color: 'bg-blue-500' },
    { level: 'Level 4', description: 'Admin Principal access - review, approve, and manage all submissions', color: 'bg-green-600' },
    { level: 'Level 5', description: 'Full admin access - review, approve, and manage all submissions', color: 'bg-green-600' }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 py-24">
        <div className="max-w-[140rem] mx-auto px-12">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-full h-full" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              backgroundRepeat: 'repeat'
            }}></div>
          </div>
          
          <div className="relative z-10 text-center">
            <div className="flex items-center justify-center gap-4 mb-8">
              <div className="w-20 h-20 bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <BookOpen className="w-10 h-10 text-white" />
              </div>
              <div>
                <h1 className="text-5xl font-bold">District 79</h1>
                <p className="text-blue-100 text-xl">Consolidated School Plan</p>
              </div>
            </div>
            
            <h2 className="text-4xl font-bold mb-6">
              School Plans Management System
            </h2>
            <p className="text-xl text-blue-100 mb-8 leading-relaxed max-w-3xl mx-auto">
              Streamline your school planning process with our comprehensive digital platform for the 2025-2026 academic year.
            </p>
            
            {/* Quick Stats Banner */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div className="bg-white/10 p-6 backdrop-blur-sm border border-white/20">
                <div className="text-3xl font-bold text-white mb-2">14</div>
                <div className="text-blue-100 text-sm">Required Plans</div>
              </div>
              <div className="bg-white/10 p-6 backdrop-blur-sm border border-white/20">
                <div className="text-3xl font-bold text-white mb-2">Secure</div>
                <div className="text-blue-100 text-sm">Compliance</div>
              </div>
              <div className="bg-white/10 p-6 backdrop-blur-sm border border-white/20">
                <div className="text-3xl font-bold text-white mb-2">24</div>
                <div className="text-blue-100 text-sm">Schools Served</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* About Section */}
      <div className="bg-white py-20">
        <div className="max-w-[140rem] mx-auto px-12">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              About This System
            </h2>
            <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-blue-700 mx-auto mb-8"></div>
            <p className="text-gray-600 leading-relaxed text-lg max-w-4xl mx-auto">
              The District 79 Consolidated School Plan system is a comprehensive digital platform designed specifically 
              for NYC District 79 principals and administrators. This platform streamlines the process of 
              creating, submitting, and managing the 14 required school plan components with enhanced security, 
              real-time collaboration, and user-friendly interfaces.
            </p>
          </div>
        </div>
      </div>

      {/* Key Features Section */}
      <div className="bg-gray-50 py-20">
        <div className="max-w-[140rem] mx-auto px-12">
          <h3 className="text-3xl font-bold text-gray-900 mb-12 text-center">
            Key Features
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-10">
            {features.map((feature, index) => (
              <div key={index} className="bg-white p-8 shadow-lg border border-gray-200 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                <div className="flex items-center mb-6">
                  <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 mr-4 shadow-lg">
                    <feature.icon size={28} className="text-white" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 m-0">
                    {feature.title}
                  </h4>
                </div>
                <p className="text-gray-600 leading-relaxed m-0">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Required Plan Components Section */}
      <div className="bg-white py-20">
        <div className="max-w-[140rem] mx-auto px-12">
          <h3 className="text-3xl font-bold text-gray-900 mb-12 text-center">
            Required Plan Components
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8">
            {planComponents.map((component) => {
              const IconComponent = component.icon;
              return (
                <div key={component.id} className="flex items-center p-6 bg-gray-50 border border-gray-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 mr-4 flex-shrink-0 shadow-md">
                    <IconComponent size={24} className="text-white" />
                  </div>
                  <div>
                    <span className="text-lg font-bold text-blue-600 mr-2">
                      {component.id}.
                    </span>
                    <span className="text-gray-700 font-medium">
                      {component.title}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* User Access Levels Section */}
      <div className="bg-gray-50 py-20">
        <div className="max-w-[140rem] mx-auto px-12">
          <h3 className="text-3xl font-bold text-gray-900 mb-12 text-center">
            User Access Levels
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {accessLevels.map((level, index) => (
              <div key={index} className="bg-white p-8 shadow-lg border border-gray-200 text-center hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className={`inline-flex items-center justify-center w-16 h-16 ${level.color} mb-6 shadow-lg`}>
                  <Users size={32} className="text-white" />
                </div>
                <h4 className="text-xl font-bold text-gray-900 mb-3">
                  {level.level}
                </h4>
                <p className="text-gray-600 leading-relaxed m-0">
                  {level.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Action Buttons Section */}
      <div className="bg-white py-20">
        <div className="max-w-[140rem] mx-auto px-12">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-8">
              Ready to Get Started?
            </h3>
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-12">
              <Link
                href="/"
                className="inline-flex items-center gap-3 px-10 py-4 bg-white border-2 border-blue-500 text-blue-600 text-lg font-semibold transition-all duration-300 hover:bg-blue-500 hover:text-white hover:shadow-xl hover:-translate-y-1"
              >
                <ArrowLeft size={24} />
                Back to Home
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-lg font-semibold transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
              >
                Get Started
                <ArrowRight size={24} />
              </Link>
            </div>
            
            {/* Security Notice */}
            <div className="p-6 bg-gray-50 border border-gray-200 max-w-2xl mx-auto">
              <div className="flex items-center justify-center gap-3 mb-3">
                <div className="w-8 h-8 bg-blue-100 flex items-center justify-center">
                  <Lock className="w-4 h-4 text-blue-600" />
                </div>
                <h4 className="font-bold text-blue-900">Secure Access Only</h4>
              </div>
              <p className="text-sm text-blue-700 leading-relaxed">
                This system is restricted to principals and school administrators with verified @schools.nyc.gov email addresses. 
                All activities are monitored and logged for security purposes.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}