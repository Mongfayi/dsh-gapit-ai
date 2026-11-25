---
name: gapit-ai
description: >
  GAPIT 4.1 expert for GWAS and genomic selection in R. Use when the user mentions
  GAPIT, GWAS, association analysis, genomic selection/prediction, BLINK, FarmCPU,
  GAGBLUP, QTN, Manhattan or QQ plots, or asks to analyse genotype + phenotype data.
  Covers installation triage, model choice (GLM/MLM/CMLM/MLMM/SUPER/FarmCPU/BLINK),
  gBLUP/cBLUP/sBLUP/GAGBLUP/MAS cross-validation, parameter semantics, and output
  interpretation; generates runnable R pipelines from bundled templates.
metadata:
  version: "1.0.0+dsh.3"
  packaging: "DSH plugin bundle (@local/dsh-gapit-ai)"
  upstream: "GAPIT-AI v1.0-beta.1.4 (jiabowang/GAPIT-AI)"
  bundled_gapit: "2026.5.19, GAPIT 4.1"
  adapted_for: "DeepSeek Harness"
---

# GAPIT AI（GAPIT5）— GWAS / GS 分析助手

把 GAPIT 4.1 的用法、参数语义、报错排查和代码模板打包成一个可调用的专家技能。技能内置完整的 GAPIT 函数库（21,143 行，v1.0-beta.1.4 清理版），所以生成的脚本一律 `source()` 这个文件，**不依赖 `install.packages("GAPIT")`**。

## 何时接管

出现以下任一情况，主动使用本技能，不要凭印象答 GAPIT 的问题：

- 用户提到 GAPIT / GWAS / 关联分析 / 基因组选择（GS）/ BLINK / FarmCPU / GAGBLUP / QTN / 曼哈顿图 / QQ 图 / 育种值 / 交叉验证。
- 用户在 R 里跑 GAPIT 报错、结果异常、结果看不懂、不确定参数含义。
- 用户要"帮我写一个 GWAS / GS 脚本"或"帮我改这段 GAPIT 代码"。
- 用户问到 GAPIT 输出文件（`GAPIT.Association.*`、`GAPIT.Prediction.*`、Kansas、NYC）怎么解读。

## 三条铁律

1. **先读模板，再写代码。** 生成任何 GAPIT 代码前，必须先 `read` 对应的模式代码（GWAS → `resources/code/templates/GAPIT_AI_GWAS_template.R`，GS → `resources/code/templates/GAPIT_AI_GS_template.R`），以其骨架为准。模板覆盖不到的功能才允许自创。
2. **先质控，再分析。** 调 `GAPIT()` 之前先做轻量统一 QC（MAF + 缺失率 + 单态位点）并打印摘要，让用户知道结果是跑在质控后的数据上。阈值是参数，不要替用户拍板（默认 MAF < 0.05、缺失率 > 0.20）。
3. **只报真实结果。** 没运行就明说；运行了就以 `bash` 返回的实际输出为准。禁止编造 p 值、显著位点数量、预测准确率。

## v1.2 / v1.4 硬规则速查

完整条文见 `references/hard-rules.md`；最容易踩的几条：

- **环境预检**：跑之前确认 R、依赖包和 `resources/code/gapit_functions.txt` 就绪；缺包先给安装指引，别直接 `source()` 撞 `stop()`。
- **主动告警**：出现 `Top snps have little effect`（无 pseudo-QTN）、`λGC > 1.5`、或 GS 小样本（n<300）h² 偏低时，必须主动说明，不能当正常结果交付。
- **数值落表**：FDR / Power / λGC / 准确率 / h² 一律由脚本算完写表，文字摘要里不出现未落表的估算值。
- **双阈值 + 参数口径**：显著位点同时给 Bonferroni 与 FDR；一次分析里 `PCA.total`、MAF、LD 窗口等一次定死。
- **HapMap 转数值**：只用 `GAPIT(G=myG, output.numerical=TRUE)`，禁止调 `GAPIT.HapMap()` 等子函数；数值型必须 `GD=` + `GM=`。
- **函数存在性**：写码前 grep `gapit_functions.txt` 确认函数存在，禁止编造函数名（如 `GAPIT.Genotype.Numerical()`）。
- **完成前自检**：检查输出文件存在、行列数、表头、缺值；不通过不得报「完成」。
- **R 命名**：变量名只允许字母 / 数字 / `_` / `.`，禁止连字符。

## 目录结构

```
${SKILL_DIR}/                              # 本技能根目录 = 加载时 skill_resources 给出的 Base directory
├── SKILL.md                               # 本文件：入口、铁律、速查
├── references/                            # 按需读取，不要一开始全读
│   ├── usage.md                           # 核心能力、典型场景、数据格式
│   ├── troubleshooting.md                 # Q1–Q7：安装失败、内存、结果不显著、file.output 覆盖…
│   ├── models.md                          # 7 个 GWAS 模型的适用场景 + 基因型 QC 标准
│   ├── genomic-selection.md               # Q8：GAGBLUP 原理、参数、交叉验证、与 gBLUP 比较
│   ├── workflows.md                       # 结果解读、最佳实践、版本兼容、多性状分析
│   ├── code-library.md                    # Q9–Q14：参数总表、CV 模板、环境锁定、源码级诊断
│   ├── hard-rules.md                      # v1.2/v1.4 硬规则：环境预检、结果告警、代码防错
│   └── function-summary.md                # 70 个函数签名/返回结构速查，替代行号定位
├── resources/
│   ├── code/
│   │   ├── gapit_functions.txt            # 内置 GAPIT 函数库（GAPIT.Version = 2026.5.19）
│   │   └── templates/
│   │       ├── GAPIT_AI_GWAS_template.R   # GWAS 模板：环境预检、HapMap 自动转数值、双阈值
│   │       └── GAPIT_AI_GS_template.R     # GS 模板：重复 k 折 CV、NA 掩码、断点续跑
│   └── question-bank/
│       └── question_bank_public.jsonl     # 304 条真实邮件 / GitHub issue 问答，可 grep
└── 本技能随 DSH 插件 @local/dsh-gapit-ai 安装：${SKILL_DIR} = 加载时 skill_resources 给出的 Base directory（在插件包内，路径随安装位置变化）
```

## 加载顺序

0. **环境自检**（新会话 / 换机器 / 用户报"跑不起来"时做一次）：
   ```bash
   Rscript -e 'source(file.path("<SKILL_DIR>","resources/code/gapit_functions.txt")); cat("ok:", exists("GAPIT"), GAPIT.0000(), "\n")'
   ```
   正常输出 `ok: TRUE 2026.5.19, GAPIT 4.1`，耗时约 1 秒。报 `there is no package called ...` 就按下面的依赖清单补装。
1. **判断数据入口**：HapMap（`G=` / 读文件）还是 numeric matrix（`GD=` + `GM=`）；表型第一列是否为 `Taxa`。选错入口是最高频的错误来源。
2. **读模板**（写代码时必做）→ 3. **按需读 `references/`**（见文末索引）→ 4. **生成脚本并用 `Rscript` 跑** → 5. **解读结果**。

## 本机环境（2026-10 实测）

| 项 | 值 |
|---|---|
| R | 4.6.0 (2026-04-24)，`/usr/local/bin/Rscript` |
| 内置函数库 | `GAPIT.Version = "2026.5.19, GAPIT 4.1"`，`source()` 约 1.1 s |
| 必需依赖 | `ape` `bigmemory` `EMMREML` `genetics` `gplots` `htmltools` `magrittr` `lme4` `MASS` `methods` `multtest` `plotly` `RcppArmadillo` `scatterplot3d` `snowfall` |
| 可选依赖 | `BGLR`（BayesB）、`rrBLUP`（rrBLUP）、`data.table`（快速读文件） |

```r
# 一次性补装（缺什么装什么，别整包重装）
install.packages(c("ape","bigmemory","EMMREML","genetics","gplots","htmltools",
                   "magrittr","lme4","MASS","multtest","plotly","RcppArmadillo",
                   "scatterplot3d","snowfall"))
```

## `GAPIT()` 关键参数（取值来自本机函数库，非二手资料）

| 参数 | 默认 | 说明 |
|---|---|---|
| `Y` | `NULL` | 表型，第一列 `Taxa`，第二列起每列一个性状 |
| `GD` / `GM` | `NULL` | 数值型基因型（`Taxa` + SNP 列）/ 图谱（`SNP, Chromosome, Position`…）|
| `G` | `NULL` | HapMap 基因型；与 `GD` 二选一，别同时给 |
| `KI` / `Z` / `CV` | `NULL` | kinship / 设计矩阵 / 协变量（`Taxa` + 协变量列）|
| `model` | `"MLM"` | `GLM` `MLM` `CMLM` `MLMM` `SUPER` `FarmCPU` `BLINK`，或 GS 的 `gBLUP` `cBLUP` `sBLUP`；可传向量 |
| `PCA.total` | `0` | 自动算前 N 个 PC 作协变量；`0` = 不算 |
| `kinship.algorithm` | `"Zhang"` | `VanRaden` / `EMMA` / `Loiselle` / `Zhang` |
| `file.output` | `TRUE` | **循环跑多性状/多模型时必须设 `FALSE`**，否则结果互相覆盖 |
| `cutOff` | `0.05` | 显著位点阈值（同时决定 Kansas 表内容）|
| `buspred` | `FALSE` | 是否在 GWAS 后做 BUS 预测（GAGBLUP / MAS 的前提）|
| `lmpred` | `FALSE` | `FALSE` = GAGBLUP（显著位点进随机项）；`TRUE` = MAS（进固定效应）|
| `pv.cut` | `0.2` | GAGBLUP 随机项 kinship 使用的标记比例 |
| `maxOut` | `100` | Power / FDR 计算参与比较的标记数上限 |
| `Random.model` | `TRUE` | 是否算 PVE（会额外耗时）|
| `Multiple_analysis` | `TRUE` | 多性状 / 多模型时同时出 Manhattan + QQ |
| `Model.selection` | `FALSE` | 自动选 PC / CV 个数（可能改变 BLUE 计算，见参考）|
| `Geno.View.output` | `TRUE` | 卡在预处理或绘图时设为 `FALSE` |

## 模型选择一句话

| 模型 | 适合 |
|---|---|
| GLM | 基线 / 快速筛查，不做群体结构校正 |
| MLM | 经典混合模型，控制亲缘与群体结构，样本量中等 |
| CMLM | 大群体 + 高标记密度，按 kinship 聚类压缩 |
| MLMM | 多位点，逐步加入显著位点作协变量 |
| SUPER | 大群体快速近似，bin 策略 |
| FarmCPU | 多位点迭代，兼顾假阳性与功效，常用 |
| BLINK | FarmCPU 的加速/改进版，大数据首选；GAGBLUP / MAS 的宿主模型 |

细节、以及"什么时候不显著是正常的"，见 `references/models.md`。

## GS 方法映射（写错一个参数就变成另一种方法）

| 方法 | 调用方式 |
|---|---|
| gBLUP / cBLUP / sBLUP | `GAPIT(..., model="gBLUP")`，原生 |
| **GAGBLUP** | `model="BLINK", buspred=TRUE, lmpred=FALSE`（显著位点进随机项 kinship）|
| **MAS** | `model="BLINK", buspred=TRUE, lmpred=TRUE`（显著位点进固定线性模型）|
| BayesB | 外挂 `BGLR::BGLR(ETA=list(list(X=Z, model="BayesB")))` |
| rrBLUP | 外挂 `rrBLUP::mixed.solve` |

- **本函数库没有 `GAPIT.CV()`**（只有 `GAPIT.CVMergePC`）。交叉验证一律手写：划分 folds → 测试集表型置 `NA` → 循环调 `GAPIT()` → 从 `Pred` 取预测值。模板里已有完整实现。
- 准确率要报两个：`cor(观测表型, Prediction)` 和 `cor(真实育种值 effect, gBreedingValue)`。
- `Pred` 的列名必须动态识别（育种值优先 `gBreedingValue`，表型预测优先 `Prediction`，回退 `BLUP` / `Predicted_Value`），**禁止硬编码列号**。

## 在 DSH 里怎么跑

- 本技能以 DSH 插件形式提供：`${SKILL_DIR}` 一律取加载时 `skill_resources` 里的 **Base directory**（插件包内的 `skills/gapit-ai`），不要写死 `~/.dsh/skills/gapit-ai`。
- 生成脚本时把模板里的 `skill_dir` 改成该 Base directory 的绝对路径；也可以在运行前 `export GAPIT_SKILL_DIR="<Base directory>"`，两种方式等价。
- 生成脚本写到用户工作目录（或用户指定路径），不要写进 `${SKILL_DIR}`。
- 用 `bash` 执行 `Rscript path/to/script.R`；跑之前告诉用户会产出哪些文件、大概耗时。
- 大群体（>5k 样本或 >1M 标记）或多模型循环：用后台任务跑，别阻塞；先小样本（如 200 个标记）试通再全量。
- 产物默认落在 R 的当前工作目录。生成代码时显式 `setwd()` 或写绝对路径，并在脚本开头打印 `getwd()`。
- 不要默认使用 `mdp_traits.txt` / `mdp_numeric.txt` / `mdp_SNP_information.txt` 这类 demo 文件名；文件名未知就写成占位变量，并在交付时问用户要真实路径。

## 结果解读要点

- **Manhattan**：绿实线 = Bonferroni，绿虚线 = FDR；峰在阈值线下 ≠ 分析失败，先看 QQ 的 λ 和模型是否过度校正。
- **QQ**：λ ≈ 1 表示校准良好；λ 明显 > 1 多为群体结构未校正，λ < 1 多为过度校正。本版本 QQ 图会直接标出 λ。
- **PVE 偏低或为 `NA`**：先解释模型机制（多位点模型不提供单标记效应量），不要直接判失败。
- **BLINK / FarmCPU 的效应值**：看 `PVE` 与显著位点集合，不必强求传统单标记 effect。

## 故障 → 先读哪份参考

| 症状 | 读 |
|---|---|
| 装不上、缺包、`library(GAPIT)` 找不到 | `references/troubleshooting.md`（Q1）|
| `cannot allocate vector` / 内存爆 | `references/troubleshooting.md`（Q2）|
| 结果不显著、位点少 | `references/troubleshooting.md`（Q3）|
| 多性状结果互相覆盖 | `references/troubleshooting.md`（Q4/Q7）|
| 表型文件结构不对、ID 对不上 | `references/troubleshooting.md`（Q6）|
| GS / GAGBLUP 参数与 CV 设计 | `references/genomic-selection.md` |
| 要完整参数表 / CV 模板 / 环境锁定 | `references/code-library.md` |
| 要看某函数内部逻辑定位 bug | `references/code-library.md`（Q13）+ 直接 grep `resources/code/gapit_functions.txt` |
| 报错 `Genotype data and map files should be in pair` / 参数传错 | `references/hard-rules.md`（防错 #5）|
| 无 pseudo-QTN、λ 膨胀、小样本 h² 偏低 | `references/hard-rules.md`（告警 #2）|
| 要函数签名 / 返回字段速查 | `references/function-summary.md` |

历史真实问题可以直接搜题库：

```bash
grep -i "ylim\|kinship\|BLINK" "${SKILL_DIR}/resources/question-bank/question_bank_public.jsonl" | head
```

## 代码生成附加规则

- **注释语言跟随用户**：中文提问用中文注释，英文提问一律英文注释。
- 交付前自查：变量名、文件路径、模型参数、输出列名是否与用户提供的信息一致；生成或修改文件后要 `read` 回来确认，不要凭记忆汇报。
- 同一操作连续失败 3 次就停下，说明已试过什么、卡在哪，向用户要更明确的信息，不要反复重试。
- 不要改动 `resources/code/gapit_functions.txt`。确实需要打补丁时先备份、说明原因，并告知用户这不是官方版本。
- 完整防错口径（环境预检、HapMap 转换、函数校验、R 命名、参数核对）见 `references/hard-rules.md`。

## 来源与维护

- 上游：`GAPIT-AI v1.0-beta.1.4`（独立仓库 <https://github.com/jiabowang/GAPIT-AI>，2026-10-29 发布）。本目录是它的 DSH 适配版。
- 许可：本适配版按 GPL-3.0 发布（仓库根 `LICENSE`，版权与修改声明见 `NOTICE`）；上游 GAPIT-AI 为 GPL-3.0，内置 GAPIT 函数库为 GPL (>= 2)。
- 插件形态：本技能由 DSH 插件 `@local/dsh-gapit-ai` 打包并以 skill provider 注册（不再依赖 `~/.dsh/skills` 目录）；技能内容在插件包的 `skills/gapit-ai/` 下。卸载插件后该技能随之从目录消失。
- 适配内容：TRAE / Claude 的调用约定与 `data/gapit-resources/` 路径全部改为 DSH 本地的自包含 `resources/`；`Read` 工具改称 `read`/`bash`；入口拆成 SKILL.md + `references/`，避免每次调用都吃下 95 KB 全文。
- 内置函数库版本 `2026.5.19, GAPIT 4.1`（21,143 行），同步 v1.4：剔除末尾测试脚本、移除 `GAPIT.MAS` 空存根、带上 `GAPIT.Power` 的 `drop=FALSE`、`GAPIT.Main` 的 `file.output` 门控与 `GAPIT.MAF` 修复。
- 模板同步 v1.4：环境预检、HapMap 自动转数值、Bonferroni + FDR 双阈值、重复 k 折 CV（NA 掩码 + 断点续跑）、双指标准确率、动态 `Pred` 列名；路径已改为 `${SKILL_DIR}/resources/`。
- 更新知识时改 `references/` 或本文件；不要动函数库，除非明确知道在做什么。
