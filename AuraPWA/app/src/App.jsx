import React, { useState } from 'react';
import Sidebar from './components/sidebar.jsx';
import VideoPlayer from './components/videoPlayer.jsx';
import PainelDeControle from './components/painelDeControle.jsx';
import './App.css';

// Um componente simples para a tela inicial
const PaginaInicial = () => (
  <div>
    <h1>AuraAPP</h1>
    <p>Miau :3</p>
    <p>Selecione uma opção na barra lateral para começar.</p>
  </div>
);

function App() {
  // Didática: Este 'estado' guarda qual a visualização ativa.
  // Começamos na tela 'inicio'.
  const [activeView, setActiveView] = useState('inicio');

  return (
    <div className="app">
      {/*
       * Passamos a função 'setActiveView' para a Sidebar.
       * Quando um link for clicado lá, ele vai atualizar diretamente
       * o estado 'activeView' aqui no App.jsx.
      */}
      <Sidebar onViewChange={setActiveView} />

      <main className="content">
        {/*
         * Apenas o componente que corresponder ao valor será renderizado
         * na tela. Se o estado mudar, o React automaticamente troca
         * o componente exibido.
        */}
        
        {/* Se a view ativa for 'inicio', mostre a Página Inicial */}
        {activeView === 'inicio' && <PaginaInicial />}

        {/* Se a view ativa for 'camera', mostre o VideoPlayer */}
        {activeView === 'camera' && <VideoPlayer />}
        
        {/* Se a view ativa for 'configuracoes', mostre o Painel de Controle */}
        {activeView === 'configuracoes' && <PainelDeControle />}
        
      </main>
    </div>
  );
}

export default App;