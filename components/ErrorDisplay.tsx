'use client';

import React from 'react';

interface ErrorDisplayProps {
  error: Error | string;
  onRetry?: () => void;
  title?: string;
}

/**
 * Maps error messages to user-friendly descriptions and retry capability
 */
function getErrorInfo(error: Error | string): {
  message: string;
  canRetry: boolean;
  severity: 'error' | 'warning' | 'info';
} {
  const errorMessage = typeof error === 'string' ? error : error.message;

  // Authentication errors
  if (errorMessage.includes('Authentication required') || 
      errorMessage.includes('Unauthorized') ||
      errorMessage.includes('Invalid or expired token') ||
      errorMessage.includes('Session expired')) {
    return {
      message: 'Your session has expired. Please log in again.',
      canRetry: false,
      severity: 'warning'
    };
  }

  if (errorMessage.includes('Invalid email or password')) {
    return {
      message: 'Invalid email or password. Please check your credentials and try again.',
      canRetry: false,
      severity: 'error'
    };
  }

  // Document upload errors
  if (errorMessage.includes('File type not supported')) {
    return {
      message: 'File type not supported. Please upload PDF, DOC, DOCX, JPG, or PNG files.',
      canRetry: false,
      severity: 'error'
    };
  }

  if (errorMessage.includes('File exceeds 10MB limit') || 
      errorMessage.includes('Payload Too Large')) {
    return {
      message: 'File size exceeds 10MB limit. Please upload a smaller file.',
      canRetry: false,
      severity: 'error'
    };
  }

  if (errorMessage.includes('Upload failed')) {
    return {
      message: 'Upload failed. Please check your connection and try again.',
      canRetry: true,
      severity: 'error'
    };
  }

  // OCR processing errors
  if (errorMessage.includes('Text extraction failed') || 
      errorMessage.includes('Unable to extract text')) {
    return {
      message: 'Unable to extract text from document. Please ensure the document is not password-protected or corrupted, then try uploading again.',
      canRetry: true,
      severity: 'error'
    };
  }

  if (errorMessage.includes('Document text not yet extracted')) {
    return {
      message: 'Document is still being processed. Please wait a moment and try again.',
      canRetry: true,
      severity: 'info'
    };
  }

  // Analysis errors
  if (errorMessage.includes('Analysis failed')) {
    return {
      message: 'Analysis failed. Please try again in a moment.',
      canRetry: true,
      severity: 'error'
    };
  }

  // Access control errors
  if (errorMessage.includes('Access denied') || 
      errorMessage.includes('does not belong to user')) {
    return {
      message: 'You do not have permission to access this resource.',
      canRetry: false,
      severity: 'error'
    };
  }

  if (errorMessage.includes('not found') || errorMessage.includes('Not found')) {
    return {
      message: 'The requested resource was not found.',
      canRetry: false,
      severity: 'error'
    };
  }

  // Network errors
  if (errorMessage.includes('Network') || 
      errorMessage.includes('Failed to fetch') ||
      errorMessage.includes('timeout')) {
    return {
      message: 'Network error. Please check your connection and try again.',
      canRetry: true,
      severity: 'error'
    };
  }

  // Service unavailable
  if (errorMessage.includes('Service temporarily unavailable') ||
      errorMessage.includes('Service Unavailable')) {
    return {
      message: 'Service is temporarily unavailable. Please try again later.',
      canRetry: true,
      severity: 'warning'
    };
  }

  // Validation errors
  if (errorMessage.includes('required') || 
      errorMessage.includes('Invalid') ||
      errorMessage.includes('must be')) {
    return {
      message: errorMessage,
      canRetry: false,
      severity: 'error'
    };
  }

  // Generic errors
  if (errorMessage.includes('Internal server error')) {
    return {
      message: 'An unexpected error occurred. Please try again later.',
      canRetry: true,
      severity: 'error'
    };
  }

  // Default
  return {
    message: errorMessage || 'An error occurred. Please try again.',
    canRetry: true,
    severity: 'error'
  };
}

/**
 * ErrorDisplay component for showing user-friendly error messages
 */
export default function ErrorDisplay({ error, onRetry, title }: ErrorDisplayProps) {
  const { message, canRetry, severity } = getErrorInfo(error);

  // Color scheme based on severity
  const colorClasses = {
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800'
  };

  const iconClasses = {
    error: 'text-red-500',
    warning: 'text-yellow-500',
    info: 'text-blue-500'
  };

  return (
    <div className={`rounded-lg border p-4 ${colorClasses[severity]}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {severity === 'error' && (
            <svg
              className={`h-5 w-5 ${iconClasses[severity]}`}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          )}
          {severity === 'warning' && (
            <svg
              className={`h-5 w-5 ${iconClasses[severity]}`}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          )}
          {severity === 'info' && (
            <svg
              className={`h-5 w-5 ${iconClasses[severity]}`}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>
        <div className="ml-3 flex-1">
          {title && (
            <h3 className="text-sm font-medium mb-1">
              {title}
            </h3>
          )}
          <p className="text-sm">
            {message}
          </p>
          {canRetry && onRetry && (
            <div className="mt-3">
              <button
                onClick={onRetry}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
