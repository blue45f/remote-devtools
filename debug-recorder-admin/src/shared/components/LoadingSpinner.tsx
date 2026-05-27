import Spin from 'antd/es/spin'
import LoadingOutlined from '@ant-design/icons/es/icons/LoadingOutlined'

interface LoadingSpinnerProps {
  size?: 'small' | 'default' | 'large'
  tip?: string
  fullScreen?: boolean
}

export function LoadingSpinner({
  size = 'default',
  tip,
  fullScreen = false,
}: LoadingSpinnerProps) {
  const sizeMap = {
    small: 24,
    default: 40,
    large: 60,
  }

  const spinner = (
    <Spin
      indicator={
        <LoadingOutlined style={{ fontSize: sizeMap[size] }} spin />
      }
      tip={tip}
    />
  )

  if (fullScreen) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          width: '100%',
        }}
      >
        {spinner}
      </div>
    )
  }

  return spinner
}
