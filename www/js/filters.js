angular.module('weatherGenieApp.filters', [])
    .filter('optionalDistance', function() {
        return function(input) {

            if(input === "-") {
                return "None";
            } else {
                return "At " + Math.round(input) + " km";
            }
        };
    });