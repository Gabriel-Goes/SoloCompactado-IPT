import os
import sys
from datetime import date

sys.path.insert(0, os.path.abspath("../src"))

project = "SoloCompactado IPT"
author = "Equipe SoloCompactado"
release = "0.1.0"

extensions = [
    "sphinx.ext.mathjax",
    "sphinx.ext.autodoc",
    "sphinx.ext.viewcode",
]

templates_path = ["_templates"]
exclude_patterns = ["_build", "Thumbs.db", ".DS_Store"]
language = "pt_BR"

numfig = True
math_eqref_format = "Eq. {number}"

html_theme = "alabaster"
html_static_path = ["_static"]
html_css_files = ["custom.css"]
html_logo = "_static/logo_solo_compactado.svg"
html_title = "SoloCompactado IPT - Documentação Técnica"
html_last_updated_fmt = "%d/%m/%Y"

autodoc_member_order = "bysource"
autodoc_typehints = "description"
autodoc_preserve_defaults = True

copyright = f"{date.today().year}, {author}"
