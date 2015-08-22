var Worker = function() {
    var logger          = require("../logging/logger").makeLogger("WORKERFACTORY--");
    var cluster         = require("cluster");

    //Required imports for message handling.
    var buienradar      = require("../services/weather/buienradar/buienradar");
    var blitzortung     = require("../services/weather/blitzortung/blitzortung");
    var openweathermap  = require("../services/weather/openweathermap/openweathermap");

    createWorker();

    /*-------------------------------------------------------------------------------------------------
     * ------------------------------------------------------------------------------------------------
     *                                        Private functions
     * ------------------------------------------------------------------------------------------------
     ------------------------------------------------------------------------------------------------*/
    /**
     * Creates a new specific worker.
     * This Worker class acts as a wrapper for the details worker types (data broker/interval worker/HTTP worker)
     */
    function createWorker() {
        //Imports.
        var Server          = require("../workers/httpworker/server.js");
        var DataBroker      = require("../workers/databroker/dataBroker");
        var intervalWorker  = require("../workers/intervalworker/intervalworker");

        //If the process environment contains a name/value pair of name and it equals interval, start a new interval worker.
        //Otherwise start a normal server instance.
        switch (process.env["name"]) {
            case "broker":
                new DataBroker();
                blitzortung.setupLightningCache();
                openweathermap.setupWeatherCache();
                break;
            case "interval":
                intervalWorker.startWorker();
                break;
            case "http":
                cluster.worker.on("message", onMessageFromMasterReceived);
                new Server();
                break;
            default:
                logger.ERROR("Unkown worker type, cannot create a worker of type: " + process.env['name']);
                return;
        }

        logger.INFO("Worker with id: " + cluster.worker.id + " created.");
    }

    /**
     * Handler for messages received from the master instance.
     *
     * @param msg The message the master instance forwarded to this instance. Must be router to the handler object and function.
     */
    function onMessageFromMasterReceived(msg) {
        logger.DEBUG("Received message from master: routing to: " + msg.handler + "." + msg.handlerFunction + "MessageHandler(\"\")");
        eval(msg.handler)[msg.handlerFunction](msg);
    }
};

module.exports = Worker;