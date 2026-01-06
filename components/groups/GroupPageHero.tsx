import Link from 'next/link'
import SafeImage from '@/components/SafeImage'

interface BreadcrumbSegment {
  label: string
  href?: string
}

interface GroupPageHeroProps {
  group: {
    id: string
    name: string
    image: string | null
  }
  breadcrumbs: BreadcrumbSegment[]
  subheader: string | React.ReactNode
  actionButton?: React.ReactNode
}

export default function GroupPageHero({ group, breadcrumbs, subheader, actionButton }: GroupPageHeroProps) {
  return (
    <div className="mb-6">
      <div className="bg-[var(--theme-background-from)] rounded-xl shadow-lg p-4 border border-theme">
        <nav className="mb-3 flex items-center gap-2 text-sm">
          {breadcrumbs.map((segment, index) => (
            <span key={index} className="flex items-center gap-2">
              {segment.href ? (
                <Link
                  href={segment.href}
                  className="text-gray-500 hover:text-[var(--theme-text)] transition-colors"
                >
                  {segment.label}
                </Link>
              ) : (
                <span className="text-gray-900 font-medium">{segment.label}</span>
              )}
              {index < breadcrumbs.length - 1 && <span className="text-gray-400">/</span>}
            </span>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 flex-shrink-0">
            <div className="w-12 h-12 rounded-lg overflow-hidden shadow-md ring-2 ring-[var(--theme-ring)]/30 bg-[var(--theme-primary-lighter)]">
              <SafeImage
                src={group.image}
                alt={group.name}
                className="object-cover w-full h-full"
              />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-[var(--theme-primary-dark)] mb-1">
              {group.name}
            </h1>
            {typeof subheader === 'string' ? (
              <p className="text-xs text-gray-500 mt-1">{subheader}</p>
            ) : (
              <div className="text-xs text-gray-500 mt-1">{subheader}</div>
            )}
          </div>
          {actionButton && (
            <div className="flex-shrink-0">
              {actionButton}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

