// ESP32-S3 + TB6612FNG
// PWM nos pinos PWMA/PWMB; AIN/BIN definem o sentido.
// STBY em HIGH habilita a ponte; em LOW ela entra em standby.

const int PWM_FREQ = 5000;
const int PWM_RES = 8;
const int PWM_MAX = (1 << PWM_RES) - 1;  // 255

// Um STBY só, compartilhado pelos dois canais.
const int PIN_STBY = 4;

struct Motor {
  int pwm;  // PWMA / PWMB
  int in1;  // AIN1 / BIN1
  int in2;  // AIN2 / BIN2
};

// Canal A e canal B da TB6612FNG. Ajuste os GPIOs conforme a fiação.
Motor M4 = {3, 6, 5};     // PWMA, AIN1, AIN2
Motor M5 = {8, 15, 16};   // PWMB, BIN1, BIN2

void setDirection(const Motor& motor, bool forward) {
  digitalWrite(motor.in1, forward ? HIGH : LOW);
  digitalWrite(motor.in2, forward ? LOW : HIGH);
}

void setSpeed(const Motor& motor, int duty) {
  if (duty < 0) {
    duty = 0;
  }
  if (duty > PWM_MAX) {
    duty = PWM_MAX;
  }
  ledcWrite(motor.pwm, duty);
}

void setupMotor(const Motor& motor) {
  pinMode(motor.in1, OUTPUT);
  pinMode(motor.in2, OUTPUT);
  ledcAttach(motor.pwm, PWM_FREQ, PWM_RES);
  setSpeed(motor, 0);
  setDirection(motor, true);
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  pinMode(PIN_STBY, OUTPUT);
  digitalWrite(PIN_STBY, HIGH);

  setupMotor(M4);
  setupMotor(M5);

  Serial.println("TB6612FNG pronta. Motores em sentido direto.");
  delay(500);
}

void loop() {
  for (int duty = 0; duty <= PWM_MAX; duty++) {
    setSpeed(M4, duty);
    setSpeed(M5, duty);
    delay(10);
  }

  for (int duty = PWM_MAX; duty >= 0; duty--) {
    setSpeed(M4, duty);
    setSpeed(M5, duty);
    delay(10);
  }
}
