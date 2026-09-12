import { Avatar } from './ui/avatar'
import './PersonIdentity.css'
export function PersonIdentity({ name, detail }: { name: string; detail: string }) {
  return (
    <div className="person-identity">
      <Avatar name={name} size="small" />
      <span>
        <strong>{name}</strong>
        <small>{detail}</small>
      </span>
    </div>
  )
}
