import {
  availabilityValue,
  appointmentStore,
  DAYS,
  type Appointment,
  type Availability,
  type Day,
} from './mock'

export type { Appointment, Availability, Day }
export { DAYS }

const appts = appointmentStore()
const avail = availabilityValue()

export function listAppointments(): Appointment[] {
  return appts.list()
}

export function addAppointment(input: Omit<Appointment, 'id'>): Appointment {
  return appts.add(input)
}

export function updateAppointment(id: string, patch: Partial<Omit<Appointment, 'id'>>): Appointment | undefined {
  return appts.update(id, patch)
}

export function removeAppointment(id: string): boolean {
  return appts.remove(id)
}

export function getAvailability(): Availability {
  return avail.get()
}

export function setAvailability(next: Availability): void {
  avail.set(next)
}

export function upsertAvailability(day: Day, range: string): void {
  const next: Availability = { ...avail.get() }
  next[day] = range
  avail.set(next)
}
