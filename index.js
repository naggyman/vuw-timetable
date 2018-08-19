const request = require('request'), cachedRequest = require('cached-request')(request), cacheDirectory = '/Users/morganfrenchstagg/Dev/vic-ical';
const express = require('express');
const ical = require('ical-generator');
const moment = require('moment-timezone');
const cache = require('apicache');
let app = express();

const PORT = process.env.PORT || 4000

app.use(cache.middleware('5 minutes'));

//cachedRequest.setCacheDirectory(cacheDirectory);
//17180gi
//http://localhost:4000/calendar?offering=968,17180

function getCalendarFromCourse(offering) {
    return new Promise((resolve, reject) => {
        cachedRequest({url:'https://www.victoria.ac.nz/_service/courses/2.1/offerings/'+ offering + '?year=2018'}, (error, resp, body) => {
            let events = [];
            let response = JSON.parse(body);
            response.data[0].timetable.items.forEach((item) => {
                let endDate = new moment(item.endAt).tz("Pacific/Auckland");
                for(let i = new moment(item.startAt).tz("Pacific/Auckland"); endDate.isSameOrAfter(i); i.add(1, 'week')){
                    for(let g = 0, len = item.days.length; g < len; g++){
                        let day = item.days[g];
                        let startTime = new moment(i)
                            .tz("Pacific/Auckland")
                            .day(day.dayOfWeek)
                            .hour((day.times[0].startTime).substring(0, 2)) // value of start time e.g 12:00
                            .minute((day.times[0].startTime).substring(3,5));
                        
                        let endTime = new moment(i)
                            .tz("Pacific/Auckland")
                            .day(day.dayOfWeek)
                            .hour((day.times[0].endTime).substring(0, 2))
                            .minute((day.times[0].endTime).substring(3,5));
        
                        events.push({
                            start: startTime,
                            end: endTime,
                            summary: (response.data[0].courseId).toUpperCase() + ' - Lecture',
                            description: '',
                            location: day.times[0].location.buildingName + ' ' + day.times[0].location.room
                        });
                    }
                }
            });
            resolve(events);
        });
    });
}



app.get('/ical', (req, res) => {
    let offerings = req.query.offerings.split(',');

    let promises = [];
    for(let i = 0, len = offerings.length; i < len; i++){
        promises.push(getCalendarFromCourse(offerings[i]));
    }

    Promise.all(promises).then((responses) => {
        let array = [].concat.apply([], responses);
        let cal = ical({domain: 'https://victoria.ac.nz', name: 'University Timetable'})
        cal.events(array);
        cal.serve(res);
    })
})

app.get('/calendar', (req, res) => {
    let offerings = req.query.offerings.split(',');

    let promises = [];
    for(let i = 0, len = offerings.length; i < len; i++){
        promises.push(getCalendarFromCourse(offerings[i]));
    }

    Promise.all(promises).then((responses) => {
        let array = [].concat.apply([], responses);
        res.send(array);
    })
})

app.get('/', (req, res) => {
    res.send("<h3>Timetables!</h3> </br> <p>An iCal link is avaliable at https://vuw-timetable.herokuapp.com/ical?offerings=1,2,3 - make sure to put the CRN number in of the courses that you are taking!</p> </br> <p>Built by <a href='https://morgan.french.net.nz'>Morgan French-Stagg</a></p>");
})

app.listen(PORT, () => {
    console.log('App is listening on port: ' + PORT);
})