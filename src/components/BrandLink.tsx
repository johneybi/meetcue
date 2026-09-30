import { BrandLogo } from './ui/brand-logo'

export function BrandLink() {
  return (
    <a className="account-brand respond-brand" href="#/home" aria-label="MeetCue 홈으로">
      <BrandLogo variant="lockup" />
    </a>
  )
}
