var logger = require("../logging/logger").makeLogger("SERVIC");

var buienradar = require("../workers/buienradar/buienradar");
var blitzortung = require("../workers/blitzortung/blitzortung");
var openweathermap = require("../workers/openweathermap/openweathermap");

function geographicPrediction(request, response) {
    logger.INFO("geographicPrediction method was called!");

    var pieces = request.url.split("/");
    var latlon = pieces[pieces.length - 1];
    pieces = latlon.split("&");

    var lat = parseFloat(pieces[0].replace(",","."));
    var lon = parseFloat(pieces[1].replace(",","."));

    var callback = function(result) {
        var resp = response;
        resp.writeHead(200, {});
        resp.write(JSON.stringify(result, null, 4));
        resp.end();
    };

    //Make a call to the buienradar service.
    buienradar.geographicPrediction(lat, lon, callback);
}

function geographicPredictionForBlock(request, response) {
    logger.INFO("geographicPredictionForBlock method was called!");

    var pieces = request.url.split("/");
    var xy = pieces[pieces.length - 1];
    pieces = xy.split("&");

    var x = pieces[0] * 10;
    var y = pieces[1] * 8;

    var callback = function(result) {
        var resp = response;
        resp.writeHead(200, {});
        resp.write(JSON.stringify(result, null, 4));
        resp.end();
    };

    //Make a call to the buienradar service.
    buienradar.geographicPredictionForBlock(x, y, callback);
}

function showRainMaps(request, response) {
    logger.INFO("showRainMaps method was called!");

    var callback = function(result) {
        var resp = response;
        resp.writeHead(200, {});
        resp.write(JSON.stringify(result, null, 4));
        resp.end();
    };

    buienradar.showRainMaps(callback);
}

function lightningData(request, response) {
    logger.INFO("lightningData method was called!");

    var pieces = request.url.split("/");
    var latlon = pieces[pieces.length - 1];
    pieces = latlon.split("&");

    var lat = parseFloat(pieces[0].replace(",","."));
    var lon = parseFloat(pieces[1].replace(",","."));

    var callback = function(result) {
        var resp = response;
        resp.writeHead(200, {});
        resp.write(JSON.stringify(result, null, 4));
        resp.end();
    };

    blitzortung.lightningData(callback, lat, lon);
}

function showLightingCache(request, response) {
    logger.INFO("showLightingCache method was called!");

    var callback = function(result) {
        var resp = response;
        resp.writeHead(200, {});
        resp.write(JSON.stringify(result, null, 4));
        resp.end();
    };

    blitzortung.showLightingCache(callback);
}

function retrieveWeather(request, response) {
    logger.INFO("retrieveWeather method was called!");

    var callback = function(data) {
        var resp = response;
        resp.writeHead(200, {});
        resp.write(JSON.stringify(data, 0, 4));
        resp.end();
    };

    var pieces = request.url.split("/");
    openweathermap.retrieveWeatherInfo(pieces[pieces.length - 1], callback);
}

function showWeatherCache(request, response) {
    logger.INFO("showWeatherCache method was called!");

    var callback = function(data) {
        var resp = response;
        resp.writeHead(200, {});
        resp.write(JSON.stringify(data, 0, 4));
        resp.end();
    };

    openweathermap.showWeatherCache(callback);
}

exports.retrieveWeather     = retrieveWeather;
exports.showWeatherCache    = showWeatherCache;
exports.showRainMaps        = showRainMaps;

exports.geographicPrediction            = geographicPrediction;
exports.geographicPredictionForBlock    = geographicPredictionForBlock;

exports.lightningData       = lightningData;
exports.showLightingCache   = showLightingCache;