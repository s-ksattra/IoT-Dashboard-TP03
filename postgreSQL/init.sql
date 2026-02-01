-- Create the mqtt_messages table
CREATE TABLE IF NOT EXISTS mqtt_messages (
    id SERIAL PRIMARY KEY,
    topic VARCHAR(255),
    payload_raw TEXT,
    payload_json JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create an index for faster queries
CREATE INDEX IF NOT EXISTS idx_topic ON mqtt_messages(topic);
CREATE INDEX IF NOT EXISTS idx_created_at ON mqtt_messages(created_at);