import { Link } from '@/i18n/routing'
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
  narrow?: boolean
}

export default function GroupPageHero({ group, breadcrumbs, subheader, actionButton, narrow = false }: GroupPageHeroProps) {
  return (
    <div className={narrow ? "mb-4" : "mb-6"}>
      <div className={`bg-[var(--theme-background-from)] rounded-xl shadow-lg border border-theme ${narrow ? 'p-3' : 'p-4'}`}>
        <nav className={`flex items-center gap-2 text-sm ${narrow ? 'mb-2' : 'mb-3'}`}>
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
          <div className={`relative flex-shrink-0 ${narrow ? 'w-10 h-10' : 'w-12 h-12'}`}>
            <div className={`${narrow ? 'w-10 h-10' : 'w-12 h-12'} rounded-lg overflow-hidden shadow-md ring-2 ring-[var(--theme-ring)]/30 bg-[var(--theme-primary-lighter)]`}>
              <SafeImage
                src={group.image}
                alt={group.name}
                className="object-cover w-full h-full"
              />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className={`font-bold text-[var(--theme-primary-dark)] ${narrow ? 'text-xl mb-0.5' : 'text-2xl mb-1'}`}>
              {group.name}
            </h1>
            {typeof subheader === 'string' ? (
              <p className={`text-gray-500 ${narrow ? 'text-xs mt-0.5' : 'text-xs mt-1'}`}>{subheader}</p>
            ) : (
              <div className={`text-gray-500 ${narrow ? 'text-xs mt-0.5' : 'text-xs mt-1'}`}>{subheader}</div>
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

