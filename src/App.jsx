// src/App.jsx (Dashboard principal)
import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from './AuthContext.jsx';

console.log("App.jsx (Dashboard): Script carregado.");

function Card({ titulo, valor }) { /* ... (código do Card como antes) ... */ }
// Vou incluir o Card aqui para ser completo
function AppCard({ titulo, valor }) { // Renomeado para AppCard para evitar conflito se 'Card' for importado de outro lugar
    return (
        <div style={{ padding: 20, backgroundColor: '#1e1e1e', borderRadius: 10, textAlign: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.3)', color: '#ffffff', border: '1px solid #00bcd4' }}>
            <h3>{titulo}</h3>
            <p>{valor}</p>
        </div>
    );
}


export default function App() {
    const { usuario, logout } = useAuth();
    const [pecasRequisitadasData, setPecasRequisitadasData] = useState([]);

    useEffect(() => {
        let isMounted = true;
        if (usuario && usuario.id) {
            console.log("App.jsx (Dashboard): Usuário presente, buscando peças requisitadas. Usuário:", usuario);
            if (window.api && window.api.getRequestedPecas) {
                const fetchRequestedPecas = async () => {
                    try {
                        const data = await window.api.getRequestedPecas();
                        if (isMounted) {
                            console.log("App.jsx (Dashboard): Peças requisitadas recebidas:", data);
                            setPecasRequisitadasData(data || []);
                        }
                    } catch (error) {
                        console.error("App.jsx (Dashboard): Erro ao buscar peças requisitadas via IPC:", error);
                        if (isMounted) setPecasRequisitadasData([]);
                    }
                };
                fetchRequestedPecas();
            } else {
                if (isMounted) setPecasRequisitadasData([]);
                console.error("App.jsx (Dashboard): window.api.getRequestedPecas não disponível.");
            }
        } else {
             if (isMounted) {
                console.log("App.jsx (Dashboard): Nenhum usuário ou usuário sem ID, limpando dados de peças.");
                setPecasRequisitadasData([]);
             }
        }
        return () => { isMounted = false; };
    }, [usuario]);

    if (!usuario) {
        // Este caso deve ser prevenido pelo RequireAuth no main.jsx,
        // mas é uma salvaguarda.
        console.warn("App.jsx (Dashboard): Renderizando sem usuário. Isso não deveria acontecer se RequireAuth estiver funcionando.");
        return <div style={{color: 'white', padding: '20px'}}>Usuário não autenticado. Redirecionando...</div>;
    }

    console.log("App.jsx (Dashboard): Renderizando conteúdo do dashboard para:", usuario.username);
    const estatisticas = { pecasTrocadas: 58, manutencoes: 23, maquinaTop: 'Escavadeira #12', picoMovimento: '14h - 15h' };

    return (
        <div style={{ backgroundColor: '#121212', color: '#fff', minHeight: 'calc(100vh - 5rem)', padding: '1rem 2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.5rem' }}>
                    Bem-vindo, {usuario.username}{' '}
                    <span style={{ fontSize: '0.9rem', color: '#aaa', fontWeight: 'normal' }}>
                        ({usuario.role})
                    </span>
                </h2>
                {/* O botão de logout agora está no MenuComponent em main.jsx */}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                <AppCard titulo="Total de Peças Trocadas" valor={estatisticas.pecasTrocadas} />
                <AppCard titulo="Manutenções Realizadas" valor={estatisticas.manutencoes} />
                <AppCard titulo="Máquina com mais manutenção" valor={estatisticas.maquinaTop} />
                <AppCard titulo="Horário de Pico" valor={estatisticas.picoMovimento} />
            </div>

            <div style={{ backgroundColor: '#1e1e1e', padding: '1.5rem', borderRadius: 10 }}>
                <h3>Peças Mais Requisitadas</h3>
                {pecasRequisitadasData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={pecasRequisitadasData} margin={{ top: 20, right: 10, left: -25, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                            <XAxis dataKey="nome" stroke="#888" angle={-35} textAnchor="end" interval={0} height={80} />
                            <YAxis stroke="#888" />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#2c2c2c', color: '#fff', borderRadius: 5, border: '1px solid #555' }}
                                itemStyle={{ color: '#fff' }}
                                labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                            />
                            <Bar dataKey="quantidade" fill="#00bcd4" name="Quantidade" radius={[4, 4, 0, 0]} barSize={30} />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <p style={{ textAlign: 'center', color: '#777' }}>Nenhuma peça requisitada encontrada ou dados ainda carregando.</p>
                )}
            </div>
        </div>
    );
}