var http = require("http");
var url = require("url");

var router = require("./router");

var logger = require("./logging/logger").makeLogger("SERVER");

/**
 * This function will start the server.
 *
 * @param id The server id.
 * @param handles An array with handles which can be matched by specific routes.
 */
function start(id, handles) {
    http.createServer(makeRequestHandler(id, handles)).listen(8080, "0.0.0.0");
    logger.INFO("Server started!");
}

/**
 * Creates and returns the request handler closure function.
 *
 * @param id The server id.
 * @param handles An array with handles which can be matched by specific routes.
 * @returns {Function} The actual request handler.
 */
function makeRequestHandler(id, handles) {
    /**
     * Request handler.
     *
     * @param request The request object.
     * @param response The response object.
     */
    return function onRequest(request, response) {
        var pathName = url.parse(request.url).pathname;
        logger.INFO("IP: " + request.connection.remoteAddress + " \tassigned to server: " + id + "\t-> requested: " + pathName);
        router.route(handles, pathName, request, response);
    };
}

exports.start = start;