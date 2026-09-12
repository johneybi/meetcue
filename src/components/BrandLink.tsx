export function BrandLink() {
  return (
    <a className="account-brand respond-brand" href="#/home" aria-label="MeetCue 홈으로">
      <img
        className="brand-dot"
        src={`${import.meta.env.BASE_URL}brand/meetcue-emblem-64.png`}
        alt=""
      />
      <strong className="brand-wordmark">MeetCue</strong>
    </a>
  )
}
