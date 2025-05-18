import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import { Home, Package } from "lucide-react"; // Ícones minimalistas
import "./index.css"; // Certifique-se de que este arquivo ainda existe

import App from "./App.jsx";
import Cadastro from "./Cadastro.jsx";
import CadastroPeca from "./CadastroPeca.jsx";

// Estilos CSS para o Menu
const navStyles = {
    backgroundColor: '#333',
    color: '#fff',
    padding: '1rem',
    display: 'flex',
    gap: '1rem',
    justifyContent: 'center',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
};

const linkStyles = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    borderRadius: '0.25rem',
    textDecoration: 'none',
    color: '#ddd',
    transition: 'background-color 0.2s ease-in-out, color 0.2s ease-in-out',
};

const activeLinkStyles = {
    backgroundColor: '#007bff',
    color: '#fff',
};

const hoverLinkStyles = {
    backgroundColor: '#555',
    color: '#fff',
};

function Menu() {
    const location = useLocation();
    const hideMenuRoutes = ["/login", "/cadastro"];

    if (hideMenuRoutes.includes(location.pathname)) {
        return null;
    }

    return (
        <nav style={navStyles}>
            <Link
                to="/"
                style={{ ...linkStyles, ...(location.pathname === "/" ? activeLinkStyles : {}), ...hoverLinkStyles }}
            >
                <Home size={20} />
                Dashboard
            </Link>
            <Link
                to="/pecas"
                style={{ ...linkStyles, ...(location.pathname === "/pecas" ? activeLinkStyles : {}), ...hoverLinkStyles }}
            >
                <Package size={20} />
                Cadastro de Peças
            </Link>
            {/* Adicione mais links de navegação aqui conforme necessário */}
        </nav>
    );
}

function AppWrapper() {
    return (
        <>
            <Menu />
            <div style={{ paddingTop: '4rem' }}> {/* Ajuste o padding para não ficar atrás do menu fixo */}
                <Routes>
                    <Route path="/" element={<App />} />
                    <Route path="/cadastro" element={<Cadastro />} />
                    <Route path="/pecas" element={<CadastroPeca />} />
                    {/* Outras rotas aqui */}
                </Routes>
            </div>
        </>
    );
}

createRoot(document.getElementById("root")).render(
    <StrictMode>
        <BrowserRouter>
            <AppWrapper />
        </BrowserRouter>
    </StrictMode>
);