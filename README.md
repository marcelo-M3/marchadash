# Saúde de Clientes — Marcha Ads

Dashboard interno em `Next.js 14` para acompanhar saúde da carteira, LTV, churn e performance por gestor. O frontend consome uma API publicada via `Google Apps Script`, e os dados são lidos integralmente da planilha. Não há nomes de clientes hardcoded no app.

## Stack

- `Next.js 14` com `App Router`
- `React 18`
- `Tailwind CSS`
- Componentes base em estilo `shadcn/ui`
- `Recharts`
- `fetch` nativo

## Estrutura de arquivos

- `app/`: layout, página principal e estilos globais
- `components/`: dashboard e componentes reutilizáveis
- `hooks/use-clientes-data.ts`: consumo da API
- `apps-script.gs`: backend no Google Apps Script
- `.env.example`: variável necessária para o frontend

## 1. Configurar o Google Sheets

Crie uma planilha com a aba `BASE_CLIENTES` e estes cabeçalhos exatos na primeira linha:

### Aba `BASE_CLIENTES`

| Atualização | CLIENTES | NICHO | ATIVO | ORIGEM | GESTOR | DATA PLANEJAMENTO | PERÍODO | Observação | M/A ENTRADA | M/A SAÍDA | SAÍDA CLIENTE | MOTIVO SAÍDA | DATA RECONTATO | STATUS CLIENTE |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|

Regras:

- `ATIVO`: use `Sim`, `Saiu`, `Encerrou contrato`, `Aviso prévio` ou `Pausado`
- `PERÍODO`: preferencialmente número inteiro em meses
- `STATUS CLIENTE`: use `Bom`, `Precisa de Atenção` ou `Situação Crítica`
- `M/A ENTRADA` e `M/A SAÍDA`: use `mm/aa`
- o dashboard considera como base ativa válida os clientes com `ATIVO = Sim` e `STATUS CLIENTE` preenchido

Observação:

- a API atual deriva `evolucao_mensal` e `saidas_por_mes` diretamente da `BASE_CLIENTES`
- `MOVIMENTACAO_MENSAL` e `SAIDAS` não são mais obrigatórias para o backend

## 2. Publicar a API com Apps Script

1. Abra a planilha.
2. Vá em `Extensões` → `Apps Script`.
3. Apague o conteúdo padrão do editor.
4. Cole o conteúdo do arquivo [apps-script.gs](/Users/clarasanches/Documents/dash/apps-script.gs).
5. Salve o projeto.
6. Clique em `Implantar` → `Nova implantação`.
7. Escolha `Aplicativo da web`.
8. Em `Executar como`, selecione sua conta.
9. Em `Quem tem acesso`, use `Qualquer pessoa`.
10. Publique e copie a URL final do `/exec`.

Observação:

- O Apps Script entrega o JSON diretamente do `SpreadsheetApp`, então qualquer alteração na planilha reflete no dashboard após novo fetch.
- O serviço `ContentService` do Apps Script não permite definir headers arbitrários de resposta como um backend Node tradicional. O arquivo já está estruturado para resposta JSON direta de Web App, que é o fluxo normalmente usado nesse tipo de integração.

## 3. Configurar o frontend

Crie o arquivo `.env.local` a partir de `.env.example`:

```bash
cp .env.example .env.local
```

Depois defina:

```env
API_URL=https://script.google.com/macros/s/SEU_DEPLOY/exec
```

O app usa a rota interna `/api/clientes` como proxy do Next.js. Isso evita o problema comum de `CORS` ao chamar o Google Apps Script direto do navegador.

## 4. Rodar localmente

Instale dependências:

```bash
npm install
```

Rode em desenvolvimento:

```bash
npm run dev
```

App local:

- `http://localhost:3000`

## 5. Deploy pela Vercel

Fluxo recomendado:

1. Suba o projeto para o GitHub.
2. Importe o repositório na Vercel.
3. Defina a variável `API_URL`.
4. Faça o deploy.

Não é necessária configuração adicional fora da variável de ambiente.

## 6. Deploy pela Netlify

Fluxo recomendado:

1. Suba o projeto para o GitHub.
2. Importe o repositório na Netlify.
3. Build command: `npm run build`
4. Publish directory: `.next`
5. Defina a variável `API_URL`

Se usar o adaptador oficial de Next.js da Netlify no seu ambiente, o deploy funciona sem alterar o código. Para ambientes Netlify mais antigos, prefira Vercel para evitar ajustes de runtime.

## 7. GitHub → Vercel

O fluxo pedido fica assim:

1. Criar repositório no GitHub
2. Subir este projeto
3. Conectar o repositório na Vercel
4. Definir `API_URL`
5. Cada push na branch principal gera novo deploy

## Notas de implementação

- O app mostra `skeleton loading` enquanto a API carrega.
- Em caso de erro, exibe estado com botão de retry.
- O botão `Atualizar` faz refetch em tempo real.
- Os nomes de clientes, gestores e meses exibidos vêm da API, que por sua vez lê a planilha.
- O arquivo [apps-script.gs](/Users/clarasanches/Documents/dash/apps-script.gs) já está ajustado para ler apenas `BASE_CLIENTES` e derivar os dados mensais no próprio Apps Script.
