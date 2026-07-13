import { useState } from 'react'
import { Paperclip } from 'lucide-react'
import { Button } from './ui/button'
import { Field } from './ui/field'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import './MeetingBriefStep.css'

type MeetingBriefStepProps = {
  title: string
  purpose: string
  referenceMaterial: string
  onTitleChange: (title: string) => void
  onPurposeChange: (purpose: string) => void
  onReferenceMaterialChange: (referenceMaterial: string) => void
}

export function MeetingBriefStep({
  title,
  purpose,
  referenceMaterial,
  onTitleChange,
  onPurposeChange,
  onReferenceMaterialChange,
}: MeetingBriefStepProps) {
  const [isReferenceOpen, setIsReferenceOpen] = useState(false)
  const referenceItems = referenceMaterial
    .trim()
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean)

  return (
    <div className="create-step-body">
      <div className="meeting-brief-fields">
        <Field
          className="create-title-field"
          label={
            <>
            <strong className="create-field-label">회의 이름</strong>{' '}
            <strong className="required-chip">필수</strong>
            </>
          }
          hint="무슨 일과 관련된 회의인지 이름 안에 드러나게 적어주세요."
        >
          <Input
            controlSize="field"
            value={title}
            placeholder="예: 다음 주 제품 리뷰 회의"
            onChange={(event) => onTitleChange(event.target.value)}
            autoFocus
          />
        </Field>

        <Field
          className="create-purpose-field"
          label={
            <>
            <strong className="create-field-label">이 회의에서 정할 일</strong>{' '}
            <strong className="required-chip">필수</strong>
            </>
          }
          hint="참석자가 어떤 회의인지 이해할 수 있을 만큼만 짧게 적어주세요."
        >
          <Textarea
            value={purpose}
            rows={3}
            maxLength={120}
            placeholder="예: 출시 전 리뷰 안건을 확인하고 최종 수정 범위를 정합니다."
            onChange={(event) => onPurposeChange(event.target.value)}
          />
        </Field>

        <section className="reference-source-panel" aria-label="관련 자료">
          {referenceItems.length > 0 && !isReferenceOpen ? (
            <div className="reference-source-preview">
              <div className="reference-chip-list">
                {referenceItems.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
              <Button
                variant="quiet"
                size="text"
                onClick={() => setIsReferenceOpen(true)}
              >
                수정
              </Button>
            </div>
          ) : null}
          {isReferenceOpen ? (
            <label className="create-reference-field">
              <span className="sr-only">자료 이름 또는 링크</span>
              <span className="create-reference-control">
                <Paperclip aria-hidden="true" size={18} />
                <Input
                  value={referenceMaterial}
                  maxLength={100}
                  placeholder="자료 이름 또는 링크"
                  onChange={(event) => onReferenceMaterialChange(event.target.value)}
                />
              </span>
            </label>
          ) : null}
          {referenceItems.length === 0 && !isReferenceOpen ? (
            <Button
              className="add-reference-button"
              variant="secondary"
              width="full"
              onClick={() => setIsReferenceOpen(true)}
            >
              <Paperclip aria-hidden="true" size={17} />
              자료 첨부
              <small>선택</small>
            </Button>
          ) : null}
        </section>
      </div>
    </div>
  )
}
