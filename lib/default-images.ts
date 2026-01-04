// Default images for groups

export const DEFAULT_GROUP_IMAGE = '/default-group-icon.svg'

// You can replace this with an actual SVG or image path
// For now, using a data URI for a simple default icon
export function getDefaultGroupImage(): string {
  // Simple music note icon as data URI
  return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%236366f1'%3E%3Cpath d='M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z'/%3E%3C/svg%3E"
}

