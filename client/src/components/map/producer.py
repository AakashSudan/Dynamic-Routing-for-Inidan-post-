from confluent_kafka import Producer
import json
import os

KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")

producer = Producer({'bootstrap.servers': KAFKA_BOOTSTRAP_SERVERS})

def delivery_report(err, msg):
    if err:
        print(f"Message delivery failed: {err}")
    else:
        print(f"Message delivered to {msg.topic()} [{msg.partition()}]")

def publish_event(topic, key, value):
    try:
        producer.produce(
            topic=topic,
            key=key,
            value=json.dumps(value),
            callback=delivery_report
        )
        producer.flush()
    except Exception as e:
        print(f"Kafka publish error: {e}")