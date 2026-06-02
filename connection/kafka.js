const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: process.env.KAFAK_CLIENTID || 'my-producer',
  brokers: [process.env.KAFKA_BROKER1 || 'localhost:9092'],
});

//await producer.disconnect();
//runProducer().catch(console.error);

module.exports = kafka;
