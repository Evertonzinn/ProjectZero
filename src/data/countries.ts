/** Parâmetros ficcionais de gameplay. Não são indicadores epidemiológicos ou estatais reais. */
export const COUNTRIES = [
  { id: 'BRA', name: 'Brasil', flag: '🇧🇷', region: 'América do Sul', lon: -52, lat: -12, defense: 43, connectivity: 67, research: 36 },
  { id: 'USA', name: 'Estados Unidos', flag: '🇺🇸', region: 'América do Norte', lon: -99, lat: 39, defense: 75, connectivity: 92, research: 90 },
  { id: 'CAN', name: 'Canadá', flag: '🇨🇦', region: 'América do Norte', lon: -106, lat: 58, defense: 71, connectivity: 62, research: 78 },
  { id: 'MEX', name: 'México', flag: '🇲🇽', region: 'América do Norte', lon: -102, lat: 24, defense: 49, connectivity: 72, research: 43 },
  { id: 'ARG', name: 'Argentina', flag: '🇦🇷', region: 'América do Sul', lon: -64, lat: -36, defense: 47, connectivity: 51, research: 49 },
  { id: 'GBR', name: 'Reino Unido', flag: '🇬🇧', region: 'Europa', lon: -3, lat: 54, defense: 76, connectivity: 89, research: 87 },
  { id: 'FRA', name: 'França', flag: '🇫🇷', region: 'Europa', lon: 2, lat: 47, defense: 73, connectivity: 85, research: 85 },
  { id: 'DEU', name: 'Alemanha', flag: '🇩🇪', region: 'Europa', lon: 10, lat: 51, defense: 78, connectivity: 88, research: 92 },
  { id: 'ESP', name: 'Espanha', flag: '🇪🇸', region: 'Europa', lon: -4, lat: 40, defense: 67, connectivity: 79, research: 68 },
  { id: 'RUS', name: 'Rússia', flag: '🇷🇺', region: 'Europa / Ásia', lon: 93, lat: 62, defense: 60, connectivity: 62, research: 77 },
  { id: 'CHN', name: 'China', flag: '🇨🇳', region: 'Ásia', lon: 104, lat: 35, defense: 72, connectivity: 95, research: 85 },
  { id: 'IND', name: 'Índia', flag: '🇮🇳', region: 'Ásia', lon: 79, lat: 22, defense: 42, connectivity: 87, research: 72 },
  { id: 'JPN', name: 'Japão', flag: '🇯🇵', region: 'Ásia', lon: 138, lat: 37, defense: 86, connectivity: 90, research: 96 },
  { id: 'AUS', name: 'Austrália', flag: '🇦🇺', region: 'Oceania', lon: 133, lat: -25, defense: 79, connectivity: 72, research: 82 },
  { id: 'ZAF', name: 'África do Sul', flag: '🇿🇦', region: 'África', lon: 25, lat: -29, defense: 45, connectivity: 63, research: 48 },
  { id: 'EGY', name: 'Egito', flag: '🇪🇬', region: 'África', lon: 30, lat: 27, defense: 44, connectivity: 69, research: 39 },
  { id: 'NGA', name: 'Nigéria', flag: '🇳🇬', region: 'África', lon: 8, lat: 9, defense: 35, connectivity: 60, research: 35 },
  { id: 'SAU', name: 'Arábia Saudita', flag: '🇸🇦', region: 'Oriente Médio', lon: 45, lat: 24, defense: 67, connectivity: 75, research: 62 },
  { id: 'IDN', name: 'Indonésia', flag: '🇮🇩', region: 'Ásia', lon: 118, lat: -3, defense: 46, connectivity: 78, research: 43 },
  { id: 'KOR', name: 'Coreia do Sul', flag: '🇰🇷', region: 'Ásia', lon: 128, lat: 36, defense: 85, connectivity: 93, research: 94 },
] as const;

export type CountryId = (typeof COUNTRIES)[number]['id'];
export type Country = (typeof COUNTRIES)[number];

export const COUNTRY_BY_ID = Object.fromEntries(COUNTRIES.map((country) => [country.id, country])) as Record<CountryId, Country>;

export const ROUTES: ReadonlyArray<{ from: CountryId; to: CountryId; mode: 'air' | 'sea'; intensity: number }> = [
  { from: 'BRA', to: 'USA', mode: 'air', intensity: 0.9 },
  { from: 'BRA', to: 'ARG', mode: 'sea', intensity: 0.8 },
  { from: 'BRA', to: 'ZAF', mode: 'sea', intensity: 0.62 },
  { from: 'BRA', to: 'ESP', mode: 'air', intensity: 0.72 },
  { from: 'USA', to: 'CAN', mode: 'air', intensity: 0.97 },
  { from: 'USA', to: 'MEX', mode: 'air', intensity: 0.96 },
  { from: 'USA', to: 'GBR', mode: 'air', intensity: 0.92 },
  { from: 'USA', to: 'JPN', mode: 'air', intensity: 0.65 },
  { from: 'CAN', to: 'GBR', mode: 'air', intensity: 0.66 },
  { from: 'MEX', to: 'ARG', mode: 'air', intensity: 0.6 },
  { from: 'GBR', to: 'FRA', mode: 'air', intensity: 0.95 },
  { from: 'GBR', to: 'DEU', mode: 'air', intensity: 0.78 },
  { from: 'FRA', to: 'ESP', mode: 'air', intensity: 0.95 },
  { from: 'FRA', to: 'DEU', mode: 'air', intensity: 0.9 },
  { from: 'DEU', to: 'RUS', mode: 'air', intensity: 0.75 },
  { from: 'ESP', to: 'EGY', mode: 'air', intensity: 0.63 },
  { from: 'RUS', to: 'CHN', mode: 'air', intensity: 0.75 },
  { from: 'RUS', to: 'KOR', mode: 'air', intensity: 0.65 },
  { from: 'CHN', to: 'IND', mode: 'air', intensity: 0.86 },
  { from: 'CHN', to: 'JPN', mode: 'sea', intensity: 0.9 },
  { from: 'CHN', to: 'KOR', mode: 'air', intensity: 0.95 },
  { from: 'CHN', to: 'IDN', mode: 'sea', intensity: 0.91 },
  { from: 'IND', to: 'SAU', mode: 'air', intensity: 0.75 },
  { from: 'IND', to: 'IDN', mode: 'sea', intensity: 0.82 },
  { from: 'JPN', to: 'KOR', mode: 'sea', intensity: 0.9 },
  { from: 'JPN', to: 'AUS', mode: 'air', intensity: 0.8 },
  { from: 'AUS', to: 'IDN', mode: 'sea', intensity: 0.9 },
  { from: 'AUS', to: 'ZAF', mode: 'sea', intensity: 0.58 },
  { from: 'ZAF', to: 'NGA', mode: 'air', intensity: 0.76 },
  { from: 'ZAF', to: 'EGY', mode: 'air', intensity: 0.69 },
  { from: 'NGA', to: 'EGY', mode: 'air', intensity: 0.67 },
  { from: 'EGY', to: 'SAU', mode: 'sea', intensity: 0.86 },
  { from: 'SAU', to: 'DEU', mode: 'air', intensity: 0.7 },
];

export function project(lon: number, lat: number): [number, number] {
  return [((lon + 180) / 360) * 1200, ((90 - lat) / 180) * 600];
}
