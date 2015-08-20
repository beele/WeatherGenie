var logger = require("../logging/logger").makeLogger("CALLBACKMANAGER");

var CallbackManager = (function() {
    var instance;

    /**
     * Private constructor which creates the actual CallbackManager instance.
     *
     * @returns {{generateIdForCallback: Function, returnCallbackForId: Function, returnAndRemoveCallbackForId: Function}}
     */
    function init() {
        //Private vars & functions.
        var callbacks = {};

        /**
         * Private function that can print out the stored callbacks.
         */
        function listCallbacks(){
            logger.DEBUG(JSON.stringify(callbacks, 0, 4));
        }

        //Public vars & functions.
        return {
            /**
             *
             * @param callback
             */
            generateIdForCallback : function(callback) {
                var id = new Date().getTime() + "--" + (Math.random() * 6);
                callbacks[id] = callback;
            },
            /**
             *
             * @param id
             * @returns {*}
             */
            returnCallbackForId : function(id) {
                return callbacks[msg.originalParams.callbackId](msg.value);
            },
            /**
             *
             * @param id
             * @returns {*}
             */
            returnAndRemoveCallbackForId: function(id) {
                var clbk = callbacks[msg.originalParams.callbackId](msg.value);
                delete callbacks[msg.originalParams.callbackId];
                return clbk;
            }
        };
    }

    return {
        /**
         * Returns the singleton instance.
         * @returns {*}
         */
        getInstance: function () {
            if (!instance) {
                instance = init();
            }
            return instance;
        }
    };
})();

module.exports = CallbackManager;