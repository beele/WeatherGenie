function makeLogger(applicationPart) {
    function log(type, message) {
        console.log(applicationPart + " \t [" + type + "] \t==> " + message);
    }
    function error(type, message) {
        console.error(applicationPart + " \t [" + type + "] \t==> " + message);
    }
    return {
        INIT : function(message) {
            log("INIT", message);
        },
        INFO : function(message) {
            log("INFO", message);
        },
        DEBUG : function(message) {
            log("DEBUG", message);
        },
        ERROR : function(message) {
            error("ERROR", message);
        }
    };
}

exports.makeLogger = makeLogger;