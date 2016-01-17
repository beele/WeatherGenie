var Noodweer = function () {
    var logger          = require("../../../logging/logger").makeLogger("IMPL-NOODWEER--");
    var http            = require("http");
    var messageFactory  = require("../../../util/messagefactory").getInstance();
    var callbackManager = require("../../../util/callbackmanager").getInstance();
    var brokerconstants = require("../../../workers/databroker/databrokerconstants").getInstance();

    /*-------------------------------------------------------------------------------------------------
     * ------------------------------------------------------------------------------------------------
     *                                        Public functions
     * ------------------------------------------------------------------------------------------------
     ------------------------------------------------------------------------------------------------*/

    /*-------------------------------------------------------------------------------------------------
     * ------------------------------------------------------------------------------------------------
     *                                        Private functions
     * ------------------------------------------------------------------------------------------------
     ------------------------------------------------------------------------------------------------*/
    /**
     * Retrieves the location id for the given city.
     * Will call the callback with null as data if no location id can be found or an error occurred.
     *
     * @param city The city for which the location id should be found.
     * @param callback The callback function to execute when done.
     */
    function retrieveLocationIdForCity(city, callback) {
        var options = {
            host: 'http://euweather.eu',
            port: '80',
            path: '/backend/misc/yrdb.php?maxRows=20&term=' + encodeURI(city) + '&country=BE',
            method: 'GET'
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
                    //logger.DEBUG(data);

                    //TODO: Process data!
                }
            });
        }).end();
    }

};

module.exports = Noodweer;