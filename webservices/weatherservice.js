const axios = require('axios');
const express = require('express');
const bodyParser = require('body-parser');
const https = require('https');

let fs = require("fs");
const csv = require('csv-parser');
const app = express();
const port = process.env.PORT || 8088;
let cors = require('cors');
const kafka = require('kafka-node');
const bp = require('body-parser');

const external_host=process.env.EXTERNAL_HOST;

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

app.use(cors());
const MongoClient = require('mongodb').MongoClient;
const MONGODB_URI =  'mongodb://'+external_host+':27017/'; // Utilizzo l'indirizzo IP fornito dal router invece di localhost

//let  apiURL="https://samples.openweathermap.org/storage/history_bulk.json?appid=b1b15e88fa797225412429c1c50c122a1"
let cachedDb = null;

app.use(bodyParser.json());

let csvData = [];

const Producer = kafka.Producer;
const client = new kafka.KafkaClient({kafkaHost: external_host+':9092'});
const producer = new Producer(client);
const kafka_topic = 'sensor-data';
console.log(kafka_topic);

function sendData(data){
    try {
        producer.on('ready', async function() {
            let push_status = producer.send(data, (err, data) => {
                if (err) {
                    console.log('[kafka-producer -> '+external_host+']: broker update failed');
                } else {
                    console.log('[kafka-producer -> '+external_host+']: broker update success');
                }
            });
        });

        producer.on('error', function(err) {
            console.log(err);
            console.log('[kafka-producer -> '+external_host+']: connection errored');
            throw err;
        });
    }
    catch(e) {
        console.log(e);
    }
}

function parseCSV(fileName){
    fs.createReadStream(fileName)
        .pipe(csv())
        .on('data', (row) => {
            csvData.push(row);
            console.log(row);
        })
        .on('end', () => {
            console.log('CSV file processato con successo!');

        });
}

function connectToDatabase (uri) {
    console.log('=> connessione al database');

    if (cachedDb) {
        console.log('=> usata istanza cached del database ');
        return Promise.resolve(cachedDb);
    }

    return MongoClient.connect(uri)
        .then(client => {
            cachedDb = client.db("prev_meteo");
            return cachedDb;
        });
}


function queryDatabase (db, cityId) {
    /* Vado a creare un'oggetto Date in JS che poi vado a covertire in formato UNIXTIME da utilizzare
    *  nella Query per estrarre tutte le previsioni metereologiche fatte per quella zona/citta di riferimento
    *  filtrando per il campo data_time sul database MONGODB
    * */
    // const dateObject = new Date();
    // const dt_iso = dateObject.toLocaleString("en-US", {timeZoneName: "short"});
    const dataunix = Date.parse((new Date()))/1000;

    console.log('=> SYSDATE ==> ', dataunix);

    console.log('=> query database:' + cityId);

    let query = {
        city_id: cityId,
        $and: [
            {
                data_time: {
                    $gte: dataunix
                }
            }
        ]
    };

    //  console.log("Query --> ", query);

    // da modificare inserendo come collection quella che include le previsioni

    return db.collection("meteo_giorn").find(query).toArray()
        .then(result => {
            return result ;
        })
        .catch(err => {
            console.log('=> si è verificato un errore: ', err);
            return { statusCode: 500, body: 'error' };
        });
}


app.get('/meteo', cors(), function(req, res) {
    let query = req.body;
    const row = csvData.find(it =>it.lat == query.lat && it.long == query.lon);

    console.log("Print query --> ", row);

    /* Verifico se le informazioni sono presenti nel file CSV. Se non ci sono, allora processo andando a leggere i dati dal sito
       di previsione metereologica api.openweathermap.org, altrimenti vado sulla base dati
     */

    if(row == null){
        const agent = new https.Agent({
            rejectUnauthorized: false
        });
        // Leggo i risultati delle previsioni per i prossimi 7 giorni
        axios(
            `https://api.openweathermap.org/data/2.5/onecall?lat=${query.lat}&lon=${query.lon}&lang=en&units=metric&appid=7d6a9bda42a8deb63907e657036c3492`
            , { httpsAgent: agent }
        )
            .then(function (response) {
                console.log('risposta è',response.data)
                sendData(response.data)
                res.send(response.data);
            })
            .catch(function (error) {
                console.log('errore è',error);
                res.status(500).send()

            });

    }
    else {
        connectToDatabase(MONGODB_URI)
            .then(db => queryDatabase(db, row.cityId))
            .then(result => {
                console.log('=> risultato restituito: ', result);
                res.send(result);

            })
            .catch(err => {
                console.log('=> si è verificato un errore: ', err);
            });
    }
})


app.route('/sensore').post(function (req, res) {

    console.log("Richiesta ricevuta:",req.body);

    res.status(200).send('{"status":"OK","message":"Dati Ricevuti"}');

});

console.log("Il web Service è in esecuzione:")
parseCSV("data.csv")

//let server = app.listen(port,()=>console.log(`Il server è stato avviato su http://localhost:8088`));
app.listen(port,()=>console.log(`Il server è stato avviato su http://192.168.1.185:8088`));
