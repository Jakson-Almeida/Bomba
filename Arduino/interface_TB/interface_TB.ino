// ESP32 DevKit V1 + TB6612FNG — 6 bombas peristálticas
// PWM 12 bits em PWMA/PWMB; AIN/BIN definem o sentido.
// STBY em HIGH habilita as pontes. Serial USB 115200, uma linha por comando.

#include <math.h>

const int PWM_FREQ = 5000;
const int PWM_RES = 12;
const int PWM_MAX = (1 << PWM_RES) - 1;  // 4095
const int MOTOR_COUNT = 6;
const unsigned long CMD_TIMEOUT_MS = 5000;

// STBY dos módulos TB6612. GPIO 4 no debug é o IN2 do M4, então não serve
// como standby: amarre todos os STBY neste pino (ou em 3,3 V).
const int PIN_STBY = 32;

// pwm recebe PWM. in1/in2 são digitais (direção).
// P01–P06 repetem o sketch debuga_ponte_H (M1–M6).
// GPIO 1 e 3 ficam com o USB; 34–39 são só entrada.
struct MotorPins {
  int pwm;
  int in1;
  int in2;
};

const MotorPins PINS[MOTOR_COUNT] = {
  {12, 14, 27},  // P01 — M1 (PWM, IN1, IN2)
  {21, 32, 16},  // P02 — M2
  {26, 25, 33},  // P03 — M3
  {13, 22, 23},  // P04 — M4
  {15, 2, 4},    // P05 — M5
  {19, 18, 5},   // P06 — M6
};

struct MotorState {
  bool enabled;
  bool forward;
  float pwmPercent;
};

MotorState motors[MOTOR_COUNT];
unsigned long lastCmdMs = 0;
bool timedOut = false;

int dutyFromPercent(float percent) {
  if (percent <= 0) {
    return 0;
  }
  if (percent >= 100) {
    return PWM_MAX;
  }
  return (int)lroundf(percent * PWM_MAX / 100.0f);
}

void applyMotor(int index) {
  const MotorPins& pins = PINS[index];
  MotorState& motor = motors[index];
  int duty = (motor.enabled) ? dutyFromPercent(motor.pwmPercent) : 0;

  if (duty <= 0) {
    ledcWrite(pins.pwm, 0);
    digitalWrite(pins.in1, LOW);
    digitalWrite(pins.in2, LOW);
    return;
  }

  if (motor.forward) {
    digitalWrite(pins.in1, HIGH);
    digitalWrite(pins.in2, LOW);
  } else {
    digitalWrite(pins.in1, LOW);
    digitalWrite(pins.in2, HIGH);
  }
  ledcWrite(pins.pwm, duty);
}

void applyAll() {
  for (int i = 0; i < MOTOR_COUNT; i++) {
    applyMotor(i);
  }
}

void stopAll() {
  for (int i = 0; i < MOTOR_COUNT; i++) {
    motors[i].enabled = false;
    motors[i].pwmPercent = 0;
  }
  applyAll();
}

void printState() {
  Serial.print('S');
  for (int i = 0; i < MOTOR_COUNT; i++) {
    Serial.print(',');
    Serial.print(i + 1);
    Serial.print(',');
    Serial.print(motors[i].enabled ? 1 : 0);
    Serial.print(',');
    Serial.print(motors[i].forward ? 'F' : 'R');
    Serial.print(',');
    Serial.print(motors[i].pwmPercent, 2);
  }
  Serial.println();
}

void printHello() {
  Serial.println("H,BOMBA,6,12");
}

void printError(const char* message) {
  Serial.print("ERR,");
  Serial.println(message);
}

bool parseId(const char* token, int& id) {
  if (token == nullptr || *token == 0) {
    return false;
  }
  int value = atoi(token);
  if (value < 1 || value > MOTOR_COUNT) {
    return false;
  }
  id = value;
  return true;
}

void handleLine(char* line) {
  lastCmdMs = millis();
  timedOut = false;

  char* command = strtok(line, ",");
  if (command == nullptr || command[0] == 0) {
    return;
  }

  if (command[0] == 'H' && command[1] == 0) {
    printHello();
    return;
  }

  if (command[0] == 'G' && command[1] == 0) {
    printState();
    return;
  }

  if (command[0] == 'X' && command[1] == 0) {
    stopAll();
    printState();
    return;
  }

  if (command[0] == 'P' && command[1] == 0) {
    int id;
    if (!parseId(strtok(nullptr, ","), id)) {
      printError("id");
      return;
    }
    char* pctToken = strtok(nullptr, ",");
    if (pctToken == nullptr) {
      printError("pwm");
      return;
    }
    float pct = atof(pctToken);
    if (pct < 0) {
      pct = 0;
    }
    if (pct > 100) {
      pct = 100;
    }
    motors[id - 1].pwmPercent = pct;
    applyMotor(id - 1);
    printState();
    return;
  }

  if (command[0] == 'D' && command[1] == 0) {
    int id;
    if (!parseId(strtok(nullptr, ","), id)) {
      printError("id");
      return;
    }
    char* dirToken = strtok(nullptr, ",");
    if (dirToken == nullptr || (dirToken[0] != 'F' && dirToken[0] != 'R')) {
      printError("dir");
      return;
    }
    motors[id - 1].forward = dirToken[0] == 'F';
    applyMotor(id - 1);
    printState();
    return;
  }

  if (command[0] == 'E' && command[1] == 0) {
    int id;
    if (!parseId(strtok(nullptr, ","), id)) {
      printError("id");
      return;
    }
    char* enToken = strtok(nullptr, ",");
    if (enToken == nullptr) {
      printError("en");
      return;
    }
    motors[id - 1].enabled = atoi(enToken) != 0;
    applyMotor(id - 1);
    printState();
    return;
  }

  printError("cmd");
}

void setup() {
  Serial.begin(115200);
  unsigned long started = millis();
  while (!Serial && (millis() - started) < 2000) {
    delay(10);
  }
  delay(200);

  // pinMode(PIN_STBY, OUTPUT);
  // digitalWrite(PIN_STBY, HIGH);

  for (int i = 0; i < MOTOR_COUNT; i++) {
    pinMode(PINS[i].in1, OUTPUT);
    pinMode(PINS[i].in2, OUTPUT);
    digitalWrite(PINS[i].in1, LOW);
    digitalWrite(PINS[i].in2, LOW);
    ledcAttach(PINS[i].pwm, PWM_FREQ, PWM_RES);
    ledcWrite(PINS[i].pwm, 0);
    motors[i].enabled = false;
    motors[i].forward = true;
    motors[i].pwmPercent = 0;
  }

  lastCmdMs = millis();
  printHello();
}

void loop() {
  static char buffer[96];
  static size_t length = 0;

  while (Serial.available() > 0) {
    char incoming = (char)Serial.read();
    if (incoming == '\r') {
      continue;
    }
    if (incoming == '\n') {
      buffer[length] = 0;
      if (length > 0) {
        handleLine(buffer);
      }
      length = 0;
      continue;
    }
    if (length + 1 < sizeof(buffer)) {
      buffer[length++] = incoming;
    } else {
      length = 0;
      printError("len");
    }
  }

  if (!timedOut && (millis() - lastCmdMs) > CMD_TIMEOUT_MS) {
    timedOut = true;
    stopAll();
    printState();
  }
}
