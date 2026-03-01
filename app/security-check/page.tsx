'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import SecurityQuestionnaire from '../../components/SecurityQuestionnaire';
import { SECURITY_QUESTIONNAIRE } from '../../backend/lib/security-questionnaire';

interface AssessmentResult {
  assessmentId: string;
  riskScore: number;
  severity: string;
  recommendations: Array<{
    id: string;
    issue: string;
    suggestion: string;
    priority: number;
  }>;
}

export default function SecurityCheckPage() {
  const router = useRouter();
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<AssessmentResult | null>(null);

  const handleSubmit = async (
    responses: Array<{ questionId: string; response: string }>
  ): Promise<void> => {
    // Call API to submit questionnaire
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ responses }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to submit questionnaire');
    }

    return response.json();
  };

  const handleComplete = (result: AssessmentResult) => {
    setResults(result);
    setShowResults(true);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low':
        return 'text-green-600 bg-green-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'high':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getSeverityLabel = (severity: string) => {
    return severity.charAt(0).toUpperCase() + severity.slice(1) + ' Risk';
  };

  if (showResults && results) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-md p-8 mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Security Assessment Results
            </h1>
            
            {/* Risk Score */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-gray-600 mb-2">Overall Security Score</p>
                <div className="flex items-baseline">
                  <span className="text-5xl font-bold text-gray-900">
                    {results.riskScore}
                  </span>
                  <span className="text-2xl text-gray-500 ml-2">/ 100</span>
                </div>
              </div>
              <div>
                <span
                  className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${getSeverityColor(
                    results.severity
                  )}`}
                >
                  {getSeverityLabel(results.severity)}
                </span>
              </div>
            </div>

            {/* Score interpretation */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-900">
                {results.riskScore >= 80
                  ? 'Excellent! Your security practices are strong. Keep up the good work and review the recommendations below for further improvements.'
                  : results.riskScore >= 60
                  ? 'Good start! You have some security measures in place, but there are important areas that need attention. Review the recommendations below.'
                  : results.riskScore >= 40
                  ? 'Your business has moderate security risks. We strongly recommend implementing the suggestions below to protect your data and systems.'
                  : 'Your business faces significant security risks. Please prioritize the recommendations below to protect your business from cyber threats.'}
              </p>
            </div>
          </div>

          {/* Recommendations */}
          {results.recommendations.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Recommended Actions
              </h2>
              <div className="space-y-4">
                {results.recommendations
                  .sort((a, b) => a.priority - b.priority)
                  .map((rec) => (
                    <div
                      key={rec.id}
                      className="border border-gray-200 rounded-lg p-6 hover:border-blue-300 transition-colors"
                    >
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-600 font-semibold text-sm">
                            {rec.priority}
                          </span>
                        </div>
                        <div className="ml-4 flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {rec.issue}
                          </h3>
                          <p className="text-gray-700">{rec.suggestion}</p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="mt-8 flex justify-center space-x-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              View Dashboard
            </button>
            <button
              onClick={() => {
                setShowResults(false);
                setResults(null);
              }}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
            >
              Take Assessment Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Cybersecurity Readiness Assessment
        </h1>
        <p className="text-gray-600">
          Answer these questions to assess your business's cybersecurity practices and
          receive personalized recommendations for improvement.
        </p>
      </div>

      <SecurityQuestionnaire
        questions={SECURITY_QUESTIONNAIRE}
        onSubmit={handleSubmit}
        onComplete={handleComplete}
      />
    </div>
  );
}
