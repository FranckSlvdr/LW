import { redirect } from 'next/navigation'

/** Events has been renamed to Desert Storm */
export default function EventsRedirect() {
  redirect('/desert-storm')
}
