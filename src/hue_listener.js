const { EventSource } = require("eventsource")
const EventEmitter = require("events")
const HueEventParser = require("./hue_event_parser")
const { fetch, Agent } = require("undici")

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
        this.reconnectTimeoutId = null
    }

    start() {
        this.connect()
    }

    connect() {
        if (this.eventSource) {
            this.eventSource.close()
        }

        const url = `https://${this.bridgeIp}/eventstream/clip/v2`
        const options = {
            fetch: (input, init) => fetch(input, {
                ...init,
                dispatcher: new Agent({
                    connect: {
                        rejectUnauthorized: false
                    },
                    bodyTimeout: 0
                }),
                headers: {
                    ...init.headers,
                    "Accept": "text/event-stream",
                    "hue-application-key": this.appKey
                },
            }),
        }

        this.eventSource = new EventSource(url, options)

        this.eventSource.onopen = () => {
            this.isConnected = true
            this.emit("connectionStatus", "Connected")
            console.log("Connected to Hue Bridge SSE API")
        }

        this.eventSource.onmessage = (event) => {
            this.processEventData(event.data)
        }

        this.eventSource.onerror = (error) => {
            console.error("Error in SSE connection:", error)
            this.emit("error", error)
            this.isConnected = false
            this.emit("connectionStatus", "Disconnected")
            this.eventSource.close()
            this.scheduleReconnection()
        }
    }

    scheduleReconnection() {
        if (this.reconnectTimeoutId) {
            clearTimeout(this.reconnectTimeoutId)
        }
        this.reconnectTimeoutId = setTimeout(() => {
            console.log("Attempting to reconnect...")
            this.emit("connectionStatus", "Reconnecting")
            this.connect()
            this.reconnectTimeoutId = null
        }, this.reconnectTimeout)
    }

    stop() {
        if (this.eventSource) {
            this.eventSource.close()
        }
        if (this.reconnectTimeoutId) {
            clearTimeout(this.reconnectTimeoutId)
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
