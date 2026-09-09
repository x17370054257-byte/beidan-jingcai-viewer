# 精选清单 · 2026-09-10

- 版本：**1.3.1**（playbook 正路：收市场降权 + 票型门禁补洞后重算）
- 生成时间（Asia/Shanghai）：2026-09-10 03:12 CST
- 规则：`playbook-rules.md` v1.3.1 · 由 `score_picks.py` 按规则生成（非手工打补丁）
- 范围：竞彩 17 场足球观察终稿；骨架/北单占位跳过
- 声明：不改 H/D/A；不授权下注；market_baseline **禁精选**

## 汇总

| 池 | 场次 |
|---|---:|
| **精选** | **0** |
| **观察** | **17** |
| forced_selection | 0 |

自查：观察17/精选0 — 因全员 `market_baseline`，按 §0.6 **仍合理**；收市场已降权（-12 且 rank 顶 54）。

## 精选条目

（无）

## 观察（rank 降序）

| # | 场 | 编号 | 结论摘要 | H/D/A | rank | 角标 |
|---|---|---|---|---|---:|---|
| 1 | 查尔顿 vs 女王巡游 | 周三010 / 北单55 | 客胜 | 28.8%/28.8%/42.5% | **32** | `观察` `market_baseline` |
| 2 | 费内巴切 vs 罗马 | 周四001 / 北单82 | 客胜 | 30.1%/27.1%/42.8% | **32** | `观察` `market_baseline` |
| 3 | 拉普大学 vs 科林蒂安 | 周三014 / 北单71 | 主胜 | 41.7%/32.7%/25.6% | **30** | `观察` `market_baseline` |
| 4 | 芝加哥 vs 迈阿密国际 | 周三015 / 北单73 | 方向不清，略偏主 | 研报未给齐（引用原文） | **27** | `观察·低分` `market_baseline` |
| 5 | 斯拉维亚 vs 朗斯 | 周四004 / 北单90 | 方向不清，略偏主不败 | 研报未给齐（引用原文） | **25** | `观察·低分` `market_baseline` |
| 6 | 德尔瓦耶 vs 弗拉门戈 | 周四007 / 北单96 | 方向不清，略偏主 | 研报未给齐（引用原文） | **25** | `观察·低分` `market_baseline` |
| 7 | 利物浦 vs 马竞 | 周三008 / 北单51 | 主胜 | 研报未给齐（引用原文） | **21** | `观察·低分` `market_baseline` |
| 8 | 科莫 vs 莱红牛 | 周四002 / 北单待补 | 主胜 | 研报未给齐（引用原文） | **20** | `观察·低分` `market_baseline` |
| 9 | 里斯本 vs 加拉塔萨 | 周三006 / 北单52 | 主胜 | 55.6%/23.4%/21.0% | **0** | `观察·低分` `market_baseline` `弱腿风险` |
| 10 | 那不勒斯 vs 阿森纳 | 周三007 / 北单53 | 客胜 | 17.0%/24.6%/58.4% | **0** | `观察·低分` `market_baseline` `弱腿风险` |
| 11 | 巴黎圣曼 vs 布拉迪斯 | 周三009 / 北单50 | 主胜 | 90.7%/5.8%/3.5% | **0** | `观察·低分` `market_baseline` `弱腿风险` |
| 12 | 切尔西 vs 利兹联 | 周三011 / 北单54 | 主胜 | 64.0%/21.0%/15.1% | **0** | `观察·低分` `market_baseline` `弱腿风险` |
| 13 | 摩雷伦斯 vs 本菲卡 | 周三012 / 北单57 | 客胜 | 6.5%/12.9%/80.6% | **0** | `观察·低分` `market_baseline` `弱腿风险` |
| 14 | 帕梅拉斯 vs 基多体大 | 周三013 / 北单待补 | 主胜 | 73.7%/19.2%/7.1% | **0** | `观察·低分` `market_baseline` `弱腿风险` |
| 15 | 拜仁 vs 博德闪耀 | 周四003 / 北单88 | 主胜 | 84.1%/10.3%/5.7% | **0** | `观察·低分` `market_baseline` `弱腿风险` |
| 16 | 曼联 vs 萨巴赫 | 周四005 / 北单待补 | 主胜 | 84.1%/10.9%/5.0% | **0** | `观察·低分` `market_baseline` `弱腿风险` |
| 17 | 阿马多拉 vs 布拉加 | 周四006 / 北单93 | 客胜 | 20.3%/26.0%/53.7% | **0** | `观察·低分` `market_baseline` `弱腿风险` |

### 理由 / 风险（逐场）

#### 1. 周三010 周三010｜查尔顿 vs 女王巡游
- 研报：`周三010-查尔顿女王巡游.md` · 主推引用：客胜（市场基准 · 研究观察 · 不出票）
- **理由一行**：方向有研究观察，但数值层收市场、无独立 prior。
- **风险一行**：market_baseline 禁精选（rank顶54）；研报不出票
- rank 明细：clarity15+football14+balance20+disagree0+product5 −罚分后 raw→cap **32**
- forced_selection：否

#### 2. 周四001 周四001｜费内巴切 vs 罗马
- 研报：`周四001-费内巴切罗马.md` · 主推引用：客胜（市场基准 · 研究观察 · 不出票）
- **理由一行**：方向有研究观察，但数值层收市场、无独立 prior。
- **风险一行**：market_baseline 禁精选（rank顶54）；研报不出票
- rank 明细：clarity15+football14+balance20+disagree0+product5 −罚分后 raw→cap **32**
- forced_selection：否

#### 3. 周三014 周三014｜拉普大学 vs 科林蒂安
- 研报：`周三014-拉普大学科林蒂安.md` · 主推引用：主胜（市场基准 · 研究观察 · 不出票）
- **理由一行**：方向有研究观察，但数值层收市场、无独立 prior。
- **风险一行**：market_baseline 禁精选（rank顶54）；首发未锁定；研报不出票
- rank 明细：clarity15+football12+balance20+disagree0+product5 −罚分后 raw→cap **30**
- forced_selection：否

#### 4. 周三015 周三015｜芝加哥 vs 迈阿密国际
- 研报：`周三015-芝加哥迈阿密国际.md` · 主推引用：方向不清，略偏主（市场基准 · 研究观察 · 不出票）
- **理由一行**：方向有研究观察，但数值层收市场、无独立 prior。
- **风险一行**：market_baseline 禁精选（rank顶54）；研报不出票
- rank 明细：clarity12+football14+balance18+disagree0+product5 −罚分后 raw→cap **27**
- forced_selection：否

#### 5. 周四004 周四004｜斯拉维亚 vs 朗斯
- 研报：`周四004-斯拉维亚朗斯.md` · 主推引用：方向不清，略偏主不败（市场基准 · 研究观察 · 不出票）
- **理由一行**：方向有研究观察，但数值层收市场、无独立 prior。
- **风险一行**：market_baseline 禁精选（rank顶54）；研报不出票
- rank 明细：clarity12+football12+balance18+disagree0+product5 −罚分后 raw→cap **25**
- forced_selection：否

#### 6. 周四007 周四007｜德尔瓦耶 vs 弗拉门戈
- 研报：`周四007-德尔瓦耶弗拉门戈.md` · 主推引用：方向不清，略偏主（市场基准 · 研究观察 · 不出票）
- **理由一行**：方向有研究观察，但数值层收市场、无独立 prior。
- **风险一行**：market_baseline 禁精选（rank顶54）；研报不出票
- rank 明细：clarity12+football12+balance18+disagree0+product5 −罚分后 raw→cap **25**
- forced_selection：否

#### 7. 周三008 周三008｜利物浦 vs 马竞
- 研报：`周三008-利物浦马竞.md` · 主推引用：主胜（市场基准 · 研究观察 · 不出票）
- **理由一行**：方向有研究观察，但数值层收市场、无独立 prior。
- **风险一行**：market_baseline 禁精选（rank顶54）；首发未锁定；研报不出票
- rank 明细：clarity18+football14+balance6+disagree0+product5 −罚分后 raw→cap **21**
- forced_selection：否

#### 8. 周四002 周四002｜科莫 vs 莱红牛
- 研报：`周四002-科莫莱红牛.md` · 主推引用：主胜（市场基准 · 研究观察 · 不出票）
- **理由一行**：方向有研究观察，但数值层收市场、无独立 prior。
- **风险一行**：market_baseline 禁精选（rank顶54）；研报不出票
- rank 明细：clarity15+football10+balance6+disagree8+product3 −罚分后 raw→cap **20**
- forced_selection：否

#### 9. 周三006 周三006｜里斯本 vs 加拉塔萨
- 研报：`周三006-里斯本加拉塔萨.md` · 主推引用：主胜（市场基准 · 研究观察 · 不出票）
- **理由一行**：方向有研究观察，但数值层收市场、无独立 prior。
- **风险一行**：market_baseline 禁精选（rank顶54）；近/极端低赔热门；首发未锁定；研报不出票
- rank 明细：clarity18+football14+balance8+disagree0+product5 −罚分后 raw→cap **0**
- forced_selection：否

#### 10. 周三007 周三007｜那不勒斯 vs 阿森纳
- 研报：`周三007-那不勒斯阿森纳.md` · 主推引用：客胜（市场基准 · 研究观察 · 不出票）
- **理由一行**：方向有研究观察，但数值层收市场、无独立 prior。
- **风险一行**：market_baseline 禁精选（rank顶54）；近/极端低赔热门；研报不出票
- rank 明细：clarity15+football12+balance8+disagree0+product5 −罚分后 raw→cap **0**
- forced_selection：否

#### 11. 周三009 周三009｜巴黎圣曼 vs 布拉迪斯
- 研报：`周三009-巴黎圣曼布拉迪斯.md` · 主推引用：主胜（市场基准 · 研究观察 · 不出票）
- **理由一行**：方向有研究观察，但数值层收市场、无独立 prior。
- **风险一行**：market_baseline 禁精选（rank顶54）；近/极端低赔热门；研报不出票
- rank 明细：clarity18+football12+balance2+disagree0+product5 −罚分后 raw→cap **0**
- forced_selection：否

#### 12. 周三011 周三011｜切尔西 vs 利兹联
- 研报：`周三011-切尔西利兹联.md` · 主推引用：主胜（市场基准 · 研究观察 · 不出票）
- **理由一行**：方向有研究观察，但数值层收市场、无独立 prior。
- **风险一行**：market_baseline 禁精选（rank顶54）；近/极端低赔热门；首发未锁定；研报不出票
- rank 明细：clarity18+football12+balance8+disagree0+product5 −罚分后 raw→cap **0**
- forced_selection：否

#### 13. 周三012 周三012｜摩雷伦斯 vs 本菲卡
- 研报：`周三012-摩雷伦斯本菲卡.md` · 主推引用：客胜（市场基准 · 研究观察 · 不出票）
- **理由一行**：方向有研究观察，但数值层收市场、无独立 prior。
- **风险一行**：market_baseline 禁精选（rank顶54）；近/极端低赔热门；首发未锁定；研报不出票
- rank 明细：clarity15+football12+balance2+disagree0+product5 −罚分后 raw→cap **0**
- forced_selection：否

#### 14. 周三013 周三013｜帕梅拉斯 vs 基多体大
- 研报：`周三013-帕梅拉斯基多体大.md` · 主推引用：主胜（市场基准 · 研究观察 · 不出票）
- **理由一行**：方向有研究观察，但数值层收市场、无独立 prior。
- **风险一行**：market_baseline 禁精选（rank顶54）；近/极端低赔热门；研报不出票
- rank 明细：clarity18+football10+balance2+disagree0+product3 −罚分后 raw→cap **0**
- forced_selection：否

#### 15. 周四003 周四003｜拜仁 vs 博德闪耀
- 研报：`周四003-拜仁博德闪耀.md` · 主推引用：主胜（市场基准 · 研究观察 · 不出票）
- **理由一行**：方向有研究观察，但数值层收市场、无独立 prior。
- **风险一行**：market_baseline 禁精选（rank顶54）；近/极端低赔热门；研报不出票
- rank 明细：clarity18+football12+balance2+disagree0+product5 −罚分后 raw→cap **0**
- forced_selection：否

#### 16. 周四005 周四005｜曼联 vs 萨巴赫
- 研报：`周四005-曼联萨巴赫.md` · 主推引用：主胜（市场基准 · 研究观察 · 不出票）
- **理由一行**：方向有研究观察，但数值层收市场、无独立 prior。
- **风险一行**：market_baseline 禁精选（rank顶54）；近/极端低赔热门；研报不出票
- rank 明细：clarity18+football12+balance2+disagree0+product3 −罚分后 raw→cap **0**
- forced_selection：否

#### 17. 周四006 周四006｜阿马多拉 vs 布拉加
- 研报：`周四006-阿马多拉布拉加.md` · 主推引用：客胜（市场基准 · 研究观察 · 不出票）
- **理由一行**：方向有研究观察，但数值层收市场、无独立 prior。
- **风险一行**：market_baseline 禁精选（rank顶54）；近/极端低赔热门；首发未锁定；研报不出票
- rank 明细：clarity15+football12+balance12+disagree0+product5 −罚分后 raw→cap **0**
- forced_selection：否

## 票型结构检查

- 候选来源：仅 `精选` 腿（本批 0）
- 门结果：`blocked`（no_curated_legs）
- 市场镜像：观察池多数主推=市场最高隐含项（描述性）；全观察拼票必标 market_mirrored
- 联合存活：不适用（无精选票）
- forced_selection：否
- 一句话风险：精选腿=0 → 无默认候选票；不得用观察池拼 ready。若用户强制凑场：整票 forced_selection，门最高 review。

## 规则自查结论

1. 观察17/精选0：**合理** — 收市场场禁止入精选。
2. 收市场：**已降权**（标签禁精选 + 分项 -12 + rank 硬顶 54）。
3. 票型门禁：**已补洞** — 零精选 → blocked/no_curated_legs；禁止观察池默认为 ready。
