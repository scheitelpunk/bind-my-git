/**
 * Unauthorized Access Page
 * Displayed when user doesn't have required permissions
 */

import React from 'react';
import {useNavigate, useLocation} from 'react-router-dom';
import {ShieldX, ArrowLeft, Home} from 'lucide-react';
import {useAuth} from '@/hooks/useAuth';
import {useTranslation} from 'react-i18next';

interface LocationState {
    from?: string;
    requiredRoles?: string[];
    requireAllRoles?: boolean;
}

const Unauthorized: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const {user, logout} = useAuth();
    const {t} = useTranslation();

    const state = location.state as LocationState;
    const fromPath = state?.from || '/';
    const requiredRoles = state?.requiredRoles || [];
    const requireAllRoles = state?.requireAllRoles || false;

    const handleGoBack = () => {
        navigate(-1);
    };

    const handleGoHome = () => {
        navigate('/dashboard');
    };

    const handleLogout = () => {
        logout();
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center">
                    <div className="rounded-full bg-red-100 p-4">
                        <ShieldX className="h-12 w-12 text-red-600"/>
                    </div>
                </div>

                <div className="mt-6 text-center">
                    <h2 className="text-3xl font-extrabold text-gray-900">
                        {t('unauthorized.accessDenied')}
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        {t('unauthorized.noPermission')}
                    </p>
                </div>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    <div className="space-y-6">
                        {/* User Info */}
                        {user && (
                            <div className="bg-gray-50 rounded-md p-4">
                                <h3 className="text-sm font-medium text-gray-700 mb-2">
                                    {t('unauthorized.currentUser')}
                                </h3>
                                <p className="text-sm text-gray-900">{user.email}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                    {t('unauthorized.roles')}: {user.roles.map(role => role.name).join(', ') || t('unauthorized.none')}
                                </p>
                            </div>
                        )}

                        {/* Required Roles */}
                        {requiredRoles.length > 0 && (
                            <div className="bg-red-50 rounded-md p-4">
                                <h3 className="text-sm font-medium text-red-800 mb-2">
                                    {t('unauthorized.required')} {requireAllRoles ? t('unauthorized.all') : t('unauthorized.any')} {t('unauthorized.ofTheseRoles')}
                                </h3>
                                <ul className="text-sm text-red-700">
                                    {requiredRoles.map((role, index) => (
                                        <li key={index} className="flex items-center">
                                            <span className="w-2 h-2 bg-red-400 rounded-full mr-2"></span>
                                            {role}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Attempted Path */}
                        {fromPath && fromPath !== '/' && (
                            <div className="bg-blue-50 rounded-md p-4">
                                <h3 className="text-sm font-medium text-blue-800 mb-2">
                                    {t('unauthorized.attemptedAccess')}
                                </h3>
                                <p className="text-sm text-blue-700 font-mono bg-blue-100 rounded px-2 py-1">
                                    {fromPath}
                                </p>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="space-y-3">
                            <button
                                onClick={handleGoBack}
                                className="w-full flex justify-center items-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                <ArrowLeft className="h-4 w-4 mr-2"/>
                                {t('unauthorized.goBack')}
                            </button>

                            <button
                                onClick={handleGoHome}
                                className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                <Home className="h-4 w-4 mr-2"/>
                                {t('unauthorized.goToDashboard')}
                            </button>
                        </div>

                        {/* Help Text */}
                        <div className="text-center">
                            <p className="text-xs text-gray-500">
                                {t('unauthorized.errorContact')}
                            </p>
                        </div>

                        {/* Logout Option */}
                        <div className="pt-4 border-t border-gray-200">
                            <button
                                onClick={handleLogout}
                                className="w-full text-center text-sm text-gray-500 hover:text-gray-700"
                            >
                                {t('unauthorized.signOutTryAnother')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Unauthorized;