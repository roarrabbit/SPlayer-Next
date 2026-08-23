/**
 * 增强版 Mesh Gradient 渲染器
 * 在 AMLL MeshGradientRenderer 基础上增加：
 * 1. 多频音乐响应 (低频/中频/高频独立驱动)
 * 2. Simplex Noise 自然流体运动
 * 3. 多层形变叠加
 * 4. 节拍增强饱和度而非压暗
 */

const meshVertShader = `
precision highp float;

attribute vec2 a_pos;
attribute vec3 a_color;
attribute vec2 a_uv;
varying vec3 v_color;
varying vec2 v_uv;

uniform float u_aspect;

void main() {
    v_color = a_color;
    v_uv = a_uv;
    vec2 pos = a_pos;
    if (u_aspect > 1.0) {
        pos.y *= u_aspect;
    } else {
        pos.x /= u_aspect;
    }
    gl_Position = vec4(pos, 0.0, 1.0);
}
`;

const meshFragShader = `
precision highp float;

varying vec3 v_color;
varying vec2 v_uv;
uniform sampler2D u_texture;
uniform sampler2D u_textureDetail;
uniform float u_time;
uniform float u_volume;
uniform float u_alpha;
uniform float u_mid;
uniform float u_high;
uniform float u_noiseStrength;
uniform float u_layeredCoverStrength;

// 预计算常量
const float INV_255 = 1.0 / 255.0;
const float HALF_INV_255 = 0.5 / 255.0;
const float GRADIENT_NOISE_A = 52.9829189;
const vec2 GRADIENT_NOISE_B = vec2(0.06711056, 0.00583715);

/* Gradient noise from Jorge Jimenez's presentation */
float gradientNoise(in vec2 uv) {
    return fract(GRADIENT_NOISE_A * fract(dot(uv, GRADIENT_NOISE_B)));
}

// 优化的旋转函数
vec2 rot(vec2 v, float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return vec2(c * v.x - s * v.y, s * v.x + c * v.y);
}

// 3D Simplex Noise (Ashima Arts)
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    i = mod289(i);
    vec4 p = permute(permute(permute(
        i.z + vec4(0.0, i1.z, i2.z, 1.0))
        + i.y + vec4(0.0, i1.y, i2.y, 1.0))
        + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);

    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);

    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

void main() {
    float volumeEffect = u_volume * 2.0;
    float timeVolume = u_time + u_volume;

    // 噪声驱动的 UV 扰动
    vec3 noiseCoord = vec3(v_uv * 2.0, u_time * 0.1);
    float noiseX = snoise(noiseCoord) * u_noiseStrength;
    float noiseY = snoise(noiseCoord + vec3(100.0, 0.0, 0.0)) * u_noiseStrength;
    vec2 noiseOffset = vec2(noiseX, noiseY);

    // 中频驱动色彩流动
    float midFlow = u_mid * 0.3;
    vec2 midOffset = vec2(
        sin(u_time * 0.5 + v_uv.x * 3.14159) * midFlow,
        cos(u_time * 0.3 + v_uv.y * 3.14159) * midFlow
    );

    // 高频驱动细节扰动
    float highShimmer = u_high * 0.15;
    float shimmer = snoise(vec3(v_uv * 8.0, u_time * 2.0)) * highShimmer;

    // 抖动
    float dither = INV_255 * gradientNoise(gl_FragCoord.xy) - HALF_INV_255;

    // UV 变换：旋转 + 噪声 + 中频流动
    vec2 centeredUV = v_uv - vec2(0.2);
    vec2 rotatedUV = rot(centeredUV, timeVolume * 2.0);
    vec2 finalUV = rotatedUV * max(0.001, 1.0 - volumeEffect) + vec2(0.5);
    finalUV += noiseOffset + midOffset * 0.1;

    // 底层流体纹理采样
    vec4 baseColor = texture2D(u_texture, finalUV);

    // 上层细节封面采样
    vec2 detailUV = v_uv + noiseOffset * 0.3 + vec2(shimmer);
    vec4 detailColor = texture2D(u_textureDetail, detailUV);

    // 混合底层和上层
    float detailMix = u_layeredCoverStrength * (0.3 + u_mid * 0.2);
    vec3 result = mix(baseColor.rgb, detailColor.rgb, detailMix);

    // 节拍增强：提升饱和度而非压暗
    float saturationBoost = 1.0 + u_volume * 0.4;
    float gray = dot(result, vec3(0.299, 0.587, 0.114));
    result = mix(vec3(gray), result, saturationBoost);

    // 局部亮度增强（节拍越强，中心越亮）
    float centerBright = 1.0 + u_volume * 0.2 * (1.0 - distance(v_uv, vec2(0.5)));
    result *= centerBright;

    // 透明度
    float alphaVolumeFactor = u_alpha * max(0.7, 1.0 - u_volume * 0.2);
    result *= v_color * alphaVolumeFactor;

    result += vec3(dither);

    // 暗角
    float dist = distance(v_uv, vec2(0.5));
    float vignette = smoothstep(0.8, 0.3, dist);
    float mask = 0.6 + vignette * 0.4;
    result *= mask;

    gl_FragColor = vec4(result, alphaVolumeFactor);
}
`;

const quadVertShader = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
    gl_Position = vec4(a_pos, 0.0, 1.0);
    v_uv = a_pos * 0.5 + 0.5;
}
`;

const quadFragShader = `
precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_texture;
uniform float u_alpha;
void main() {
    vec4 color = texture2D(u_texture, v_uv);
    gl_FragColor = vec4(color.rgb, color.a * u_alpha);
}
`;

function easeInOutSine(x: number): number {
  return -(Math.cos(Math.PI * x) - 1) / 2;
}

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

class GLProgram {
  gl: WebGLRenderingContext;
  program: WebGLProgram;
  vertexShader: WebGLShader;
  fragmentShader: WebGLShader;
  attrs: Record<string, number> = {};
  label: string;
  private notFoundUniforms = new Set<string>();

  constructor(
    gl: WebGLRenderingContext,
    vertexShaderSource: string,
    fragmentShaderSource: string,
    label = "unknown",
  ) {
    this.label = label;
    this.gl = gl;
    this.vertexShader = this.createShader(gl.VERTEX_SHADER, vertexShaderSource);
    this.fragmentShader = this.createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
    this.program = this.createProgram();

    const num = gl.getProgramParameter(this.program, gl.ACTIVE_ATTRIBUTES);
    for (let i = 0; i < num; i++) {
      const info = gl.getActiveAttrib(this.program, i);
      if (!info) continue;
      const location = gl.getAttribLocation(this.program, info.name);
      if (location === -1) continue;
      this.attrs[info.name] = location;
    }
  }

  createShader(type: number, source: string): WebGLShader {
    const gl = this.gl;
    const shader = gl.createShader(type);
    if (!shader) throw new Error("Failed to create shader");
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(
        `Failed to compile shader for type ${type} "${this.label}": ${gl.getShaderInfoLog(shader)}`,
      );
    }
    return shader;
  }

  createProgram(): WebGLProgram {
    const gl = this.gl;
    const program = gl.createProgram();
    if (!program) throw new Error("Failed to create program");
    gl.attachShader(program, this.vertexShader);
    gl.attachShader(program, this.fragmentShader);
    gl.linkProgram(program);
    gl.validateProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const errLog = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error(`Failed to link program "${this.label}": ${errLog}`);
    }
    return program;
  }

  use() {
    this.gl.useProgram(this.program);
  }

  private warnUniformNotFound(name: string) {
    if (this.notFoundUniforms.has(name)) return;
    this.notFoundUniforms.add(name);
    console.warn(`Failed to get uniform location for program "${this.label}": ${name}`);
  }

  setUniform1f(name: string, value: number) {
    const gl = this.gl;
    const location = gl.getUniformLocation(this.program, name);
    if (!location) this.warnUniformNotFound(name);
    else gl.uniform1f(location, value);
  }

  setUniform2f(name: string, v1: number, v2: number) {
    const gl = this.gl;
    const location = gl.getUniformLocation(this.program, name);
    if (!location) this.warnUniformNotFound(name);
    else gl.uniform2f(location, v1, v2);
  }

  setUniform1i(name: string, value: number) {
    const gl = this.gl;
    const location = gl.getUniformLocation(this.program, name);
    if (!location) this.warnUniformNotFound(name);
    else gl.uniform1i(location, value);
  }

  dispose() {
    const gl = this.gl;
    gl.deleteShader(this.vertexShader);
    gl.deleteShader(this.fragmentShader);
    gl.deleteProgram(this.program);
  }
}

class Mesh {
  gl: WebGLRenderingContext;
  vertexWidth = 0;
  vertexHeight = 0;
  vertexBuffer: WebGLBuffer;
  indexBuffer: WebGLBuffer;
  vertexData: Float32Array;
  indexData: Uint16Array;
  vertexIndexLength = 0;
  wireFrame = false;
  attrPos: number;
  attrColor: number;
  attrUV: number;

  constructor(gl: WebGLRenderingContext, attrPos: number, attrColor: number, attrUV: number) {
    this.gl = gl;
    this.attrPos = attrPos;
    this.attrColor = attrColor;
    this.attrUV = attrUV;
    const vertexBuf = gl.createBuffer();
    if (!vertexBuf) throw new Error("Failed to create vertex buffer");
    this.vertexBuffer = vertexBuf;
    const indexBuf = gl.createBuffer();
    if (!indexBuf) throw new Error("Failed to create index buffer");
    this.indexBuffer = indexBuf;
    this.bind();
    this.vertexData = new Float32Array(0);
    this.indexData = new Uint16Array(0);
    this.resize(2, 2);
    this.update();
  }

  setWireFrame(enable: boolean) {
    this.wireFrame = enable;
    this.resize(this.vertexWidth, this.vertexHeight);
  }

  setVertexPos(vx: number, vy: number, x: number, y: number) {
    const idx = (vx + vy * this.vertexWidth) * 7;
    if (idx >= this.vertexData.length - 1) return;
    this.vertexData[idx] = x;
    this.vertexData[idx + 1] = y;
  }

  setVertexColor(vx: number, vy: number, r: number, g: number, b: number) {
    const idx = (vx + vy * this.vertexWidth) * 7 + 2;
    if (idx >= this.vertexData.length - 2) return;
    this.vertexData[idx] = r;
    this.vertexData[idx + 1] = g;
    this.vertexData[idx + 2] = b;
  }

  setVertexUV(vx: number, vy: number, x: number, y: number) {
    const idx = (vx + vy * this.vertexWidth) * 7 + 5;
    if (idx >= this.vertexData.length - 1) return;
    this.vertexData[idx] = x;
    this.vertexData[idx + 1] = y;
  }

  setVertexData(vx: number, vy: number, x: number, y: number, r: number, g: number, b: number, u: number, v: number) {
    const idx = (vx + vy * this.vertexWidth) * 7;
    if (idx >= this.vertexData.length - 6) return;
    const data = this.vertexData;
    data[idx] = x;
    data[idx + 1] = y;
    data[idx + 2] = r;
    data[idx + 3] = g;
    data[idx + 4] = b;
    data[idx + 5] = u;
    data[idx + 6] = v;
  }

  getVertexIndexLength() {
    return this.vertexIndexLength;
  }

  resize(vertexWidth: number, vertexHeight: number) {
    this.vertexWidth = vertexWidth;
    this.vertexHeight = vertexHeight;
    const vertexCount = vertexWidth * vertexHeight;
    this.vertexData = new Float32Array(vertexCount * 7);

    const quadsX = vertexWidth - 1;
    const quadsY = vertexHeight - 1;
    const indices = this.wireFrame ? quadsX * quadsY * 8 : quadsX * quadsY * 6;
    this.indexData = new Uint16Array(indices);
    this.vertexIndexLength = indices;

    if (this.wireFrame) {
      let idx = 0;
      for (let y = 0; y < quadsY; y++) {
        for (let x = 0; x < quadsX; x++) {
          const tl = x + y * vertexWidth;
          const tr = tl + 1;
          const bl = tl + vertexWidth;
          const br = bl + 1;
          this.indexData[idx++] = tl;
          this.indexData[idx++] = tr;
          this.indexData[idx++] = tr;
          this.indexData[idx++] = br;
          this.indexData[idx++] = br;
          this.indexData[idx++] = bl;
          this.indexData[idx++] = bl;
          this.indexData[idx++] = tl;
        }
      }
    } else {
      let idx = 0;
      for (let y = 0; y < quadsY; y++) {
        for (let x = 0; x < quadsX; x++) {
          const tl = x + y * vertexWidth;
          const tr = tl + 1;
          const bl = tl + vertexWidth;
          const br = bl + 1;
          this.indexData[idx++] = tl;
          this.indexData[idx++] = tr;
          this.indexData[idx++] = bl;
          this.indexData[idx++] = tr;
          this.indexData[idx++] = br;
          this.indexData[idx++] = bl;
        }
      }
    }
    this.bind();
    this.update();
  }

  bind() {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    const stride = 7 * 4;
    gl.vertexAttribPointer(this.attrPos, 2, gl.FLOAT, false, stride, 0);
    gl.vertexAttribPointer(this.attrColor, 3, gl.FLOAT, false, stride, 2 * 4);
    gl.vertexAttribPointer(this.attrUV, 2, gl.FLOAT, false, stride, 5 * 4);
    gl.enableVertexAttribArray(this.attrPos);
    gl.enableVertexAttribArray(this.attrColor);
    gl.enableVertexAttribArray(this.attrUV);
  }

  update() {
    const gl = this.gl;
    gl.bufferData(gl.ARRAY_BUFFER, this.vertexData, gl.DYNAMIC_DRAW);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indexData, gl.DYNAMIC_DRAW);
  }

  draw() {
    const gl = this.gl;
    gl.drawElements(
      this.wireFrame ? gl.LINES : gl.TRIANGLES,
      this.vertexIndexLength,
      gl.UNSIGNED_SHORT,
      0,
    );
  }

  dispose() {
    const gl = this.gl;
    gl.deleteBuffer(this.vertexBuffer);
    gl.deleteBuffer(this.indexBuffer);
  }
}

class Vec2 {
  constructor(public x = 0, public y = 0) {}
}

class Vec3 {
  constructor(public x = 0, public y = 0, public z = 0) {}
}

class ControlPoint {
  color = new Vec3(1, 1, 1);
  location = new Vec2(0, 0);
  uTangent = new Vec2(0, 0);
  vTangent = new Vec2(0, 0);
  private _uRot = 0;
  private _vRot = 0;
  private _uScale = 1;
  private _vScale = 1;

  set uRot(value: number) {
    this._uRot = value;
    this.updateUTangent();
  }
  get uRot() { return this._uRot; }

  set vRot(value: number) {
    this._vRot = value;
    this.updateVTangent();
  }
  get vRot() { return this._vRot; }

  set uScale(value: number) {
    this._uScale = value;
    this.updateUTangent();
  }
  get uScale() { return this._uScale; }

  set vScale(value: number) {
    this._vScale = value;
    this.updateVTangent();
  }
  get vScale() { return this._vScale; }

  updateUTangent() {
    this.uTangent.x = Math.cos(this._uRot) * this._uScale;
    this.uTangent.y = Math.sin(this._uRot) * this._uScale;
  }

  updateVTangent() {
    this.vTangent.x = -Math.sin(this._vRot) * this._vScale;
    this.vTangent.y = Math.cos(this._vRot) * this._vScale;
  }
}

class BHPMesh extends Mesh {
  private _subDivisions = 10;
  private _controlPoints: ControlPoint[][];

  constructor(gl: WebGLRenderingContext, attrPos: number, attrColor: number, attrUV: number) {
    super(gl, attrPos, attrColor, attrUV);
    this._controlPoints = [];
    this.resizeControlPoints(3, 3);
  }

  resetSubdivition(subDivisions: number) {
    this._subDivisions = subDivisions;
    super.resize(
      (this._controlPoints[0].length - 1) * subDivisions,
      (this._controlPoints.length - 1) * subDivisions,
    );
  }

  resizeControlPoints(width: number, height: number) {
    if (!(width >= 2 && height >= 2))
      throw new Error("Control points must be larger than 2x2");

    this._controlPoints = [];
    for (let y = 0; y < height; y++) {
      const row: ControlPoint[] = [];
      for (let x = 0; x < width; x++) {
        const point = new ControlPoint();
        point.location.x = x / (width - 1) * 2 - 1;
        point.location.y = y / (height - 1) * 2 - 1;
        point.uTangent.x = 2 / (width - 1);
        point.vTangent.y = 2 / (height - 1);
        row.push(point);
      }
      this._controlPoints.push(row);
    }
    this.resetSubdivition(this._subDivisions);
  }

  getControlPoint(x: number, y: number): ControlPoint | undefined {
    return this._controlPoints[y]?.[x];
  }

  updateMesh() {
    const cps = this._controlPoints;
    const cpsH = cps.length;
    const cpsW = cps[0].length;
    const subdiv = this._subDivisions;

    for (let cy = 0; cy < cpsH - 1; cy++) {
      for (let cx = 0; cx < cpsW - 1; cx++) {
        const p00 = cps[cy][cx];
        const p01 = cps[cy][cx + 1];
        const p10 = cps[cy + 1][cx];
        const p11 = cps[cy + 1][cx + 1];

        for (let vy = 0; vy <= subdiv; vy++) {
          const v = vy / subdiv;
          const v2 = v * v;
          const v3 = v2 * v;

          for (let vx = 0; vx <= subdiv; vx++) {
            const u = vx / subdiv;
            const u2 = u * u;
            const u3 = u2 * u;

            // Hermite basis
            const h00 = 2 * u3 - 3 * u2 + 1;
            const h10 = u3 - 2 * u2 + u;
            const h01 = -2 * u3 + 3 * u2;
            const h11 = u3 - u2;

            const g00 = 2 * v3 - 3 * v2 + 1;
            const g10 = v3 - 2 * v2 + v;
            const g01 = -2 * v3 + 3 * v2;
            const g11 = v3 - v2;

            // Position (bilinear Hermite interpolation)
            const posX =
              h00 * g00 * p00.location.x + h01 * g00 * p01.location.x +
              h00 * g01 * p10.location.x + h01 * g01 * p11.location.x +
              h10 * p00.uTangent.x + h11 * p01.uTangent.x;
            const posY =
              h00 * g00 * p00.location.y + h01 * g00 * p01.location.y +
              h00 * g01 * p10.location.y + h01 * g01 * p11.location.y +
              g10 * p00.vTangent.y + g11 * p10.vTangent.y;

            // UV
            const uvX = cx / (cpsW - 1) + u / (cpsW - 1);
            const uvY = 1 - cy / (cpsH - 1) - v / (cpsH - 1);

            // Color (white, actual color from texture)
            const r = 1, g = 1, b = 1;

            const outX = cy * (subdiv + 1) + vy;
            const outY = cx * (subdiv + 1) + vx;
            this.setVertexData(outY, outX, posX, posY, r, g, b, uvX, uvY);
          }
        }
      }
    }
    this.update();
  }
}

class GLTexture {
  gl: WebGLRenderingContext;
  tex: WebGLTexture;

  constructor(gl: WebGLRenderingContext, imageData: TexImageSource) {
    this.gl = gl;
    const albumTexture = gl.createTexture();
    if (!albumTexture) throw new Error("Failed to create texture");
    this.tex = albumTexture;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, albumTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imageData);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
  }

  bind() {
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.tex);
  }

  dispose() {
    this.gl.deleteTexture(this.tex);
  }
}

function createOffscreenCanvas(width: number, height: number): OffscreenCanvas | HTMLCanvasElement {
  if ("OffscreenCanvas" in window) return new OffscreenCanvas(width, height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

interface MeshState {
  mesh: BHPMesh;
  texture: GLTexture;
  detailTexture: GLTexture;
  alpha: number;
}

export class EnhancedMeshGradientRenderer {
  private canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext;
  private lastFrameTime = 0;
  private frameTime = 0;
  private lastTickTime = 0;
  private _volume = 0;
  private smoothedVolume = 0;
  private _mid = 0;
  private smoothedMid = 0;
  private _high = 0;
  private smoothedHigh = 0;
  private _noiseStrength = 0.03;
  private _layeredCoverStrength = 0.5;
  private tickHandle = 0;
  private maxFPS = 60;
  private paused = false;
  private staticMode = false;
  private mainProgram: GLProgram;
  private quadProgram: GLProgram;
  private quadBuffer: WebGLBuffer;
  private fbo: WebGLFramebuffer | null = null;
  private fboTexture: WebGLTexture | null = null;
  private reduceImageSizeCanvas = createOffscreenCanvas(32, 32);
  private detailImageSizeCanvas = createOffscreenCanvas(128, 128);
  private targetSize = new Vec2(0, 0);
  private currentSize = new Vec2(0, 0);
  private isNoCover = true;
  private meshStates: MeshState[] = [];
  private _disposed = false;
  private flowSpeed = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const gl = canvas.getContext("webgl", { antialias: true });
    if (!gl) throw new Error("WebGL not supported");
    this.gl = gl;

    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    this.mainProgram = new GLProgram(gl, meshVertShader, meshFragShader, "enhanced-main");
    this.quadProgram = new GLProgram(gl, quadVertShader, quadFragShader, "enhanced-quad");

    const quadBuffer = gl.createBuffer();
    if (!quadBuffer) throw new Error("Failed to create quad buffer");
    this.quadBuffer = quadBuffer;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );

    this.requestTick();
  }

  // 公共 API
  setLowFreqVolume(volume: number) {
    this._volume = volume / 10;
  }

  setMidEnergy(energy: number) {
    this._mid = energy;
  }

  setHighEnergy(energy: number) {
    this._high = energy;
  }

  setNoiseStrength(strength: number) {
    this._noiseStrength = strength;
  }

  setLayeredCoverStrength(strength: number) {
    this._layeredCoverStrength = strength;
  }

  setFPS(fps: number) {
    this.maxFPS = fps;
  }

  setFlowSpeed(speed: number) {
    this.flowSpeed = speed;
  }

  setHasLyric(_has: boolean) {
    // reserved for future use
  }

  setStaticMode(enable: boolean) {
    this.staticMode = enable;
    this.lastFrameTime = performance.now();
    this.requestTick();
  }

  pause() {
    if (this.tickHandle) {
      cancelAnimationFrame(this.tickHandle);
      this.tickHandle = 0;
    }
    this.paused = true;
  }

  resume() {
    this.paused = false;
    this.requestTick();
  }

  getElement() {
    return this.canvas;
  }

  async setAlbum(albumSource: string) {
    if (!albumSource || albumSource.trim().length === 0) {
      this.isNoCover = true;
      return;
    }

    let res: HTMLImageElement | null = null;
    let remainRetryTimes = 3;

    while (!res && remainRetryTimes > 0) {
      try {
        res = await this.loadImage(albumSource);
      } catch {
        remainRetryTimes--;
      }
    }

    if (!res) {
      this.isNoCover = true;
      return;
    }

    this.isNoCover = false;

    // 处理底层纹理 (32x32)
    const baseTexture = this.processBaseTexture(res);
    // 处理细节纹理 (128x128)
    const detailTexture = this.processDetailTexture(res);

    // 创建网格
    const mesh = this.createMesh();

    this.meshStates.push({
      mesh,
      texture: baseTexture,
      detailTexture,
      alpha: 0,
    });
  }

  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  private processBaseTexture(img: HTMLImageElement): GLTexture {
    const c = this.reduceImageSizeCanvas;
    const ctx = c.getContext("2d", { willReadFrequently: true })!;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);

    const imageData = ctx.getImageData(0, 0, c.width, c.height);
    const pixels = imageData.data;

    // 像素级增强
    for (let i = 0; i < pixels.length; i += 4) {
      let r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];

      // 对比度拉伸
      r = (r - 128) * 0.4 + 128;
      g = (g - 128) * 0.4 + 128;
      b = (b - 128) * 0.4 + 128;

      // 饱和度提升
      const gray = 0.3 * r + 0.59 * g + 0.11 * b;
      r = gray * -2 + r * 3;
      g = gray * -2 + g * 3;
      b = gray * -2 + b * 3;

      // 再对比度
      r = (r - 128) * 1.7 + 128;
      g = (g - 128) * 1.7 + 128;
      b = (b - 128) * 1.7 + 128;

      // 压暗
      r *= 0.75;
      g *= 0.75;
      b *= 0.75;

      pixels[i] = Math.max(0, Math.min(255, r));
      pixels[i + 1] = Math.max(0, Math.min(255, g));
      pixels[i + 2] = Math.max(0, Math.min(255, b));
    }

    ctx.putImageData(imageData, 0, 0);

    return new GLTexture(this.gl, c as unknown as TexImageSource);
  }

  private processDetailTexture(img: HTMLImageElement): GLTexture {
    const c = this.detailImageSizeCanvas;
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);

    // 轻微增强细节层
    const imageData = ctx.getImageData(0, 0, c.width, c.height);
    const pixels = imageData.data;

    for (let i = 0; i < pixels.length; i += 4) {
      let r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];

      // 轻微对比度
      r = (r - 128) * 1.2 + 128;
      g = (g - 128) * 1.2 + 128;
      b = (b - 128) * 1.2 + 128;

      // 轻微饱和度
      const gray = 0.3 * r + 0.59 * g + 0.11 * b;
      r = gray * -0.5 + r * 1.5;
      g = gray * -0.5 + g * 1.5;
      b = gray * -0.5 + b * 1.5;

      pixels[i] = Math.max(0, Math.min(255, r));
      pixels[i + 1] = Math.max(0, Math.min(255, g));
      pixels[i + 2] = Math.max(0, Math.min(255, b));
    }

    ctx.putImageData(imageData, 0, 0);

    return new GLTexture(this.gl, c as unknown as TexImageSource);
  }

  private createMesh(): BHPMesh {
    const gl = this.gl;
    const mesh = new BHPMesh(
      gl,
      this.mainProgram.attrs.a_pos,
      this.mainProgram.attrs.a_color,
      this.mainProgram.attrs.a_uv,
    );

    // 随机选择 5x5 或 6x6 网格
    const use6x6 = Math.random() < 0.3;
    const size = use6x6 ? 6 : 5;
    mesh.resizeControlPoints(size, size);
    mesh.resetSubdivition(50);

    // 随机扰动控制点
    this.randomizeControlPoints(mesh, size);

    mesh.updateMesh();
    return mesh;
  }

  private randomizeControlPoints(mesh: BHPMesh, size: number) {
    const variation = 0.15 + Math.random() * 0.1;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const cp = mesh.getControlPoint(x, y);
        if (!cp) continue;

        // 边缘控制点不动
        const isEdge = x === 0 || x === size - 1 || y === 0 || y === size - 1;
        if (isEdge) continue;

        // 随机偏移
        const offsetX = (Math.random() - 0.5) * variation;
        const offsetY = (Math.random() - 0.5) * variation;
        cp.location.x += offsetX;
        cp.location.y += offsetY;

        // 随机旋转
        cp.uRot = Math.random() * Math.PI * 2;
        cp.vRot = Math.random() * Math.PI * 2;

        // 随机缩放
        cp.uScale = 0.8 + Math.random() * 0.4;
        cp.vScale = 0.8 + Math.random() * 0.4;
      }
    }
  }

  private onTick = (tickTime: number) => {
    this.tickHandle = 0;
    if (this.paused || this._disposed) return;

    const interval = 1000 / this.maxFPS;
    const delta = tickTime - this.lastTickTime;
    if (delta < interval) {
      this.requestTick();
      return;
    }

    if (Number.isNaN(this.lastFrameTime)) this.lastFrameTime = tickTime;
    const frameDelta = tickTime - this.lastFrameTime;
    this.lastFrameTime = tickTime;
    this.lastTickTime = tickTime - (delta % interval);
    this.frameTime += frameDelta * this.flowSpeed;

    if (!(this.onRedraw(this.frameTime, frameDelta) && this.staticMode)) {
      this.requestTick();
    } else if (this.staticMode) {
      this.lastFrameTime = NaN;
    }
  };

  private requestTick() {
    if (this._disposed) return;
    if (this.tickHandle === 0) {
      this.tickHandle = requestAnimationFrame(this.onTick);
    }
  }

  private checkIfResize() {
    const tW = this.targetSize.x;
    const tH = this.targetSize.y;
    const cW = this.currentSize.x;
    const cH = this.currentSize.y;

    if (tW !== cW || tH !== cH) {
      const gl = this.gl;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, tW, tH);
      this.currentSize.x = tW;
      this.currentSize.y = tH;
      if (tW > 0 && tH > 0) this.updateFBO(tW, tH);
    }
  }

  private updateFBO(width: number, height: number) {
    const gl = this.gl;
    if (this.fbo) gl.deleteFramebuffer(this.fbo);
    if (this.fboTexture) gl.deleteTexture(this.fboTexture);

    this.fboTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.fboTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this.fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.fboTexture, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  private onRedraw(tickTime: number, delta: number): boolean {
    const latestMeshState = this.meshStates[this.meshStates.length - 1];
    let canBeStatic = false;
    const deltaFactor = delta / 500;

    if (latestMeshState) {
      latestMeshState.mesh.bind();

      if (this.isNoCover) {
        let hasActiveStates = false;
        for (let i = this.meshStates.length - 1; i >= 0; i--) {
          const state = this.meshStates[i];
          if (state.alpha <= -0.1) {
            state.mesh.dispose();
            state.texture.dispose();
            state.detailTexture.dispose();
            this.meshStates.splice(i, 1);
          } else {
            state.alpha = Math.max(-0.1, state.alpha - deltaFactor);
            hasActiveStates = true;
          }
        }
        canBeStatic = !hasActiveStates;
      } else {
        if (latestMeshState.alpha >= 1.1) {
          const deleted = this.meshStates.splice(0, this.meshStates.length - 1);
          for (const state of deleted) {
            state.mesh.dispose();
            state.texture.dispose();
            state.detailTexture.dispose();
          }
        } else {
          latestMeshState.alpha = Math.min(1.1, latestMeshState.alpha + deltaFactor);
        }
        canBeStatic = this.meshStates.length === 1 && latestMeshState.alpha >= 1.1;
      }
    }

    const gl = this.gl;
    this.checkIfResize();
    if (!this.fbo) return canBeStatic;

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const lerpFactor = Math.min(1, delta / 100);
    this.smoothedVolume += (this._volume - this.smoothedVolume) * lerpFactor;
    this.smoothedMid += (this._mid - this.smoothedMid) * lerpFactor;
    this.smoothedHigh += (this._high - this.smoothedHigh) * lerpFactor;

    for (const state of this.meshStates) {
      // 渲染到 FBO
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
      gl.disable(gl.BLEND);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      this.mainProgram.use();
      gl.activeTexture(gl.TEXTURE0);
      state.texture.bind();
      this.mainProgram.setUniform1i("u_texture", 0);

      // 绑定细节纹理到纹理单元 1
      gl.activeTexture(gl.TEXTURE1);
      state.detailTexture.bind();
      this.mainProgram.setUniform1i("u_textureDetail", 1);

      this.mainProgram.setUniform1f("u_time", tickTime / 10000);
      this.mainProgram.setUniform1f("u_aspect", this.canvas.width / this.canvas.height);
      this.mainProgram.setUniform1f("u_volume", this.smoothedVolume);
      this.mainProgram.setUniform1f("u_mid", this.smoothedMid);
      this.mainProgram.setUniform1f("u_high", this.smoothedHigh);
      this.mainProgram.setUniform1f("u_noiseStrength", this._noiseStrength);
      this.mainProgram.setUniform1f("u_layeredCoverStrength", this._layeredCoverStrength);
      this.mainProgram.setUniform1f("u_alpha", 1);

      state.mesh.bind();
      state.mesh.draw();

      // 渲染到屏幕
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.enable(gl.BLEND);
      gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

      this.quadProgram.use();
      this.quadProgram.setUniform1i("u_texture", 0);
      this.quadProgram.setUniform1f("u_alpha", easeInOutSine(clamp01(state.alpha)));

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.fboTexture);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);

      const a_pos = this.quadProgram.attrs.a_pos;
      gl.vertexAttribPointer(a_pos, 2, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(a_pos);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.disableVertexAttribArray(a_pos);
    }

    gl.flush();
    return canBeStatic;
  }

  onResize(width: number, height: number) {
    this.targetSize.x = Math.ceil(width);
    this.targetSize.y = Math.ceil(height);
    this.requestTick();
  }

  setRenderScale(scale: number) {
    const dpr = window.devicePixelRatio || 1;
    const width = Math.ceil(this.canvas.clientWidth * dpr * scale);
    const height = Math.ceil(this.canvas.clientHeight * dpr * scale);
    this.canvas.width = width;
    this.canvas.height = height;
    this.onResize(width, height);
  }

  dispose() {
    this._disposed = true;
    if (this.tickHandle) {
      cancelAnimationFrame(this.tickHandle);
      this.tickHandle = 0;
    }
    for (const state of this.meshStates) {
      state.mesh.dispose();
      state.texture.dispose();
      state.detailTexture.dispose();
    }
    this.meshStates = [];
    this.mainProgram.dispose();
    this.quadProgram.dispose();
    this.gl.deleteBuffer(this.quadBuffer);
    if (this.fbo) this.gl.deleteFramebuffer(this.fbo);
    if (this.fboTexture) this.gl.deleteTexture(this.fboTexture);
  }
}
