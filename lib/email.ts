import { Resend } from 'resend'
import crypto from 'crypto'
import { routing } from '@/i18n/routing'
import { prisma } from '@/lib/prisma'

// Initialize Resend with API key (can be undefined for development)
const resendApiKey = process.env.RESEND_API_KEY
const resend = resendApiKey ? new Resend(resendApiKey) : null

/**
 * Load translations for a given locale
 */
async function loadTranslations(locale: string) {
  try {
    const messages = await import(`@/messages/${locale}.json`)
    return messages.default
  } catch {
    // Fallback to default locale if locale file doesn't exist
    const messages = await import(`@/messages/${routing.defaultLocale}.json`)
    return messages.default
  }
}

/**
 * Get locale from user's profile or default
 */
async function getUserLocale(email: string): Promise<string> {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { locale: true },
    })
    
    if (user?.locale && routing.locales.includes(user.locale)) {
      return user.locale
    }
  } catch (error) {
    console.error('Error getting user locale:', error)
  }
  
  return routing.defaultLocale
}

/**
 * Generate a cryptographically secure verification token
 */
export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Send verification email to user
 */
export async function sendVerificationEmail(
  email: string,
  token: string,
  name: string,
  locale?: string
): Promise<void> {
  // Get locale from user profile or use provided/default
  const userLocale = locale || await getUserLocale(email)
  const messages = await loadTranslations(userLocale)
  const t = (key: string, params?: Record<string, string>) => {
    const keys = key.split('.')
    let value: any = messages
    for (const k of keys) {
      value = value?.[k]
    }
    if (typeof value !== 'string') return key
    // Simple parameter replacement
    if (params) {
      return Object.entries(params).reduce((str, [param, val]) => {
        return str.replace(new RegExp(`\\{${param}\\}`, 'g'), val)
      }, value)
    }
    return value
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  // Use API route with redirect for direct email clicks, page route for manual entry
  const verificationUrl = `${appUrl}/api/auth/verify-email?token=${token}&redirect=true`

  // Check if Resend is configured
  if (!resend) {
    console.warn('⚠️  RESEND_API_KEY not set. Email will not be sent.')
    console.log('='.repeat(80))
    console.log('📧 VERIFICATION EMAIL (Development Mode - No API Key)')
    console.log('='.repeat(80))
    console.log(`To: ${email}`)
    console.log(`Subject: Verify your ChartsFM account`)
    console.log(`\nVerification URL: ${verificationUrl}`)
    console.log('='.repeat(80))
    console.log('\nTo actually send emails:')
    console.log('1. Get API key from https://resend.com')
    console.log('2. Add RESEND_API_KEY to your .env.local file')
    console.log('3. For testing, you can use Resend\'s test domain: onboarding@resend.dev')
    console.log('='.repeat(80))
    return // Don't throw - allow development to continue
  }

  // Use verified domain email if configured, otherwise use Resend's test domain
  // To use your verified domain, set RESEND_FROM_EMAIL in .env.local
  // Example: RESEND_FROM_EMAIL=noreply@yourdomain.com
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
  const fromName = process.env.RESEND_FROM_NAME || 'ChartsFM'
  const from = `${fromName} <${fromEmail}>`

  // Warn if using test domain in production
  if (fromEmail === 'onboarding@resend.dev' && process.env.NODE_ENV === 'production') {
    console.warn('⚠️  Using Resend test domain. Set RESEND_FROM_EMAIL to use your verified domain.')
  }

  const emailSubject = t('auth.emails.verification.subject')
  const emailTitle = t('auth.emails.verification.title')
  const greeting = name 
    ? t('auth.emails.verification.greeting', { name })
    : t('auth.emails.verification.greetingFallback')
  const emailBody = t('auth.emails.verification.body')
  const buttonText = t('auth.emails.verification.button')
  const orCopyPaste = t('auth.emails.verification.orCopyPaste')
  const expires = t('auth.emails.verification.expires')
  const footer = t('auth.emails.verification.footer', { year: new Date().getFullYear().toString() })

  // In development, log the email content
  if (process.env.NODE_ENV === 'development') {
    console.log('='.repeat(80))
    console.log('📧 SENDING VERIFICATION EMAIL')
    console.log('='.repeat(80))
    console.log(`From: ${from}`)
    console.log(`To: ${email}`)
    console.log(`Subject: ${emailSubject}`)
    console.log(`Locale: ${userLocale}`)
    console.log(`\nVerification URL: ${verificationUrl}`)
    console.log('='.repeat(80))
  }

  try {
    const result = await resend.emails.send({
      from,
      to: email,
      subject: emailSubject,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${emailSubject}</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #fef9c3, #fefce8); padding: 30px; border-radius: 12px; margin-bottom: 20px;">
              <h1 style="margin: 0; color: #854d0e; font-size: 28px;">🎵 ${emailTitle}</h1>
            </div>
            
            <p style="font-size: 16px;">${greeting}</p>
            
            <p style="font-size: 16px;">
              ${emailBody}
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" 
                 style="display: inline-block; background: #ca8a04; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(202, 138, 4, 0.3);">
                ${buttonText}
              </a>
            </div>
            
            <p style="font-size: 14px; color: #666;">
              ${orCopyPaste}
            </p>
            <p style="font-size: 14px; color: #666; word-break: break-all;">
              <a href="${verificationUrl}" style="color: #ca8a04;">${verificationUrl}</a>
            </p>
            
            <p style="font-size: 14px; color: #666; margin-top: 30px;">
              ${expires}
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="font-size: 12px; color: #999; text-align: center;">
              ${footer}
            </p>
          </body>
        </html>
      `,
      text: `
${emailTitle}

${greeting}

${emailBody}

${verificationUrl}

${expires}

${footer}
      `.trim(),
    })

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Email sent successfully!')
      console.log('Response:', JSON.stringify(result, null, 2))
    }
  } catch (error: any) {
    console.error('❌ Failed to send verification email:')
    console.error('Error details:', error)
    
    // Log more details about the error
    if (error?.message) {
      console.error('Error message:', error.message)
      
      // Check for domain verification error
      if (error.message.includes('verify a domain') || error.message.includes('testing emails')) {
        console.error('\n🔧 SOLUTION:')
        console.error('1. Add RESEND_FROM_EMAIL to your .env.local file')
        console.error('2. Use an email address from your verified domain')
        console.error('   Example: RESEND_FROM_EMAIL=noreply@yourdomain.com')
        console.error('3. Restart your development server')
        console.error('4. Verify your domain at: https://resend.com/domains')
      }
    }
    if (error?.response) {
      console.error('Error response:', error.response)
    }

    // In production, throw the error so it can be handled upstream
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Failed to send verification email: ${error?.message || 'Unknown error'}`)
    } else {
      // In development, log but don't throw to allow testing
      console.warn('⚠️  Email sending failed, but continuing in development mode')
      console.warn('⚠️  Check your RESEND_API_KEY and domain configuration')
    }
  }
}

/**
 * Send password reset email to user
 */
export async function sendPasswordResetEmail(
  email: string,
  token: string,
  name: string,
  locale?: string
): Promise<void> {
  // Get locale from user profile or use provided/default
  const userLocale = locale || await getUserLocale(email)
  const messages = await loadTranslations(userLocale)
  const t = (key: string, params?: Record<string, string>) => {
    const keys = key.split('.')
    let value: any = messages
    for (const k of keys) {
      value = value?.[k]
    }
    if (typeof value !== 'string') return key
    // Simple parameter replacement
    if (params) {
      return Object.entries(params).reduce((str, [param, val]) => {
        return str.replace(new RegExp(`\\{${param}\\}`, 'g'), val)
      }, value)
    }
    return value
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const resetUrl = `${appUrl}/auth/reset-password?token=${token}`

  // Check if Resend is configured
  if (!resend) {
    console.warn('⚠️  RESEND_API_KEY not set. Email will not be sent.')
    console.log('='.repeat(80))
    console.log('📧 PASSWORD RESET EMAIL (Development Mode - No API Key)')
    console.log('='.repeat(80))
    console.log(`To: ${email}`)
    console.log(`Subject: Reset your ChartsFM password`)
    console.log(`\nReset URL: ${resetUrl}`)
    console.log('='.repeat(80))
    return // Don't throw - allow development to continue
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
  const fromName = process.env.RESEND_FROM_NAME || 'ChartsFM'
  const from = `${fromName} <${fromEmail}>`

  // Warn if using test domain in production
  if (fromEmail === 'onboarding@resend.dev' && process.env.NODE_ENV === 'production') {
    console.warn('⚠️  Using Resend test domain. Set RESEND_FROM_EMAIL to use your verified domain.')
  }

  const emailSubject = t('auth.emails.passwordReset.subject')
  const emailTitle = t('auth.emails.passwordReset.title')
  const greeting = name 
    ? t('auth.emails.passwordReset.greeting', { name })
    : t('auth.emails.passwordReset.greetingFallback')
  const emailBody = t('auth.emails.passwordReset.body')
  const buttonText = t('auth.emails.passwordReset.button')
  const orCopyPaste = t('auth.emails.passwordReset.orCopyPaste')
  const expires = t('auth.emails.passwordReset.expires')
  const footer = t('auth.emails.passwordReset.footer', { year: new Date().getFullYear().toString() })

  // In development, log the email content
  if (process.env.NODE_ENV === 'development') {
    console.log('='.repeat(80))
    console.log('📧 SENDING PASSWORD RESET EMAIL')
    console.log('='.repeat(80))
    console.log(`From: ${from}`)
    console.log(`To: ${email}`)
    console.log(`Subject: ${emailSubject}`)
    console.log(`Locale: ${userLocale}`)
    console.log(`\nReset URL: ${resetUrl}`)
    console.log('='.repeat(80))
  }

  try {
    const result = await resend.emails.send({
      from,
      to: email,
      subject: emailSubject,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${emailSubject}</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #fef9c3, #fefce8); padding: 30px; border-radius: 12px; margin-bottom: 20px;">
              <h1 style="margin: 0; color: #854d0e; font-size: 28px;">🔐 ${emailTitle}</h1>
            </div>
            
            <p style="font-size: 16px;">${greeting}</p>
            
            <p style="font-size: 16px;">
              ${emailBody}
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="display: inline-block; background: #ca8a04; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(202, 138, 4, 0.3);">
                ${buttonText}
              </a>
            </div>
            
            <p style="font-size: 14px; color: #666;">
              ${orCopyPaste}
            </p>
            <p style="font-size: 14px; color: #666; word-break: break-all;">
              <a href="${resetUrl}" style="color: #ca8a04;">${resetUrl}</a>
            </p>
            
            <p style="font-size: 14px; color: #666; margin-top: 30px;">
              ${expires}
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="font-size: 12px; color: #999; text-align: center;">
              ${footer}
            </p>
          </body>
        </html>
      `,
      text: `
${emailTitle}

${greeting}

${emailBody}

${resetUrl}

${expires}

${footer}
      `.trim(),
    })

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Password reset email sent successfully!')
      console.log('Response:', JSON.stringify(result, null, 2))
    }
  } catch (error: any) {
    console.error('❌ Failed to send password reset email:')
    console.error('Error details:', error)
    
    if (error?.message) {
      console.error('Error message:', error.message)
    }
    if (error?.response) {
      console.error('Error response:', error.response)
    }

    // In production, throw the error so it can be handled upstream
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Failed to send password reset email: ${error?.message || 'Unknown error'}`)
    } else {
      // In development, log but don't throw to allow testing
      console.warn('⚠️  Email sending failed, but continuing in development mode')
      console.warn('⚠️  Check your RESEND_API_KEY and domain configuration')
    }
  }
}

