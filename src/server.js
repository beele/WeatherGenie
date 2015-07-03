var http = require("http");
var url = require("url");

var router = require("./router");

var logger = require("./logging/logger").makeLogger("SERVER");

/**
 * This function will start the server.
 *
 * @param route The function that will handle the routing of the requests.
 * @param handles An array with handles which can be matched by specific routes.
 */
function start(id, handles) {
    function onRequest(request, response) {
        var pathName = url.parse(request.url).pathname;

        logger.INFO("---------------------------------------------------------");
        logger.INFO("SID: " + id + " -> Request for " + pathName + " received.");

        router.route(handles, pathName, request, response);
    }

    http.createServer(onRequest).listen(8080, "0.0.0.0");
    logger.INFO("Server started!");
}

exports.start = start;