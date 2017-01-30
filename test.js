var Forecast = require('forecast');
 var moment = require('moment');

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

function getRainChance(day, callback){
	forecast.get([ 33.95, -84.55], function(err, weather) {
	  if(err) return console.dir(err);
	  var weatherForTheDay;
	  for(var i = 0; i< weather.daily.data.length; i++){
		  if(moment(weather.daily.data[i].time * 1000).day() == day){
			  weatherForTheDay = weather.daily.data[i];
		      console.log(weatherForTheDay);
			  console.log(weatherForTheDay.precipProbability);
		  }
	  }
	  return weatherForTheDay.precipProbability;
	  
	});
}

console.log(getRainChance(6));