# Project Zero — Balanceamento Estratégico (Alpha v0.7.0)

Jogo de estratégia global em React, Vite e TypeScript, com mapa 2D, laboratório, governos autônomos, acontecimentos causais, relatório final e repartidas. Toda a simulação é **fictícia**: os indicadores de propagação são mecânicas abstratas de jogo, não modelos epidemiológicos.

## Executar no Debian

```bash
# Os comandos devem ser executados na pasta do repositório.
npm run test:engine
npm run benchmark
npm run build
npm run dev
```

**Somente execute `npm install` caso as dependências não estejam instaladas ou mudem.** O package.json da v0.6 não inclui novas bibliotecas. O Vite informa a URL; para acesso na rede local, use o IP da máquina e a porta informada.

## v0.7 — Modos de jogo e balanceamento verificável

Antes de iniciar, escolha **Modo de jogo** no painel lateral:

- **Exploração**: expansão favorecida, foco em experimentar decisões (baixo desafio).
- **Equilibrado** (padrão): disputa ajustada entre estratégia do jogador e resposta científica.
- **Desafio**: vantagem relativa da resposta científica; exige escolhas de melhoria/tática mais eficientes.
- **Clássico v0.6**: coeficientes e meta de 100% anteriores, preservados para compatibilidade.

Nos modos Equilibrado e Desafio, a **meta científica é 98,5%**, enquanto o limite de impacto continua **70%**. O valor é uma regra de vitória fictícia, não uma afirmação sobre epidemiologia ou ciência. O relatório final mostra dificuldade, meta e multiplicadores de jogo usados. A dificuldade não pode ser alterada após começar.

### Benchmark reproduzível

`npm run benchmark` compila o motor e joga 576 partidas (16 seeds × 3 origens × 3 estratégias × 4 modos), sem dependências adicionais. Amostra da v0.7:

| Modo | Partidas | Encerramento científico | Taxa observada | Seeds/origens com vencedores diferentes conforme a estratégia |
|---|---:|---:|---:|---:|
| Clássico | 144 | 0 | 0% | 0 |
| Exploração | 144 | 0 | 0% | 0 |
| Equilibrado | 144 | 40 | 27,8% | 17 |
| Desafio | 144 | 89 | 61,8% | 10 |

**Importante:** as taxas dependem do conjunto de testes e estratégias fixas, não são probabilidades garantidas ao jogador. Escolhas futuras de melhorias e táticas podem modificar os resultados, mas o benchmark ainda **não automatiza gastos durante a partida**.

### Saves e comparações

O schema de save é **v6**. Saves válidos v1–v5 são migrados automaticamente para o modo **Clássico v0.6**, preservando o comportamento anterior. A mesma chave `project-zero-save-v1` continua em uso; nenhuma exclusão ou limpeza de saves. Comparação entre partidas exige seed, origem, atributos **e modo idênticos**. Repetir a seed preserva o modo e zera compras e pontos usados.

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

O schema atual é **v6**, mas a chave `localStorage` permanece `project-zero-save-v1`. Saves válidos v1–v5 são migrados por `restoreGame`, preservando a seed, evolução, estado e histórico presente; partidas legadas mantêm as regras Clássicas. O campo `agent.spentTactics` registra o gasto em operações. O verificador mantém a igualdade:

`pontos atuais + custo das melhorias + gasto em táticas = 2 × floor(dia / 10)`.

Todos os comandos de compra verificam fase, saldo e limites. Não há backend, banco, Docker ou autenticação no MVP.

### Testes e limitações

```bash
tsc -p tsconfig.engine.json
node --test tests/engine.test.mjs
# ou npm run test:engine
npm run build
```

O motor (34 testes), o benchmark e a prévia HTML offline (desktop/mobile) foram testados neste ambiente. O build completo React/Vite deve ser validado em um ambiente com as dependências npm instaladas; não foi possível fazê-lo aqui. O teste da prévia cobre mapa, pausa no dia 10/20, descontos, compra de melhoria, fim de partida e repetição no Chromium desktop/mobile.

Ainda falta testar balanceamento envolvendo compra automatizada de melhorias, táticas e uma amostra maior de seeds. A meta de duração de 15–30 minutos continua não validada. Não há multiplayer, backend, integrações com lives nem modelagem do mundo real.

**Dados cartográficos:** Natural Earth (domínio público); limites simplificados. Projeto isolado dos demais produtos da OWS.
