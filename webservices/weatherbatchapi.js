'use strict';

/*npm install axios
npm install mongodb --save
*/
const axios = require('axios');
const console = require('console');
let fs = require("fs");
const csv = require('csv-parser');

const MongoClient = require('mongodb').MongoClient;
const MONGODB_URI =  'mongodb://localhost:27017/weather'; // or Atlas connection string

let  apiURL="https://api.openweathermap.org/data/2.5/weather?appid=5691543b2216b21d681a7494e17e0be3&units=metric"
let cachedDb = null;
let csvData = [];
let weatherArr=[]

function parseCSV(fileName){
  fs.createReadStream(fileName)
    .pipe(csv())
    .on('data', (row) => {
      csvData.push(row);
      console.log(row);
    })
    .on('end', () => {
      console.log('CSV file processato con successo!!');
      console.log('Scrittura del file JSON sul Database');

      callWeatherAPI()
    });
}
function callWeatherAPI(){
csvData.forEach(function(item){
  axios(
      apiURL+"&lat="+item.lat+"&lon="+item.long
  )
  .then(function (response) {
      console.log(response.data)
      parseJson(response.data,item)
      //res.send(JSON.stringify(response.data));
  })
  .catch(function (error) {
      console.log(error);
  });
})
}

function parseJson(weatherData,csv){
  console.log(weatherData)
    const milliseconds = weatherData.dt * 1000
    const dateObject = new Date(milliseconds)
    const dt_iso = dateObject.toLocaleString("en-US", {timeZoneName: "short"})
    let newWeatherData={
      "city_id":csv.cityId,
      "temp":weatherData.main.temp,
      "pressure":weatherData.main.pressure,
      "humidity":weatherData.main.humidity,
      "wind":weatherData.wind.speed,
      "clouds":weatherData.clouds.all,
      "data_time":weatherData.dt,
      "data_time_iso":dt_iso,
      "weather-main":weatherData.weather[0].main,
      "weather-descr":weatherData.weather[0].description,
      "weather-icon":weatherData.weather[0].icon,	    
      "lat":weatherData.coord.lat,
      "long":weatherData.coord.lon,
      "city_name":csv.cityName,

    }
    writeDatabase(newWeatherData)
	console.log(newWeatherData)

}

function connectToDatabase (uri) {
    console.log('=> connessione al database');

    return MongoClient.connect(uri)
        .then(client => {
           return client;
        });
}

function main() {
  console.log("Collegamento a MongoDB")
  connectToDatabase(MONGODB_URI)
       .then(db => writeDatabase(db))
       .then(result => {
           console.log('=> Invio risultati: ', result);
       }
       )
       .catch(err => {
            console.log('=> si è verificato un errore ', err);
       })
}

function writeDatabase (json) {
    console.log('=> scrittura sul database');

       connectToDatabase(MONGODB_URI)
       .then(client => {
          console.log(json)
            client.db("prev_meteo").collection('meteo_giorn').insertOne(json, function(err, res) {
            if (err) throw err;
            console.log("record scritto sul db")
	    })

	    client.close();
        })
        .catch(err => {
            console.log('=> si è verificato un errore: ', err);
        });
}

console.log('Applicazione Avviata');
parseCSV("/Users/pasqualelongobardi/workDir/weather/webservices/data.csv")
