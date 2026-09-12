import type { AvailabilityWindow } from './meeting.ts'
import { koreanDateTime } from './hostTimeEditing.ts'

export const timeEntryScenarios = [
  {
    id: 'mostly-open',
    title: '대부분 가능한 주',
    task: '월~금 09:00–18:00를 물어보세요. 매일 12:00–13:00와 화요일 15:00–17:00는 제외해 주세요.',
  },
  {
    id: 'sparse',
    title: '가능한 시간이 적은 주',
    task: '월요일 10:00–12:00와 목요일 14:00–16:00만 물어보세요. 나머지 시간은 모두 제외해 주세요.',
  },
  {
    id: 'different-days',
    title: '날짜마다 다른 주',
    task: '월·수 09:00–12:00, 화·목 14:00–18:00, 금 09:00–11:00를 물어보세요. 그 밖의 시간은 제외해 주세요.',
  },
] as const

/** Compare explicit 30-minute cells, including accidentally selected out-of-task hours. */
export function assessTimeEntry(
  windows: AvailabilityWindow[],
  hostId: string,
  dates: string[],
  scenario: number,
) {
  if (!timeEntryScenarios[scenario]) throw new RangeError('알 수 없는 비교 시나리오')
  let extraMinutes = 0
  let missingMinutes = 0
  for (const [day, date] of dates.entries()) {
    for (let minute = 0; minute < 1440; minute += 30) {
      const start = koreanDateTime(date, minute).getTime()
      const selected = windows.some(
        (w) =>
          w.ownerId === hostId &&
          w.state === 'available' &&
          new Date(w.startAt).getTime() <= start &&
          new Date(w.endAt).getTime() >= start + 1800000,
      )
      const expected =
        scenario === 0
          ? minute >= 540 &&
            minute < 1080 &&
            !(minute >= 720 && minute < 780) &&
            !(day === 1 && minute >= 900 && minute < 1020)
          : scenario === 1
            ? (day === 0 && minute >= 600 && minute < 720) ||
              (day === 3 && minute >= 840 && minute < 960)
            : day === 0 || day === 2
              ? minute >= 540 && minute < 720
              : day === 1 || day === 3
                ? minute >= 840 && minute < 1080
                : minute >= 540 && minute < 660
      if (selected && !expected) extraMinutes += 30
      if (!selected && expected) missingMinutes += 30
    }
  }
  return { extraMinutes, missingMinutes, exact: extraMinutes === 0 && missingMinutes === 0 }
}
