/************************************************************
 ***         Main javascript file for application         ***
 ***********************************************************/

//Init charts:
Chart.defaults.global.scaleOverride = true;
Chart.defaults.global.scaleSteps = 5;
Chart.defaults.global.scaleStepWidth = 1;
Chart.defaults.global.scaleStartValue = 0;
Chart.defaults.global.showTooltips = false;
Chart.defaults.global.scaleLineColor = "rgba(255,255,255,.7)";
Chart.defaults.global.scaleFontColor = "rgba(255,255,255,.7)";

//Start angularJS.
var weatherGenie = angular.module('weatherGenie', [])

    //WeatherController definition.
    .controller('weatherController', function ($scope, $http, $animate) {

        //TODO: Split up the code below into separate controllers!
        
        //determineGeoLocation();
        //Loop through all the backgrounds. This will be stopped when a search has been done.
        $scope.bgInterval = setInterval(toggleBackground, 10000);

        $scope.initialSearch = function () {
            //TODO: Do this with angular animation!
            //Perform some animations to go away from the initial screen.
            $("#initialSearch").animate({bottom: 1500, opacity: 0, height: 50}, 1500, "swing", function complete() {
                $(this).toggleClass("hidden");
            });

            var item = $("#headerWrapper");
            item.toggleClass("hidden");
            item.fadeTo(2000, 1);
            item = $("#content");
            item.toggleClass("hidden");
            item.fadeTo(2000, 1);
            item = $("#footer");
            item.toggleClass("hidden");
            item.fadeTo(2000, 1);

            //Perform the actual search!
            $scope.search();
        };

        $scope.search = function () {
            hideSoftKeyboard();

            var clback = function onCityInformationRetrieved() {
                $scope.retrieveRainInformation($scope.weatherData.latitude, $scope.weatherData.longitude);
                $scope.retrieveLightningInformation($scope.weatherData.latitude, $scope.weatherData.longitude);
                unblockUI();
            };

            $scope.getCityInformation(clback);
        };

        $scope.getCityInformation = function (callback) {
            console.log("Submitted: " + $scope.city);
            blockUI();

            $http.get('weather/' + $scope.city).then(
                function onResponse(response) {
                    var data = response.data;

                    //Check for errors from the backend (City not found,...).
                    if (data.error !== null) {
                        $scope.weatherData = null;
                        blockUIWithDismissableError(data.error);
                        return;
                    }

                    //Process data.
                    data.latitude = (data.latitude + "").replace(".", ",");
                    data.longitude = (data.longitude + "").replace(".", ",");
                    data.sunriseString = unixTimeToTimeString(data.sunrise);
                    data.sunsetString = unixTimeToTimeString(data.sunset);

                    var interval = $scope.bgInterval;
                    if (interval !== null) {
                        clearInterval(interval);
                        interval = null;
                        $scope.bgInterval = null;
                    }

                    determineBackgroundImage(data);
                    calculateAndAnimsateSunPosition(data);
                    calculateAndAnimateWindDirectionPosition(data);
                    calculateAndAnimateWindSpeed(data);

                    $scope.weatherData = data;
                    callback();
                },
                function onError(response) {
                    blockUIWithDismissableError("An error occurred: " + response.statusCode);
                }
            );
        };

        $scope.retrieveRainInformation = function (lat, lon) {
            $http.get('weather/rain/' + lat + "&" + lon).then(
                function onResponse(response) {
                    var data = response.data;

                    //Charting!
                    var ctxCurrent = document.getElementById("currentCanvas").getContext("2d");
                    var ctxPredict = document.getElementById("predictCanvas").getContext("2d");
                    var lineChartCurrent = new Chart(ctxCurrent).Line(createChartData(data, true), {bezierCurve: false});
                    var lineChartPredict = new Chart(ctxPredict).Line(createChartData(data, false), {bezierCurve: false});

                    //Process rain data and put in on the scope:
                    var currentRain = data.currentConditions.data[data.currentConditions.data.length - 1];
                    switch (currentRain.intensity) {
                        case 0:
                            currentRain = 0;
                            break;
                        case 1:
                            currentRain = 1;
                            break;
                        case 2:
                            currentRain = 4;
                            break;
                        case 3:
                            currentRain = 7.5;
                            break;
                        case 4:
                            currentRain = 50;
                            break;
                        case 5:
                            currentRain = 100;
                            break;
                    }

                    $scope.rainData = {
                        isRainingNow: currentRain !== 0,
                        intensity: currentRain
                    };
                },
                function onError(response) {
                    blockUIWithDismissableError("An error occurred: " + response.statusCode);
                }
            );
        };

        $scope.retrieveLightningInformation = function (lat, lon) {
            $http.get('weather/lightning/' + lat + "&" + lon).then(
                function onResponse(response) {
                    var data = response.data;

                    //Process lightning data and put in on the scope:

                    //Only continue if we have any data to process!
                    if (data.ERROR !== undefined) {
                        return;
                    }

                    var now = new Date();

                    var strike = null;
                    var closeCount = 0;
                    var mediumCount = 0;
                    var farCount = 0;
                    for (var i = 0; i < data.data.length; i++) {
                        var currentStrike = data.data[i];
                        var dt = new Date(currentStrike.timestamp);

                        //Do a stale data check on the strike, if too old discard!
                        //60 mins * 60 secs * 1000 millisecs.
                        if (dt.getTime() + 60 * 60 * 1000 < now.getTime()) {
                            continue;
                        }

                        if (strike === null) {
                            strike = currentStrike;
                        }

                        //Find the closest strike:
                        if (currentStrike.distance < strike.distance) {
                            strike = currentStrike;
                        }

                        //Count strikes depending on distance to the current lat/lon
                        if (currentStrike.distance <= 50) {
                            closeCount++;
                        } else if (currentStrike.distance <= 100) {
                            mediumCount++;
                        } else {
                            farCount++;
                        }
                    }

                    $scope.lightningData = {
                        closestStrike: strike,
                        closeCount: closeCount,
                        mediumCount: mediumCount,
                        farCount: farCount
                    };
                },
                function onError(response) {
                    blockUIWithDismissableError("An error occurred: " + response.statusCode);
                }
            );
        };
    });