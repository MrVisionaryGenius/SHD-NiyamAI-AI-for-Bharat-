'use client';

import { useState } from 'react';
import { SecurityQuestion } from '../types';

interface SecurityQuestionnaireProps {
  questions: SecurityQuestion[];
  onSubmit: (responses: Array<{ questionId: string; response: string }>) => Promise<void>;
  onComplete: (result: {
    assessmentId: string;
    riskScore: number;
    severity: string;
    recommendations: Array<{
      id: string;
      issue: string;
      suggestion: string;
      priority: number;
    }>;
  }) => void;
}

export default function SecurityQuestionnaire({
  questions,
  onSubmit,
  onComplete
}: SecurityQuestionnaireProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Group questions by category
  const categories = ['passwords', 'devices', 'data', 'access'] as const;
  const questionsByCategory = categories.map(category => ({
    category,
    questions: questions.filter(q => q.category === category)
  }));

  const currentCategory = questionsByCategory[currentStep];
  const totalSteps = questionsByCategory.length;
  const isLastStep = currentStep === totalSteps - 1;

  // Check if all questions in current category are answered
  const isCurrentStepComplete = currentCategory.questions.every(
    q => responses[q.id]
  );

  const handleResponseChange = (questionId: string, value: string) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value
    }));
    setError(null);
  };

  const handleNext = () => {
    if (!isCurrentStepComplete) {
      setError('Please answer all questions before continuing');
      return;
    }

    if (isLastStep) {
      handleSubmit();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      setError(null);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Convert responses to array format
      const responseArray = Object.entries(responses).map(([questionId, response]) => ({
        questionId,
        response
      }));

      const result = await onSubmit(responseArray);
      onComplete(result as any);
    } catch (err) {
      setError((err as Error).message || 'Failed to submit questionnaire. Please try again.');
      setIsSubmitting(false);
    }
  };

  const getCategoryTitle = (category: string) => {
    const titles: Record<string, string> = {
      passwords: 'Password & Authentication',
      devices: 'Device Security',
      data: 'Data Management',
      access: 'Access Control'
    };
    return titles[category] || category;
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">
            Step {currentStep + 1} of {totalSteps}
          </span>
          <span className="text-sm text-gray-500">
            {getCategoryTitle(currentCategory.category)}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Category title */}
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        {getCategoryTitle(currentCategory.category)}
      </h2>

      {/* Questions */}
      <div className="space-y-6">
        {currentCategory.questions.map((question) => (
          <div key={question.id} className="bg-white border border-gray-200 rounded-lg p-6">
            <label className="block text-lg font-medium text-gray-900 mb-4">
              {question.text}
            </label>
            <div className="space-y-3">
              {question.options.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    responses[question.id] === option.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name={question.id}
                    value={option.value}
                    checked={responses[question.id] === option.value}
                    onChange={(e) => handleResponseChange(question.id, e.target.value)}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-3 text-gray-700">{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="mt-8 flex justify-between">
        <button
          onClick={handleBack}
          disabled={currentStep === 0 || isSubmitting}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            currentStep === 0 || isSubmitting
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Back
        </button>

        <button
          onClick={handleNext}
          disabled={!isCurrentStepComplete || isSubmitting}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            !isCurrentStepComplete || isSubmitting
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isSubmitting ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Submitting...
            </span>
          ) : isLastStep ? (
            'Submit Assessment'
          ) : (
            'Next'
          )}
        </button>
      </div>
    </div>
  );
}
