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
    <div className="min-h-screen bg-gradient-to-br from-[#639acd] to-[#4a7ba8] relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(255,255,255,0.1)_0%,transparent_50%),radial-gradient(circle_at_75%_75%,rgba(255,255,255,0.1)_0%,transparent_50%)] pointer-events-none" />

      <main className="relative z-10 flex min-h-screen flex-col items-center justify-center p-6">
        <div className="max-w-6xl w-full text-center">
          {/* Header Section */}
          <div className="mb-8 animate-[fadeInDown_0.8s_ease-out]">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-3 text-white drop-shadow-lg tracking-tight">
              District 79 Directory
            </h1>
            <p className="text-lg md:text-xl lg:text-2xl mb-3 text-white/90 font-light drop-shadow-md">
              School Plans Management System
            </p>
            
            {/* Consolidated School Plan Badge */}
            <div className="inline-flex items-center gap-2 bg-white/95 backdrop-blur-md px-6 py-3 rounded-full shadow-xl border border-white/20 mb-3">
              <FileText className="w-5 h-5 text-[#639acd]" />
              <span className="text-[#639acd] font-bold text-base md:text-lg">
                Consolidated School Plan
              </span>
              <Calendar className="w-5 h-5 text-amber-600" />
              <span className="text-gray-700 font-semibold text-base md:text-lg">
                2025-2026
              </span>
            </div>
            
            <p className="text-sm md:text-base lg:text-lg text-white/80 font-light drop-shadow-md flex items-center justify-center gap-2">
              <Building2 className="w-4 h-4" />
              NYC District 79
            </p>
          </div>

          {/* Quick Stats Banner */}
          <div className="mb-8 animate-[fadeInUp_0.8s_ease-out_0.1s_both]">
            <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-2xl border border-white/20 p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center justify-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="bg-[#639acd] rounded-full w-10 h-10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-2xl font-bold text-[#639acd] m-0">14</p>
                    <p className="text-xs text-gray-600 m-0">Required Plans</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="bg-green-600 rounded-full w-10 h-10 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-2xl font-bold text-green-700 m-0">Secure</p>
                    <p className="text-xs text-gray-600 m-0">Compliance Ready</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="bg-amber-600 rounded-full w-10 h-10 flex items-center justify-center">
                    <GraduationCap className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-2xl font-bold text-amber-700 m-0">24</p>
                    <p className="text-xs text-gray-600 m-0">Schools Served</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Cards - Compact Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 max-w-4xl mx-auto">
            {/* Disclaimer Card */}
            <div className="bg-white/95 rounded-xl p-6 shadow-2xl backdrop-blur-md border border-white/20 text-left animate-[fadeInUp_0.8s_ease-out_0.2s_both] hover:shadow-3xl transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-full w-12 h-12 flex items-center justify-center text-white shadow-lg">
                  <Shield className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-amber-800 m-0">
                  Access Restricted
                </h3>
              </div>
              <div className="flex items-start gap-2 mb-3">
                <Lock className="w-4 h-4 text-amber-600 mt-1 flex-shrink-0" />
                <p className="text-sm text-amber-800 m-0 leading-relaxed">
                  <strong>This system is restricted to Principals and Authorized Staff only.</strong> 
                  If you are not authorized to access this system, please contact your District Administrator 
                  or the Office of Safety and Youth Development for access credentials.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-amber-200 flex items-center gap-2 text-xs text-amber-700">
                <CheckCircle className="w-4 h-4" />
                <span>Authorized access only</span>
              </div>
            </div>

            {/* Support Card */}
            <div className="bg-white/95 rounded-xl p-6 shadow-2xl backdrop-blur-md border border-white/20 text-left animate-[fadeInUp_0.8s_ease-out_0.4s_both] hover:shadow-3xl transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-gradient-to-br from-[#639acd] to-[#4a7ba8] rounded-full w-12 h-12 flex items-center justify-center text-white shadow-lg">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-blue-800 m-0">
                  Need Help?
                </h3>
              </div>
              <div className="flex items-start gap-2 mb-4">
                <Info className="w-4 h-4 text-blue-600 mt-1 flex-shrink-0" />
                <p className="text-sm text-blue-800 m-0 leading-relaxed">
                  For technical support or access issues, please contact:
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-start gap-2">
                    <div className="bg-[#639acd] rounded-full w-6 h-6 flex items-center justify-center text-white flex-shrink-0">
                      <User className="w-3 h-3" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-blue-800 mb-1 text-sm">
                        Javier Jaramillo
                      </div>
                      <div className="text-xs text-gray-600 italic mb-1">
                        Data Systems Administrator
                      </div>
                      <a 
                        href="mailto:jjaramillo7@schools.nyc.gov" 
                        className="text-[#639acd] no-underline text-xs font-medium hover:underline transition-colors"
                      >
                        jjaramillo7@schools.nyc.gov
                      </a>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-start gap-2">
                    <div className="bg-[#639acd] rounded-full w-6 h-6 flex items-center justify-center text-white flex-shrink-0">
                      <Users className="w-3 h-3" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-blue-800 mb-1 text-sm">
                        Veronica Pichardo
                      </div>
                      <div className="text-xs text-gray-600 italic mb-1">
                        Executive Director of School Support and Operations
                      </div>
                      <a 
                        href="mailto:VPichardo@schools.nyc.gov" 
                        className="text-[#639acd] no-underline text-xs font-medium hover:underline transition-colors"
                      >
                        VPichardo@schools.nyc.gov
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center gap-4 flex-wrap animate-[fadeInUp_0.8s_ease-out_0.6s_both]">
            <Link 
              href="/login" 
              className="bg-gradient-to-r from-white to-blue-50 text-[#639acd] px-8 py-4 rounded-xl no-underline font-bold text-lg transition-all duration-300 shadow-2xl backdrop-blur-md border-2 border-white/40 flex items-center gap-3 hover:shadow-3xl hover:scale-105 transform hover:from-white hover:to-white"
            >
              <div className="bg-[#639acd] rounded-full w-8 h-8 flex items-center justify-center">
                <LogIn className="w-4 h-4 text-white" />
              </div>
              <span>Access System</span>
            </Link>
            <Link 
              href="/about" 
              className="bg-white/10 text-white px-8 py-4 rounded-xl no-underline font-bold text-lg transition-all duration-300 border-2 border-white/40 backdrop-blur-sm flex items-center gap-3 hover:bg-white/20 hover:border-white/60 hover:scale-105 transform"
            >
              <div className="bg-white/20 rounded-full w-8 h-8 flex items-center justify-center">
                <Info className="w-4 h-4" />
              </div>
              <span>Learn More</span>
            </Link>
          </div>

          {/* Year Banner */}
          <div className="mt-8 animate-[fadeInUp_0.8s_ease-out_0.7s_both]">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-6 py-3 inline-flex items-center gap-2 border border-white/20">
              <Calendar className="w-4 h-4 text-white/80" />
              <span className="text-white/80 text-sm font-medium">
                Academic Year 2025-2026 • District 79 Alternative Schools
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer with Logos */}
      <footer className="relative z-10 pb-6 px-6 animate-[fadeInUp_0.8s_ease-out_0.8s_both]">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-6">
            <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12">
              {/* D79 Logo */}
              <div className="flex flex-col items-center gap-3">
                <div className="bg-white rounded-full p-4 shadow-lg border border-gray-200 transition-transform hover:scale-105">
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
                <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-200 transition-transform hover:scale-105">
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
            
            {/* Copyright/Info */}
            <div className="mt-6 pt-4 border-t border-gray-200">
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
      `}</style>
    </div>
  )
}