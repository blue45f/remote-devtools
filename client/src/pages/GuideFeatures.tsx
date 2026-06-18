import { ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { GUIDE_FEATURES } from '@/domains/guide/content';
import { useDocumentTitle } from '@/lib/use-document-title';
import { cn } from '@/lib/utils';

export default function GuideFeatures() {
  const { t, i18n } = useTranslation();
  const ko = i18n.language.startsWith('ko');
  useDocumentTitle(t('guide.featuresTitle'));

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6 flex flex-col gap-6">
      <PageHeader
        title={t('guide.featuresTitle')}
        description={t('guide.featuresSubtitle')}
        actions={
          <Button asChild variant="accent">
            <Link to="/settings/profile">
              {t('guide.getStarted')}
              <ArrowRight />
            </Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {GUIDE_FEATURES.map((f) => {
          const Icon = f.icon;
          return (
            <Link
              key={f.id}
              to={f.to}
              className={cn(
                'group rounded-xl outline-none',
                'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
              )}
            >
              <Card className="h-full p-5 flex flex-col gap-3 transition-colors group-hover:border-border-strong group-hover:bg-bg-subtle">
                <span className="inline-flex size-9 items-center justify-center rounded-lg bg-accent-soft text-accent-soft-fg">
                  <Icon className="size-5" />
                </span>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-fg">{ko ? f.titleKo : f.titleEn}</h3>
                  <p className="mt-1 text-sm text-fg-subtle">{ko ? f.descKo : f.descEn}</p>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-accent opacity-0 transition-opacity group-hover:opacity-100">
                  {t('guide.openGuide')}
                  <ArrowRight className="size-3.5" />
                </span>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
