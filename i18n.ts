import {getRequestConfig} from 'next-intl/server';
import {routing} from './i18n/routing';

export default getRequestConfig(async ({requestLocale}) => {
  // Ensure that a valid locale is used
  let locale = await requestLocale;
  
  // Validate locale
  if (!routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default
  };
});

