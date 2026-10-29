

import React, { useState, useEffect, useRef } from 'react';

const ConfirmationModal = ({ message, onConfirm, onCancel }) => (
  <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
    <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '8px', color: 'black', textAlign: 'center', boxShadow: '0 5px 15px rgba(0,0,0,0.3)' }}>
      <p style={{ margin: '0 0 20px 0', fontSize: '1.1rem' }}>{message}</p>
      <button onClick={onConfirm} style={{ marginRight: '15px', padding: '10px 20px', backgroundColor: '#c0392b', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Sim</button>
      <button onClick={onCancel} style={{ padding: '10px 20px', backgroundColor: '#7f8c8d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Não</button>
    </div>
  </div>
);


function PainelDeControle() {
  // Endereço IP do seu ESP32 Padrão (configure no seu roteador para ser fixo!)
  const esp32Ip = "192.168.4.49"; 

  // --- ESTADOS DO COMPONENTE ---
  const [conexaoStatus, setConexaoStatus] = useState("Desconectado");
  const [pesoAtual, setPesoAtual] = useState(0);
  const [limiarPeso, setLimiarPeso] = useState(150); // Para o input de controle
  const [horarios, setHorarios] = useState([]);
  const [novoHorario, setNovoHorario] = useState("12:00");
  const [horaAtual, setHoraAtual] = useState("--:--:--");
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // useRef para guardar a instância do WebSocket sem causar re-renderizações
  const socket = useRef(null);

  useEffect(() => {
    // --- LÓGICA DE CONEXÃO WEBSOCKET ---
    const connectWebSocket = () => {
      setConexaoStatus("Conectando...");
      socket.current = new WebSocket(`ws://${esp32Ip}/ws`);

      socket.current.onopen = () => {
        console.log("WebSocket Conectado!");
        setConexaoStatus("Conectado");
      };

      socket.current.onclose = () => {
        console.log("WebSocket Desconectado. Tentando reconectar em 3 segundos...");
        setConexaoStatus("Desconectado");
        setTimeout(connectWebSocket, 3000); // Tenta reconectar
      };

      socket.current.onerror = (error) => {
        console.error("Erro no WebSocket:", error);
        socket.current.close();
      };

      socket.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        // Processa as mensagens de "statusUpdate" vindas do ESP32
        if (data.type === "statusUpdate") {
          const payload = data.payload;
          setPesoAtual(payload.pesoAtual || 0);
          setLimiarPeso(payload.limiarPeso || 150);
          setHorarios(payload.horarios || []); // Garante que é um array
          setHoraAtual(payload.horaAtual || "--:--:--");
        }
      };
    };

    connectWebSocket();

    // Função de limpeza ao desmontar o componente
    return () => {
      if (socket.current) {
        // Remove a lógica de reconexão antes de fechar
        socket.current.onclose = null;
        socket.current.close();
      }
    };
  }, [esp32Ip]); // Roda o efeito apenas se o IP mudar

  // --- FUNÇÕES PARA ENVIAR COMANDOS PARA O ESP32 ---
  const enviarComando = (action, payload) => {
    if (socket.current && socket.current.readyState === WebSocket.OPEN) {
      const command = { action, payload };
      socket.current.send(JSON.stringify(command));
    } else {
      alert("Não foi possível enviar o comando. Verifique a conexão com o ESP32.");
    }
  };

  const handleSetPeso = () => {
    enviarComando("setPeso", parseFloat(limiarPeso));
  };

  const handleAddHorario = () => {
    if (novoHorario && !horarios.includes(novoHorario)) {
      enviarComando("addHorario", novoHorario);
    } else {
      alert("Horário inválido ou já existe na lista.");
    }
  };

  const handleDeleteHorario = (horario) => {
    enviarComando("deleteHorario", horario);
  };
  
  const handleReset = () => {
    setShowResetConfirm(true);
  };

  const confirmReset = () => {
    enviarComando("reset", null);
    setShowResetConfirm(false);
    alert("Comando de reset enviado! O ESP32 será reiniciado.");
  };

  // Estilo para o status da conexão
  const statusColor = conexaoStatus === "Conectado" ? "lightgreen" : "lightcoral";
  const pesoColor = pesoAtual < limiarPeso ? 'orange' : 'white';

  return (
    <div style={{ fontFamily: 'sans-serif' }}>
      {showResetConfirm && (
        <ConfirmationModal 
          message="Tem certeza que deseja reiniciar o ESP32?"
          onConfirm={confirmReset}
          onCancel={() => setShowResetConfirm(false)}
        />
      )}

      <h3>Painel de Controle</h3>
      <p>Status: <strong style={{ color: statusColor }}>{conexaoStatus}</strong> | Hora no Dispositivo: <strong>{horaAtual}</strong></p>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        
        {/* --- Card de Status em Tempo Real --- */}
        <div style={{ border: '1px solid #444', padding: '15px', borderRadius: '8px' }}>
          <h4>Status em Tempo Real</h4>
          <p>Peso Atual:</p>
          <p style={{ fontSize: '2.5rem', margin: '10px 0', color: pesoColor, fontWeight: 'bold' }}>
            {pesoAtual.toFixed(1)} g
          </p>
        </div>

        {/* --- Card de Configuração de Peso --- */}
        <div style={{ border: '1px solid #444', padding: '15px', borderRadius: '8px' }}>
          <h4>Configurar Limiar de Peso</h4>
          <label>Dispensar ração abaixo de:</label>
          <div style={{ marginTop: '10px' }}>
            <input 
              type="number" 
              value={limiarPeso} 
              onChange={e => setLimiarPeso(e.target.value)}
              style={{ width: '100px', marginRight: '10px', padding: '8px' }}
            />
            <span>g</span>
          </div>
          <button onClick={handleSetPeso} style={{ marginTop: '15px', padding: '10px' }}>Salvar Limiar</button>
        </div>

        {/* --- Card de Agendamento de Horários --- */}
        <div style={{ border: '1px solid #444', padding: '15px', borderRadius: '8px' }}>
          <h4>Agendar Acionamentos (Bomba/Solenoide)</h4>
          <div>
            <input 
              type="time" 
              value={novoHorario} 
              onChange={e => setNovoHorario(e.target.value)}
              style={{ marginRight: '10px', padding: '8px' }}
            />
            <button onClick={handleAddHorario} style={{ padding: '10px' }}>Adicionar Horário</button>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, marginTop: '15px', maxHeight: '150px', overflowY: 'auto' }}>
            {horarios.length > 0 ? horarios.map((h, index) => (
              <li key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid #333' }}>
                <code>{h}</code>
                <button onClick={() => handleDeleteHorario(h)} style={{ marginLeft: '20px', backgroundColor: '#555', fontSize: '0.8rem' }}>Remover</button>
              </li>
            )) : <p>Nenhum horário agendado.</p>}
          </ul>
        </div>
        
        {/* --- Card de Ações --- */}
        <div style={{ border: '1px solid #444', padding: '15px', borderRadius: '8px' }}>
            <h4>Ações do Sistema</h4>
            <p>Reinicia o microcontrolador.</p>
            <button onClick={handleReset} style={{ backgroundColor: '#c0392b', color: 'white', border: 'none', padding: '10px', borderRadius: '5px', cursor: 'pointer', marginTop: '10px' }}>
                Resetar ESP32
            </button>
        </div>
      </div>
    </div>
  );
}

export default PainelDeControle;
