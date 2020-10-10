

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.common.serialization.Serdes;
import org.apache.kafka.streams.KafkaStreams;
import org.apache.kafka.streams.StreamsBuilder;
import org.apache.kafka.streams.StreamsConfig;
import org.apache.kafka.streams.kstream.Consumed;
import org.apache.kafka.streams.kstream.KStream;

import java.util.Properties;

public class MLStreamer {

    static final String SOURCE_TOPIC = "sensor-data";

    public static void main(final String[] args) {
        final String bootstrapServers = "localhost:9092";
        final KafkaStreams streams = buildStream(bootstrapServers);

        streams.start();

        Runtime.getRuntime().addShutdownHook(new Thread(streams::close));
    }

    static KafkaStreams buildStream(final String bootstrapServers) {
        final Properties streamsConfiguration = new Properties();

        streamsConfiguration.put(StreamsConfig.APPLICATION_ID_CONFIG, "sensor-data-config");
        streamsConfiguration.put(StreamsConfig.CLIENT_ID_CONFIG, "sensor-data");
        streamsConfiguration.put(StreamsConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        streamsConfiguration.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");
        streamsConfiguration.put(StreamsConfig.COMMIT_INTERVAL_MS_CONFIG, 100 * 1000);

        final ObjectMapper objectMapper = new ObjectMapper();

        final StreamsBuilder builder = new StreamsBuilder();

        // read the source stream
        final KStream<String, String> stream = builder.stream(SOURCE_TOPIC,
                Consumed.with(Serdes.String(), Serdes.String()));
        stream.foreach((k,v) -> {
            SensorData sensorData = null;
            try {
                sensorData = objectMapper.readValue(v, SensorData.class);
                System.out.println(sensorData);

            } catch (JsonProcessingException e) {
                e.printStackTrace();
            }
        });

        return new KafkaStreams(builder.build(), streamsConfiguration);
    }

}
