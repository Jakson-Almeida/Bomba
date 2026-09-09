// ===============================
// ESP32-S3 + L298N + G328
// Teste PWM do motor
// ===============================

const int freq = 5000;      // How fast the signal flashes (5000 Hz)
const int resolution = 8;  // 8-bit resolution (gives numbers from 0 to 255)

const int ENA = 3;
const int IN1 = 5;
const int IN2 = 6;

void setup() {

  Serial.begin(115200);
  delay(1000);

  // Configura os pinos
  pinMode(ENA, OUTPUT);
  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);

  // Habilita a ponte H
  digitalWrite(ENA, HIGH);

  // Configura PWM
  ledcAttach(IN1, freq, resolution);
  ledcAttach(IN2, freq, resolution);

  // Define o sentido de rotação
  digitalWrite(IN1, HIGH);
  digitalWrite(IN2, LOW);
  Serial.println("Motor ligado!");
  delay(3000);

  // Pausa
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, LOW);
  Serial.println("Motor ligado!");
  delay(3000);

  // PWM para IN1
}

void loop() {
  digitalWrite(IN2, LOW);
  // Fade light inside a loop
  for (int dutyCycle = 0; dutyCycle <= 255; dutyCycle++) {
    ledcWrite(IN1, dutyCycle); // Change the brightness
    delay(10);                    // The ESP32 waits 10 milliseconds before changing it again
  }

  for (int dutyCycle = 255; dutyCycle >= 0; dutyCycle--) {
    ledcWrite(IN1, dutyCycle); // Change the brightness
    delay(10); 
  }
  digitalWrite(IN1, LOW);
  for (int dutyCycle = 0; dutyCycle <= 255; dutyCycle++) {
    ledcWrite(IN2, dutyCycle); // Change the brightness
    delay(10);                    // The ESP32 waits 10 milliseconds before changing it again
  }

  for (int dutyCycle = 255; dutyCycle >= 0; dutyCycle--) {
    ledcWrite(IN2, dutyCycle); // Change the brightness
    delay(10); 
  }
}