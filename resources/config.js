var Config = function() {

    return {
        settings: {
            debug: false,
            serverPort: 8080,
            canListDirectories: false,
            numberOfHTTPWorkers: -1,

            cacheStaleThresholdInMinutes: 120,
            intervalWorkerIntervalInMilliseconds: 480000
        },

        keys: {
            openweatherMapApiKey: ""
        },

        urls: {
            buienradar_past: "https://api.buienradar.nl/image/1.0/radarmapbe/?ext=gif&nt=1&hist=13&forc=-1&step=0&w=550&h=512",
            buienradar_pred: "https://api.buienradar.nl/image/1.0/radarmapbe/?ext=gif&nt=1&hist=-1&forc=13&step=0&w=550&h=512",

            blitzortung_ws: "ws://ws.blitzortung.org"
        }
    }
};

module.exports = Config;