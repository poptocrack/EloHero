import type { ReactElement } from 'react';
import { BarChart3, CheckCircle2, Layers, Sparkles, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const featureIcons = [CheckCircle2, Layers, Sparkles, BarChart3, Zap];

export const Features = (): ReactElement => {
  const { t } = useTranslation();

  const featureKeys = ['1', '2', '3', '4', '5'] as const;

  return (
    <section id="features" className="mt-20 space-y-8">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#C44569]">
          {t('nav.howItWorks')}
        </p>
        <h2 className="mt-2 text-3xl font-bold text-slate-900">{t('features.title')}</h2>
        <p className="mt-3 text-base text-slate-600">{t('features.subtitle')}</p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {featureKeys.map((key, index) => {
          const Icon = featureIcons[index];
          return (
            <Card key={key}>
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  <Icon className="h-6 w-6" />
                </div>
                <CardTitle className="text-lg">{t(`features.${key}.title`)}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-600">
                {t(`features.${key}.text`)}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
};
