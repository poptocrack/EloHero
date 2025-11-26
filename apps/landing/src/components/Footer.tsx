import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { StoreButtons } from '@/components/StoreButtons';

export const Footer = (): ReactElement => {
  const { t } = useTranslation();

  return (
    <footer
      id="contact"
      className="mt-24 rounded-2xl border border-slate-200 bg-white px-8 py-10 text-slate-700"
    >
      <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        <div>
          <p className="text-lg font-semibold text-slate-900">{t('app.name')}</p>
          <p className="mt-2 text-sm text-slate-500">{t('app.tagline')}</p>
          <div className="mt-6">
            <StoreButtons />
          </div>
        </div>
        <div className="flex flex-col gap-6 lg:items-end">
          <LanguageSwitcher />
          <div className="flex flex-col gap-2 text-sm text-slate-600">
            <a href="/privacy" className="hover:text-slate-900">
              {t('footer.privacy')}
            </a>
            <a href="/terms" className="hover:text-slate-900">
              {t('footer.terms')}
            </a>
            <a href="mailto:hey@elohero.app" className="hover:text-slate-900">
              {t('nav.contact')}
            </a>
          </div>
        </div>
      </div>
      <div className="mt-8 border-t border-slate-100 pt-4">
        <div className="flex flex-wrap gap-4 text-sm font-semibold text-primary">
          <a
            href="https://discord.gg/2MZeDx5CNZ"
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-primary/20 px-4 py-2 hover:bg-primary/10"
          >
            {t('footer.discord')}
          </a>
          <a
            href="https://www.linkedin.com/in/tristan-debroise/"
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-primary/20 px-4 py-2 hover:bg-primary/10"
          >
            {t('footer.linkedin')}
          </a>
        </div>
      </div>
    </footer>
  );
};
