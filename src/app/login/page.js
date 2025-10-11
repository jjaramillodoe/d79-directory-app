'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { 
  LogIn, 
  Loader2, 
  Shield, 
  Building2, 
  Users, 
  FileText, 
  CheckCircle,
  ArrowRight,
  Mail,
  Lock
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if user is already logged in
    const checkSession = async () => {
      const session = await getSession();
      if (session) {
        router.push('/dashboard');
      }
    };
    checkSession();
  }, [router]);

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const result = await signIn('google', {
        callbackUrl: '/dashboard',
        redirect: false,
      });

      if (result?.error) {
        setError('Sign in failed. Please ensure you are using a @schools.nyc.gov email address and that your account is authorized.');
      } else if (result?.url) {
        router.push(result.url);
      }
    } catch (error) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex">
      {/* Left Side - Branding and Information */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-blue-800 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat'
          }}></div>
        </div>
        
        <div className="relative z-10 flex flex-col justify-center px-12 py-16 text-white">
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold">District 79</h1>
                <p className="text-blue-100 text-lg">NYC Public Schools</p>
              </div>
            </div>
            
            <h2 className="text-3xl font-bold mb-4">
              Consolidated School Plan
            </h2>
            <p className="text-xl text-blue-100 mb-8 leading-relaxed">
              Streamline your school planning process with our comprehensive digital platform for the 2025-2026 academic year.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-300" />
              </div>
              <span className="text-blue-100">14-step comprehensive planning system</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-300" />
              </div>
              <span className="text-blue-100">Real-time collaboration and review</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-300" />
              </div>
              <span className="text-blue-100">Secure document management</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-300" />
              </div>
              <span className="text-blue-100">Automated compliance tracking</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-8 py-16">
        <div className="max-w-md w-full">
          {/* Mobile Header */}
          <div className="lg:hidden text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">District 79</h1>
                <p className="text-blue-600 text-sm">NYC Public Schools</p>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Consolidated School Plan
            </h2>
            <p className="text-gray-600">
              2025-2026 Academic Year
            </p>
          </div>

          {/* Login Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Secure Access
              </h3>
              <p className="text-gray-600">
                Sign in with your NYC Public Schools account
              </p>
            </div>
            
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-6 flex items-start gap-3">
                <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-red-600 text-xs">!</span>
                </div>
                <div>
                  <p className="font-medium">Authentication Error</p>
                  <p className="text-red-600 mt-1">{error}</p>
                </div>
              </div>
            )}
            
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full flex justify-center items-center px-6 py-4 bg-white hover:bg-gray-50 disabled:bg-gray-100 text-gray-900 border-2 border-gray-200 hover:border-gray-300 disabled:border-gray-200 rounded-xl text-base font-medium cursor-pointer disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md disabled:shadow-none"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-3 animate-spin text-blue-600" />
                  <span className="text-gray-600">Signing in...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span>Continue with Google</span>
                </>
              )}
            </button>
            
            {/* Security Notice */}
            <div className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-200">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Lock className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-blue-900 mb-1">Authorized Access Only</h4>
                  <p className="text-sm text-blue-700 leading-relaxed">
                    This system is restricted to principals and school administrators with verified @schools.nyc.gov email addresses.
                  </p>
                </div>
              </div>
            </div>

            {/* Terms */}
            <div className="text-center mt-6">
              <p className="text-xs text-gray-500 leading-relaxed">
                By signing in, you agree to use this system responsibly for official school business only.
                All activities are monitored and logged for security purposes.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-8">
            <p className="text-sm text-gray-500">
              © 2025 New York City Department of Education
            </p>
            <p className="text-xs text-gray-400 mt-1">
              District 79 Consolidated School Plan System
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}