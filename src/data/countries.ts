// Valores de população e atributos são parâmetros de gameplay, NÃO dados atuais ou modelos reais.
export interface CountryDefinition {
  id: string;
  name: string;
  flag: string;
  population: number;
  connectivity: number;
  science: number;
  economy: number;
  position: readonly [number, number]; // longitude, latitude; somente marcador visual
  links: readonly string[]; // grafo abstrato, não rotas reais
}

export const COUNTRIES: readonly CountryDefinition[] = [
  { id:'BRA', name:'Brasil', flag:'🇧🇷', population:214_000_000, connectivity:75, science:56, economy:67, position:[-52,-11], links:['ARG','USA','ZAF','FRA','NGA'] },
  { id:'USA', name:'Estados Unidos', flag:'🇺🇸', population:332_000_000, connectivity:96, science:91, economy:90, position:[-101,39], links:['CAN','MEX','BRA','GBR','JPN','CHN','FRA'] },
  { id:'CAN', name:'Canadá', flag:'🇨🇦', population:39_000_000, connectivity:78, science:86, economy:85, position:[-105,58], links:['USA','GBR','FRA','JPN'] },
  { id:'MEX', name:'México', flag:'🇲🇽', population:129_000_000, connectivity:71, science:52, economy:64, position:[-102,24], links:['USA','BRA','CAN','ESP'] },
  { id:'ARG', name:'Argentina', flag:'🇦🇷', population:46_000_000, connectivity:61, science:51, economy:58, position:[-64,-35], links:['BRA','USA','ESP','ZAF'] },
  { id:'GBR', name:'Reino Unido', flag:'🇬🇧', population:68_000_000, connectivity:93, science:92, economy:87, position:[-2,54], links:['USA','CAN','FRA','DEU','ESP','IND','ZAF'] },
  { id:'FRA', name:'França', flag:'🇫🇷', population:67_000_000, connectivity:89, science:86, economy:83, position:[2,46], links:['GBR','DEU','ESP','BRA','EGY','NGA'] },
  { id:'DEU', name:'Alemanha', flag:'🇩🇪', population:83_000_000, connectivity:92, science:94, economy:90, position:[10.5,51], links:['GBR','FRA','ESP','RUS','CHN','IND'] },
  { id:'ESP', name:'Espanha', flag:'🇪🇸', population:48_000_000, connectivity:86, science:79, economy:80, position:[-4,40], links:['FRA','DEU','GBR','ARG','MEX','EGY'] },
  { id:'RUS', name:'Rússia', flag:'🇷🇺', population:144_000_000, connectivity:72, science:75, economy:75, position:[92,60], links:['DEU','CHN','JPN','IND'] },
  { id:'CHN', name:'China', flag:'🇨🇳', population:1_400_000_000, connectivity:91, science:83, economy:92, position:[104,34], links:['RUS','IND','JPN','IDN','USA','AUS','DEU'] },
  { id:'IND', name:'Índia', flag:'🇮🇳', population:1_380_000_000, connectivity:86, science:65, economy:76, position:[79,22], links:['CHN','RUS','IDN','GBR','DEU','EGY'] },
  { id:'JPN', name:'Japão', flag:'🇯🇵', population:125_000_000, connectivity:91, science:94, economy:89, position:[138,37], links:['USA','CAN','CHN','RUS','IDN','AUS'] },
  { id:'AUS', name:'Austrália', flag:'🇦🇺', population:26_000_000, connectivity:73, science:88, economy:85, position:[134,-25], links:['JPN','CHN','IDN','ZAF'] },
  { id:'ZAF', name:'África do Sul', flag:'🇿🇦', population:60_000_000, connectivity:64, science:57, economy:67, position:[25,-29], links:['NGA','EGY','GBR','AUS','BRA','ARG'] },
  { id:'EGY', name:'Egito', flag:'🇪🇬', population:105_000_000, connectivity:68, science:48, economy:62, position:[30,26], links:['FRA','ESP','NGA','ZAF','IND'] },
  { id:'NGA', name:'Nigéria', flag:'🇳🇬', population:215_000_000, connectivity:57, science:41, economy:54, position:[8,9], links:['ZAF','EGY','FRA','BRA'] },
  { id:'IDN', name:'Indonésia', flag:'🇮🇩', population:275_000_000, connectivity:76, science:52, economy:69, position:[119,-2], links:['IND','CHN','JPN','AUS'] },
] as const;

export const COUNTRY_BY_ID: Readonly<Record<string, CountryDefinition>> =
  Object.fromEntries(COUNTRIES.map(country => [country.id, country]));

export const TOTAL_POPULATION = COUNTRIES.reduce((sum, country) => sum + country.population, 0);
