'use client';

import { useState, useEffect } from 'react';
import { Shield, CheckCircle, AlertCircle } from 'lucide-react';
import formQuestionsData from '../../data/formQuestions.json';

const Step13AfterSchoolPrograms = ({ stepData, updateStepData, isActive }) => {
  const [questions] = useState(() => {
    const step = formQuestionsData.steps.find(s => s.key === 'afterSchoolPrograms');
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
    updateStepData('afterSchoolPrograms', newFormData);
  };

  const renderQuestion = (question) => {
    const value = formData[question.id] || (question.type === 'checkbox' ? false : '');

    if (question.type === 'checkbox') {
      return (
          <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg border-2 border-gray-200 hover:border-blue-300 transition-colors duration-200">
          <input
            type="checkbox"
            id={question.id}
            checked={value}
            onChange={(e) => handleInputChange(question.id, e.target.checked)}
            className="mt-1 w-5 h-5 text-blue-600 bg-white border-gray-300 rounded-md focus:ring-blue-500 focus:ring-2 cursor-pointer"
          />
          <label htmlFor={question.id} className="text-base text-gray-700 cursor-pointer flex-1 whitespace-pre-line">
            {question.title}
          </label>
        </div>
      );
    }

    if (question.type === 'text') {
      return (
        <input
          type="text"
          id={question.id}
          value={value}
          onChange={(e) => handleInputChange(question.id, e.target.value)}
          placeholder={question.placeholder}
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-400"
        />
      );
    }

    return (
      <div>
        <label htmlFor={question.id} className="block text-base font-semibold text-gray-700 mb-3 whitespace-pre-line">
          {question.title}
        </label>
        <textarea
          id={question.id}
          value={value}
          onChange={(e) => handleInputChange(question.id, e.target.value)}
          placeholder={question.placeholder}
          rows={5}
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-none hover:border-gray-400"
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
            <Shield className="w-8 h-8 text-blue-700" />
          </div>
          <div className="flex-1">
            <h2 className="text-3xl font-bold text-white mb-2">
              Section 12: After School Programs
            </h2>
            <p className="text-blue-100 text-lg">
              After-school program offerings and coordination
            </p>
          </div>
        </div>
        
        {/* Important Information */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 mt-6">
          <div className="text-white space-y-3">
            <p className="leading-relaxed">
              If you have any questions on how to complete the After School Programs section of the Consolidated Plan, please contact Michelle Rosa at{' '}
              <a 
                href="mailto:MRosa28@schools.nyc.gov" 
                className="underline hover:text-blue-100 transition-colors font-semibold"
              >
                MRosa28@schools.nyc.gov
              </a>
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
            <span className="text-lg font-bold text-blue-800">Program Offerings</span>
          </div>
          <p className="text-blue-700 leading-relaxed">
            This step establishes protocols for after-school program offerings that support student enrichment and development beyond regular school hours.
          </p>
        </div>
        
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
            <span className="text-lg font-bold text-blue-800">Program Coordination</span>
          </div>
          <p className="text-blue-700 leading-relaxed">
            Ensure after-school programs are well-coordinated, accessible to all students, and aligned with educational goals.
          </p>
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-6">
        {questions.map((question, index) => (
          <div key={question.id} className="bg-white border-2 border-gray-200 rounded-xl p-8 shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-200">
            <div className="mb-6">
              <div className="flex items-start gap-4 mb-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold text-sm">
                  {question.question_number}
                </div>
                <h3 className="text-xl font-bold text-gray-800 flex-1 whitespace-pre-line">
                  {question.title}
                </h3>
              </div>
              {question.description && (
                <p className="text-gray-600 ml-12 leading-relaxed whitespace-pre-line">
                  {question.description}
                </p>
              )}
            </div>
            
            <div className="ml-12">
              {renderQuestion(question)}
            </div>
            
            {question.required && (
              <p className="text-red-600 text-sm mt-3 ml-12 flex items-center gap-1">
                <span className="text-red-500">*</span>
                This field is required
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Footer Alert */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 shadow-lg">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
            <Shield className="w-6 h-6 text-blue-700" />
          </div>
          <span className="text-xl font-bold text-white">Enriching Student Experiences</span>
        </div>
        <p className="text-blue-50 leading-relaxed">
          After-school programs provide valuable opportunities for student enrichment and development. Ensure all programs are well-planned, accessible, and provide meaningful experiences that support academic and personal growth.
        </p>
      </div>
    </div>
  );
};

export default Step13AfterSchoolPrograms;
