import { useTranslation } from 'react-i18next';

import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/ui/card';
import { Steps } from '@/components/ui/steps';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { USER_GUIDE_TABS } from '@/domains/guide/content';
import { useDocumentTitle } from '@/lib/use-document-title';

export default function GuideUser() {
  const { t, i18n } = useTranslation();
  const ko = i18n.language.startsWith('ko');
  useDocumentTitle(t('guide.userTitle'));

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6 flex flex-col gap-6">
      <PageHeader title={t('guide.userTitle')} description={t('guide.userSubtitle')} />

      <Tabs defaultValue={USER_GUIDE_TABS[0].id}>
        <TabsList className="flex-wrap h-auto">
          {USER_GUIDE_TABS.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id}>
              {t(tab.labelKey)}
            </TabsTrigger>
          ))}
        </TabsList>

        {USER_GUIDE_TABS.map((tab) => (
          <TabsContent key={tab.id} value={tab.id} className="mt-4">
            <Card className="p-5">
              <Steps
                steps={tab.steps.map((s) => ({
                  title: ko ? s.titleKo : s.titleEn,
                  description: ko ? s.descKo : s.descEn,
                }))}
              />
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
