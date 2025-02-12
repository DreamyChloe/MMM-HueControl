class HueEventParser {
    constructor(events, debug = false) {
        this.events = events
        this.debug = debug
    }

    parseEventData(data) {
        try {
            const jsonData = JSON.parse(data)
            return this.parseJsonData(jsonData)
        } catch (error) {
            console.error("Error processing event data:", error, "Raw data:", data)
            return []
        }
    }

    parseJsonData(jsonData) {
        const parsedEvents = []
        if (Array.isArray(jsonData)) {
            jsonData.forEach((item) => {
                if (item.data && Array.isArray(item.data)) {
                    item.data.forEach((sse) => {
                        const matchedEvent = this.checkAndParseEvent(sse)
                        if (matchedEvent) {
                            parsedEvents.push(matchedEvent)
                        }
                    })
                }
            })
        } else {
            console.log("Received unexpected JSON structure:", JSON.stringify(jsonData))
        }
        return parsedEvents
    }

    checkAndParseEvent(eventData) {
        const matchingEvents = this.events.filter(event =>
            eventData.id === event.eventId
            && eventData.type === event.eventType
        )

        for (const event of matchingEvents) {
            if (this.matchEventContent(eventData, event.eventContent)) {
                const status = {
                    eventId: eventData.id,
                    type: eventData.type,
                    status: event.notification
                }

                // Add step value for relative_rotary events
                if (eventData.type === "relative_rotary" && eventData.relative_rotary && eventData.relative_rotary.rotary_report) {
                    status.value = eventData.relative_rotary.rotary_report.rotation.steps
                }

                if (this.debug) {
                    console.log(`Matched event: ${JSON.stringify(status)}`)
                }
                return status
            } else if (this.debug) {
                console.log(`Event content didn't match for event ID ${eventData.id}`)
            }
        }

        if (this.debug && matchingEvents.length === 0) {
            console.log(`Received event for eventData ${eventData.id} of type ${eventData.type}, but no matching configuration found.`)
        }

        return null
    }

    matchEventContent(sse, eventContent) {
        for (const [key, value] of Object.entries(eventContent)) {
            if (!(key in sse)) {
                return false
            }
            if (typeof value === "object") {
                if (!this.matchEventContent(sse[key], value)) {
                    return false
                }
            } else if (sse[key] !== value) {
                return false
            }
        }
        return true
    }
}

module.exports = HueEventParser
