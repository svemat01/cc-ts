// / <reference path="./advanced-math.d.ts" preserve="true" />
// ============================================
// Advanced Math - ComputerCraft Integration Types
// ============================================

// ============================================================================
// GLOBAL: matrix
// ============================================================================

/** @customConstructor matrix.new */
declare class matrix {
  rows: number;
  columns: number;

  // Construction
  /** @noSelf */
  public constructor(rows?: number, columns?: number, func?: ((r: number, c: number) => number) | number);
  /** @noSelf */
  static from2DArray(arr: number[][]): matrix;
  /** @noSelf */
  static fromVector(v: Vector, row?: boolean): matrix;
  /** @noSelf */
  static fromQuaternion(q: quaternion): matrix;
  /** @noSelf */
  static identity(rows: number, columns: number): matrix;
  /** @noSelf */
  static solve(A: matrix, b: matrix, tol?: number): LuaMultiReturn<[matrix, string?]>;

  // Arithmetic
  add(other: matrix | number): matrix;
  sub(other: matrix | number): matrix;
  mul(other: matrix | number): matrix;
  div(other: matrix | number): matrix;
  unm(): matrix;
  pow(n: number): matrix;

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
  transpose(): matrix;
  minor(row: number, column: number): matrix;
  cofactor(): matrix;
  adjugate(): matrix;
  inverse(): matrix;
  clone(): matrix;

  // Decomposition & Solving
  luDecomposition(): LuaMultiReturn<[matrix, matrix, number[]]>;
  solve(b: matrix, tol?: number): LuaMultiReturn<[matrix, string?]>;

  // Element-wise
  hadamardProduct(other: matrix): matrix;
  elementwiseDiv(other: matrix): matrix;

  // Shape
  flatten(): number[];
  reshape(rows: number, columns: number): matrix;
  submatrix(r1: number, r2: number, c1: number, c2: number): matrix;
  vstack(other: matrix): matrix;
  hstack(other: matrix): matrix;

  // Checks
  isSymmetric(): boolean;
  isDiagonal(): boolean;
  isIdentity(): boolean;

  // String / Equality
  tostring(): string;
  equals(other: matrix): boolean;
}


// ============================================================================
// GLOBAL: quaternion
// ============================================================================

/** @customConstructor quaternion.new */
declare class quaternion {
  v: Vector;
  a: number;

  // Construction
  public constructor(vec?: Vector, w?: number);
  /** @noSelf */
  static fromAxisAngle(axis: Vector, angle: number): quaternion;
  /** @noSelf */
  static fromEuler(pitch: number, yaw: number, roll: number): quaternion;
  /** @noSelf */
  static fromComponents(x: number, y: number, z: number, w: number): quaternion;
  /** @noSelf */
  static frommatrix(m: matrix): quaternion;
  /** @noSelf */
  static identity(): quaternion;

  // Arithmetic
  add(other: quaternion): quaternion;
  sub(other: quaternion): quaternion;
  mul(other: quaternion | Vector | number): quaternion | Vector;
  div(other: quaternion | number): quaternion;
  unm(): quaternion;

  // Operations
  conjugate(): quaternion;
  normalize(): quaternion;
  inverse(): quaternion;
  slerp(other: quaternion, alpha: number): quaternion;
  copy(): quaternion;

  // Properties
  getAngle(): number;
  getAxis(): Vector;
  toEuler(): LuaMultiReturn<[number, number, number]>;
  length(): number;
  isNan(): boolean;
  isInf(): boolean;

  // String / Equality
  tostring(): string;
  equals(other: quaternion): boolean;
}

/** @noResolution **/
declare module "advanced_math.pid" {
  export interface PID<T = number | Vector | quaternion> {
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
    /** @noSelf */
    (target: number, p?: number, i?: number, d?: number, discrete?: boolean): PID<number>;
    /** @noSelf */
    (target: Vector, p?: number, i?: number, d?: number, discrete?: boolean): PID<Vector>;
    /** @noSelf */
    (target: quaternion, p?: number, i?: number, d?: number, discrete?: boolean): PID<quaternion>;
  }
  export { newPID as new };
}

/** @noResolution **/
declare module "advanced_math.mmath" {
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
