import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const tmp = mkdtempSync(join(tmpdir(), 'project-zero-test-'));
try {
  execFileSync(process.platform === 'win32' ? 'tsc.cmd' : 'tsc', [
    '--strict', '--target', 'es2022', '--module', 'commonjs', '--outDir', tmp,
    'src/data/countries.ts', 'src/simulation/engine.ts',
  ], { stdio: 'inherit' });

  const require = createRequire(import.meta.url);
  const { createGame, startGame, simulateDay, getGlobalStats } = require(join(tmp, 'simulation', 'engine.js'));
  const { COUNTRIES, ROUTES } = require(join(tmp, 'data', 'countries.js'));
  const ids = new Set(COUNTRIES.map((country) => country.id));
  assert.equal(COUNTRIES.length, 20);
  assert.ok(ROUTES.every((route) => ids.has(route.from) && ids.has(route.to)));

  const setup = createGame('BRA');
  assert.equal(setup.status, 'setup');
  assert.equal(setup.day, 0);
  assert.equal(simulateDay(setup), setup, 'A simulação não deve avançar no setup');
  assert.equal(getGlobalStats(setup).reached, 0);
  assert.equal(startGame(setup).countries.BRA.exposure, 3.5);

  for (const source of ['BRA', 'USA', 'CHN', 'NGA', 'AUS']) {
    let a = startGame(createGame(source));
    let b = startGame(createGame(source));
    while (a.status === 'running' && a.day < 180) {
      a = simulateDay(a);
      b = simulateDay(b);
      assert.deepEqual(a, b, `O resultado deve ser reprodutível: ${source}`);
      assert.ok(a.research >= 0 && a.research <= 100);
      for (const metric of Object.values(a.countries)) {
        assert.ok(metric.exposure >= 0 && metric.exposure <= 100);
        assert.ok(metric.alert >= 0 && metric.alert <= 100);
      }
    }
    assert.ok(['victory', 'defeat'].includes(a.status), `A partida deve terminar: ${source}`);
    assert.equal(simulateDay(a), a, 'Partidas encerradas não devem avançar');
    process.stdout.write(`PASS ${source}: ${a.status} no dia ${a.day}\n`);
  }
  let victory = startGame(createGame('BRA', 'ZERO-TEST', { spread: 10, stealth: 10, endurance: 10 }));
  while (victory.status === 'running' && victory.day < 180) victory = simulateDay(victory);
  assert.equal(victory.status, 'victory', 'Deve existir ao menos uma configuração vitoriosa');
  const highExposure = Object.fromEntries(COUNTRIES.map(({ id }, i) => [id, { exposure: i < 16 ? 90 : 0, alert: 60, controlled: false }]));
  const conflict = simulateDay({ ...startGame(createGame('BRA')), research: 99.9, countries: highExposure });
  assert.equal(conflict.status, 'defeat', 'A pesquisa concluída deve impedir vitória simultânea');
  process.stdout.write('PASS determinismo, limites, estados, rotas, vitória e prioridade da contramedida\n');
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
