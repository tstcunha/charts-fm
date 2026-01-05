// Color theme configurations for group pages
// Each theme defines a color palette used throughout the group page

export type ThemeName = 'yellow' | 'royal_blue' | 'cyan' | 'bright_red' | 'maroon' | 'graphite' | 'hot_pink' | 'neon_green' | 'white'

export interface ThemeColors {
  primary: string // Main theme color (for buttons, badges)
  primaryLight: string // Lighter variant (for hover states, backgrounds)
  primaryDark: string // Darker variant (for text gradients, borders)
  primaryLighter: string // Very light variant (for subtle backgrounds)
  primaryDarker: string // Very dark variant (for deep gradients)
  backgroundFrom: string // Page background gradient start
  backgroundTo: string // Page background gradient end (should be a lighter shade, not white)
  border: string // Border color
  text: string // Text color for stats/values
  ring: string // Ring color for icons/avatars
  buttonText: 'black' | 'white' // Text color for buttons (white for dark themes)
}

export const GROUP_THEMES: Record<ThemeName, ThemeColors> = {
  yellow: {
    primary: 'rgb(234 179 8)', // yellow-500
    primaryLight: 'rgb(250 204 21)', // yellow-400
    primaryDark: 'rgb(202 138 4)', // yellow-600
    primaryLighter: 'rgb(254 240 138)', // yellow-200
    primaryDarker: 'rgb(161 98 7)', // yellow-700
    backgroundFrom: 'rgb(254 249 195)', // yellow-100
    backgroundTo: 'rgb(254 252 232)', // yellow-50 (very subtle)
    border: 'rgb(254 240 138)', // yellow-200
    text: 'rgb(202 138 4)', // yellow-600
    ring: 'rgb(234 179 8)', // yellow-500
    buttonText: 'black',
  },
  royal_blue: {
    primary: 'rgb(37 99 235)', // blue-600
    primaryLight: 'rgb(59 130 246)', // blue-500
    primaryDark: 'rgb(29 78 216)', // blue-700
    primaryLighter: 'rgb(147 197 253)', // blue-300
    primaryDarker: 'rgb(30 64 175)', // blue-800
    backgroundFrom: 'rgb(219 234 254)', // blue-100
    backgroundTo: 'rgb(239 246 255)', // blue-50 (very subtle)
    border: 'rgb(147 197 253)', // blue-300
    text: 'rgb(29 78 216)', // blue-700
    ring: 'rgb(37 99 235)', // blue-600
    buttonText: 'white',
  },
  cyan: {
    primary: 'rgb(6 182 212)', // cyan-500
    primaryLight: 'rgb(34 211 238)', // cyan-400
    primaryDark: 'rgb(8 145 178)', // cyan-600
    primaryLighter: 'rgb(103 232 249)', // cyan-300
    primaryDarker: 'rgb(14 116 144)', // cyan-700
    backgroundFrom: 'rgb(207 250 254)', // cyan-100
    backgroundTo: 'rgb(236 254 255)', // cyan-50 (very subtle)
    border: 'rgb(103 232 249)', // cyan-300
    text: 'rgb(8 145 178)', // cyan-600
    ring: 'rgb(6 182 212)', // cyan-500
    buttonText: 'white',
  },
  bright_red: {
    primary: 'rgb(220 38 38)', // red-600
    primaryLight: 'rgb(239 68 68)', // red-500
    primaryDark: 'rgb(185 28 28)', // red-700
    primaryLighter: 'rgb(252 165 165)', // red-300
    primaryDarker: 'rgb(153 27 27)', // red-800
    backgroundFrom: 'rgb(254 226 226)', // red-100
    backgroundTo: 'rgb(255 241 242)', // red-50 (very subtle)
    border: 'rgb(252 165 165)', // red-300
    text: 'rgb(185 28 28)', // red-700
    ring: 'rgb(220 38 38)', // red-600
    buttonText: 'white',
  },
  maroon: {
    primary: 'rgb(128 0 0)', // true maroon
    primaryLight: 'rgb(139 0 0)', // dark red (slightly lighter maroon)
    primaryDark: 'rgb(100 0 0)', // darker maroon
    primaryLighter: 'rgb(160 82 45)', // saddle brown (brown-red)
    primaryDarker: 'rgb(80 0 0)', // very dark maroon
    backgroundFrom: 'rgb(250 235 215)', // antique white (warm light brown)
    backgroundTo: 'rgb(255 248 240)', // very light warm tint
    border: 'rgb(205 133 63)', // peru (brown-red)
    text: 'rgb(100 0 0)', // dark maroon
    ring: 'rgb(128 0 0)', // maroon
    buttonText: 'white',
  },
  graphite: {
    primary: 'rgb(75 85 99)', // gray-600
    primaryLight: 'rgb(107 114 128)', // gray-500
    primaryDark: 'rgb(55 65 81)', // gray-700
    primaryLighter: 'rgb(156 163 175)', // gray-400
    primaryDarker: 'rgb(31 41 55)', // gray-800
    backgroundFrom: 'rgb(243 244 246)', // gray-100
    backgroundTo: 'rgb(249 250 251)', // gray-50 (very subtle)
    border: 'rgb(209 213 219)', // gray-300
    text: 'rgb(55 65 81)', // gray-700
    ring: 'rgb(75 85 99)', // gray-600
    buttonText: 'white',
  },
  hot_pink: {
    primary: 'rgb(255 105 180)', // hot pink
    primaryLight: 'rgb(255 20 147)', // deep pink
    primaryDark: 'rgb(219 39 119)', // pink-600
    primaryLighter: 'rgb(251 182 206)', // pink-300
    primaryDarker: 'rgb(199 21 133)', // medium violet red
    backgroundFrom: 'rgb(253 244 255)', // pink-50
    backgroundTo: 'rgb(255 250 255)', // very light pink (very subtle)
    border: 'rgb(251 182 206)', // pink-300
    text: 'rgb(219 39 119)', // pink-600
    ring: 'rgb(255 105 180)', // hot pink
    buttonText: 'white',
  },
  neon_green: {
    primary: 'rgb(22 163 74)', // green-600
    primaryLight: 'rgb(34 197 94)', // green-500
    primaryDark: 'rgb(21 128 61)', // green-700
    primaryLighter: 'rgb(134 239 172)', // green-300
    primaryDarker: 'rgb(20 83 45)', // green-800
    backgroundFrom: 'rgb(220 252 231)', // green-100
    backgroundTo: 'rgb(240 253 244)', // green-50 (very subtle)
    border: 'rgb(134 239 172)', // green-300
    text: 'rgb(21 128 61)', // green-700
    ring: 'rgb(22 163 74)', // green-600
    buttonText: 'white',
  },
  white: {
    primary: 'rgb(234 179 8)', // yellow-500 (for buttons and highlights)
    primaryLight: 'rgb(250 204 21)', // yellow-400
    primaryDark: 'rgb(17 24 39)', // gray-900 (very dark grey for titles)
    primaryLighter: 'rgb(254 240 138)', // yellow-200
    primaryDarker: 'rgb(161 98 7)', // yellow-700
    backgroundFrom: 'rgb(255 255 255)', // white
    backgroundTo: 'rgb(249 250 251)', // gray-50 (very subtle)
    border: 'rgb(229 231 235)', // gray-200
    text: 'rgb(202 138 4)', // yellow-600 (for highlights)
    ring: 'rgb(234 179 8)', // yellow-500
    buttonText: 'black',
  },
}

export const THEME_NAMES: ThemeName[] = ['white', 'yellow', 'royal_blue', 'cyan', 'bright_red', 'graphite', 'hot_pink', 'neon_green']

export const THEME_DISPLAY_NAMES: Record<ThemeName, string> = {
  yellow: 'Yellow',
  royal_blue: 'Royal Blue',
  cyan: 'Sky Blue',
  bright_red: 'Bright Red',
  maroon: 'Maroon',
  graphite: 'Graphite',
  hot_pink: 'Hot Pink',
  neon_green: 'Emerald Green',
  white: 'White',
}

