# 参考文档：基因组选择与 GAGBLUP 详解（Q8）

> 本文件是 `gapit-ai` 技能（GAPIT AI / GAPIT5）的参考文档，按需读取，不必全文背诵。
> 文中 `${SKILL_DIR}` 指本技能根目录，即加载时 skill_resources 给出的 Base directory（随安装位置变化，不要写死 `~/.dsh/skills/gapit-ai`）。

### Q8: 基因组选择（GS）和GAGBLUP方法详解
**问题现象：** 用户需要进行基因组选择分析，特别是使用GAGBLUP（GWAS Assisted GBLUP）方法，但不确定如何正确设置参数和进行交叉验证

#### 1. 基因组选择（GS）基本概念
**GS定义：** 使用全基因组标记预测个体育种值的方法
**核心思想：** 利用标记效应估计育种值，提高选择准确性

**主要方法：**
- **GBLUP（基因组最佳线性无偏预测）**：基于基因组关系的混合模型方法
- **GAGBLUP（GWAS Assisted GBLUP）**：结合GWAS和GS的混合方法
- **MAS（标记辅助选择）**：仅使用显著标记进行选择

#### 2. GAGBLUP方法原理和优势
**核心原理：**
1. **GWAS筛选**：使用BLINK等模型进行GWAS，识别显著标记
2. **标记分类**：根据GWAS结果将标记分为：
   - 显著标记：作为固定效应
   - 有效应标记：用于构建亲缘关系矩阵
   - 无效应标记：被排除（默认排除pv.cut=0.2，即20%标记）
3. **GBLUP预测**：使用筛选后的标记构建分子亲缘关系矩阵，进行育种值估计

**优势：**
- **提高准确性**：在QTN数目适中时优于MAS和GBLUP
- **稳定性好**：QTN数目多时预测准确性下降较慢，较早到达平稳
- **减少标记冗余**：通过QR分解筛选核心标记
- **结合GWAS信息**：利用GWAS结果指导标记选择

**适用场景：**
- **最佳场景**：QTN数目比较适中时（N=10-15）
- **良好场景**：QTN数目少时（N<10），与MAS相当
- **一般场景**：QTN数目多时（N>20），优于MAS但计算较慢

#### 3. 正确使用方法
**关键要点：** 必须放入全部基因型数据和参考群体表型数据

```r
# GAGBLUP正确使用方法示例
# 加载 GAPIT 函数（本技能内置资源）
skill_dir <- "path/to/gapit-ai-v1.0-beta.1.1"
source(file.path(skill_dir, "resources/code/gapit_functions.txt"))

# 1. 数据准备
myY <- read.table("phenotype.txt", head = TRUE)  # 表型数据
myGD <- read.table("genotype_numeric.txt", head = TRUE)  # 全部基因型数据
myGM <- read.table("SNP_information.txt", head = TRUE)  # 标记信息

# 2. 模拟表型（用于测试）
# 按照GAPIT4文献设置：低遗传力，少QTN
mysimulation <- GAPIT.Phenotype.Simulation(
  h2 = 0.25,      # 低遗传力
  NQTN = 5,       # 少QTN
  GD = myGD,
  GM = myGM
)

# 3. 运行GAGBLUP分析
myGAPIT_GAGBLUP <- GAPIT(
  Y = myY[, c(1, 2)],  # 仅参考群体表型（有表型的个体）
  GD = myGD,           # 全部基因型数据（包含参考和预测群体）
  GM = myGM,
  PCA.total = 3,
  model = c("BLINK"),  # 使用BLINK模型进行GWAS
  buspred = TRUE,      # 在GWAS后进行预测
  lmpred = c(FALSE),   # FALSE表示使用GAGBLUP，TRUE表示使用MAS
  file.output = TRUE,
  Multiple_analysis = FALSE
)
```

#### 4. RefInf列的含义和用途
**输出文件：** `GAPIT.Association.Prediction_results.BLINK.Sim.GAGBLUP.csv`

**RefInf列值含义：**
- **1**：个体属于参考群体（有表型数据）
- **1.5或2**：个体属于预测群体（无表型数据，需要预测）

**使用示例：**
```r
# 读取预测结果
pred_results <- read.csv("GAPIT.Association.Prediction_results.BLINK.Sim.GAGBLUP.csv")

# 分离参考群体和预测群体
reference_group <- pred_results[pred_results$RefInf == 1, ]
prediction_group <- pred_results[pred_results$RefInf %in% c(1.5, 2), ]

# 计算预测准确性（仅参考群体）
correlation <- cor(reference_group$Simulated_Trait, reference_group$Predicted_Value)
cat("预测准确性：", correlation, "\n")
```

#### 5. 交叉验证最佳实践
**关键要求：** 至少20次重复交叉验证

```r
# 20次重复交叉验证示例
n_repeats <- 20
cv_results <- data.frame(
  repeat_id = integer(),
  method = character(),
  correlation = numeric(),
  stringsAsFactors = FALSE
)

# 准备分析数据
Y_analysis <- myY[!is.na(myY$Simulated_Trait), c(1, 2)]

for (rep in 1:n_repeats) {
  set.seed(198521 + rep)
  
  # 随机划分训练集和验证集（70%训练，30%验证）
  n_train <- round(0.7 * nrow(Y_analysis))
  train_indices <- sample(1:nrow(Y_analysis), size = n_train)
  
  Y_train <- Y_analysis[train_indices, ]
  Y_valid <- Y_analysis[-train_indices, ]
  
  # 运行GAGBLUP分析
  myGAPIT_rep <- GAPIT(
    Y = Y_train,
    GD = myGD,
    GM = myGM,
    PCA.total = 3,
    model = c("BLINK"),
    buspred = TRUE,
    lmpred = c(FALSE),
    file.output = FALSE,  # 不输出文件，避免覆盖
    Multiple_analysis = FALSE
  )
  
  # 提取预测结果
  if (!is.null(myGAPIT_rep$Pred)) {
    pred_values <- myGAPIT_rep$Pred$Predicted_Value
    true_values <- Y_valid$Simulated_Trait
    
    # 计算相关性
    cor_value <- cor(pred_values, true_values, use = "complete.obs")
    
    # 保存结果
    cv_results <- rbind(cv_results, data.frame(
      repeat_id = rep,
      method = "GAGBLUP",
      correlation = cor_value
    ))
  }
}

# 计算统计指标
mean_cor <- mean(cv_results$correlation)
sd_cor <- sd(cv_results$correlation)
cat("GAGBLUP平均预测准确性：", round(mean_cor, 4), "±", round(sd_cor, 4), "\n")
```

#### 6. 与GBLUP和MAS的对比分析
**典型结果模式（基于GAPIT4文献）：**

| 条件 | GAGBLUP表现 | MAS表现 | GBLUP表现 | 原因分析 |
|------|------------|----------|-----------|----------|
| 少QTN（N=5） | 大幅领先GBLUP | 领先GBLUP | 较低 | GWAS能准确识别少数显著标记 |
| 适中QTN（N=10-15） | **最优** | 次优 | 较低 | GAGBLUP结合了GWAS筛选和基因组关系优势 |
| 多QTN（N=20+） | 下降但较早到达平稳 | 快速下降 | 相对稳定 | 标记效应分散，筛选效果减弱 |
| 低遗传力（h2=0.25） | 优势更明显 | 优势明显 | 较低 | GWAS筛选提高了标记信息含量 |
| 高遗传力（h2=0.8） | 优势减小 | 优势减小 | 相对较高 | GBLUP本身已足够准确 |

**关键发现：**
1. **QTN数目是关键因素**：只要QTN数目少，GAGBLUP和MAS都领先于GBLUP
2. **QTN数目多时**：MAS和GAGBLUP预测准确率都会下降，但MAS下降更快，GAGBLUP下降较慢且更早到达平稳
3. **最佳应用场景**：QTN数目比较适中时，GAGBLUP优于MAS和GBLUP
4. **计算效率**：MAS计算最快，GAGBLUP较慢但预测准确性更稳定

**统计检验示例：**
```r
# 假设已有GBLUP和GAGBLUP的交叉验证结果
gagblup_cor <- cv_results_gagblup$correlation
gblup_cor <- cv_results_gblup$correlation

# 配对t检验
t_test_result <- t.test(gagblup_cor, gblup_cor, paired = TRUE)
cat("配对t检验结果：\n")
cat("t值：", t_test_result$statistic, "\n")
cat("p值：", t_test_result$p.value, "\n")

# 效应量计算
mean_diff <- mean(gagblup_cor) - mean(gblup_cor)
sd_diff <- sd(gagblup_cor - gblup_cor)
cohens_d <- mean_diff / sd_diff
cat("Cohen's d效应量：", round(cohens_d, 4), "\n")
```

#### 7. 参数设置指南
**关键参数说明：**

| 参数 | 类型 | 默认值 | 作用 |
|------|------|--------|------|
| `buspred` | 逻辑值 | FALSE | 是否在GWAS后进行预测 |
| `lmpred` | 逻辑向量 | c(FALSE) | FALSE=GAGBLUP, TRUE=MAS |
| `pv.cut` | 数值 | 0.2 | 排除标记的比例阈值 |
| `h2` | 数值 | 0.5 | 模拟表型的遗传力 |
| `NQTN` | 整数 | 10 | 模拟表型的QTN数量 |

**推荐设置：**
```r
# 测试GAGBLUP优势的最佳设置
myGAPIT <- GAPIT(
  Y = myY,
  GD = myGD,
  GM = myGM,
  PCA.total = 3,
  model = c("BLINK"),
  buspred = TRUE,      # 启用预测
  lmpred = c(FALSE),   # 使用GAGBLUP
  pv.cut = 0.2,        # 排除20%标记
  file.output = TRUE
)
```

#### 8. 实际应用建议
1. **数据准备**：
   - 确保基因型数据包含所有个体（参考+预测）
   - 表型数据仅包含参考群体
   - 检查缺失值和数据质量

2. **QTN数目评估**：
   - **少QTN（N<10）**：GAGBLUP和MAS都表现良好，MAS计算更快
   - **适中QTN（N=10-15）**：GAGBLUP表现最优，推荐使用
   - **多QTN（N>20）**：GAGBLUP优于MAS但计算较慢，GBLUP相对稳定

3. **分析流程**：
   - 先进行GWAS分析，评估QTN数目和遗传力
   - 根据QTN数目选择合适方法：
     - 少QTN：可考虑MAS（计算快）
     - 适中QTN：推荐GAGBLUP（准确性高）
     - 多QTN：GAGBLUP或GBLUP（稳定性好）
   - 运行选定方法，获取预测结果
   - 进行20次重复交叉验证，评估准确性
   - 与GBLUP和MAS对比，验证方法优势

4. **结果解释**：
   - 关注RefInf列，正确识别群体类型
   - 计算预测准确性时，仅使用参考群体
   - 结合QTN数目和遗传力解释结果模式
   - 注意不同条件下方法的相对表现

5. **优化策略**：
   - 调整pv.cut参数，优化标记筛选
   - 尝试不同GWAS模型（FarmCPU vs BLINK）
   - 考虑群体结构和亲缘关系校正
   - 根据计算资源选择方法：MAS最快，GAGBLUP较慢但更稳定

**参考文献：**
- GAPIT4文献：`msag107.pdf`（位于`（技能包未内置该 PDF，引文见 GAPIT 仓库 README）`）
- 关键发现：在低遗传力（h2=0.25）、少QTN（N=5）条件下，GAGBLUP大幅领先于GBLUP

### 表型数据QC
1. **缺失值**：< 10%
2. **异常值**：±3标准差外检查
3. **正态性**：必要时进行转换
4. **批次效应**：检查实验批次影响

