import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import AntLayout from 'antd/es/layout';
import Button from 'antd/es/button';
import Menu from 'antd/es/menu';
import Typography from 'antd/es/typography';
import LogoutOutlined from '@ant-design/icons/es/icons/LogoutOutlined';
import MenuFoldOutlined from '@ant-design/icons/es/icons/MenuFoldOutlined';
import MenuUnfoldOutlined from '@ant-design/icons/es/icons/MenuUnfoldOutlined';
import { useMenu } from '@/shared/hooks';
import { CONFIG, isAuthEnabled } from '@/shared/constants';
import { useSession, useLogout } from '@/features/auth';
import { LoadingSpinner, ErrorBoundary } from '@/shared/components';

const { Header, Sider, Content } = AntLayout;
const { Title } = Typography;

export function Layout() {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { menuItems } = useMenu();
  const { isLoading, isAuthenticated } = useSession();
  const { handleLogout } = useLogout();

  const antMenuItems = menuItems.map((item) => ({
    key: item.key,
    icon: <item.icon />,
    label: item.label,
    onClick: () => navigate(item.path),
  }));

  const selectedKeys = menuItems
    .filter((item) => location.pathname.startsWith(item.path))
    .map((item) => item.key);

  if (isLoading && isAuthEnabled()) {
    return <LoadingSpinner fullScreen tip={t('layout.checkingSession')} />;
  }

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          background: '#001529',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ color: '#fff', fontSize: 16 }}
          />
          <Title level={4} style={{ color: '#fff', margin: 0 }}>
            {CONFIG.APP_TITLE}
          </Title>
        </div>

        {isAuthEnabled() && isAuthenticated && (
          <Button
            type="text"
            icon={<LogoutOutlined />}
            onClick={handleLogout}
            style={{ color: '#fff' }}
          >
            {t('layout.logout')}
          </Button>
        )}
      </Header>

      <AntLayout>
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          trigger={null}
          style={{
            overflow: 'auto',
            height: 'calc(100vh - 64px)',
            position: 'sticky',
            top: 64,
            left: 0,
          }}
        >
          <Menu theme="dark" mode="inline" selectedKeys={selectedKeys} items={antMenuItems} />
        </Sider>

        <Content
          style={{
            margin: 0,
            minHeight: 'calc(100vh - 64px)',
            background: '#f0f2f5',
            overflow: 'auto',
          }}
        >
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </Content>
      </AntLayout>
    </AntLayout>
  );
}
