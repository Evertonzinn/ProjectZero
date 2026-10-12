# PROJECT ZERO — Eventos Globais (Alpha 0.4.0)

Protótipo de estratégia global com mapa 2D, laboratório, governos autônomos e eventos causais, **inteiramente fictício**. O laboratório modifica coeficientes abstratos do motor; nada aqui representa ou orienta fenômenos epidemiológicos reais.

## Experimentar sem instalar nada

Abra `preview-offline.html` no navegador (Chrome, Edge ou Firefox). O arquivo incorpora contornos, motor e interface, sem carregar scripts, dados ou fontes externas. Clique em **LABORATÓRIO ZERO** na barra lateral ou ao lado da linha do tempo; observe depois os painéis de inteligência mundial e a seção **Crônicas do Mundo**.

## Jogar

1. Escolha o país de origem no mapa ou seletor.
2. Abra **Laboratório Zero**. Antes do início, atribua até **8 pontos** a quatro atributos abstratos (níveis 0–4): Propagação, Discrição, Resistência e Instabilidade. Se desejar, nomeie o protocolo.
3. Inicie a simulação. Os atributos iniciais ficam fixos durante a partida.
4. A cada **10 dias**, ganhe **2 pontos de evolução** e volte ao laboratório para ativar melhorias.
5. Observe o painel dos modificadores: crescimento, conexões, reação governamental e pesquisa respondem às decisões. Algumas melhorias oferecem bônus com contrapartidas; **Rede aberta** e **Núcleo concentrado** são mutuamente exclusivas.
6. Acompanhe a **Corrida científica & diplomacia** abaixo do gráfico global: clique em um dos cinco líderes para visualizar suas decisões e recursos no painel regional.
7. Acompanhe **Crônicas do Mundo**: filtre eventos por todos, ativos ou país selecionado. Cada ocorrência mostra gatilho, consequência, duração e localização. O mapa destaca países com eventos ativos em anéis azuis.
8. Pause, avance dias, inspecione países, salve/restaure ou reinicie o cenário.

A simulação pausa automaticamente quando o laboratório é aberto e continua apenas quando o jogador retoma os controles de tempo.

## Executar versão React

Requisitos: Node.js 20.19+ ou 22.12+ e npm.

```bash
cd project-zero-map
npm install
npm run dev
```

Use a URL mostrada pelo Vite (normalmente http://localhost:5173).

### Testes e build

```bash
npm run test:engine
npm run build
npm run preview
```

`npm run test:engine` valida o motor determinístico isoladamente. `npm run build` exige dependências instaladas. Para hospedagem estática, publique o conteúdo de `dist/`.

## Alterações 0.4.0 — Eventos Globais

- `src/engine/events.ts`: quatro eventos fictícios (`crise_economica`, `instabilidade_politica`, `descoberta_cientifica`, `ruptura_diplomatica`), condições de disparo, chances determinísticas, cooldown de 30 dias por país, efeitos imediatos e efeitos temporários.
- `src/engine/simulation.ts`: avaliação depois do tick de todos os países; consequências sobre orçamento, estabilidade e pesquisa, e modificadores temporários para ciência, conexões, crescimento e recuperação de orçamento. Um evento não reescreve o passado.
- `src/components/WorldEvents.tsx`: linha do tempo dos eventos com causas, consequências, status e filtros por país/ativos; integra seleção do território no mapa.
- `src/components/WorldMap.tsx`: anéis azuis para acontecimentos em curso. O painel de governo também indica efeitos ativos.
- `scripts/build_preview.py` e `preview-offline.html`: versão HTML autônoma com os mesmos gatilhos e modificadores calculados pelo motor TypeScript.
- **Saves** com schema v4: `restoreGame` valida e migra schemas v1, v2 e v3 para v4, preservando progresso, laboratório e governos. Saves anteriores começam sem eventos retroativos.
- **Testes**: 21 testes Node.js/TypeScript passaram, incluindo gatilhos, cooldown, limites, determinismo, validade de saves e consequências no tick seguinte.
- **Navegador**: Chromium testado em desktop e mobile, com 85 dias, 176 territórios, filtros, seleção, salvamento/restauração e sem erros JS.

Observação: `npm install` não concluiu nesta execução por falha DNS (`EAI_AGAIN`), portanto o build React/Vite ainda **não foi validado**; a prévia HTML e o motor compilado foram validados.

## Alterações 0.3.0 — Inteligência Mundial

- **Novo** `src/engine/intelligence.ts`: 4 doutrinas de governo, 6 decisões, custos, efeitos e regras reprodutíveis.
- **Novo** `src/components/WorldIntelligence.tsx`: ranking científico interativo, canais de cooperação, mobilização e indicadores governamentais.
- **Atualizado** `src/engine/simulation.ts`: estado por país com ação, pressão social, orçamento, estabilidade, parceiro e motivo da decisão. Ações têm duração limitada e efeitos no avanço diário. Pesquisa internacional transfere progresso de forma abstrata. Ranking registra notícias por ciclos.
- **Atualizado** React e prévia HTML autônoma, com painéis sincronizados ao motor.
- **Migração de saves** schema 1 → 3 e 2 → 3 sem perda das escolhas de laboratório armazenadas no v2.
- **Corrigido**: mudar país de origem antes de iniciar a partida não apaga mais a configuração do laboratório.
- **Testes**: 15 testes do motor passaram; demo offline verificada com Chromium desktop/mobile, incluindo ranking, seleção e avanço de 64 dias.

Todas as decisões de governo são **máquinas de estado lúdicas**, não modelos de política pública ou epidemiologia real. Nenhum serviço de IA externa é utilizado.

## Alterações 0.2.0

- **Novo** `src/components/Laboratory.tsx` — interface de configuração, árvore e indicadores de efeitos.
- **Novo** `src/engine/laboratory.ts` — definições de atributos, melhorias, requisitos e exclusões.
- **Atualizado** `src/engine/simulation.ts` — motor responde aos atributos, pontos são gerados a cada dez ticks, compras são transações imutáveis e resultados continuam reproduzíveis.
- **Atualizado** `src/App.tsx` e `src/styles/app.css` — abertura do laboratório no mapa, estado pausado, layout desktop/mobile.
- **Atualizado** `scripts/build_preview.py` e `preview-offline.html` — a demonstração executa o mesmo motor compilado em TypeScript, sem React.
- **Atualizado** `tests/engine.test.mjs` — 15 testes automatizados, incluindo limites, bloqueios, determinismo, compra e migração.

## Compatibilidade e persistência

O schema atual dos saves é **v4**, usando a mesma chave `project-zero-save-v1` em `localStorage` para localizar partidas antigas. `restoreGame()` valida saves v1, v2 e v3 antes de migrá-los: preserva seed, dia, países, pesquisa, laboratório (a partir do v2) e governos (a partir do v3). Os eventos antigos não são inventados retroativamente — o histórico `globalEvents` começa vazio ao migrar. Saves v4 válidos mantêm seus eventos e consequências.

O validador aplica limites de população, pesquisa, pontos de evolução, governos e estrutura/eventos por tipo; registra até 120 acontecimentos de mundo e até 70 notícias recentes. Os efeitos temporários são calculados a cada tick apenas para eventos dentro da vigência. Uma partida gerada com a mesma seed e as mesmas decisões evolui de maneira reproduzível.

## Limitações de MVP

- 18 países ativos, sobre mapa de 176 territórios simplificados. Demais territórios são elementos visuais.
- Configuração abstrata, não epidemiológica; fórmulas escolhidas para gameplay, ainda sem balanceamento estatístico.
- Não há multiplayer, integração com YouTube, servidor, banco, API, autenticação ou contas.
- O save local (`localStorage`) pertence à origem do navegador. Abrir como arquivo e abrir via servidor podem criar armazenamentos distintos.
- A árvore tem 6 melhorias únicas; os governos possuem 4 perfis e 6 ações; há 4 tipos de eventos globais.
- A execução de `npm run build` não foi validada neste ambiente por falta das dependências React/Vite; a demo offline foi validada em Chromium, e os 21 testes Node.js/TypeScript passaram.

## Validação manual / regressão

1. No laboratório, teste aumentar níveis até esgotar o orçamento de 8 pontos. Os controles devem bloquear valores inválidos.
2. Edite nome e atributos, inicie a partida e confirme que eles ficam travados.
3. Avance até o dia 10; observe 2 pontos disponíveis e a notícia correspondente.
4. Com Propagação >= 2, compre **Correntes cruzadas** (2 PT). O saldo deve cair para 0; tentativa de compra duplicada é bloqueada.
5. Configure Resistência >= 2 e teste **Rede aberta** versus **Núcleo concentrado** ao obter pontos: comprar um deve bloquear o outro.
6. Com a mesma seed e mesmas escolhas, o resultado deve se repetir. Com escolhas diferentes, os estados devem divergir.
7. Salve e recarregue, depois teste migração de uma partida antiga v1, seleção de países, zoom, painel científico e encerramento.
8. Avance até surgir um evento; confira causa e consequência, ícone no mapa, filtro por país, expiração do efeito e preservação do histórico.
9. Teste a interface desktop, celular, navegação por teclado e redução de movimento.

**Fonte geográfica:** Natural Earth (baixo detalhamento, domínio público). Contornos e valores nacionais foram simplificados para o jogo, sem pretensão de fronteiras ou estatísticas oficiais.

**Isolamento:** a aplicação não compartilha infraestrutura, banco, código de produção nem credenciais com qualquer outro projeto.
