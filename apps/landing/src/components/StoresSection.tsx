import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { StoreButtons } from '@/components/StoreButtons';

export const StoresSection = (): ReactElement => {
  const { t } = useTranslation();

  return (
    <section
      id="stores"
      className="mt-20 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            {t('stores.title')}
          </p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">
            {t('stores.subtitle')}
          </h2>
        </div>
        <StoreButtons />
      </div>
    </section>
  );
};

