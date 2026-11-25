# 参考文档：常见问题与报错排查（Q1–Q7）

> 本文件是 `gapit-ai` 技能（GAPIT AI / GAPIT5）的参考文档，按需读取，不必全文背诵。
> 文中 `${SKILL_DIR}` 指本技能根目录，即加载时 skill_resources 给出的 Base directory（随安装位置变化，不要写死 `~/.dsh/skills/gapit-ai`）。

## 常见问题解决

### Q1: GAPIT安装失败
**可能原因：** R版本不兼容、依赖包缺失、权限问题
**解决方案：** 
```r
# 更新R到最新版本
# 安装必要依赖包
install.packages(c("devtools", "ggplot2", "reshape2", "scales"))
# 从GitHub安装GAPIT
devtools::install_github("jiabowang/GAPIT")
```

### Q2: 内存不足错误
**可能原因：** 数据量过大、内存分配不足
**解决方案：**
1. 增加R内存限制：`memory.limit(size=16000)`
2. 使用CMLM或FarmCPU等内存优化模型
3. 分批处理数据或使用子集分析

### Q3: 结果不显著
**可能原因：** 样本量不足、表型遗传力低、模型选择不当
**解决方案：**
1. 增加样本量或进行荟萃分析
2. 尝试不同模型（MLM、FarmCPU、BLINK）
3. 检查数据质量控制步骤

### Q4: file.output参数使用注意事项
**参数作用：** 控制GAPIT是否生成结果文件
- **file.output=TRUE**: 分析结果输出为文件（默认）
- **file.output=FALSE**: 不输出任何结果文件

**重要注意事项：**
1. **多性状分析时的文件覆盖问题**：
   - 当表型文件包含多个性状时，GAPIT会依次输出所有性状的分析结果
   - 不同性状的GAPIT结果文件名相同，会被后续分析覆盖
   - 建议为每个性状创建独立的输出目录

2. **循环分析时的优化**：
   - 基因型数据分析、分子亲缘关系、PCA等只会在第一次分析时生成
   - 后续性状分析会复用这些结果，提高效率
   - 但需要注意文件命名冲突问题

3. **最佳实践代码示例**：
```r
# 多性状分析，避免文件覆盖
trait_names <- colnames(phenotype_data)[-1]  # 假设第一列是Taxa

for(i in 1:length(trait_names)) {
  trait <- trait_names[i]
  
  # 为每个性状创建独立输出目录
  output_dir <- paste0("GAPIT_Output_", trait)
  dir.create(output_dir, showWarnings = FALSE)
  
  # 运行GAPIT分析
  myGAPIT <- GAPIT(
    Y = phenotype_data[, c(1, i+1)],  # Taxa列 + 当前性状列
    G = genotype_data,
    PCA.total = 5,
    model = "MLM",
    file.output = TRUE,
    file.path = output_dir  # 指定输出目录
  )
  
  # 保存结果对象
  saveRDS(myGAPIT, file = paste0(output_dir, "/GAPIT_", trait, ".rds"))
}
```

### Q5: 文件名验证和错误处理
**问题现象：** 用户提供错误的文件名时，技能没有主动询问确认

**增强验证逻辑：**
```r
# 增强文件名验证函数
check_and_validate_files <- function(file_paths) {
  validated_files <- list()
  
  for(file_path in file_paths) {
    if(!file.exists(file_path)) {
      cat("⚠️ 警告：文件不存在 -", file_path, "\n")
      
      # 尝试查找相似文件
      dir_path <- dirname(file_path)
      file_name <- basename(file_path)
      similar_files <- list.files(dir_path, pattern = file_name, full.names = TRUE)
      
      if(length(similar_files) > 0) {
        cat("  发现相似文件：\n")
        for(sf in similar_files) {
          cat("  •", basename(sf), "\n")
        }
        cat("  请确认是否使用上述文件？\n")
      } else {
        cat("  未找到相似文件，请检查文件路径和名称。\n")
      }
      
      validated_files[[file_path]] <- FALSE
    } else {
      validated_files[[file_path]] <- TRUE
    }
  }
  
  return(validated_files)
}

# 使用示例
files_to_check <- c("genotype.hmp.txt", "phenotype.csv", "covariate.txt")
validation_result <- check_and_validate_files(files_to_check)

if(all(unlist(validation_result))) {
  cat("✅ 所有文件验证通过，可以开始分析。\n")
} else {
  cat("❌ 部分文件存在问题，请先解决文件路径问题。\n")
}
```

### Q6: 表型文件结构检查
**问题现象：** 假设表型文件第一列总是Taxa/样本ID，没有验证列名结构

**增强检查逻辑：**
```r
# 表型文件结构检查函数
validate_phenotype_structure <- function(pheno_file, expected_id_col = "Taxa") {
  # 读取表型文件
  pheno_data <- read.csv(pheno_file, header = TRUE)
  
  # 检查列名
  col_names <- colnames(pheno_data)
  
  # 查找可能的ID列
  id_col_candidates <- c("Taxa", "SampleID", "ID", "Accession", "Line")
  found_id_col <- NULL
  
  for(candidate in id_col_candidates) {
    if(candidate %in% col_names) {
      found_id_col <- candidate
      break
    }
  }
  
  # 如果没有找到标准ID列名，使用第一列
  if(is.null(found_id_col)) {
    cat("⚠️ 警告：未找到标准ID列名（Taxa/SampleID/ID等）\n")
    cat("  当前列名：", paste(col_names, collapse = ", "), "\n")
    cat("  将使用第一列作为样本ID：", col_names[1], "\n")
    found_id_col <- col_names[1]
  }
  
  # 计算性状数量
  trait_cols <- setdiff(col_names, found_id_col)
  trait_count <- length(trait_cols)
  
  # 返回检查结果
  return(list(
    id_column = found_id_col,
    trait_count = trait_count,
    trait_names = trait_cols,
    all_columns = col_names,
    data_dim = dim(pheno_data),
    validation_passed = TRUE
  ))
}

# 使用示例
pheno_check <- validate_phenotype_structure("phenotype.csv")
cat("表型文件检查结果：\n")
cat("• ID列：", pheno_check$id_column, "\n")
cat("• 性状数量：", pheno_check$trait_count, "\n")
cat("• 性状名称：", paste(pheno_check$trait_names, collapse = ", "), "\n")
```

### Q7: GAPIT输出文件命名规则和结果整合
**问题现象：** 用户需要理解GAPIT输出文件的命名规则，以及如何整合多模型、多性状的分析结果

#### 1. 命名规则详解
**基础命名结构：**
```
GAPIT.[模块].[文件类型].[模型].[性状]([版本]).扩展名
```

**版本标识含义：**
- **(Kansas)**: 逐步回归模型结果 - 零星单个显著位点，像堪萨斯州曼哈顿小镇的天空
- **(NYC)**: 传统GWAS结果 - 连续显著信号区域，像纽约曼哈顿的高楼大厦

**历史背景：**
曼哈顿图命名源自第一位研究者看到连续显著信号联想到纽约曼哈顿的高楼大厦。逐步回归模型产生零星结果后，我们将其命名为Kansas版本，象征堪萨斯州曼哈顿小镇的天空。

**推荐关注版本：**
- **主要关注NYC版本**：查看原始连续信号区域
- **保留Kansas版本**：用于逐步回归模型结果，保持与原始BLINK、FarmCPU等方法报道的一致性

#### 2. 文件格式规则
- **图表文件**: 只输出PDF格式（`.pdf`），不输出PNG
- **数据文件**: 只输出CSV格式（`.csv`）
- **性状名称**: 直接使用表型文件中的列名，R会自动过滤特殊符号

#### 3. 多模型分析命名
- 文件名中的模型名称会相应变化
- 例如：`BLINK` → `FarmCPU` → `MLM`

#### 4. 结果整合最佳实践
**使用file.output=FALSE模式：**
```r
# 多模型、多性状分析结果整合示例
# 加载 GAPIT 函数（本技能内置资源）
skill_dir <- "path/to/gapit-ai-v1.0-beta.1.1"
source(file.path(skill_dir, "resources/code/gapit_functions.txt"))

# 1. 数据加载（替换为用户自己的真实文件，不要默认 demo data）
pheno_file <- "phenotype.txt"
geno_file  <- "genotype_numeric.txt"
map_file   <- "SNP_information.txt"
myY <- read.table(pheno_file, head = TRUE)
myGD <- read.table(geno_file, head = TRUE)
myGM <- read.table(map_file, head = TRUE)

# 2. 设置分析参数
trait_names <- colnames(myY)[-1]  # 排除Taxa列
model_store <- c("GLM", "MLM", "CMLM", "SUPER", "MLMM", "FarmCPU", "BLINK")

# 3. 运行GAPIT分析（不输出文件）
myGAPIT <- GAPIT(
  Y = myY[, c(1, 2)],  # 分析第一个性状
  GD = myGD,
  GM = myGM,
  PCA.total = 3,
  model = model_store,
  file.output = FALSE  # 关键：不自动输出文件
)

# 4. 手动生成需要的输出文件
if(!is.null(myGAPIT$GWAS)) {
  # 提取GWAS结果
  GWAS <- myGAPIT$GWAS
  
  # 生成QQ图
  GAPIT.QQ(P.values = GWAS[,4], name.of.trait = trait_names[1])
  
  # 生成全基因组曼哈顿图
  GAPIT.Manhattan(
    GI.MP = GWAS[,2:4], 
    name.of.trait = trait_names[1],
    DPP = myGAPIT$DPP,
    plot.type = "Genomewise",
    cutOff = 0.01
  )
  
  # 生成染色体级曼哈顿图
  GAPIT.Manhattan(
    GI.MP = GWAS[,2:4],
    GD = myGD[,-1],
    name.of.trait = trait_names[1],
    plot.type = "Chromosomewise",
    cutOff = 0.01
  )
  
  # 保存GWAS结果
  utils::write.table(
    GWAS, 
    paste("GAPIT.Association.GWAS_Results.", trait_names[1], ".csv", sep = ""),
    quote = FALSE, 
    sep = ",", 
    row.names = FALSE,
    col.names = TRUE
  )
}

# 5. 多模型结果整合
if(length(model_store) > 1) {
  # 生成多模型曼哈顿图
  GMM <- GAPIT.Multiple.Manhattan(
    model_store = model_store,
    Y.names = trait_names[1],  # 单个性状
    GM = myGM,
    plot.type = c("w", "h")  # 宽度和高度对比
  )
  
  # 生成综合曼哈顿图
  GMM <- GAPIT.Multiple.Manhattan(
    model_store = model_store,
    Y.names = trait_names[1],
    GM = myGM,
    plot.type = c("s")  # 综合展示
  )
  
  # 生成圆形曼哈顿图
  GAPIT.Circle.Manhattan.Plot(
    band = 1,
    r = 3,
    GMM$multip_mapP,
    plot.type = c("c", "q"),
    signal.line = 1,
    xz = GMM$xz,
    threshold = 0.05
  )
}

# 6. 多性状分析调整
# 对于多性状分析，需要调整Y.names参数
if(length(trait_names) > 1) {
  GMM_multi <- GAPIT.Multiple.Manhattan(
    model_store = model_store,
    Y.names = trait_names,  # 多个性状
    GM = myGM,
    plot.type = c("w", "h")
  )
}
```

#### 5. 版本管理策略
- **目前没有其他版本标识**：Kansas和NYC是唯二的标识
- **未来扩展**：可能需要添加更多标识，需要智能体的帮助来管理和解决
- **向后兼容性**：通过GitHub发布不同版本，用户可根据需求选择

#### 6. 最佳实践建议
1. **初步分析**：使用NYC版本识别候选区域
2. **精细定位**：结合Kansas版本确定独立显著位点
3. **结果管理**：使用file.output=FALSE模式，手动控制输出文件
4. **版本控制**：依赖文件系统创建时间或自定义时间戳

