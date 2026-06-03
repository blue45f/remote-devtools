import { useTranslation } from 'react-i18next';
import { PageContainer } from '@/shared/components';
import { UserInfoForm } from './UserInfoForm';

export function UserInfoPage() {
  const { t } = useTranslation();

  return (
    <PageContainer title={t('userInfo.title')}>
      <UserInfoForm />
    </PageContainer>
  );
}
