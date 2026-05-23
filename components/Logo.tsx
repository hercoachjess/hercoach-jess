export default function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeMap = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-4xl',
  }
  return (
    <div className="flex flex-col items-start gap-0.5">
      <span
        className={`logo-text tracking-wide ${sizeMap[size]}`}
        style={{ color: '#f0ece4' }}
      >
        hercoach{' '}
        <span style={{ color: 'rgba(240,236,228,0.4)', fontStyle: 'normal' }}>·</span>{' '}
        Jess
      </span>
      {size !== 'sm' && (
        <span
          className="text-xs tracking-widest uppercase"
          style={{ color: 'rgba(240,236,228,0.35)', fontFamily: 'var(--font-jost)', letterSpacing: '0.2em' }}
        >
          Less restriction. More you.
        </span>
      )}
    </div>
  )
}
