var Worker = function() {
    var logger          = require("../logging/logger").makeLogger("WORKERFACTORY--");
    var cluster         = require("cluster");

    //Create the worker upon instantiation.
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
        //If the process environment contains a name/value pair of name and it equals interval, start a new interval worker.
        //Otherwise start a normal server instance.
        switch (process.env["name"]) {
            case "broker":
                var Broker = require("../workers/databroker/databroker");
                new Broker().setupDefaultCaches();
                break;
            case "interval":
                var IntervalWorker = require("../workers/intervalworker/intervalworker");
                new IntervalWorker();
                break;
            case "http":
                cluster.worker.on("message", workerDependencyContainer().onMessageFromMasterReceived);
                var Server = require("../workers/httpworker/server");
                new Server();
                break;
            default:
                logger.ERROR("Unknown worker type, cannot create a worker of type: " + process.env['name']);
                return;
        }

        logger.INFO("Worker (" + process.env["name"] + ") with id: " + cluster.worker.id + " created.");
    }

    /**
     * This function serves as a container for the dependencies the http workers need to execute logic when they receive a message from the master.
     * @returns {{onMessageFromMasterReceived: onMessageFromMasterReceived}}
     */
    function workerDependencyContainer() {
        var buienradar      = new (require("../services/weather/buienradar/buienradar"))();
        var blitzortung     = new (require("../services/weather/blitzortung/blitzortung"))();
        var openweathermap  = new (require("../services/weather/openweathermap/openweathermap"))();

        return {
            /**
             * Handler for http workers when they receive a message from the master instance.
             * The eval evaluates the orignating "service" and function and calls it with the message as parameter.
             *
             * @param msg The message the master instance forwarded to this instance. Must be router to the handler object and function.
             */
            onMessageFromMasterReceived: function (msg) {
                logger.DEBUG("Received message from master: routing to: " + msg.handler + "." + msg.handlerFunction + "MessageHandler(\"\")");
                eval(msg.handler)[msg.handlerFunction](msg);
            }
        };
    }
};

module.exports = Worker;