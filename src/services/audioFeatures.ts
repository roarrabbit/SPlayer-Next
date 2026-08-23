const FFT_MIN_FREQ = 80;
const FFT_MAX_FREQ = 2000;
const FFT_BINS = 128;

const BASS_MIN_FREQ = 80;
const BASS_MAX_FREQ = 180;
const BASS_THRESHOLD = 0.18;
const BASS_GAIN = 1.45;
const BASS_CURVE = 1.35;


// 中频参数 (人声/乐器主体) 180~800Hz
const MID_MIN_FREQ = 180;
const MID_MAX_FREQ = 800;
const MID_THRESHOLD = 0.12;
const MID_GAIN = 1.2;
const MID_CURVE = 1.1;

// 高频参数 (泛音/细节) 800~2000Hz（FFT 上限）
const HIGH_MIN_FREQ = 800;
const HIGH_MAX_FREQ = 2000;
const HIGH_THRESHOLD = 0.08;
const HIGH_GAIN = 1.0;
const HIGH_CURVE = 1.0;

const AMLL_VOLUME_BASE = 1;
const AMLL_VOLUME_RANGE = 1.3;

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

const logMin = Math.log(FFT_MIN_FREQ);
const logMax = Math.log(FFT_MAX_FREQ);

/**
 * 获取 native FFT 对数频段的边界频率
 * @param index - 频段索引
 * @returns 频段边界频率
 */
const getFftBinEdges = (index: number): { lo: number; hi: number } => {
  const lo = Math.exp(logMin + ((logMax - logMin) * index) / FFT_BINS);
  const hi = Math.exp(logMin + ((logMax - logMin) * (index + 1)) / FFT_BINS);
  return { lo, hi };
};

/**
 * 查找与目标频率范围相交的 FFT 频段
 * @param minFreq - 最低频率
 * @param maxFreq - 最高频率
 * @returns 左闭右开频段范围
 */
export const getFftBinRange = (
  minFreq: number,
  maxFreq: number,
): { start: number; end: number } => {
  let start = FFT_BINS;
  let end = 0;

  for (let i = 0; i < FFT_BINS; i++) {
    const { lo, hi } = getFftBinEdges(i);
    if (hi <= minFreq || lo >= maxFreq) continue;
    start = Math.min(start, i);
    end = Math.max(end, i + 1);
  }

  if (start >= end) return { start: 0, end: 0 };
  return { start, end };
};

const bassRange = getFftBinRange(BASS_MIN_FREQ, BASS_MAX_FREQ);
const midRange = getFftBinRange(MID_MIN_FREQ, MID_MAX_FREQ);
const highRange = getFftBinRange(HIGH_MIN_FREQ, HIGH_MAX_FREQ);

/**
 * 从 native FFT 帧中提取指定频段能量
 * @param data - 128 段对数频谱
 * @param range - 频段范围
 * @param threshold - 阈值
 * @param curve - 曲线指数
 * @param gain - 增益
 * @returns 频段能量，范围 0..1
 */
const extractBandEnergy = (
  data: readonly number[],
  range: { start: number; end: number },
  threshold: number,
  curve: number,
  gain: number,
): number => {
  if (data.length === 0 || range.start >= range.end) return 0;

  let sum = 0;
  let peak = 0;
  let weightSum = 0;
  const count = range.end - range.start;

  for (let i = range.start; i < range.end; i++) {
    const position = count <= 1 ? 0 : (i - range.start) / (count - 1);
    // 高频段权重递减，突出频段起始位置
    const weight = 1 - position * 0.3;
    const value = data[i] ?? 0;
    sum += value * value * weight;
    peak = Math.max(peak, value);
    weightSum += weight;
  }

  const rms = Math.sqrt(sum / Math.max(1, weightSum));
  const energy = rms * 0.72 + peak * 0.28;
  const normalized = Math.max(0, (energy - threshold) / (1 - threshold));

  return clamp01(Math.pow(normalized, curve) * gain);
};

/**
 * 从 native FFT 帧中提取低频脉冲强度
 * @param data - 128 段对数频谱
 * @returns 低频脉冲强度，范围 0..1
 */
export const getBassPulse = (data: readonly number[]): number =>
  extractBandEnergy(data, bassRange, BASS_THRESHOLD, BASS_CURVE, BASS_GAIN);

/**
 * 从 native FFT 帧中提取中频能量（人声/乐器主体）
 * @param data - 128 段对数频谱
 * @returns 中频能量，范围 0..1
 */
export const getMidEnergy = (data: readonly number[]): number =>
  extractBandEnergy(data, midRange, MID_THRESHOLD, MID_CURVE, MID_GAIN);

/**
 * 从 native FFT 帧中提取高频能量（泛音/细节）
 * @param data - 128 段对数频谱
 * @returns 高频能量，范围 0..1
 */
export const getHighEnergy = (data: readonly number[]): number =>
  extractBandEnergy(data, highRange, HIGH_THRESHOLD, HIGH_CURVE, HIGH_GAIN);

/**
 * 将低频脉冲映射为 AMLL 背景渲染器需要的低频音量
 * 使用轻微 ease-out，中间段更柔，减少硬顶导致的视觉顿挫
 * @param pulse - 低频脉冲强度，范围 0..1
 * @param intensity - 跳动强度倍率，1 为默认
 * @returns AMLL 低频音量
 */
export const toAmllLowFreqVolume = (pulse: number, intensity = 1): number => {
  const t = clamp01(pulse);
  // easeOutCubic：起势可见，高位不过冲
  const eased = 1 - Math.pow(1 - t, 3);
  const range = AMLL_VOLUME_RANGE * Math.max(0.1, intensity);
  return AMLL_VOLUME_BASE + eased * range;
};

/** 多频段能量汇总 */
export interface MultiBandEnergy {
  bass: number;
  mid: number;
  high: number;
}

/**
 * 从 FFT 帧中提取多频段能量
 * @param data - 128 段对数频谱
 * @returns 各频段能量
 */
export const getMultiBandEnergy = (data: readonly number[]): MultiBandEnergy => ({
  bass: getBassPulse(data),
  mid: getMidEnergy(data),
  high: getHighEnergy(data),
});
