const https = require("https")
const EventEmitter = require("events")

class HueListener extends EventEmitter {
    constructor(bridgeIp, appKey, events, reconnectTimeout = 30000, debug = false) {
        super()
        this.bridgeIp = bridgeIp
        this.appKey = appKey
        this.events = events
        this.reconnectTimeout = reconnectTimeout
        this.headers = {
            "Accept": "text/event-stream",
            "hue-application-key": this.appKey
        }
        this.reconnectionAttempts = 0
        this.isConnected = false
        this.debug = debug
    }

    start() {
        this.connect()
    }

    connect() {
        const options = {
            hostname: this.bridgeIp,
            port: 443,
            path: "/eventstream/clip/v2",
            method: "GET",
            headers: this.headers,
            rejectUnauthorized: false
        }

        this.req = https.request(options, (res) => {
            if (res.statusCode === 200) {
                this.isConnected = true
                this.reconnectionAttempts = 0
                this.emit("connectionStatus", "Connected")
                console.log("Connected to Hue Bridge SSE")
                res.on("data", chunk => this.processEventData(chunk.toString()))
            } else {
                console.error(`Unexpected status code: ${res.statusCode}`)
                this.scheduleReconnection()
            }
        })

        this.req.on("error", (error) => {
            console.error("Error in SSE connection:", error)
            this.emit("error", error)
            this.scheduleReconnection()
        })

        this.req.on("close", () => {
            if (this.isConnected) {
                console.log("SSE connection closed")
                this.isConnected = false
                this.emit("connectionStatus", "Disconnected")
                this.scheduleReconnection()
            }
        })

        this.req.end()
    }

    scheduleReconnection() {
        if (this.reconnectionTimer) {
            clearTimeout(this.reconnectionTimer)
        }

        const delay = Math.min(this.reconnectTimeout, (this.reconnectionAttempts + 1) * 1000)
        this.reconnectionTimer = setTimeout(() => {
            console.log(`Attempting to reconnect in ${delay}ms`)
            this.reconnectionAttempts++
            this.emit("connectionStatus", `Reconnection attempt ${this.reconnectionAttempts}`)
            this.connect()
        }, delay)
    }

    stop() {
        if (this.req) {
            this.req.destroy()
        }
        if (this.reconnectionTimer) {
            clearTimeout(this.reconnectionTimer)
        }
        this.isConnected = false
        this.emit("connectionStatus", "Stopped")
    }

    processEventData(data) {
        const dataLines = data.split("\n").filter(line => line.startsWith("data:"))
        dataLines.forEach((line) => {
            try {
                const jsonData = JSON.parse(line.replace(/^data: /, "").trim())
                this.processJsonData(jsonData)
            } catch (error) {
                console.error("Error processing event data:", error, "Raw data:", line)
            }
        })
    }

    processJsonData(jsonData) {
        if (Array.isArray(jsonData)) {
            jsonData.forEach((item) => {
                if (item.data && Array.isArray(item.data)) {
                    item.data.forEach((sse) => {
                        this.checkAndEmitEvent(sse)
                    })
                }
            })
        } else {
            console.log("Received unexpected JSON structure:", JSON.stringify(jsonData))
        }
    }

    checkAndEmitEvent(sse) {
        const matchingEvents = this.events.filter(event =>
            sse.id === event.eventId
            && sse.type === event.eventType
        )

        matchingEvents.forEach((event) => {
            if (this.matchEventContent(sse, event.eventContent)) {
                const status = {
                    eventId: sse.id,
                    type: sse.type,
                    status: Array.isArray(event.notification) ? event.notification : [event.notification]
                }
                this.emit("eventStatusChange", status)
                if (this.debug) {
                    console.log(`Matched and emitted event: ${JSON.stringify(status)}`)
                }
            } else if (this.debug) {
                console.log(`Event content didn't match for event ID ${sse.id}`)
            }
        })

        if (this.debug && matchingEvents.length === 0) {
            console.log(`Received event for sse ${sse.id} of type ${sse.type}, but no matching configuration found.`)
        }
    }

    matchEventContent(sse, eventContent) {
        for (const [key, value] of Object.entries(eventContent)) {
            if (typeof value === "object") {
                if (!this.matchEventContent(sse[key], value)) return false
            } else if (sse[key] !== value) {
                return false
            }
        }
        return true
    }
}

module.exports = HueListener
