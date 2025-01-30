const NodeHelper = require("node_helper")
const Log = require("logger")
const HueListener = require("./src/hue_listener")

module.exports = NodeHelper.create({
    start: function () {
        Log.info("Starting node helper for: " + this.name)
        this.hueListener = null
    },

    socketNotificationReceived: function (notification, payload) {
        if (notification === "START_HUE_LISTENER") {
            this.config = payload
            this.startHueListener()
        }
    },

    startHueListener: function () {
        if (this.hueListener) {
            // Clean up existing listener if any
            this.hueListener.stop()
        }

        this.hueListener = new HueListener(
            this.config.hueBridgeIpAddress,
            this.config.hueApplicationKey,
            this.config.events,
            this.config.reconnectTimeout,
            this.config.debug
        )

        this.hueListener.on("eventStatusChange", (status) => {
            this.sendSocketNotification("EVENT_STATUS_CHANGE", status)
        })

        this.hueListener.on("error", (error) => {
            Log.error("Hue Listener Error:", error)
            this.sendSocketNotification("SSE_CONNECTION_STATUS", "Error: " + error.toString())
        })

        this.hueListener.on("connectionStatus", (status) => {
            this.sendSocketNotification("SSE_CONNECTION_STATUS", status)
        })

        this.hueListener.start()
    },

    stop: function () {
        if (this.hueListener) {
            this.hueListener.stop()
            this.hueListener = null
        }
    }
})
