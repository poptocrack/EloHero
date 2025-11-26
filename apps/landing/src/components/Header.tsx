import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

const navTargets = [
  { key: 'home', href: '#hero' },
  { key: 'howItWorks', href: '#features' },
  { key: 'contact', href: '#contact' },
] as const;

export const Header = (): ReactElement => {
  const { t } = useTranslation();

  return (
    <header className="sticky top-4 z-50 mb-12 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <img
            src="/app-icon.png"
            alt="EloHero app icon"
            className="h-10 w-10 object-cover"
          />
        </div>
        <div>
          <p className="text-lg font-bold text-slate-900">{t('app.name')}</p>
          <p className="text-sm font-medium text-slate-500">
            {t('app.tagline')}
          </p>
        </div>
      </div>
      <nav className="hidden items-center gap-6 text-sm font-semibold text-slate-600 lg:flex">
        {navTargets.map(({ key, href }) => (
          <a
            key={key}
            href={href}
            className="transition-colors hover:text-primary"
          >
            {t(`nav.${key}`)}
          </a>
        ))}
      </nav>
      <div className="flex items-center gap-3">
        <LanguageSwitcher />
        <Button
          size="sm"
          className="hidden text-sm lg:inline-flex"
          asChild
        >
          <a
            href="#stores"
            aria-label={t('hero.ctaPrimary')}
          >
            {t('hero.ctaPrimary')}
          </a>
        </Button>
      </div>
    </header>
  );
};

