import assert from "node:assert/strict";
import { it } from "node:test";

import { advanceSpectrumMotion, aggregateSpectrumBand, applyPixelDeadband } from "./spectrumMotion";

const advanceFor = (fps: number, durationSeconds: number, raw: number): number => {
  const targets = new Float32Array(1);
  const display = new Float32Array(1);
  const frames = Math.round(fps * durationSeconds);

  for (let frame = 0; frame < frames; frame++) {
    advanceSpectrumMotion(targets, display, 0, raw, 1 / fps);
  }

  return display[0];
};

it("不会让单个频点尖峰主导整根频谱柱", () => {
  const values = new Float32Array(25);
  values[12] = 1;

  const aggregated = aggregateSpectrumBand(values, 0, values.length);

  assert.ok(aggregated > 0.2);
  assert.ok(aggregated < 0.5);
});

it("下降时朝非零目标收敛且不会下冲", () => {
  const targets = new Float32Array([0.7]);
  const display = new Float32Array([0.8]);

  advanceSpectrumMotion(targets, display, 0, 0.7, 1 / 60);

  assert.ok(display[0] < 0.8);
  assert.ok(display[0] > 0.7);
});

it("单帧尖峰在 100ms 内回到轻微扰动范围", () => {
  const targets = new Float32Array(1);
  const display = new Float32Array(1);

  advanceSpectrumMotion(targets, display, 0, 1, 1 / 60);
  for (let frame = 0; frame < 5; frame++) {
    advanceSpectrumMotion(targets, display, 0, 0, 1 / 60);
  }

  assert.ok(display[0] < 0.2);
});

it("持续输入在 50ms 内产生明确响应", () => {
  assert.ok(advanceFor(60, 0.05, 1) > 0.4);
});

it("60Hz 与 120Hz 下保持近似相同的运动轨迹", () => {
  const at60Hz = advanceFor(60, 0.2, 1);
  const at120Hz = advanceFor(120, 0.2, 1);

  assert.ok(Math.abs(at60Hz - at120Hz) < 0.015);
});

it("忽略不足四分之一像素的变化，但保留累计后的有效移动", () => {
  assert.equal(applyPixelDeadband(0.5, 0.52, 9), 0.5);
  assert.equal(applyPixelDeadband(0.5, 0.54, 9), 0.54);
});
