import type { ReactElement } from 'react';
import { Apple, Play } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const APP_STORE_URL = 'https://apps.apple.com/fr/app/elohero/id6754299081';
const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.elohero.app';

interface StoreButtonsProps {
  orientation?: 'row' | 'column';
}

export const StoreButtons = ({
  orientation = 'row',
}: StoreButtonsProps): ReactElement => {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        'flex flex-wrap gap-3',
        orientation === 'column' ? 'flex-col sm:flex-row' : 'flex-row',
      )}
    >
      <Button
        asChild
        size="lg"
        variant="secondary"
        className="min-w-[200px] justify-start gap-3 rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-sm"
      >
        <a href={APP_STORE_URL} target="_blank" rel="noreferrer">
          <Apple className="h-6 w-6" />
          <span className="flex flex-col text-left text-sm">
            <span className="text-xs text-slate-500">{t('stores.iosBadge')}</span>
            {t('stores.ios')}
          </span>
        </a>
      </Button>
      <Button
        asChild
        size="lg"
        variant="secondary"
        className="min-w-[200px] justify-start gap-3 rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-sm"
      >
        <a href={PLAY_STORE_URL} target="_blank" rel="noreferrer">
          <Play className="h-6 w-6" />
          <span className="flex flex-col text-left text-sm">
            <span className="text-xs text-slate-500">
              {t('stores.androidBadge')}
            </span>
            {t('stores.android')}
          </span>
        </a>
      </Button>
    </div>
  );
};

