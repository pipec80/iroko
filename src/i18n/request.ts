import { getRequestConfig } from "next-intl/server"
import { routing } from "./routing"

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = await requestLocale

  if (!locale || !routing.locales.includes(locale as "en" | "es")) {
    return {
      locale: routing.defaultLocale,
      messages: {},
    }
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  }
})
