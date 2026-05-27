import Select from 'antd/es/select'
import Space from 'antd/es/space'
import Tag from 'antd/es/tag'
import { RemoteIcon } from '@/shared/components'
import { useWorkflowMembers } from '../hooks'
import type { AssigneeInfo } from '../types'

interface AssigneeSelectorProps {
  value: AssigneeInfo[]
  onChange: (assignees: AssigneeInfo[]) => void
}

export function AssigneeSelector({ value, onChange }: AssigneeSelectorProps) {
  const { members, isLoading } = useWorkflowMembers()

  const options = members.map((member) => ({
    label: (
      <Space>
        <RemoteIcon name="user" size={16} />
        {member.displayName}
      </Space>
    ),
    value: member.accountId,
    displayName: member.displayName,
  }))

  const handleChange = (selectedIds: string[]) => {
    const selectedAssignees = selectedIds
      .map((id) => {
        const member = members.find((m) => m.accountId === id)
        if (member) {
          return {
            accountId: member.accountId,
            displayName: member.displayName,
          }
        }
        const existing = value.find((v) => v.accountId === id)
        return existing
      })
      .filter((a): a is AssigneeInfo => a !== undefined)

    onChange(selectedAssignees)
  }

  const selectedValues = value.map((a) => a.accountId)

  return (
    <Select
      mode="multiple"
      placeholder="담당자 선택"
      value={selectedValues}
      onChange={handleChange}
      options={options}
      loading={isLoading}
      style={{ width: '100%' }}
      tagRender={(props) => {
        const assignee = value.find((a) => a.accountId === props.value)
        return (
          <Tag
            closable={props.closable}
            onClose={props.onClose}
            style={{ marginInlineEnd: 4 }}
          >
            {assignee?.displayName || props.value}
          </Tag>
        )
      }}
      filterOption={(input, option) =>
        (option?.displayName || '')
          .toLowerCase()
          .includes(input.toLowerCase())
      }
    />
  )
}
