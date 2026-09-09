// ===============================
// ESP32-S3 + L298N + G328
// Teste básico do motor
// ===============================

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

  // Define o sentido de rotação
  digitalWrite(IN1, HIGH);
  digitalWrite(IN2, LOW);

  // Habilita a ponte H
  digitalWrite(ENA, HIGH);

  Serial.println("Motor ligado!");
}

void loop() {

}