Module.register("MMM-HueControl", {
    requiresVersion: "2.29.0",
    defaults: {
        hueBridgeIpAddress: "",
        hueApplicationKey: "",
        events: [],
        reconnectTimeout: 60 * 1000,
        debug: false
    },

    start: function () {
        Log.info("Starting module: " + this.name)
        this.sendSocketNotification("START_HUE_LISTENER", this.config)
        this.eventStatuses = {}
        this.sseStatus = this.translate("DISCONNECTED")
        this.lastNotifications = []
    },

    getStyles: function () {
        return ["MMM-HueControl.css"]
    },

    getDom: function () {
        const wrapper = document.createElement("div")
        wrapper.className = "mmm-huecontrol-wrapper"

        if (!this.config.debug) {
            return wrapper // Return empty wrapper if debug is false
        }

        const infoList = document.createElement("ul")
        infoList.className = "mmm-huecontrol-info"

        // 1. Hue IP Address
        const ipItem = document.createElement("li")
        ipItem.textContent = this.translate("HUE_BRIDGE_IP", { ip: this.config.hueBridgeIpAddress })
        infoList.appendChild(ipItem)

        // 2. SSE Connection State
        const sseItem = document.createElement("li")
        sseItem.textContent = this.translate("SSE_CONNECTION_STATUS", { status: this.sseStatus })
        infoList.appendChild(sseItem)

        // 3. Amount of recognized events
        const eventsItem = document.createElement("li")
        eventsItem.textContent = this.translate("RECOGNIZED_EVENTS", { count: this.config.events.length })
        infoList.appendChild(eventsItem)

        wrapper.appendChild(infoList)

        // 4. Last 5 sent notifications with timestamp
        const notificationsList = document.createElement("ul")
        notificationsList.className = "mmm-huecontrol-notifications"

        this.lastNotifications.slice(0, 5).forEach((notif) => {
            const notifItem = document.createElement("li")
            notifItem.textContent = this.translate("NOTIFICATION_ENTRY", { timestamp: notif.timestamp, notification: notif.notification })
            notificationsList.appendChild(notifItem)
        })

        wrapper.appendChild(notificationsList)

        return wrapper
    },

    socketNotificationReceived: function (notification, payload) {
        if (notification === "EVENT_STATUS_CHANGE") {
            this.eventStatuses[payload.eventId] = payload
            if (Array.isArray(payload.status)) {
                payload.status.forEach((status) => {
                    this.sendNotification(status, payload)
                    this.addNotificationToList(status)
                })
            } else {
                this.sendNotification(payload.status, payload)
                this.addNotificationToList(payload.status)
            }
            this.updateDom()
        } else if (notification === "SSE_CONNECTION_STATUS") {
            this.sseStatus = payload
            this.updateDom()
        }
    },

    addNotificationToList: function (status) {
        const timestamp = new Date().toLocaleString()
        this.lastNotifications.unshift({ timestamp, notification: status })
        while (this.lastNotifications.length > 5) {
            this.lastNotifications.pop()
        }
    },

    getTranslations: function () {
        return {
            en: "translations/en.json",
            de: "translations/de.json"
        }
    },

    getScripts: function () {
        return ["src/event_types.js"]
    }
})
