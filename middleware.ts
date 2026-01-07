import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Match only internationalized pathnames
  // API routes are excluded - they don't need locale prefixes
  matcher: ['/', '/(en|pt)/:path*']
};

