import { useState } from 'react'
import {
  Card,
  Form,
  Input,
  Button,
  Space,
  Collapse,
  Popconfirm,
  message,
  Select,
} from 'antd'
import {
  PlusOutlined,
  DeleteOutlined,
  ImportOutlined,
} from '@ant-design/icons'
import { sanitizeIssueProjectKey } from '@/shared/utils'
import { UX_TERMS } from '@/shared/constants'
import { getTcSheetData } from '../api'
import { AssigneeSelector } from './AssigneeSelector'
import type { TicketTemplateInfo, AssigneeInfo } from '../types'

interface TicketTemplateCardProps {
  templates: TicketTemplateInfo[]
  onChange: (templates: TicketTemplateInfo[]) => void
}

export function TicketTemplateCard({
  templates,
  onChange,
}: TicketTemplateCardProps) {
  const [loadingIndex, setLoadingIndex] = useState<number | null>(null)

  const handleAddTemplate = () => {
    const newTemplate: TicketTemplateInfo = {
      id: Date.now(),
      name: `템플릿 ${templates.length + 1}`,
      assigneeInfoList: [],
      componentList: [],
      labelList: [],
    }
    onChange([...templates, newTemplate])
  }

  const handleRemoveTemplate = (index: number) => {
    const newTemplates = templates.filter((_, i) => i !== index)
    onChange(newTemplates)
  }

  const handleTemplateChange = (
    index: number,
    field: keyof TicketTemplateInfo,
    value: unknown
  ) => {
    const newTemplates = [...templates]
    newTemplates[index] = { ...newTemplates[index], [field]: value }
    onChange(newTemplates)
  }

  const handleImportFromSheet = async (index: number) => {
    const template = templates[index]
    if (!template.tcSheetLink) {
      message.warning(`${UX_TERMS.SPREADSHEET_LABEL} 링크를 먼저 입력해주세요`)
      return
    }

    setLoadingIndex(index)
    try {
      const data = await getTcSheetData(template.tcSheetLink)
      const newTemplates = [...templates]
      newTemplates[index] = {
        ...newTemplates[index],
        jiraProjectKey: data.jiraProjectKey,
        epicTicket: data.epicTicket,
        assigneeInfoList: data.assigneeInfoList,
        componentList: data.componentList,
        labelList: data.labelList,
      }
      onChange(newTemplates)
      message.success(`${UX_TERMS.SPREADSHEET_LABEL}에서 정보를 가져왔습니다`)
    } catch (error) {
      console.error('Failed to import from sheet:', error)
      message.error(`${UX_TERMS.SPREADSHEET_LABEL} 정보를 가져오는데 실패했습니다`)
    } finally {
      setLoadingIndex(null)
    }
  }

  const items = templates.map((template, index) => ({
    key: String(template.id),
    label: template.name || `템플릿 ${index + 1}`,
    extra: (
      <Popconfirm
        title="템플릿을 삭제하시겠습니까?"
        onConfirm={(e) => {
          e?.stopPropagation()
          handleRemoveTemplate(index)
        }}
        okText="삭제"
        cancelText="취소"
      >
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          size="small"
          onClick={(e) => e.stopPropagation()}
        />
      </Popconfirm>
    ),
    children: (
      <Form layout="vertical">
        <Form.Item label={`${UX_TERMS.ISSUE_LABEL} 템플릿 이름`} required>
          <Input
            value={template.name}
            onChange={(e) =>
              handleTemplateChange(index, 'name', e.target.value)
            }
            placeholder={`${UX_TERMS.ISSUE_LABEL} 템플릿 이름`}
          />
        </Form.Item>

        <Form.Item label={`${UX_TERMS.SPREADSHEET_LABEL} 링크`}>
          <Space.Compact style={{ width: '100%' }}>
            <Input
              value={template.tcSheetLink}
              onChange={(e) =>
                handleTemplateChange(index, 'tcSheetLink', e.target.value)
              }
              placeholder={`${UX_TERMS.SPREADSHEET_LABEL} URL`}
              style={{ flex: 1 }}
            />
            <Button
              icon={<ImportOutlined />}
              onClick={() => handleImportFromSheet(index)}
              loading={loadingIndex === index}
            >
              가져오기
            </Button>
          </Space.Compact>
        </Form.Item>

        <Form.Item label={UX_TERMS.ISSUE_PROJECT_KEY_LABEL}>
          <Input
            value={template.jiraProjectKey}
            onChange={(e) =>
              handleTemplateChange(
                index,
                'jiraProjectKey',
                sanitizeIssueProjectKey(e.target.value)
              )
            }
            placeholder="예: PROJ"
            style={{ width: 200 }}
          />
        </Form.Item>

        <Form.Item label="에픽 식별자">
          <Input
            value={template.epicTicket}
            onChange={(e) =>
              handleTemplateChange(index, 'epicTicket', e.target.value)
            }
            placeholder="예: ISSUE-123"
            style={{ width: 200 }}
          />
        </Form.Item>

        <Form.Item label="제목 접두어">
          <Input
            value={template.titlePrefix}
            onChange={(e) =>
              handleTemplateChange(index, 'titlePrefix', e.target.value)
            }
            placeholder="예: [QA]"
            style={{ width: 200 }}
          />
        </Form.Item>

        <Form.Item label="담당자">
          <AssigneeSelector
            value={template.assigneeInfoList}
            onChange={(assignees: AssigneeInfo[]) =>
              handleTemplateChange(index, 'assigneeInfoList', assignees)
            }
          />
        </Form.Item>

        <Form.Item label="컴포넌트">
          <Select
            mode="tags"
            value={template.componentList}
            onChange={(values: string[]) =>
              handleTemplateChange(index, 'componentList', values)
            }
            placeholder="컴포넌트 입력 후 Enter"
            style={{ width: '100%' }}
          />
        </Form.Item>

        <Form.Item label="라벨">
          <Select
            mode="tags"
            value={template.labelList}
            onChange={(values: string[]) =>
              handleTemplateChange(index, 'labelList', values)
            }
            placeholder="라벨 입력 후 Enter"
            style={{ width: '100%' }}
          />
        </Form.Item>
      </Form>
    ),
  }))

  return (
    <Card
      title={`${UX_TERMS.ISSUE_LABEL} 템플릿`}
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAddTemplate}
        >
          템플릿 추가
        </Button>
      }
    >
      {templates.length > 0 ? (
        <Collapse items={items} />
      ) : (
          <div style={{ textAlign: 'center', padding: 24, color: '#999' }}>
          {UX_TERMS.ISSUE_LABEL} 템플릿이 없습니다. 위의 버튼을 클릭하여 추가하세요.
        </div>
      )}
    </Card>
  )
}
