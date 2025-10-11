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
    { level: 'Level 4', description: 'Full admin access - review, approve, and manage all submissions', color: 'bg-green-600' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto bg-white p-16 rounded-2xl shadow-xl">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-500 rounded-full mb-8">
            <BookOpen size={40} className="text-white" />
          </div>
          <h1 className="text-6xl font-bold text-transparent bg-gradient-to-r from-blue-500 to-blue-700 bg-clip-text mb-4">
            District 79 Directory
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            School Plans Management System for NYC District 79
          </p>
        </div>

        {/* About Section */}
        <div className="mb-16">
          <h2 className="text-4xl font-bold text-gray-800 mb-6 text-center">
            About This System
          </h2>
          <p className="text-gray-600 leading-relaxed text-lg text-center max-w-4xl mx-auto">
            The District 79 Directory is a comprehensive school plans management system designed specifically 
            for NYC District 79 principals and administrators. This platform streamlines the process of 
            creating, submitting, and managing the 14 required school plan components with enhanced security 
            and user-friendly interfaces.
          </p>
        </div>

        {/* Key Features */}
        <div className="mb-16">
          <h3 className="text-3xl font-bold text-gray-800 mb-8 text-center">
            Key Features
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-gray-50 p-8 rounded-xl border border-gray-200 transition-all duration-200 hover:shadow-md hover:border-blue-200">
                <div className="flex items-center mb-4">
                  <div className="flex items-center justify-center w-12 h-12 bg-blue-500 rounded-lg mr-4">
                    <feature.icon size={24} className="text-white" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-800 m-0">
                    {feature.title}
                  </h4>
                </div>
                <p className="text-gray-600 text-sm leading-relaxed m-0">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Required Plan Components */}
        <div className="mb-16">
          <h3 className="text-3xl font-bold text-gray-800 mb-8 text-center">
            Required Plan Components
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {planComponents.map((component) => {
              const IconComponent = component.icon;
              return (
                <div key={component.id} className="flex items-center p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors duration-200">
                  <div className="flex items-center justify-center w-10 h-10 bg-blue-500 rounded-md mr-4 flex-shrink-0">
                    <IconComponent size={20} className="text-white" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-gray-700 mr-2">
                      {component.id}.
                    </span>
                    <span className="text-sm text-gray-600">
                      {component.title}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* User Access Levels */}
        <div className="mb-16">
          <h3 className="text-3xl font-bold text-gray-800 mb-8 text-center">
            User Access Levels
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {accessLevels.map((level, index) => (
              <div key={index} className="bg-gray-50 p-8 rounded-xl border border-gray-200 text-center hover:shadow-md transition-shadow duration-200">
                <div className={`inline-flex items-center justify-center w-15 h-15 ${level.color} rounded-full mb-4`}>
                  <Users size={28} className="text-white" />
                </div>
                <h4 className="text-xl font-semibold text-gray-800 mb-2">
                  {level.level}
                </h4>
                <p className="text-gray-600 text-sm leading-relaxed m-0">
                  {level.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="text-center border-t border-gray-200 pt-12 mt-16">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded-lg transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 mr-4"
          >
            <ArrowLeft size={20} />
            Back to Home
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
          >
            Get Started
            <ArrowRight size={20} />
          </Link>
        </div>
      </div>
    </div>
  );
}