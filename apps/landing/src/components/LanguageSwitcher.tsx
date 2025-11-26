import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

const SUPPORTED_LANGS: Array<{ code: 'en' | 'fr'; label: string }> = [
  { code: 'en', label: 'EN' },
  { code: 'fr', label: 'FR' },
];

export const LanguageSwitcher = (): ReactElement => {
  const { i18n, t } = useTranslation();

  const handleChange = (code: 'en' | 'fr'): void => {
    if (i18n.language === code) return;
    void i18n.changeLanguage(code);
  };

  return (
    <div className="flex items-center gap-3 text-sm text-slate-600">
      <span className="hidden sm:inline-block font-medium">
        {t('common.language')}
      </span>
      <div className="flex gap-1 rounded-full border border-slate-200 bg-white p-1">
        {SUPPORTED_LANGS.map(({ code, label }) => {
          const isActive = i18n.language === code;
          return (
            <button
              key={code}
              type="button"
              onClick={() => handleChange(code)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                isActive
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
              aria-pressed={isActive}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

