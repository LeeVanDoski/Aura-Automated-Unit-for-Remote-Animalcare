/*
 * =================================================================================
 * AURA_PWA - CÓDIGO DO MICROCONTROLADOR  (ESP32)
 * =================================================================================
 * Responsabilidades:
 * - Ler sensores (Célula de Carga HX711, Sensor Analógico).
 * - Controlar atuadores (Servo, Relé SSR).
 * - Sincronizar a hora com a internet (NTP).
 * - Criar um servidor WebSocket para comunicação bidirecional com o App React.
 * - Enviar status em tempo real (peso, configurações) para o App.
 * - Receber e executar comandos (mudar limiar de peso, agendar horários, resetar).
 * =================================================================================

 */

// --- BIBLIOTECAS ---
#include <WiFi.h>
#include <ESPAsyncWebServer.h>
#include <AsyncTCP.h>
#include <ArduinoJson.h>
#include <NTPClient.h>
#include <WiFiUdp.h>
#include <ESP32Servo.h>
#include "HX711.h"

// --- CONFIGURAÇÕES DE HARDWARE ---
#define SERVO_PIN 33
#define CELCARGA_DT_PIN 12
#define CELCARGA_SCK_PIN 13
#define CONTROLE_SSR_PIN 25
#define SENSOR_ANALOGICO_PIN 32

// --- CONFIGURAÇÕES DE WI-FI ---
const char* ssid = "Redmi-Diogo";
const char* password = "cocozao1";

// --- SERVIDOR WEB E WEBSOCKET ---
AsyncWebServer server(80);
AsyncWebSocket ws("/ws"); // Cria o endpoint do WebSocket em /ws

// --- CONTROLE DE TEMPO (NTP) ---
const long utcOffsetInSeconds = -10800; // GMT-3 (Brasília)
WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "pool.ntp.org", utcOffsetInSeconds);

// --- OBJETOS DOS SENSORES/ATUADORES ---
Servo servoSG;
HX711 cel_carga;

// --- VARIÁVEIS DE ESTADO E CONFIGURAÇÃO (Valores Padrão) ---
float limiarPesoGramas = 150.0;
bool servo_estado = false; // false: fechado, true: aberto
const int servo_pos_fechado = 0;
const int servo_pos_aberto = -90;

// Lista para armazenar os horários de acionamento do SSR
#include <vector>
std::vector<String> listaHorarios;
std::vector<bool> horariosDisparados; // Flag para evitar disparos múltiplos no mesmo minuto

// --- FUNÇÃO DE MANIPULAÇÃO DE EVENTOS WEBSOCKET ---
void onWsEvent(AsyncWebSocket *server, AsyncWebSocketClient *client, AwsEventType type, void *arg, uint8_t *data, size_t len) {
  // Evento de conexão de um novo cliente (App React)
  if (type == WS_EVT_CONNECT) {
    Serial.printf("Cliente WebSocket #%u conectado do IP: %s\n", client->id(), client->remoteIP().toString().c_str());
  } 
  // Evento de desconexão
  else if (type == WS_EVT_DISCONNECT) {
    Serial.printf("Cliente WebSocket #%u desconectado.\n", client->id());
  }
  // Evento de recebimento de dados (comandos do App React)
  else if (type == WS_EVT_DATA) {
    // Objeto JSON para deserializar a mensagem recebida
    StaticJsonDocument<256> doc;
    deserializeJson(doc, (char*)data, len);

    const char* action = doc["action"]; // Pega a ação do JSON (ex: "setPeso")

    // --- Processa os comandos recebidos ---
    if (strcmp(action, "setPeso") == 0) {
      limiarPesoGramas = doc["payload"];
      Serial.printf(">>> NOVO LIMIAR DE PESO RECEBIDO: %.2f g\n", limiarPesoGramas);
    } 
    else if (strcmp(action, "addHorario") == 0) {
      String horario = doc["payload"];
      listaHorarios.push_back(horario);
      horariosDisparados.push_back(false); // Adiciona flag para o novo horário
      Serial.printf(">>> NOVO HORÁRIO ADICIONADO: %s\n", horario.c_str());
    } 
    else if (strcmp(action, "deleteHorario") == 0) {
      String horarioParaDeletar = doc["payload"];
      // Procura e remove o horário da lista
      for (int i = 0; i < listaHorarios.size(); i++) {
        if (listaHorarios[i] == horarioParaDeletar) {
          listaHorarios.erase(listaHorarios.begin() + i);
          horariosDisparados.erase(horariosDisparados.begin() + i);
          Serial.printf(">>> HORÁRIO REMOVIDO: %s\n", horarioParaDeletar.c_str());
          break;
        }
      }
    } 
    else if (strcmp(action, "reset") == 0) {
      Serial.println(">>> COMANDO DE RESET RECEBIDO! Reiniciando em 3 segundos...");
      delay(3000);
      ESP.restart();
    }
  }
}

// --- FUNÇÃO PARA ENVIAR O STATUS ATUAL PARA O APP REACT ---
void enviarStatusParaApp() {
  // Lê o peso atual
  float pesoAtual = cel_carga.is_ready() ? cel_carga.get_units(10) : 0.0;

  // Objeto JSON para enviar o status
  StaticJsonDocument<512> doc;
  doc["type"] = "statusUpdate";
  
  JsonObject payload = doc.createNestedObject("payload");
  payload["pesoAtual"] = pesoAtual;
  payload["limiarPeso"] = limiarPesoGramas;
  payload["horaAtual"] = timeClient.getFormattedTime();

  // Adiciona a lista de horários ao JSON
  JsonArray horariosArray = payload.createNestedArray("horarios");
  for (const String& h : listaHorarios) {
    horariosArray.add(h);
  }

  // Serializa o JSON para uma string
  char buffer[512];
  size_t len = serializeJson(doc, buffer);

  // Envia a string para todos os clientes conectados
  ws.textAll(buffer, len);
}

void setup() {
  Serial.begin(115200);
  
  // --- INICIALIZAÇÃO DOS COMPONENTES ---
  pinMode(CONTROLE_SSR_PIN, OUTPUT);
  servoSG.setPeriodHertz(50);
  servoSG.attach(SERVO_PIN, 544, 2400);
  servoSG.write(servo_pos_aberto);
  cel_carga.begin(CELCARGA_DT_PIN, CELCARGA_SCK_PIN);
  cel_carga.set_scale(295.65); 
  cel_carga.tare(20);

  // --- CONEXÃO WI-FI ---
  WiFi.begin(ssid, password);
  Serial.print("Conectando ao WiFi...");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Conectado!");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());

  // --- SINCRONIZAÇÃO DE TEMPO (NTP) ---
  timeClient.begin();

  // --- CONFIGURAÇÃO DO WEBSOCKET ---
  ws.onEvent(onWsEvent);
  server.addHandler(&ws);

  // Permite que o App (de outra origem/IP) se conecte
  DefaultHeaders::Instance().addHeader("Access-Control-Allow-Origin", "*");

  // --- INICIA O SERVIDOR ---
  server.begin();
  Serial.println("Servidor WebSocket iniciado!");
}

unsigned long ultimaAtualizacaoStatus = 0;
String minutoAnterior = "";

void loop() {
  ws.cleanupClients(); // Mantém a lista de clientes limpa
  timeClient.update(); // Atualiza a hora

  // --- LÓGICA DE CONTROLE BASEADA NO TEMPO ---
  String horaAtualFormatada = timeClient.getFormattedTime(); // Formato HH:MM:SS
  String horaMinutoAtual = horaAtualFormatada.substring(0, 5); 

  // Reseta as flags de disparo quando o minuto muda
  if (horaMinutoAtual != minutoAnterior) {
    for (int i = 0; i < horariosDisparados.size(); i++) {
      horariosDisparados[i] = false;
    }
    minutoAnterior = horaMinutoAtual;
  }

  // Verifica se a hora atual corresponde a algum horário agendado
  for (int i = 0; i < listaHorarios.size(); i++) {
    if (listaHorarios[i] == horaMinutoAtual && !horariosDisparados[i]) {
      Serial.printf(">>> ACIONANDO SSR PELO HORÁRIO AGENDADO: %s\n", listaHorarios[i].c_str());
      digitalWrite(CONTROLE_SSR_PIN, HIGH);
      delay(5000); // Mantém acionado por 5 segundos
      digitalWrite(CONTROLE_SSR_PIN, LOW);
      horariosDisparados[i] = true; // Marca como disparado para não repetir no mesmo minuto
    }
  }

  // --- LÓGICA DE CONTROLE BASEADA EM SENSORES ---
  float pesoAtual = cel_carga.get_units(10);
  if (pesoAtual < limiarPesoGramas && !servo_estado) {
    servoSG.write(servo_pos_aberto);
    servo_estado = true;
  } else if (pesoAtual >= limiarPesoGramas && servo_estado) {
    servoSG.write(servo_pos_fechado);
    servo_estado = false;
  }

  // --- ENVIO PERIÓDICO DE STATUS PARA O APP ---
  // Envia a cada 2 segundos
  if (millis() - ultimaAtualizacaoStatus > 2000) {
    enviarStatusParaApp();
    ultimaAtualizacaoStatus = millis();
  }
}
