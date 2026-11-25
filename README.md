# GAPIT AI for DeepSeek Harness

A DSH plugin bundle that publishes the **GAPIT AI** skill: a GAPIT 4.1 expert for
GWAS and genomic selection in R. The skill covers model choice, parameter
semantics, error triage, result interpretation, and runnable R pipelines.

## Install in DeepSeek Harness

Clone the repository, then install the checkout as a bundle:

```bash
git clone https://github.com/Mongfayi/dsh-gapit-ai.git
```

In DSH, open the Plugin Manager, choose to install a bundle from a local
directory, and point it at the cloned `dsh-gapit-ai` folder (the one containing
`package.json`). The bundle appears as **GAPIT AI** and adds the `gapit-ai`
skill.

> If this skill was previously installed as a plain folder under
> `~/.dsh/skills/gapit-ai` (or `project/.dsh/skills/gapit-ai`), delete that copy
> first. Filesystem-provider skills sit in a nearer registry layer and shadow the
> plugin's copy regardless of rank.

## What it adds

- One skill, `gapit-ai`, in the skill catalog (model- and user-invocable,
  loaded on demand).
- The full payload lives beside the plugin: `SKILL.md` as the entry point,
  `references/` for progressive disclosure, and `resources/` with the bundled
  GAPIT function library (21,143 lines), two R templates, and a 304-entry
  real-world question bank.

Nothing runs when the skill is not invoked. The bundle registers no tools and
does not touch user files.

## Requirements

R 4.x with the GAPIT runtime dependencies (`ape`, `bigmemory`, `EMMREML`,
`genetics`, `gplots`, `htmltools`, `magrittr`, `lme4`, `MASS`, `multtest`,
`plotly`, `RcppArmadillo`, `scatterplot3d`, `snowfall`). The skill's
`references/troubleshooting.md` covers installation; optional packages are
`BGLR`, `rrBLUP`, and `data.table`.

## Layout

```
package.json          bundle manifest (dsh.bundle.patch)
cordis.patch.yml      inserts the Host row `gapit-ai`
index.js              skill provider: lists/loads skills/gapit-ai/SKILL.md
locale/{en,zh}.json   Plugin Manager title and description
icon.svg              Manhattan-plot mark
skills/gapit-ai/      SKILL.md + references/ + resources/  (the skill payload)
```

## Using the skill

Ask for GWAS or GS work in any session (for example "run BLINK GWAS on these
files" or "explain GAGBLUP parameters"). The agent discovers the skill from its
description and calls the `skill` tool, which renders the entry point and the
plugin package's `skills/gapit-ai` directory as the skill's **Base directory**.

The R templates do not guess that path. Before running one, set
`SKILL_DIR`/`skill_dir` to the Base directory reported by the loader, or export
`GAPIT_SKILL_DIR` in the shell, for example:

```bash
export GAPIT_SKILL_DIR="$PWD/skills/gapit-ai"
Rscript my_gwas.R
```

## Updating

The skill body is read from disk on each load, so editing `skills/gapit-ai/`
takes effect without reinstalling. Reinstall the bundle only when
`package.json`, `cordis.patch.yml`, `index.js`, locales, or the icon change.

Uninstalling the bundle removes the skill from the catalog; the payload stays on
disk because it is part of this linked package directory.

## License

This project is licensed under the **GNU General Public License v3.0**
(`GPL-3.0-only`). See [LICENSE](LICENSE).

It is a derivative of [GAPIT-AI](https://github.com/jiabowang/GAPIT-AI)
(GPL-3.0), which bundles the
[GAPIT](https://github.com/jiabowang/GAPIT) function library (GPL >= 2).
Copyright holders, the exact upstream material used, and the modifications made
for DSH are recorded in [NOTICE](NOTICE). If you redistribute this work or a
modified version, you must keep the GPL-3.0 terms, the copyright notices, and a
statement of your changes.

## Citation

If GAPIT contributes to published work, the upstream project asks you to cite:

Wang J., Zhang Z. **GAPIT Version 4: Integration of GWAS into Genomic
Prediction.** *Molecular Biology and Evolution*, 2026, msag107.
<https://doi.org/10.1093/molbev/msag107>

