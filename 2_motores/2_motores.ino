// ===============================
// ESP32-S3 + L298N + G328
// PWM dos 2 motores
// ===============================

const int freq = 5000;      // How fast the signal flashes (5000 Hz)
const int resolution = 8;  // 8-bit resolution (gives numbers from 0 to 255)

struct Motor {
  int ENA;
  int IN1;
  int IN2;
};

// Motores
struct Motor M4;
struct Motor M5;

void setup() {

  Serial.begin(115200);
  delay(1000);

  M4.ENA=3;
  M4.IN1=6;
  M4.IN2=5;

  M5.ENA=8;
  M5.IN1=15;
  M5.IN2=16;

  // Configura os pinos
  pinMode(M4.ENA, OUTPUT);
  pinMode(M5.ENA, OUTPUT);
  pinMode(M4.IN1, OUTPUT);
  pinMode(M5.IN1, OUTPUT);
  pinMode(M4.IN2, OUTPUT);
  pinMode(M5.IN2, OUTPUT);

  // Habilita a ponte H
  digitalWrite(M4.ENA, HIGH);
  digitalWrite(M5.ENA, HIGH);

  // Configura PWM
  ledcAttach(M4.IN1, freq, resolution);
  ledcAttach(M4.IN2, freq, resolution);~
  ledcAttach(M5.IN1, freq, resolution);
  ledcAttach(M5.IN2, freq, resolution);

  // Define o sentido de rotação
  digitalWrite(M4.IN1, HIGH);
  digitalWrite(M5.IN1, HIGH);
  digitalWrite(M4.IN2, LOW);
  digitalWrite(M5.IN2, LOW);
  Serial.println("Motor ligado!");
  delay(3000);

  // PWM para motores
}

void loop() {
  digitalWrite(M4.IN2, LOW);
  digitalWrite(M5.IN2, LOW);
  // Fade light inside a loop
  for (int dutyCycle = 0; dutyCycle <= 255; dutyCycle++) {
    ledcWrite(M4.IN1, dutyCycle); // Change the brightness
    ledcWrite(M5.IN1, dutyCycle); // Change the brightness
    delay(10);                    // The ESP32 waits 10 milliseconds before changing it again
  }

  for (int dutyCycle = 255; dutyCycle >= 0; dutyCycle--) {
    ledcWrite(M4.IN1, dutyCycle); // Change the brightness
    ledcWrite(M5.IN1, dutyCycle); // Change the brightness
    delay(10); 
  }
  digitalWrite(M4.IN1, LOW);
  digitalWrite(M5.IN1, LOW);
  for (int dutyCycle = 0; dutyCycle <= 255; dutyCycle++) {
    ledcWrite(M4.IN2, dutyCycle); // Change the brightness
    ledcWrite(M5.IN2, dutyCycle); // Change the brightness
    delay(10);                    // The ESP32 waits 10 milliseconds before changing it again
  }

  for (int dutyCycle = 255; dutyCycle >= 0; dutyCycle--) {
    ledcWrite(M4.IN2, dutyCycle); // Change the brightness
    ledcWrite(M5.IN2, dutyCycle); // Change the brightness
    delay(10); 
  }
}