from datetime import date

project = "SoloCompactado IPT"
author = "Equipe SoloCompactado"
release = "0.1.0"

extensions = [
    "sphinx.ext.mathjax",
]

templates_path = ["_templates"]
exclude_patterns = ["_build", "Thumbs.db", ".DS_Store"]
language = "pt_BR"

numfig = True
math_eqref_format = "Eq. {number}"

html_theme = "alabaster"
html_static_path = ["_static"]
html_css_files = ["custom.css"]
html_title = "SoloCompactado IPT - Documentação Técnica"
html_last_updated_fmt = "%d/%m/%Y"

copyright = f"{date.today().year}, {author}"
