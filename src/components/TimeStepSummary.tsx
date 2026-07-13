import { Button } from './ui/button'
import './TimeStepSummary.css'

type TimeStepSummaryProps = {
  label: string
  value: string
  onEdit: () => void
}

export function TimeStepSummary({ label, value, onEdit }: TimeStepSummaryProps) {
  return (
    <div className="time-step-summary">
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <Button variant="quiet" size="compact" onClick={onEdit}>
        수정
      </Button>
    </div>
  )
}
