var fs = require("fs");
var mime = require("mime");

var logger = require("./logging/logger").makeLogger("ROUTER");

/**
 * Routes the given request according to the given parameters.
 *
 * @param handles An arrays of handles which handles the request for a given pathName.
 * @param pathName The requested URI (can be a rest-endpoint/folder/file).
 * @param request The request as sent by the client.
 * @param response The response to return to the client.
 */
function route(handles, pathName, request, response) {

    if(isFile(pathName)) {
        //All files on the static file server should be located in the www folder!
        var fullPath = "www" + pathName;
        tryAndServeFile(response, fullPath);
    } else {
        if(pathName.substring(pathName.length - 1) === "/") {
            //Handle folder access.
            displayError(response, 403, "Folder access is forbidden!", pathName);
        } else {
            //Handle REST endpoint access.
            tryAndHandleRestEndpoint(handles, pathName, request, response)
        }
    }
}

/**
 *
 *
 * @param pathName
 * @returns {boolean}
 */
function isFile(pathName) {
    var path = pathName.replace("/","");
    var isFile = path.indexOf(".") > -1;
    return isFile && path.search(".") == 0;
}

/**
 *
 *
 * @param response
 * @param fullPath
 */
function tryAndServeFile(response, fullPath) {
    //Read and present the file.
    fs.exists(fullPath, function(exists) {
        //If the file does not exist, present a 404 error.
        if(!exists) {
            displayError(response, 404, "Resource not found!", fullPath);
        } else {
            fs.readFile(fullPath, "binary", function(error, file) {
                if(error) {
                    //If there was an error while reading the file, present a 500 error.
                    logger.ERROR("Error serving file!", fullPath);

                    displayError(response, 500, "Error while serving content!");
                } else {
                    logger.INFO("Serving: " + fullPath);
                    var cntType = mime.lookup(fullPath);
                    logger.INFO("Of type: " + cntType);

                    //Present the file.
                    response.setHeader("Content-Type", cntType);
                    response.writeHead(200);
                    response.write(file, "binary");
                    response.end();
                }
            });
        }
    });
}

/**
 *
 *
 * @param handles
 * @param pathName
 * @param request
 * @param response
 */
function tryAndHandleRestEndpoint(handles, pathName, request, response) {
    if(typeof handles[pathName] === 'function') {
        logger.INFO("Handling REST request: " + pathName);

        handles[pathName](request, response);
    } else {
        var correctedEndpoint = pathName.substring(0, pathName.lastIndexOf("/")) + "/*";
        if(typeof handles[pathName.substring(0, pathName.lastIndexOf("/")) + "/*"] === 'function') {
            logger.INFO("Handling REST request: " + pathName);

            handles[correctedEndpoint](request, response);
        } else {
            displayError(response, 500, "Cannot find REST endpoint!", pathName);
        }
    }
}

/**
 * Adds an error the response object.
 *
 * @param response The response to add the error to.
 * @param type A number indicating the type of the error: 403,404,500,50x
 * @param message A message to show on screen that describes the error.
 */
function displayError(response, type, message, pathName) {
    logger.ERROR(message + " (" + pathName + ")");

    response.writeHead(type, {"Content-Type": "text/plain"});
    response.write(message);
    response.end();
}

exports.route = route;