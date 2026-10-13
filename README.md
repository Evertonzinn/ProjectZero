# Project Zero — Alpha v0.10.0 (Estabilidade e Qualidade)

Jogo de estratégia global fictícia em **React + TypeScript + Vite**, com motor determinístico, 18 países, laboratório de evolução, governos autônomos, eventos, quatro modos, resultados e benchmarks. **Sem backend, banco de dados, contas, telemetria ou dependências novas nesta versão.**

## O que a v0.10 acrescenta

- **Save manual** permanece na chave histórica `project-zero-save-v1`. A gravação de um novo save manual guarda uma **cópia válida do anterior** em `project-zero-manual-backup-v010`, se diferente. Em caso de falha ao gravar o backup, o save manual não é sobrescrito.
- **Autosave independente** em `project-zero-autosave-v010`: tenta salvar nos marcos de 10 dias, após decisões em tais marcos, ao encerrar, ao ocultar a página e em `pagehide`. Não substitui o save manual. O navegador pode encerrar abruptamente sem disparar eventos, então autosave não é garantia absoluta de recuperação.
- **Recuperar sessão**, **Recuperar backup** e **Carregar partida** são três controles separados. Os dois últimos nunca apagam automaticamente o slot de origem. Carregar um slot na partida em andamento solicita confirmação.
- **Exportar JSON** e **Importar JSON** permitem transferir o estado entre navegadores. Importações exigem JSON válido, tamanho máximo 2,5 MB e validação pelo `restoreGame` (incluindo versões antigas). Arquivos inválidos não alteram a partida aberta.
- **Foco e teclado:** o tutorial, laboratório e relatório mantêm Tab/Shift+Tab dentro do diálogo, fecham com Escape e restauram o foco original quando possível. Os botões rápidos reaparecem no layout mobile. Animações respeitam `prefers-reduced-motion`.
- **Saves e gameplay:** schema **v7 inalterado**. Nenhuma alteração nas regras de evolução, no saldo ou nas taxas do benchmark. Os saves v1–v6 continuam migrando conforme a v0.9.1.

### Como testar a recuperação

1. Inicie uma partida, avance até o dia 10 e use **Salvar partida**. Continue até o dia 20 e salve novamente para produzir um **backup manual** do dia 10.
2. Continue alguns dias e use **Recuperar sessão**: o autosave deve permitir retomar o último estado salvo automaticamente (sem afetar o save manual).
3. Use **Recuperar backup** para carregar o estado anterior. Se estiver jogando, confirme a substituição ou cancele sem alterar o jogo.
4. Use **Exportar JSON**, inicie uma nova partida e **Importar JSON**: após confirmar, os indicadores, dia, seed e modo devem coincidir com o arquivo.
5. Experimente um arquivo JSON malformado; o jogo deve avisar e manter o estado atual.

**Importante:** armazenamento de navegador pode ser limpo, bloqueado ou atingir a cota. Exporte arquivos regularmente para conservar partidas fora do navegador. A versão não apaga automaticamente chaves antigas.

## Executar no Debian

```bash
cd /mnt/ows-data/games/ProjectZero
npm run test:quality
npm run benchmark
npm run build
npm run dev
```

Não é necessário repetir `npm install` se as dependências da v0.9.1 estão instaladas.

### Verificações realizadas no ambiente de geração

- `npm run test:quality`: **55/55 testes** (40+ testes anteriores e 9 de persistência).
- `npm run benchmark`: **576 partidas**, resultados idênticos ao benchmark anterior.
- `node --check` da prévia HTML offline aprovado.
- Prévia validada no Chromium headless desktop e mobile: tutorial, save, 5 dias simulados, download JSON, rejeição de slot vazio e restauração do save manual, **sem erros JavaScript**.
- TSX com checagem sintática por TypeScript. **Build React/Vite completo ainda depende de `npm run build` no Debian**, onde as dependências já existem.
- O teste de navegador usou HTML injetado porque o ambiente de automação bloqueia navegação por URL local; não é teste de instalação de site publicado.

### Arquivos importantes

- `src/engine/persistence.ts`: validação, leitura e gravação com slots independentes e proteção do backup.
- `src/components/useDialogFocus.ts`: teclado e foco de modais.
- `src/App.tsx`: controles React, importação/exportação e autosave.
- `scripts/build_preview.py`: prévia estática com o mesmo motor e persistência.
- `tests/persistence.test.mjs`: testes de corrupção, cota, recuperação, importação e determinismo.

### Escopo futuro

A v0.10 melhora a qualidade da versão alpha, mas **ainda não equivale a auditoria completa de acessibilidade ou beta público validado**. Permanecem necessários testes em Firefox real, sessões humanas de 15–30 minutos, compatibilidade cross-browser de gravação/arquivo e uma revisão de implantação estática.

Projeto totalmente fictício. Nenhum modelo representa epidemiologia real ou previsão do mundo real. Código independente dos projetos Motora e OWSPDV.
