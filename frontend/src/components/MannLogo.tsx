// Logo is in /public/image.png — accessed via absolute path in Vite

interface MannLogoProps {
  size?: number
  showText?: boolean
  textColor?: string
}

export default function MannLogo({
  size = 32,
  showText = true,
  textColor = 'var(--sidebar-text-h)',
}: MannLogoProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, userSelect: 'none' }}>
      <img
        src="/image.png"
        alt="MANN"
        width={size}
        height={size}
        style={{
          objectFit: 'contain',
          borderRadius: size * 0.18,
          flexShrink: 0,
          display: 'block',
        }}
      />
      {showText && (
        <span
          style={{
            fontSize: size * 0.5,
            fontWeight: 800,
            letterSpacing: '-0.03em',
            color: textColor,
            lineHeight: 1,
            fontFamily: 'inherit',
          }}
        >
          MANN
        </span>
      )}
    </div>
  )
}
