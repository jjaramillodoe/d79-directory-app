'use client';

import { useState, useEffect, useRef } from 'react';
import { FileText, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import formQuestionsData from '../../data/formQuestions.json';

const Step1TableOfContents = ({ stepData, updateStepData, isActive, navigateToStep, allStepData, currentStep }) => {
  const [questions] = useState(() => {
    const step = formQuestionsData.steps.find(s => s.key === 'tableOfContents');
    return step ? step.questions : [];
  });

  const [formData, setFormData] = useState({});
  const isInitialMount = useRef(true);
  const lastStepRef = useRef(currentStep);
  const lastStepDataRef = useRef(null);

  useEffect(() => {
    // Sync with stepData when:
    // 1. Initial mount (component just loaded)
    // 2. Step changes (navigating to different step)
    // 3. stepData changes from empty to having data (form data loaded after component mount)
    const stepDataChanged = lastStepDataRef.current !== stepData;
    const stepDataHasContent = stepData && Object.keys(stepData).length > 0;
    const localDataIsEmpty = !formData || Object.keys(formData).length === 0;
    
    if (isInitialMount.current) {
      // Initial load - sync with stepData if available
      if (stepDataHasContent) {
        setFormData(stepData);
        lastStepDataRef.current = stepData;
      }
      isInitialMount.current = false;
      lastStepRef.current = currentStep;
    } else if (currentStep !== lastStepRef.current) {
      // Step changed - sync with new stepData
      if (stepDataHasContent) {
        setFormData(stepData);
        lastStepDataRef.current = stepData;
      }
      lastStepRef.current = currentStep;
    } else if (stepDataChanged && stepDataHasContent && localDataIsEmpty) {
      // stepData was loaded after component mount (race condition fix)
      // Only sync if local data is empty to avoid overwriting user input
      setFormData(stepData);
      lastStepDataRef.current = stepData;
    }
  }, [currentStep, stepData, formData]);

  const handleInputChange = (questionId, value) => {
    const newFormData = { ...formData, [questionId]: value };
    setFormData(newFormData);
    updateStepData('tableOfContents', newFormData);
  };

  // Map step numbers to step keys for checking completion status
  const getStepKey = (stepNum) => {
    const stepMap = {
      1: 'tableOfContents',
      2: 'childAbuseIntervention',
      3: 'sexualHarassment',
      4: 'respectForAll',
      5: 'suicidePrevention',
      6: 'attendancePlan',
      7: 'temporaryHousing',
      8: 'serviceInSchools',
      9: 'planningInterviews',
      10: 'militaryRecruitment',
      11: 'schoolCulture',
      12: 'afterSchoolPrograms',
      13: 'cellPhonePolicy',
      14: 'counselingPlan'
    };
    return stepMap[stepNum];
  };

  // Check if a step is completed
  const isStepCompleted = (stepNum) => {
    if (!allStepData) return false;
    const stepKey = getStepKey(stepNum);
    return allStepData[stepKey]?.completed === true;
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
          <label htmlFor={question.id} className="text-base text-gray-700 cursor-pointer flex-1 leading-relaxed">
            {question.title}
          </label>
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
            <FileText className="w-8 h-8 text-blue-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-3xl font-bold text-white mb-2">
              Section 1: Table of Contents
            </h2>
            <p className="text-blue-100 text-lg">
              Review and confirm understanding of the comprehensive school plan structure
            </p>
          </div>
        </div>
        
        {/* Plan Sections List */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 mt-6">
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Complete School Plan Sections
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { num: 1, title: 'Table of Contents' },
              { num: 2, title: 'Child Abuse and Neglect Intervention and Prevention School Plan' },
              { num: 3, title: 'Student to Student Sexual Harassment' },
              { num: 4, title: 'Respect For All Plan' },
              { num: 5, title: 'Suicide Prevention and School Crisis Intervention Plan' },
              { num: 6, title: 'School Attendance Plan' },
              { num: 7, title: 'Students in Temporary Housing (STH) Program Plan' },
              { num: 8, title: 'Service In Schools Plan' },
              { num: 9, title: 'Planning Interviews' },
              { num: 10, title: 'Military Recruitment OPT-OUT Notification' },
              { num: 11, title: 'School Culture Plan' },
              { num: 12, title: 'After School Programs' },
              { num: 13, title: 'Cell Phone Policy' },
              { num: 14, title: 'School Counseling Plan' }
            ].map((section) => {
              const isCompleted = isStepCompleted(section.num);
              const isCurrentStep = currentStep === section.num;
              
              return (
                <button
                  key={section.num}
                  onClick={() => navigateToStep && navigateToStep(section.num)}
                  className={`flex items-start gap-3 text-left p-3 rounded-lg transition-all duration-200 ${
                    isCurrentStep
                      ? 'bg-white/30 hover:bg-white/40 shadow-md'
                      : 'hover:bg-white/20 hover:shadow-sm'
                  } ${navigateToStep ? 'cursor-pointer' : 'cursor-default'}`}
                  disabled={!navigateToStep}
                >
                  <span className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold transition-colors ${
                    isCompleted
                      ? 'bg-green-500/90 text-white'
                      : isCurrentStep
                      ? 'bg-white/30 text-white'
                      : 'bg-white/20 text-white'
                  }`}>
                    {isCompleted ? '✓' : section.num}
                  </span>
                  <div className="flex-1 flex items-center justify-between gap-2">
                    <span className="text-sm leading-relaxed text-white font-medium">
                      {section.title}
                    </span>
                    {navigateToStep && section.num !== currentStep && (
                      <ArrowRight className="w-4 h-4 text-white/70 flex-shrink-0" />
                    )}
                  </div>
                </button>
              );
            })}
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
            <span className="text-lg font-bold text-blue-800">What This Step Covers</span>
          </div>
          <p className="text-blue-700 leading-relaxed">
            This step confirms your understanding of the 14-step school plan structure and prepares you for the comprehensive planning process.
          </p>
        </div>
        
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-400 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-yellow-600 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
            <span className="text-lg font-bold text-yellow-800">Getting Started</span>
          </div>
          <p className="text-yellow-800 leading-relaxed">
            Review the table of contents to understand what each step will require and how they work together to create a comprehensive school plan.
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
                {question.question_number}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-800 mb-3 whitespace-pre-line leading-relaxed">
                  {question.title}
                </h3>
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
            <FileText className="w-6 h-6 text-blue-600" />
          </div>
          <span className="text-xl font-bold text-white">Ready to Proceed?</span>
        </div>
        <p className="text-blue-50 leading-relaxed">
          Once you've reviewed the table of contents and confirmed your understanding, you can proceed to the next step. Each subsequent step will guide you through creating specific components of your school plan.
        </p>
      </div>
    </div>
  );
};

export default Step1TableOfContents;