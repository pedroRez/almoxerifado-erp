// src/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } // Removido useLocation daqui, pois não vamos mais usar location.state.from no login
from 'react-router-dom';

console.log("AuthContext.jsx: Script carregado (vComLoginDiretoDashboard).");

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    async function checkSession() {
      console.log("AuthContext: Verificando sessão inicial...");
      if (window.api && window.api.getSession) {
        try {
          const session = await window.api.getSession();
          if (isMounted) {
            if (session && session.id) {
              setUsuario(session);
            } else {
              setUsuario(null);
            }
          }
        } catch (error) {
          if (isMounted) setUsuario(null);
          console.error("AuthContext: Erro ao buscar sessão:", error);
        } finally {
          if (isMounted) setLoadingSession(false);
        }
      } else {
        if (isMounted) {
            setUsuario(null);
            setLoadingSession(false);
        }
        console.error("AuthContext: window.api.getSession não disponível.");
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
        // SEMPRE NAVEGA PARA O DASHBOARD (/) APÓS LOGIN
        navigate('/', { replace: true }); 
        return userSession;
      }
      throw new Error('Falha ao obter dados do usuário válidos após login.');
    } catch (error) {
      console.error("AuthContext: Erro na função login:", error);
      setUsuario(null);
      throw error;
    }
  };

  const logout = async () => {
    console.log("AuthContext: Tentando logout...");
    if (!window.api || !window.api.logout) {
      console.error("AuthContext: window.api.logout não disponível.");
      setUsuario(null);
      navigate('/login', { replace: true }); // Garante navegação para login
      return;
    }
    try {
      await window.api.logout();
      console.log("AuthContext: Logout realizado com sucesso via API.");
    } catch (error) {
      console.error("AuthContext: Erro no logout via API:", error);
    } finally {
      setUsuario(null);
      navigate('/login', { replace: true }); // Sempre navega para /login
    }
  };

  const value = {
    usuario,
    loadingSession,
    login,
    logout,
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
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}