// src/main.jsx (React - Ponto de Entrada)
import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
import { Home, Package, UserPlus, LogOut, KeyRound, Archive, Users } from "lucide-react"; // Adicionado Users para Funcionários
import "./styles/App.css"; 

import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';

import App from "./pages/App.jsx"; 
import Cadastro from "./pages/UserAdminPage.jsx"; 
import Estoque from "./pages/Estoque.jsx"; 
import Login from "./pages/Login.jsx";
import AlterarSenha from "./pages/AlterarSenha.jsx";
import Funcionarios from "./pages/Funcionarios.jsx"; // <<< NOVO COMPONENTE

console.log("src/main.jsx (Frontend): Script carregado. vComRotaFuncionarios");

// Estilos do Menu (COPIE DA SUA ÚLTIMA VERSÃO COMPLETA)
const menuNavStyles = {
    backgroundColor: '#333', color: '#fff', padding: '0.8rem 1rem',
    display: 'flex', gap: '0.5rem', alignItems: 'center', 
    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000, height: '3.5rem'
};
const menuLinkStyles = {
    display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.8rem',
    borderRadius: '0.25rem', textDecoration: 'none', color: '#ddd',
    transition: 'background-color 0.2s ease-in-out, color 0.2s ease-in-out', fontSize: '0.9rem'
};
const menuActiveLinkStyles = { backgroundColor: '#007bff', color: '#fff' };


function MenuComponent() {
    const location = useLocation();
    const { usuario, logout } = useAuth();

    const getLinkStyle = (path) => {
        let currentStyle = { ...menuLinkStyles };
        if (location.pathname === path || (path !== "/" && location.pathname.startsWith(path) && path.length > 1) ) {
            currentStyle = { ...currentStyle, ...menuActiveLinkStyles };
        }
        return currentStyle;
    };

    if (!usuario) return null; 

    return (
        <nav style={menuNavStyles}>
            <Link to="/" style={getLinkStyle("/")}>
                <Home size={18} /> Dashboard
            </Link>
            <Link to="/estoque" style={getLinkStyle("/estoque")}>
                <Archive size={18} /> Estoque
            </Link>
            {/* Link para Gerenciar Usuários (logins) */}
            {(usuario?.role === 'administrador' || usuario?.role === 'gerente') && (
                <Link to="/admin/gerenciar-usuarios" style={getLinkStyle("/admin/gerenciar-usuarios")}>
                    <UserPlus size={18} /> Contas de Usuário
                </Link>
            )}
            {/* NOVO Link para Gerenciar Funcionários (dados cadastrais) */}
            {(usuario?.role === 'administrador' || usuario?.role === 'gerente') && (
                <Link to="/cadastros/funcionarios" style={getLinkStyle("/cadastros/funcionarios")}>
                    <Users size={18} /> Funcionários
                </Link>
            )}
            {/* TODO: Adicionar link para Ordens de Serviço aqui quando a tela estiver pronta */}

            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Link to="/alterar-senha" style={getLinkStyle("/alterar-senha")}>
                    <KeyRound size={18} /> Alterar Senha
                </Link>
                <button
                    onClick={logout}
                    title="Sair do sistema"
                    style={{ ...menuLinkStyles, backgroundColor: 'transparent', border: 'none', cursor: 'pointer', padding: '0.5rem 0.8rem' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#555'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                    <LogOut size={18} /> Sair
                </button>
            </div>
        </nav>
    );
}

function RequireAuth({ children }) {
    const { usuario, loadingSession } = useAuth();
    const location = useLocation();
    if (loadingSession) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#121212', color: '#fff' }}>Verificando autenticação...</div>;
    if (!usuario) return <Navigate to="/login" state={{ from: location }} replace />;
    return children;
}

function ApplicationLayout() {
    const { usuario, loadingSession } = useAuth();
    if (loadingSession) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#121212', color: '#fff', fontSize: '1.2rem' }}>Carregando Aplicação...</div>;

    return (
        <>
            {usuario && <MenuComponent />}
            <div style={{ paddingTop: usuario ? '3.5rem' : '0' }}> 
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/" element={<RequireAuth><App /></RequireAuth>} />
                    <Route path="/estoque" element={<RequireAuth><Estoque /></RequireAuth>} />
                    <Route
                        path="/admin/gerenciar-usuarios"
                        element={
                            <RequireAuth>
                                { (usuario && (usuario.role === 'administrador' || usuario.role === 'gerente')) ? <Cadastro /> : <Navigate to="/" replace /> }
                            </RequireAuth>
                        }
                    />
                    {/* NOVA Rota para Funcionários */}
                    <Route
                        path="/cadastros/funcionarios"
                        element={
                            <RequireAuth>
                                {/* Admin ou Gerente podem acessar cadastro de funcionários */}
                                { (usuario && (usuario.role === 'administrador' || usuario.role === 'gerente')) ? <Funcionarios /> : <Navigate to="/" replace /> }
                            </RequireAuth>
                        }
                    />
                    <Route 
                        path="/alterar-senha" 
                        element={<RequireAuth><AlterarSenha /></RequireAuth>} 
                    />
                    <Route path="*" element={<Navigate to={usuario ? "/" : "/login"} replace />} />
                </Routes>
            </div>
        </>
    );
}

const rootElement = document.getElementById("root");
if (rootElement) {
    createRoot(rootElement).render(
        <StrictMode>
            <HashRouter>
                <AuthProvider>
                    <ApplicationLayout />
                </AuthProvider>
            </HashRouter>
        </StrictMode>
    );
} else {
    console.error("src/main.jsx (Frontend): ERRO CRÍTICO - #root não encontrado no DOM!");
}