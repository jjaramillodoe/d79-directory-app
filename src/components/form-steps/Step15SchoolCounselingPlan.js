'use client';

import { useState, useEffect } from 'react';
import { Heart, CheckCircle, AlertCircle, FileText, Shield, Users, Clock, UserCheck } from 'lucide-react';
import formQuestionsData from '../../data/formQuestions.json';

export default function Step15SchoolCounselingPlan({ stepData, updateStepData }) {
  const [questions] = useState(() => {
    const step = formQuestionsData.steps.find(s => s.key === 'counselingPlan');
    return step ? step.questions : [];
  });

  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (stepData) {
      // stepData is already the actual data object, not wrapped in .data
      setFormData(stepData);
    }
  }, [stepData]);

  const handleInputChange = (questionId, value) => {
    const newFormData = { ...formData, [questionId]: value };
    setFormData(newFormData);
    updateStepData('counselingPlan', newFormData);
  };

  const renderQuestion = (question) => {
    const value = formData[question.id] || (question.type === 'checkbox' ? false : '');

    if (question.type === 'checkbox') {
      return (
        <div className="flex items-start gap-4">
          <input
            type="checkbox"
            id={question.id}
            checked={value}
            onChange={(e) => handleInputChange(question.id, e.target.checked)}
            className="mt-1 w-5 h-5 text-blue-600 bg-white border-gray-300 rounded-md focus:ring-blue-500 focus:ring-2 cursor-pointer"
          />
          <label htmlFor={question.id} className="text-base text-gray-700 cursor-pointer flex-1 whitespace-pre-line leading-relaxed">
            {question.title}
          </label>
        </div>
      );
    }

    if (question.type === 'text') {
      return (
        <div>
          <input
            type="text"
            id={question.id}
            value={value}
            onChange={(e) => handleInputChange(question.id, e.target.value)}
            placeholder={question.placeholder}
            className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-400"
          />
        </div>
      );
    }

    return (
      <div>
        <textarea
          id={question.id}
          value={value}
          onChange={(e) => handleInputChange(question.id, e.target.value)}
          placeholder={question.placeholder}
          rows={6}
          className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-none hover:border-gray-400"
        />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-8 mb-8 shadow-lg">
        <div className="flex items-center gap-6 mb-6">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-md">
            <Heart className="w-8 h-8 text-blue-700" />
          </div>
          <div className="flex-1">
            <h2 className="text-3xl font-bold text-white mb-2">
              Section 14: School Counseling Plan
            </h2>
            <p className="text-blue-100 text-lg">
              Comprehensive school counseling program and services
            </p>
          </div>
        </div>

        {/* Important Information */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 mt-6">
          <div className="text-white space-y-3">
            <p className="leading-relaxed">
              NYSED state law requires certified school counselors to design and develop comprehensive school counseling programs in collaboration with school administration and staff.
            </p>
            <p className="leading-relaxed">
              The counseling plan coordinator is responsible for developing the plan, attending OSYD professional development, and revising based on student needs and feedback.
            </p>
          </div>
        </div>
      </div>

      {/* Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <span className="text-lg font-bold text-blue-800">Comprehensive Program</span>
          </div>
          <p className="text-blue-700 leading-relaxed">
            This step establishes a comprehensive counseling program that supports student academic, social-emotional, and career development.
          </p>
        </div>

        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-400 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-yellow-600 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
            <span className="text-lg font-bold text-yellow-800">Student Support</span>
          </div>
          <p className="text-yellow-800 leading-relaxed">
            Ensure counseling services are accessible, responsive to student needs, and aligned with educational and developmental goals.
          </p>
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-6">
        {questions.map((question, index) => (
          <div key={question.id} className="bg-white border-2 border-gray-200 rounded-xl p-8 shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-200">
            {/* Question Header */}
            <div className="flex items-start gap-4 mb-6">
              <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-xl flex items-center justify-center font-bold text-lg shadow-md">
                {index + 1}
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-bold text-gray-800 mb-3 whitespace-pre-line leading-relaxed">
                  {question.title}
                </h4>
                {question.description && (
                  <p className="text-gray-600 leading-relaxed whitespace-pre-line">
                    {question.description}
                  </p>
                )}
              </div>
            </div>
            
            {/* Question Input */}
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              {renderQuestion(question)}
            </div>
            
            {/* Required Field Indicator */}
            {question.required && (
              <div className="mt-4 flex items-center gap-2 text-red-600">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span className="text-sm font-medium">This field is required</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer Alert */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 shadow-lg">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
            <Heart className="w-6 h-6 text-blue-700" />
          </div>
          <span className="text-xl font-bold text-white">Complete Your School Plan</span>
        </div>
        <p className="text-blue-50 leading-relaxed">
          Congratulations on completing all sections! Your comprehensive counseling plan supports student well-being and success. Once you've confirmed all information, you can proceed to submit your completed School Plan Form for administrative review.
        </p>
      </div>
    </div>
  );
}
