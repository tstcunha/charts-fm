import { NextResponse } from 'next/server'
import { requireGroupMembership } from '@/lib/group-auth'
import { prisma } from '@/lib/prisma'
import { getGroupChartEntries } from '@/lib/group-queries'
import { GROUP_THEMES, type ThemeName } from '@/lib/group-themes'
import { formatWeekLabel } from '@/lib/weekly-utils'
import { getArtistImage } from '@/lib/lastfm'
import fs from 'fs'
import path from 'path'

// Import the HTML generation function (we'll extract it to a shared module)
async function generateChartHTML(
  groupName: string,
  weekLabel: string,
  entries: Array<{ position: number; name: string; playcount: number; vibeScore: number | null }>,
  themeColors: typeof GROUP_THEMES.white,
  showVS: boolean,
  topArtistImages: Array<{ name: string; imageBase64: string | null }>,
  logoBase64: string
): Promise<string> {
  // Instagram Stories aspect ratio: 9:16 (1080x1920)
  const width = 1080
  const height = 1920
  const footerHeight = 50

  // Escape HTML
  const escapeHtml = (text: string) => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  // Convert RGB to RGBA
  const rgbToRgba = (rgb: string, alpha: number): string => {
    const match = rgb.match(/rgb\((\d+)\s+(\d+)\s+(\d+)\)/)
    if (match) {
      return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${alpha})`
    }
    const match2 = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
    if (match2) {
      return `rgba(${match2[1]}, ${match2[2]}, ${match2[3]}, ${alpha})`
    }
    return rgb
  }

  const headerTextColor = themeColors.buttonText === 'white' ? 'white' : themeColors.primaryDark

  // Generate entries HTML
  const entriesHTML = entries.map((entry, index) => {
    const isFirst = index === 0
    const fontSize = isFirst ? '56px' : '40px'
    const badgeSize = isFirst ? '96px' : '80px'
    const badgeFontSize = isFirst ? '40px' : '32px'
    const padding = isFirst ? '44px 0' : '34px 0'
    
    const value = showVS && entry.vibeScore !== null 
      ? entry.vibeScore.toFixed(2) 
      : entry.playcount.toString()
    const valueLabel = showVS && entry.vibeScore !== null ? 'VS' : 'Plays'
    const valueFontSize = isFirst ? '44px' : '34px'

    return `
      <div style="
        display: flex;
        align-items: center;
        padding: ${padding};
        border-bottom: ${index < entries.length - 1 ? `1px solid ${themeColors.border}30` : 'none'};
      ">
        <div style="
          width: ${badgeSize};
          height: ${badgeSize};
          border-radius: 50%;
          background: ${themeColors.primary};
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: ${badgeFontSize};
          color: ${headerTextColor};
          flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2), 0 0 0 3px ${rgbToRgba(themeColors.primaryLight, 0.5)};
        ">${entry.position}</div>
        <div style="flex: 1; margin-left: 32px; min-width: 0;">
          <div style="
            font-size: ${fontSize};
            font-weight: bold;
            color: ${themeColors.primaryDark};
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            letter-spacing: ${isFirst ? '-1px' : '-0.6px'};
            line-height: 1.2;
          ">${escapeHtml(entry.name)}</div>
        </div>
        <div style="text-align: right; margin-left: 48px; flex-shrink: 0; min-width: 140px;">
          <div style="
            font-size: ${valueFontSize};
            font-weight: bold;
            color: ${themeColors.primaryDark};
            margin-bottom: 6px;
          ">${value}</div>
          <div style="
            font-size: ${isFirst ? '24px' : '22px'};
            color: ${themeColors.text};
            font-weight: 500;
          ">${valueLabel}</div>
        </div>
      </div>
    `
  }).join('')

  // Top artist images section - positioned on the right, all vertically stacked
  // #1 is large (280x280), #2-5 are smaller (180x180 each)
  const topArtistSection = topArtistImages.length > 0 ? `
    ${topArtistImages[0]?.imageBase64 ? `
      <!-- #1 Artist - Large -->
      <div style="
        position: absolute;
        top: 80px;
        right: 40px;
        width: 280px;
        height: 280px;
        border-radius: 32px;
        overflow: hidden;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3), 0 0 0 4px ${rgbToRgba(themeColors.primary, 0.5)};
        border: 4px solid ${themeColors.primary};
        background: ${themeColors.primaryLighter};
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
      ">
        <img 
          src="${escapeHtml(topArtistImages[0].imageBase64)}" 
          alt="${escapeHtml(topArtistImages[0].name)}"
          style="width: 100%; height: 100%; object-fit: cover;"
        />
      </div>
    ` : ''}
    ${topArtistImages[1]?.imageBase64 ? `
      <!-- #2 Artist - Slightly offset to the left -->
      <div style="
        position: absolute;
        top: 380px;
        right: 60px;
        width: 180px;
        height: 180px;
        border-radius: 24px;
        overflow: hidden;
        box-shadow: 0 12px 24px rgba(0, 0, 0, 0.25), 0 0 0 3px ${rgbToRgba(themeColors.primary, 0.4)};
        border: 3px solid ${themeColors.primary};
        background: ${themeColors.primaryLighter};
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
      ">
        <img 
          src="${escapeHtml(topArtistImages[1].imageBase64)}" 
          alt="${escapeHtml(topArtistImages[1].name)}"
          style="width: 100%; height: 100%; object-fit: cover;"
        />
      </div>
    ` : ''}
    ${topArtistImages[2]?.imageBase64 ? `
      <!-- #3 Artist - Slightly offset to the right -->
      <div style="
        position: absolute;
        top: 580px;
        right: 20px;
        width: 180px;
        height: 180px;
        border-radius: 24px;
        overflow: hidden;
        box-shadow: 0 12px 24px rgba(0, 0, 0, 0.25), 0 0 0 3px ${rgbToRgba(themeColors.primary, 0.4)};
        border: 3px solid ${themeColors.primary};
        background: ${themeColors.primaryLighter};
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
      ">
        <img 
          src="${escapeHtml(topArtistImages[2].imageBase64)}" 
          alt="${escapeHtml(topArtistImages[2].name)}"
          style="width: 100%; height: 100%; object-fit: cover;"
        />
      </div>
    ` : ''}
    ${topArtistImages[3]?.imageBase64 ? `
      <!-- #4 Artist - Slightly offset to the left -->
      <div style="
        position: absolute;
        top: 780px;
        right: 50px;
        width: 180px;
        height: 180px;
        border-radius: 24px;
        overflow: hidden;
        box-shadow: 0 12px 24px rgba(0, 0, 0, 0.25), 0 0 0 3px ${rgbToRgba(themeColors.primary, 0.4)};
        border: 3px solid ${themeColors.primary};
        background: ${themeColors.primaryLighter};
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
      ">
        <img 
          src="${escapeHtml(topArtistImages[3].imageBase64)}" 
          alt="${escapeHtml(topArtistImages[3].name)}"
          style="width: 100%; height: 100%; object-fit: cover;"
        />
      </div>
    ` : ''}
    ${topArtistImages[4]?.imageBase64 ? `
      <!-- #5 Artist - Slightly offset to the right -->
      <div style="
        position: absolute;
        top: 980px;
        right: 30px;
        width: 180px;
        height: 180px;
        border-radius: 24px;
        overflow: hidden;
        box-shadow: 0 12px 24px rgba(0, 0, 0, 0.25), 0 0 0 3px ${rgbToRgba(themeColors.primary, 0.4)};
        border: 3px solid ${themeColors.primary};
        background: ${themeColors.primaryLighter};
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
      ">
        <img 
          src="${escapeHtml(topArtistImages[4].imageBase64)}" 
          alt="${escapeHtml(topArtistImages[4].name)}"
          style="width: 100%; height: 100%; object-fit: cover;"
        />
      </div>
    ` : ''}
  ` : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Chart Export</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      width: ${width}px;
      height: ${height}px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      overflow: hidden;
      background: 
        radial-gradient(circle at 20% 30%, ${rgbToRgba(themeColors.primaryLighter, 0.4)}, transparent 50%),
        radial-gradient(circle at 80% 70%, ${rgbToRgba(themeColors.primaryLight, 0.3)}, transparent 50%),
        linear-gradient(135deg, ${themeColors.backgroundFrom} 0%, ${rgbToRgba(themeColors.primaryLighter, 0.2)} 25%, ${themeColors.backgroundTo} 50%, ${rgbToRgba(themeColors.primaryLighter, 0.15)} 75%, ${themeColors.backgroundFrom} 100%);
      position: relative;
    }
  </style>
</head>
<body>
  <!-- Content Area -->
  <div style="
    position: relative;
    height: ${height - footerHeight}px;
    overflow: visible;
    padding: 80px ${topArtistImages.length > 0 ? '360px' : '40px'} 40px 50px;
  ">
    ${topArtistSection}
    
    <!-- Title with Gradient Text -->
    <div style="
      margin-bottom: 60px;
      padding-bottom: 0.1em;
      text-align: left;
    ">
      <h1 style="
        font-size: 88px;
        font-weight: bold;
        line-height: 1.2;
        background-image: linear-gradient(to right, ${themeColors.primaryDarker}, ${themeColors.primary}, ${themeColors.primaryLight});
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        margin-bottom: 24px;
        overflow: visible;
        letter-spacing: -2px;
      ">${escapeHtml(groupName)}</h1>
      <div style="
        font-size: 42px;
        color: ${themeColors.text};
        font-weight: 600;
        margin-bottom: 14px;
      ">Top Artists</div>
      <div style="
        font-size: 28px;
        color: ${themeColors.text};
        opacity: 0.85;
        font-weight: 500;
      ">Week of ${escapeHtml(weekLabel)}</div>
    </div>
    
    <!-- Chart Entries (no bubble/card, displayed over gradient) -->
    <div style="
      max-width: 100%;
    ">
      ${entriesHTML}
    </div>
  </div>

  <!-- Footer -->
  <div style="
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: ${footerHeight}px;
    background: #000000;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 20px;
  ">
    <div style="
      width: 100px;
      height: 30px;
      display: flex;
      align-items: center;
    ">
      <img 
        src="${logoBase64}" 
        alt="ChartsFM"
        style="max-width: 100%; max-height: 100%; object-fit: contain;"
        onerror="this.style.display='none'"
      />
    </div>
    <div style="
      color: white;
      font-size: 12px;
      font-weight: 500;
    ">Create yours on chartsfm.greatwhiteshark.dev</div>
  </div>
</body>
</html>`
}

function loadLogoAsBase64(): string {
  try {
    const logoPath = path.join(process.cwd(), 'public', 'logo-transparent.png')
    const fileData = fs.readFileSync(logoPath)
    const base64String = Buffer.from(fileData).toString('base64')
    return `data:image/png;base64,${base64String}`
  } catch (error) {
    console.error('Error loading logo:', error)
    return ''
  }
}

// Helper function to convert image URL to base64
async function convertImageToBase64(imageUrl: string): Promise<string | null> {
  try {
    let imageBuffer: Buffer
    let contentType: string
    
    // Check if it's a relative path (local file)
    if (imageUrl.startsWith('/uploads/')) {
      console.log('Reading image from local filesystem...')
      const filePath = path.join(process.cwd(), 'public', imageUrl)
      
      if (fs.existsSync(filePath)) {
        imageBuffer = fs.readFileSync(filePath)
        // Determine content type from file extension
        const ext = path.extname(filePath).toLowerCase()
        contentType = ext === '.png' ? 'image/png' 
          : ext === '.webp' ? 'image/webp'
          : ext === '.gif' ? 'image/gif'
          : 'image/jpeg'
        console.log('Image read from filesystem, size:', imageBuffer.length, 'content-type:', contentType)
      } else {
        console.error('Image file not found at path:', filePath)
        return null
      }
    } else {
      // It's an absolute URL, fetch it
      console.log('Fetching image from URL...')
      const imageResponse = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ChartsFM/1.0)',
        },
      })
      
      if (!imageResponse.ok) {
        console.error(`Image fetch failed with status: ${imageResponse.status}`)
        return null
      }
      
      const arrayBuffer = await imageResponse.arrayBuffer()
      imageBuffer = Buffer.from(arrayBuffer)
      contentType = imageResponse.headers.get('content-type') || 'image/jpeg'
      console.log('Image fetched from URL, size:', imageBuffer.length, 'content-type:', contentType)
    }
    
    // Convert to base64
    const base64String = imageBuffer.toString('base64')
    return `data:${contentType};base64,${base64String}`
  } catch (error) {
    console.error('Error converting image to base64:', error)
    return null
  }
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { group } = await requireGroupMembership(params.id)

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    // Get query params
    const { searchParams } = new URL(request.url)
    const weekStartParam = searchParams.get('weekStart')
    
    if (!weekStartParam) {
      return NextResponse.json({ error: 'weekStart parameter is required' }, { status: 400 })
    }

    // Parse date string as UTC (YYYY-MM-DD format)
    const [year, month, day] = weekStartParam.split('-').map(Number)
    const requestedWeekStart = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))

    // Verify the week exists
    const weeklyStats = await prisma.groupWeeklyStats.findFirst({
      where: {
        groupId: group.id,
        weekStart: requestedWeekStart,
      },
      select: {
        weekStart: true,
      },
    })

    if (!weeklyStats) {
      return NextResponse.json({ error: 'No charts found for the specified week' }, { status: 404 })
    }

    // Use the exact weekStart from the database
    const normalizedWeekStart = new Date(weeklyStats.weekStart)
    normalizedWeekStart.setUTCHours(0, 0, 0, 0)

    // Get chart entries for artists (top 10)
    const chartEntries = await getGroupChartEntries(
      group.id,
      normalizedWeekStart,
      'artists'
    )

    if (chartEntries.length === 0) {
      return NextResponse.json({ error: 'No chart entries found' }, { status: 404 })
    }

    // Get top 10 entries
    const topEntries = chartEntries.slice(0, 10).map(entry => ({
      position: entry.position,
      name: entry.name,
      playcount: entry.playcount,
      vibeScore: entry.vibeScore,
    }))

    // Get theme colors
    const colorTheme = ((group as any).colorTheme || 'white') as ThemeName
    const themeColors = GROUP_THEMES[colorTheme]

    // Get chart mode
    const chartMode = (group.chartMode || 'plays_only') as string
    const showVS = chartMode === 'vs' || chartMode === 'vs_weighted'

    // Get artist images for top 3 entries and convert to base64
    const apiKey = process.env.LASTFM_API_KEY || ''
    const topArtistImages: Array<{ name: string; imageBase64: string | null }> = []
    
    // Fetch images for top 5 artists in parallel
    const imagePromises = topEntries.slice(0, 5).map(async (entry) => {
      try {
        const imageUrl = await getArtistImage(entry.name, apiKey)
        console.log(`Artist ${entry.position} (${entry.name}) image URL:`, imageUrl)
        
        if (imageUrl) {
          const imageBase64 = await convertImageToBase64(imageUrl)
          return {
            name: entry.name,
            imageBase64,
          }
        } else {
          console.log(`No image URL returned for ${entry.name}`)
          return {
            name: entry.name,
            imageBase64: null,
          }
        }
      } catch (error) {
        console.error(`Error loading image for ${entry.name}:`, error)
        return {
          name: entry.name,
          imageBase64: null,
        }
      }
    })
    
    const imageResults = await Promise.all(imagePromises)
    topArtistImages.push(...imageResults)
    
    console.log(`Loaded ${topArtistImages.filter(img => img.imageBase64).length} artist images out of ${topArtistImages.length} attempts`)

    // Format week label
    const weekLabel = formatWeekLabel(normalizedWeekStart)

    // Load logo
    const logoBase64 = loadLogoAsBase64()

    // Generate HTML
    let html: string
    try {
      html = await generateChartHTML(
        group.name,
        weekLabel,
        topEntries,
        themeColors,
        showVS,
        topArtistImages,
        logoBase64
      )
      console.log('HTML generated successfully, length:', html.length)
      console.log('HTML contains image tag:', html.includes('<img'))
      const hasAnyImage = topArtistImages.some(img => img.imageBase64)
      if (hasAnyImage) {
        console.log('HTML contains image data URI:', html.includes('data:image'))
      }
    } catch (htmlError) {
      console.error('Error generating HTML:', htmlError)
      return NextResponse.json(
        { 
          error: 'Failed to generate HTML template',
          details: process.env.NODE_ENV === 'development' ? (htmlError instanceof Error ? htmlError.message : String(htmlError)) : undefined
        },
        { status: 500 }
      )
    }
    
    // Import Playwright-core and Chromium binary dynamically (only when needed)
    let chromium
    let chromiumBinary: any = null
    try {
      chromium = (await import('playwright-core')).chromium
      console.log('Playwright-core imported successfully')
      
      // Use lightweight Chromium for serverless (Vercel), full Playwright for local dev
      const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
      if (isServerless) {
        console.log('Detected serverless environment, using @sparticuz/chromium-min')
        const chromiumModule = await import('@sparticuz/chromium-min')
        chromiumBinary = chromiumModule.default || chromiumModule
        // Optimize Chromium for serverless (if method exists)
        if (chromiumBinary && typeof chromiumBinary.setGraphicsMode === 'function') {
          chromiumBinary.setGraphicsMode(false)
        }
      } else {
        console.log('Local environment detected, using system Chromium')
      }
    } catch (importError) {
      console.error('Failed to import playwright-core or chromium:', importError)
      return NextResponse.json(
        { 
          error: 'Playwright dependencies not installed. Please run: npm install playwright-core @sparticuz/chromium-min',
          details: process.env.NODE_ENV === 'development' ? (importError instanceof Error ? importError.message : String(importError)) : undefined
        },
        { status: 500 }
      )
    }
    
    // Launch browser with appropriate configuration
    let browser
    try {
      console.log('Attempting to launch browser...')
      const launchOptions: any = {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--single-process', // Important for serverless
        ],
      }
      
      // Use lightweight Chromium binary in serverless environment
      if (chromiumBinary) {
        try {
          // @sparticuz/chromium-min will automatically use CHROMIUM_REMOTE_EXEC_PATH env var if set
          // If not set, it will look for local files (which don't exist in Vercel)
          // So we need to ensure the env var is set, or pass the location directly
          const remotePath = process.env.CHROMIUM_REMOTE_EXEC_PATH
          
          let executablePath: string
          if (remotePath) {
            console.log('Using CHROMIUM_REMOTE_EXEC_PATH from environment:', remotePath)
            // Pass the location to executablePath if env var is set
            executablePath = await chromiumBinary.executablePath(remotePath)
          } else {
            // Try default remote location for v141.0.0
            const defaultRemotePath = 'https://github.com/Sparticuz/chromium/releases/download/v141.0.0/chromium-v141.0.0-pack.tar.br'
            console.log('CHROMIUM_REMOTE_EXEC_PATH not set, using default remote path:', defaultRemotePath)
            executablePath = await chromiumBinary.executablePath(defaultRemotePath)
          }
          
          launchOptions.executablePath = executablePath
          // Merge args - chromiumBinary.args should be used, but keep our essential ones
          const chromiumArgs = chromiumBinary.args || []
          launchOptions.args = [...chromiumArgs, ...launchOptions.args.filter((arg: string) => 
            !chromiumArgs.includes(arg)
          )]
          console.log('Using serverless-optimized Chromium binary')
        } catch (execPathError) {
          console.error('Failed to get Chromium executable path:', execPathError)
          const errorMsg = execPathError instanceof Error ? execPathError.message : String(execPathError)
          return NextResponse.json(
            { 
              error: 'Failed to get Chromium executable for image generation',
              details: `Please set CHROMIUM_REMOTE_EXEC_PATH environment variable in Vercel to: https://github.com/Sparticuz/chromium/releases/download/v141.0.0/chromium-v141.0.0-pack.tar.br`,
              errorMessage: process.env.NODE_ENV === 'development' ? errorMsg : undefined
            },
            { status: 500 }
          )
        }
      }
      
      browser = await chromium.launch(launchOptions)
      console.log('Browser launched successfully')
    } catch (launchError) {
      console.error('Failed to launch browser:', launchError)
      const errorMsg = launchError instanceof Error ? launchError.message : String(launchError)
      return NextResponse.json(
        { 
          error: 'Failed to launch browser for image generation',
          details: process.env.NODE_ENV === 'development' ? errorMsg : undefined
        },
        { status: 500 }
      )
    }
    
    try {
      console.log('Creating new page...')
      const page = await browser.newPage()
      
      // Set viewport to match our image dimensions (Instagram Stories: 1080x1920)
      // Playwright uses deviceScaleFactor in screenshot options for higher DPI
      await page.setViewportSize({
        width: 1080,
        height: 1920,
      })
      console.log('Viewport set')
      
      // Set HTML content directly (no need to navigate to a URL)
      // Playwright's setContent has better auto-waiting built-in
      console.log('Setting HTML content...')
      const hasImageInHTML = html.includes('data:image') || html.includes('<img')
      console.log('HTML includes image:', hasImageInHTML, 'HTML length:', html.length)
      await page.setContent(html, {
        waitUntil: 'networkidle',
        timeout: 30000,
      })
      console.log('HTML content set')
      
      // Wait for images to load (Playwright has better auto-waiting built-in)
      try {
        // Wait for any images to be present and loaded
        const imageCount = await page.locator('img').count()
        if (imageCount > 0) {
          console.log('Found', imageCount, 'image(s), waiting for them to load...')
          // Wait for all images to load - Playwright's waitForLoadState handles this better
          await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
            console.log('Network idle timeout, continuing anyway')
          })
          // Additional check to ensure base64 images are loaded
          await page.evaluate(() => {
            return Promise.all(
              Array.from(document.images).map((img) => {
                if (img.complete && img.naturalWidth > 0) return Promise.resolve()
                return new Promise((resolve) => {
                  img.onload = () => resolve(true)
                  img.onerror = () => resolve(true) // Resolve even on error
                  setTimeout(() => resolve(true), 3000) // Timeout after 3s
                })
              })
            )
          })
          console.log('Images loaded (or timed out)')
        }
      } catch (e) {
        // Continue even if images don't load
        console.log('Image loading check skipped or timed out')
      }
      
      // Additional brief wait for any remaining resources
      await page.waitForTimeout(500)
      console.log('Taking screenshot...')
      
      // Take screenshot with higher DPI (deviceScaleFactor: 2 for retina quality)
      const screenshot = await page.screenshot({
        type: 'png',
        fullPage: false,
        clip: {
          x: 0,
          y: 0,
          width: 1080,
          height: 1920, // Instagram Stories aspect ratio
        },
        // Note: Playwright doesn't have deviceScaleFactor in screenshot options
        // The viewport size determines the screenshot size
      })
      console.log('Screenshot taken successfully')
      
      // Create filename
      const weekStr = weekStartParam
      const groupName = group.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()
      const filename = `${groupName}_artists_${weekStr}.png`
      
      // Return PNG file (Playwright screenshot returns Buffer)
      return new NextResponse(screenshot as unknown as BodyInit, {
        headers: {
          'Content-Type': 'image/png',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    } finally {
      await browser.close()
    }
  } catch (error) {
    console.error('Error generating chart image export:', error)
    
    // Provide detailed error message
    let errorMessage = 'Failed to generate chart image export'
    let errorDetails = ''
    
    if (error instanceof Error) {
      errorDetails = error.message
      errorMessage = error.message
      
      // Specific error handling
      if (error.message.includes('Cannot find module') || error.message.includes('playwright') || error.message.includes('chromium')) {
        errorMessage = 'Playwright dependencies not installed. Please run: npm install playwright-core @sparticuz/chromium-min'
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Image generation timed out. Please try again.'
      } else if (error.message.includes('Navigation')) {
        errorMessage = 'Failed to render HTML. Please check server logs.'
      } else if (error.message.includes('Protocol error')) {
        errorMessage = 'Browser connection error. Please try again.'
      }
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? errorDetails : undefined
      },
      { status: 500 }
    )
  }
}
