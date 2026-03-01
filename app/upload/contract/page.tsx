'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DocumentUploader from '@/components/DocumentUploader';

export default function UploadContractPage() {
  const router = useRouter();
  const [uploadedDocumentId, setUploadedDocumentId] = useState<string | null>(null);

  const handleUploadSuccess = (documentId: string) => {
    setUploadedDocumentId(documentId);
    // Optionally redirect to analysis page or dashboard
    setTimeout(() => {
      router.push(`/dashboard?documentId=${documentId}`);
    }, 2000);
  };

  const handleUploadError = (error: string) => {
    console.error('Upload error:', error);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Upload Contract</h1>
          <p className="mt-2 text-sm text-gray-600">
            Upload your contract for AI-powered risk analysis
          </p>
        </div>

        <DocumentUploader
          documentType="contract"
          onUploadSuccess={handleUploadSuccess}
          onUploadError={handleUploadError}
        />

        {uploadedDocumentId && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center">
              <svg
                className="h-5 w-5 text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="ml-3 text-sm text-green-800">
                Contract uploaded successfully! Redirecting to dashboard...
              </p>
            </div>
          </div>
        )}

        <div className="mt-8 text-center">
          <button
            type="button"
            className="text-sm text-gray-600 hover:text-gray-900"
            onClick={() => router.push('/dashboard')}
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
