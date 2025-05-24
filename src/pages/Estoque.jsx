// src/Estoque.jsx
import React, { useEffect, useState, useMemo } from "react";
import { Archive, Edit, Trash2, Search, PackagePlus, BarChart3, List } from "lucide-react"; // Adicionado BarChart3, List
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
// Certifique-se que os caminhos para seus componentes UI estão corretos
import { Card, CardContent } from "../components/ui/card.jsx";
import { Button } from "../components/ui/button.jsx";
import { Input } from "../components/ui/input.jsx";
import { Label } from "../components/ui/label.jsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table.jsx";
import styles from "../styles/Estoque.module.css";
import { useAuth } from '../contexts/AuthContext.jsx';

console.log("Estoque.jsx: Script carregado (vComAbasSeparadas_BuscaNoCard)");

function classNames(...classes) { return classes.filter(Boolean).join(' '); }

export default function Estoque() {
    const { usuario: currentUser } = useAuth();
    const [itensEstoque, setItensEstoque] = useState([]);
    const [form, setForm] = useState({
        codigo_peca: "", nome: "", classificacao: "", fabricante: "", aplicacao: "",   
        estoque_atual: 0, estoque_minimo: 0, valor_medio_unitario: 0, data_lancamento: "" 
    });
    const [editingItem, setEditingItem] = useState(null);
    const [activeTab, setActiveTab] = useState("listagem"); // listagem, grafico, cadastro
    const [mensagemStatus, setMensagemStatus] = useState({ texto: "", tipo: "" });
    const [termoBusca, setTermoBusca] = useState("");

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm(prevForm => ({
            ...prevForm,
            [name]: type === 'checkbox' ? checked : (type === 'date' && value === '' ? null : value)
        }));
    };

    const fullCheckApi = () => {
        if (!window.api) {
            console.error("Estoque.jsx: window.api não está disponível! Verifique o preload.js.");
            setMensagemStatus({ texto: "Erro de comunicação com o sistema.", tipo: "erro" });
            return false;
        }
        return true;
    };

    const fullFetchPecasLocal = async () => {
        if (!fullCheckApi() || !window.api.getAllPecas) {
            console.error("Estoque.jsx: window.api.getAllPecas não disponível.");
            setMensagemStatus({ texto: "Falha ao carregar API de peças.", tipo: "erro" });
            return;
        }
        console.log("Estoque.jsx: Buscando peças...");
        try {
            const data = await window.api.getAllPecas();
            setItensEstoque(data || []);
            console.log("Estoque.jsx: Peças recebidas:", data ? data.length : 0);
        } catch (error) {
            console.error("Erro ao buscar peças:", error);
            setMensagemStatus({ texto: "Falha ao buscar peças: " + error.message, tipo: "erro" });
        }
    };

    const resetForm = () => {
        setForm({ 
            codigo_peca: "", nome: "", classificacao: "", fabricante: "", 
            aplicacao: "", estoque_atual: 0, estoque_minimo: 0, 
            valor_medio_unitario: 0, data_lancamento: "" 
        });
        setEditingItem(null);
    };
    
    const fullHandleSubmit = async (e) => {
        e.preventDefault();
        if (!fullCheckApi()) return;
        setMensagemStatus({ texto: "", tipo: "" });

        if (!form.nome.trim()) {
            setMensagemStatus({ texto: "Nome da Peça (Descrição) é obrigatório.", tipo: "erro" });
            return;
        }
        if (!editingItem) {
            if (form.estoque_atual === undefined || form.estoque_atual < 0) {
                setMensagemStatus({ texto: "Saldo inicial obrigatório e não negativo.", tipo: "erro" }); return;
            }
            if (form.valor_medio_unitario === undefined || form.valor_medio_unitario < 0) {
                setMensagemStatus({ texto: "Custo unitário do saldo inicial obrigatório.", tipo: "erro" }); return;
            }
        }

        const payload = {
            codigo_fixo: editingItem ? editingItem.codigo_fixo : undefined,
            codigo_peca: form.codigo_peca, nome: form.nome, tipo: form.classificacao, 
            fabricante: form.fabricante, aplicacao: form.aplicacao,
            estoque_atual: form.estoque_atual, estoque_minimo: form.estoque_minimo,
            valor_medio_unitario: form.valor_medio_unitario, 
            data_lancamento: form.data_lancamento || null,
            usuario_id: currentUser?.id 
        };
        console.log("Estoque.jsx: Enviando formulário:", payload, "Item em Edição:", editingItem);

        try {
            if (editingItem && editingItem.id_sync) { 
                if (!window.api.updatePeca) { setMensagemStatus({ texto: "Funcionalidade de atualizar indisponível.", tipo: "erro" }); return; }
                await window.api.updatePeca(editingItem.id_sync, payload); 
                setMensagemStatus({ texto: "Item atualizado com sucesso!", tipo: "sucesso" });
            } else { 
                if (!window.api.insertPeca) { setMensagemStatus({ texto: "Funcionalidade de inserir indisponível.", tipo: "erro" }); return; }
                const itemCriado = await window.api.insertPeca(payload); 
                console.log("Estoque.jsx: Item cadastrado, resposta do backend:", itemCriado);
                setMensagemStatus({ texto: `Item '${itemCriado.descricao}' (Cód.Fixo: ${itemCriado.codigo_fixo}) cadastrado!`, tipo: "sucesso" });
            }
            resetForm();
            await fullFetchPecasLocal(); 
            setActiveTab("listagem");
        } catch (error) {
            console.error("Erro ao salvar item:", error);
            setMensagemStatus({ texto: "Falha ao salvar item: " + error.message, tipo: "erro" });
        }
    };

    const fullHandleEdit = (item) => {
        console.log("Estoque.jsx: Editando item:", item);
        setMensagemStatus({ texto: "", tipo: "" }); 
        setEditingItem(item); 
        setForm({
            codigo_peca: item.codigo_peca || "", nome: item.descricao || "", 
            classificacao: item.classificacao || "", fabricante: item.fabricante || "",
            aplicacao: item.aplicacao || "",
            estoque_minimo: item.estoque_minimo || 0,
            data_lancamento: item.data_lancamento ? String(item.data_lancamento).split('T')[0] : "", 
            estoque_atual: item.estoque_atual || 0, 
            valor_medio_unitario: 0 
        });
        setActiveTab("cadastro");
    };

    const fullHandleDelete = async (id_sync, nomeItem) => {
        if (!fullCheckApi() || !window.api.deletePeca) { setMensagemStatus({ texto: "Funcionalidade de deletar indisponível.", tipo: "erro" }); return; }
        if (!window.confirm(`Tem certeza que deseja excluir o item '${nomeItem}'? Esta ação marcará como deletado.`)) return;
        setMensagemStatus({ texto: "", tipo: "" });
        try {
            await window.api.deletePeca(id_sync, currentUser?.id); 
            await fullFetchPecasLocal(); 
            setMensagemStatus({ texto: `Item '${nomeItem}' marcado como excluído!`, tipo: "sucesso" });
        } catch (error) {
            console.error("Erro ao excluir item:", error);
            setMensagemStatus({ texto: "Falha ao excluir item: " + error.message, tipo: "erro" });
        }
    };
    
    const fullResetFormAndTab = (tabName = "listagem") => {
        resetForm(); 
        setActiveTab(tabName);
        setTermoBusca("");
        if (tabName === "listagem" || tabName === "grafico") { // Limpa mensagem ao ir para listagem ou gráfico
            if (mensagemStatus.tipo === "sucesso"){
                // Não limpa a mensagem de sucesso imediatamente para dar tempo de ler
            } else {
                 setMensagemStatus({ texto: "", tipo: "" });
            }
        } else {
            setMensagemStatus({ texto: "", tipo: "" });
        }
    };

    useEffect(() => {
        if (fullCheckApi()) {
            fullFetchPecasLocal();
        }
    }, []);

    const itensFiltrados = useMemo(() => {
        if (!termoBusca.trim()) {
            return itensEstoque;
        }
        return itensEstoque.filter(item =>
            (item.descricao && item.descricao.toLowerCase().includes(termoBusca.toLowerCase())) ||
            (item.codigo_fixo && String(item.codigo_fixo).toLowerCase().includes(termoBusca.toLowerCase())) ||
            (item.codigo_peca && String(item.codigo_peca).toLowerCase().includes(termoBusca.toLowerCase()))
        );
    }, [itensEstoque, termoBusca]);

    return (
        <div className={styles.container}>
            <nav>
                <div className={styles.navTitleContainer}>
                    <Archive size={28} className={styles.navIcon} />
                    <h2 className={styles.navTitle}>Gerenciamento de Estoque</h2>
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
                    <List size={18} style={{marginRight: '0.3rem'}} /> Listagem
                </button>
               
                <button
                    className={`${styles.tabTrigger} ${activeTab === "cadastro" ? styles.tabTriggerActive : ""}`}
                    onClick={() => { resetForm(); setActiveTab("cadastro"); setMensagemStatus({texto:"", tipo:""});}}
                >
                    <PackagePlus size={18} style={{marginRight: '0.3rem'}} /> 
                    {editingItem ? "Editar Item" : "Novo Item"}
                </button>
                 <button
                    className={`${styles.tabTrigger} ${activeTab === "grafico" ? styles.tabTriggerActive : ""}`}
                    onClick={() => fullResetFormAndTab("grafico")}
                >
                    <BarChart3 size={18} style={{marginRight: '0.3rem'}} /> Gráfico
                </button>
            </div>

            {activeTab === "listagem" && (
                <div className={styles.tabsContent}>
                    <Card className={styles.card}> {/* Card único para busca e tabela */}
                        <CardContent className={classNames(styles.cardContent, styles.cardContentTableWrapper)}>
                            {/* CAMPO DE BUSCA MOVIDO PARA DENTRO DO CARD */}
                            <div className={styles.searchContainer}>
                                <Label htmlFor="buscaPeca" className={styles.searchLabel}>Buscar por Código ou Descrição:</Label>
                                <div className={styles.searchInputWrapper}>
                                    <Search size={18} className={styles.searchIcon} />
                                    <Input type="text" id="buscaPeca" placeholder="Digite código ou descrição..."
                                        value={termoBusca} onChange={(e) => setTermoBusca(e.target.value)}
                                        className={styles.searchInput}/>
                                </div>
                            </div>

                            <Table tableClassName={styles.table} className={styles.tableContainerDefaultFromUi}>
                                <TableHeader className={styles.thead}>
                                    <TableRow className={styles.tableRow}>
                                        <TableHead className={styles.th}>Cód. Fixo</TableHead>
                                        <TableHead className={styles.th}>Cód. Peça</TableHead>
                                        <TableHead className={styles.th}>Descrição</TableHead>
                                        <TableHead className={styles.th}>Classificação</TableHead>
                                        <TableHead className={styles.th}>Fabricante</TableHead>
                                        <TableHead className={styles.th}>Aplicação</TableHead>
                                        <TableHead className={styles.th}>Data Lanç.</TableHead>
                                        <TableHead className={classNames(styles.th, styles.thNumeric)}>Est. Atual</TableHead>
                                        <TableHead className={classNames(styles.th, styles.thNumeric)}>Est. Mínimo</TableHead>
                                        <TableHead className={classNames(styles.th, styles.actionsHeader)}>Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {itensFiltrados.length === 0 && (
                                        <TableRow className={styles.tableRow}>
                                            <TableCell colSpan={10} className={classNames(styles.td, styles.emptyTableCell)}> 
                                                {termoBusca ? "Nenhum item encontrado para sua busca." : "Nenhum item cadastrado."}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {itensFiltrados.map((item) => (
                                        <TableRow key={item.id_sync} className={styles.tableRow}>
                                            <TableCell className={styles.td}>{item.codigo_fixo}</TableCell>
                                            <TableCell className={styles.td}>{item.codigo_peca}</TableCell>
                                            <TableCell className={styles.td}>{item.descricao}</TableCell>
                                            <TableCell className={styles.td}>{item.classificacao}</TableCell>
                                            <TableCell className={styles.td}>{item.fabricante}</TableCell>
                                            <TableCell className={styles.td}>{item.aplicacao}</TableCell>
                                            <TableCell className={styles.td}>{item.data_lancamento ? new Date(item.data_lancamento + 'T00:00:00Z').toLocaleDateString() : '-'}</TableCell>
                                            <TableCell className={classNames(styles.td, styles.tdNumeric)}>{item.estoque_atual}</TableCell>
                                            <TableCell className={classNames(styles.td, styles.tdNumeric)}>{item.estoque_minimo}</TableCell>
                                            <TableCell className={classNames(styles.td, styles.actions)}>
                                                <Button variant="outline" size="sm" onClick={() => fullHandleEdit(item)} className={styles.actionButton}>
                                                    <Edit size={14} className={styles.buttonIcon} /> Editar
                                                </Button>
                                                <Button variant="destructive" size="sm" onClick={() => fullHandleDelete(item.id_sync, item.descricao)} className={styles.actionButton}>
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

            {activeTab === "grafico" && ( // NOVA ABA PARA O GRÁFICO
                <div className={styles.tabsContent}>
                    {itensFiltrados.length > 0 ? (
                         <Card className={classNames(styles.card, styles.graficoCard)}>
                            <CardContent className={styles.cardContent}>
                                <h2 className={styles.chartTitle}>📊 Estoque Atual vs. Estoque Mínimo (Visão Geral {termoBusca ? `- Filtrado` : ''})</h2>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={itensFiltrados} margin={{ top: 20, right: 30, left: 0, bottom: 40 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke={"#444"}/>
                                        <XAxis dataKey="descricao" name="Descrição" stroke={"#888"} tick={{ fontSize: 10 }} interval={0} angle={-45} textAnchor="end" height={80} />
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
                    ) : (
                        <Card className={styles.card}>
                            <CardContent className={styles.cardContent}>
                                <p className={styles.emptyTableCell}>
                                    {termoBusca ? "Nenhum item encontrado para exibir no gráfico." : "Nenhum item cadastrado para exibir no gráfico."}
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {activeTab === "cadastro" && ( // Formulário de Cadastro/Edição
                <div className={classNames(styles.tabsContent, styles.formContainer)}> 
                    <Card className={styles.card}>
                        <CardContent className={styles.cardContent}>
                            <h3 className={styles.formTitle}>
                                {editingItem ? `Editando Item (Cód. Fixo: ${editingItem.codigo_fixo})` : "Cadastrar Novo Item de Estoque"}
                            </h3>
                            <form onSubmit={fullHandleSubmit} className={styles.form}>
                                {editingItem && (
                                    <div className={styles.formGroup}>
                                        <Label className={styles.label} htmlFor="codigo_fixo_display">Código Fixo</Label>
                                        <Input id="codigo_fixo_display" className={styles.input} value={editingItem.codigo_fixo}  disabled />
                                    </div>
                                )}
                                {!editingItem && (
                                     <div className={styles.formGroup}>
                                        <Label className={styles.label} htmlFor="codigo_fixo_info">Código Fixo</Label>
                                        <Input id="codigo_fixo_info" className={styles.input} value="(Gerado Automaticamente)"  disabled />
                                    </div>
                                )}
                                <div className={styles.formRow}>
                                    <div className={`${styles.formGroup} ${styles.formGroupFlex2}`}>
                                      <Label className={styles.label} htmlFor="nome">Descrição (Nome da Peça)</Label>
                                      <Input id="nome" className={styles.input} name="nome" value={form.nome} onChange={handleInputChange} required />
                                    </div>
                                     <div className={`${styles.formGroup} ${styles.formGroupFlex1}`}>
                                        <Label className={styles.label} htmlFor="codigo_peca">Código Peça (Fabricante/Alt.)</Label>
                                        <Input id="codigo_peca" className={styles.input} name="codigo_peca" value={form.codigo_peca} onChange={handleInputChange} />
                                    </div>
                                </div>
                                <div className={styles.formRow}>
                                     <div className={`${styles.formGroup} ${styles.formGroupFlex1}`}>
                                      <Label className={styles.label} htmlFor="classificacao">Classificação (Tipo)</Label>
                                      <Input id="classificacao" className={styles.input} name="classificacao" value={form.classificacao} onChange={handleInputChange} />
                                    </div>
                                    <div className={`${styles.formGroup} ${styles.formGroupFlex1}`}>
                                      <Label className={styles.label} htmlFor="fabricante">Fabricante</Label>
                                      <Input id="fabricante" className={styles.input} name="fabricante" value={form.fabricante} onChange={handleInputChange} />
                                    </div>
                                </div>
                                <div className={styles.formRow}>
                                    <div className={`${styles.formGroup} ${styles.formGroupFlex1}`}>
                                        <Label className={styles.label} htmlFor="aplicacao">Aplicação</Label>
                                        <Input id="aplicacao" className={styles.input} name="aplicacao" value={form.aplicacao} onChange={handleInputChange} />
                                    </div>
                                    <div className={`${styles.formGroup} ${styles.formGroupFlex1}`}>
                                        <Label className={styles.label} htmlFor="data_lancamento">Data de Lançamento</Label>
                                        <Input id="data_lancamento" className={styles.input} name="data_lancamento" type="date" 
                                               value={form.data_lancamento || ''} 
                                               onChange={handleInputChange} />
                                    </div>
                                </div>
                                <div className={styles.formRow}>
                                    <div className={`${styles.formGroup} ${styles.formGroupFlex1}`}>
                                      <Label className={styles.label} htmlFor="estoque_minimo">Estoque Mínimo</Label>
                                      <Input id="estoque_minimo" className={styles.input} name="estoque_minimo" type="number" min="0" value={form.estoque_minimo} onChange={handleInputChange} required />
                                    </div>
                                    {!editingItem && (
                                        <>
                                            <div className={`${styles.formGroup} ${styles.formGroupFlex1}`}>
                                                <Label className={styles.label} htmlFor="estoque_atual">Saldo Inicial</Label>
                                                <Input id="estoque_atual" className={styles.input} name="estoque_atual" type="number" min="0" 
                                                    value={form.estoque_atual} 
                                                    onChange={handleInputChange} 
                                                    required 
                                                />
                                            </div>
                                            <div className={`${styles.formGroup} ${styles.formGroupFlex1}`}>
                                                <Label className={styles.label} htmlFor="valor_medio_unitario">Custo Unit. Saldo Inicial</Label>
                                                <Input id="valor_medio_unitario" className={styles.input} name="valor_medio_unitario" type="number" min="0" step="0.0001"
                                                    value={form.valor_medio_unitario} 
                                                    onChange={handleInputChange} 
                                                    required 
                                                />
                                            </div>
                                        </>
                                    )}
                                    {editingItem && (
                                         <div className={`${styles.formGroup} ${styles.formGroupFlex1}`}>
                                            <Label className={styles.label} htmlFor="estoque_atual_display">Saldo Atual (Info)</Label>
                                            <Input id="estoque_atual_display" className={styles.input} value={editingItem.estoque_atual} disabled />
                                        </div>
                                    )}
                                </div>
                                {editingItem && (
                                    <div className={styles.formGroup}>
                                        <small className={styles.warningText}>O saldo atual é gerenciado por movimentações. Dados cadastrais são editados aqui.</small>
                                    </div>
                                )}
                                <div className={styles.submitButtonContainer}>
                                    <Button type="submit" className={`${styles.submitButton}`}>{editingItem ? "Salvar Alterações Cadastrais" : "Cadastrar Item e Saldo Inicial"}</Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}