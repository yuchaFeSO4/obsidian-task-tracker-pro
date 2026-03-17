# Task Tracker Pro

[English](#english) | [中文](#chinese)

---

## English

### 🚀 **Quick Start Guide**

Task Tracker Pro is an Obsidian plugin for project tracking and efficiency analysis. It helps you manage tasks, build habits, and visualize your productivity.

#### 📖 **Overview**

This plugin helps you:
- **Project Management** - Track progress, priorities, and completion rates across multiple projects
- **Task Timing** - Support count-up/countdown timers to record time investment
- **Habit Building** - Daily habit tracking with streak counting
- **Data Visualization** - Monthly/yearly heatmaps for activity insights
- **Efficiency Analysis** - Record task satisfaction and evaluate ROI

---

### 🎯 **Core Concepts**

The plugin works with Obsidian's frontmatter and specifically formatted task lines. Each project or habit is a separate Markdown file.

---

### 📁 **File Format Specifications**

#### 1. **Project Files**

##### File Naming
```
project-20240315-143022.md  # Recommended: project-YYYYMMDD-HHMMSS.md
```

##### Frontmatter Fields (Strict Format)

```yaml
---
type: project                    # Fixed: must be "project"
name: "Blog System Refactor"      # Project name (required)
priority: "medium"                 # Options: critical/high/medium/low
status: "active"                   # Options: active/paused/completed/archived
created: 2024-03-15 14:30:22      # Creation time (auto-generated)
archived: false                    # Boolean: true/false
tags: []                          # Tags array (flexible)
---
```

##### Task Line Format (**Must Match Exactly**)

```
- [ ] Task Title | Description: Task details | Priority: high | Satisfaction: 0 | Progress: 0% | Timer: 25
```

**Field Breakdown:**
| Field | Description | Options | Example |
|-------|-------------|---------|---------|
| `- [ ]` | Task status | `[ ]` incomplete / `[x]` complete | `- [x]` |
| Task Title | Task name | Any text | `Database Design` |
| Description | Detailed description | Any text | `Design user table schema` |
| Priority | Task priority | `critical`/`high`/`medium`/`low` | `high` |
| Satisfaction | Rating after completion | 0-5 | `5` |
| Progress | Completion percentage | 0-100 | `75` |
| Timer Mode | Timer type | `countup`/`countdown` | `countup` |
| Initial Time | Initial minutes (for countdown) | Number | `25` |

##### Complete Project File Example

```markdown
---
type: project
name: "Blog System Refactor"
priority: "high"
status: "active"
created: 2024-03-15 14:30:22
archived: false
tags: [blog, development]
---

## 📋 Task List

- [ ] Database Design | Description: Design user and post tables | Priority: high | Satisfaction: 0 | Progress: 0% | Timer: 25
- [ ] API Development | Description: Implement RESTful APIs | Priority: medium | Satisfaction: 0 | Progress: 30% | Timer: 45
- [x] Requirements Analysis | Description: Gather feature requirements | Priority: high | Satisfaction: 4 | Progress: 100% | Timer: 60

## 📝 Progress Log

- 2024-03-15 Project started, completed requirements analysis
- 2024-03-16 Started database design

## 💬 Feedback

> [!note]- Project Evaluation
> Satisfaction: ⭐⭐⭐⭐
> Summary: Progress is good, need to speed up API development
```

---

#### 2. **Habit Files**

##### File Naming
```
habit-health-20240315.md  # Recommended: habit-category-YYYYMMDD.md
```

##### Frontmatter Fields

```yaml
---
type: habit                       # Fixed: must be "habit"
name: "Morning Run"                # Habit name (required)
category: "health"                 # Options: health/learning/work/life/other
frequency: "daily"                 # Options: daily/weekly/monthly/custom
target: 1                          # Target count/days
unit: "time"                       # Unit (times/minutes/pages etc.)
color: "#ff6b6b"                   # Card color (hex)
icon: "🏃"                          # Display icon (any emoji)
created: 2024-03-15 14:30:22       # Creation time
status: "active"                    # Options: active/paused/archived
---
```

##### Record Format

```
> [!habit]- Daily Record
> Date: 2024-03-15
> Status: ✅ Completed
> Notes: Ran 3km
```

**Status Options:**
- `✅` Completed
- `⬜` Incomplete

##### Complete Habit File Example

```markdown
---
type: habit
name: "Morning Run"
category: "health"
frequency: "daily"
target: 1
unit: "time"
color: "#ff6b6b"
icon: "🏃"
created: 2024-03-15 14:30:22
status: "active"
---

## 📊 Habit Settings

- **Frequency**: Daily 1 time
- **Reminder**: 07:00
- **Reward**: Extra reward for 7-day streak

## 📝 Record Format

> [!habit]- Daily Record
> Date: YYYY-MM-DD
> Status: ✅ Completed | ⬜ Incomplete
> Notes:

## 📈 History

> [!habit]- Daily Record
> Date: 2024-03-15
> Status: ✅ Completed
> Notes: Ran 3km, feeling great

> [!habit]- Daily Record
> Date: 2024-03-14
> Status: ✅ Completed
> Notes: Completed on treadmill due to rain

> [!habit]- Daily Record
> Date: 2024-03-13
> Status: ⬜ Incomplete
> Notes: Worked late, rest day
```

---

### 📊 **Data Dimensions**

#### Project Dimensions

| Dimension | Description | Display | Range |
|-----------|-------------|---------|-------|
| **Priority** | Task importance | Left color bar | critical(red)/high(orange)/medium(green)/low(blue) |
| **Progress** | Completion % | Progress bar | 0-100 |
| **Satisfaction** | Post-completion rating | Stars | 0-5 |
| **Timer** | Time tracking | Timer card | countup/countdown |
| **Status** | Project status | Header badge | active/paused/completed/archived |

#### Habit Dimensions

| Dimension | Description | Display | Range |
|-----------|-------------|---------|-------|
| **Today's Status** | Completed today | Button | Completed/Incomplete |
| **Streak** | Consecutive days | 🔥 number | Integer |
| **Monthly Rate** | Monthly completion % | Progress bar | 0-100% |
| **History** | Last 7 days | Date squares | Completed/Incomplete |

#### Heatmap Dimensions

| Dimension | Description | Color Scale | Scope |
|-----------|-------------|-------------|-------|
| **Edit Count** | Daily file edits | L0(gray):0 / L1(light green):1-2 / L2(med green):3-5 / L3(dark green):6-8 / L4(darker green):9+ | Monthly/Yearly |
| **Active Days** | Days with edits | - | Monthly stats |
| **MoM Change** | Month-over-month growth | 📈 up/📉 down/➡️ flat | Monthly |
| **YoY Change** | Year-over-year growth | 📈 up/📉 down/➡️ flat | Yearly |

---

### 🎮 **Quick Start**

#### Step 1: Create First Project

1. Click the **📊 Task Tracker Pro** icon in the left ribbon
2. Click **➕ New Project** button in the top right
3. Modify the auto-generated template

#### Step 2: Add Tasks

Under `## 📋 Task List`, add tasks in this format:

```
- [ ] Learn React | Description: Complete official tutorial | Priority: high | Satisfaction: 0 | Progress: 0% | Timer: 25
```

#### Step 3: Start Timer

1. Find your task card in the dashboard
2. Click **▶ Start** to begin timing
3. Click **⏸** to pause, **↺** to reset
4. Click **✂️ Cut** to record time spent
5. Check the checkbox to mark complete

#### Step 4: Create Habits

1. Click **❤️ Life** tab at the top
2. Click **➕ New Habit** button
3. Modify the template
4. Click the daily button to check in

#### Step 5: View Heatmap

1. Scroll to bottom for **📅 Monthly Activity Heatmap**
2. Use navigation buttons to change month
3. Switch to **Yearly** view for annual overview
4. Click **📥 Export Report** to generate reports

---

### ⚠️ **Important Rules**

#### ✅ **Strict Fields**

```yaml
# Project files must include
type: project                    # Must be "project"
name: "Project Name"             # Must have value

# Task lines must match exactly
- [ ] Title | Description: desc | Priority: medium | Satisfaction: 0 | Progress: 0% | Timer: 25
# Note: Separator must be " | " (space-pipe-space)

# Habit files must include
type: habit                      # Must be "habit"
name: "Habit Name"               # Must have value
category: "health"                # Must have value (for grouping)
```

#### 🔄 **Flexible Fields**

```yaml
# These fields can contain any content
tags: [any, tags, array]          # Flexible, for search only
created: 2024-03-15              # Format fixed but content flexible
Notes: Any text                    # Habit notes are flexible
Progress Log: - Any text           # Project progress logs are flexible
```

#### 🚫 **Common Mistakes**

```markdown
❌ Wrong task format:
- [ ] Task Title | Description:desc | Priority: medium | Satisfaction0 | Progress: 50% | Timer: 25
  (missing spaces, wrong colon, missing pipes)

❌ Wrong frontmatter:
type: project  # Missing ---
name: Project  # Missing quotes

✅ Correct format:
- [ ] Task Title | Description: Description | Priority: medium | Satisfaction: 0 | Progress: 50% | Timer: 25
---
type: project
name: "Project"
---
```

---

### 🎯 **Usage Examples**

#### Example 1: Software Development

```markdown
---
type: project
name: "E-commerce App Development"
priority: "critical"
status: "active"
created: 2024-03-01 09:00:00
archived: false
tags: [iOS, ecommerce]
---

## 📋 Task List

- [ ] Login Feature | Description: Implement JWT authentication | Priority: critical | Satisfaction: 0 | Progress: 60% | Timer: 45
- [ ] Product List | Description: Implement infinite scroll | Priority: high | Satisfaction: 0 | Progress: 30% | Timer: 30
- [x] Database Design | Description: Design user and product tables | Priority: high | Satisfaction: 5 | Progress: 100% | Timer: 60

## 📝 Progress Log

- 2024-03-01 Project started, completed tech stack selection
- 2024-03-05 Completed database design
- 2024-03-10 Login feature in progress
```

#### Example 2: Learning Plan

```markdown
---
type: habit
name: "English Learning"
category: "learning"
frequency: "daily"
target: 30
unit: "minutes"
color: "#4a90e2"
icon: "📚"
created: 2024-03-01 08:00:00
status: "active"
---

## 📊 Habit Settings

- **Frequency**: Daily 30 minutes
- **Reminder**: 20:00
- **Content**: Vocabulary/Listening/Reading

## 📈 History

> [!habit]- Daily Record
> Date: 2024-03-15
> Status: ✅ Completed
> Notes: Learned 50 new words

> [!habit]- Daily Record
> Date: 2024-03-14
> Status: ✅ Completed
> Notes: 30 minutes listening practice
```

#### Example 3: Fitness Tracking

```markdown
---
type: habit
name: "Gym Workout"
category: "health"
frequency: "weekly"
target: 4
unit: "times"
color: "#ff9f4a"
icon: "💪"
created: 2024-03-01 10:00:00
status: "active"
---

## 📊 Habit Settings

- **Frequency**: 4 times per week
- **Workout**: Chest/Back/Legs/Cardio

## 📈 History

> [!habit]- Weekly Record
> Date: 2024-03-15
> Status: ✅ Completed
> Notes: Chest day, 5 sets bench press

> [!habit]- Weekly Record
> Date: 2024-03-13
> Status: ✅ Completed
> Notes: Back day, pull-ups
```

---

### ⌨️ **Hotkeys**

| Hotkey | Function |
|--------|----------|
| `Ctrl+Shift+D` | Open Task Tracker Dashboard |
| `Ctrl+Shift+P` | Create New Project |
| `Ctrl+Shift+H` | Create New Habit |

---

### 🔧 **Troubleshooting**

**Q: Task cards not showing?**
A: Check task line format. Separator must be ` | ` (space-pipe-space)

**Q: Habit check-in not working?**
A: Verify date format is `YYYY-MM-DD`

**Q: Heatmap not updating?**
A: Click **🔄 Refresh** button in top right

**Q: How to archive completed projects?**
A: Set `archived: true` or `status: "archived"` in frontmatter

---

### 📝 **Version History**

- **V14** - Fixed habit section rendering, added yearly heatmap
- **V13** - Fixed render errors, performance optimization
- **V12** - Added monthly report export
- **V11** - Timer interface optimization

---

> 💡 **Tip**: Use Templater or QuickAdd plugins to create templates for quick project/habit creation!

---

## 中文

### 🚀 **快速上手指南**

Task Tracker Pro 是一个基于 Obsidian 的任务追踪与效益分析仪表盘插件。

#### 📖 **插件简介**

本插件帮助你：
- **项目管理** - 追踪多个项目的进度、优先级和完成度
- **任务计时** - 支持正计时/倒计时，记录每项任务的投入时间
- **习惯养成** - 每日习惯打卡，查看连续完成天数
- **数据可视化** - 月度/年度热力图，直观看到活跃情况
- **效益分析** - 记录任务满意度，评估投入产出比

---

### 🎯 **核心概念**

插件基于 Obsidian 的 frontmatter 和特定格式的任务行来工作。每个项目或习惯都是一个独立的 Markdown 文件。

---

### 📁 **文件类型规范**

#### 1. **项目文件**

##### 文件命名
```
项目-20240315-143022.md  # 推荐格式：项目-YYYYMMDD-HHMMSS.md
```

##### Frontmatter 字段（严格格式）

```yaml
---
type: project                    # 固定值：必须为 "project"
name: "博客系统重构"               # 项目名称（必填）
priority: "中"                    # 可选值：紧急/高/中/低
status: "进行中"                  # 可选值：进行中/暂停/已完成/已归档
created: 2024-03-15 14:30:22     # 创建时间（自动生成）
archived: false                   # 布尔值：true/false
tags: []                          # 标签数组（灵活）
---
```

##### 任务行格式（**必须完全匹配**）

```
- [ ] 任务标题 | 内容：具体任务描述 | 优先级：高 | 满意度：0 | 完成度：0% | 正计时：25
```

**字段解析：**
| 字段 | 说明 | 可选值 | 示例 |
|------|------|--------|------|
| `- [ ]` | 任务状态 | `[ ]` 未完成 / `[x]` 已完成 | `- [x]` |
| 任务标题 | 任务名称 | 任意文本 | `数据库设计` |
| 内容 | 详细描述 | 任意文本 | `设计用户表结构` |
| 优先级 | 任务优先级 | `紧急`/`高`/`中`/`低` | `高` |
| 满意度 | 完成后的满意度评分 | 0-5 的数字 | `5` |
| 完成度 | 当前完成百分比 | 0-100 的数字 | `75` |
| 计时模式 | 正计时或倒计时 | `正计时`/`倒计时` | `正计时` |
| 初始时间 | 初始分钟数 | 数字 | `25` |

##### 完整的项目文件示例

```markdown
---
type: project
name: "博客系统重构"
priority: "高"
status: "进行中"
created: 2024-03-15 14:30:22
archived: false
tags: [博客, 开发]
---

## 📋 任务清单

- [ ] 数据库设计 | 内容：设计用户表和文章表结构 | 优先级：高 | 满意度：0 | 完成度：0% | 正计时：25
- [ ] API开发 | 内容：实现RESTful接口 | 优先级：中 | 满意度：0 | 完成度：30% | 正计时：45
- [x] 需求分析 | 内容：梳理功能需求 | 优先级：高 | 满意度：4 | 完成度：100% | 倒计时：60

## 📝 进展记录

- 2024-03-15 项目启动，完成需求分析
- 2024-03-16 开始数据库设计

## 💬 评价与反馈

> [!note]- 项目评价
> 满意度：⭐⭐⭐⭐
> 总结：进展顺利，需要加快API开发速度
```

---

#### 2. **习惯文件**

##### 文件命名
```
习惯-健康-20240315.md  # 推荐格式：习惯-分类-YYYYMMDD.md
```

##### Frontmatter 字段

```yaml
---
type: habit                       # 固定值：必须为 "habit"
name: "每日晨跑"                   # 习惯名称（必填）
category: "健康"                   # 可选值：健康/学习/工作/生活/其他
frequency: "每日"                  # 可选值：每日/每周/每月/间隔
target: 1                         # 目标次数/天数
unit: "次"                        # 单位（次/分钟/页等）
color: "#ff6b6b"                  # 卡片颜色（十六进制色值）
icon: "🏃"                         # 显示图标（任意emoji）
created: 2024-03-15 14:30:22      # 创建时间
status: "active"                  # 可选值：active/paused/archived
---
```

##### 记录格式

```
> [!habit]- 每日记录
> 日期：2024-03-15
> 状态：✅ 完成
> 备注：跑了3公里
```

**状态说明：**
- `✅` 完成
- `⬜` 未完成

##### 完整的习惯文件示例

```markdown
---
type: habit
name: "每日晨跑"
category: "健康"
frequency: "每日"
target: 1
unit: "次"
color: "#ff6b6b"
icon: "🏃"
created: 2024-03-15 14:30:22
status: "active"
---

## 📊 习惯设置

- **频率**: 每日 1次
- **提醒时间**: 07:00
- **奖励机制**: 连续7天完成获得额外奖励

## 📝 记录格式

> [!habit]- 每日记录
> 日期：YYYY-MM-DD
> 状态：✅ 完成 | ⬜ 未完成
> 备注：

## 📈 历史记录

> [!habit]- 每日记录
> 日期：2024-03-15
> 状态：✅ 完成
> 备注：跑了3公里，感觉很棒

> [!habit]- 每日记录
> 日期：2024-03-14
> 状态：✅ 完成
> 备注：下雨天在跑步机完成

> [!habit]- 每日记录
> 日期：2024-03-13
> 状态：⬜ 未完成
> 备注：加班太晚，休息一天
```

---

### 📊 **数据维度说明**

#### 项目维度

| 维度 | 说明 | 显示位置 | 取值范围 |
|------|------|----------|----------|
| **优先级** | 任务重要程度 | 左侧颜色条 | 紧急(红)/高(橙)/中(绿)/低(蓝) |
| **完成度** | 完成百分比 | 进度条 | 0-100 |
| **满意度** | 完成后的评价 | 星级 | 0-5星 |
| **计时** | 投入时间追踪 | 计时器 | 正计时/倒计时 |
| **状态** | 项目整体状态 | 头部徽章 | 进行中/暂停/已完成/已归档 |

#### 习惯维度

| 维度 | 说明 | 显示位置 | 取值范围 |
|------|------|----------|----------|
| **今日状态** | 当天是否完成 | 今日按钮 | 已完成/未完成 |
| **连续天数** | 连续完成天数 | 🔥数字 | 整数 |
| **月度完成率** | 本月完成百分比 | 进度条 | 0-100% |
| **历史记录** | 最近7天状态 | 日期方块 | 已完成/未完成 |

#### 热力图维度

| 维度 | 说明 | 颜色等级 | 统计范围 |
|------|------|----------|----------|
| **编辑次数** | 当天文件修改次数 | L0(灰):0 / L1(浅绿):1-2 / L2(中绿):3-5 / L3(深绿):6-8 / L4(墨绿):9+ | 月度/年度 |
| **活跃天数** | 有编辑的天数 | - | 月度统计 |
| **环比** | 相比上月的增长率 | 📈上升/📉下降/➡️持平 | 月度对比 |
| **同比** | 相比去年的增长率 | 📈上升/📉下降/➡️持平 | 年度对比 |

---

### 🎮 **快速开始**

#### 第一步：创建第一个项目

1. 点击左侧功能区的 **📊 任务追踪看板** 图标
2. 点击右上角的 **➕ 新建项目** 按钮
3. 修改自动生成的模板文件

#### 第二步：添加任务

在 `## 📋 任务清单` 下，按以下格式添加任务：

```
- [ ] 学习React | 内容：完成官方教程 | 优先级：高 | 满意度：0 | 完成度：0% | 正计时：25
```

#### 第三步：开始计时

1. 在看板中找到任务卡片
2. 点击 **▶ 开始** 按钮开始计时
3. 点击 **⏸** 暂停，**↺** 重置
4. 点击 **截** 按钮记录投入时间
5. 勾选复选框标记任务完成

#### 第四步：创建习惯

1. 看板顶部点击 **❤️ 生活区** 选项卡
2. 点击 **➕ 新建习惯** 按钮
3. 修改模板中的习惯名称和设置
4. 每天点击卡片上的按钮打卡

#### 第五步：查看热力图

1. 滚动到看板底部查看 **📅 月度活动热力图**
2. 点击月份切换按钮查看不同月份
3. 点击 **年度** 切换到年度总览视图
4. 点击 **📥 导出报告** 生成月度/年度报告

---

### ⚠️ **重要规则**

#### ✅ **必须严格遵守的字段**

```yaml
# 项目文件必须包含
type: project                    # 必须为 "project"
name: "项目名称"                  # 必须有值

# 任务行必须完全匹配格式
- [ ] 标题 | 内容：描述 | 优先级：中 | 满意度：0 | 完成度：0% | 正计时：25
# 注意：分隔符必须是 " | "（空格竖线空格）

# 习惯文件必须包含
type: habit                      # 必须为 "habit"
name: "习惯名称"                  # 必须有值
category: "健康"                  # 必须有值（用于分组）
```

#### 🔄 **可以灵活使用的字段**

```yaml
# 以下字段可以根据需要填写任意内容
tags: [任意, 标签, 数组]          # 灵活，仅用于搜索
created: 2024-03-15             # 格式固定但内容灵活
备注：任意文本                    # 习惯备注灵活
进展记录：- 任意文本               # 项目进展灵活
```

#### 🚫 **不要这样写**

```markdown
❌ 错误的任务格式：
- [ ] 任务标题 | 内容:描述 | 优先级：中 | 满意度0 | 完成度：50% | 正计时：25
  （缺少空格、冒号错误、缺少竖线）

❌ 错误的frontmatter：
type: project  # 前面没有 ---
name: 项目      # 缺少引号

✅ 正确的写法：
- [ ] 任务标题 | 内容：描述 | 优先级：中 | 满意度：0 | 完成度：50% | 正计时：25
---
type: project
name: "项目"
---
```

---

### 🎯 **使用场景示例**

#### 场景1：软件开发项目

```markdown
---
type: project
name: "电商App开发"
priority: "紧急"
status: "进行中"
created: 2024-03-01 09:00:00
archived: false
tags: [iOS, 电商]
---

## 📋 任务清单

- [ ] 登录功能 | 内容：实现JWT认证 | 优先级：紧急 | 满意度：0 | 完成度：60% | 正计时：45
- [ ] 商品列表 | 内容：实现无限滚动 | 优先级：高 | 满意度：0 | 完成度：30% | 正计时：30
- [x] 数据库设计 | 内容：设计用户和商品表 | 优先级：高 | 满意度：5 | 完成度：100% | 倒计时：60

## 📝 进展记录

- 2024-03-01 项目启动，完成技术选型
- 2024-03-05 完成数据库设计
- 2024-03-10 登录功能开发中
```

#### 场景2：学习计划

```markdown
---
type: habit
name: "英语学习"
category: "学习"
frequency: "每日"
target: 30
unit: "分钟"
color: "#4a90e2"
icon: "📚"
created: 2024-03-01 08:00:00
status: "active"
---

## 📊 习惯设置

- **频率**: 每日 30分钟
- **提醒时间**: 20:00
- **学习内容**: 单词/听力/阅读

## 📈 历史记录

> [!habit]- 每日记录
> 日期：2024-03-15
> 状态：✅ 完成
> 备注：背诵50个单词

> [!habit]- 每日记录
> 日期：2024-03-14
> 状态：✅ 完成
> 备注：听力练习30分钟
```

#### 场景3：健身追踪

```markdown
---
type: habit
name: "健身房打卡"
category: "健康"
frequency: "每周"
target: 4
unit: "次"
color: "#ff9f4a"
icon: "💪"
created: 2024-03-01 10:00:00
status: "active"
---

## 📊 习惯设置

- **频率**: 每周4次
- **锻炼内容**: 胸/背/腿/有氧

## 📈 历史记录

> [!habit]- 每周记录
> 日期：2024-03-15
> 状态：✅ 完成
> 备注：练胸日，卧推5组

> [!habit]- 每周记录
> 日期：2024-03-13
> 状态：✅ 完成
> 备注：练背日，引体向上
```

---

### ⌨️ **快捷键**

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+Shift+D` | 打开任务追踪看板 |
| `Ctrl+Shift+P` | 新建项目 |
| `Ctrl+Shift+H` | 新建习惯 |

---

### 🔧 **常见问题**

**Q: 任务卡片不显示怎么办？**
A: 检查任务行格式是否正确，分隔符必须是 ` | `（空格竖线空格）

**Q: 习惯打卡没反应？**
A: 检查日期格式是否为 `YYYY-MM-DD`

**Q: 热力图不更新？**
A: 点击看板右上角的 **🔄 刷新** 按钮

**Q: 如何归档已完成项目？**
A: 在 frontmatter 中设置 `archived: true` 或 `status: "已归档"`

---

### 📝 **版本历史**

- **V14** - 修复生活区渲染问题，添加年度热力图
- **V13** - 修复渲染错误，优化性能
- **V12** - 添加月度报告导出功能
- **V11** - 优化计时器界面

---

> 💡 **小提示**：可以用 Templater 或 QuickAdd 插件创建模板，快速生成标准格式的项目和习惯文件！
