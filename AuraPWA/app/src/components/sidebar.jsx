import React from 'react';
import './Sidebar.css';
import logoApp from '../assets/logo.png'; 


const Sidebar = ({ onViewChange }) => {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <img src={logoApp} alt="Logo AuraAPP" className="logo" />
      </div>
      
      <ul className="sidebar-menu">
        <li>
          <a href="#" onClick={() => onViewChange('inicio')}>
            <span>🏠</span>
            Início
          </a>
        </li>
        
        <li>
          <a href="#" onClick={() => onViewChange('camera')}>
            <span>📷</span>
            Câmera
          </a>
        </li>
        
        <li>
          <a href="#" onClick={() => onViewChange('configuracoes')}>
            <span>⚙️</span>
            Configurações
          </a>
        </li>
      </ul>
    </div>
  );
};

export default Sidebar;