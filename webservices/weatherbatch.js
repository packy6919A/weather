'use strict';

const axios = require('axios');
const console = require('console');
let fs = require("fs");
const csv = require('csv-parser');

const MongoClient = require('mongodb').MongoClient;
const MONGODB_URI =  'mongodb://192.168.1.185:27017/weather'; // or Atlas connection string

let  apiURL="https://samples.openweathermap.org/storage/history_bulk.json?appid=b1b15e88fa797225412429c1c50c122a1=metric"
let cachedDb = null;
let csvData = [];

function parseCSV(fileName){
  fs.createReadStream(fileName)
    .pipe(csv())
    .on('data', (row) => {
      csvData.push(row);
      console.log(row);
    })
    .on('end', () => {
      console.log('File CSV file processato con successo');
      console.log('Scrittura file JSON sul Database');

      writeDatabase()

    });
}
function callWeatherAPI(){
  axios(
      apiURL
  )
  .then(function (response) {
      console.log(response.data)
      parseJson(response.data)
      //res.send(JSON.stringify(response.data));
  })
  .catch(function (error) {
      console.log(error);
  });
}

function readJsonFile(){
  // Prendi il contento dal file
   let contents = fs.readFileSync("data.json");
  // Definizione nel formato JSON
   return Promise.resolve(parseJson(JSON.parse(contents)));
}
function parseJson(resultArr){
  let weatherArr=[]
  resultArr.forEach(function(weatherData){
    csvData.forEach(function(csv){

   if(csv.cityId===weatherData.city_id) {
      let newWeatherData={
        "city_id":weatherData.city_id,
        "temp":weatherData.main.temp,
        "pressure":weatherData.main.pressure,
        "humidity":weatherData.main.humidity,
        "wind":weatherData.wind.speed,
        "clouds":weatherData.clouds.all,
        "data_time":weatherData.dt,
        "data_time_iso":weatherData.dt_iso,
        "lat":csv.lat,
        "long":csv.long,
        "city_name":csv.cityName,
        "weather-main":weatherData.weather[0].main,
	    "weather-descr":weatherData.weather[0].description,
	    "weather-icon":weatherData.weather[0].icon
      }
      weatherArr.push(newWeatherData)
      console.log(newWeatherData)
    }
  })
  })
  return weatherArr;
}

function connectToDatabase (uri) {
    console.log('=> connessione al database');

    if (cachedDb) {
        console.log('=> utilizzo di una istanza cached del database');
        return Promise.resolve(cachedDb);
    }

    return MongoClient.connect(uri, {useUnifiedTopology: true})
        .then(client => {
            cachedDb = client.db("prev_meteo");
            return cachedDb;
        });
}

function main() {
  console.log("Connecting to MongoDB")
  connectToDatabase(process.env.MONGODB_URI)
       .then(db => writeDatabase(db))
       .then(result => {
           console.log('=> restituzione risultati: ', result);
       })
       .catch(err => {
           console.log('=> si è verificato un errore: ', err);
       });

}

function writeDatabase () {
    console.log('=> scrittura database');

    readJsonFile()
    .then(json => {
       connectToDatabase(MONGODB_URI)
       .then(db => {
          console.log(json)
          json.forEach(function(item){
            db.collection('meteo_giorn').insertOne(item, function(err, res) {
            if (err) throw err;
            })
          })
          console.log("Finito")
        })
        .catch(err => {
            console.log('=> si è verificato un errore: ', err);
        });
    })
}

console.log('Applicazione Avviata');
parseCSV("data.csv")
