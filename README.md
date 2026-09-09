# Bomba

Painel da bancada de **bombas peristálticas**: o computador fala com o ESP32 pelo cabo USB e controla até 6 bombas (ligar, sentido e velocidade).

## Como o projeto está organizado

- **Arduino/** — programas da placa
  - **interface/** — o programa que deve ir para o ESP32 no dia a dia. É ele que liga as bombas e conversa com o painel no PC.
  - **motor/**, **motor_teste/** e **2_motores/** — testes antigos, úteis só na montagem e no debug.
- **UI/** — aplicativo de computador (janela própria, não precisa abrir o navegador).
- **exemplo/** — cópia de referência do visual; não entra no Git e não é o programa que se usa.

## Como usar o painel

1. Grave no ESP32 o sketch **Arduino/interface**.
2. Ligue a placa no PC pelo USB.
3. No computador, abra um terminal na pasta `UI` e rode:

```bash
cd UI
npm install
npm run dev
```

Abre a janela **Painel de Bombas**. Escolha a porta COM do ESP32, clique em **Conectar** e use as bombas.

Enquanto o cabo estiver desconectado, os valores na tela ficam em zero.

Cada bomba tem uma página própria (toque em **Abrir**). Lá dá para ajustar PWM, sentido, ligar/desligar e a calibração da vazão estimada (`Q = a × PWM% + b`), já que ainda não há sensor de fluxo.

### Para outras pessoas, sem instalar o código

Quem for só usar o painel não precisa do Node. Na pasta `UI`, gere os instaladores:

```bash
cd UI
npm run build
```

Os arquivos ficam em `UI/release/`: um instalador do Windows e um executável portátil. Basta passar um desses arquivos; no PC de destino, conecte o ESP32, abra o app e escolha a porta COM.
