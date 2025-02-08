const { EventSource } = require("eventsource")
const EventEmitter = require("events")
const HueEventParser = require("./hue_event_parser")

class HueListener extends EventEmitter {
    constructor(bridgeIp, appKey, events, reconnectTimeout = 30000, debug = false) {
        super()
        this.bridgeIp = bridgeIp
        this.appKey = appKey
        this.events = events
        this.reconnectTimeout = reconnectTimeout
        this.debug = debug
        this.eventSource = null
        this.isConnected = false
        this.eventParser = new HueEventParser(events, debug)
    }

    start() {
        this.connect()
    }

    connect() {
        const url = `https://${this.bridgeIp}/eventstream/clip/v2`
        const options = {
            fetch: (input, init) => fetch(input, {
                ...init,
                headers: {
                    ...init.headers,
                    "Accept": "text/event-stream",
                    "hue-application-key": this.appKey
                },
            }),
        }

        this.eventSource = new EventSource(url, options)

        this.eventSource.addEventListener('open', () => {
            this.isConnected = true
            this.emit("connectionStatus", "Connected")
            console.log("Connected to Hue Bridge SSE API")
        })

        this.eventSource.addEventListener('message', (event) => {
            this.processEventData(event.data)
        })

        this.eventSource.addEventListener('error', (error) => {
            console.error("Error in SSE connection:", error)
            this.emit("error", error)
            this.isConnected = false
            this.emit("connectionStatus", "Disconnected")
            this.scheduleReconnection()
        })
    }

    scheduleReconnection() {
        setTimeout(() => {
            console.log("Attempting to reconnect...")
            this.emit("connectionStatus", "Reconnecting")
            this.connect()
        }, this.reconnectTimeout)
    }

    stop() {
        if (this.eventSource) {
            this.eventSource.close()
        }
        this.isConnected = false
        this.emit("connectionStatus", "Stopped")
    }

    processEventData(data) {
        const parsedEvents = this.eventParser.parseEventData(data)
        parsedEvents.forEach((event) => {
            this.emit("eventStatusChange", event)
            if (this.debug) {
                console.log(`Emitted event: ${JSON.stringify(event)}`)
            }
        })
    }
}

module.exports = HueListener
