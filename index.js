const request = require('request'), cachedRequest = require('cached-request')(request), cacheDirectory = '/Users/morganfrenchstagg/Dev/vic-ical';
const express = require('express');
const ical = require('ical-generator');
const moment = require('moment-timezone');
const cache = require('apicache');
let app = express();

const PORT = process.env.PORT || 4000
const errorMsg = "Unable to find that course, please ensure that you have entered in a valid CRN number";

app.use(cache.middleware('5 minutes'));

//cachedRequest.setCacheDirectory(cacheDirectory);
//17180gi
//http://localhost:4000/calendar?offering=968,17180

function getCalendarFromCourse(offering, year) {
    return new Promise((resolve, reject) => {
        cachedRequest({url:'https://www.victoria.ac.nz/_service/courses/2.1/offerings/'+ offering + '?year=' + year}, (error, resp, body) => { 
        let response = JSON.parse(body);
        if(error || (response.request_status && !response.request_status.success)){
            reject(error || response);
        }
        else{
            let events = [];
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
        }
        });
    });
}



app.get('/ical', (req, res) => {
    if(!req.query.offerings || !req.query.year) res.status(404).send(errorMsg);

    let offerings = req.query.offerings.split(',');
    let year = req.query.year;

    let promises = [];
    for(let i = 0, len = offerings.length; i < len; i++){
        promises.push(getCalendarFromCourse(offerings[i], year));
    }

    Promise.all(promises).then((responses) => {
        let array = [].concat.apply([], responses);
        let cal = ical({domain: 'https://victoria.ac.nz', name: 'University Timetable'})
        cal.events(array);
        cal.serve(res);
    }).catch((error) => {
        res.status(500).send(errorMsg);
    })
})

app.get('/calendar', (req, res) => {
    if(!req.query.offerings || !req.query.year) res.status(404).send(errorMsg);

    let offerings = req.query.offerings.split(',');
    let year = req.query.year;

    let promises = [];
    for(let i = 0, len = offerings.length; i < len; i++){
        promises.push(getCalendarFromCourse(offerings[i], year));
    }

    Promise.all(promises).then((responses) => {
        let array = [].concat.apply([], responses);
        res.send(array);
    }).catch((error) => {
        res.json({error: errorMsg});
    });
})

app.get('/', (req, res) => {
    res.send("<h3>Timetables!</h3> </br> <p>An iCal link is avaliable at https://vuw-timetable.herokuapp.com/ical?offerings=1,2,3&year=2018 - make sure to put the CRN number in of the courses that you are taking!</p> </br> <p>Built by <a href='https://morgan.french.net.nz'>Morgan French-Stagg</a></p>");
})

app.listen(PORT, () => {
    console.log('App is listening on port: ' + PORT);
})