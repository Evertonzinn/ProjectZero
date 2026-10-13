# PROJECT ZERO — Alpha v0.11.0 (Imersão e Acabamento)

Jogo fictício de estratégia global, em **React 19 + Vite + TypeScript**, com motor determinístico, mapa SVG, 18 países selecionáveis, governos autônomos, eventos, quatro modos de dificuldade, laboratório, evolução, resultados e recuperação de saves. **Sem backend, multiplayer, contas ou serviços externos.**

## Novidades da v0.11

- **Som opcional via Web Audio API:** sinais discretos de início, compra, tática, alerta, evento, evolução e encerramento. Sem arquivos de áudio externos, sem transmissão de dados e sem reprodução automática. **Som desligado por padrão**; o jogador deve ativá-lo clicando em `♪ SOM OFF`.
- **Animações selecionáveis:** conexões entre territórios ativos com sinalização de fluxo, destaque suave do território selecionado e entrada de alertas. Clique em `✦ EFEITOS ON` para desativar; o sistema **sempre respeita `prefers-reduced-motion`**, mesmo quando a preferência local está ativa.
- **Alertas com significado:** o banner de marcos do jogo reflete o estado efetivo da partida, dando prioridade a encerramentos, patamares globais, eventos e pontos de evolução. Não muda regras nem prevê acontecimentos.
- **Preferências fora do save:** chave `project-zero-immersion-v011`, separada dos slots de partida (`project-zero-save-v1`, backup e autosave). Falha de storage ou WebAudio não impede o jogo.
- **Prévia offline sincronizada:** `preview-offline.html` inclui os controles de imersão e o mesmo detector de acontecimentos compilado do motor TS.

## Compatibilidade

**Save schema v7 preservado.** `advanceDay`, modificadores, probabilidades, seeds, custos, interface do motor e relatórios permanecem os mesmos da v0.10. Os saves v1–v6 continuam migrando como nas versões anteriores. Nenhum reset ou exclusão de chave de armazenamento.

## Rodar e validar no Debian

```bash
cd /mnt/ows-data/games/ProjectZero
npm run test:quality
npm run benchmark
npm run build
npm run dev
```

Abra `http://192.168.0.111:5173` quando o Vite estiver em execução na máquina da rede local. **Não precisa executar `npm install` novamente** se as dependências já estão instaladas, porque nenhuma biblioteca foi adicionada.

### Roteiro de aceitação

1. Comece com som desligado, inicie a simulação e verifique que **nenhum som é reproduzido**.
2. Ative o som com o botão e execute uma compra no laboratório. É esperado um toque curto, sem música de fundo.
3. No dia 10, veja o banner de pontos e a pausa do laboratório. Experimente 20× para verificar que eventos não empilham áudio nem interrompem a partida.
4. Desative `EFEITOS` e veja as conexões sem animação; reative e teste novamente. Ative **movimento reduzido** no sistema e confirme que a preferência do sistema prevalece.
5. Salve, exporte e importe a partida, verifique que o estado e os resultados não mudam ao ligar/desligar som e animações.
6. Reabra o jogo no celular e use os mesmos controles, sem perder acesso aos controles de recuperação.

## Testes e limites conhecidos

- `npm run test:quality` inclui testes existentes do motor, bots, persistência e novos testes do feedback de imersão.
- `npm run benchmark` deve manter os resultados da v0.10, pois o gameplay não foi alterado.
- `python3 scripts/build_preview.py` gera a prévia offline após `npm run test:engine` (requer TypeScript, já dependência do projeto).
- O som depende de `AudioContext` e do dispositivo/navegador; falhas de som não impedem a partida. Alguns navegadores suspendem áudio até interação explícita.
- A entrada do banner é uma **notificação visual**, não histórico permanente; o boletim global permanece como fonte de eventos.
- A validação React/Vite completa deve ser executada no Debian com as dependências instaladas. A prévia offline não substitui o typecheck da aplicação.

© Project Zero. Simulação inteiramente fictícia e sem valor preditivo. Dados do mapa: Natural Earth (domínio público).
