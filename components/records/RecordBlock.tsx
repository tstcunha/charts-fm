import { generateSlug, ChartType } from '@/lib/chart-slugs'
import ChartEntryCard from '@/components/ChartEntryCard'
import Tooltip from '@/components/Tooltip'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faQuestionCircle } from '@fortawesome/free-solid-svg-icons'

interface RecordBlockProps {
  title: string
  record: {
    entryKey?: string
    chartType?: ChartType
    name: string
    artist?: string | null
    slug?: string
    userId?: string
    value: number
    image?: string | null
  } | null
  value: string
  groupId: string
  isUser?: boolean
}

// Color schemes for each user award
const awardColorSchemes: Record<string, {
  bgGradient: string
  borderColor: string
  titleColor: string
  accentColor: string
  ribbonColor: string
}> = {
  'VS Virtuoso': {
    bgGradient: 'from-slate-50 to-gray-50',
    borderColor: 'border-slate-300',
    titleColor: 'text-slate-700',
    accentColor: 'text-slate-600',
    ribbonColor: 'bg-slate-400',
  },
  'Play Powerhouse': {
    bgGradient: 'from-red-50 to-rose-50',
    borderColor: 'border-red-300',
    titleColor: 'text-red-700',
    accentColor: 'text-red-600',
    ribbonColor: 'bg-red-500',
  },
  'Chart Connoisseur': {
    bgGradient: 'from-yellow-50 to-amber-50',
    borderColor: 'border-yellow-300',
    titleColor: 'text-yellow-700',
    accentColor: 'text-yellow-600',
    ribbonColor: 'bg-orange-500',
  },
  'Hidden Gem Hunter': {
    bgGradient: 'from-cyan-50 to-blue-50',
    borderColor: 'border-cyan-300',
    titleColor: 'text-cyan-700',
    accentColor: 'text-cyan-600',
    ribbonColor: 'bg-blue-500',
  },
  'Consistency Champion': {
    bgGradient: 'from-gray-50 to-slate-50',
    borderColor: 'border-gray-400',
    titleColor: 'text-gray-800',
    accentColor: 'text-gray-700',
    ribbonColor: 'bg-gray-800',
  },
  'Taste Maker': {
    bgGradient: 'from-pink-50 to-fuchsia-50',
    borderColor: 'border-pink-300',
    titleColor: 'text-pink-700',
    accentColor: 'text-pink-600',
    ribbonColor: 'bg-pink-500',
  },
}

// Award descriptions for tooltips
const awardDescriptions: Record<string, string> = {
  'VS Virtuoso': 'The member who contributed the most total Vibe Score (VS) to this group\'s charts. They\'re the life of the group.',
  'Play Powerhouse': 'This is the member with the most total plays across all their contributions. They really love scrobbling.',
  'Chart Connoisseur': 'This member helped the most different entries make it onto the charts. They have broad taste.',
  'Hidden Gem Hunter': 'The member who helped the fewest entries chart. They keep it niche and curated.',
  'Consistency Champion': 'The member who contributed to charts for the most weeks. They show up every time.',
  'Taste Maker': 'This is the member who introduced the most entries that later became #1 hits. They have that magic touch.',
}

export default function RecordBlock({ title, record, value, groupId, isUser }: RecordBlockProps) {
  if (!record) {
    return null
  }

  const getLink = () => {
    if (isUser) {
      return null // Users don't have drill-down pages yet
    }

    if (record.entryKey && record.chartType) {
      const slug = record.slug || generateSlug(record.entryKey, record.chartType)
      return `/groups/${groupId}/charts/${record.chartType === 'artists' ? 'artist' : record.chartType === 'tracks' ? 'track' : 'album'}/${slug}`
    }

    return null
  }

  const link = getLink()
  
  // Get color scheme for this award, or use default
  const colorScheme = isUser && awardColorSchemes[title]
    ? awardColorSchemes[title]
    : {
        bgGradient: 'from-white/80 to-white/80',
        borderColor: 'border-theme',
        titleColor: 'text-gray-600',
        accentColor: 'text-[var(--theme-primary)]',
        ribbonColor: '',
      }

  // Get description for this award
  const description = isUser && awardDescriptions[title] ? awardDescriptions[title] : null

  return (
    <div className="h-full relative">
      <div className={`relative bg-gradient-to-br ${colorScheme.bgGradient} backdrop-blur-sm rounded-xl p-4 border ${colorScheme.borderColor} shadow-sm h-full transition-all hover:shadow-md`}>
        <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
          {isUser && colorScheme.ribbonColor && (
            <div className={`absolute top-2 right-0 ${colorScheme.ribbonColor} text-white text-xs font-bold px-8 py-1.5 transform rotate-12 translate-x-1 shadow-md z-10 whitespace-nowrap`}>
              {title.toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 mb-3 relative z-10">
          <h4 className={`text-sm font-semibold ${colorScheme.titleColor}`}>{title}</h4>
          {description && (
            <Tooltip content={description} position="top">
              <button
                type="button"
                className="flex items-center justify-center focus:outline-none"
                aria-label="What does this award mean?"
              >
                <FontAwesomeIcon 
                  icon={faQuestionCircle} 
                  className={`text-xs ${colorScheme.accentColor} opacity-60 hover:opacity-100 transition-opacity cursor-help`}
                />
              </button>
            </Tooltip>
          )}
        </div>
        <ChartEntryCard
          name={record.name}
          artist={record.artist}
          value={value}
          chartType={isUser ? 'user' : record.chartType}
          href={link}
          variant="nested"
          userImage={isUser ? record.image : undefined}
          accentColor={colorScheme.accentColor}
        />
      </div>
    </div>
  )
}

