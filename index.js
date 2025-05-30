import express from 'express';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mqtt from 'mqtt';
import cors from 'cors';

const app = express();
const port = 10000;

app.use(express.json());
app.use(cors());

// PostgreSQL connection
const pool = new Pool({
  connectionString: 'postgresql://farm_database_bv66_user:R7G48PsqUPHkht8oHoCT0Zf5BmeM1ACD@dpg-d0nftnpr0fns7390b120-a.oregon-postgres.render.com/farm_database_bv66',
  ssl: {
    rejectUnauthorized: false,
  },
});

// MQTT connection to HiveMQ Cloud (TLS)
const mqttClient = mqtt.connect('mqtts://b39bb499aeef4da1af6a013a6c7129de.s1.eu.hivemq.cloud:8883', {
  username: 'malek', // 🔁 Replace with your HiveMQ username
  password: 'Jriou123456789', // 🔁 Replace with your HiveMQ password
  rejectUnauthorized: false // For development only. Use proper certificates in production!
});

const mqttTopic = 'farm/esp32_01/sensors';

mqttClient.on('connect', () => {
  console.log('✅ Connected to HiveMQ Cloud via TLS');
  mqttClient.subscribe(mqttTopic, (err) => {
    if (!err) {
      console.log(`✅ Subscribed to topic: ${mqttTopic}`);
    } else {
      console.error('❌ MQTT subscription error:', err);
    }
  });
});

mqttClient.on('error', (err) => {
  console.error('❌ MQTT connection error:', err);
});

mqttClient.on('message', async (topic, message) => {
  try {
    const data = JSON.parse(message.toString());
    console.log('📥 MQTT received:', data);

    const { temperature, humidity, soil_moisture, light, water_level, counter } = data;

    await pool.query(
      'INSERT INTO sensor_data (temperature, humidity, soil_moisture, light, water_level, counter, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
      [temperature, humidity, soil_moisture, light, water_level, counter || 0]
    );

    console.log('✅ Sensor data saved to database');
  } catch (error) {
    console.error('❌ MQTT processing error:', error);
  }
});

// API routes
app.get('/', (req, res) => {
  res.send('🌿 Smart Farm API is online!');
});

app.get('/test', (req, res) => {
  res.json({ message: 'API is working!' });
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      'your_jwt_secret_key', // 🔁 Replace with a secure secret
      { expiresIn: '1h' }
    );

    res.status(200).json({ message: 'Login successful', token });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/sensors/latest', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM sensor_data ORDER BY created_at DESC LIMIT 1');
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No sensor data found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Error fetching latest sensor data:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
