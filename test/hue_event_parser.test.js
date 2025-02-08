const fs = require("fs")
const path = require("path")
const HueEventParser = require("../src/hue_event_parser")

describe("HueEventParser", () => {
    let parser
    const testConfig = [
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
        {
            eventId: "459cabd7-7ff0-424f-b179-604e7cc6146d",
            eventType: "button",
            eventContent: {
                button: {
                    last_event: "short_release"
                }
            },
            notification: "BUTTON_PRESSED"
        }
    ]

    beforeEach(() => {
        parser = new HueEventParser(testConfig, true)
    })

    function loadSampleEvent(filename) {
        const filePath = path.join(__dirname, filename)
        return fs.readFileSync(filePath, "utf8")
    }

    test("parseEventData with sample_event1.json", () => {
        const sampleEvent1 = loadSampleEvent("sample_event1.json")
        const result = parser.parseEventData(sampleEvent1)

        expect(result).toHaveLength(1)
        expect(result[0]).toEqual({
            eventId: "6b0c8bc7-a31c-4383-abba-d7ee16e2e4ed",
            type: "grouped_light",
            status: "LIGHT_TURNED_ON"
        })
    })

    test("parseEventData with sample_event2.json", () => {
        const sampleEvent2 = loadSampleEvent("sample_event2.json")
        const result = parser.parseEventData(sampleEvent2)

        expect(result).toHaveLength(2)
        expect(result[0]).toEqual({
            eventId: "459cabd7-7ff0-424f-b179-604e7cc6146d",
            type: "button",
            status: "BUTTON_PRESSED"
        })
        expect(result[1]).toEqual({
            eventId: "6b0c8bc7-a31c-4383-abba-d7ee16e2e4ed",
            type: "grouped_light",
            status: "LIGHT_TURNED_ON"
        })
    })

    test("parseEventData with invalid JSON", () => {
        const invalidJson = "{\"invalid\": \"json\""
        const result = parser.parseEventData(invalidJson)

        expect(result).toEqual([])
    })

    test("parseEventData with unexpected JSON structure", () => {
        const unexpectedJson = "{\"unexpected\": \"structure\"}"
        const result = parser.parseEventData(unexpectedJson)

        expect(result).toEqual([])
    })
})
