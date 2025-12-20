'use client';

import { useState, useEffect, useRef } from 'react';
import { FileText, CheckCircle, AlertCircle } from 'lucide-react';
import formQuestionsData from '../../data/formQuestions.json';

const Step2PrincipalLetter = ({ stepData, updateStepData, isActive, currentStep }) => {
  const [questions] = useState(() => {
    const step = formQuestionsData.steps.find(s => s.key === 'principalLetter');
    return step ? step.questions : [];
  });

  const [formData, setFormData] = useState({});
  const isInitialMount = useRef(true);
  const lastStepRef = useRef(currentStep);

  useEffect(() => {
    // Only update formData on initial mount or when step actually changes
    // This prevents overwriting user input during auto-save
    if (isInitialMount.current) {
      // Initial load - sync with stepData
      if (stepData) {
        setFormData(stepData);
      }
      isInitialMount.current = false;
      lastStepRef.current = currentStep;
    } else if (currentStep !== lastStepRef.current) {
      // Step changed - sync with new stepData
      if (stepData) {
        setFormData(stepData);
      }
      lastStepRef.current = currentStep;
    }
    // Don't update on every stepData change - this prevents race conditions with auto-save
  }, [currentStep]); // Only depend on currentStep, not stepData

  const handleInputChange = (questionId, value) => {
    const newFormData = { ...formData, [questionId]: value };
    setFormData(newFormData);
    updateStepData('principalLetter', newFormData);
  };

  const renderQuestion = (question) => {
    const value = formData[question.id] || (question.type === 'checkbox' ? false : '');

    if (question.type === 'checkbox') {
      return (
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id={question.id}
            checked={value}
            onChange={(e) => handleInputChange(question.id, e.target.checked)}
            className="mt-1 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
          />
          <label htmlFor={question.id} className="text-sm text-gray-700">
            {question.title}
          </label>
        </div>
      );
    }

    return (
      <div>
        <label htmlFor={question.id} className="block text-sm font-medium text-gray-700 mb-2">
          {question.title}
        </label>
        <textarea
          id={question.id}
          value={value}
          onChange={(e) => handleInputChange(question.id, e.target.value)}
          placeholder={question.placeholder}
          rows={6}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-100 border-2 border-green-200 rounded-xl p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-green-800">
              Step 2: Principal Letter
            </h2>
            <p className="text-green-600">
              Demonstrate leadership commitment to school plan implementation
            </p>
          </div>
        </div>
      </div>

      {/* Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="font-semibold text-green-800">Leadership Statement</span>
          </div>
          <p className="text-green-700 text-sm">
            This letter demonstrates your commitment as principal to implementing the comprehensive school plan and supporting staff throughout the process.
          </p>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-blue-800">Writing Guidelines</span>
          </div>
          <p className="text-blue-700 text-sm">
            Focus on commitment, support, and vision for the school plan. This letter will be shared with staff and stakeholders.
          </p>
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-6">
        {questions.map((question) => (
          <div key={question.id} className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                {question.title}
              </h3>
              {question.description && (
                <p className="text-gray-600 text-sm mb-3">
                  {question.description}
                </p>
              )}
            </div>
            
            {renderQuestion(question)}
            
            {question.required && (
              <p className="text-red-600 text-sm mt-2">
                * This field is required
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Footer Alert */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-green-600" />
          <span className="font-semibold text-green-800">Leadership Commitment</span>
        </div>
        <p className="text-green-700 text-sm mt-2">
          Your letter sets the tone for the entire school plan implementation. It should inspire confidence and commitment from your staff while clearly outlining your vision and support for the process.
        </p>
      </div>
    </div>
  );
};

export default Step2PrincipalLetter;