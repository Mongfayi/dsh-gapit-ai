# 面向 DeepSeek Harness 的 GAPIT AI 技能
我一天用完了trae的赠送积分，遂转向dsh

本仓库把 **GAPIT AI** 技能打包成 DeepSeek Harness（DSH）插件 bundle：一个面向 R 的 GAPIT 4.1 专家，覆盖 GWAS 与基因组选择（GS）的模型选择、参数语义、报错排查、结果解读，并能生成可直接运行的 R 分析流程。

## 在 DeepSeek Harness 中安装

打开 DSH 的 **插件** 页面，点右上角 **添加插件**，把仓库地址粘贴进去：

```
https://github.com/Mongfayi/dsh-gapit-ai
```

再点 **安装**。DSH 会把仓库作为 git 依赖安装到当前 profile，完成后插件列表中出现 **GAPIT AI**，技能目录中新增 `gapit-ai`。

也可以把仓库克隆到本地，在同一对话框里填本地目录路径（包含 `package.json` 的那一层）安装；这种方式是链接安装，适合边改边试。

> 如果此前把该技能以普通文件夹形式装在 `~/.dsh/skills/gapit-ai`（或项目内 `.dsh/skills/gapit-ai`），请先删除那份副本：文件系统 provider 位于更近的注册层，会盖住插件提供的同名技能，rank 高低不起作用。

## 提供什么

- 技能目录中的一个 `gapit-ai` 技能（模型可调用，也可由用户主动调用，按需加载）。
- 技能内容全部随插件分发：`SKILL.md` 是入口，`references/` 按需渐进读取，`resources/` 内置 GAPIT 函数库（21,143 行）、两个 R 模板，以及 304 条真实问题题库。

不调用技能时不会执行任何代码；bundle 不注册工具，也不改动用户文件。

## 环境要求

R 4.x 及 GAPIT 运行依赖：`ape`、`bigmemory`、`EMMREML`、`genetics`、`gplots`、`htmltools`、`magrittr`、`lme4`、`MASS`、`multtest`、`plotly`、`RcppArmadillo`、`scatterplot3d`、`snowfall`。安装与排错见技能的 `references/troubleshooting.md`；可选包为 `BGLR`、`rrBLUP`、`data.table`。

## 目录结构

```
package.json          bundle 清单（dsh.bundle.patch）
cordis.patch.yml      插入 Host 行 `gapit-ai`
index.js              skill provider：列出/加载 skills/gapit-ai/SKILL.md
locale/{en,zh}.json   插件管理中的标题与说明
icon.svg              Manhattan 峰图标
skills/gapit-ai/      SKILL.md + references/ + resources/（技能本体）
```

## 使用技能

在任意会话中直接提出 GWAS / GS 需求（例如"对这些文件跑 BLINK GWAS"或"解释 GAGBLUP 的参数"）。Agent 会根据描述发现技能并调用 `skill` 工具，加载入口文件，并把插件包内的 `skills/gapit-ai` 作为技能的 **Base directory**。

R 模板不会猜测该路径。运行前把模板里的 `skill_dir` 设为加载器报告的 Base directory，或在 shell 中导出 `GAPIT_SKILL_DIR`：

```bash
export GAPIT_SKILL_DIR="$PWD/skills/gapit-ai"
Rscript my_gwas.R
```

## 更新与卸载

从 GitHub 安装的是某个提交的快照，仓库更新后需要重新安装才会生效：在插件管理中卸载 **GAPIT AI**，再按上面的步骤添加一次。

如果是本地目录（链接）安装，修改 `skills/gapit-ai/` 后新开会话就会生效；只有 `package.json`、`cordis.patch.yml`、`index.js`、locale 或图标变化时才需要重新安装 bundle。

卸载 bundle 后技能会从目录中消失；链接安装的技能文件仍留在磁盘上。

## 许可证

本项目以 **GNU General Public License v3.0**（`GPL-3.0-only`）发布，参见 [LICENSE](LICENSE)。

它是 [GAPIT-AI](https://github.com/jiabowang/GAPIT-AI)（GPL-3.0）的衍生作品；GAPIT-AI 内置的 [GAPIT](https://github.com/jiabowang/GAPIT) 函数库为 GPL (>= 2)。版权归属、使用的上游材料以及为 DSH 所做的修改均记录在 [NOTICE](NOTICE) 中。再分发本作品或修改版时，必须保留 GPL-3.0 条款、版权声明，并说明你的修改。

## 引用

如果 GAPIT 对发表工作有帮助，上游项目请求引用：

Wang J., Zhang Z. **GAPIT Version 4: Integration of GWAS into Genomic Prediction.** *Molecular Biology and Evolution*, 2026, msag107. <https://doi.org/10.1093/molbev/msag107>
