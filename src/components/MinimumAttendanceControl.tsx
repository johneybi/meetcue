import { Minus, Plus } from 'lucide-react'
import { Button } from './ui/button'
import './MinimumAttendanceControl.css'

type MinimumAttendanceControlProps = {
  value: number
  minimum: number
  maximum: number
  onChange: (value: number) => void
}

export function MinimumAttendanceControl({
  value,
  minimum,
  maximum,
  onChange,
}: MinimumAttendanceControlProps) {
  return (
    <section className="minimum-attendance" aria-labelledby="minimum-attendance-title">
      <div>
        <strong id="minimum-attendance-title">몇 명이 모이면 진행할까요?</strong>
        <span>주최자와 꼭 필요한 사람을 포함해요.</span>
      </div>
      <div className="minimum-attendance__stepper">
        <Button
          variant="fieldAction"
          size="icon"
          aria-label="최소 참석 인원 줄이기"
          disabled={value <= minimum}
          onClick={() => onChange(value - 1)}
        >
          <Minus size={18} />
        </Button>
        <output aria-live="polite">
          <strong>{value}명</strong>
          <span>총 {maximum}명</span>
        </output>
        <Button
          variant="fieldAction"
          size="icon"
          aria-label="최소 참석 인원 늘리기"
          disabled={value >= maximum}
          onClick={() => onChange(value + 1)}
        >
          <Plus size={18} />
        </Button>
      </div>
    </section>
  )
}
