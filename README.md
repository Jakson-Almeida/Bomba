# Bomba

Painel da bancada de **bombas peristálticas**: o computador fala com o ESP32 pelo cabo USB e controla até 6 bombas (ligar, sentido e velocidade).

## Baixar e usar no Windows

O aplicativo já está publicado. Não precisa clonar o repositório nem instalar Node.

1. Abra a [página de releases](https://github.com/Jakson-Almeida/Bomba/releases/latest) e baixe o instalador **Painel de Bombas** para Windows.
2. Instale e abra o app.
3. Grave no ESP32 o sketch **Arduino/interface** (só na primeira vez, ou quando o firmware mudar).
4. Ligue a placa no PC pelo USB, escolha a porta COM e clique em **Conectar**.

Pronto: ligue, ajuste PWM, sentido e velocidade pelo painel.

Enquanto o cabo estiver desconectado, os valores na tela ficam em zero. Cada bomba tem uma página própria (**Abrir**), com calibração da vazão estimada: zero abaixo do limiar PWM₀ e `Q = a × (PWM − PWM₀)` acima dele, já que ainda não há sensor de fluxo.

## Como o projeto está organizado

- **Arduino/** — programas da placa
  - **interface/** — o programa que deve ir para o ESP32 no dia a dia. É ele que liga as bombas e conversa com o painel no PC.
  - **motor/**, **motor_teste/** e **2_motores/** — testes antigos, úteis só na montagem e no debug.
- **UI/** — código do aplicativo de computador.
- **exemplo/** — cópia de referência do visual; não entra no Git e não é o programa que se usa.

## Desenvolvimento

Para abrir o painel a partir do código:

```bash
cd UI
npm install
npm run dev
```

Para gerar de novo o instalador Windows:

```bash
cd UI
npm run build
```

Os arquivos ficam em `UI/release/`. O instalador público continua na [página de releases](https://github.com/Jakson-Almeida/Bomba/releases/latest).
