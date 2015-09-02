//Init charts.
Chart.defaults.global.scaleOverride = true;
Chart.defaults.global.scaleSteps = 5;
Chart.defaults.global.scaleStepWidth = 1;
Chart.defaults.global.scaleStartValue = 0;
Chart.defaults.global.showTooltips = false;
Chart.defaults.global.scaleLineColor = "rgba(255,255,255,.7)";
Chart.defaults.global.scaleFontColor = "rgba(255,255,255,.7)";

/*-------------------------------------------------------------------------------------------------
 * ------------------------------------------------------------------------------------------------
 *                                           Controllers.
 * ------------------------------------------------------------------------------------------------
 ------------------------------------------------------------------------------------------------*/
angular.module('weatherGenieApp.controllers', [])
    .controller('weatherController', function ($scope, weatherAPIService) {

        //Loop through all the backgrounds. This will be stopped when a search has been done.
        var bgInterval = setInterval(toggleBackground, 10000);

        /**
         * Perform the initial search, from the welcome screen.
         * This will perform an animation into the full website.
         * This calls the search() function to do the actual search.
         */
        $scope.initialSearch = function () {
            //TODO: Do this with angular animation!
            //Perform some animations to go away from the initial screen.
            $("#initialSearch").animate({bottom: 2000, opacity: 0, height: 50}, 1500, "swing", function complete() {
                $(this).toggleClass("hidden");
            });

            var item = $("#headerWrapper");
            item.toggleClass("hidden");
            item.fadeTo(2500, 1);
            item = $("#content");
            item.toggleClass("hidden");
            item.fadeTo(2500, 1);
            item = $("#footer");
            item.toggleClass("hidden");
            item.fadeTo(2500, 1);

            //Perform the actual search!
            $scope.search();
        };

        /**
         * Performs the actual search.
         * Performs the following actions:
         * - Hide the soft keyboard on mobile devices.
         * - Block the UI to prevent unwanted user interaction.
         * - Reload the external buienradar/blitzortung images.
         * - Call the rest api via the injected weatherAPIService.
         * --> weatherAPIService.getCityInformation(...);
         * --> weatherAPIService.retrieveRainInformation(...);
         * --> weatherAPIService.retrieveLightningInformation(...);
         * - When all the calls to the service have returned the background will be determined and the UI will be unblocked.
         * - After each individual call returns, some data will be put on the scope. If an error occurs that will be displayed!
         */
        $scope.search = function () {
            hideSoftKeyboard();
            blockUI();
            reloadExternalImages();

            //Start with the city weather information.
            weatherAPIService.getCityInformation($scope.city, function(weatherData) {

                //If there are no errors, continue and show data.
                if(weatherData.error === null) {
                    //Clear background interval!
                    if (bgInterval !== null) {
                        clearInterval(bgInterval);
                        bgInterval = null;
                    }
                    //Start animations.
                    calculateAndAnimsateSunPosition(weatherData);
                    calculateAndAnimateWindDirectionPosition(weatherData);
                    calculateAndAnimateWindSpeed(weatherData);
                    $scope.weatherData = weatherData;
                } else {
                    blockUIWithDismissableError(weatherData.error);
                    $scope.weatherData = null;
                    return;
                }

                //Next collect the rain information.
                weatherAPIService.retrieveRainInformation(weatherData.latitude, weatherData.longitude, function(rainData) {

                    //If there are no errors, continue and show data.
                    if(rainData.error === null) {
                        $scope.rainData = rainData;

                        //Charting!
                        var ctxCurrent = document.getElementById("currentCanvas").getContext("2d");
                        var ctxPredict = document.getElementById("predictCanvas").getContext("2d");
                        var lineChartCurrent = new Chart(ctxCurrent).Line(createChartData(rainData.originalData, true), {bezierCurve: false});
                        var lineChartPredict = new Chart(ctxPredict).Line(createChartData(rainData.originalData, false), {bezierCurve: false});

                    } else {
                        blockUIWithDismissableError(rainData.error);
                        $scope.rainData = null;
                        return;
                    }

                    //Finally collect lightning information.
                    weatherAPIService.retrieveLightningInformation(weatherData.latitude, weatherData.longitude, function(lightningData) {

                        //If there are no errors, continue and show data.
                        if(lightningData.error === null) {
                            $scope.lightningData = lightningData;
                        } else {
                            blockUIWithDismissableError(lightningData.error);
                            $scope.lightningData = null;
                            return;
                        }

                        //Show the most appropriate background image.
                        determineBackgroundImage(weatherData, rainData, lightningData);
                        //All data retrieved!
                        unblockUI();
                    });
                });
            });
        };
    });