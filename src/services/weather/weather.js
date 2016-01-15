var WeatherService = function() {
    var logger          = require("../../logging/logger").makeLogger("SERV-WEATHER---");
    var BuienRadar      = require("./buienradar/buienradar");
    var Blitzortung     = require("./blitzortung/blitzortung");
    var OpenWeatherMap  = require("./openweathermap/openweathermap");

    //Private variables.
    var buienradar      = new BuienRadar();
    var blitzortung     = new Blitzortung();
    var openweathermap  = new OpenWeatherMap();

    /*-------------------------------------------------------------------------------------------------
     * ------------------------------------------------------------------------------------------------
     *                                        Public functions
     * ------------------------------------------------------------------------------------------------
     ------------------------------------------------------------------------------------------------*/
    /**
     * Returns a rain prediction based on geographic location.
     * The URL should contain the lat and lon values separated by an ampersand ("&").
     * The lat and lon values should use the "." as decimal separator.
     *
     * @param request The request that has been made.
     * @param response The response to write to.
     */
    this.geographicPrediction = function(request, response) {
        logger.INFO("geographicPrediction method was called!");

        var pieces = request.url.split("/");
        var latlon = pieces[pieces.length - 1];
        pieces = latlon.split("&");

        var lat = parseFloat(pieces[0].replace(",","."));
        var lon = parseFloat(pieces[1].replace(",","."));

        //Make a call to the buienradar service.
        buienradar.geographicPrediction(lat, lon, function (result) {
            var resp = response;
            resp.writeHead(200, {});
            resp.write(JSON.stringify(result, null, 4));
            resp.end();
        });
    };

    /**
     * Returns a rain prediction based on block coordinates.
     * The URL should contain the x and y values separated by an ampersand ("&").
     * The x and y values should be "0" or greater!
     *
     * @param request The request that has been made.
     * @param response The response to write to.
     */
    this.geographicPredictionForBlock = function(request, response) {
        logger.INFO("geographicPredictionForBlock method was called!");

        var pieces = request.url.split("/");
        var xy = pieces[pieces.length - 1];
        pieces = xy.split("&");

        var x = pieces[0] * 10;
        var y = pieces[1] * 8;

        //Make a call to the buienradar service.
        buienradar.geographicPredictionForBlock(x, y, function (result) {
            var resp = response;
            resp.writeHead(200, {});
            resp.write(JSON.stringify(result, null, 4));
            resp.end();
        });
    };

    /**
     * Returns all available rain data as text (both current and forecast).
     *
     * @param request The request that has been made.
     * @param response The response to write to.
     */
    this.showRainMaps = function(request, response) {
        logger.INFO("showRainMaps method was called!");

        buienradar.showRainMaps(function (result) {
            var resp = response;
            resp.writeHead(200, {});
            resp.write(JSON.stringify(result, null, 4));
            resp.end();
        });
    };

    /**
     * Returns the lightning data for the given geographic location.
     * The URL should contain the lat and lon values separated by an ampersand ("&").
     * The lat and lon values should use the "." as decimal separator.
     *
     * @param request The request that has been made.
     * @param response The response to write to.
     */
    this.lightningData = function(request, response) {
        logger.INFO("lightningData method was called!");

        var pieces = request.url.split("/");
        var latlon = pieces[pieces.length - 1];
        pieces = latlon.split("&");

        var lat = parseFloat(pieces[0].replace(",","."));
        var lon = parseFloat(pieces[1].replace(",","."));

        blitzortung.lightningData(lat, lon, function(result) {
            var resp = response;
            resp.writeHead(200, {});
            resp.write(JSON.stringify(result, null, 4));
            resp.end();
        });
    };

    /**
     * Returns the content of the lightning cache.
     *
     * @param request The request that has been made.
     * @param response The response to write to.
     */
    this.showLightingCache = function(request, response) {
        logger.INFO("showLightingCache method was called!");

        blitzortung.showLightingCache(function(result) {
            var resp = response;
            resp.writeHead(200, {});
            resp.write(JSON.stringify(result, null, 4));
            resp.end();
        });
    };

    /**
     * Returns the weather forecast (not the rain data) for the given city.
     *
     * @param request The request that has been made.
     * @param response The response to write to.
     */
    this.retrieveWeather = function(request, response) {
        logger.INFO("retrieveWeather method was called!");

        //First call the openweathermap to retrieve the general weather information.
        //Once in the callback for that function, make a call to the forecast of the buienradar.
        //Consolidate the data in the second callback end write the response.
        var pieces = request.url.split("/");
        openweathermap.retrieveWeatherInfo(pieces[pieces.length - 1].toLowerCase(), function(data) {
            buienradar.geographicConditionForecast(data.placeName, function(data2) {
                data.predictions = data2;

                var resp = response;
                resp.writeHead(200, {});
                resp.write(JSON.stringify(data, 0, 4));
                resp.end();
            });
        });
    };

    /**
     * Returns the content of the weather cache.
     *
     * @param request The request that has been made.
     * @param response The response to write to.
     */
    this.showWeatherCache = function(request, response) {
        logger.INFO("showWeatherCache method was called!");

        openweathermap.retrieveOpenweathermapWeatherCache(function (data) {
            buienradar.retrieveBuienradarWeatherCache(function (data2) {
                var result = { opeweatherMap: data, buienradar: data2};

                var resp = response;
                resp.writeHead(200, {});
                resp.write(JSON.stringify(result, 0, 4));
                resp.end();
            });
        });
    };

    /*-------------------------------------------------------------------------------------------------
     * ------------------------------------------------------------------------------------------------
     *                                        Private functions
     * ------------------------------------------------------------------------------------------------
     ------------------------------------------------------------------------------------------------*/
};

module.exports = WeatherService;