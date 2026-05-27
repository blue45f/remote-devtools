import { Card, Form, Select, Button, Space } from 'antd'
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons'
import type { JobType, DeviceInfo } from '../types'

const JOB_TYPE_OPTIONS: { label: string; value: JobType }[] = [
  { label: 'QA', value: 'QA' },
  { label: 'PM', value: 'PM' },
  { label: 'PD', value: 'PD' },
  { label: 'DEV', value: 'DEV' },
  { label: 'OTHER', value: 'OTHER' },
]

interface BasicInfoCardProps {
  jobType: JobType
  deviceInfoList: DeviceInfo[]
  onJobTypeChange: (value: JobType) => void
  onDeviceListChange: (devices: DeviceInfo[]) => void
}

export function BasicInfoCard({
  jobType,
  deviceInfoList,
  onJobTypeChange,
  onDeviceListChange,
}: BasicInfoCardProps) {
  const handleAddDevice = () => {
    onDeviceListChange([...deviceInfoList, { deviceId: '', name: '' }])
  }

  const handleRemoveDevice = (index: number) => {
    const newList = deviceInfoList.filter((_, i) => i !== index)
    onDeviceListChange(newList)
  }

  const handleDeviceChange = (
    index: number,
    field: keyof DeviceInfo,
    value: string
  ) => {
    const newList = [...deviceInfoList]
    newList[index] = { ...newList[index], [field]: value }
    onDeviceListChange(newList)
  }

  return (
    <Card title="기본 정보" style={{ marginBottom: 16 }}>
      <Form layout="vertical">
        <Form.Item label="직군" required>
          <Select
            value={jobType}
            onChange={onJobTypeChange}
            options={JOB_TYPE_OPTIONS}
            style={{ width: 200 }}
          />
        </Form.Item>

        <Form.Item label="디바이스 목록">
          <Space direction="vertical" style={{ width: '100%' }}>
            {deviceInfoList.map((device, index) => (
              <Space key={index} align="baseline">
                <Form.Item noStyle>
                  <Select
                    placeholder="디바이스 ID"
                    value={device.deviceId}
                    onChange={(value) =>
                      handleDeviceChange(index, 'deviceId', value)
                    }
                    style={{ width: 200 }}
                    showSearch
                    allowClear
                  />
                </Form.Item>
                <Button
                  type="text"
                  danger
                  icon={<MinusCircleOutlined />}
                  onClick={() => handleRemoveDevice(index)}
                />
              </Space>
            ))}
            <Button
              type="dashed"
              onClick={handleAddDevice}
              icon={<PlusOutlined />}
              style={{ width: 200 }}
            >
              디바이스 추가
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  )
}
