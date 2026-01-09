'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface FAQContentProps {
  content: string
}

export default function FAQContent({ content }: FAQContentProps) {
  if (!content) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">FAQ content not available.</p>
      </div>
    )
  }

  return (
    <div className="prose prose-sm sm:prose-base md:prose-lg max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ node, ...props }) => (
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4 sm:mb-6 mt-6 sm:mt-8 first:mt-0" {...props} />
          ),
          h2: ({ node, children, ...props }: any) => {
            // Extract text from children (could be string, array, or React nodes)
            const extractText = (child: any): string => {
              if (typeof child === 'string') return child
              if (typeof child === 'number') return String(child)
              if (Array.isArray(child)) return child.map(extractText).join('')
              if (child?.props?.children) return extractText(child.props.children)
              return ''
            }
            const text = extractText(children)
            const id = text
              .toLowerCase()
              .replace(/[^\w\s-]/g, '')
              .replace(/\s+/g, '-')
              .replace(/-+/g, '-')
              .trim()
            return (
              <h2 id={id} className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-3 sm:mb-4 mt-6 sm:mt-8 scroll-mt-16 sm:scroll-mt-20" {...props}>
                {children}
              </h2>
            )
          },
          h3: ({ node, children, ...props }: any) => {
            // Extract text from children (could be string, array, or React nodes)
            const extractText = (child: any): string => {
              if (typeof child === 'string') return child
              if (typeof child === 'number') return String(child)
              if (Array.isArray(child)) return child.map(extractText).join('')
              if (child?.props?.children) return extractText(child.props.children)
              return ''
            }
            const text = extractText(children)
            const id = text
              .toLowerCase()
              .replace(/[^\w\s-]/g, '')
              .replace(/\s+/g, '-')
              .replace(/-+/g, '-')
              .trim()
            return (
              <h3 id={id} className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-800 mb-2 sm:mb-3 mt-4 sm:mt-6 scroll-mt-16 sm:scroll-mt-20" {...props}>
                {children}
              </h3>
            )
          },
          h4: ({ node, ...props }) => (
            <h4 className="text-base sm:text-lg md:text-xl font-semibold text-gray-800 mb-2 mt-3 sm:mt-4" {...props} />
          ),
          p: ({ node, ...props }) => (
            <p className="text-sm sm:text-base text-gray-700 mb-3 sm:mb-4 leading-relaxed" {...props} />
          ),
          ul: ({ node, ...props }) => (
            <ul className="list-disc list-outside sm:list-inside mb-3 sm:mb-4 space-y-1.5 sm:space-y-2 text-gray-700 pl-4 sm:pl-0" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="list-decimal list-outside sm:list-inside mb-3 sm:mb-4 space-y-1.5 sm:space-y-2 text-gray-700 pl-4 sm:pl-0" {...props} />
          ),
          li: ({ node, ...props }) => (
            <li className="ml-0 sm:ml-4 pl-1 sm:pl-0" {...props} />
          ),
          code: ({ node, inline, className, children, ...props }: any) => {
            // In react-markdown:
            // - Inline code (single backticks): inline = true, no className
            // - Code blocks (triple backticks): inline = false/undefined, has className with language
            // Check if this is a code block by checking if it has a language class
            const isCodeBlock = className && typeof className === 'string' && className.includes('language-')
            
            if (inline === true || !isCodeBlock) {
              // Inline code - render as inline element
              return (
                <code
                  className="bg-gray-100 text-gray-800 px-1 sm:px-1.5 py-0.5 rounded text-xs sm:text-sm font-mono break-words"
                  {...props}
                >
                  {children}
                </code>
              )
            }
            // Code block - minimal styling since it's wrapped in pre
            return (
              <code className="text-gray-800 text-xs sm:text-sm font-mono" {...props}>
                {children}
              </code>
            )
          },
          pre: ({ node, children, ...props }: any) => {
            // Pre wraps code blocks, so style the pre element
            return (
              <pre className="bg-gray-100 p-3 sm:p-4 rounded-lg overflow-x-auto mb-3 sm:mb-4 text-xs sm:text-sm" {...props}>
                {children}
              </pre>
            )
          },
          hr: ({ node, ...props }) => (
            <hr className="my-8 border-gray-300" {...props} />
          ),
          blockquote: ({ node, children, ...props }: any) => (
            <blockquote
              className="border-l-4 border-[var(--theme-primary)] bg-yellow-50 pl-4 pr-4 py-3 my-4 rounded-r"
              {...props}
            >
              {children}
            </blockquote>
          ),
          strong: ({ node, ...props }) => (
            <strong className="font-bold text-gray-900" {...props} />
          ),
          em: ({ node, ...props }) => (
            <em className="italic" {...props} />
          ),
          a: ({ node, ...props }) => (
            <a
              className="text-[var(--theme-primary)] hover:underline"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            />
          ),
          img: ({ node, alt, src, ...props }: any) => (
            <img
              src={src}
              alt={alt}
              className="max-w-md mx-auto h-auto rounded-lg my-4 sm:my-6 shadow-sm"
              {...props}
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}


