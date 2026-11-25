# 参考文档：GWAS 模型选择与基因型质控

> 本文件是 `gapit-ai` 技能（GAPIT AI / GAPIT5）的参考文档，按需读取，不必全文背诵。
> 文中 `${SKILL_DIR}` 指本技能根目录，即加载时 skill_resources 给出的 Base directory（随安装位置变化，不要写死 `~/.dsh/skills/gapit-ai`）。

## 模型选择指南

### 1. GLM（广义线性模型）
- **适用场景**：初步筛选、小样本数据
- **特点**：计算快，不考虑群体结构
- **推荐参数**：`model="GLM", PCA.total=3`

### 2. MLM（混合线性模型）
- **适用场景**：中等样本量，有明显群体结构
- **特点**：校正群体结构和亲缘关系
- **推荐参数**：`model="MLM", PCA.total=5`

### 3. CMLM（压缩混合线性模型）
- **适用场景**：大样本数据，计算资源有限
- **特点**：内存优化，计算效率高
- **推荐参数**：`model="CMLM", PCA.total=5`

### 4. SUPER（Settlement of MLM Under Progressively Exclusive Relationship）
- **适用场景**：高密度SNP数据，精细定位
- **特点**：迭代优化，提高检测功效
- **推荐参数**：`model="SUPER", PCA.total=5`

### 5. MLMM（Multiple Locus Mixed Model）
- **适用场景**：多基因控制性状
- **特点**：同时考虑多个显著位点
- **推荐参数**：`model="MLMM", PCA.total=5`

### 6. FarmCPU（Fixed and random model Circulating Probability Unification）
- **适用场景**：复杂性状，计算效率要求高
- **特点**：固定效应和随机效应分离
- **推荐参数**：`model="FarmCPU", PCA.total=5`

### 7. BLINK（Bayesian-information and Linkage-disequilibrium Iteratively Nested Keyway）
- **适用背景**：超高密度数据，精细定位
- **特点**：贝叶斯框架，迭代优化
- **推荐参数**：`model="BLINK", PCA.total=5`

### 8. GS 方法选择（基因组选择）

| 方法 | 类型 | 适用场景 | 说明 |
|------|------|----------|------|
| `gBLUP` | GAPIT 原生 | 多基因、微效性状 | 全基因组关系，最稳健的基准 |
| `cBLUP` | GAPIT 原生 | 大样本、计算受限 | 压缩型 GBLUP，效率高 |
| `sBLUP` | GAPIT 原生 | 高密度 SNP | SUPER 型 GBLUP，精度优于 gBLUP |
| `GAGBLUP` | GAPIT 原生 | QTN 数目适中（10–15） | `model="BLINK", buspred=TRUE, lmpred=FALSE`，显著位点进随机项 |
| `MAS` | GAPIT 原生 | 少 QTN、效应大 | `model="BLINK", buspred=TRUE, lmpred=TRUE`，显著位点进固定模型 |
| `BayesB` | 外挂 BGLR | 少 QTN、效应稀疏 | `ETA=list(list(X=Z, model="BayesB"))` |
| `rrBLUP` | 外挂 rrBLUP | 微效多基因 | 岭回归 BLUP，与 gBLUP 接近 |

**选择策略：**
- 少 QTN（N<10）：MAS / BayesB 通常更快更准
- 适中 QTN（N=10–15）：GAGBLUP 常最优
- 多 QTN（N>20）：gBLUP / rrBLUP 更稳定
- 所有 GS 比较都建议用重复 k 折交叉验证（推荐 `20 × 5`）

## 质量控制标准

### 基因型数据QC
1. **缺失率**：< 20%
2. **MAF**：> 0.05（除非特殊研究）
3. **哈迪-温伯格平衡**：p > 1e-6
4. **杂合度**：检查异常样本

