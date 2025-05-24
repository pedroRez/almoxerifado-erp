# Almoxarifado ERP

Este é um sistema de ERP para gerenciamento de almoxarifado, desenvolvido com Electron, React e PostgreSQL. Ele visa fornecer funcionalidades para controle de estoque, gerenciamento de usuários, colaboradores e ordens de serviço.

## Funcionalidades Implementadas (até o momento)

* Gerenciamento de Usuários (contas de acesso ao sistema) com diferentes papéis e permissões.
* Gerenciamento de Funcionários (dados cadastrais de colaboradores, com vínculo opcional a uma conta de usuário).
* Gerenciamento de Estoque (cadastro de peças/itens, controle de saldo inicial, mínimo).
    * Geração automática de `codigo_fixo` para novos itens.
    * Registro de movimentações de saldo inicial.
    * Soft delete para itens.
* Autenticação de usuários.
* Interface para alteração de senha do usuário logado.
* Estrutura base para Ordens de Serviço (criação e listagem inicial).
* Separação da lógica de banco de dados em módulos (pasta `database/`).
* Interface do frontend construída com React e Vite.
* Aplicação desktop utilizando Electron.

## Pré-requisitos

Antes de começar, certifique-se de que você tem os seguintes softwares instalados e configurados:

1.  **Node.js**: Versão LTS mais recente recomendada (inclui npm).
    * [Download Node.js](https://nodejs.org/)
2.  **npm** (Node Package Manager): Geralmente instalado junto com o Node.js.
3.  **PostgreSQL**: Uma versão estável recente (ex: 12, 13, 14, 15, 16).
    * [Download PostgreSQL](https://www.postgresql.org/download/)
4.  **pgAdmin 4** (Opcional, mas Altamente Recomendado): Para gerenciamento visual do banco de dados PostgreSQL.
    * [Download pgAdmin](https://www.pgadmin.org/download/)

## Configuração do Ambiente

Siga os passos abaixo para configurar o projeto em um novo ambiente.

### 1. Configuração do Banco de Dados PostgreSQL

É crucial que o banco de dados seja configurado **antes** de tentar rodar a aplicação Electron, pois ela depende dele para iniciar.

1.  **Acesse o PostgreSQL** (usando `psql` ou uma ferramenta como o pgAdmin 4) com um usuário que tenha permissões para criar bancos de dados e usuários (geralmente o superusuário `postgres`).

2.  **Crie o Banco de Dados:**
    * Nome do Banco: `Xerife`
    * Dono (Owner): `postgres` (ou seu superusuário)
    * Encoding: `UTF8`
    * Collation e Ctype: `pt_BR.UTF-8` (ou o padrão do seu sistema que suporte português)
    * Exemplo SQL (via psql ou Query Tool do pgAdmin):
        ```sql
        CREATE DATABASE "Xerife"
            WITH 
            OWNER = postgres
            ENCODING = 'UTF8'
            LC_COLLATE = 'pt_BR.UTF-8'
            LC_CTYPE = 'pt_BR.UTF-8'
            TABLESPACE = pg_default
            CONNECTION LIMIT = -1
            IS_TEMPLATE = False;
        ```

3.  **Execute o Script de Setup do Schema (`setup_xerife_db.sql`):**
    * **Conecte-se ao banco de dados `Xerife` recém-criado usando o superusuário `postgres`.**
    * Localize o arquivo `setup_xerife_db.sql` na raiz do projeto.
    * Abra este arquivo em uma Query Tool (como a do pgAdmin) e **execute o script inteiro**.
    * **Este script irá:**
        * Criar o usuário da aplicação `xerife_user` com a senha padrão `root` (ATENÇÃO: Mude esta senha em ambientes de produção!).
        * Conceder as permissões necessárias para `xerife_user` no banco `Xerife` e no schema `public`.
        * Criar a extensão `uuid-ossp`.
        * Criar todas as tabelas necessárias (`users`, `funcionarios`, `estoque`, `movimentacoes_estoque`, `tipos_caracteristica_manutencao`, `ordens_servico`, etc.) com `IF NOT EXISTS`.
        * Criar as funções de trigger e as triggers para campos como `updated_at` e para atualizar o saldo do estoque.
        * Criar a sequência `codigo_fixo_estoque_seq`.
        * Inserir dados iniciais (como os `tipos_caracteristica_manutencao`).
    * Verifique a aba "Messages" no pgAdmin para garantir que o script foi executado com sucesso e sem erros.

### 2. Configuração da Aplicação

1.  **Clone o Repositório ou Copie os Arquivos:**
    Obtenha todos os arquivos do projeto para o seu ambiente local.

2.  **Navegue até a Pasta Raiz do Projeto** no seu terminal:
    ```bash
    cd caminho/para/almoxarifado-erp
    ```

3.  **Instale as Dependências do Node.js:**
    ```bash
    npm install
    ```
    Este comando lerá o `package.json` e instalará todos os pacotes necessários (Electron, React, Vite, pg, etc.) na pasta `node_modules/`.

4.  **Configure as Credenciais do Banco de Dados (se necessário):**
    * O arquivo `database/dbConfig.js` contém as credenciais de conexão com o PostgreSQL.
    * Por padrão, ele está configurado para:
        * Usuário: `xerife_user`
        * Senha: `root`
        * Banco: `Xerife`
        * Host: `localhost`
        * Porta: `5432`
    * Se a sua configuração do PostgreSQL (usuário, senha, porta) for diferente, você precisará **editar o arquivo `database/dbConfig.js`** para refletir suas configurações.
    * **ATENÇÃO:** Nunca comite senhas ou credenciais sensíveis diretamente em repositórios públicos. Para projetos reais, considere usar variáveis de ambiente (ex: com `.env` e `dotenv`).

## Rodando a Aplicação

### Modo de Desenvolvimento

Para rodar a aplicação em modo de desenvolvimento (com hot-reloading para o frontend):

```bash
npm run dev