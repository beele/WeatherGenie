var cluster = require('cluster');
var cores = require('os').cpus().length;

var server = require("./server");
var requestHandlers = require("./services/requestHandlers");
var weather = require('./services/weather');
var intervalWorker  = require('./workers/intervalWorker');
var dataBroker = require('./workers/dataBroker');

var buienradar = require("./workers/buienradar/buienradar");
var blitzortung = require("./workers/blitzortung/blitzortung");
var openweathermap = require("./workers/openweathermap/openweathermap");

var logger = require("./logging/logger").makeLogger("INIT");

//Variables.
var handles = {};
var intWorker = null;
var broker = null;

//Kickstart everything!
start();

/**
 * Will start the core logic!
 */
function start(debug) {
    mapEndpoints();

    //The master creates the forks (and does nothing else, except passing messages between workers).
    //The workers will do their own init.
    if (cluster.isMaster) {
        forkInstances();
    } else {
        startWorkerInstance();
    }
}

function mapEndpoints() {
    /*
     * Set up any REST endpoints here!
     * Add a new line for each endpoint you want to handle.
     * To allow for params to be passed, end your endpoint with a /*
     * TODO: Allow for multiple params to be passes to make it really restful!
     */
    handles["/"]                    = requestHandlers.index;
    handles["/upload"]              = requestHandlers.upload;

    //Custom services
    handles["/weather"]             = weather.showWeatherCache;
    handles["/weather/*"]           = weather.retrieveWeather;
    handles["/weather/rain"]        = weather.showRainMaps;
    handles["/weather/rain/*"]      = weather.geographicPrediction;
    handles["/weather/rain/xy/*"]   = weather.geographicPredictionForBlock;

    handles["/weather/lightning"]   = weather.showLightingCache;
    handles["/weather/lightning/*"] = weather.lightningData;
    //handles['/tweet']           = twitter.tweet;
}

function forkInstances() {
    //Fork normal server worker instances.
    var numberOfHttpServants = cores - 2 > 0 ? cores - 2 : 1;
    for (var i = 0; i < numberOfHttpServants; i++) {
        logger.DEBUG("Starting new server worker...");

        var worker = cluster.fork({name: "http"});
        worker.on("message", onServerWorkerMessageReceived);
    }

    //Fork interval worker.
    logger.DEBUG("Starting new interval worker...");
    intWorker = cluster.fork({name: "interval"});
    intWorker.on("message", onIntervalWorkerMessageReceived);

    //Fork data broker.
    logger.DEBUG("Starting new data broker...");
    broker = cluster.fork({name: "broker"});
    broker.on("message", onDataBrokerMessageReceived);

    //Revive workers if they die!
    cluster.on('exit', function(worker, code, signal) {
        logger.DEBUG('worker ' + worker.id + ' died!');

        //CLEAR!
        if(worker.id === intWorker.id) {
            intWorker = cluster.fork({name: "interval"});
            intWorker.on("message", onIntervalWorkerMessageReceived);
        } else if(worker.id === broker.id) {
            broker = cluster.fork({name: "broker"});
            broker.on("message", onDataBrokerMessageReceived);
        } else {
            cluster.fork({name: "http"}).on("message", onServerWorkerMessageReceived)
        }
    });
}

function onServerWorkerMessageReceived(msg) {
    logger.DEBUG("Message received from server worker: " + msg);

    if(msg.target === "broker") {
        broker.send(msg);
    } else {
        intWorker.send(msg);
    }
}

function onIntervalWorkerMessageReceived(msg) {
    logger.DEBUG("Message received from interval worker: " + msg);

    if(msg.target === "broker") {
        broker.send(msg);
    } else {
        cluster.workers[msg.workerId].send({data: msg.data});
    }
}

function onDataBrokerMessageReceived(msg) {
    logger.DEBUG("Message received from data broker: " + msg);
    cluster.workers[msg.workerId].send(msg);
}

/*-------------------------------------------------------------------------------------------------
 * ------------------------------------------------------------------------------------------------
 *                              Worker startup & message handling
 * ------------------------------------------------------------------------------------------------
 ------------------------------------------------------------------------------------------------*/
function startWorkerInstance() {
    //If the process environment contains a name/value pair of name and it equals interval, start a new interval worker.
    //Otherwise start a normal server instance.
    if(process.env['name'] === "interval") {
        intervalWorker.startWorker();

    } else if(process.env['name'] === "broker") {
        dataBroker.initialise();

        //Create caches:
        blitzortung.setupLightningCache();
        openweathermap.setupWeatherCache();
    } else {
        //Add a listener on the worker for messages.
        cluster.worker.on("message", onMasterMessageReceived);
        startServerInstance(cluster.worker.id, handles);
    }
}

//Each message has an originFunc, use this to direct to the correct service.
function onMasterMessageReceived(msg) {
    logger.DEBUG("Received message from master: routing to: " + msg.handler + "." + msg.handlerFunction + "MessageHandler(\"\")");
    eval(msg.handler)[msg.handlerFunction](msg);

    //TODO: Error handling!
}

/**
 * Will start a new server instance.
 *
 * @param handles The array containing the endpoints for the server instance that will be started.
 */
function startServerInstance(id, handles) {
    //Start the server.
    server.start(id, handles);
}