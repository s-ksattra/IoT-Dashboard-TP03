const mqtt = require('mqtt');
const { Client } = require('pg');

// ----------------------------
// PostgreSQL setup
// ----------------------------
const db = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'iot_data',
    password: '12345678',
    port: 5432,
});

db.connect()
    .then(() => console.log("📦 Connected to PostgreSQL"))
    .catch(err => console.error("❌ PostgreSQL connection error:", err));


// ----------------------------
// MQTT setup
// ----------------------------
const brokerUrl = 'mqtt://localhost:1883';
const client = mqtt.connect(brokerUrl);

client.on('connect', () => {
    console.log('✅ Connected to MQTT broker');

    client.subscribe('#', (err) => {
        if (err) {
            console.error('❌ Subscribe error:', err);
        } else {
            console.log('📡 Subscribed to all topics (#)');
        }
    });
});

// When message arrives → store into DB
client.on('message', async (topic, message) => {

    const rawPayload = message.toString();     // text version
    let jsonPayload = {};                      // default empty JSON

    // Try to parse JSON
    try {
        jsonPayload = JSON.parse(rawPayload);
    } catch (e) {
        jsonPayload = {}; // keep empty if not valid JSON
    }

    console.log(`📩 [${topic}] ${rawPayload}`);

    try {
        await db.query(
            `INSERT INTO mqtt_messages (topic, payload_raw, payload_json, created_at)
             VALUES ($1, $2, $3, NOW() AT TIME ZONE 'Asia/Phnom_Penh')`,
            [topic, rawPayload, jsonPayload]
        );

        console.log("💾 Message saved to database");
    } catch (err) {
        console.error("❌ Database insert error:", err);
    }
});

client.on('error', (err) => {
    console.error('❌ MQTT error:', err);
});
