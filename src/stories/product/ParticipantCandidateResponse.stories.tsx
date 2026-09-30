import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ParticipantCandidateResponse } from '../../components/ParticipantCandidateResponse'
import '../../components/ParticipantResponseFlow.css'
import type { Candidate, ResponseValue } from '../../domain/meeting'
import { calendarConflicts, FIXED_CANDIDATES } from '../fixtures/fixedMeetings.ts'

// 대표 4개 후보 시간을 추출하여 응답 흐름에 사용
const primaryCandidates = FIXED_CANDIDATES.slice(0, 4)

/**
 * ParticipantCandidateResponse
 *
 * 회의에 초대받은 참여자가 주최자가 제시한 후보 시간들에 대해
 * '가능해요', '조정 검토 가능', '어려워요' 중 하나를 선택하고 제출 전 확인하는 핵심 응답 컴포넌트입니다.
 *
 * [디자인 엔지니어링 핵심]
 * - 응답 진행도 프로그레스 바 실시간 반영(`answered / total`)
 * - 캘린더 충돌 힌트 연동(`has-conflict`)
 * - '조정 검토 가능' 선택 시 법적/심리적 약속 부담을 덜어주는 보충 설명 및 모달 내 주의사항
 * - 전원/전부 불가 시 대안 시간 모색 유도(`allUnavailable` 분기)
 * - 과거 일정 조정 약속 보존(`legacyCommit` 안내)
 * - 네이티브 HTML5 `<dialog>` 엘리먼트를 활용한 제출 전 응답 확인 창
 *
 * [미지원/누락 계약 안내]
 * - 실제 캘린더 OAuth 동기화 및 실시간 제출 API 통신 실패/재시도 상태는 포함되어 있지 않습니다.
 */
const meta = {
  title: '05 Workflows/Participant Candidate Response',
  component: ParticipantCandidateResponse,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          '초대받은 참여자가 후보 시간별 참석 가능 여부를 3가지 옵션으로 선택하고, 진행률 확인 및 제출 전 확인 다이얼로그를 통해 응답을 검토하는 컴포넌트입니다.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="respond-app" style={{ width: 'min(42rem, calc(100vw - 2rem))' }}>
        <div className="response-flow" style={{ display: 'block', width: '100%', margin: 0 }}>
          <Story />
        </div>
      </div>
    ),
  ],
  args: {
    participantName: '수진',
    isEditing: false,
    candidates: primaryCandidates,
    answers: {},
    onAnswer: () => undefined,
    onExpand: () => undefined,
    onSubmit: () => undefined,
    getCalendarHint: (candidate) => calendarConflicts[candidate.id] ?? null,
  },
} satisfies Meta<typeof ParticipantCandidateResponse>

export default meta
type Story = StoryObj<typeof meta>

/**
 * 실제 상태(Stateful)를 관리하여 라디오 버튼을 클릭하면
 * 상단 프로그레스 바와 하단 카운터가 채워지고, 모든 응답 완료 시 확인 모달 창이 열리는 인터랙티브 하네스입니다.
 */
export const Interactive: Story = {
  render: (args) => <InteractiveParticipantResponse {...args} />,
}

/**
 * 초대장을 처음 열었을 때의 미응답(0 / 4) 초기 상태입니다.
 * 제출 버튼이 비활성화되며 남은 개수를 직관적으로 안내합니다.
 */
export const NewUnanswered: Story = {
  args: {
    answers: {},
  },
  parameters: {
    docs: {
      description: {
        story:
          '아무 응답도 선택하지 않은 초기 진입 상태입니다. 하단 CTA 버튼에 "4개 시간에 더 응답해 주세요" 비활성화 레이블이 표시됩니다.',
      },
    },
  },
}

/**
 * 4개 중 2개 시간에만 응답한 부분 응답 상태입니다.
 * 상단 진행률 막대가 50% 채워집니다.
 */
export const PartiallyAnswered: Story = {
  args: {
    answers: {
      [primaryCandidates[0].id]: 'available',
      [primaryCandidates[1].id]: 'adjustment_intent',
    },
  },
  parameters: {
    docs: {
      description: {
        story:
          '일부 시간만 응답한 상태입니다. 프로그레스 바가 절반 채워지며, 남은 2개에 대한 응답을 유도합니다.',
      },
    },
  },
}

/**
 * 모든 후보 시간에 대해 가능/조정/불가가 혼합된 완성 상태입니다.
 * 캘린더 충돌 힌트(디자인 위클리 일정과 겹쳐요)가 노출되며 "응답 확인하기" 버튼이 활성화됩니다.
 */
export const Complete_MixedResponses: Story = {
  args: {
    answers: {
      [primaryCandidates[0].id]: 'available',
      [primaryCandidates[1].id]: 'adjustment_intent',
      [primaryCandidates[2].id]: 'unavailable',
      [primaryCandidates[3].id]: 'available',
    },
  },
  parameters: {
    docs: {
      description: {
        story:
          '모든 응답이 완료되어 CTA 버튼이 활성화된 상태입니다. 첫 번째 후보에는 캘린더 충돌 힌트 배지가 표시됩니다.',
      },
    },
  },
}

/**
 * 제시된 모든 후보 시간이 '어려워요'로 표시된 상태입니다.
 * 막다른 골목에 갇히지 않도록 "다른 시간 찾아보기" 및 "이 후보들은 어렵다고 보내기"의 이중 액션이 제공됩니다.
 */
export const AllUnavailable: Story = {
  args: {
    answers: {
      [primaryCandidates[0].id]: 'unavailable',
      [primaryCandidates[1].id]: 'unavailable',
      [primaryCandidates[2].id]: 'unavailable',
      [primaryCandidates[3].id]: 'unavailable',
    },
  },
  parameters: {
    docs: {
      description: {
        story:
          '제안된 모든 시간이 불가할 때의 복구 분기입니다. 주 액션이 "다른 시간 찾아보기"로 변경되고, 그대로 불가를 전달하는 보조 버튼이 함께 제공됩니다.',
      },
    },
  },
}

/**
 * 이미 제출을 마친 참여자가 회의 확정 전 일정을 변경하기 위해 다시 접근한 수정 모드입니다.
 * 헤더 문구가 "달라진 일정을 알려주세요"로 변경됩니다.
 */
export const EditingSubmittedResponse: Story = {
  args: {
    isEditing: true,
    answers: {
      [primaryCandidates[0].id]: 'available',
      [primaryCandidates[1].id]: 'available',
      [primaryCandidates[2].id]: 'available',
      [primaryCandidates[3].id]: 'available',
    },
  },
  parameters: {
    docs: {
      description: {
        story:
          '기존 응답을 수정할 때의 상태입니다. "달라진 일정을 알려주세요" 헤더와 기존 선택값이 유지된 상태로 시작합니다.',
      },
    },
  },
}

/**
 * 이전 응답에서 이미 일정 조정을 약속(`adjustable`)했던 참여자가 재응답할 때,
 * 새 답을 고르기 전까지 기존 약속이 유지됨을 명시하는 약속 보존 배너가 렌더링됩니다.
 */
export const LegacyAdjustmentCommit: Story = {
  args: {
    answers: {
      [primaryCandidates[0].id]: 'adjustable' as ResponseValue,
      [primaryCandidates[1].id]: 'available',
    },
  },
  parameters: {
    docs: {
      description: {
        story:
          '이전 버전의 조정 약속(`adjustable`) 데이터를 안전하게 계승하는 하위 호환 상태입니다.',
      },
    },
  },
}

/**
 * 모바일 뷰포트(390px)에서의 반응형 레이아웃입니다.
 */
export const Mobile_Responsive: Story = {
  globals: { viewport: 'mobileProduct' },
  render: (args) => <InteractiveParticipantResponse {...args} />,
  args: {
    answers: {
      [primaryCandidates[0].id]: 'available',
      [primaryCandidates[1].id]: 'adjustment_intent',
    },
  },
  parameters: {
    docs: {
      description: {
        story:
          '390px 모바일 화면에서 시간 카드와 라디오 옵션, 하단 고정 액션 바의 반응형 레이아웃을 검증합니다.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: '390px', maxWidth: '100%' }}>
        <Story />
      </div>
    ),
  ],
}

function InteractiveParticipantResponse(
  props: React.ComponentProps<typeof ParticipantCandidateResponse>,
) {
  const [answers, setAnswers] = useState<Record<string, ResponseValue | undefined>>(props.answers)

  return (
    <ParticipantCandidateResponse
      {...props}
      answers={answers}
      onAnswer={(candidate: Candidate, value: ResponseValue) => {
        setAnswers((prev) => ({ ...prev, [candidate.id]: value }))
        props.onAnswer(candidate, value)
      }}
    />
  )
}
