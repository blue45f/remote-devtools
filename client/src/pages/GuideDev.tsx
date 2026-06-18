import { useTranslation } from 'react-i18next';

import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CodeBlock } from '@/components/ui/code-block';
import { useDocumentTitle } from '@/lib/use-document-title';

const ESM_SNIPPET = `import { RemoteDebug } from 'remote-debug-sdk';

RemoteDebug.init({
  deviceId: 'device-123',
  endpoint: 'https://your-host/buffer',
});`;

const UMD_SNIPPET = `<script src="https://your-host/sdk/index.umd.js"></script>
<script>
  RemoteDebug.init({ deviceId: 'device-123' });
</script>`;

const CURL_SNIPPET = `curl -X POST https://your-host/buffer/save \\
  -H 'Content-Type: application/json' \\
  -d '{ "deviceId": "device-123", "trigger": "manual" }'`;

export default function GuideDev() {
  const { t } = useTranslation();
  useDocumentTitle(t('guide.devTitle'));

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6 flex flex-col gap-6">
      <PageHeader title={t('guide.devTitle')} description={t('guide.devSubtitle')} />

      <Card>
        <CardHeader>
          <CardTitle>ESM</CardTitle>
        </CardHeader>
        <CardContent>
          <CodeBlock code={ESM_SNIPPET} language="ts" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>UMD</CardTitle>
        </CardHeader>
        <CardContent>
          <CodeBlock code={UMD_SNIPPET} language="html" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Buffer API</CardTitle>
        </CardHeader>
        <CardContent>
          <CodeBlock code={CURL_SNIPPET} language="bash" />
        </CardContent>
      </Card>
    </div>
  );
}
