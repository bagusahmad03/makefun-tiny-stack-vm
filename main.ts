// Tiny stack VM for make.fun ISA v1. Practice: 1,000,000/1,000,000 (40/40).
// Run: MAKEFUN_INPUT_DIR=practice/input MAKEFUN_OUTPUT_DIR=out node main.ts
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Opcode facts, packed: per opcode 2 hex digits of byte, then imm, pops, pushes.
const T = '0000001101024010301004012050220602307033100211102112021130211402115021160211701118021190211a0211b0111c0211d0211e0212002121021220213020031210322103320034000400114102050010510105200153010';
const IMM = new Uint8Array(256), POPS = new Uint8Array(256), PUSHES = new Uint8Array(256), KNOWN = new Uint8Array(256);
for (let i = 0; i < T.length; i += 5) {
  const b = parseInt(T.slice(i, i + 2), 16);
  IMM[b] = +T[i + 2]; POPS[b] = +T[i + 3]; PUSHES[b] = +T[i + 4]; KNOWN[b] = 1;
}

function run(pg, inp) {
  const n = pg.length, st = new Int32Array(256), cs = new Int32Array(64), mm = new Int32Array(256);
  const out = new Uint8Array(65536);
  let sp = 0, cp = 0, olen = 0, ip = 0, pc = 0, steps = 0;
  const end = (e) => ({ stdout: Buffer.from(out.subarray(0, olen)), exit: e });
  for (;;) {
    if (steps === 1000000) return end(10);
    if (pc < 0 || pc >= n) return end(9);
    const op = pg[pc];
    if (!KNOWN[op]) return end(5);
    const imm = IMM[op];
    if (pc + imm >= n) return end(9);
    steps++;
    const nx = pc + 1 + imm;
    if (sp < POPS[op]) return end(2);
    if (sp - POPS[op] + PUSHES[op] > 256) return end(3);
    pc = nx;
    switch (op) {
      case 0x00: return end(0);
      case 0x01: st[sp++] = (pg[nx - 1] << 24) >> 24; break;
      case 0x02: st[sp++] = pg[nx - 4] | (pg[nx - 3] << 8) | (pg[nx - 2] << 16) | (pg[nx - 1] << 24); break;
      case 0x03: sp--; break;
      case 0x04: st[sp] = st[sp - 1]; sp++; break;
      case 0x05: { const t = st[sp - 1]; st[sp - 1] = st[sp - 2]; st[sp - 2] = t; break; }
      case 0x06: st[sp] = st[sp - 2]; sp++; break;
      case 0x07: { const a = st[sp - 3]; st[sp - 3] = st[sp - 2]; st[sp - 2] = st[sp - 1]; st[sp - 1] = a; break; }
      case 0x17: st[sp - 1] = (-st[sp - 1]) | 0; break;
      case 0x1b: st[sp - 1] = ~st[sp - 1]; break;
      case 0x10: case 0x11: case 0x12: case 0x13: case 0x14: case 0x15: case 0x16:
      case 0x18: case 0x19: case 0x1a: case 0x1c: case 0x1d: case 0x1e:
      case 0x20: case 0x21: case 0x22: {
        const b = st[sp - 1], a = st[sp - 2];
        let r;
        switch (op) {
          case 0x10: r = (a + b) | 0; break;
          case 0x11: r = (a - b) | 0; break;
          case 0x12: r = Math.imul(a, b); break;
          case 0x13: if (b === 0) return end(4); r = a === -2147483648 && b === -1 ? a : (a / b) | 0; break;
          case 0x14: if (b === 0) return end(4); r = b === -1 ? 0 : (a % b) | 0; break;
          case 0x15: if (b === 0) return end(4); r = Math.floor((a >>> 0) / (b >>> 0)) | 0; break;
          case 0x16: if (b === 0) return end(4); r = ((a >>> 0) % (b >>> 0)) | 0; break;
          case 0x18: r = a & b; break;
          case 0x19: r = a | b; break;
          case 0x1a: r = a ^ b; break;
          case 0x1c: r = a << (b & 31); break;
          case 0x1d: r = a >> (b & 31); break;
          case 0x1e: r = (a >>> (b & 31)) | 0; break;
          case 0x20: r = a === b ? 1 : 0; break;
          case 0x21: r = a < b ? 1 : 0; break;
          default: r = (a >>> 0) < (b >>> 0) ? 1 : 0;
        }
        sp -= 2; st[sp++] = r; break;
      }
      case 0x30: case 0x31: case 0x32: {
        const rel = ((pg[nx - 2] | (pg[nx - 1] << 8)) << 16) >> 16;
        let take = true;
        if (op !== 0x30) { const v = st[--sp]; take = op === 0x31 ? v === 0 : v !== 0; }
        if (take) pc = nx + rel;
        break;
      }
      case 0x33:
        if (cp === 64) return end(7);
        cs[cp++] = nx; pc = pg[nx - 2] | (pg[nx - 1] << 8);
        break;
      case 0x34:
        if (cp === 0) return end(8);
        pc = cs[--cp];
        break;
      case 0x40: {
        const ad = st[sp - 1];
        if (ad < 0 || ad > 255) return end(6);
        st[sp - 1] = mm[ad];
        break;
      }
      case 0x41: {
        const ad = st[sp - 1], v = st[sp - 2];
        if (ad < 0 || ad > 255) return end(6);
        sp -= 2; mm[ad] = v;
        break;
      }
      case 0x50: {
        const t = Buffer.from(String(st[sp - 1]), 'ascii');
        if (olen + t.length > 65536) return end(11);
        sp--; out.set(t, olen); olen += t.length;
        break;
      }
      case 0x51:
        if (olen + 1 > 65536) return end(11);
        out[olen++] = st[--sp] & 255;
        break;
      case 0x52: st[sp++] = ip < inp.length ? inp[ip++] : -1; break;
      case 0x53: return end(st[--sp] & 255);
    }
  }
}

const I = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const O = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
for (const id of readdirSync(I).sort()) {
  const { stdout, exit } = run(readFileSync(join(I, id, 'program.bin')), readFileSync(join(I, id, 'input.bin')));
  mkdirSync(join(O, id), { recursive: true });
  writeFileSync(join(O, id, 'stdout.bin'), stdout);
  writeFileSync(join(O, id, 'exit.txt'), String(exit) + '\n');
}
