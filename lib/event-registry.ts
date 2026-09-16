import type { EventConfig } from '../content/event-schema'
import { exampleGatheringEvent } from '../content/events/example-gathering.config'

/**
 * Every event the site knows about. Add new imports here as you add config
 * files under content/events/ — this is the only place a new event needs to
 * be "wired up."
 */
const EVENTS: Record<string, EventConfig> = {
  [exampleGatheringEvent.slug]: exampleGatheringEvent,
}

export function getAllEvents(): EventConfig[] {
  return Object.values(EVENTS).sort((a, b) => {
    const aDate = a.dates[0]?.isoDate ?? ''
    const bDate = b.dates[0]?.isoDate ?? ''
    return aDate.localeCompare(bDate)
  })
}

export function getEventConfig(slug: string): EventConfig | undefined {
  return EVENTS[slug]
}
