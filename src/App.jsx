import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from './supabase';
import { useNavigate } from 'react-router-dom';
import Login from './Login';

function Card({ titulo, valor }) {
    return (
        <div style={{ padding: 20, backgroundColor: '#1e1e1e', borderRadius: 10, textAlign: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.3)', color: '#ffffff', border: '1px solid #00bcd4' }}>
            <h3>{titulo}</h3>
            <p>{valor}</p>
        </div>
    );
}

export default function App() {
    const [usuario, setUsuario] = useState(null);
    const [pecasRequisitadasData, setPecasRequisitadasData] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) setUsuario(user);
        });

        // Solicita os dados de peças requisitadas ao processo principal
        if (window.electronAPI && usuario) {
            const fetchRequestedPecas = async () => {
                try {
                    const data = await window.electronAPI.fetchRequestedPecas();
                    setPecasRequisitadasData(data);
                } catch (error) {
                    console.error("Erro ao buscar peças requisitadas:", error);
                }
            };
            fetchRequestedPecas();
        }
    }, [usuario]);

    const logout = async () => {
        await supabase.auth.signOut();
        setUsuario(null);
        navigate('/login');
    };

    if (!usuario) return <Login setUsuario={setUsuario} />;

    // Simulação de dados (serão substituídos por dados reais do banco)
    const estatisticas = { pecasTrocadas: 58, manutencoes: 23, maquinaTop: 'Escavadeira #12', picoMovimento: '14h - 15h' };

    return (
        <div style={{ padding: 30, backgroundColor: '#121212', color: '#fff', minHeight: '100vh' }}>
            <h2>Bem-vindo, {usuario?.email}</h2>
            <button onClick={logout} style={{ float: 'right', backgroundColor: '#f44336', color: '#fff', padding: '8px 16px', border: 'none', borderRadius: 5 }}>
                Sair
            </button>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginTop: 60, marginBottom: 30 }}>
                <Card titulo="Total de Peças Trocadas" valor={estatisticas.pecasTrocadas} />
                <Card titulo="Manutenções Realizadas" valor={estatisticas.manutencoes} />
                <Card titulo="Máquina com mais manutenção" valor={estatisticas.maquinaTop} />
                <Card titulo="Horário de Pico" valor={estatisticas.picoMovimento} />
            </div>

            {/* Gráfico de Peças Mais Requisitadas */}
            <div style={{ backgroundColor: '#1e1e1e', padding: 20, borderRadius: 10, marginTop: 30 }}>
                <h3>Peças Mais Requisitadas</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={pecasRequisitadasData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                        <XAxis dataKey="nome" stroke="#888" />
                        <YAxis stroke="#888" />
                        <Tooltip contentStyle={{ backgroundColor: '#333', color: '#fff', borderRadius: 5, border: '1px solid #555' }}
                            wrapperStyle={{ backgroundColor: 'transparent', border: 'none', boxShadow: 'none' }}
                            itemStyle={{ color: '#fff' }}
                            labelStyle={{ color: '#fff' }} />
                        <Bar dataKey="quantidade" fill="#00bcd4" name="Quantidade" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}