var http = require("http");

var logger = require("../../logging/logger").makeLogger("SERVIC");
var messageFactory = require("../../util/messagefactory").getInstance();

//Variables.
var currentRainMap = null;
var predictRainMap = null;
var callbacks = {};

/**
 * Make a prediction based on the given geographic coordinates.
 *
 * @param lat The latitude.
 * @param lon The Longitude.
 * @param callback Callback function, executed when the prediction is ready, contains the data.
 */
function geographicPrediction(lat, lon, callback) {
    logger.INFO("buienradar service geographicPrediction method was called!");
    var id = new Date().getTime() + "--" + (Math.random() * 6);
    callbacks[id] = callback;

    messageFactory.sendMessageWithHandler(  messageFactory.TARGET_BROKER, "retrieveData", {key: "rainMaps"},
                                            "buienradar", "geographicPredictionMessageHandler", {lat: lat, lon: lon, callbackId: id});
}

function geographicPredictionMessageHandler(msg) {
    logger.DEBUG("buienradar rain maps received");

    //Null safety check!
    if(msg.returnData === undefined || msg.returnData.currentRainMap === undefined || msg.returnData.predictRainMap === undefined) {
        logger.DEBUG("No data available, returning error!");
        callbacks[msg.handlerParams.callbackId]({ERROR: "No rain maps available!"});
        delete callbacks[msg.handlerParams.callbackId];
    } else {
        currentRainMap = msg.returnData.currentRainMap;
        predictRainMap = msg.returnData.predictRainMap;

        var coordinates = convertLatLonToXY(msg.handlerParams.lat, msg.handlerParams.lon);
        var x = coordinates.x;
        var y = coordinates.y;

        var current = currentWeather(x,y);
        var predict = comingWeather(x,y);
        callbacks[msg.handlerParams.callbackId]({currentConditions: current, predictedConditions: predict});
        delete callbacks[msg.handlerParams.callbackId];
    }
}

function geographicPredictionForBlock(x, y, callback) {
    logger.INFO("buienradar service geographicPredictionForBlock method was called!");
    var id = new Date().getTime() + "--" + (Math.random() * 6);
    callbacks[id] = callback;

    messageFactory.sendMessageWithHandler(  messageFactory.TARGET_BROKER, "retrieveData", {key: "rainMaps"},
                                            "buienradar", "geographicPredictionForBlockMessageHandler", {x: x, y: y, callbackId: id});
}

function geographicPredictionForBlockMessageHandler(msg) {
    logger.DEBUG("buienradar rain maps received");

    //Null safety check!
    if(msg.returnData === undefined || msg.returnData.currentRainMap === undefined || msg.returnData.predictRainMap === undefined) {
        logger.DEBUG("No data available, returning error!");
        callbacks[msg.handlerParams.callbackId]({ERROR: "No rain maps available!"});
        delete callbacks[msg.handlerParams.callbackId];
    } else {
        currentRainMap = msg.returnData.currentRainMap;
        predictRainMap = msg.returnData.predictRainMap;

        var current = currentWeather(msg.handlerParams.x, msg.handlerParams.y);
        var predict = comingWeather(msg.handlerParams.x, msg.handlerParams.y);
        callbacks[msg.handlerParams.callbackId]({currentConditions: current, predictedConditions: predict});
        delete callbacks[msg.handlerParams.callbackId];
    }
}

function showRainMaps(callback) {
    logger.INFO("buienradar service showRainMaps method was called!");
    var id = new Date().getTime() + "--" + (Math.random() * 6);
    callbacks[id] = callback;

    messageFactory.sendMessageWithHandler(  messageFactory.TARGET_BROKER, "retrieveData", {key: "rainMaps"},
                                            "buienradar", "showRainMapsMessageHandler", {callbackId: id});
}

function showRainMapsMessageHandler(msg) {
    callbacks[msg.handlerParams.callbackId](msg);
    delete callbacks[msg.handlerParams.callbackId];
}

function geographicConditionForecast(city, callback) {
    var clbck = function(data) {
        retrieveDailyForecast(data, callback)
    };

    retrieveLocationIdForCity(city, clbck);
}

/*------------------------------------------------------------------------------------------------
* ------------------------------------------------------------------------------------------------
*                                    Main buienradar functions
* ------------------------------------------------------------------------------------------------
 ------------------------------------------------------------------------------------------------*/
/**
 * Retrieves the location id for the given city.
 * Will call the callback with null as data if no location id can be found or an error occurred.
 *
 * @param city The city for which the location id should be found.
 * @param callback The callback function to execute after the data has been received and processed.
 */
function retrieveLocationIdForCity(city, callback) {
    var options = {
        host: 'www.buienradar.be',
        port: '80',
        path: '/json/Places?term=' + encodeURI(city),
        method: 'POST'
    };

    http.request(options, function(res) {
        var data = '';
        res.setEncoding('utf8');

        res.on('data', function(chunk) {
            data += chunk;
        });
        res.on('end', function() {
            if(this.statusCode !== 200) {
                logger.ERROR("Cannot find location id for: " + city);
                callback(null);
            } else {
                logger.DEBUG(data);
                data = JSON.parse(data);

                if(data.length !== undefined && data.length > 0) {
                    callback(data[0].id);
                } else {
                    logger.ERROR("Cannot find location id for: " + city);
                    callback(null);
                }
            }
        });
    }).end();
}

/**
 * Retrieves the daily forecasts for the given location id.
 * Will call the callback with null as data if no forecast was found or an error occurred.
 * Forecasts are limited to the 5 first days!
 *
 * @param locationId The location id of the city for which we want the daily forecasts.
 * @param callback The callback function to execute after the data has been received and processed.
 */
function retrieveDailyForecast(locationId, callback) {
    var options = {
        host: 'www.buienradar.be',
        port: '80',
        path: '/json/GetDailyForecast?geolocationid=' + locationId,
        method: 'POST'
    };

    http.request(options, function(res) {
        var data = '';
        res.setEncoding('utf8');

        res.on('data', function(chunk) {
            data += chunk;
        });
        res.on('end', function() {
            if(this.statusCode !== 200) {
                logger.ERROR("No daily forecast found for city with id: " + locationId);
                callback(null);
            } else {
                logger.DEBUG(data);
                data = JSON.parse(data);

                if(data.days !== undefined && data.days.length > 0) {
                    //Only return the five first days!
                    callback(data.days.splice(0, 5));
                } else {
                    logger.ERROR("No daily forecast found for city with id: " + locationId);
                    callback(null);
                }
            }
        });
    }).end();
}

/**
 * Converts the given data which contains a gif with frames to rain intensity information per block.
 * @param data The data to process.
 * @returns {{frames: *, imageWidth: *, imageHeight: *, xBlocks: number, yBlocks: number, data: Array}}
 */
function convertImageToRainMap(data) {
    //data.shape is an array => 0:Frames - 1:Width - 2:Height - 3:Channels
    var numberOfFrames = data.shape[0];
    var bytesPerPixel = data.shape[3];
    var pixelsPerFrame = data.shape[1] * data.shape[2];
    var pixelsPerRow = data.shape[1];

    var xBlockWidth = 10;
    var yBlockHeight = 8;
    var xBlocks = data.shape[1] / xBlockWidth;
    var yBlocks = data.shape[2] / yBlockHeight;

    //Convert raw pixel data to raining data at pixel coordinates (this reduces data size by four -> RGBA to raining intensity)
    var pixelRainingData = [];
    for(var colors = 0 ; colors < data.data.length; colors += bytesPerPixel) {
        pixelRainingData.push(isRaining(data.data[colors], data.data[colors + 1], data.data[colors + 2]));
    }
    delete data.data;

    //Convert the array of all raining data to an array of arrays, where each secondary array holds all the raining data for one frame.
    var frameRainingData = [];
    for(var currentFrame = 0 ; currentFrame < numberOfFrames ; currentFrame++) {
        frameRainingData.push(pixelRainingData.slice(currentFrame * pixelsPerFrame, currentFrame * pixelsPerFrame + pixelsPerFrame));
    }
    delete pixelRainingData;

    //Calculate raining intensity for every block!
    //This further reduces the data from raining intensity per pixel location to raining intensity per block location (pixelRainingData.length/xBlocks*yBlocks)
    var blockData = [];
    //Loop over the main blocks (X/Y)
    for(var currentYBlock = 0 ; currentYBlock < yBlocks ; currentYBlock++) {
        for(var currentXBlock = 0 ; currentXBlock < xBlocks ; currentXBlock++) {

            //Loop over the current block its pixels.
            var startXPixel = (currentXBlock * xBlockWidth) + (currentYBlock * yBlockHeight * pixelsPerRow);

            var framedPixels = [];
            for(var currentFrame = 0 ; currentFrame < numberOfFrames ; currentFrame++) {
                var blockPixels = [];
                for(var rowIndex = 0 ; rowIndex < yBlockHeight ; rowIndex++) {
                    //Loop over the current block row.
                    for(var columnInRowIndex = 0 ; columnInRowIndex < xBlockWidth ; columnInRowIndex++) {
                        //Offset for block height by adding a full row worth of pixels to the startXPixel+i
                        //This gives us the same location but one row below the current.
                        blockPixels.push(frameRainingData[currentFrame][(rowIndex * pixelsPerRow) + startXPixel + columnInRowIndex]);
                    }
                }
                framedPixels.push(blockPixels);
                delete blockPixels;
            }
            delete startXPixel;

            //Loop over all frames.
            var timeData = [];
            for(var currentFrame = 0 ; currentFrame < numberOfFrames ; currentFrame++) {

                var totalBlockRainingIntensity = 0;
                var blockPixels = framedPixels[currentFrame];

                //Loop over all the pixels in the block and find out the highest rain intensity.
                for(var i = 0 ; i < blockPixels.length ; i++) {
                    //Bring over the intensity only if it is higher than what was already found before.
                    if(blockPixels[i] > totalBlockRainingIntensity) {
                        totalBlockRainingIntensity = blockPixels[i];
                    }
                }
                timeData.push(totalBlockRainingIntensity);
                delete blockPixels;
            }

            blockData.push({x: currentXBlock, y: currentYBlock, data: timeData});
            delete timeData;
        }
    }

    /*
    //TODO: USE FOR TESTING - SPECIFIC BLOCK!
    var currentXBlock = 52;
    var currentYBlock = 60;
    var blockData = [];
    //Loop over the current block its pixels.
    var startXPixel = (currentXBlock * xBlockWidth) + (currentYBlock * yBlockHeight * pixelsPerRow);

    var blockPixels = [];
    for(var rowIndex = 0 ; rowIndex < yBlockHeight ; rowIndex++) {
        //Loop over the current block row.

        logger.DEBUG("New Row: " + rowIndex);
        for(var columnInRowIndex = 0 ; columnInRowIndex < xBlockWidth ; columnInRowIndex++) {
            logger.DEBUG("New Pixel: " + columnInRowIndex);

            //Offset for block height by adding a full row worth of pixels to the startXPixel+i
            //This gives us the same location but one row below the current.
            blockPixels.push(frameRainingData[0][(rowIndex * pixelsPerRow) + startXPixel + columnInRowIndex]);
        }
    }
    logger.DEBUG("Block pixels:" + blockPixels);
    delete startXPixel;

    var totalBlockRainingIntensity = 0;
    //Loop over all the pixels in the block and find out the highest rain intensity.
    for(var i = 0 ; i < blockPixels.length ; i++) {
        //Bring over the intensity only if it is higher than what was already found before.
        if(blockPixels[i] > totalBlockRainingIntensity) {
            totalBlockRainingIntensity = blockPixels[i];
            logger.DEBUG("I SEE RAIN....");
        }
    }
    delete blockPixels;
    blockData.push({x: currentXBlock, y: currentYBlock, data: totalBlockRainingIntensity});
    */

    return {frames: numberOfFrames, imageWidth: data.shape[1], imageHeight: data.shape[2], xBlocks: xBlocks, yBlocks: yBlocks, data:blockData};
}

/**
 * Gets the current weather from the buienradar service.
 *
 * @param x x-coordinate.
 * @param y y-coordinate.
 */
function currentWeather(x, y) {
    var loc = convertXYToBlock(x, y, true);
    for(var i = 0 ; i < currentRainMap.data.length ; i++) {
        var block = currentRainMap.data[i];
        if(block.x === loc.blockX && block.y === loc.blockY) {
            return formatBlockData(block, false);
        }
    }
}

/**
 * Gets the coming weather (2 hour prediction) from the buienradar service.
 *
 * @param x x-coordinate.
 * @param y y-coordinate.
 */
function comingWeather(x, y) {
    var loc = convertXYToBlock(x, y, false);
    for(var i = 0 ; i < predictRainMap.data.length ; i++) {
        var block = predictRainMap.data[i];
        if(block.x === loc.blockX && block.y === loc.blockY) {
            return formatBlockData(block, true);
        }
    }
}

/**
 * Formats the raw rain data in a more comprehensive way.
 *
 * @param block The raw data to format.
 * @param addToTime If true add time to "now", if false, subtract it.
 * @returns {{}}
 */
function formatBlockData(block, addToTime) {
    var formattedData = {};
    formattedData.x = block.x;
    formattedData.y = block.y;
    formattedData.data = [];

    var numberOfFrames = block.data.length;
    for(var currentFrame = 0 ; currentFrame < numberOfFrames ; currentFrame++) {
        if(addToTime) {
            formattedData.data.push({time: "+" + (currentFrame * 10), intensity: block.data[currentFrame]});
        } else {
            formattedData.data.push({time: "-" + (numberOfFrames * 5 - currentFrame * 5), intensity: block.data[currentFrame]});
        }
    }

    return formattedData
}

/**
 * For a given latitude and longitude calculate the xy coordinates on the buienradar images.
 *
 * @param lat Latitude in xx,xxxx format.
 * @param lon Longitude in xx,xxxx format.
 * @returns {{x: number, y: number}} x and y coordinates.
 */
function convertLatLonToXY(lat, lon) {
    var i = 1, r = 52.5, u = (7 - i) / 550, f = (r - 49.1) / 512, e = Math.round((lon - i) / u), o = Math.round((r - lat) / f);
    return {x: e -5, y: o - 5};
}

/**
 * For given coordinates on the image (x/y) return the block coordinates.
 *
 * @param x The pixel x-coordinate.
 * @param y The pixel y-coordinate.
 * @param currentConditions The data that contains the current conditions.
 * @returns {{blockX: number, blockY: number}}
 */
function convertXYToBlock(x, y, currentConditions) {
    var rainMap = null;
    if(currentConditions === true) {
        rainMap = currentRainMap;
    } else {
        rainMap = predictRainMap;
    }

    var blockWidth = rainMap.imageWidth / rainMap.xBlocks;
    var blockHeight = rainMap.imageHeight / rainMap.yBlocks;

    var blockX = Math.floor(x / blockWidth);
    var blockY = Math.floor(y / blockHeight);

    return {blockX: blockX, blockY: blockY};
}

/**
 * Determines if it is raining based on the pixel colors.
 * Will also determine the intensity. (range 0 -> no rain to 5 -> biblical flood)
 * @param R Red color component.
 * @param G Green color component.
 * @param B Blue color component.
 * @returns intensity: number Indication for the rain intensity.
 */
function isRaining(R, G, B) {
    var intensity = 0;

    if(R > 150 && G < 80 && B > 150) {
        intensity = 5;
    } else if(R > 130 && G < 30 && B < 30) {
        intensity = 4;
    } else if(R < 30 && G < 30 && ((B > 120 && B < 124) || (B > 120 && B > 139))) {
        intensity = 3;
    } else if(R > 70 && R < 120 && G > 70 && G < 140 && B > 200) {
        intensity = 2;
    } else if(R > 125 && G > 150 && B > 150) {
        intensity = 1;
    }

    return intensity;
}

//Function exports:
exports.geographicPrediction            = geographicPrediction;
exports.geographicPredictionForBlock    = geographicPredictionForBlock;
exports.convertImageToRainMap           = convertImageToRainMap;
exports.showRainMaps                    = showRainMaps;
exports.geographicConditionForecast     = geographicConditionForecast;

//Message handlers:
exports.geographicPredictionMessageHandler          = geographicPredictionMessageHandler;
exports.geographicPredictionForBlockMessageHandler  = geographicPredictionForBlockMessageHandler;
exports.showRainMapsMessageHandler                  = showRainMapsMessageHandler;