# Translations Guide

This guide explains how to add and use translations in ChartsFM.

## File Structure

Translations are stored in JSON files in the `messages/` directory:
- `messages/en.json` - English translations
- `messages/pt.json` - Portuguese translations

## Adding New Translations

### Step 1: Add keys to both language files

Add the same key structure to both `en.json` and `pt.json`:

**messages/en.json:**
```json
{
  "common": {
    "loading": "Loading...",
    "error": "Error"
  },
  "dashboard": {
    "title": "Dashboard",
    "welcome": "Welcome back!"
  }
}
```

**messages/pt.json:**
```json
{
  "common": {
    "loading": "Carregando...",
    "error": "Erro"
  },
  "dashboard": {
    "title": "Painel",
    "welcome": "Bem-vindo de volta!"
  }
}
```

### Step 2: Use translations in components

#### Client Components (using hooks)

**Important:** Always use `useSafeTranslations` instead of `useTranslations` in client components to prevent hydration mismatches where translations appear then disappear.

```tsx
'use client'

import { useSafeTranslations } from '@/hooks/useSafeTranslations'

export default function MyComponent() {
  // Access a namespace - this hook prevents hydration issues
  const t = useSafeTranslations('dashboard')
  const tCommon = useSafeTranslations('common')
  
  return (
    <div>
      <h1>{t('title')}</h1>
      <p>{t('welcome')}</p>
      <button>{tCommon('loading')}</button>
    </div>
  )
}
```

**Why useSafeTranslations?**
- Prevents hydration mismatches where translations flash and disappear
- Always returns a string (never undefined/null)
- Memoizes translation values to prevent re-render issues
- Provides fallback to translation key if translation is missing

#### Server Components (using functions)

```tsx
import { getTranslations } from 'next-intl/server'

export default async function MyServerComponent() {
  const t = await getTranslations('dashboard')
  
  return (
    <div>
      <h1>{t('title')}</h1>
    </div>
  )
}
```

## Translation Namespaces

Organize translations into logical namespaces:

- `common` - Shared UI elements (buttons, labels, etc.)
- `navbar` - Navigation bar translations
- `profile` - Profile page translations
- `dashboard` - Dashboard page translations
- `groups` - Group-related translations
- etc.

## Best Practices

1. **Always add to both files**: When adding a new key, add it to both `en.json` and `pt.json`
2. **Use descriptive namespaces**: Group related translations together
3. **Keep keys consistent**: Use the same key structure across languages
4. **Use nested objects**: Organize related translations under the same namespace
5. **Test both languages**: Make sure translations work in both locales

## Examples

### Simple translation
```json
{
  "button": "Click me"
}
```
```tsx
const t = useTranslations('common')
<button>{t('button')}</button>
```

### Nested translations
```json
{
  "form": {
    "submit": "Submit",
    "cancel": "Cancel",
    "errors": {
      "required": "This field is required",
      "email": "Invalid email"
    }
  }
}
```
```tsx
const t = useTranslations('form')
<p>{t('errors.required')}</p>
```

### Multiple namespaces
```tsx
const t = useTranslations('dashboard')
const tCommon = useTranslations('common')
const tNav = useTranslations('navbar')

<div>
  <h1>{t('title')}</h1>
  <button>{tCommon('save')}</button>
  <nav>{tNav('home')}</nav>
</div>
```

## Adding a New Namespace

1. Add the namespace to both `en.json` and `pt.json`:
```json
{
  "myNewSection": {
    "title": "My Title",
    "description": "My Description"
  }
}
```

2. Use it in your component:
```tsx
const t = useTranslations('myNewSection')
<h1>{t('title')}</h1>
```

## Tips

- Use TypeScript autocomplete: The `useTranslations` hook provides type safety
- Keep translations close to usage: Don't create overly nested structures
- Use pluralization when needed: next-intl supports pluralization rules
- Consider context: Some words may need different translations based on context

