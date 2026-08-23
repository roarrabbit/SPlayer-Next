// NotchAnimationCoordinator
// ---------------------------------------------------------------------------
// 集中管理「歌词灵动岛」与 BoringNotch 展开动画之间的协调时序。
//
// 设计目标（对齐 BoringNotch 开源实现思路，而非另起一套）：
//   - 状态驱动：phase 状态机驱动，不做 show()/hide()/remove()/recreate() 这类粗暴操作。
//   - 平滑曲线：reveal 使用近似 SwiftUI .smooth 的曲线（opacity + clip + 极小 offsetY）。
//   - 不弹跳：没有 scale / bounce / overshoot / spring 弹跳。
//   - 时序唯一真相来源：所有 magic delay 集中在此，避免散落到各个 View。
//
// 时序模型：
//   BoringNotch 开始展开 (t=0)
//     └─ OPEN_LEAD_MS 后歌词岛进入 revealing（opacity 0→1, clip 收→展, offsetY -5→0）
//        └─ REVEAL_MS 后进入 revealed
//   暂停 → collapsing（收起）；恢复 → 重新 open() 协调 reveal
// ---------------------------------------------------------------------------

export const PHASE = {
  COLLAPSED: "collapsed",
  REVEALING: "revealing",
  REVEALED: "revealed",
  COLLAPSING: "collapsing",
} as const;

export type Phase = (typeof PHASE)[keyof typeof PHASE];

// SwiftUI .smooth 的近似曲线（CSS transition 用）
export const SMOOTH_EASING = "cubic-bezier(0.32, 0.72, 0, 1)";

const DEFAULTS = {
  // 内容出现/消失节奏已减半（跟随液体动效，避免比液体慢半拍）：
  // 内容可见性主要由 .di-face clip 随液体进度控制，opacity 淡入仅为柔和辅助。
  openLead: 100,
  // reveal 总时长（内容随液体展开同步淡入）
  reveal: 750,
  // 收起时长（与液体收回同节奏，内容被 clip 快速吸走）
  collapse: 500,
};

export interface NotchAnimationCoordinatorOptions {
  openLead?: number;
  reveal?: number;
  collapse?: number;
}

type PhaseListener = (phase: Phase, coordinator: NotchAnimationCoordinator) => void;

export class NotchAnimationCoordinator {
  phase: Phase;
  paused: boolean;
  private timings: typeof DEFAULTS;
  private _listeners: Set<PhaseListener>;
  private _timers: ReturnType<typeof setTimeout>[];
  private _active = false;

  constructor(opts: NotchAnimationCoordinatorOptions = {}) {
    this.phase = PHASE.COLLAPSED;
    this.paused = false;
    this.timings = { ...DEFAULTS, ...opts };
    this._listeners = new Set();
    this._timers = [];
    this._active = false;
  }

  // 注册相位变化回调（组件在此同步 Vue ref）
  onPhase(fn: PhaseListener): () => void {
    this._listeners.add(fn);
    return () => {
      this._listeners.delete(fn);
    };
  }

  private _emit(): void {
    for (const fn of this._listeners) fn(this.phase, this);
  }

  private _clear(): void {
    for (const t of this._timers) clearTimeout(t);
    this._timers = [];
  }

  private _after(ms: number, fn: () => void): ReturnType<typeof setTimeout> {
    const t = setTimeout(fn, ms);
    this._timers.push(t);
    return t;
  }

  // 音乐开始 / 曲目出现：与 BoringNotch 展开错峰协调 reveal。
  // 幂等：已展开或正在展开时再次调用不会重置时间线，避免 reveal 中途被
  // watch(track) / watch(playing) 双重触发打回 COLLAPSED 造成「闪一下→弹回→重放」。
  open(): void {
    // 已展开 / 正在展开：保持现状，不重启时间线（关键，消除闪烁）
    if (this.phase === PHASE.REVEALING || this.phase === PHASE.REVEALED) return;
    this._clear();
    this._active = true;
    // 正收起 → 直接反向展开，不再先归零到完全收起（暂停途中恢复更顺）
    if (this.phase === PHASE.COLLAPSING) {
      this.phase = PHASE.REVEALING;
      this._emit();
      this._after(this.timings.reveal, () => {
        if (!this._active) return;
        this.phase = PHASE.REVEALED;
        this._emit();
      });
      return;
    }
    // 完全收起 → 等待 openLead 后开始 reveal
    this.phase = PHASE.COLLAPSED;
    this._emit();
    this._after(this.timings.openLead, () => {
      if (!this._active) return;
      this.phase = PHASE.REVEALING;
      this._emit();
      this._after(this.timings.reveal, () => {
        if (!this._active) return;
        this.phase = PHASE.REVEALED;
        this._emit();
      });
    });
  }

  // 停止 / 暂停：收起（幂等：已收起 / 正在收起保持不变）
  close(): void {
    if (this.phase === PHASE.COLLAPSED || this.phase === PHASE.COLLAPSING) return;
    this._clear();
    this._active = false;
    this.phase = PHASE.COLLAPSING;
    this._emit();
    this._after(this.timings.collapse, () => {
      this.phase = PHASE.COLLAPSED;
      this._emit();
    });
  }

  // 暂停 / 恢复（生命周期连续，不重建内容）
  setPaused(p: boolean): void {
    if (this.paused === p) return;
    this.paused = p;
    this._emit();
  }

  destroy(): void {
    this._clear();
    this._listeners.clear();
  }
}
