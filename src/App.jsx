import React, { useEffect, useState } from 'react';
import { supabase } from './supabase';
import Login from './Login';

export default function App() {
  const [usuario, setUsuario] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUsuario(user);
    });
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setUsuario(null);
  };

  if (!usuario) return <Login setUsuario={setUsuario} />;

  // Simulação de dados
  const estatisticas = { pecasTrocadas: 58, manutencoes: 23, maquinaTop: 'Escavadeira #12', picoMovimento: '14h - 15h' };
  const dadosGrafico = [
    { nome: 'Seg', pecas: 10 },
    { nome: 'Ter', pecas: 20 },
    { nome: 'Qua', pecas: 5 },
    { nome: 'Qui', pecas: 15 },
    { nome: 'Sex', pecas: 8 },
  ];

  return (
    <div style={{ padding: 30, backgroundColor: '#121212', color: '#fff', minHeight: '100vh' }}>
      <h2>Bem-vindo, {usuario.email}</h2>
      <button onClick={logout} style={{ float: 'right', backgroundColor: '#f44336', color: '#fff', padding: '8px 16px', border: 'none', borderRadius: 5 }}>
        Sair
      </button>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 20,
        marginTop: 60,
        marginBottom: 30
      }}>
        <Card titulo="Total de Peças Trocadas" valor={estatisticas.pecasTrocadas} />
        <Card titulo="Manutenções Realizadas" valor={estatisticas.manutencoes} />
        <Card titulo="Máquina com mais manutenção" valor={estatisticas.maquinaTop} />
        <Card titulo="Horário de Pico" valor={estatisticas.picoMovimento} />
      </div>
    </div>
  );
}

function Card({ titulo, valor }) {
  return (
    <div style={{
      padding: 20,
      backgroundColor: '#1e1e1e',
      borderRadius: 10,
      textAlign: 'center',
      boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
      color: '#ffffff',
      border: '1px solid #00bcd4',
    }}>
      <h3>{titulo}</h3>
      <p>{valor}</p>
    </div>
  );
}
