'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/components/AuthProvider';
import { RiskScoreCard } from '@/components/RiskScoreCard';
import { ActionItemList } from '@/components/ActionItemList';
import { ReportExporter } from '@/components/ReportExporter';
import { apiClient } from '@/lib/api-client';
import { DashboardData, Assessment } from '@/types';
import Link from 'next/link';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorDisplay from '@/components/ErrorDisplay';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [selectedAssessmentIds, setSelectedAssessmentIds] = useState<string[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getDashboardData();
      setDashboardData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getAssessmentsByType = (type: 'contract' | 'invoice' | 'security') => {
    return dashboardData?.recentAssessments.filter(a => a.assessmentType === type) || [];
  };

  const toggleAssessmentSelection = (assessmentId: string) => {
    setSelectedAssessmentIds(prev => {
      if (prev.includes(assessmentId)) {
        return prev.filter(id => id !== assessmentId);
      } else {
        return [...prev, assessmentId];
      }
    });
  };

  const selectAllAssessments = () => {
    if (dashboardData) {
      setSelectedAssessmentIds(dashboardData.recentAssessments.map(a => a.id));
    }
  };

  const clearSelection = () => {
    setSelectedAssessmentIds([]);
  };

  const renderAssessmentDetail = (assessment: Assessment) => {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-xl font-semibold text-gray-900">
              {assessment.assessmentType.charAt(0).toUpperCase() + assessment.assessmentType.slice(1)} Assessment Details
            </h3>
            <button
              onClick={() => setSelectedAssessment(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="p-6">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-500">Risk Score</p>
                  <p className="text-3xl font-bold text-gray-900">{assessment.riskScore}/100</p>
                </div>
                <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                  assessment.severity === 'low' ? 'bg-green-100 text-green-800' :
                  assessment.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {assessment.severity.toUpperCase()} RISK
                </span>
              </div>
              <p className="text-sm text-gray-500">
                Created: {new Date(assessment.createdAt).toLocaleDateString()}
              </p>
            </div>

            {assessment.risks.length > 0 && (
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Identified Risks</h4>
                <div className="space-y-3">
                  {assessment.risks.map((risk, idx) => (
                    <div key={risk.id || idx} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-sm font-medium text-gray-900">{risk.category}</span>
                        <span className={`px-2 py-1 text-xs font-medium rounded ${
                          risk.severity === 'low' ? 'bg-green-100 text-green-800' :
                          risk.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {risk.severity}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{risk.description}</p>
                      {risk.location && (
                        <p className="text-xs text-gray-500">Location: {risk.location}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {assessment.recommendations.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Recommendations</h4>
                <div className="space-y-3">
                  {assessment.recommendations.map((rec, idx) => (
                    <div key={rec.id || idx} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-sm font-medium text-gray-900">{rec.issue}</span>
                        <span className="text-xs text-gray-500">Priority {rec.priority}</span>
                      </div>
                      <p className="text-sm text-gray-600">{rec.suggestion}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-bold text-gray-900">NiyamAI Dashboard</h1>
              </div>
              <div className="flex items-center space-x-4">
                <Link
                  href="/upload/contract"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Upload Contract
                </Link>
                <Link
                  href="/upload/invoice"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Upload Invoice
                </Link>
                <Link
                  href="/security-check"
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
                >
                  Security Check
                </Link>
                <span className="text-sm text-gray-700">{user?.email}</span>
                <button
                  onClick={logout}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {loading && (
            <div className="flex justify-center items-center py-12">
              <LoadingSpinner size="lg" message="Loading dashboard data..." />
            </div>
          )}

          {error && (
            <div className="mb-6">
              <ErrorDisplay error={error} onRetry={loadDashboardData} />
            </div>
          )}

          {!loading && !error && dashboardData && (
            <div className="px-4 sm:px-0">
              {/* Overall Risk Score */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Welcome back, {dashboardData.user.businessName || dashboardData.user.email}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <RiskScoreCard
                    title="Overall Risk Score"
                    score={dashboardData.overallRiskScore}
                    severity={
                      dashboardData.overallRiskScore <= 33 ? 'low' :
                      dashboardData.overallRiskScore <= 66 ? 'medium' : 'high'
                    }
                  />
                  <div className="bg-white rounded-lg shadow-md p-6 border-2 border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Assessments</h3>
                    <p className="text-4xl font-bold text-blue-600">{dashboardData.recentAssessments.length}</p>
                  </div>
                  <div className="bg-white rounded-lg shadow-md p-6 border-2 border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Documents Uploaded</h3>
                    <p className="text-4xl font-bold text-blue-600">{dashboardData.documentCount}</p>
                  </div>
                </div>
              </div>

              {/* Action Items */}
              {dashboardData.actionItems.length > 0 && (
                <div className="mb-8">
                  <ActionItemList items={dashboardData.actionItems} />
                </div>
              )}

              {/* Report Export Section */}
              {dashboardData.recentAssessments.length > 0 && (
                <div className="mb-8 bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Export Report</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Select assessments to include in your PDF report
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      {selectedAssessmentIds.length > 0 && (
                        <span className="text-sm text-gray-600">
                          {selectedAssessmentIds.length} selected
                        </span>
                      )}
                      {selectedAssessmentIds.length < dashboardData.recentAssessments.length && (
                        <button
                          onClick={selectAllAssessments}
                          className="text-sm text-blue-600 hover:text-blue-800 underline"
                        >
                          Select All
                        </button>
                      )}
                      {selectedAssessmentIds.length > 0 && (
                        <button
                          onClick={clearSelection}
                          className="text-sm text-gray-600 hover:text-gray-800 underline"
                        >
                          Clear
                        </button>
                      )}
                      <ReportExporter assessmentIds={selectedAssessmentIds} />
                    </div>
                  </div>
                </div>
              )}

              {/* Assessments by Type */}
              <div className="space-y-8">
                {/* Contract Assessments */}
                {getAssessmentsByType('contract').length > 0 && (
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Contract Assessments</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {getAssessmentsByType('contract').map((assessment) => (
                        <div key={assessment.id} className="relative">
                          <div className="absolute top-2 left-2 z-10">
                            <input
                              type="checkbox"
                              checked={selectedAssessmentIds.includes(assessment.id)}
                              onChange={() => toggleAssessmentSelection(assessment.id)}
                              className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                          </div>
                          <div
                            onClick={() => setSelectedAssessment(assessment)}
                            className="cursor-pointer"
                          >
                            <RiskScoreCard
                              title={`Contract - ${new Date(assessment.createdAt).toLocaleDateString()}`}
                              score={assessment.riskScore}
                              severity={assessment.severity}
                              assessmentType="contract"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Invoice Assessments */}
                {getAssessmentsByType('invoice').length > 0 && (
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Invoice Assessments</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {getAssessmentsByType('invoice').map((assessment) => (
                        <div key={assessment.id} className="relative">
                          <div className="absolute top-2 left-2 z-10">
                            <input
                              type="checkbox"
                              checked={selectedAssessmentIds.includes(assessment.id)}
                              onChange={() => toggleAssessmentSelection(assessment.id)}
                              className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                          </div>
                          <div
                            onClick={() => setSelectedAssessment(assessment)}
                            className="cursor-pointer"
                          >
                            <RiskScoreCard
                              title={`Invoice - ${new Date(assessment.createdAt).toLocaleDateString()}`}
                              score={assessment.riskScore}
                              severity={assessment.severity}
                              assessmentType="invoice"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Security Assessments */}
                {getAssessmentsByType('security').length > 0 && (
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Security Assessments</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {getAssessmentsByType('security').map((assessment) => (
                        <div key={assessment.id} className="relative">
                          <div className="absolute top-2 left-2 z-10">
                            <input
                              type="checkbox"
                              checked={selectedAssessmentIds.includes(assessment.id)}
                              onChange={() => toggleAssessmentSelection(assessment.id)}
                              className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                          </div>
                          <div
                            onClick={() => setSelectedAssessment(assessment)}
                            className="cursor-pointer"
                          >
                            <RiskScoreCard
                              title={`Security - ${new Date(assessment.createdAt).toLocaleDateString()}`}
                              score={assessment.riskScore}
                              severity={assessment.severity}
                              assessmentType="security"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {dashboardData.recentAssessments.length === 0 && (
                  <div className="bg-white rounded-lg shadow-md p-12 text-center">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">
                      No assessments yet
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Get started by uploading a contract or invoice, or complete a security assessment.
                    </p>
                    <div className="flex justify-center space-x-4">
                      <Link
                        href="/upload/contract"
                        className="px-6 py-3 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                      >
                        Upload Contract
                      </Link>
                      <Link
                        href="/security-check"
                        className="px-6 py-3 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
                      >
                        Security Check
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>

        {/* Assessment Detail Modal */}
        {selectedAssessment && renderAssessmentDetail(selectedAssessment)}
      </div>
    </ProtectedRoute>
  );
}
