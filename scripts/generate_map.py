"""Gera geometrias SVG estáticas simplificadas a partir do Natural Earth lowres local.
Executado somente para preparar a entrega; não é necessário no ambiente do jogo.
"""
import geopandas as gpd, json
from shapely.geometry import box, Polygon, MultiPolygon, GeometryCollection
from shapely.ops import unary_union
from pathlib import Path

source='/opt/pyvenv/lib/python3.13/site-packages/pyogrio/tests/fixtures/naturalearth_lowres/naturalearth_lowres.shp'
out=Path(__file__).resolve().parent.parent/'src/data/world.json'
gdf=gpd.read_file(source)
view=box(-180,-60,180,85)
W,H=1600,720

def tr(x,y):
 return round((x+180)/360*W,1), round((85-y)/145*H,1)

def path_ring(r):
 coords=list(r.coords)
 if len(coords)<4:return ''
 pts=[tr(*xy) for xy in coords]
 reduced=[]
 for p in pts:
  if not reduced or reduced[-1]!=p:reduced.append(p)
 if len(reduced)<3:return ''
 return 'M'+'L'.join(f'{x:g},{y:g}' for x,y in reduced)+'Z'

def poly_path(poly):
 return path_ring(poly.exterior)+''.join(path_ring(r) for r in poly.interiors)

def path_geom(geom):
 if geom.is_empty:return ''
 if isinstance(geom,Polygon):return poly_path(geom)
 if isinstance(geom,(MultiPolygon,GeometryCollection)):return ''.join(path_geom(x) for x in geom.geoms)
 return ''

fix={'France':'FRA','Norway':'NOR','Kosovo':'XKX','N. Cyprus':'CYP','Somaliland':'SOM'}
rows=[]
for _,row in gdf.iterrows():
 geom=row.geometry.simplify(.23,preserve_topology=True).intersection(view)
 countryid=fix.get(row['name'],row['iso_a3'])
 if countryid=='-99':countryid=f'X{len(rows):03d}'
 path=path_geom(geom)
 if not path:continue
 rows.append({'id':countryid,'name':row['name'],'d':path})
out.write_text(json.dumps(rows,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
print('countries',len(rows),'file bytes',out.stat().st_size)
