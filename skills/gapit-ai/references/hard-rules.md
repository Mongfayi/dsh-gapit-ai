# 硬规则：运行环境、结果解读与代码防错

> 适用版本：GAPIT AI v1.0-beta.1.4（v1.2 起新增、v1.4 补齐）。
> `SKILL.md` 里的「三条铁律」是入口级摘要；本文件是完整口径，冲突时以本文件为准。
> 文中 `${SKILL_DIR}` 指本技能根目录，即加载时 skill_resources 给出的 Base directory（随安装位置变化，不要写死 `~/.dsh/skills/gapit-ai`）。

## 一、运行环境与结果解读硬规则（v1.2，16 条）

### 1. 环境预检（每次运行 GAPIT 前）
先确认资源与依赖就绪，避免 `source(gapit_functions.txt)` 因缺包 `stop()` 中断：

- R 是否可用：`R.v` / `Rscript --version`。
- 依赖是否齐全：`multtest`、`snpStats`（Bioconductor）以及 `EMMREML`、`data.table`、`BGLR`、`rrBLUP` 等按需包。
- 函数库是否存在：`${SKILL_DIR}/resources/code/gapit_functions.txt`。

依赖走 Bioconductor 时，先检查镜像连通性；安装失败就提示用户自行 `install.packages()` / `BiocManager::install()` 后再跑，不要盲目重试 `source()`。预检不通过先给安装/修复指引，不要把「依赖缺失导致 stop()」直接抛回给用户。

### 2. 结果解读告警（主动提示，而非静默）
- **无 pseudo-QTN**：FarmCPU / BLINK 日志出现 `Top snps have little effect, set seqQTN to NULL!` 时，主动说明「这不是正常出结果，而是未选出 pseudo-QTN、结果为空」，该结果不可用于下游判断，并给出处置建议（换模型 / 检查 LD / 增大样本）。
- **λ 膨胀**：`λGC` 明显偏离 1（如 > 1.5）时，提示存在群体结构残留或模型失配，显著位点可能含大量假阳性，建议交叉验证。
- **小样本 h² 低估**：GS 场景 n < 300 时，REML 估计的 h² 可能低于真值，提示同时报告「实现 h²」与「估计 h²」，不要把低估误判为方法失败。

### 3. 汇总数值必须落表
回答里的任何统计数值（FDR、Power、λGC、准确率、h² 等）都必须由脚本从结果文件直接算出并写入表格；禁止在文字摘要里出现未计算、未落表的估算值。每个数值应能反查来源文件与列名。

### 4. 自检脚本（验证优先的落地）
交付分析脚本时，在脚本末尾或回答末尾附一段自检：运行前打印样本数、SNP 数、表型缺失率；运行后检查关键输出文件是否存在、行数是否合理。有条件时实际跑一遍并读回结果核对，不把「只生成代码」当作「已完成验证」。

### 5. 证据等级标注
涉及「版本差异、性能、等价性、函数是否存在」等结论时，标注证据等级：官方手册 / 源码 / 本机实测 / 推断，不要把推测当事实。

### 6. 参数口径契约
一次分析任务内，关键参数（`PCA.total`、MAF/缺失率阈值、Bonferroni 口径、LD 窗口、过滤规则、标记类型）必须一次定死、全程一致，结果之间才可比较；禁止反复改动导致两套结果不可比。

### 7. 单一数据源
同一分析产出多张图/表/报告时，先产出唯一一份「过滤后」的中间数据，所有图、表、报告只读这一份，避免「表用一个数、图用另一个数」。

### 8. 多性状独立输出目录
多性状/多次运行时，默认按性状名建立独立输出子目录，结束后汇总结果索引；禁止同名输出文件相互覆盖（`file.output=FALSE` 仍需管理手动写出的文件）。

### 9. 双阈值口径
显著位点同时报告 Bonferroni 与 FDR 两套阈值下的数量，便于判断结论稳健性，不默认只给单一口径。

### 10. 模型名容错映射
对用户常见的模型名简写/别名做容错映射：`CML`→`CMLM`、`GBLUP`→`gBLUP`、`FARMCPU`→`FarmCPU` 等；遇到不在支持列表里的名字先按映射纠正并说明，而不是直接报错。

### 11. 交叉验证与「CV」命名澄清
- GAPIT 中**没有** `GAPIT.CV` 这个函数；旧教程里的 `GAPIT.CV(...)` 是命名混淆（把 cross-validation 误当成函数）。
- 「CV」在 GAPIT 函数命名里指 **Covariates（协变量）**：算主成分用 `GAPIT.PCA`；把已有协变量并入主成分用 `GAPIT.CVMergePC(CV, PC)`。
- 交叉验证没有内置接口，统一「手动分折 + 循环 `GAPIT()` + 提取 `Pred`」。

### 12. GS 指标呈现规范
交叉验证主指标固定为「重复间池化 r 的均值 ± SD」或「全预测池化 r」；单折 r 只作诊断，不进入结论段，避免「某折低 = 模型不稳」的误读。

### 13. h² 估计口径
GS 中估计遗传力统一用「原始多环境均值 + 混合模型」；禁止用 BLUP 值估计 h²（BLUP 收缩会高估）。

### 14. 性能提示
批量/重复试验时提示：`file.output=FALSE`、预构建并复用 `KI`、每组独立输出目录，并给出耗时量级参考。

### 15. 行号定位改函数名 + 片段
涉及修改源码定位时，优先用「函数名 + 代码片段」定位，而不是只给行号（行号随版本变化易失效）。函数签名速查见 `references/function-summary.md`。

### 16. 多倍体适用性限制
多倍体物种（>2 倍体）不建议使用基于混合模型的方法（MLM/CMLM/MLMM/SUPER/FarmCPU/BLINK 等），因为 GAPIT 的亲缘矩阵与加性效应假设基于二倍体 0/1/2 编码；遇到多倍体数据主动提示该限制，并建议改用多倍体专用工具（如 GWASpoly）。

## 二、代码生成防错硬规则（v1.4，6 条）

### 1. HapMap 转数值：只用主命令，不用子函数
把 HapMap 基因型转成数值型 GD / GM 时，直接调用主命令：

```r
GAPIT(G = myG, output.numerical = TRUE)
```

GAPIT 会自动转成 0/1/2，并输出 `GAPIT.Genotype.Numerical.txt`（数值 GD）与 `GAPIT.Genotype.map.txt`（GM）。**禁止**用 `GAPIT.HapMap()`、`GAPIT.Genotype()`、`GAPIT.Numericalization()`、`GAPIT.HMP2Num()` 等子函数完成转换（内部实现，返回对象易用错）。模板 `resources/code/templates/GAPIT_AI_GWAS_template.R` 的「HapMap → 数值型」参考块是标准写法。

### 2. 函数存在性校验（禁止编造函数）
只能调用 `resources/code/gapit_functions.txt` 里真实存在的函数；写代码前先 grep 函数名，确认存在与拼写：

```bash
grep -n '^`GAPIT\.[A-Za-z.]*` *<-' "${SKILL_DIR}/resources/code/gapit_functions.txt"
```

严禁凭记忆编造函数名（如 `GAPIT.Genotype.Numerical()`、`GAPIT.HapMap2Numerical()` 均不存在）。

### 3. 完成前自检（不通过不得报告完成）
报告「完成/成功」前，必须实际检查输出：文件是否存在、行数/列数是否合理、表头是否正确、缺失值是否已处理。任一不通过都不得报告完成，先修复再验证。

### 4. R 变量命名规则
R 变量名只允许字母、数字、下划线 `_`、点 `.`；禁止连字符 `-`（`tax-names` 非法，应写 `tax_names` 或 `tax.names`）。同一处代码修多次仍失败，改为整文件重写，不要反复局部替换。

### 5. 报错先回模板核对参数
每次调用 `GAPIT()` 前，对照模式代码核对参数名：`G=` 只用于 HapMap 格式，`GD=` / `GM=` 用于数值型基因型。数值型误传给 `G=` 会报 `Genotype data and map files should be in pair`。遇到报错先回模板核对参数，不要先改无关部分。

### 6. 反馈真实性（若用户要求整理反馈）
如用户要求把问题/体验整理成反馈报告，如实区分「真正起作用的修复」与「尝试过但无效的改动」，不得把无效改动写成修复关键，也不得漏记问题。本 DSH 版不强制写 `feedback_data/` 目录；按用户指定位置输出，结构用「基本信息 → 用户需求 → 使用体验 → 问题与建议 → 功能代码修改 → 处理状态」。
