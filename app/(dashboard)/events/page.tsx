import { redirect } from 'next/navigation'
export const maxDuration = 60

/** Events has been renamed to Desert Storm */
export default function EventsRedirect() {
  redirect('/desert-storm')
}
