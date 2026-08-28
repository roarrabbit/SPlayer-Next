// eslint-disable-next-line @typescript-eslint/ban-ts-comment -- 反向移植产物，暂无法补全类型
// @ts-nocheck
// SPlayer-Next 1.0.1 流体背景渲染器（MeshGradientRenderer）。
// 从 1.0.1 构建产物反向移植，用于还原 1.0.2 之前的干净流体背景效果。
// 该模块为已验证可用的遗留实现，整体以 @ts-nocheck 跳过严格类型检查。

// ===== 以下为 1.0.1 依赖的 gl-matrix 子集（Mat4/Vec3/Vec4 + 常量），从 1.0.1 bundle 反向移植 =====
const EPSILON = 1e-6;
const IDENTITY_4X4 = new Float32Array([
  1,
  0,
  0,
  0,
  0,
  1,
  0,
  0,
  0,
  0,
  1,
  0,
  0,
  0,
  0,
  1
]);
class Mat4 extends Float32Array {
  /**
   * The number of bytes in a {@link Mat4}.
   */
  static BYTE_LENGTH = 16 * Float32Array.BYTES_PER_ELEMENT;
  /**
   * Create a {@link Mat4}.
   */
  constructor(...values) {
    switch (values.length) {
      case 16:
        super(values);
        break;
      case 2:
        super(values[0], values[1], 16);
        break;
      case 1: {
        const v2 = values[0];
        if (typeof v2 === "number") {
          super([
            v2,
            v2,
            v2,
            v2,
            v2,
            v2,
            v2,
            v2,
            v2,
            v2,
            v2,
            v2,
            v2,
            v2,
            v2,
            v2
          ]);
        } else {
          super(v2, 0, 16);
        }
        break;
      }
      default:
        super(IDENTITY_4X4);
        break;
    }
  }
  //============
  // Attributes
  //============
  /**
   * A string representation of `this`
   * Equivalent to `Mat4.str(this);`
   */
  get str() {
    return Mat4.str(this);
  }
  //===================
  // Instance methods
  //===================
  /**
   * Copy the values from another {@link Mat4} into `this`.
   *
   * @param a the source vector
   * @returns `this`
   */
  copy(a2) {
    this.set(a2);
    return this;
  }
  /**
   * Set `this` to the identity matrix
   * Equivalent to Mat4.identity(this)
   *
   * @returns `this`
   */
  identity() {
    this.set(IDENTITY_4X4);
    return this;
  }
  /**
   * Multiplies this {@link Mat4} against another one
   * Equivalent to `Mat4.multiply(this, this, b);`
   *
   * @param out - The receiving Matrix
   * @param a - The first operand
   * @param b - The second operand
   * @returns `this`
   */
  multiply(b2) {
    return Mat4.multiply(this, this, b2);
  }
  /**
   * Alias for {@link Mat4.multiply}
   */
  mul(_b2) {
    return this;
  }
  /**
   * Transpose this {@link Mat4}
   * Equivalent to `Mat4.transpose(this, this);`
   *
   * @returns `this`
   */
  transpose() {
    return Mat4.transpose(this, this);
  }
  /**
   * Inverts this {@link Mat4}
   * Equivalent to `Mat4.invert(this, this);`
   *
   * @returns `this`
   */
  invert() {
    return Mat4.invert(this, this);
  }
  /**
   * Translate this {@link Mat4} by the given vector
   * Equivalent to `Mat4.translate(this, this, v);`
   *
   * @param v - The {@link Vec3} to translate by
   * @returns `this`
   */
  translate(v2) {
    return Mat4.translate(this, this, v2);
  }
  /**
   * Rotates this {@link Mat4} by the given angle around the given axis
   * Equivalent to `Mat4.rotate(this, this, rad, axis);`
   *
   * @param rad - the angle to rotate the matrix by
   * @param axis - the axis to rotate around
   * @returns `out`
   */
  rotate(rad, axis) {
    return Mat4.rotate(this, this, rad, axis);
  }
  /**
   * Scales this {@link Mat4} by the dimensions in the given vec3 not using vectorization
   * Equivalent to `Mat4.scale(this, this, v);`
   *
   * @param v - The {@link Vec3} to scale the matrix by
   * @returns `this`
   */
  scale(v2) {
    return Mat4.scale(this, this, v2);
  }
  /**
   * Rotates this {@link Mat4} by the given angle around the X axis
   * Equivalent to `Mat4.rotateX(this, this, rad);`
   *
   * @param rad - the angle to rotate the matrix by
   * @returns `this`
   */
  rotateX(rad) {
    return Mat4.rotateX(this, this, rad);
  }
  /**
   * Rotates this {@link Mat4} by the given angle around the Y axis
   * Equivalent to `Mat4.rotateY(this, this, rad);`
   *
   * @param rad - the angle to rotate the matrix by
   * @returns `this`
   */
  rotateY(rad) {
    return Mat4.rotateY(this, this, rad);
  }
  /**
   * Rotates this {@link Mat4} by the given angle around the Z axis
   * Equivalent to `Mat4.rotateZ(this, this, rad);`
   *
   * @param rad - the angle to rotate the matrix by
   * @returns `this`
   */
  rotateZ(rad) {
    return Mat4.rotateZ(this, this, rad);
  }
  /**
   * Generates a perspective projection matrix with the given bounds.
   * The near/far clip planes correspond to a normalized device coordinate Z range of [-1, 1],
   * which matches WebGL/OpenGL's clip volume.
   * Passing null/undefined/no value for far will generate infinite projection matrix.
   * Equivalent to `Mat4.perspectiveNO(this, fovy, aspect, near, far);`
   *
   * @param fovy - Vertical field of view in radians
   * @param aspect - Aspect ratio. typically viewport width/height
   * @param near - Near bound of the frustum
   * @param far - Far bound of the frustum, can be null or Infinity
   * @returns `this`
   */
  perspectiveNO(fovy, aspect, near, far) {
    return Mat4.perspectiveNO(this, fovy, aspect, near, far);
  }
  /**
   * Generates a perspective projection matrix suitable for WebGPU with the given bounds.
   * The near/far clip planes correspond to a normalized device coordinate Z range of [0, 1],
   * which matches WebGPU/Vulkan/DirectX/Metal's clip volume.
   * Passing null/undefined/no value for far will generate infinite projection matrix.
   * Equivalent to `Mat4.perspectiveZO(this, fovy, aspect, near, far);`
   *
   * @param fovy - Vertical field of view in radians
   * @param aspect - Aspect ratio. typically viewport width/height
   * @param near - Near bound of the frustum
   * @param far - Far bound of the frustum, can be null or Infinity
   * @returns `this`
   */
  perspectiveZO(fovy, aspect, near, far) {
    return Mat4.perspectiveZO(this, fovy, aspect, near, far);
  }
  /**
   * Generates a orthogonal projection matrix with the given bounds.
   * The near/far clip planes correspond to a normalized device coordinate Z range of [-1, 1],
   * which matches WebGL/OpenGL's clip volume.
   * Equivalent to `Mat4.orthoNO(this, left, right, bottom, top, near, far);`
   *
   * @param left - Left bound of the frustum
   * @param right - Right bound of the frustum
   * @param bottom - Bottom bound of the frustum
   * @param top - Top bound of the frustum
   * @param near - Near bound of the frustum
   * @param far - Far bound of the frustum
   * @returns `this`
   */
  orthoNO(left, right, bottom, top, near, far) {
    return Mat4.orthoNO(this, left, right, bottom, top, near, far);
  }
  /**
   * Generates a orthogonal projection matrix with the given bounds.
   * The near/far clip planes correspond to a normalized device coordinate Z range of [0, 1],
   * which matches WebGPU/Vulkan/DirectX/Metal's clip volume.
   * Equivalent to `Mat4.orthoZO(this, left, right, bottom, top, near, far);`
   *
   * @param left - Left bound of the frustum
   * @param right - Right bound of the frustum
   * @param bottom - Bottom bound of the frustum
   * @param top - Top bound of the frustum
   * @param near - Near bound of the frustum
   * @param far - Far bound of the frustum
   * @returns `this`
   */
  orthoZO(left, right, bottom, top, near, far) {
    return Mat4.orthoZO(this, left, right, bottom, top, near, far);
  }
  //================
  // Static methods
  //================
  /**
   * Creates a new, identity {@link Mat4}
   * @category Static
   *
   * @returns A new {@link Mat4}
   */
  static create() {
    return new Mat4();
  }
  /**
   * Creates a new {@link Mat4} initialized with values from an existing matrix
   * @category Static
   *
   * @param a - Matrix to clone
   * @returns A new {@link Mat4}
   */
  static clone(a2) {
    return new Mat4(a2);
  }
  /**
   * Copy the values from one {@link Mat4} to another
   * @category Static
   *
   * @param out - The receiving Matrix
   * @param a - Matrix to copy
   * @returns `out`
   */
  static copy(out, a2) {
    out[0] = a2[0];
    out[1] = a2[1];
    out[2] = a2[2];
    out[3] = a2[3];
    out[4] = a2[4];
    out[5] = a2[5];
    out[6] = a2[6];
    out[7] = a2[7];
    out[8] = a2[8];
    out[9] = a2[9];
    out[10] = a2[10];
    out[11] = a2[11];
    out[12] = a2[12];
    out[13] = a2[13];
    out[14] = a2[14];
    out[15] = a2[15];
    return out;
  }
  /**
   * Create a new mat4 with the given values
   * @category Static
   *
   * @param values - Matrix components
   * @returns A new {@link Mat4}
   */
  static fromValues(...values) {
    return new Mat4(...values);
  }
  /**
   * Set the components of a mat4 to the given values
   * @category Static
   *
   * @param out - The receiving matrix
   * @param values - Matrix components
   * @returns `out`
   */
  static set(out, ...values) {
    out[0] = values[0];
    out[1] = values[1];
    out[2] = values[2];
    out[3] = values[3];
    out[4] = values[4];
    out[5] = values[5];
    out[6] = values[6];
    out[7] = values[7];
    out[8] = values[8];
    out[9] = values[9];
    out[10] = values[10];
    out[11] = values[11];
    out[12] = values[12];
    out[13] = values[13];
    out[14] = values[14];
    out[15] = values[15];
    return out;
  }
  /**
   * Set a {@link Mat4} to the identity matrix
   * @category Static
   *
   * @param out - The receiving Matrix
   * @returns `out`
   */
  static identity(out) {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = 1;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 1;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
  }
  /**
   * Transpose the values of a {@link Mat4}
   * @category Static
   *
   * @param out - the receiving matrix
   * @param a - the source matrix
   * @returns `out`
   */
  static transpose(out, a2) {
    if (out === a2) {
      const a01 = a2[1], a02 = a2[2], a03 = a2[3];
      const a12 = a2[6], a13 = a2[7];
      const a23 = a2[11];
      out[1] = a2[4];
      out[2] = a2[8];
      out[3] = a2[12];
      out[4] = a01;
      out[6] = a2[9];
      out[7] = a2[13];
      out[8] = a02;
      out[9] = a12;
      out[11] = a2[14];
      out[12] = a03;
      out[13] = a13;
      out[14] = a23;
    } else {
      out[0] = a2[0];
      out[1] = a2[4];
      out[2] = a2[8];
      out[3] = a2[12];
      out[4] = a2[1];
      out[5] = a2[5];
      out[6] = a2[9];
      out[7] = a2[13];
      out[8] = a2[2];
      out[9] = a2[6];
      out[10] = a2[10];
      out[11] = a2[14];
      out[12] = a2[3];
      out[13] = a2[7];
      out[14] = a2[11];
      out[15] = a2[15];
    }
    return out;
  }
  /**
   * Inverts a {@link Mat4}
   * @category Static
   *
   * @param out - the receiving matrix
   * @param a - the source matrix
   * @returns `out` or `null` if the matrix is not invertable
   */
  static invert(out, a2) {
    const a00 = a2[0], a01 = a2[1], a02 = a2[2], a03 = a2[3];
    const a10 = a2[4], a11 = a2[5], a12 = a2[6], a13 = a2[7];
    const a20 = a2[8], a21 = a2[9], a22 = a2[10], a23 = a2[11];
    const a30 = a2[12], a31 = a2[13], a32 = a2[14], a33 = a2[15];
    const b00 = a00 * a11 - a01 * a10;
    const b01 = a00 * a12 - a02 * a10;
    const b02 = a00 * a13 - a03 * a10;
    const b03 = a01 * a12 - a02 * a11;
    const b04 = a01 * a13 - a03 * a11;
    const b05 = a02 * a13 - a03 * a12;
    const b06 = a20 * a31 - a21 * a30;
    const b07 = a20 * a32 - a22 * a30;
    const b08 = a20 * a33 - a23 * a30;
    const b09 = a21 * a32 - a22 * a31;
    const b10 = a21 * a33 - a23 * a31;
    const b11 = a22 * a33 - a23 * a32;
    let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
    if (!det) {
      return null;
    }
    det = 1 / det;
    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
    out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
    out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
    out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
    out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
    out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
    out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
    return out;
  }
  /**
   * Calculates the adjugate of a {@link Mat4}
   * @category Static
   *
   * @param out - the receiving matrix
   * @param a - the source matrix
   * @returns `out`
   */
  static adjoint(out, a2) {
    const a00 = a2[0], a01 = a2[1], a02 = a2[2], a03 = a2[3];
    const a10 = a2[4], a11 = a2[5], a12 = a2[6], a13 = a2[7];
    const a20 = a2[8], a21 = a2[9], a22 = a2[10], a23 = a2[11];
    const a30 = a2[12], a31 = a2[13], a32 = a2[14], a33 = a2[15];
    const b00 = a00 * a11 - a01 * a10;
    const b01 = a00 * a12 - a02 * a10;
    const b02 = a00 * a13 - a03 * a10;
    const b03 = a01 * a12 - a02 * a11;
    const b04 = a01 * a13 - a03 * a11;
    const b05 = a02 * a13 - a03 * a12;
    const b06 = a20 * a31 - a21 * a30;
    const b07 = a20 * a32 - a22 * a30;
    const b08 = a20 * a33 - a23 * a30;
    const b09 = a21 * a32 - a22 * a31;
    const b10 = a21 * a33 - a23 * a31;
    const b11 = a22 * a33 - a23 * a32;
    out[0] = a11 * b11 - a12 * b10 + a13 * b09;
    out[1] = a02 * b10 - a01 * b11 - a03 * b09;
    out[2] = a31 * b05 - a32 * b04 + a33 * b03;
    out[3] = a22 * b04 - a21 * b05 - a23 * b03;
    out[4] = a12 * b08 - a10 * b11 - a13 * b07;
    out[5] = a00 * b11 - a02 * b08 + a03 * b07;
    out[6] = a32 * b02 - a30 * b05 - a33 * b01;
    out[7] = a20 * b05 - a22 * b02 + a23 * b01;
    out[8] = a10 * b10 - a11 * b08 + a13 * b06;
    out[9] = a01 * b08 - a00 * b10 - a03 * b06;
    out[10] = a30 * b04 - a31 * b02 + a33 * b00;
    out[11] = a21 * b02 - a20 * b04 - a23 * b00;
    out[12] = a11 * b07 - a10 * b09 - a12 * b06;
    out[13] = a00 * b09 - a01 * b07 + a02 * b06;
    out[14] = a31 * b01 - a30 * b03 - a32 * b00;
    out[15] = a20 * b03 - a21 * b01 + a22 * b00;
    return out;
  }
  /**
   * Calculates the determinant of a {@link Mat4}
   * @category Static
   *
   * @param a - the source matrix
   * @returns determinant of a
   */
  static determinant(a2) {
    const a00 = a2[0], a01 = a2[1], a02 = a2[2], a03 = a2[3];
    const a10 = a2[4], a11 = a2[5], a12 = a2[6], a13 = a2[7];
    const a20 = a2[8], a21 = a2[9], a22 = a2[10], a23 = a2[11];
    const a30 = a2[12], a31 = a2[13], a32 = a2[14], a33 = a2[15];
    const b0 = a00 * a11 - a01 * a10;
    const b1 = a00 * a12 - a02 * a10;
    const b2 = a01 * a12 - a02 * a11;
    const b3 = a20 * a31 - a21 * a30;
    const b4 = a20 * a32 - a22 * a30;
    const b5 = a21 * a32 - a22 * a31;
    const b6 = a00 * b5 - a01 * b4 + a02 * b3;
    const b7 = a10 * b5 - a11 * b4 + a12 * b3;
    const b8 = a20 * b2 - a21 * b1 + a22 * b0;
    const b9 = a30 * b2 - a31 * b1 + a32 * b0;
    return a13 * b6 - a03 * b7 + a33 * b8 - a23 * b9;
  }
  /**
   * Multiplies two {@link Mat4}s
   * @category Static
   *
   * @param out - The receiving Matrix
   * @param a - The first operand
   * @param b - The second operand
   * @returns `out`
   */
  static multiply(out, a2, b2) {
    const a00 = a2[0];
    const a01 = a2[1];
    const a02 = a2[2];
    const a03 = a2[3];
    const a10 = a2[4];
    const a11 = a2[5];
    const a12 = a2[6];
    const a13 = a2[7];
    const a20 = a2[8];
    const a21 = a2[9];
    const a22 = a2[10];
    const a23 = a2[11];
    const a30 = a2[12];
    const a31 = a2[13];
    const a32 = a2[14];
    const a33 = a2[15];
    let b0 = b2[0];
    let b1 = b2[1];
    let b22 = b2[2];
    let b3 = b2[3];
    out[0] = b0 * a00 + b1 * a10 + b22 * a20 + b3 * a30;
    out[1] = b0 * a01 + b1 * a11 + b22 * a21 + b3 * a31;
    out[2] = b0 * a02 + b1 * a12 + b22 * a22 + b3 * a32;
    out[3] = b0 * a03 + b1 * a13 + b22 * a23 + b3 * a33;
    b0 = b2[4];
    b1 = b2[5];
    b22 = b2[6];
    b3 = b2[7];
    out[4] = b0 * a00 + b1 * a10 + b22 * a20 + b3 * a30;
    out[5] = b0 * a01 + b1 * a11 + b22 * a21 + b3 * a31;
    out[6] = b0 * a02 + b1 * a12 + b22 * a22 + b3 * a32;
    out[7] = b0 * a03 + b1 * a13 + b22 * a23 + b3 * a33;
    b0 = b2[8];
    b1 = b2[9];
    b22 = b2[10];
    b3 = b2[11];
    out[8] = b0 * a00 + b1 * a10 + b22 * a20 + b3 * a30;
    out[9] = b0 * a01 + b1 * a11 + b22 * a21 + b3 * a31;
    out[10] = b0 * a02 + b1 * a12 + b22 * a22 + b3 * a32;
    out[11] = b0 * a03 + b1 * a13 + b22 * a23 + b3 * a33;
    b0 = b2[12];
    b1 = b2[13];
    b22 = b2[14];
    b3 = b2[15];
    out[12] = b0 * a00 + b1 * a10 + b22 * a20 + b3 * a30;
    out[13] = b0 * a01 + b1 * a11 + b22 * a21 + b3 * a31;
    out[14] = b0 * a02 + b1 * a12 + b22 * a22 + b3 * a32;
    out[15] = b0 * a03 + b1 * a13 + b22 * a23 + b3 * a33;
    return out;
  }
  /**
   * Alias for {@link Mat4.multiply}
   * @category Static
   */
  static mul(out, _a2, _b2) {
    return out;
  }
  /**
   * Translate a {@link Mat4} by the given vector
   * @category Static
   *
   * @param out - the receiving matrix
   * @param a - the matrix to translate
   * @param v - vector to translate by
   * @returns `out`
   */
  static translate(out, a2, v2) {
    const x2 = v2[0];
    const y2 = v2[1];
    const z = v2[2];
    if (a2 === out) {
      out[12] = a2[0] * x2 + a2[4] * y2 + a2[8] * z + a2[12];
      out[13] = a2[1] * x2 + a2[5] * y2 + a2[9] * z + a2[13];
      out[14] = a2[2] * x2 + a2[6] * y2 + a2[10] * z + a2[14];
      out[15] = a2[3] * x2 + a2[7] * y2 + a2[11] * z + a2[15];
    } else {
      const a00 = a2[0];
      const a01 = a2[1];
      const a02 = a2[2];
      const a03 = a2[3];
      const a10 = a2[4];
      const a11 = a2[5];
      const a12 = a2[6];
      const a13 = a2[7];
      const a20 = a2[8];
      const a21 = a2[9];
      const a22 = a2[10];
      const a23 = a2[11];
      out[0] = a00;
      out[1] = a01;
      out[2] = a02;
      out[3] = a03;
      out[4] = a10;
      out[5] = a11;
      out[6] = a12;
      out[7] = a13;
      out[8] = a20;
      out[9] = a21;
      out[10] = a22;
      out[11] = a23;
      out[12] = a00 * x2 + a10 * y2 + a20 * z + a2[12];
      out[13] = a01 * x2 + a11 * y2 + a21 * z + a2[13];
      out[14] = a02 * x2 + a12 * y2 + a22 * z + a2[14];
      out[15] = a03 * x2 + a13 * y2 + a23 * z + a2[15];
    }
    return out;
  }
  /**
   * Scales the {@link Mat4} by the dimensions in the given {@link Vec3} not using vectorization
   * @category Static
   *
   * @param out - the receiving matrix
   * @param a - the matrix to scale
   * @param v - the {@link Vec3} to scale the matrix by
   * @returns `out`
   **/
  static scale(out, a2, v2) {
    const x2 = v2[0];
    const y2 = v2[1];
    const z = v2[2];
    out[0] = a2[0] * x2;
    out[1] = a2[1] * x2;
    out[2] = a2[2] * x2;
    out[3] = a2[3] * x2;
    out[4] = a2[4] * y2;
    out[5] = a2[5] * y2;
    out[6] = a2[6] * y2;
    out[7] = a2[7] * y2;
    out[8] = a2[8] * z;
    out[9] = a2[9] * z;
    out[10] = a2[10] * z;
    out[11] = a2[11] * z;
    out[12] = a2[12];
    out[13] = a2[13];
    out[14] = a2[14];
    out[15] = a2[15];
    return out;
  }
  /**
   * Rotates a {@link Mat4} by the given angle around the given axis
   * @category Static
   *
   * @param out - the receiving matrix
   * @param a - the matrix to rotate
   * @param rad - the angle to rotate the matrix by
   * @param axis - the axis to rotate around
   * @returns `out` or `null` if axis has a length of 0
   */
  static rotate(out, a2, rad, axis) {
    let x2 = axis[0];
    let y2 = axis[1];
    let z = axis[2];
    let len = Math.sqrt(x2 * x2 + y2 * y2 + z * z);
    if (len < EPSILON) {
      return null;
    }
    len = 1 / len;
    x2 *= len;
    y2 *= len;
    z *= len;
    const s2 = Math.sin(rad);
    const c2 = Math.cos(rad);
    const t2 = 1 - c2;
    const a00 = a2[0];
    const a01 = a2[1];
    const a02 = a2[2];
    const a03 = a2[3];
    const a10 = a2[4];
    const a11 = a2[5];
    const a12 = a2[6];
    const a13 = a2[7];
    const a20 = a2[8];
    const a21 = a2[9];
    const a22 = a2[10];
    const a23 = a2[11];
    const b00 = x2 * x2 * t2 + c2;
    const b01 = y2 * x2 * t2 + z * s2;
    const b02 = z * x2 * t2 - y2 * s2;
    const b10 = x2 * y2 * t2 - z * s2;
    const b11 = y2 * y2 * t2 + c2;
    const b12 = z * y2 * t2 + x2 * s2;
    const b20 = x2 * z * t2 + y2 * s2;
    const b21 = y2 * z * t2 - x2 * s2;
    const b22 = z * z * t2 + c2;
    out[0] = a00 * b00 + a10 * b01 + a20 * b02;
    out[1] = a01 * b00 + a11 * b01 + a21 * b02;
    out[2] = a02 * b00 + a12 * b01 + a22 * b02;
    out[3] = a03 * b00 + a13 * b01 + a23 * b02;
    out[4] = a00 * b10 + a10 * b11 + a20 * b12;
    out[5] = a01 * b10 + a11 * b11 + a21 * b12;
    out[6] = a02 * b10 + a12 * b11 + a22 * b12;
    out[7] = a03 * b10 + a13 * b11 + a23 * b12;
    out[8] = a00 * b20 + a10 * b21 + a20 * b22;
    out[9] = a01 * b20 + a11 * b21 + a21 * b22;
    out[10] = a02 * b20 + a12 * b21 + a22 * b22;
    out[11] = a03 * b20 + a13 * b21 + a23 * b22;
    if (a2 !== out) {
      out[12] = a2[12];
      out[13] = a2[13];
      out[14] = a2[14];
      out[15] = a2[15];
    }
    return out;
  }
  /**
   * Rotates a matrix by the given angle around the X axis
   * @category Static
   *
   * @param out - the receiving matrix
   * @param a - the matrix to rotate
   * @param rad - the angle to rotate the matrix by
   * @returns `out`
   */
  static rotateX(out, a2, rad) {
    const s2 = Math.sin(rad);
    const c2 = Math.cos(rad);
    const a10 = a2[4];
    const a11 = a2[5];
    const a12 = a2[6];
    const a13 = a2[7];
    const a20 = a2[8];
    const a21 = a2[9];
    const a22 = a2[10];
    const a23 = a2[11];
    if (a2 !== out) {
      out[0] = a2[0];
      out[1] = a2[1];
      out[2] = a2[2];
      out[3] = a2[3];
      out[12] = a2[12];
      out[13] = a2[13];
      out[14] = a2[14];
      out[15] = a2[15];
    }
    out[4] = a10 * c2 + a20 * s2;
    out[5] = a11 * c2 + a21 * s2;
    out[6] = a12 * c2 + a22 * s2;
    out[7] = a13 * c2 + a23 * s2;
    out[8] = a20 * c2 - a10 * s2;
    out[9] = a21 * c2 - a11 * s2;
    out[10] = a22 * c2 - a12 * s2;
    out[11] = a23 * c2 - a13 * s2;
    return out;
  }
  /**
   * Rotates a matrix by the given angle around the Y axis
   * @category Static
   *
   * @param out - the receiving matrix
   * @param a - the matrix to rotate
   * @param rad - the angle to rotate the matrix by
   * @returns `out`
   */
  static rotateY(out, a2, rad) {
    const s2 = Math.sin(rad);
    const c2 = Math.cos(rad);
    const a00 = a2[0];
    const a01 = a2[1];
    const a02 = a2[2];
    const a03 = a2[3];
    const a20 = a2[8];
    const a21 = a2[9];
    const a22 = a2[10];
    const a23 = a2[11];
    if (a2 !== out) {
      out[4] = a2[4];
      out[5] = a2[5];
      out[6] = a2[6];
      out[7] = a2[7];
      out[12] = a2[12];
      out[13] = a2[13];
      out[14] = a2[14];
      out[15] = a2[15];
    }
    out[0] = a00 * c2 - a20 * s2;
    out[1] = a01 * c2 - a21 * s2;
    out[2] = a02 * c2 - a22 * s2;
    out[3] = a03 * c2 - a23 * s2;
    out[8] = a00 * s2 + a20 * c2;
    out[9] = a01 * s2 + a21 * c2;
    out[10] = a02 * s2 + a22 * c2;
    out[11] = a03 * s2 + a23 * c2;
    return out;
  }
  /**
   * Rotates a matrix by the given angle around the Z axis
   * @category Static
   *
   * @param out - the receiving matrix
   * @param a - the matrix to rotate
   * @param rad - the angle to rotate the matrix by
   * @returns `out`
   */
  static rotateZ(out, a2, rad) {
    const s2 = Math.sin(rad);
    const c2 = Math.cos(rad);
    const a00 = a2[0];
    const a01 = a2[1];
    const a02 = a2[2];
    const a03 = a2[3];
    const a10 = a2[4];
    const a11 = a2[5];
    const a12 = a2[6];
    const a13 = a2[7];
    if (a2 !== out) {
      out[8] = a2[8];
      out[9] = a2[9];
      out[10] = a2[10];
      out[11] = a2[11];
      out[12] = a2[12];
      out[13] = a2[13];
      out[14] = a2[14];
      out[15] = a2[15];
    }
    out[0] = a00 * c2 + a10 * s2;
    out[1] = a01 * c2 + a11 * s2;
    out[2] = a02 * c2 + a12 * s2;
    out[3] = a03 * c2 + a13 * s2;
    out[4] = a10 * c2 - a00 * s2;
    out[5] = a11 * c2 - a01 * s2;
    out[6] = a12 * c2 - a02 * s2;
    out[7] = a13 * c2 - a03 * s2;
    return out;
  }
  /**
   * Creates a {@link Mat4} from a vector translation
   * This is equivalent to (but much faster than):
   *
   *     mat4.identity(dest);
   *     mat4.translate(dest, dest, vec);
   * @category Static
   *
   * @param out - {@link Mat4} receiving operation result
   * @param v - Translation vector
   * @returns `out`
   */
  static fromTranslation(out, v2) {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = 1;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 1;
    out[11] = 0;
    out[12] = v2[0];
    out[13] = v2[1];
    out[14] = v2[2];
    out[15] = 1;
    return out;
  }
  /**
   * Creates a {@link Mat4} from a vector scaling
   * This is equivalent to (but much faster than):
   *
   *     mat4.identity(dest);
   *     mat4.scale(dest, dest, vec);
   * @category Static
   *
   * @param out - {@link Mat4} receiving operation result
   * @param v - Scaling vector
   * @returns `out`
   */
  static fromScaling(out, v2) {
    out[0] = v2[0];
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = v2[1];
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = v2[2];
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
  }
  /**
   * Creates a {@link Mat4} from a given angle around a given axis
   * This is equivalent to (but much faster than):
   *
   *     mat4.identity(dest);
   *     mat4.rotate(dest, dest, rad, axis);
   * @category Static
   *
   * @param out - {@link Mat4} receiving operation result
   * @param rad - the angle to rotate the matrix by
   * @param axis - the axis to rotate around
   * @returns `out` or `null` if `axis` has a length of 0
   */
  static fromRotation(out, rad, axis) {
    let x2 = axis[0];
    let y2 = axis[1];
    let z = axis[2];
    let len = Math.sqrt(x2 * x2 + y2 * y2 + z * z);
    if (len < EPSILON) {
      return null;
    }
    len = 1 / len;
    x2 *= len;
    y2 *= len;
    z *= len;
    const s2 = Math.sin(rad);
    const c2 = Math.cos(rad);
    const t2 = 1 - c2;
    out[0] = x2 * x2 * t2 + c2;
    out[1] = y2 * x2 * t2 + z * s2;
    out[2] = z * x2 * t2 - y2 * s2;
    out[3] = 0;
    out[4] = x2 * y2 * t2 - z * s2;
    out[5] = y2 * y2 * t2 + c2;
    out[6] = z * y2 * t2 + x2 * s2;
    out[7] = 0;
    out[8] = x2 * z * t2 + y2 * s2;
    out[9] = y2 * z * t2 - x2 * s2;
    out[10] = z * z * t2 + c2;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
  }
  /**
   * Creates a matrix from the given angle around the X axis
   * This is equivalent to (but much faster than):
   *
   *     mat4.identity(dest);
   *     mat4.rotateX(dest, dest, rad);
   * @category Static
   *
   * @param out - mat4 receiving operation result
   * @param rad - the angle to rotate the matrix by
   * @returns `out`
   */
  static fromXRotation(out, rad) {
    const s2 = Math.sin(rad);
    const c2 = Math.cos(rad);
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = c2;
    out[6] = s2;
    out[7] = 0;
    out[8] = 0;
    out[9] = -s2;
    out[10] = c2;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
  }
  /**
   * Creates a matrix from the given angle around the Y axis
   * This is equivalent to (but much faster than):
   *
   *     mat4.identity(dest);
   *     mat4.rotateY(dest, dest, rad);
   * @category Static
   *
   * @param out - mat4 receiving operation result
   * @param rad - the angle to rotate the matrix by
   * @returns `out`
   */
  static fromYRotation(out, rad) {
    const s2 = Math.sin(rad);
    const c2 = Math.cos(rad);
    out[0] = c2;
    out[1] = 0;
    out[2] = -s2;
    out[3] = 0;
    out[4] = 0;
    out[5] = 1;
    out[6] = 0;
    out[7] = 0;
    out[8] = s2;
    out[9] = 0;
    out[10] = c2;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
  }
  /**
   * Creates a matrix from the given angle around the Z axis
   * This is equivalent to (but much faster than):
   *
   *     mat4.identity(dest);
   *     mat4.rotateZ(dest, dest, rad);
   * @category Static
   *
   * @param out - mat4 receiving operation result
   * @param rad - the angle to rotate the matrix by
   * @returns `out`
   */
  static fromZRotation(out, rad) {
    const s2 = Math.sin(rad);
    const c2 = Math.cos(rad);
    out[0] = c2;
    out[1] = s2;
    out[2] = 0;
    out[3] = 0;
    out[4] = -s2;
    out[5] = c2;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 1;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
  }
  /**
   * Creates a matrix from a quaternion rotation and vector translation
   * This is equivalent to (but much faster than):
   *
   *     mat4.identity(dest);
   *     mat4.translate(dest, vec);
   *     let quatMat = mat4.create();
   *     quat4.toMat4(quat, quatMat);
   *     mat4.multiply(dest, quatMat);
   * @category Static
   *
   * @param out - mat4 receiving operation result
   * @param q - Rotation quaternion
   * @param v - Translation vector
   * @returns `out`
   */
  static fromRotationTranslation(out, q, v2) {
    const x2 = q[0];
    const y2 = q[1];
    const z = q[2];
    const w2 = q[3];
    const x22 = x2 + x2;
    const y22 = y2 + y2;
    const z2 = z + z;
    const xx = x2 * x22;
    const xy = x2 * y22;
    const xz = x2 * z2;
    const yy = y2 * y22;
    const yz = y2 * z2;
    const zz = z * z2;
    const wx = w2 * x22;
    const wy = w2 * y22;
    const wz = w2 * z2;
    out[0] = 1 - (yy + zz);
    out[1] = xy + wz;
    out[2] = xz - wy;
    out[3] = 0;
    out[4] = xy - wz;
    out[5] = 1 - (xx + zz);
    out[6] = yz + wx;
    out[7] = 0;
    out[8] = xz + wy;
    out[9] = yz - wx;
    out[10] = 1 - (xx + yy);
    out[11] = 0;
    out[12] = v2[0];
    out[13] = v2[1];
    out[14] = v2[2];
    out[15] = 1;
    return out;
  }
  /**
   * Sets a {@link Mat4} from a {@link Quat2}.
   * @category Static
   *
   * @param out - Matrix
   * @param a - Dual Quaternion
   * @returns `out`
   */
  static fromQuat2(out, a2) {
    const bx = -a2[0];
    const by = -a2[1];
    const bz = -a2[2];
    const bw = a2[3];
    const ax = a2[4];
    const ay = a2[5];
    const az = a2[6];
    const aw = a2[7];
    const magnitude = bx * bx + by * by + bz * bz + bw * bw;
    if (magnitude > 0) {
      tmpVec3[0] = (ax * bw + aw * bx + ay * bz - az * by) * 2 / magnitude;
      tmpVec3[1] = (ay * bw + aw * by + az * bx - ax * bz) * 2 / magnitude;
      tmpVec3[2] = (az * bw + aw * bz + ax * by - ay * bx) * 2 / magnitude;
    } else {
      tmpVec3[0] = (ax * bw + aw * bx + ay * bz - az * by) * 2;
      tmpVec3[1] = (ay * bw + aw * by + az * bx - ax * bz) * 2;
      tmpVec3[2] = (az * bw + aw * bz + ax * by - ay * bx) * 2;
    }
    Mat4.fromRotationTranslation(out, a2, tmpVec3);
    return out;
  }
  /**
   * Calculates a {@link Mat4} normal matrix (transpose inverse) from a {@link Mat4}
   * @category Static
   *
   * @param out - Matrix receiving operation result
   * @param a - Mat4 to derive the normal matrix from
   * @returns `out` or `null` if the matrix is not invertable
   */
  static normalFromMat4(out, a2) {
    const a00 = a2[0];
    const a01 = a2[1];
    const a02 = a2[2];
    const a03 = a2[3];
    const a10 = a2[4];
    const a11 = a2[5];
    const a12 = a2[6];
    const a13 = a2[7];
    const a20 = a2[8];
    const a21 = a2[9];
    const a22 = a2[10];
    const a23 = a2[11];
    const a30 = a2[12];
    const a31 = a2[13];
    const a32 = a2[14];
    const a33 = a2[15];
    const b00 = a00 * a11 - a01 * a10;
    const b01 = a00 * a12 - a02 * a10;
    const b02 = a00 * a13 - a03 * a10;
    const b03 = a01 * a12 - a02 * a11;
    const b04 = a01 * a13 - a03 * a11;
    const b05 = a02 * a13 - a03 * a12;
    const b06 = a20 * a31 - a21 * a30;
    const b07 = a20 * a32 - a22 * a30;
    const b08 = a20 * a33 - a23 * a30;
    const b09 = a21 * a32 - a22 * a31;
    const b10 = a21 * a33 - a23 * a31;
    const b11 = a22 * a33 - a23 * a32;
    let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
    if (!det) {
      return null;
    }
    det = 1 / det;
    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    out[1] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    out[2] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    out[3] = 0;
    out[4] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    out[6] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    out[7] = 0;
    out[8] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    out[9] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
  }
  /**
   * Calculates a {@link Mat4} normal matrix (transpose inverse) from a {@link Mat4}
   * This version omits the calculation of the constant factor (1/determinant), so
   * any normals transformed with it will need to be renormalized.
   * From https://stackoverflow.com/a/27616419/25968
   * @category Static
   *
   * @param out - Matrix receiving operation result
   * @param a - Mat4 to derive the normal matrix from
   * @returns `out`
   */
  static normalFromMat4Fast(out, a2) {
    const ax = a2[0];
    const ay = a2[1];
    const az = a2[2];
    const bx = a2[4];
    const by = a2[5];
    const bz = a2[6];
    const cx = a2[8];
    const cy = a2[9];
    const cz = a2[10];
    out[0] = by * cz - cz * cy;
    out[1] = bz * cx - cx * cz;
    out[2] = bx * cy - cy * cx;
    out[3] = 0;
    out[4] = cy * az - cz * ay;
    out[5] = cz * ax - cx * az;
    out[6] = cx * ay - cy * ax;
    out[7] = 0;
    out[8] = ay * bz - az * by;
    out[9] = az * bx - ax * bz;
    out[10] = ax * by - ay * bx;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
  }
  /**
   * Returns the translation vector component of a transformation
   * matrix. If a matrix is built with fromRotationTranslation,
   * the returned vector will be the same as the translation vector
   * originally supplied.
   * @category Static
   *
   * @param  {vec3} out Vector to receive translation component
   * @param  {ReadonlyMat4} mat Matrix to be decomposed (input)
   * @return {vec3} out
   */
  static getTranslation(out, mat) {
    out[0] = mat[12];
    out[1] = mat[13];
    out[2] = mat[14];
    return out;
  }
  /**
   * Returns the scaling factor component of a transformation
   * matrix. If a matrix is built with fromRotationTranslationScale
   * with a normalized Quaternion parameter, the returned vector will be
   * the same as the scaling vector
   * originally supplied.
   * @category Static
   *
   * @param  {vec3} out Vector to receive scaling factor component
   * @param  {ReadonlyMat4} mat Matrix to be decomposed (input)
   * @return {vec3} out
   */
  static getScaling(out, mat) {
    const m11 = mat[0];
    const m12 = mat[1];
    const m13 = mat[2];
    const m21 = mat[4];
    const m22 = mat[5];
    const m23 = mat[6];
    const m31 = mat[8];
    const m32 = mat[9];
    const m33 = mat[10];
    out[0] = Math.sqrt(m11 * m11 + m12 * m12 + m13 * m13);
    out[1] = Math.sqrt(m21 * m21 + m22 * m22 + m23 * m23);
    out[2] = Math.sqrt(m31 * m31 + m32 * m32 + m33 * m33);
    return out;
  }
  /**
   * Returns a quaternion representing the rotational component
   * of a transformation matrix. If a matrix is built with
   * fromRotationTranslation, the returned quaternion will be the
   * same as the quaternion originally supplied.
   * @category Static
   *
   * @param out - Quaternion to receive the rotation component
   * @param mat - Matrix to be decomposed (input)
   * @return `out`
   */
  static getRotation(out, mat) {
    Mat4.getScaling(tmpVec3, mat);
    const is1 = 1 / tmpVec3[0];
    const is2 = 1 / tmpVec3[1];
    const is3 = 1 / tmpVec3[2];
    const sm11 = mat[0] * is1;
    const sm12 = mat[1] * is2;
    const sm13 = mat[2] * is3;
    const sm21 = mat[4] * is1;
    const sm22 = mat[5] * is2;
    const sm23 = mat[6] * is3;
    const sm31 = mat[8] * is1;
    const sm32 = mat[9] * is2;
    const sm33 = mat[10] * is3;
    const trace = sm11 + sm22 + sm33;
    let S2 = 0;
    if (trace > 0) {
      S2 = Math.sqrt(trace + 1) * 2;
      out[3] = 0.25 * S2;
      out[0] = (sm23 - sm32) / S2;
      out[1] = (sm31 - sm13) / S2;
      out[2] = (sm12 - sm21) / S2;
    } else if (sm11 > sm22 && sm11 > sm33) {
      S2 = Math.sqrt(1 + sm11 - sm22 - sm33) * 2;
      out[3] = (sm23 - sm32) / S2;
      out[0] = 0.25 * S2;
      out[1] = (sm12 + sm21) / S2;
      out[2] = (sm31 + sm13) / S2;
    } else if (sm22 > sm33) {
      S2 = Math.sqrt(1 + sm22 - sm11 - sm33) * 2;
      out[3] = (sm31 - sm13) / S2;
      out[0] = (sm12 + sm21) / S2;
      out[1] = 0.25 * S2;
      out[2] = (sm23 + sm32) / S2;
    } else {
      S2 = Math.sqrt(1 + sm33 - sm11 - sm22) * 2;
      out[3] = (sm12 - sm21) / S2;
      out[0] = (sm31 + sm13) / S2;
      out[1] = (sm23 + sm32) / S2;
      out[2] = 0.25 * S2;
    }
    return out;
  }
  /**
   * Decomposes a transformation matrix into its rotation, translation
   * and scale components. Returns only the rotation component
   * @category Static
   *
   * @param out_r - Quaternion to receive the rotation component
   * @param out_t - Vector to receive the translation vector
   * @param out_s - Vector to receive the scaling factor
   * @param mat - Matrix to be decomposed (input)
   * @returns `out_r`
   */
  static decompose(out_r, out_t, out_s, mat) {
    out_t[0] = mat[12];
    out_t[1] = mat[13];
    out_t[2] = mat[14];
    const m11 = mat[0];
    const m12 = mat[1];
    const m13 = mat[2];
    const m21 = mat[4];
    const m22 = mat[5];
    const m23 = mat[6];
    const m31 = mat[8];
    const m32 = mat[9];
    const m33 = mat[10];
    out_s[0] = Math.sqrt(m11 * m11 + m12 * m12 + m13 * m13);
    out_s[1] = Math.sqrt(m21 * m21 + m22 * m22 + m23 * m23);
    out_s[2] = Math.sqrt(m31 * m31 + m32 * m32 + m33 * m33);
    const is1 = 1 / out_s[0];
    const is2 = 1 / out_s[1];
    const is3 = 1 / out_s[2];
    const sm11 = m11 * is1;
    const sm12 = m12 * is2;
    const sm13 = m13 * is3;
    const sm21 = m21 * is1;
    const sm22 = m22 * is2;
    const sm23 = m23 * is3;
    const sm31 = m31 * is1;
    const sm32 = m32 * is2;
    const sm33 = m33 * is3;
    const trace = sm11 + sm22 + sm33;
    let S2 = 0;
    if (trace > 0) {
      S2 = Math.sqrt(trace + 1) * 2;
      out_r[3] = 0.25 * S2;
      out_r[0] = (sm23 - sm32) / S2;
      out_r[1] = (sm31 - sm13) / S2;
      out_r[2] = (sm12 - sm21) / S2;
    } else if (sm11 > sm22 && sm11 > sm33) {
      S2 = Math.sqrt(1 + sm11 - sm22 - sm33) * 2;
      out_r[3] = (sm23 - sm32) / S2;
      out_r[0] = 0.25 * S2;
      out_r[1] = (sm12 + sm21) / S2;
      out_r[2] = (sm31 + sm13) / S2;
    } else if (sm22 > sm33) {
      S2 = Math.sqrt(1 + sm22 - sm11 - sm33) * 2;
      out_r[3] = (sm31 - sm13) / S2;
      out_r[0] = (sm12 + sm21) / S2;
      out_r[1] = 0.25 * S2;
      out_r[2] = (sm23 + sm32) / S2;
    } else {
      S2 = Math.sqrt(1 + sm33 - sm11 - sm22) * 2;
      out_r[3] = (sm12 - sm21) / S2;
      out_r[0] = (sm31 + sm13) / S2;
      out_r[1] = (sm23 + sm32) / S2;
      out_r[2] = 0.25 * S2;
    }
    return out_r;
  }
  /**
   * Creates a matrix from a quaternion rotation, vector translation and vector scale
   * This is equivalent to (but much faster than):
   *
   *     mat4.identity(dest);
   *     mat4.translate(dest, vec);
   *     let quatMat = mat4.create();
   *     quat4.toMat4(quat, quatMat);
   *     mat4.multiply(dest, quatMat);
   *     mat4.scale(dest, scale);
   * @category Static
   *
   * @param out - mat4 receiving operation result
   * @param q - Rotation quaternion
   * @param v - Translation vector
   * @param s - Scaling vector
   * @returns `out`
   */
  static fromRotationTranslationScale(out, q, v2, s2) {
    const x2 = q[0];
    const y2 = q[1];
    const z = q[2];
    const w2 = q[3];
    const x22 = x2 + x2;
    const y22 = y2 + y2;
    const z2 = z + z;
    const xx = x2 * x22;
    const xy = x2 * y22;
    const xz = x2 * z2;
    const yy = y2 * y22;
    const yz = y2 * z2;
    const zz = z * z2;
    const wx = w2 * x22;
    const wy = w2 * y22;
    const wz = w2 * z2;
    const sx = s2[0];
    const sy = s2[1];
    const sz = s2[2];
    out[0] = (1 - (yy + zz)) * sx;
    out[1] = (xy + wz) * sx;
    out[2] = (xz - wy) * sx;
    out[3] = 0;
    out[4] = (xy - wz) * sy;
    out[5] = (1 - (xx + zz)) * sy;
    out[6] = (yz + wx) * sy;
    out[7] = 0;
    out[8] = (xz + wy) * sz;
    out[9] = (yz - wx) * sz;
    out[10] = (1 - (xx + yy)) * sz;
    out[11] = 0;
    out[12] = v2[0];
    out[13] = v2[1];
    out[14] = v2[2];
    out[15] = 1;
    return out;
  }
  /**
   * Creates a matrix from a quaternion rotation, vector translation and vector scale, rotating and scaling around the given origin
   * This is equivalent to (but much faster than):
   *
   *     mat4.identity(dest);
   *     mat4.translate(dest, vec);
   *     mat4.translate(dest, origin);
   *     let quatMat = mat4.create();
   *     quat4.toMat4(quat, quatMat);
   *     mat4.multiply(dest, quatMat);
   *     mat4.scale(dest, scale)
   *     mat4.translate(dest, negativeOrigin);
   * @category Static
   *
   * @param out - mat4 receiving operation result
   * @param q - Rotation quaternion
   * @param v - Translation vector
   * @param s - Scaling vector
   * @param o - The origin vector around which to scale and rotate
   * @returns `out`
   */
  static fromRotationTranslationScaleOrigin(out, q, v2, s2, o2) {
    const x2 = q[0];
    const y2 = q[1];
    const z = q[2];
    const w2 = q[3];
    const x22 = x2 + x2;
    const y22 = y2 + y2;
    const z2 = z + z;
    const xx = x2 * x22;
    const xy = x2 * y22;
    const xz = x2 * z2;
    const yy = y2 * y22;
    const yz = y2 * z2;
    const zz = z * z2;
    const wx = w2 * x22;
    const wy = w2 * y22;
    const wz = w2 * z2;
    const sx = s2[0];
    const sy = s2[1];
    const sz = s2[2];
    const ox = o2[0];
    const oy = o2[1];
    const oz = o2[2];
    const out0 = (1 - (yy + zz)) * sx;
    const out1 = (xy + wz) * sx;
    const out2 = (xz - wy) * sx;
    const out4 = (xy - wz) * sy;
    const out5 = (1 - (xx + zz)) * sy;
    const out6 = (yz + wx) * sy;
    const out8 = (xz + wy) * sz;
    const out9 = (yz - wx) * sz;
    const out10 = (1 - (xx + yy)) * sz;
    out[0] = out0;
    out[1] = out1;
    out[2] = out2;
    out[3] = 0;
    out[4] = out4;
    out[5] = out5;
    out[6] = out6;
    out[7] = 0;
    out[8] = out8;
    out[9] = out9;
    out[10] = out10;
    out[11] = 0;
    out[12] = v2[0] + ox - (out0 * ox + out4 * oy + out8 * oz);
    out[13] = v2[1] + oy - (out1 * ox + out5 * oy + out9 * oz);
    out[14] = v2[2] + oz - (out2 * ox + out6 * oy + out10 * oz);
    out[15] = 1;
    return out;
  }
  /**
   * Calculates a 4x4 matrix from the given quaternion
   * @category Static
   *
   * @param out - mat4 receiving operation result
   * @param q - Quaternion to create matrix from
   * @returns `out`
   */
  static fromQuat(out, q) {
    const x2 = q[0];
    const y2 = q[1];
    const z = q[2];
    const w2 = q[3];
    const x22 = x2 + x2;
    const y22 = y2 + y2;
    const z2 = z + z;
    const xx = x2 * x22;
    const yx = y2 * x22;
    const yy = y2 * y22;
    const zx = z * x22;
    const zy = z * y22;
    const zz = z * z2;
    const wx = w2 * x22;
    const wy = w2 * y22;
    const wz = w2 * z2;
    out[0] = 1 - yy - zz;
    out[1] = yx + wz;
    out[2] = zx - wy;
    out[3] = 0;
    out[4] = yx - wz;
    out[5] = 1 - xx - zz;
    out[6] = zy + wx;
    out[7] = 0;
    out[8] = zx + wy;
    out[9] = zy - wx;
    out[10] = 1 - xx - yy;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
  }
  /**
   * Generates a frustum matrix with the given bounds
   * The near/far clip planes correspond to a normalized device coordinate Z range of [-1, 1],
   * which matches WebGL/OpenGL's clip volume.
   * Passing null/undefined/no value for far will generate infinite projection matrix.
   * @category Static
   *
   * @param out - mat4 frustum matrix will be written into
   * @param left - Left bound of the frustum
   * @param right - Right bound of the frustum
   * @param bottom - Bottom bound of the frustum
   * @param top - Top bound of the frustum
   * @param near - Near bound of the frustum
   * @param far -  Far bound of the frustum, can be null or Infinity
   * @returns `out`
   */
  static frustumNO(out, left, right, bottom, top, near, far = Infinity) {
    const rl = 1 / (right - left);
    const tb = 1 / (top - bottom);
    out[0] = near * 2 * rl;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = near * 2 * tb;
    out[6] = 0;
    out[7] = 0;
    out[8] = (right + left) * rl;
    out[9] = (top + bottom) * tb;
    out[11] = -1;
    out[12] = 0;
    out[13] = 0;
    out[15] = 0;
    if (far != null && far !== Infinity) {
      const nf = 1 / (near - far);
      out[10] = (far + near) * nf;
      out[14] = 2 * far * near * nf;
    } else {
      out[10] = -1;
      out[14] = -2 * near;
    }
    return out;
  }
  /**
   * Alias for {@link Mat4.frustumNO}
   * @category Static
   * @deprecated Use {@link Mat4.frustumNO} or {@link Mat4.frustumZO} explicitly
   */
  static frustum(out, left, right, bottom, top, near, _far = Infinity) {
    return out;
  }
  /**
   * Generates a frustum matrix with the given bounds
   * The near/far clip planes correspond to a normalized device coordinate Z range of [0, 1],
   * which matches WebGPU/Vulkan/DirectX/Metal's clip volume.
   * Passing null/undefined/no value for far will generate infinite projection matrix.
   * @category Static
   *
   * @param out - mat4 frustum matrix will be written into
   * @param left - Left bound of the frustum
   * @param right - Right bound of the frustum
   * @param bottom - Bottom bound of the frustum
   * @param top - Top bound of the frustum
   * @param near - Near bound of the frustum
   * @param far - Far bound of the frustum, can be null or Infinity
   * @returns `out`
   */
  static frustumZO(out, left, right, bottom, top, near, far = Infinity) {
    const rl = 1 / (right - left);
    const tb = 1 / (top - bottom);
    out[0] = near * 2 * rl;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = near * 2 * tb;
    out[6] = 0;
    out[7] = 0;
    out[8] = (right + left) * rl;
    out[9] = (top + bottom) * tb;
    out[11] = -1;
    out[12] = 0;
    out[13] = 0;
    out[15] = 0;
    if (far != null && far !== Infinity) {
      const nf = 1 / (near - far);
      out[10] = far * nf;
      out[14] = far * near * nf;
    } else {
      out[10] = -1;
      out[14] = -near;
    }
    return out;
  }
  /**
   * Generates a perspective projection matrix with the given bounds.
   * The near/far clip planes correspond to a normalized device coordinate Z range of [-1, 1],
   * which matches WebGL/OpenGL's clip volume.
   * Passing null/undefined/no value for far will generate infinite projection matrix.
   * @category Static
   *
   * @param out - mat4 frustum matrix will be written into
   * @param fovy - Vertical field of view in radians
   * @param aspect - Aspect ratio. typically viewport width/height
   * @param near - Near bound of the frustum
   * @param far - Far bound of the frustum, can be null or Infinity
   * @returns `out`
   */
  static perspectiveNO(out, fovy, aspect, near, far = Infinity) {
    const f2 = 1 / Math.tan(fovy / 2);
    out[0] = f2 / aspect;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = f2;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[11] = -1;
    out[12] = 0;
    out[13] = 0;
    out[15] = 0;
    if (far != null && far !== Infinity) {
      const nf = 1 / (near - far);
      out[10] = (far + near) * nf;
      out[14] = 2 * far * near * nf;
    } else {
      out[10] = -1;
      out[14] = -2 * near;
    }
    return out;
  }
  /**
   * Alias for {@link Mat4.perspectiveNO}
   * @category Static
   * @deprecated Use {@link Mat4.perspectiveNO} or {@link Mat4.perspectiveZO} explicitly
   */
  static perspective(out, fovy, aspect, near, _far = Infinity) {
    return out;
  }
  /**
   * Generates a perspective projection matrix suitable for WebGPU with the given bounds.
   * The near/far clip planes correspond to a normalized device coordinate Z range of [0, 1],
   * which matches WebGPU/Vulkan/DirectX/Metal's clip volume.
   * Passing null/undefined/no value for far will generate infinite projection matrix.
   * @category Static
   *
   * @param out - mat4 frustum matrix will be written into
   * @param fovy - Vertical field of view in radians
   * @param aspect - Aspect ratio. typically viewport width/height
   * @param near - Near bound of the frustum
   * @param far - Far bound of the frustum, can be null or Infinity
   * @returns `out`
   */
  static perspectiveZO(out, fovy, aspect, near, far = Infinity) {
    const f2 = 1 / Math.tan(fovy / 2);
    out[0] = f2 / aspect;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = f2;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[11] = -1;
    out[12] = 0;
    out[13] = 0;
    out[15] = 0;
    if (far != null && far !== Infinity) {
      const nf = 1 / (near - far);
      out[10] = far * nf;
      out[14] = far * near * nf;
    } else {
      out[10] = -1;
      out[14] = -near;
    }
    return out;
  }
  /**
   * Generates a perspective projection matrix with the given field of view.
   * This is primarily useful for generating projection matrices to be used
   * with the still experiemental WebVR API.
   * @category Static
   *
   * @param out - mat4 frustum matrix will be written into
   * @param fov - Object containing the following values: upDegrees, downDegrees, leftDegrees, rightDegrees
   * @param near - Near bound of the frustum
   * @param far - Far bound of the frustum
   * @returns `out`
   * @deprecated
   */
  static perspectiveFromFieldOfView(out, fov, near, far) {
    const upTan = Math.tan(fov.upDegrees * Math.PI / 180);
    const downTan = Math.tan(fov.downDegrees * Math.PI / 180);
    const leftTan = Math.tan(fov.leftDegrees * Math.PI / 180);
    const rightTan = Math.tan(fov.rightDegrees * Math.PI / 180);
    const xScale = 2 / (leftTan + rightTan);
    const yScale = 2 / (upTan + downTan);
    out[0] = xScale;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = yScale;
    out[6] = 0;
    out[7] = 0;
    out[8] = -((leftTan - rightTan) * xScale * 0.5);
    out[9] = (upTan - downTan) * yScale * 0.5;
    out[10] = far / (near - far);
    out[11] = -1;
    out[12] = 0;
    out[13] = 0;
    out[14] = far * near / (near - far);
    out[15] = 0;
    return out;
  }
  /**
   * Generates a orthogonal projection matrix with the given bounds.
   * The near/far clip planes correspond to a normalized device coordinate Z range of [-1, 1],
   * which matches WebGL/OpenGL's clip volume.
   * @category Static
   *
   * @param out - mat4 frustum matrix will be written into
   * @param left - Left bound of the frustum
   * @param right - Right bound of the frustum
   * @param bottom - Bottom bound of the frustum
   * @param top - Top bound of the frustum
   * @param near - Near bound of the frustum
   * @param far - Far bound of the frustum
   * @returns `out`
   */
  static orthoNO(out, left, right, bottom, top, near, far) {
    const lr = 1 / (left - right);
    const bt = 1 / (bottom - top);
    const nf = 1 / (near - far);
    out[0] = -2 * lr;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = -2 * bt;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 2 * nf;
    out[11] = 0;
    out[12] = (left + right) * lr;
    out[13] = (top + bottom) * bt;
    out[14] = (far + near) * nf;
    out[15] = 1;
    return out;
  }
  /**
   * Alias for {@link Mat4.orthoNO}
   * @category Static
   * @deprecated Use {@link Mat4.orthoNO} or {@link Mat4.orthoZO} explicitly
   */
  static ortho(out, _left, _right, _bottom, _top, _near, _far) {
    return out;
  }
  /**
   * Generates a orthogonal projection matrix with the given bounds.
   * The near/far clip planes correspond to a normalized device coordinate Z range of [0, 1],
   * which matches WebGPU/Vulkan/DirectX/Metal's clip volume.
   * @category Static
   *
   * @param out - mat4 frustum matrix will be written into
   * @param left - Left bound of the frustum
   * @param right - Right bound of the frustum
   * @param bottom - Bottom bound of the frustum
   * @param top - Top bound of the frustum
   * @param near - Near bound of the frustum
   * @param far - Far bound of the frustum
   * @returns `out`
   */
  static orthoZO(out, left, right, bottom, top, near, far) {
    const lr = 1 / (left - right);
    const bt = 1 / (bottom - top);
    const nf = 1 / (near - far);
    out[0] = -2 * lr;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = -2 * bt;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = nf;
    out[11] = 0;
    out[12] = (left + right) * lr;
    out[13] = (top + bottom) * bt;
    out[14] = near * nf;
    out[15] = 1;
    return out;
  }
  /**
   * Generates a look-at matrix with the given eye position, focal point, and up axis.
   * If you want a matrix that actually makes an object look at another object, you should use targetTo instead.
   * @category Static
   *
   * @param out - mat4 frustum matrix will be written into
   * @param eye - Position of the viewer
   * @param center - Point the viewer is looking at
   * @param up - vec3 pointing up
   * @returns `out`
   */
  static lookAt(out, eye, center, up) {
    const eyex = eye[0];
    const eyey = eye[1];
    const eyez = eye[2];
    const upx = up[0];
    const upy = up[1];
    const upz = up[2];
    const centerx = center[0];
    const centery = center[1];
    const centerz = center[2];
    if (Math.abs(eyex - centerx) < EPSILON && Math.abs(eyey - centery) < EPSILON && Math.abs(eyez - centerz) < EPSILON) {
      return Mat4.identity(out);
    }
    let z0 = eyex - centerx;
    let z1 = eyey - centery;
    let z2 = eyez - centerz;
    let len = 1 / Math.sqrt(z0 * z0 + z1 * z1 + z2 * z2);
    z0 *= len;
    z1 *= len;
    z2 *= len;
    let x0 = upy * z2 - upz * z1;
    let x1 = upz * z0 - upx * z2;
    let x2 = upx * z1 - upy * z0;
    len = Math.sqrt(x0 * x0 + x1 * x1 + x2 * x2);
    if (!len) {
      x0 = 0;
      x1 = 0;
      x2 = 0;
    } else {
      len = 1 / len;
      x0 *= len;
      x1 *= len;
      x2 *= len;
    }
    let y0 = z1 * x2 - z2 * x1;
    let y1 = z2 * x0 - z0 * x2;
    let y2 = z0 * x1 - z1 * x0;
    len = Math.sqrt(y0 * y0 + y1 * y1 + y2 * y2);
    if (!len) {
      y0 = 0;
      y1 = 0;
      y2 = 0;
    } else {
      len = 1 / len;
      y0 *= len;
      y1 *= len;
      y2 *= len;
    }
    out[0] = x0;
    out[1] = y0;
    out[2] = z0;
    out[3] = 0;
    out[4] = x1;
    out[5] = y1;
    out[6] = z1;
    out[7] = 0;
    out[8] = x2;
    out[9] = y2;
    out[10] = z2;
    out[11] = 0;
    out[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
    out[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
    out[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
    out[15] = 1;
    return out;
  }
  /**
   * Generates a matrix that makes something look at something else.
   * @category Static
   *
   * @param out - mat4 frustum matrix will be written into
   * @param eye - Position of the viewer
   * @param target - Point the viewer is looking at
   * @param up - vec3 pointing up
   * @returns `out`
   */
  static targetTo(out, eye, target, up) {
    const eyex = eye[0];
    const eyey = eye[1];
    const eyez = eye[2];
    const upx = up[0];
    const upy = up[1];
    const upz = up[2];
    let z0 = eyex - target[0];
    let z1 = eyey - target[1];
    let z2 = eyez - target[2];
    let len = z0 * z0 + z1 * z1 + z2 * z2;
    if (len > 0) {
      len = 1 / Math.sqrt(len);
      z0 *= len;
      z1 *= len;
      z2 *= len;
    }
    let x0 = upy * z2 - upz * z1;
    let x1 = upz * z0 - upx * z2;
    let x2 = upx * z1 - upy * z0;
    len = x0 * x0 + x1 * x1 + x2 * x2;
    if (len > 0) {
      len = 1 / Math.sqrt(len);
      x0 *= len;
      x1 *= len;
      x2 *= len;
    }
    out[0] = x0;
    out[1] = x1;
    out[2] = x2;
    out[3] = 0;
    out[4] = z1 * x2 - z2 * x1;
    out[5] = z2 * x0 - z0 * x2;
    out[6] = z0 * x1 - z1 * x0;
    out[7] = 0;
    out[8] = z0;
    out[9] = z1;
    out[10] = z2;
    out[11] = 0;
    out[12] = eyex;
    out[13] = eyey;
    out[14] = eyez;
    out[15] = 1;
    return out;
  }
  /**
   * Returns Frobenius norm of a {@link Mat4}
   * @category Static
   *
   * @param a - the matrix to calculate Frobenius norm of
   * @returns Frobenius norm
   */
  static frob(a2) {
    return Math.sqrt(a2[0] * a2[0] + a2[1] * a2[1] + a2[2] * a2[2] + a2[3] * a2[3] + a2[4] * a2[4] + a2[5] * a2[5] + a2[6] * a2[6] + a2[7] * a2[7] + a2[8] * a2[8] + a2[9] * a2[9] + a2[10] * a2[10] + a2[11] * a2[11] + a2[12] * a2[12] + a2[13] * a2[13] + a2[14] * a2[14] + a2[15] * a2[15]);
  }
  /**
   * Adds two {@link Mat4}'s
   * @category Static
   *
   * @param out - the receiving matrix
   * @param a - the first operand
   * @param b - the second operand
   * @returns `out`
   */
  static add(out, a2, b2) {
    out[0] = a2[0] + b2[0];
    out[1] = a2[1] + b2[1];
    out[2] = a2[2] + b2[2];
    out[3] = a2[3] + b2[3];
    out[4] = a2[4] + b2[4];
    out[5] = a2[5] + b2[5];
    out[6] = a2[6] + b2[6];
    out[7] = a2[7] + b2[7];
    out[8] = a2[8] + b2[8];
    out[9] = a2[9] + b2[9];
    out[10] = a2[10] + b2[10];
    out[11] = a2[11] + b2[11];
    out[12] = a2[12] + b2[12];
    out[13] = a2[13] + b2[13];
    out[14] = a2[14] + b2[14];
    out[15] = a2[15] + b2[15];
    return out;
  }
  /**
   * Subtracts matrix b from matrix a
   * @category Static
   *
   * @param out - the receiving matrix
   * @param a - the first operand
   * @param b - the second operand
   * @returns `out`
   */
  static subtract(out, a2, b2) {
    out[0] = a2[0] - b2[0];
    out[1] = a2[1] - b2[1];
    out[2] = a2[2] - b2[2];
    out[3] = a2[3] - b2[3];
    out[4] = a2[4] - b2[4];
    out[5] = a2[5] - b2[5];
    out[6] = a2[6] - b2[6];
    out[7] = a2[7] - b2[7];
    out[8] = a2[8] - b2[8];
    out[9] = a2[9] - b2[9];
    out[10] = a2[10] - b2[10];
    out[11] = a2[11] - b2[11];
    out[12] = a2[12] - b2[12];
    out[13] = a2[13] - b2[13];
    out[14] = a2[14] - b2[14];
    out[15] = a2[15] - b2[15];
    return out;
  }
  /**
   * Alias for {@link Mat4.subtract}
   * @category Static
   */
  static sub(out, _a2, _b2) {
    return out;
  }
  /**
   * Multiply each element of the matrix by a scalar.
   * @category Static
   *
   * @param out - the receiving matrix
   * @param a - the matrix to scale
   * @param b - amount to scale the matrix's elements by
   * @returns `out`
   */
  static multiplyScalar(out, a2, b2) {
    out[0] = a2[0] * b2;
    out[1] = a2[1] * b2;
    out[2] = a2[2] * b2;
    out[3] = a2[3] * b2;
    out[4] = a2[4] * b2;
    out[5] = a2[5] * b2;
    out[6] = a2[6] * b2;
    out[7] = a2[7] * b2;
    out[8] = a2[8] * b2;
    out[9] = a2[9] * b2;
    out[10] = a2[10] * b2;
    out[11] = a2[11] * b2;
    out[12] = a2[12] * b2;
    out[13] = a2[13] * b2;
    out[14] = a2[14] * b2;
    out[15] = a2[15] * b2;
    return out;
  }
  /**
   * Adds two mat4's after multiplying each element of the second operand by a scalar value.
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - the first operand
   * @param b - the second operand
   * @param scale - the amount to scale b's elements by before adding
   * @returns `out`
   */
  static multiplyScalarAndAdd(out, a2, b2, scale) {
    out[0] = a2[0] + b2[0] * scale;
    out[1] = a2[1] + b2[1] * scale;
    out[2] = a2[2] + b2[2] * scale;
    out[3] = a2[3] + b2[3] * scale;
    out[4] = a2[4] + b2[4] * scale;
    out[5] = a2[5] + b2[5] * scale;
    out[6] = a2[6] + b2[6] * scale;
    out[7] = a2[7] + b2[7] * scale;
    out[8] = a2[8] + b2[8] * scale;
    out[9] = a2[9] + b2[9] * scale;
    out[10] = a2[10] + b2[10] * scale;
    out[11] = a2[11] + b2[11] * scale;
    out[12] = a2[12] + b2[12] * scale;
    out[13] = a2[13] + b2[13] * scale;
    out[14] = a2[14] + b2[14] * scale;
    out[15] = a2[15] + b2[15] * scale;
    return out;
  }
  /**
   * Returns whether or not two {@link Mat4}s have exactly the same elements in the same position (when compared with ===)
   * @category Static
   *
   * @param a - The first matrix.
   * @param b - The second matrix.
   * @returns True if the matrices are equal, false otherwise.
   */
  static exactEquals(a2, b2) {
    return a2[0] === b2[0] && a2[1] === b2[1] && a2[2] === b2[2] && a2[3] === b2[3] && a2[4] === b2[4] && a2[5] === b2[5] && a2[6] === b2[6] && a2[7] === b2[7] && a2[8] === b2[8] && a2[9] === b2[9] && a2[10] === b2[10] && a2[11] === b2[11] && a2[12] === b2[12] && a2[13] === b2[13] && a2[14] === b2[14] && a2[15] === b2[15];
  }
  /**
   * Returns whether or not two {@link Mat4}s have approximately the same elements in the same position.
   * @category Static
   *
   * @param a - The first matrix.
   * @param b - The second matrix.
   * @returns True if the matrices are equal, false otherwise.
   */
  static equals(a2, b2) {
    const a0 = a2[0];
    const a1 = a2[1];
    const a22 = a2[2];
    const a3 = a2[3];
    const a4 = a2[4];
    const a5 = a2[5];
    const a6 = a2[6];
    const a7 = a2[7];
    const a8 = a2[8];
    const a9 = a2[9];
    const a10 = a2[10];
    const a11 = a2[11];
    const a12 = a2[12];
    const a13 = a2[13];
    const a14 = a2[14];
    const a15 = a2[15];
    const b0 = b2[0];
    const b1 = b2[1];
    const b22 = b2[2];
    const b3 = b2[3];
    const b4 = b2[4];
    const b5 = b2[5];
    const b6 = b2[6];
    const b7 = b2[7];
    const b8 = b2[8];
    const b9 = b2[9];
    const b10 = b2[10];
    const b11 = b2[11];
    const b12 = b2[12];
    const b13 = b2[13];
    const b14 = b2[14];
    const b15 = b2[15];
    return Math.abs(a0 - b0) <= EPSILON * Math.max(1, Math.abs(a0), Math.abs(b0)) && Math.abs(a1 - b1) <= EPSILON * Math.max(1, Math.abs(a1), Math.abs(b1)) && Math.abs(a22 - b22) <= EPSILON * Math.max(1, Math.abs(a22), Math.abs(b22)) && Math.abs(a3 - b3) <= EPSILON * Math.max(1, Math.abs(a3), Math.abs(b3)) && Math.abs(a4 - b4) <= EPSILON * Math.max(1, Math.abs(a4), Math.abs(b4)) && Math.abs(a5 - b5) <= EPSILON * Math.max(1, Math.abs(a5), Math.abs(b5)) && Math.abs(a6 - b6) <= EPSILON * Math.max(1, Math.abs(a6), Math.abs(b6)) && Math.abs(a7 - b7) <= EPSILON * Math.max(1, Math.abs(a7), Math.abs(b7)) && Math.abs(a8 - b8) <= EPSILON * Math.max(1, Math.abs(a8), Math.abs(b8)) && Math.abs(a9 - b9) <= EPSILON * Math.max(1, Math.abs(a9), Math.abs(b9)) && Math.abs(a10 - b10) <= EPSILON * Math.max(1, Math.abs(a10), Math.abs(b10)) && Math.abs(a11 - b11) <= EPSILON * Math.max(1, Math.abs(a11), Math.abs(b11)) && Math.abs(a12 - b12) <= EPSILON * Math.max(1, Math.abs(a12), Math.abs(b12)) && Math.abs(a13 - b13) <= EPSILON * Math.max(1, Math.abs(a13), Math.abs(b13)) && Math.abs(a14 - b14) <= EPSILON * Math.max(1, Math.abs(a14), Math.abs(b14)) && Math.abs(a15 - b15) <= EPSILON * Math.max(1, Math.abs(a15), Math.abs(b15));
  }
  /**
   * Returns a string representation of a {@link Mat4}
   * @category Static
   *
   * @param a - matrix to represent as a string
   * @returns string representation of the matrix
   */
  static str(a2) {
    return `Mat4(${a2.join(", ")})`;
  }
}
const tmpVec3 = new Float32Array(3);
Mat4.prototype.mul = Mat4.prototype.multiply;
Mat4.sub = Mat4.subtract;
Mat4.mul = Mat4.multiply;
Mat4.frustum = Mat4.frustumNO;
Mat4.perspective = Mat4.perspectiveNO;
Mat4.ortho = Mat4.orthoNO;
class Vec3 extends Float32Array {
  /**
  * The number of bytes in a {@link Vec3}.
  */
  static BYTE_LENGTH = 3 * Float32Array.BYTES_PER_ELEMENT;
  /**
  * Create a {@link Vec3}.
  */
  constructor(...values) {
    switch (values.length) {
      case 3:
        super(values);
        break;
      case 2:
        super(values[0], values[1], 3);
        break;
      case 1: {
        const v2 = values[0];
        if (typeof v2 === "number") {
          super([v2, v2, v2]);
        } else {
          super(v2, 0, 3);
        }
        break;
      }
      default:
        super(3);
        break;
    }
  }
  //============
  // Attributes
  //============
  // Getters and setters to make component access read better.
  // These are likely to be a little bit slower than direct array access.
  /**
   * The x component of the vector. Equivalent to `this[0];`
   * @category Vector components
   */
  get x() {
    return this[0];
  }
  set x(value) {
    this[0] = value;
  }
  /**
   * The y component of the vector. Equivalent to `this[1];`
   * @category Vector components
   */
  get y() {
    return this[1];
  }
  set y(value) {
    this[1] = value;
  }
  /**
   * The z component of the vector. Equivalent to `this[2];`
   * @category Vector components
   */
  get z() {
    return this[2];
  }
  set z(value) {
    this[2] = value;
  }
  // Alternate set of getters and setters in case this is being used to define
  // a color.
  /**
   * The r component of the vector. Equivalent to `this[0];`
   * @category Color components
   */
  get r() {
    return this[0];
  }
  set r(value) {
    this[0] = value;
  }
  /**
   * The g component of the vector. Equivalent to `this[1];`
   * @category Color components
   */
  get g() {
    return this[1];
  }
  set g(value) {
    this[1] = value;
  }
  /**
   * The b component of the vector. Equivalent to `this[2];`
   * @category Color components
   */
  get b() {
    return this[2];
  }
  set b(value) {
    this[2] = value;
  }
  /**
   * The magnitude (length) of this.
   * Equivalent to `Vec3.magnitude(this);`
   *
   * Magnitude is used because the `length` attribute is already defined by
   * TypedArrays to mean the number of elements in the array.
   */
  get magnitude() {
    const x2 = this[0];
    const y2 = this[1];
    const z = this[2];
    return Math.sqrt(x2 * x2 + y2 * y2 + z * z);
  }
  /**
   * Alias for {@link Vec3.magnitude}
   */
  get mag() {
    return this.magnitude;
  }
  /**
   * The squared magnitude (length) of `this`.
   * Equivalent to `Vec3.squaredMagnitude(this);`
   */
  get squaredMagnitude() {
    const x2 = this[0];
    const y2 = this[1];
    const z = this[2];
    return x2 * x2 + y2 * y2 + z * z;
  }
  /**
   * Alias for {@link Vec3.squaredMagnitude}
   */
  get sqrMag() {
    return this.squaredMagnitude;
  }
  /**
   * A string representation of `this`
   * Equivalent to `Vec3.str(this);`
   */
  get str() {
    return Vec3.str(this);
  }
  //===================
  // Instances methods
  //===================
  /**
   * Copy the values from another {@link Vec3} into `this`.
   *
   * @param a the source vector
   * @returns `this`
   */
  copy(a2) {
    this.set(a2);
    return this;
  }
  /**
   * Adds a {@link Vec3} to `this`.
   * Equivalent to `Vec3.add(this, this, b);`
   *
   * @param b - The vector to add to `this`
   * @returns `this`
   */
  add(b2) {
    this[0] += b2[0];
    this[1] += b2[1];
    this[2] += b2[2];
    return this;
  }
  /**
   * Subtracts a {@link Vec3} from `this`.
   * Equivalent to `Vec3.subtract(this, this, b);`
   *
   * @param b - The vector to subtract from `this`
   * @returns `this`
   */
  subtract(b2) {
    this[0] -= b2[0];
    this[1] -= b2[1];
    this[2] -= b2[2];
    return this;
  }
  /**
   * Alias for {@link Vec3.subtract}
   */
  sub(_b2) {
    return this;
  }
  /**
   * Multiplies `this` by a {@link Vec3}.
   * Equivalent to `Vec3.multiply(this, this, b);`
   *
   * @param b - The vector to multiply `this` by
   * @returns `this`
   */
  multiply(b2) {
    this[0] *= b2[0];
    this[1] *= b2[1];
    this[2] *= b2[2];
    return this;
  }
  /**
   * Alias for {@link Vec3.multiply}
   */
  mul(_b2) {
    return this;
  }
  /**
   * Divides `this` by a {@link Vec3}.
   * Equivalent to `Vec3.divide(this, this, b);`
   *
   * @param b - The vector to divide `this` by
   * @returns `this`
   */
  divide(b2) {
    this[0] /= b2[0];
    this[1] /= b2[1];
    this[2] /= b2[2];
    return this;
  }
  /**
   * Alias for {@link Vec3.divide}
   */
  div(_b2) {
    return this;
  }
  /**
   * Scales `this` by a scalar number.
   * Equivalent to `Vec3.scale(this, this, b);`
   *
   * @param b - Amount to scale `this` by
   * @returns `this`
   */
  scale(b2) {
    this[0] *= b2;
    this[1] *= b2;
    this[2] *= b2;
    return this;
  }
  /**
   * Calculates `this` scaled by a scalar value then adds the result to `this`.
   * Equivalent to `Vec3.scaleAndAdd(this, this, b, scale);`
   *
   * @param b - The vector to add to `this`
   * @param scale - The amount to scale `b` by before adding
   * @returns `this`
   */
  scaleAndAdd(b2, scale) {
    this[0] += b2[0] * scale;
    this[1] += b2[1] * scale;
    this[2] += b2[2] * scale;
    return this;
  }
  /**
   * Calculates the euclidian distance between another {@link Vec3} and `this`.
   * Equivalent to `Vec3.distance(this, b);`
   *
   * @param b - The vector to calculate the distance to
   * @returns Distance between `this` and `b`
   */
  distance(b2) {
    return Vec3.distance(this, b2);
  }
  /**
   * Alias for {@link Vec3.distance}
   */
  dist(_b2) {
    return 0;
  }
  /**
   * Calculates the squared euclidian distance between another {@link Vec3} and `this`.
   * Equivalent to `Vec3.squaredDistance(this, b);`
   *
   * @param b The vector to calculate the squared distance to
   * @returns Squared distance between `this` and `b`
   */
  squaredDistance(b2) {
    return Vec3.squaredDistance(this, b2);
  }
  /**
   * Alias for {@link Vec3.squaredDistance}
   */
  sqrDist(_b2) {
    return 0;
  }
  /**
   * Negates the components of `this`.
   * Equivalent to `Vec3.negate(this, this);`
   *
   * @returns `this`
   */
  negate() {
    this[0] *= -1;
    this[1] *= -1;
    this[2] *= -1;
    return this;
  }
  /**
   * Inverts the components of `this`.
   * Equivalent to `Vec3.inverse(this, this);`
   *
   * @returns `this`
   */
  invert() {
    this[0] = 1 / this[0];
    this[1] = 1 / this[1];
    this[2] = 1 / this[2];
    return this;
  }
  /**
   * Sets each component of `this` to it's absolute value.
   * Equivalent to `Vec3.abs(this, this);`
   *
   * @returns `this`
   */
  abs() {
    this[0] = Math.abs(this[0]);
    this[1] = Math.abs(this[1]);
    this[2] = Math.abs(this[2]);
    return this;
  }
  /**
   * Calculates the dot product of this and another {@link Vec3}.
   * Equivalent to `Vec3.dot(this, b);`
   *
   * @param b - The second operand
   * @returns Dot product of `this` and `b`
   */
  dot(b2) {
    return this[0] * b2[0] + this[1] * b2[1] + this[2] * b2[2];
  }
  /**
   * Normalize `this`.
   * Equivalent to `Vec3.normalize(this, this);`
   *
   * @returns `this`
   */
  normalize() {
    return Vec3.normalize(this, this);
  }
  //================
  // Static methods
  //================
  /**
   * Creates a new, empty vec3
   * @category Static
   *
   * @returns a new 3D vector
   */
  static create() {
    return new Vec3();
  }
  /**
   * Creates a new vec3 initialized with values from an existing vector
   * @category Static
   *
   * @param a - vector to clone
   * @returns a new 3D vector
   */
  static clone(a2) {
    return new Vec3(a2);
  }
  /**
   * Calculates the magnitude (length) of a {@link Vec3}
   * @category Static
   *
   * @param a - Vector to calculate magnitude of
   * @returns Magnitude of a
   */
  static magnitude(a2) {
    const x2 = a2[0];
    const y2 = a2[1];
    const z = a2[2];
    return Math.sqrt(x2 * x2 + y2 * y2 + z * z);
  }
  /**
   * Alias for {@link Vec3.magnitude}
   * @category Static
   */
  static mag(_a2) {
    return 0;
  }
  /**
   * Alias for {@link Vec3.magnitude}
   * @category Static
   * @deprecated Use {@link Vec3.magnitude} to avoid conflicts with builtin `length` methods/attribs
   *
   * @param a - vector to calculate length of
   * @returns length of a
   */
  // @ts-ignore: Length conflicts with Function.length
  static length(_a2) {
    return 0;
  }
  /**
   * Alias for {@link Vec3.magnitude}
   * @category Static
   * @deprecated Use {@link Vec3.mag}
   */
  static len(_a2) {
    return 0;
  }
  /**
   * Creates a new vec3 initialized with the given values
   * @category Static
   *
   * @param x - X component
   * @param y - Y component
   * @param z - Z component
   * @returns a new 3D vector
   */
  static fromValues(x2, y2, z) {
    return new Vec3(x2, y2, z);
  }
  /**
   * Copy the values from one vec3 to another
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - the source vector
   * @returns `out`
   */
  static copy(out, a2) {
    out[0] = a2[0];
    out[1] = a2[1];
    out[2] = a2[2];
    return out;
  }
  /**
   * Set the components of a vec3 to the given values
   * @category Static
   *
   * @param out - the receiving vector
   * @param x - X component
   * @param y - Y component
   * @param z - Z component
   * @returns `out`
   */
  static set(out, x2, y2, z) {
    out[0] = x2;
    out[1] = y2;
    out[2] = z;
    return out;
  }
  /**
   * Adds two {@link Vec3}s
   * @category Static
   *
   * @param out - The receiving vector
   * @param a - The first operand
   * @param b - The second operand
   * @returns `out`
   */
  static add(out, a2, b2) {
    out[0] = a2[0] + b2[0];
    out[1] = a2[1] + b2[1];
    out[2] = a2[2] + b2[2];
    return out;
  }
  /**
   * Subtracts vector b from vector a
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - the first operand
   * @param b - the second operand
   * @returns `out`
   */
  static subtract(out, a2, b2) {
    out[0] = a2[0] - b2[0];
    out[1] = a2[1] - b2[1];
    out[2] = a2[2] - b2[2];
    return out;
  }
  /**
   * Alias for {@link Vec3.subtract}
   * @category Static
   */
  static sub(_out, _a2, _b2) {
    return [0, 0, 0];
  }
  /**
   * Multiplies two vec3's
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - the first operand
   * @param b - the second operand
   * @returns `out`
   */
  static multiply(out, a2, b2) {
    out[0] = a2[0] * b2[0];
    out[1] = a2[1] * b2[1];
    out[2] = a2[2] * b2[2];
    return out;
  }
  /**
   * Alias for {@link Vec3.multiply}
   * @category Static
   */
  static mul(_out, _a2, _b2) {
    return [0, 0, 0];
  }
  /**
   * Divides two vec3's
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - the first operand
   * @param b - the second operand
   * @returns `out`
   */
  static divide(out, a2, b2) {
    out[0] = a2[0] / b2[0];
    out[1] = a2[1] / b2[1];
    out[2] = a2[2] / b2[2];
    return out;
  }
  /**
   * Alias for {@link Vec3.divide}
   * @category Static
   */
  static div(_out, _a2, _b2) {
    return [0, 0, 0];
  }
  /**
   * Math.ceil the components of a vec3
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - vector to ceil
   * @returns `out`
   */
  static ceil(out, a2) {
    out[0] = Math.ceil(a2[0]);
    out[1] = Math.ceil(a2[1]);
    out[2] = Math.ceil(a2[2]);
    return out;
  }
  /**
   * Math.floor the components of a vec3
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - vector to floor
   * @returns `out`
   */
  static floor(out, a2) {
    out[0] = Math.floor(a2[0]);
    out[1] = Math.floor(a2[1]);
    out[2] = Math.floor(a2[2]);
    return out;
  }
  /**
   * Returns the minimum of two vec3's
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - the first operand
   * @param b - the second operand
   * @returns `out`
   */
  static min(out, a2, b2) {
    out[0] = Math.min(a2[0], b2[0]);
    out[1] = Math.min(a2[1], b2[1]);
    out[2] = Math.min(a2[2], b2[2]);
    return out;
  }
  /**
   * Returns the maximum of two vec3's
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - the first operand
   * @param b - the second operand
   * @returns `out`
   */
  static max(out, a2, b2) {
    out[0] = Math.max(a2[0], b2[0]);
    out[1] = Math.max(a2[1], b2[1]);
    out[2] = Math.max(a2[2], b2[2]);
    return out;
  }
  /**
   * symmetric round the components of a vec3
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - vector to round
   * @returns `out`
   */
  /*static round(out: Vec3Like, a: Readonly<Vec3Like>): Vec3Like {
    out[0] = glMatrix.round(a[0]);
    out[1] = glMatrix.round(a[1]);
    out[2] = glMatrix.round(a[2]);
    return out;
  }*/
  /**
   * Scales a vec3 by a scalar number
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - the vector to scale
   * @param scale - amount to scale the vector by
   * @returns `out`
   */
  static scale(out, a2, scale) {
    out[0] = a2[0] * scale;
    out[1] = a2[1] * scale;
    out[2] = a2[2] * scale;
    return out;
  }
  /**
   * Adds two vec3's after scaling the second operand by a scalar value
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - the first operand
   * @param b - the second operand
   * @param scale - the amount to scale b by before adding
   * @returns `out`
   */
  static scaleAndAdd(out, a2, b2, scale) {
    out[0] = a2[0] + b2[0] * scale;
    out[1] = a2[1] + b2[1] * scale;
    out[2] = a2[2] + b2[2] * scale;
    return out;
  }
  /**
   * Calculates the euclidian distance between two vec3's
   * @category Static
   *
   * @param a - the first operand
   * @param b - the second operand
   * @returns distance between a and b
   */
  static distance(a2, b2) {
    const x2 = b2[0] - a2[0];
    const y2 = b2[1] - a2[1];
    const z = b2[2] - a2[2];
    return Math.sqrt(x2 * x2 + y2 * y2 + z * z);
  }
  /**
   * Alias for {@link Vec3.distance}
   */
  static dist(_a2, _b2) {
    return 0;
  }
  /**
   * Calculates the squared euclidian distance between two vec3's
   * @category Static
   *
   * @param a - the first operand
   * @param b - the second operand
   * @returns squared distance between a and b
   */
  static squaredDistance(a2, b2) {
    const x2 = b2[0] - a2[0];
    const y2 = b2[1] - a2[1];
    const z = b2[2] - a2[2];
    return x2 * x2 + y2 * y2 + z * z;
  }
  /**
   * Alias for {@link Vec3.squaredDistance}
   */
  static sqrDist(_a2, _b2) {
    return 0;
  }
  /**
   * Calculates the squared length of a vec3
   * @category Static
   *
   * @param a - vector to calculate squared length of
   * @returns squared length of a
   */
  static squaredLength(a2) {
    const x2 = a2[0];
    const y2 = a2[1];
    const z = a2[2];
    return x2 * x2 + y2 * y2 + z * z;
  }
  /**
   * Alias for {@link Vec3.squaredLength}
   */
  static sqrLen(_a2, _b2) {
    return 0;
  }
  /**
   * Negates the components of a vec3
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - vector to negate
   * @returns `out`
   */
  static negate(out, a2) {
    out[0] = -a2[0];
    out[1] = -a2[1];
    out[2] = -a2[2];
    return out;
  }
  /**
   * Returns the inverse of the components of a vec3
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - vector to invert
   * @returns `out`
   */
  static inverse(out, a2) {
    out[0] = 1 / a2[0];
    out[1] = 1 / a2[1];
    out[2] = 1 / a2[2];
    return out;
  }
  /**
   * Returns the absolute value of the components of a {@link Vec3}
   * @category Static
   *
   * @param out - The receiving vector
   * @param a - Vector to compute the absolute values of
   * @returns `out`
   */
  static abs(out, a2) {
    out[0] = Math.abs(a2[0]);
    out[1] = Math.abs(a2[1]);
    out[2] = Math.abs(a2[2]);
    return out;
  }
  /**
   * Normalize a vec3
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - vector to normalize
   * @returns `out`
   */
  static normalize(out, a2) {
    const x2 = a2[0];
    const y2 = a2[1];
    const z = a2[2];
    let len = x2 * x2 + y2 * y2 + z * z;
    if (len > 0) {
      len = 1 / Math.sqrt(len);
    }
    out[0] = a2[0] * len;
    out[1] = a2[1] * len;
    out[2] = a2[2] * len;
    return out;
  }
  /**
   * Calculates the dot product of two vec3's
   * @category Static
   *
   * @param a - the first operand
   * @param b - the second operand
   * @returns dot product of a and b
   */
  static dot(a2, b2) {
    return a2[0] * b2[0] + a2[1] * b2[1] + a2[2] * b2[2];
  }
  /**
   * Computes the cross product of two vec3's
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - the first operand
   * @param b - the second operand
   * @returns `out`
   */
  static cross(out, a2, b2) {
    const ax = a2[0], ay = a2[1], az = a2[2];
    const bx = b2[0], by = b2[1], bz = b2[2];
    out[0] = ay * bz - az * by;
    out[1] = az * bx - ax * bz;
    out[2] = ax * by - ay * bx;
    return out;
  }
  /**
   * Performs a linear interpolation between two vec3's
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - the first operand
   * @param b - the second operand
   * @param t - interpolation amount, in the range [0-1], between the two inputs
   * @returns `out`
   */
  static lerp(out, a2, b2, t2) {
    const ax = a2[0];
    const ay = a2[1];
    const az = a2[2];
    out[0] = ax + t2 * (b2[0] - ax);
    out[1] = ay + t2 * (b2[1] - ay);
    out[2] = az + t2 * (b2[2] - az);
    return out;
  }
  /**
   * Performs a spherical linear interpolation between two vec3's
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - the first operand
   * @param b - the second operand
   * @param t - interpolation amount, in the range [0-1], between the two inputs
   * @returns `out`
   */
  static slerp(out, a2, b2, t2) {
    const angle = Math.acos(Math.min(Math.max(Vec3.dot(a2, b2), -1), 1));
    const sinTotal = Math.sin(angle);
    const ratioA = Math.sin((1 - t2) * angle) / sinTotal;
    const ratioB = Math.sin(t2 * angle) / sinTotal;
    out[0] = ratioA * a2[0] + ratioB * b2[0];
    out[1] = ratioA * a2[1] + ratioB * b2[1];
    out[2] = ratioA * a2[2] + ratioB * b2[2];
    return out;
  }
  /**
   * Performs a hermite interpolation with two control points
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - the first operand
   * @param b - the second operand
   * @param c - the third operand
   * @param d - the fourth operand
   * @param t - interpolation amount, in the range [0-1], between the two inputs
   * @returns `out`
   */
  static hermite(out, a2, b2, c2, d2, t2) {
    const factorTimes2 = t2 * t2;
    const factor1 = factorTimes2 * (2 * t2 - 3) + 1;
    const factor2 = factorTimes2 * (t2 - 2) + t2;
    const factor3 = factorTimes2 * (t2 - 1);
    const factor4 = factorTimes2 * (3 - 2 * t2);
    out[0] = a2[0] * factor1 + b2[0] * factor2 + c2[0] * factor3 + d2[0] * factor4;
    out[1] = a2[1] * factor1 + b2[1] * factor2 + c2[1] * factor3 + d2[1] * factor4;
    out[2] = a2[2] * factor1 + b2[2] * factor2 + c2[2] * factor3 + d2[2] * factor4;
    return out;
  }
  /**
   * Performs a bezier interpolation with two control points
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - the first operand
   * @param b - the second operand
   * @param c - the third operand
   * @param d - the fourth operand
   * @param t - interpolation amount, in the range [0-1], between the two inputs
   * @returns `out`
   */
  static bezier(out, a2, b2, c2, d2, t2) {
    const inverseFactor = 1 - t2;
    const inverseFactorTimesTwo = inverseFactor * inverseFactor;
    const factorTimes2 = t2 * t2;
    const factor1 = inverseFactorTimesTwo * inverseFactor;
    const factor2 = 3 * t2 * inverseFactorTimesTwo;
    const factor3 = 3 * factorTimes2 * inverseFactor;
    const factor4 = factorTimes2 * t2;
    out[0] = a2[0] * factor1 + b2[0] * factor2 + c2[0] * factor3 + d2[0] * factor4;
    out[1] = a2[1] * factor1 + b2[1] * factor2 + c2[1] * factor3 + d2[1] * factor4;
    out[2] = a2[2] * factor1 + b2[2] * factor2 + c2[2] * factor3 + d2[2] * factor4;
    return out;
  }
  /**
   * Generates a random vector with the given scale
   * @category Static
   *
   * @param out - the receiving vector
   * @param {Number} [scale] Length of the resulting vector. If omitted, a unit vector will be returned
   * @returns `out`
   */
  /*static random(out: Vec3Like, scale) {
      scale = scale === undefined ? 1.0 : scale;
  
      let r = glMatrix.RANDOM() * 2.0 * Math.PI;
      let z = glMatrix.RANDOM() * 2.0 - 1.0;
      let zScale = Math.sqrt(1.0 - z * z) * scale;
  
      out[0] = Math.cos(r) * zScale;
      out[1] = Math.sin(r) * zScale;
      out[2] = z * scale;
      return out;
    }*/
  /**
   * Transforms the vec3 with a mat4.
   * 4th vector component is implicitly '1'
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - the vector to transform
   * @param m - matrix to transform with
   * @returns `out`
   */
  static transformMat4(out, a2, m2) {
    const x2 = a2[0], y2 = a2[1], z = a2[2];
    const w2 = m2[3] * x2 + m2[7] * y2 + m2[11] * z + m2[15] || 1;
    out[0] = (m2[0] * x2 + m2[4] * y2 + m2[8] * z + m2[12]) / w2;
    out[1] = (m2[1] * x2 + m2[5] * y2 + m2[9] * z + m2[13]) / w2;
    out[2] = (m2[2] * x2 + m2[6] * y2 + m2[10] * z + m2[14]) / w2;
    return out;
  }
  /**
   * Transforms the vec3 with a mat3.
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - the vector to transform
   * @param m - the 3x3 matrix to transform with
   * @returns `out`
   */
  static transformMat3(out, a2, m2) {
    const x2 = a2[0], y2 = a2[1], z = a2[2];
    out[0] = x2 * m2[0] + y2 * m2[3] + z * m2[6];
    out[1] = x2 * m2[1] + y2 * m2[4] + z * m2[7];
    out[2] = x2 * m2[2] + y2 * m2[5] + z * m2[8];
    return out;
  }
  /**
   * Transforms the vec3 with a quat
   * Can also be used for dual quaternions. (Multiply it with the real part)
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - the vector to transform
   * @param q - quaternion to transform with
   * @returns `out`
   */
  static transformQuat(out, a2, q) {
    const qx = q[0];
    const qy = q[1];
    const qz = q[2];
    const w2 = q[3] * 2;
    const x2 = a2[0];
    const y2 = a2[1];
    const z = a2[2];
    const uvx = qy * z - qz * y2;
    const uvy = qz * x2 - qx * z;
    const uvz = qx * y2 - qy * x2;
    const uuvx = (qy * uvz - qz * uvy) * 2;
    const uuvy = (qz * uvx - qx * uvz) * 2;
    const uuvz = (qx * uvy - qy * uvx) * 2;
    out[0] = x2 + uvx * w2 + uuvx;
    out[1] = y2 + uvy * w2 + uuvy;
    out[2] = z + uvz * w2 + uuvz;
    return out;
  }
  /**
   * Rotate a 3D vector around the x-axis
   * @param out - The receiving vec3
   * @param a - The vec3 point to rotate
   * @param b - The origin of the rotation
   * @param rad - The angle of rotation in radians
   * @returns `out`
   */
  static rotateX(out, a2, b2, rad) {
    const by = b2[1];
    const bz = b2[2];
    const py = a2[1] - by;
    const pz = a2[2] - bz;
    out[0] = a2[0];
    out[1] = py * Math.cos(rad) - pz * Math.sin(rad) + by;
    out[2] = py * Math.sin(rad) + pz * Math.cos(rad) + bz;
    return out;
  }
  /**
   * Rotate a 3D vector around the y-axis
   * @param out - The receiving vec3
   * @param a - The vec3 point to rotate
   * @param b - The origin of the rotation
   * @param rad - The angle of rotation in radians
   * @returns `out`
   */
  static rotateY(out, a2, b2, rad) {
    const bx = b2[0];
    const bz = b2[2];
    const px = a2[0] - bx;
    const pz = a2[2] - bz;
    out[0] = pz * Math.sin(rad) + px * Math.cos(rad) + bx;
    out[1] = a2[1];
    out[2] = pz * Math.cos(rad) - px * Math.sin(rad) + bz;
    return out;
  }
  /**
   * Rotate a 3D vector around the z-axis
   * @param out - The receiving vec3
   * @param a - The vec3 point to rotate
   * @param b - The origin of the rotation
   * @param rad - The angle of rotation in radians
   * @returns `out`
   */
  static rotateZ(out, a2, b2, rad) {
    const bx = b2[0];
    const by = b2[1];
    const px = a2[0] - bx;
    const py = a2[1] - by;
    out[0] = px * Math.cos(rad) - py * Math.sin(rad) + bx;
    out[1] = px * Math.sin(rad) + py * Math.cos(rad) + by;
    out[2] = b2[2];
    return out;
  }
  /**
   * Get the angle between two 3D vectors
   * @param a - The first operand
   * @param b - The second operand
   * @returns The angle in radians
   */
  static angle(a2, b2) {
    const ax = a2[0];
    const ay = a2[1];
    const az = a2[2];
    const bx = b2[0];
    const by = b2[1];
    const bz = b2[2];
    const mag = Math.sqrt((ax * ax + ay * ay + az * az) * (bx * bx + by * by + bz * bz));
    const cosine = mag && Vec3.dot(a2, b2) / mag;
    return Math.acos(Math.min(Math.max(cosine, -1), 1));
  }
  /**
   * Set the components of a vec3 to zero
   * @category Static
   *
   * @param out - the receiving vector
   * @returns `out`
   */
  static zero(out) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    return out;
  }
  /**
   * Returns a string representation of a vector
   * @category Static
   *
   * @param a - vector to represent as a string
   * @returns string representation of the vector
   */
  static str(a2) {
    return `Vec3(${a2.join(", ")})`;
  }
  /**
   * Returns whether or not the vectors have exactly the same elements in the same position (when compared with ===)
   * @category Static
   *
   * @param a - The first vector.
   * @param b - The second vector.
   * @returns True if the vectors are equal, false otherwise.
   */
  static exactEquals(a2, b2) {
    return a2[0] === b2[0] && a2[1] === b2[1] && a2[2] === b2[2];
  }
  /**
   * Returns whether or not the vectors have approximately the same elements in the same position.
   * @category Static
   *
   * @param a - The first vector.
   * @param b - The second vector.
   * @returns True if the vectors are equal, false otherwise.
   */
  static equals(a2, b2) {
    const a0 = a2[0];
    const a1 = a2[1];
    const a22 = a2[2];
    const b0 = b2[0];
    const b1 = b2[1];
    const b22 = b2[2];
    return Math.abs(a0 - b0) <= EPSILON * Math.max(1, Math.abs(a0), Math.abs(b0)) && Math.abs(a1 - b1) <= EPSILON * Math.max(1, Math.abs(a1), Math.abs(b1)) && Math.abs(a22 - b22) <= EPSILON * Math.max(1, Math.abs(a22), Math.abs(b22));
  }
}
Vec3.prototype.sub = Vec3.prototype.subtract;
Vec3.prototype.mul = Vec3.prototype.multiply;
Vec3.prototype.div = Vec3.prototype.divide;
Vec3.prototype.dist = Vec3.prototype.distance;
Vec3.prototype.sqrDist = Vec3.prototype.squaredDistance;
Vec3.sub = Vec3.subtract;
Vec3.mul = Vec3.multiply;
Vec3.div = Vec3.divide;
Vec3.dist = Vec3.distance;
Vec3.sqrDist = Vec3.squaredDistance;
Vec3.sqrLen = Vec3.squaredLength;
Vec3.mag = Vec3.magnitude;
Vec3.length = Vec3.magnitude;
Vec3.len = Vec3.magnitude;
class Vec4 extends Float32Array {
  /**
   * The number of bytes in a {@link Vec4}.
   */
  static BYTE_LENGTH = 4 * Float32Array.BYTES_PER_ELEMENT;
  /**
   * Create a {@link Vec4}.
   */
  constructor(...values) {
    switch (values.length) {
      case 4:
        super(values);
        break;
      case 2:
        super(values[0], values[1], 4);
        break;
      case 1: {
        const v2 = values[0];
        if (typeof v2 === "number") {
          super([v2, v2, v2, v2]);
        } else {
          super(v2, 0, 4);
        }
        break;
      }
      default:
        super(4);
        break;
    }
  }
  //============
  // Attributes
  //============
  // Getters and setters to make component access read better.
  // These are likely to be a little bit slower than direct array access.
  /**
   * The x component of the vector. Equivalent to `this[0];`
   * @category Vector components
   */
  get x() {
    return this[0];
  }
  set x(value) {
    this[0] = value;
  }
  /**
   * The y component of the vector. Equivalent to `this[1];`
   * @category Vector components
   */
  get y() {
    return this[1];
  }
  set y(value) {
    this[1] = value;
  }
  /**
   * The z component of the vector. Equivalent to `this[2];`
   * @category Vector components
   */
  get z() {
    return this[2];
  }
  set z(value) {
    this[2] = value;
  }
  /**
   * The w component of the vector. Equivalent to `this[3];`
   * @category Vector components
   */
  get w() {
    return this[3];
  }
  set w(value) {
    this[3] = value;
  }
  // Alternate set of getters and setters in case this is being used to define
  // a color.
  /**
   * The r component of the vector. Equivalent to `this[0];`
   * @category Color components
   */
  get r() {
    return this[0];
  }
  set r(value) {
    this[0] = value;
  }
  /**
   * The g component of the vector. Equivalent to `this[1];`
   * @category Color components
   */
  get g() {
    return this[1];
  }
  set g(value) {
    this[1] = value;
  }
  /**
   * The b component of the vector. Equivalent to `this[2];`
   * @category Color components
   */
  get b() {
    return this[2];
  }
  set b(value) {
    this[2] = value;
  }
  /**
   * The a component of the vector. Equivalent to `this[3];`
   * @category Color components
   */
  get a() {
    return this[3];
  }
  set a(value) {
    this[3] = value;
  }
  /**
   * The magnitude (length) of this.
   * Equivalent to `Vec4.magnitude(this);`
   *
   * Magnitude is used because the `length` attribute is already defined by
   * TypedArrays to mean the number of elements in the array.
   */
  get magnitude() {
    const x2 = this[0];
    const y2 = this[1];
    const z = this[2];
    const w2 = this[3];
    return Math.sqrt(x2 * x2 + y2 * y2 + z * z + w2 * w2);
  }
  /**
   * Alias for {@link Vec4.magnitude}
   */
  get mag() {
    return this.magnitude;
  }
  /**
   * A string representation of `this`
   * Equivalent to `Vec4.str(this);`
   */
  get str() {
    return Vec4.str(this);
  }
  //===================
  // Instances methods
  //===================
  /**
   * Copy the values from another {@link Vec4} into `this`.
   *
   * @param a the source vector
   * @returns `this`
   */
  copy(a2) {
    super.set(a2);
    return this;
  }
  /**
   * Adds a {@link Vec4} to `this`.
   * Equivalent to `Vec4.add(this, this, b);`
   *
   * @param b - The vector to add to `this`
   * @returns `this`
   */
  add(b2) {
    this[0] += b2[0];
    this[1] += b2[1];
    this[2] += b2[2];
    this[3] += b2[3];
    return this;
  }
  /**
   * Subtracts a {@link Vec4} from `this`.
   * Equivalent to `Vec4.subtract(this, this, b);`
   *
   * @param b - The vector to subtract from `this`
   * @returns `this`
   */
  subtract(b2) {
    this[0] -= b2[0];
    this[1] -= b2[1];
    this[2] -= b2[2];
    this[3] -= b2[3];
    return this;
  }
  /**
   * Alias for {@link Vec4.subtract}
   */
  sub(_b2) {
    return this;
  }
  /**
   * Multiplies `this` by a {@link Vec4}.
   * Equivalent to `Vec4.multiply(this, this, b);`
   *
   * @param b - The vector to multiply `this` by
   * @returns `this`
   */
  multiply(b2) {
    this[0] *= b2[0];
    this[1] *= b2[1];
    this[2] *= b2[2];
    this[3] *= b2[3];
    return this;
  }
  /**
   * Alias for {@link Vec4.multiply}
   */
  mul(_b2) {
    return this;
  }
  /**
   * Divides `this` by a {@link Vec4}.
   * Equivalent to `Vec4.divide(this, this, b);`
   *
   * @param b - The vector to divide `this` by
   * @returns `this`
   */
  divide(b2) {
    this[0] /= b2[0];
    this[1] /= b2[1];
    this[2] /= b2[2];
    this[3] /= b2[3];
    return this;
  }
  /**
   * Alias for {@link Vec4.divide}
   */
  div(_b2) {
    return this;
  }
  /**
   * Scales `this` by a scalar number.
   * Equivalent to `Vec4.scale(this, this, b);`
   *
   * @param b - Amount to scale `this` by
   * @returns `this`
   */
  scale(b2) {
    this[0] *= b2;
    this[1] *= b2;
    this[2] *= b2;
    this[3] *= b2;
    return this;
  }
  /**
   * Calculates `this` scaled by a scalar value then adds the result to `this`.
   * Equivalent to `Vec4.scaleAndAdd(this, this, b, scale);`
   *
   * @param b - The vector to add to `this`
   * @param scale - The amount to scale `b` by before adding
   * @returns `this`
   */
  scaleAndAdd(b2, scale) {
    this[0] += b2[0] * scale;
    this[1] += b2[1] * scale;
    this[2] += b2[2] * scale;
    this[3] += b2[3] * scale;
    return this;
  }
  /**
   * Calculates the euclidian distance between another {@link Vec4} and `this`.
   * Equivalent to `Vec4.distance(this, b);`
   *
   * @param b - The vector to calculate the distance to
   * @returns Distance between `this` and `b`
   */
  distance(b2) {
    return Vec4.distance(this, b2);
  }
  /**
   * Alias for {@link Vec4.distance}
   */
  dist(_b2) {
    return 0;
  }
  /**
   * Calculates the squared euclidian distance between another {@link Vec4} and `this`.
   * Equivalent to `Vec4.squaredDistance(this, b);`
   *
   * @param b The vector to calculate the squared distance to
   * @returns Squared distance between `this` and `b`
   */
  squaredDistance(b2) {
    return Vec4.squaredDistance(this, b2);
  }
  /**
   * Alias for {@link Vec4.squaredDistance}
   */
  sqrDist(_b2) {
    return 0;
  }
  /**
   * Negates the components of `this`.
   * Equivalent to `Vec4.negate(this, this);`
   *
   * @returns `this`
   */
  negate() {
    this[0] *= -1;
    this[1] *= -1;
    this[2] *= -1;
    this[3] *= -1;
    return this;
  }
  /**
   * Inverts the components of `this`.
   * Equivalent to `Vec4.inverse(this, this);`
   *
   * @returns `this`
   */
  invert() {
    this[0] = 1 / this[0];
    this[1] = 1 / this[1];
    this[2] = 1 / this[2];
    this[3] = 1 / this[3];
    return this;
  }
  /**
   * Sets each component of `this` to it's absolute value.
   * Equivalent to `Vec4.abs(this, this);`
   *
   * @returns `this`
   */
  abs() {
    this[0] = Math.abs(this[0]);
    this[1] = Math.abs(this[1]);
    this[2] = Math.abs(this[2]);
    this[3] = Math.abs(this[3]);
    return this;
  }
  /**
   * Calculates the dot product of this and another {@link Vec4}.
   * Equivalent to `Vec4.dot(this, b);`
   *
   * @param b - The second operand
   * @returns Dot product of `this` and `b`
   */
  dot(b2) {
    return this[0] * b2[0] + this[1] * b2[1] + this[2] * b2[2] + this[3] * b2[3];
  }
  /**
   * Normalize `this`.
   * Equivalent to `Vec4.normalize(this, this);`
   *
   * @returns `this`
   */
  normalize() {
    return Vec4.normalize(this, this);
  }
  //===================
  // Static methods
  //===================
  /**
   * Creates a new, empty {@link Vec4}
   * @category Static
   *
   * @returns a new 4D vector
   */
  static create() {
    return new Vec4();
  }
  /**
   * Creates a new {@link Vec4} initialized with values from an existing vector
   * @category Static
   *
   * @param a - vector to clone
   * @returns a new 4D vector
   */
  static clone(a2) {
    return new Vec4(a2);
  }
  /**
   * Creates a new {@link Vec4} initialized with the given values
   * @category Static
   *
   * @param x - X component
   * @param y - Y component
   * @param z - Z component
   * @param w - W component
   * @returns a new 4D vector
   */
  static fromValues(x2, y2, z, w2) {
    return new Vec4(x2, y2, z, w2);
  }
  /**
   * Copy the values from one {@link Vec4} to another
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - the source vector
   * @returns `out`
   */
  static copy(out, a2) {
    out[0] = a2[0];
    out[1] = a2[1];
    out[2] = a2[2];
    out[3] = a2[3];
    return out;
  }
  /**
   * Set the components of a {@link Vec4} to the given values
   * @category Static
   *
   * @param out - the receiving vector
   * @param x - X component
   * @param y - Y component
   * @param z - Z component
   * @param w - W component
   * @returns `out`
   */
  static set(out, x2, y2, z, w2) {
    out[0] = x2;
    out[1] = y2;
    out[2] = z;
    out[3] = w2;
    return out;
  }
  /**
   * Adds two {@link Vec4}s
   * @category Static
   *
   * @param out - The receiving vector
   * @param a - The first operand
   * @param b - The second operand
   * @returns `out`
   */
  static add(out, a2, b2) {
    out[0] = a2[0] + b2[0];
    out[1] = a2[1] + b2[1];
    out[2] = a2[2] + b2[2];
    out[3] = a2[3] + b2[3];
    return out;
  }
  /**
   * Subtracts vector b from vector a
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - the first operand
   * @param b - the second operand
   * @returns `out`
   */
  static subtract(out, a2, b2) {
    out[0] = a2[0] - b2[0];
    out[1] = a2[1] - b2[1];
    out[2] = a2[2] - b2[2];
    out[3] = a2[3] - b2[3];
    return out;
  }
  /**
   * Alias for {@link Vec4.subtract}
   * @category Static
   */
  static sub(out, _a2, _b2) {
    return out;
  }
  /**
   * Multiplies two {@link Vec4}'s
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - the first operand
   * @param b - the second operand
   * @returns `out`
   */
  static multiply(out, a2, b2) {
    out[0] = a2[0] * b2[0];
    out[1] = a2[1] * b2[1];
    out[2] = a2[2] * b2[2];
    out[3] = a2[3] * b2[3];
    return out;
  }
  /**
   * Alias for {@link Vec4.multiply}
   * @category Static
   */
  static mul(out, _a2, _b2) {
    return out;
  }
  /**
   * Divides two {@link Vec4}'s
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - the first operand
   * @param b - the second operand
   * @returns `out`
   */
  static divide(out, a2, b2) {
    out[0] = a2[0] / b2[0];
    out[1] = a2[1] / b2[1];
    out[2] = a2[2] / b2[2];
    out[3] = a2[3] / b2[3];
    return out;
  }
  /**
   * Alias for {@link Vec4.divide}
   * @category Static
   */
  static div(out, _a2, _b2) {
    return out;
  }
  /**
   * Math.ceil the components of a {@link Vec4}
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - vector to ceil
   * @returns `out`
   */
  static ceil(out, a2) {
    out[0] = Math.ceil(a2[0]);
    out[1] = Math.ceil(a2[1]);
    out[2] = Math.ceil(a2[2]);
    out[3] = Math.ceil(a2[3]);
    return out;
  }
  /**
   * Math.floor the components of a {@link Vec4}
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - vector to floor
   * @returns `out`
   */
  static floor(out, a2) {
    out[0] = Math.floor(a2[0]);
    out[1] = Math.floor(a2[1]);
    out[2] = Math.floor(a2[2]);
    out[3] = Math.floor(a2[3]);
    return out;
  }
  /**
   * Returns the minimum of two {@link Vec4}'s
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - the first operand
   * @param b - the second operand
   * @returns `out`
   */
  static min(out, a2, b2) {
    out[0] = Math.min(a2[0], b2[0]);
    out[1] = Math.min(a2[1], b2[1]);
    out[2] = Math.min(a2[2], b2[2]);
    out[3] = Math.min(a2[3], b2[3]);
    return out;
  }
  /**
   * Returns the maximum of two {@link Vec4}'s
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - the first operand
   * @param b - the second operand
   * @returns `out`
   */
  static max(out, a2, b2) {
    out[0] = Math.max(a2[0], b2[0]);
    out[1] = Math.max(a2[1], b2[1]);
    out[2] = Math.max(a2[2], b2[2]);
    out[3] = Math.max(a2[3], b2[3]);
    return out;
  }
  /**
   * Math.round the components of a {@link Vec4}
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - vector to round
   * @returns `out`
   */
  static round(out, a2) {
    out[0] = Math.round(a2[0]);
    out[1] = Math.round(a2[1]);
    out[2] = Math.round(a2[2]);
    out[3] = Math.round(a2[3]);
    return out;
  }
  /**
   * Scales a {@link Vec4} by a scalar number
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - the vector to scale
   * @param scale - amount to scale the vector by
   * @returns `out`
   */
  static scale(out, a2, scale) {
    out[0] = a2[0] * scale;
    out[1] = a2[1] * scale;
    out[2] = a2[2] * scale;
    out[3] = a2[3] * scale;
    return out;
  }
  /**
   * Adds two {@link Vec4}'s after scaling the second operand by a scalar value
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - the first operand
   * @param b - the second operand
   * @param scale - the amount to scale b by before adding
   * @returns `out`
   */
  static scaleAndAdd(out, a2, b2, scale) {
    out[0] = a2[0] + b2[0] * scale;
    out[1] = a2[1] + b2[1] * scale;
    out[2] = a2[2] + b2[2] * scale;
    out[3] = a2[3] + b2[3] * scale;
    return out;
  }
  /**
   * Calculates the euclidian distance between two {@link Vec4}'s
   * @category Static
   *
   * @param a - the first operand
   * @param b - the second operand
   * @returns distance between a and b
   */
  static distance(a2, b2) {
    const x2 = b2[0] - a2[0];
    const y2 = b2[1] - a2[1];
    const z = b2[2] - a2[2];
    const w2 = b2[3] - a2[3];
    return Math.hypot(x2, y2, z, w2);
  }
  /**
   * Alias for {@link Vec4.distance}
   * @category Static
   */
  static dist(_a2, _b2) {
    return 0;
  }
  /**
   * Calculates the squared euclidian distance between two {@link Vec4}'s
   * @category Static
   *
   * @param a - the first operand
   * @param b - the second operand
   * @returns squared distance between a and b
   */
  static squaredDistance(a2, b2) {
    const x2 = b2[0] - a2[0];
    const y2 = b2[1] - a2[1];
    const z = b2[2] - a2[2];
    const w2 = b2[3] - a2[3];
    return x2 * x2 + y2 * y2 + z * z + w2 * w2;
  }
  /**
   * Alias for {@link Vec4.squaredDistance}
   * @category Static
   */
  static sqrDist(_a2, _b2) {
    return 0;
  }
  /**
   * Calculates the magnitude (length) of a {@link Vec4}
   * @category Static
   *
   * @param a - vector to calculate length of
   * @returns length of `a`
   */
  static magnitude(a2) {
    const x2 = a2[0];
    const y2 = a2[1];
    const z = a2[2];
    const w2 = a2[3];
    return Math.sqrt(x2 * x2 + y2 * y2 + z * z + w2 * w2);
  }
  /**
   * Alias for {@link Vec4.magnitude}
   * @category Static
   */
  static mag(_a2) {
    return 0;
  }
  /**
   * Alias for {@link Vec4.magnitude}
   * @category Static
   * @deprecated Use {@link Vec4.magnitude} to avoid conflicts with builtin `length` methods/attribs
   */
  // @ts-ignore: Length conflicts with Function.length
  static length(_a2) {
    return 0;
  }
  /**
   * Alias for {@link Vec4.magnitude}
   * @category Static
   * @deprecated Use {@link Vec4.mag}
   */
  static len(_a2) {
    return 0;
  }
  /**
   * Calculates the squared length of a {@link Vec4}
   * @category Static
   *
   * @param a - vector to calculate squared length of
   * @returns squared length of a
   */
  static squaredLength(a2) {
    const x2 = a2[0];
    const y2 = a2[1];
    const z = a2[2];
    const w2 = a2[3];
    return x2 * x2 + y2 * y2 + z * z + w2 * w2;
  }
  /**
   * Alias for {@link Vec4.squaredLength}
   * @category Static
   */
  static sqrLen(_a2) {
    return 0;
  }
  /**
   * Negates the components of a {@link Vec4}
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - vector to negate
   * @returns `out`
   */
  static negate(out, a2) {
    out[0] = -a2[0];
    out[1] = -a2[1];
    out[2] = -a2[2];
    out[3] = -a2[3];
    return out;
  }
  /**
   * Returns the inverse of the components of a {@link Vec4}
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - vector to invert
   * @returns `out`
   */
  static inverse(out, a2) {
    out[0] = 1 / a2[0];
    out[1] = 1 / a2[1];
    out[2] = 1 / a2[2];
    out[3] = 1 / a2[3];
    return out;
  }
  /**
   * Returns the absolute value of the components of a {@link Vec4}
   * @category Static
   *
   * @param out - The receiving vector
   * @param a - Vector to compute the absolute values of
   * @returns `out`
   */
  static abs(out, a2) {
    out[0] = Math.abs(a2[0]);
    out[1] = Math.abs(a2[1]);
    out[2] = Math.abs(a2[2]);
    out[3] = Math.abs(a2[3]);
    return out;
  }
  /**
   * Normalize a {@link Vec4}
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - vector to normalize
   * @returns `out`
   */
  static normalize(out, a2) {
    const x2 = a2[0];
    const y2 = a2[1];
    const z = a2[2];
    const w2 = a2[3];
    let len = x2 * x2 + y2 * y2 + z * z + w2 * w2;
    if (len > 0) {
      len = 1 / Math.sqrt(len);
    }
    out[0] = x2 * len;
    out[1] = y2 * len;
    out[2] = z * len;
    out[3] = w2 * len;
    return out;
  }
  /**
   * Calculates the dot product of two {@link Vec4}'s
   * @category Static
   *
   * @param a - the first operand
   * @param b - the second operand
   * @returns dot product of a and b
   */
  static dot(a2, b2) {
    return a2[0] * b2[0] + a2[1] * b2[1] + a2[2] * b2[2] + a2[3] * b2[3];
  }
  /**
   * Returns the cross-product of three vectors in a 4-dimensional space
   * @category Static
   *
   * @param out the receiving vector
   * @param u - the first vector
   * @param v - the second vector
   * @param w - the third vector
   * @returns result
   */
  static cross(out, u2, v2, w2) {
    const a2 = v2[0] * w2[1] - v2[1] * w2[0];
    const b2 = v2[0] * w2[2] - v2[2] * w2[0];
    const c2 = v2[0] * w2[3] - v2[3] * w2[0];
    const d2 = v2[1] * w2[2] - v2[2] * w2[1];
    const e2 = v2[1] * w2[3] - v2[3] * w2[1];
    const f2 = v2[2] * w2[3] - v2[3] * w2[2];
    const g2 = u2[0];
    const h2 = u2[1];
    const i2 = u2[2];
    const j2 = u2[3];
    out[0] = h2 * f2 - i2 * e2 + j2 * d2;
    out[1] = -(g2 * f2) + i2 * c2 - j2 * b2;
    out[2] = g2 * e2 - h2 * c2 + j2 * a2;
    out[3] = -(g2 * d2) + h2 * b2 - i2 * a2;
    return out;
  }
  /**
   * Performs a linear interpolation between two {@link Vec4}'s
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - the first operand
   * @param b - the second operand
   * @param t - interpolation amount, in the range [0-1], between the two inputs
   * @returns `out`
   */
  static lerp(out, a2, b2, t2) {
    const ax = a2[0];
    const ay = a2[1];
    const az = a2[2];
    const aw = a2[3];
    out[0] = ax + t2 * (b2[0] - ax);
    out[1] = ay + t2 * (b2[1] - ay);
    out[2] = az + t2 * (b2[2] - az);
    out[3] = aw + t2 * (b2[3] - aw);
    return out;
  }
  /**
   * Generates a random vector with the given scale
   * @category Static
   *
   * @param out - the receiving vector
   * @param [scale] - Length of the resulting vector. If ommitted, a unit vector will be returned
   * @returns `out`
   */
  /*static random(out: Vec4Like, scale): Vec4Like {
      scale = scale || 1.0;
  
      // Marsaglia, George. Choosing a Point from the Surface of a
      // Sphere. Ann. Math. Statist. 43 (1972), no. 2, 645--646.
      // http://projecteuclid.org/euclid.aoms/1177692644;
      var v1, v2, v3, v4;
      var s1, s2;
      do {
        v1 = glMatrix.RANDOM() * 2 - 1;
        v2 = glMatrix.RANDOM() * 2 - 1;
        s1 = v1 * v1 + v2 * v2;
      } while (s1 >= 1);
      do {
        v3 = glMatrix.RANDOM() * 2 - 1;
        v4 = glMatrix.RANDOM() * 2 - 1;
        s2 = v3 * v3 + v4 * v4;
      } while (s2 >= 1);
  
      var d = Math.sqrt((1 - s1) / s2);
      out[0] = scale * v1;
      out[1] = scale * v2;
      out[2] = scale * v3 * d;
      out[3] = scale * v4 * d;
      return out;
    }*/
  /**
   * Transforms the {@link Vec4} with a {@link Mat4}.
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - the vector to transform
   * @param m - matrix to transform with
   * @returns `out`
   */
  static transformMat4(out, a2, m2) {
    const x2 = a2[0];
    const y2 = a2[1];
    const z = a2[2];
    const w2 = a2[3];
    out[0] = m2[0] * x2 + m2[4] * y2 + m2[8] * z + m2[12] * w2;
    out[1] = m2[1] * x2 + m2[5] * y2 + m2[9] * z + m2[13] * w2;
    out[2] = m2[2] * x2 + m2[6] * y2 + m2[10] * z + m2[14] * w2;
    out[3] = m2[3] * x2 + m2[7] * y2 + m2[11] * z + m2[15] * w2;
    return out;
  }
  /**
   * Transforms the {@link Vec4} with a {@link Quat}
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - the vector to transform
   * @param q - quaternion to transform with
   * @returns `out`
   */
  static transformQuat(out, a2, q) {
    const x2 = a2[0];
    const y2 = a2[1];
    const z = a2[2];
    const qx = q[0];
    const qy = q[1];
    const qz = q[2];
    const qw = q[3];
    const ix = qw * x2 + qy * z - qz * y2;
    const iy = qw * y2 + qz * x2 - qx * z;
    const iz = qw * z + qx * y2 - qy * x2;
    const iw = -qx * x2 - qy * y2 - qz * z;
    out[0] = ix * qw + iw * -qx + iy * -qz - iz * -qy;
    out[1] = iy * qw + iw * -qy + iz * -qx - ix * -qz;
    out[2] = iz * qw + iw * -qz + ix * -qy - iy * -qx;
    out[3] = a2[3];
    return out;
  }
  /**
   * Set the components of a {@link Vec4} to zero
   * @category Static
   *
   * @param out - the receiving vector
   * @returns `out`
   */
  static zero(out) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    return out;
  }
  /**
   * Returns a string representation of a {@link Vec4}
   * @category Static
   *
   * @param a - vector to represent as a string
   * @returns string representation of the vector
   */
  static str(a2) {
    return `Vec4(${a2.join(", ")})`;
  }
  /**
   * Returns whether or not the vectors have exactly the same elements in the same position (when compared with ===)
   * @category Static
   *
   * @param a - The first vector.
   * @param b - The second vector.
   * @returns True if the vectors are equal, false otherwise.
   */
  static exactEquals(a2, b2) {
    return a2[0] === b2[0] && a2[1] === b2[1] && a2[2] === b2[2] && a2[3] === b2[3];
  }
  /**
   * Returns whether or not the vectors have approximately the same elements in the same position.
   * @category Static
   *
   * @param a - The first vector.
   * @param b - The second vector.
   * @returns True if the vectors are equal, false otherwise.
   */
  static equals(a2, b2) {
    const a0 = a2[0];
    const a1 = a2[1];
    const a22 = a2[2];
    const a3 = a2[3];
    const b0 = b2[0];
    const b1 = b2[1];
    const b22 = b2[2];
    const b3 = b2[3];
    return Math.abs(a0 - b0) <= EPSILON * Math.max(1, Math.abs(a0), Math.abs(b0)) && Math.abs(a1 - b1) <= EPSILON * Math.max(1, Math.abs(a1), Math.abs(b1)) && Math.abs(a22 - b22) <= EPSILON * Math.max(1, Math.abs(a22), Math.abs(b22)) && Math.abs(a3 - b3) <= EPSILON * Math.max(1, Math.abs(a3), Math.abs(b3));
  }
}
Vec4.prototype.sub = Vec4.prototype.subtract;
Vec4.prototype.mul = Vec4.prototype.multiply;
Vec4.prototype.div = Vec4.prototype.divide;
Vec4.prototype.dist = Vec4.prototype.distance;
Vec4.prototype.sqrDist = Vec4.prototype.squaredDistance;
Vec4.sub = Vec4.subtract;
Vec4.mul = Vec4.multiply;
Vec4.div = Vec4.divide;
Vec4.dist = Vec4.distance;
Vec4.sqrDist = Vec4.squaredDistance;
Vec4.sqrLen = Vec4.squaredLength;
Vec4.mag = Vec4.magnitude;
Vec4.length = Vec4.magnitude;
Vec4.len = Vec4.magnitude;

class Vec2 extends Float32Array {
  /**
   * The number of bytes in a {@link Vec2}.
   */
  static BYTE_LENGTH = 2 * Float32Array.BYTES_PER_ELEMENT;
  /**
   * Create a {@link Vec2}.
   */
  constructor(...values) {
    switch (values.length) {
      case 2: {
        const v2 = values[0];
        if (typeof v2 === "number") {
          super([v2, values[1]]);
        } else {
          super(v2, values[1], 2);
        }
        break;
      }
      case 1: {
        const v2 = values[0];
        if (typeof v2 === "number") {
          super([v2, v2]);
        } else {
          super(v2, 0, 2);
        }
        break;
      }
      default:
        super(2);
        break;
    }
  }
  //============
  // Attributes
  //============
  // Getters and setters to make component access read better.
  // These are likely to be a little bit slower than direct array access.
  /**
   * The x component of the vector. Equivalent to `this[0];`
   * @category Vector components
   */
  get x() {
    return this[0];
  }
  set x(value) {
    this[0] = value;
  }
  /**
   * The y component of the vector. Equivalent to `this[1];`
   * @category Vector components
   */
  get y() {
    return this[1];
  }
  set y(value) {
    this[1] = value;
  }
  // Alternate set of getters and setters in case this is being used to define
  // a color.
  /**
   * The r component of the vector. Equivalent to `this[0];`
   * @category Color components
   */
  get r() {
    return this[0];
  }
  set r(value) {
    this[0] = value;
  }
  /**
   * The g component of the vector. Equivalent to `this[1];`
   * @category Color components
   */
  get g() {
    return this[1];
  }
  set g(value) {
    this[1] = value;
  }
  /**
   * The magnitude (length) of this.
   * Equivalent to `Vec2.magnitude(this);`
   *
   * Magnitude is used because the `length` attribute is already defined by
   * TypedArrays to mean the number of elements in the array.
   */
  get magnitude() {
    return Math.hypot(this[0], this[1]);
  }
  /**
   * Alias for {@link Vec2.magnitude}
   */
  get mag() {
    return this.magnitude;
  }
  /**
   * The squared magnitude (length) of `this`.
   * Equivalent to `Vec2.squaredMagnitude(this);`
   */
  get squaredMagnitude() {
    const x2 = this[0];
    const y2 = this[1];
    return x2 * x2 + y2 * y2;
  }
  /**
   * Alias for {@link Vec2.squaredMagnitude}
   */
  get sqrMag() {
    return this.squaredMagnitude;
  }
  /**
   * A string representation of `this`
   * Equivalent to `Vec2.str(this);`
   */
  get str() {
    return Vec2.str(this);
  }
  //===================
  // Instances methods
  //===================
  /**
   * Copy the values from another {@link Vec2} into `this`.
   *
   * @param a the source vector
   * @returns `this`
   */
  copy(a2) {
    this.set(a2);
    return this;
  }
  // Instead of zero(), use a.fill(0) for instances;
  /**
   * Adds a {@link Vec2} to `this`.
   * Equivalent to `Vec2.add(this, this, b);`
   *
   * @param b - The vector to add to `this`
   * @returns `this`
   */
  add(b2) {
    this[0] += b2[0];
    this[1] += b2[1];
    return this;
  }
  /**
   * Subtracts a {@link Vec2} from `this`.
   * Equivalent to `Vec2.subtract(this, this, b);`
   *
   * @param b - The vector to subtract from `this`
   * @returns `this`
   */
  subtract(b2) {
    this[0] -= b2[0];
    this[1] -= b2[1];
    return this;
  }
  /**
   * Alias for {@link Vec2.subtract}
   */
  sub(_b2) {
    return this;
  }
  /**
   * Multiplies `this` by a {@link Vec2}.
   * Equivalent to `Vec2.multiply(this, this, b);`
   *
   * @param b - The vector to multiply `this` by
   * @returns `this`
   */
  multiply(b2) {
    this[0] *= b2[0];
    this[1] *= b2[1];
    return this;
  }
  /**
   * Alias for {@link Vec2.multiply}
   */
  mul(_b2) {
    return this;
  }
  /**
   * Divides `this` by a {@link Vec2}.
   * Equivalent to `Vec2.divide(this, this, b);`
   *
   * @param b - The vector to divide `this` by
   * @returns {Vec2} `this`
   */
  divide(b2) {
    this[0] /= b2[0];
    this[1] /= b2[1];
    return this;
  }
  /**
   * Alias for {@link Vec2.divide}
   */
  div(_b2) {
    return this;
  }
  /**
   * Scales `this` by a scalar number.
   * Equivalent to `Vec2.scale(this, this, b);`
   *
   * @param b - Amount to scale `this` by
   * @returns `this`
   */
  scale(b2) {
    this[0] *= b2;
    this[1] *= b2;
    return this;
  }
  /**
   * Calculates `this` scaled by a scalar value then adds the result to `this`.
   * Equivalent to `Vec2.scaleAndAdd(this, this, b, scale);`
   *
   * @param b - The vector to add to `this`
   * @param scale - The amount to scale `b` by before adding
   * @returns `this`
   */
  scaleAndAdd(b2, scale) {
    this[0] += b2[0] * scale;
    this[1] += b2[1] * scale;
    return this;
  }
  /**
   * Calculates the euclidian distance between another {@link Vec2} and `this`.
   * Equivalent to `Vec2.distance(this, b);`
   *
   * @param b - The vector to calculate the distance to
   * @returns Distance between `this` and `b`
   */
  distance(b2) {
    return Vec2.distance(this, b2);
  }
  /**
   * Alias for {@link Vec2.distance}
   */
  dist(_b2) {
    return 0;
  }
  /**
   * Calculates the squared euclidian distance between another {@link Vec2} and `this`.
   * Equivalent to `Vec2.squaredDistance(this, b);`
   *
   * @param b The vector to calculate the squared distance to
   * @returns Squared distance between `this` and `b`
   */
  squaredDistance(b2) {
    return Vec2.squaredDistance(this, b2);
  }
  /**
   * Alias for {@link Vec2.squaredDistance}
   */
  sqrDist(_b2) {
    return 0;
  }
  /**
   * Negates the components of `this`.
   * Equivalent to `Vec2.negate(this, this);`
   *
   * @returns `this`
   */
  negate() {
    this[0] *= -1;
    this[1] *= -1;
    return this;
  }
  /**
   * Inverts the components of `this`.
   * Equivalent to `Vec2.inverse(this, this);`
   *
   * @returns `this`
   */
  invert() {
    this[0] = 1 / this[0];
    this[1] = 1 / this[1];
    return this;
  }
  /**
   * Sets each component of `this` to it's absolute value.
   * Equivalent to `Vec2.abs(this, this);`
   *
   * @returns `this`
   */
  abs() {
    this[0] = Math.abs(this[0]);
    this[1] = Math.abs(this[1]);
    return this;
  }
  /**
   * Calculates the dot product of this and another {@link Vec2}.
   * Equivalent to `Vec2.dot(this, b);`
   *
   * @param b - The second operand
   * @returns Dot product of `this` and `b`
   */
  dot(b2) {
    return this[0] * b2[0] + this[1] * b2[1];
  }
  /**
   * Normalize `this`.
   * Equivalent to `Vec2.normalize(this, this);`
   *
   * @returns `this`
   */
  normalize() {
    return Vec2.normalize(this, this);
  }
  //================
  // Static methods
  //================
  /**
   * Creates a new, empty {@link Vec2}
   * @category Static
   *
   * @returns A new 2D vector
   */
  static create() {
    return new Vec2();
  }
  /**
   * Creates a new {@link Vec2} initialized with values from an existing vector
   * @category Static
   *
   * @param a - Vector to clone
   * @returns A new 2D vector
   */
  static clone(a2) {
    return new Vec2(a2);
  }
  /**
   * Creates a new {@link Vec2} initialized with the given values
   * @category Static
   *
   * @param x - X component
   * @param y - Y component
   * @returns A new 2D vector
   */
  static fromValues(x2, y2) {
    return new Vec2(x2, y2);
  }
  /**
   * Copy the values from one {@link Vec2} to another
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - The source vector
   * @returns `out`
   */
  static copy(out, a2) {
    out[0] = a2[0];
    out[1] = a2[1];
    return out;
  }
  /**
   * Set the components of a {@link Vec2} to the given values
   * @category Static
   *
   * @param out - The receiving vector
   * @param x - X component
   * @param y - Y component
   * @returns `out`
   */
  static set(out, x2, y2) {
    out[0] = x2;
    out[1] = y2;
    return out;
  }
  /**
   * Adds two {@link Vec2}s
   * @category Static
   *
   * @param out - The receiving vector
   * @param a - The first operand
   * @param b - The second operand
   * @returns `out`
   */
  static add(out, a2, b2) {
    out[0] = a2[0] + b2[0];
    out[1] = a2[1] + b2[1];
    return out;
  }
  /**
   * Subtracts vector b from vector a
   * @category Static
   *
   * @param out - The receiving vector
   * @param a - The first operand
   * @param b - The second operand
   * @returns `out`
   */
  static subtract(out, a2, b2) {
    out[0] = a2[0] - b2[0];
    out[1] = a2[1] - b2[1];
    return out;
  }
  /**
   * Alias for {@link Vec2.subtract}
   * @category Static
   */
  static sub(_out, _a2, _b2) {
    return [0, 0];
  }
  /**
   * Multiplies two {@link Vec2}s
   * @category Static
   *
   * @param out - The receiving vector
   * @param a - The first operand
   * @param b - The second operand
   * @returns `out`
   */
  static multiply(out, a2, b2) {
    out[0] = a2[0] * b2[0];
    out[1] = a2[1] * b2[1];
    return out;
  }
  /**
   * Alias for {@link Vec2.multiply}
   * @category Static
   */
  static mul(_out, _a2, _b2) {
    return [0, 0];
  }
  /**
   * Divides two {@link Vec2}s
   * @category Static
   *
   * @param out - The receiving vector
   * @param a - The first operand
   * @param b - The second operand
   * @returns `out`
   */
  static divide(out, a2, b2) {
    out[0] = a2[0] / b2[0];
    out[1] = a2[1] / b2[1];
    return out;
  }
  /**
   * Alias for {@link Vec2.divide}
   * @category Static
   */
  static div(_out, _a2, _b2) {
    return [0, 0];
  }
  /**
   * Math.ceil the components of a {@link Vec2}
   * @category Static
   *
   * @param out - The receiving vector
   * @param a - Vector to ceil
   * @returns `out`
   */
  static ceil(out, a2) {
    out[0] = Math.ceil(a2[0]);
    out[1] = Math.ceil(a2[1]);
    return out;
  }
  /**
   * Math.floor the components of a {@link Vec2}
   * @category Static
   *
   * @param out - The receiving vector
   * @param a - Vector to floor
   * @returns `out`
   */
  static floor(out, a2) {
    out[0] = Math.floor(a2[0]);
    out[1] = Math.floor(a2[1]);
    return out;
  }
  /**
   * Returns the minimum of two {@link Vec2}s
   * @category Static
   *
   * @param out - The receiving vector
   * @param a - The first operand
   * @param b - The second operand
   * @returns `out`
   */
  static min(out, a2, b2) {
    out[0] = Math.min(a2[0], b2[0]);
    out[1] = Math.min(a2[1], b2[1]);
    return out;
  }
  /**
   * Returns the maximum of two {@link Vec2}s
   * @category Static
   *
   * @param out - The receiving vector
   * @param a - The first operand
   * @param b - The second operand
   * @returns `out`
   */
  static max(out, a2, b2) {
    out[0] = Math.max(a2[0], b2[0]);
    out[1] = Math.max(a2[1], b2[1]);
    return out;
  }
  /**
   * Math.round the components of a {@link Vec2}
   * @category Static
   *
   * @param out - The receiving vector
   * @param a - Vector to round
   * @returns `out`
   */
  static round(out, a2) {
    out[0] = Math.round(a2[0]);
    out[1] = Math.round(a2[1]);
    return out;
  }
  /**
   * Scales a {@link Vec2} by a scalar number
   * @category Static
   *
   * @param out - The receiving vector
   * @param a - The vector to scale
   * @param b - Amount to scale the vector by
   * @returns `out`
   */
  static scale(out, a2, b2) {
    out[0] = a2[0] * b2;
    out[1] = a2[1] * b2;
    return out;
  }
  /**
   * Adds two Vec2's after scaling the second operand by a scalar value
   * @category Static
   *
   * @param out - The receiving vector
   * @param a - The first operand
   * @param b - The second operand
   * @param scale - The amount to scale b by before adding
   * @returns `out`
   */
  static scaleAndAdd(out, a2, b2, scale) {
    out[0] = a2[0] + b2[0] * scale;
    out[1] = a2[1] + b2[1] * scale;
    return out;
  }
  /**
   * Calculates the euclidian distance between two {@link Vec2}s
   * @category Static
   *
   * @param a - The first operand
   * @param b - The second operand
   * @returns distance between `a` and `b`
   */
  static distance(a2, b2) {
    return Math.hypot(b2[0] - a2[0], b2[1] - a2[1]);
  }
  /**
   * Alias for {@link Vec2.distance}
   * @category Static
   */
  static dist(_a2, _b2) {
    return 0;
  }
  /**
   * Calculates the squared euclidian distance between two {@link Vec2}s
   * @category Static
   *
   * @param a - The first operand
   * @param b - The second operand
   * @returns Squared distance between `a` and `b`
   */
  static squaredDistance(a2, b2) {
    const x2 = b2[0] - a2[0];
    const y2 = b2[1] - a2[1];
    return x2 * x2 + y2 * y2;
  }
  /**
   * Alias for {@link Vec2.distance}
   * @category Static
   */
  static sqrDist(_a2, _b2) {
    return 0;
  }
  /**
   * Calculates the magnitude (length) of a {@link Vec2}
   * @category Static
   *
   * @param a - Vector to calculate magnitude of
   * @returns Magnitude of a
   */
  static magnitude(a2) {
    const x2 = a2[0];
    const y2 = a2[1];
    return Math.sqrt(x2 * x2 + y2 * y2);
  }
  /**
   * Alias for {@link Vec2.magnitude}
   * @category Static
   */
  static mag(_a2) {
    return 0;
  }
  /**
   * Alias for {@link Vec2.magnitude}
   * @category Static
   * @deprecated Use {@link Vec2.magnitude} to avoid conflicts with builtin `length` methods/attribs
   *
   * @param a - vector to calculate length of
   * @returns length of a
   */
  // @ts-ignore: Length conflicts with Function.length
  static length(_a2) {
    return 0;
  }
  /**
   * Alias for {@link Vec2.magnitude}
   * @category Static
   * @deprecated Use {@link Vec2.mag}
   */
  static len(_a2) {
    return 0;
  }
  /**
   * Calculates the squared length of a {@link Vec2}
   * @category Static
   *
   * @param a - Vector to calculate squared length of
   * @returns Squared length of a
   */
  static squaredLength(a2) {
    const x2 = a2[0];
    const y2 = a2[1];
    return x2 * x2 + y2 * y2;
  }
  /**
   * Alias for {@link Vec2.squaredLength}
   */
  static sqrLen(_a2, _b2) {
    return 0;
  }
  /**
   * Negates the components of a {@link Vec2}
   * @category Static
   *
   * @param out - The receiving vector
   * @param a - Vector to negate
   * @returns `out`
   */
  static negate(out, a2) {
    out[0] = -a2[0];
    out[1] = -a2[1];
    return out;
  }
  /**
   * Returns the inverse of the components of a {@link Vec2}
   * @category Static
   *
   * @param out - The receiving vector
   * @param a - Vector to invert
   * @returns `out`
   */
  static inverse(out, a2) {
    out[0] = 1 / a2[0];
    out[1] = 1 / a2[1];
    return out;
  }
  /**
   * Returns the absolute value of the components of a {@link Vec2}
   * @category Static
   *
   * @param out - The receiving vector
   * @param a - Vector to compute the absolute values of
   * @returns `out`
   */
  static abs(out, a2) {
    out[0] = Math.abs(a2[0]);
    out[1] = Math.abs(a2[1]);
    return out;
  }
  /**
   * Normalize a {@link Vec2}
   * @category Static
   *
   * @param out - The receiving vector
   * @param a - Vector to normalize
   * @returns `out`
   */
  static normalize(out, a2) {
    const x2 = a2[0];
    const y2 = a2[1];
    let len = x2 * x2 + y2 * y2;
    if (len > 0) {
      len = 1 / Math.sqrt(len);
    }
    out[0] = a2[0] * len;
    out[1] = a2[1] * len;
    return out;
  }
  /**
   * Calculates the dot product of two {@link Vec2}s
   * @category Static
   *
   * @param a - The first operand
   * @param b - The second operand
   * @returns Dot product of `a` and `b`
   */
  static dot(a2, b2) {
    return a2[0] * b2[0] + a2[1] * b2[1];
  }
  /**
   * Computes the cross product of two {@link Vec2}s
   * Note that the cross product must by definition produce a 3D vector.
   * For this reason there is also not instance equivalent for this function.
   * @category Static
   *
   * @param out - The receiving vector
   * @param a - The first operand
   * @param b - The second operand
   * @returns `out`
   */
  static cross(out, a2, b2) {
    const z = a2[0] * b2[1] - a2[1] * b2[0];
    out[0] = out[1] = 0;
    out[2] = z;
    return out;
  }
  /**
   * Performs a linear interpolation between two {@link Vec2}s
   * @category Static
   *
   * @param out - The receiving vector
   * @param a - The first operand
   * @param b - The second operand
   * @param t - Interpolation amount, in the range [0-1], between the two inputs
   * @returns `out`
   */
  static lerp(out, a2, b2, t2) {
    const ax = a2[0];
    const ay = a2[1];
    out[0] = ax + t2 * (b2[0] - ax);
    out[1] = ay + t2 * (b2[1] - ay);
    return out;
  }
  /**
   * Transforms the {@link Vec2} with a {@link Mat2}
   *
   * @param out - The receiving vector
   * @param a - The vector to transform
   * @param m - Matrix to transform with
   * @returns `out`
   */
  static transformMat2(out, a2, m2) {
    const x2 = a2[0];
    const y2 = a2[1];
    out[0] = m2[0] * x2 + m2[2] * y2;
    out[1] = m2[1] * x2 + m2[3] * y2;
    return out;
  }
  /**
   * Transforms the {@link Vec2} with a {@link Mat2d}
   *
   * @param out - The receiving vector
   * @param a - The vector to transform
   * @param m - Matrix to transform with
   * @returns `out`
   */
  static transformMat2d(out, a2, m2) {
    const x2 = a2[0];
    const y2 = a2[1];
    out[0] = m2[0] * x2 + m2[2] * y2 + m2[4];
    out[1] = m2[1] * x2 + m2[3] * y2 + m2[5];
    return out;
  }
  /**
   * Transforms the {@link Vec2} with a {@link Mat3}
   * 3rd vector component is implicitly '1'
   *
   * @param out - The receiving vector
   * @param a - The vector to transform
   * @param m - Matrix to transform with
   * @returns `out`
   */
  static transformMat3(out, a2, m2) {
    const x2 = a2[0];
    const y2 = a2[1];
    out[0] = m2[0] * x2 + m2[3] * y2 + m2[6];
    out[1] = m2[1] * x2 + m2[4] * y2 + m2[7];
    return out;
  }
  /**
   * Transforms the {@link Vec2} with a {@link Mat4}
   * 3rd vector component is implicitly '0'
   * 4th vector component is implicitly '1'
   *
   * @param out - The receiving vector
   * @param a - The vector to transform
   * @param m - Matrix to transform with
   * @returns `out`
   */
  static transformMat4(out, a2, m2) {
    const x2 = a2[0];
    const y2 = a2[1];
    out[0] = m2[0] * x2 + m2[4] * y2 + m2[12];
    out[1] = m2[1] * x2 + m2[5] * y2 + m2[13];
    return out;
  }
  /**
   * Rotate a 2D vector
   * @category Static
   *
   * @param out - The receiving {@link Vec2}
   * @param a - The {@link Vec2} point to rotate
   * @param b - The origin of the rotation
   * @param rad - The angle of rotation in radians
   * @returns `out`
   */
  static rotate(out, a2, b2, rad) {
    const p0 = a2[0] - b2[0];
    const p1 = a2[1] - b2[1];
    const sinC = Math.sin(rad);
    const cosC = Math.cos(rad);
    out[0] = p0 * cosC - p1 * sinC + b2[0];
    out[1] = p0 * sinC + p1 * cosC + b2[1];
    return out;
  }
  /**
   * Get the angle between two 2D vectors
   * @category Static
   *
   * @param a - The first operand
   * @param b - The second operand
   * @returns The angle in radians
   */
  static angle(a2, b2) {
    const x1 = a2[0];
    const y1 = a2[1];
    const x2 = b2[0];
    const y2 = b2[1];
    const mag = Math.sqrt(x1 * x1 + y1 * y1) * Math.sqrt(x2 * x2 + y2 * y2);
    const cosine = mag && (x1 * x2 + y1 * y2) / mag;
    return Math.acos(Math.min(Math.max(cosine, -1), 1));
  }
  /**
   * Set the components of a {@link Vec2} to zero
   * @category Static
   *
   * @param out - The receiving vector
   * @returns `out`
   */
  static zero(out) {
    out[0] = 0;
    out[1] = 0;
    return out;
  }
  /**
   * Returns whether or not the vectors have exactly the same elements in the same position (when compared with ===)
   * @category Static
   *
   * @param a - The first vector.
   * @param b - The second vector.
   * @returns `true` if the vectors components are ===, `false` otherwise.
   */
  static exactEquals(a2, b2) {
    return a2[0] === b2[0] && a2[1] === b2[1];
  }
  /**
   * Returns whether or not the vectors have approximately the same elements in the same position.
   * @category Static
   *
   * @param a - The first vector.
   * @param b - The second vector.
   * @returns `true` if the vectors are approximately equal, `false` otherwise.
   */
  static equals(a2, b2) {
    const a0 = a2[0];
    const a1 = a2[1];
    const b0 = b2[0];
    const b1 = b2[1];
    return Math.abs(a0 - b0) <= EPSILON * Math.max(1, Math.abs(a0), Math.abs(b0)) && Math.abs(a1 - b1) <= EPSILON * Math.max(1, Math.abs(a1), Math.abs(b1));
  }
  /**
   * Returns a string representation of a vector
   * @category Static
   *
   * @param a - Vector to represent as a string
   * @returns String representation of the vector
   */
  static str(a2) {
    return `Vec2(${a2.join(", ")})`;
  }
}


const AbstractBaseRenderer = class {
};
function clamp1(x2) {
  return Math.max(1, x2);
}
const BaseRenderer = class extends AbstractBaseRenderer {
  observer;
  flowSpeed = 1;
  currerntRenderScale = 0.75;
  constructor(canvas) {
    super();
    this.canvas = canvas;
    this.observer = new ResizeObserver(() => {
      const width = clamp1(canvas.clientWidth * window.devicePixelRatio * this.currerntRenderScale);
      const height = clamp1(canvas.clientHeight * window.devicePixelRatio * this.currerntRenderScale);
      this.onResize(width, height);
    });
    this.observer.observe(canvas);
  }
  setRenderScale(scale) {
    this.currerntRenderScale = scale;
    this.onResize(this.canvas.clientWidth * window.devicePixelRatio * this.currerntRenderScale, this.canvas.clientHeight * window.devicePixelRatio * this.currerntRenderScale);
  }
  /**
  * 当画板元素大小发生变化时此函数会被调用
  * 可以在此处重设和渲染器相关的尺寸设置
  * 考虑到初始化的时候元素不一定在文档中或出于某些特殊样式状态，尺寸长宽有可能会为 0，请注意进行特判处理
  * @param width 画板元素实际的物理像素宽度，有可能为 0
  * @param height 画板元素实际的物理像素高度，有可能为 0
  */
  onResize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
  }
  /**
  * 修改背景的流动速度，数字越大越快，默认为 1
  * @param speed 背景的流动速度，默认为 1
  */
  setFlowSpeed(speed) {
    this.flowSpeed = speed;
  }
  dispose() {
    this.observer.disconnect();
    this.canvas.remove();
  }
  getElement() {
    return this.canvas;
  }
};
function loadImage(imageUrl) {
  return new Promise((resolve, reject) => {
    const img = document.createElement("img");
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = imageUrl;
    img.crossOrigin = "anonymous";
    img.loading = "eager";
  });
}
function loadVideo(videoUrl) {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    let playing = false;
    let timeupdate = false;
    let rejected = false;
    video.addEventListener("playing", () => {
      playing = true;
      checkReady();
    }, true);
    video.addEventListener("timeupdate", () => {
      timeupdate = true;
      checkReady();
    }, true);
    video.addEventListener("error", (err) => {
      rejected = true;
      reject(err);
    }, true);
    function checkReady() {
      if (playing && timeupdate && !rejected) resolve(video);
    }
    video.src = videoUrl;
    video.playsInline = true;
    video.crossOrigin = "anonymous";
    video.autoplay = true;
    video.loop = true;
    video.muted = true;
    video.play();
  });
}
function loadResourceFromUrl(url2, isVideo = false) {
  return isVideo ? loadVideo(url2) : loadImage(url2);
}
function loadResourceFromElement(element) {
  return new Promise((resolve, reject) => {
    if (element instanceof HTMLImageElement ? element.complete : element.readyState >= 3) resolve(element);
    else {
      element.onload = () => resolve(element);
      element.onerror = reject;
    }
  });
}
function blurImage(imageData, radius, quality) {
  const pixels = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  let rsum;
  let gsum;
  let bsum;
  let asum;
  let x2;
  let y2;
  let i2;
  let p2;
  let p1;
  let p22;
  let yp;
  let yi;
  let yw;
  const wm = width - 1;
  const hm = height - 1;
  const rad1x = radius + 1;
  const divx = radius + rad1x;
  const rad1y = radius + 1;
  const div2 = 1 / (divx * (radius + rad1y));
  const r2 = [];
  const g2 = [];
  const b2 = [];
  const a2 = [];
  const vmin = [];
  const vmax = [];
  while (quality-- > 0) {
    yw = yi = 0;
    for (y2 = 0; y2 < height; y2++) {
      rsum = pixels[yw] * rad1x;
      gsum = pixels[yw + 1] * rad1x;
      bsum = pixels[yw + 2] * rad1x;
      asum = pixels[yw + 3] * rad1x;
      for (i2 = 1; i2 <= radius; i2++) {
        p2 = yw + ((i2 > wm ? wm : i2) << 2);
        rsum += pixels[p2++];
        gsum += pixels[p2++];
        bsum += pixels[p2++];
        asum += pixels[p2];
      }
      for (x2 = 0; x2 < width; x2++) {
        r2[yi] = rsum;
        g2[yi] = gsum;
        b2[yi] = bsum;
        a2[yi] = asum;
        if (y2 === 0) {
          vmin[x2] = Math.min(x2 + rad1x, wm) << 2;
          vmax[x2] = Math.max(x2 - radius, 0) << 2;
        }
        p1 = yw + vmin[x2];
        p22 = yw + vmax[x2];
        rsum += pixels[p1++] - pixels[p22++];
        gsum += pixels[p1++] - pixels[p22++];
        bsum += pixels[p1++] - pixels[p22++];
        asum += pixels[p1] - pixels[p22];
        yi++;
      }
      yw += width << 2;
    }
    for (x2 = 0; x2 < width; x2++) {
      yp = x2;
      rsum = r2[yp] * rad1y;
      gsum = g2[yp] * rad1y;
      bsum = b2[yp] * rad1y;
      asum = a2[yp] * rad1y;
      for (i2 = 1; i2 <= radius; i2++) {
        yp += i2 > hm ? 0 : width;
        rsum += r2[yp];
        gsum += g2[yp];
        bsum += b2[yp];
        asum += a2[yp];
      }
      yi = x2 << 2;
      for (y2 = 0; y2 < height; y2++) {
        pixels[yi] = rsum * div2 + 0.5 | 0;
        pixels[yi + 1] = gsum * div2 + 0.5 | 0;
        pixels[yi + 2] = bsum * div2 + 0.5 | 0;
        pixels[yi + 3] = asum * div2 + 0.5 | 0;
        if (x2 === 0) {
          vmin[y2] = Math.min(y2 + rad1y, hm) * width;
          vmax[y2] = Math.max(y2 - radius, 0) * width;
        }
        p1 = x2 + vmin[y2];
        p22 = x2 + vmax[y2];
        rsum += r2[p1] - r2[p22];
        gsum += g2[p1] - g2[p22];
        bsum += b2[p1] - b2[p22];
        asum += a2[p1] - a2[p22];
        yi += width << 2;
      }
    }
  }
}
function clamp$1(x2, min2, max2) {
  return Math.min(Math.max(x2, min2), max2);
}
function clamp01$1(x2) {
  return clamp$1(x2, 0, 1);
}
function _clampPositive(x2) {
  return Math.max(0, x2);
}
const p = (cx, cy, x2, y2, ur = 0, vr = 0, up = 1, vp = 1) => Object.freeze({
  cx,
  cy,
  x: x2,
  y: y2,
  ur,
  vr,
  up,
  vp
});
const preset = (width, height, conf) => Object.freeze({
  width,
  height,
  conf
});
const CONTROL_POINT_PRESETS = [
  preset(5, 5, [
    p(0, 0, -1, -1, 0, 0, 1, 1),
    p(1, 0, -0.5, -1, 0, 0, 1, 1),
    p(2, 0, 0, -1, 0, 0, 1, 1),
    p(3, 0, 0.5, -1, 0, 0, 1, 1),
    p(4, 0, 1, -1, 0, 0, 1, 1),
    p(0, 1, -1, -0.5, 0, 0, 1, 1),
    p(1, 1, -0.5, -0.5, 0, 0, 1, 1),
    p(2, 1, -0.0052029684413368305, -0.6131420587090777, 0, 0, 1, 1),
    p(3, 1, 0.5884227308309977, -0.3990805107556692, 0, 0, 1, 1),
    p(4, 1, 1, -0.5, 0, 0, 1, 1),
    p(0, 2, -1, 0, 0, 0, 1, 1),
    p(1, 2, -0.4210024670505933, -0.11895058380429502, 0, 0, 1, 1),
    p(2, 2, -0.1019613423315412, -0.023812118047224606, 0, -47, 0.629, 0.849),
    p(3, 2, 0.40275125660925437, -0.06345314544600389, 0, 0, 1, 1),
    p(4, 2, 1, 0, 0, 0, 1, 1),
    p(0, 3, -1, 0.5, 0, 0, 1, 1),
    p(1, 3, 0.06801958477287173, 0.5205913248960121, -31, -45, 1, 1),
    p(2, 3, 0.21446469120128908, 0.29331610114301043, 6, -56, 0.566, 1.321),
    p(3, 3, 0.5, 0.5, 0, 0, 1, 1),
    p(4, 3, 1, 0.5, 0, 0, 1, 1),
    p(0, 4, -1, 1, 0, 0, 1, 1),
    p(1, 4, -0.31378372841550195, 1, 0, 0, 1, 1),
    p(2, 4, 0.26153633255328046, 1, 0, 0, 1, 1),
    p(3, 4, 0.5, 1, 0, 0, 1, 1),
    p(4, 4, 1, 1, 0, 0, 1, 1)
  ]),
  preset(4, 4, [
    p(0, 0, -1, -1, 0, 0, 1, 1),
    p(1, 0, -0.33333333333333337, -1, 0, 0, 1, 1),
    p(2, 0, 0.33333333333333326, -1, 0, 0, 1, 1),
    p(3, 0, 1, -1, 0, 0, 1, 1),
    p(0, 1, -1, -0.04495399932657351, 0, 0, 1, 1),
    p(1, 1, -0.24056117520129328, -0.22465999020104, 0, 0, 1, 1),
    p(2, 1, 0.334758885767489, -0.00531297192779423, 0, 0, 1, 1),
    p(3, 1, 0.9989920470678106, -0.3382976020775408, 8, 0, 0.566, 1.792),
    p(0, 2, -1, 0.33333333333333326, 0, 0, 1, 1),
    p(1, 2, -0.3425497314639411, -27501607956947893e-21, 0, 0, 1, 1),
    p(2, 2, 0.3321437945812673, 0.1981776353859399, 0, 0, 1, 1),
    p(3, 2, 1, 0.0766118180296832, 0, 0, 1, 1),
    p(0, 3, -1, 1, 0, 0, 1, 1),
    p(1, 3, -0.33333333333333337, 1, 0, 0, 1, 1),
    p(2, 3, 0.33333333333333326, 1, 0, 0, 1, 1),
    p(3, 3, 1, 1, 0, 0, 1, 1)
  ]),
  preset(4, 4, [
    p(0, 0, -1, -1, 0, 0, 1, 2.075),
    p(1, 0, -0.33333333333333337, -1, 0, 0, 1, 1),
    p(2, 0, 0.33333333333333326, -1, 0, 0, 1, 1),
    p(3, 0, 1, -1, 0, 0, 1, 1),
    p(0, 1, -1, -0.4545779491139603, 0, 0, 1, 1),
    p(1, 1, -0.33333333333333337, -0.33333333333333337, 0, 0, 1, 1),
    p(2, 1, 0.0889403142626457, -0.6025711180694033, -32, 45, 1, 1),
    p(3, 1, 1, -0.33333333333333337, 0, 0, 1, 1),
    p(0, 2, -1, -0.07402408608567845, 1, 0, 1, 0.094),
    p(1, 2, -0.2719422694359541, 0.09775369930903222, 25, -18, 1.321, 0),
    p(2, 2, 0.19877414408395877, 0.4307383294587789, 48, -40, 0.755, 0.975),
    p(3, 2, 1, 0.33333333333333326, -37, 0, 1, 1),
    p(0, 3, -1, 1, 0, 0, 1, 1),
    p(1, 3, -0.33333333333333337, 1, 0, 0, 1, 1),
    p(2, 3, 0.5125850864305672, 1, -20, -18, 0, 1.604),
    p(3, 3, 1, 1, 0, 0, 1, 1)
  ]),
  preset(5, 5, [
    p(0, 0, -1, -1, 0, 0, 1, 1),
    p(1, 0, -0.4501953125, -1, 0, 55, 1, 2.075),
    p(2, 0, 0.1953125, -1, 0, 0, 1, 1),
    p(3, 0, 0.4580078125, -1, 0, -25, 1, 1),
    p(4, 0, 1, -1, 0, 0, 1, 1),
    p(0, 1, -1, -0.2514475377525607, -16, 0, 2.327, 0.943),
    p(1, 1, -0.55859375, -0.6609325945787148, 47, 0, 2.358, 0.377),
    p(2, 1, 0.232421875, -0.5244375756366635, -66, -25, 1.855, 1.164),
    p(3, 1, 0.685546875, -0.3753706470552125, 0, 0, 1, 1),
    p(4, 1, 1, -0.6699125300354287, 0, 0, 1, 1),
    p(0, 2, -1, 0.035910396862284255, 0, 0, 1, 1),
    p(1, 2, -0.4921875, 0.005378616309457018, 90, 23, 1, 1.981),
    p(2, 2, 0.021484375, -0.1365043639066228, 0, 42, 1, 1),
    p(3, 2, 0.4765625, 0.05925822904974043, -30, 0, 1.95, 0.44),
    p(4, 2, 1, 0.251428847823418, 0, 0, 1, 1),
    p(0, 3, -1, 0.6968336464764276, -68, 0, 1, 0.786),
    p(1, 3, -0.6904296875, 0.5890744209958608, -68, 0, 1, 1),
    p(2, 3, 0.1845703125, 0.3879238667654693, 61, 0, 1, 1),
    p(3, 3, 0.60546875, 0.4633553246018661, -47, -59, 0.849, 1.73),
    p(4, 3, 1, 0.6214021886400309, -33, 0, 0.377, 1.604),
    p(0, 4, -1, 1, 0, 0, 1, 1),
    p(1, 4, -0.5, 1, 0, -73, 1, 1),
    p(2, 4, -0.3271484375, 1, 0, -24, 0.314, 2.704),
    p(3, 4, 0.5, 1, 0, 0, 1, 1),
    p(4, 4, 1, 1, 0, 0, 1, 1)
  ]),
  preset(5, 5, [
    p(0, 0, -1, -1),
    p(1, 0, -0.6393, -1, 0, 0, 1, 2.3884),
    p(2, 0, 0, -1),
    p(3, 0, 0.5, -1),
    p(4, 0, 1, -1),
    p(0, 1, -1, -0.2301),
    p(1, 1, -0.6934, -0.331, 0, -0.7188, 1, 1.063),
    p(2, 1, -82e-4, -0.6814, -0.2583, 0, 1.0964, 1),
    p(3, 1, 0.5836, -0.531, 0.7029, 0, 1.5466, 1),
    p(4, 1, 1, -0.6407),
    p(0, 2, -1, 0.2973, 0, 0, 1.8352, 1),
    p(1, 2, -0.4082, 0.0602),
    p(2, 2, -0.1803, -0.3646, -0.2998, 0, 1.1513, 1),
    p(3, 2, 0.477, -0.1027, 0.8903, -0.1882, 1.0807, 0.8551),
    p(4, 2, 1, -0.2973),
    p(0, 3, -1, 0.7628, 0, 0, 2.3868, 1),
    p(1, 3, -0.2525, 0.4814, -0.8406, -1.6199, 1.4093, 1.2215),
    p(2, 3, 0.3607, 0.2814, -1.0713, -0.0529, 1.0025, 0.7611),
    p(3, 3, 0.4885, 0.623, 0, 0.8184, 1, 1.2876),
    p(4, 3, 1, 0.5),
    p(0, 4, -1, 1),
    p(1, 4, -0.4033, 1),
    p(2, 4, 0.2672, 1),
    p(3, 4, 0.5967, 1),
    p(4, 4, 1, 1)
  ]),
  preset(5, 5, [
    p(0, 0, -1, -1),
    p(1, 0, -0.2197, -1),
    p(2, 0, 0.0197, -1),
    p(3, 0, 0.8033, -1),
    p(4, 0, 1, -1),
    p(0, 1, -1, -0.5451),
    p(1, 1, -0.4885, -0.4035, -1.0246, -0.2268, 1.1936, 0.8005),
    p(2, 1, -0.1213, -0.2867, 0, -0.6981, 1, 0.809),
    p(3, 1, 0.3246, -0.5628, 0, -1.2188, 1, 1.044),
    p(4, 1, 1, -0.3292),
    p(0, 2, -1, 0.1416),
    p(1, 2, -0.341, -0.0142, 0, -0.4004, 1, 1.1293),
    p(2, 2, -0.0393, -0.023, 0.2915, -0.373, 1.044, 0.9879),
    p(3, 2, 0.3148, -0.0673, -0.7853, -0.8962, 1.4709, 1.0247),
    p(4, 2, 1, 0.1912),
    p(0, 3, -1, 0.5),
    p(1, 3, -0.2689, 0.2743, 0.3404, -0.5248, 1.0184, 0.4391),
    p(2, 3, 0.0721, 0.269, 0.5302, 0.1244, 0.6723, 0.3225),
    p(3, 3, 0.4148, 0.3894, -0.6977, -0.6783, 0.8094, 0.9247),
    p(4, 3, 1, 0.446),
    p(0, 4, -1, 1),
    p(1, 4, -0.7311, 1),
    p(2, 4, 0.323, 1),
    p(3, 4, 0.6393, 1),
    p(4, 4, 1, 1)
  ])
];
const randomRange = (min2, max2) => Math.random() * (max2 - min2) + min2;
function smoothstep$1(edge0, edge1, x2) {
  const t2 = clamp01$1((x2 - edge0) / (edge1 - edge0));
  return t2 * t2 * (3 - 2 * t2);
}
function smoothifyControlPoints(conf, w2, h2, iterations = 2, factor = 0.5, factorIterationModifier = 0.1) {
  let grid = [];
  let f2 = factor;
  for (let j2 = 0; j2 < h2; j2++) {
    grid[j2] = [];
    for (let i2 = 0; i2 < w2; i2++) grid[j2][i2] = conf[j2 * w2 + i2];
  }
  const kernel = [
    [
      1,
      2,
      1
    ],
    [
      2,
      4,
      2
    ],
    [
      1,
      2,
      1
    ]
  ];
  const kernelSum = 16;
  for (let iter = 0; iter < iterations; iter++) {
    const newGrid = [];
    for (let j2 = 0; j2 < h2; j2++) {
      newGrid[j2] = [];
      for (let i2 = 0; i2 < w2; i2++) {
        if (i2 === 0 || i2 === w2 - 1 || j2 === 0 || j2 === h2 - 1) {
          newGrid[j2][i2] = grid[j2][i2];
          continue;
        }
        let sumX = 0;
        let sumY = 0;
        let sumUR = 0;
        let sumVR = 0;
        let sumUP = 0;
        let sumVP = 0;
        for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
          const weight = kernel[dj + 1][di + 1];
          const nb = grid[j2 + dj][i2 + di];
          sumX += nb.x * weight;
          sumY += nb.y * weight;
          sumUR += nb.ur * weight;
          sumVR += nb.vr * weight;
          sumUP += nb.up * weight;
          sumVP += nb.vp * weight;
        }
        const avgX = sumX / kernelSum;
        const avgY = sumY / kernelSum;
        const avgUR = sumUR / kernelSum;
        const avgVR = sumVR / kernelSum;
        const avgUP = sumUP / kernelSum;
        const avgVP = sumVP / kernelSum;
        const cur = grid[j2][i2];
        const newX = cur.x * (1 - f2) + avgX * f2;
        const newY = cur.y * (1 - f2) + avgY * f2;
        const newUR = cur.ur * (1 - f2) + avgUR * f2;
        const newVR = cur.vr * (1 - f2) + avgVR * f2;
        const newUP = cur.up * (1 - f2) + avgUP * f2;
        const newVP = cur.vp * (1 - f2) + avgVP * f2;
        newGrid[j2][i2] = p(i2, j2, newX, newY, newUR, newVR, newUP, newVP);
      }
    }
    grid = newGrid;
    f2 = clamp01$1(f2 + factorIterationModifier);
  }
  for (let j2 = 0; j2 < h2; j2++) for (let i2 = 0; i2 < w2; i2++) conf[j2 * w2 + i2] = grid[j2][i2];
}
function noise(x2, y2) {
  return fract(Math.sin(x2 * 12.9898 + y2 * 78.233) * 43758.5453);
}
function fract(x2) {
  return x2 - Math.floor(x2);
}
function smoothNoise(x2, y2) {
  const x0 = Math.floor(x2);
  const y0 = Math.floor(y2);
  const x1 = x0 + 1;
  const y1 = y0 + 1;
  const xf = x2 - x0;
  const yf = y2 - y0;
  const u2 = xf * xf * (3 - 2 * xf);
  const v2 = yf * yf * (3 - 2 * yf);
  const n00 = noise(x0, y0);
  const n10 = noise(x1, y0);
  const n01 = noise(x0, y1);
  const n11 = noise(x1, y1);
  const nx0 = n00 * (1 - u2) + n10 * u2;
  const nx1 = n01 * (1 - u2) + n11 * u2;
  return nx0 * (1 - v2) + nx1 * v2;
}
function computeNoiseGradient(perlinFn, x2, y2, epsilon = 1e-3) {
  const n1 = perlinFn(x2 + epsilon, y2);
  const n2 = perlinFn(x2 - epsilon, y2);
  const n3 = perlinFn(x2, y2 + epsilon);
  const n4 = perlinFn(x2, y2 - epsilon);
  const dx = (n1 - n2) / (2 * epsilon);
  const dy = (n3 - n4) / (2 * epsilon);
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  return [dx / len, dy / len];
}
function generateControlPoints(width, height, variationFraction = randomRange(0.4, 0.6), normalOffset = randomRange(0.3, 0.6), blendFactor = 0.8, smoothIters = Math.floor(randomRange(3, 5)), smoothFactor = randomRange(0.2, 0.3), smoothModifier = randomRange(-0.1, -0.05)) {
  const w2 = width;
  const h2 = height;
  const conf = [];
  const dx = 2 / (w2 - 1);
  const dy = 2 / (h2 - 1);
  for (let j2 = 0; j2 < h2; j2++) for (let i2 = 0; i2 < w2; i2++) {
    const baseX = i2 / (w2 - 1) * 2 - 1;
    const baseY = j2 / (h2 - 1) * 2 - 1;
    const isBorder = i2 === 0 || i2 === w2 - 1 || j2 === 0 || j2 === h2 - 1;
    const pertX = isBorder ? 0 : randomRange(-variationFraction * dx, variationFraction * dx);
    const pertY = isBorder ? 0 : randomRange(-variationFraction * dy, variationFraction * dy);
    let x2 = baseX + pertX;
    let y2 = baseY + pertY;
    const ur = isBorder ? 0 : randomRange(-60, 60);
    const vr = isBorder ? 0 : randomRange(-60, 60);
    const up = isBorder ? 1 : randomRange(0.8, 1.2);
    const vp = isBorder ? 1 : randomRange(0.8, 1.2);
    if (!isBorder) {
      const uNorm = (baseX + 1) / 2;
      const vNorm = (baseY + 1) / 2;
      const [nx, ny] = computeNoiseGradient(smoothNoise, uNorm, vNorm, 1e-3);
      let offsetX = nx * normalOffset;
      let offsetY = ny * normalOffset;
      const weight = smoothstep$1(0, 1, Math.min(uNorm, 1 - uNorm, vNorm, 1 - vNorm));
      offsetX *= weight;
      offsetY *= weight;
      x2 = x2 * (1 - blendFactor) + (x2 + offsetX) * blendFactor;
      y2 = y2 * (1 - blendFactor) + (y2 + offsetY) * blendFactor;
    }
    conf.push(p(i2, j2, x2, y2, ur, vr, up, vp));
  }
  smoothifyControlPoints(conf, w2, h2, smoothIters, smoothFactor, smoothModifier);
  return preset(w2, h2, conf);
}
const mesh_frag_default = "precision highp float;\n\nvarying vec3 v_color;\nvarying vec2 v_uv;\nuniform sampler2D u_texture;\nuniform float u_time;\nuniform float u_volume;\nuniform float u_beatPulse;\nuniform float u_alpha;\n\n// 预计算常量\nconst float INV_255 = 1.0 / 255.0;\nconst float HALF_INV_255 = 0.5 / 255.0;\nconst float GRADIENT_NOISE_A = 52.9829189;\nconst vec2 GRADIENT_NOISE_B = vec2(0.06711056, 0.00583715);\n\n// 基础流动保持恒速，节拍只在局部窗口内轻推流场。\nconst float BASE_DISTORTION = 0.016;\nconst float BEAT_DISTORTION = 0.16;\nconst float GLOBAL_SCALE_AMOUNT = 0.025;\nconst float WARP_FREQ = 2.2;\nconst float WARP_SPEED = 0.65;\nconst vec2 BEAT_ANCHOR = vec2(0.48, 0.55);\n\nfloat gradientNoise(in vec2 uv) {\n    return fract(GRADIENT_NOISE_A * fract(dot(uv, GRADIENT_NOISE_B)));\n}\n\n// 优化的旋转函数，避免重复计算 sin/cos\nvec2 rot(vec2 v, float angle) {\n    float s = sin(angle);\n    float c = cos(angle);\n    return vec2(c * v.x - s * v.y, s * v.x + c * v.y);\n}\n\n// 平滑 value noise（用于连续低频 domain warp，破除同心圆 / 规则径向扩张）\nfloat hash21(vec2 p) {\n    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);\n}\nfloat vnoise(vec2 p) {\n    vec2 i = floor(p);\n    vec2 f = fract(p);\n    vec2 u = f * f * (3.0 - 2.0 * f);\n    float a = hash21(i);\n    float b = hash21(i + vec2(1.0, 0.0));\n    float c = hash21(i + vec2(0.0, 1.0));\n    float d = hash21(i + vec2(1.0, 1.0));\n    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);\n}\nfloat fbm(vec2 p) {\n    float v = 0.0;\n    float amp = 0.5;\n    for (int k = 0; k < 3; k++) {\n        v += amp * vnoise(p);\n        p *= 2.0;\n        amp *= 0.5;\n    }\n    return v;\n}\n\n// 连续、低频、缓慢运动的 domain warp（以 flowTime 连续驱动，Bass 增强幅度）\nvec2 domainWarp(vec2 uv, float t) {\n    vec2 w = vec2(\n        fbm(uv * WARP_FREQ + vec2(t * WARP_SPEED, 0.0)),\n        fbm(uv * WARP_FREQ + vec2(0.0, t * WARP_SPEED) + vec2(5.2, 1.3))\n    ) - 0.5;\n    // 第二倍频，增加有机细节但仍保持低频\n    w += 0.5 * (vec2(\n        fbm(uv * WARP_FREQ * 2.1 + vec2(t * WARP_SPEED * 1.7 + 3.1, 0.0)),\n        fbm(uv * WARP_FREQ * 2.1 + vec2(0.0, t * WARP_SPEED * 1.7) + vec2(7.7, 9.2))\n    ) - 0.5);\n    return w;\n}\n\nvoid main() {\n    float flowTime = u_time;\n    float energy = u_volume;\n\n    float dither = INV_255 * gradientNoise(gl_FragCoord.xy) - HALF_INV_255;\n    vec2 centeredUV = v_uv - vec2(0.2);\n\n    vec2 warp = domainWarp(centeredUV, flowTime);\n    vec2 beatOffset = (v_uv - BEAT_ANCHOR) * vec2(1.0, 0.86);\n    float beatWindow = exp(-dot(beatOffset, beatOffset) * 7.0);\n    vec2 beatWarp = warp * (u_beatPulse * BEAT_DISTORTION * beatWindow);\n    vec2 rotatedUV = rot(centeredUV, flowTime * 0.35);\n    float scale = 1.0 - energy * GLOBAL_SCALE_AMOUNT;\n    vec2 finalUV = rotatedUV * scale + vec2(0.5) + warp * BASE_DISTORTION + beatWarp;\n\n    vec4 result = texture2D(u_texture, finalUV);\n\n    float alphaVolumeFactor = u_alpha * (0.88 + energy * 0.08);\n    result.rgb *= v_color * alphaVolumeFactor;\n    result.a *= alphaVolumeFactor;\n\n    result.rgb += vec3(dither);\n\n    float dist = distance(v_uv, vec2(0.5));\n    float vignette = smoothstep(0.8, 0.3, dist);\n    float mask = 0.6 + vignette * 0.4;\n    result.rgb *= mask;\n\n    gl_FragColor = result;\n}\n";
const mesh_vert_default = "precision highp float;\n\nattribute vec2 a_pos;\nattribute vec3 a_color;\nattribute vec2 a_uv;\nvarying vec3 v_color;\nvarying vec2 v_uv;\n\nuniform float u_aspect;\n\nvoid main() {\n    v_color = a_color;\n    v_uv = a_uv;\n    vec2 pos = a_pos;\n    if (u_aspect > 1.0) {\n        pos.y *= u_aspect;\n    } else {\n        pos.x /= u_aspect;\n    }\n    gl_Position = vec4(pos, 0.0, 1.0);\n}\n";
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
function easeInOutSine(x2) {
  return -(Math.cos(Math.PI * x2) - 1) / 2;
}
const GLProgram2 = class {
  gl;
  program;
  vertexShader;
  fragmentShader;
  attrs;
  constructor(gl, vertexShaderSource, fragmentShaderSource, label = "unknown") {
    this.label = label;
    this.gl = gl;
    this.vertexShader = this.createShader(gl.VERTEX_SHADER, vertexShaderSource);
    this.fragmentShader = this.createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
    this.program = this.createProgram();
    const num = gl.getProgramParameter(this.program, gl.ACTIVE_ATTRIBUTES);
    const attrs = {};
    for (let i2 = 0; i2 < num; i2++) {
      const info = gl.getActiveAttrib(this.program, i2);
      if (!info) continue;
      const location2 = gl.getAttribLocation(this.program, info.name);
      if (location2 === -1) continue;
      attrs[info.name] = location2;
    }
    this.attrs = attrs;
  }
  createShader(type2, source) {
    const gl = this.gl;
    const shader = gl.createShader(type2);
    if (!shader) throw new Error("Failed to create shader");
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(`Failed to compile shader for type ${type2} "${this.label}": ${gl.getShaderInfoLog(shader)}`);
    return shader;
  }
  createProgram() {
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
  notFoundUniforms = /* @__PURE__ */ new Set();
  warnUniformNotFound(name) {
    if (this.notFoundUniforms.has(name)) return;
    this.notFoundUniforms.add(name);
    console.warn(`Failed to get uniform location for program "${this.label}": ${name}`);
  }
  setUniform1f(name, value) {
    const gl = this.gl;
    const location2 = gl.getUniformLocation(this.program, name);
    if (!location2) this.warnUniformNotFound(name);
    else gl.uniform1f(location2, value);
  }
  setUniform2f(name, value1, value2) {
    const gl = this.gl;
    const location2 = gl.getUniformLocation(this.program, name);
    if (!location2) this.warnUniformNotFound(name);
    else gl.uniform2f(location2, value1, value2);
  }
  setUniform1i(name, value) {
    const gl = this.gl;
    const location2 = gl.getUniformLocation(this.program, name);
    if (!location2) this.warnUniformNotFound(name);
    else gl.uniform1i(location2, value);
  }
  dispose() {
    const gl = this.gl;
    gl.deleteShader(this.vertexShader);
    gl.deleteShader(this.fragmentShader);
    gl.deleteProgram(this.program);
  }
};
const Mesh = class {
  vertexWidth = 0;
  vertexHeight = 0;
  vertexBuffer;
  indexBuffer;
  vertexData;
  indexData;
  vertexIndexLength = 0;
  wireFrame = false;
  constructor(gl, attrPos, attrColor, attrUV) {
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
  setWireFrame(enable) {
    this.wireFrame = enable;
    this.resize(this.vertexWidth, this.vertexHeight);
  }
  setVertexPos(vx2, vy2, x2, y2) {
    const idx = (vx2 + vy2 * this.vertexWidth) * 7;
    if (idx >= this.vertexData.length - 1) {
      console.warn("Vertex position out of range", idx, this.vertexData.length);
      return;
    }
    this.vertexData[idx] = x2;
    this.vertexData[idx + 1] = y2;
  }
  setVertexColor(vx2, vy2, r2, g2, b2) {
    const idx = (vx2 + vy2 * this.vertexWidth) * 7 + 2;
    if (idx >= this.vertexData.length - 2) {
      console.warn("Vertex color out of range", idx, this.vertexData.length);
      return;
    }
    this.vertexData[idx] = r2;
    this.vertexData[idx + 1] = g2;
    this.vertexData[idx + 2] = b2;
  }
  setVertexUV(vx2, vy2, x2, y2) {
    const idx = (vx2 + vy2 * this.vertexWidth) * 7 + 5;
    if (idx >= this.vertexData.length - 1) {
      console.warn("Vertex UV out of range", idx, this.vertexData.length);
      return;
    }
    this.vertexData[idx] = x2;
    this.vertexData[idx + 1] = y2;
  }
  setVertexData(vx2, vy2, x2, y2, r2, g2, b2, u2, v2) {
    const idx = (vx2 + vy2 * this.vertexWidth) * 7;
    if (idx >= this.vertexData.length - 6) {
      console.warn("Vertex data out of range", idx, this.vertexData.length);
      return;
    }
    const data = this.vertexData;
    data[idx] = x2;
    data[idx + 1] = y2;
    data[idx + 2] = r2;
    data[idx + 3] = g2;
    data[idx + 4] = b2;
    data[idx + 5] = u2;
    data[idx + 6] = v2;
  }
  getVertexIndexLength() {
    return this.vertexIndexLength;
  }
  draw() {
    const gl = this.gl;
    if (this.wireFrame) gl.drawElements(gl.LINES, this.vertexIndexLength, gl.UNSIGNED_SHORT, 0);
    else gl.drawElements(gl.TRIANGLES, this.vertexIndexLength, gl.UNSIGNED_SHORT, 0);
  }
  resize(vertexWidth, vertexHeight) {
    this.vertexWidth = vertexWidth;
    this.vertexHeight = vertexHeight;
    this.vertexIndexLength = vertexWidth * vertexHeight * 6;
    if (this.wireFrame) this.vertexIndexLength = vertexWidth * vertexHeight * 10;
    const vertexData = new Float32Array(vertexWidth * vertexHeight * 7);
    const indexData = new Uint16Array(this.vertexIndexLength);
    this.vertexData = vertexData;
    this.indexData = indexData;
    for (let y2 = 0; y2 < vertexHeight; y2++) for (let x2 = 0; x2 < vertexWidth; x2++) {
      const px = x2 / (vertexWidth - 1) * 2 - 1;
      const py = y2 / (vertexHeight - 1) * 2 - 1;
      this.setVertexPos(x2, y2, px || 0, py || 0);
      this.setVertexColor(x2, y2, 1, 1, 1);
      this.setVertexUV(x2, y2, x2 / (vertexWidth - 1), y2 / (vertexHeight - 1));
    }
    for (let y2 = 0; y2 < vertexHeight - 1; y2++) for (let x2 = 0; x2 < vertexWidth - 1; x2++) if (this.wireFrame) {
      const idx = (y2 * vertexWidth + x2) * 10;
      indexData[idx] = y2 * vertexWidth + x2;
      indexData[idx + 1] = y2 * vertexWidth + x2 + 1;
      indexData[idx + 2] = y2 * vertexWidth + x2 + 1;
      indexData[idx + 3] = (y2 + 1) * vertexWidth + x2;
      indexData[idx + 4] = (y2 + 1) * vertexWidth + x2;
      indexData[idx + 5] = (y2 + 1) * vertexWidth + x2 + 1;
      indexData[idx + 6] = (y2 + 1) * vertexWidth + x2 + 1;
      indexData[idx + 7] = y2 * vertexWidth + x2 + 1;
      indexData[idx + 8] = y2 * vertexWidth + x2;
      indexData[idx + 9] = (y2 + 1) * vertexWidth + x2;
    } else {
      const idx = (y2 * vertexWidth + x2) * 6;
      indexData[idx] = y2 * vertexWidth + x2;
      indexData[idx + 1] = y2 * vertexWidth + x2 + 1;
      indexData[idx + 2] = (y2 + 1) * vertexWidth + x2;
      indexData[idx + 3] = y2 * vertexWidth + x2 + 1;
      indexData[idx + 4] = (y2 + 1) * vertexWidth + x2 + 1;
      indexData[idx + 5] = (y2 + 1) * vertexWidth + x2;
    }
    const gl = this.gl;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indexData, gl.STATIC_DRAW);
  }
  bind() {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    if (this.attrPos !== void 0) {
      gl.vertexAttribPointer(this.attrPos, 2, gl.FLOAT, false, 28, 0);
      gl.enableVertexAttribArray(this.attrPos);
    }
    if (this.attrColor !== void 0) {
      gl.vertexAttribPointer(this.attrColor, 3, gl.FLOAT, false, 28, 8);
      gl.enableVertexAttribArray(this.attrColor);
    }
    if (this.attrUV !== void 0) {
      gl.vertexAttribPointer(this.attrUV, 2, gl.FLOAT, false, 28, 20);
      gl.enableVertexAttribArray(this.attrUV);
    }
  }
  update() {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.vertexData, gl.DYNAMIC_DRAW);
  }
  dispose() {
    this.gl.deleteBuffer(this.vertexBuffer);
    this.gl.deleteBuffer(this.indexBuffer);
  }
};
const ControlPoint = class {
  color = Vec3.fromValues(1, 1, 1);
  location = Vec2.fromValues(0, 0);
  uTangent = Vec2.fromValues(0, 0);
  vTangent = Vec2.fromValues(0, 0);
  _uRot = 0;
  _vRot = 0;
  _uScale = 1;
  _vScale = 1;
  constructor() {
    Object.seal(this);
  }
  get uRot() {
    return this._uRot;
  }
  get vRot() {
    return this._vRot;
  }
  set uRot(value) {
    this._uRot = value;
    this.updateUTangent();
  }
  set vRot(value) {
    this._vRot = value;
    this.updateVTangent();
  }
  get uScale() {
    return this._uScale;
  }
  get vScale() {
    return this._vScale;
  }
  set uScale(value) {
    this._uScale = value;
    this.updateUTangent();
  }
  set vScale(value) {
    this._vScale = value;
    this.updateVTangent();
  }
  updateUTangent() {
    this.uTangent[0] = Math.cos(this._uRot) * this._uScale;
    this.uTangent[1] = Math.sin(this._uRot) * this._uScale;
  }
  updateVTangent() {
    this.vTangent[0] = -Math.sin(this._vRot) * this._vScale;
    this.vTangent[1] = Math.cos(this._vRot) * this._vScale;
  }
};
const H = Mat4.fromValues(2, -2, 1, 1, -3, 3, -2, -1, 0, 0, 1, 0, 1, 0, 0, 0);
const H_T = Mat4.clone(H).transpose();
function meshCoefficients(p00, p01, p10, p11, axis, output = Mat4.create()) {
  const l2 = (p2) => p2.location[axis];
  const u2 = (p2) => p2.uTangent[axis];
  const v2 = (p2) => p2.vTangent[axis];
  output[0] = l2(p00);
  output[1] = l2(p01);
  output[2] = v2(p00);
  output[3] = v2(p01);
  output[4] = l2(p10);
  output[5] = l2(p11);
  output[6] = v2(p10);
  output[7] = v2(p11);
  output[8] = u2(p00);
  output[9] = u2(p01);
  output[10] = 0;
  output[11] = 0;
  output[12] = u2(p10);
  output[13] = u2(p11);
  output[14] = 0;
  output[15] = 0;
  return output;
}
function colorCoefficients(p00, p01, p10, p11, axis, output = Mat4.create()) {
  const c2 = (p2) => p2.color[axis];
  output.fill(0);
  output[0] = c2(p00);
  output[1] = c2(p01);
  output[4] = c2(p10);
  output[5] = c2(p11);
  return output;
}
const Map2D = class {
  _width = 0;
  _height = 0;
  _data = [];
  constructor(width, height) {
    this.resize(width, height);
    Object.seal(this);
  }
  resize(width, height) {
    this._width = width;
    this._height = height;
    this._data = new Array(width * height).fill(0);
  }
  set(x2, y2, value) {
    this._data[x2 + y2 * this._width] = value;
  }
  get(x2, y2) {
    return this._data[x2 + y2 * this._width];
  }
  get width() {
    return this._width;
  }
  get height() {
    return this._height;
  }
};
const BHPMesh = class extends Mesh {
  /**
  * 细分级别，越大曲线越平滑，但是性能消耗也越大
  */
  _subDivisions = 10;
  _controlPoints = new Map2D(3, 3);
  constructor(gl, attrPos, attrColor, attrUV) {
    super(gl, attrPos, attrColor, attrUV);
    this.resizeControlPoints(3, 3);
    Object.seal(this);
  }
  setWireFrame(enable) {
    super.setWireFrame(enable);
    this.updateMesh();
  }
  /**
  * 以当前的控制点矩阵大小和细分级别为参考重新设置细分级别，此操作不会重设控制点数据
  * @param subDivisions 细分级别
  */
  resetSubdivition(subDivisions) {
    this._subDivisions = subDivisions;
    super.resize((this._controlPoints.width - 1) * subDivisions, (this._controlPoints.height - 1) * subDivisions);
  }
  /**
  * 重设控制点矩阵尺寸，将会重置所有控制点的颜色和坐标数据
  * 请在调用此方法后重新设置颜色和坐标，并调用 updateMesh 方法更新网格
  * @param width 控制点宽度数量，必须大于等于 2
  * @param height 控制点高度数量，必须大于等于 2
  */
  resizeControlPoints(width, height) {
    if (!(width >= 2 && height >= 2)) throw new Error("Control points must be larger than 3x3 or equal");
    this._controlPoints.resize(width, height);
    for (let y2 = 0; y2 < height; y2++) for (let x2 = 0; x2 < width; x2++) {
      const point = new ControlPoint();
      point.location.x = x2 / (width - 1) * 2 - 1;
      point.location.y = y2 / (height - 1) * 2 - 1;
      point.uTangent.x = 2 / (width - 1);
      point.vTangent.y = 2 / (height - 1);
      this._controlPoints.set(x2, y2, point);
    }
    this.resetSubdivition(this._subDivisions);
  }
  /**
  * 获取指定位置的控制点，然后可以设置颜色和坐标属性
  * 留意颜色属性和坐标属性的值范围均参考 WebGL 的定义
  * 即颜色各个组件取值 [0-1]，坐标取值 [-1, 1]
  * 点的位置以画面左下角为原点 (0,0)
  * @param x 需要获取的控制点的 x 坐标
  * @param y 需要获取的控制点的 y 坐标
  * @returns 控制点对象
  */
  getControlPoint(x2, y2) {
    return this._controlPoints.get(x2, y2);
  }
  tempX = Mat4.create();
  tempY = Mat4.create();
  tempR = Mat4.create();
  tempG = Mat4.create();
  tempB = Mat4.create();
  tempXAcc = Mat4.create();
  tempYAcc = Mat4.create();
  tempRAcc = Mat4.create();
  tempGAcc = Mat4.create();
  tempBAcc = Mat4.create();
  tempUx = Vec4.create();
  tempUy = Vec4.create();
  tempUr = Vec4.create();
  tempUg = Vec4.create();
  tempUb = Vec4.create();
  precomputeMatrix(M2, output) {
    output.copy(M2).transpose();
    Mat4.mul(output, output, H);
    Mat4.mul(output, H_T, output);
    return output;
  }
  /**
  * 更新最终呈现的网格数据，此方法应在所有控制点或细分参数的操作完成后调用
  */
  updateMesh() {
    const subDivM1 = this._subDivisions - 1;
    const tW = subDivM1 * (this._controlPoints.height - 1);
    const tH = subDivM1 * (this._controlPoints.width - 1);
    const controlPointsWidth = this._controlPoints.width;
    const controlPointsHeight = this._controlPoints.height;
    const subDivisions = this._subDivisions;
    const invSubDivM1 = 1 / subDivM1;
    const invTH = 1 / tH;
    const invTW = 1 / tW;
    const normPowers = new Float32Array(subDivisions * 4);
    for (let i2 = 0; i2 < subDivisions; i2++) {
      const norm = i2 * invSubDivM1;
      const idx = i2 * 4;
      normPowers[idx] = norm ** 3;
      normPowers[idx + 1] = norm ** 2;
      normPowers[idx + 2] = norm;
      normPowers[idx + 3] = 1;
    }
    for (let x2 = 0; x2 < controlPointsWidth - 1; x2++) for (let y2 = 0; y2 < controlPointsHeight - 1; y2++) {
      const p00 = this._controlPoints.get(x2, y2);
      const p01 = this._controlPoints.get(x2, y2 + 1);
      const p10 = this._controlPoints.get(x2 + 1, y2);
      const p11 = this._controlPoints.get(x2 + 1, y2 + 1);
      meshCoefficients(p00, p01, p10, p11, "x", this.tempX);
      meshCoefficients(p00, p01, p10, p11, "y", this.tempY);
      colorCoefficients(p00, p01, p10, p11, "r", this.tempR);
      colorCoefficients(p00, p01, p10, p11, "g", this.tempG);
      colorCoefficients(p00, p01, p10, p11, "b", this.tempB);
      this.precomputeMatrix(this.tempX, this.tempXAcc);
      this.precomputeMatrix(this.tempY, this.tempYAcc);
      this.precomputeMatrix(this.tempR, this.tempRAcc);
      this.precomputeMatrix(this.tempG, this.tempGAcc);
      this.precomputeMatrix(this.tempB, this.tempBAcc);
      const sX = x2 / (controlPointsWidth - 1);
      const sY = y2 / (controlPointsHeight - 1);
      const baseVx = y2 * subDivisions;
      const baseVy = x2 * subDivisions;
      for (let u2 = 0; u2 < subDivisions; u2++) {
        const vxOffset = baseVx + u2;
        const uIdx = u2 * 4;
        this.tempUx[0] = normPowers[uIdx];
        this.tempUx[1] = normPowers[uIdx + 1];
        this.tempUx[2] = normPowers[uIdx + 2];
        this.tempUx[3] = normPowers[uIdx + 3];
        Vec4.transformMat4(this.tempUx, this.tempUx, this.tempXAcc);
        this.tempUy[0] = normPowers[uIdx];
        this.tempUy[1] = normPowers[uIdx + 1];
        this.tempUy[2] = normPowers[uIdx + 2];
        this.tempUy[3] = normPowers[uIdx + 3];
        Vec4.transformMat4(this.tempUy, this.tempUy, this.tempYAcc);
        this.tempUr[0] = normPowers[uIdx];
        this.tempUr[1] = normPowers[uIdx + 1];
        this.tempUr[2] = normPowers[uIdx + 2];
        this.tempUr[3] = normPowers[uIdx + 3];
        Vec4.transformMat4(this.tempUr, this.tempUr, this.tempRAcc);
        this.tempUg[0] = normPowers[uIdx];
        this.tempUg[1] = normPowers[uIdx + 1];
        this.tempUg[2] = normPowers[uIdx + 2];
        this.tempUg[3] = normPowers[uIdx + 3];
        Vec4.transformMat4(this.tempUg, this.tempUg, this.tempGAcc);
        this.tempUb[0] = normPowers[uIdx];
        this.tempUb[1] = normPowers[uIdx + 1];
        this.tempUb[2] = normPowers[uIdx + 2];
        this.tempUb[3] = normPowers[uIdx + 3];
        Vec4.transformMat4(this.tempUb, this.tempUb, this.tempBAcc);
        for (let v2 = 0; v2 < subDivisions; v2++) {
          const vy2 = baseVy + v2;
          const vIdx = v2 * 4;
          const v0 = normPowers[vIdx];
          const v1 = normPowers[vIdx + 1];
          const v22 = normPowers[vIdx + 2];
          const v3 = normPowers[vIdx + 3];
          const px = v0 * this.tempUx[0] + v1 * this.tempUx[1] + v22 * this.tempUx[2] + v3 * this.tempUx[3];
          const py = v0 * this.tempUy[0] + v1 * this.tempUy[1] + v22 * this.tempUy[2] + v3 * this.tempUy[3];
          const pr = v0 * this.tempUr[0] + v1 * this.tempUr[1] + v22 * this.tempUr[2] + v3 * this.tempUr[3];
          const pg = v0 * this.tempUg[0] + v1 * this.tempUg[1] + v22 * this.tempUg[2] + v3 * this.tempUg[3];
          const pb = v0 * this.tempUb[0] + v1 * this.tempUb[1] + v22 * this.tempUb[2] + v3 * this.tempUb[3];
          const uvX = sX + v2 * invTH;
          const uvY = 1 - sY - u2 * invTW;
          this.setVertexData(vxOffset, vy2, px, py, pr, pg, pb, uvX, uvY);
        }
      }
    }
    this.update();
  }
};
const GLTexture2 = class {
  tex;
  constructor(gl, albumImageData) {
    this.gl = gl;
    const albumTexture = gl.createTexture();
    if (!albumTexture) throw new Error("Failed to create texture");
    this.tex = albumTexture;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, albumTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, albumImageData);
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
};
function createOffscreenCanvas(width, height) {
  if ("OffscreenCanvas" in window) return new OffscreenCanvas(width, height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}
export const MeshGradientRenderer = class extends BaseRenderer {
  gl;
  lastFrameTime = 0;
  frameTime = 0;
  lastTickTime = 0;
  smoothedVolume = 0;
  beatPulse = 0;
  volume = 0;
  tickHandle = 0;
  maxFPS = 60;
  paused = false;
  staticMode = false;
  mainProgram;
  quadProgram;
  quadBuffer;
  fbo = null;
  fboTexture = null;
  manualControl = false;
  reduceImageSizeCanvas = createOffscreenCanvas(32, 32);
  targetSize = Vec2.fromValues(0, 0);
  currentSize = Vec2.fromValues(0, 0);
  isNoCover = true;
  meshStates = [];
  _disposed = false;
  frameCount = 0;
  lastFPSUpdate = 0;
  currentFPS = 0;
  enablePerformanceMonitoring = false;
  setManualControl(enable) {
    this.manualControl = enable;
  }
  setWireFrame(enable) {
    for (const state of this.meshStates) state.mesh.setWireFrame(enable);
  }
  getControlPoint(x2, y2) {
    return this.meshStates[this.meshStates.length - 1]?.mesh?.getControlPoint(x2, y2);
  }
  resizeControlPoints(width, height) {
    this.meshStates[this.meshStates.length - 1]?.mesh?.resizeControlPoints(width, height);
  }
  resetSubdivition(subDivisions) {
    this.meshStates[this.meshStates.length - 1]?.mesh?.resetSubdivition(subDivisions);
  }
  onTick(tickTime) {
    this.tickHandle = 0;
    if (this.paused) return;
    if (this._disposed) return;
    this.updatePerformanceStats(tickTime);
    const pulseFPS = this.beatPulse > 0.01 ? Math.max(this.maxFPS, 60) : this.maxFPS;
    const interval = 1e3 / pulseFPS;
    const delta = tickTime - this.lastTickTime;
    if (delta < interval) {
      this.requestTick();
      return;
    }
    if (Number.isNaN(this.lastFrameTime)) this.lastFrameTime = tickTime;
    const frameDelta = tickTime - this.lastFrameTime;
    this.lastFrameTime = tickTime;
    this.lastTickTime = tickTime - delta % interval;
    this.frameTime += frameDelta * this.flowSpeed;
    if (!(this.onRedraw(this.frameTime, frameDelta) && this.staticMode)) this.requestTick();
    else if (this.staticMode) this.lastFrameTime = NaN;
  }
  checkIfResize() {
    const [tW, tH] = [this.targetSize.x, this.targetSize.y];
    const [cW, cH] = [this.currentSize.x, this.currentSize.y];
    if (tW !== cW || tH !== cH) {
      super.onResize(tW, tH);
      const gl = this.gl;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, tW, tH);
      this.currentSize.x = tW;
      this.currentSize.y = tH;
      if (tW > 0 && tH > 0) this.updateFBO(tW, tH);
    }
  }
  updateFBO(width, height) {
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
  onRedraw(tickTime, delta) {
    const latestMeshState = this.meshStates[this.meshStates.length - 1];
    let canBeStatic = false;
    const deltaFactor = delta / 500;
    if (latestMeshState) {
      latestMeshState.mesh.bind();
      if (this.manualControl) latestMeshState.mesh.updateMesh();
      if (this.isNoCover) {
        let hasActiveStates = false;
        for (let i2 = this.meshStates.length - 1; i2 >= 0; i2--) {
          const state = this.meshStates[i2];
          if (state.alpha <= -0.1) {
            state.mesh.dispose();
            state.texture.dispose();
            this.meshStates.splice(i2, 1);
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
          }
        } else latestMeshState.alpha = Math.min(1.1, latestMeshState.alpha + deltaFactor);
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
    this.smoothedVolume += (this.volume - this.smoothedVolume) * lerpFactor;
    for (const state of this.meshStates) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
      gl.disable(gl.BLEND);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      this.mainProgram.use();
      gl.activeTexture(gl.TEXTURE0);
      this.mainProgram.setUniform1f("u_time", tickTime / 1e4);
      this.mainProgram.setUniform1f("u_aspect", this.manualControl ? 1 : this.canvas.width / this.canvas.height);
      this.mainProgram.setUniform1i("u_texture", 0);
      this.mainProgram.setUniform1f("u_volume", this.smoothedVolume);
      this.mainProgram.setUniform1f("u_beatPulse", this.beatPulse);
      this.mainProgram.setUniform1f("u_alpha", 1);
      state.texture.bind();
      state.mesh.bind();
      state.mesh.draw();
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.enable(gl.BLEND);
      gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      this.quadProgram.use();
      this.quadProgram.setUniform1i("u_texture", 0);
      this.quadProgram.setUniform1f("u_alpha", easeInOutSine(clamp01$1(state.alpha)));
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
  onTickBinded = this.onTick.bind(this);
  requestTick() {
    if (this._disposed) return;
    if (this.tickHandle === 0) this.tickHandle = requestAnimationFrame(this.onTickBinded);
  }
  constructor(canvas) {
    super(canvas);
    const gl = canvas.getContext("webgl", { antialias: true });
    if (!gl) throw new Error("WebGL not supported");
    if (!gl.getExtension("EXT_color_buffer_float")) console.warn("EXT_color_buffer_float not supported");
    if (!gl.getExtension("EXT_float_blend")) console.warn("EXT_float_blend not supported");
    if (!gl.getExtension("OES_texture_float_linear")) console.warn("OES_texture_float_linear not supported");
    if (!gl.getExtension("OES_texture_float")) console.warn("OES_texture_float not supported");
    this.gl = gl;
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.ALWAYS);
    this.mainProgram = new GLProgram2(gl, mesh_vert_default, mesh_frag_default, "main-program-mg");
    this.quadProgram = new GLProgram2(gl, quadVertShader, quadFragShader, "quad-program");
    const quadBuffer = gl.createBuffer();
    if (!quadBuffer) throw new Error("Failed to create quad buffer");
    this.quadBuffer = quadBuffer;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1,
      -1,
      1,
      -1,
      -1,
      1,
      -1,
      1,
      1,
      -1,
      1,
      1
    ]), gl.STATIC_DRAW);
    this.requestTick();
  }
  onResize(width, height) {
    this.targetSize.x = Math.ceil(width);
    this.targetSize.y = Math.ceil(height);
    this.requestTick();
  }
  setStaticMode(enable) {
    this.staticMode = enable;
    this.lastFrameTime = performance.now();
    this.requestTick();
  }
  setFPS(fps) {
    this.maxFPS = fps;
  }
  pause() {
    if (this.tickHandle) {
      cancelAnimationFrame(this.tickHandle);
      this.tickHandle = 0;
    }
    this.paused = true;
    // 标记时间戳失效：恢复后首帧 frameDelta 归零，避免停转时长被计入动画时间造成画面跳变
    this.lastFrameTime = NaN;
  }
  resume() {
    this.paused = false;
    this.requestTick();
  }
  async setAlbum(albumSource, isVideo) {
    if (albumSource === void 0 || typeof albumSource === "string" && albumSource.trim().length === 0) {
      this.isNoCover = true;
      return;
    }
    let res = null;
    let blob = null;
    let remainRetryTimes = 5;
    while (!res && remainRetryTimes > 0) try {
      if (typeof albumSource === "string") if (!isVideo && "createImageBitmap" in window) {
        blob = await (await fetch(albumSource)).blob();
        res = await loadResourceFromUrl(URL.createObjectURL(blob), false);
      } else res = await loadResourceFromUrl(albumSource, isVideo);
      else res = await loadResourceFromElement(albumSource);
    } catch (error) {
      console.warn(`failed on loading album resource, retrying (${remainRetryTimes})`, {
        albumSource,
        error
      });
      remainRetryTimes--;
    }
    if (!res) {
      console.error("Failed to load album resource", albumSource);
      this.isNoCover = true;
      return;
    }
    this.isNoCover = false;
    const c2 = this.reduceImageSizeCanvas;
    const ctx = c2.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Failed to create canvas context");
    ctx.clearRect(0, 0, c2.width, c2.height);
    const imgw = res instanceof HTMLVideoElement ? res.videoWidth : res.naturalWidth;
    const imgh = res instanceof HTMLVideoElement ? res.videoHeight : res.naturalHeight;
    if (imgw * imgh === 0) throw new Error("Invalid image size");
    let bitmap = null;
    try {
      if ("createImageBitmap" in window) if (blob) {
        bitmap = await createImageBitmap(blob, {
          resizeWidth: c2.width,
          resizeHeight: c2.height,
          resizeQuality: "low"
        });
        URL.revokeObjectURL(res.src);
      } else bitmap = await createImageBitmap(res, {
        resizeWidth: c2.width,
        resizeHeight: c2.height,
        resizeQuality: "low"
      });
    } catch (e2) {
      console.warn("createImageBitmap failed", e2);
    }
    if (bitmap) {
      ctx.drawImage(bitmap, 0, 0);
      bitmap.close();
    } else ctx.drawImage(res, 0, 0, imgw, imgh, 0, 0, c2.width, c2.height);
    const imageData = ctx.getImageData(0, 0, c2.width, c2.height);
    const pixels = imageData.data;
    for (let i2 = 0; i2 < pixels.length; i2 += 4) {
      let r2 = pixels[i2];
      let g2 = pixels[i2 + 1];
      let b2 = pixels[i2 + 2];
      r2 = (r2 - 128) * 0.4 + 128;
      g2 = (g2 - 128) * 0.4 + 128;
      b2 = (b2 - 128) * 0.4 + 128;
      const gray = r2 * 0.3 + g2 * 0.59 + b2 * 0.11;
      r2 = gray * -2 + r2 * 3;
      g2 = gray * -2 + g2 * 3;
      b2 = gray * -2 + b2 * 3;
      r2 = (r2 - 128) * 1.7 + 128;
      g2 = (g2 - 128) * 1.7 + 128;
      b2 = (b2 - 128) * 1.7 + 128;
      pixels[i2] = r2 * 0.75;
      pixels[i2 + 1] = g2 * 0.75;
      pixels[i2 + 2] = b2 * 0.75;
    }
    blurImage(imageData, 2, 4);
    if (this.manualControl && this.meshStates.length > 0) {
      this.meshStates[0].texture.dispose();
      this.meshStates[0].texture = new GLTexture2(this.gl, imageData);
    } else {
      const newMesh = new BHPMesh(this.gl, this.mainProgram.attrs.a_pos, this.mainProgram.attrs.a_color, this.mainProgram.attrs.a_uv);
      newMesh.resetSubdivition(50);
      const chosenPreset = Math.random() > 0.8 ? generateControlPoints(6, 6) : CONTROL_POINT_PRESETS[Math.floor(Math.random() * CONTROL_POINT_PRESETS.length)];
      newMesh.resizeControlPoints(chosenPreset.width, chosenPreset.height);
      const uPower = 2 / (chosenPreset.width - 1);
      const vPower = 2 / (chosenPreset.height - 1);
      for (const cp of chosenPreset.conf) {
        const p2 = newMesh.getControlPoint(cp.cx, cp.cy);
        p2.location.x = cp.x;
        p2.location.y = cp.y;
        p2.uRot = cp.ur * Math.PI / 180;
        p2.vRot = cp.vr * Math.PI / 180;
        p2.uScale = uPower * cp.up;
        p2.vScale = vPower * cp.vp;
      }
      newMesh.updateMesh();
      const newState = {
        mesh: newMesh,
        texture: new GLTexture2(this.gl, imageData),
        alpha: 0
      };
      this.meshStates.push(newState);
    }
    this.requestTick();
  }
  setLowFreqVolume(volume) {
    this.volume = volume / 10;
  }
  setBeatPulse(pulse) {
    this.beatPulse = Math.min(1, Math.max(0, pulse));
    this.requestTick();
  }
  // 接口占位：渲染器不接受歌词状态，保留 setter 与外部调用方对齐
  setHasLyric(_hasLyric) {
    return undefined;
  }
  dispose() {
    super.dispose();
    if (this.tickHandle) {
      cancelAnimationFrame(this.tickHandle);
      this.tickHandle = 0;
    }
    this._disposed = true;
    this.mainProgram.dispose();
    this.quadProgram.dispose();
    this.gl.deleteBuffer(this.quadBuffer);
    if (this.fbo) this.gl.deleteFramebuffer(this.fbo);
    if (this.fboTexture) this.gl.deleteTexture(this.fboTexture);
    for (const state of this.meshStates) {
      state.mesh.dispose();
      state.texture.dispose();
    }
  }
  enablePerformanceMonitor(enable) {
    this.enablePerformanceMonitoring = enable;
    if (enable) {
      this.frameCount = 0;
      this.lastFPSUpdate = performance.now();
    }
  }
  getCurrentFPS() {
    return this.currentFPS;
  }
  updatePerformanceStats(tickTime) {
    if (!this.enablePerformanceMonitoring) return;
    this.frameCount++;
    if (tickTime - this.lastFPSUpdate > 1e3) {
      this.currentFPS = this.frameCount;
      this.frameCount = 0;
      this.lastFPSUpdate = tickTime;
    }
  }
};
export const BackgroundRender2 = class BackgroundRender2 {
  element;
  renderer;
  constructor(renderer, canvas) {
    this.renderer = renderer;
    this.element = canvas;
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "-1";
    canvas.style.contain = "strict";
  }
  static new(type2) {
    const newCanvas = document.createElement("canvas");
    return new BackgroundRender2(new type2(newCanvas), newCanvas);
  }
  setRenderScale(scale) {
    this.renderer.setRenderScale(scale);
  }
  setFlowSpeed(speed) {
    this.renderer.setFlowSpeed(speed);
  }
  setStaticMode(enable) {
    this.renderer.setStaticMode(enable);
  }
  setFPS(fps) {
    this.renderer.setFPS(fps);
  }
  pause() {
    this.renderer.pause();
  }
  resume() {
    this.renderer.resume();
  }
  setLowFreqVolume(volume) {
    this.renderer.setLowFreqVolume(volume);
  }
  setBeatPulse(pulse) {
    this.renderer.setBeatPulse(pulse);
  }
  setHasLyric(hasLyric) {
    this.renderer.setHasLyric(hasLyric);
  }
  setAlbum(albumSource, isVideo) {
    return this.renderer.setAlbum(albumSource, isVideo);
  }
  getElement() {
    return this.element;
  }
  dispose() {
    this.renderer.dispose();
    this.element.remove();
  }
};
