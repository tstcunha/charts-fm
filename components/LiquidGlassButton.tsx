'use client'

import { ButtonHTMLAttributes, ReactNode, forwardRef, AnchorHTMLAttributes } from 'react'
import { Link } from '@/i18n/routing'

interface LiquidGlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'neutral'
  size?: 'sm' | 'md' | 'lg'
  icon?: ReactNode
  fullWidth?: boolean
  useTheme?: boolean
}

const LiquidGlassButton = forwardRef<HTMLButtonElement, LiquidGlassButtonProps>(({
  variant = 'primary',
  size = 'md',
  icon,
  fullWidth = false,
  useTheme = true,
  className = '',
  children,
  disabled,
  style,
  ...props
}, ref) => {
  const baseStyles = {
    background: 'rgba(255, 255, 255, 0.4)',
    backdropFilter: 'blur(12px) saturate(180%)',
    WebkitBackdropFilter: 'blur(12px) saturate(180%)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  }

  const variantStyles = {
    primary: useTheme
      ? {
          background: 'var(--theme-primary)',
          color: 'var(--theme-button-text)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
        }
      : {
          background: 'rgb(234 179 8)',
          color: 'black',
          border: '1px solid rgba(255, 255, 255, 0.2)',
        },
    secondary: {
      background: 'rgba(255, 255, 255, 0.5)',
      color: useTheme ? 'var(--theme-primary-dark)' : 'rgb(17 24 39)',
      border: '1px solid rgba(255, 255, 255, 0.4)',
    },
    danger: {
      background: 'rgba(239, 68, 68, 0.8)',
      color: 'white',
      border: '1px solid rgba(255, 255, 255, 0.2)',
    },
    neutral: {
      background: 'rgba(255, 255, 255, 0.4)',
      color: 'rgb(55 65 81)',
      border: '1px solid rgba(255, 255, 255, 0.3)',
    },
  }

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  }

  const isIconOnly = !children && icon

  return (
    <button
      ref={ref}
      className={`
        rounded-full font-semibold transition-all duration-200
        flex items-center justify-center gap-2
        ${sizeStyles[size]}
        ${fullWidth ? 'w-full' : ''}
        ${isIconOnly ? 'aspect-square' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg active:scale-95'}
        ${className}
      `}
      style={{
        ...baseStyles,
        ...variantStyles[variant],
        ...(disabled && {
          opacity: 0.5,
          cursor: 'not-allowed',
        }),
        ...style,
      }}
      disabled={disabled}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.filter = 'brightness(1.15)'
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.filter = ''
        }
      }}
      {...props}
    >
      {icon && <span className={children ? '' : ''}>{icon}</span>}
      {children}
    </button>
  )
})

LiquidGlassButton.displayName = 'LiquidGlassButton'

export default LiquidGlassButton

// Link version for navigation
interface LiquidGlassLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  href: string
  variant?: 'primary' | 'secondary' | 'danger' | 'neutral'
  size?: 'sm' | 'md' | 'lg'
  icon?: ReactNode
  fullWidth?: boolean
  useTheme?: boolean
}

export function LiquidGlassLink({
  href,
  variant = 'primary',
  size = 'md',
  icon,
  fullWidth = false,
  useTheme = true,
  className = '',
  children,
  ...props
}: LiquidGlassLinkProps) {
  const baseStyles = {
    background: 'rgba(255, 255, 255, 0.4)',
    backdropFilter: 'blur(12px) saturate(180%)',
    WebkitBackdropFilter: 'blur(12px) saturate(180%)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  }

  const variantStyles = {
    primary: useTheme
      ? {
          background: 'var(--theme-primary)',
          color: 'var(--theme-button-text)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
        }
      : {
          background: 'rgb(234 179 8)',
          color: 'black',
          border: '1px solid rgba(255, 255, 255, 0.2)',
        },
    secondary: {
      background: 'rgba(255, 255, 255, 0.5)',
      color: useTheme ? 'var(--theme-primary-dark)' : 'rgb(17 24 39)',
      border: '1px solid rgba(255, 255, 255, 0.4)',
    },
    danger: {
      background: 'rgba(239, 68, 68, 0.8)',
      color: 'white',
      border: '1px solid rgba(255, 255, 255, 0.2)',
    },
    neutral: {
      background: 'rgba(255, 255, 255, 0.4)',
      color: 'rgb(55 65 81)',
      border: '1px solid rgba(255, 255, 255, 0.3)',
    },
  }

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  }

  const isIconOnly = !children && icon

  return (
    <Link
      href={href}
      className={`
        rounded-full font-semibold transition-all duration-200
        flex items-center justify-center gap-2
        ${sizeStyles[size]}
        ${fullWidth ? 'w-full' : ''}
        ${isIconOnly ? 'aspect-square' : ''}
        hover:shadow-lg active:scale-95
        ${className}
      `}
      style={{
        ...baseStyles,
        ...variantStyles[variant],
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.filter = 'brightness(1.15)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.filter = ''
      }}
      {...props}
    >
      {icon && <span>{icon}</span>}
      {children}
    </Link>
  )
}

