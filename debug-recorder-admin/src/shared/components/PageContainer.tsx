import React from 'react'
import Typography from 'antd/es/typography'

const { Title } = Typography

interface PageContainerProps {
  title: string
  children: React.ReactNode
  extra?: React.ReactNode
}

export function PageContainer({ title, children, extra }: PageContainerProps) {
  return (
    <div style={{ padding: '24px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
        }}
      >
        <Title level={2} style={{ margin: 0 }}>
          {title}
        </Title>
        {extra}
      </div>
      {children}
    </div>
  )
}
