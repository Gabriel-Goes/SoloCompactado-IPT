# Critical Review of SoloCompactado-IPT

*Author: GitHub Copilot — February 2026*

---

## 1. Executive Summary

**SoloCompactado-IPT** is a prototype that models the incremental compaction of a soil column
(up to 5 m deep) subjected to multiple passes of a heavy machine at a single surface point,
producing a per-pass time series and a final vertical-profile output.

Based on the repository contents available at the time of this review (one `README.md` file and
no Python scripts, `Proposta.md`, or `Prototipo.md`), this essay evaluates the stated intent of
the project, the conceptual and physical soundness of the described approach, and the kinds of
issues that are likely to arise when the implementation is eventually written. Observations are
therefore partly speculative but grounded in established soil-compaction theory and software
engineering practice.

---

## 2. Repository Structure and Completeness

### 2.1 What is present

| File | Status | Comment |
|------|--------|---------|
| `README.md` | ✔ present | Short; 4 sentences describing the prototype idea |

### 2.2 What is missing

The `README.md` itself references three additional documents and an executable prototype:

| Referenced artifact | Status |
|---------------------|--------|
| `Proposta.md` | ✘ absent |
| `Prototipo.md` | ✘ absent |
| Python scripts | ✘ absent |
| Data files / input parameters | ✘ absent |
| Tests | ✘ absent |
| `requirements.txt` / `pyproject.toml` | ✘ absent |

The repository is, at this stage, essentially a placeholder. Any reviewer attempting to reproduce
or validate the work cannot do so because neither the source code nor the supporting documentation
is available. This is the single most critical deficiency.

**Recommendation 1:** Commit at minimum (a) `Proposta.md`, (b) `Prototipo.md`, (c) all Python
scripts, and (d) a `requirements.txt` or `pyproject.toml` before asking for a review.

---

## 3. Conceptual and Physical Critique

### 3.1 Scope of the model

The README describes a 1-D column model: one surface point, vertical propagation down to 5 m,
multiple sequential passes. This is a reasonable first approximation for research purposes but
comes with well-known limitations:

* **Lateral confinement is assumed to be infinite.** Real compaction is three-dimensional; lateral
  strain relief near the edge of a compaction zone is ignored.
* **The loading waveform is unspecified.** A vibratory roller applies a dynamic load whose
  amplitude and frequency strongly influence the depth of influence. A static (quasi-static)
  model will underestimate compaction at depth.
* **Single-point focus.** Practical field compaction produces a spatial distribution of density;
  a point model cannot be used to infer roller-path coverage adequacy.

These are acceptable trade-offs for a *prototype*, but they must be clearly stated as assumptions
in `Proposta.md` and `Prototipo.md`.

### 3.2 Compaction model

Without access to the Python code, the specific constitutive model cannot be evaluated. However,
the description implies an iterative pass-by-pass accumulation of deformation. Common choices for
1-D compaction prototypes are:

* **Modified Proctor curve fitting** — empirical, suitable for a first prototype.
* **Cam-Clay or Modified Cam-Clay** — physically grounded, requires calibration of yield-surface
  parameters (λ, κ, M, e₀).
* **Janbu tangent-modulus** — practical for settlement, applicable to staged loading.

**Recommendation 2:** `Prototipo.md` should document which model is used, its governing
equations, and the physical meaning and units of every parameter.

---

## 4. Anticipated Python Script Critique

Based on the described outputs (per-pass time series + vertical profile), the following potential
issues are flagged in advance. These should be revisited once the actual code is available.

### 4.1 Calculation concerns

#### 4.1.1 Unit consistency
Soil mechanics uses mixed unit systems in the literature (kPa vs. kN/m², t/m³ vs. kg/m³,
degrees vs. radians for friction angles). Scripts that mix unit systems silently are a common
source of errors that are difficult to detect because results may look plausible.

**Recommendation 3:** Define a single unit convention at the top of every script (e.g.,
SI throughout: Pa, kg, m) and add assertion checks where dimensioned quantities are combined.

#### 4.1.2 Depth discretisation
A 5 m column discretised into N layers requires careful choice of layer thickness Δz.
If the chosen constitutive model uses finite differences or explicit time integration,
numerical stability requires:

```
Δz ≤ C · √(E/ρ) · Δt        (explicit wave propagation, C ≤ 1 is the Courant number)
```

Using too few layers (coarse mesh) will over-smooth the compaction profile; too many layers with
an explicit scheme will require an unreasonably small time step.

**Recommendation 4:** Document the chosen Δz, justify it against the model's stability criterion,
and add a runtime check that raises a `ValueError` if the user supplies parameters that violate
stability.

#### 4.1.3 Pass-by-pass accumulation
Compaction is an irreversible, history-dependent process. The residual void ratio (or density)
after pass *n* must be the initial state for pass *n + 1*. A common mistake is to re-initialise
the soil state at each pass rather than carrying the accumulated deformation forward.

**Recommendation 5:** Add a unit test that verifies monotonic (non-decreasing) density with each
additional pass for a homogeneous column under identical loading.

#### 4.1.4 Energy balance check
If the model tracks work input (from the machine) and energy dissipation (from plastic
deformation), the sum of dissipated energy must never exceed input energy (first-law
violation would indicate a sign error or incorrect integration).

**Recommendation 6:** Add an energy-balance assertion to the simulation loop.

### 4.2 Plotting concerns

#### 4.2.1 Axes labels and units
Depth profiles are typically plotted with depth increasing *downward* (positive z downward).
Many general-purpose plotting libraries (Matplotlib) use the convention that y increases upward.
Forgetting to invert the y-axis (`ax.invert_yaxis()`) produces a physically misleading plot where
"deeper" layers appear above "shallower" ones.

**Recommendation 7:** Always call `ax.invert_yaxis()` on vertical-profile subplots, and label
axes with quantities *and* units (e.g., `"Densidade seca (kg/m³)"`, `"Profundidade (m)"`).

#### 4.2.2 Colormap choice for the time-series panel
If passes are colour-coded along a sequential colormap, ensure the colormap is perceptually
uniform (e.g., `viridis`, `plasma`) rather than `jet`/`rainbow`, which creates false
discontinuities and is not accessible to colour-blind readers.

**Recommendation 8:** Use `matplotlib.cm.viridis` or `matplotlib.cm.plasma` for multi-pass
overlay plots, and include a colorbar with a descriptive label.

#### 4.2.3 Hardcoded figure size and DPI
Hardcoding `figsize=(10, 6)` and `dpi=72` is common in prototype scripts but produces
low-resolution figures unsuitable for publication.

**Recommendation 9:** Expose figure size and DPI as configurable parameters (or constants near
the top of the script) set to publication-quality defaults (e.g., `dpi=300`,
width = column width in the target journal in inches).

#### 4.2.4 Missing `plt.tight_layout()` / `plt.savefig()` pattern
Scripts that call `plt.show()` without also offering a `plt.savefig()` path are not
reproducible in headless CI environments. Scripts that save figures but do not call
`plt.tight_layout()` often produce clipped axis labels.

**Recommendation 10:** Structure every script's plotting section as:

```python
fig, axes = plt.subplots(...)
# ... draw ...
fig.tight_layout()
fig.savefig(output_path, dpi=300)
plt.close(fig)  # avoid memory leaks in batch runs
```

---

## 5. Software Engineering Observations

### 5.1 No dependency declaration

Without `requirements.txt` or `pyproject.toml` there is no guarantee that the script runs on
another machine. Python version, NumPy version, and Matplotlib version all affect numerical
results and plot appearance.

**Recommendation 11:** Add a `requirements.txt` pinning at least the major versions:

```
numpy>=1.24,<2
matplotlib>=3.7,<4
scipy>=1.10,<2      # if used for ODE integration or optimisation
```

### 5.2 No tests

There is no test suite. For a numerical prototype, the minimum acceptable test set is:

* **Smoke test** — script runs to completion without errors for default parameters.
* **Regression test** — final profile matches a known-good reference array (saved as `.npy`).
* **Physical-property tests** — density is always positive; compaction is monotonically
  non-decreasing with passes; layer thickness sums to 5 m.

**Recommendation 12:** Add a `tests/` directory with at least the three categories above,
runnable via `pytest`.

### 5.3 Magic numbers

Prototype scripts typically embed parameter values as literals scattered throughout the code
(e.g., `n_layers = 50`, `rho_s = 2650.0`). This makes it impossible to perform a
parameter sensitivity study without editing the source.

**Recommendation 13:** Collect all physical and numerical parameters into a single `params`
dictionary or dataclass at the entry point, and pass it into all functions.

### 5.4 Random-seed reproducibility

If any stochastic element exists (e.g., spatially variable initial conditions drawn from a
distribution), the random seed must be fixed and documented for reproducibility.

**Recommendation 14:** Call `numpy.random.default_rng(seed=42)` (or equivalent) at the top
level if any stochastic sampling is performed.

---

## 6. Documentation Quality

The current `README.md` is four sentences long. While brevity can be a virtue, it is insufficient
for a project that describes itself as a scientific prototype:

* There is no description of how to install dependencies.
* There is no description of how to run the scripts.
* There are no example outputs.
* There is no statement of the scientific question being answered.
* There is no citation to the relevant literature (e.g., the IPT compaction standards or
  Brazilian ABNT norms for subgrade compaction).

**Recommendation 15:** Expand `README.md` to include at minimum: installation steps, a
quick-start example with expected output, a list of parameters with physical meaning, and a
reference to the governing technical standard (IPT or DNIT).

---

## 7. Summary of Recommendations

| # | Priority | Recommendation |
|---|----------|----------------|
| 1 | 🔴 Critical | Commit all source files (`Proposta.md`, `Prototipo.md`, Python scripts) |
| 2 | 🔴 Critical | Document the constitutive model and all parameters with units |
| 3 | 🟠 High | Enforce a single unit system; add dimensional-consistency checks |
| 4 | 🟠 High | Document and enforce the mesh/time-step stability criterion |
| 5 | 🟠 High | Add a unit test for monotonic density increase with passes |
| 6 | 🟡 Medium | Add an energy-balance assertion in the simulation loop |
| 7 | 🟠 High | Invert y-axis on depth profiles; label all axes with quantities and units |
| 8 | 🟡 Medium | Use perceptually uniform colormaps; add a colorbar |
| 9 | 🟡 Medium | Make figure size/DPI configurable; use publication-quality defaults |
| 10 | 🟡 Medium | Adopt the `tight_layout` + `savefig` + `close` plotting pattern |
| 11 | 🟠 High | Add `requirements.txt` with pinned dependency versions |
| 12 | 🟠 High | Add a `tests/` directory with smoke, regression, and property tests |
| 13 | 🟡 Medium | Replace magic numbers with a centralised parameter dictionary |
| 14 | 🟢 Low | Fix the random seed if stochastic sampling is used |
| 15 | 🟡 Medium | Expand `README.md` with installation, usage, and literature references |

---

## 8. Conclusion

**SoloCompactado-IPT** has a clearly defined and scientifically relevant goal: simulating
cumulative soil compaction in a 1-D column under repeated machine passes. The conceptual
framework is sound and the 1-D approximation is a reasonable prototype-level simplification.

However, in its current state the repository is essentially empty — the implementation has not
yet been committed. When the Python scripts are added, the most important quality checks will be:
(1) physical correctness of the constitutive model and its numerical integration, (2) correct
handling of depth orientation in plots, and (3) a test suite that enforces the expected physical
behaviour across the parameter space.

With the improvements outlined above, this prototype could serve as a solid foundation for a
more comprehensive simulation tool aligned with Brazilian geotechnical practice standards.

---

*This review was produced by reading the available repository contents and applying knowledge of
soil mechanics, numerical methods, and Python scientific computing best practices.
No source files were modified.*
