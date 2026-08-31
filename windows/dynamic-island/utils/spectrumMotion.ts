const TARGET_ATTACK_SECONDS = 0.03;
const TARGET_RELEASE_SECONDS = 0.06;
const DISPLAY_ATTACK_SECONDS = 0.045;
const DISPLAY_RELEASE_SECONDS = 0.16;
const PIXEL_DEADBAND = 0.25;

/**
 * 以时间常数计算帧率无关的指数平滑系数
 * @param deltaSeconds - 距上一帧的秒数
 * @param timeConstant - 平滑时间常数（秒）
 * @returns 当前帧的插值系数
 */
const smoothingCoefficient = (deltaSeconds: number, timeConstant: number): number =>
  1 - Math.exp(-deltaSeconds / timeConstant);

/**
 * 聚合频谱柱覆盖的 FFT 频点
 * @param values - FFT 频点数据
 * @param start - 起始索引（含）
 * @param end - 结束索引（不含）
 * @returns 聚合能量，范围 0..1
 */
export const aggregateSpectrumBand = (values: Float32Array, start: number, end: number): number => {
  let peak = 0;
  let squareSum = 0;

  for (let index = start; index < end; index++) {
    const value = values[index];
    peak = Math.max(peak, value);
    squareSum += value * value;
  }

  const count = Math.max(1, end - start);
  const rms = Math.sqrt(squareSum / count);
  return rms * 0.7 + peak * 0.3;
};

/**
 * 推进单根频谱柱的目标值与显示值
 * @param targets - 目标值缓冲
 * @param display - 显示值缓冲
 * @param index - 当前频谱柱索引
 * @param raw - 当前聚合能量
 * @param deltaSeconds - 距上一帧的秒数
 */
export const advanceSpectrumMotion = (
  targets: Float32Array,
  display: Float32Array,
  index: number,
  raw: number,
  deltaSeconds: number,
): void => {
  const target = targets[index];
  const targetTime = raw > target ? TARGET_ATTACK_SECONDS : TARGET_RELEASE_SECONDS;
  const targetCoefficient = smoothingCoefficient(deltaSeconds, targetTime);
  targets[index] += (raw - target) * targetCoefficient;

  const nextTarget = targets[index];
  const displayTime =
    nextTarget > display[index] ? DISPLAY_ATTACK_SECONDS : DISPLAY_RELEASE_SECONDS;
  const displayCoefficient = smoothingCoefficient(deltaSeconds, displayTime);
  display[index] += (nextTarget - display[index]) * displayCoefficient;
};

/**
 * 将显示值映射到小画布的稳定绘制值
 * @param previous - 上一次绘制值
 * @param next - 当前显示值
 * @param maxPixels - 单侧最大绘制高度
 * @returns 本帧绘制值
 */
export const applyPixelDeadband = (previous: number, next: number, maxPixels: number): number =>
  Math.abs(next - previous) * maxPixels < PIXEL_DEADBAND ? previous : next;
