import { useState, useEffect } from 'react'
import Alert from 'antd/es/alert'
import Button from 'antd/es/button'
import Space from 'antd/es/space'
import SaveOutlined from '@ant-design/icons/es/icons/SaveOutlined'
import { useUser } from '@/features/auth'
import { useUserInfo } from '../hooks'
import { BasicInfoCard } from './BasicInfoCard'
import { TicketTemplateCard } from './TicketTemplateCard'
import type { JobType, DeviceInfo, TicketTemplateInfo } from '../types'

export function UserInfoForm() {
  const { empNo } = useUser()
  const { userInfo, isLoading, isError, updateUserInfo, isUpdating } =
    useUserInfo(empNo)

  const [jobType, setJobType] = useState<JobType>('QA')
  const [deviceInfoList, setDeviceInfoList] = useState<DeviceInfo[]>([])
  const [ticketTemplateList, setTicketTemplateList] = useState<
    TicketTemplateInfo[]
  >([])
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    if (userInfo) {
      setJobType(userInfo.jobType)
      setDeviceInfoList(userInfo.deviceInfoList || [])
      setTicketTemplateList(userInfo.ticketTemplateList || [])
      setHasChanges(false)
    }
  }, [userInfo])

  const handleJobTypeChange = (value: JobType) => {
    setJobType(value)
    setHasChanges(true)
  }

  const handleDeviceListChange = (devices: DeviceInfo[]) => {
    setDeviceInfoList(devices)
    setHasChanges(true)
  }

  const handleTemplateListChange = (templates: TicketTemplateInfo[]) => {
    setTicketTemplateList(templates)
    setHasChanges(true)
  }

  const handleSave = () => {
    updateUserInfo({
      jobType,
      deviceInfoList,
      ticketTemplateList,
    })
    setHasChanges(false)
  }

  if (!empNo) {
    return (
      <Alert
        message="로그인이 필요합니다"
        description="유저 정보를 수정하려면 로그인해주세요."
        type="warning"
        showIcon
      />
    )
  }

  if (isError) {
    return (
      <Alert
        message="데이터 로드 실패"
        description="유저 정보를 불러오는데 실패했습니다."
        type="error"
        showIcon
      />
    )
  }

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <BasicInfoCard
        jobType={jobType}
        deviceInfoList={deviceInfoList}
        onJobTypeChange={handleJobTypeChange}
        onDeviceListChange={handleDeviceListChange}
      />

      <TicketTemplateCard
        templates={ticketTemplateList}
        onChange={handleTemplateListChange}
      />

      <div style={{ textAlign: 'right' }}>
        <Button
          type="primary"
          icon={<SaveOutlined />}
          onClick={handleSave}
          loading={isUpdating || isLoading}
          disabled={!hasChanges}
          size="large"
        >
          저장
        </Button>
      </div>
    </Space>
  )
}
