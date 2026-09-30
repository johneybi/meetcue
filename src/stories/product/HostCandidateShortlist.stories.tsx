import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { HostCandidateShortlist } from '../../components/HostCandidateShortlist'
import '../../components/HostDecisionScreen.css'
import type { CandidateEvaluation } from '../../domain/evaluation'
import {
  fixedEvaluations,
  fixedMeeting,
  impossibleRequiredEvaluation,
  pendingOptionalEvaluation,
  readyEvaluation,
  recoveryEqualPriorityEvaluation,
  recoveryEvaluation,
} from '../fixtures/fixedMeetings.ts'

/**
 * HostCandidateShortlist
 *
 * 주최자가 여러 후보 시간의 평가 상태(추천/가능/대기/불가)를 나란히 비교하고,
 * 특정 후보를 선택하거나 우선순위 높은 시간으로 바로 확정/요청할 수 있는 수평 카드 숏리스트입니다.
 *
 * [디자인 엔지니어링 핵심]
 * - 동일 우선순위 추천 후보에 대한 별표(`Star`) 시각 표기
 * - 상태별 톤 매핑: ready(초록), pending/recovery(파랑/정보), impossible(빨강)
 * - 가로 스크롤 경계선 및 페이드 힌트(`data-scroll-hint`, `data-can-scroll-left`, `data-can-scroll-right`)
 * - 모바일 환경에서의 접기/펼치기 토글 및 선택 카드 자동 스크롤 인투 뷰
 *
 * [미지원/누락 계약 안내]
 * - 후보 목록이 0개일 때의 Empty State UI는 상위 화면 단위에서 처리되며 이 컴포넌트에는 별도 빈 화면 렌더링이 없습니다.
 */
const meta = {
  title: '04 Decision System/Host Candidate Shortlist',
  component: HostCandidateShortlist,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          '후보 시간들을 가로 카드 캐러셀 형태로 나열하여 상태, 참석 가능 인원, 시스템 추천 여부를 직관적으로 비교하고 선택할 수 있는 주최자용 비교 목록입니다.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="mobile-surface-preview account-shell">
        <div className="host-shell--decision" style={{ width: 'min(56rem, calc(100vw - 2rem))' }}>
          <Story />
        </div>
      </div>
    ),
  ],
  args: {
    meeting: fixedMeeting,
    evaluations: fixedEvaluations,
    selectedEvaluation: readyEvaluation,
    systemRecommendedEvaluation: readyEvaluation,
    onSelect: () => undefined,
    onConfirm: () => undefined,
    onRequest: () => undefined,
    onShowAlternative: () => undefined,
  },
} satisfies Meta<typeof HostCandidateShortlist>

export default meta
type Story = StoryObj<typeof meta>

/**
 * 실제 상태(Stateful)를 관리하여 카드를 클릭했을 때
 * 선택 상태, 체크마크 표시, 액션 버튼의 종류가 실시간으로 변경되는 인터랙티브 하네스입니다.
 */
export const Interactive: Story = {
  render: (args) => <InteractiveShortlist {...args} />,
}

/**
 * 시스템 추천 후보(9월 24일 15:00, Ready)가 선택된 기본 상태입니다.
 * "이 시간으로 정하기" 주 액션 버튼이 카드 내에 표시됩니다.
 */
export const ReadySelected: Story = {
  args: {
    selectedEvaluation: readyEvaluation,
  },
  parameters: {
    docs: {
      description: {
        story:
          '즉시 확정 가능한 추천 후보가 선택된 상태입니다. 카드 내에 "이 시간으로 정하기" 버튼이 표시됩니다.',
      },
    },
  },
}

/**
 * 선택 인원의 응답이 더 필요한 대기 후보(9월 25일 10:00, Pending)가 선택된 상태입니다.
 * "응답 요청하기" 보조 액션 버튼이 노출됩니다.
 */
export const PendingSelected: Story = {
  args: {
    selectedEvaluation: pendingOptionalEvaluation,
  },
  parameters: {
    docs: {
      description: {
        story:
          '정족수 부족으로 대기 중인 후보가 선택된 상태입니다. 즉시 확정 대신 "응답 요청하기" 액션이 활성화됩니다.',
      },
    },
  },
}

/**
 * 일정 조정 의향 동의가 필요한 복구 후보(9월 24일 10:00, Recovery)가 선택된 상태입니다.
 * "다른 시간 보기" 액션이 제공됩니다.
 */
export const RecoverySelected: Story = {
  args: {
    selectedEvaluation: recoveryEvaluation,
  },
  parameters: {
    docs: {
      description: {
        story: '참석자의 일정 변경 동의가 아직 확보되지 않은 후보가 선택된 상태입니다.',
      },
    },
  },
}

/**
 * 필수 참석자가 불참하여 기준 충족이 불가능한 후보(9월 25일 14:00, Impossible)가 선택된 상태입니다.
 * 위험 톤(danger)이 적용되며 다른 시간 탐색을 유도합니다.
 */
export const ImpossibleSelected: Story = {
  args: {
    selectedEvaluation: impossibleRequiredEvaluation,
  },
  parameters: {
    docs: {
      description: {
        story:
          '필수 참석자의 불참으로 진행이 불가능한 후보가 선택된 상태입니다. 위험 톤과 함께 다른 시간 보기 액션이 제공됩니다.',
      },
    },
  },
}

/**
 * 동일한 추천 우선순위를 갖는 복수의 후보가 존재할 때,
 * 추천 별표(`Star`)가 여러 후보에 나란히 부여되는 상태를 검증합니다.
 */
export const EqualRecommendations: Story = {
  args: {
    evaluations: [
      recoveryEvaluation,
      recoveryEqualPriorityEvaluation,
      impossibleRequiredEvaluation,
    ],
    systemRecommendedEvaluation: recoveryEvaluation,
    selectedEvaluation: recoveryEvaluation,
  },
  parameters: {
    docs: {
      description: {
        story:
          '두 후보(9월 24일 10:00, 10:30)가 동일한 평가 우선순위를 가질 때 시스템 추천 별표 뱃지가 동일하게 부여되는지 확인합니다.',
      },
    },
  },
}

/**
 * 모바일 뷰포트(390px)에서의 가로 스크롤 및 접기/펼치기 토글입니다.
 */
export const Mobile_Responsive: Story = {
  globals: { viewport: 'mobileProduct' },
  render: (args) => <InteractiveShortlist {...args} />,
  parameters: {
    docs: {
      description: {
        story:
          '모바일 화면에서 "다른 후보 N개 보기" 접기/펼치기 토글과 가로 스크롤 카드 배치를 확인합니다.',
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

function InteractiveShortlist(props: React.ComponentProps<typeof HostCandidateShortlist>) {
  const [selected, setSelected] = useState<CandidateEvaluation>(props.selectedEvaluation)

  return (
    <HostCandidateShortlist
      {...props}
      selectedEvaluation={selected}
      onSelect={(next) => {
        setSelected(next)
        props.onSelect(next)
      }}
    />
  )
}
