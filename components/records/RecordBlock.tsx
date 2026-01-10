import { generateSlug, ChartType } from '@/lib/chart-slugs'
import ChartEntryCard from '@/components/ChartEntryCard'
import Tooltip from '@/components/Tooltip'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faQuestionCircle, faChevronRight } from '@fortawesome/free-solid-svg-icons'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'
import { Link } from '@/i18n/routing'
import { isRecordTypeSupported } from '@/lib/group-records'

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

// Map record title to URL-friendly record type
function getRecordTypeFromTitle(title: string, tChartRecords: (key: string) => string): string | null {
  // Map translated titles to record types
  const titleToType: Record<string, string> = {
    [tChartRecords('mostWeeksOnChart')]: 'most-weeks-on-chart',
    [tChartRecords('mostWeeksAtOne')]: 'most-weeks-at-one',
    [tChartRecords('mostWeeksInTop10')]: 'most-weeks-in-top-10',
    [tChartRecords('mostConsecutiveWeeks')]: 'most-consecutive-weeks',
    [tChartRecords('mostPlaysReceived')]: 'most-plays',
    [tChartRecords('totalAllTimeVS')]: 'most-total-vs',
    // Artist-specific record types
    [tChartRecords('artistMostNumberOneSongs')]: 'artist-most-number-one-songs',
    [tChartRecords('artistMostNumberOneAlbums')]: 'artist-most-number-one-albums',
    [tChartRecords('artistMostSongsInTop10')]: 'artist-most-songs-in-top-10',
    [tChartRecords('artistMostAlbumsInTop10')]: 'artist-most-albums-in-top-10',
    [tChartRecords('artistMostSongsCharted')]: 'artist-most-songs-charted',
    [tChartRecords('artistMostAlbumsCharted')]: 'artist-most-albums-charted',
  }
  
  return titleToType[title] || null
}

export default function RecordBlock({ title, record, value, groupId, isUser }: RecordBlockProps) {
  const tAwardDescriptions = useSafeTranslations('records.userRecords.awardDescriptions')
  const tUserRecords = useSafeTranslations('records.userRecords')
  const tChartRecords = useSafeTranslations('records.chartRecords')
  
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
  const recordType = getRecordTypeFromTitle(title, tChartRecords)
  const hasDetailPage = recordType && isRecordTypeSupported(recordType)
  const detailPageLink = hasDetailPage ? `/groups/${groupId}/records/${recordType}` : null
  
  // Map translated award title back to English key for color scheme lookup
  const getAwardEnglishKey = (awardTitle: string): string | null => {
    if (!isUser) return null
    
    // Map award titles to translation keys - check both English and translated versions
    const awardKeys = ['vsVirtuoso', 'playPowerhouse', 'chartConnoisseur', 'hiddenGemHunter', 'consistencyChampion', 'tasteMaker']
    
    // Find the key that matches the title (works for both English and translated titles)
    const matchingKey = awardKeys.find(key => tUserRecords(key) === awardTitle)
    
    return matchingKey || null
  }
  
  // Get English title from the key (for color scheme lookup)
  const getEnglishTitle = (key: string): string => {
    // Use English translations directly
    const englishTitles: Record<string, string> = {
      'vsVirtuoso': 'VS Virtuoso',
      'playPowerhouse': 'Play Powerhouse',
      'chartConnoisseur': 'Chart Connoisseur',
      'hiddenGemHunter': 'Hidden Gem Hunter',
      'consistencyChampion': 'Consistency Champion',
      'tasteMaker': 'Taste Maker',
    }
    return englishTitles[key] || ''
  }
  
  // Get color scheme for this award, or use default
  const awardKey = isUser ? getAwardEnglishKey(title) : null
  const englishTitle = awardKey ? getEnglishTitle(awardKey) : null
  const colorScheme = isUser && englishTitle && awardColorSchemes[englishTitle]
    ? awardColorSchemes[englishTitle]
    : {
        bgGradient: 'from-white/80 to-white/80',
        borderColor: 'border-theme',
        titleColor: 'text-gray-600',
        accentColor: 'text-[var(--theme-primary)]',
        ribbonColor: '',
      }

  // Get description for this award
  const getAwardDescription = (awardTitle: string): string | null => {
    if (!isUser) return null
    
    // Map award titles to translation keys - check both English and translated versions
    const awardKeys = ['vsVirtuoso', 'playPowerhouse', 'chartConnoisseur', 'hiddenGemHunter', 'consistencyChampion', 'tasteMaker']
    
    // Find the key that matches the title (works for both English and translated titles)
    const matchingKey = awardKeys.find(key => tUserRecords(key) === awardTitle)
    
    if (matchingKey) {
      return tAwardDescriptions(matchingKey)
    }
    
    return null
  }
  
  const description = getAwardDescription(title)

  return (
    <div className="h-full relative">
      <div className={`relative bg-gradient-to-br ${colorScheme.bgGradient} backdrop-blur-sm rounded-xl p-3 md:p-4 border ${colorScheme.borderColor} shadow-sm h-full transition-all hover:shadow-md`}>
        <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
          {isUser && colorScheme.ribbonColor && (
            <div className={`absolute top-2 right-0 ${colorScheme.ribbonColor} text-white text-[10px] md:text-xs font-bold px-4 md:px-8 py-1 md:py-1.5 transform rotate-12 translate-x-1 shadow-md z-10 whitespace-nowrap`}>
              {title.toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 mb-2 md:mb-3 relative z-10">
          {hasDetailPage && detailPageLink ? (
            <Link
              href={detailPageLink}
              className={`flex items-center gap-1.5 text-xs md:text-sm font-semibold ${colorScheme.titleColor} hover:underline transition-colors cursor-pointer`}
            >
              {title}
              <FontAwesomeIcon 
                icon={faChevronRight} 
                className="text-[10px] md:text-xs opacity-70"
              />
            </Link>
          ) : (
            <h4 className={`text-xs md:text-sm font-semibold ${colorScheme.titleColor}`}>{title}</h4>
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
          openInNewTab={false}
        >
          {isUser && description && (
            <Tooltip content={description} position="top">
              <button
                type="button"
                className="absolute bottom-2 right-2 flex items-center justify-center w-5 h-5 md:w-6 md:h-6 rounded-full bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-gray-600 hover:text-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] focus:ring-opacity-50 focus:ring-offset-1 z-10"
                aria-label="What does this award mean?"
              >
                <FontAwesomeIcon 
                  icon={faQuestionCircle} 
                  className="text-xs flex-shrink-0"
                />
              </button>
            </Tooltip>
          )}
        </ChartEntryCard>
      </div>
    </div>
  )
}

