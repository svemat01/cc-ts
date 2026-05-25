// ============================================
// Advanced Math - ComputerCraft Integration Types
// ============================================

// ============================================================================
// GLOBAL: matrix
// ============================================================================

declare class matrix {
  rows: number;
  columns: number;

  // Construction
  /** @noSelf */
  static new(rows?: number, columns?: number, func?: ((r: number, c: number) => number) | number): Matrix;
  /** @noSelf */
  static from2DArray(arr: number[][]): Matrix;
  /** @noSelf */
  static fromVector(v: Vector, row?: boolean): Matrix;
  /** @noSelf */
  static fromQuaternion(q: Quaternion): Matrix;
  /** @noSelf */
  static identity(rows: number, columns: number): Matrix;
  /** @noSelf */
  static solve(A: Matrix, b: Matrix, tol?: number): LuaMultiReturn<[Matrix, string?]>;

  private constructor() {}

  // Arithmetic
  add(other: Matrix | number): Matrix;
  sub(other: Matrix | number): Matrix;
  mul(other: Matrix | number): Matrix;
  div(other: Matrix | number): Matrix;
  unm(): Matrix;
  pow(n: number): Matrix;

  // Properties
  length(): number;
  determinant(): number;
  trace(): number;
  rank(): number;
  frobeniusNorm(): number;
  maxNorm(): number;
  oneNorm(): number;
  twoNorm(): number;
  infinityNorm(): number;
  conditionNumber(): number;

  // Transformations
  transpose(): Matrix;
  minor(row: number, column: number): Matrix;
  cofactor(): Matrix;
  adjugate(): Matrix;
  inverse(): Matrix;
  clone(): Matrix;

  // Decomposition & Solving
  luDecomposition(): LuaMultiReturn<[Matrix, Matrix, number[]]>;
  solve(b: Matrix, tol?: number): LuaMultiReturn<[Matrix, string?]>;

  // Element-wise
  hadamardProduct(other: Matrix): Matrix;
  elementwiseDiv(other: Matrix): Matrix;

  // Shape
  flatten(): number[];
  reshape(rows: number, columns: number): Matrix;
  submatrix(r1: number, r2: number, c1: number, c2: number): Matrix;
  vstack(other: Matrix): Matrix;
  hstack(other: Matrix): Matrix;

  // Checks
  isSymmetric(): boolean;
  isDiagonal(): boolean;
  isIdentity(): boolean;

  // String / Equality
  tostring(): string;
  equals(other: Matrix): boolean;
}

// /** @noSelf */
// declare const matrix: {
//     /** @noSelf */
//     newMatrix(rows?: number, columns?: number, func?: ((r: number, c: number) => number) | number): Matrix;
//     // from2DArray(arr: number[][]): Matrix;
//     // fromVector(v: Vector, row?: boolean): Matrix;
//     // fromQuaternion(q: Quaternion): Matrix;
//     // identity(rows: number, columns: number): Matrix;
//     // solve(A: Matrix, b: Matrix, tol?: number): LuaMultiReturn<[Matrix, string?]>;
// };


// ============================================================================
// GLOBAL: quaternion
// ============================================================================

declare class Quaternion {
  v: Vector;
  a: number;

  // Construction
  /** @noSelf */
  static new(vec?: Vector, w?: number): Quaternion;
  /** @noSelf */
  static fromAxisAngle(axis: Vector, angle: number): Quaternion;
  /** @noSelf */
  static fromEuler(pitch: number, yaw: number, roll: number): Quaternion;
  /** @noSelf */
  static fromComponents(x: number, y: number, z: number, w: number): Quaternion;
  /** @noSelf */
  static fromMatrix(m: Matrix): Quaternion;
  /** @noSelf */
  static identity(): Quaternion;

  private constructor() {}

  // Arithmetic
  add(other: Quaternion): Quaternion;
  sub(other: Quaternion): Quaternion;
  mul(other: Quaternion | Vector | number): Quaternion | Vector;
  div(other: Quaternion | number): Quaternion;
  unm(): Quaternion;

  // Operations
  conjugate(): Quaternion;
  normalize(): Quaternion;
  inverse(): Quaternion;
  slerp(other: Quaternion, alpha: number): Quaternion;
  copy(): Quaternion;

  // Properties
  getAngle(): number;
  getAxis(): Vector;
  toEuler(): LuaMultiReturn<[number, number, number]>;
  length(): number;
  isNan(): boolean;
  isInf(): boolean;

  // String / Equality
  tostring(): string;
  equals(other: Quaternion): boolean;
}

/** @noResolution **/
declare module "advanced_math/pid" {
  interface PID<T = number | Vector | Quaternion> {
      sp: T;
      kp: number;
      ki: number;
      kd: number;
      discrete: boolean;

      step(value: T, dt?: number): T;
      clampOutput(min?: number, max?: number): void;
      limitIntegral(min?: number, max?: number): void;
  }

  const newPID: {
    (target: number, p?: number, i?: number, d?: number, discrete?: boolean): PID<number>;
    (target: Vector, p?: number, i?: number, d?: number, discrete?: boolean): PID<Vector>;
    (target: Quaternion, p?: number, i?: number, d?: number, discrete?: boolean): PID<Quaternion>;
  }
  export { newPID as new };
}

/** @noResolution **/
declare module "advanced_math/mmath" {
  export function solveSysEq(
      f: (x: number) => number,
      g: (x: number) => number,
      min: number,
      max: number,
      steps: number,
      tol?: number,
      closeThresh?: number
  ): number[]

  export function weightedTable<T>(values: T[], weights: number[]): T[];
  export function scramble<T>(t: T[]): T[];

  export function integrateSimple(f: (x: number) => number, n: number, a: number, b: number, init?: number): number;
  export function integrateComplex(f: (x: number) => number, n: number, a: number, b: number, init?: number): number;

  export function ARC(f: (x: number) => number, x: number, h?: number): number;
  export function solveRoot(f: (x: number) => number, x0: number, tol: number): number | undefined;
}
