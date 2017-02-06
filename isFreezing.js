var Forecast = require('forecast');
var AWS = require('aws-sdk');
AWS.config.update({region: 'us-east-1'});
var sns = new AWS.SNS();

// Initialize
var forecast = new Forecast({
  service: 'darksky',
  key: '828081a4df46847dbbf4347085c6a35b',
  units: 'celcius',
  cache: true,      // Cache API requests
  ttl: {            // How long to cache requests. Uses syntax from moment.js: http://momentjs.com/docs/#/durations/creating/
    minutes: 27,
    seconds: 45
  }
});

function isFreezing(callback){
  forecast.get([ 33.95, -84.55], function(err, weather) {
	  if(err) return console.dir(err);
	  var weatherForTheDay = weather.daily.data[0];
    if(weatherForTheDay.temperatureMin <= 42)
      return callback(true);
    return callback(false);
  })
}

isFreezing(function(freezing){
  if(freezing){
    var params = {
      Message: 'It will be freezing today',
      PhoneNumber: '+16783821408',
      Subject: '<3'
    };
    sns.publish(params, function(err, data) {
      if (err) console.log(err, err.stack); // an error occurred
      else     console.log(data);           // successful response
    });
  }
})
