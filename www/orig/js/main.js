/**General application startup.**/
//Get the user's GEOlocation.
determineGeoLocation();
//Loop through all the backgrounds. This will be stopped when a search has been done.
bgInterval = setInterval(toggleBackground, 10000);

//Start angularJS.
var app = angular.module('weatherGenie', []);

app.run(function($rootScope) {

});

app.controller('weatherController', function($scope, $http) {
    $scope.getCityInformation = function() {
        console.log("Submitted: " + $scope.city);
        blockUI();

        $http({method: 'GET', url: '../weather/' + $scope.city}).
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
                unblockUI();
        }).
        error(function(data, status, headers, config) {
            unblockWithError(status);
        });
    };
});