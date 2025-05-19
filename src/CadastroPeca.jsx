// src/CadastroPeca.jsx
import React, { useEffect, useState, useMemo } from "react";
import { PackageCheck, Edit, Trash2, Search } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

// ATENÇÃO: Verifique se estes caminhos e extensões (.jsx ou .js) estão corretos
// para a localização dos seus componentes de UI.
// Assumindo que 'components/ui/' está DENTRO de 'src/'
import { Card, CardContent } from "./components/ui/card.jsx";
import { Button } from "./components/ui/button.jsx";
import { Input } from "./components/ui/input.jsx";
import { Label } from "./components/ui/label.jsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./components/ui/table.jsx";
// A importação do Select foi removida, pois não é usada neste formulário.

import styles from "./CadastroPeca.module.css";

console.log("CadastroPeca.jsx: Script carregado (vFinalCompleto_GraficoAntes)");

// Função auxiliar para juntar classes
function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function CadastroPeca() {
    const [pecas, setPecas] = useState([]);
    const [form, setForm] = useState({ nome: "", tipo: "", fabricante: "", estoque_atual: 0, estoque_minimo: 0 });
    const [editingId, setEditingId] = useState(null);
    const [activeTab, setActiveTab] = useState("listagem");
    const [mensagemStatus, setMensagemStatus] = useState({ texto: "", tipo: "" });
    const [termoBusca, setTermoBusca] = useState("");

    const fullCheckApi = () => {
        if (!window.api) {
            console.error("CadastroPeca.jsx: window.api não está disponível! Verifique o preload.js.");
            setMensagemStatus({ texto: "Erro de comunicação com o sistema.", tipo: "erro" });
            return false;
        }
        return true;
    };

    const fullFetchPecasLocal = async () => {
        if (!fullCheckApi() || !window.api.getAllPecas) {
            console.error("CadastroPeca.jsx: window.api.getAllPecas não disponível.");
            setMensagemStatus({ texto: "Falha ao carregar API de peças.", tipo: "erro" });
            return;
        }
        console.log("CadastroPeca.jsx: Buscando peças...");
        try {
            const data = await window.api.getAllPecas();
            setPecas(data || []);
            console.log("CadastroPeca.jsx: Peças recebidas:", data ? data.length : 0);
        } catch (error) {
            console.error("Erro ao buscar peças:", error);
            setMensagemStatus({ texto: "Falha ao buscar peças: " + error.message, tipo: "erro" });
        }
    };

    const fullHandleSubmit = async (e) => {
        e.preventDefault();
        if (!fullCheckApi()) return;
        setMensagemStatus({ texto: "", tipo: "" });

        if (!form.nome.trim()) {
            setMensagemStatus({ texto: "O nome da peça é obrigatório.", tipo: "erro" });
            return;
        }
        console.log("CadastroPeca.jsx: Enviando formulário:", form, "Editing ID:", editingId);

        try {
            if (editingId) {
                if (!window.api.updatePeca) { 
                    console.error("API updatePeca não existe"); 
                    setMensagemStatus({ texto: "Funcionalidade de atualizar peça indisponível.", tipo: "erro" });
                    return; 
                }
                await window.api.updatePeca(editingId, form);
                setMensagemStatus({ texto: "Peça atualizada com sucesso!", tipo: "sucesso" });
            } else {
                if (!window.api.insertPeca) { 
                    console.error("API insertPeca não existe"); 
                    setMensagemStatus({ texto: "Funcionalidade de inserir peça indisponível.", tipo: "erro" });
                    return; 
                }
                await window.api.insertPeca(form);
                setMensagemStatus({ texto: "Peça cadastrada com sucesso!", tipo: "sucesso" });
            }
            setForm({ nome: "", tipo: "", fabricante: "", estoque_atual: 0, estoque_minimo: 0 });
            setEditingId(null);
            await fullFetchPecasLocal(); // Rebusca as peças para atualizar a lista e o gráfico
            setActiveTab("listagem");
        } catch (error) {
            console.error("Erro ao salvar peça:", error);
            setMensagemStatus({ texto: "Falha ao salvar peça: " + error.message, tipo: "erro" });
        }
    };

    const fullHandleEdit = (p) => {
        console.log("CadastroPeca.jsx: Editando peça:", p);
        setForm({
            nome: p.nome || "", tipo: p.tipo || "", fabricante: p.fabricante || "",
            estoque_atual: p.estoque_atual || 0, estoque_minimo: p.estoque_minimo || 0,
        });
        setEditingId(p.id);
        setActiveTab("cadastro");
        setMensagemStatus({ texto: "", tipo: "" });
    };

    const fullHandleDelete = async (id) => {
        if (!fullCheckApi() || !window.api.deletePeca) { 
            console.error("API deletePeca não existe"); 
            setMensagemStatus({ texto: "Funcionalidade de deletar peça indisponível.", tipo: "erro" }); 
            return; 
        }
        if (!window.confirm("Tem certeza que deseja excluir esta peça? Esta ação não pode ser desfeita.")) return;
        console.log("CadastroPeca.jsx: Deletando peça ID:", id);
        try {
            await window.api.deletePeca(id);
            await fullFetchPecasLocal(); // Rebusca as peças para atualizar a lista e o gráfico
            setMensagemStatus({ texto: "Peça excluída com sucesso!", tipo: "sucesso" });
        } catch (error) {
            console.error("Erro ao deletar peça:", error);
            setMensagemStatus({ texto: "Falha ao deletar peça: " + error.message, tipo: "erro" });
        }
    };
    
    const fullResetFormAndTab = (tabName = "listagem") => {
        setEditingId(null);
        setForm({ nome: "", tipo: "", fabricante: "", estoque_atual: 0, estoque_minimo: 0 });
        setActiveTab(tabName);
        setMensagemStatus({ texto: "", tipo: "" });
        setTermoBusca(""); // Limpa a busca ao trocar de aba ou resetar
    };

    useEffect(() => {
        if (fullCheckApi()) {
            fullFetchPecasLocal();
        }
    }, []); // Roda ao montar o componente

    const pecasFiltradas = useMemo(() => {
        if (!termoBusca.trim()) {
            return pecas;
        }
        return pecas.filter(peca =>
            peca.nome && peca.nome.toLowerCase().includes(termoBusca.toLowerCase())
        );
    }, [pecas, termoBusca]);

    return (
        <div className={styles.container}>
            <nav className={styles.nav}>
                <div className={styles.navTitleContainer}>
                    <PackageCheck size={28} className={styles.navIcon} />
                    <h2 className={styles.navTitle}>Estoque de Peças</h2>
                </div>
            </nav>

            {mensagemStatus.texto && (
                <p className={`${styles.statusMessage} ${mensagemStatus.tipo === "erro" ? styles.errorMessage : styles.successMessage}`}>
                    {mensagemStatus.texto}
                </p>
            )}

            <div className={styles.tabsList}>
                <button
                    className={`${styles.tabTrigger} ${activeTab === "listagem" ? styles.tabTriggerActive : ""}`}
                    onClick={() => fullResetFormAndTab("listagem")}
                >
                    📦 Listagem & Gráfico
                </button>
                <button
                    className={`${styles.tabTrigger} ${activeTab === "cadastro" ? styles.tabTriggerActive : ""}`}
                    onClick={() => fullResetFormAndTab("cadastro")}
                >
                    ✍️ {editingId ? "Editar Peça" : "Nova Peça"}
                </button>
            </div>

            {activeTab === "listagem" && (
                <div className={styles.tabsContent}>
                    <div className={styles.searchContainer}>
                        <Label htmlFor="buscaPeca" className={styles.searchLabel}>Buscar por Nome:</Label>
                        <div className={styles.searchInputWrapper}>
                            <Search size={18} className={styles.searchIcon} />
                            <Input
                                type="text"
                                id="buscaPeca"
                                placeholder="Digite o nome da peça..."
                                value={termoBusca}
                                onChange={(e) => setTermoBusca(e.target.value)}
                                className={styles.searchInput}
                            />
                        </div>
                    </div>

                    {/* GRÁFICO ANTES DA TABELA */}
                    {pecasFiltradas.length > 0 && (
                         <Card className={classNames(styles.card, styles.graficoCard)}>
                            <CardContent className={styles.cardContent}>
                                <h2 className={styles.chartTitle}>📊 Estoque Atual vs. Estoque Mínimo (Visão Geral)</h2>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={pecasFiltradas} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke={"#444"}/>
                                        <XAxis dataKey="nome" stroke={"#888"} tick={{ fontSize: 12 }} interval={0} angle={-30} textAnchor="end" height={70} />
                                        <YAxis stroke={"#888"} tick={{ fontSize: 12 }} />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#333', color: '#fff', borderRadius: 5, border: `1px solid #444` }}
                                            cursor={{ fill: 'rgba(100,100,100,0.1)' }}
                                        />
                                        <Bar dataKey="estoque_atual" fill={"#22d3ee"} name="Estoque Atual" radius={[4,4,0,0]} />
                                        <Bar dataKey="estoque_minimo" fill={"#f43f5e"} name="Estoque Mínimo" radius={[4,4,0,0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    )}

                    <Card className={styles.card}>
                        <CardContent className={classNames(styles.cardContent, styles.cardContentTableWrapper)}>
                            {/* Passando styles.table para tableClassName do componente Table */}
                            <Table tableClassName={styles.table} className={styles.tableContainerDefaultFromUi}>
                                <TableHeader className={styles.thead}>
                                    <TableRow className={styles.tableRow}>
                                        <TableHead className={styles.th}>Nome</TableHead>
                                        <TableHead className={styles.th}>Tipo</TableHead>
                                        <TableHead className={styles.th}>Fabricante</TableHead>
                                        <TableHead className={classNames(styles.th, styles.thNumeric)}>Estoque</TableHead>
                                        <TableHead className={classNames(styles.th, styles.thNumeric)}>Mínimo</TableHead>
                                        <TableHead className={classNames(styles.th, styles.actionsHeader)}>Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pecasFiltradas.length === 0 && ( // Verifica pecasFiltradas aqui também
                                        <TableRow className={styles.tableRow}>
                                            <TableCell colSpan={6} className={classNames(styles.td, styles.emptyTableCell)}>
                                                {termoBusca ? "Nenhuma peça encontrada para sua busca." : "Nenhuma peça cadastrada."}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {pecasFiltradas.map((p) => (
                                        <TableRow key={p.id} className={styles.tableRow}>
                                            <TableCell className={styles.td}>{p.nome}</TableCell>
                                            <TableCell className={styles.td}>{p.tipo}</TableCell>
                                            <TableCell className={styles.td}>{p.fabricante}</TableCell>
                                            <TableCell className={classNames(styles.td, styles.tdNumeric)}>{p.estoque_atual}</TableCell>
                                            <TableCell className={classNames(styles.td, styles.tdNumeric)}>{p.estoque_minimo}</TableCell>
                                            <TableCell className={classNames(styles.td, styles.actions)}>
                                                <Button variant="outline" size="sm" onClick={() => fullHandleEdit(p)} className={styles.actionButton}>
                                                    <Edit size={14} className={styles.buttonIcon} /> Editar
                                                </Button>
                                                <Button variant="destructive" size="sm" onClick={() => fullHandleDelete(p.id)} className={styles.actionButton}>
                                                    <Trash2 size={14} className={styles.buttonIcon} /> Excluir
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            )}

            {activeTab === "cadastro" && (
                <div className={classNames(styles.tabsContent, styles.formContainer)}> 
                    <Card className={styles.card}>
                        <CardContent className={styles.cardContent}>
                            <h3 className={styles.formTitle}>
                                {editingId ? "Editar Peça" : "Cadastrar Nova Peça"}
                            </h3>
                            <form onSubmit={fullHandleSubmit} className={styles.form}>
                                <div className={styles.formRow}>
                                    <div className={`${styles.formGroup} ${styles.formGroupFlex2}`} >
                                      <Label className={styles.label} htmlFor="nomePeca">Nome da Peça</Label>
                                      <Input id="nomePeca" className={styles.input} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
                                    </div>
                                    <div className={`${styles.formGroup} ${styles.formGroupFlex1}`} >
                                      <Label className={styles.label} htmlFor="tipoPeca">Tipo</Label>
                                      <Input id="tipoPeca" className={styles.input} value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} />
                                    </div>
                                </div>
                                <div className={styles.formRow}>
                                    <div className={`${styles.formGroup} ${styles.formGroupFlex2}`}>
                                      <Label className={styles.label} htmlFor="fabricantePeca">Fabricante</Label>
                                      <Input id="fabricantePeca" className={styles.input} value={form.fabricante} onChange={(e) => setForm({ ...form, fabricante: e.target.value })} />
                                    </div>
                                </div>
                                <div className={styles.formRow}>
                                    <div className={`${styles.formGroup} ${styles.formGroupFlex1}`}>
                                      <Label className={styles.label} htmlFor="estoqueAtualPeca">Estoque Atual</Label>
                                      <Input id="estoqueAtualPeca" className={styles.input} type="number" min="0" value={form.estoque_atual} onChange={(e) => setForm({ ...form, estoque_atual: parseInt(e.target.value) || 0 })} required />
                                    </div>
                                    <div className={`${styles.formGroup} ${styles.formGroupFlex1}`}>
                                      <Label className={styles.label} htmlFor="estoqueMinimoPeca">Estoque Mínimo</Label>
                                      <Input id="estoqueMinimoPeca" className={styles.input} type="number" min="0" value={form.estoque_minimo} onChange={(e) => setForm({ ...form, estoque_minimo: parseInt(e.target.value) || 0 })} required />
                                    </div>
                                </div>
                                <div className={styles.submitButtonContainer}>
                                    <Button type="submit" className={`${styles.submitButton}`}>{editingId ? "Atualizar Peça" : "Salvar Nova Peça"}</Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}