// src/main.jsx (React - Ponto de Entrada)
import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
// Ícones para o menu lateral agora estão dentro de SidebarMenu.jsx
import "./styles/global.css"; // Correto se global.css está em src/styles/

import { AuthProvider, useAuth } from './contexts/AuthContext.jsx'; // Caminho correto se AuthContext.jsx está em src/contexts/

// Importando Páginas da pasta src/pages/
import LoginPage from "./pages/Login.jsx";               // Assumindo que Login.jsx está em src/pages/
import DashboardPage from "./pages/App.jsx";             // Assumindo que App.jsx está em src/pages/
import EstoquePage from "./pages/Estoque.jsx";           // Assumindo que Estoque.jsx está em src/pages/
import GerenciarColaboradoresPage from "./pages/GerenciarColaboradoresPage.jsx"; // Assumindo que está em src/pages/
import ChangePasswordPage from "./pages/AlterarSenha.jsx"; // Assumindo que AlterarSenha.jsx está em src/pages/
// import OrdensServicoPage from "./pages/OrdensServicoPage.jsx"; // Quando criar

// Importando o novo componente de Menu Lateral
import SidebarMenu from "./components/layout/SidebarMenu.jsx"; // Assumindo que SidebarMenu.jsx está em src/components/layout/

console.log("src/main.jsx (Frontend): Script carregado. vSidebarImportsCorrigidos");

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
        return <Navigate to="/login" state={{ from: location }} replace />;
    }
    return children;
}

function ApplicationLayout() {
    const { usuario, loadingSession } = useAuth();
    const sidebarMinimizedWidth = '60px';

    if (loadingSession) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#121212', color: '#fff', fontSize: '1.2rem' }}>
                Carregando Aplicação...
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            {usuario && <SidebarMenu />}
            
            <main 
              id="main-content" 
              style={{ 
                flexGrow: 1, 
                paddingLeft: usuario ? sidebarMinimizedWidth : '0', 
                transition: 'padding-left 0.25s ease-in-out',
                width: usuario ? `calc(100% - ${sidebarMinimizedWidth})` : '100%',
                overflowY: 'auto',
                backgroundColor: '#121212'
              }}
            >
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/" element={<RequireAuth><DashboardPage /></RequireAuth>} />
                    <Route path="/estoque" element={<RequireAuth><EstoquePage /></RequireAuth>} />
                    <Route
                        path="/colaboradores/gerenciar"
                        element={
                            <RequireAuth>
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
                    <Route path="*" element={<Navigate to={usuario ? "/" : "/login"} replace />} />
                </Routes>
            </main>
        </div>
    );
}

const rootElement = document.getElementById("root");
if (rootElement) {
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
} else {
    console.error("src/main.jsx (Frontend): ERRO CRÍTICO - #root não encontrado!");
}