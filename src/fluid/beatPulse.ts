// 音频节拍脉冲检测：从 bass 能量的上升沿触发节拍脉冲，ATTACK/RELEASE 包络平滑。
// 驱动流体背景的节拍扭曲（u_beatPulse）与节拍 60fps 提升。
// 源码对应迭代版 app.asar 中的 fluidBeatPulse-CODEX.js 模块。

export interface BeatPulseState {
  previousBass: number;
  riseFloor: number;
  pulse: number;
  sinceBeat: number;
}

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

const COOLDOWN = 0.15;
const ATTACK = 0.018;
const RELEASE = 0.12;

/**
 * 推进节拍脉冲状态（帧率无关）
 * @param state 状态对象（由调用方持有，可跨帧复用）
 * @param bass 当前 bass 能量 0..1
 * @param dt 帧间隔（秒）
 * @param intensity 节拍强度 0..1（默认 1）
 * @returns 当前脉冲值 + 更新后的状态
 */
export function advanceBeatPulse(
  state: BeatPulseState,
  bass: number,
  dt: number,
  intensity = 1,
): { pulse: number; state: BeatPulseState } {
  const elapsed = Math.min(0.05, Math.max(0, dt));
  const energy = clamp01(bass);
  const rise = Math.max(0, energy - state.previousBass);
  const floorAlpha = 1 - Math.exp(-elapsed / 0.42);
  state.riseFloor += (rise - state.riseFloor) * floorAlpha;
  state.sinceBeat += elapsed;

  const threshold = Math.max(0.035, state.riseFloor * 1.8);
  const triggered = rise > threshold && state.sinceBeat >= COOLDOWN;
  if (triggered) state.sinceBeat = 0;

  const target = triggered
    ? clamp01((rise - threshold) * 4.5 + 0.32) * Math.max(0.25, intensity)
    : 0;
  const tau = target > state.pulse ? ATTACK : RELEASE;
  state.pulse += (target - state.pulse) * (1 - Math.exp(-elapsed / tau));
  state.previousBass = energy;
  if (state.pulse < 0.002) state.pulse = 0;

  return { pulse: state.pulse, state };
}
