import React from 'react';
import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';

const LanguageSwitcher: React.FC = () => {
  const { i18n, t } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'de' : 'en';
    i18n.changeLanguage(newLang);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
      title={t('language.selectLanguage')}
    >
      <Languages className="h-5 w-5" />
      <span className="hidden md:inline">
        {i18n.language === 'en' ? 'DE' : 'EN'}
      </span>
    </button>
  );
};

export default LanguageSwitcher;
