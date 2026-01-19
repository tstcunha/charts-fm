// Default images for groups

export const DEFAULT_GROUP_IMAGE = '/default-group-icon.svg'

// You can replace this with an actual SVG or image path
// For now, using a data URI for a simple default icon
export function getDefaultGroupImage(): string {
  // Simple music note icon as data URI
  return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%236366f1'%3E%3Cpath d='M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z'/%3E%3C/svg%3E"
}

// Default placeholder image for artists
// Returns a simple artist/microphone icon as a data URI
export function getDefaultArtistImage(): string {
  // Simple microphone icon with gradient background
  // This represents an artist when no image is available
  return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cdefs%3E%3ClinearGradient id='bg' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%23f3f4f6'/%3E%3Cstop offset='100%25' stop-color='%23e5e7eb'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='100' height='100' fill='url(%23bg)'/%3E%3Cg transform='translate(50,50)'%3E%3Cpath d='M0,-25 C-8,-25 -15,-18 -15,-10 L-15,10 C-15,18 -8,25 0,25 C8,25 15,18 15,10 L15,-10 C15,-18 8,-25 0,-25 Z' fill='%239ca3af'/%3E%3Crect x='-3' y='10' width='6' height='15' rx='3' fill='%239ca3af'/%3E%3Crect x='-10' y='25' width='20' height='3' rx='1.5' fill='%239ca3af' opacity='0.6'/%3E%3C/g%3E%3C/svg%3E"
}

// Default placeholder image for albums
// Returns a simple album/CD icon as a data URI
export function getDefaultAlbumImage(): string {
  // Simple CD/album icon with gradient background
  // This represents an album when no image is available
  return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cdefs%3E%3ClinearGradient id='albumbg' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%23f3f4f6'/%3E%3Cstop offset='100%25' stop-color='%23e5e7eb'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='100' height='100' fill='url(%23albumbg)'/%3E%3Cg transform='translate(50,50)'%3E%3Ccircle r='30' fill='%239ca3af' opacity='0.3'/%3E%3Ccircle r='25' fill='none' stroke='%239ca3af' stroke-width='2'/%3E%3Ccircle r='8' fill='%239ca3af'/%3E%3C/g%3E%3C/svg%3E"
}

