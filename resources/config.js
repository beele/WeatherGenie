var Config = function() {

    return {
        settings: {
            debug: false,
            serverPort: 8080,
            canListDirectories: false,
            numberOfHTTPWorkers: -1,

            cacheStaleThresholdInMinutes: 120
        },

        keys: {
            openweatherMapApiKey: ""
        }
    }

};

module.exports = Config;