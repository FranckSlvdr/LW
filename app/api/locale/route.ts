import { z } from 'zod'
import { ok, fail } from '@/lib/apiResponse'
import { BadRequestError } from '@/lib/errors'
import { isValidLocale } from '@/lib/i18n/config'

const schema = z.object({
  locale: z.string(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { locale } = schema.parse(body)

    if (!isValidLocale(locale)) {
      throw new BadRequestError('Invalid locale')
    }

    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
    const response = ok({ locale })
    response.headers.set(
      'Set-Cookie',
      `NEXT_LOCALE=${locale}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`,
    )
    return response
  } catch (err) {
    return fail(err)
  }
}
