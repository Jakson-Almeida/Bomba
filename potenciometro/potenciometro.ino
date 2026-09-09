// ============================================
// ESP32-S3 + L298N + 2x G328 + Potenciômetro
// Controle de PWM dos dois motores
// ============================================

// ---------- MOTOR 1 ----------
const int ENA = 3;
const int IN1 = 6;
const int IN2 = 5;

// ---------- MOTOR 2 ----------
const int ENB = 8;
const int IN3 = 15;
const int IN4 = 16;

// ---------- POTENCIÔMETRO ----------
const int POT = 4;

// ---------- PWM ----------
const int freq = 5000;
const int resolution = 8;

void setup() {

  Serial.begin(115200);
  delay(1000);

  // =========================
  // Configuração Motor 1
  // =========================
  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);

  digitalWrite(IN1, HIGH);
  digitalWrite(IN2, LOW);

  ledcAttach(ENA, freq, resolution);
  ledcWrite(ENA, 0);

  // =========================
  // Configuração Motor 2
  // =========================
  pinMode(IN3, OUTPUT);
  pinMode(IN4, OUTPUT);

  digitalWrite(IN3, HIGH);
  digitalWrite(IN4, LOW);

  ledcAttach(ENB, freq, resolution);
  ledcWrite(ENB, 0);

  // =========================
  // ADC
  // =========================
  analogReadResolution(12);

  Serial.println("================================");
  Serial.println("ESP32-S3 + L298N + 2x G328");
  Serial.println("Controle por potenciometro");
  Serial.println("================================");
}

void loop() {

  // =========================
  // Leitura do potenciômetro
  // =========================

  int valorADC = analogRead(POT);

  // Converte 0–4095 para 0–255
  int PWM = map(valorADC, 0, 4095, 0, 255);

  // Garante que fique dentro do limite
  PWM = constrain(PWM, 0, 255);

  // =========================
  // Aplica PWM aos dois motores
  // =========================

  ledcWrite(ENA, PWM);
  ledcWrite(ENB, PWM);

  // =========================
  // Monitor Serial
  // =========================

  Serial.print("ADC = ");
  Serial.print(valorADC);

  Serial.print(" | PWM = ");
  Serial.println(PWM);

  delay(100);
}