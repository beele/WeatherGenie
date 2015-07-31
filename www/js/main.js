//Init charts:
Chart.defaults.global.scaleOverride = true;
Chart.defaults.global.scaleSteps = 5;
Chart.defaults.global.scaleStepWidth = 1;
Chart.defaults.global.scaleStartValue = 0;
Chart.defaults.global.showTooltips = false;
Chart.defaults.global.scaleLineColor = "rgba(255,255,255,.7)";
Chart.defaults.global.scaleFontColor = "rgba(255,255,255,.7)";

//Start angularJS.
var app = angular.module('weatherGenie', []);
var bgInterval;

app.run(function($rootScope) {
    //Get the user's GEOlocation.
    determineGeoLocation();
    //Loop through all the backgrounds. This will be stopped when a search has been done.
    bgInterval = setInterval(toggleBackground, 10000);
});

app.controller('weatherController', function($scope, $http) {
    $scope.getCityInformation = function() {
        console.log("Submitted: " + $scope.city);
        blockUI();

        $http({method: 'GET', url: 'weather/' + $scope.city}).
            success(function(data, status, headers, config) {
                //Check for errors from the backend (City not found,...).
                if(data.error !== null) {
                    $scope.weatherData = null;
                    unblockWithError(data.error);
                    return;
                }

                //Process data.
                data.sunriseString = unixTimeToTimeString(data.sunrise);
                data.sunsetString = unixTimeToTimeString(data.sunset);

                if(bgInterval !== null) {
                    clearInterval(bgInterval);
                    bgInterval = null;
                }

                determineBackgroundImage(data);
                calculateAndAnimsateSunPosition(data);
                calculateAndAnimateWindDirectionPosition(data);
                calculateAndAnimateWindSpeed(data);

                $scope.weatherData = data;
                var lat = (data.latitude + "").replace(".", ",");
                var lon = (data.longitude + "").replace(".", ",");
                $scope.retrieveRainInformation(lat, lon);
                $scope.retrieveLightningInformation(lat, lon);
                unblockUI();
            }).
            error(function(data, status, headers, config) {
                unblockWithError(status);
            });
    };

    $scope.retrieveRainInformation = function(lat, lon) {
        $http({method: 'GET', url: 'weather/rain/' + lat + "&" + lon}).
            success(function(data, status, headers, config) {
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
                    isRainingNow : currentRain !== 0,
                    intensity : currentRain
                };
            }).
            error(function(data, status, headers, config) {
                console.log(status);
            });
    };

    $scope.retrieveLightningInformation = function(lat, lon) {
        $http({method: 'GET', url: 'weather/lightning/' + lat + "&" + lon}).
            success(function(data, status, headers, config) {
                //Process lightning data and put in on the scope:

                var now = new Date();

                var strike = null;
                var closeCount = 0;
                var mediumCount = 0;
                var farCount = 0;
                for(var i = 0 ; i < data.data.length ; i++) {
                    var currentStrike = data.data[i];
                    var dt = new Date(currentStrike.timestamp/1000000);

                    //Do a stale data check on the strike, if too old discard!
                    //60 mins * 60 secs * 1000 millisecs.
                    if(dt.getTime() + 60 * 60 * 1000 < now.getTime()) {
                        continue;
                    }

                    if(strike === null) {
                        strike = currentStrike;
                    }

                    //Find the closest strike:
                    if(currentStrike.distance < strike.distance) {
                        strike = currentStrike;
                    }

                    //Count strikes depending on distance to the current lat/lon
                    if(currentStrike.distance <= 50) {
                        closeCount++;
                    } else if(currentStrike.distance <= 100) {
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
            }).
            error(function(data, status, headers, config) {
                console.log(status);
            });
    };
});