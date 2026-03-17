// main.js - 修复版本 V14 - 修复生活区渲染问题和年度热力图
const { Plugin, ItemView, Notice, TFile, moment, Platform } = require('obsidian');

const VIEW_TYPE = "DASHBOARD_V14";  // 升级版本号

class TaskTrackerPlugin extends Plugin {
    async onload() {
        console.log('Loading Task Tracker Pro V14 (修复生活区渲染)');
        
        this.registerView(VIEW_TYPE, (leaf) => new TaskTrackerView(leaf, this));
        
        this.addRibbonIcon('layout-dashboard', '任务追踪看板', () => this.activateView());
        
        this.addCommand({
            id: 'open-dashboard',
            name: '打开任务追踪看板',
            hotkeys: [{ modifiers: ['Ctrl', 'Shift'], key: 'D' }],
            callback: () => this.activateView()
        });
        
        this.addCommand({
            id: 'new-project',
            name: '新建项目',
            hotkeys: [{ modifiers: ['Ctrl', 'Shift'], key: 'P' }],
            callback: () => this.createNewProject()
        });
        
        this.addCommand({
            id: 'new-habit',
            name: '新建习惯追踪',
            hotkeys: [{ modifiers: ['Ctrl', 'Shift'], key: 'H' }],
            callback: () => this.createNewHabit()
        });
    }
    
    async createNewHabit() {
        const template = `---
type: habit
name: "新习惯"
category: "健康"  # 健康/学习/工作/生活/其他
frequency: "每日"  # 每日/每周/每月/间隔
target: 1          # 目标次数/天数
unit: "次"         # 单位
color: "#ff6b6b"  # 显示颜色
icon: "❤️"         # 显示图标
created: ${moment().format('YYYY-MM-DD HH:mm:ss')}
status: "active"
---

## 📊 习惯设置

- **频率**: 每日 1次
- **提醒时间**: 09:00
- **奖励机制**: 连续7天完成获得额外❤️

## 📝 记录格式

> [!habit]- 每日记录
> 日期：YYYY-MM-DD
> 状态：✅ 完成 | ⬜ 未完成
> 备注：

## 📈 历史记录

`;
        
        const fileName = `习惯-${moment().format('YYYYMMDD-HHmmss')}.md`;
        const file = await this.app.vault.create(fileName, template);
        this.app.workspace.getLeaf().openFile(file);
        this.refreshDashboard();
    }
    
    async createNewProject() {
        const template = `---
type: project
name: "新项目"
priority: "中"
status: "进行中"
created: ${moment().format('YYYY-MM-DD HH:mm:ss')}
archived: false
tags: []
---

## 📋 任务清单

- [ ] 任务1 | 内容：具体描述 | 优先级：中 | 满意度：0 | 完成度：0% | 正计时：25

## 📝 进展记录

- ${moment().format('YYYY-MM-DD')} 项目启动

## 💬 评价与反馈

> [!note]- 项目评价
> 满意度：⭐️⭐️⭐️
> 总结：待更新
`;
        
        const fileName = `项目-${moment().format('YYYYMMDD-HHmmss')}.md`;
        const file = await this.app.vault.create(fileName, template);
        this.app.workspace.getLeaf().openFile(file);
        this.refreshDashboard();
    }
    
    async refreshDashboard() {
        const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE);
        leaves.forEach(leaf => {
            if (leaf.view instanceof TaskTrackerView) {
                leaf.view.render();
            }
        });
        new Notice('看板已刷新');
    }
    
    async activateView() {
        const { workspace } = this.app;
        
        let leaf = workspace.getLeavesOfType(VIEW_TYPE)[0];
        if (!leaf) {
            leaf = workspace.getLeaf('tab');
            await leaf.setViewState({ type: VIEW_TYPE, active: true });
        }
        
        workspace.revealLeaf(leaf);
        
        if (leaf.view instanceof TaskTrackerView) {
            setTimeout(() => leaf.view.render(), 100);
        }
    }
    
    onunload() {
        this.app.workspace.detachLeavesOfType(VIEW_TYPE);
    }
}

class TaskTrackerView extends ItemView {
    constructor(leaf, plugin) {
        super(leaf);
        this.plugin = plugin;
        this.timers = {};
        this.expandedProjects = new Set();
        this.expandedArchive = new Set();      
        this.expandedHeatmap = true;
        this.expandedHabits = true;
        this.pinnedTasks = new Set();
        this.habitData = {};
        this.loadPinnedState();
        this.timerUpdateInterval = null;
        
        // 选项卡状态
        this.activeTab = 'active';
        
        // 热力图月份选择
        this.heatmapYear = moment().year();
        this.heatmapMonth = moment().month() + 1;
        this.heatmapData = null;
        
        // 年度热力图选择
        this.heatmapViewMode = 'month'; // 'month' 或 'year'
        this.heatmapYearView = moment().year();
        
        // 第一次进入生活区标记
        this.firstHabitEnter = true;
    }

    loadPinnedState() {
        const saved = localStorage.getItem('task-tracker-pinned-v14');
        if (saved) {
            try {
                this.pinnedTasks = new Set(JSON.parse(saved));
            } catch (e) {
                this.pinnedTasks = new Set();
            }
        }
    }
    
    savePinnedState() {
        localStorage.setItem('task-tracker-pinned-v14', JSON.stringify([...this.pinnedTasks]));
    }

    getViewType() { return VIEW_TYPE; }
    getDisplayText() { return "任务追踪看板"; }

    async onOpen() { 
        await this.render(); 
        this.startGlobalTimer();
    }
    
    onClose() {
        if (this.timerUpdateInterval) {
            clearInterval(this.timerUpdateInterval);
        }
        super.onClose();
    }
    
    startGlobalTimer() {
        if (this.timerUpdateInterval) {
            clearInterval(this.timerUpdateInterval);
        }
        
        this.timerUpdateInterval = setInterval(() => {
            try {
                let needsUpdate = false;
                
                Object.keys(this.timers).forEach(timerId => {
                    const timer = this.timers[timerId];
                    if (timer && timer.running) {
                        const now = Date.now();
                        const elapsed = Math.floor((now - timer.lastUpdate) / 1000);
                        
                        if (elapsed > 0) {
                            if (timer.mode === 'countdown') {
                                timer.seconds = Math.max(0, timer.seconds - elapsed);
                                if (timer.seconds <= 0) {
                                    timer.running = false;
                                    timer.seconds = 0;
                                    new Notice(`⏰ 任务 "${timer.taskName}" 时间到！`);
                                }
                            } else {
                                timer.seconds += elapsed;
                            }
                            
                            timer.lastUpdate = now;
                            needsUpdate = true;
                        }
                    }
                });
                
                if (needsUpdate) {
                    Object.keys(this.timers).forEach(timerId => {
                        const timer = this.timers[timerId];
                        const displayEl = document.getElementById(`timer-${timerId}`);
                        if (displayEl) {
                            displayEl.textContent = this.formatTime(timer.seconds);
                        }
                    });
                }
            } catch (e) {
                console.error('Timer update error:', e);
            }
        }, 200);
    }

    async render() {
        try {
            const container = this.containerEl.children[1];
            container.empty();
            container.addClass('task-tracker-container-v14');
            
            this.injectBaseStyles();
            
            const wrapper = container.createDiv('tracker-wrapper');
            
            // 先渲染头部（无论如何都要显示）
            await this.renderHeader(wrapper);
            
            // 渲染选项卡
            await this.renderTabBar(wrapper);
            
            // 根据选项卡渲染内容
            try {
                if (this.activeTab === 'habit') {
                    if (this.firstHabitEnter) {
                        this.expandedHabits = true;
                        this.firstHabitEnter = false;
                    }
                    await this.renderHabitSection(wrapper);
                } else {
                    await this.renderProjectTabs(wrapper);
                }
            } catch (e) {
                console.error('Error rendering tab content:', e);
                // 显示错误信息但不中断渲染
                const errorDiv = wrapper.createDiv({ 
                    cls: 'error-message',
                    attr: { style: 'padding:20px; background:var(--background-modifier-error); color:var(--text-error); border-radius:8px; margin:20px 0;' }
                });
                errorDiv.setText('渲染内容时出现错误，请刷新页面');
            }

            // 渲染热力图（确保即使上面出错也能显示）
            try {
                const heatmapSection = wrapper.createDiv({ cls: 'heatmap-section-bottom', attr: { style: 'margin-top:30px;' } });
                await this.renderHeatmapWithMode(heatmapSection);
            } catch (e) {
                console.error('Error rendering heatmap:', e);
            }
        } catch (e) {
            console.error('Fatal render error:', e);
            // 如果整个渲染都失败了，至少显示一个错误信息
            const container = this.containerEl.children[1];
            container.empty();
            container.createDiv({ 
                text: '渲染看板时出现严重错误，请刷新页面或重启Obsidian',
                attr: { style: 'padding:40px; text-align:center; color:var(--text-error);' }
            });
        }
    }

    async renderProjectTabs(wrapper) {
        const files = this.app.vault.getMarkdownFiles();
        const projects = [];
        for (const file of files) {
            try {
                const cache = this.app.metadataCache.getFileCache(file);
                const fm = cache?.frontmatter;
                if (fm?.type === 'project') {
                    projects.push({ file, fm, cache });
                }
            } catch (e) {
                console.error('Error processing file:', file.path, e);
            }
        }
        
        if (this.activeTab === 'recent') {
            const recentFiles = files
                .filter(f => f.extension === 'md')
                .sort((a,b) => b.stat.mtime - a.stat.mtime)
                .slice(0, 12);
            await this.renderRecentSection(wrapper, recentFiles);
        } else if (this.activeTab === 'active') {
            const stats = this.calculateActiveStats(projects);
            this.renderStatsBoard(wrapper, stats, 'active');
            const activeProjects = projects.filter(p => !(p.fm?.archived === true || p.fm?.status === '已归档'));
            if (activeProjects.length === 0) {
                this.renderEmptyState(wrapper, 'active');
            } else {
                activeProjects.sort((a, b) => {
                    const priorityWeight = { '紧急': 4, '高': 3, '中': 2, '低': 1 };
                    return (priorityWeight[b.fm?.priority] || 0) - (priorityWeight[a.fm?.priority] || 0);
                });
                for (const { file, fm } of activeProjects) {
                    try {
                        await this.renderProjectSection(wrapper, file, fm, false);
                    } catch (e) {
                        console.error('Error rendering project:', file.path, e);
                    }
                }
            }
        } else if (this.activeTab === 'archive') {
            const stats = this.calculateArchiveStats(projects.filter(p => p.fm?.archived === true || p.fm?.status === '已归档'));
            this.renderStatsBoard(wrapper, stats, 'archive');
            const archivedProjects = projects.filter(p => p.fm?.archived === true || p.fm?.status === '已归档');
            if (archivedProjects.length === 0) {
                this.renderEmptyState(wrapper, 'archive');
            } else {
                await this.renderArchiveSection(wrapper, archivedProjects);
            }
        }
    }
    
    // ========== 热力图（支持月度/年度切换） ==========
    async renderHeatmapWithMode(parent) {
        const section = parent.createDiv({ 
            cls: 'monthly-heatmap-section',
            attr: { style: 'background:var(--background-secondary); border-radius:16px; overflow:hidden;' }
        });
        
        // 头部
        const header = section.createDiv({ 
            cls: 'heatmap-header',
            attr: { style: 'padding:16px 20px; background:var(--background-primary); border-bottom:1px solid var(--background-modifier-border); display:flex; align-items:center; gap:12px; cursor:pointer;' }
        });
        header.onclick = (e) => {
            if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
            this.expandedHeatmap = !this.expandedHeatmap;
            this.render();
        };
        
        header.createSpan({ text: this.expandedHeatmap ? '▼' : '▶', attr: { style: 'font-size:12px; color:var(--text-muted); width:16px;' } });
        
        // 视图切换按钮
        const viewToggle = header.createDiv({ attr: { style: 'display:flex; gap:4px; margin-right:8px;' } });
        
        const monthViewBtn = viewToggle.createEl('button', { 
            text: '📅 月度', 
            cls: `heatmap-view-btn ${this.heatmapViewMode === 'month' ? 'active' : ''}`,
            attr: { style: 'padding:4px 8px; border-radius:4px; border:1px solid var(--background-modifier-border); background:var(--background-secondary); cursor:pointer;' }
        });
        monthViewBtn.onclick = (e) => {
            e.stopPropagation();
            this.heatmapViewMode = 'month';
            this.render();
        };
        
        const yearViewBtn = viewToggle.createEl('button', { 
            text: '📊 年度', 
            cls: `heatmap-view-btn ${this.heatmapViewMode === 'year' ? 'active' : ''}`,
            attr: { style: 'padding:4px 8px; border-radius:4px; border:1px solid var(--background-modifier-border); background:var(--background-secondary); cursor:pointer;' }
        });
        yearViewBtn.onclick = (e) => {
            e.stopPropagation();
            this.heatmapViewMode = 'year';
            this.render();
        };
        
        if (this.heatmapViewMode === 'month') {
            // 月份选择器
            const monthSelector = header.createDiv({ attr: { style: 'display:flex; align-items:center; gap:8px;' } });
            
            const prevMonth = monthSelector.createEl('button', { 
                text: '←', 
                cls: 'month-nav-btn', 
                attr: { style: 'padding:4px 8px; border-radius:4px; border:1px solid var(--background-modifier-border); background:var(--background-secondary); cursor:pointer;' } 
            });
            
            const monthDisplay = monthSelector.createSpan({ 
                text: `${this.heatmapYear}年 ${this.heatmapMonth}月`, 
                attr: { style: 'font-weight:600; min-width:100px; text-align:center;' } 
            });
            
            const nextMonth = monthSelector.createEl('button', { 
                text: '→', 
                cls: 'month-nav-btn', 
                attr: { style: 'padding:4px 8px; border-radius:4px; border:1px solid var(--background-modifier-border); background:var(--background-secondary); cursor:pointer;' } 
            });
            
            prevMonth.onclick = (e) => {
                e.stopPropagation();
                if (this.heatmapMonth === 1) {
                    this.heatmapMonth = 12;
                    this.heatmapYear--;
                } else {
                    this.heatmapMonth--;
                }
                this.render();
            };
            
            nextMonth.onclick = (e) => {
                e.stopPropagation();
                if (this.heatmapMonth === 12) {
                    this.heatmapMonth = 1;
                    this.heatmapYear++;
                } else {
                    this.heatmapMonth++;
                }
                this.render();
            };
        } else {
            // 年份选择器
            const yearSelector = header.createDiv({ attr: { style: 'display:flex; align-items:center; gap:8px;' } });
            
            const prevYear = yearSelector.createEl('button', { 
                text: '←', 
                cls: 'year-nav-btn', 
                attr: { style: 'padding:4px 8px; border-radius:4px; border:1px solid var(--background-modifier-border); background:var(--background-secondary); cursor:pointer;' } 
            });
            
            const yearDisplay = yearSelector.createSpan({ 
                text: `${this.heatmapYearView}年`, 
                attr: { style: 'font-weight:600; min-width:80px; text-align:center;' } 
            });
            
            const nextYear = yearSelector.createEl('button', { 
                text: '→', 
                cls: 'year-nav-btn', 
                attr: { style: 'padding:4px 8px; border-radius:4px; border:1px solid var(--background-modifier-border); background:var(--background-secondary); cursor:pointer;' } 
            });
            
            prevYear.onclick = (e) => {
                e.stopPropagation();
                this.heatmapYearView--;
                this.render();
            };
            
            nextYear.onclick = (e) => {
                e.stopPropagation();
                this.heatmapYearView++;
                this.render();
            };
        }
        
        header.createEl('h3', { text: this.heatmapViewMode === 'month' ? '📅 月度活动热力图' : '📊 年度活动总览', attr: { style: 'margin:0; font-size:1.2rem; flex:1;' } });
        
        // 导出按钮
        const exportBtn = header.createEl('button', { 
            text: '📥 导出报告',
            cls: 'v6-btn primary',
            attr: { style: 'padding:6px 12px; font-size:0.9rem;' }
        });
        exportBtn.onclick = async (e) => {
            e.stopPropagation();
            if (this.heatmapViewMode === 'month') {
                await this.exportMonthlyReport();
            } else {
                await this.exportYearlyReport();
            }
        };
        
        if (!this.expandedHeatmap) return;
        
        const content = section.createDiv({ attr: { style: 'padding:20px;' } });
        
        if (this.heatmapViewMode === 'month') {
            await this.renderMonthlyHeatmapContent(content);
        } else {
            await this.renderYearlyHeatmapContent(content);
        }
    }
    
    async renderMonthlyHeatmapContent(parent) {
        // 获取月份数据
        const monthData = await this.generateMonthlyHeatmap(this.heatmapYear, this.heatmapMonth);
        
        // 获取上月数据用于环比
        let prevMonthYear = this.heatmapYear;
        let prevMonth = this.heatmapMonth - 1;
        if (prevMonth === 0) {
            prevMonth = 12;
            prevMonthYear--;
        }
        const prevMonthData = await this.generateMonthlyHeatmap(prevMonthYear, prevMonth);
        
        // 环比计算
        const momChange = prevMonthData.totalEdits === 0 ? 100 : 
            Math.round((monthData.totalEdits - prevMonthData.totalEdits) / prevMonthData.totalEdits * 100);
        const momIcon = momChange > 0 ? '📈' : (momChange < 0 ? '📉' : '➡️');
        
        // 月份信息
        const info = parent.createDiv({ attr: { style: 'display:flex; justify-content:space-between; margin-bottom:16px; flex-wrap:wrap; gap:12px;' } });
        
        const statsDiv = info.createDiv({ attr: { style: 'display:flex; gap:20px; flex-wrap:wrap;' } });
        statsDiv.createSpan({ text: `总编辑次数: ${monthData.totalEdits}`, attr: { style: 'font-weight:500;' } });
        statsDiv.createSpan({ text: `活跃天数: ${monthData.activeDays}/${monthData.daysInMonth}`, attr: { style: 'font-weight:500;' } });
        
        // 环比显示
        const momDiv = info.createDiv({ attr: { style: 'display:flex; gap:8px; align-items:center; background:var(--background-primary); padding:4px 12px; border-radius:20px;' } });
        momDiv.createSpan({ text: `环比: ${momIcon} ${Math.abs(momChange)}%`, attr: { style: `font-weight:600; color:${momChange > 0 ? '#6aab8c' : (momChange < 0 ? '#e06c6c' : 'var(--text-muted)')};` } });
        
        // 日历网格
        const grid = parent.createDiv({ 
            cls: 'month-calendar', 
            attr: { style: 'display:grid; grid-template-columns:repeat(7, 1fr); gap:6px; background:var(--background-primary); padding:16px; border-radius:12px;' } 
        });
        
        // 星期标签
        const weekdays = ['一', '二', '三', '四', '五', '六', '日'];
        weekdays.forEach(day => {
            grid.createDiv({ 
                text: day, 
                attr: { style: 'text-align:center; font-size:0.8rem; font-weight:500; color:var(--text-muted); padding:4px;' } 
            });
        });
        
        // 填充空白格（根据当月第一天是周几）
        const firstDay = moment(`${this.heatmapYear}-${this.heatmapMonth}-01`).day();
        const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;
        
        for (let i = 0; i < adjustedFirstDay; i++) {
            grid.createDiv({ attr: { style: 'aspect-ratio:1;' } });
        }
        
        // 填充日期
        for (let day = 1; day <= monthData.daysInMonth; day++) {
            const dateStr = `${this.heatmapYear}-${this.heatmapMonth.toString().padStart(2,'0')}-${day.toString().padStart(2,'0')}`;
            const dayInfo = monthData.days[day];
            
            const cell = grid.createDiv({ 
                cls: `heatmap-cell heatmap-l${dayInfo ? dayInfo.level : 0}`,
                attr: { 
                    style: 'aspect-ratio:1; border-radius:6px; display:flex; align-items:center; justify-content:center; font-size:0.8rem; font-weight:500; cursor:pointer; position:relative;',
                    'data-count': dayInfo ? dayInfo.count : 0,
                    'data-date': dateStr,
                    'data-files': dayInfo ? dayInfo.files.join(', ') : ''
                }
            });
            cell.setText(day.toString());
            
            // 悬浮提示
            cell.addEventListener('mouseenter', (e) => {
                this.showMonthlyTooltip(e, dayInfo, dateStr);
            });
            cell.addEventListener('mouseleave', () => {
                this.hideTooltip();
            });
        }
        
        // 图例
        this.renderHeatmapLegend(parent);
    }
    
    async renderYearlyHeatmapContent(parent) {
        // 获取年度数据
        const yearData = await this.generateYearlyHeatmap(this.heatmapYearView);
        
        // 获取去年数据用于同比
        const prevYearData = await this.generateYearlyHeatmap(this.heatmapYearView - 1);
        
        // 同比计算
        const yoyChange = prevYearData.totalEdits === 0 ? 100 : 
            Math.round((yearData.totalEdits - prevYearData.totalEdits) / prevYearData.totalEdits * 100);
        const yoyIcon = yoyChange > 0 ? '📈' : (yoyChange < 0 ? '📉' : '➡️');
        
        // 年度概览
        const summary = parent.createDiv({ attr: { style: 'display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:20px;' } });
        
        const metrics = [
            { label: '总编辑次数', value: yearData.totalEdits, icon: '✏️' },
            { label: '活跃月份', value: yearData.activeMonths, icon: '📅' },
            { label: '最活跃月份', value: yearData.maxMonth, icon: '🔥' },
            { label: '平均月编辑', value: Math.round(yearData.totalEdits / 12), icon: '📊' }
        ];
        
        metrics.forEach(m => {
            const card = summary.createDiv({ attr: { style: 'background:var(--background-primary); padding:12px; border-radius:8px; text-align:center;' } });
            card.createDiv({ text: m.icon, attr: { style: 'font-size:1.2rem; margin-bottom:4px;' } });
            card.createDiv({ text: m.value.toString(), attr: { style: 'font-size:1.4rem; font-weight:600;' } });
            card.createDiv({ text: m.label, attr: { style: 'font-size:0.7rem; color:var(--text-muted);' } });
        });
        
        // 同比显示
        const yoyDiv = parent.createDiv({ attr: { style: 'display:flex; gap:8px; align-items:center; background:var(--background-primary); padding:8px 16px; border-radius:20px; margin-bottom:20px; justify-content:center;' } });
        yoyDiv.createSpan({ text: `同比去年: ${yoyIcon} ${Math.abs(yoyChange)}%`, attr: { style: `font-weight:600; color:${yoyChange > 0 ? '#6aab8c' : (yoyChange < 0 ? '#e06c6c' : 'var(--text-muted)')};` } });
        
        // 月份热力图（网格）
        const grid = parent.createDiv({ 
            attr: { style: 'display:grid; grid-template-columns:repeat(12, 1fr); gap:4px; background:var(--background-primary); padding:16px; border-radius:12px;' } 
        });
        
        // 月份标签
        const months = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
        months.forEach(month => {
            grid.createDiv({ 
                text: month, 
                attr: { style: 'text-align:center; font-size:0.7rem; font-weight:500; color:var(--text-muted);' } 
            });
        });
        
        // 填充月份数据
        for (let month = 1; month <= 12; month++) {
            const monthInfo = yearData.months[month];
            
            const cell = grid.createDiv({ 
                cls: `year-heatmap-cell heatmap-l${monthInfo ? monthInfo.level : 0}`,
                attr: { 
                    style: 'aspect-ratio:2/1; border-radius:4px; display:flex; align-items:center; justify-content:center; font-size:0.8rem; font-weight:500; cursor:pointer;',
                    'data-count': monthInfo ? monthInfo.count : 0,
                    'data-month': month
                }
            });
            cell.setText(monthInfo ? monthInfo.count.toString() : '0');
            
            // 悬浮提示
            cell.addEventListener('mouseenter', (e) => {
                this.showYearlyTooltip(e, monthInfo, month);
            });
            cell.addEventListener('mouseleave', () => {
                this.hideTooltip();
            });
            
            // 点击切换到该月视图
            cell.onclick = (e) => {
                e.stopPropagation();
                this.heatmapViewMode = 'month';
                this.heatmapYear = this.heatmapYearView;
                this.heatmapMonth = month;
                this.render();
            };
        }
        
        // 月度详情列表
        const details = parent.createDiv({ attr: { style: 'margin-top:20px;' } });
        details.createEl('h4', { text: '📊 月度详情', attr: { style: 'margin:0 0 8px 0; font-size:1rem;' } });
        
        const list = details.createDiv({ attr: { style: 'display:grid; grid-template-columns:repeat(2,1fr); gap:8px;' } });
        for (let month = 1; month <= 12; month++) {
            const monthInfo = yearData.months[month];
            if (monthInfo && monthInfo.count > 0) {
                const item = list.createDiv({ attr: { style: 'background:var(--background-primary); padding:6px 10px; border-radius:4px; display:flex; justify-content:space-between;' } });
                item.createSpan({ text: `${month}月` });
                item.createSpan({ text: `${monthInfo.count}次`, attr: { style: 'font-weight:500;' } });
            }
        }
        
        // 图例（复用月度图例）
        this.renderHeatmapLegend(parent);
    }
    
    renderHeatmapLegend(parent) {
        const legend = parent.createDiv({ attr: { style: 'display:flex; gap:16px; margin-top:16px; justify-content:flex-end; flex-wrap:wrap;' } });
        const levels = [
            { level: 0, label: '无活动', color: 'var(--background-modifier-border)' },
            { level: 1, label: '1-2次', color: '#9be9a8' },
            { level: 2, label: '3-5次', color: '#40c463' },
            { level: 3, label: '6-8次', color: '#30a14e' },
            { level: 4, label: '9+次', color: '#216e39' }
        ];
        levels.forEach(lvl => {
            const item = legend.createDiv({ attr: { style: 'display:flex; align-items:center; gap:4px;' } });
            item.createDiv({ attr: { style: `width:16px; height:16px; border-radius:4px; background:${lvl.color};` } });
            item.createSpan({ text: lvl.label, attr: { style: 'font-size:0.8rem;' } });
        });
    }
    
    async generateMonthlyHeatmap(year, month) {
        const daysInMonth = moment(`${year}-${month}-01`, 'YYYY-MM-DD').daysInMonth();
        const days = {};
        let totalEdits = 0;
        let activeDays = 0;
        
        // 初始化每天
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${month.toString().padStart(2,'0')}-${day.toString().padStart(2,'0')}`;
            days[day] = {
                date: dateStr,
                count: 0,
                files: [],
                level: 0
            };
        }
        
        // 统计所有文件的修改记录
        const files = this.app.vault.getMarkdownFiles();
        for (const file of files) {
            try {
                const mtime = file.stat.mtime;
                const modDate = moment(mtime);
                
                if (modDate.year() === year && modDate.month() + 1 === month) {
                    const day = modDate.date();
                    
                    if (days[day]) {
                        days[day].count++;
                        totalEdits++;
                        
                        if (!days[day].files.includes(file.name)) {
                            days[day].files.push(file.name);
                        }
                    }
                }
            } catch (e) {
                console.error('Error processing file stats:', file.path, e);
            }
        }
        
        // 计算等级和活跃天数
        Object.values(days).forEach(day => {
            if (day.count === 0) {
                day.level = 0;
            } else {
                activeDays++;
                if (day.count <= 2) day.level = 1;
                else if (day.count <= 5) day.level = 2;
                else if (day.count <= 8) day.level = 3;
                else day.level = 4;
            }
        });
        
        return {
            days,
            daysInMonth,
            totalEdits,
            activeDays,
            year,
            month
        };
    }
    
    async generateYearlyHeatmap(year) {
        const months = {};
        let totalEdits = 0;
        let activeMonths = 0;
        let maxMonth = 1;
        let maxCount = 0;
        
        // 初始化每个月
        for (let month = 1; month <= 12; month++) {
            months[month] = {
                month,
                count: 0,
                files: [],
                level: 0
            };
        }
        
        // 统计所有文件的修改记录
        const files = this.app.vault.getMarkdownFiles();
        for (const file of files) {
            try {
                const mtime = file.stat.mtime;
                const modDate = moment(mtime);
                
                if (modDate.year() === year) {
                    const month = modDate.month() + 1;
                    
                    months[month].count++;
                    totalEdits++;
                    
                    if (!months[month].files.includes(file.name)) {
                        months[month].files.push(file.name);
                    }
                }
            } catch (e) {
                console.error('Error processing file stats:', file.path, e);
            }
        }
        
        // 计算等级和找到最活跃月份
        Object.values(months).forEach(month => {
            if (month.count === 0) {
                month.level = 0;
            } else {
                activeMonths++;
                if (month.count <= 10) month.level = 1;
                else if (month.count <= 30) month.level = 2;
                else if (month.count <= 60) month.level = 3;
                else month.level = 4;
                
                if (month.count > maxCount) {
                    maxCount = month.count;
                    maxMonth = month.month;
                }
            }
        });
        
        return {
            months,
            totalEdits,
            activeMonths,
            maxMonth: maxMonth + '月',
            year
        };
    }
    
    showMonthlyTooltip(event, dayInfo, dateStr) {
        try {
            let tooltip = document.getElementById('heatmap-tooltip-v14');
            if (!tooltip) {
                tooltip = document.createElement('div');
                tooltip.id = 'heatmap-tooltip-v14';
                tooltip.style.position = 'absolute';
                tooltip.style.background = 'var(--background-primary)';
                tooltip.style.border = '1px solid var(--background-modifier-border)';
                tooltip.style.borderRadius = '8px';
                tooltip.style.padding = '8px 12px';
                tooltip.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                tooltip.style.pointerEvents = 'none';
                tooltip.style.zIndex = '1000';
                tooltip.style.fontSize = '0.8rem';
                tooltip.style.maxWidth = '300px';
                document.body.appendChild(tooltip);
            }
            
            if (!dayInfo || dayInfo.count === 0) {
                tooltip.innerHTML = `<strong>${dateStr}</strong><br>无编辑记录`;
            } else {
                let filesHtml = dayInfo.files.slice(0,5).map(f => `📄 ${f}`).join('<br>');
                if (dayInfo.files.length > 5) filesHtml += `<br>...等${dayInfo.files.length}个文件`;
                
                tooltip.innerHTML = `
                    <strong>${dateStr}</strong><br>
                    编辑次数: ${dayInfo.count}<br>
                    ${filesHtml}
                `;
            }
            
            const rect = event.target.getBoundingClientRect();
            tooltip.style.left = (rect.left + window.scrollX + 20) + 'px';
            tooltip.style.top = (rect.top + window.scrollY - 40) + 'px';
            tooltip.style.display = 'block';
        } catch (e) {
            console.error('Error showing tooltip:', e);
        }
    }
    
    showYearlyTooltip(event, monthInfo, month) {
        try {
            let tooltip = document.getElementById('heatmap-tooltip-v14');
            if (!tooltip) {
                tooltip = document.createElement('div');
                tooltip.id = 'heatmap-tooltip-v14';
                tooltip.style.position = 'absolute';
                tooltip.style.background = 'var(--background-primary)';
                tooltip.style.border = '1px solid var(--background-modifier-border)';
                tooltip.style.borderRadius = '8px';
                tooltip.style.padding = '8px 12px';
                tooltip.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                tooltip.style.pointerEvents = 'none';
                tooltip.style.zIndex = '1000';
                tooltip.style.fontSize = '0.8rem';
                tooltip.style.maxWidth = '300px';
                document.body.appendChild(tooltip);
            }
            
            if (!monthInfo || monthInfo.count === 0) {
                tooltip.innerHTML = `<strong>${month}月</strong><br>无编辑记录<br>点击切换到月度视图`;
            } else {
                let filesHtml = monthInfo.files.slice(0,5).map(f => `📄 ${f}`).join('<br>');
                if (monthInfo.files.length > 5) filesHtml += `<br>...等${monthInfo.files.length}个文件`;
                
                tooltip.innerHTML = `
                    <strong>${month}月</strong><br>
                    编辑次数: ${monthInfo.count}<br>
                    ${filesHtml}<br>
                    <span style="color:var(--text-muted); font-size:0.7rem;">点击查看月度详情</span>
                `;
            }
            
            const rect = event.target.getBoundingClientRect();
            tooltip.style.left = (rect.left + window.scrollX + 20) + 'px';
            tooltip.style.top = (rect.top + window.scrollY - 40) + 'px';
            tooltip.style.display = 'block';
        } catch (e) {
            console.error('Error showing tooltip:', e);
        }
    }
    
    hideTooltip() {
        const tooltip = document.getElementById('heatmap-tooltip-v14');
        if (tooltip) tooltip.style.display = 'none';
    }
    
    // ========== 月度报告导出 ==========
    async exportMonthlyReport() {
        try {
            const folder = "Tracker-Reports";
            if (!(await this.app.vault.adapter.exists(folder))) {
                await this.app.vault.createFolder(folder);
            }
            
            const fileName = `${folder}/月度报告-${this.heatmapYear}年${this.heatmapMonth}月.md`;
            
            // 获取月度数据
            const monthData = await this.generateMonthlyHeatmap(this.heatmapYear, this.heatmapMonth);
            
            // 获取上月数据用于环比
            let prevMonthYear = this.heatmapYear;
            let prevMonth = this.heatmapMonth - 1;
            if (prevMonth === 0) {
                prevMonth = 12;
                prevMonthYear--;
            }
            const prevMonthData = await this.generateMonthlyHeatmap(prevMonthYear, prevMonth);
            
            // 获取月度统计
            const stats = await this.calculateMonthlyStats(this.heatmapYear, this.heatmapMonth);
            
            // 环比计算
            const momChange = prevMonthData.totalEdits === 0 ? 100 : 
                Math.round((monthData.totalEdits - prevMonthData.totalEdits) / prevMonthData.totalEdits * 100);
            
            // 生成报告
            let report = `# 📊 月度报告 ${this.heatmapYear}年${this.heatmapMonth}月\n\n`;
            
            // 月度概览
            report += `## 📈 月度概览\n\n`;
            report += `| 统计项 | 数值 | 环比 |\n`;
            report += `|--------|------|------|\n`;
            report += `| 总编辑次数 | ${monthData.totalEdits} | ${momChange > 0 ? '+' : ''}${momChange}% |\n`;
            report += `| 活跃天数 | ${monthData.activeDays}/${monthData.daysInMonth} | -\n`;
            report += `| 完成任务 | ${stats.completedTasks} | -\n`;
            report += `| 习惯完成率 | ${stats.habitRate}% | -\n\n`;
            
            // 每日详情
            report += `## 📅 每日详情\n\n`;
            report += `| 日期 | 编辑次数 | 编辑文件 |\n`;
            report += `|------|----------|----------|\n`;
            
            for (let day = 1; day <= monthData.daysInMonth; day++) {
                const dayInfo = monthData.days[day];
                if (dayInfo && dayInfo.count > 0) {
                    const fileList = dayInfo.files.slice(0,3).join(', ') + (dayInfo.files.length > 3 ? '...' : '');
                    report += `| ${dayInfo.date} | ${dayInfo.count} | ${fileList} |\n`;
                }
            }
            
            report += `\n`;
            
            // 习惯统计
            if (stats.habits.length > 0) {
                report += `## ❤️ 习惯月度总结\n\n`;
                stats.habits.forEach(habit => {
                    report += `### ${habit.name}\n\n`;
                    report += `- 完成次数：${habit.completed}/${habit.total}\n`;
                    report += `- 完成率：${habit.rate}%\n`;
                    report += `- 当前连续：${habit.currentStreak}天\n\n`;
                });
            }
            
            // 月度总结
            report += `## 📝 月度总结\n\n`;
            report += `> [!note]- 月度评价\n`;
            report += `> \n`;
            report += `> **本月亮点**：\n`;
            report += `> - \n`;
            report += `> \n`;
            report += `> **待改进**：\n`;
            report += `> - \n`;
            report += `> \n`;
            report += `> **下月计划**：\n`;
            report += `> - \n`;
            report += `> \n`;
            report += `> **备注**：\n`;
            report += `> \n\n`;
            
            report += `---\n`;
            report += `*报告生成时间：${moment().format('YYYY-MM-DD HH:mm:ss')}*\n`;
            
            await this.app.vault.create(fileName, report);
            new Notice(`📊 月度报告已生成在 ${folder} 文件夹`);
            
            // 打开报告
            const file = this.app.vault.getAbstractFileByPath(fileName);
            if (file) {
                this.app.workspace.getLeaf().openFile(file);
            }
        } catch (e) {
            console.error('Error exporting report:', e);
            new Notice('导出报告失败: ' + e.message);
        }
    }
    
    async exportYearlyReport() {
        try {
            const folder = "Tracker-Reports";
            if (!(await this.app.vault.adapter.exists(folder))) {
                await this.app.vault.createFolder(folder);
            }
            
            const fileName = `${folder}/年度报告-${this.heatmapYearView}年.md`;
            
            // 获取年度数据
            const yearData = await this.generateYearlyHeatmap(this.heatmapYearView);
            
            // 获取去年数据用于同比
            const prevYearData = await this.generateYearlyHeatmap(this.heatmapYearView - 1);
            
            // 同比计算
            const yoyChange = prevYearData.totalEdits === 0 ? 100 : 
                Math.round((yearData.totalEdits - prevYearData.totalEdits) / prevYearData.totalEdits * 100);
            
            // 生成报告
            let report = `# 📊 年度报告 ${this.heatmapYearView}年\n\n`;
            
            // 年度概览
            report += `## 📈 年度概览\n\n`;
            report += `| 统计项 | 数值 | 同比 |\n`;
            report += `|--------|------|------|\n`;
            report += `| 总编辑次数 | ${yearData.totalEdits} | ${yoyChange > 0 ? '+' : ''}${yoyChange}% |\n`;
            report += `| 活跃月份 | ${yearData.activeMonths}/12 | -\n`;
            report += `| 最活跃月份 | ${yearData.maxMonth} | -\n`;
            report += `| 平均月编辑 | ${Math.round(yearData.totalEdits / 12)}次 | -\n\n`;
            
            // 月度详情
            report += `## 📅 月度详情\n\n`;
            report += `| 月份 | 编辑次数 | 活跃度 |\n`;
            report += `|------|----------|--------|\n`;
            
            for (let month = 1; month <= 12; month++) {
                const monthInfo = yearData.months[month];
                const levelEmoji = monthInfo.level === 0 ? '⬜' : 
                                   monthInfo.level === 1 ? '🟩' :
                                   monthInfo.level === 2 ? '🟨' :
                                   monthInfo.level === 3 ? '🟧' : '🟥';
                report += `| ${month}月 | ${monthInfo.count}次 | ${levelEmoji} |\n`;
            }
            
            report += `\n`;
            
            report += `---\n`;
            report += `*报告生成时间：${moment().format('YYYY-MM-DD HH:mm:ss')}*\n`;
            
            await this.app.vault.create(fileName, report);
            new Notice(`📊 年度报告已生成在 ${folder} 文件夹`);
            
            // 打开报告
            const file = this.app.vault.getAbstractFileByPath(fileName);
            if (file) {
                this.app.workspace.getLeaf().openFile(file);
            }
        } catch (e) {
            console.error('Error exporting report:', e);
            new Notice('导出报告失败: ' + e.message);
        }
    }
    
    async calculateMonthlyStats(year, month) {
        const files = this.app.vault.getMarkdownFiles();
        let completedTasks = 0;
        let habitStats = [];
        
        for (const file of files) {
            try {
                const content = await this.app.vault.read(file);
                
                // 统计任务
                const taskMatches = content.match(/- \[x\]/g);
                if (taskMatches) {
                    const mtime = file.stat.mtime;
                    const modDate = moment(mtime);
                    if (modDate.year() === year && modDate.month() + 1 === month) {
                        completedTasks += taskMatches.length;
                    }
                }
                
                // 统计习惯
                const cache = this.app.metadataCache.getFileCache(file);
                if (cache?.frontmatter?.type === 'habit') {
                    const habitStat = await this.calculateHabitMonthlyStats(file, year, month);
                    if (habitStat) habitStats.push(habitStat);
                }
            } catch (e) {
                console.error('Error calculating stats for file:', file.path, e);
            }
        }
        
        // 计算习惯完成率
        let totalHabitRate = 0;
        if (habitStats.length > 0) {
            habitStats.forEach(h => {
                totalHabitRate += h.rate;
            });
            totalHabitRate = Math.round(totalHabitRate / habitStats.length);
        }
        
        return {
            completedTasks,
            habitRate: totalHabitRate,
            habits: habitStats
        };
    }
    
    async calculateHabitMonthlyStats(file, year, month) {
        try {
            const content = await this.app.vault.read(file);
            const cache = this.app.metadataCache.getFileCache(file);
            const fm = cache?.frontmatter;
            
            if (!fm) return null;
            
            const daysInMonth = moment(`${year}-${month}-01`).daysInMonth();
            let completed = 0;
            let currentStreak = 0;
            let lastDate = null;
            
            for (let day = 1; day <= daysInMonth; day++) {
                const date = `${year}-${month.toString().padStart(2,'0')}-${day.toString().padStart(2,'0')}`;
                const pattern = new RegExp(`日期：${date}[\\s\\S]*?状态：([✅⬜])`);
                const match = content.match(pattern);
                const isCompleted = match ? match[1] === '✅' : false;
                
                if (isCompleted) {
                    completed++;
                    
                    if (lastDate && moment(date).diff(moment(lastDate), 'days') === 1) {
                        currentStreak++;
                    } else {
                        currentStreak = 1;
                    }
                    lastDate = date;
                }
            }
            
            const rate = Math.round(completed / daysInMonth * 100);
            
            return {
                name: fm.name,
                completed,
                total: daysInMonth,
                rate,
                currentStreak
            };
        } catch (e) {
            console.error('Error calculating habit stats:', e);
            return null;
        }
    }
    
    // ========== 习惯追踪区域（修复版） ==========
    async renderHabitSection(parent) {
        try {
            const habitSection = parent.createDiv({ cls: 'habit-section-v14' });
            
            // 头部 - 折叠控制
            const header = habitSection.createDiv({ 
                cls: 'habit-header',
                attr: { style: 'display:flex; align-items:center; gap:12px; margin-bottom:16px; cursor:pointer;' }
            });
            
            header.onclick = (e) => {
                // 如果点击的是按钮，不触发折叠
                if (e.target.tagName === 'BUTTON') return;
                this.expandedHabits = !this.expandedHabits;
                this.render();
            };
            
            header.createSpan({ 
                text: this.expandedHabits ? '▼' : '▶', 
                attr: { style: 'width:16px; font-size:12px; color:var(--text-muted);' } 
            });
            
            header.createEl('h2', { text: '❤️ 习惯追踪', attr: { style: 'margin:0; flex:1; font-size:1.3rem;' } });
            
            // 新建习惯按钮
            const addHabitBtn = header.createEl('button', { 
                text: '➕ 新建习惯',
                cls: 'v6-btn primary',
                attr: { style: 'padding:6px 12px; cursor:pointer; z-index:10;' }
            });
            addHabitBtn.onclick = (e) => {
                e.stopPropagation();
                this.plugin.createNewHabit();
            };
            
            if (!this.expandedHabits) return;
            
            // 获取所有习惯文件
            const files = this.app.vault.getMarkdownFiles();
            const habits = [];
            for (const file of files) {
                try {
                    const cache = this.app.metadataCache.getFileCache(file);
                    const fm = cache?.frontmatter;
                    if (fm?.type === 'habit' && fm.status === 'active') {
                        habits.push({ file, fm, cache });
                    }
                } catch (e) {
                    console.error('Error processing habit file:', file.path, e);
                }
            }
            
            // 空状态处理（使用和活跃区一样的样式）
            if (habits.length === 0) {
                const emptyContainer = habitSection.createDiv({ 
                    cls: 'habit-empty-container',
                    attr: { style: 'margin-top:10px;' }
                });
                
                const emptyDiv = emptyContainer.createDiv({ 
                    cls: 'empty-state-habit',
                    attr: { style: 'text-align:center; padding:60px 20px; background:var(--background-secondary); border-radius:16px; border:2px dashed var(--background-modifier-border);' }
                });
                emptyDiv.createEl('h2', { text: '❤️ 还没有习惯追踪', attr: { style: 'margin:0 0 8px; font-weight:500;' } });
                emptyDiv.createEl('p', { text: '点击上方"新建习惯"按钮开始创建', attr: { style: 'color:var(--text-muted); margin-bottom:16px;' } });
                
                const emptyBtn = emptyDiv.createEl('button', { 
                    text: '➕ 创建第一个习惯',
                    cls: 'v6-btn primary',
                    attr: { style: 'padding:8px 16px;' }
                });
                emptyBtn.onclick = () => this.plugin.createNewHabit();
                
                return;
            }
            
            // 按分类分组
            const categories = {};
            habits.forEach(habit => {
                const cat = habit.fm.category || '其他';
                if (!categories[cat]) categories[cat] = [];
                categories[cat].push(habit);
            });
            
            // 渲染每个分类
            for (const [category, catHabits] of Object.entries(categories)) {
                const catDiv = habitSection.createDiv({ cls: 'habit-category', attr: { style: 'margin-bottom:24px;' } });
                catDiv.createEl('h3', { 
                    text: category,
                    attr: { style: 'margin:0 0 12px 0; padding-bottom:4px; border-bottom:1px solid var(--background-modifier-border);' }
                });
                
                const grid = catDiv.createDiv({ 
                    cls: 'habit-grid',
                    attr: { style: 'display:grid; grid-template-columns:repeat(auto-fill, minmax(300px, 1fr)); gap:16px;' }
                });
                
                for (const habit of catHabits) {
                    try {
                        await this.renderHabitCard(grid, habit);
                    } catch (e) {
                        console.error('Error rendering habit card:', e);
                    }
                }
            }
        } catch (e) {
            console.error('Error in renderHabitSection:', e);
            // 即使出错也显示一个基本的生活区
            const errorDiv = parent.createDiv({ 
                cls: 'error-message',
                attr: { style: 'padding:20px; background:var(--background-modifier-error); color:var(--text-error); border-radius:8px; margin:20px 0;' }
            });
            errorDiv.setText('加载习惯数据时出现错误');
            
            // 同时显示一个新建按钮
            const retryBtn = errorDiv.createEl('button', { 
                text: '🔄 重试',
                cls: 'v6-btn',
                attr: { style: 'margin-top:12px;' }
            });
            retryBtn.onclick = () => this.render();
        }
    }
    
    async renderHabitCard(parent, habit) {
        try {
            const { file, fm } = habit;
            
            // 获取今日状态
            const today = moment().format('YYYY-MM-DD');
            const todayStatus = await this.getHabitStatus(file, today);
            
            // 计算连续完成天数
            const streak = await this.calculateHabitStreak(file);
            
            // 计算本月完成率
            const monthStats = await this.calculateMonthStats(file);
            
            const card = parent.createDiv({ 
                cls: 'habit-card-v14',
                attr: { 
                    style: `
                        background: var(--background-primary);
                        border: 1px solid var(--background-modifier-border);
                        border-radius: 16px;
                        padding: 16px;
                        border-left: 4px solid ${fm.color || '#ff6b6b'};
                    `
                }
            });
            
            // 头部
            const header = card.createDiv({ attr: { style: 'display:flex; align-items:center; gap:8px; margin-bottom:12px;' } });
            header.createSpan({ text: fm.icon || '❤️', attr: { style: 'font-size:1.5rem;' } });
            header.createEl('h4', { text: fm.name, attr: { style: 'margin:0; flex:1; font-size:1.1rem;' } });
            
            // 频率标签
            header.createSpan({ 
                text: fm.frequency || '每日',
                attr: { style: 'padding:2px 8px; background:var(--background-secondary); border-radius:12px; font-size:0.7rem;' }
            });
            
            // 今日状态
            const statusDiv = card.createDiv({ attr: { style: 'display:flex; align-items:center; gap:12px; margin-bottom:12px;' } });
            
            const todayBtn = statusDiv.createEl('button', { 
                cls: `habit-today-btn ${todayStatus ? 'completed' : ''}`,
                attr: { style: 'flex:1; padding:8px; border-radius:8px; border:none; cursor:pointer; background:' + (todayStatus ? '#6aab8c' : 'var(--background-secondary)') + '; color:' + (todayStatus ? 'white' : 'var(--text-normal)') + ';' }
            });
            todayBtn.setText(todayStatus ? '✅ 今日已完成' : '⬜ 点击完成今日');
            todayBtn.onclick = async () => {
                await this.toggleHabitStatus(file, today);
                this.render();
            };
            
            // 连续天数
            const streakDiv = statusDiv.createDiv({ 
                cls: 'habit-streak',
                attr: { style: 'text-align:center; padding:4px 8px; background:var(--background-secondary); border-radius:8px;' }
            });
            streakDiv.createDiv({ text: '🔥', attr: { style: 'font-size:1rem;' } });
            streakDiv.createDiv({ text: streak.toString(), attr: { style: 'font-weight:600;' } });
            
            // 进度条
            const progressDiv = card.createDiv({ attr: { style: 'margin-bottom:12px;' } });
            const progressLabel = progressDiv.createDiv({ attr: { style: 'display:flex; justify-content:space-between; margin-bottom:4px;' } });
            progressLabel.createSpan({ text: '本月进度', attr: { style: 'font-size:0.8rem;' } });
            progressLabel.createSpan({ text: `${monthStats.completed}/${monthStats.total} (${monthStats.rate}%)`, attr: { style: 'font-size:0.8rem;' } });
            
            const progressBar = progressDiv.createDiv({ attr: { style: 'height:6px; background:var(--background-modifier-border); border-radius:3px; overflow:hidden;' } });
            progressBar.createDiv({ attr: { style: `width:${monthStats.rate}%; height:100%; background:${fm.color || '#ff6b6b'}; border-radius:3px;` } });
            
            // 历史记录
            const history = card.createDiv({ cls: 'habit-history', attr: { style: 'display:flex; gap:4px; flex-wrap:wrap; margin-top:8px;' } });
            
            // 显示最近7天状态
            for (let i = 6; i >= 0; i--) {
                const date = moment().subtract(i, 'days').format('YYYY-MM-DD');
                const status = await this.getHabitStatus(file, date);
                const dayEl = history.createDiv({ 
                    cls: `history-day ${status ? 'completed' : ''}`,
                    attr: { 
                        style: `
                            width:28px; height:28px; border-radius:6px; 
                            background: ${status ? (fm.color || '#ff6b6b') : 'var(--background-modifier-border)'};
                            display:flex; align-items:center; justify-content:center;
                            font-size:0.7rem; color:${status ? 'white' : 'var(--text-muted)'};
                            cursor:pointer;
                        `,
                        title: `${date}: ${status ? '已完成' : '未完成'}`
                    }
                });
                dayEl.setText(moment(date).format('D'));
            }
            
            // 详细记录按钮
            const detailBtn = card.createEl('button', { 
                text: '📊 查看详细记录',
                cls: 'v6-btn',
                attr: { style: 'width:100%; margin-top:12px;' }
            });
            detailBtn.onclick = () => this.app.workspace.getLeaf().openFile(file);
        } catch (e) {
            console.error('Error rendering habit card:', e);
        }
    }
    
    async getHabitStatus(file, date) {
        try {
            const content = await this.app.vault.read(file);
            const pattern = new RegExp(`日期：${date}[\\s\\S]*?状态：([✅⬜])`);
            const match = content.match(pattern);
            return match ? match[1] === '✅' : false;
        } catch (e) {
            console.error('Error getting habit status:', e);
            return false;
        }
    }
    
    async toggleHabitStatus(file, date) {
        try {
            const content = await this.app.vault.read(file);
            const currentStatus = await this.getHabitStatus(file, date);
            const newStatus = !currentStatus;
            
            const recordLine = `日期：${date}\n状态：${newStatus ? '✅' : '⬜'} 完成\n`;
            
            // 查找是否已有记录
            const pattern = new RegExp(`日期：${date}[\\s\\S]*?状态：[✅⬜][\\s\\S]*?\\n`);
            if (content.match(pattern)) {
                // 更新现有记录
                const updated = content.replace(pattern, recordLine);
                await this.app.vault.modify(file, updated);
            } else {
                // 添加新记录
                const updated = content + `\n> [!habit]- 记录\n> ${recordLine.replace(/\n/g, '\n> ')}`;
                await this.app.vault.modify(file, updated);
            }
            
            new Notice(`习惯已标记为${newStatus ? '完成' : '未完成'}`);
        } catch (e) {
            console.error('Error toggling habit status:', e);
            new Notice('更新习惯状态失败');
        }
    }
    
    async calculateHabitStreak(file) {
        try {
            let streak = 0;
            let currentDate = moment();
            
            while (true) {
                const date = currentDate.format('YYYY-MM-DD');
                const status = await this.getHabitStatus(file, date);
                if (!status) break;
                streak++;
                currentDate.subtract(1, 'days');
            }
            
            return streak;
        } catch (e) {
            console.error('Error calculating habit streak:', e);
            return 0;
        }
    }
    
    async calculateMonthStats(file) {
        try {
            const now = moment();
            const daysInMonth = now.daysInMonth();
            let completed = 0;
            
            for (let i = 1; i <= daysInMonth; i++) {
                const date = now.date(i).format('YYYY-MM-DD');
                const status = await this.getHabitStatus(file, date);
                if (status) completed++;
            }
            
            return {
                total: daysInMonth,
                completed,
                rate: Math.round(completed / daysInMonth * 100)
            };
        } catch (e) {
            console.error('Error calculating month stats:', e);
            return { total: 0, completed: 0, rate: 0 };
        }
    }
    
    // ========== 选项卡 ==========
    async renderTabBar(parent) {
        const tabBar = parent.createDiv({ cls: 'v14-tab-bar', attr: { style: 'display:flex; gap:4px; margin-bottom:20px; border-bottom:1px solid var(--background-modifier-border); padding-bottom:8px;' } });
        
        const tabs = [
            { id: 'habit', label: '❤️ 生活区', icon: 'heart' },
            { id: 'recent', label: '🕒 最近', icon: 'history' },
            { id: 'active', label: '📌 活跃', icon: 'rocket' },
            { id: 'archive', label: '📦 归档', icon: 'archive' }
        ];
        
        tabs.forEach(tab => {
            const tabBtn = tabBar.createEl('button', {
                text: tab.label,
                cls: `v14-tab-btn ${this.activeTab === tab.id ? 'active' : ''}`,
                attr: { style: 'padding:6px 16px; border-radius:20px; border:none; background:transparent; cursor:pointer; font-size:0.9rem; transition:0.15s;' }
            });
            tabBtn.onclick = () => {
                this.activeTab = tab.id;
                this.render();
            };
        });
    }
    
    // ========== 样式注入 ==========
    injectBaseStyles() {
        const styleId = 'task-tracker-v14-styles';
        if (document.getElementById(styleId)) return;
        
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .task-tracker-container-v14 {
                height: 100%;
                overflow-y: auto;
                background: var(--background-primary);
                color: var(--text-normal);
                font-family: var(--font-interface);
                padding: 0;
            }
            
            .tracker-wrapper {
                max-width: 1200px;
                margin: 0 auto;
                padding: 24px;
            }
            
            .v14-card {
                background: var(--background-primary);
                border: 1px solid var(--background-modifier-border);
                border-radius: 12px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.05);
                transition: all 0.2s ease;
            }
            
            .v14-card:hover {
                box-shadow: 0 8px 16px rgba(0,0,0,0.1);
                border-color: var(--interactive-accent);
            }
            
            .priority-紧急 { border-left: 4px solid #e06c6c !important; }
            .priority-高 { border-left: 4px solid #e6b87e !important; }
            .priority-中 { border-left: 4px solid #6aab8c !important; }
            .priority-低 { border-left: 4px solid #5798b0 !important; }
            
            /* 加大计时器卡片 */
            .timer-digital-card {
                background: var(--background-secondary);
                border-radius: 30px;
                padding: 12px 20px;
                display: flex;
                align-items: center;
                gap: 16px;
                border: 1px solid var(--background-modifier-border);
                box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);
                font-family: var(--font-monospace);
                flex-wrap: wrap;
                min-width: 280px;
            }
            
            .timer-display-new {
                font-size: 1.6rem;
                font-weight: 600;
                background: var(--background-primary);
                padding: 8px 16px;
                border-radius: 40px;
                letter-spacing: 2px;
                border: 1px solid var(--background-modifier-border);
                box-shadow: 0 1px 4px rgba(0,0,0,0.1);
                min-width: 130px;
                text-align: center;
            }
            
            .timer-controls-new {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
            }
            
            .timer-btn-new {
                width: 42px;
                height: 42px;
                border-radius: 50%;
                border: 1px solid var(--background-modifier-border);
                background: var(--background-primary);
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
                transition: 0.15s;
            }
            
            .timer-btn-new:hover {
                background: var(--interactive-accent);
                color: white;
                transform: scale(1.05);
            }
            
            /* 增大任务网格容器 */
            .task-grid-v14 {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(450px, 1fr));
                gap: 20px;
                margin-bottom: 24px;
            }
            
            /* 习惯卡片样式 */
            .habit-card-v14 {
                transition: transform 0.2s;
            }
            
            .habit-card-v14:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 16px rgba(0,0,0,0.1);
            }
            
            .habit-today-btn {
                transition: all 0.2s;
            }
            
            .habit-today-btn:hover {
                filter: brightness(1.1);
            }
            
            .history-day {
                transition: transform 0.2s;
            }
            
            .history-day:hover {
                transform: scale(1.1);
            }
            
            /* 空状态样式（统一） */
            .empty-state-habit {
                text-align: center;
                padding: 60px 20px;
                background: var(--background-secondary);
                border-radius: 16px;
                border: 2px dashed var(--background-modifier-border);
            }
            
            /* 月份热力图 */
            .heatmap-section-bottom {
                margin-top: 30px;
                clear: both;
            }
            
            .heatmap-view-btn.active {
                background: var(--interactive-accent) !important;
                color: var(--text-on-accent) !important;
            }
            
            .month-calendar {
                display: grid;
                grid-template-columns: repeat(7, 1fr);
                gap: 6px;
                background: var(--background-primary);
                padding: 16px;
                border-radius: 12px;
            }
            
            .heatmap-cell {
                aspect-ratio: 1;
                border-radius: 6px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 0.8rem;
                font-weight: 500;
                transition: transform 0.1s;
                cursor: pointer;
            }
            
            .heatmap-cell:hover {
                transform: scale(1.1);
                border: 1px solid var(--interactive-accent);
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                z-index: 10;
            }
            
            .year-heatmap-cell {
                transition: all 0.1s;
            }
            
            .year-heatmap-cell:hover {
                transform: scale(1.05);
                border: 1px solid var(--interactive-accent);
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                z-index: 10;
            }
            
            .heatmap-l0 { background: var(--background-modifier-border); opacity: 0.3; color: var(--text-muted); }
            .heatmap-l1 { background: #9be9a8; color: #1b1b1b; }
            .heatmap-l2 { background: #40c463; color: #1b1b1b; }
            .heatmap-l3 { background: #30a14e; color: white; }
            .heatmap-l4 { background: #216e39; color: white; }
            
            .month-nav-btn, .year-nav-btn {
                padding: 4px 8px;
                border-radius: 4px;
                border: 1px solid var(--background-modifier-border);
                background: var(--background-secondary);
                cursor: pointer;
            }
            
            .month-nav-btn:hover, .year-nav-btn:hover {
                background: var(--background-modifier-hover);
            }
            
            /* 归档月度折叠 */
            .archive-month-header {
                background: var(--background-secondary);
                padding: 10px 16px;
                border-radius: 8px;
                margin-top: 8px;
                cursor: pointer;
                display: flex;
                gap: 12px;
                align-items: center;
                font-weight: 500;
                border: 1px solid var(--background-modifier-border);
            }
            
            .archive-month-header:hover {
                background: var(--background-modifier-hover);
            }
            
            .archive-month-content {
                padding: 12px 0 12px 24px;
            }
            
            /* 归档任务卡片 */
            .archive-task-item {
                background: var(--background-primary);
                border: 1px solid var(--background-modifier-border);
                border-radius: 6px;
                padding: 8px 12px;
                margin-bottom: 6px;
                display: flex;
                gap: 8px;
                align-items: center;
                opacity: 0.9;
            }
            
            .v14-tab-btn.active {
                background: var(--interactive-accent) !important;
                color: var(--text-on-accent) !important;
            }
            
            .v14-tab-btn:hover {
                background: var(--background-modifier-hover);
            }
            
            /* 统计数据卡片 */
            .stats-board {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 12px;
                margin-bottom: 24px;
            }
            
            .stat-card {
                background: var(--background-secondary);
                border-radius: 12px;
                padding: 16px;
                text-align: center;
            }
            
            /* 错误信息样式 */
            .error-message {
                padding: 20px;
                background: var(--background-modifier-error);
                color: var(--text-error);
                border-radius: 8px;
                margin: 20px 0;
            }
            
            /* 响应式调整 */
            @media (max-width: 768px) {
                .task-grid-v14 {
                    grid-template-columns: 1fr;
                }
                
                .stats-board {
                    grid-template-columns: repeat(2, 1fr);
                }
            }
        `;
        
        document.head.appendChild(style);
    }
    
    async renderHeader(parent) {
        try {
            const header = parent.createDiv({ 
                cls: 'v14-card',
                attr: { style: 'display:flex; justify-content:space-between; align-items:center; padding:16px 20px; margin-bottom:24px;' }
            });
            
            const profile = header.createDiv({ attr: { style: 'display:flex; align-items:center; gap:16px;' } });
            
            // 头像
            profile.createEl('img', { 
                cls: 'avatar', 
                attr: { 
                    src: 'https://api.dicebear.com/7.x/notionists/svg?seed=Felix&size=60',
                    style: 'width:60px; height:60px; border-radius:12px; background:var(--interactive-accent);' 
                } 
            });
            
            const info = profile.createDiv();
            info.createEl('h2', { text: '任务追踪看板', attr: { style: 'margin:0; font-size:1.4em; font-weight:600;' } });
            info.createEl('p', { text: moment().format('YYYY年MM月DD日 dddd'), attr: { style: 'margin:4px 0 0; color:var(--text-muted); font-size:0.85em;' } });
            
            const actions = header.createDiv({ attr: { style: 'display:flex; gap:8px;' } });
            
            const refreshBtn = actions.createEl('button', { cls: 'v6-btn', text: '🔄 刷新' });
            refreshBtn.onclick = () => this.render();
            
            const newProjectBtn = actions.createEl('button', { cls: 'v6-btn primary', text: '➕ 新建项目' });
            newProjectBtn.onclick = () => this.plugin.createNewProject();
        } catch (e) {
            console.error('Error rendering header:', e);
        }
    }
    
    renderEmptyState(parent, type) {
        try {
            const empty = parent.createDiv({ 
                cls: 'v14-card',
                attr: { style: 'text-align:center; padding:60px 20px; margin:20px 0;' }
            });
            
            if (type === 'active') {
                empty.createEl('h2', { text: '📂 还没有进行中的项目', attr: { style: 'margin:0 0 8px; font-weight:500;' } });
                empty.createEl('p', { text: '点击"新建项目"按钮开始创建', attr: { style: 'color:var(--text-muted);' } });
            } else if (type === 'archive') {
                empty.createEl('h2', { text: '📦 暂无归档项目', attr: { style: 'margin:0 0 8px; font-weight:500;' } });
            }
        } catch (e) {
            console.error('Error rendering empty state:', e);
        }
    }
    
    calculateActiveStats(projects) {
        try {
            const active = projects.filter(p => !(p.fm?.archived === true || p.fm?.status === '已归档'));
            let totalTasks = 0;
            let completedTasks = 0;
            
            active.forEach(({ file }) => {
                const cache = this.app.metadataCache.getFileCache(file);
                if (cache && cache.listItems) {
                    cache.listItems.forEach(item => {
                        if (item.task) totalTasks++;
                        if (item.task === 'x') completedTasks++;
                    });
                }
            });
            
            return {
                projectCount: active.length,
                totalTasks,
                completedTasks,
                todoTasks: totalTasks - completedTasks,
                completionRate: totalTasks ? Math.round(completedTasks / totalTasks * 100) : 0
            };
        } catch (e) {
            console.error('Error calculating active stats:', e);
            return { projectCount: 0, totalTasks: 0, completedTasks: 0, todoTasks: 0, completionRate: 0 };
        }
    }
    
    calculateArchiveStats(archivedProjects) {
        try {
            let totalTasks = 0;
            let completedTasks = 0;
            
            archivedProjects.forEach(({ file }) => {
                const cache = this.app.metadataCache.getFileCache(file);
                if (cache && cache.listItems) {
                    cache.listItems.forEach(item => {
                        if (item.task) totalTasks++;
                        if (item.task === 'x') completedTasks++;
                    });
                }
            });
            
            return {
                projectCount: archivedProjects.length,
                totalTasks,
                completedTasks,
                completionRate: totalTasks ? Math.round(completedTasks / totalTasks * 100) : 0
            };
        } catch (e) {
            console.error('Error calculating archive stats:', e);
            return { projectCount: 0, totalTasks: 0, completedTasks: 0, completionRate: 0 };
        }
    }
    
    renderStatsBoard(parent, stats, type) {
        try {
            const board = parent.createDiv({ cls: 'stats-board' });
            
            const items = type === 'active' ? [
                { label: '进行中项目', value: stats.projectCount, icon: '📌' },
                { label: '待办任务', value: stats.todoTasks, icon: '⏳' },
                { label: '完成任务', value: stats.completedTasks, icon: '✅' },
                { label: '完成率', value: stats.completionRate + '%', icon: '📊' }
            ] : [
                { label: '归档项目', value: stats.projectCount, icon: '📦' },
                { label: '总任务数', value: stats.totalTasks, icon: '📋' },
                { label: '完成任务', value: stats.completedTasks, icon: '✅' },
                { label: '完成率', value: stats.completionRate + '%', icon: '📈' }
            ];
            
            items.forEach(item => {
                const card = board.createDiv({ cls: 'stat-card' });
                card.createDiv({ text: item.icon, attr: { style: 'font-size:1.5rem; margin-bottom:4px;' } });
                card.createDiv({ text: item.value.toString(), attr: { style: 'font-size:1.8rem; font-weight:600; line-height:1.2;' } });
                card.createDiv({ text: item.label, attr: { style: 'font-size:0.8rem; color:var(--text-muted);' } });
            });
        } catch (e) {
            console.error('Error rendering stats board:', e);
        }
    }
    
    async renderRecentSection(parent, recentFiles) {
        try {
            const recentContainer = parent.createDiv({ cls: 'recent-container' });
            recentContainer.createEl('h3', { text: '🕒 最近编辑的文件', attr: { style: 'margin-bottom:16px;' } });
            
            if (recentFiles.length === 0) {
                recentContainer.createDiv({ text: '暂无最近文件', cls: 'empty-state' });
                return;
            }
            
            const grid = recentContainer.createDiv({ attr: { style: 'display:grid; grid-template-columns:repeat(auto-fill, minmax(220px,1fr)); gap:12px;' } });
            for (const file of recentFiles) {
                try {
                    const card = grid.createDiv({ cls: 'v14-card', attr: { style: 'padding:12px; cursor:pointer; border:1px solid var(--background-modifier-border); border-radius:12px;' } });
                    card.createEl('div', { text: file.basename, attr: { style: 'font-weight:600; margin-bottom:6px;' } });
                    card.createEl('div', { text: moment(file.stat.mtime).fromNow(), attr: { style: 'font-size:0.8em; color:var(--text-muted);' } });
                    card.onclick = () => this.app.workspace.getLeaf().openFile(file);
                } catch (e) {
                    console.error('Error rendering recent file card:', e);
                }
            }
        } catch (e) {
            console.error('Error rendering recent section:', e);
        }
    }
    
    async renderArchiveSection(parent, archivedProjects) {
        try {
            // 按年月分组 archivedDate
            const groups = new Map(); 
            archivedProjects.forEach(p => {
                let dateStr = p.fm.archivedDate;
                if (!dateStr) dateStr = p.fm.modified || p.fm.created || moment().format('YYYY-MM-DD');
                const ym = moment(dateStr).format('YYYY-MM');
                if (!groups.has(ym)) groups.set(ym, []);
                groups.get(ym).push(p);
            });
            
            const sortedMonths = Array.from(groups.keys()).sort().reverse();
            
            for (const ym of sortedMonths) {
                try {
                    const monthProjects = groups.get(ym);
                    const monthLabel = moment(ym, 'YYYY-MM').format('YYYY年MM月');
                    const monthId = `archive-${ym}`;
                    const isExpanded = this.expandedArchive.has(monthId);
                    
                    const monthDiv = parent.createDiv({ cls: 'archive-month-card', attr: { style: 'margin-bottom:16px;' } });
                    const header = monthDiv.createDiv({ cls: 'archive-month-header' });
                    header.onclick = () => {
                        if (this.expandedArchive.has(monthId)) this.expandedArchive.delete(monthId);
                        else this.expandedArchive.add(monthId);
                        this.render();
                    };
                    header.createSpan({ text: isExpanded ? '▼' : '▶', attr: { style: 'width:16px;' } });
                    header.createSpan({ text: `📁 ${monthLabel}  (${monthProjects.length}个项目)` });
                    
                    if (isExpanded) {
                        const content = monthDiv.createDiv({ cls: 'archive-month-content' });
                        for (const { file, fm } of monthProjects) {
                            await this.renderProjectSection(content, file, fm, true);
                        }
                    }
                } catch (e) {
                    console.error('Error rendering archive month:', e);
                }
            }
        } catch (e) {
            console.error('Error rendering archive section:', e);
        }
    }
    
    async renderProjectSection(parent, file, fm, isArchived = false) {
        try {
            const projectId = file.path;
            const isExpanded = this.expandedProjects.has(projectId);
            
            const projectCard = parent.createDiv({ 
                cls: 'v14-card',
                attr: { style: `margin-bottom:16px; overflow:hidden; ${isArchived ? 'opacity:0.8;' : ''}` }
            });
            
            const header = projectCard.createDiv({ 
                attr: { style: `padding:14px 20px; background:${isArchived ? 'var(--background-secondary)' : 'var(--background-secondary)'}; border-bottom:1px solid var(--background-modifier-border); display:flex; align-items:center; gap:12px;` }
            });
            
            const toggleIcon = header.createSpan({ 
                text: isExpanded ? '▼' : '▶', 
                attr: { style: 'font-size:12px; color:var(--text-muted); width:16px; cursor:pointer;' } 
            });
            toggleIcon.onclick = () => {
                if (this.expandedProjects.has(projectId)) this.expandedProjects.delete(projectId);
                else this.expandedProjects.add(projectId);
                this.render();
            };
            
            const title = header.createEl('h2', { 
                text: fm.name || file.basename, 
                cls: isArchived ? 'project-title-clickable archive-title' : 'project-title-clickable',
                attr: { style: 'margin:0; font-size:1.2em; font-weight:600; flex:1;' } 
            });
            title.onclick = (e) => {
                e.stopPropagation();
                this.app.workspace.getLeaf().openFile(file);
            };
            
            if (isArchived && fm.archivedDate) {
                header.createSpan({ 
                    text: `归档于 ${moment(fm.archivedDate).format('YYYY-MM-DD')}`,
                    attr: { style: 'font-size:0.75em; color:var(--text-muted); padding:2px 8px; border-radius:12px; background:var(--background-primary);' }
                });
            }
            
            const meta = header.createDiv({ attr: { style: 'display:flex; gap:8px; flex-wrap:wrap;' } });
            if (!isArchived) {
                meta.createSpan({ text: `优先级: ${fm.priority || '中'}`, attr: { style: 'padding:4px 10px; border-radius:20px; font-size:0.75em; background:var(--background-primary); border:1px solid var(--background-modifier-border);' } });
            }
            meta.createSpan({ text: fm.status || (isArchived ? '已归档' : '进行中'), attr: { style: 'padding:4px 10px; border-radius:20px; font-size:0.75em; background:var(--background-primary); border:1px solid var(--background-modifier-border);' } });
            
            if (isExpanded) {
                const content = projectCard.createDiv({ attr: { style: 'padding:20px;' } });
                const fileContent = await this.app.vault.read(file);
                
                await this.renderTaskList(content, file, fileContent, isArchived);
                
                if (!isArchived) {
                    this.renderProgressSection(content, fileContent);
                    this.renderFeedbackSection(content, file);
                }
            }
        } catch (e) {
            console.error('Error rendering project section:', e);
        }
    }
    
    async renderTaskList(parent, file, content, isArchived = false) {
        try {
            const taskSection = parent.createDiv({ attr: { style: 'margin-bottom:20px;' } });
            
            taskSection.createEl('h3', { 
                text: '📋 任务清单',
                attr: { style: 'margin:0 0 16px 0; font-size:1.1em; font-weight:500; padding-bottom:8px; border-bottom:1px solid var(--background-modifier-border);' }
            });
            
            const taskRegex = /- \[([ x])\]\s*(.*?)\s*\|\s*内容：(.*?)\s*\|\s*优先级：(紧急|高|中|低)\s*\|\s*满意度：(\d+)\s*\|\s*完成度：(\d+)%\s*\|\s*(正计时|倒计时)：(\d+)/g;
            
            let match;
            let tasks = [];
            while ((match = taskRegex.exec(content)) !== null) {
                tasks.push({
                    checked: match[1] === 'x',
                    name: match[2].trim(),
                    description: match[3].trim(),
                    priority: match[4],
                    satisfaction: parseInt(match[5]),
                    completion: parseInt(match[6]),
                    timerMode: match[7],
                    timerInitial: parseInt(match[8])
                });
            }
            
            if (tasks.length === 0) {
                parent.createDiv({ text: '暂无任务', attr: { style: 'padding:12px; background:var(--background-secondary); border-radius:6px; color:var(--text-muted); text-align:center;' } });
                return;
            }
            
            if (!isArchived) {
                tasks.sort((a, b) => {
                    const aPinned = this.pinnedTasks.has(`${file.path}-${a.name}`) ? 1 : 0;
                    const bPinned = this.pinnedTasks.has(`${file.path}-${b.name}`) ? 1 : 0;
                    if (aPinned !== bPinned) return bPinned - aPinned;
                    const priorityWeight = { '紧急':4,'高':3,'中':2,'低':1 };
                    return (priorityWeight[b.priority]||0) - (priorityWeight[a.priority]||0);
                });
            }
            
            // 使用增大的网格
            const taskGrid = parent.createDiv({ cls: 'task-grid-v14' });
            
            for (const task of tasks) {
                if (isArchived) {
                    const archiveTaskDiv = taskGrid.createDiv({ cls: 'archive-task-item' });
                    archiveTaskDiv.createSpan({ text: task.checked ? '✅' : '⬜' });
                    archiveTaskDiv.createSpan({ text: task.name, attr: { style: 'font-weight:500; flex:1;' } });
                    archiveTaskDiv.createSpan({ text: `${task.completion}%` });
                } else {
                    await this.renderTaskCard(taskGrid, task, file, isArchived);
                }
            }
        } catch (e) {
            console.error('Error rendering task list:', e);
        }
    }
    
    async renderTaskCard(parent, task, file, isArchived = false) {
        try {
            const taskId = `${file.path}-${task.name}`;
            const isPinned = this.pinnedTasks.has(taskId);
            
            if (!this.timers[taskId] && !isArchived) {
                this.timers[taskId] = {
                    seconds: task.timerInitial * 60,
                    mode: task.timerMode === '正计时' ? 'countup' : 'countdown',
                    running: false,
                    lastUpdate: Date.now(),
                    taskName: task.name,
                    initialSeconds: task.timerInitial * 60
                };
            }
            
            const timer = this.timers[taskId];
            
            const card = parent.createDiv({ 
                cls: `priority-${task.priority}`,
                attr: { 
                    style: `
                        background: var(--background-primary);
                        border: 1px solid var(--background-modifier-border);
                        border-radius: 16px;
                        padding: 20px;
                        position: relative;
                        transition: all 0.2s;
                        display: flex;
                        flex-direction: column;
                        gap: 16px;
                    `
                }
            });
            
            const pin = card.createDiv({ text: '📌', cls: `pin-icon ${isPinned ? 'active' : ''}` });
            pin.onclick = (e) => {
                e.stopPropagation();
                if (isPinned) this.pinnedTasks.delete(taskId);
                else this.pinnedTasks.add(taskId);
                this.savePinnedState();
                this.render();
            };
            
            const header = card.createDiv({ attr: { style: 'display:flex; align-items:flex-start; gap:12px;' } });
            const checkbox = header.createEl('input', { type: 'checkbox' });
            checkbox.checked = task.checked;
            checkbox.style.width = '20px'; checkbox.style.height = '20px'; checkbox.style.cursor = 'pointer'; checkbox.style.accentColor = '#6aab8c';
            checkbox.onchange = async () => {
                await this.updateTaskStatus(file, task.name, checkbox.checked);
                new Notice(`任务已${checkbox.checked ? '完成' : '重新打开'}`);
            };
            
            const title = header.createEl('span', { text: task.name, attr: { style: 'font-weight:600; font-size:1.1em; color:var(--text-normal); cursor:pointer; flex:1;' } });
            title.onclick = () => this.app.workspace.getLeaf().openFile(file);
            
            card.createEl('p', { text: task.description, attr: { style: 'margin:0; color:var(--text-muted); font-size:0.95em; line-height:1.5;' } });
            
            const progressContainer = card.createDiv({ attr: { style: 'display:flex; align-items:center; gap:12px;' } });
            const progressBar = progressContainer.createDiv({ attr: { style: 'flex:1; height:8px; background:var(--background-modifier-border); border-radius:4px; overflow:hidden;' } });
            progressBar.createDiv({ attr: { style: `width:${task.completion}%; height:100%; background:#6aab8c; border-radius:4px;` } });
            progressContainer.createSpan({ text: `${task.completion}%`, attr: { style: 'font-size:0.9em; color:var(--text-muted); min-width:45px; text-align:right;' } });
            
            const metaRow = card.createDiv({ attr: { style: 'display:flex; gap:10px; flex-wrap:wrap;' } });
            metaRow.createSpan({ text: `优先级: ${task.priority}`, attr: { style: 'padding:4px 10px; border-radius:12px; font-size:0.8em; background:var(--background-secondary); border:1px solid var(--background-modifier-border);' } });
            metaRow.createSpan({ text: `满意度: ${'⭐'.repeat(task.satisfaction)}`, attr: { style: 'padding:4px 10px; border-radius:12px; font-size:0.8em; background:var(--background-secondary); border:1px solid var(--background-modifier-border);' } });
            
            if (timer) {
                const timerCard = card.createDiv({ cls: 'timer-digital-card' });
                const displaySpan = timerCard.createSpan({ 
                    cls: 'timer-display-new',
                    text: this.formatTime(timer.seconds),
                    attr: { id: `timer-${taskId}` }
                });
                
                const ctrlDiv = timerCard.createDiv({ cls: 'timer-controls-new' });
                const startBtn = ctrlDiv.createEl('button', { text: '▶', cls: 'timer-btn-new' });
                const pauseBtn = ctrlDiv.createEl('button', { text: '⏸', cls: 'timer-btn-new' });
                const resetBtn = ctrlDiv.createEl('button', { text: '↺', cls: 'timer-btn-new' });
                const truncBtn = ctrlDiv.createEl('button', { text: '截', cls: 'timer-btn-new' });
                
                startBtn.onclick = () => { timer.running = true; timer.lastUpdate = Date.now(); };
                pauseBtn.onclick = () => { timer.running = false; };
                resetBtn.onclick = () => {
                    timer.running = false;
                    timer.seconds = (timer.mode === 'countdown') ? timer.initialSeconds : 0;
                    displaySpan.textContent = this.formatTime(timer.seconds);
                };
                truncBtn.onclick = async () => {
                    try {
                        const timeSpent = timer.mode === 'countdown' ? timer.initialSeconds - timer.seconds : timer.seconds;
                        const minutes = Math.floor(timeSpent / 60);
                        const seconds = timeSpent % 60;
                        timer.running = false;
                        if (timer.mode === 'countdown') timer.seconds = timer.initialSeconds;
                        else timer.seconds = 0;
                        displaySpan.textContent = this.formatTime(timer.seconds);
                        
                        const content = await this.app.vault.read(file);
                        const feedbackEntry = `\n> [!note]- 任务记录\n> 时间：${moment().format('YYYY-MM-DD HH:mm:ss')}\n> 任务：${task.name}\n> 投入：${minutes}分${seconds}秒\n> 模式：${timer.mode}\n> 状态：已截断\n`;
                        await this.app.vault.modify(file, content + feedbackEntry);
                        new Notice(`已记录 ${minutes}分${seconds}秒 投入`);
                    } catch (e) {
                        console.error('Error in trunc button:', e);
                    }
                };
                
                const modeSelect = ctrlDiv.createEl('select', { attr: { style: 'width:60px; font-size:11px; border-radius:16px; border:1px solid var(--background-modifier-border); padding:4px;' } });
                modeSelect.createEl('option', { value: 'countup', text: '正计时' });
                modeSelect.createEl('option', { value: 'countdown', text: '倒计时' });
                modeSelect.value = timer.mode;
                modeSelect.onchange = () => {
                    timer.mode = modeSelect.value;
                    if (timer.mode === 'countdown') timer.seconds = timer.initialSeconds;
                    else timer.seconds = 0;
                    displaySpan.textContent = this.formatTime(timer.seconds);
                };
                
                const minuteInput = ctrlDiv.createEl('input', { type: 'number', value: Math.floor(timer.initialSeconds/60), attr: { style: 'width:50px; font-size:11px; border-radius:16px;', min:1, max:999 } });
                const setBtn = ctrlDiv.createEl('button', { text: '设', cls: 'timer-btn-new', attr: { style: 'width:36px; height:36px;' } });
                setBtn.onclick = () => {
                    const mins = parseInt(minuteInput.value) || 25;
                    timer.initialSeconds = mins * 60;
                    if (timer.mode === 'countdown') timer.seconds = timer.initialSeconds;
                    displaySpan.textContent = this.formatTime(timer.seconds);
                };
            }
        } catch (e) {
            console.error('Error rendering task card:', e);
        }
    }
    
    renderProgressSection(parent, content) {
        try {
            const progressSection = parent.createDiv({ attr: { style: 'margin:20px 0;' } });
            progressSection.createEl('h3', { text: '📝 进展记录', attr: { style: 'margin:0 0 16px 0; font-size:1.1em; font-weight:500; padding-bottom:8px; border-bottom:1px solid var(--background-modifier-border);' } });
            
            let progressList = [];
            const progressMatch = content.match(/## 📝 进展记录\n([\s\S]*?)\n##/);
            if (progressMatch) {
                const lines = progressMatch[1].split('\n');
                lines.forEach(line => { if (line.trim().startsWith('-')) progressList.push(line.replace('-', '').trim()); });
            }
            
            const list = progressSection.createDiv({ attr: { style: 'background:var(--background-secondary); border-radius:8px; padding:12px;' } });
            if (progressList.length === 0) {
                list.createDiv({ text: '暂无进展记录', attr: { style: 'color:var(--text-muted); font-style:italic; padding:8px; text-align:center;' } });
            } else {
                progressList.slice(0, 3).forEach(item => {
                    list.createDiv({ text: `• ${item}`, attr: { style: 'padding:6px 0; color:var(--text-secondary); border-bottom:1px dashed var(--background-modifier-border);' } });
                });
            }
        } catch (e) {
            console.error('Error rendering progress section:', e);
        }
    }
    
    renderFeedbackSection(parent, file) {
        try {
            const feedbackSection = parent.createDiv({ attr: { style: 'margin-top:20px;' } });
            feedbackSection.createEl('h3', { text: '💬 评价与反馈', attr: { style: 'margin:0 0 16px 0; font-size:1.1em; font-weight:500; padding-bottom:8px; border-bottom:1px solid var(--background-modifier-border);' } });
            
            const quickRating = feedbackSection.createDiv({ attr: { style: 'display:flex; gap:8px; margin-bottom:12px;' } });
            [1,2,3,4,5].forEach(star => {
                const starBtn = quickRating.createSpan({ text: '⭐', attr: { style: 'font-size:1.2em; cursor:pointer; opacity:0.4; transition:all 0.15s; padding:4px;' } });
                starBtn.onmouseover = () => { starBtn.style.opacity = '1'; starBtn.style.transform = 'scale(1.2)'; };
                starBtn.onmouseout = () => { starBtn.style.opacity = '0.4'; starBtn.style.transform = 'scale(1)'; };
                starBtn.onclick = async () => {
                    try {
                        const content = await this.app.vault.read(file);
                        const feedback = `\n> [!note]- 项目评价\n> 时间：${moment().format('YYYY-MM-DD HH:mm:ss')}\n> 满意度：${'⭐'.repeat(star)}\n`;
                        await this.app.vault.modify(file, content + feedback);
                        new Notice(`已记录 ${star}星满意度`);
                    } catch (e) {
                        console.error('Error saving rating:', e);
                    }
                };
            });
            
            const feedbackBtn = feedbackSection.createEl('button', { text: '✏️ 添加详细评价', cls: 'v6-btn', attr: { style: 'width:100%;' } });
            feedbackBtn.onclick = () => { this.app.workspace.getLeaf().openFile(file); };
        } catch (e) {
            console.error('Error rendering feedback section:', e);
        }
    }
    
    async updateTaskStatus(file, taskName, checked) {
        try {
            const content = await this.app.vault.read(file);
            const lines = content.split('\n');
            
            const escapedName = taskName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const taskRegex = new RegExp(`- \\[([ x])\\]\\s*${escapedName}\\s*\\|`);
            
            for (let i = 0; i < lines.length; i++) {
                if (taskRegex.test(lines[i])) {
                    lines[i] = lines[i].replace(/- \[([ x])\]/, checked ? '- [x]' : '- [ ]');
                    break;
                }
            }
            
            await this.app.vault.modify(file, lines.join('\n'));
        } catch (e) {
            console.error('Error updating task status:', e);
            new Notice('更新任务状态失败');
        }
    }
    
    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        if (hours > 0) {
            return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
    }
}

module.exports = TaskTrackerPlugin;