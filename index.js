//todo:: error handling? what error handling? :)
//make more modular and clean up code
// check that we arent already doing something that day.

var fs = require('fs');
var readline = require('readline');
var google = require('googleapis');
var googleAuth = require('google-auth-library');
var moment = require('moment');
var Forecast = require('forecast');

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
		  }
	  }
	  return callback(weatherForTheDay.precipProbability);

	});
}

// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/calendar-nodejs-quickstart.json
var SCOPES = ['https://www.googleapis.com/auth/calendar'];
var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE) + '/.credentials/';
var TOKEN_PATH = TOKEN_DIR + 'calendar-nodejs-quickstart.json';

// Load client secrets from a local file.
fs.readFile('client_secret.json', function processClientSecrets(err, content) {
  if (err) {
    console.log('Error loading client secret file: ' + err);
    return;
  }
  // Authorize a client with the loaded credentials, then call the
  // Google Calendar API.
  authorize(JSON.parse(content), insertEvent);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  var clientSecret = credentials.installed.client_secret;
  var clientId = credentials.installed.client_id;
  var redirectUrl = credentials.installed.redirect_uris[0];
  var auth = new googleAuth();
  var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, function(err, token) {
    if (err) {
      getNewToken(oauth2Client, callback);
    } else {
      oauth2Client.credentials = JSON.parse(token);
      callback(oauth2Client);
    }
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(oauth2Client, callback) {
  var authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  });
  console.log('Authorize this app by visiting this url: ', authUrl);
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question('Enter the code from that page here: ', function(code) {
    rl.close();
    oauth2Client.getToken(code, function(err, token) {
      if (err) {
        console.log('Error while trying to retrieve access token', err);
        return;
      }
      oauth2Client.credentials = token;
      storeToken(token);
      callback(oauth2Client);
    });
  });
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
  try {
    fs.mkdirSync(TOKEN_DIR);
  } catch (err) {
    if (err.code != 'EEXIST') {
      throw err;
    }
  }
  fs.writeFile(TOKEN_PATH, JSON.stringify(token));
  console.log('Token stored to ' + TOKEN_PATH);
}

/**
 * Lists the next 10 events on the user's primary calendar.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function listEvents(auth, callback) {
  var calendar = google.calendar('v3');
  calendar.events.list({
    auth: auth,
    calendarId: 'primary',
    timeMin: (new Date()).toISOString(),
    maxResults: 10,
    singleEvents: true,
    orderBy: 'startTime'
  }, function(err, response) {
    if (err) {
      console.log('The API returned an error: ' + err);
      return;
    }
    var events = response.items;
    if (events.length == 0) {
      console.log('No upcoming events found.');
      return callback([]);
    } else {
      //get upcoming event days that fall into the next 7 days
      var eventDays = [];
      var today = moment();
      for (var i = 0; i < events.length; i++) {
        var event = events[i];
        var start = event.start.dateTime || event.start.date;
        if(!moment(start).isAfter(moment(today).add(7), 'day')){
          eventDays.push(moment(start).day());
        }
      }
      callback(eventDays);
    }
  });
}

//this should be run two days before the week starts, prefere ably at 6pm.
function getRandomDateNextWeek(callback){
	var today = moment();
	var start = moment(today).add(getRandomInt(0,8), 'day');
	var end = moment(start).add(1, 'hour');
	start = moment(start).format('YYYY-MM-DD HH:mm:ss').replace(' ', 'T');
	end = moment(end).format('YYYY-MM-DD HH:mm:ss').replace(' ', 'T');
	isWeekend = moment(start).day() == 6 || moment(start).day()== 0;
	return {
		end: end,
		start: start,
		isWeekend: isWeekend,
    day:moment(start).day()
	}
}

function checkWeather(events, day, callback){
	getRainChance(day, function(rainchance){
		if(rainchance < .4){
			return callback(events);
		} else {
			   var e = [];
  			 for(var i = 0; i<events.length; i++){
    				if(events[i].type == "inside"){
    					e.push(events[i]);
    				}
          };
    			return callback(e);
      }
		})
	}


function checkEventTypeMatchesDay(events, isWeekend){
	//we can do nonweekend events on the weekend.
	if(isWeekend){
		return events;
	}

	//we cant do weekend events during the week.
	var e = [];
	for(var i = 0; i< events.length; i++){
		if(!events[i].weekendEvent){
			e.push(events[i]);
		}
	}
	return e;
}

function getRandomEvent(auth, callback){
  listEvents(auth, function(currentEvents){
      var date = getRandomDateNextWeek();
      var badDate = true;
      var counter = 0;
      while(badDate){
        if(counter > 10){
          //I would rather us see something fun to do
          // than not.
          badDate = false;
        }
        if(currentEvents.includes(date.day)){
          date = getRandomDateNextWeek();
        } else {
          badDate = false;
        }
      }
    fs.readFile("./todo.json", function(err, arrayOfTodos) {
      if (err) {
        return console.log(error);
      } else {
        arrayOfTodos = JSON.parse(arrayOfTodos);
  	  checkWeather(arrayOfTodos, date.day, function(weatherSensitiveEvents) {
  	  curratedEvents = checkEventTypeMatchesDay(weatherSensitiveEvents, date.isWeekend);

        var event = {
          'summary': arrayOfTodos[getRandomInt(0, arrayOfTodos.length)].title,
          'location': '',
          'description': 'A chance to hear more about Google\'s developer products.',
          'start': {
            'dateTime': date.start,
            'timeZone': 'America/Los_Angeles',
          },
          'end': {
            'dateTime': date.end,//'2017-01-28T17:00:00-07:00',
            'timeZone': 'America/Los_Angeles',
          }
        };
        callback(event);
      })
  	}
    });
})

}

function insertEvent(auth){
  getRandomEvent(auth, function(event) {
	  var calendar = google.calendar('v3');
	  calendar.events.insert({
		auth: auth,
		calendarId: 'primary',
		resource: event,
	  }, function(err, event) {
		if (err) {
		  console.log('There was an error contacting the Calendar service: ' + err);
		  return;
		}
		console.log('Event created: %s', event.htmlLink);
	  });
  });
}

//helpers: aka ripped from stack overflow.
function getRandomInt(min=0, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}

function randomDate(start, end, startHour, endHour) {
  var date = new Date(+start + Math.random() * (end - start));
  var hour = startHour + Math.random() * (endHour - startHour) | 0;
  date.setHours(hour);
  return date;
}
