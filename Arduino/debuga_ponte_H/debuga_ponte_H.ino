// ESP32-DEV KIT V1 + TB6612FNG — 6 motores
// PWM nos pinos PWMA/PWMB; AIN/BIN definem o sentido.
// STBY das pontes amarrado em 3,3 V (não usar GPIO: 4 é IN2 da M5 e 32 é IN1 da M2).

const int PWM_FREQ = 500;
const int PWM_RES = 8;
const int PWM_MAX = (1 << PWM_RES) - 1;  // 255
const int MOTOR_COUNT = 6;

struct Motor {
  int pwm;  // PWMA / PWMB
  int in1;  // AIN1 / BIN1
  int in2;  // AIN2 / BIN2
};

// Mesmos GPIOs do interface_TB (P01–P06). Evita GPIO 1/3 (USB) e 34–39 (só entrada).
Motor M1 = {12, 14, 27};  // PWM, IN1, IN2
Motor M2 = {21, 32, 16};
Motor M3 = {26, 25, 33};
Motor M4 = {13, 22, 23};
Motor M5 = {15, 2, 4};
Motor M6 = {19, 18, 5};

Motor* motors[MOTOR_COUNT] = {&M1, &M2, &M3, &M4, &M5, &M6};

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

void setAllDirection(bool forward) {
  for (int i = 0; i < MOTOR_COUNT; i++) {
    setDirection(*motors[i], forward);
  }
}

void setAllSpeed(int duty) {
  for (int i = 0; i < MOTOR_COUNT; i++) {
    setSpeed(*motors[i], duty);
  }
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  for (int i = 0; i < MOTOR_COUNT; i++) {
    setupMotor(*motors[i]);
  }

  Serial.println("TB6612FNG pronta. Seis motores em sentido direto. STBY em 3,3 V.");
  delay(500);
}

void loop() {
  setAllDirection(true);
  for (int duty = 0; duty <= PWM_MAX; duty++) {
    setAllSpeed(duty);
    delay(10);
  }

  for (int duty = PWM_MAX; duty >= 0; duty--) {
    setAllSpeed(duty);
    delay(10);
  }

  setAllDirection(false);
  for (int duty = 0; duty <= PWM_MAX; duty++) {
    setAllSpeed(duty);
    delay(10);
  }

  for (int duty = PWM_MAX; duty >= 0; duty--) {
    setAllSpeed(duty);
    delay(10);
  }
}
