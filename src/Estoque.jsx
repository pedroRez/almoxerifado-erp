// src/Estoque.jsx
import React, { useEffect, useState, useMemo } from "react";
import { Archive, Edit, Trash2, Search, PackagePlus, CalendarDays } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
// Certifique-se que os caminhos para seus componentes UI estão corretos
import { Card, CardContent } from "./components/ui/card.jsx";
import { Button } from "./components/ui/button.jsx";
import { Input } from "./components/ui/input.jsx";
import { Label } from "./components/ui/label.jsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./components/ui/table.jsx";
import styles from "./Estoque.module.css";
import { useAuth } from './AuthContext.jsx';

console.log("Estoque.jsx: Script carregado (vFinal_CodigoFixoAutoBackend_Completo)");

function classNames(...classes) { return classes.filter(Boolean).join(' '); }

export default function Estoque() {
    const { usuario: currentUser } = useAuth();

    const [itensEstoque, setItensEstoque] = useState([]);
    const [form, setForm] = useState({
        // codigo_fixo removido daqui para o estado inicial do form de criação
        codigo_peca: "", 
        nome: "",       
        classificacao: "",
        fabricante: "",
        aplicacao: "",   
        estoque_atual: 0, // Para Saldo Inicial na criação
        estoque_minimo: 0,
        valor_medio_unitario: 0, // Para Custo do Saldo Inicial na criação
        data_lancamento: "" 
    });
    const [editingItem, setEditingItem] = useState(null); // Guarda o item completo para edição
    const [activeTab, setActiveTab] = useState("listagem");
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
        
        if (!editingItem) { // Apenas na criação
            if (form.estoque_atual === undefined || form.estoque_atual < 0) {
                setMensagemStatus({ texto: "Saldo inicial é obrigatório e não pode ser negativo.", tipo: "erro" }); return;
            }
            if (form.valor_medio_unitario === undefined || form.valor_medio_unitario < 0) {
                setMensagemStatus({ texto: "Custo unitário para o saldo inicial é obrigatório e não pode ser negativo.", tipo: "erro" }); return;
            }
        }

        // Para novos itens, codigo_fixo NÃO é enviado no payload, será gerado pelo backend.
        // Para edição, o codigo_fixo do item original é usado para identificação, mas não para alteração.
        const payload = {
            codigo_peca: form.codigo_peca,
            nome: form.nome, 
            tipo: form.classificacao, 
            fabricante: form.fabricante,
            aplicacao: form.aplicacao,
            estoque_atual: form.estoque_atual, 
            estoque_minimo: form.estoque_minimo,
            valor_medio_unitario: form.valor_medio_unitario, 
            data_lancamento: form.data_lancamento || null,
            usuario_id: currentUser?.id 
        };

        // Se estiver editando, adicionamos o codigo_fixo original ao payload para referência do backend,
        // mas a função updatePeca no backend não deve permitir sua alteração.
        // O identificador para update é o id_sync.
        if (editingItem) {
            payload.codigo_fixo = editingItem.codigo_fixo; 
        }

        console.log("Estoque.jsx: Enviando formulário:", payload, "Item em Edição (se houver):", editingItem);

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
            // codigo_fixo não é parte do form editável, vem do editingItem
            codigo_peca: item.codigo_peca || "",
            nome: item.descricao || "", 
            classificacao: item.classificacao || "", 
            fabricante: item.fabricante || "",
            aplicacao: item.aplicacao || "",
            estoque_minimo: item.estoque_minimo || 0,
            data_lancamento: item.data_lancamento ? String(item.data_lancamento).split('T')[0] : "", 
            estoque_atual: item.estoque_atual || 0, // Apenas para exibição no form de edição
            valor_medio_unitario: 0 // Não é editado aqui
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
        if (tabName === "listagem" && mensagemStatus.tipo === "sucesso") { 
            // Não limpa msg de sucesso se estiver voltando para listagem
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
            <nav className={styles.nav}>
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
                    📦 Listagem & Gráfico
                </button>
                <button
                    className={`${styles.tabTrigger} ${activeTab === "cadastro" ? styles.tabTriggerActive : ""}`}
                    onClick={() => { resetForm(); setActiveTab("cadastro"); setMensagemStatus({texto:"", tipo:""});}}
                >
                    <PackagePlus size={18} style={{marginRight: '0.3rem'}} /> 
                    {editingItem ? "Editar Item" : "Novo Item"}
                </button>
            </div>

            {activeTab === "listagem" && (
                <div className={styles.tabsContent}>
                    <div className={styles.searchContainer}>
                        <Label htmlFor="buscaPeca" className={styles.searchLabel}>Buscar por Código ou Descrição:</Label>
                        <div className={styles.searchInputWrapper}>
                            <Search size={18} className={styles.searchIcon} />
                            <Input type="text" id="buscaPeca" placeholder="Digite código ou descrição..."
                                value={termoBusca} onChange={(e) => setTermoBusca(e.target.value)}
                                className={styles.searchInput}/>
                        </div>
                    </div>

                    {itensFiltrados.length > 0 && (
                         <Card className={classNames(styles.card, styles.graficoCard)}>
                            <CardContent className={styles.cardContent}>
                                <h2 className={styles.chartTitle}>📊 Estoque Atual vs. Estoque Mínimo</h2>
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
                    )}

                    <Card className={styles.card}>
                        <CardContent className={classNames(styles.cardContent, styles.cardContentTableWrapper)}>
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

            {activeTab === "cadastro" && (
                <div className={classNames(styles.tabsContent, styles.formContainer)}> 
                    <Card className={styles.card}>
                        <CardContent className={styles.cardContent}>
                            <h3 className={styles.formTitle}>
                                {editingItem ? `Editando Item (Cód. Fixo: ${editingItem.codigo_fixo})` : "Cadastrar Novo Item de Estoque"}
                            </h3>
                            <form onSubmit={fullHandleSubmit} className={styles.form}>
                                {/* Campo Código Fixo: Informativo na edição, não presente na criação (será gerado) */}
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
                                    {!editingItem && ( // Saldo Inicial e Custo apenas na criação
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
                                    {/* Na edição, mostrar estoque atual mas não permitir edição direta */}
                                    {editingItem && (
                                         <div className={`${styles.formGroup} ${styles.formGroupFlex1}`}>
                                            <Label className={styles.label} htmlFor="estoque_atual_display">Saldo Atual (Info)</Label>
                                            <Input id="estoque_atual_display" className={styles.input} value={editingItem.estoque_atual} disabled />
                                        </div>
                                    )}
                                </div>
                                {editingItem && (
                                    <div className={styles.formGroup}>
                                        <small className={styles.warningText}>O saldo atual é gerenciado por movimentações. Custo médio não é editado aqui.</small>
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