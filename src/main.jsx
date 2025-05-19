// src/main.jsx (React - Ponto de Entrada)
import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
import { Home, Package, UserPlus, LogOut, KeyRound } from "lucide-react";
import "./App.css"; // Ou index.css - seu CSS global

import { AuthProvider, useAuth } from './AuthContext.jsx';

import App from "./App.jsx"; // Dashboard principal
import Cadastro from "./Cadastro.jsx"; // Gerenciamento de Usuários (Admin/Gerente)
import CadastroPeca from "./CadastroPeca.jsx";
import Login from "./Login.jsx";
import AlterarSenha from "./AlterarSenha.jsx";

console.log("src/main.jsx (Frontend): Script carregado. vCorrigidoRefError");

// Estilos do Menu
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
            <Link to="/pecas" style={getLinkStyle("/pecas")}>
                <Package size={18} /> Estoque
            </Link>
            {(usuario?.role === 'administrador' || usuario?.role === 'gerente') && (
                <Link to="/admin/gerenciar-usuarios" style={getLinkStyle("/admin/gerenciar-usuarios")}>
                    <UserPlus size={18} /> Usuários
                </Link>
            )}
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

// Renomeado de volta para RequireAuth
function RequireAuth({ children }) {
    const { usuario, loadingSession } = useAuth();
    const location = useLocation();

    if (loadingSession) {
        return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#121212', color: '#fff' }}>Verificando autenticação...</div>;
    }

    if (!usuario) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }
    return children;
}

// Renomeado de volta para ApplicationLayout
function ApplicationLayout() {
    const { usuario, loadingSession } = useAuth();

    if (loadingSession) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#121212', color: '#fff', fontSize: '1.2rem' }}>
                Carregando Aplicação...
            </div>
        );
    }

    return (
        <>
            {usuario && <MenuComponent />}
            <div style={{ paddingTop: usuario ? '3.5rem' : '0' }}> 
                <Routes>
                    <Route path="/login" element={<Login />} />
                    
                    <Route path="/" element={<RequireAuth><App /></RequireAuth>} />
                    <Route path="/pecas" element={<RequireAuth><CadastroPeca /></RequireAuth>} />
                    <Route
                        path="/admin/gerenciar-usuarios"
                        element={
                            <RequireAuth>
                                { (usuario && (usuario.role === 'administrador' || usuario.role === 'gerente')) ? <Cadastro /> : <Navigate to="/" replace /> }
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
    console.log("src/main.jsx (Frontend): #root encontrado. Renderizando aplicação...");
    createRoot(rootElement).render(
        <StrictMode>
            <HashRouter>
                <AuthProvider>
                    {/* Usando ApplicationLayout (sem o "Full") */}
                    <ApplicationLayout /> 
                </AuthProvider>
            </HashRouter>
        </StrictMode>
    );
    console.log("src/main.jsx (Frontend): Render da aplicação completa chamado.");
} else {
    console.error("src/main.jsx (Frontend): ERRO CRÍTICO - #root não encontrado no DOM!");
    document.body.innerHTML = '<div style="color: red; font-size: 24px; padding: 20px;">ERRO: #root não encontrado!</div>';
}