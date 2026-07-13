import { Avatar } from './ui/avatar'
import { SelectableCard } from './ui/selectable-card'
import './InviteeOption.css'

type InviteeOptionProps = {
  name: string
  isSelected: boolean
  onToggle: (name: string) => void
}

export function InviteeOption({ name, isSelected, onToggle }: InviteeOptionProps) {
  return (
    <SelectableCard
      className="invitee-option"
      variant="person"
      isSelected={isSelected}
      role="option"
      aria-selected={isSelected}
      onClick={() => onToggle(name)}
    >
      <Avatar name={name} size="small" />
      <span>{name}</span>
      <small>{isSelected ? '✓ 선택됨' : '선택'}</small>
    </SelectableCard>
  )
}
