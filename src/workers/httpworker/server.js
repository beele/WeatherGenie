var Server = function() {
    var logger  = require("./../../logging/logger").makeLogger("SERVER---------");
    var http    = require("http");
    var cluster = require("cluster");
    var Router  = require("./router");

    //Configuration.
    var Config  = require("../../../resources/config");
    var config  = new Config();

    //Private variables.
    var id          = null;
    var router      = null;
    var port        = 8080;
    var canListDir  = false;

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

        //Get any settings we need to apply here!
        port = config.settings.serverPort;
        canListDir = config.settings.canListDirectories;

        //Create a new router instance and pass it the mapped endpoints.
        router = new Router(mapRestEndpoints(), {canListDir: canListDir});

        //Create a http server that listens on the given port. the second param is for making the localhost loopback work.
        http.createServer(onRequest).listen(port, "0.0.0.0");
        logger.INFO("Server started => Listening at port: " + port);
    }

    /**
     * Set up any REST endpoints here!
     * Add a new line for each endpoint you want to handle.
     * To allow for params to be passed, end your endpoint with "*".
     * Pass the parameter names via the params variable.
     */
    function mapRestEndpoints() {
        var GenericEndpoints    = require("./../../services/genericendpoints");
        var WeatherService      = require("./../../services/weather/weather");

        var genericEndpoints    = new GenericEndpoints();
        var weatherService      = new WeatherService();

        return {
            "/"                             : {execute : genericEndpoints.index,                       params: null},
            "/upload"                       : {execute : genericEndpoints.upload,                      params: null},

            "/weather"                      : {execute : weatherService.showWeatherCache,              params: null},
            "/weather/*"                    : {execute : weatherService.retrieveWeather,               params: ["city"]},

            "/weather/rain"                 : {execute : weatherService.showRainMaps,                  params: null},
            "/weather/rain/*"               : {execute : weatherService.geographicPrediction,          params: ["latitude", "longitude"]},
            "/weather/rain/xy/*"            : {execute : weatherService.geographicPredictionForBlock,  params: ["x", "y"]},

            "/weather/lightning"            : {execute : weatherService.showLightingCache,             params: null},
            "/weather/lightning/*"          : {execute : weatherService.lightningData,                 params: ["latitude", "longitude"]}
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