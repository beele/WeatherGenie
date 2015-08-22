var GifProcessor = function() {
    var logger = require("../logging/logger").makeLogger("UTIL-GIFPROC---");
    var async = require("async");
    var pixels = require("get-pixels");

    //Private variables.
    var currentImageData = null;
    var predictImageData = null;

    /*-------------------------------------------------------------------------------------------------
     * ------------------------------------------------------------------------------------------------
     *                                        Public functions
     * ------------------------------------------------------------------------------------------------
     ------------------------------------------------------------------------------------------------*/
    /**
     * Retrieves and updates the buienradar images (both current and prediction).
     *
     * @param callback Callback function, executed when the images have been loaded an processed.
     */
     this.retrieveAndCorrectImages = function(callback) {
        var imageLoader = async.seq(getCurrentWeatherImage, getPredictiveWeatherImage);
        imageLoader(function(err) {
            logger.DEBUG("Images updated!");

            callback(currentImageData, predictImageData);
        });
    };

    /*-------------------------------------------------------------------------------------------------
     * ------------------------------------------------------------------------------------------------
     *                                        Private functions
     * ------------------------------------------------------------------------------------------------
     ------------------------------------------------------------------------------------------------*/
    /**
     * Retrieves and corrects the current weather image.
     *
     * @param callback async callback function.
     */
    function getCurrentWeatherImage(callback) {
        pixels("http://www.buienradar.be/image", function (error, data) {
            if(error) {
                logger.ERROR(error);
                return;
            }
            currentImageData = correctGifFrames(data);
            callback(null);
        });
    }

    /**
     * Retrieves and corrects the predictive weather image.
     *
     * @param callback async callback function.
     */
    function getPredictiveWeatherImage(callback) {
        pixels("http://www.buienradar.be/image?type=forecast&fn=buienradarbe-1x1-ani550x512.gif", function (error, data) {
            if(error) {
                logger.ERROR(error);
                return;
            }
            predictImageData = correctGifFrames(data);
            callback(null);
        });
    }

    /**
     * The gif format from the buienradar only has its first frame complete.
     * All other frames show the pixels that have changed as a delta with the previous frame.
     * This can be quite annoying, this function will generate complete frames.
     *
     * @param data The data received from the get-pixels lib.
     * @returns {*} The adjusted data.
     */
    function correctGifFrames(data) {
        var numOfFrames     = data.shape[0];
        var width           = data.shape[1];
        var height          = data.shape[2];
        var bitsPerPixel    = data.shape[3];
        var bitsPerFrame    = width * height * bitsPerPixel;

        for(var i = 0 ; i < numOfFrames ; i++) {
            var startIndex  = bitsPerFrame * i;
            var endIndex    = (bitsPerFrame * i) + bitsPerFrame;

            if(i > 0) {
                for(var j = 0 ; j < endIndex ; j+=4) {
                    var nR = data.data[startIndex + j];
                    var nG = data.data[startIndex + j + 1];
                    var nB = data.data[startIndex + j + 2];
                    var nA = data.data[startIndex + j + 3];

                    if(nR + nG + nB + nA === 0) {
                        //Pixel not changed! bring over previous value
                        data.data[startIndex + j]       = data.data[startIndex - bitsPerFrame + j];
                        data.data[startIndex + j + 1]   = data.data[startIndex - bitsPerFrame + j + 1];
                        data.data[startIndex + j + 2]   = data.data[startIndex - bitsPerFrame + j + 2];
                        data.data[startIndex + j + 3]   = data.data[startIndex - bitsPerFrame + j + 3];
                    } else {
                        //Pixel changed in newer frame!
                    }
                }
            }
        }

        return data;
    }
};

module.exports = GifProcessor;