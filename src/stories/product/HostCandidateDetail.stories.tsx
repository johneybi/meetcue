import type { Meta, StoryObj } from '@storybook/react-vite'
import { HostCandidateDetail } from '../../components/HostCandidateDetail'
import '../../components/HostDecisionScreen.css'
import {
  fixedMeeting,
  impossibleQuorumEvaluation,
  impossibleRequiredEvaluation,
  pendingOptionalEvaluation,
  pendingRequiredEvaluation,
  quorumUnreachableMeeting,
  readyEvaluation,
  readyWithBurdenEvaluation,
  recoveryEvaluation,
} from '../fixtures/fixedMeetings.ts'

/**
 * HostCandidateDetail
 *
 * 주최자가 선택한 후보 시간의 상세 평가 결과와 확정/요청 액션을 제어하는 의사결정 핵심 컴포넌트입니다.
 * 도메인 평가 엔진(`evaluateCandidates`)이 도출한 4가지 상태(`ready`, `pending`, `recovery`, `impossible`)와
 * 일정 조정 부담(burden), 대체 후보(fallback) 안내, 모바일 포커스 뷰를 렌더링합니다.
 *
 * [미지원/누락 계약 안내]
 * - 컴포넌트 레벨의 비동기 로딩 스켈레톤 및 서버 에러 바운더리는 포함되어 있지 않으며 상위 Shell에서 제어됩니다.
 */
const meta = {
  title: '04 Decision System/Host Candidate Detail',
  component: HostCandidateDetail,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          '후보 시간의 참석 기준 충족 여부, 미응답/조정 현황, 시스템 추천 사유를 한눈에 검토하고 확정 또는 추가 응답 요청을 수행하는 주최자용 의사결정 상세 뷰입니다.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="mobile-surface-preview account-shell">
        <div className="host-shell--decision" style={{ width: 'min(44rem, calc(100vw - 2rem))' }}>
          <Story />
        </div>
      </div>
    ),
  ],
  args: {
    meeting: fixedMeeting,
    evaluation: readyEvaluation,
    isSystemRecommendation: true,
    onConfirm: () => undefined,
    onRequest: () => undefined,
    onSelectCandidate: () => undefined,
    onReviewCriteria: () => undefined,
  },
} satisfies Meta<typeof HostCandidateDetail>

export default meta
type Story = StoryObj<typeof meta>

/**
 * 필수 참석자 조건 및 최소 인원 기준을 완전히 충족하여 바로 확정할 수 있는 상태입니다.
 * 시스템 추천 뱃지와 즉시 확정 액션 버튼이 활성화됩니다.
 */
export const Ready_Default: Story = {
  args: {
    evaluation: readyEvaluation,
    isSystemRecommendation: true,
  },
}

/**
 * 기준은 충족되었으나 일정 조정(`adjustment_commit`) 또는 기피 표시(`avoid_if_possible`)가 포함된 상태입니다.
 * 확정 전 참여자들의 일정 부담을 점검할 수 있도록 안내 블록이 노출됩니다.
 */
export const Ready_WithAdjustmentBurden: Story = {
  args: {
    evaluation: readyWithBurdenEvaluation,
    isSystemRecommendation: false,
  },
  parameters: {
    docs: {
      description: {
        story:
          '확정 기준은 충족했으나 다른 일정을 조정한 참석자(민수)와 기피 희망자(준호)가 존재하여 일정 부담 요약을 함께 보여주는 상태입니다.',
      },
    },
  },
}

/**
 * 꼭 참석해야 하는 필수 참석자(민수)의 응답이 아직 확인되지 않아 대기 중인 상태입니다.
 * 해당 참석자에게 바로 재요청할 수 있는 액션을 제공합니다.
 */
export const Pending_RequiredParticipant: Story = {
  args: {
    evaluation: pendingRequiredEvaluation,
    isSystemRecommendation: false,
  },
  parameters: {
    docs: {
      description: {
        story:
          '필수 참석자의 미응답으로 인해 확정이 보류된 상태입니다. 필수 참석자 목록과 재요청 액션이 강조됩니다.',
      },
    },
  },
}

/**
 * 필수 참석자는 모두 가능하나, 최소 참석 인원(정족수 4명)을 충족하기 위해
 * 선택 참석자 풀 중 추가 1명의 가능 응답이 필요한 대기 상태입니다.
 */
export const Pending_OptionalQuorum: Story = {
  args: {
    evaluation: pendingOptionalEvaluation,
    isSystemRecommendation: false,
  },
  parameters: {
    docs: {
      description: {
        story:
          '최소 인원 충족을 위해 선택 참석자 그룹(하나, 준호, 수진) 중 1명 이상의 응답이 필요한 상태입니다.',
      },
    },
  },
}

/**
 * 현재 선택한 시간은 대기 중이지만, 다른 후보 중 기다리지 않고 바로 확정 가능한 시간이 있을 때
 * 즉시 대안 후보로 전환할 수 있도록 안내하는 상태입니다.
 */
export const Pending_WithFallbackAlternative: Story = {
  args: {
    evaluation: pendingOptionalEvaluation,
    fallbackEvaluation: readyEvaluation,
    isSystemRecommendation: false,
  },
  parameters: {
    docs: {
      description: {
        story:
          '현재 후보는 대기 중이지만 즉시 확정 가능한 대안 후보가 존재할 때, 기다리지 않고 다른 시간으로 이동할 수 있는 바로가기 카드가 노출됩니다.',
      },
    },
  },
}

/**
 * 참여자가 조정 의향(`adjustment_intent`)을 밝혔으나 아직 구체적인 변경 동의를 얻지 못한 복구 상태입니다.
 * MeetCue에서는 조정 의향만으로는 확정할 수 없으며, 반드시 당사자 동의를 거쳐야 함을 안내합니다.
 */
export const Recovery_ConsentRequired: Story = {
  args: {
    evaluation: recoveryEvaluation,
    isSystemRecommendation: false,
  },
  parameters: {
    docs: {
      description: {
        story:
          '조정 의향은 승낙 약속이 아니므로 당사자(서연)의 실제 변경 동의 확인 전까지 확정을 차단하는 복구 상태 안내입니다.',
      },
    },
  },
}

/**
 * 필수 참석자(서연)가 참석하기 어렵다고 표시하여 회의 성립이 불가능한 상태입니다.
 * 기준 재조정이나 대안 후보 검토를 안내합니다.
 */
export const Impossible_RequiredUnavailable: Story = {
  args: {
    evaluation: impossibleRequiredEvaluation,
    isSystemRecommendation: false,
  },
  parameters: {
    docs: {
      description: {
        story:
          '필수 참석자가 불가를 응답하여 기준을 만족할 수 없는 불가 상태입니다. 다른 후보 시간 탐색 또는 참석 기준 재검토를 유도합니다.',
      },
    },
  },
}

/**
 * 필수 참석자는 참석 가능하나, 남은 참석자가 모두 참석하더라도
 * 최소 참석 인원(4명)을 채울 수 없는 정족수 미달 불가 상태입니다.
 */
export const Impossible_QuorumUnreachable: Story = {
  args: {
    meeting: quorumUnreachableMeeting,
    evaluation: impossibleQuorumEvaluation,
    isSystemRecommendation: false,
  },
  parameters: {
    docs: {
      description: {
        story:
          '선택 참석자들의 불참으로 인해 남은 인원만으로는 최소 정족수를 달성할 수 없는 상태입니다.',
      },
    },
  },
}

/**
 * 모바일 뷰포트(390px)에서의 상단 포커스 헤더 및 반응형 카드 레이아웃입니다.
 */
export const Mobile_Ready: Story = {
  globals: { viewport: 'mobileProduct' },
  args: {
    evaluation: readyEvaluation,
    isSystemRecommendation: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          '모바일 환경에서 상단 모바일 포커스 영역과 핵심 사유가 세로로 재배치되는 레이아웃입니다.',
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
