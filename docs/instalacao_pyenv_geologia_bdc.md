# Instalação do `pyenv`/`geologia` para regenerar o HTML do protótipo

Este guia documenta como preparar o ambiente Python usado pela Sprint 4 para:

- baixar/ler os COGs do Brazil Data Cube via `rasterio`
- gerar `terrain-bdc-raster.json`, `terrain-grid.json` e `terrain-sources.json`
- re-embutir os dados no `prototipo/index.html`

O repositório já aponta para esse ambiente em `.python-version`:

```txt
geologia
```

## 1. Dependências de sistema

Em Ubuntu/Debian, instale primeiro os pacotes de build e bibliotecas nativas usadas por `rasterio`/`pyproj`:

```bash
sudo apt update
sudo apt install -y \
  build-essential \
  curl \
  git \
  libssl-dev \
  zlib1g-dev \
  libbz2-dev \
  libreadline-dev \
  libsqlite3-dev \
  llvm \
  libncursesw5-dev \
  xz-utils \
  tk-dev \
  libxml2-dev \
  libxmlsec1-dev \
  libffi-dev \
  liblzma-dev \
  libgdal-dev \
  gdal-bin \
  proj-bin \
  libproj-dev
```

Se você estiver em outra distribuição, a regra é a mesma: instalar toolchain C/C++, GDAL e PROJ antes de instalar os pacotes Python.

## 2. Instalar `pyenv`

Se ainda não tiver `pyenv`:

```bash
curl https://pyenv.run | bash
```

Adicione ao shell (`~/.bashrc` ou equivalente):

```bash
export PYENV_ROOT="$HOME/.pyenv"
[[ -d $PYENV_ROOT/bin ]] && export PATH="$PYENV_ROOT/bin:$PATH"
eval "$(pyenv init - bash)"
eval "$(pyenv virtualenv-init - bash)"
```

Reabra o shell ou rode:

```bash
source ~/.bashrc
```

## 3. Instalar o plugin `pyenv-virtualenv`

Se o plugin ainda não estiver disponível:

```bash
git clone https://github.com/pyenv/pyenv-virtualenv.git \
  "$(pyenv root)/plugins/pyenv-virtualenv"
```

Depois recarregue o shell:

```bash
source ~/.bashrc
```

## 4. Criar o ambiente `geologia`

Instale a versão Python usada no projeto e crie o virtualenv:

```bash
pyenv install 3.13.7
pyenv virtualenv 3.13.7 geologia
```

Entre na raiz do repositório:

```bash
cd /caminho/para/SoloCompactado
```

Ative o ambiente local:

```bash
pyenv local geologia
```

Cheque:

```bash
python --version
python -c "import sys; print(sys.executable)"
```

## 5. Instalar dependências Python

Com o ambiente `geologia` ativo:

```bash
python -m pip install --upgrade pip setuptools wheel
python -m pip install numpy pyproj rasterio
```

Valide os imports:

```bash
python - <<'PY'
import rasterio
import numpy
import pyproj
print("ok:", rasterio.__version__, numpy.__version__, pyproj.__version__)
PY
```

## 6. Gerar os dados locais do BDC

O script principal é:

- [enriquecer-grade-bdc.py](/home/ggrl/projetos/ipt/Civil/Geotecnia/SoloCompactado/prototipo/scripts/enriquecer-grade-bdc.py)

Execute na raiz do repositório:

```bash
python prototipo/scripts/enriquecer-grade-bdc.py
```

Esse passo atualiza:

- `prototipo/data/terrain-bdc-raster.json`
- `prototipo/data/terrain-grid.json`
- `prototipo/data/terrain-sources.json`

Observação: esse script precisa de acesso de rede ao `data.inpe.br`, porque os COGs são lidos via `/vsicurl/`.

## 7. Re-embutir os dados no `index.html`

Depois de regenerar os JSONs, re-embuta os blocos no HTML:

```bash
node - <<'NODE'
const fs = require('fs');

const htmlPath = 'prototipo/index.html';
const html = fs.readFileSync(htmlPath, 'utf8');
const payloads = {
  'terrain-sources-data': fs.readFileSync('prototipo/data/terrain-sources.json', 'utf8'),
  'terrain-grid-data': fs.readFileSync('prototipo/data/terrain-grid.json', 'utf8'),
  'terrain-bdc-raster-data': fs.readFileSync('prototipo/data/terrain-bdc-raster.json', 'utf8'),
};

function indentJson(jsonText) {
  return jsonText.trimEnd().split('\n').map(line => `      ${line}`).join('\n');
}

function replaceOrInsert(htmlText, scriptId, jsonText, insertAfterId) {
  const block = `    <script id="${scriptId}" type="application/json">\n${indentJson(jsonText)}\n    </script>`;
  const pattern = new RegExp(`<script id="${scriptId}" type="application/json">[\\s\\S]*?<\\/script>`, 'm');
  if (pattern.test(htmlText)) {
    return htmlText.replace(pattern, block);
  }
  const afterPattern = new RegExp(`(<script id="${insertAfterId}" type="application/json">[\\s\\S]*?<\\/script>)`, 'm');
  if (!afterPattern.test(htmlText)) {
    throw new Error(`bloco base não encontrado: ${insertAfterId}`);
  }
  return htmlText.replace(afterPattern, `$1\n\n${block}`);
}

let updated = html;
updated = replaceOrInsert(updated, 'terrain-sources-data', payloads['terrain-sources-data'], 'terrain-sources-data');
updated = replaceOrInsert(updated, 'terrain-grid-data', payloads['terrain-grid-data'], 'terrain-grid-data');
updated = replaceOrInsert(updated, 'terrain-bdc-raster-data', payloads['terrain-bdc-raster-data'], 'terrain-grid-data');

fs.writeFileSync(htmlPath, updated, 'utf8');
console.log('index.html atualizado');
NODE
```

## 8. Validação rápida

Valide a sintaxe do script:

```bash
python -m py_compile prototipo/scripts/enriquecer-grade-bdc.py
```

Valide o JavaScript embutido do HTML:

```bash
node - <<'NODE'
const fs = require('fs');
const html = fs.readFileSync('prototipo/index.html', 'utf8');
const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
  .filter(([, attrs]) => !/type\s*=\s*["']application\/json["']/i.test(attrs))
  .map(([, , body]) => body);
for (const [i, body] of scripts.entries()) {
  new Function(body);
  console.log('ok', i);
}
NODE
```

## 9. Resultado esperado

No fim do processo:

- o ambiente `geologia` existe em `pyenv`
- os imports `rasterio`, `numpy` e `pyproj` funcionam
- `prototipo/data/terrain-bdc-raster.json` foi gerado
- `prototipo/index.html` contém:
  - `terrain-sources-data`
  - `terrain-grid-data`
  - `terrain-bdc-raster-data`

Isso deixa o HTML pronto para abrir localmente com o overlay BDC pixelado e o HUD consultando o pixel corrente.
