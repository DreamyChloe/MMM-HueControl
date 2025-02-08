const HueListener = require("../src/hue_listener")
const config = {
    hueBridgeIpAddress: "192.168.178.53",
    hueApplicationKey: "dVWCOzjPH0qM3EpFiC-aM9uRTipeHwbiJpIsEdHS",
    events: [
        {
            eventId: "6b0c8bc7-a31c-4383-abba-d7ee16e2e4ed",
            eventType: "grouped_light",
            eventContent: {
                on: {
                    on: true
                }
            },
            notification: "LIGHT_TURNED_ON"
        },
        // Add more events as needed
    ],
    reconnectTimeout: 60 * 1000,
    debug: true
}

// Mock the Log object
global.Log = {
    info: console.log,
    error: console.error,
    warn: console.warn,
    debug: console.debug
}

// Create an instance of HueListener
const hueListener = new HueListener(
    config.hueBridgeIpAddress,
    config.hueApplicationKey,
    config.events,
    config.reconnectTimeout,
    config.debug
)

// Listen for events
hueListener.on("connectionStatus", (status) => {
    console.log("Connection status:", status)
})

hueListener.on("eventStatusChange", (event) => {
    console.log("Event status change:", event)
})

hueListener.on("error", (error) => {
    console.error("Error:", error)
})

// Start the listener
hueListener.start()

// Keep the script running
setInterval(() => {}, 1000)
