<div align="center">

# 🐈 AURA
## Automated Unit for Remote Animalcare

**Um sistema automatizado para auxiliar no cuidado diário de animais de pequeno porte.**

![ESP32](https://img.shields.io/badge/ESP32-Embedded-E7352C?logo=espressif&logoColor=white)
![C++](https://img.shields.io/badge/C%2FC++-Firmware-00599C?logo=cplusplus&logoColor=white)
![WebSocket](https://img.shields.io/badge/WebSocket-Comunicação-4A90E2)
![ESP32-CAM](https://img.shields.io/badge/ESP32--CAM-Monitoramento-orange)
![Fusion 360](https://img.shields.io/badge/Fusion%20360-Modelagem-F58220?logo=autodesk&logoColor=white)

[📎 Documentação completa no Notion](https://historical-kettledrum-221.notion.site/AURA-Automated-Unit-for-Remote-Animalcare-1cdcd3e8f8638002b2c1c726b6289030)

</div>

---

## 🪟 Visão geral

Em meio às rotinas acadêmicas e profissionais cada vez mais aceleradas, manter uma rotina constante de cuidados com os animais pode se tornar um desafio. Isso fica ainda mais evidente quando vários animais dividem o mesmo ambiente e tarefas simples, como conferir a quantidade de ração ou trocar a água, precisam ser feitas com frequência.

O **AURA — Automated Unit for Remote Animalcare** surgiu a partir dessa ideia: criar um sistema capaz de automatizar parte desses cuidados e, ao mesmo tempo, permitir que o tutor acompanhe o ambiente à distância.

O projeto reúne **alimentação automática, controle do sistema de água, monitoramento por câmera e uma interface remota**, integrando eletrônica, firmware, comunicação em rede e desenvolvimento mecânico em um único protótipo.

O AURA foi desenvolvido para a disciplina de **Oficina de Integração 2**, do curso de Engenharia de Computação da **UTFPR — Campus Curitiba**.

---

## 🐾 O que o AURA faz?

O sistema foi pensado para atender principalmente quatro pontos do cuidado diário:

### 🍽️ Alimentação automática

A quantidade de ração disponível é medida por uma **célula de carga conectada ao módulo HX711**.

O ESP32 acompanha essa leitura e compara o peso atual com um valor mínimo configurado pelo usuário. Quando o peso fica abaixo desse limite, um **servo motor** atua sobre o mecanismo do reservatório para liberar mais ração.

Dessa forma, o sistema não depende apenas de horários fixos para alimentar os animais: ele também leva em consideração a quantidade de ração realmente disponível.

### 💧 Controle da água

O projeto também possui um sistema voltado ao gerenciamento do bebedouro.

No firmware, horários podem ser cadastrados remotamente e, quando um desses horários é atingido, o ESP32 aciona um **relé de estado sólido (SSR)** por um intervalo determinado. Esse acionamento faz parte da lógica utilizada para automatizar a renovação e o controle do sistema de água.

### 📷 Monitoramento do ambiente

Uma **ESP32-CAM AI Thinker** é utilizada para disponibilizar a imagem do ambiente pela rede.

A câmera possui seu próprio servidor HTTP e transmite vídeo em formato **MJPEG**, permitindo acompanhar os animais e o funcionamento do equipamento à distância.

### 🌐 Controle remoto

O ESP32 principal cria um servidor **WebSocket**, utilizado para comunicação bidirecional com a aplicação web.

Através dessa conexão, a interface consegue receber informações do sistema em tempo real e também enviar novos comandos para o dispositivo.

Entre os comandos implementados no firmware estão:

- alteração do peso mínimo de ração;
- adição de horários;
- remoção de horários;
- reinicialização remota do ESP32.

---

## ⚙️ Como o sistema funciona

De forma simplificada, o funcionamento do AURA pode ser representado assim:

```text
                 ┌────────────────────┐
                 │   Interface Web    │
                 │    / Aplicação     │
                 └─────────┬──────────┘
                           │
                        WebSocket
                           │
                 ┌─────────▼──────────┐
                 │       ESP32        │
                 │  Controle central  │
                 └─────────┬──────────┘
                           │
            ┌──────────────┼──────────────┐
            │              │              │
            ▼              ▼              ▼
     Célula de carga     Servo         Relé SSR
        + HX711        dispensador     acionamento
            │
            ▼
      Controle do peso

                 ┌────────────────────┐
                 │     ESP32-CAM      │
                 │   AI Thinker       │
                 └─────────┬──────────┘
                           │
                      HTTP / MJPEG
                           │
                           ▼
                    Vídeo em tempo real
```

---

## 🧠 Firmware principal — ESP32

O ESP32 funciona como o controlador principal do sistema.

Entre suas responsabilidades estão:

- leitura da célula de carga;
- cálculo do peso atual;
- controle do servo motor;
- controle do SSR;
- sincronização de horário pela internet através de **NTP**;
- gerenciamento de horários cadastrados;
- comunicação com a aplicação através de **WebSocket**;
- envio periódico do estado atual do sistema.

A cada atualização, o ESP32 envia para a aplicação informações como:

```json
{
  "type": "statusUpdate",
  "payload": {
    "pesoAtual": 132.5,
    "limiarPeso": 150.0,
    "horaAtual": "18:42:10",
    "horarios": ["08:00", "18:00"]
  }
}
```

Essas atualizações são enviadas periodicamente para todos os clientes conectados.

---

## 📡 Comunicação com a aplicação

A comunicação entre o ESP32 e a interface é feita pelo endpoint:

```text
/ws
```

O uso de WebSocket permite manter uma conexão aberta entre o dispositivo e a aplicação, evitando a necessidade de realizar novas requisições a todo momento.

Os comandos enviados pela aplicação seguem uma estrutura em JSON.

### Alterar o peso mínimo

```json
{
  "action": "setPeso",
  "payload": 150
}
```

### Adicionar um horário

```json
{
  "action": "addHorario",
  "payload": "18:30"
}
```

### Remover um horário

```json
{
  "action": "deleteHorario",
  "payload": "18:30"
}
```

### Reiniciar o dispositivo

```json
{
  "action": "reset"
}
```

---

## ⚖️ Controle do dispensador de ração

A célula de carga é lida pelo módulo HX711 e fornece ao ESP32 o peso atual.

O princípio de funcionamento é simples:

```text
Peso atual menor que o limite
            │
            ▼
      Abrir dispensador
            │
            ▼
        Ração cai
            │
            ▼
Peso atinge o limite configurado
            │
            ▼
      Fechar dispensador
```

O limite de peso pode ser alterado diretamente pela interface sem a necessidade de recompilar o firmware.

---

## 🕒 Controle por horário

O horário do sistema é sincronizado através de um servidor **NTP**, utilizando o fuso horário de Brasília.

A interface pode cadastrar diferentes horários e o ESP32 verifica continuamente se algum deles corresponde ao horário atual.

Quando isso acontece, o SSR é acionado durante alguns segundos.

O firmware também impede que um mesmo horário seja executado repetidamente dentro do mesmo minuto.

---

## 📷 ESP32-CAM

O módulo de câmera utilizado no projeto é configurado como:

**AI Thinker ESP32-CAM**

A câmera utiliza:

- captura em JPEG;
- PSRAM, quando disponível;
- servidor HTTP próprio;
- transmissão MJPEG;
- ajuste automático da resolução conforme os recursos disponíveis;
- LED de iluminação da própria placa.

Ao iniciar, a ESP32-CAM conecta-se à rede Wi-Fi e disponibiliza seu endereço IP para acesso ao servidor da câmera.

---

## 🔩 Hardware utilizado

| Componente | Função |
|---|---|
| ESP32 | Controle principal do sistema |
| ESP32-CAM AI Thinker | Monitoramento por vídeo |
| Célula de carga | Medição da quantidade de ração |
| HX711 | Leitura da célula de carga |
| Servo motor | Controle do dispensador |
| Relé SSR | Acionamento do sistema auxiliar |
| Fonte 12 V | Alimentação dos atuadores |
| Peças impressas em 3D | Estrutura e mecanismos do projeto |

Além desses elementos, o projeto completo também conta com o conjunto mecânico do reservatório de ração e do bebedouro.

---

## 🖨️ Estrutura mecânica

As peças do projeto foram modeladas no **Autodesk Fusion 360**, buscando unir baixo custo, facilidade de fabricação e segurança para os animais.

Foram desenvolvidos elementos como:

- estrutura principal;
- reservatório de ração;
- mecanismo de abertura e fechamento;
- duto de ração;
- suporte para célula de carga;
- bebedouro;
- tampa e sistema de trava;
- suportes internos para componentes eletrônicos.

Boa parte dessas peças foi pensada para fabricação por impressão 3D.

---

## 💰 Revisão do projeto

A primeira proposta do AURA utilizava uma quantidade maior de componentes e apresentava uma estimativa de custo de aproximadamente:

**R$ 834,10**

Após pesquisas, testes e discussões entre a equipe, o projeto foi reformulado, reduzindo a quantidade de componentes e simplificando a arquitetura.

A nova estimativa ficou em:

**R$ 502,00**

Isso representou uma redução de aproximadamente **40% no custo estimado**, além de diminuir a complexidade de integração entre os diferentes subsistemas.

---

## 🧑‍💻 Minha participação

O AURA foi desenvolvido em uma equipe de quatro alunos.

Durante o projeto, participei principalmente das atividades relacionadas a **software, firmware e integração do sistema**, incluindo:

- desenvolvimento e integração do firmware do ESP32;
- comunicação entre o dispositivo e a aplicação;
- integração de sensores e atuadores;
- participação no desenvolvimento da interface;
- integração entre hardware e software;
- posicionamento e integração dos componentes no gabinete;
- testes do sistema completo.

Um dos pontos mais interessantes do projeto foi justamente trabalhar com várias áreas ao mesmo tempo. O AURA não depende apenas do firmware ou apenas da estrutura mecânica: o resultado final surge da integração entre todas essas partes.

---

## 🛠️ Tecnologias e ferramentas

### Firmware e eletrônica

- C/C++
- ESP32
- ESP32-CAM
- Arduino Framework
- HX711
- Servo motor
- SSR
- NTP

### Comunicação

- Wi-Fi
- WebSocket
- HTTP
- JSON
- MJPEG

### Interface

- Aplicação web
- Comunicação em tempo real com o ESP32
- Configuração remota dos parâmetros do sistema

### Projeto mecânico

- Autodesk Fusion 360
- Modelagem 3D
- Impressão 3D
- Prototipagem

---

## 📂 Organização do código

O código disponibilizado neste projeto é dividido principalmente em dois firmwares:

```text
OficinasCódigo/
│
├── esp32_code_comp/
│   └── esp32_code_comp.ino
│
└── CameraWebServer/
    ├── CameraWebServer.ino
    ├── app_httpd.cpp
    ├── camera_index.h
    └── camera_pins.h
```

### `esp32_code_comp`

Firmware do ESP32 responsável pela automação principal, sensores, atuadores, NTP e comunicação WebSocket.

### `CameraWebServer`

Firmware dedicado à ESP32-CAM e ao streaming de vídeo.

---

## 🔐 Antes de executar

As credenciais de Wi-Fi não devem ser mantidas diretamente no código ao publicar ou reutilizar o projeto.

Substitua pelos dados da rede onde o sistema será executado:

```cpp
const char* ssid = "SEU_WIFI";
const char* password = "SUA_SENHA";
```

O mesmo cuidado deve ser aplicado ao firmware da ESP32-CAM.

---

## 📎 Documentação completa

O Notion do projeto reúne materiais complementares, incluindo:

- proposta do projeto;
- requisitos;
- diagrama elétrico;
- statecharts;
- peças e equipamentos;
- componentes do bebedouro;
- componentes do dispensador de ração;
- gabinete;
- layouts da interface;
- cronograma e divisão de tarefas.

### [Acessar documentação completa do AURA](https://historical-kettledrum-221.notion.site/AURA-Automated-Unit-for-Remote-Animalcare-1cdcd3e8f8638002b2c1c726b6289030)

---

## 👥 Equipe

🐱 **Diogo Levandoski**  
🐱 Lucas Targa  
🐱 Márcia Eliana Ferreira  
🐱 Miguel Almudi  

---

<div align="center">

Projeto desenvolvido para a disciplina de **Oficina de Integração 2**  
**Engenharia de Computação — UTFPR Curitiba**

🐈

</div>
