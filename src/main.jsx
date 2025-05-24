// src/main.jsx (React - Ponto de Entrada)
import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
import { Home, Archive, Users, LogOut, KeyRound } from "lucide-react"; // UserPlus removido se GerenciarColaboradores usa Users
import "./styles/App.css"; // Assumindo que seu CSS global está aqui

import { AuthProvider, useAuth } from './contexts/AuthContext.jsx'; // Assumindo que está em src/contexts/

// Importando Páginas da pasta src/pages/
import LoginPage from "./pages/Login.jsx";
import DashboardPage from "./pages/App.jsx"; // Antigo App.jsx
import EstoquePage from "./pages/Estoque.jsx";     // Antigo Estoque.jsx
import GerenciarColaboradoresPage from "./pages/GerenciarColaboradoresPage.jsx"; // <<< NOVO E UNIFICADO
import ChangePasswordPage from "./pages/AlterarSenha.jsx"; // Antigo AlterarSenha.jsx

console.log("src/main.jsx (Frontend): Script carregado. vFinal_ComGerenciarColaboradores");

// Estilos do Menu (Completos)
const menuNavStyles = {
    backgroundColor: '#333',
    color: '#fff',
    padding: '0.8rem 1rem',
    display: 'flex',
    gap: '0.5rem', // Espaço entre os grupos de links principais
    alignItems: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    height: '3.5rem' // Altura fixa para o menu
};

const menuLinkStyles = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem', // Espaço entre ícone e texto no link
    padding: '0.5rem 0.8rem',
    borderRadius: '0.25rem',
    textDecoration: 'none',
    color: '#ddd',
    transition: 'background-color 0.2s ease-in-out, color 0.2s ease-in-out',
    fontSize: '0.9rem'
};

const menuActiveLinkStyles = {
    backgroundColor: '#007bff',
    color: '#fff'
};

function MenuComponent() {
    const location = useLocation();
    const { usuario, logout } = useAuth();

    const getLinkStyle = (path) => {
        let currentStyle = { ...menuLinkStyles };
        // Lógica para destacar link ativo (incluindo sub-rotas se path.length > 1)
        if (location.pathname === path || (path !== "/" && location.pathname.startsWith(path) && path.length > 1)) {
            currentStyle = { ...currentStyle, ...menuActiveLinkStyles };
        }
        return currentStyle;
    };

    if (!usuario) { // Não renderiza o menu se não houver usuário logado
        return null;
    }

    return (
        <nav style={menuNavStyles}>
            <Link to="/" style={getLinkStyle("/")}>
                <Home size={18} /> Dashboard
            </Link>
            <Link to="/estoque" style={getLinkStyle("/estoque")}>
                <Archive size={18} /> Estoque
            </Link>
            {/* Link para Gerenciar Colaboradores (Funcionários + Usuários do sistema) */}
            {/* Visível para Admin, Gerente, e Funcionário (para cadastrar outros funcionários sem login) */}
            {(usuario?.role === 'administrador' || usuario?.role === 'gerente' || usuario?.role === 'funcionario') && (
                <Link to="/colaboradores/gerenciar" style={getLinkStyle("/colaboradores/gerenciar")}>
                    <Users size={18} /> Colaboradores
                </Link>
            )}
            {/* TODO: Adicionar link para Ordens de Serviço aqui quando a tela estiver pronta */}

            {/* Botões à direita */}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Link to="/alterar-senha" style={getLinkStyle("/alterar-senha")}>
                    <KeyRound size={18} /> Alterar Senha
                </Link>
                <button
                    onClick={logout}
                    title="Sair do sistema"
                    style={{ ...menuLinkStyles, backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}
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

    if (loadingSession) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#121212', color: '#fff', fontSize: '1.2rem' }}>
                Verificando autenticação...
            </div>
        );
    }

    if (!usuario) {
        console.log("RequireAuth: Usuário não autenticado. Redirecionando para /login. Tentou acessar:", location.pathname);
        return <Navigate to="/login" state={{ from: location }} replace />;
    }
    // console.log("RequireAuth: Usuário autenticado, permitindo acesso a:", location.pathname);
    return children;
}

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
            <div style={{ paddingTop: usuario ? '3.5rem' : '0' }}> {/* Ajuste 3.5rem para a altura do seu menu */}
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    
                    <Route path="/" element={<RequireAuth><DashboardPage /></RequireAuth>} />
                    <Route path="/estoque" element={<RequireAuth><EstoquePage /></RequireAuth>} />
                    
                    {/* Rota Unificada para Gerenciar Colaboradores */}
                    <Route
                        path="/colaboradores/gerenciar"
                        element={
                            <RequireAuth>
                                {/* Admin, Gerente ou Funcionário podem acessar (permissões internas no componente) */}
                                { (usuario && (usuario.role === 'administrador' || usuario.role === 'gerente' || usuario.role === 'funcionario')) 
                                    ? <GerenciarColaboradoresPage /> 
                                    : <Navigate to="/" replace /> 
                                }
                            </RequireAuth>
                        }
                    />
                    <Route 
                        path="/alterar-senha" 
                        element={<RequireAuth><ChangePasswordPage /></RequireAuth>} 
                    />
                    {/* Rota para Ordens de Serviço (quando o componente estiver pronto) */}
                    {/* <Route path="/ordens-servico" element={<RequireAuth><OrdensServicoPage /></RequireAuth>} /> */}

                    {/* Fallback para rotas não encontradas */}
                    <Route path="*" element={<Navigate to={usuario ? "/" : "/login"} replace />} />
                </Routes>
            </div>
        </>
    );
}

const rootElement = document.getElementById("root");
if (rootElement) {
    console.log("src/main.jsx (Frontend): #root encontrado. Renderizando aplicação...");
    const root = createRoot(rootElement);
    root.render(
        <StrictMode>
            <HashRouter>
                <AuthProvider>
                    <ApplicationLayout />
                </AuthProvider>
            </HashRouter>
        </StrictMode>
    );
    console.log("src/main.jsx (Frontend): Render da aplicação completa chamado.");
} else {
    console.error("src/main.jsx (Frontend): ERRO CRÍTICO - #root não encontrado no DOM!");
    // Fallback visual se o #root não for encontrado
    document.body.innerHTML = '<div style="color: red; font-size: 24px; padding: 20px; text-align: center;">ERRO CRÍTICO: Elemento #root não encontrado no HTML. O sistema não pode ser iniciado.</div>';
}