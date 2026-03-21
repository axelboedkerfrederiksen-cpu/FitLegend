interface UserAvatarProps {
  avatarUrl: string | null
  displayName: string | null
  size?: number
}

export default function UserAvatar({ avatarUrl, displayName, size = 40 }: UserAvatarProps) {
  const initials = displayName
    ? displayName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={displayName ?? 'User'}
        width={size}
        height={size}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0 font-semibold"
      style={{
        width: size,
        height: size,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        color: 'var(--text-secondary)',
        fontSize: size * 0.35,
      }}
    >
      {initials}
    </div>
  )
}
