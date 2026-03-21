interface EmptyStateProps {
  icon: string
  title: string
  description: string
  action?: React.ReactNode
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-4">
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {icon}
      </div>
      <div>
        <h3
          className="text-lg font-semibold mb-1"
          style={{ color: '#e8e6e1', fontFamily: 'var(--font-outfit)' }}
        >
          {title}
        </h3>
        <p
          className="text-sm"
          style={{ color: '#888', fontFamily: 'var(--font-outfit)' }}
        >
          {description}
        </p>
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
