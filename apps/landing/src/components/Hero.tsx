import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock3, Sparkles, TrendingUp } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StoreButtons } from '@/components/StoreButtons';

type SnapshotTrend = 'up' | 'down' | 'steady';

interface SnapshotPlayer {
  name: string;
  games: string;
  elo: string;
  delta: string;
  trend: SnapshotTrend;
}

export const Hero = (): ReactElement => {
  const { t } = useTranslation();

  const highlights = t('hero.highlights', { returnObjects: true }) as string[];
  const snapshotPlayers = t('hero.snapshot.players', {
    returnObjects: true
  }) as SnapshotPlayer[];

  return (
    <section
      id="hero"
      className="rounded-[28px] border border-slate-200 bg-white p-10 shadow-lg shadow-slate-200/70"
    >
      <div className="grid items-start gap-10 lg:grid-cols-2">
        <div className="space-y-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">EloHero</p>
            <h1 className="mt-3 text-4xl font-bold text-slate-900 sm:text-5xl">
              {t('hero.title')}
            </h1>
            <p className="mt-4 text-lg text-slate-600">{t('hero.subtitle')}</p>
          </div>
          <ul className="space-y-3 text-base text-slate-600">
            {highlights.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" className="rounded-2xl px-8">
              <a href="#stores">{t('hero.ctaPrimary')}</a>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-2xl px-8">
              <a href="#features">{t('hero.ctaSecondary')}</a>
            </Button>
          </div>
          <StoreButtons />
        </div>
        <Card className="rounded-[28px] border-none bg-gradient-to-br from-[#667eea] via-[#7F53AC] to-[#C44569] p-1 shadow-lg shadow-indigo-500/20">
          <div className="h-full rounded-[26px] bg-white/10 p-6 text-white backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-white/80">
                  {t('hero.cardSubtitle')}
                </p>
                <p className="mt-1 text-2xl font-bold">{t('hero.cardTitle')}</p>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
                <Sparkles className="h-3.5 w-3.5" />
                {t('hero.snapshot.liveBadge')}
              </div>
            </div>

            <div className="mt-6 rounded-2xl bg-white/15 p-4">
              <div className="flex items-center justify-between text-xs uppercase tracking-wide text-white/70">
                <span>{t('hero.snapshot.playersLabel')}</span>
                <div className="flex items-center gap-1">
                  <Clock3 className="h-3.5 w-3.5" />
                  <span>{t('hero.snapshot.updated')}</span>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {snapshotPlayers.map((player, index) => (
                  <div
                    key={player.name}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-lg font-semibold">
                        #{index + 1}
                      </span>
                      <div>
                        <p className="text-base font-semibold leading-tight">{player.name}</p>
                        <p className="text-xs text-white/70">{player.games}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold">{player.elo}</p>
                      <div className="flex items-center justify-end gap-1 text-sm font-medium">
                        <TrendingUp
                          className={`h-4 w-4 ${
                            player.trend === 'down'
                              ? 'rotate-180 text-rose-200'
                              : player.trend === 'steady'
                              ? 'text-white/70'
                              : 'text-emerald-200'
                          }`}
                        />
                        <span>{player.delta}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-white p-4 text-slate-900">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-500">
                    {t('hero.snapshot.nextMatch.label')}
                  </p>
                  <p className="text-lg font-bold text-slate-900">
                    {t('hero.snapshot.nextMatch.matchup')}
                  </p>
                </div>
                <Button size="sm" className="rounded-xl px-4 py-2">
                  {t('hero.snapshot.nextMatch.cta')}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
};
