/**
 * Authentication Callback Component
 * Handles the return from Keycloak authentication redirect
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export const AuthCallback: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processCallback = async () => {
      try {
        // Check for authentication errors in URL
        const urlParams = new URLSearchParams(window.location.search);
        const errorParam = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');

        if (errorParam) {
          setError(errorDescription || errorParam);
          setIsProcessing(false);
          return;
        }

        // Wait for authentication to complete
        if (!isLoading) {
          if (isAuthenticated) {
            // Authentication successful, redirect to intended path
            const intendedPath = sessionStorage.getItem('intendedPath');
            sessionStorage.removeItem('intendedPath');

            const redirectPath = intendedPath || '/dashboard';
            console.log(`Authentication successful, redirecting to: ${redirectPath}`);

            // Use replace to avoid adding to history
            navigate(redirectPath, { replace: true });
          } else {
            // Authentication failed
            setError('Authentication failed. Please try again.');
            setTimeout(() => {
              navigate('/login', { replace: true });
            }, 3000);
          }
          setIsProcessing(false);
        }
      } catch (err) {
        console.error('Error processing authentication callback:', err);
        setError('An error occurred during authentication.');
        setIsProcessing(false);
      }
    };

    processCallback();
  }, [isAuthenticated, isLoading, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            Authentication Error
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/login', { replace: true })}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <h2 className="text-2xl font-semibold text-gray-800 mb-4 mt-6">
          Processing Authentication
        </h2>
        <p className="text-gray-600">
          {isProcessing ? 'Please wait while we complete your login...' : 'Redirecting...'}
        </p>
      </div>
    </div>
  );
};

export default AuthCallback;