# Project Zero — mapa-múndi interativo (MVP v0.1.0)

Protótipo **jogável, fictício e offline após instalação** do mapa mundial de Project Zero.

## Requisitos
- Node.js 20.19+ ou 22.12+
- npm

## Rodar localmente

```bash
npm install
npm run dev
```

Abra o endereço exibido pelo Vite (normalmente `http://localhost:5173`).

## Validação e produção estática

```bash
npm run typecheck
npm run build
npm test
npm run preview
```

A pasta `dist/` resultante pode ser hospedada em um servidor estático.

## Como jogar

1. Clique em um dos **20 países destacados** no mapa ou use o seletor de territórios no painel lateral.
2. Defina um nome fictício para o agente e os três atributos de gameplay.
3. Inicie a partida. O mapa e os indicadores evoluem a cada dia simulado.
4. Use **Pausar/Continuar**, velocidade 1×/2×/4×, zoom, arraste e opções de rotas.
5. Observe eventos de expansão e progresso da contramedida. Alcance 16 países com atividade superior a 35% antes que a pesquisa global chegue a 100%.

Os demais **157 territórios** aparecem para dar contexto geográfico, mas não são jogáveis no MVP.

## Estrutura

- `src/data/world.json`: 177 polígonos simplificados do Natural Earth (domínio público).
- `src/data/countries.ts`: 20 países ativos, pontos, rotas e índices **fictícios**.
- `src/simulation/engine.ts`: estado imutável e avanço diário **determinístico**; sem backend.
- `src/components/WorldMap.tsx`: camada SVG do mapa (seleção, teclado, arraste, zoom, rotas, tooltip).
- `src/App.tsx`: HUD, configuração, controles, feed de eventos e indicadores.
- `src/styles.css`: layout responsivo em desktop e mobile.

## Escopo e limitações

- **Não é um simulador epidemiológico real.** Índices, progressão, respostas de países, probabilidades e rotas foram inventados exclusivamente para entretenimento. Não servem para previsão ou decisões de saúde.
- Não há persistência ou autenticação. Reiniciar a página reinicia a partida.
- Os testes automatizados verificam o motor e as regras; a interface exige instalação das dependências e validação em navegador.
- A geometria territorial é de baixa resolução e foi simplificada para desempenho; limites não devem ser usados para fins legais/cartográficos.
- Fontes `Space Grotesk` e `DM Sans` são opcionais, carregadas via Google Fonts; há fontes locais de fallback.
- Algumas ilhas e microestados não estão representados no conjunto cartográfico de baixa resolução.

## Crédito cartográfico

Polígonos derivados da base **Natural Earth – naturalearth_lowres** distribuída em domínio público. https://www.naturalearthdata.com/about/terms-of-use/

## Próximas etapas

Motor modular persistente, mais países jogáveis, IA de resposta específica, transporte mais rico, balanceamento, identidade visual dos centros de pesquisa e eventos narrativos.
