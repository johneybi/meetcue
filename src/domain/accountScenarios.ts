import { createPrototypeMeeting } from './mockMeeting.ts'

export type AccountScenarioId = 'product-review' | 'onboarding' | 'quarterly-goals' | 'design-qa'

export function createAccountScenarioMeeting(scenarioId: AccountScenarioId) {
  const fixture = createPrototypeMeeting()
  if (scenarioId === 'onboarding') {
    return {
      ...fixture,
      title: '온보딩 개선안 논의',
      hostLabel: '피플팀 지우',
      purpose: '신규 입사자의 첫 주 경험에서 우선 개선할 항목을 정합니다.',
    }
  }
  if (scenarioId === 'quarterly-goals') {
    return {
      ...fixture,
      title: '3분기 목표 점검',
      hostLabel: '프로덕트팀 민지',
      purpose: '3분기 핵심 목표의 진행 상황과 다음 우선순위를 점검합니다.',
      status: 'confirmed' as const,
      confirmedCandidateId: fixture.candidates[0]?.id,
    }
  }
  if (scenarioId === 'design-qa') {
    return {
      ...fixture,
      title: '디자인 QA 기준 정리',
      hostLabel: '디자인팀 서연',
      purpose: '출시 전 디자인 QA에서 공통으로 확인할 기준을 정리합니다.',
    }
  }
  return fixture
}
