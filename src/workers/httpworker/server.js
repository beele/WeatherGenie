var Server = function() {
    var logger  = require("./../../logging/logger").makeLogger("SERVER---------");
    var http    = require("http");
    var cluster = require("cluster");
    var Router  = require("./router");

    //Private variables.
    var id      = null;
    var router  = null;

    init();

    /*-------------------------------------------------------------------------------------------------
     * ------------------------------------------------------------------------------------------------
     *                                        Private functions
     * ------------------------------------------------------------------------------------------------
     ------------------------------------------------------------------------------------------------*/
    /**
     * Configures and starts the Server instance.
     * First a new Router instance will be made for handling all incoming requests.
     * The router will be given an object that contains the REST endpoint mappings.
     *
     * The server will then be set to listen on the given port and each request will be handled by the router.
     */
    function init() {
        id = cluster.worker.id;

        //Create a new router instance and pass it the mapped endpoints.
        router = new Router(mapRestEndpoints());

        var port = 8080;
        //Create a http server that listens on the given port. the second param is for making the localhost loopback work.
        http.createServer(onRequest).listen(port, "0.0.0.0");
        logger.INFO("Server started => Listening at port: " + port);
    }

    /**
     * Set up any REST endpoints here!
     * Add a new line for each endpoint you want to handle.
     * To allow for params to be passed, end your endpoint with a /*
     */
    function mapRestEndpoints() {
        var GenericEndpoints    = require("./../../services/genericendpoints");
        var WeatherService      = require("./../../services/weather/weather");

        var genericEndpoints    = new GenericEndpoints();
        var weatherService      = new WeatherService();

        return {
            "/"                         : genericEndpoints.index,
            "/upload"                   : genericEndpoints.upload,

            "/weather"                  : weatherService.showWeatherCache,
            "/weather/*"                : weatherService.retrieveWeather,

            "/weather/rain"             : weatherService.showRainMaps,
            "/weather/rain/*"           : weatherService.geographicPrediction,
            "/weather/rain/xy/*"        : weatherService.geographicPredictionForBlock,

            "/weather/lightning"        : weatherService.showLightingCache,
            "/weather/lightning/*"      : weatherService.lightningData
        };
    }

    /**
     * Handles any incoming requests.
     * Any request recieved will be passed on to the router.
     *
     * @param request The request that was received.
     * @param response The response to send back.
     */
    function onRequest(request, response) {
        var url = require("url");

        var pathName = url.parse(request.url).pathname;
        logger.INFO("IP: " + request.connection.remoteAddress + " \tassigned to server: " + id + "\t-> requested: " + pathName);
        router.route(pathName, request, response);
    }
};

module.exports = Server;