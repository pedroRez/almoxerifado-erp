// src/components/layout/SidebarMenu.jsx
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Archive, Users, KeyRound, LogOut, ChevronRight, ChevronLeft } from 'lucide-react'; // Ícones
import { useAuth } from '../../contexts/AuthContext.jsx'; // Ajuste o caminho se necessário
import styles from '../../styles/SidebarMenu.module.css'; // Novo CSS Module

export default function SidebarMenu() {
  const { usuario, logout } = useAuth();
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useState(false);

  const isAdmin = usuario?.role === 'administrador';
  const isManager = usuario?.role === 'gerente';
  const isFuncionario = usuario?.role === 'funcionario';

  const menuItems = [
    { to: "/", text: "Dashboard", icon: <Home size={20} />, roles: ['administrador', 'gerente', 'funcionario'] },
    { to: "/estoque", text: "Estoque", icon: <Archive size={20} />, roles: ['administrador', 'gerente', 'funcionario'] },
    { to: "/colaboradores/gerenciar", text: "Colaboradores", icon: <Users size={20} />, roles: ['administrador', 'gerente', 'funcionario'] },
    // Adicione aqui o link para Ordens de Serviço quando a tela estiver pronta
    // { to: "/ordens-servico", text: "Ordens de Serviço", icon: <Briefcase size={20} />, roles: ['administrador', 'gerente', 'funcionario'] },
  ];

  const utilityItems = [
    { to: "/alterar-senha", text: "Alterar Senha", icon: <KeyRound size={20} />, roles: ['administrador', 'gerente', 'funcionario'] },
  ];

  if (!usuario) {
    return null;
  }

  return (
    <div 
      className={`${styles.sidebar} ${isExpanded ? styles.expanded : styles.minimized}`}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <div className={styles.menuHeader}>
        {/* Pode colocar um logo ou nome do sistema aqui se quiser */}
        {isExpanded && <span className={styles.systemName}>Almoxarifado</span>}
        <button 
          onClick={() => setIsExpanded(!isExpanded)} 
          className={styles.toggleButton}
          title={isExpanded ? "Minimizar Menu" : "Expandir Menu"}
        >
          {isExpanded ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>
      </div>
      
      <nav className={styles.mainNav}>
        {menuItems.map(item => (
          (item.roles.includes(usuario.role)) && (
            <Link 
              key={item.to} 
              to={item.to} 
              className={`${styles.menuLink} ${location.pathname === item.to || (item.to !== "/" && location.pathname.startsWith(item.to)) ? styles.active : ''}`}
              title={item.text} // Mostra o texto no hover quando minimizado
            >
              <span className={styles.iconWrapper}>{item.icon}</span>
              {isExpanded && <span className={styles.linkText}>{item.text}</span>}
            </Link>
          )
        ))}
      </nav>

      <div className={styles.utilityNav}>
        {utilityItems.map(item => (
           (item.roles.includes(usuario.role)) && (
            <Link 
              key={item.to} 
              to={item.to} 
              className={`${styles.menuLink} ${location.pathname === item.to ? styles.active : ''}`}
              title={item.text}
            >
              <span className={styles.iconWrapper}>{item.icon}</span>
              {isExpanded && <span className={styles.linkText}>{item.text}</span>}
            </Link>
           )
        ))}
        <button 
          onClick={logout} 
          className={`${styles.menuLink} ${styles.logoutButton}`}
          title="Sair do sistema"
        >
          <span className={styles.iconWrapper}><LogOut size={20} /></span>
          {isExpanded && <span className={styles.linkText}>Sair</span>}
        </button>
      </div>
    </div>
  );
}
