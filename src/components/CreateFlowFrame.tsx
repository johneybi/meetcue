import type { ReactNode, RefObject } from 'react'
import { ChevronLeft } from 'lucide-react'
import { Button } from './ui/button'
import { MainCard, MainCardContent, MainCardHeader } from './ui/main-card'
import './ui/main-card.css'

type CreateStepPresentation = {
  id: string
  label: string
  eyebrow: string
  title: string
  description: string
}

type CreateFlowFrameProps = {
  workflowRef: RefObject<HTMLElement | null>
  stepClassName: string
  currentStepIndex: number
  stepCount: number
  activeStep: CreateStepPresentation
  isMeetingStep: boolean
  canContinue: boolean
  desktopPrimaryLabel: string
  mobilePrimaryLabel: string
  onBack: () => void
  onPrimary: () => void
  children: ReactNode
}

export function CreateFlowFrame({
  workflowRef,
  stepClassName,
  currentStepIndex,
  stepCount,
  activeStep,
  isMeetingStep,
  canContinue,
  desktopPrimaryLabel,
  mobilePrimaryLabel,
  onBack,
  onPrimary,
  children,
}: CreateFlowFrameProps) {
  return (
    <div className="create-flow">
      <section
        ref={workflowRef}
        className={`create-workflow ${stepClassName}`}
        aria-label="회의 요청 만들기"
      >
        <div className="create-progress" aria-label="회의 만들기 진행 상황">
          <div className="create-progress__meta">
            {currentStepIndex > 0 ? (
              <Button
                className="create-back-button"
                variant="quiet"
                size="compact"
                aria-label="이전 단계"
                onClick={onBack}
              >
                <ChevronLeft aria-hidden="true" size={20} strokeWidth={2.2} />
                <span>이전</span>
              </Button>
            ) : null}
            <div className="create-progress__status">
              <strong>
                {currentStepIndex + 1} / {stepCount}
              </strong>
              <span>{activeStep.label}</span>
            </div>
          </div>
          <progress value={currentStepIndex + 1} max={stepCount}>
            {currentStepIndex + 1} / {stepCount}
          </progress>
        </div>

        <section
          className="create-task"
          aria-current="step"
          aria-labelledby={`create-task-${activeStep.id}`}
        >
          <div className="create-task__surface">
            <div className="create-task__layout">
              <MainCard
                className={`create-main-panel${isMeetingStep ? ' create-main-panel--meeting' : ''}`}
              >
                <MainCardHeader className="create-task__header">
                  <span>
                    {activeStep.eyebrow} · {activeStep.label}
                  </span>
                  <h1 id={`create-task-${activeStep.id}`} tabIndex={-1}>
                    {activeStep.title}
                  </h1>
                  <p>{activeStep.description}</p>
                </MainCardHeader>
                <MainCardContent className="create-phase-body">{children}</MainCardContent>
              </MainCard>
            </div>
            <div className="create-actions">
              <Button
                className="create-primary-action--desktop"
                size="action"
                onClick={onPrimary}
                disabled={!canContinue}
              >
                {desktopPrimaryLabel}
              </Button>
              <Button
                className="create-primary-action--mobile"
                size="action"
                width="full"
                onClick={onPrimary}
                disabled={!canContinue}
              >
                {mobilePrimaryLabel}
              </Button>
            </div>
          </div>
        </section>
      </section>
    </div>
  )
}
