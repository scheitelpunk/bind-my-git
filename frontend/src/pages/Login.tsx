import React from 'react';
import {LogIn} from 'lucide-react';
import {useAuth} from '@/hooks/useAuth';
import {useTranslation} from 'react-i18next';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

const Login: React.FC = () => {
    const {login, isLoading} = useAuth();
    const {t} = useTranslation();

    const handleLogin = () => {
        login();
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <LoadingSpinner size="lg"/>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-primary-600">
                        <LogIn className="h-6 w-6 text-white"/>
                    </div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        {t('auth.signInTitle')}
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        {t('auth.secureAuth')}
                    </p>
                </div>
                <div className="mt-8 space-y-6">
                    <div className="text-center">
                        <Button
                            onClick={handleLogin}
                            size="lg"
                            className="w-full flex justify-center items-center"
                        >
                            <LogIn className="h-5 w-5 mr-2"/>
                            {t('auth.signInWithKeycloak')}
                        </Button>
                    </div>
                    <div className="text-center text-sm text-gray-500">
                        <p>{t('auth.redirectMessage')}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;