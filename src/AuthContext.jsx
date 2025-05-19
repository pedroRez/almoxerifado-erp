// src/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

console.log("AuthContext.jsx: Script carregado.");

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const navigate = useNavigate();
  const location = useLocation(); // Para obter a rota de origem ao redirecionar do login

  useEffect(() => {
    let isMounted = true;
    async function checkSession() {
      console.log("AuthContext: Verificando sessão inicial...");
      if (window.api && window.api.getSession) {
        try {
          const session = await window.api.getSession();
          if (isMounted) {
            if (session && session.id) {
              console.log("AuthContext: Sessão ativa encontrada na inicialização:", session);
              setUsuario(session);
            } else {
              console.log("AuthContext: Nenhuma sessão ativa na inicialização.");
              setUsuario(null);
            }
          }
        } catch (error) {
          console.error("AuthContext: Erro ao buscar sessão na inicialização:", error);
          if (isMounted) setUsuario(null);
        } finally {
          if (isMounted) setLoadingSession(false);
        }
      } else {
        console.error("AuthContext: window.api.getSession não disponível na inicialização.");
        if (isMounted) {
            setUsuario(null);
            setLoadingSession(false);
        }
      }
    }
    checkSession();
    return () => { isMounted = false; };
  }, []);

  const login = async (credentials) => {
    console.log("AuthContext: Tentando login com credenciais:", credentials.username);
    if (!window.api || !window.api.login) {
      console.error("AuthContext: window.api.login não disponível.");
      throw new Error('API de login não está disponível.');
    }
    try {
      const userSession = await window.api.login(credentials);
      if (userSession && userSession.id) {
        setUsuario(userSession);
        console.log("AuthContext: Login bem-sucedido, usuário:", userSession);
        const from = location.state?.from?.pathname || "/"; // Redireciona para rota anterior ou home
        navigate(from, { replace: true });
        return userSession;
      }
      // O backend deve lançar erro se o login falhar, que será pego no catch abaixo.
      // Mas, por via das dúvidas:
      throw new Error('Falha ao obter dados do usuário válidos após login.');
    } catch (error) {
      console.error("AuthContext: Erro na função login:", error);
      setUsuario(null); // Garante que usuário é null em caso de falha
      throw error; // Re-lança o erro para o componente Login tratar (ex: mostrar mensagem)
    }
  };

  const logout = async () => {
    console.log("AuthContext: Tentando logout...");
    if (!window.api || !window.api.logout) {
      console.error("AuthContext: window.api.logout não disponível.");
      setUsuario(null);
      navigate('/login');
      return;
    }
    try {
      await window.api.logout();
      console.log("AuthContext: Logout realizado com sucesso via API.");
    } catch (error) {
      console.error("AuthContext: Erro no logout via API:", error);
    } finally {
      // Sempre limpa o usuário e navega para login, mesmo se o logout da API falhar
      setUsuario(null);
      navigate('/login', { replace: true });
    }
  };

  const value = {
    usuario,
    loadingSession,
    login,
    logout,
    // setUsuario // Expor setUsuario diretamente é geralmente evitado; ações como login/logout devem gerenciá-lo.
                // Se Login.jsx ainda precisar dele diretamente, pode ser um sinal para refatorar Login.jsx
                // para usar a função login do contexto.
  };

  return (
    <AuthContext.Provider value={value}>
      {!loadingSession ? children : (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#121212', color: '#fff', fontSize: '1.2rem' }}>
            Carregando AuthContext...
        </div>
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) { // Alterado para undefined, pois null é um valor válido inicial para o contexto
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}