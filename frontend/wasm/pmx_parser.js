// pmx_parser.js — Zig 编译产物的 emcc 兼容适配层
// 由 zig cc --target=wasm32-wasi 编译 pmx.c 产出裸 wasm，此处模拟 Emscripten Module API。
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { WASI } from 'node:wasi';

const wasmPath = fileURLToPath(new URL('./pmx_parser.wasm', import.meta.url));

export default async function createModule() {
  const bytes = readFileSync(wasmPath);
  const wasi = new WASI({ version: 'preview1', args: [], env: {}, preopens: {} });
  const { instance } = await WebAssembly.instantiate(bytes, {
    wasi_snapshot_preview1: wasi.wasiImport,
  });
  // 初始化 WASI（使 stderr/stdio 可用；模块无 _initialize 导出时跳过）
  if (typeof instance.exports._initialize === 'function') {
    wasi.initialize(instance);
  } else {
    try { wasi.initialize(instance); } catch { /* 兼容无 _initialize 的构建 */ }
  }
  const memory = instance.exports.memory;
  const exp = instance.exports;

  // 用 getter 模拟 emcc 的 HEAP* 属性：每次访问都基于当前 memory.buffer（内存增长后自动正确）
  const Module = {
    get HEAP8() { return new Int8Array(memory.buffer); },
    get HEAPU8() { return new Uint8Array(memory.buffer); },
    get HEAP16() { return new Int16Array(memory.buffer); },
    get HEAPU16() { return new Uint16Array(memory.buffer); },
    get HEAPU32() { return new Uint32Array(memory.buffer); },
    get HEAPF32() { return new Float32Array(memory.buffer); },
    get HEAPF64() { return new Float64Array(memory.buffer); },
    _malloc: (n) => exp.malloc(n),
    _free: (p) => exp.free(p),
    _pmx_wasm_parse: (a, b, c, d) => exp.pmx_wasm_parse(a, b, c, d),
    _pmx_wasm_free: (p) => exp.pmx_wasm_free(p),
  };
  // 预触发 wasi-libc 堆初始化：首次 malloc 可能触发 memory.grow（使此前取得的视图 detached），
  // 在 createModule 内先分配/释放一次，让调用方后续拿到的 HEAP* 视图保持稳定
  const probe = exp.malloc(64);
  if (probe) exp.free(probe);
  return Module;
}
