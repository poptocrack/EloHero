import type { ReactElement } from 'react';
import { Puzzle, Dumbbell, Gamepad2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui/card';

const ICONS = {
  boardgames: Puzzle,
  sports: Dumbbell,
  videogames: Gamepad2,
} as const;

const CARD_GRADIENTS = {
  boardgames: 'from-[#FF6B9D] to-[#C44569]',
  sports: 'from-[#4ECDC4] to-[#44A08D]',
  videogames: 'from-[#667eea] to-[#764ba2]',
} as const;

export const UseCases = (): ReactElement => {
  const { t } = useTranslation();

  const cases = ['boardgames', 'sports', 'videogames'] as const;

  return (
    <section id="usecases" className="mt-16 space-y-8">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">
          {t('useCases.label')}
        </p>
        <h2 className="mt-2 text-3xl font-bold text-slate-900">
          {t('useCases.title')}
        </h2>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {cases.map((key) => {
          const Icon = ICONS[key];
          return (
            <Card
              key={key}
              className="border-none bg-transparent p-0 shadow-none"
            >
              <div
                className={`h-full rounded-[28px] bg-gradient-to-br ${CARD_GRADIENTS[key]} p-[1px] shadow-lg shadow-slate-400/20`}
              >
                <div className="h-full rounded-[26px] bg-white p-6">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-primary">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-2xl font-semibold text-slate-900">
                    {t(`useCases.${key}.title`)}
                  </h3>
                  <p className="mt-3 text-base text-slate-600">
                    {t(`useCases.${key}.text`)}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
};

