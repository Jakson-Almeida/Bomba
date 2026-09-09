
// Controle PWM de dois motores

const int freq = 5000;
const int resolution = 8;

// Estrutura do motor
struct Motor {
  int ENA;
  int IN1;
  int IN2;
};

// Motores
Motor M4 = {3, 6, 5};
Motor M5 = {8, 15, 16};

// CONFIGURAÇÃO DO MOTOR

void configurarMotor(Motor &motor) {

  pinMode(motor.ENA, OUTPUT);
  pinMode(motor.IN1, OUTPUT);
  pinMode(motor.IN2, OUTPUT);

  // Habilita a ponte H
  digitalWrite(motor.ENA, HIGH);

  // Configura PWM
  ledcAttach(motor.IN1, freq, resolution);
  ledcAttach(motor.IN2, freq, resolution);

  // Motor parado inicialmente
  ledcWrite(motor.IN1, 0);
  ledcWrite(motor.IN2, 0);
}

// CONTROLE DO MOTOR

void setMotor(Motor &motor, int pwm) {

  // Limita o PWM
  pwm = constrain(pwm, -255, 255);

  if (pwm > 0) {

    // Sentido 1
    ledcWrite(motor.IN1, pwm);
    ledcWrite(motor.IN2, 0);

  }

  else if (pwm < 0) {

    // Sentido 2
    ledcWrite(motor.IN1, 0);
    ledcWrite(motor.IN2, -pwm);

  }

  else {

    // Motor parado
    ledcWrite(motor.IN1, 0);
    ledcWrite(motor.IN2, 0);
  }
}


// SETUP

void setup() {

  Serial.begin(115200);
  delay(1000);

  configurarMotor(M4);
  configurarMotor(M5);

  Serial.println("Sistema iniciado");
}

// LOOP

void loop() {

  // Aceleração
  for (int pwm = 0; pwm <= 255; pwm++) {

    setMotor(M4, pwm);
    setMotor(M5, pwm);

    delay(10);
  }

  // Desaceleração
  for (int pwm = 255; pwm >= 0; pwm--) {

    setMotor(M4, pwm);
    setMotor(M5, pwm);

    delay(10);
  }

  delay(500);

  // Aceleração no sentido contrário
  for (int pwm = 0; pwm <= 255; pwm++) {

    setMotor(M4, -pwm);
    setMotor(M5, -pwm);

    delay(10);
  }

  // Desaceleração
  for (int pwm = 255; pwm >= 0; pwm--) {

    setMotor(M4, -pwm);
    setMotor(M5, -pwm);

    delay(10);
  }

  delay(500);
}