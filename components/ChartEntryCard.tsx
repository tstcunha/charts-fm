import { Link } from '@/i18n/routing'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { faMusic, faMicrophone, faCompactDisc, faUser } from '@fortawesome/free-solid-svg-icons'
import { ChartType } from '@/lib/chart-slugs'
import SafeImage from '@/components/SafeImage'

interface ChartEntryCardProps {
  name: string
  artist?: string | null
  value?: string | React.ReactNode
  icon?: IconDefinition
  chartType?: ChartType | 'user'
  href?: string | null
  className?: string
  onClick?: () => void
  children?: React.ReactNode
  variant?: 'default' | 'nested'
  userImage?: string | null
  accentColor?: string
  openInNewTab?: boolean
}

export default function ChartEntryCard({
  name,
  artist,
  value,
  icon,
  chartType,
  href,
  className = '',
  onClick,
  children,
  variant = 'default',
  userImage,
  accentColor,
  openInNewTab = false,
}: ChartEntryCardProps) {
  // Determine icon based on chartType if icon not provided
  const getIcon = () => {
    if (icon) return icon
    if (chartType === 'artists') return faMicrophone
    if (chartType === 'tracks') return faMusic
    if (chartType === 'albums') return faCompactDisc
    if (chartType === 'user') return faUser
    return faMusic
  }

  // Use accent color if provided, otherwise use theme primary
  const iconColorClass = accentColor || 'text-[var(--theme-primary)]'
  
  // Extract color name from accentColor for ring (e.g., "text-purple-600" -> "ring-purple-300")
  const getRingColor = () => {
    if (!accentColor) return 'ring-[var(--theme-primary)]/30'
    // Extract color from classes like "text-purple-600" -> "purple"
    const match = accentColor.match(/text-(\w+)-/)
    if (match) {
      return `ring-${match[1]}-300/30`
    }
    return 'ring-[var(--theme-primary)]/30'
  }
  
  // Render icon or user image
  const iconElement = chartType === 'user' && userImage ? (
    <div className={`relative w-10 h-10 rounded-full ring-2 ${getRingColor()} bg-[var(--theme-primary-lighter)] flex-shrink-0 overflow-hidden`}>
      <SafeImage
        src={userImage}
        alt={name}
        className="object-cover w-full h-full"
      />
    </div>
  ) : (
    <FontAwesomeIcon 
      icon={getIcon()} 
      className={`text-lg ${iconColorClass}`}
    />
  )

  const baseClasses = 'flex items-center gap-3 p-3 rounded-lg transition-all'
  const variantClasses = variant === 'nested'
    ? 'bg-white/60 hover:bg-[var(--theme-primary-lighter)]/40 border border-[var(--theme-border)]/50'
    : 'bg-white/80 hover:bg-[var(--theme-primary-lighter)]/50 border border-[var(--theme-border)]'

  const content = (
    <div
      className={`${baseClasses} ${variantClasses} ${className}`}
      onClick={onClick}
    >
      {iconElement}
      <div className="flex-1 min-w-0">
        {href ? (
          <Link
            href={href}
            target={openInNewTab ? "_blank" : undefined}
            rel={openInNewTab ? "noopener noreferrer" : undefined}
            className="font-semibold text-gray-900 break-words hover:text-[var(--theme-primary)] transition-colors"
          >
            {name}
            {artist && (
              <span className="text-sm font-normal text-gray-600"> by {artist}</span>
            )}
          </Link>
        ) : (
          <div className="font-semibold text-gray-900 break-words">
            {name}
            {artist && (
              <span className="text-sm font-normal text-gray-600"> by {artist}</span>
            )}
          </div>
        )}
        {value && (
          <div className={`text-sm ${accentColor || 'text-[var(--theme-primary)]'} font-semibold mt-1`}>
            {value}
          </div>
        )}
        {children}
      </div>
    </div>
  )

  return content
}

