// src/main.jsx
import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
import { Home, Package, UserPlus, LogOut } from "lucide-react";
import "./App.css"; // Certifique-se que este é o nome correto do seu arquivo CSS global

import { AuthProvider, useAuth } from './AuthContext.jsx';

import App from "./App.jsx"; // Seu Dashboard
import Cadastro from "./Cadastro.jsx"; // Cadastro de usuário pelo admin
import CadastroPeca from "./CadastroPeca.jsx"; // Cadastro de peças
import Login from "./Login.jsx"; // Sua tela de Login

console.log("src/main.jsx (Frontend): Script carregado. v4");

// Estilos do Menu (exemplo, use os seus estilos completos ou importe de um CSS module)
const menuNavStyles = {
    backgroundColor: '#333', color: '#fff', padding: '1rem', display: 'flex',
    gap: '1rem', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
};
const menuLinkStyles = {
    display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem',
    borderRadius: '0.25rem', textDecoration: 'none', color: '#ddd',
    transition: 'background-color 0.2s ease-in-out, color 0.2s ease-in-out',
};
const menuActiveLinkStyles = { backgroundColor: '#007bff', color: '#fff' };


function MenuComponent() {
    const location = useLocation();
    const { usuario, logout } = useAuth(); // Pega dados do contexto

    // console.log("MenuComponent: Renderizando. Usuário:", !!usuario, "Path:", location.pathname);

    const getLinkStyle = (path) => {
        let currentStyle = { ...menuLinkStyles };
        if (location.pathname === path || (path !== "/" && location.pathname.startsWith(path))) {
            currentStyle = { ...currentStyle, ...menuActiveLinkStyles };
        }
        return currentStyle;
    };

    return (
        <nav style={menuNavStyles}>
            <Link to="/" style={getLinkStyle("/")}>
                <Home size={20} /> Dashboard
            </Link>
            <Link to="/pecas" style={getLinkStyle("/pecas")}>
                <Package size={20} /> Estoque de Peças
            </Link>
            {usuario?.role === 'administrador' && (
                <Link to="/admin/cadastro-usuario" style={getLinkStyle("/admin/cadastro-usuario")}>
                    <UserPlus size={20} /> Cadastrar Usuários
                </Link>
            )}
            <button
                onClick={logout}
                style={{ ...menuLinkStyles, marginLeft: 'auto', backgroundColor: 'transparent', border: '1px solid #555', cursor: 'pointer' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d32f2f'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
                <LogOut size={20} /> Sair
            </button>
        </nav>
    );
}

// Componente para Rotas Protegidas
function RequireAuth({ children }) {
    const { usuario, loadingSession } = useAuth();
    const location = useLocation();
    // console.log("RequireAuth: Verificando. Loading:", loadingSession, "Usuário:", !!usuario, "Path:", location.pathname);

    if (loadingSession) {
        return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#121212', color: '#fff' }}>Verificando autenticação...</div>;
    }

    if (!usuario) {
        // console.log("RequireAuth: Usuário não autenticado. Redirecionando para /login. Tentou acessar:", location.pathname);
        return <Navigate to="/login" state={{ from: location }} replace />;
    }
    return children;
}

// Layout Principal da Aplicação
function ApplicationLayout() {
    const { usuario, loadingSession } = useAuth();
    // console.log("ApplicationLayout: Renderizando. Loading:", loadingSession, "Usuário:", !!usuario);

    // Não renderiza nada até que a sessão seja carregada, para evitar piscar a tela de login
    if (loadingSession) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#121212', color: '#fff', fontSize: '1.2rem' }}>
                Carregando Aplicação...
            </div>
        );
    }

    return (
        <>
            {usuario && <MenuComponent />} {/* Menu só aparece se o usuário estiver logado */}
            <div style={{ paddingTop: usuario ? '5rem' : '0' }}> {/* Ajuste conforme altura do seu menu */}
                <Routes>
                    <Route path="/login" element={<Login />} />
                    
                    {/* Rotas principais agora protegidas */}
                    <Route path="/" element={<RequireAuth><App /></RequireAuth>} />
                    <Route path="/pecas" element={<RequireAuth><CadastroPeca /></RequireAuth>} />
                    <Route
                        path="/admin/cadastro-usuario" // Rota para admin cadastrar usuários
                        element={
                            <RequireAuth>
                                {/* Verifica o papel adicionalmente, embora RequireAuth já garanta um usuário */}
                                { (usuario && usuario.role === 'administrador') ? <Cadastro /> : <Navigate to="/" replace /> }
                            </RequireAuth>
                        }
                    />
                    {/* Fallback para rotas não encontradas */}
                    <Route path="*" element={<Navigate to={usuario ? "/" : "/login"} replace />} />
                </Routes>
            </div>
        </>
    );
}

// Renderização Raiz do React
const rootElement = document.getElementById("root");
if (rootElement) {
    console.log("src/main.jsx (Frontend): #root encontrado. Renderizando aplicação...");
    createRoot(rootElement).render(
        <StrictMode>
            <HashRouter> {/* HashRouter engloba tudo para que os hooks de navegação funcionem em AuthProvider */}
                <AuthProvider>
                    <ApplicationLayout />
                </AuthProvider>
            </HashRouter>
        </StrictMode>
    );
    console.log("src/main.jsx (Frontend): Render da aplicação completa chamado.");
} else {
    console.error("src/main.jsx (Frontend): ERRO CRÍTICO - #root não encontrado no DOM! Verifique seu index.html.");
    document.body.innerHTML = '<div style="color: red; font-size: 24px; padding: 20px;">ERRO CRÍTICO: Elemento #root não encontrado no DOM. A aplicação React não pode iniciar. Verifique seu arquivo public/index.html ou similar.</div>';
}