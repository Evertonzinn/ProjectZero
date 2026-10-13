# Project Zero — Rebalanceamento Estratégico (Alpha v0.9.1)

Jogo de estratégia global **inteiramente fictício** em React 19 + Vite + TypeScript, mapa 2D, laboratório, governos autônomos, eventos causais, vitória/derrota, tutorial, repetição da seed e auditoria determinística com sete bots. Não representa epidemiologia real.

## O que mudou na v0.9.1

A auditoria v0.9 mostrou que três estratégias comprando melhorias e ações táticas venciam **100%** da amostra no modo Desafio (48 partidas por estratégia). Corrigimos o incentivo de gastar sempre em impulsos e upgrades, **sem alterar partidas já salvas**:

- Novas partidas (exceto modo Clássico) usam o conjunto de regras **Revisado**.
- Saves v1–v6 passam pelo migrador para schema **v7**, com regras **Legadas**: expansão, bônus e custos continuam idênticos aos originais. O modo Clássico permanece legado também em novas partidas.
- Impulso local revisado: até **0,3 ponto percentual** no país ativo por uso, em vez de 1,2 p.p. no legado.
- O custo de cada ação tática cresce **2 PT a cada duas utilizações da mesma ação** (`2, 2, 4, 4, 6, 6...` no Impulso; `3, 3, 5, 5...` no Atrito). Gastos totais continuam auditáveis. O painel e o feedback mostram o custo real.
- Bônus ofensivos dos upgrades foram recalibrados. No Revisado, cada evolução adquirida aumenta também o avanço da pesquisa mundial (8% cada); cada Impulso local acrescenta 2,5% ao fator de pesquisa. Contrapartidas aparecem nos modificadores do Laboratório. Esses percentuais são multiplicadores simbólicos de gameplay.
- Repetir uma partida mantém **seed, origem, atributos, modo e conjunto de regras**. Comparações exigem todos esses critérios; não comparam regimes diferentes como equivalentes.
- O relatório HTML offline e JSON documentam a diferença entre Legado e Revisado sem alterar os arquivos da v0.9.

## Rodar no Debian

```bash
npm run test:engine
npm run test:bots
npm run benchmark
npm run benchmark:bots
npm run benchmark:compare
npm run build
npm run dev
```

Não execute `npm install` novamente se as dependências já estão instaladas e funcionando. Para acessar pela rede local, o Vite usa `--host 0.0.0.0`.

A prévia `preview-offline.html` executa sem npm ou conexão com a internet; `python3 scripts/build_preview.py` regenera o arquivo após `tsc -p tsconfig.engine.json`.

## Resultados empíricos — modo Desafio

Amostra fixa: **16 seeds × 3 origens × 7 políticas de bot × 4 modos**, em dois conjuntos de regras: **2.688 partidas comparadas**. O modo Clássico foi mantido no legado. Todas as estratégias usam o mesmo motor, sem olhar o futuro.

| Estratégia | Vitórias no legado | Vitórias no revisado |
|---|---:|---:|
| Observador | 29,2% | 29,2% |
| Economizador (controle) | 66,7% | 54,2% |
| Concentrado | 100% | 85,4% |
| Conectividade | 100% | 22,9% |
| Discreto | 81,3% | 16,7% |
| Ruptura | 54,2% | 6,3% |
| Adaptativo | 100% | 54,2% |

**Isso não prova balanceamento definitivo.** São frequências desse conjunto fixo de estratégias, não chances de vitória universais. Concentrado continua forte; Ruptura pode estar fraco demais no modo Desafio. O modo Exploração é deliberadamente permissivo.

Arquivos de auditoria:
- `reports/balanceamento-v091.html`: relatório estático para abrir localmente.
- `reports/benchmark-comparativo-v091.json`: resumo completo, seeds e resultados comparáveis.
- `scripts/compare-rulesets.mjs`: regenera os dois arquivos.
- `scripts/strategy-bots.mjs`: políticas de bots independentes do frontend.

## Compatibilidade de saves

A chave `localStorage` permanece `project-zero-save-v1`. `GameState.version` evoluiu para **7** e agora armazena `ruleset` (`legado`/`revisado`) e `agent.tacticUses`. O validador impede saldo negativo, combinações inválidas e discrepância entre contagem de ações e total gasto no regime revisado. Em saves antigos, a contagem histórica por tipo de ação não existe, portanto é inicializada em zero e **não é usada** para alterar preço de táticas legadas.

Uma migração **não modifica um save permanentemente antes de o jogador optar por salvar**. Não há exclusão automática, alteração de outros repositórios ou backend.

## Limites e próximos passos

- A etapa de balanceamento com bots é automatizada; testes humanos ainda são necessários.
- Testes do motor e navegador offline não substituem `npm run build` no Debian com todas as dependências.
- O próximo marco v0.10 deve priorizar QA, restauração segura de saves e acessibilidade antes de acrescentar grandes mecânicas.
