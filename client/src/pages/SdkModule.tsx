import { useTranslation } from 'react-i18next';

import { WebviewPage } from '@/components/Webview';
import { useDocumentTitle } from '@/lib/use-document-title';

export default function SdkModulePage() {
  const { t } = useTranslation();
  useDocumentTitle(t('nav.moduleSdk'));
  return <WebviewPage kind="module" />;
}
