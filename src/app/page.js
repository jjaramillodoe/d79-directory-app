'use client';

import Link from 'next/link'
import Image from 'next/image'
import { 
  Lock, 
  MessageCircle, 
  User, 
  Users, 
  Info, 
  LogIn, 
  FileText, 
  Calendar, 
  Shield, 
  Building2,
  CheckCircle,
  GraduationCap
} from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-white">

      <main className="relative z-10 min-h-screen">
        
        {/* Hero Section - Blue Background */}
        <div className="w-full bg-gradient-to-br from-blue-600 to-blue-800 py-24">
          <div className="max-w-[140rem] mx-auto px-8">
            <div className="text-center mb-16 animate-[fadeInDown_0.8s_ease-out]">
              <div className="inline-flex items-center gap-3 bg-white/20 backdrop-blur-md px-6 py-3 border border-white/30 mb-8">
                <Building2 className="w-6 h-6 text-white" />
                <span className="text-white font-semibold text-lg">NYC District 79</span>
              </div>
              
              <h1 className="text-6xl md:text-7xl lg:text-8xl font-extrabold text-white leading-tight mb-6">
                District 79
                <span className="block text-5xl md:text-6xl lg:text-7xl text-blue-200 mt-2">
                  Directory
                </span>
              </h1>
              
              <p className="text-2xl md:text-3xl text-white/90 font-light leading-relaxed max-w-4xl mx-auto mb-8">
                School Plans Management System for the 2025-2026 academic year
              </p>
              
              {/* Consolidated School Plan Badge */}
              <div className="inline-flex items-center gap-4 bg-white px-8 py-4 shadow-xl mb-12">
                <FileText className="w-8 h-8 text-blue-600" />
                <span className="text-blue-600 font-bold text-xl">
                  Consolidated School Plan
                </span>
                <Calendar className="w-8 h-8 text-amber-600" />
                <span className="text-gray-700 font-semibold text-xl">
                  2025-2026
                </span>
              </div>
              
              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                <Link 
                  href="/login" 
                  className="inline-flex items-center gap-4 bg-white text-blue-600 px-12 py-5 font-bold text-xl transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105 transform"
                >
                  <div className="bg-blue-600 w-10 h-10 flex items-center justify-center">
                    <LogIn className="w-5 h-5 text-white" />
                  </div>
                  <span>Access System</span>
                </Link>
                <Link 
                  href="/about" 
                  className="inline-flex items-center gap-4 bg-white/20 text-white px-12 py-5 font-bold text-xl transition-all duration-300 border-2 border-white/40 hover:bg-white/30 hover:scale-105 transform"
                >
                  <Info className="w-5 h-5" />
                  <span>Learn More</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Section - Light Gray Background */}
        <div className="w-full bg-gray-50 py-20">
          <div className="max-w-[140rem] mx-auto px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">System Overview</h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Comprehensive school plans management with real-time tracking and secure compliance monitoring
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Stat 1 */}
              <div className="text-center animate-[fadeInUp_0.8s_ease-out_0.2s_both]">
                <div className="bg-white p-8 shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300">
                  <div className="w-20 h-20 bg-blue-600 mx-auto mb-6 flex items-center justify-center">
                    <FileText className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-5xl font-bold text-gray-900 mb-2">14</h3>
                  <p className="text-xl text-gray-600 mb-4">Required Plans</p>
                  <div className="w-full bg-gray-200 h-3 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 w-4/5"></div>
                  </div>
                </div>
              </div>
              
              {/* Stat 2 */}
              <div className="text-center animate-[fadeInUp_0.8s_ease-out_0.3s_both]">
                <div className="bg-white p-8 shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300">
                  <div className="w-20 h-20 bg-green-600 mx-auto mb-6 flex items-center justify-center">
                    <Shield className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-5xl font-bold text-gray-900 mb-2">Secure</h3>
                  <p className="text-xl text-gray-600 mb-4">Compliance</p>
                  <div className="w-full bg-gray-200 h-3 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-green-500 to-green-600 w-full"></div>
                  </div>
                </div>
              </div>
              
              {/* Stat 3 */}
              <div className="text-center animate-[fadeInUp_0.8s_ease-out_0.4s_both]">
                <div className="bg-white p-8 shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300">
                  <div className="w-20 h-20 bg-amber-600 mx-auto mb-6 flex items-center justify-center">
                    <GraduationCap className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-5xl font-bold text-gray-900 mb-2">24</h3>
                  <p className="text-xl text-gray-600 mb-4">Schools Served</p>
                  <div className="w-full bg-gray-200 h-3 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-amber-500 to-amber-600 w-3/4"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Access Section - White Background */}
        <div className="w-full bg-white py-20">
          <div className="max-w-[140rem] mx-auto px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              
              {/* Left Side - Access Info */}
              <div className="animate-[fadeInLeft_0.8s_ease-out_0.3s_both]">
                <div className="flex items-center gap-6 mb-8">
                  <div className="w-24 h-24 bg-amber-600 flex items-center justify-center">
                    <Shield className="w-12 h-12 text-white" />
                  </div>
                  <div>
                    <h2 className="text-4xl font-bold text-gray-900 mb-2">
                      Access Restricted
                    </h2>
                    <p className="text-xl text-gray-600">Authorized Personnel Only</p>
                  </div>
                </div>
                
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <Lock className="w-6 h-6 text-amber-600 mt-2 flex-shrink-0" />
                    <div>
                      <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                        Restricted Access
                      </h3>
                      <p className="text-lg text-gray-700 leading-relaxed">
                        This system is restricted to Principals and Authorized Staff only. 
                        If you are not authorized to access this system, please contact your District Administrator 
                        or the Office of Safety and Youth Development for access credentials.
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-amber-50 p-6 border border-amber-200">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                      <span className="text-lg font-medium text-gray-900">Verified @schools.nyc.gov emails required</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Right Side - Support Info */}
              <div className="animate-[fadeInRight_0.8s_ease-out_0.4s_both]">
                <div className="flex items-center gap-6 mb-8">
                  <div className="w-24 h-24 bg-blue-600 flex items-center justify-center">
                    <MessageCircle className="w-12 h-12 text-white" />
                  </div>
                  <div>
                    <h2 className="text-4xl font-bold text-gray-900 mb-2">
                      Need Help?
                    </h2>
                    <p className="text-xl text-gray-600">Technical Support & Access Issues</p>
                  </div>
                </div>
                
                <div className="space-y-8">
                  {/* Contact 1 */}
                  <div className="bg-gray-50 p-6 border border-gray-200 hover:bg-gray-100 transition-all duration-300">
                    <div className="flex items-start gap-6">
                      <div className="w-16 h-16 bg-blue-600 flex items-center justify-center flex-shrink-0">
                        <User className="w-8 h-8 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">
                          Javier Jaramillo
                        </h3>
                        <p className="text-lg text-gray-600 italic mb-4">
                          Data Systems Administrator
                        </p>
                        <a 
                          href="mailto:jjaramillo7@schools.nyc.gov" 
                          className="text-blue-600 hover:text-blue-700 transition-colors text-lg font-medium"
                        >
                          jjaramillo7@schools.nyc.gov
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Contact 2 */}
                  <div className="bg-gray-50 p-6 border border-gray-200 hover:bg-gray-100 transition-all duration-300">
                    <div className="flex items-start gap-6">
                      <div className="w-16 h-16 bg-blue-600 flex items-center justify-center flex-shrink-0">
                        <Users className="w-8 h-8 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">
                          Veronica Pichardo
                        </h3>
                        <p className="text-lg text-gray-600 italic mb-4">
                          Executive Director of School Support and Operations
                        </p>
                        <a 
                          href="mailto:VPichardo@schools.nyc.gov" 
                          className="text-blue-600 hover:text-blue-700 transition-colors text-lg font-medium"
                        >
                          VPichardo@schools.nyc.gov
                        </a>
                      </div>
                    </div>
                  </div>
                  
                  {/* Additional Info */}
                  <div className="bg-blue-50 p-6 border border-blue-200">
                    <div className="flex items-start gap-4">
                      <Info className="w-6 h-6 text-blue-600 mt-2 flex-shrink-0" />
                      <div>
                        <h4 className="text-xl font-semibold text-gray-900 mb-3">
                          Quick Support
                        </h4>
                        <p className="text-lg text-gray-700 leading-relaxed">
                          For immediate assistance with login issues or system access, please contact your District Administrator 
                          or reach out to our support team using the contact information above.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Year Banner Section - Blue Background */}
        <div className="w-full bg-gradient-to-r from-blue-600 to-blue-700 py-16">
          <div className="max-w-[140rem] mx-auto px-8">
            <div className="text-center animate-[fadeInUp_0.8s_ease-out_0.5s_both]">
              <div className="flex items-center justify-center gap-6">
                <Calendar className="w-12 h-12 text-white" />
                <div>
                  <h3 className="text-3xl font-bold text-white mb-2">
                    Academic Year 2025-2026
                  </h3>
                  <p className="text-xl text-white/90">
                    District 79 Alternative Schools
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer with Logos */}
      <footer className="relative z-10 bg-gray-100 py-16">
        <div className="max-w-[140rem] mx-auto px-8">
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12 mb-8">
            {/* D79 Logo */}
            <div className="flex flex-col items-center gap-3">
              <div className="bg-white p-4 shadow-lg border border-gray-200 transition-transform hover:scale-105">
                <Image
                  src="/images/d79logo.png"
                  alt="District 79 Logo"
                  width={80}
                  height={80}
                  className="object-contain"
                  priority
                />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-800">NYC District 79</p>
                <p className="text-xs text-gray-600">Alternative Schools</p>
              </div>
            </div>
            
            {/* Divider */}
            <div className="hidden md:block w-px h-24 bg-gradient-to-b from-transparent via-gray-300 to-transparent"></div>
            
            {/* NYC Public Schools Logo */}
            <div className="flex flex-col items-center gap-3">
              <div className="bg-white p-4 shadow-lg border border-gray-200 transition-transform hover:scale-105">
                <Image
                  src="/images/nycpublicshools.png"
                  alt="NYC Public Schools Logo"
                  width={180}
                  height={60}
                  className="object-contain"
                  priority
                />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-800">NYC Department of Education</p>
                <p className="text-xs text-gray-600">Public Schools</p>
              </div>
            </div>
          </div>
          
          {/* Developer Credit */}
          <div className="text-center mb-6">
            <p className="text-sm text-gray-600">
              Developed by <span className="font-semibold text-gray-800">Javier Jaramillo</span> for District 79 Alternative Schools
            </p>
          </div>
          
          {/* Copyright/Info */}
          <div className="text-center">
            <p className="text-xs text-gray-600 flex items-center justify-center gap-2 mb-2">
              <Shield className="w-3 h-3" />
              <span>Secure School Plans Management System</span>
            </p>
            <p className="text-xs text-gray-500">
              © 2025 NYC District 79 • All Rights Reserved
            </p>
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fadeInLeft {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes fadeInRight {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  )
}