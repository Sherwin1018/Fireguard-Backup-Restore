#include <SPI.h>
#include <LoRa.h>
#include <Wire.h>
#include <math.h>
#include <Adafruit_AHTX0.h>

// Pin Definitions
#define MQ2_PIN 34
#define MQ7_PIN 35
#define FLAME_PIN 32
#define ADC_AVG_SAMPLES 16

// ESP32 ADC / MQ calibration settings
const float ADC_MAX = 4095.0f;
const float ADC_VREF = 3.3f;
const float MQ_LOAD_RESISTANCE_KOHM = 10.0f;
const float MQ2_R0_KOHM = 9.83f;
const float MQ7_R0_KOHM = 18.92f;

// Curve-fit values for estimated ppm conversion.
// These are starting points only and should be tuned against your sensors.
const float MQ2_PPM_A = 574.25f;
const float MQ2_PPM_B = -2.222f;
const float MQ7_PPM_A = 99.042f;
const float MQ7_PPM_B = -1.518f;

// LoRa Pins
#define LORA_SCK 18
#define LORA_MISO 19
#define LORA_MOSI 23
#define LORA_SS 5
#define LORA_RST 14
#define LORA_DIO0 2

// Node configuration
const char* NODE_ID = "NODE1";
const unsigned long SEND_INTERVAL = 1000;

Adafruit_AHTX0 aht;
unsigned long lastSendTime = 0;

int readAveragedADC(uint8_t pin) {
  uint32_t total = 0;

  for (int i = 0; i < ADC_AVG_SAMPLES; i++) {
    total += analogRead(pin);
  }

  return total / ADC_AVG_SAMPLES;
}

float adcToVoltage(int rawAdc) {
  int clamped = constrain(rawAdc, 1, (int)ADC_MAX - 1);
  return (clamped / ADC_MAX) * ADC_VREF;
}

float mqResistanceKOhm(int rawAdc) {
  float sensorVoltage = adcToVoltage(rawAdc);
  return ((ADC_VREF - sensorVoltage) * MQ_LOAD_RESISTANCE_KOHM) / sensorVoltage;
}

float estimatePPM(int rawAdc, float r0KOhm, float curveA, float curveB) {
  float rs = mqResistanceKOhm(rawAdc);
  float ratio = rs / r0KOhm;
  float ppm = curveA * powf(ratio, curveB);

  if (isnan(ppm) || isinf(ppm) || ppm < 0) {
    return 0;
  }

  return ppm;
}

void setup() {
  Serial.begin(115200);
  while (!Serial);

  Wire.begin();
  pinMode(FLAME_PIN, INPUT_PULLUP);

  if (!aht.begin()) {
    Serial.println("AHT10 init failed.");
    while (1);
  }

  // LoRa setup
  SPI.begin(LORA_SCK, LORA_MISO, LORA_MOSI, LORA_SS);
  LoRa.setPins(LORA_SS, LORA_RST, LORA_DIO0);
  
  if (!LoRa.begin(433E6)) {
    Serial.println("LoRa init failed.");
    while (1);
  }
  
  // Faster LoRa profile for short update intervals with moderate range.
  LoRa.setSignalBandwidth(125E3);
  LoRa.setSpreadingFactor(9);
  LoRa.setCodingRate4(5);
  LoRa.setPreambleLength(8);
  LoRa.setSyncWord(0x12);
  LoRa.enableCrc();
  LoRa.setTxPower(20, PA_OUTPUT_PA_BOOST_PIN);
  
  Serial.println("Node 1 initialized");
}

void loop() {
  unsigned long currentTime = millis();
  
  if (currentTime - lastSendTime >= SEND_INTERVAL) {
    // Read sensors
    sensors_event_t humidityEvent;
    sensors_event_t tempEvent;
    float temperature = -1;
    float humidity = -1;
    int mq2Raw = readAveragedADC(MQ2_PIN);
    int mq7Raw = readAveragedADC(MQ7_PIN);
    float mq2Ppm = estimatePPM(mq2Raw, MQ2_R0_KOHM, MQ2_PPM_A, MQ2_PPM_B);
    float mq7Ppm = estimatePPM(mq7Raw, MQ7_R0_KOHM, MQ7_PPM_A, MQ7_PPM_B);
    int flame = !digitalRead(FLAME_PIN);

    aht.getEvent(&humidityEvent, &tempEvent);
    temperature = tempEvent.temperature;
    humidity = humidityEvent.relative_humidity;

    // Validate readings
    if (isnan(temperature) || isnan(humidity)) {
      Serial.println("AHT10 read error!");
      temperature = -1;
      humidity = -1;
    }

    // Prepare and send data
    String data = String(NODE_ID) + "," + 
                 String(temperature, 1) + "," + 
                 String(humidity, 1) + "," +
                 String(mq2Ppm, 2) + "," + 
                 String(mq7Ppm, 2) + "," + 
                 String(flame);

    // Non-blocking LoRa transmission
    if (LoRa.beginPacket()) {
      LoRa.print(data);
      LoRa.endPacket(); // Blocking send avoids retrying while the radio is still busy
      Serial.println("Sent: " + data);
    } else {
      Serial.println("LoRa send failed");
    }
    
    lastSendTime = currentTime;
  }
  
  // Handle other tasks if needed
}
