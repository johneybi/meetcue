export type AppRoute =
  | 'entry'
  | 'home'
  | 'meetings'
  | 'requests'
  | 'notifications'
  | 'create'
  | 'criteria'
  | 'share'
  | 'host'
  | 'message'
  | 'invite'
  | 'invite-edit'
  | 'invite-done'

export type Audience = 'account' | 'host' | 'participant'

const routeHashes: Record<AppRoute, string> = {
  entry: '#/',
  home: '#/home',
  meetings: '#/meetings',
  requests: '#/requests',
  notifications: '#/notifications',
  create: '#/create',
  criteria: '#/criteria',
  share: '#/share',
  host: '#/host',
  message: '#/message',
  invite: '#/invite',
  'invite-edit': '#/invite/edit',
  'invite-done': '#/invite/done',
}

export function parseRouteHash(
  hash = window.location.hash,
  enableAccountRoutes = import.meta.env.DEV,
): AppRoute {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean)
  const [first, second, third] = parts

  if (first == null) return 'create'
  if (enableAccountRoutes && first === 'home') return 'home'
  if (enableAccountRoutes && first === 'meetings') return 'meetings'
  if (enableAccountRoutes && first === 'requests') return 'requests'
  if (enableAccountRoutes && first === 'notifications') return 'notifications'
  if (first === 'results' || first === 'host') return 'host'
  if (first === 'explore' || first === 'recover') return 'host'
  if (first === 'create') return 'create'
  if (first === 'criteria') return 'criteria'
  if (first === 'share') return 'share'
  if (first === 'message') return 'message'

  if (first === 'respond' || first === 'invite') {
    const stateSegment = second?.startsWith('token-') ? third : second
    if (stateSegment === 'edit') return 'invite-edit'
    if (stateSegment === 'added') return 'invite'
    if (stateSegment === 'done') return 'invite-done'
    return 'invite'
  }

  return 'create'
}

export function getInviteTokenFromHash(hash = window.location.hash) {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean)
  return parts[0] === 'invite' && parts[1]?.startsWith('token-') ? parts[1] : undefined
}

export function getAudience(route: AppRoute): Audience {
  if (
    route === 'entry' ||
    route === 'home' ||
    route === 'meetings' ||
    route === 'requests' ||
    route === 'notifications'
  ) {
    return 'account'
  }
  if (route.startsWith('invite')) return 'participant'
  return 'host'
}

export function buildRouteHash(route: AppRoute, participantToken?: string) {
  const participantSuffix = route === 'invite-edit' ? 'edit' : route === 'invite-done' ? 'done' : ''
  return route.startsWith('invite') && participantToken
    ? `#/invite/${participantToken}${participantSuffix ? `/${participantSuffix}` : ''}`
    : routeHashes[route]
}

export function updateRouteHash(route: AppRoute, replace = false, participantToken?: string) {
  const nextHash = buildRouteHash(route, participantToken)
  if (window.location.hash === nextHash) return
  if (replace) {
    window.history.replaceState(null, '', nextHash)
    return
  }
  window.history.pushState(null, '', nextHash)
}
