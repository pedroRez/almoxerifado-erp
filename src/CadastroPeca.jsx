import React, { useEffect, useState } from "react";
import { Home, Settings, PackageCheck } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./components/ui/table";
import styles from "./CadastroPeca.module.css";

export default function CadastroPeca() {
    const [pecas, setPecas] = useState([]);
    const [form, setForm] = useState({ nome: "", tipo: "", fabricante: "", estoque_atual: 0, estoque_minimo: 0 });
    const [editingId, setEditingId] = useState(null);
    const [activeTab, setActiveTab] = useState("listagem");

    const fetchPecas = async () => {
        try {
            const data = await window.electronAPI.fetchAllPecas();
            setPecas(data);
        } catch (error) {
            console.error("Erro ao buscar peças:", error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await window.electronAPI.updatePeca(editingId, form);
            } else {
                await window.electronAPI.insertPeca(form);
            }
            setForm({ nome: "", tipo: "", fabricante: "", estoque_atual: 0, estoque_minimo: 0 });
            setEditingId(null);
            await fetchPecas();
            setActiveTab("listagem");
        } catch (error) {
            console.error("Erro ao salvar peça:", error);
        }
    };

    const handleEdit = (p) => {
        setForm(p);
        setEditingId(p.id);
        setActiveTab("cadastro");
    };

    const handleDelete = async (id) => {
        try {
            await window.electronAPI.deletePeca(id);
            await fetchPecas();
        } catch (error) {
            console.error("Erro ao deletar peça:", error);
        }
    };

    useEffect(() => {
        fetchPecas();
    }, []);

    return (
        <div className={styles.container}>
            <nav className={styles.nav}>
                <h2 className={styles.navTitle}>Gerenciamento de Peças</h2>
                <div className="flex gap-4">
                    <button className={styles.navButton} onClick={() => console.log('Início')}>
                        <Home size={16} /> Início
                    </button>
                    <button className={`${styles.navButton} text-cyan-400`}>
                        <PackageCheck size={16} /> Peças
                    </button>
                    <button className={styles.navButton} onClick={() => console.log('Configurações')}>
                        <Settings size={16} /> Configurações
                    </button>
                </div>
            </nav>

            <div className={styles.tabsList}>
                <button
                    className={`${styles.tabTrigger} ${activeTab === "listagem" ? styles.tabTriggerActive : ""}`}
                    onClick={() => setActiveTab("listagem")}
                >
                    📦 Listagem
                </button>
                <button
                    className={`${styles.tabTrigger} ${activeTab === "cadastro" ? styles.tabTriggerActive : ""}`}
                    onClick={() => setActiveTab("cadastro")}
                >
                    ✍️ Cadastro
                </button>
            </div>

            {activeTab === "listagem" && (
                <div className={styles.tabsContent}>
                    <Card>
                        <CardContent className="p-4">
                            <table className={styles.table}>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className={styles.th}>Nome</TableHead>
                                        <TableHead className={styles.th}>Tipo</TableHead>
                                        <TableHead className={styles.th}>Fabricante</TableHead>
                                        <TableHead className={styles.th}>Estoque</TableHead>
                                        <TableHead className={styles.th}>Estoque Mínimo</TableHead>
                                        <TableHead className={`${styles.th} text-right`}>Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pecas.map((p) => (
                                        <TableRow key={p.id}>
                                            <TableCell className={styles.td}>{p.nome}</TableCell>
                                            <TableCell className={styles.td}>{p.tipo}</TableCell>
                                            <TableCell className={styles.td}>{p.fabricante}</TableCell>
                                            <TableCell className={styles.td}>{p.estoque_atual}</TableCell>
                                            <TableCell className={styles.td}>{p.estoque_minimo}</TableCell>
                                            <TableCell className={`${styles.td} ${styles.actions}`}>
                                                <Button variant="outline" size="sm" onClick={() => handleEdit(p)}>Editar</Button>
                                                <Button variant="destructive" size="sm" onClick={() => handleDelete(p.id)}>Excluir</Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </table>
                        </CardContent>
                    </Card>
                </div>
            )}

            {activeTab === "cadastro" && (
                <div className={styles.tabsContent}>
                    <Card>
                        <CardContent className="p-4">
                            <h3 className="text-lg font-semibold mb-4">{editingId ? "Editar Peça" : "Cadastrar Nova Peça"}</h3>
                            <form onSubmit={handleSubmit} className={styles.form}>
                                <div><Label className={styles.label}>Nome</Label><Input className={styles.input} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required /></div>
                                <div><Label className={styles.label}>Tipo</Label><Input className={styles.input} value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} required /></div>
                                <div><Label className={styles.label}>Fabricante</Label><Input className={styles.input} value={form.fabricante} onChange={(e) => setForm({ ...form, fabricante: e.target.value })} required /></div>
                                <div><Label className={styles.label}>Estoque Atual</Label><Input className={styles.input} type="number" value={form.estoque_atual} onChange={(e) => setForm({ ...form, estoque_atual: parseInt(e.target.value) })} required /></div>
                                <div><Label className={styles.label}>Estoque Mínimo</Label><Input className={styles.input} type="number" value={form.estoque_minimo} onChange={(e) => setForm({ ...form, estoque_minimo: parseInt(e.target.value) })} required /></div>
                                <Button type="submit" className={styles.submitButton}>{editingId ? "Atualizar Peça" : "Cadastrar Peça"}</Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            )}

            <Card className="mt-6">
                <CardContent className="p-6">
                    <h2 className="text-xl mb-4 text-cyan-400">📊 Estoque vs Estoque Mínimo</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={pecas}>
                            <XAxis dataKey="nome" stroke="#888" />
                            <YAxis stroke="#888" />
                            <Tooltip contentStyle={{ backgroundColor: '#333', color: '#fff', borderRadius: 5 }} />
                            <Bar dataKey="estoque_atual" fill="#22d3ee" name="Estoque Atual" />
                            <Bar dataKey="estoque_minimo" fill="#f43f5e" name="Estoque Mínimo" />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
}