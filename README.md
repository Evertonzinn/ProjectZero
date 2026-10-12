# Project Zero — Economia de Evolução (Alpha v0.6.0)

Jogo de estratégia global em React, Vite e TypeScript, com mapa 2D, laboratório, governos autônomos, acontecimentos causais, relatório final e repartidas. Toda a simulação é **fictícia**: os indicadores de propagação são mecânicas abstratas de jogo, não modelos epidemiológicos.

## Executar no Debian

```bash
# Os comandos devem ser executados na pasta do repositório.
npm run test:engine
npm run build
npm run dev
```

**Somente execute `npm install` caso as dependências não estejam instaladas ou mudem.** O package.json da v0.6 não inclui novas bibliotecas. O Vite informa a URL; para acesso na rede local, use o IP da máquina e a porta informada.

## Como jogar e usar os pontos

1. Escolha um país e configure até 8 pontos **iniciais** entre quatro atributos no Laboratório Zero. Esses pontos não são o saldo para comprar melhorias.
2. Inicie a partida. **A cada 10 dias**, você ganha 2 pontos de evolução.
3. O jogo **pausa e abre o laboratório automaticamente** nos dias 10, 20, 30 etc. enquanto a partida estiver ativa. Também é possível clicar no aviso de pontos para abri-lo.
4. **Árvore de melhorias**: seis melhorias compráveis uma única vez, com pré-requisitos. Algumas escolhas se excluem.
5. **Ações táticas repetíveis**: na seção 03 do laboratório, selecione o país e gaste pontos quantas vezes quiser, enquanto houver saldo e o país cumprir os requisitos. `Impulso local` (2 PT) incrementa o indicador abstrato do país em até 1,2 ponto percentual de sua população; `Atrito institucional` (3 PT) reduz sua estabilidade em 8 e eleva a pressão em 5, respeitando limites.
6. Clique em **Retomar no mapa** e depois em ▶ para continuar. Quando a partida termina, novas compras ficam bloqueadas para não reescrever o resultado. Use **Repetir mesma seed** ou **Nova seed** no relatório final.

As táticas são determinísticas, ficam registradas no boletim e alteram o estado imediatamente. O saldo e o gasto total também são persistidos.

## Arquitetura / escopo

- `src/engine/simulation.ts`: motor determinístico e economia, com regras de gastos.
- `src/engine/tactics.ts`: definição das operações táticas ficcionais.
- `src/engine/outcome.ts`: relatório final e repetição.
- `src/components/Laboratory.tsx`: laboratório com melhoria, alvo e ações.
- `src/App.tsx`: pausa automática a cada novo crédito de pontos e controles do jogo.
- `src/styles/app.css`: layout desktop/mobile.
- `scripts/build_preview.py`: gera `preview-offline.html` reutilizando o motor TypeScript compilado.
- `tests/engine.test.mjs`: testes de determinismo, governo, laboratório, eventos, resultados, gastos e migração.

### Integridade dos saves

O schema atual é **v5**, mas a chave `localStorage` permanece `project-zero-save-v1`. Saves válidos v1–v4 são migrados por `restoreGame`, preservando o estado e os eventos históricos da v4. O campo `agent.spentTactics` registra o gasto em operações. O verificador mantém a igualdade:

`pontos atuais + custo das melhorias + gasto em táticas = 2 × floor(dia / 10)`.

Todos os comandos de compra verificam fase, saldo e limites. Não há backend, banco, Docker ou autenticação no MVP.

### Testes e limitações

```bash
tsc -p tsconfig.engine.json
node --test tests/engine.test.mjs
# ou npm run test:engine
npm run build
```

O motor e a prévia HTML offline foram testados neste ambiente. O build completo React/Vite deve ser validado em um ambiente com as dependências npm instaladas; não foi possível fazê-lo aqui. O teste da prévia cobre mapa, pausa no dia 10/20, descontos, compra de melhoria, fim de partida e repetição no Chromium desktop/mobile.

Ainda falta balanceamento estatístico para determinar a frequência de vitória de cada combinação de origem/seed/táticas e ajustar as decisões para partidas de 15–30 minutos. Não há multiplayer, backend, integrações com lives nem modelagem do mundo real.

**Dados cartográficos:** Natural Earth (domínio público); limites simplificados. Projeto isolado dos demais produtos da OWS.
