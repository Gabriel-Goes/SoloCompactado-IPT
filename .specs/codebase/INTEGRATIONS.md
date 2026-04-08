# External Integrations

## Mapa / Imagery

**Serviço:** Esri World Imagery (ArcGIS Online)
**Propósito:** Base visual de satélite para o mapa Leaflet
**Implementação:** `prototipo/src/domains/map.js:70`
```js
global.L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  { maxZoom: visualMaxZoom, maxNativeZoom: imageryNativeZoom }
)
```
**Autenticação:** Nenhuma (tile layer público)
**Fallback:** Em caso de `tileerror`, ativa automaticamente a camada BDC local (`setMapBase("bdc")`)

## Brazil Data Cube (BDC)

**Serviço:** INPE Brazil Data Cube — uso da terra
**Propósito:** Classificação temática do solo (vegetação densa/esparsa, solo nu, água)
**Implementação:** Raster local em `prototipo/data/terrain-bdc-raster.js`
**Formato:** classCodes codificados em Base64, decodificados em runtime (`hydrateTerrainRaster`)
**Uso no código:** `terrain.js:53` (hydrate), `map.js:21` (overlay canvas), `terrain.js:157` (resolveTerrainPixel)
**Autenticação:** N/A — dado local embutido

## Leaflet.js

**Serviço:** Biblioteca de mapas client-side
**Propósito:** Renderização do mapa, layers, polígonos, polylines, markers
**Implementação:** Carregado via CDN no `index.html` (disponível como `global.L`)
**Versão:** Definida no index.html (verificar tag `<script>`)

## localStorage

**Serviço:** Web Storage API do browser
**Propósito:** Persistência da missão ativa entre sessões
**Implementação:** `prototipo/src/core/storage.js`
**Chave:** Definida como constante em `storage.js` (ex: `solo-compactado-mission`)
**Schema:** JSON com `storage_schema_version` para detectar incompatibilidade
**Fallback:** Se indisponível (`storageAvailable = false`), dados permanecem apenas em memória

## Integrações Ausentes (Relevantes para Roadmap)

- **GPS real:** Atualmente simulado via teclado; para embarcado, precisará de integração NMEA/serial
- **GeoServer remoto:** Mencionado no perfil de ambiente do usuário; ainda não integrado ao protótipo web
- **API CNH/agricola:** Cliente direto, mas sem API conectada ao protótipo ainda
