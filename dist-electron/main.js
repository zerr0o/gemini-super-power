import kt, { ipcMain as Gr, dialog as Ln, app as pt, BrowserWindow as Xn, Menu as Jf } from "electron";
import _t from "fs";
import Qf from "constants";
import Vr from "stream";
import Ca from "util";
import Sl from "assert";
import re from "path";
import Kn from "child_process";
import Cl from "events";
import Wr from "crypto";
import bl from "tty";
import Jn from "os";
import At from "url";
import Rl from "zlib";
import Zf from "http";
import { fileURLToPath as ed } from "node:url";
import Me from "node:path";
import { writeFile as Ol, mkdir as Pl, access as td } from "node:fs/promises";
import { constants as rd } from "node:fs";
var Se = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {}, ke = {}, Bt = {}, Re = {};
Re.fromCallback = function(e) {
  return Object.defineProperty(function(...t) {
    if (typeof t[t.length - 1] == "function") e.apply(this, t);
    else
      return new Promise((r, n) => {
        t.push((i, a) => i != null ? n(i) : r(a)), e.apply(this, t);
      });
  }, "name", { value: e.name });
};
Re.fromPromise = function(e) {
  return Object.defineProperty(function(...t) {
    const r = t[t.length - 1];
    if (typeof r != "function") return e.apply(this, t);
    t.pop(), e.apply(this, t).then((n) => r(null, n), r);
  }, "name", { value: e.name });
};
var ct = Qf, nd = process.cwd, Dn = null, id = process.env.GRACEFUL_FS_PLATFORM || process.platform;
process.cwd = function() {
  return Dn || (Dn = nd.call(process)), Dn;
};
try {
  process.cwd();
} catch {
}
if (typeof process.chdir == "function") {
  var bo = process.chdir;
  process.chdir = function(e) {
    Dn = null, bo.call(process, e);
  }, Object.setPrototypeOf && Object.setPrototypeOf(process.chdir, bo);
}
var ad = od;
function od(e) {
  ct.hasOwnProperty("O_SYMLINK") && process.version.match(/^v0\.6\.[0-2]|^v0\.5\./) && t(e), e.lutimes || r(e), e.chown = a(e.chown), e.fchown = a(e.fchown), e.lchown = a(e.lchown), e.chmod = n(e.chmod), e.fchmod = n(e.fchmod), e.lchmod = n(e.lchmod), e.chownSync = o(e.chownSync), e.fchownSync = o(e.fchownSync), e.lchownSync = o(e.lchownSync), e.chmodSync = i(e.chmodSync), e.fchmodSync = i(e.fchmodSync), e.lchmodSync = i(e.lchmodSync), e.stat = s(e.stat), e.fstat = s(e.fstat), e.lstat = s(e.lstat), e.statSync = l(e.statSync), e.fstatSync = l(e.fstatSync), e.lstatSync = l(e.lstatSync), e.chmod && !e.lchmod && (e.lchmod = function(c, f, d) {
    d && process.nextTick(d);
  }, e.lchmodSync = function() {
  }), e.chown && !e.lchown && (e.lchown = function(c, f, d, g) {
    g && process.nextTick(g);
  }, e.lchownSync = function() {
  }), id === "win32" && (e.rename = typeof e.rename != "function" ? e.rename : function(c) {
    function f(d, g, v) {
      var y = Date.now(), A = 0;
      c(d, g, function S(T) {
        if (T && (T.code === "EACCES" || T.code === "EPERM" || T.code === "EBUSY") && Date.now() - y < 6e4) {
          setTimeout(function() {
            e.stat(g, function(D, x) {
              D && D.code === "ENOENT" ? c(d, g, S) : v(T);
            });
          }, A), A < 100 && (A += 10);
          return;
        }
        v && v(T);
      });
    }
    return Object.setPrototypeOf && Object.setPrototypeOf(f, c), f;
  }(e.rename)), e.read = typeof e.read != "function" ? e.read : function(c) {
    function f(d, g, v, y, A, S) {
      var T;
      if (S && typeof S == "function") {
        var D = 0;
        T = function(x, Z, ae) {
          if (x && x.code === "EAGAIN" && D < 10)
            return D++, c.call(e, d, g, v, y, A, T);
          S.apply(this, arguments);
        };
      }
      return c.call(e, d, g, v, y, A, T);
    }
    return Object.setPrototypeOf && Object.setPrototypeOf(f, c), f;
  }(e.read), e.readSync = typeof e.readSync != "function" ? e.readSync : /* @__PURE__ */ function(c) {
    return function(f, d, g, v, y) {
      for (var A = 0; ; )
        try {
          return c.call(e, f, d, g, v, y);
        } catch (S) {
          if (S.code === "EAGAIN" && A < 10) {
            A++;
            continue;
          }
          throw S;
        }
    };
  }(e.readSync);
  function t(c) {
    c.lchmod = function(f, d, g) {
      c.open(
        f,
        ct.O_WRONLY | ct.O_SYMLINK,
        d,
        function(v, y) {
          if (v) {
            g && g(v);
            return;
          }
          c.fchmod(y, d, function(A) {
            c.close(y, function(S) {
              g && g(A || S);
            });
          });
        }
      );
    }, c.lchmodSync = function(f, d) {
      var g = c.openSync(f, ct.O_WRONLY | ct.O_SYMLINK, d), v = !0, y;
      try {
        y = c.fchmodSync(g, d), v = !1;
      } finally {
        if (v)
          try {
            c.closeSync(g);
          } catch {
          }
        else
          c.closeSync(g);
      }
      return y;
    };
  }
  function r(c) {
    ct.hasOwnProperty("O_SYMLINK") && c.futimes ? (c.lutimes = function(f, d, g, v) {
      c.open(f, ct.O_SYMLINK, function(y, A) {
        if (y) {
          v && v(y);
          return;
        }
        c.futimes(A, d, g, function(S) {
          c.close(A, function(T) {
            v && v(S || T);
          });
        });
      });
    }, c.lutimesSync = function(f, d, g) {
      var v = c.openSync(f, ct.O_SYMLINK), y, A = !0;
      try {
        y = c.futimesSync(v, d, g), A = !1;
      } finally {
        if (A)
          try {
            c.closeSync(v);
          } catch {
          }
        else
          c.closeSync(v);
      }
      return y;
    }) : c.futimes && (c.lutimes = function(f, d, g, v) {
      v && process.nextTick(v);
    }, c.lutimesSync = function() {
    });
  }
  function n(c) {
    return c && function(f, d, g) {
      return c.call(e, f, d, function(v) {
        m(v) && (v = null), g && g.apply(this, arguments);
      });
    };
  }
  function i(c) {
    return c && function(f, d) {
      try {
        return c.call(e, f, d);
      } catch (g) {
        if (!m(g)) throw g;
      }
    };
  }
  function a(c) {
    return c && function(f, d, g, v) {
      return c.call(e, f, d, g, function(y) {
        m(y) && (y = null), v && v.apply(this, arguments);
      });
    };
  }
  function o(c) {
    return c && function(f, d, g) {
      try {
        return c.call(e, f, d, g);
      } catch (v) {
        if (!m(v)) throw v;
      }
    };
  }
  function s(c) {
    return c && function(f, d, g) {
      typeof d == "function" && (g = d, d = null);
      function v(y, A) {
        A && (A.uid < 0 && (A.uid += 4294967296), A.gid < 0 && (A.gid += 4294967296)), g && g.apply(this, arguments);
      }
      return d ? c.call(e, f, d, v) : c.call(e, f, v);
    };
  }
  function l(c) {
    return c && function(f, d) {
      var g = d ? c.call(e, f, d) : c.call(e, f);
      return g && (g.uid < 0 && (g.uid += 4294967296), g.gid < 0 && (g.gid += 4294967296)), g;
    };
  }
  function m(c) {
    if (!c || c.code === "ENOSYS")
      return !0;
    var f = !process.getuid || process.getuid() !== 0;
    return !!(f && (c.code === "EINVAL" || c.code === "EPERM"));
  }
}
var Ro = Vr.Stream, sd = ld;
function ld(e) {
  return {
    ReadStream: t,
    WriteStream: r
  };
  function t(n, i) {
    if (!(this instanceof t)) return new t(n, i);
    Ro.call(this);
    var a = this;
    this.path = n, this.fd = null, this.readable = !0, this.paused = !1, this.flags = "r", this.mode = 438, this.bufferSize = 64 * 1024, i = i || {};
    for (var o = Object.keys(i), s = 0, l = o.length; s < l; s++) {
      var m = o[s];
      this[m] = i[m];
    }
    if (this.encoding && this.setEncoding(this.encoding), this.start !== void 0) {
      if (typeof this.start != "number")
        throw TypeError("start must be a Number");
      if (this.end === void 0)
        this.end = 1 / 0;
      else if (typeof this.end != "number")
        throw TypeError("end must be a Number");
      if (this.start > this.end)
        throw new Error("start must be <= end");
      this.pos = this.start;
    }
    if (this.fd !== null) {
      process.nextTick(function() {
        a._read();
      });
      return;
    }
    e.open(this.path, this.flags, this.mode, function(c, f) {
      if (c) {
        a.emit("error", c), a.readable = !1;
        return;
      }
      a.fd = f, a.emit("open", f), a._read();
    });
  }
  function r(n, i) {
    if (!(this instanceof r)) return new r(n, i);
    Ro.call(this), this.path = n, this.fd = null, this.writable = !0, this.flags = "w", this.encoding = "binary", this.mode = 438, this.bytesWritten = 0, i = i || {};
    for (var a = Object.keys(i), o = 0, s = a.length; o < s; o++) {
      var l = a[o];
      this[l] = i[l];
    }
    if (this.start !== void 0) {
      if (typeof this.start != "number")
        throw TypeError("start must be a Number");
      if (this.start < 0)
        throw new Error("start must be >= zero");
      this.pos = this.start;
    }
    this.busy = !1, this._queue = [], this.fd === null && (this._open = e.open, this._queue.push([this._open, this.path, this.flags, this.mode, void 0]), this.flush());
  }
}
var cd = fd, ud = Object.getPrototypeOf || function(e) {
  return e.__proto__;
};
function fd(e) {
  if (e === null || typeof e != "object")
    return e;
  if (e instanceof Object)
    var t = { __proto__: ud(e) };
  else
    var t = /* @__PURE__ */ Object.create(null);
  return Object.getOwnPropertyNames(e).forEach(function(r) {
    Object.defineProperty(t, r, Object.getOwnPropertyDescriptor(e, r));
  }), t;
}
var te = _t, dd = ad, hd = sd, pd = cd, mn = Ca, ge, Un;
typeof Symbol == "function" && typeof Symbol.for == "function" ? (ge = Symbol.for("graceful-fs.queue"), Un = Symbol.for("graceful-fs.previous")) : (ge = "___graceful-fs.queue", Un = "___graceful-fs.previous");
function md() {
}
function Il(e, t) {
  Object.defineProperty(e, ge, {
    get: function() {
      return t;
    }
  });
}
var Lt = md;
mn.debuglog ? Lt = mn.debuglog("gfs4") : /\bgfs4\b/i.test(process.env.NODE_DEBUG || "") && (Lt = function() {
  var e = mn.format.apply(mn, arguments);
  e = "GFS4: " + e.split(/\n/).join(`
GFS4: `), console.error(e);
});
if (!te[ge]) {
  var gd = Se[ge] || [];
  Il(te, gd), te.close = function(e) {
    function t(r, n) {
      return e.call(te, r, function(i) {
        i || Oo(), typeof n == "function" && n.apply(this, arguments);
      });
    }
    return Object.defineProperty(t, Un, {
      value: e
    }), t;
  }(te.close), te.closeSync = function(e) {
    function t(r) {
      e.apply(te, arguments), Oo();
    }
    return Object.defineProperty(t, Un, {
      value: e
    }), t;
  }(te.closeSync), /\bgfs4\b/i.test(process.env.NODE_DEBUG || "") && process.on("exit", function() {
    Lt(te[ge]), Sl.equal(te[ge].length, 0);
  });
}
Se[ge] || Il(Se, te[ge]);
var Oe = ba(pd(te));
process.env.TEST_GRACEFUL_FS_GLOBAL_PATCH && !te.__patched && (Oe = ba(te), te.__patched = !0);
function ba(e) {
  dd(e), e.gracefulify = ba, e.createReadStream = Z, e.createWriteStream = ae;
  var t = e.readFile;
  e.readFile = r;
  function r(E, q, B) {
    return typeof q == "function" && (B = q, q = null), M(E, q, B);
    function M(z, P, R, N) {
      return t(z, P, function(b) {
        b && (b.code === "EMFILE" || b.code === "ENFILE") ? Vt([M, [z, P, R], b, N || Date.now(), Date.now()]) : typeof R == "function" && R.apply(this, arguments);
      });
    }
  }
  var n = e.writeFile;
  e.writeFile = i;
  function i(E, q, B, M) {
    return typeof B == "function" && (M = B, B = null), z(E, q, B, M);
    function z(P, R, N, b, $) {
      return n(P, R, N, function(I) {
        I && (I.code === "EMFILE" || I.code === "ENFILE") ? Vt([z, [P, R, N, b], I, $ || Date.now(), Date.now()]) : typeof b == "function" && b.apply(this, arguments);
      });
    }
  }
  var a = e.appendFile;
  a && (e.appendFile = o);
  function o(E, q, B, M) {
    return typeof B == "function" && (M = B, B = null), z(E, q, B, M);
    function z(P, R, N, b, $) {
      return a(P, R, N, function(I) {
        I && (I.code === "EMFILE" || I.code === "ENFILE") ? Vt([z, [P, R, N, b], I, $ || Date.now(), Date.now()]) : typeof b == "function" && b.apply(this, arguments);
      });
    }
  }
  var s = e.copyFile;
  s && (e.copyFile = l);
  function l(E, q, B, M) {
    return typeof B == "function" && (M = B, B = 0), z(E, q, B, M);
    function z(P, R, N, b, $) {
      return s(P, R, N, function(I) {
        I && (I.code === "EMFILE" || I.code === "ENFILE") ? Vt([z, [P, R, N, b], I, $ || Date.now(), Date.now()]) : typeof b == "function" && b.apply(this, arguments);
      });
    }
  }
  var m = e.readdir;
  e.readdir = f;
  var c = /^v[0-5]\./;
  function f(E, q, B) {
    typeof q == "function" && (B = q, q = null);
    var M = c.test(process.version) ? function(R, N, b, $) {
      return m(R, z(
        R,
        N,
        b,
        $
      ));
    } : function(R, N, b, $) {
      return m(R, N, z(
        R,
        N,
        b,
        $
      ));
    };
    return M(E, q, B);
    function z(P, R, N, b) {
      return function($, I) {
        $ && ($.code === "EMFILE" || $.code === "ENFILE") ? Vt([
          M,
          [P, R, N],
          $,
          b || Date.now(),
          Date.now()
        ]) : (I && I.sort && I.sort(), typeof N == "function" && N.call(this, $, I));
      };
    }
  }
  if (process.version.substr(0, 4) === "v0.8") {
    var d = hd(e);
    S = d.ReadStream, D = d.WriteStream;
  }
  var g = e.ReadStream;
  g && (S.prototype = Object.create(g.prototype), S.prototype.open = T);
  var v = e.WriteStream;
  v && (D.prototype = Object.create(v.prototype), D.prototype.open = x), Object.defineProperty(e, "ReadStream", {
    get: function() {
      return S;
    },
    set: function(E) {
      S = E;
    },
    enumerable: !0,
    configurable: !0
  }), Object.defineProperty(e, "WriteStream", {
    get: function() {
      return D;
    },
    set: function(E) {
      D = E;
    },
    enumerable: !0,
    configurable: !0
  });
  var y = S;
  Object.defineProperty(e, "FileReadStream", {
    get: function() {
      return y;
    },
    set: function(E) {
      y = E;
    },
    enumerable: !0,
    configurable: !0
  });
  var A = D;
  Object.defineProperty(e, "FileWriteStream", {
    get: function() {
      return A;
    },
    set: function(E) {
      A = E;
    },
    enumerable: !0,
    configurable: !0
  });
  function S(E, q) {
    return this instanceof S ? (g.apply(this, arguments), this) : S.apply(Object.create(S.prototype), arguments);
  }
  function T() {
    var E = this;
    $e(E.path, E.flags, E.mode, function(q, B) {
      q ? (E.autoClose && E.destroy(), E.emit("error", q)) : (E.fd = B, E.emit("open", B), E.read());
    });
  }
  function D(E, q) {
    return this instanceof D ? (v.apply(this, arguments), this) : D.apply(Object.create(D.prototype), arguments);
  }
  function x() {
    var E = this;
    $e(E.path, E.flags, E.mode, function(q, B) {
      q ? (E.destroy(), E.emit("error", q)) : (E.fd = B, E.emit("open", B));
    });
  }
  function Z(E, q) {
    return new e.ReadStream(E, q);
  }
  function ae(E, q) {
    return new e.WriteStream(E, q);
  }
  var W = e.open;
  e.open = $e;
  function $e(E, q, B, M) {
    return typeof B == "function" && (M = B, B = null), z(E, q, B, M);
    function z(P, R, N, b, $) {
      return W(P, R, N, function(I, k) {
        I && (I.code === "EMFILE" || I.code === "ENFILE") ? Vt([z, [P, R, N, b], I, $ || Date.now(), Date.now()]) : typeof b == "function" && b.apply(this, arguments);
      });
    }
  }
  return e;
}
function Vt(e) {
  Lt("ENQUEUE", e[0].name, e[1]), te[ge].push(e), Ra();
}
var gn;
function Oo() {
  for (var e = Date.now(), t = 0; t < te[ge].length; ++t)
    te[ge][t].length > 2 && (te[ge][t][3] = e, te[ge][t][4] = e);
  Ra();
}
function Ra() {
  if (clearTimeout(gn), gn = void 0, te[ge].length !== 0) {
    var e = te[ge].shift(), t = e[0], r = e[1], n = e[2], i = e[3], a = e[4];
    if (i === void 0)
      Lt("RETRY", t.name, r), t.apply(null, r);
    else if (Date.now() - i >= 6e4) {
      Lt("TIMEOUT", t.name, r);
      var o = r.pop();
      typeof o == "function" && o.call(null, n);
    } else {
      var s = Date.now() - a, l = Math.max(a - i, 1), m = Math.min(l * 1.2, 100);
      s >= m ? (Lt("RETRY", t.name, r), t.apply(null, r.concat([i]))) : te[ge].push(e);
    }
    gn === void 0 && (gn = setTimeout(Ra, 0));
  }
}
(function(e) {
  const t = Re.fromCallback, r = Oe, n = [
    "access",
    "appendFile",
    "chmod",
    "chown",
    "close",
    "copyFile",
    "fchmod",
    "fchown",
    "fdatasync",
    "fstat",
    "fsync",
    "ftruncate",
    "futimes",
    "lchmod",
    "lchown",
    "link",
    "lstat",
    "mkdir",
    "mkdtemp",
    "open",
    "opendir",
    "readdir",
    "readFile",
    "readlink",
    "realpath",
    "rename",
    "rm",
    "rmdir",
    "stat",
    "symlink",
    "truncate",
    "unlink",
    "utimes",
    "writeFile"
  ].filter((i) => typeof r[i] == "function");
  Object.assign(e, r), n.forEach((i) => {
    e[i] = t(r[i]);
  }), e.exists = function(i, a) {
    return typeof a == "function" ? r.exists(i, a) : new Promise((o) => r.exists(i, o));
  }, e.read = function(i, a, o, s, l, m) {
    return typeof m == "function" ? r.read(i, a, o, s, l, m) : new Promise((c, f) => {
      r.read(i, a, o, s, l, (d, g, v) => {
        if (d) return f(d);
        c({ bytesRead: g, buffer: v });
      });
    });
  }, e.write = function(i, a, ...o) {
    return typeof o[o.length - 1] == "function" ? r.write(i, a, ...o) : new Promise((s, l) => {
      r.write(i, a, ...o, (m, c, f) => {
        if (m) return l(m);
        s({ bytesWritten: c, buffer: f });
      });
    });
  }, typeof r.writev == "function" && (e.writev = function(i, a, ...o) {
    return typeof o[o.length - 1] == "function" ? r.writev(i, a, ...o) : new Promise((s, l) => {
      r.writev(i, a, ...o, (m, c, f) => {
        if (m) return l(m);
        s({ bytesWritten: c, buffers: f });
      });
    });
  }), typeof r.realpath.native == "function" ? e.realpath.native = t(r.realpath.native) : process.emitWarning(
    "fs.realpath.native is not a function. Is fs being monkey-patched?",
    "Warning",
    "fs-extra-WARN0003"
  );
})(Bt);
var Oa = {}, Nl = {};
const Ed = re;
Nl.checkPath = function(t) {
  if (process.platform === "win32" && /[<>:"|?*]/.test(t.replace(Ed.parse(t).root, ""))) {
    const n = new Error(`Path contains invalid characters: ${t}`);
    throw n.code = "EINVAL", n;
  }
};
const Dl = Bt, { checkPath: $l } = Nl, Fl = (e) => {
  const t = { mode: 511 };
  return typeof e == "number" ? e : { ...t, ...e }.mode;
};
Oa.makeDir = async (e, t) => ($l(e), Dl.mkdir(e, {
  mode: Fl(t),
  recursive: !0
}));
Oa.makeDirSync = (e, t) => ($l(e), Dl.mkdirSync(e, {
  mode: Fl(t),
  recursive: !0
}));
const yd = Re.fromPromise, { makeDir: vd, makeDirSync: Oi } = Oa, Pi = yd(vd);
var Ze = {
  mkdirs: Pi,
  mkdirsSync: Oi,
  // alias
  mkdirp: Pi,
  mkdirpSync: Oi,
  ensureDir: Pi,
  ensureDirSync: Oi
};
const wd = Re.fromPromise, xl = Bt;
function _d(e) {
  return xl.access(e).then(() => !0).catch(() => !1);
}
var jt = {
  pathExists: wd(_d),
  pathExistsSync: xl.existsSync
};
const nr = Oe;
function Ad(e, t, r, n) {
  nr.open(e, "r+", (i, a) => {
    if (i) return n(i);
    nr.futimes(a, t, r, (o) => {
      nr.close(a, (s) => {
        n && n(o || s);
      });
    });
  });
}
function Td(e, t, r) {
  const n = nr.openSync(e, "r+");
  return nr.futimesSync(n, t, r), nr.closeSync(n);
}
var Ll = {
  utimesMillis: Ad,
  utimesMillisSync: Td
};
const ar = Bt, de = re, Sd = Ca;
function Cd(e, t, r) {
  const n = r.dereference ? (i) => ar.stat(i, { bigint: !0 }) : (i) => ar.lstat(i, { bigint: !0 });
  return Promise.all([
    n(e),
    n(t).catch((i) => {
      if (i.code === "ENOENT") return null;
      throw i;
    })
  ]).then(([i, a]) => ({ srcStat: i, destStat: a }));
}
function bd(e, t, r) {
  let n;
  const i = r.dereference ? (o) => ar.statSync(o, { bigint: !0 }) : (o) => ar.lstatSync(o, { bigint: !0 }), a = i(e);
  try {
    n = i(t);
  } catch (o) {
    if (o.code === "ENOENT") return { srcStat: a, destStat: null };
    throw o;
  }
  return { srcStat: a, destStat: n };
}
function Rd(e, t, r, n, i) {
  Sd.callbackify(Cd)(e, t, n, (a, o) => {
    if (a) return i(a);
    const { srcStat: s, destStat: l } = o;
    if (l) {
      if (Yr(s, l)) {
        const m = de.basename(e), c = de.basename(t);
        return r === "move" && m !== c && m.toLowerCase() === c.toLowerCase() ? i(null, { srcStat: s, destStat: l, isChangingCase: !0 }) : i(new Error("Source and destination must not be the same."));
      }
      if (s.isDirectory() && !l.isDirectory())
        return i(new Error(`Cannot overwrite non-directory '${t}' with directory '${e}'.`));
      if (!s.isDirectory() && l.isDirectory())
        return i(new Error(`Cannot overwrite directory '${t}' with non-directory '${e}'.`));
    }
    return s.isDirectory() && Pa(e, t) ? i(new Error(Qn(e, t, r))) : i(null, { srcStat: s, destStat: l });
  });
}
function Od(e, t, r, n) {
  const { srcStat: i, destStat: a } = bd(e, t, n);
  if (a) {
    if (Yr(i, a)) {
      const o = de.basename(e), s = de.basename(t);
      if (r === "move" && o !== s && o.toLowerCase() === s.toLowerCase())
        return { srcStat: i, destStat: a, isChangingCase: !0 };
      throw new Error("Source and destination must not be the same.");
    }
    if (i.isDirectory() && !a.isDirectory())
      throw new Error(`Cannot overwrite non-directory '${t}' with directory '${e}'.`);
    if (!i.isDirectory() && a.isDirectory())
      throw new Error(`Cannot overwrite directory '${t}' with non-directory '${e}'.`);
  }
  if (i.isDirectory() && Pa(e, t))
    throw new Error(Qn(e, t, r));
  return { srcStat: i, destStat: a };
}
function Ul(e, t, r, n, i) {
  const a = de.resolve(de.dirname(e)), o = de.resolve(de.dirname(r));
  if (o === a || o === de.parse(o).root) return i();
  ar.stat(o, { bigint: !0 }, (s, l) => s ? s.code === "ENOENT" ? i() : i(s) : Yr(t, l) ? i(new Error(Qn(e, r, n))) : Ul(e, t, o, n, i));
}
function kl(e, t, r, n) {
  const i = de.resolve(de.dirname(e)), a = de.resolve(de.dirname(r));
  if (a === i || a === de.parse(a).root) return;
  let o;
  try {
    o = ar.statSync(a, { bigint: !0 });
  } catch (s) {
    if (s.code === "ENOENT") return;
    throw s;
  }
  if (Yr(t, o))
    throw new Error(Qn(e, r, n));
  return kl(e, t, a, n);
}
function Yr(e, t) {
  return t.ino && t.dev && t.ino === e.ino && t.dev === e.dev;
}
function Pa(e, t) {
  const r = de.resolve(e).split(de.sep).filter((i) => i), n = de.resolve(t).split(de.sep).filter((i) => i);
  return r.reduce((i, a, o) => i && n[o] === a, !0);
}
function Qn(e, t, r) {
  return `Cannot ${r} '${e}' to a subdirectory of itself, '${t}'.`;
}
var cr = {
  checkPaths: Rd,
  checkPathsSync: Od,
  checkParentPaths: Ul,
  checkParentPathsSync: kl,
  isSrcSubdir: Pa,
  areIdentical: Yr
};
const Ne = Oe, Pr = re, Pd = Ze.mkdirs, Id = jt.pathExists, Nd = Ll.utimesMillis, Ir = cr;
function Dd(e, t, r, n) {
  typeof r == "function" && !n ? (n = r, r = {}) : typeof r == "function" && (r = { filter: r }), n = n || function() {
  }, r = r || {}, r.clobber = "clobber" in r ? !!r.clobber : !0, r.overwrite = "overwrite" in r ? !!r.overwrite : r.clobber, r.preserveTimestamps && process.arch === "ia32" && process.emitWarning(
    `Using the preserveTimestamps option in 32-bit node is not recommended;

	see https://github.com/jprichardson/node-fs-extra/issues/269`,
    "Warning",
    "fs-extra-WARN0001"
  ), Ir.checkPaths(e, t, "copy", r, (i, a) => {
    if (i) return n(i);
    const { srcStat: o, destStat: s } = a;
    Ir.checkParentPaths(e, o, t, "copy", (l) => l ? n(l) : r.filter ? Ml(Po, s, e, t, r, n) : Po(s, e, t, r, n));
  });
}
function Po(e, t, r, n, i) {
  const a = Pr.dirname(r);
  Id(a, (o, s) => {
    if (o) return i(o);
    if (s) return kn(e, t, r, n, i);
    Pd(a, (l) => l ? i(l) : kn(e, t, r, n, i));
  });
}
function Ml(e, t, r, n, i, a) {
  Promise.resolve(i.filter(r, n)).then((o) => o ? e(t, r, n, i, a) : a(), (o) => a(o));
}
function $d(e, t, r, n, i) {
  return n.filter ? Ml(kn, e, t, r, n, i) : kn(e, t, r, n, i);
}
function kn(e, t, r, n, i) {
  (n.dereference ? Ne.stat : Ne.lstat)(t, (o, s) => o ? i(o) : s.isDirectory() ? Bd(s, e, t, r, n, i) : s.isFile() || s.isCharacterDevice() || s.isBlockDevice() ? Fd(s, e, t, r, n, i) : s.isSymbolicLink() ? qd(e, t, r, n, i) : s.isSocket() ? i(new Error(`Cannot copy a socket file: ${t}`)) : s.isFIFO() ? i(new Error(`Cannot copy a FIFO pipe: ${t}`)) : i(new Error(`Unknown file: ${t}`)));
}
function Fd(e, t, r, n, i, a) {
  return t ? xd(e, r, n, i, a) : Bl(e, r, n, i, a);
}
function xd(e, t, r, n, i) {
  if (n.overwrite)
    Ne.unlink(r, (a) => a ? i(a) : Bl(e, t, r, n, i));
  else return n.errorOnExist ? i(new Error(`'${r}' already exists`)) : i();
}
function Bl(e, t, r, n, i) {
  Ne.copyFile(t, r, (a) => a ? i(a) : n.preserveTimestamps ? Ld(e.mode, t, r, i) : Zn(r, e.mode, i));
}
function Ld(e, t, r, n) {
  return Ud(e) ? kd(r, e, (i) => i ? n(i) : Io(e, t, r, n)) : Io(e, t, r, n);
}
function Ud(e) {
  return (e & 128) === 0;
}
function kd(e, t, r) {
  return Zn(e, t | 128, r);
}
function Io(e, t, r, n) {
  Md(t, r, (i) => i ? n(i) : Zn(r, e, n));
}
function Zn(e, t, r) {
  return Ne.chmod(e, t, r);
}
function Md(e, t, r) {
  Ne.stat(e, (n, i) => n ? r(n) : Nd(t, i.atime, i.mtime, r));
}
function Bd(e, t, r, n, i, a) {
  return t ? jl(r, n, i, a) : jd(e.mode, r, n, i, a);
}
function jd(e, t, r, n, i) {
  Ne.mkdir(r, (a) => {
    if (a) return i(a);
    jl(t, r, n, (o) => o ? i(o) : Zn(r, e, i));
  });
}
function jl(e, t, r, n) {
  Ne.readdir(e, (i, a) => i ? n(i) : Hl(a, e, t, r, n));
}
function Hl(e, t, r, n, i) {
  const a = e.pop();
  return a ? Hd(e, a, t, r, n, i) : i();
}
function Hd(e, t, r, n, i, a) {
  const o = Pr.join(r, t), s = Pr.join(n, t);
  Ir.checkPaths(o, s, "copy", i, (l, m) => {
    if (l) return a(l);
    const { destStat: c } = m;
    $d(c, o, s, i, (f) => f ? a(f) : Hl(e, r, n, i, a));
  });
}
function qd(e, t, r, n, i) {
  Ne.readlink(t, (a, o) => {
    if (a) return i(a);
    if (n.dereference && (o = Pr.resolve(process.cwd(), o)), e)
      Ne.readlink(r, (s, l) => s ? s.code === "EINVAL" || s.code === "UNKNOWN" ? Ne.symlink(o, r, i) : i(s) : (n.dereference && (l = Pr.resolve(process.cwd(), l)), Ir.isSrcSubdir(o, l) ? i(new Error(`Cannot copy '${o}' to a subdirectory of itself, '${l}'.`)) : e.isDirectory() && Ir.isSrcSubdir(l, o) ? i(new Error(`Cannot overwrite '${l}' with '${o}'.`)) : Gd(o, r, i)));
    else
      return Ne.symlink(o, r, i);
  });
}
function Gd(e, t, r) {
  Ne.unlink(t, (n) => n ? r(n) : Ne.symlink(e, t, r));
}
var Vd = Dd;
const we = Oe, Nr = re, Wd = Ze.mkdirsSync, Yd = Ll.utimesMillisSync, Dr = cr;
function zd(e, t, r) {
  typeof r == "function" && (r = { filter: r }), r = r || {}, r.clobber = "clobber" in r ? !!r.clobber : !0, r.overwrite = "overwrite" in r ? !!r.overwrite : r.clobber, r.preserveTimestamps && process.arch === "ia32" && process.emitWarning(
    `Using the preserveTimestamps option in 32-bit node is not recommended;

	see https://github.com/jprichardson/node-fs-extra/issues/269`,
    "Warning",
    "fs-extra-WARN0002"
  );
  const { srcStat: n, destStat: i } = Dr.checkPathsSync(e, t, "copy", r);
  return Dr.checkParentPathsSync(e, n, t, "copy"), Xd(i, e, t, r);
}
function Xd(e, t, r, n) {
  if (n.filter && !n.filter(t, r)) return;
  const i = Nr.dirname(r);
  return we.existsSync(i) || Wd(i), ql(e, t, r, n);
}
function Kd(e, t, r, n) {
  if (!(n.filter && !n.filter(t, r)))
    return ql(e, t, r, n);
}
function ql(e, t, r, n) {
  const a = (n.dereference ? we.statSync : we.lstatSync)(t);
  if (a.isDirectory()) return nh(a, e, t, r, n);
  if (a.isFile() || a.isCharacterDevice() || a.isBlockDevice()) return Jd(a, e, t, r, n);
  if (a.isSymbolicLink()) return oh(e, t, r, n);
  throw a.isSocket() ? new Error(`Cannot copy a socket file: ${t}`) : a.isFIFO() ? new Error(`Cannot copy a FIFO pipe: ${t}`) : new Error(`Unknown file: ${t}`);
}
function Jd(e, t, r, n, i) {
  return t ? Qd(e, r, n, i) : Gl(e, r, n, i);
}
function Qd(e, t, r, n) {
  if (n.overwrite)
    return we.unlinkSync(r), Gl(e, t, r, n);
  if (n.errorOnExist)
    throw new Error(`'${r}' already exists`);
}
function Gl(e, t, r, n) {
  return we.copyFileSync(t, r), n.preserveTimestamps && Zd(e.mode, t, r), Ia(r, e.mode);
}
function Zd(e, t, r) {
  return eh(e) && th(r, e), rh(t, r);
}
function eh(e) {
  return (e & 128) === 0;
}
function th(e, t) {
  return Ia(e, t | 128);
}
function Ia(e, t) {
  return we.chmodSync(e, t);
}
function rh(e, t) {
  const r = we.statSync(e);
  return Yd(t, r.atime, r.mtime);
}
function nh(e, t, r, n, i) {
  return t ? Vl(r, n, i) : ih(e.mode, r, n, i);
}
function ih(e, t, r, n) {
  return we.mkdirSync(r), Vl(t, r, n), Ia(r, e);
}
function Vl(e, t, r) {
  we.readdirSync(e).forEach((n) => ah(n, e, t, r));
}
function ah(e, t, r, n) {
  const i = Nr.join(t, e), a = Nr.join(r, e), { destStat: o } = Dr.checkPathsSync(i, a, "copy", n);
  return Kd(o, i, a, n);
}
function oh(e, t, r, n) {
  let i = we.readlinkSync(t);
  if (n.dereference && (i = Nr.resolve(process.cwd(), i)), e) {
    let a;
    try {
      a = we.readlinkSync(r);
    } catch (o) {
      if (o.code === "EINVAL" || o.code === "UNKNOWN") return we.symlinkSync(i, r);
      throw o;
    }
    if (n.dereference && (a = Nr.resolve(process.cwd(), a)), Dr.isSrcSubdir(i, a))
      throw new Error(`Cannot copy '${i}' to a subdirectory of itself, '${a}'.`);
    if (we.statSync(r).isDirectory() && Dr.isSrcSubdir(a, i))
      throw new Error(`Cannot overwrite '${a}' with '${i}'.`);
    return sh(i, r);
  } else
    return we.symlinkSync(i, r);
}
function sh(e, t) {
  return we.unlinkSync(t), we.symlinkSync(e, t);
}
var lh = zd;
const ch = Re.fromCallback;
var Na = {
  copy: ch(Vd),
  copySync: lh
};
const No = Oe, Wl = re, K = Sl, $r = process.platform === "win32";
function Yl(e) {
  [
    "unlink",
    "chmod",
    "stat",
    "lstat",
    "rmdir",
    "readdir"
  ].forEach((r) => {
    e[r] = e[r] || No[r], r = r + "Sync", e[r] = e[r] || No[r];
  }), e.maxBusyTries = e.maxBusyTries || 3;
}
function Da(e, t, r) {
  let n = 0;
  typeof t == "function" && (r = t, t = {}), K(e, "rimraf: missing path"), K.strictEqual(typeof e, "string", "rimraf: path should be a string"), K.strictEqual(typeof r, "function", "rimraf: callback function required"), K(t, "rimraf: invalid options argument provided"), K.strictEqual(typeof t, "object", "rimraf: options should be object"), Yl(t), Do(e, t, function i(a) {
    if (a) {
      if ((a.code === "EBUSY" || a.code === "ENOTEMPTY" || a.code === "EPERM") && n < t.maxBusyTries) {
        n++;
        const o = n * 100;
        return setTimeout(() => Do(e, t, i), o);
      }
      a.code === "ENOENT" && (a = null);
    }
    r(a);
  });
}
function Do(e, t, r) {
  K(e), K(t), K(typeof r == "function"), t.lstat(e, (n, i) => {
    if (n && n.code === "ENOENT")
      return r(null);
    if (n && n.code === "EPERM" && $r)
      return $o(e, t, n, r);
    if (i && i.isDirectory())
      return $n(e, t, n, r);
    t.unlink(e, (a) => {
      if (a) {
        if (a.code === "ENOENT")
          return r(null);
        if (a.code === "EPERM")
          return $r ? $o(e, t, a, r) : $n(e, t, a, r);
        if (a.code === "EISDIR")
          return $n(e, t, a, r);
      }
      return r(a);
    });
  });
}
function $o(e, t, r, n) {
  K(e), K(t), K(typeof n == "function"), t.chmod(e, 438, (i) => {
    i ? n(i.code === "ENOENT" ? null : r) : t.stat(e, (a, o) => {
      a ? n(a.code === "ENOENT" ? null : r) : o.isDirectory() ? $n(e, t, r, n) : t.unlink(e, n);
    });
  });
}
function Fo(e, t, r) {
  let n;
  K(e), K(t);
  try {
    t.chmodSync(e, 438);
  } catch (i) {
    if (i.code === "ENOENT")
      return;
    throw r;
  }
  try {
    n = t.statSync(e);
  } catch (i) {
    if (i.code === "ENOENT")
      return;
    throw r;
  }
  n.isDirectory() ? Fn(e, t, r) : t.unlinkSync(e);
}
function $n(e, t, r, n) {
  K(e), K(t), K(typeof n == "function"), t.rmdir(e, (i) => {
    i && (i.code === "ENOTEMPTY" || i.code === "EEXIST" || i.code === "EPERM") ? uh(e, t, n) : i && i.code === "ENOTDIR" ? n(r) : n(i);
  });
}
function uh(e, t, r) {
  K(e), K(t), K(typeof r == "function"), t.readdir(e, (n, i) => {
    if (n) return r(n);
    let a = i.length, o;
    if (a === 0) return t.rmdir(e, r);
    i.forEach((s) => {
      Da(Wl.join(e, s), t, (l) => {
        if (!o) {
          if (l) return r(o = l);
          --a === 0 && t.rmdir(e, r);
        }
      });
    });
  });
}
function zl(e, t) {
  let r;
  t = t || {}, Yl(t), K(e, "rimraf: missing path"), K.strictEqual(typeof e, "string", "rimraf: path should be a string"), K(t, "rimraf: missing options"), K.strictEqual(typeof t, "object", "rimraf: options should be object");
  try {
    r = t.lstatSync(e);
  } catch (n) {
    if (n.code === "ENOENT")
      return;
    n.code === "EPERM" && $r && Fo(e, t, n);
  }
  try {
    r && r.isDirectory() ? Fn(e, t, null) : t.unlinkSync(e);
  } catch (n) {
    if (n.code === "ENOENT")
      return;
    if (n.code === "EPERM")
      return $r ? Fo(e, t, n) : Fn(e, t, n);
    if (n.code !== "EISDIR")
      throw n;
    Fn(e, t, n);
  }
}
function Fn(e, t, r) {
  K(e), K(t);
  try {
    t.rmdirSync(e);
  } catch (n) {
    if (n.code === "ENOTDIR")
      throw r;
    if (n.code === "ENOTEMPTY" || n.code === "EEXIST" || n.code === "EPERM")
      fh(e, t);
    else if (n.code !== "ENOENT")
      throw n;
  }
}
function fh(e, t) {
  if (K(e), K(t), t.readdirSync(e).forEach((r) => zl(Wl.join(e, r), t)), $r) {
    const r = Date.now();
    do
      try {
        return t.rmdirSync(e, t);
      } catch {
      }
    while (Date.now() - r < 500);
  } else
    return t.rmdirSync(e, t);
}
var dh = Da;
Da.sync = zl;
const Mn = Oe, hh = Re.fromCallback, Xl = dh;
function ph(e, t) {
  if (Mn.rm) return Mn.rm(e, { recursive: !0, force: !0 }, t);
  Xl(e, t);
}
function mh(e) {
  if (Mn.rmSync) return Mn.rmSync(e, { recursive: !0, force: !0 });
  Xl.sync(e);
}
var ei = {
  remove: hh(ph),
  removeSync: mh
};
const gh = Re.fromPromise, Kl = Bt, Jl = re, Ql = Ze, Zl = ei, xo = gh(async function(t) {
  let r;
  try {
    r = await Kl.readdir(t);
  } catch {
    return Ql.mkdirs(t);
  }
  return Promise.all(r.map((n) => Zl.remove(Jl.join(t, n))));
});
function Lo(e) {
  let t;
  try {
    t = Kl.readdirSync(e);
  } catch {
    return Ql.mkdirsSync(e);
  }
  t.forEach((r) => {
    r = Jl.join(e, r), Zl.removeSync(r);
  });
}
var Eh = {
  emptyDirSync: Lo,
  emptydirSync: Lo,
  emptyDir: xo,
  emptydir: xo
};
const yh = Re.fromCallback, ec = re, dt = Oe, tc = Ze;
function vh(e, t) {
  function r() {
    dt.writeFile(e, "", (n) => {
      if (n) return t(n);
      t();
    });
  }
  dt.stat(e, (n, i) => {
    if (!n && i.isFile()) return t();
    const a = ec.dirname(e);
    dt.stat(a, (o, s) => {
      if (o)
        return o.code === "ENOENT" ? tc.mkdirs(a, (l) => {
          if (l) return t(l);
          r();
        }) : t(o);
      s.isDirectory() ? r() : dt.readdir(a, (l) => {
        if (l) return t(l);
      });
    });
  });
}
function wh(e) {
  let t;
  try {
    t = dt.statSync(e);
  } catch {
  }
  if (t && t.isFile()) return;
  const r = ec.dirname(e);
  try {
    dt.statSync(r).isDirectory() || dt.readdirSync(r);
  } catch (n) {
    if (n && n.code === "ENOENT") tc.mkdirsSync(r);
    else throw n;
  }
  dt.writeFileSync(e, "");
}
var _h = {
  createFile: yh(vh),
  createFileSync: wh
};
const Ah = Re.fromCallback, rc = re, ft = Oe, nc = Ze, Th = jt.pathExists, { areIdentical: ic } = cr;
function Sh(e, t, r) {
  function n(i, a) {
    ft.link(i, a, (o) => {
      if (o) return r(o);
      r(null);
    });
  }
  ft.lstat(t, (i, a) => {
    ft.lstat(e, (o, s) => {
      if (o)
        return o.message = o.message.replace("lstat", "ensureLink"), r(o);
      if (a && ic(s, a)) return r(null);
      const l = rc.dirname(t);
      Th(l, (m, c) => {
        if (m) return r(m);
        if (c) return n(e, t);
        nc.mkdirs(l, (f) => {
          if (f) return r(f);
          n(e, t);
        });
      });
    });
  });
}
function Ch(e, t) {
  let r;
  try {
    r = ft.lstatSync(t);
  } catch {
  }
  try {
    const a = ft.lstatSync(e);
    if (r && ic(a, r)) return;
  } catch (a) {
    throw a.message = a.message.replace("lstat", "ensureLink"), a;
  }
  const n = rc.dirname(t);
  return ft.existsSync(n) || nc.mkdirsSync(n), ft.linkSync(e, t);
}
var bh = {
  createLink: Ah(Sh),
  createLinkSync: Ch
};
const ht = re, Cr = Oe, Rh = jt.pathExists;
function Oh(e, t, r) {
  if (ht.isAbsolute(e))
    return Cr.lstat(e, (n) => n ? (n.message = n.message.replace("lstat", "ensureSymlink"), r(n)) : r(null, {
      toCwd: e,
      toDst: e
    }));
  {
    const n = ht.dirname(t), i = ht.join(n, e);
    return Rh(i, (a, o) => a ? r(a) : o ? r(null, {
      toCwd: i,
      toDst: e
    }) : Cr.lstat(e, (s) => s ? (s.message = s.message.replace("lstat", "ensureSymlink"), r(s)) : r(null, {
      toCwd: e,
      toDst: ht.relative(n, e)
    })));
  }
}
function Ph(e, t) {
  let r;
  if (ht.isAbsolute(e)) {
    if (r = Cr.existsSync(e), !r) throw new Error("absolute srcpath does not exist");
    return {
      toCwd: e,
      toDst: e
    };
  } else {
    const n = ht.dirname(t), i = ht.join(n, e);
    if (r = Cr.existsSync(i), r)
      return {
        toCwd: i,
        toDst: e
      };
    if (r = Cr.existsSync(e), !r) throw new Error("relative srcpath does not exist");
    return {
      toCwd: e,
      toDst: ht.relative(n, e)
    };
  }
}
var Ih = {
  symlinkPaths: Oh,
  symlinkPathsSync: Ph
};
const ac = Oe;
function Nh(e, t, r) {
  if (r = typeof t == "function" ? t : r, t = typeof t == "function" ? !1 : t, t) return r(null, t);
  ac.lstat(e, (n, i) => {
    if (n) return r(null, "file");
    t = i && i.isDirectory() ? "dir" : "file", r(null, t);
  });
}
function Dh(e, t) {
  let r;
  if (t) return t;
  try {
    r = ac.lstatSync(e);
  } catch {
    return "file";
  }
  return r && r.isDirectory() ? "dir" : "file";
}
var $h = {
  symlinkType: Nh,
  symlinkTypeSync: Dh
};
const Fh = Re.fromCallback, oc = re, Ge = Bt, sc = Ze, xh = sc.mkdirs, Lh = sc.mkdirsSync, lc = Ih, Uh = lc.symlinkPaths, kh = lc.symlinkPathsSync, cc = $h, Mh = cc.symlinkType, Bh = cc.symlinkTypeSync, jh = jt.pathExists, { areIdentical: uc } = cr;
function Hh(e, t, r, n) {
  n = typeof r == "function" ? r : n, r = typeof r == "function" ? !1 : r, Ge.lstat(t, (i, a) => {
    !i && a.isSymbolicLink() ? Promise.all([
      Ge.stat(e),
      Ge.stat(t)
    ]).then(([o, s]) => {
      if (uc(o, s)) return n(null);
      Uo(e, t, r, n);
    }) : Uo(e, t, r, n);
  });
}
function Uo(e, t, r, n) {
  Uh(e, t, (i, a) => {
    if (i) return n(i);
    e = a.toDst, Mh(a.toCwd, r, (o, s) => {
      if (o) return n(o);
      const l = oc.dirname(t);
      jh(l, (m, c) => {
        if (m) return n(m);
        if (c) return Ge.symlink(e, t, s, n);
        xh(l, (f) => {
          if (f) return n(f);
          Ge.symlink(e, t, s, n);
        });
      });
    });
  });
}
function qh(e, t, r) {
  let n;
  try {
    n = Ge.lstatSync(t);
  } catch {
  }
  if (n && n.isSymbolicLink()) {
    const s = Ge.statSync(e), l = Ge.statSync(t);
    if (uc(s, l)) return;
  }
  const i = kh(e, t);
  e = i.toDst, r = Bh(i.toCwd, r);
  const a = oc.dirname(t);
  return Ge.existsSync(a) || Lh(a), Ge.symlinkSync(e, t, r);
}
var Gh = {
  createSymlink: Fh(Hh),
  createSymlinkSync: qh
};
const { createFile: ko, createFileSync: Mo } = _h, { createLink: Bo, createLinkSync: jo } = bh, { createSymlink: Ho, createSymlinkSync: qo } = Gh;
var Vh = {
  // file
  createFile: ko,
  createFileSync: Mo,
  ensureFile: ko,
  ensureFileSync: Mo,
  // link
  createLink: Bo,
  createLinkSync: jo,
  ensureLink: Bo,
  ensureLinkSync: jo,
  // symlink
  createSymlink: Ho,
  createSymlinkSync: qo,
  ensureSymlink: Ho,
  ensureSymlinkSync: qo
};
function Wh(e, { EOL: t = `
`, finalEOL: r = !0, replacer: n = null, spaces: i } = {}) {
  const a = r ? t : "";
  return JSON.stringify(e, n, i).replace(/\n/g, t) + a;
}
function Yh(e) {
  return Buffer.isBuffer(e) && (e = e.toString("utf8")), e.replace(/^\uFEFF/, "");
}
var $a = { stringify: Wh, stripBom: Yh };
let or;
try {
  or = Oe;
} catch {
  or = _t;
}
const ti = Re, { stringify: fc, stripBom: dc } = $a;
async function zh(e, t = {}) {
  typeof t == "string" && (t = { encoding: t });
  const r = t.fs || or, n = "throws" in t ? t.throws : !0;
  let i = await ti.fromCallback(r.readFile)(e, t);
  i = dc(i);
  let a;
  try {
    a = JSON.parse(i, t ? t.reviver : null);
  } catch (o) {
    if (n)
      throw o.message = `${e}: ${o.message}`, o;
    return null;
  }
  return a;
}
const Xh = ti.fromPromise(zh);
function Kh(e, t = {}) {
  typeof t == "string" && (t = { encoding: t });
  const r = t.fs || or, n = "throws" in t ? t.throws : !0;
  try {
    let i = r.readFileSync(e, t);
    return i = dc(i), JSON.parse(i, t.reviver);
  } catch (i) {
    if (n)
      throw i.message = `${e}: ${i.message}`, i;
    return null;
  }
}
async function Jh(e, t, r = {}) {
  const n = r.fs || or, i = fc(t, r);
  await ti.fromCallback(n.writeFile)(e, i, r);
}
const Qh = ti.fromPromise(Jh);
function Zh(e, t, r = {}) {
  const n = r.fs || or, i = fc(t, r);
  return n.writeFileSync(e, i, r);
}
var ep = {
  readFile: Xh,
  readFileSync: Kh,
  writeFile: Qh,
  writeFileSync: Zh
};
const En = ep;
var tp = {
  // jsonfile exports
  readJson: En.readFile,
  readJsonSync: En.readFileSync,
  writeJson: En.writeFile,
  writeJsonSync: En.writeFileSync
};
const rp = Re.fromCallback, br = Oe, hc = re, pc = Ze, np = jt.pathExists;
function ip(e, t, r, n) {
  typeof r == "function" && (n = r, r = "utf8");
  const i = hc.dirname(e);
  np(i, (a, o) => {
    if (a) return n(a);
    if (o) return br.writeFile(e, t, r, n);
    pc.mkdirs(i, (s) => {
      if (s) return n(s);
      br.writeFile(e, t, r, n);
    });
  });
}
function ap(e, ...t) {
  const r = hc.dirname(e);
  if (br.existsSync(r))
    return br.writeFileSync(e, ...t);
  pc.mkdirsSync(r), br.writeFileSync(e, ...t);
}
var Fa = {
  outputFile: rp(ip),
  outputFileSync: ap
};
const { stringify: op } = $a, { outputFile: sp } = Fa;
async function lp(e, t, r = {}) {
  const n = op(t, r);
  await sp(e, n, r);
}
var cp = lp;
const { stringify: up } = $a, { outputFileSync: fp } = Fa;
function dp(e, t, r) {
  const n = up(t, r);
  fp(e, n, r);
}
var hp = dp;
const pp = Re.fromPromise, be = tp;
be.outputJson = pp(cp);
be.outputJsonSync = hp;
be.outputJSON = be.outputJson;
be.outputJSONSync = be.outputJsonSync;
be.writeJSON = be.writeJson;
be.writeJSONSync = be.writeJsonSync;
be.readJSON = be.readJson;
be.readJSONSync = be.readJsonSync;
var mp = be;
const gp = Oe, la = re, Ep = Na.copy, mc = ei.remove, yp = Ze.mkdirp, vp = jt.pathExists, Go = cr;
function wp(e, t, r, n) {
  typeof r == "function" && (n = r, r = {}), r = r || {};
  const i = r.overwrite || r.clobber || !1;
  Go.checkPaths(e, t, "move", r, (a, o) => {
    if (a) return n(a);
    const { srcStat: s, isChangingCase: l = !1 } = o;
    Go.checkParentPaths(e, s, t, "move", (m) => {
      if (m) return n(m);
      if (_p(t)) return Vo(e, t, i, l, n);
      yp(la.dirname(t), (c) => c ? n(c) : Vo(e, t, i, l, n));
    });
  });
}
function _p(e) {
  const t = la.dirname(e);
  return la.parse(t).root === t;
}
function Vo(e, t, r, n, i) {
  if (n) return Ii(e, t, r, i);
  if (r)
    return mc(t, (a) => a ? i(a) : Ii(e, t, r, i));
  vp(t, (a, o) => a ? i(a) : o ? i(new Error("dest already exists.")) : Ii(e, t, r, i));
}
function Ii(e, t, r, n) {
  gp.rename(e, t, (i) => i ? i.code !== "EXDEV" ? n(i) : Ap(e, t, r, n) : n());
}
function Ap(e, t, r, n) {
  Ep(e, t, {
    overwrite: r,
    errorOnExist: !0
  }, (a) => a ? n(a) : mc(e, n));
}
var Tp = wp;
const gc = Oe, ca = re, Sp = Na.copySync, Ec = ei.removeSync, Cp = Ze.mkdirpSync, Wo = cr;
function bp(e, t, r) {
  r = r || {};
  const n = r.overwrite || r.clobber || !1, { srcStat: i, isChangingCase: a = !1 } = Wo.checkPathsSync(e, t, "move", r);
  return Wo.checkParentPathsSync(e, i, t, "move"), Rp(t) || Cp(ca.dirname(t)), Op(e, t, n, a);
}
function Rp(e) {
  const t = ca.dirname(e);
  return ca.parse(t).root === t;
}
function Op(e, t, r, n) {
  if (n) return Ni(e, t, r);
  if (r)
    return Ec(t), Ni(e, t, r);
  if (gc.existsSync(t)) throw new Error("dest already exists.");
  return Ni(e, t, r);
}
function Ni(e, t, r) {
  try {
    gc.renameSync(e, t);
  } catch (n) {
    if (n.code !== "EXDEV") throw n;
    return Pp(e, t, r);
  }
}
function Pp(e, t, r) {
  return Sp(e, t, {
    overwrite: r,
    errorOnExist: !0
  }), Ec(e);
}
var Ip = bp;
const Np = Re.fromCallback;
var Dp = {
  move: Np(Tp),
  moveSync: Ip
}, Tt = {
  // Export promiseified graceful-fs:
  ...Bt,
  // Export extra methods:
  ...Na,
  ...Eh,
  ...Vh,
  ...mp,
  ...Ze,
  ...Dp,
  ...Fa,
  ...jt,
  ...ei
}, Ht = {}, gt = {}, ce = {}, Et = {};
Object.defineProperty(Et, "__esModule", { value: !0 });
Et.CancellationError = Et.CancellationToken = void 0;
const $p = Cl;
class Fp extends $p.EventEmitter {
  get cancelled() {
    return this._cancelled || this._parent != null && this._parent.cancelled;
  }
  set parent(t) {
    this.removeParentCancelHandler(), this._parent = t, this.parentCancelHandler = () => this.cancel(), this._parent.onCancel(this.parentCancelHandler);
  }
  // babel cannot compile ... correctly for super calls
  constructor(t) {
    super(), this.parentCancelHandler = null, this._parent = null, this._cancelled = !1, t != null && (this.parent = t);
  }
  cancel() {
    this._cancelled = !0, this.emit("cancel");
  }
  onCancel(t) {
    this.cancelled ? t() : this.once("cancel", t);
  }
  createPromise(t) {
    if (this.cancelled)
      return Promise.reject(new ua());
    const r = () => {
      if (n != null)
        try {
          this.removeListener("cancel", n), n = null;
        } catch {
        }
    };
    let n = null;
    return new Promise((i, a) => {
      let o = null;
      if (n = () => {
        try {
          o != null && (o(), o = null);
        } finally {
          a(new ua());
        }
      }, this.cancelled) {
        n();
        return;
      }
      this.onCancel(n), t(i, a, (s) => {
        o = s;
      });
    }).then((i) => (r(), i)).catch((i) => {
      throw r(), i;
    });
  }
  removeParentCancelHandler() {
    const t = this._parent;
    t != null && this.parentCancelHandler != null && (t.removeListener("cancel", this.parentCancelHandler), this.parentCancelHandler = null);
  }
  dispose() {
    try {
      this.removeParentCancelHandler();
    } finally {
      this.removeAllListeners(), this._parent = null;
    }
  }
}
Et.CancellationToken = Fp;
class ua extends Error {
  constructor() {
    super("cancelled");
  }
}
Et.CancellationError = ua;
var ur = {};
Object.defineProperty(ur, "__esModule", { value: !0 });
ur.newError = xp;
function xp(e, t) {
  const r = new Error(e);
  return r.code = t, r;
}
var Ce = {}, fa = { exports: {} }, yn = { exports: {} }, Di, Yo;
function Lp() {
  if (Yo) return Di;
  Yo = 1;
  var e = 1e3, t = e * 60, r = t * 60, n = r * 24, i = n * 7, a = n * 365.25;
  Di = function(c, f) {
    f = f || {};
    var d = typeof c;
    if (d === "string" && c.length > 0)
      return o(c);
    if (d === "number" && isFinite(c))
      return f.long ? l(c) : s(c);
    throw new Error(
      "val is not a non-empty string or a valid number. val=" + JSON.stringify(c)
    );
  };
  function o(c) {
    if (c = String(c), !(c.length > 100)) {
      var f = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(
        c
      );
      if (f) {
        var d = parseFloat(f[1]), g = (f[2] || "ms").toLowerCase();
        switch (g) {
          case "years":
          case "year":
          case "yrs":
          case "yr":
          case "y":
            return d * a;
          case "weeks":
          case "week":
          case "w":
            return d * i;
          case "days":
          case "day":
          case "d":
            return d * n;
          case "hours":
          case "hour":
          case "hrs":
          case "hr":
          case "h":
            return d * r;
          case "minutes":
          case "minute":
          case "mins":
          case "min":
          case "m":
            return d * t;
          case "seconds":
          case "second":
          case "secs":
          case "sec":
          case "s":
            return d * e;
          case "milliseconds":
          case "millisecond":
          case "msecs":
          case "msec":
          case "ms":
            return d;
          default:
            return;
        }
      }
    }
  }
  function s(c) {
    var f = Math.abs(c);
    return f >= n ? Math.round(c / n) + "d" : f >= r ? Math.round(c / r) + "h" : f >= t ? Math.round(c / t) + "m" : f >= e ? Math.round(c / e) + "s" : c + "ms";
  }
  function l(c) {
    var f = Math.abs(c);
    return f >= n ? m(c, f, n, "day") : f >= r ? m(c, f, r, "hour") : f >= t ? m(c, f, t, "minute") : f >= e ? m(c, f, e, "second") : c + " ms";
  }
  function m(c, f, d, g) {
    var v = f >= d * 1.5;
    return Math.round(c / d) + " " + g + (v ? "s" : "");
  }
  return Di;
}
var $i, zo;
function yc() {
  if (zo) return $i;
  zo = 1;
  function e(t) {
    n.debug = n, n.default = n, n.coerce = m, n.disable = s, n.enable = a, n.enabled = l, n.humanize = Lp(), n.destroy = c, Object.keys(t).forEach((f) => {
      n[f] = t[f];
    }), n.names = [], n.skips = [], n.formatters = {};
    function r(f) {
      let d = 0;
      for (let g = 0; g < f.length; g++)
        d = (d << 5) - d + f.charCodeAt(g), d |= 0;
      return n.colors[Math.abs(d) % n.colors.length];
    }
    n.selectColor = r;
    function n(f) {
      let d, g = null, v, y;
      function A(...S) {
        if (!A.enabled)
          return;
        const T = A, D = Number(/* @__PURE__ */ new Date()), x = D - (d || D);
        T.diff = x, T.prev = d, T.curr = D, d = D, S[0] = n.coerce(S[0]), typeof S[0] != "string" && S.unshift("%O");
        let Z = 0;
        S[0] = S[0].replace(/%([a-zA-Z%])/g, (W, $e) => {
          if (W === "%%")
            return "%";
          Z++;
          const E = n.formatters[$e];
          if (typeof E == "function") {
            const q = S[Z];
            W = E.call(T, q), S.splice(Z, 1), Z--;
          }
          return W;
        }), n.formatArgs.call(T, S), (T.log || n.log).apply(T, S);
      }
      return A.namespace = f, A.useColors = n.useColors(), A.color = n.selectColor(f), A.extend = i, A.destroy = n.destroy, Object.defineProperty(A, "enabled", {
        enumerable: !0,
        configurable: !1,
        get: () => g !== null ? g : (v !== n.namespaces && (v = n.namespaces, y = n.enabled(f)), y),
        set: (S) => {
          g = S;
        }
      }), typeof n.init == "function" && n.init(A), A;
    }
    function i(f, d) {
      const g = n(this.namespace + (typeof d > "u" ? ":" : d) + f);
      return g.log = this.log, g;
    }
    function a(f) {
      n.save(f), n.namespaces = f, n.names = [], n.skips = [];
      const d = (typeof f == "string" ? f : "").trim().replace(/\s+/g, ",").split(",").filter(Boolean);
      for (const g of d)
        g[0] === "-" ? n.skips.push(g.slice(1)) : n.names.push(g);
    }
    function o(f, d) {
      let g = 0, v = 0, y = -1, A = 0;
      for (; g < f.length; )
        if (v < d.length && (d[v] === f[g] || d[v] === "*"))
          d[v] === "*" ? (y = v, A = g, v++) : (g++, v++);
        else if (y !== -1)
          v = y + 1, A++, g = A;
        else
          return !1;
      for (; v < d.length && d[v] === "*"; )
        v++;
      return v === d.length;
    }
    function s() {
      const f = [
        ...n.names,
        ...n.skips.map((d) => "-" + d)
      ].join(",");
      return n.enable(""), f;
    }
    function l(f) {
      for (const d of n.skips)
        if (o(f, d))
          return !1;
      for (const d of n.names)
        if (o(f, d))
          return !0;
      return !1;
    }
    function m(f) {
      return f instanceof Error ? f.stack || f.message : f;
    }
    function c() {
      console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
    }
    return n.enable(n.load()), n;
  }
  return $i = e, $i;
}
var Xo;
function Up() {
  return Xo || (Xo = 1, function(e, t) {
    t.formatArgs = n, t.save = i, t.load = a, t.useColors = r, t.storage = o(), t.destroy = /* @__PURE__ */ (() => {
      let l = !1;
      return () => {
        l || (l = !0, console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`."));
      };
    })(), t.colors = [
      "#0000CC",
      "#0000FF",
      "#0033CC",
      "#0033FF",
      "#0066CC",
      "#0066FF",
      "#0099CC",
      "#0099FF",
      "#00CC00",
      "#00CC33",
      "#00CC66",
      "#00CC99",
      "#00CCCC",
      "#00CCFF",
      "#3300CC",
      "#3300FF",
      "#3333CC",
      "#3333FF",
      "#3366CC",
      "#3366FF",
      "#3399CC",
      "#3399FF",
      "#33CC00",
      "#33CC33",
      "#33CC66",
      "#33CC99",
      "#33CCCC",
      "#33CCFF",
      "#6600CC",
      "#6600FF",
      "#6633CC",
      "#6633FF",
      "#66CC00",
      "#66CC33",
      "#9900CC",
      "#9900FF",
      "#9933CC",
      "#9933FF",
      "#99CC00",
      "#99CC33",
      "#CC0000",
      "#CC0033",
      "#CC0066",
      "#CC0099",
      "#CC00CC",
      "#CC00FF",
      "#CC3300",
      "#CC3333",
      "#CC3366",
      "#CC3399",
      "#CC33CC",
      "#CC33FF",
      "#CC6600",
      "#CC6633",
      "#CC9900",
      "#CC9933",
      "#CCCC00",
      "#CCCC33",
      "#FF0000",
      "#FF0033",
      "#FF0066",
      "#FF0099",
      "#FF00CC",
      "#FF00FF",
      "#FF3300",
      "#FF3333",
      "#FF3366",
      "#FF3399",
      "#FF33CC",
      "#FF33FF",
      "#FF6600",
      "#FF6633",
      "#FF9900",
      "#FF9933",
      "#FFCC00",
      "#FFCC33"
    ];
    function r() {
      if (typeof window < "u" && window.process && (window.process.type === "renderer" || window.process.__nwjs))
        return !0;
      if (typeof navigator < "u" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/))
        return !1;
      let l;
      return typeof document < "u" && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || // Is firebug? http://stackoverflow.com/a/398120/376773
      typeof window < "u" && window.console && (window.console.firebug || window.console.exception && window.console.table) || // Is firefox >= v31?
      // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
      typeof navigator < "u" && navigator.userAgent && (l = navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/)) && parseInt(l[1], 10) >= 31 || // Double check webkit in userAgent just in case we are in a worker
      typeof navigator < "u" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/);
    }
    function n(l) {
      if (l[0] = (this.useColors ? "%c" : "") + this.namespace + (this.useColors ? " %c" : " ") + l[0] + (this.useColors ? "%c " : " ") + "+" + e.exports.humanize(this.diff), !this.useColors)
        return;
      const m = "color: " + this.color;
      l.splice(1, 0, m, "color: inherit");
      let c = 0, f = 0;
      l[0].replace(/%[a-zA-Z%]/g, (d) => {
        d !== "%%" && (c++, d === "%c" && (f = c));
      }), l.splice(f, 0, m);
    }
    t.log = console.debug || console.log || (() => {
    });
    function i(l) {
      try {
        l ? t.storage.setItem("debug", l) : t.storage.removeItem("debug");
      } catch {
      }
    }
    function a() {
      let l;
      try {
        l = t.storage.getItem("debug") || t.storage.getItem("DEBUG");
      } catch {
      }
      return !l && typeof process < "u" && "env" in process && (l = process.env.DEBUG), l;
    }
    function o() {
      try {
        return localStorage;
      } catch {
      }
    }
    e.exports = yc()(t);
    const { formatters: s } = e.exports;
    s.j = function(l) {
      try {
        return JSON.stringify(l);
      } catch (m) {
        return "[UnexpectedJSONParseError]: " + m.message;
      }
    };
  }(yn, yn.exports)), yn.exports;
}
var vn = { exports: {} }, Fi, Ko;
function kp() {
  return Ko || (Ko = 1, Fi = (e, t = process.argv) => {
    const r = e.startsWith("-") ? "" : e.length === 1 ? "-" : "--", n = t.indexOf(r + e), i = t.indexOf("--");
    return n !== -1 && (i === -1 || n < i);
  }), Fi;
}
var xi, Jo;
function Mp() {
  if (Jo) return xi;
  Jo = 1;
  const e = Jn, t = bl, r = kp(), { env: n } = process;
  let i;
  r("no-color") || r("no-colors") || r("color=false") || r("color=never") ? i = 0 : (r("color") || r("colors") || r("color=true") || r("color=always")) && (i = 1), "FORCE_COLOR" in n && (n.FORCE_COLOR === "true" ? i = 1 : n.FORCE_COLOR === "false" ? i = 0 : i = n.FORCE_COLOR.length === 0 ? 1 : Math.min(parseInt(n.FORCE_COLOR, 10), 3));
  function a(l) {
    return l === 0 ? !1 : {
      level: l,
      hasBasic: !0,
      has256: l >= 2,
      has16m: l >= 3
    };
  }
  function o(l, m) {
    if (i === 0)
      return 0;
    if (r("color=16m") || r("color=full") || r("color=truecolor"))
      return 3;
    if (r("color=256"))
      return 2;
    if (l && !m && i === void 0)
      return 0;
    const c = i || 0;
    if (n.TERM === "dumb")
      return c;
    if (process.platform === "win32") {
      const f = e.release().split(".");
      return Number(f[0]) >= 10 && Number(f[2]) >= 10586 ? Number(f[2]) >= 14931 ? 3 : 2 : 1;
    }
    if ("CI" in n)
      return ["TRAVIS", "CIRCLECI", "APPVEYOR", "GITLAB_CI", "GITHUB_ACTIONS", "BUILDKITE"].some((f) => f in n) || n.CI_NAME === "codeship" ? 1 : c;
    if ("TEAMCITY_VERSION" in n)
      return /^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(n.TEAMCITY_VERSION) ? 1 : 0;
    if (n.COLORTERM === "truecolor")
      return 3;
    if ("TERM_PROGRAM" in n) {
      const f = parseInt((n.TERM_PROGRAM_VERSION || "").split(".")[0], 10);
      switch (n.TERM_PROGRAM) {
        case "iTerm.app":
          return f >= 3 ? 3 : 2;
        case "Apple_Terminal":
          return 2;
      }
    }
    return /-256(color)?$/i.test(n.TERM) ? 2 : /^screen|^xterm|^vt100|^vt220|^rxvt|color|ansi|cygwin|linux/i.test(n.TERM) || "COLORTERM" in n ? 1 : c;
  }
  function s(l) {
    const m = o(l, l && l.isTTY);
    return a(m);
  }
  return xi = {
    supportsColor: s,
    stdout: a(o(!0, t.isatty(1))),
    stderr: a(o(!0, t.isatty(2)))
  }, xi;
}
var Qo;
function Bp() {
  return Qo || (Qo = 1, function(e, t) {
    const r = bl, n = Ca;
    t.init = c, t.log = s, t.formatArgs = a, t.save = l, t.load = m, t.useColors = i, t.destroy = n.deprecate(
      () => {
      },
      "Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`."
    ), t.colors = [6, 2, 3, 4, 5, 1];
    try {
      const d = Mp();
      d && (d.stderr || d).level >= 2 && (t.colors = [
        20,
        21,
        26,
        27,
        32,
        33,
        38,
        39,
        40,
        41,
        42,
        43,
        44,
        45,
        56,
        57,
        62,
        63,
        68,
        69,
        74,
        75,
        76,
        77,
        78,
        79,
        80,
        81,
        92,
        93,
        98,
        99,
        112,
        113,
        128,
        129,
        134,
        135,
        148,
        149,
        160,
        161,
        162,
        163,
        164,
        165,
        166,
        167,
        168,
        169,
        170,
        171,
        172,
        173,
        178,
        179,
        184,
        185,
        196,
        197,
        198,
        199,
        200,
        201,
        202,
        203,
        204,
        205,
        206,
        207,
        208,
        209,
        214,
        215,
        220,
        221
      ]);
    } catch {
    }
    t.inspectOpts = Object.keys(process.env).filter((d) => /^debug_/i.test(d)).reduce((d, g) => {
      const v = g.substring(6).toLowerCase().replace(/_([a-z])/g, (A, S) => S.toUpperCase());
      let y = process.env[g];
      return /^(yes|on|true|enabled)$/i.test(y) ? y = !0 : /^(no|off|false|disabled)$/i.test(y) ? y = !1 : y === "null" ? y = null : y = Number(y), d[v] = y, d;
    }, {});
    function i() {
      return "colors" in t.inspectOpts ? !!t.inspectOpts.colors : r.isatty(process.stderr.fd);
    }
    function a(d) {
      const { namespace: g, useColors: v } = this;
      if (v) {
        const y = this.color, A = "\x1B[3" + (y < 8 ? y : "8;5;" + y), S = `  ${A};1m${g} \x1B[0m`;
        d[0] = S + d[0].split(`
`).join(`
` + S), d.push(A + "m+" + e.exports.humanize(this.diff) + "\x1B[0m");
      } else
        d[0] = o() + g + " " + d[0];
    }
    function o() {
      return t.inspectOpts.hideDate ? "" : (/* @__PURE__ */ new Date()).toISOString() + " ";
    }
    function s(...d) {
      return process.stderr.write(n.formatWithOptions(t.inspectOpts, ...d) + `
`);
    }
    function l(d) {
      d ? process.env.DEBUG = d : delete process.env.DEBUG;
    }
    function m() {
      return process.env.DEBUG;
    }
    function c(d) {
      d.inspectOpts = {};
      const g = Object.keys(t.inspectOpts);
      for (let v = 0; v < g.length; v++)
        d.inspectOpts[g[v]] = t.inspectOpts[g[v]];
    }
    e.exports = yc()(t);
    const { formatters: f } = e.exports;
    f.o = function(d) {
      return this.inspectOpts.colors = this.useColors, n.inspect(d, this.inspectOpts).split(`
`).map((g) => g.trim()).join(" ");
    }, f.O = function(d) {
      return this.inspectOpts.colors = this.useColors, n.inspect(d, this.inspectOpts);
    };
  }(vn, vn.exports)), vn.exports;
}
typeof process > "u" || process.type === "renderer" || process.browser === !0 || process.__nwjs ? fa.exports = Up() : fa.exports = Bp();
var jp = fa.exports, zr = {};
Object.defineProperty(zr, "__esModule", { value: !0 });
zr.ProgressCallbackTransform = void 0;
const Hp = Vr;
class qp extends Hp.Transform {
  constructor(t, r, n) {
    super(), this.total = t, this.cancellationToken = r, this.onProgress = n, this.start = Date.now(), this.transferred = 0, this.delta = 0, this.nextUpdate = this.start + 1e3;
  }
  _transform(t, r, n) {
    if (this.cancellationToken.cancelled) {
      n(new Error("cancelled"), null);
      return;
    }
    this.transferred += t.length, this.delta += t.length;
    const i = Date.now();
    i >= this.nextUpdate && this.transferred !== this.total && (this.nextUpdate = i + 1e3, this.onProgress({
      total: this.total,
      delta: this.delta,
      transferred: this.transferred,
      percent: this.transferred / this.total * 100,
      bytesPerSecond: Math.round(this.transferred / ((i - this.start) / 1e3))
    }), this.delta = 0), n(null, t);
  }
  _flush(t) {
    if (this.cancellationToken.cancelled) {
      t(new Error("cancelled"));
      return;
    }
    this.onProgress({
      total: this.total,
      delta: this.delta,
      transferred: this.total,
      percent: 100,
      bytesPerSecond: Math.round(this.transferred / ((Date.now() - this.start) / 1e3))
    }), this.delta = 0, t(null);
  }
}
zr.ProgressCallbackTransform = qp;
Object.defineProperty(Ce, "__esModule", { value: !0 });
Ce.DigestTransform = Ce.HttpExecutor = Ce.HttpError = void 0;
Ce.createHttpError = ha;
Ce.parseJson = Jp;
Ce.configureRequestOptionsFromUrl = wc;
Ce.configureRequestUrl = La;
Ce.safeGetHeader = ir;
Ce.configureRequestOptions = Bn;
Ce.safeStringifyJson = jn;
const Gp = Wr, Vp = jp, Wp = _t, Yp = Vr, da = At, zp = Et, Zo = ur, Xp = zr, It = (0, Vp.default)("electron-builder");
function ha(e, t = null) {
  return new xa(e.statusCode || -1, `${e.statusCode} ${e.statusMessage}` + (t == null ? "" : `
` + JSON.stringify(t, null, "  ")) + `
Headers: ` + jn(e.headers), t);
}
const Kp = /* @__PURE__ */ new Map([
  [429, "Too many requests"],
  [400, "Bad request"],
  [403, "Forbidden"],
  [404, "Not found"],
  [405, "Method not allowed"],
  [406, "Not acceptable"],
  [408, "Request timeout"],
  [413, "Request entity too large"],
  [500, "Internal server error"],
  [502, "Bad gateway"],
  [503, "Service unavailable"],
  [504, "Gateway timeout"],
  [505, "HTTP version not supported"]
]);
class xa extends Error {
  constructor(t, r = `HTTP error: ${Kp.get(t) || t}`, n = null) {
    super(r), this.statusCode = t, this.description = n, this.name = "HttpError", this.code = `HTTP_ERROR_${t}`;
  }
  isServerError() {
    return this.statusCode >= 500 && this.statusCode <= 599;
  }
}
Ce.HttpError = xa;
function Jp(e) {
  return e.then((t) => t == null || t.length === 0 ? null : JSON.parse(t));
}
class Jt {
  constructor() {
    this.maxRedirects = 10;
  }
  request(t, r = new zp.CancellationToken(), n) {
    Bn(t);
    const i = n == null ? void 0 : JSON.stringify(n), a = i ? Buffer.from(i) : void 0;
    if (a != null) {
      It(i);
      const { headers: o, ...s } = t;
      t = {
        method: "post",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": a.length,
          ...o
        },
        ...s
      };
    }
    return this.doApiRequest(t, r, (o) => o.end(a));
  }
  doApiRequest(t, r, n, i = 0) {
    return It.enabled && It(`Request: ${jn(t)}`), r.createPromise((a, o, s) => {
      const l = this.createRequest(t, (m) => {
        try {
          this.handleResponse(m, t, r, a, o, i, n);
        } catch (c) {
          o(c);
        }
      });
      this.addErrorAndTimeoutHandlers(l, o, t.timeout), this.addRedirectHandlers(l, t, o, i, (m) => {
        this.doApiRequest(m, r, n, i).then(a).catch(o);
      }), n(l, o), s(() => l.abort());
    });
  }
  // noinspection JSUnusedLocalSymbols
  // eslint-disable-next-line
  addRedirectHandlers(t, r, n, i, a) {
  }
  addErrorAndTimeoutHandlers(t, r, n = 60 * 1e3) {
    this.addTimeOutHandler(t, r, n), t.on("error", r), t.on("aborted", () => {
      r(new Error("Request has been aborted by the server"));
    });
  }
  handleResponse(t, r, n, i, a, o, s) {
    var l;
    if (It.enabled && It(`Response: ${t.statusCode} ${t.statusMessage}, request options: ${jn(r)}`), t.statusCode === 404) {
      a(ha(t, `method: ${r.method || "GET"} url: ${r.protocol || "https:"}//${r.hostname}${r.port ? `:${r.port}` : ""}${r.path}

Please double check that your authentication token is correct. Due to security reasons, actual status maybe not reported, but 404.
`));
      return;
    } else if (t.statusCode === 204) {
      i();
      return;
    }
    const m = (l = t.statusCode) !== null && l !== void 0 ? l : 0, c = m >= 300 && m < 400, f = ir(t, "location");
    if (c && f != null) {
      if (o > this.maxRedirects) {
        a(this.createMaxRedirectError());
        return;
      }
      this.doApiRequest(Jt.prepareRedirectUrlOptions(f, r), n, s, o).then(i).catch(a);
      return;
    }
    t.setEncoding("utf8");
    let d = "";
    t.on("error", a), t.on("data", (g) => d += g), t.on("end", () => {
      try {
        if (t.statusCode != null && t.statusCode >= 400) {
          const g = ir(t, "content-type"), v = g != null && (Array.isArray(g) ? g.find((y) => y.includes("json")) != null : g.includes("json"));
          a(ha(t, `method: ${r.method || "GET"} url: ${r.protocol || "https:"}//${r.hostname}${r.port ? `:${r.port}` : ""}${r.path}

          Data:
          ${v ? JSON.stringify(JSON.parse(d)) : d}
          `));
        } else
          i(d.length === 0 ? null : d);
      } catch (g) {
        a(g);
      }
    });
  }
  async downloadToBuffer(t, r) {
    return await r.cancellationToken.createPromise((n, i, a) => {
      const o = [], s = {
        headers: r.headers || void 0,
        // because PrivateGitHubProvider requires HttpExecutor.prepareRedirectUrlOptions logic, so, we need to redirect manually
        redirect: "manual"
      };
      La(t, s), Bn(s), this.doDownload(s, {
        destination: null,
        options: r,
        onCancel: a,
        callback: (l) => {
          l == null ? n(Buffer.concat(o)) : i(l);
        },
        responseHandler: (l, m) => {
          let c = 0;
          l.on("data", (f) => {
            if (c += f.length, c > 524288e3) {
              m(new Error("Maximum allowed size is 500 MB"));
              return;
            }
            o.push(f);
          }), l.on("end", () => {
            m(null);
          });
        }
      }, 0);
    });
  }
  doDownload(t, r, n) {
    const i = this.createRequest(t, (a) => {
      if (a.statusCode >= 400) {
        r.callback(new Error(`Cannot download "${t.protocol || "https:"}//${t.hostname}${t.path}", status ${a.statusCode}: ${a.statusMessage}`));
        return;
      }
      a.on("error", r.callback);
      const o = ir(a, "location");
      if (o != null) {
        n < this.maxRedirects ? this.doDownload(Jt.prepareRedirectUrlOptions(o, t), r, n++) : r.callback(this.createMaxRedirectError());
        return;
      }
      r.responseHandler == null ? Zp(r, a) : r.responseHandler(a, r.callback);
    });
    this.addErrorAndTimeoutHandlers(i, r.callback, t.timeout), this.addRedirectHandlers(i, t, r.callback, n, (a) => {
      this.doDownload(a, r, n++);
    }), i.end();
  }
  createMaxRedirectError() {
    return new Error(`Too many redirects (> ${this.maxRedirects})`);
  }
  addTimeOutHandler(t, r, n) {
    t.on("socket", (i) => {
      i.setTimeout(n, () => {
        t.abort(), r(new Error("Request timed out"));
      });
    });
  }
  static prepareRedirectUrlOptions(t, r) {
    const n = wc(t, { ...r }), i = n.headers;
    if (i != null && i.authorization) {
      const a = Jt.reconstructOriginalUrl(r), o = vc(t, r);
      Jt.isCrossOriginRedirect(a, o) && (It.enabled && It(`Given the cross-origin redirect (from ${a.host} to ${o.host}), the Authorization header will be stripped out.`), delete i.authorization);
    }
    return n;
  }
  static reconstructOriginalUrl(t) {
    const r = t.protocol || "https:";
    if (!t.hostname)
      throw new Error("Missing hostname in request options");
    const n = t.hostname, i = t.port ? `:${t.port}` : "", a = t.path || "/";
    return new da.URL(`${r}//${n}${i}${a}`);
  }
  static isCrossOriginRedirect(t, r) {
    if (t.hostname.toLowerCase() !== r.hostname.toLowerCase())
      return !0;
    if (t.protocol === "http:" && // This can be replaced with `!originalUrl.port`, but for the sake of clarity.
    ["80", ""].includes(t.port) && r.protocol === "https:" && // This can be replaced with `!redirectUrl.port`, but for the sake of clarity.
    ["443", ""].includes(r.port))
      return !1;
    if (t.protocol !== r.protocol)
      return !0;
    const n = t.port, i = r.port;
    return n !== i;
  }
  static retryOnServerError(t, r = 3) {
    for (let n = 0; ; n++)
      try {
        return t();
      } catch (i) {
        if (n < r && (i instanceof xa && i.isServerError() || i.code === "EPIPE"))
          continue;
        throw i;
      }
  }
}
Ce.HttpExecutor = Jt;
function vc(e, t) {
  try {
    return new da.URL(e);
  } catch {
    const r = t.hostname, n = t.protocol || "https:", i = t.port ? `:${t.port}` : "", a = `${n}//${r}${i}`;
    return new da.URL(e, a);
  }
}
function wc(e, t) {
  const r = Bn(t), n = vc(e, t);
  return La(n, r), r;
}
function La(e, t) {
  t.protocol = e.protocol, t.hostname = e.hostname, e.port ? t.port = e.port : t.port && delete t.port, t.path = e.pathname + e.search;
}
class pa extends Yp.Transform {
  // noinspection JSUnusedGlobalSymbols
  get actual() {
    return this._actual;
  }
  constructor(t, r = "sha512", n = "base64") {
    super(), this.expected = t, this.algorithm = r, this.encoding = n, this._actual = null, this.isValidateOnEnd = !0, this.digester = (0, Gp.createHash)(r);
  }
  // noinspection JSUnusedGlobalSymbols
  _transform(t, r, n) {
    this.digester.update(t), n(null, t);
  }
  // noinspection JSUnusedGlobalSymbols
  _flush(t) {
    if (this._actual = this.digester.digest(this.encoding), this.isValidateOnEnd)
      try {
        this.validate();
      } catch (r) {
        t(r);
        return;
      }
    t(null);
  }
  validate() {
    if (this._actual == null)
      throw (0, Zo.newError)("Not finished yet", "ERR_STREAM_NOT_FINISHED");
    if (this._actual !== this.expected)
      throw (0, Zo.newError)(`${this.algorithm} checksum mismatch, expected ${this.expected}, got ${this._actual}`, "ERR_CHECKSUM_MISMATCH");
    return null;
  }
}
Ce.DigestTransform = pa;
function Qp(e, t, r) {
  return e != null && t != null && e !== t ? (r(new Error(`checksum mismatch: expected ${t} but got ${e} (X-Checksum-Sha2 header)`)), !1) : !0;
}
function ir(e, t) {
  const r = e.headers[t];
  return r == null ? null : Array.isArray(r) ? r.length === 0 ? null : r[r.length - 1] : r;
}
function Zp(e, t) {
  if (!Qp(ir(t, "X-Checksum-Sha2"), e.options.sha2, e.callback))
    return;
  const r = [];
  if (e.options.onProgress != null) {
    const o = ir(t, "content-length");
    o != null && r.push(new Xp.ProgressCallbackTransform(parseInt(o, 10), e.options.cancellationToken, e.options.onProgress));
  }
  const n = e.options.sha512;
  n != null ? r.push(new pa(n, "sha512", n.length === 128 && !n.includes("+") && !n.includes("Z") && !n.includes("=") ? "hex" : "base64")) : e.options.sha2 != null && r.push(new pa(e.options.sha2, "sha256", "hex"));
  const i = (0, Wp.createWriteStream)(e.destination);
  r.push(i);
  let a = t;
  for (const o of r)
    o.on("error", (s) => {
      i.close(), e.options.cancellationToken.cancelled || e.callback(s);
    }), a = a.pipe(o);
  i.on("finish", () => {
    i.close(e.callback);
  });
}
function Bn(e, t, r) {
  r != null && (e.method = r), e.headers = { ...e.headers };
  const n = e.headers;
  return t != null && (n.authorization = t.startsWith("Basic") || t.startsWith("Bearer") ? t : `token ${t}`), n["User-Agent"] == null && (n["User-Agent"] = "electron-builder"), (r == null || r === "GET" || n["Cache-Control"] == null) && (n["Cache-Control"] = "no-cache"), e.protocol == null && process.versions.electron != null && (e.protocol = "https:"), e;
}
function jn(e, t) {
  return JSON.stringify(e, (r, n) => r.endsWith("Authorization") || r.endsWith("authorization") || r.endsWith("Password") || r.endsWith("PASSWORD") || r.endsWith("Token") || r.includes("password") || r.includes("token") || t != null && t.has(r) ? "<stripped sensitive data>" : n, 2);
}
var ri = {};
Object.defineProperty(ri, "__esModule", { value: !0 });
ri.MemoLazy = void 0;
class em {
  constructor(t, r) {
    this.selector = t, this.creator = r, this.selected = void 0, this._value = void 0;
  }
  get hasValue() {
    return this._value !== void 0;
  }
  get value() {
    const t = this.selector();
    if (this._value !== void 0 && _c(this.selected, t))
      return this._value;
    this.selected = t;
    const r = this.creator(t);
    return this.value = r, r;
  }
  set value(t) {
    this._value = t;
  }
}
ri.MemoLazy = em;
function _c(e, t) {
  if (typeof e == "object" && e !== null && (typeof t == "object" && t !== null)) {
    const i = Object.keys(e), a = Object.keys(t);
    return i.length === a.length && i.every((o) => _c(e[o], t[o]));
  }
  return e === t;
}
var Xr = {};
Object.defineProperty(Xr, "__esModule", { value: !0 });
Xr.githubUrl = tm;
Xr.githubTagPrefix = rm;
Xr.getS3LikeProviderBaseUrl = nm;
function tm(e, t = "github.com") {
  return `${e.protocol || "https"}://${e.host || t}`;
}
function rm(e) {
  var t;
  return e.tagNamePrefix ? e.tagNamePrefix : !((t = e.vPrefixedTagName) !== null && t !== void 0) || t ? "v" : "";
}
function nm(e) {
  const t = e.provider;
  if (t === "s3")
    return im(e);
  if (t === "spaces")
    return am(e);
  throw new Error(`Not supported provider: ${t}`);
}
function im(e) {
  let t;
  if (e.accelerate == !0)
    t = `https://${e.bucket}.s3-accelerate.amazonaws.com`;
  else if (e.endpoint != null)
    t = `${e.endpoint}/${e.bucket}`;
  else if (e.bucket.includes(".")) {
    if (e.region == null)
      throw new Error(`Bucket name "${e.bucket}" includes a dot, but S3 region is missing`);
    e.region === "us-east-1" ? t = `https://s3.amazonaws.com/${e.bucket}` : t = `https://s3-${e.region}.amazonaws.com/${e.bucket}`;
  } else e.region === "cn-north-1" ? t = `https://${e.bucket}.s3.${e.region}.amazonaws.com.cn` : t = `https://${e.bucket}.s3.amazonaws.com`;
  return Ac(t, e.path);
}
function Ac(e, t) {
  return t != null && t.length > 0 && (t.startsWith("/") || (e += "/"), e += t), e;
}
function am(e) {
  if (e.name == null)
    throw new Error("name is missing");
  if (e.region == null)
    throw new Error("region is missing");
  return Ac(`https://${e.name}.${e.region}.digitaloceanspaces.com`, e.path);
}
var Ua = {};
Object.defineProperty(Ua, "__esModule", { value: !0 });
Ua.retry = Tc;
const om = Et;
async function Tc(e, t) {
  var r;
  const { retries: n, interval: i, backoff: a = 0, attempt: o = 0, shouldRetry: s, cancellationToken: l = new om.CancellationToken() } = t;
  try {
    return await e();
  } catch (m) {
    if (await Promise.resolve((r = s == null ? void 0 : s(m)) !== null && r !== void 0 ? r : !0) && n > 0 && !l.cancelled)
      return await new Promise((c) => setTimeout(c, i + a * o)), await Tc(e, { ...t, retries: n - 1, attempt: o + 1 });
    throw m;
  }
}
var ka = {};
Object.defineProperty(ka, "__esModule", { value: !0 });
ka.parseDn = sm;
function sm(e) {
  let t = !1, r = null, n = "", i = 0;
  e = e.trim();
  const a = /* @__PURE__ */ new Map();
  for (let o = 0; o <= e.length; o++) {
    if (o === e.length) {
      r !== null && a.set(r, n);
      break;
    }
    const s = e[o];
    if (t) {
      if (s === '"') {
        t = !1;
        continue;
      }
    } else {
      if (s === '"') {
        t = !0;
        continue;
      }
      if (s === "\\") {
        o++;
        const l = parseInt(e.slice(o, o + 2), 16);
        Number.isNaN(l) ? n += e[o] : (o++, n += String.fromCharCode(l));
        continue;
      }
      if (r === null && s === "=") {
        r = n, n = "";
        continue;
      }
      if (s === "," || s === ";" || s === "+") {
        r !== null && a.set(r, n), r = null, n = "";
        continue;
      }
    }
    if (s === " " && !t) {
      if (n.length === 0)
        continue;
      if (o > i) {
        let l = o;
        for (; e[l] === " "; )
          l++;
        i = l;
      }
      if (i >= e.length || e[i] === "," || e[i] === ";" || r === null && e[i] === "=" || r !== null && e[i] === "+") {
        o = i - 1;
        continue;
      }
    }
    n += s;
  }
  return a;
}
var sr = {};
Object.defineProperty(sr, "__esModule", { value: !0 });
sr.nil = sr.UUID = void 0;
const Sc = Wr, Cc = ur, lm = "options.name must be either a string or a Buffer", es = (0, Sc.randomBytes)(16);
es[0] = es[0] | 1;
const xn = {}, V = [];
for (let e = 0; e < 256; e++) {
  const t = (e + 256).toString(16).substr(1);
  xn[t] = e, V[e] = t;
}
class Mt {
  constructor(t) {
    this.ascii = null, this.binary = null;
    const r = Mt.check(t);
    if (!r)
      throw new Error("not a UUID");
    this.version = r.version, r.format === "ascii" ? this.ascii = t : this.binary = t;
  }
  static v5(t, r) {
    return cm(t, "sha1", 80, r);
  }
  toString() {
    return this.ascii == null && (this.ascii = um(this.binary)), this.ascii;
  }
  inspect() {
    return `UUID v${this.version} ${this.toString()}`;
  }
  static check(t, r = 0) {
    if (typeof t == "string")
      return t = t.toLowerCase(), /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-([a-f0-9]{12})$/.test(t) ? t === "00000000-0000-0000-0000-000000000000" ? { version: void 0, variant: "nil", format: "ascii" } : {
        version: (xn[t[14] + t[15]] & 240) >> 4,
        variant: ts((xn[t[19] + t[20]] & 224) >> 5),
        format: "ascii"
      } : !1;
    if (Buffer.isBuffer(t)) {
      if (t.length < r + 16)
        return !1;
      let n = 0;
      for (; n < 16 && t[r + n] === 0; n++)
        ;
      return n === 16 ? { version: void 0, variant: "nil", format: "binary" } : {
        version: (t[r + 6] & 240) >> 4,
        variant: ts((t[r + 8] & 224) >> 5),
        format: "binary"
      };
    }
    throw (0, Cc.newError)("Unknown type of uuid", "ERR_UNKNOWN_UUID_TYPE");
  }
  // read stringified uuid into a Buffer
  static parse(t) {
    const r = Buffer.allocUnsafe(16);
    let n = 0;
    for (let i = 0; i < 16; i++)
      r[i] = xn[t[n++] + t[n++]], (i === 3 || i === 5 || i === 7 || i === 9) && (n += 1);
    return r;
  }
}
sr.UUID = Mt;
Mt.OID = Mt.parse("6ba7b812-9dad-11d1-80b4-00c04fd430c8");
function ts(e) {
  switch (e) {
    case 0:
    case 1:
    case 3:
      return "ncs";
    case 4:
    case 5:
      return "rfc4122";
    case 6:
      return "microsoft";
    default:
      return "future";
  }
}
var Rr;
(function(e) {
  e[e.ASCII = 0] = "ASCII", e[e.BINARY = 1] = "BINARY", e[e.OBJECT = 2] = "OBJECT";
})(Rr || (Rr = {}));
function cm(e, t, r, n, i = Rr.ASCII) {
  const a = (0, Sc.createHash)(t);
  if (typeof e != "string" && !Buffer.isBuffer(e))
    throw (0, Cc.newError)(lm, "ERR_INVALID_UUID_NAME");
  a.update(n), a.update(e);
  const s = a.digest();
  let l;
  switch (i) {
    case Rr.BINARY:
      s[6] = s[6] & 15 | r, s[8] = s[8] & 63 | 128, l = s;
      break;
    case Rr.OBJECT:
      s[6] = s[6] & 15 | r, s[8] = s[8] & 63 | 128, l = new Mt(s);
      break;
    default:
      l = V[s[0]] + V[s[1]] + V[s[2]] + V[s[3]] + "-" + V[s[4]] + V[s[5]] + "-" + V[s[6] & 15 | r] + V[s[7]] + "-" + V[s[8] & 63 | 128] + V[s[9]] + "-" + V[s[10]] + V[s[11]] + V[s[12]] + V[s[13]] + V[s[14]] + V[s[15]];
      break;
  }
  return l;
}
function um(e) {
  return V[e[0]] + V[e[1]] + V[e[2]] + V[e[3]] + "-" + V[e[4]] + V[e[5]] + "-" + V[e[6]] + V[e[7]] + "-" + V[e[8]] + V[e[9]] + "-" + V[e[10]] + V[e[11]] + V[e[12]] + V[e[13]] + V[e[14]] + V[e[15]];
}
sr.nil = new Mt("00000000-0000-0000-0000-000000000000");
var Kr = {}, bc = {};
(function(e) {
  (function(t) {
    t.parser = function(h, u) {
      return new n(h, u);
    }, t.SAXParser = n, t.SAXStream = c, t.createStream = m, t.MAX_BUFFER_LENGTH = 64 * 1024;
    var r = [
      "comment",
      "sgmlDecl",
      "textNode",
      "tagName",
      "doctype",
      "procInstName",
      "procInstBody",
      "entity",
      "attribName",
      "attribValue",
      "cdata",
      "script"
    ];
    t.EVENTS = [
      "text",
      "processinginstruction",
      "sgmldeclaration",
      "doctype",
      "comment",
      "opentagstart",
      "attribute",
      "opentag",
      "closetag",
      "opencdata",
      "cdata",
      "closecdata",
      "error",
      "end",
      "ready",
      "script",
      "opennamespace",
      "closenamespace"
    ];
    function n(h, u) {
      if (!(this instanceof n))
        return new n(h, u);
      var C = this;
      a(C), C.q = C.c = "", C.bufferCheckPosition = t.MAX_BUFFER_LENGTH, C.opt = u || {}, C.opt.lowercase = C.opt.lowercase || C.opt.lowercasetags, C.looseCase = C.opt.lowercase ? "toLowerCase" : "toUpperCase", C.opt.maxEntityCount = C.opt.maxEntityCount || 512, C.opt.maxEntityDepth = C.opt.maxEntityDepth || 4, C.entityCount = C.entityDepth = 0, C.tags = [], C.closed = C.closedRoot = C.sawRoot = !1, C.tag = C.error = null, C.strict = !!h, C.noscript = !!(h || C.opt.noscript), C.state = E.BEGIN, C.strictEntities = C.opt.strictEntities, C.ENTITIES = C.strictEntities ? Object.create(t.XML_ENTITIES) : Object.create(t.ENTITIES), C.attribList = [], C.opt.xmlns && (C.ns = Object.create(y)), C.opt.unquotedAttributeValues === void 0 && (C.opt.unquotedAttributeValues = !h), C.trackPosition = C.opt.position !== !1, C.trackPosition && (C.position = C.line = C.column = 0), B(C, "onready");
    }
    Object.create || (Object.create = function(h) {
      function u() {
      }
      u.prototype = h;
      var C = new u();
      return C;
    }), Object.keys || (Object.keys = function(h) {
      var u = [];
      for (var C in h) h.hasOwnProperty(C) && u.push(C);
      return u;
    });
    function i(h) {
      for (var u = Math.max(t.MAX_BUFFER_LENGTH, 10), C = 0, _ = 0, Y = r.length; _ < Y; _++) {
        var J = h[r[_]].length;
        if (J > u)
          switch (r[_]) {
            case "textNode":
              z(h);
              break;
            case "cdata":
              M(h, "oncdata", h.cdata), h.cdata = "";
              break;
            case "script":
              M(h, "onscript", h.script), h.script = "";
              break;
            default:
              R(h, "Max buffer length exceeded: " + r[_]);
          }
        C = Math.max(C, J);
      }
      var ne = t.MAX_BUFFER_LENGTH - C;
      h.bufferCheckPosition = ne + h.position;
    }
    function a(h) {
      for (var u = 0, C = r.length; u < C; u++)
        h[r[u]] = "";
    }
    function o(h) {
      z(h), h.cdata !== "" && (M(h, "oncdata", h.cdata), h.cdata = ""), h.script !== "" && (M(h, "onscript", h.script), h.script = "");
    }
    n.prototype = {
      end: function() {
        N(this);
      },
      write: Xe,
      resume: function() {
        return this.error = null, this;
      },
      close: function() {
        return this.write(null);
      },
      flush: function() {
        o(this);
      }
    };
    var s;
    try {
      s = require("stream").Stream;
    } catch {
      s = function() {
      };
    }
    s || (s = function() {
    });
    var l = t.EVENTS.filter(function(h) {
      return h !== "error" && h !== "end";
    });
    function m(h, u) {
      return new c(h, u);
    }
    function c(h, u) {
      if (!(this instanceof c))
        return new c(h, u);
      s.apply(this), this._parser = new n(h, u), this.writable = !0, this.readable = !0;
      var C = this;
      this._parser.onend = function() {
        C.emit("end");
      }, this._parser.onerror = function(_) {
        C.emit("error", _), C._parser.error = null;
      }, this._decoder = null, l.forEach(function(_) {
        Object.defineProperty(C, "on" + _, {
          get: function() {
            return C._parser["on" + _];
          },
          set: function(Y) {
            if (!Y)
              return C.removeAllListeners(_), C._parser["on" + _] = Y, Y;
            C.on(_, Y);
          },
          enumerable: !0,
          configurable: !1
        });
      });
    }
    c.prototype = Object.create(s.prototype, {
      constructor: {
        value: c
      }
    }), c.prototype.write = function(h) {
      return typeof Buffer == "function" && typeof Buffer.isBuffer == "function" && Buffer.isBuffer(h) && (this._decoder || (this._decoder = new TextDecoder("utf8")), h = this._decoder.decode(h, { stream: !0 })), this._parser.write(h.toString()), this.emit("data", h), !0;
    }, c.prototype.end = function(h) {
      if (h && h.length && this.write(h), this._decoder) {
        var u = this._decoder.decode();
        u && (this._parser.write(u), this.emit("data", u));
      }
      return this._parser.end(), !0;
    }, c.prototype.on = function(h, u) {
      var C = this;
      return !C._parser["on" + h] && l.indexOf(h) !== -1 && (C._parser["on" + h] = function() {
        var _ = arguments.length === 1 ? [arguments[0]] : Array.apply(null, arguments);
        _.splice(0, 0, h), C.emit.apply(C, _);
      }), s.prototype.on.call(C, h, u);
    };
    var f = "[CDATA[", d = "DOCTYPE", g = "http://www.w3.org/XML/1998/namespace", v = "http://www.w3.org/2000/xmlns/", y = { xml: g, xmlns: v }, A = /[:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]/, S = /[:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u00B7\u0300-\u036F\u203F-\u2040.\d-]/, T = /[#:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]/, D = /[#:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u00B7\u0300-\u036F\u203F-\u2040.\d-]/;
    function x(h) {
      return h === " " || h === `
` || h === "\r" || h === "	";
    }
    function Z(h) {
      return h === '"' || h === "'";
    }
    function ae(h) {
      return h === ">" || x(h);
    }
    function W(h, u) {
      return h.test(u);
    }
    function $e(h, u) {
      return !W(h, u);
    }
    var E = 0;
    t.STATE = {
      BEGIN: E++,
      // leading byte order mark or whitespace
      BEGIN_WHITESPACE: E++,
      // leading whitespace
      TEXT: E++,
      // general stuff
      TEXT_ENTITY: E++,
      // &amp and such.
      OPEN_WAKA: E++,
      // <
      SGML_DECL: E++,
      // <!BLARG
      SGML_DECL_QUOTED: E++,
      // <!BLARG foo "bar
      DOCTYPE: E++,
      // <!DOCTYPE
      DOCTYPE_QUOTED: E++,
      // <!DOCTYPE "//blah
      DOCTYPE_DTD: E++,
      // <!DOCTYPE "//blah" [ ...
      DOCTYPE_DTD_QUOTED: E++,
      // <!DOCTYPE "//blah" [ "foo
      COMMENT_STARTING: E++,
      // <!-
      COMMENT: E++,
      // <!--
      COMMENT_ENDING: E++,
      // <!-- blah -
      COMMENT_ENDED: E++,
      // <!-- blah --
      CDATA: E++,
      // <![CDATA[ something
      CDATA_ENDING: E++,
      // ]
      CDATA_ENDING_2: E++,
      // ]]
      PROC_INST: E++,
      // <?hi
      PROC_INST_BODY: E++,
      // <?hi there
      PROC_INST_ENDING: E++,
      // <?hi "there" ?
      OPEN_TAG: E++,
      // <strong
      OPEN_TAG_SLASH: E++,
      // <strong /
      ATTRIB: E++,
      // <a
      ATTRIB_NAME: E++,
      // <a foo
      ATTRIB_NAME_SAW_WHITE: E++,
      // <a foo _
      ATTRIB_VALUE: E++,
      // <a foo=
      ATTRIB_VALUE_QUOTED: E++,
      // <a foo="bar
      ATTRIB_VALUE_CLOSED: E++,
      // <a foo="bar"
      ATTRIB_VALUE_UNQUOTED: E++,
      // <a foo=bar
      ATTRIB_VALUE_ENTITY_Q: E++,
      // <foo bar="&quot;"
      ATTRIB_VALUE_ENTITY_U: E++,
      // <foo bar=&quot
      CLOSE_TAG: E++,
      // </a
      CLOSE_TAG_SAW_WHITE: E++,
      // </a   >
      SCRIPT: E++,
      // <script> ...
      SCRIPT_ENDING: E++
      // <script> ... <
    }, t.XML_ENTITIES = {
      amp: "&",
      gt: ">",
      lt: "<",
      quot: '"',
      apos: "'"
    }, t.ENTITIES = {
      amp: "&",
      gt: ">",
      lt: "<",
      quot: '"',
      apos: "'",
      AElig: 198,
      Aacute: 193,
      Acirc: 194,
      Agrave: 192,
      Aring: 197,
      Atilde: 195,
      Auml: 196,
      Ccedil: 199,
      ETH: 208,
      Eacute: 201,
      Ecirc: 202,
      Egrave: 200,
      Euml: 203,
      Iacute: 205,
      Icirc: 206,
      Igrave: 204,
      Iuml: 207,
      Ntilde: 209,
      Oacute: 211,
      Ocirc: 212,
      Ograve: 210,
      Oslash: 216,
      Otilde: 213,
      Ouml: 214,
      THORN: 222,
      Uacute: 218,
      Ucirc: 219,
      Ugrave: 217,
      Uuml: 220,
      Yacute: 221,
      aacute: 225,
      acirc: 226,
      aelig: 230,
      agrave: 224,
      aring: 229,
      atilde: 227,
      auml: 228,
      ccedil: 231,
      eacute: 233,
      ecirc: 234,
      egrave: 232,
      eth: 240,
      euml: 235,
      iacute: 237,
      icirc: 238,
      igrave: 236,
      iuml: 239,
      ntilde: 241,
      oacute: 243,
      ocirc: 244,
      ograve: 242,
      oslash: 248,
      otilde: 245,
      ouml: 246,
      szlig: 223,
      thorn: 254,
      uacute: 250,
      ucirc: 251,
      ugrave: 249,
      uuml: 252,
      yacute: 253,
      yuml: 255,
      copy: 169,
      reg: 174,
      nbsp: 160,
      iexcl: 161,
      cent: 162,
      pound: 163,
      curren: 164,
      yen: 165,
      brvbar: 166,
      sect: 167,
      uml: 168,
      ordf: 170,
      laquo: 171,
      not: 172,
      shy: 173,
      macr: 175,
      deg: 176,
      plusmn: 177,
      sup1: 185,
      sup2: 178,
      sup3: 179,
      acute: 180,
      micro: 181,
      para: 182,
      middot: 183,
      cedil: 184,
      ordm: 186,
      raquo: 187,
      frac14: 188,
      frac12: 189,
      frac34: 190,
      iquest: 191,
      times: 215,
      divide: 247,
      OElig: 338,
      oelig: 339,
      Scaron: 352,
      scaron: 353,
      Yuml: 376,
      fnof: 402,
      circ: 710,
      tilde: 732,
      Alpha: 913,
      Beta: 914,
      Gamma: 915,
      Delta: 916,
      Epsilon: 917,
      Zeta: 918,
      Eta: 919,
      Theta: 920,
      Iota: 921,
      Kappa: 922,
      Lambda: 923,
      Mu: 924,
      Nu: 925,
      Xi: 926,
      Omicron: 927,
      Pi: 928,
      Rho: 929,
      Sigma: 931,
      Tau: 932,
      Upsilon: 933,
      Phi: 934,
      Chi: 935,
      Psi: 936,
      Omega: 937,
      alpha: 945,
      beta: 946,
      gamma: 947,
      delta: 948,
      epsilon: 949,
      zeta: 950,
      eta: 951,
      theta: 952,
      iota: 953,
      kappa: 954,
      lambda: 955,
      mu: 956,
      nu: 957,
      xi: 958,
      omicron: 959,
      pi: 960,
      rho: 961,
      sigmaf: 962,
      sigma: 963,
      tau: 964,
      upsilon: 965,
      phi: 966,
      chi: 967,
      psi: 968,
      omega: 969,
      thetasym: 977,
      upsih: 978,
      piv: 982,
      ensp: 8194,
      emsp: 8195,
      thinsp: 8201,
      zwnj: 8204,
      zwj: 8205,
      lrm: 8206,
      rlm: 8207,
      ndash: 8211,
      mdash: 8212,
      lsquo: 8216,
      rsquo: 8217,
      sbquo: 8218,
      ldquo: 8220,
      rdquo: 8221,
      bdquo: 8222,
      dagger: 8224,
      Dagger: 8225,
      bull: 8226,
      hellip: 8230,
      permil: 8240,
      prime: 8242,
      Prime: 8243,
      lsaquo: 8249,
      rsaquo: 8250,
      oline: 8254,
      frasl: 8260,
      euro: 8364,
      image: 8465,
      weierp: 8472,
      real: 8476,
      trade: 8482,
      alefsym: 8501,
      larr: 8592,
      uarr: 8593,
      rarr: 8594,
      darr: 8595,
      harr: 8596,
      crarr: 8629,
      lArr: 8656,
      uArr: 8657,
      rArr: 8658,
      dArr: 8659,
      hArr: 8660,
      forall: 8704,
      part: 8706,
      exist: 8707,
      empty: 8709,
      nabla: 8711,
      isin: 8712,
      notin: 8713,
      ni: 8715,
      prod: 8719,
      sum: 8721,
      minus: 8722,
      lowast: 8727,
      radic: 8730,
      prop: 8733,
      infin: 8734,
      ang: 8736,
      and: 8743,
      or: 8744,
      cap: 8745,
      cup: 8746,
      int: 8747,
      there4: 8756,
      sim: 8764,
      cong: 8773,
      asymp: 8776,
      ne: 8800,
      equiv: 8801,
      le: 8804,
      ge: 8805,
      sub: 8834,
      sup: 8835,
      nsub: 8836,
      sube: 8838,
      supe: 8839,
      oplus: 8853,
      otimes: 8855,
      perp: 8869,
      sdot: 8901,
      lceil: 8968,
      rceil: 8969,
      lfloor: 8970,
      rfloor: 8971,
      lang: 9001,
      rang: 9002,
      loz: 9674,
      spades: 9824,
      clubs: 9827,
      hearts: 9829,
      diams: 9830
    }, Object.keys(t.ENTITIES).forEach(function(h) {
      var u = t.ENTITIES[h], C = typeof u == "number" ? String.fromCharCode(u) : u;
      t.ENTITIES[h] = C;
    });
    for (var q in t.STATE)
      t.STATE[t.STATE[q]] = q;
    E = t.STATE;
    function B(h, u, C) {
      h[u] && h[u](C);
    }
    function M(h, u, C) {
      h.textNode && z(h), B(h, u, C);
    }
    function z(h) {
      h.textNode = P(h.opt, h.textNode), h.textNode && B(h, "ontext", h.textNode), h.textNode = "";
    }
    function P(h, u) {
      return h.trim && (u = u.trim()), h.normalize && (u = u.replace(/\s+/g, " ")), u;
    }
    function R(h, u) {
      return z(h), h.trackPosition && (u += `
Line: ` + h.line + `
Column: ` + h.column + `
Char: ` + h.c), u = new Error(u), h.error = u, B(h, "onerror", u), h;
    }
    function N(h) {
      return h.sawRoot && !h.closedRoot && b(h, "Unclosed root tag"), h.state !== E.BEGIN && h.state !== E.BEGIN_WHITESPACE && h.state !== E.TEXT && R(h, "Unexpected end"), z(h), h.c = "", h.closed = !0, B(h, "onend"), n.call(h, h.strict, h.opt), h;
    }
    function b(h, u) {
      if (typeof h != "object" || !(h instanceof n))
        throw new Error("bad call to strictFail");
      h.strict && R(h, u);
    }
    function $(h) {
      h.strict || (h.tagName = h.tagName[h.looseCase]());
      var u = h.tags[h.tags.length - 1] || h, C = h.tag = { name: h.tagName, attributes: {} };
      h.opt.xmlns && (C.ns = u.ns), h.attribList.length = 0, M(h, "onopentagstart", C);
    }
    function I(h, u) {
      var C = h.indexOf(":"), _ = C < 0 ? ["", h] : h.split(":"), Y = _[0], J = _[1];
      return u && h === "xmlns" && (Y = "xmlns", J = ""), { prefix: Y, local: J };
    }
    function k(h) {
      if (h.strict || (h.attribName = h.attribName[h.looseCase]()), h.attribList.indexOf(h.attribName) !== -1 || h.tag.attributes.hasOwnProperty(h.attribName)) {
        h.attribName = h.attribValue = "";
        return;
      }
      if (h.opt.xmlns) {
        var u = I(h.attribName, !0), C = u.prefix, _ = u.local;
        if (C === "xmlns")
          if (_ === "xml" && h.attribValue !== g)
            b(
              h,
              "xml: prefix must be bound to " + g + `
Actual: ` + h.attribValue
            );
          else if (_ === "xmlns" && h.attribValue !== v)
            b(
              h,
              "xmlns: prefix must be bound to " + v + `
Actual: ` + h.attribValue
            );
          else {
            var Y = h.tag, J = h.tags[h.tags.length - 1] || h;
            Y.ns === J.ns && (Y.ns = Object.create(J.ns)), Y.ns[_] = h.attribValue;
          }
        h.attribList.push([h.attribName, h.attribValue]);
      } else
        h.tag.attributes[h.attribName] = h.attribValue, M(h, "onattribute", {
          name: h.attribName,
          value: h.attribValue
        });
      h.attribName = h.attribValue = "";
    }
    function G(h, u) {
      if (h.opt.xmlns) {
        var C = h.tag, _ = I(h.tagName);
        C.prefix = _.prefix, C.local = _.local, C.uri = C.ns[_.prefix] || "", C.prefix && !C.uri && (b(
          h,
          "Unbound namespace prefix: " + JSON.stringify(h.tagName)
        ), C.uri = _.prefix);
        var Y = h.tags[h.tags.length - 1] || h;
        C.ns && Y.ns !== C.ns && Object.keys(C.ns).forEach(function(on) {
          M(h, "onopennamespace", {
            prefix: on,
            uri: C.ns[on]
          });
        });
        for (var J = 0, ne = h.attribList.length; J < ne; J++) {
          var he = h.attribList[J], ye = he[0], at = he[1], le = I(ye, !0), Be = le.prefix, wi = le.local, an = Be === "" ? "" : C.ns[Be] || "", pr = {
            name: ye,
            value: at,
            prefix: Be,
            local: wi,
            uri: an
          };
          Be && Be !== "xmlns" && !an && (b(
            h,
            "Unbound namespace prefix: " + JSON.stringify(Be)
          ), pr.uri = Be), h.tag.attributes[ye] = pr, M(h, "onattribute", pr);
        }
        h.attribList.length = 0;
      }
      h.tag.isSelfClosing = !!u, h.sawRoot = !0, h.tags.push(h.tag), M(h, "onopentag", h.tag), u || (!h.noscript && h.tagName.toLowerCase() === "script" ? h.state = E.SCRIPT : h.state = E.TEXT, h.tag = null, h.tagName = ""), h.attribName = h.attribValue = "", h.attribList.length = 0;
    }
    function j(h) {
      if (!h.tagName) {
        b(h, "Weird empty close tag."), h.textNode += "</>", h.state = E.TEXT;
        return;
      }
      if (h.script) {
        if (h.tagName !== "script") {
          h.script += "</" + h.tagName + ">", h.tagName = "", h.state = E.SCRIPT;
          return;
        }
        M(h, "onscript", h.script), h.script = "";
      }
      var u = h.tags.length, C = h.tagName;
      h.strict || (C = C[h.looseCase]());
      for (var _ = C; u--; ) {
        var Y = h.tags[u];
        if (Y.name !== _)
          b(h, "Unexpected close tag");
        else
          break;
      }
      if (u < 0) {
        b(h, "Unmatched closing tag: " + h.tagName), h.textNode += "</" + h.tagName + ">", h.state = E.TEXT;
        return;
      }
      h.tagName = C;
      for (var J = h.tags.length; J-- > u; ) {
        var ne = h.tag = h.tags.pop();
        h.tagName = h.tag.name, M(h, "onclosetag", h.tagName);
        var he = {};
        for (var ye in ne.ns)
          he[ye] = ne.ns[ye];
        var at = h.tags[h.tags.length - 1] || h;
        h.opt.xmlns && ne.ns !== at.ns && Object.keys(ne.ns).forEach(function(le) {
          var Be = ne.ns[le];
          M(h, "onclosenamespace", { prefix: le, uri: Be });
        });
      }
      u === 0 && (h.closedRoot = !0), h.tagName = h.attribValue = h.attribName = "", h.attribList.length = 0, h.state = E.TEXT;
    }
    function X(h) {
      var u = h.entity, C = u.toLowerCase(), _, Y = "";
      return h.ENTITIES[u] ? h.ENTITIES[u] : h.ENTITIES[C] ? h.ENTITIES[C] : (u = C, u.charAt(0) === "#" && (u.charAt(1) === "x" ? (u = u.slice(2), _ = parseInt(u, 16), Y = _.toString(16)) : (u = u.slice(1), _ = parseInt(u, 10), Y = _.toString(10))), u = u.replace(/^0+/, ""), isNaN(_) || Y.toLowerCase() !== u || _ < 0 || _ > 1114111 ? (b(h, "Invalid character entity"), "&" + h.entity + ";") : String.fromCodePoint(_));
    }
    function ue(h, u) {
      u === "<" ? (h.state = E.OPEN_WAKA, h.startTagPosition = h.position) : x(u) || (b(h, "Non-whitespace before first tag."), h.textNode = u, h.state = E.TEXT);
    }
    function U(h, u) {
      var C = "";
      return u < h.length && (C = h.charAt(u)), C;
    }
    function Xe(h) {
      var u = this;
      if (this.error)
        throw this.error;
      if (u.closed)
        return R(
          u,
          "Cannot write after close. Assign an onready handler."
        );
      if (h === null)
        return N(u);
      typeof h == "object" && (h = h.toString());
      for (var C = 0, _ = ""; _ = U(h, C++), u.c = _, !!_; )
        switch (u.trackPosition && (u.position++, _ === `
` ? (u.line++, u.column = 0) : u.column++), u.state) {
          case E.BEGIN:
            if (u.state = E.BEGIN_WHITESPACE, _ === "\uFEFF")
              continue;
            ue(u, _);
            continue;
          case E.BEGIN_WHITESPACE:
            ue(u, _);
            continue;
          case E.TEXT:
            if (u.sawRoot && !u.closedRoot) {
              for (var J = C - 1; _ && _ !== "<" && _ !== "&"; )
                _ = U(h, C++), _ && u.trackPosition && (u.position++, _ === `
` ? (u.line++, u.column = 0) : u.column++);
              u.textNode += h.substring(J, C - 1);
            }
            _ === "<" && !(u.sawRoot && u.closedRoot && !u.strict) ? (u.state = E.OPEN_WAKA, u.startTagPosition = u.position) : (!x(_) && (!u.sawRoot || u.closedRoot) && b(u, "Text data outside of root node."), _ === "&" ? u.state = E.TEXT_ENTITY : u.textNode += _);
            continue;
          case E.SCRIPT:
            _ === "<" ? u.state = E.SCRIPT_ENDING : u.script += _;
            continue;
          case E.SCRIPT_ENDING:
            _ === "/" ? u.state = E.CLOSE_TAG : (u.script += "<" + _, u.state = E.SCRIPT);
            continue;
          case E.OPEN_WAKA:
            if (_ === "!")
              u.state = E.SGML_DECL, u.sgmlDecl = "";
            else if (!x(_)) if (W(A, _))
              u.state = E.OPEN_TAG, u.tagName = _;
            else if (_ === "/")
              u.state = E.CLOSE_TAG, u.tagName = "";
            else if (_ === "?")
              u.state = E.PROC_INST, u.procInstName = u.procInstBody = "";
            else {
              if (b(u, "Unencoded <"), u.startTagPosition + 1 < u.position) {
                var Y = u.position - u.startTagPosition;
                _ = new Array(Y).join(" ") + _;
              }
              u.textNode += "<" + _, u.state = E.TEXT;
            }
            continue;
          case E.SGML_DECL:
            if (u.sgmlDecl + _ === "--") {
              u.state = E.COMMENT, u.comment = "", u.sgmlDecl = "";
              continue;
            }
            u.doctype && u.doctype !== !0 && u.sgmlDecl ? (u.state = E.DOCTYPE_DTD, u.doctype += "<!" + u.sgmlDecl + _, u.sgmlDecl = "") : (u.sgmlDecl + _).toUpperCase() === f ? (M(u, "onopencdata"), u.state = E.CDATA, u.sgmlDecl = "", u.cdata = "") : (u.sgmlDecl + _).toUpperCase() === d ? (u.state = E.DOCTYPE, (u.doctype || u.sawRoot) && b(
              u,
              "Inappropriately located doctype declaration"
            ), u.doctype = "", u.sgmlDecl = "") : _ === ">" ? (M(u, "onsgmldeclaration", u.sgmlDecl), u.sgmlDecl = "", u.state = E.TEXT) : (Z(_) && (u.state = E.SGML_DECL_QUOTED), u.sgmlDecl += _);
            continue;
          case E.SGML_DECL_QUOTED:
            _ === u.q && (u.state = E.SGML_DECL, u.q = ""), u.sgmlDecl += _;
            continue;
          case E.DOCTYPE:
            _ === ">" ? (u.state = E.TEXT, M(u, "ondoctype", u.doctype), u.doctype = !0) : (u.doctype += _, _ === "[" ? u.state = E.DOCTYPE_DTD : Z(_) && (u.state = E.DOCTYPE_QUOTED, u.q = _));
            continue;
          case E.DOCTYPE_QUOTED:
            u.doctype += _, _ === u.q && (u.q = "", u.state = E.DOCTYPE);
            continue;
          case E.DOCTYPE_DTD:
            _ === "]" ? (u.doctype += _, u.state = E.DOCTYPE) : _ === "<" ? (u.state = E.OPEN_WAKA, u.startTagPosition = u.position) : Z(_) ? (u.doctype += _, u.state = E.DOCTYPE_DTD_QUOTED, u.q = _) : u.doctype += _;
            continue;
          case E.DOCTYPE_DTD_QUOTED:
            u.doctype += _, _ === u.q && (u.state = E.DOCTYPE_DTD, u.q = "");
            continue;
          case E.COMMENT:
            _ === "-" ? u.state = E.COMMENT_ENDING : u.comment += _;
            continue;
          case E.COMMENT_ENDING:
            _ === "-" ? (u.state = E.COMMENT_ENDED, u.comment = P(u.opt, u.comment), u.comment && M(u, "oncomment", u.comment), u.comment = "") : (u.comment += "-" + _, u.state = E.COMMENT);
            continue;
          case E.COMMENT_ENDED:
            _ !== ">" ? (b(u, "Malformed comment"), u.comment += "--" + _, u.state = E.COMMENT) : u.doctype && u.doctype !== !0 ? u.state = E.DOCTYPE_DTD : u.state = E.TEXT;
            continue;
          case E.CDATA:
            for (var J = C - 1; _ && _ !== "]"; )
              _ = U(h, C++), _ && u.trackPosition && (u.position++, _ === `
` ? (u.line++, u.column = 0) : u.column++);
            u.cdata += h.substring(J, C - 1), _ === "]" && (u.state = E.CDATA_ENDING);
            continue;
          case E.CDATA_ENDING:
            _ === "]" ? u.state = E.CDATA_ENDING_2 : (u.cdata += "]" + _, u.state = E.CDATA);
            continue;
          case E.CDATA_ENDING_2:
            _ === ">" ? (u.cdata && M(u, "oncdata", u.cdata), M(u, "onclosecdata"), u.cdata = "", u.state = E.TEXT) : _ === "]" ? u.cdata += "]" : (u.cdata += "]]" + _, u.state = E.CDATA);
            continue;
          case E.PROC_INST:
            _ === "?" ? u.state = E.PROC_INST_ENDING : x(_) ? u.state = E.PROC_INST_BODY : u.procInstName += _;
            continue;
          case E.PROC_INST_BODY:
            if (!u.procInstBody && x(_))
              continue;
            _ === "?" ? u.state = E.PROC_INST_ENDING : u.procInstBody += _;
            continue;
          case E.PROC_INST_ENDING:
            _ === ">" ? (M(u, "onprocessinginstruction", {
              name: u.procInstName,
              body: u.procInstBody
            }), u.procInstName = u.procInstBody = "", u.state = E.TEXT) : (u.procInstBody += "?" + _, u.state = E.PROC_INST_BODY);
            continue;
          case E.OPEN_TAG:
            W(S, _) ? u.tagName += _ : ($(u), _ === ">" ? G(u) : _ === "/" ? u.state = E.OPEN_TAG_SLASH : (x(_) || b(u, "Invalid character in tag name"), u.state = E.ATTRIB));
            continue;
          case E.OPEN_TAG_SLASH:
            _ === ">" ? (G(u, !0), j(u)) : (b(
              u,
              "Forward-slash in opening tag not followed by >"
            ), u.state = E.ATTRIB);
            continue;
          case E.ATTRIB:
            if (x(_))
              continue;
            _ === ">" ? G(u) : _ === "/" ? u.state = E.OPEN_TAG_SLASH : W(A, _) ? (u.attribName = _, u.attribValue = "", u.state = E.ATTRIB_NAME) : b(u, "Invalid attribute name");
            continue;
          case E.ATTRIB_NAME:
            _ === "=" ? u.state = E.ATTRIB_VALUE : _ === ">" ? (b(u, "Attribute without value"), u.attribValue = u.attribName, k(u), G(u)) : x(_) ? u.state = E.ATTRIB_NAME_SAW_WHITE : W(S, _) ? u.attribName += _ : b(u, "Invalid attribute name");
            continue;
          case E.ATTRIB_NAME_SAW_WHITE:
            if (_ === "=")
              u.state = E.ATTRIB_VALUE;
            else {
              if (x(_))
                continue;
              b(u, "Attribute without value"), u.tag.attributes[u.attribName] = "", u.attribValue = "", M(u, "onattribute", {
                name: u.attribName,
                value: ""
              }), u.attribName = "", _ === ">" ? G(u) : W(A, _) ? (u.attribName = _, u.state = E.ATTRIB_NAME) : (b(u, "Invalid attribute name"), u.state = E.ATTRIB);
            }
            continue;
          case E.ATTRIB_VALUE:
            if (x(_))
              continue;
            Z(_) ? (u.q = _, u.state = E.ATTRIB_VALUE_QUOTED) : (u.opt.unquotedAttributeValues || R(u, "Unquoted attribute value"), u.state = E.ATTRIB_VALUE_UNQUOTED, u.attribValue = _);
            continue;
          case E.ATTRIB_VALUE_QUOTED:
            if (_ !== u.q) {
              _ === "&" ? u.state = E.ATTRIB_VALUE_ENTITY_Q : u.attribValue += _;
              continue;
            }
            k(u), u.q = "", u.state = E.ATTRIB_VALUE_CLOSED;
            continue;
          case E.ATTRIB_VALUE_CLOSED:
            x(_) ? u.state = E.ATTRIB : _ === ">" ? G(u) : _ === "/" ? u.state = E.OPEN_TAG_SLASH : W(A, _) ? (b(u, "No whitespace between attributes"), u.attribName = _, u.attribValue = "", u.state = E.ATTRIB_NAME) : b(u, "Invalid attribute name");
            continue;
          case E.ATTRIB_VALUE_UNQUOTED:
            if (!ae(_)) {
              _ === "&" ? u.state = E.ATTRIB_VALUE_ENTITY_U : u.attribValue += _;
              continue;
            }
            k(u), _ === ">" ? G(u) : u.state = E.ATTRIB;
            continue;
          case E.CLOSE_TAG:
            if (u.tagName)
              _ === ">" ? j(u) : W(S, _) ? u.tagName += _ : u.script ? (u.script += "</" + u.tagName + _, u.tagName = "", u.state = E.SCRIPT) : (x(_) || b(u, "Invalid tagname in closing tag"), u.state = E.CLOSE_TAG_SAW_WHITE);
            else {
              if (x(_))
                continue;
              $e(A, _) ? u.script ? (u.script += "</" + _, u.state = E.SCRIPT) : b(u, "Invalid tagname in closing tag.") : u.tagName = _;
            }
            continue;
          case E.CLOSE_TAG_SAW_WHITE:
            if (x(_))
              continue;
            _ === ">" ? j(u) : b(u, "Invalid characters in closing tag");
            continue;
          case E.TEXT_ENTITY:
          case E.ATTRIB_VALUE_ENTITY_Q:
          case E.ATTRIB_VALUE_ENTITY_U:
            var ne, he;
            switch (u.state) {
              case E.TEXT_ENTITY:
                ne = E.TEXT, he = "textNode";
                break;
              case E.ATTRIB_VALUE_ENTITY_Q:
                ne = E.ATTRIB_VALUE_QUOTED, he = "attribValue";
                break;
              case E.ATTRIB_VALUE_ENTITY_U:
                ne = E.ATTRIB_VALUE_UNQUOTED, he = "attribValue";
                break;
            }
            if (_ === ";") {
              var ye = X(u);
              u.opt.unparsedEntities && !Object.values(t.XML_ENTITIES).includes(ye) ? ((u.entityCount += 1) > u.opt.maxEntityCount && R(
                u,
                "Parsed entity count exceeds max entity count"
              ), (u.entityDepth += 1) > u.opt.maxEntityDepth && R(
                u,
                "Parsed entity depth exceeds max entity depth"
              ), u.entity = "", u.state = ne, u.write(ye), u.entityDepth -= 1) : (u[he] += ye, u.entity = "", u.state = ne);
            } else W(u.entity.length ? D : T, _) ? u.entity += _ : (b(u, "Invalid character in entity name"), u[he] += "&" + u.entity + _, u.entity = "", u.state = ne);
            continue;
          default:
            throw new Error(u, "Unknown state: " + u.state);
        }
      return u.position >= u.bufferCheckPosition && i(u), u;
    }
    /*! http://mths.be/fromcodepoint v0.1.0 by @mathias */
    String.fromCodePoint || function() {
      var h = String.fromCharCode, u = Math.floor, C = function() {
        var _ = 16384, Y = [], J, ne, he = -1, ye = arguments.length;
        if (!ye)
          return "";
        for (var at = ""; ++he < ye; ) {
          var le = Number(arguments[he]);
          if (!isFinite(le) || // `NaN`, `+Infinity`, or `-Infinity`
          le < 0 || // not a valid Unicode code point
          le > 1114111 || // not a valid Unicode code point
          u(le) !== le)
            throw RangeError("Invalid code point: " + le);
          le <= 65535 ? Y.push(le) : (le -= 65536, J = (le >> 10) + 55296, ne = le % 1024 + 56320, Y.push(J, ne)), (he + 1 === ye || Y.length > _) && (at += h.apply(null, Y), Y.length = 0);
        }
        return at;
      };
      Object.defineProperty ? Object.defineProperty(String, "fromCodePoint", {
        value: C,
        configurable: !0,
        writable: !0
      }) : String.fromCodePoint = C;
    }();
  })(e);
})(bc);
Object.defineProperty(Kr, "__esModule", { value: !0 });
Kr.XElement = void 0;
Kr.parseXml = pm;
const fm = bc, wn = ur;
class Rc {
  constructor(t) {
    if (this.name = t, this.value = "", this.attributes = null, this.isCData = !1, this.elements = null, !t)
      throw (0, wn.newError)("Element name cannot be empty", "ERR_XML_ELEMENT_NAME_EMPTY");
    if (!hm(t))
      throw (0, wn.newError)(`Invalid element name: ${t}`, "ERR_XML_ELEMENT_INVALID_NAME");
  }
  attribute(t) {
    const r = this.attributes === null ? null : this.attributes[t];
    if (r == null)
      throw (0, wn.newError)(`No attribute "${t}"`, "ERR_XML_MISSED_ATTRIBUTE");
    return r;
  }
  removeAttribute(t) {
    this.attributes !== null && delete this.attributes[t];
  }
  element(t, r = !1, n = null) {
    const i = this.elementOrNull(t, r);
    if (i === null)
      throw (0, wn.newError)(n || `No element "${t}"`, "ERR_XML_MISSED_ELEMENT");
    return i;
  }
  elementOrNull(t, r = !1) {
    if (this.elements === null)
      return null;
    for (const n of this.elements)
      if (rs(n, t, r))
        return n;
    return null;
  }
  getElements(t, r = !1) {
    return this.elements === null ? [] : this.elements.filter((n) => rs(n, t, r));
  }
  elementValueOrEmpty(t, r = !1) {
    const n = this.elementOrNull(t, r);
    return n === null ? "" : n.value;
  }
}
Kr.XElement = Rc;
const dm = new RegExp(/^[A-Za-z_][:A-Za-z0-9_-]*$/i);
function hm(e) {
  return dm.test(e);
}
function rs(e, t, r) {
  const n = e.name;
  return n === t || r === !0 && n.length === t.length && n.toLowerCase() === t.toLowerCase();
}
function pm(e) {
  let t = null;
  const r = fm.parser(!0, {}), n = [];
  return r.onopentag = (i) => {
    const a = new Rc(i.name);
    if (a.attributes = i.attributes, t === null)
      t = a;
    else {
      const o = n[n.length - 1];
      o.elements == null && (o.elements = []), o.elements.push(a);
    }
    n.push(a);
  }, r.onclosetag = () => {
    n.pop();
  }, r.ontext = (i) => {
    n.length > 0 && (n[n.length - 1].value = i);
  }, r.oncdata = (i) => {
    const a = n[n.length - 1];
    a.value = i, a.isCData = !0;
  }, r.onerror = (i) => {
    throw i;
  }, r.write(e), t;
}
(function(e) {
  Object.defineProperty(e, "__esModule", { value: !0 }), e.CURRENT_APP_PACKAGE_FILE_NAME = e.CURRENT_APP_INSTALLER_FILE_NAME = e.XElement = e.parseXml = e.UUID = e.parseDn = e.retry = e.githubTagPrefix = e.githubUrl = e.getS3LikeProviderBaseUrl = e.ProgressCallbackTransform = e.MemoLazy = e.safeStringifyJson = e.safeGetHeader = e.parseJson = e.HttpExecutor = e.HttpError = e.DigestTransform = e.createHttpError = e.configureRequestUrl = e.configureRequestOptionsFromUrl = e.configureRequestOptions = e.newError = e.CancellationToken = e.CancellationError = void 0, e.asArray = f;
  var t = Et;
  Object.defineProperty(e, "CancellationError", { enumerable: !0, get: function() {
    return t.CancellationError;
  } }), Object.defineProperty(e, "CancellationToken", { enumerable: !0, get: function() {
    return t.CancellationToken;
  } });
  var r = ur;
  Object.defineProperty(e, "newError", { enumerable: !0, get: function() {
    return r.newError;
  } });
  var n = Ce;
  Object.defineProperty(e, "configureRequestOptions", { enumerable: !0, get: function() {
    return n.configureRequestOptions;
  } }), Object.defineProperty(e, "configureRequestOptionsFromUrl", { enumerable: !0, get: function() {
    return n.configureRequestOptionsFromUrl;
  } }), Object.defineProperty(e, "configureRequestUrl", { enumerable: !0, get: function() {
    return n.configureRequestUrl;
  } }), Object.defineProperty(e, "createHttpError", { enumerable: !0, get: function() {
    return n.createHttpError;
  } }), Object.defineProperty(e, "DigestTransform", { enumerable: !0, get: function() {
    return n.DigestTransform;
  } }), Object.defineProperty(e, "HttpError", { enumerable: !0, get: function() {
    return n.HttpError;
  } }), Object.defineProperty(e, "HttpExecutor", { enumerable: !0, get: function() {
    return n.HttpExecutor;
  } }), Object.defineProperty(e, "parseJson", { enumerable: !0, get: function() {
    return n.parseJson;
  } }), Object.defineProperty(e, "safeGetHeader", { enumerable: !0, get: function() {
    return n.safeGetHeader;
  } }), Object.defineProperty(e, "safeStringifyJson", { enumerable: !0, get: function() {
    return n.safeStringifyJson;
  } });
  var i = ri;
  Object.defineProperty(e, "MemoLazy", { enumerable: !0, get: function() {
    return i.MemoLazy;
  } });
  var a = zr;
  Object.defineProperty(e, "ProgressCallbackTransform", { enumerable: !0, get: function() {
    return a.ProgressCallbackTransform;
  } });
  var o = Xr;
  Object.defineProperty(e, "getS3LikeProviderBaseUrl", { enumerable: !0, get: function() {
    return o.getS3LikeProviderBaseUrl;
  } }), Object.defineProperty(e, "githubUrl", { enumerable: !0, get: function() {
    return o.githubUrl;
  } }), Object.defineProperty(e, "githubTagPrefix", { enumerable: !0, get: function() {
    return o.githubTagPrefix;
  } });
  var s = Ua;
  Object.defineProperty(e, "retry", { enumerable: !0, get: function() {
    return s.retry;
  } });
  var l = ka;
  Object.defineProperty(e, "parseDn", { enumerable: !0, get: function() {
    return l.parseDn;
  } });
  var m = sr;
  Object.defineProperty(e, "UUID", { enumerable: !0, get: function() {
    return m.UUID;
  } });
  var c = Kr;
  Object.defineProperty(e, "parseXml", { enumerable: !0, get: function() {
    return c.parseXml;
  } }), Object.defineProperty(e, "XElement", { enumerable: !0, get: function() {
    return c.XElement;
  } }), e.CURRENT_APP_INSTALLER_FILE_NAME = "installer.exe", e.CURRENT_APP_PACKAGE_FILE_NAME = "package.7z";
  function f(d) {
    return d == null ? [] : Array.isArray(d) ? d : [d];
  }
})(ce);
var Ee = {}, Ma = {}, Ve = {};
function Oc(e) {
  return typeof e > "u" || e === null;
}
function mm(e) {
  return typeof e == "object" && e !== null;
}
function gm(e) {
  return Array.isArray(e) ? e : Oc(e) ? [] : [e];
}
function Em(e, t) {
  var r, n, i, a;
  if (t)
    for (a = Object.keys(t), r = 0, n = a.length; r < n; r += 1)
      i = a[r], e[i] = t[i];
  return e;
}
function ym(e, t) {
  var r = "", n;
  for (n = 0; n < t; n += 1)
    r += e;
  return r;
}
function vm(e) {
  return e === 0 && Number.NEGATIVE_INFINITY === 1 / e;
}
Ve.isNothing = Oc;
Ve.isObject = mm;
Ve.toArray = gm;
Ve.repeat = ym;
Ve.isNegativeZero = vm;
Ve.extend = Em;
function Pc(e, t) {
  var r = "", n = e.reason || "(unknown reason)";
  return e.mark ? (e.mark.name && (r += 'in "' + e.mark.name + '" '), r += "(" + (e.mark.line + 1) + ":" + (e.mark.column + 1) + ")", !t && e.mark.snippet && (r += `

` + e.mark.snippet), n + " " + r) : n;
}
function Fr(e, t) {
  Error.call(this), this.name = "YAMLException", this.reason = e, this.mark = t, this.message = Pc(this, !1), Error.captureStackTrace ? Error.captureStackTrace(this, this.constructor) : this.stack = new Error().stack || "";
}
Fr.prototype = Object.create(Error.prototype);
Fr.prototype.constructor = Fr;
Fr.prototype.toString = function(t) {
  return this.name + ": " + Pc(this, t);
};
var Jr = Fr, Tr = Ve;
function Li(e, t, r, n, i) {
  var a = "", o = "", s = Math.floor(i / 2) - 1;
  return n - t > s && (a = " ... ", t = n - s + a.length), r - n > s && (o = " ...", r = n + s - o.length), {
    str: a + e.slice(t, r).replace(/\t/g, "→") + o,
    pos: n - t + a.length
    // relative position
  };
}
function Ui(e, t) {
  return Tr.repeat(" ", t - e.length) + e;
}
function wm(e, t) {
  if (t = Object.create(t || null), !e.buffer) return null;
  t.maxLength || (t.maxLength = 79), typeof t.indent != "number" && (t.indent = 1), typeof t.linesBefore != "number" && (t.linesBefore = 3), typeof t.linesAfter != "number" && (t.linesAfter = 2);
  for (var r = /\r?\n|\r|\0/g, n = [0], i = [], a, o = -1; a = r.exec(e.buffer); )
    i.push(a.index), n.push(a.index + a[0].length), e.position <= a.index && o < 0 && (o = n.length - 2);
  o < 0 && (o = n.length - 1);
  var s = "", l, m, c = Math.min(e.line + t.linesAfter, i.length).toString().length, f = t.maxLength - (t.indent + c + 3);
  for (l = 1; l <= t.linesBefore && !(o - l < 0); l++)
    m = Li(
      e.buffer,
      n[o - l],
      i[o - l],
      e.position - (n[o] - n[o - l]),
      f
    ), s = Tr.repeat(" ", t.indent) + Ui((e.line - l + 1).toString(), c) + " | " + m.str + `
` + s;
  for (m = Li(e.buffer, n[o], i[o], e.position, f), s += Tr.repeat(" ", t.indent) + Ui((e.line + 1).toString(), c) + " | " + m.str + `
`, s += Tr.repeat("-", t.indent + c + 3 + m.pos) + `^
`, l = 1; l <= t.linesAfter && !(o + l >= i.length); l++)
    m = Li(
      e.buffer,
      n[o + l],
      i[o + l],
      e.position - (n[o] - n[o + l]),
      f
    ), s += Tr.repeat(" ", t.indent) + Ui((e.line + l + 1).toString(), c) + " | " + m.str + `
`;
  return s.replace(/\n$/, "");
}
var _m = wm, ns = Jr, Am = [
  "kind",
  "multi",
  "resolve",
  "construct",
  "instanceOf",
  "predicate",
  "represent",
  "representName",
  "defaultStyle",
  "styleAliases"
], Tm = [
  "scalar",
  "sequence",
  "mapping"
];
function Sm(e) {
  var t = {};
  return e !== null && Object.keys(e).forEach(function(r) {
    e[r].forEach(function(n) {
      t[String(n)] = r;
    });
  }), t;
}
function Cm(e, t) {
  if (t = t || {}, Object.keys(t).forEach(function(r) {
    if (Am.indexOf(r) === -1)
      throw new ns('Unknown option "' + r + '" is met in definition of "' + e + '" YAML type.');
  }), this.options = t, this.tag = e, this.kind = t.kind || null, this.resolve = t.resolve || function() {
    return !0;
  }, this.construct = t.construct || function(r) {
    return r;
  }, this.instanceOf = t.instanceOf || null, this.predicate = t.predicate || null, this.represent = t.represent || null, this.representName = t.representName || null, this.defaultStyle = t.defaultStyle || null, this.multi = t.multi || !1, this.styleAliases = Sm(t.styleAliases || null), Tm.indexOf(this.kind) === -1)
    throw new ns('Unknown kind "' + this.kind + '" is specified for "' + e + '" YAML type.');
}
var Pe = Cm, vr = Jr, ki = Pe;
function is(e, t) {
  var r = [];
  return e[t].forEach(function(n) {
    var i = r.length;
    r.forEach(function(a, o) {
      a.tag === n.tag && a.kind === n.kind && a.multi === n.multi && (i = o);
    }), r[i] = n;
  }), r;
}
function bm() {
  var e = {
    scalar: {},
    sequence: {},
    mapping: {},
    fallback: {},
    multi: {
      scalar: [],
      sequence: [],
      mapping: [],
      fallback: []
    }
  }, t, r;
  function n(i) {
    i.multi ? (e.multi[i.kind].push(i), e.multi.fallback.push(i)) : e[i.kind][i.tag] = e.fallback[i.tag] = i;
  }
  for (t = 0, r = arguments.length; t < r; t += 1)
    arguments[t].forEach(n);
  return e;
}
function ma(e) {
  return this.extend(e);
}
ma.prototype.extend = function(t) {
  var r = [], n = [];
  if (t instanceof ki)
    n.push(t);
  else if (Array.isArray(t))
    n = n.concat(t);
  else if (t && (Array.isArray(t.implicit) || Array.isArray(t.explicit)))
    t.implicit && (r = r.concat(t.implicit)), t.explicit && (n = n.concat(t.explicit));
  else
    throw new vr("Schema.extend argument should be a Type, [ Type ], or a schema definition ({ implicit: [...], explicit: [...] })");
  r.forEach(function(a) {
    if (!(a instanceof ki))
      throw new vr("Specified list of YAML types (or a single Type object) contains a non-Type object.");
    if (a.loadKind && a.loadKind !== "scalar")
      throw new vr("There is a non-scalar type in the implicit list of a schema. Implicit resolving of such types is not supported.");
    if (a.multi)
      throw new vr("There is a multi type in the implicit list of a schema. Multi tags can only be listed as explicit.");
  }), n.forEach(function(a) {
    if (!(a instanceof ki))
      throw new vr("Specified list of YAML types (or a single Type object) contains a non-Type object.");
  });
  var i = Object.create(ma.prototype);
  return i.implicit = (this.implicit || []).concat(r), i.explicit = (this.explicit || []).concat(n), i.compiledImplicit = is(i, "implicit"), i.compiledExplicit = is(i, "explicit"), i.compiledTypeMap = bm(i.compiledImplicit, i.compiledExplicit), i;
};
var Ic = ma, Rm = Pe, Nc = new Rm("tag:yaml.org,2002:str", {
  kind: "scalar",
  construct: function(e) {
    return e !== null ? e : "";
  }
}), Om = Pe, Dc = new Om("tag:yaml.org,2002:seq", {
  kind: "sequence",
  construct: function(e) {
    return e !== null ? e : [];
  }
}), Pm = Pe, $c = new Pm("tag:yaml.org,2002:map", {
  kind: "mapping",
  construct: function(e) {
    return e !== null ? e : {};
  }
}), Im = Ic, Fc = new Im({
  explicit: [
    Nc,
    Dc,
    $c
  ]
}), Nm = Pe;
function Dm(e) {
  if (e === null) return !0;
  var t = e.length;
  return t === 1 && e === "~" || t === 4 && (e === "null" || e === "Null" || e === "NULL");
}
function $m() {
  return null;
}
function Fm(e) {
  return e === null;
}
var xc = new Nm("tag:yaml.org,2002:null", {
  kind: "scalar",
  resolve: Dm,
  construct: $m,
  predicate: Fm,
  represent: {
    canonical: function() {
      return "~";
    },
    lowercase: function() {
      return "null";
    },
    uppercase: function() {
      return "NULL";
    },
    camelcase: function() {
      return "Null";
    },
    empty: function() {
      return "";
    }
  },
  defaultStyle: "lowercase"
}), xm = Pe;
function Lm(e) {
  if (e === null) return !1;
  var t = e.length;
  return t === 4 && (e === "true" || e === "True" || e === "TRUE") || t === 5 && (e === "false" || e === "False" || e === "FALSE");
}
function Um(e) {
  return e === "true" || e === "True" || e === "TRUE";
}
function km(e) {
  return Object.prototype.toString.call(e) === "[object Boolean]";
}
var Lc = new xm("tag:yaml.org,2002:bool", {
  kind: "scalar",
  resolve: Lm,
  construct: Um,
  predicate: km,
  represent: {
    lowercase: function(e) {
      return e ? "true" : "false";
    },
    uppercase: function(e) {
      return e ? "TRUE" : "FALSE";
    },
    camelcase: function(e) {
      return e ? "True" : "False";
    }
  },
  defaultStyle: "lowercase"
}), Mm = Ve, Bm = Pe;
function jm(e) {
  return 48 <= e && e <= 57 || 65 <= e && e <= 70 || 97 <= e && e <= 102;
}
function Hm(e) {
  return 48 <= e && e <= 55;
}
function qm(e) {
  return 48 <= e && e <= 57;
}
function Gm(e) {
  if (e === null) return !1;
  var t = e.length, r = 0, n = !1, i;
  if (!t) return !1;
  if (i = e[r], (i === "-" || i === "+") && (i = e[++r]), i === "0") {
    if (r + 1 === t) return !0;
    if (i = e[++r], i === "b") {
      for (r++; r < t; r++)
        if (i = e[r], i !== "_") {
          if (i !== "0" && i !== "1") return !1;
          n = !0;
        }
      return n && i !== "_";
    }
    if (i === "x") {
      for (r++; r < t; r++)
        if (i = e[r], i !== "_") {
          if (!jm(e.charCodeAt(r))) return !1;
          n = !0;
        }
      return n && i !== "_";
    }
    if (i === "o") {
      for (r++; r < t; r++)
        if (i = e[r], i !== "_") {
          if (!Hm(e.charCodeAt(r))) return !1;
          n = !0;
        }
      return n && i !== "_";
    }
  }
  if (i === "_") return !1;
  for (; r < t; r++)
    if (i = e[r], i !== "_") {
      if (!qm(e.charCodeAt(r)))
        return !1;
      n = !0;
    }
  return !(!n || i === "_");
}
function Vm(e) {
  var t = e, r = 1, n;
  if (t.indexOf("_") !== -1 && (t = t.replace(/_/g, "")), n = t[0], (n === "-" || n === "+") && (n === "-" && (r = -1), t = t.slice(1), n = t[0]), t === "0") return 0;
  if (n === "0") {
    if (t[1] === "b") return r * parseInt(t.slice(2), 2);
    if (t[1] === "x") return r * parseInt(t.slice(2), 16);
    if (t[1] === "o") return r * parseInt(t.slice(2), 8);
  }
  return r * parseInt(t, 10);
}
function Wm(e) {
  return Object.prototype.toString.call(e) === "[object Number]" && e % 1 === 0 && !Mm.isNegativeZero(e);
}
var Uc = new Bm("tag:yaml.org,2002:int", {
  kind: "scalar",
  resolve: Gm,
  construct: Vm,
  predicate: Wm,
  represent: {
    binary: function(e) {
      return e >= 0 ? "0b" + e.toString(2) : "-0b" + e.toString(2).slice(1);
    },
    octal: function(e) {
      return e >= 0 ? "0o" + e.toString(8) : "-0o" + e.toString(8).slice(1);
    },
    decimal: function(e) {
      return e.toString(10);
    },
    /* eslint-disable max-len */
    hexadecimal: function(e) {
      return e >= 0 ? "0x" + e.toString(16).toUpperCase() : "-0x" + e.toString(16).toUpperCase().slice(1);
    }
  },
  defaultStyle: "decimal",
  styleAliases: {
    binary: [2, "bin"],
    octal: [8, "oct"],
    decimal: [10, "dec"],
    hexadecimal: [16, "hex"]
  }
}), kc = Ve, Ym = Pe, zm = new RegExp(
  // 2.5e4, 2.5 and integers
  "^(?:[-+]?(?:[0-9][0-9_]*)(?:\\.[0-9_]*)?(?:[eE][-+]?[0-9]+)?|\\.[0-9_]+(?:[eE][-+]?[0-9]+)?|[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$"
);
function Xm(e) {
  return !(e === null || !zm.test(e) || // Quick hack to not allow integers end with `_`
  // Probably should update regexp & check speed
  e[e.length - 1] === "_");
}
function Km(e) {
  var t, r;
  return t = e.replace(/_/g, "").toLowerCase(), r = t[0] === "-" ? -1 : 1, "+-".indexOf(t[0]) >= 0 && (t = t.slice(1)), t === ".inf" ? r === 1 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY : t === ".nan" ? NaN : r * parseFloat(t, 10);
}
var Jm = /^[-+]?[0-9]+e/;
function Qm(e, t) {
  var r;
  if (isNaN(e))
    switch (t) {
      case "lowercase":
        return ".nan";
      case "uppercase":
        return ".NAN";
      case "camelcase":
        return ".NaN";
    }
  else if (Number.POSITIVE_INFINITY === e)
    switch (t) {
      case "lowercase":
        return ".inf";
      case "uppercase":
        return ".INF";
      case "camelcase":
        return ".Inf";
    }
  else if (Number.NEGATIVE_INFINITY === e)
    switch (t) {
      case "lowercase":
        return "-.inf";
      case "uppercase":
        return "-.INF";
      case "camelcase":
        return "-.Inf";
    }
  else if (kc.isNegativeZero(e))
    return "-0.0";
  return r = e.toString(10), Jm.test(r) ? r.replace("e", ".e") : r;
}
function Zm(e) {
  return Object.prototype.toString.call(e) === "[object Number]" && (e % 1 !== 0 || kc.isNegativeZero(e));
}
var Mc = new Ym("tag:yaml.org,2002:float", {
  kind: "scalar",
  resolve: Xm,
  construct: Km,
  predicate: Zm,
  represent: Qm,
  defaultStyle: "lowercase"
}), Bc = Fc.extend({
  implicit: [
    xc,
    Lc,
    Uc,
    Mc
  ]
}), jc = Bc, eg = Pe, Hc = new RegExp(
  "^([0-9][0-9][0-9][0-9])-([0-9][0-9])-([0-9][0-9])$"
), qc = new RegExp(
  "^([0-9][0-9][0-9][0-9])-([0-9][0-9]?)-([0-9][0-9]?)(?:[Tt]|[ \\t]+)([0-9][0-9]?):([0-9][0-9]):([0-9][0-9])(?:\\.([0-9]*))?(?:[ \\t]*(Z|([-+])([0-9][0-9]?)(?::([0-9][0-9]))?))?$"
);
function tg(e) {
  return e === null ? !1 : Hc.exec(e) !== null || qc.exec(e) !== null;
}
function rg(e) {
  var t, r, n, i, a, o, s, l = 0, m = null, c, f, d;
  if (t = Hc.exec(e), t === null && (t = qc.exec(e)), t === null) throw new Error("Date resolve error");
  if (r = +t[1], n = +t[2] - 1, i = +t[3], !t[4])
    return new Date(Date.UTC(r, n, i));
  if (a = +t[4], o = +t[5], s = +t[6], t[7]) {
    for (l = t[7].slice(0, 3); l.length < 3; )
      l += "0";
    l = +l;
  }
  return t[9] && (c = +t[10], f = +(t[11] || 0), m = (c * 60 + f) * 6e4, t[9] === "-" && (m = -m)), d = new Date(Date.UTC(r, n, i, a, o, s, l)), m && d.setTime(d.getTime() - m), d;
}
function ng(e) {
  return e.toISOString();
}
var Gc = new eg("tag:yaml.org,2002:timestamp", {
  kind: "scalar",
  resolve: tg,
  construct: rg,
  instanceOf: Date,
  represent: ng
}), ig = Pe;
function ag(e) {
  return e === "<<" || e === null;
}
var Vc = new ig("tag:yaml.org,2002:merge", {
  kind: "scalar",
  resolve: ag
}), og = Pe, Ba = `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=
\r`;
function sg(e) {
  if (e === null) return !1;
  var t, r, n = 0, i = e.length, a = Ba;
  for (r = 0; r < i; r++)
    if (t = a.indexOf(e.charAt(r)), !(t > 64)) {
      if (t < 0) return !1;
      n += 6;
    }
  return n % 8 === 0;
}
function lg(e) {
  var t, r, n = e.replace(/[\r\n=]/g, ""), i = n.length, a = Ba, o = 0, s = [];
  for (t = 0; t < i; t++)
    t % 4 === 0 && t && (s.push(o >> 16 & 255), s.push(o >> 8 & 255), s.push(o & 255)), o = o << 6 | a.indexOf(n.charAt(t));
  return r = i % 4 * 6, r === 0 ? (s.push(o >> 16 & 255), s.push(o >> 8 & 255), s.push(o & 255)) : r === 18 ? (s.push(o >> 10 & 255), s.push(o >> 2 & 255)) : r === 12 && s.push(o >> 4 & 255), new Uint8Array(s);
}
function cg(e) {
  var t = "", r = 0, n, i, a = e.length, o = Ba;
  for (n = 0; n < a; n++)
    n % 3 === 0 && n && (t += o[r >> 18 & 63], t += o[r >> 12 & 63], t += o[r >> 6 & 63], t += o[r & 63]), r = (r << 8) + e[n];
  return i = a % 3, i === 0 ? (t += o[r >> 18 & 63], t += o[r >> 12 & 63], t += o[r >> 6 & 63], t += o[r & 63]) : i === 2 ? (t += o[r >> 10 & 63], t += o[r >> 4 & 63], t += o[r << 2 & 63], t += o[64]) : i === 1 && (t += o[r >> 2 & 63], t += o[r << 4 & 63], t += o[64], t += o[64]), t;
}
function ug(e) {
  return Object.prototype.toString.call(e) === "[object Uint8Array]";
}
var Wc = new og("tag:yaml.org,2002:binary", {
  kind: "scalar",
  resolve: sg,
  construct: lg,
  predicate: ug,
  represent: cg
}), fg = Pe, dg = Object.prototype.hasOwnProperty, hg = Object.prototype.toString;
function pg(e) {
  if (e === null) return !0;
  var t = [], r, n, i, a, o, s = e;
  for (r = 0, n = s.length; r < n; r += 1) {
    if (i = s[r], o = !1, hg.call(i) !== "[object Object]") return !1;
    for (a in i)
      if (dg.call(i, a))
        if (!o) o = !0;
        else return !1;
    if (!o) return !1;
    if (t.indexOf(a) === -1) t.push(a);
    else return !1;
  }
  return !0;
}
function mg(e) {
  return e !== null ? e : [];
}
var Yc = new fg("tag:yaml.org,2002:omap", {
  kind: "sequence",
  resolve: pg,
  construct: mg
}), gg = Pe, Eg = Object.prototype.toString;
function yg(e) {
  if (e === null) return !0;
  var t, r, n, i, a, o = e;
  for (a = new Array(o.length), t = 0, r = o.length; t < r; t += 1) {
    if (n = o[t], Eg.call(n) !== "[object Object]" || (i = Object.keys(n), i.length !== 1)) return !1;
    a[t] = [i[0], n[i[0]]];
  }
  return !0;
}
function vg(e) {
  if (e === null) return [];
  var t, r, n, i, a, o = e;
  for (a = new Array(o.length), t = 0, r = o.length; t < r; t += 1)
    n = o[t], i = Object.keys(n), a[t] = [i[0], n[i[0]]];
  return a;
}
var zc = new gg("tag:yaml.org,2002:pairs", {
  kind: "sequence",
  resolve: yg,
  construct: vg
}), wg = Pe, _g = Object.prototype.hasOwnProperty;
function Ag(e) {
  if (e === null) return !0;
  var t, r = e;
  for (t in r)
    if (_g.call(r, t) && r[t] !== null)
      return !1;
  return !0;
}
function Tg(e) {
  return e !== null ? e : {};
}
var Xc = new wg("tag:yaml.org,2002:set", {
  kind: "mapping",
  resolve: Ag,
  construct: Tg
}), ja = jc.extend({
  implicit: [
    Gc,
    Vc
  ],
  explicit: [
    Wc,
    Yc,
    zc,
    Xc
  ]
}), $t = Ve, Kc = Jr, Sg = _m, Cg = ja, yt = Object.prototype.hasOwnProperty, Hn = 1, Jc = 2, Qc = 3, qn = 4, Mi = 1, bg = 2, as = 3, Rg = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/, Og = /[\x85\u2028\u2029]/, Pg = /[,\[\]\{\}]/, Zc = /^(?:!|!!|![a-z\-]+!)$/i, eu = /^(?:!|[^,\[\]\{\}])(?:%[0-9a-f]{2}|[0-9a-z\-#;\/\?:@&=\+\$,_\.!~\*'\(\)\[\]])*$/i;
function os(e) {
  return Object.prototype.toString.call(e);
}
function Qe(e) {
  return e === 10 || e === 13;
}
function Ut(e) {
  return e === 9 || e === 32;
}
function De(e) {
  return e === 9 || e === 32 || e === 10 || e === 13;
}
function Qt(e) {
  return e === 44 || e === 91 || e === 93 || e === 123 || e === 125;
}
function Ig(e) {
  var t;
  return 48 <= e && e <= 57 ? e - 48 : (t = e | 32, 97 <= t && t <= 102 ? t - 97 + 10 : -1);
}
function Ng(e) {
  return e === 120 ? 2 : e === 117 ? 4 : e === 85 ? 8 : 0;
}
function Dg(e) {
  return 48 <= e && e <= 57 ? e - 48 : -1;
}
function ss(e) {
  return e === 48 ? "\0" : e === 97 ? "\x07" : e === 98 ? "\b" : e === 116 || e === 9 ? "	" : e === 110 ? `
` : e === 118 ? "\v" : e === 102 ? "\f" : e === 114 ? "\r" : e === 101 ? "\x1B" : e === 32 ? " " : e === 34 ? '"' : e === 47 ? "/" : e === 92 ? "\\" : e === 78 ? "" : e === 95 ? " " : e === 76 ? "\u2028" : e === 80 ? "\u2029" : "";
}
function $g(e) {
  return e <= 65535 ? String.fromCharCode(e) : String.fromCharCode(
    (e - 65536 >> 10) + 55296,
    (e - 65536 & 1023) + 56320
  );
}
function tu(e, t, r) {
  t === "__proto__" ? Object.defineProperty(e, t, {
    configurable: !0,
    enumerable: !0,
    writable: !0,
    value: r
  }) : e[t] = r;
}
var ru = new Array(256), nu = new Array(256);
for (var Wt = 0; Wt < 256; Wt++)
  ru[Wt] = ss(Wt) ? 1 : 0, nu[Wt] = ss(Wt);
function Fg(e, t) {
  this.input = e, this.filename = t.filename || null, this.schema = t.schema || Cg, this.onWarning = t.onWarning || null, this.legacy = t.legacy || !1, this.json = t.json || !1, this.listener = t.listener || null, this.implicitTypes = this.schema.compiledImplicit, this.typeMap = this.schema.compiledTypeMap, this.length = e.length, this.position = 0, this.line = 0, this.lineStart = 0, this.lineIndent = 0, this.firstTabInLine = -1, this.documents = [];
}
function iu(e, t) {
  var r = {
    name: e.filename,
    buffer: e.input.slice(0, -1),
    // omit trailing \0
    position: e.position,
    line: e.line,
    column: e.position - e.lineStart
  };
  return r.snippet = Sg(r), new Kc(t, r);
}
function L(e, t) {
  throw iu(e, t);
}
function Gn(e, t) {
  e.onWarning && e.onWarning.call(null, iu(e, t));
}
var ls = {
  YAML: function(t, r, n) {
    var i, a, o;
    t.version !== null && L(t, "duplication of %YAML directive"), n.length !== 1 && L(t, "YAML directive accepts exactly one argument"), i = /^([0-9]+)\.([0-9]+)$/.exec(n[0]), i === null && L(t, "ill-formed argument of the YAML directive"), a = parseInt(i[1], 10), o = parseInt(i[2], 10), a !== 1 && L(t, "unacceptable YAML version of the document"), t.version = n[0], t.checkLineBreaks = o < 2, o !== 1 && o !== 2 && Gn(t, "unsupported YAML version of the document");
  },
  TAG: function(t, r, n) {
    var i, a;
    n.length !== 2 && L(t, "TAG directive accepts exactly two arguments"), i = n[0], a = n[1], Zc.test(i) || L(t, "ill-formed tag handle (first argument) of the TAG directive"), yt.call(t.tagMap, i) && L(t, 'there is a previously declared suffix for "' + i + '" tag handle'), eu.test(a) || L(t, "ill-formed tag prefix (second argument) of the TAG directive");
    try {
      a = decodeURIComponent(a);
    } catch {
      L(t, "tag prefix is malformed: " + a);
    }
    t.tagMap[i] = a;
  }
};
function mt(e, t, r, n) {
  var i, a, o, s;
  if (t < r) {
    if (s = e.input.slice(t, r), n)
      for (i = 0, a = s.length; i < a; i += 1)
        o = s.charCodeAt(i), o === 9 || 32 <= o && o <= 1114111 || L(e, "expected valid JSON character");
    else Rg.test(s) && L(e, "the stream contains non-printable characters");
    e.result += s;
  }
}
function cs(e, t, r, n) {
  var i, a, o, s;
  for ($t.isObject(r) || L(e, "cannot merge mappings; the provided source object is unacceptable"), i = Object.keys(r), o = 0, s = i.length; o < s; o += 1)
    a = i[o], yt.call(t, a) || (tu(t, a, r[a]), n[a] = !0);
}
function Zt(e, t, r, n, i, a, o, s, l) {
  var m, c;
  if (Array.isArray(i))
    for (i = Array.prototype.slice.call(i), m = 0, c = i.length; m < c; m += 1)
      Array.isArray(i[m]) && L(e, "nested arrays are not supported inside keys"), typeof i == "object" && os(i[m]) === "[object Object]" && (i[m] = "[object Object]");
  if (typeof i == "object" && os(i) === "[object Object]" && (i = "[object Object]"), i = String(i), t === null && (t = {}), n === "tag:yaml.org,2002:merge")
    if (Array.isArray(a))
      for (m = 0, c = a.length; m < c; m += 1)
        cs(e, t, a[m], r);
    else
      cs(e, t, a, r);
  else
    !e.json && !yt.call(r, i) && yt.call(t, i) && (e.line = o || e.line, e.lineStart = s || e.lineStart, e.position = l || e.position, L(e, "duplicated mapping key")), tu(t, i, a), delete r[i];
  return t;
}
function Ha(e) {
  var t;
  t = e.input.charCodeAt(e.position), t === 10 ? e.position++ : t === 13 ? (e.position++, e.input.charCodeAt(e.position) === 10 && e.position++) : L(e, "a line break is expected"), e.line += 1, e.lineStart = e.position, e.firstTabInLine = -1;
}
function oe(e, t, r) {
  for (var n = 0, i = e.input.charCodeAt(e.position); i !== 0; ) {
    for (; Ut(i); )
      i === 9 && e.firstTabInLine === -1 && (e.firstTabInLine = e.position), i = e.input.charCodeAt(++e.position);
    if (t && i === 35)
      do
        i = e.input.charCodeAt(++e.position);
      while (i !== 10 && i !== 13 && i !== 0);
    if (Qe(i))
      for (Ha(e), i = e.input.charCodeAt(e.position), n++, e.lineIndent = 0; i === 32; )
        e.lineIndent++, i = e.input.charCodeAt(++e.position);
    else
      break;
  }
  return r !== -1 && n !== 0 && e.lineIndent < r && Gn(e, "deficient indentation"), n;
}
function ni(e) {
  var t = e.position, r;
  return r = e.input.charCodeAt(t), !!((r === 45 || r === 46) && r === e.input.charCodeAt(t + 1) && r === e.input.charCodeAt(t + 2) && (t += 3, r = e.input.charCodeAt(t), r === 0 || De(r)));
}
function qa(e, t) {
  t === 1 ? e.result += " " : t > 1 && (e.result += $t.repeat(`
`, t - 1));
}
function xg(e, t, r) {
  var n, i, a, o, s, l, m, c, f = e.kind, d = e.result, g;
  if (g = e.input.charCodeAt(e.position), De(g) || Qt(g) || g === 35 || g === 38 || g === 42 || g === 33 || g === 124 || g === 62 || g === 39 || g === 34 || g === 37 || g === 64 || g === 96 || (g === 63 || g === 45) && (i = e.input.charCodeAt(e.position + 1), De(i) || r && Qt(i)))
    return !1;
  for (e.kind = "scalar", e.result = "", a = o = e.position, s = !1; g !== 0; ) {
    if (g === 58) {
      if (i = e.input.charCodeAt(e.position + 1), De(i) || r && Qt(i))
        break;
    } else if (g === 35) {
      if (n = e.input.charCodeAt(e.position - 1), De(n))
        break;
    } else {
      if (e.position === e.lineStart && ni(e) || r && Qt(g))
        break;
      if (Qe(g))
        if (l = e.line, m = e.lineStart, c = e.lineIndent, oe(e, !1, -1), e.lineIndent >= t) {
          s = !0, g = e.input.charCodeAt(e.position);
          continue;
        } else {
          e.position = o, e.line = l, e.lineStart = m, e.lineIndent = c;
          break;
        }
    }
    s && (mt(e, a, o, !1), qa(e, e.line - l), a = o = e.position, s = !1), Ut(g) || (o = e.position + 1), g = e.input.charCodeAt(++e.position);
  }
  return mt(e, a, o, !1), e.result ? !0 : (e.kind = f, e.result = d, !1);
}
function Lg(e, t) {
  var r, n, i;
  if (r = e.input.charCodeAt(e.position), r !== 39)
    return !1;
  for (e.kind = "scalar", e.result = "", e.position++, n = i = e.position; (r = e.input.charCodeAt(e.position)) !== 0; )
    if (r === 39)
      if (mt(e, n, e.position, !0), r = e.input.charCodeAt(++e.position), r === 39)
        n = e.position, e.position++, i = e.position;
      else
        return !0;
    else Qe(r) ? (mt(e, n, i, !0), qa(e, oe(e, !1, t)), n = i = e.position) : e.position === e.lineStart && ni(e) ? L(e, "unexpected end of the document within a single quoted scalar") : (e.position++, i = e.position);
  L(e, "unexpected end of the stream within a single quoted scalar");
}
function Ug(e, t) {
  var r, n, i, a, o, s;
  if (s = e.input.charCodeAt(e.position), s !== 34)
    return !1;
  for (e.kind = "scalar", e.result = "", e.position++, r = n = e.position; (s = e.input.charCodeAt(e.position)) !== 0; ) {
    if (s === 34)
      return mt(e, r, e.position, !0), e.position++, !0;
    if (s === 92) {
      if (mt(e, r, e.position, !0), s = e.input.charCodeAt(++e.position), Qe(s))
        oe(e, !1, t);
      else if (s < 256 && ru[s])
        e.result += nu[s], e.position++;
      else if ((o = Ng(s)) > 0) {
        for (i = o, a = 0; i > 0; i--)
          s = e.input.charCodeAt(++e.position), (o = Ig(s)) >= 0 ? a = (a << 4) + o : L(e, "expected hexadecimal character");
        e.result += $g(a), e.position++;
      } else
        L(e, "unknown escape sequence");
      r = n = e.position;
    } else Qe(s) ? (mt(e, r, n, !0), qa(e, oe(e, !1, t)), r = n = e.position) : e.position === e.lineStart && ni(e) ? L(e, "unexpected end of the document within a double quoted scalar") : (e.position++, n = e.position);
  }
  L(e, "unexpected end of the stream within a double quoted scalar");
}
function kg(e, t) {
  var r = !0, n, i, a, o = e.tag, s, l = e.anchor, m, c, f, d, g, v = /* @__PURE__ */ Object.create(null), y, A, S, T;
  if (T = e.input.charCodeAt(e.position), T === 91)
    c = 93, g = !1, s = [];
  else if (T === 123)
    c = 125, g = !0, s = {};
  else
    return !1;
  for (e.anchor !== null && (e.anchorMap[e.anchor] = s), T = e.input.charCodeAt(++e.position); T !== 0; ) {
    if (oe(e, !0, t), T = e.input.charCodeAt(e.position), T === c)
      return e.position++, e.tag = o, e.anchor = l, e.kind = g ? "mapping" : "sequence", e.result = s, !0;
    r ? T === 44 && L(e, "expected the node content, but found ','") : L(e, "missed comma between flow collection entries"), A = y = S = null, f = d = !1, T === 63 && (m = e.input.charCodeAt(e.position + 1), De(m) && (f = d = !0, e.position++, oe(e, !0, t))), n = e.line, i = e.lineStart, a = e.position, lr(e, t, Hn, !1, !0), A = e.tag, y = e.result, oe(e, !0, t), T = e.input.charCodeAt(e.position), (d || e.line === n) && T === 58 && (f = !0, T = e.input.charCodeAt(++e.position), oe(e, !0, t), lr(e, t, Hn, !1, !0), S = e.result), g ? Zt(e, s, v, A, y, S, n, i, a) : f ? s.push(Zt(e, null, v, A, y, S, n, i, a)) : s.push(y), oe(e, !0, t), T = e.input.charCodeAt(e.position), T === 44 ? (r = !0, T = e.input.charCodeAt(++e.position)) : r = !1;
  }
  L(e, "unexpected end of the stream within a flow collection");
}
function Mg(e, t) {
  var r, n, i = Mi, a = !1, o = !1, s = t, l = 0, m = !1, c, f;
  if (f = e.input.charCodeAt(e.position), f === 124)
    n = !1;
  else if (f === 62)
    n = !0;
  else
    return !1;
  for (e.kind = "scalar", e.result = ""; f !== 0; )
    if (f = e.input.charCodeAt(++e.position), f === 43 || f === 45)
      Mi === i ? i = f === 43 ? as : bg : L(e, "repeat of a chomping mode identifier");
    else if ((c = Dg(f)) >= 0)
      c === 0 ? L(e, "bad explicit indentation width of a block scalar; it cannot be less than one") : o ? L(e, "repeat of an indentation width identifier") : (s = t + c - 1, o = !0);
    else
      break;
  if (Ut(f)) {
    do
      f = e.input.charCodeAt(++e.position);
    while (Ut(f));
    if (f === 35)
      do
        f = e.input.charCodeAt(++e.position);
      while (!Qe(f) && f !== 0);
  }
  for (; f !== 0; ) {
    for (Ha(e), e.lineIndent = 0, f = e.input.charCodeAt(e.position); (!o || e.lineIndent < s) && f === 32; )
      e.lineIndent++, f = e.input.charCodeAt(++e.position);
    if (!o && e.lineIndent > s && (s = e.lineIndent), Qe(f)) {
      l++;
      continue;
    }
    if (e.lineIndent < s) {
      i === as ? e.result += $t.repeat(`
`, a ? 1 + l : l) : i === Mi && a && (e.result += `
`);
      break;
    }
    for (n ? Ut(f) ? (m = !0, e.result += $t.repeat(`
`, a ? 1 + l : l)) : m ? (m = !1, e.result += $t.repeat(`
`, l + 1)) : l === 0 ? a && (e.result += " ") : e.result += $t.repeat(`
`, l) : e.result += $t.repeat(`
`, a ? 1 + l : l), a = !0, o = !0, l = 0, r = e.position; !Qe(f) && f !== 0; )
      f = e.input.charCodeAt(++e.position);
    mt(e, r, e.position, !1);
  }
  return !0;
}
function us(e, t) {
  var r, n = e.tag, i = e.anchor, a = [], o, s = !1, l;
  if (e.firstTabInLine !== -1) return !1;
  for (e.anchor !== null && (e.anchorMap[e.anchor] = a), l = e.input.charCodeAt(e.position); l !== 0 && (e.firstTabInLine !== -1 && (e.position = e.firstTabInLine, L(e, "tab characters must not be used in indentation")), !(l !== 45 || (o = e.input.charCodeAt(e.position + 1), !De(o)))); ) {
    if (s = !0, e.position++, oe(e, !0, -1) && e.lineIndent <= t) {
      a.push(null), l = e.input.charCodeAt(e.position);
      continue;
    }
    if (r = e.line, lr(e, t, Qc, !1, !0), a.push(e.result), oe(e, !0, -1), l = e.input.charCodeAt(e.position), (e.line === r || e.lineIndent > t) && l !== 0)
      L(e, "bad indentation of a sequence entry");
    else if (e.lineIndent < t)
      break;
  }
  return s ? (e.tag = n, e.anchor = i, e.kind = "sequence", e.result = a, !0) : !1;
}
function Bg(e, t, r) {
  var n, i, a, o, s, l, m = e.tag, c = e.anchor, f = {}, d = /* @__PURE__ */ Object.create(null), g = null, v = null, y = null, A = !1, S = !1, T;
  if (e.firstTabInLine !== -1) return !1;
  for (e.anchor !== null && (e.anchorMap[e.anchor] = f), T = e.input.charCodeAt(e.position); T !== 0; ) {
    if (!A && e.firstTabInLine !== -1 && (e.position = e.firstTabInLine, L(e, "tab characters must not be used in indentation")), n = e.input.charCodeAt(e.position + 1), a = e.line, (T === 63 || T === 58) && De(n))
      T === 63 ? (A && (Zt(e, f, d, g, v, null, o, s, l), g = v = y = null), S = !0, A = !0, i = !0) : A ? (A = !1, i = !0) : L(e, "incomplete explicit mapping pair; a key node is missed; or followed by a non-tabulated empty line"), e.position += 1, T = n;
    else {
      if (o = e.line, s = e.lineStart, l = e.position, !lr(e, r, Jc, !1, !0))
        break;
      if (e.line === a) {
        for (T = e.input.charCodeAt(e.position); Ut(T); )
          T = e.input.charCodeAt(++e.position);
        if (T === 58)
          T = e.input.charCodeAt(++e.position), De(T) || L(e, "a whitespace character is expected after the key-value separator within a block mapping"), A && (Zt(e, f, d, g, v, null, o, s, l), g = v = y = null), S = !0, A = !1, i = !1, g = e.tag, v = e.result;
        else if (S)
          L(e, "can not read an implicit mapping pair; a colon is missed");
        else
          return e.tag = m, e.anchor = c, !0;
      } else if (S)
        L(e, "can not read a block mapping entry; a multiline key may not be an implicit key");
      else
        return e.tag = m, e.anchor = c, !0;
    }
    if ((e.line === a || e.lineIndent > t) && (A && (o = e.line, s = e.lineStart, l = e.position), lr(e, t, qn, !0, i) && (A ? v = e.result : y = e.result), A || (Zt(e, f, d, g, v, y, o, s, l), g = v = y = null), oe(e, !0, -1), T = e.input.charCodeAt(e.position)), (e.line === a || e.lineIndent > t) && T !== 0)
      L(e, "bad indentation of a mapping entry");
    else if (e.lineIndent < t)
      break;
  }
  return A && Zt(e, f, d, g, v, null, o, s, l), S && (e.tag = m, e.anchor = c, e.kind = "mapping", e.result = f), S;
}
function jg(e) {
  var t, r = !1, n = !1, i, a, o;
  if (o = e.input.charCodeAt(e.position), o !== 33) return !1;
  if (e.tag !== null && L(e, "duplication of a tag property"), o = e.input.charCodeAt(++e.position), o === 60 ? (r = !0, o = e.input.charCodeAt(++e.position)) : o === 33 ? (n = !0, i = "!!", o = e.input.charCodeAt(++e.position)) : i = "!", t = e.position, r) {
    do
      o = e.input.charCodeAt(++e.position);
    while (o !== 0 && o !== 62);
    e.position < e.length ? (a = e.input.slice(t, e.position), o = e.input.charCodeAt(++e.position)) : L(e, "unexpected end of the stream within a verbatim tag");
  } else {
    for (; o !== 0 && !De(o); )
      o === 33 && (n ? L(e, "tag suffix cannot contain exclamation marks") : (i = e.input.slice(t - 1, e.position + 1), Zc.test(i) || L(e, "named tag handle cannot contain such characters"), n = !0, t = e.position + 1)), o = e.input.charCodeAt(++e.position);
    a = e.input.slice(t, e.position), Pg.test(a) && L(e, "tag suffix cannot contain flow indicator characters");
  }
  a && !eu.test(a) && L(e, "tag name cannot contain such characters: " + a);
  try {
    a = decodeURIComponent(a);
  } catch {
    L(e, "tag name is malformed: " + a);
  }
  return r ? e.tag = a : yt.call(e.tagMap, i) ? e.tag = e.tagMap[i] + a : i === "!" ? e.tag = "!" + a : i === "!!" ? e.tag = "tag:yaml.org,2002:" + a : L(e, 'undeclared tag handle "' + i + '"'), !0;
}
function Hg(e) {
  var t, r;
  if (r = e.input.charCodeAt(e.position), r !== 38) return !1;
  for (e.anchor !== null && L(e, "duplication of an anchor property"), r = e.input.charCodeAt(++e.position), t = e.position; r !== 0 && !De(r) && !Qt(r); )
    r = e.input.charCodeAt(++e.position);
  return e.position === t && L(e, "name of an anchor node must contain at least one character"), e.anchor = e.input.slice(t, e.position), !0;
}
function qg(e) {
  var t, r, n;
  if (n = e.input.charCodeAt(e.position), n !== 42) return !1;
  for (n = e.input.charCodeAt(++e.position), t = e.position; n !== 0 && !De(n) && !Qt(n); )
    n = e.input.charCodeAt(++e.position);
  return e.position === t && L(e, "name of an alias node must contain at least one character"), r = e.input.slice(t, e.position), yt.call(e.anchorMap, r) || L(e, 'unidentified alias "' + r + '"'), e.result = e.anchorMap[r], oe(e, !0, -1), !0;
}
function lr(e, t, r, n, i) {
  var a, o, s, l = 1, m = !1, c = !1, f, d, g, v, y, A;
  if (e.listener !== null && e.listener("open", e), e.tag = null, e.anchor = null, e.kind = null, e.result = null, a = o = s = qn === r || Qc === r, n && oe(e, !0, -1) && (m = !0, e.lineIndent > t ? l = 1 : e.lineIndent === t ? l = 0 : e.lineIndent < t && (l = -1)), l === 1)
    for (; jg(e) || Hg(e); )
      oe(e, !0, -1) ? (m = !0, s = a, e.lineIndent > t ? l = 1 : e.lineIndent === t ? l = 0 : e.lineIndent < t && (l = -1)) : s = !1;
  if (s && (s = m || i), (l === 1 || qn === r) && (Hn === r || Jc === r ? y = t : y = t + 1, A = e.position - e.lineStart, l === 1 ? s && (us(e, A) || Bg(e, A, y)) || kg(e, y) ? c = !0 : (o && Mg(e, y) || Lg(e, y) || Ug(e, y) ? c = !0 : qg(e) ? (c = !0, (e.tag !== null || e.anchor !== null) && L(e, "alias node should not have any properties")) : xg(e, y, Hn === r) && (c = !0, e.tag === null && (e.tag = "?")), e.anchor !== null && (e.anchorMap[e.anchor] = e.result)) : l === 0 && (c = s && us(e, A))), e.tag === null)
    e.anchor !== null && (e.anchorMap[e.anchor] = e.result);
  else if (e.tag === "?") {
    for (e.result !== null && e.kind !== "scalar" && L(e, 'unacceptable node kind for !<?> tag; it should be "scalar", not "' + e.kind + '"'), f = 0, d = e.implicitTypes.length; f < d; f += 1)
      if (v = e.implicitTypes[f], v.resolve(e.result)) {
        e.result = v.construct(e.result), e.tag = v.tag, e.anchor !== null && (e.anchorMap[e.anchor] = e.result);
        break;
      }
  } else if (e.tag !== "!") {
    if (yt.call(e.typeMap[e.kind || "fallback"], e.tag))
      v = e.typeMap[e.kind || "fallback"][e.tag];
    else
      for (v = null, g = e.typeMap.multi[e.kind || "fallback"], f = 0, d = g.length; f < d; f += 1)
        if (e.tag.slice(0, g[f].tag.length) === g[f].tag) {
          v = g[f];
          break;
        }
    v || L(e, "unknown tag !<" + e.tag + ">"), e.result !== null && v.kind !== e.kind && L(e, "unacceptable node kind for !<" + e.tag + '> tag; it should be "' + v.kind + '", not "' + e.kind + '"'), v.resolve(e.result, e.tag) ? (e.result = v.construct(e.result, e.tag), e.anchor !== null && (e.anchorMap[e.anchor] = e.result)) : L(e, "cannot resolve a node with !<" + e.tag + "> explicit tag");
  }
  return e.listener !== null && e.listener("close", e), e.tag !== null || e.anchor !== null || c;
}
function Gg(e) {
  var t = e.position, r, n, i, a = !1, o;
  for (e.version = null, e.checkLineBreaks = e.legacy, e.tagMap = /* @__PURE__ */ Object.create(null), e.anchorMap = /* @__PURE__ */ Object.create(null); (o = e.input.charCodeAt(e.position)) !== 0 && (oe(e, !0, -1), o = e.input.charCodeAt(e.position), !(e.lineIndent > 0 || o !== 37)); ) {
    for (a = !0, o = e.input.charCodeAt(++e.position), r = e.position; o !== 0 && !De(o); )
      o = e.input.charCodeAt(++e.position);
    for (n = e.input.slice(r, e.position), i = [], n.length < 1 && L(e, "directive name must not be less than one character in length"); o !== 0; ) {
      for (; Ut(o); )
        o = e.input.charCodeAt(++e.position);
      if (o === 35) {
        do
          o = e.input.charCodeAt(++e.position);
        while (o !== 0 && !Qe(o));
        break;
      }
      if (Qe(o)) break;
      for (r = e.position; o !== 0 && !De(o); )
        o = e.input.charCodeAt(++e.position);
      i.push(e.input.slice(r, e.position));
    }
    o !== 0 && Ha(e), yt.call(ls, n) ? ls[n](e, n, i) : Gn(e, 'unknown document directive "' + n + '"');
  }
  if (oe(e, !0, -1), e.lineIndent === 0 && e.input.charCodeAt(e.position) === 45 && e.input.charCodeAt(e.position + 1) === 45 && e.input.charCodeAt(e.position + 2) === 45 ? (e.position += 3, oe(e, !0, -1)) : a && L(e, "directives end mark is expected"), lr(e, e.lineIndent - 1, qn, !1, !0), oe(e, !0, -1), e.checkLineBreaks && Og.test(e.input.slice(t, e.position)) && Gn(e, "non-ASCII line breaks are interpreted as content"), e.documents.push(e.result), e.position === e.lineStart && ni(e)) {
    e.input.charCodeAt(e.position) === 46 && (e.position += 3, oe(e, !0, -1));
    return;
  }
  if (e.position < e.length - 1)
    L(e, "end of the stream or a document separator is expected");
  else
    return;
}
function au(e, t) {
  e = String(e), t = t || {}, e.length !== 0 && (e.charCodeAt(e.length - 1) !== 10 && e.charCodeAt(e.length - 1) !== 13 && (e += `
`), e.charCodeAt(0) === 65279 && (e = e.slice(1)));
  var r = new Fg(e, t), n = e.indexOf("\0");
  for (n !== -1 && (r.position = n, L(r, "null byte is not allowed in input")), r.input += "\0"; r.input.charCodeAt(r.position) === 32; )
    r.lineIndent += 1, r.position += 1;
  for (; r.position < r.length - 1; )
    Gg(r);
  return r.documents;
}
function Vg(e, t, r) {
  t !== null && typeof t == "object" && typeof r > "u" && (r = t, t = null);
  var n = au(e, r);
  if (typeof t != "function")
    return n;
  for (var i = 0, a = n.length; i < a; i += 1)
    t(n[i]);
}
function Wg(e, t) {
  var r = au(e, t);
  if (r.length !== 0) {
    if (r.length === 1)
      return r[0];
    throw new Kc("expected a single document in the stream, but found more");
  }
}
Ma.loadAll = Vg;
Ma.load = Wg;
var ou = {}, ii = Ve, Qr = Jr, Yg = ja, su = Object.prototype.toString, lu = Object.prototype.hasOwnProperty, Ga = 65279, zg = 9, xr = 10, Xg = 13, Kg = 32, Jg = 33, Qg = 34, ga = 35, Zg = 37, e0 = 38, t0 = 39, r0 = 42, cu = 44, n0 = 45, Vn = 58, i0 = 61, a0 = 62, o0 = 63, s0 = 64, uu = 91, fu = 93, l0 = 96, du = 123, c0 = 124, hu = 125, _e = {};
_e[0] = "\\0";
_e[7] = "\\a";
_e[8] = "\\b";
_e[9] = "\\t";
_e[10] = "\\n";
_e[11] = "\\v";
_e[12] = "\\f";
_e[13] = "\\r";
_e[27] = "\\e";
_e[34] = '\\"';
_e[92] = "\\\\";
_e[133] = "\\N";
_e[160] = "\\_";
_e[8232] = "\\L";
_e[8233] = "\\P";
var u0 = [
  "y",
  "Y",
  "yes",
  "Yes",
  "YES",
  "on",
  "On",
  "ON",
  "n",
  "N",
  "no",
  "No",
  "NO",
  "off",
  "Off",
  "OFF"
], f0 = /^[-+]?[0-9_]+(?::[0-9_]+)+(?:\.[0-9_]*)?$/;
function d0(e, t) {
  var r, n, i, a, o, s, l;
  if (t === null) return {};
  for (r = {}, n = Object.keys(t), i = 0, a = n.length; i < a; i += 1)
    o = n[i], s = String(t[o]), o.slice(0, 2) === "!!" && (o = "tag:yaml.org,2002:" + o.slice(2)), l = e.compiledTypeMap.fallback[o], l && lu.call(l.styleAliases, s) && (s = l.styleAliases[s]), r[o] = s;
  return r;
}
function h0(e) {
  var t, r, n;
  if (t = e.toString(16).toUpperCase(), e <= 255)
    r = "x", n = 2;
  else if (e <= 65535)
    r = "u", n = 4;
  else if (e <= 4294967295)
    r = "U", n = 8;
  else
    throw new Qr("code point within a string may not be greater than 0xFFFFFFFF");
  return "\\" + r + ii.repeat("0", n - t.length) + t;
}
var p0 = 1, Lr = 2;
function m0(e) {
  this.schema = e.schema || Yg, this.indent = Math.max(1, e.indent || 2), this.noArrayIndent = e.noArrayIndent || !1, this.skipInvalid = e.skipInvalid || !1, this.flowLevel = ii.isNothing(e.flowLevel) ? -1 : e.flowLevel, this.styleMap = d0(this.schema, e.styles || null), this.sortKeys = e.sortKeys || !1, this.lineWidth = e.lineWidth || 80, this.noRefs = e.noRefs || !1, this.noCompatMode = e.noCompatMode || !1, this.condenseFlow = e.condenseFlow || !1, this.quotingType = e.quotingType === '"' ? Lr : p0, this.forceQuotes = e.forceQuotes || !1, this.replacer = typeof e.replacer == "function" ? e.replacer : null, this.implicitTypes = this.schema.compiledImplicit, this.explicitTypes = this.schema.compiledExplicit, this.tag = null, this.result = "", this.duplicates = [], this.usedDuplicates = null;
}
function fs(e, t) {
  for (var r = ii.repeat(" ", t), n = 0, i = -1, a = "", o, s = e.length; n < s; )
    i = e.indexOf(`
`, n), i === -1 ? (o = e.slice(n), n = s) : (o = e.slice(n, i + 1), n = i + 1), o.length && o !== `
` && (a += r), a += o;
  return a;
}
function Ea(e, t) {
  return `
` + ii.repeat(" ", e.indent * t);
}
function g0(e, t) {
  var r, n, i;
  for (r = 0, n = e.implicitTypes.length; r < n; r += 1)
    if (i = e.implicitTypes[r], i.resolve(t))
      return !0;
  return !1;
}
function Wn(e) {
  return e === Kg || e === zg;
}
function Ur(e) {
  return 32 <= e && e <= 126 || 161 <= e && e <= 55295 && e !== 8232 && e !== 8233 || 57344 <= e && e <= 65533 && e !== Ga || 65536 <= e && e <= 1114111;
}
function ds(e) {
  return Ur(e) && e !== Ga && e !== Xg && e !== xr;
}
function hs(e, t, r) {
  var n = ds(e), i = n && !Wn(e);
  return (
    // ns-plain-safe
    (r ? (
      // c = flow-in
      n
    ) : n && e !== cu && e !== uu && e !== fu && e !== du && e !== hu) && e !== ga && !(t === Vn && !i) || ds(t) && !Wn(t) && e === ga || t === Vn && i
  );
}
function E0(e) {
  return Ur(e) && e !== Ga && !Wn(e) && e !== n0 && e !== o0 && e !== Vn && e !== cu && e !== uu && e !== fu && e !== du && e !== hu && e !== ga && e !== e0 && e !== r0 && e !== Jg && e !== c0 && e !== i0 && e !== a0 && e !== t0 && e !== Qg && e !== Zg && e !== s0 && e !== l0;
}
function y0(e) {
  return !Wn(e) && e !== Vn;
}
function Sr(e, t) {
  var r = e.charCodeAt(t), n;
  return r >= 55296 && r <= 56319 && t + 1 < e.length && (n = e.charCodeAt(t + 1), n >= 56320 && n <= 57343) ? (r - 55296) * 1024 + n - 56320 + 65536 : r;
}
function pu(e) {
  var t = /^\n* /;
  return t.test(e);
}
var mu = 1, ya = 2, gu = 3, Eu = 4, Kt = 5;
function v0(e, t, r, n, i, a, o, s) {
  var l, m = 0, c = null, f = !1, d = !1, g = n !== -1, v = -1, y = E0(Sr(e, 0)) && y0(Sr(e, e.length - 1));
  if (t || o)
    for (l = 0; l < e.length; m >= 65536 ? l += 2 : l++) {
      if (m = Sr(e, l), !Ur(m))
        return Kt;
      y = y && hs(m, c, s), c = m;
    }
  else {
    for (l = 0; l < e.length; m >= 65536 ? l += 2 : l++) {
      if (m = Sr(e, l), m === xr)
        f = !0, g && (d = d || // Foldable line = too long, and not more-indented.
        l - v - 1 > n && e[v + 1] !== " ", v = l);
      else if (!Ur(m))
        return Kt;
      y = y && hs(m, c, s), c = m;
    }
    d = d || g && l - v - 1 > n && e[v + 1] !== " ";
  }
  return !f && !d ? y && !o && !i(e) ? mu : a === Lr ? Kt : ya : r > 9 && pu(e) ? Kt : o ? a === Lr ? Kt : ya : d ? Eu : gu;
}
function w0(e, t, r, n, i) {
  e.dump = function() {
    if (t.length === 0)
      return e.quotingType === Lr ? '""' : "''";
    if (!e.noCompatMode && (u0.indexOf(t) !== -1 || f0.test(t)))
      return e.quotingType === Lr ? '"' + t + '"' : "'" + t + "'";
    var a = e.indent * Math.max(1, r), o = e.lineWidth === -1 ? -1 : Math.max(Math.min(e.lineWidth, 40), e.lineWidth - a), s = n || e.flowLevel > -1 && r >= e.flowLevel;
    function l(m) {
      return g0(e, m);
    }
    switch (v0(
      t,
      s,
      e.indent,
      o,
      l,
      e.quotingType,
      e.forceQuotes && !n,
      i
    )) {
      case mu:
        return t;
      case ya:
        return "'" + t.replace(/'/g, "''") + "'";
      case gu:
        return "|" + ps(t, e.indent) + ms(fs(t, a));
      case Eu:
        return ">" + ps(t, e.indent) + ms(fs(_0(t, o), a));
      case Kt:
        return '"' + A0(t) + '"';
      default:
        throw new Qr("impossible error: invalid scalar style");
    }
  }();
}
function ps(e, t) {
  var r = pu(e) ? String(t) : "", n = e[e.length - 1] === `
`, i = n && (e[e.length - 2] === `
` || e === `
`), a = i ? "+" : n ? "" : "-";
  return r + a + `
`;
}
function ms(e) {
  return e[e.length - 1] === `
` ? e.slice(0, -1) : e;
}
function _0(e, t) {
  for (var r = /(\n+)([^\n]*)/g, n = function() {
    var m = e.indexOf(`
`);
    return m = m !== -1 ? m : e.length, r.lastIndex = m, gs(e.slice(0, m), t);
  }(), i = e[0] === `
` || e[0] === " ", a, o; o = r.exec(e); ) {
    var s = o[1], l = o[2];
    a = l[0] === " ", n += s + (!i && !a && l !== "" ? `
` : "") + gs(l, t), i = a;
  }
  return n;
}
function gs(e, t) {
  if (e === "" || e[0] === " ") return e;
  for (var r = / [^ ]/g, n, i = 0, a, o = 0, s = 0, l = ""; n = r.exec(e); )
    s = n.index, s - i > t && (a = o > i ? o : s, l += `
` + e.slice(i, a), i = a + 1), o = s;
  return l += `
`, e.length - i > t && o > i ? l += e.slice(i, o) + `
` + e.slice(o + 1) : l += e.slice(i), l.slice(1);
}
function A0(e) {
  for (var t = "", r = 0, n, i = 0; i < e.length; r >= 65536 ? i += 2 : i++)
    r = Sr(e, i), n = _e[r], !n && Ur(r) ? (t += e[i], r >= 65536 && (t += e[i + 1])) : t += n || h0(r);
  return t;
}
function T0(e, t, r) {
  var n = "", i = e.tag, a, o, s;
  for (a = 0, o = r.length; a < o; a += 1)
    s = r[a], e.replacer && (s = e.replacer.call(r, String(a), s)), (it(e, t, s, !1, !1) || typeof s > "u" && it(e, t, null, !1, !1)) && (n !== "" && (n += "," + (e.condenseFlow ? "" : " ")), n += e.dump);
  e.tag = i, e.dump = "[" + n + "]";
}
function Es(e, t, r, n) {
  var i = "", a = e.tag, o, s, l;
  for (o = 0, s = r.length; o < s; o += 1)
    l = r[o], e.replacer && (l = e.replacer.call(r, String(o), l)), (it(e, t + 1, l, !0, !0, !1, !0) || typeof l > "u" && it(e, t + 1, null, !0, !0, !1, !0)) && ((!n || i !== "") && (i += Ea(e, t)), e.dump && xr === e.dump.charCodeAt(0) ? i += "-" : i += "- ", i += e.dump);
  e.tag = a, e.dump = i || "[]";
}
function S0(e, t, r) {
  var n = "", i = e.tag, a = Object.keys(r), o, s, l, m, c;
  for (o = 0, s = a.length; o < s; o += 1)
    c = "", n !== "" && (c += ", "), e.condenseFlow && (c += '"'), l = a[o], m = r[l], e.replacer && (m = e.replacer.call(r, l, m)), it(e, t, l, !1, !1) && (e.dump.length > 1024 && (c += "? "), c += e.dump + (e.condenseFlow ? '"' : "") + ":" + (e.condenseFlow ? "" : " "), it(e, t, m, !1, !1) && (c += e.dump, n += c));
  e.tag = i, e.dump = "{" + n + "}";
}
function C0(e, t, r, n) {
  var i = "", a = e.tag, o = Object.keys(r), s, l, m, c, f, d;
  if (e.sortKeys === !0)
    o.sort();
  else if (typeof e.sortKeys == "function")
    o.sort(e.sortKeys);
  else if (e.sortKeys)
    throw new Qr("sortKeys must be a boolean or a function");
  for (s = 0, l = o.length; s < l; s += 1)
    d = "", (!n || i !== "") && (d += Ea(e, t)), m = o[s], c = r[m], e.replacer && (c = e.replacer.call(r, m, c)), it(e, t + 1, m, !0, !0, !0) && (f = e.tag !== null && e.tag !== "?" || e.dump && e.dump.length > 1024, f && (e.dump && xr === e.dump.charCodeAt(0) ? d += "?" : d += "? "), d += e.dump, f && (d += Ea(e, t)), it(e, t + 1, c, !0, f) && (e.dump && xr === e.dump.charCodeAt(0) ? d += ":" : d += ": ", d += e.dump, i += d));
  e.tag = a, e.dump = i || "{}";
}
function ys(e, t, r) {
  var n, i, a, o, s, l;
  for (i = r ? e.explicitTypes : e.implicitTypes, a = 0, o = i.length; a < o; a += 1)
    if (s = i[a], (s.instanceOf || s.predicate) && (!s.instanceOf || typeof t == "object" && t instanceof s.instanceOf) && (!s.predicate || s.predicate(t))) {
      if (r ? s.multi && s.representName ? e.tag = s.representName(t) : e.tag = s.tag : e.tag = "?", s.represent) {
        if (l = e.styleMap[s.tag] || s.defaultStyle, su.call(s.represent) === "[object Function]")
          n = s.represent(t, l);
        else if (lu.call(s.represent, l))
          n = s.represent[l](t, l);
        else
          throw new Qr("!<" + s.tag + '> tag resolver accepts not "' + l + '" style');
        e.dump = n;
      }
      return !0;
    }
  return !1;
}
function it(e, t, r, n, i, a, o) {
  e.tag = null, e.dump = r, ys(e, r, !1) || ys(e, r, !0);
  var s = su.call(e.dump), l = n, m;
  n && (n = e.flowLevel < 0 || e.flowLevel > t);
  var c = s === "[object Object]" || s === "[object Array]", f, d;
  if (c && (f = e.duplicates.indexOf(r), d = f !== -1), (e.tag !== null && e.tag !== "?" || d || e.indent !== 2 && t > 0) && (i = !1), d && e.usedDuplicates[f])
    e.dump = "*ref_" + f;
  else {
    if (c && d && !e.usedDuplicates[f] && (e.usedDuplicates[f] = !0), s === "[object Object]")
      n && Object.keys(e.dump).length !== 0 ? (C0(e, t, e.dump, i), d && (e.dump = "&ref_" + f + e.dump)) : (S0(e, t, e.dump), d && (e.dump = "&ref_" + f + " " + e.dump));
    else if (s === "[object Array]")
      n && e.dump.length !== 0 ? (e.noArrayIndent && !o && t > 0 ? Es(e, t - 1, e.dump, i) : Es(e, t, e.dump, i), d && (e.dump = "&ref_" + f + e.dump)) : (T0(e, t, e.dump), d && (e.dump = "&ref_" + f + " " + e.dump));
    else if (s === "[object String]")
      e.tag !== "?" && w0(e, e.dump, t, a, l);
    else {
      if (s === "[object Undefined]")
        return !1;
      if (e.skipInvalid) return !1;
      throw new Qr("unacceptable kind of an object to dump " + s);
    }
    e.tag !== null && e.tag !== "?" && (m = encodeURI(
      e.tag[0] === "!" ? e.tag.slice(1) : e.tag
    ).replace(/!/g, "%21"), e.tag[0] === "!" ? m = "!" + m : m.slice(0, 18) === "tag:yaml.org,2002:" ? m = "!!" + m.slice(18) : m = "!<" + m + ">", e.dump = m + " " + e.dump);
  }
  return !0;
}
function b0(e, t) {
  var r = [], n = [], i, a;
  for (va(e, r, n), i = 0, a = n.length; i < a; i += 1)
    t.duplicates.push(r[n[i]]);
  t.usedDuplicates = new Array(a);
}
function va(e, t, r) {
  var n, i, a;
  if (e !== null && typeof e == "object")
    if (i = t.indexOf(e), i !== -1)
      r.indexOf(i) === -1 && r.push(i);
    else if (t.push(e), Array.isArray(e))
      for (i = 0, a = e.length; i < a; i += 1)
        va(e[i], t, r);
    else
      for (n = Object.keys(e), i = 0, a = n.length; i < a; i += 1)
        va(e[n[i]], t, r);
}
function R0(e, t) {
  t = t || {};
  var r = new m0(t);
  r.noRefs || b0(e, r);
  var n = e;
  return r.replacer && (n = r.replacer.call({ "": n }, "", n)), it(r, 0, n, !0, !0) ? r.dump + `
` : "";
}
ou.dump = R0;
var yu = Ma, O0 = ou;
function Va(e, t) {
  return function() {
    throw new Error("Function yaml." + e + " is removed in js-yaml 4. Use yaml." + t + " instead, which is now safe by default.");
  };
}
Ee.Type = Pe;
Ee.Schema = Ic;
Ee.FAILSAFE_SCHEMA = Fc;
Ee.JSON_SCHEMA = Bc;
Ee.CORE_SCHEMA = jc;
Ee.DEFAULT_SCHEMA = ja;
Ee.load = yu.load;
Ee.loadAll = yu.loadAll;
Ee.dump = O0.dump;
Ee.YAMLException = Jr;
Ee.types = {
  binary: Wc,
  float: Mc,
  map: $c,
  null: xc,
  pairs: zc,
  set: Xc,
  timestamp: Gc,
  bool: Lc,
  int: Uc,
  merge: Vc,
  omap: Yc,
  seq: Dc,
  str: Nc
};
Ee.safeLoad = Va("safeLoad", "load");
Ee.safeLoadAll = Va("safeLoadAll", "loadAll");
Ee.safeDump = Va("safeDump", "dump");
var ai = {};
Object.defineProperty(ai, "__esModule", { value: !0 });
ai.Lazy = void 0;
class P0 {
  constructor(t) {
    this._value = null, this.creator = t;
  }
  get hasValue() {
    return this.creator == null;
  }
  get value() {
    if (this.creator == null)
      return this._value;
    const t = this.creator();
    return this.value = t, t;
  }
  set value(t) {
    this._value = t, this.creator = null;
  }
}
ai.Lazy = P0;
var wa = { exports: {} };
const I0 = "2.0.0", vu = 256, N0 = Number.MAX_SAFE_INTEGER || /* istanbul ignore next */
9007199254740991, D0 = 16, $0 = vu - 6, F0 = [
  "major",
  "premajor",
  "minor",
  "preminor",
  "patch",
  "prepatch",
  "prerelease"
];
var oi = {
  MAX_LENGTH: vu,
  MAX_SAFE_COMPONENT_LENGTH: D0,
  MAX_SAFE_BUILD_LENGTH: $0,
  MAX_SAFE_INTEGER: N0,
  RELEASE_TYPES: F0,
  SEMVER_SPEC_VERSION: I0,
  FLAG_INCLUDE_PRERELEASE: 1,
  FLAG_LOOSE: 2
};
const x0 = typeof process == "object" && process.env && process.env.NODE_DEBUG && /\bsemver\b/i.test(process.env.NODE_DEBUG) ? (...e) => console.error("SEMVER", ...e) : () => {
};
var si = x0;
(function(e, t) {
  const {
    MAX_SAFE_COMPONENT_LENGTH: r,
    MAX_SAFE_BUILD_LENGTH: n,
    MAX_LENGTH: i
  } = oi, a = si;
  t = e.exports = {};
  const o = t.re = [], s = t.safeRe = [], l = t.src = [], m = t.safeSrc = [], c = t.t = {};
  let f = 0;
  const d = "[a-zA-Z0-9-]", g = [
    ["\\s", 1],
    ["\\d", i],
    [d, n]
  ], v = (A) => {
    for (const [S, T] of g)
      A = A.split(`${S}*`).join(`${S}{0,${T}}`).split(`${S}+`).join(`${S}{1,${T}}`);
    return A;
  }, y = (A, S, T) => {
    const D = v(S), x = f++;
    a(A, x, S), c[A] = x, l[x] = S, m[x] = D, o[x] = new RegExp(S, T ? "g" : void 0), s[x] = new RegExp(D, T ? "g" : void 0);
  };
  y("NUMERICIDENTIFIER", "0|[1-9]\\d*"), y("NUMERICIDENTIFIERLOOSE", "\\d+"), y("NONNUMERICIDENTIFIER", `\\d*[a-zA-Z-]${d}*`), y("MAINVERSION", `(${l[c.NUMERICIDENTIFIER]})\\.(${l[c.NUMERICIDENTIFIER]})\\.(${l[c.NUMERICIDENTIFIER]})`), y("MAINVERSIONLOOSE", `(${l[c.NUMERICIDENTIFIERLOOSE]})\\.(${l[c.NUMERICIDENTIFIERLOOSE]})\\.(${l[c.NUMERICIDENTIFIERLOOSE]})`), y("PRERELEASEIDENTIFIER", `(?:${l[c.NONNUMERICIDENTIFIER]}|${l[c.NUMERICIDENTIFIER]})`), y("PRERELEASEIDENTIFIERLOOSE", `(?:${l[c.NONNUMERICIDENTIFIER]}|${l[c.NUMERICIDENTIFIERLOOSE]})`), y("PRERELEASE", `(?:-(${l[c.PRERELEASEIDENTIFIER]}(?:\\.${l[c.PRERELEASEIDENTIFIER]})*))`), y("PRERELEASELOOSE", `(?:-?(${l[c.PRERELEASEIDENTIFIERLOOSE]}(?:\\.${l[c.PRERELEASEIDENTIFIERLOOSE]})*))`), y("BUILDIDENTIFIER", `${d}+`), y("BUILD", `(?:\\+(${l[c.BUILDIDENTIFIER]}(?:\\.${l[c.BUILDIDENTIFIER]})*))`), y("FULLPLAIN", `v?${l[c.MAINVERSION]}${l[c.PRERELEASE]}?${l[c.BUILD]}?`), y("FULL", `^${l[c.FULLPLAIN]}$`), y("LOOSEPLAIN", `[v=\\s]*${l[c.MAINVERSIONLOOSE]}${l[c.PRERELEASELOOSE]}?${l[c.BUILD]}?`), y("LOOSE", `^${l[c.LOOSEPLAIN]}$`), y("GTLT", "((?:<|>)?=?)"), y("XRANGEIDENTIFIERLOOSE", `${l[c.NUMERICIDENTIFIERLOOSE]}|x|X|\\*`), y("XRANGEIDENTIFIER", `${l[c.NUMERICIDENTIFIER]}|x|X|\\*`), y("XRANGEPLAIN", `[v=\\s]*(${l[c.XRANGEIDENTIFIER]})(?:\\.(${l[c.XRANGEIDENTIFIER]})(?:\\.(${l[c.XRANGEIDENTIFIER]})(?:${l[c.PRERELEASE]})?${l[c.BUILD]}?)?)?`), y("XRANGEPLAINLOOSE", `[v=\\s]*(${l[c.XRANGEIDENTIFIERLOOSE]})(?:\\.(${l[c.XRANGEIDENTIFIERLOOSE]})(?:\\.(${l[c.XRANGEIDENTIFIERLOOSE]})(?:${l[c.PRERELEASELOOSE]})?${l[c.BUILD]}?)?)?`), y("XRANGE", `^${l[c.GTLT]}\\s*${l[c.XRANGEPLAIN]}$`), y("XRANGELOOSE", `^${l[c.GTLT]}\\s*${l[c.XRANGEPLAINLOOSE]}$`), y("COERCEPLAIN", `(^|[^\\d])(\\d{1,${r}})(?:\\.(\\d{1,${r}}))?(?:\\.(\\d{1,${r}}))?`), y("COERCE", `${l[c.COERCEPLAIN]}(?:$|[^\\d])`), y("COERCEFULL", l[c.COERCEPLAIN] + `(?:${l[c.PRERELEASE]})?(?:${l[c.BUILD]})?(?:$|[^\\d])`), y("COERCERTL", l[c.COERCE], !0), y("COERCERTLFULL", l[c.COERCEFULL], !0), y("LONETILDE", "(?:~>?)"), y("TILDETRIM", `(\\s*)${l[c.LONETILDE]}\\s+`, !0), t.tildeTrimReplace = "$1~", y("TILDE", `^${l[c.LONETILDE]}${l[c.XRANGEPLAIN]}$`), y("TILDELOOSE", `^${l[c.LONETILDE]}${l[c.XRANGEPLAINLOOSE]}$`), y("LONECARET", "(?:\\^)"), y("CARETTRIM", `(\\s*)${l[c.LONECARET]}\\s+`, !0), t.caretTrimReplace = "$1^", y("CARET", `^${l[c.LONECARET]}${l[c.XRANGEPLAIN]}$`), y("CARETLOOSE", `^${l[c.LONECARET]}${l[c.XRANGEPLAINLOOSE]}$`), y("COMPARATORLOOSE", `^${l[c.GTLT]}\\s*(${l[c.LOOSEPLAIN]})$|^$`), y("COMPARATOR", `^${l[c.GTLT]}\\s*(${l[c.FULLPLAIN]})$|^$`), y("COMPARATORTRIM", `(\\s*)${l[c.GTLT]}\\s*(${l[c.LOOSEPLAIN]}|${l[c.XRANGEPLAIN]})`, !0), t.comparatorTrimReplace = "$1$2$3", y("HYPHENRANGE", `^\\s*(${l[c.XRANGEPLAIN]})\\s+-\\s+(${l[c.XRANGEPLAIN]})\\s*$`), y("HYPHENRANGELOOSE", `^\\s*(${l[c.XRANGEPLAINLOOSE]})\\s+-\\s+(${l[c.XRANGEPLAINLOOSE]})\\s*$`), y("STAR", "(<|>)?=?\\s*\\*"), y("GTE0", "^\\s*>=\\s*0\\.0\\.0\\s*$"), y("GTE0PRE", "^\\s*>=\\s*0\\.0\\.0-0\\s*$");
})(wa, wa.exports);
var Zr = wa.exports;
const L0 = Object.freeze({ loose: !0 }), U0 = Object.freeze({}), k0 = (e) => e ? typeof e != "object" ? L0 : e : U0;
var Wa = k0;
const vs = /^[0-9]+$/, wu = (e, t) => {
  if (typeof e == "number" && typeof t == "number")
    return e === t ? 0 : e < t ? -1 : 1;
  const r = vs.test(e), n = vs.test(t);
  return r && n && (e = +e, t = +t), e === t ? 0 : r && !n ? -1 : n && !r ? 1 : e < t ? -1 : 1;
}, M0 = (e, t) => wu(t, e);
var _u = {
  compareIdentifiers: wu,
  rcompareIdentifiers: M0
};
const _n = si, { MAX_LENGTH: ws, MAX_SAFE_INTEGER: An } = oi, { safeRe: Tn, t: Sn } = Zr, B0 = Wa, { compareIdentifiers: Bi } = _u;
let j0 = class Je {
  constructor(t, r) {
    if (r = B0(r), t instanceof Je) {
      if (t.loose === !!r.loose && t.includePrerelease === !!r.includePrerelease)
        return t;
      t = t.version;
    } else if (typeof t != "string")
      throw new TypeError(`Invalid version. Must be a string. Got type "${typeof t}".`);
    if (t.length > ws)
      throw new TypeError(
        `version is longer than ${ws} characters`
      );
    _n("SemVer", t, r), this.options = r, this.loose = !!r.loose, this.includePrerelease = !!r.includePrerelease;
    const n = t.trim().match(r.loose ? Tn[Sn.LOOSE] : Tn[Sn.FULL]);
    if (!n)
      throw new TypeError(`Invalid Version: ${t}`);
    if (this.raw = t, this.major = +n[1], this.minor = +n[2], this.patch = +n[3], this.major > An || this.major < 0)
      throw new TypeError("Invalid major version");
    if (this.minor > An || this.minor < 0)
      throw new TypeError("Invalid minor version");
    if (this.patch > An || this.patch < 0)
      throw new TypeError("Invalid patch version");
    n[4] ? this.prerelease = n[4].split(".").map((i) => {
      if (/^[0-9]+$/.test(i)) {
        const a = +i;
        if (a >= 0 && a < An)
          return a;
      }
      return i;
    }) : this.prerelease = [], this.build = n[5] ? n[5].split(".") : [], this.format();
  }
  format() {
    return this.version = `${this.major}.${this.minor}.${this.patch}`, this.prerelease.length && (this.version += `-${this.prerelease.join(".")}`), this.version;
  }
  toString() {
    return this.version;
  }
  compare(t) {
    if (_n("SemVer.compare", this.version, this.options, t), !(t instanceof Je)) {
      if (typeof t == "string" && t === this.version)
        return 0;
      t = new Je(t, this.options);
    }
    return t.version === this.version ? 0 : this.compareMain(t) || this.comparePre(t);
  }
  compareMain(t) {
    return t instanceof Je || (t = new Je(t, this.options)), this.major < t.major ? -1 : this.major > t.major ? 1 : this.minor < t.minor ? -1 : this.minor > t.minor ? 1 : this.patch < t.patch ? -1 : this.patch > t.patch ? 1 : 0;
  }
  comparePre(t) {
    if (t instanceof Je || (t = new Je(t, this.options)), this.prerelease.length && !t.prerelease.length)
      return -1;
    if (!this.prerelease.length && t.prerelease.length)
      return 1;
    if (!this.prerelease.length && !t.prerelease.length)
      return 0;
    let r = 0;
    do {
      const n = this.prerelease[r], i = t.prerelease[r];
      if (_n("prerelease compare", r, n, i), n === void 0 && i === void 0)
        return 0;
      if (i === void 0)
        return 1;
      if (n === void 0)
        return -1;
      if (n === i)
        continue;
      return Bi(n, i);
    } while (++r);
  }
  compareBuild(t) {
    t instanceof Je || (t = new Je(t, this.options));
    let r = 0;
    do {
      const n = this.build[r], i = t.build[r];
      if (_n("build compare", r, n, i), n === void 0 && i === void 0)
        return 0;
      if (i === void 0)
        return 1;
      if (n === void 0)
        return -1;
      if (n === i)
        continue;
      return Bi(n, i);
    } while (++r);
  }
  // preminor will bump the version up to the next minor release, and immediately
  // down to pre-release. premajor and prepatch work the same way.
  inc(t, r, n) {
    if (t.startsWith("pre")) {
      if (!r && n === !1)
        throw new Error("invalid increment argument: identifier is empty");
      if (r) {
        const i = `-${r}`.match(this.options.loose ? Tn[Sn.PRERELEASELOOSE] : Tn[Sn.PRERELEASE]);
        if (!i || i[1] !== r)
          throw new Error(`invalid identifier: ${r}`);
      }
    }
    switch (t) {
      case "premajor":
        this.prerelease.length = 0, this.patch = 0, this.minor = 0, this.major++, this.inc("pre", r, n);
        break;
      case "preminor":
        this.prerelease.length = 0, this.patch = 0, this.minor++, this.inc("pre", r, n);
        break;
      case "prepatch":
        this.prerelease.length = 0, this.inc("patch", r, n), this.inc("pre", r, n);
        break;
      case "prerelease":
        this.prerelease.length === 0 && this.inc("patch", r, n), this.inc("pre", r, n);
        break;
      case "release":
        if (this.prerelease.length === 0)
          throw new Error(`version ${this.raw} is not a prerelease`);
        this.prerelease.length = 0;
        break;
      case "major":
        (this.minor !== 0 || this.patch !== 0 || this.prerelease.length === 0) && this.major++, this.minor = 0, this.patch = 0, this.prerelease = [];
        break;
      case "minor":
        (this.patch !== 0 || this.prerelease.length === 0) && this.minor++, this.patch = 0, this.prerelease = [];
        break;
      case "patch":
        this.prerelease.length === 0 && this.patch++, this.prerelease = [];
        break;
      case "pre": {
        const i = Number(n) ? 1 : 0;
        if (this.prerelease.length === 0)
          this.prerelease = [i];
        else {
          let a = this.prerelease.length;
          for (; --a >= 0; )
            typeof this.prerelease[a] == "number" && (this.prerelease[a]++, a = -2);
          if (a === -1) {
            if (r === this.prerelease.join(".") && n === !1)
              throw new Error("invalid increment argument: identifier already exists");
            this.prerelease.push(i);
          }
        }
        if (r) {
          let a = [r, i];
          n === !1 && (a = [r]), Bi(this.prerelease[0], r) === 0 ? isNaN(this.prerelease[1]) && (this.prerelease = a) : this.prerelease = a;
        }
        break;
      }
      default:
        throw new Error(`invalid increment argument: ${t}`);
    }
    return this.raw = this.format(), this.build.length && (this.raw += `+${this.build.join(".")}`), this;
  }
};
var Ie = j0;
const _s = Ie, H0 = (e, t, r = !1) => {
  if (e instanceof _s)
    return e;
  try {
    return new _s(e, t);
  } catch (n) {
    if (!r)
      return null;
    throw n;
  }
};
var fr = H0;
const q0 = fr, G0 = (e, t) => {
  const r = q0(e, t);
  return r ? r.version : null;
};
var V0 = G0;
const W0 = fr, Y0 = (e, t) => {
  const r = W0(e.trim().replace(/^[=v]+/, ""), t);
  return r ? r.version : null;
};
var z0 = Y0;
const As = Ie, X0 = (e, t, r, n, i) => {
  typeof r == "string" && (i = n, n = r, r = void 0);
  try {
    return new As(
      e instanceof As ? e.version : e,
      r
    ).inc(t, n, i).version;
  } catch {
    return null;
  }
};
var K0 = X0;
const Ts = fr, J0 = (e, t) => {
  const r = Ts(e, null, !0), n = Ts(t, null, !0), i = r.compare(n);
  if (i === 0)
    return null;
  const a = i > 0, o = a ? r : n, s = a ? n : r, l = !!o.prerelease.length;
  if (!!s.prerelease.length && !l) {
    if (!s.patch && !s.minor)
      return "major";
    if (s.compareMain(o) === 0)
      return s.minor && !s.patch ? "minor" : "patch";
  }
  const c = l ? "pre" : "";
  return r.major !== n.major ? c + "major" : r.minor !== n.minor ? c + "minor" : r.patch !== n.patch ? c + "patch" : "prerelease";
};
var Q0 = J0;
const Z0 = Ie, eE = (e, t) => new Z0(e, t).major;
var tE = eE;
const rE = Ie, nE = (e, t) => new rE(e, t).minor;
var iE = nE;
const aE = Ie, oE = (e, t) => new aE(e, t).patch;
var sE = oE;
const lE = fr, cE = (e, t) => {
  const r = lE(e, t);
  return r && r.prerelease.length ? r.prerelease : null;
};
var uE = cE;
const Ss = Ie, fE = (e, t, r) => new Ss(e, r).compare(new Ss(t, r));
var We = fE;
const dE = We, hE = (e, t, r) => dE(t, e, r);
var pE = hE;
const mE = We, gE = (e, t) => mE(e, t, !0);
var EE = gE;
const Cs = Ie, yE = (e, t, r) => {
  const n = new Cs(e, r), i = new Cs(t, r);
  return n.compare(i) || n.compareBuild(i);
};
var Ya = yE;
const vE = Ya, wE = (e, t) => e.sort((r, n) => vE(r, n, t));
var _E = wE;
const AE = Ya, TE = (e, t) => e.sort((r, n) => AE(n, r, t));
var SE = TE;
const CE = We, bE = (e, t, r) => CE(e, t, r) > 0;
var li = bE;
const RE = We, OE = (e, t, r) => RE(e, t, r) < 0;
var za = OE;
const PE = We, IE = (e, t, r) => PE(e, t, r) === 0;
var Au = IE;
const NE = We, DE = (e, t, r) => NE(e, t, r) !== 0;
var Tu = DE;
const $E = We, FE = (e, t, r) => $E(e, t, r) >= 0;
var Xa = FE;
const xE = We, LE = (e, t, r) => xE(e, t, r) <= 0;
var Ka = LE;
const UE = Au, kE = Tu, ME = li, BE = Xa, jE = za, HE = Ka, qE = (e, t, r, n) => {
  switch (t) {
    case "===":
      return typeof e == "object" && (e = e.version), typeof r == "object" && (r = r.version), e === r;
    case "!==":
      return typeof e == "object" && (e = e.version), typeof r == "object" && (r = r.version), e !== r;
    case "":
    case "=":
    case "==":
      return UE(e, r, n);
    case "!=":
      return kE(e, r, n);
    case ">":
      return ME(e, r, n);
    case ">=":
      return BE(e, r, n);
    case "<":
      return jE(e, r, n);
    case "<=":
      return HE(e, r, n);
    default:
      throw new TypeError(`Invalid operator: ${t}`);
  }
};
var Su = qE;
const GE = Ie, VE = fr, { safeRe: Cn, t: bn } = Zr, WE = (e, t) => {
  if (e instanceof GE)
    return e;
  if (typeof e == "number" && (e = String(e)), typeof e != "string")
    return null;
  t = t || {};
  let r = null;
  if (!t.rtl)
    r = e.match(t.includePrerelease ? Cn[bn.COERCEFULL] : Cn[bn.COERCE]);
  else {
    const l = t.includePrerelease ? Cn[bn.COERCERTLFULL] : Cn[bn.COERCERTL];
    let m;
    for (; (m = l.exec(e)) && (!r || r.index + r[0].length !== e.length); )
      (!r || m.index + m[0].length !== r.index + r[0].length) && (r = m), l.lastIndex = m.index + m[1].length + m[2].length;
    l.lastIndex = -1;
  }
  if (r === null)
    return null;
  const n = r[2], i = r[3] || "0", a = r[4] || "0", o = t.includePrerelease && r[5] ? `-${r[5]}` : "", s = t.includePrerelease && r[6] ? `+${r[6]}` : "";
  return VE(`${n}.${i}.${a}${o}${s}`, t);
};
var YE = WE;
class zE {
  constructor() {
    this.max = 1e3, this.map = /* @__PURE__ */ new Map();
  }
  get(t) {
    const r = this.map.get(t);
    if (r !== void 0)
      return this.map.delete(t), this.map.set(t, r), r;
  }
  delete(t) {
    return this.map.delete(t);
  }
  set(t, r) {
    if (!this.delete(t) && r !== void 0) {
      if (this.map.size >= this.max) {
        const i = this.map.keys().next().value;
        this.delete(i);
      }
      this.map.set(t, r);
    }
    return this;
  }
}
var XE = zE, ji, bs;
function Ye() {
  if (bs) return ji;
  bs = 1;
  const e = /\s+/g;
  class t {
    constructor(R, N) {
      if (N = i(N), R instanceof t)
        return R.loose === !!N.loose && R.includePrerelease === !!N.includePrerelease ? R : new t(R.raw, N);
      if (R instanceof a)
        return this.raw = R.value, this.set = [[R]], this.formatted = void 0, this;
      if (this.options = N, this.loose = !!N.loose, this.includePrerelease = !!N.includePrerelease, this.raw = R.trim().replace(e, " "), this.set = this.raw.split("||").map((b) => this.parseRange(b.trim())).filter((b) => b.length), !this.set.length)
        throw new TypeError(`Invalid SemVer Range: ${this.raw}`);
      if (this.set.length > 1) {
        const b = this.set[0];
        if (this.set = this.set.filter(($) => !y($[0])), this.set.length === 0)
          this.set = [b];
        else if (this.set.length > 1) {
          for (const $ of this.set)
            if ($.length === 1 && A($[0])) {
              this.set = [$];
              break;
            }
        }
      }
      this.formatted = void 0;
    }
    get range() {
      if (this.formatted === void 0) {
        this.formatted = "";
        for (let R = 0; R < this.set.length; R++) {
          R > 0 && (this.formatted += "||");
          const N = this.set[R];
          for (let b = 0; b < N.length; b++)
            b > 0 && (this.formatted += " "), this.formatted += N[b].toString().trim();
        }
      }
      return this.formatted;
    }
    format() {
      return this.range;
    }
    toString() {
      return this.range;
    }
    parseRange(R) {
      const b = ((this.options.includePrerelease && g) | (this.options.loose && v)) + ":" + R, $ = n.get(b);
      if ($)
        return $;
      const I = this.options.loose, k = I ? l[m.HYPHENRANGELOOSE] : l[m.HYPHENRANGE];
      R = R.replace(k, M(this.options.includePrerelease)), o("hyphen replace", R), R = R.replace(l[m.COMPARATORTRIM], c), o("comparator trim", R), R = R.replace(l[m.TILDETRIM], f), o("tilde trim", R), R = R.replace(l[m.CARETTRIM], d), o("caret trim", R);
      let G = R.split(" ").map((U) => T(U, this.options)).join(" ").split(/\s+/).map((U) => B(U, this.options));
      I && (G = G.filter((U) => (o("loose invalid filter", U, this.options), !!U.match(l[m.COMPARATORLOOSE])))), o("range list", G);
      const j = /* @__PURE__ */ new Map(), X = G.map((U) => new a(U, this.options));
      for (const U of X) {
        if (y(U))
          return [U];
        j.set(U.value, U);
      }
      j.size > 1 && j.has("") && j.delete("");
      const ue = [...j.values()];
      return n.set(b, ue), ue;
    }
    intersects(R, N) {
      if (!(R instanceof t))
        throw new TypeError("a Range is required");
      return this.set.some((b) => S(b, N) && R.set.some(($) => S($, N) && b.every((I) => $.every((k) => I.intersects(k, N)))));
    }
    // if ANY of the sets match ALL of its comparators, then pass
    test(R) {
      if (!R)
        return !1;
      if (typeof R == "string")
        try {
          R = new s(R, this.options);
        } catch {
          return !1;
        }
      for (let N = 0; N < this.set.length; N++)
        if (z(this.set[N], R, this.options))
          return !0;
      return !1;
    }
  }
  ji = t;
  const r = XE, n = new r(), i = Wa, a = ci(), o = si, s = Ie, {
    safeRe: l,
    t: m,
    comparatorTrimReplace: c,
    tildeTrimReplace: f,
    caretTrimReplace: d
  } = Zr, { FLAG_INCLUDE_PRERELEASE: g, FLAG_LOOSE: v } = oi, y = (P) => P.value === "<0.0.0-0", A = (P) => P.value === "", S = (P, R) => {
    let N = !0;
    const b = P.slice();
    let $ = b.pop();
    for (; N && b.length; )
      N = b.every((I) => $.intersects(I, R)), $ = b.pop();
    return N;
  }, T = (P, R) => (P = P.replace(l[m.BUILD], ""), o("comp", P, R), P = ae(P, R), o("caret", P), P = x(P, R), o("tildes", P), P = $e(P, R), o("xrange", P), P = q(P, R), o("stars", P), P), D = (P) => !P || P.toLowerCase() === "x" || P === "*", x = (P, R) => P.trim().split(/\s+/).map((N) => Z(N, R)).join(" "), Z = (P, R) => {
    const N = R.loose ? l[m.TILDELOOSE] : l[m.TILDE];
    return P.replace(N, (b, $, I, k, G) => {
      o("tilde", P, b, $, I, k, G);
      let j;
      return D($) ? j = "" : D(I) ? j = `>=${$}.0.0 <${+$ + 1}.0.0-0` : D(k) ? j = `>=${$}.${I}.0 <${$}.${+I + 1}.0-0` : G ? (o("replaceTilde pr", G), j = `>=${$}.${I}.${k}-${G} <${$}.${+I + 1}.0-0`) : j = `>=${$}.${I}.${k} <${$}.${+I + 1}.0-0`, o("tilde return", j), j;
    });
  }, ae = (P, R) => P.trim().split(/\s+/).map((N) => W(N, R)).join(" "), W = (P, R) => {
    o("caret", P, R);
    const N = R.loose ? l[m.CARETLOOSE] : l[m.CARET], b = R.includePrerelease ? "-0" : "";
    return P.replace(N, ($, I, k, G, j) => {
      o("caret", P, $, I, k, G, j);
      let X;
      return D(I) ? X = "" : D(k) ? X = `>=${I}.0.0${b} <${+I + 1}.0.0-0` : D(G) ? I === "0" ? X = `>=${I}.${k}.0${b} <${I}.${+k + 1}.0-0` : X = `>=${I}.${k}.0${b} <${+I + 1}.0.0-0` : j ? (o("replaceCaret pr", j), I === "0" ? k === "0" ? X = `>=${I}.${k}.${G}-${j} <${I}.${k}.${+G + 1}-0` : X = `>=${I}.${k}.${G}-${j} <${I}.${+k + 1}.0-0` : X = `>=${I}.${k}.${G}-${j} <${+I + 1}.0.0-0`) : (o("no pr"), I === "0" ? k === "0" ? X = `>=${I}.${k}.${G}${b} <${I}.${k}.${+G + 1}-0` : X = `>=${I}.${k}.${G}${b} <${I}.${+k + 1}.0-0` : X = `>=${I}.${k}.${G} <${+I + 1}.0.0-0`), o("caret return", X), X;
    });
  }, $e = (P, R) => (o("replaceXRanges", P, R), P.split(/\s+/).map((N) => E(N, R)).join(" ")), E = (P, R) => {
    P = P.trim();
    const N = R.loose ? l[m.XRANGELOOSE] : l[m.XRANGE];
    return P.replace(N, (b, $, I, k, G, j) => {
      o("xRange", P, b, $, I, k, G, j);
      const X = D(I), ue = X || D(k), U = ue || D(G), Xe = U;
      return $ === "=" && Xe && ($ = ""), j = R.includePrerelease ? "-0" : "", X ? $ === ">" || $ === "<" ? b = "<0.0.0-0" : b = "*" : $ && Xe ? (ue && (k = 0), G = 0, $ === ">" ? ($ = ">=", ue ? (I = +I + 1, k = 0, G = 0) : (k = +k + 1, G = 0)) : $ === "<=" && ($ = "<", ue ? I = +I + 1 : k = +k + 1), $ === "<" && (j = "-0"), b = `${$ + I}.${k}.${G}${j}`) : ue ? b = `>=${I}.0.0${j} <${+I + 1}.0.0-0` : U && (b = `>=${I}.${k}.0${j} <${I}.${+k + 1}.0-0`), o("xRange return", b), b;
    });
  }, q = (P, R) => (o("replaceStars", P, R), P.trim().replace(l[m.STAR], "")), B = (P, R) => (o("replaceGTE0", P, R), P.trim().replace(l[R.includePrerelease ? m.GTE0PRE : m.GTE0], "")), M = (P) => (R, N, b, $, I, k, G, j, X, ue, U, Xe) => (D(b) ? N = "" : D($) ? N = `>=${b}.0.0${P ? "-0" : ""}` : D(I) ? N = `>=${b}.${$}.0${P ? "-0" : ""}` : k ? N = `>=${N}` : N = `>=${N}${P ? "-0" : ""}`, D(X) ? j = "" : D(ue) ? j = `<${+X + 1}.0.0-0` : D(U) ? j = `<${X}.${+ue + 1}.0-0` : Xe ? j = `<=${X}.${ue}.${U}-${Xe}` : P ? j = `<${X}.${ue}.${+U + 1}-0` : j = `<=${j}`, `${N} ${j}`.trim()), z = (P, R, N) => {
    for (let b = 0; b < P.length; b++)
      if (!P[b].test(R))
        return !1;
    if (R.prerelease.length && !N.includePrerelease) {
      for (let b = 0; b < P.length; b++)
        if (o(P[b].semver), P[b].semver !== a.ANY && P[b].semver.prerelease.length > 0) {
          const $ = P[b].semver;
          if ($.major === R.major && $.minor === R.minor && $.patch === R.patch)
            return !0;
        }
      return !1;
    }
    return !0;
  };
  return ji;
}
var Hi, Rs;
function ci() {
  if (Rs) return Hi;
  Rs = 1;
  const e = Symbol("SemVer ANY");
  class t {
    static get ANY() {
      return e;
    }
    constructor(c, f) {
      if (f = r(f), c instanceof t) {
        if (c.loose === !!f.loose)
          return c;
        c = c.value;
      }
      c = c.trim().split(/\s+/).join(" "), o("comparator", c, f), this.options = f, this.loose = !!f.loose, this.parse(c), this.semver === e ? this.value = "" : this.value = this.operator + this.semver.version, o("comp", this);
    }
    parse(c) {
      const f = this.options.loose ? n[i.COMPARATORLOOSE] : n[i.COMPARATOR], d = c.match(f);
      if (!d)
        throw new TypeError(`Invalid comparator: ${c}`);
      this.operator = d[1] !== void 0 ? d[1] : "", this.operator === "=" && (this.operator = ""), d[2] ? this.semver = new s(d[2], this.options.loose) : this.semver = e;
    }
    toString() {
      return this.value;
    }
    test(c) {
      if (o("Comparator.test", c, this.options.loose), this.semver === e || c === e)
        return !0;
      if (typeof c == "string")
        try {
          c = new s(c, this.options);
        } catch {
          return !1;
        }
      return a(c, this.operator, this.semver, this.options);
    }
    intersects(c, f) {
      if (!(c instanceof t))
        throw new TypeError("a Comparator is required");
      return this.operator === "" ? this.value === "" ? !0 : new l(c.value, f).test(this.value) : c.operator === "" ? c.value === "" ? !0 : new l(this.value, f).test(c.semver) : (f = r(f), f.includePrerelease && (this.value === "<0.0.0-0" || c.value === "<0.0.0-0") || !f.includePrerelease && (this.value.startsWith("<0.0.0") || c.value.startsWith("<0.0.0")) ? !1 : !!(this.operator.startsWith(">") && c.operator.startsWith(">") || this.operator.startsWith("<") && c.operator.startsWith("<") || this.semver.version === c.semver.version && this.operator.includes("=") && c.operator.includes("=") || a(this.semver, "<", c.semver, f) && this.operator.startsWith(">") && c.operator.startsWith("<") || a(this.semver, ">", c.semver, f) && this.operator.startsWith("<") && c.operator.startsWith(">")));
    }
  }
  Hi = t;
  const r = Wa, { safeRe: n, t: i } = Zr, a = Su, o = si, s = Ie, l = Ye();
  return Hi;
}
const KE = Ye(), JE = (e, t, r) => {
  try {
    t = new KE(t, r);
  } catch {
    return !1;
  }
  return t.test(e);
};
var ui = JE;
const QE = Ye(), ZE = (e, t) => new QE(e, t).set.map((r) => r.map((n) => n.value).join(" ").trim().split(" "));
var ey = ZE;
const ty = Ie, ry = Ye(), ny = (e, t, r) => {
  let n = null, i = null, a = null;
  try {
    a = new ry(t, r);
  } catch {
    return null;
  }
  return e.forEach((o) => {
    a.test(o) && (!n || i.compare(o) === -1) && (n = o, i = new ty(n, r));
  }), n;
};
var iy = ny;
const ay = Ie, oy = Ye(), sy = (e, t, r) => {
  let n = null, i = null, a = null;
  try {
    a = new oy(t, r);
  } catch {
    return null;
  }
  return e.forEach((o) => {
    a.test(o) && (!n || i.compare(o) === 1) && (n = o, i = new ay(n, r));
  }), n;
};
var ly = sy;
const qi = Ie, cy = Ye(), Os = li, uy = (e, t) => {
  e = new cy(e, t);
  let r = new qi("0.0.0");
  if (e.test(r) || (r = new qi("0.0.0-0"), e.test(r)))
    return r;
  r = null;
  for (let n = 0; n < e.set.length; ++n) {
    const i = e.set[n];
    let a = null;
    i.forEach((o) => {
      const s = new qi(o.semver.version);
      switch (o.operator) {
        case ">":
          s.prerelease.length === 0 ? s.patch++ : s.prerelease.push(0), s.raw = s.format();
        case "":
        case ">=":
          (!a || Os(s, a)) && (a = s);
          break;
        case "<":
        case "<=":
          break;
        default:
          throw new Error(`Unexpected operation: ${o.operator}`);
      }
    }), a && (!r || Os(r, a)) && (r = a);
  }
  return r && e.test(r) ? r : null;
};
var fy = uy;
const dy = Ye(), hy = (e, t) => {
  try {
    return new dy(e, t).range || "*";
  } catch {
    return null;
  }
};
var py = hy;
const my = Ie, Cu = ci(), { ANY: gy } = Cu, Ey = Ye(), yy = ui, Ps = li, Is = za, vy = Ka, wy = Xa, _y = (e, t, r, n) => {
  e = new my(e, n), t = new Ey(t, n);
  let i, a, o, s, l;
  switch (r) {
    case ">":
      i = Ps, a = vy, o = Is, s = ">", l = ">=";
      break;
    case "<":
      i = Is, a = wy, o = Ps, s = "<", l = "<=";
      break;
    default:
      throw new TypeError('Must provide a hilo val of "<" or ">"');
  }
  if (yy(e, t, n))
    return !1;
  for (let m = 0; m < t.set.length; ++m) {
    const c = t.set[m];
    let f = null, d = null;
    if (c.forEach((g) => {
      g.semver === gy && (g = new Cu(">=0.0.0")), f = f || g, d = d || g, i(g.semver, f.semver, n) ? f = g : o(g.semver, d.semver, n) && (d = g);
    }), f.operator === s || f.operator === l || (!d.operator || d.operator === s) && a(e, d.semver))
      return !1;
    if (d.operator === l && o(e, d.semver))
      return !1;
  }
  return !0;
};
var Ja = _y;
const Ay = Ja, Ty = (e, t, r) => Ay(e, t, ">", r);
var Sy = Ty;
const Cy = Ja, by = (e, t, r) => Cy(e, t, "<", r);
var Ry = by;
const Ns = Ye(), Oy = (e, t, r) => (e = new Ns(e, r), t = new Ns(t, r), e.intersects(t, r));
var Py = Oy;
const Iy = ui, Ny = We;
var Dy = (e, t, r) => {
  const n = [];
  let i = null, a = null;
  const o = e.sort((c, f) => Ny(c, f, r));
  for (const c of o)
    Iy(c, t, r) ? (a = c, i || (i = c)) : (a && n.push([i, a]), a = null, i = null);
  i && n.push([i, null]);
  const s = [];
  for (const [c, f] of n)
    c === f ? s.push(c) : !f && c === o[0] ? s.push("*") : f ? c === o[0] ? s.push(`<=${f}`) : s.push(`${c} - ${f}`) : s.push(`>=${c}`);
  const l = s.join(" || "), m = typeof t.raw == "string" ? t.raw : String(t);
  return l.length < m.length ? l : t;
};
const Ds = Ye(), Qa = ci(), { ANY: Gi } = Qa, wr = ui, Za = We, $y = (e, t, r = {}) => {
  if (e === t)
    return !0;
  e = new Ds(e, r), t = new Ds(t, r);
  let n = !1;
  e: for (const i of e.set) {
    for (const a of t.set) {
      const o = xy(i, a, r);
      if (n = n || o !== null, o)
        continue e;
    }
    if (n)
      return !1;
  }
  return !0;
}, Fy = [new Qa(">=0.0.0-0")], $s = [new Qa(">=0.0.0")], xy = (e, t, r) => {
  if (e === t)
    return !0;
  if (e.length === 1 && e[0].semver === Gi) {
    if (t.length === 1 && t[0].semver === Gi)
      return !0;
    r.includePrerelease ? e = Fy : e = $s;
  }
  if (t.length === 1 && t[0].semver === Gi) {
    if (r.includePrerelease)
      return !0;
    t = $s;
  }
  const n = /* @__PURE__ */ new Set();
  let i, a;
  for (const g of e)
    g.operator === ">" || g.operator === ">=" ? i = Fs(i, g, r) : g.operator === "<" || g.operator === "<=" ? a = xs(a, g, r) : n.add(g.semver);
  if (n.size > 1)
    return null;
  let o;
  if (i && a) {
    if (o = Za(i.semver, a.semver, r), o > 0)
      return null;
    if (o === 0 && (i.operator !== ">=" || a.operator !== "<="))
      return null;
  }
  for (const g of n) {
    if (i && !wr(g, String(i), r) || a && !wr(g, String(a), r))
      return null;
    for (const v of t)
      if (!wr(g, String(v), r))
        return !1;
    return !0;
  }
  let s, l, m, c, f = a && !r.includePrerelease && a.semver.prerelease.length ? a.semver : !1, d = i && !r.includePrerelease && i.semver.prerelease.length ? i.semver : !1;
  f && f.prerelease.length === 1 && a.operator === "<" && f.prerelease[0] === 0 && (f = !1);
  for (const g of t) {
    if (c = c || g.operator === ">" || g.operator === ">=", m = m || g.operator === "<" || g.operator === "<=", i) {
      if (d && g.semver.prerelease && g.semver.prerelease.length && g.semver.major === d.major && g.semver.minor === d.minor && g.semver.patch === d.patch && (d = !1), g.operator === ">" || g.operator === ">=") {
        if (s = Fs(i, g, r), s === g && s !== i)
          return !1;
      } else if (i.operator === ">=" && !wr(i.semver, String(g), r))
        return !1;
    }
    if (a) {
      if (f && g.semver.prerelease && g.semver.prerelease.length && g.semver.major === f.major && g.semver.minor === f.minor && g.semver.patch === f.patch && (f = !1), g.operator === "<" || g.operator === "<=") {
        if (l = xs(a, g, r), l === g && l !== a)
          return !1;
      } else if (a.operator === "<=" && !wr(a.semver, String(g), r))
        return !1;
    }
    if (!g.operator && (a || i) && o !== 0)
      return !1;
  }
  return !(i && m && !a && o !== 0 || a && c && !i && o !== 0 || d || f);
}, Fs = (e, t, r) => {
  if (!e)
    return t;
  const n = Za(e.semver, t.semver, r);
  return n > 0 ? e : n < 0 || t.operator === ">" && e.operator === ">=" ? t : e;
}, xs = (e, t, r) => {
  if (!e)
    return t;
  const n = Za(e.semver, t.semver, r);
  return n < 0 ? e : n > 0 || t.operator === "<" && e.operator === "<=" ? t : e;
};
var Ly = $y;
const Vi = Zr, Ls = oi, Uy = Ie, Us = _u, ky = fr, My = V0, By = z0, jy = K0, Hy = Q0, qy = tE, Gy = iE, Vy = sE, Wy = uE, Yy = We, zy = pE, Xy = EE, Ky = Ya, Jy = _E, Qy = SE, Zy = li, ev = za, tv = Au, rv = Tu, nv = Xa, iv = Ka, av = Su, ov = YE, sv = ci(), lv = Ye(), cv = ui, uv = ey, fv = iy, dv = ly, hv = fy, pv = py, mv = Ja, gv = Sy, Ev = Ry, yv = Py, vv = Dy, wv = Ly;
var bu = {
  parse: ky,
  valid: My,
  clean: By,
  inc: jy,
  diff: Hy,
  major: qy,
  minor: Gy,
  patch: Vy,
  prerelease: Wy,
  compare: Yy,
  rcompare: zy,
  compareLoose: Xy,
  compareBuild: Ky,
  sort: Jy,
  rsort: Qy,
  gt: Zy,
  lt: ev,
  eq: tv,
  neq: rv,
  gte: nv,
  lte: iv,
  cmp: av,
  coerce: ov,
  Comparator: sv,
  Range: lv,
  satisfies: cv,
  toComparators: uv,
  maxSatisfying: fv,
  minSatisfying: dv,
  minVersion: hv,
  validRange: pv,
  outside: mv,
  gtr: gv,
  ltr: Ev,
  intersects: yv,
  simplifyRange: vv,
  subset: wv,
  SemVer: Uy,
  re: Vi.re,
  src: Vi.src,
  tokens: Vi.t,
  SEMVER_SPEC_VERSION: Ls.SEMVER_SPEC_VERSION,
  RELEASE_TYPES: Ls.RELEASE_TYPES,
  compareIdentifiers: Us.compareIdentifiers,
  rcompareIdentifiers: Us.rcompareIdentifiers
}, en = {}, Yn = { exports: {} };
Yn.exports;
(function(e, t) {
  var r = 200, n = "__lodash_hash_undefined__", i = 1, a = 2, o = 9007199254740991, s = "[object Arguments]", l = "[object Array]", m = "[object AsyncFunction]", c = "[object Boolean]", f = "[object Date]", d = "[object Error]", g = "[object Function]", v = "[object GeneratorFunction]", y = "[object Map]", A = "[object Number]", S = "[object Null]", T = "[object Object]", D = "[object Promise]", x = "[object Proxy]", Z = "[object RegExp]", ae = "[object Set]", W = "[object String]", $e = "[object Symbol]", E = "[object Undefined]", q = "[object WeakMap]", B = "[object ArrayBuffer]", M = "[object DataView]", z = "[object Float32Array]", P = "[object Float64Array]", R = "[object Int8Array]", N = "[object Int16Array]", b = "[object Int32Array]", $ = "[object Uint8Array]", I = "[object Uint8ClampedArray]", k = "[object Uint16Array]", G = "[object Uint32Array]", j = /[\\^$.*+?()[\]{}|]/g, X = /^\[object .+?Constructor\]$/, ue = /^(?:0|[1-9]\d*)$/, U = {};
  U[z] = U[P] = U[R] = U[N] = U[b] = U[$] = U[I] = U[k] = U[G] = !0, U[s] = U[l] = U[B] = U[c] = U[M] = U[f] = U[d] = U[g] = U[y] = U[A] = U[T] = U[Z] = U[ae] = U[W] = U[q] = !1;
  var Xe = typeof Se == "object" && Se && Se.Object === Object && Se, h = typeof self == "object" && self && self.Object === Object && self, u = Xe || h || Function("return this")(), C = t && !t.nodeType && t, _ = C && !0 && e && !e.nodeType && e, Y = _ && _.exports === C, J = Y && Xe.process, ne = function() {
    try {
      return J && J.binding && J.binding("util");
    } catch {
    }
  }(), he = ne && ne.isTypedArray;
  function ye(p, w) {
    for (var O = -1, F = p == null ? 0 : p.length, Q = 0, H = []; ++O < F; ) {
      var ie = p[O];
      w(ie, O, p) && (H[Q++] = ie);
    }
    return H;
  }
  function at(p, w) {
    for (var O = -1, F = w.length, Q = p.length; ++O < F; )
      p[Q + O] = w[O];
    return p;
  }
  function le(p, w) {
    for (var O = -1, F = p == null ? 0 : p.length; ++O < F; )
      if (w(p[O], O, p))
        return !0;
    return !1;
  }
  function Be(p, w) {
    for (var O = -1, F = Array(p); ++O < p; )
      F[O] = w(O);
    return F;
  }
  function wi(p) {
    return function(w) {
      return p(w);
    };
  }
  function an(p, w) {
    return p.has(w);
  }
  function pr(p, w) {
    return p == null ? void 0 : p[w];
  }
  function on(p) {
    var w = -1, O = Array(p.size);
    return p.forEach(function(F, Q) {
      O[++w] = [Q, F];
    }), O;
  }
  function zu(p, w) {
    return function(O) {
      return p(w(O));
    };
  }
  function Xu(p) {
    var w = -1, O = Array(p.size);
    return p.forEach(function(F) {
      O[++w] = F;
    }), O;
  }
  var Ku = Array.prototype, Ju = Function.prototype, sn = Object.prototype, _i = u["__core-js_shared__"], so = Ju.toString, Ke = sn.hasOwnProperty, lo = function() {
    var p = /[^.]+$/.exec(_i && _i.keys && _i.keys.IE_PROTO || "");
    return p ? "Symbol(src)_1." + p : "";
  }(), co = sn.toString, Qu = RegExp(
    "^" + so.call(Ke).replace(j, "\\$&").replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, "$1.*?") + "$"
  ), uo = Y ? u.Buffer : void 0, ln = u.Symbol, fo = u.Uint8Array, ho = sn.propertyIsEnumerable, Zu = Ku.splice, Ct = ln ? ln.toStringTag : void 0, po = Object.getOwnPropertySymbols, ef = uo ? uo.isBuffer : void 0, tf = zu(Object.keys, Object), Ai = Gt(u, "DataView"), mr = Gt(u, "Map"), Ti = Gt(u, "Promise"), Si = Gt(u, "Set"), Ci = Gt(u, "WeakMap"), gr = Gt(Object, "create"), rf = Ot(Ai), nf = Ot(mr), af = Ot(Ti), of = Ot(Si), sf = Ot(Ci), mo = ln ? ln.prototype : void 0, bi = mo ? mo.valueOf : void 0;
  function bt(p) {
    var w = -1, O = p == null ? 0 : p.length;
    for (this.clear(); ++w < O; ) {
      var F = p[w];
      this.set(F[0], F[1]);
    }
  }
  function lf() {
    this.__data__ = gr ? gr(null) : {}, this.size = 0;
  }
  function cf(p) {
    var w = this.has(p) && delete this.__data__[p];
    return this.size -= w ? 1 : 0, w;
  }
  function uf(p) {
    var w = this.__data__;
    if (gr) {
      var O = w[p];
      return O === n ? void 0 : O;
    }
    return Ke.call(w, p) ? w[p] : void 0;
  }
  function ff(p) {
    var w = this.__data__;
    return gr ? w[p] !== void 0 : Ke.call(w, p);
  }
  function df(p, w) {
    var O = this.__data__;
    return this.size += this.has(p) ? 0 : 1, O[p] = gr && w === void 0 ? n : w, this;
  }
  bt.prototype.clear = lf, bt.prototype.delete = cf, bt.prototype.get = uf, bt.prototype.has = ff, bt.prototype.set = df;
  function et(p) {
    var w = -1, O = p == null ? 0 : p.length;
    for (this.clear(); ++w < O; ) {
      var F = p[w];
      this.set(F[0], F[1]);
    }
  }
  function hf() {
    this.__data__ = [], this.size = 0;
  }
  function pf(p) {
    var w = this.__data__, O = un(w, p);
    if (O < 0)
      return !1;
    var F = w.length - 1;
    return O == F ? w.pop() : Zu.call(w, O, 1), --this.size, !0;
  }
  function mf(p) {
    var w = this.__data__, O = un(w, p);
    return O < 0 ? void 0 : w[O][1];
  }
  function gf(p) {
    return un(this.__data__, p) > -1;
  }
  function Ef(p, w) {
    var O = this.__data__, F = un(O, p);
    return F < 0 ? (++this.size, O.push([p, w])) : O[F][1] = w, this;
  }
  et.prototype.clear = hf, et.prototype.delete = pf, et.prototype.get = mf, et.prototype.has = gf, et.prototype.set = Ef;
  function Rt(p) {
    var w = -1, O = p == null ? 0 : p.length;
    for (this.clear(); ++w < O; ) {
      var F = p[w];
      this.set(F[0], F[1]);
    }
  }
  function yf() {
    this.size = 0, this.__data__ = {
      hash: new bt(),
      map: new (mr || et)(),
      string: new bt()
    };
  }
  function vf(p) {
    var w = fn(this, p).delete(p);
    return this.size -= w ? 1 : 0, w;
  }
  function wf(p) {
    return fn(this, p).get(p);
  }
  function _f(p) {
    return fn(this, p).has(p);
  }
  function Af(p, w) {
    var O = fn(this, p), F = O.size;
    return O.set(p, w), this.size += O.size == F ? 0 : 1, this;
  }
  Rt.prototype.clear = yf, Rt.prototype.delete = vf, Rt.prototype.get = wf, Rt.prototype.has = _f, Rt.prototype.set = Af;
  function cn(p) {
    var w = -1, O = p == null ? 0 : p.length;
    for (this.__data__ = new Rt(); ++w < O; )
      this.add(p[w]);
  }
  function Tf(p) {
    return this.__data__.set(p, n), this;
  }
  function Sf(p) {
    return this.__data__.has(p);
  }
  cn.prototype.add = cn.prototype.push = Tf, cn.prototype.has = Sf;
  function ot(p) {
    var w = this.__data__ = new et(p);
    this.size = w.size;
  }
  function Cf() {
    this.__data__ = new et(), this.size = 0;
  }
  function bf(p) {
    var w = this.__data__, O = w.delete(p);
    return this.size = w.size, O;
  }
  function Rf(p) {
    return this.__data__.get(p);
  }
  function Of(p) {
    return this.__data__.has(p);
  }
  function Pf(p, w) {
    var O = this.__data__;
    if (O instanceof et) {
      var F = O.__data__;
      if (!mr || F.length < r - 1)
        return F.push([p, w]), this.size = ++O.size, this;
      O = this.__data__ = new Rt(F);
    }
    return O.set(p, w), this.size = O.size, this;
  }
  ot.prototype.clear = Cf, ot.prototype.delete = bf, ot.prototype.get = Rf, ot.prototype.has = Of, ot.prototype.set = Pf;
  function If(p, w) {
    var O = dn(p), F = !O && Vf(p), Q = !O && !F && Ri(p), H = !O && !F && !Q && So(p), ie = O || F || Q || H, fe = ie ? Be(p.length, String) : [], pe = fe.length;
    for (var ee in p)
      Ke.call(p, ee) && !(ie && // Safari 9 has enumerable `arguments.length` in strict mode.
      (ee == "length" || // Node.js 0.10 has enumerable non-index properties on buffers.
      Q && (ee == "offset" || ee == "parent") || // PhantomJS 2 has enumerable non-index properties on typed arrays.
      H && (ee == "buffer" || ee == "byteLength" || ee == "byteOffset") || // Skip index properties.
      Bf(ee, pe))) && fe.push(ee);
    return fe;
  }
  function un(p, w) {
    for (var O = p.length; O--; )
      if (wo(p[O][0], w))
        return O;
    return -1;
  }
  function Nf(p, w, O) {
    var F = w(p);
    return dn(p) ? F : at(F, O(p));
  }
  function Er(p) {
    return p == null ? p === void 0 ? E : S : Ct && Ct in Object(p) ? kf(p) : Gf(p);
  }
  function go(p) {
    return yr(p) && Er(p) == s;
  }
  function Eo(p, w, O, F, Q) {
    return p === w ? !0 : p == null || w == null || !yr(p) && !yr(w) ? p !== p && w !== w : Df(p, w, O, F, Eo, Q);
  }
  function Df(p, w, O, F, Q, H) {
    var ie = dn(p), fe = dn(w), pe = ie ? l : st(p), ee = fe ? l : st(w);
    pe = pe == s ? T : pe, ee = ee == s ? T : ee;
    var Fe = pe == T, je = ee == T, ve = pe == ee;
    if (ve && Ri(p)) {
      if (!Ri(w))
        return !1;
      ie = !0, Fe = !1;
    }
    if (ve && !Fe)
      return H || (H = new ot()), ie || So(p) ? yo(p, w, O, F, Q, H) : Lf(p, w, pe, O, F, Q, H);
    if (!(O & i)) {
      var Le = Fe && Ke.call(p, "__wrapped__"), Ue = je && Ke.call(w, "__wrapped__");
      if (Le || Ue) {
        var lt = Le ? p.value() : p, tt = Ue ? w.value() : w;
        return H || (H = new ot()), Q(lt, tt, O, F, H);
      }
    }
    return ve ? (H || (H = new ot()), Uf(p, w, O, F, Q, H)) : !1;
  }
  function $f(p) {
    if (!To(p) || Hf(p))
      return !1;
    var w = _o(p) ? Qu : X;
    return w.test(Ot(p));
  }
  function Ff(p) {
    return yr(p) && Ao(p.length) && !!U[Er(p)];
  }
  function xf(p) {
    if (!qf(p))
      return tf(p);
    var w = [];
    for (var O in Object(p))
      Ke.call(p, O) && O != "constructor" && w.push(O);
    return w;
  }
  function yo(p, w, O, F, Q, H) {
    var ie = O & i, fe = p.length, pe = w.length;
    if (fe != pe && !(ie && pe > fe))
      return !1;
    var ee = H.get(p);
    if (ee && H.get(w))
      return ee == w;
    var Fe = -1, je = !0, ve = O & a ? new cn() : void 0;
    for (H.set(p, w), H.set(w, p); ++Fe < fe; ) {
      var Le = p[Fe], Ue = w[Fe];
      if (F)
        var lt = ie ? F(Ue, Le, Fe, w, p, H) : F(Le, Ue, Fe, p, w, H);
      if (lt !== void 0) {
        if (lt)
          continue;
        je = !1;
        break;
      }
      if (ve) {
        if (!le(w, function(tt, Pt) {
          if (!an(ve, Pt) && (Le === tt || Q(Le, tt, O, F, H)))
            return ve.push(Pt);
        })) {
          je = !1;
          break;
        }
      } else if (!(Le === Ue || Q(Le, Ue, O, F, H))) {
        je = !1;
        break;
      }
    }
    return H.delete(p), H.delete(w), je;
  }
  function Lf(p, w, O, F, Q, H, ie) {
    switch (O) {
      case M:
        if (p.byteLength != w.byteLength || p.byteOffset != w.byteOffset)
          return !1;
        p = p.buffer, w = w.buffer;
      case B:
        return !(p.byteLength != w.byteLength || !H(new fo(p), new fo(w)));
      case c:
      case f:
      case A:
        return wo(+p, +w);
      case d:
        return p.name == w.name && p.message == w.message;
      case Z:
      case W:
        return p == w + "";
      case y:
        var fe = on;
      case ae:
        var pe = F & i;
        if (fe || (fe = Xu), p.size != w.size && !pe)
          return !1;
        var ee = ie.get(p);
        if (ee)
          return ee == w;
        F |= a, ie.set(p, w);
        var Fe = yo(fe(p), fe(w), F, Q, H, ie);
        return ie.delete(p), Fe;
      case $e:
        if (bi)
          return bi.call(p) == bi.call(w);
    }
    return !1;
  }
  function Uf(p, w, O, F, Q, H) {
    var ie = O & i, fe = vo(p), pe = fe.length, ee = vo(w), Fe = ee.length;
    if (pe != Fe && !ie)
      return !1;
    for (var je = pe; je--; ) {
      var ve = fe[je];
      if (!(ie ? ve in w : Ke.call(w, ve)))
        return !1;
    }
    var Le = H.get(p);
    if (Le && H.get(w))
      return Le == w;
    var Ue = !0;
    H.set(p, w), H.set(w, p);
    for (var lt = ie; ++je < pe; ) {
      ve = fe[je];
      var tt = p[ve], Pt = w[ve];
      if (F)
        var Co = ie ? F(Pt, tt, ve, w, p, H) : F(tt, Pt, ve, p, w, H);
      if (!(Co === void 0 ? tt === Pt || Q(tt, Pt, O, F, H) : Co)) {
        Ue = !1;
        break;
      }
      lt || (lt = ve == "constructor");
    }
    if (Ue && !lt) {
      var hn = p.constructor, pn = w.constructor;
      hn != pn && "constructor" in p && "constructor" in w && !(typeof hn == "function" && hn instanceof hn && typeof pn == "function" && pn instanceof pn) && (Ue = !1);
    }
    return H.delete(p), H.delete(w), Ue;
  }
  function vo(p) {
    return Nf(p, zf, Mf);
  }
  function fn(p, w) {
    var O = p.__data__;
    return jf(w) ? O[typeof w == "string" ? "string" : "hash"] : O.map;
  }
  function Gt(p, w) {
    var O = pr(p, w);
    return $f(O) ? O : void 0;
  }
  function kf(p) {
    var w = Ke.call(p, Ct), O = p[Ct];
    try {
      p[Ct] = void 0;
      var F = !0;
    } catch {
    }
    var Q = co.call(p);
    return F && (w ? p[Ct] = O : delete p[Ct]), Q;
  }
  var Mf = po ? function(p) {
    return p == null ? [] : (p = Object(p), ye(po(p), function(w) {
      return ho.call(p, w);
    }));
  } : Xf, st = Er;
  (Ai && st(new Ai(new ArrayBuffer(1))) != M || mr && st(new mr()) != y || Ti && st(Ti.resolve()) != D || Si && st(new Si()) != ae || Ci && st(new Ci()) != q) && (st = function(p) {
    var w = Er(p), O = w == T ? p.constructor : void 0, F = O ? Ot(O) : "";
    if (F)
      switch (F) {
        case rf:
          return M;
        case nf:
          return y;
        case af:
          return D;
        case of:
          return ae;
        case sf:
          return q;
      }
    return w;
  });
  function Bf(p, w) {
    return w = w ?? o, !!w && (typeof p == "number" || ue.test(p)) && p > -1 && p % 1 == 0 && p < w;
  }
  function jf(p) {
    var w = typeof p;
    return w == "string" || w == "number" || w == "symbol" || w == "boolean" ? p !== "__proto__" : p === null;
  }
  function Hf(p) {
    return !!lo && lo in p;
  }
  function qf(p) {
    var w = p && p.constructor, O = typeof w == "function" && w.prototype || sn;
    return p === O;
  }
  function Gf(p) {
    return co.call(p);
  }
  function Ot(p) {
    if (p != null) {
      try {
        return so.call(p);
      } catch {
      }
      try {
        return p + "";
      } catch {
      }
    }
    return "";
  }
  function wo(p, w) {
    return p === w || p !== p && w !== w;
  }
  var Vf = go(/* @__PURE__ */ function() {
    return arguments;
  }()) ? go : function(p) {
    return yr(p) && Ke.call(p, "callee") && !ho.call(p, "callee");
  }, dn = Array.isArray;
  function Wf(p) {
    return p != null && Ao(p.length) && !_o(p);
  }
  var Ri = ef || Kf;
  function Yf(p, w) {
    return Eo(p, w);
  }
  function _o(p) {
    if (!To(p))
      return !1;
    var w = Er(p);
    return w == g || w == v || w == m || w == x;
  }
  function Ao(p) {
    return typeof p == "number" && p > -1 && p % 1 == 0 && p <= o;
  }
  function To(p) {
    var w = typeof p;
    return p != null && (w == "object" || w == "function");
  }
  function yr(p) {
    return p != null && typeof p == "object";
  }
  var So = he ? wi(he) : Ff;
  function zf(p) {
    return Wf(p) ? If(p) : xf(p);
  }
  function Xf() {
    return [];
  }
  function Kf() {
    return !1;
  }
  e.exports = Yf;
})(Yn, Yn.exports);
var _v = Yn.exports;
Object.defineProperty(en, "__esModule", { value: !0 });
en.DownloadedUpdateHelper = void 0;
en.createTempUpdateFile = bv;
const Av = Wr, Tv = _t, ks = _v, Nt = Tt, Or = re;
class Sv {
  constructor(t) {
    this.cacheDir = t, this._file = null, this._packageFile = null, this.versionInfo = null, this.fileInfo = null, this._downloadedFileInfo = null;
  }
  get downloadedFileInfo() {
    return this._downloadedFileInfo;
  }
  get file() {
    return this._file;
  }
  get packageFile() {
    return this._packageFile;
  }
  get cacheDirForPendingUpdate() {
    return Or.join(this.cacheDir, "pending");
  }
  async validateDownloadedPath(t, r, n, i) {
    if (this.versionInfo != null && this.file === t && this.fileInfo != null)
      return ks(this.versionInfo, r) && ks(this.fileInfo.info, n.info) && await (0, Nt.pathExists)(t) ? t : null;
    const a = await this.getValidCachedUpdateFile(n, i);
    return a === null ? null : (i.info(`Update has already been downloaded to ${t}).`), this._file = a, a);
  }
  async setDownloadedFile(t, r, n, i, a, o) {
    this._file = t, this._packageFile = r, this.versionInfo = n, this.fileInfo = i, this._downloadedFileInfo = {
      fileName: a,
      sha512: i.info.sha512,
      isAdminRightsRequired: i.info.isAdminRightsRequired === !0
    }, o && await (0, Nt.outputJson)(this.getUpdateInfoFile(), this._downloadedFileInfo);
  }
  async clear() {
    this._file = null, this._packageFile = null, this.versionInfo = null, this.fileInfo = null, await this.cleanCacheDirForPendingUpdate();
  }
  async cleanCacheDirForPendingUpdate() {
    try {
      await (0, Nt.emptyDir)(this.cacheDirForPendingUpdate);
    } catch {
    }
  }
  /**
   * Returns "update-info.json" which is created in the update cache directory's "pending" subfolder after the first update is downloaded.  If the update file does not exist then the cache is cleared and recreated.  If the update file exists then its properties are validated.
   * @param fileInfo
   * @param logger
   */
  async getValidCachedUpdateFile(t, r) {
    const n = this.getUpdateInfoFile();
    if (!await (0, Nt.pathExists)(n))
      return null;
    let a;
    try {
      a = await (0, Nt.readJson)(n);
    } catch (m) {
      let c = "No cached update info available";
      return m.code !== "ENOENT" && (await this.cleanCacheDirForPendingUpdate(), c += ` (error on read: ${m.message})`), r.info(c), null;
    }
    if (!((a == null ? void 0 : a.fileName) !== null))
      return r.warn("Cached update info is corrupted: no fileName, directory for cached update will be cleaned"), await this.cleanCacheDirForPendingUpdate(), null;
    if (t.info.sha512 !== a.sha512)
      return r.info(`Cached update sha512 checksum doesn't match the latest available update. New update must be downloaded. Cached: ${a.sha512}, expected: ${t.info.sha512}. Directory for cached update will be cleaned`), await this.cleanCacheDirForPendingUpdate(), null;
    const s = Or.join(this.cacheDirForPendingUpdate, a.fileName);
    if (!await (0, Nt.pathExists)(s))
      return r.info("Cached update file doesn't exist"), null;
    const l = await Cv(s);
    return t.info.sha512 !== l ? (r.warn(`Sha512 checksum doesn't match the latest available update. New update must be downloaded. Cached: ${l}, expected: ${t.info.sha512}`), await this.cleanCacheDirForPendingUpdate(), null) : (this._downloadedFileInfo = a, s);
  }
  getUpdateInfoFile() {
    return Or.join(this.cacheDirForPendingUpdate, "update-info.json");
  }
}
en.DownloadedUpdateHelper = Sv;
function Cv(e, t = "sha512", r = "base64", n) {
  return new Promise((i, a) => {
    const o = (0, Av.createHash)(t);
    o.on("error", a).setEncoding(r), (0, Tv.createReadStream)(e, {
      ...n,
      highWaterMark: 1024 * 1024
      /* better to use more memory but hash faster */
    }).on("error", a).on("end", () => {
      o.end(), i(o.read());
    }).pipe(o, { end: !1 });
  });
}
async function bv(e, t, r) {
  let n = 0, i = Or.join(t, e);
  for (let a = 0; a < 3; a++)
    try {
      return await (0, Nt.unlink)(i), i;
    } catch (o) {
      if (o.code === "ENOENT")
        return i;
      r.warn(`Error on remove temp update file: ${o}`), i = Or.join(t, `${n++}-${e}`);
    }
  return i;
}
var fi = {}, eo = {};
Object.defineProperty(eo, "__esModule", { value: !0 });
eo.getAppCacheDir = Ov;
const Wi = re, Rv = Jn;
function Ov() {
  const e = (0, Rv.homedir)();
  let t;
  return process.platform === "win32" ? t = process.env.LOCALAPPDATA || Wi.join(e, "AppData", "Local") : process.platform === "darwin" ? t = Wi.join(e, "Library", "Caches") : t = process.env.XDG_CACHE_HOME || Wi.join(e, ".cache"), t;
}
Object.defineProperty(fi, "__esModule", { value: !0 });
fi.ElectronAppAdapter = void 0;
const Ms = re, Pv = eo;
class Iv {
  constructor(t = kt.app) {
    this.app = t;
  }
  whenReady() {
    return this.app.whenReady();
  }
  get version() {
    return this.app.getVersion();
  }
  get name() {
    return this.app.getName();
  }
  get isPackaged() {
    return this.app.isPackaged === !0;
  }
  get appUpdateConfigPath() {
    return this.isPackaged ? Ms.join(process.resourcesPath, "app-update.yml") : Ms.join(this.app.getAppPath(), "dev-app-update.yml");
  }
  get userDataPath() {
    return this.app.getPath("userData");
  }
  get baseCachePath() {
    return (0, Pv.getAppCacheDir)();
  }
  quit() {
    this.app.quit();
  }
  relaunch() {
    this.app.relaunch();
  }
  onQuit(t) {
    this.app.once("quit", (r, n) => t(n));
  }
}
fi.ElectronAppAdapter = Iv;
var Ru = {};
(function(e) {
  Object.defineProperty(e, "__esModule", { value: !0 }), e.ElectronHttpExecutor = e.NET_SESSION_NAME = void 0, e.getNetSession = r;
  const t = ce;
  e.NET_SESSION_NAME = "electron-updater";
  function r() {
    return kt.session.fromPartition(e.NET_SESSION_NAME, {
      cache: !1
    });
  }
  class n extends t.HttpExecutor {
    constructor(a) {
      super(), this.proxyLoginCallback = a, this.cachedSession = null;
    }
    async download(a, o, s) {
      return await s.cancellationToken.createPromise((l, m, c) => {
        const f = {
          headers: s.headers || void 0,
          redirect: "manual"
        };
        (0, t.configureRequestUrl)(a, f), (0, t.configureRequestOptions)(f), this.doDownload(f, {
          destination: o,
          options: s,
          onCancel: c,
          callback: (d) => {
            d == null ? l(o) : m(d);
          },
          responseHandler: null
        }, 0);
      });
    }
    createRequest(a, o) {
      a.headers && a.headers.Host && (a.host = a.headers.Host, delete a.headers.Host), this.cachedSession == null && (this.cachedSession = r());
      const s = kt.net.request({
        ...a,
        session: this.cachedSession
      });
      return s.on("response", o), this.proxyLoginCallback != null && s.on("login", this.proxyLoginCallback), s;
    }
    addRedirectHandlers(a, o, s, l, m) {
      a.on("redirect", (c, f, d) => {
        a.abort(), l > this.maxRedirects ? s(this.createMaxRedirectError()) : m(t.HttpExecutor.prepareRedirectUrlOptions(d, o));
      });
    }
  }
  e.ElectronHttpExecutor = n;
})(Ru);
var tn = {}, ze = {};
Object.defineProperty(ze, "__esModule", { value: !0 });
ze.newBaseUrl = Nv;
ze.newUrlFromBase = Dv;
ze.getChannelFilename = $v;
const Ou = At;
function Nv(e) {
  const t = new Ou.URL(e);
  return t.pathname.endsWith("/") || (t.pathname += "/"), t;
}
function Dv(e, t, r = !1) {
  const n = new Ou.URL(e, t), i = t.search;
  return i != null && i.length !== 0 ? n.search = i : r && (n.search = `noCache=${Date.now().toString(32)}`), n;
}
function $v(e) {
  return `${e}.yml`;
}
var se = {}, Fv = "[object Symbol]", Pu = /[\\^$.*+?()[\]{}|]/g, xv = RegExp(Pu.source), Lv = typeof Se == "object" && Se && Se.Object === Object && Se, Uv = typeof self == "object" && self && self.Object === Object && self, kv = Lv || Uv || Function("return this")(), Mv = Object.prototype, Bv = Mv.toString, Bs = kv.Symbol, js = Bs ? Bs.prototype : void 0, Hs = js ? js.toString : void 0;
function jv(e) {
  if (typeof e == "string")
    return e;
  if (qv(e))
    return Hs ? Hs.call(e) : "";
  var t = e + "";
  return t == "0" && 1 / e == -1 / 0 ? "-0" : t;
}
function Hv(e) {
  return !!e && typeof e == "object";
}
function qv(e) {
  return typeof e == "symbol" || Hv(e) && Bv.call(e) == Fv;
}
function Gv(e) {
  return e == null ? "" : jv(e);
}
function Vv(e) {
  return e = Gv(e), e && xv.test(e) ? e.replace(Pu, "\\$&") : e;
}
var Iu = Vv;
Object.defineProperty(se, "__esModule", { value: !0 });
se.Provider = void 0;
se.findFile = Kv;
se.parseUpdateInfo = Jv;
se.getFileList = Nu;
se.resolveFiles = Qv;
const vt = ce, Wv = Ee, Yv = At, zn = ze, zv = Iu;
class Xv {
  constructor(t) {
    this.runtimeOptions = t, this.requestHeaders = null, this.executor = t.executor;
  }
  // By default, the blockmap file is in the same directory as the main file
  // But some providers may have a different blockmap file, so we need to override this method
  getBlockMapFiles(t, r, n, i = null) {
    const a = (0, zn.newUrlFromBase)(`${t.pathname}.blockmap`, t);
    return [(0, zn.newUrlFromBase)(`${t.pathname.replace(new RegExp(zv(n), "g"), r)}.blockmap`, i ? new Yv.URL(i) : t), a];
  }
  get isUseMultipleRangeRequest() {
    return this.runtimeOptions.isUseMultipleRangeRequest !== !1;
  }
  getChannelFilePrefix() {
    if (this.runtimeOptions.platform === "linux") {
      const t = process.env.TEST_UPDATER_ARCH || process.arch;
      return "-linux" + (t === "x64" ? "" : `-${t}`);
    } else
      return this.runtimeOptions.platform === "darwin" ? "-mac" : "";
  }
  // due to historical reasons for windows we use channel name without platform specifier
  getDefaultChannelName() {
    return this.getCustomChannelName("latest");
  }
  getCustomChannelName(t) {
    return `${t}${this.getChannelFilePrefix()}`;
  }
  get fileExtraDownloadHeaders() {
    return null;
  }
  setRequestHeaders(t) {
    this.requestHeaders = t;
  }
  /**
   * Method to perform API request only to resolve update info, but not to download update.
   */
  httpRequest(t, r, n) {
    return this.executor.request(this.createRequestOptions(t, r), n);
  }
  createRequestOptions(t, r) {
    const n = {};
    return this.requestHeaders == null ? r != null && (n.headers = r) : n.headers = r == null ? this.requestHeaders : { ...this.requestHeaders, ...r }, (0, vt.configureRequestUrl)(t, n), n;
  }
}
se.Provider = Xv;
function Kv(e, t, r) {
  var n;
  if (e.length === 0)
    throw (0, vt.newError)("No files provided", "ERR_UPDATER_NO_FILES_PROVIDED");
  const i = e.filter((o) => o.url.pathname.toLowerCase().endsWith(`.${t.toLowerCase()}`)), a = (n = i.find((o) => [o.url.pathname, o.info.url].some((s) => s.includes(process.arch)))) !== null && n !== void 0 ? n : i.shift();
  return a || (r == null ? e[0] : e.find((o) => !r.some((s) => o.url.pathname.toLowerCase().endsWith(`.${s.toLowerCase()}`))));
}
function Jv(e, t, r) {
  if (e == null)
    throw (0, vt.newError)(`Cannot parse update info from ${t} in the latest release artifacts (${r}): rawData: null`, "ERR_UPDATER_INVALID_UPDATE_INFO");
  let n;
  try {
    n = (0, Wv.load)(e);
  } catch (i) {
    throw (0, vt.newError)(`Cannot parse update info from ${t} in the latest release artifacts (${r}): ${i.stack || i.message}, rawData: ${e}`, "ERR_UPDATER_INVALID_UPDATE_INFO");
  }
  return n;
}
function Nu(e) {
  const t = e.files;
  if (t != null && t.length > 0)
    return t;
  if (e.path != null)
    return [
      {
        url: e.path,
        sha2: e.sha2,
        sha512: e.sha512
      }
    ];
  throw (0, vt.newError)(`No files provided: ${(0, vt.safeStringifyJson)(e)}`, "ERR_UPDATER_NO_FILES_PROVIDED");
}
function Qv(e, t, r = (n) => n) {
  const i = Nu(e).map((s) => {
    if (s.sha2 == null && s.sha512 == null)
      throw (0, vt.newError)(`Update info doesn't contain nor sha256 neither sha512 checksum: ${(0, vt.safeStringifyJson)(s)}`, "ERR_UPDATER_NO_CHECKSUM");
    return {
      url: (0, zn.newUrlFromBase)(r(s.url), t),
      info: s
    };
  }), a = e.packages, o = a == null ? null : a[process.arch] || a.ia32;
  return o != null && (i[0].packageInfo = {
    ...o,
    path: (0, zn.newUrlFromBase)(r(o.path), t).href
  }), i;
}
Object.defineProperty(tn, "__esModule", { value: !0 });
tn.GenericProvider = void 0;
const qs = ce, Yi = ze, zi = se;
class Zv extends zi.Provider {
  constructor(t, r, n) {
    super(n), this.configuration = t, this.updater = r, this.baseUrl = (0, Yi.newBaseUrl)(this.configuration.url);
  }
  get channel() {
    const t = this.updater.channel || this.configuration.channel;
    return t == null ? this.getDefaultChannelName() : this.getCustomChannelName(t);
  }
  async getLatestVersion() {
    const t = (0, Yi.getChannelFilename)(this.channel), r = (0, Yi.newUrlFromBase)(t, this.baseUrl, this.updater.isAddNoCacheQuery);
    for (let n = 0; ; n++)
      try {
        return (0, zi.parseUpdateInfo)(await this.httpRequest(r), t, r);
      } catch (i) {
        if (i instanceof qs.HttpError && i.statusCode === 404)
          throw (0, qs.newError)(`Cannot find channel "${t}" update info: ${i.stack || i.message}`, "ERR_UPDATER_CHANNEL_FILE_NOT_FOUND");
        if (i.code === "ECONNREFUSED" && n < 3) {
          await new Promise((a, o) => {
            try {
              setTimeout(a, 1e3 * n);
            } catch (s) {
              o(s);
            }
          });
          continue;
        }
        throw i;
      }
  }
  resolveFiles(t) {
    return (0, zi.resolveFiles)(t, this.baseUrl);
  }
}
tn.GenericProvider = Zv;
var di = {}, hi = {};
Object.defineProperty(hi, "__esModule", { value: !0 });
hi.BitbucketProvider = void 0;
const Gs = ce, Xi = ze, Ki = se;
class ew extends Ki.Provider {
  constructor(t, r, n) {
    super({
      ...n,
      isUseMultipleRangeRequest: !1
    }), this.configuration = t, this.updater = r;
    const { owner: i, slug: a } = t;
    this.baseUrl = (0, Xi.newBaseUrl)(`https://api.bitbucket.org/2.0/repositories/${i}/${a}/downloads`);
  }
  get channel() {
    return this.updater.channel || this.configuration.channel || "latest";
  }
  async getLatestVersion() {
    const t = new Gs.CancellationToken(), r = (0, Xi.getChannelFilename)(this.getCustomChannelName(this.channel)), n = (0, Xi.newUrlFromBase)(r, this.baseUrl, this.updater.isAddNoCacheQuery);
    try {
      const i = await this.httpRequest(n, void 0, t);
      return (0, Ki.parseUpdateInfo)(i, r, n);
    } catch (i) {
      throw (0, Gs.newError)(`Unable to find latest version on ${this.toString()}, please ensure release exists: ${i.stack || i.message}`, "ERR_UPDATER_LATEST_VERSION_NOT_FOUND");
    }
  }
  resolveFiles(t) {
    return (0, Ki.resolveFiles)(t, this.baseUrl);
  }
  toString() {
    const { owner: t, slug: r } = this.configuration;
    return `Bitbucket (owner: ${t}, slug: ${r}, channel: ${this.channel})`;
  }
}
hi.BitbucketProvider = ew;
var wt = {};
Object.defineProperty(wt, "__esModule", { value: !0 });
wt.GitHubProvider = wt.BaseGitHubProvider = void 0;
wt.computeReleaseNotes = $u;
const rt = ce, Ft = bu, tw = At, er = ze, _a = se, Ji = /\/tag\/([^/]+)$/;
class Du extends _a.Provider {
  constructor(t, r, n) {
    super({
      ...n,
      /* because GitHib uses S3 */
      isUseMultipleRangeRequest: !1
    }), this.options = t, this.baseUrl = (0, er.newBaseUrl)((0, rt.githubUrl)(t, r));
    const i = r === "github.com" ? "api.github.com" : r;
    this.baseApiUrl = (0, er.newBaseUrl)((0, rt.githubUrl)(t, i));
  }
  computeGithubBasePath(t) {
    const r = this.options.host;
    return r && !["github.com", "api.github.com"].includes(r) ? `/api/v3${t}` : t;
  }
}
wt.BaseGitHubProvider = Du;
class rw extends Du {
  constructor(t, r, n) {
    super(t, "github.com", n), this.options = t, this.updater = r;
  }
  get channel() {
    const t = this.updater.channel || this.options.channel;
    return t == null ? this.getDefaultChannelName() : this.getCustomChannelName(t);
  }
  async getLatestVersion() {
    var t, r, n, i, a;
    const o = new rt.CancellationToken(), s = await this.httpRequest((0, er.newUrlFromBase)(`${this.basePath}.atom`, this.baseUrl), {
      accept: "application/xml, application/atom+xml, text/xml, */*"
    }, o), l = (0, rt.parseXml)(s);
    let m = l.element("entry", !1, "No published versions on GitHub"), c = null;
    try {
      if (this.updater.allowPrerelease) {
        const A = ((t = this.updater) === null || t === void 0 ? void 0 : t.channel) || ((r = Ft.prerelease(this.updater.currentVersion)) === null || r === void 0 ? void 0 : r[0]) || null;
        if (A === null)
          c = Ji.exec(m.element("link").attribute("href"))[1];
        else
          for (const S of l.getElements("entry")) {
            const T = Ji.exec(S.element("link").attribute("href"));
            if (T === null)
              continue;
            const D = T[1], x = ((n = Ft.prerelease(D)) === null || n === void 0 ? void 0 : n[0]) || null, Z = !A || ["alpha", "beta"].includes(A), ae = x !== null && !["alpha", "beta"].includes(String(x));
            if (Z && !ae && !(A === "beta" && x === "alpha")) {
              c = D;
              break;
            }
            if (x && x === A) {
              c = D;
              break;
            }
          }
      } else {
        c = await this.getLatestTagName(o);
        for (const A of l.getElements("entry"))
          if (Ji.exec(A.element("link").attribute("href"))[1] === c) {
            m = A;
            break;
          }
      }
    } catch (A) {
      throw (0, rt.newError)(`Cannot parse releases feed: ${A.stack || A.message},
XML:
${s}`, "ERR_UPDATER_INVALID_RELEASE_FEED");
    }
    if (c == null)
      throw (0, rt.newError)("No published versions on GitHub", "ERR_UPDATER_NO_PUBLISHED_VERSIONS");
    let f, d = "", g = "";
    const v = async (A) => {
      d = (0, er.getChannelFilename)(A), g = (0, er.newUrlFromBase)(this.getBaseDownloadPath(String(c), d), this.baseUrl);
      const S = this.createRequestOptions(g);
      try {
        return await this.executor.request(S, o);
      } catch (T) {
        throw T instanceof rt.HttpError && T.statusCode === 404 ? (0, rt.newError)(`Cannot find ${d} in the latest release artifacts (${g}): ${T.stack || T.message}`, "ERR_UPDATER_CHANNEL_FILE_NOT_FOUND") : T;
      }
    };
    try {
      let A = this.channel;
      this.updater.allowPrerelease && (!((i = Ft.prerelease(c)) === null || i === void 0) && i[0]) && (A = this.getCustomChannelName(String((a = Ft.prerelease(c)) === null || a === void 0 ? void 0 : a[0]))), f = await v(A);
    } catch (A) {
      if (this.updater.allowPrerelease)
        f = await v(this.getDefaultChannelName());
      else
        throw A;
    }
    const y = (0, _a.parseUpdateInfo)(f, d, g);
    return y.releaseName == null && (y.releaseName = m.elementValueOrEmpty("title")), y.releaseNotes == null && (y.releaseNotes = $u(this.updater.currentVersion, this.updater.fullChangelog, l, m)), {
      tag: c,
      ...y
    };
  }
  async getLatestTagName(t) {
    const r = this.options, n = r.host == null || r.host === "github.com" ? (0, er.newUrlFromBase)(`${this.basePath}/latest`, this.baseUrl) : new tw.URL(`${this.computeGithubBasePath(`/repos/${r.owner}/${r.repo}/releases`)}/latest`, this.baseApiUrl);
    try {
      const i = await this.httpRequest(n, { Accept: "application/json" }, t);
      return i == null ? null : JSON.parse(i).tag_name;
    } catch (i) {
      throw (0, rt.newError)(`Unable to find latest version on GitHub (${n}), please ensure a production release exists: ${i.stack || i.message}`, "ERR_UPDATER_LATEST_VERSION_NOT_FOUND");
    }
  }
  get basePath() {
    return `/${this.options.owner}/${this.options.repo}/releases`;
  }
  resolveFiles(t) {
    return (0, _a.resolveFiles)(t, this.baseUrl, (r) => this.getBaseDownloadPath(t.tag, r.replace(/ /g, "-")));
  }
  getBaseDownloadPath(t, r) {
    return `${this.basePath}/download/${t}/${r}`;
  }
}
wt.GitHubProvider = rw;
function Vs(e) {
  const t = e.elementValueOrEmpty("content");
  return t === "No content." ? "" : t;
}
function $u(e, t, r, n) {
  if (!t)
    return Vs(n);
  const i = [];
  for (const a of r.getElements("entry")) {
    const o = /\/tag\/v?([^/]+)$/.exec(a.element("link").attribute("href"))[1];
    Ft.valid(o) && Ft.lt(e, o) && i.push({
      version: o,
      note: Vs(a)
    });
  }
  return i.sort((a, o) => Ft.rcompare(a.version, o.version));
}
var pi = {};
Object.defineProperty(pi, "__esModule", { value: !0 });
pi.GitLabProvider = void 0;
const Ae = ce, Qi = At, nw = Iu, Rn = ze, Zi = se;
class iw extends Zi.Provider {
  /**
   * Normalizes filenames by replacing spaces and underscores with dashes.
   *
   * This is a workaround to handle filename formatting differences between tools:
   * - electron-builder formats filenames like "test file.txt" as "test-file.txt"
   * - GitLab may provide asset URLs using underscores, such as "test_file.txt"
   *
   * Because of this mismatch, we can't reliably extract the correct filename from
   * the asset path without normalization. This function ensures consistent matching
   * across different filename formats by converting all spaces and underscores to dashes.
   *
   * @param filename The filename to normalize
   * @returns The normalized filename with spaces and underscores replaced by dashes
   */
  normalizeFilename(t) {
    return t.replace(/ |_/g, "-");
  }
  constructor(t, r, n) {
    super({
      ...n,
      // GitLab might not support multiple range requests efficiently
      isUseMultipleRangeRequest: !1
    }), this.options = t, this.updater = r, this.cachedLatestVersion = null;
    const a = t.host || "gitlab.com";
    this.baseApiUrl = (0, Rn.newBaseUrl)(`https://${a}/api/v4`);
  }
  get channel() {
    const t = this.updater.channel || this.options.channel;
    return t == null ? this.getDefaultChannelName() : this.getCustomChannelName(t);
  }
  async getLatestVersion() {
    const t = new Ae.CancellationToken(), r = (0, Rn.newUrlFromBase)(`projects/${this.options.projectId}/releases/permalink/latest`, this.baseApiUrl);
    let n;
    try {
      const d = { "Content-Type": "application/json", ...this.setAuthHeaderForToken(this.options.token || null) }, g = await this.httpRequest(r, d, t);
      if (!g)
        throw (0, Ae.newError)("No latest release found", "ERR_UPDATER_NO_PUBLISHED_VERSIONS");
      n = JSON.parse(g);
    } catch (d) {
      throw (0, Ae.newError)(`Unable to find latest release on GitLab (${r}): ${d.stack || d.message}`, "ERR_UPDATER_LATEST_VERSION_NOT_FOUND");
    }
    const i = n.tag_name;
    let a = null, o = "", s = null;
    const l = async (d) => {
      o = (0, Rn.getChannelFilename)(d);
      const g = n.assets.links.find((y) => y.name === o);
      if (!g)
        throw (0, Ae.newError)(`Cannot find ${o} in the latest release assets`, "ERR_UPDATER_CHANNEL_FILE_NOT_FOUND");
      s = new Qi.URL(g.direct_asset_url);
      const v = this.options.token ? { "PRIVATE-TOKEN": this.options.token } : void 0;
      try {
        const y = await this.httpRequest(s, v, t);
        if (!y)
          throw (0, Ae.newError)(`Empty response from ${s}`, "ERR_UPDATER_CHANNEL_FILE_NOT_FOUND");
        return y;
      } catch (y) {
        throw y instanceof Ae.HttpError && y.statusCode === 404 ? (0, Ae.newError)(`Cannot find ${o} in the latest release artifacts (${s}): ${y.stack || y.message}`, "ERR_UPDATER_CHANNEL_FILE_NOT_FOUND") : y;
      }
    };
    try {
      a = await l(this.channel);
    } catch (d) {
      if (this.channel !== this.getDefaultChannelName())
        a = await l(this.getDefaultChannelName());
      else
        throw d;
    }
    if (!a)
      throw (0, Ae.newError)(`Unable to parse channel data from ${o}`, "ERR_UPDATER_INVALID_UPDATE_INFO");
    const m = (0, Zi.parseUpdateInfo)(a, o, s);
    m.releaseName == null && (m.releaseName = n.name), m.releaseNotes == null && (m.releaseNotes = n.description || null);
    const c = /* @__PURE__ */ new Map();
    for (const d of n.assets.links)
      c.set(this.normalizeFilename(d.name), d.direct_asset_url);
    const f = {
      tag: i,
      assets: c,
      ...m
    };
    return this.cachedLatestVersion = f, f;
  }
  /**
   * Utility function to convert GitlabReleaseAsset to Map<string, string>
   * Maps asset names to their download URLs
   */
  convertAssetsToMap(t) {
    const r = /* @__PURE__ */ new Map();
    for (const n of t.links)
      r.set(this.normalizeFilename(n.name), n.direct_asset_url);
    return r;
  }
  /**
   * Find blockmap file URL in assets map for a specific filename
   */
  findBlockMapInAssets(t, r) {
    const n = [`${r}.blockmap`, `${this.normalizeFilename(r)}.blockmap`];
    for (const i of n) {
      const a = t.get(i);
      if (a)
        return new Qi.URL(a);
    }
    return null;
  }
  async fetchReleaseInfoByVersion(t) {
    const r = new Ae.CancellationToken(), n = [`v${t}`, t];
    for (const i of n) {
      const a = (0, Rn.newUrlFromBase)(`projects/${this.options.projectId}/releases/${encodeURIComponent(i)}`, this.baseApiUrl);
      try {
        const o = { "Content-Type": "application/json", ...this.setAuthHeaderForToken(this.options.token || null) }, s = await this.httpRequest(a, o, r);
        if (s)
          return JSON.parse(s);
      } catch (o) {
        if (o instanceof Ae.HttpError && o.statusCode === 404)
          continue;
        throw (0, Ae.newError)(`Unable to find release ${i} on GitLab (${a}): ${o.stack || o.message}`, "ERR_UPDATER_RELEASE_NOT_FOUND");
      }
    }
    throw (0, Ae.newError)(`Unable to find release with version ${t} (tried: ${n.join(", ")}) on GitLab`, "ERR_UPDATER_RELEASE_NOT_FOUND");
  }
  setAuthHeaderForToken(t) {
    const r = {};
    return t != null && (t.startsWith("Bearer") ? r.authorization = t : r["PRIVATE-TOKEN"] = t), r;
  }
  /**
   * Get version info for blockmap files, using cache when possible
   */
  async getVersionInfoForBlockMap(t) {
    if (this.cachedLatestVersion && this.cachedLatestVersion.version === t)
      return this.cachedLatestVersion.assets;
    const r = await this.fetchReleaseInfoByVersion(t);
    return r && r.assets ? this.convertAssetsToMap(r.assets) : null;
  }
  /**
   * Find blockmap URLs from version assets
   */
  async findBlockMapUrlsFromAssets(t, r, n) {
    let i = null, a = null;
    const o = await this.getVersionInfoForBlockMap(r);
    o && (i = this.findBlockMapInAssets(o, n));
    const s = await this.getVersionInfoForBlockMap(t);
    if (s) {
      const l = n.replace(new RegExp(nw(r), "g"), t);
      a = this.findBlockMapInAssets(s, l);
    }
    return [a, i];
  }
  async getBlockMapFiles(t, r, n, i = null) {
    if (this.options.uploadTarget === "project_upload") {
      const a = t.pathname.split("/").pop() || "", [o, s] = await this.findBlockMapUrlsFromAssets(r, n, a);
      if (!s)
        throw (0, Ae.newError)(`Cannot find blockmap file for ${n} in GitLab assets`, "ERR_UPDATER_BLOCKMAP_FILE_NOT_FOUND");
      if (!o)
        throw (0, Ae.newError)(`Cannot find blockmap file for ${r} in GitLab assets`, "ERR_UPDATER_BLOCKMAP_FILE_NOT_FOUND");
      return [o, s];
    } else
      return super.getBlockMapFiles(t, r, n, i);
  }
  resolveFiles(t) {
    return (0, Zi.getFileList)(t).map((r) => {
      const i = [
        r.url,
        // Original filename
        this.normalizeFilename(r.url)
        // Normalized filename (spaces/underscores → dashes)
      ].find((o) => t.assets.has(o)), a = i ? t.assets.get(i) : void 0;
      if (!a)
        throw (0, Ae.newError)(`Cannot find asset "${r.url}" in GitLab release assets. Available assets: ${Array.from(t.assets.keys()).join(", ")}`, "ERR_UPDATER_ASSET_NOT_FOUND");
      return {
        url: new Qi.URL(a),
        info: r
      };
    });
  }
  toString() {
    return `GitLab (projectId: ${this.options.projectId}, channel: ${this.channel})`;
  }
}
pi.GitLabProvider = iw;
var mi = {};
Object.defineProperty(mi, "__esModule", { value: !0 });
mi.KeygenProvider = void 0;
const Ws = ce, ea = ze, ta = se;
class aw extends ta.Provider {
  constructor(t, r, n) {
    super({
      ...n,
      isUseMultipleRangeRequest: !1
    }), this.configuration = t, this.updater = r, this.defaultHostname = "api.keygen.sh";
    const i = this.configuration.host || this.defaultHostname;
    this.baseUrl = (0, ea.newBaseUrl)(`https://${i}/v1/accounts/${this.configuration.account}/artifacts?product=${this.configuration.product}`);
  }
  get channel() {
    return this.updater.channel || this.configuration.channel || "stable";
  }
  async getLatestVersion() {
    const t = new Ws.CancellationToken(), r = (0, ea.getChannelFilename)(this.getCustomChannelName(this.channel)), n = (0, ea.newUrlFromBase)(r, this.baseUrl, this.updater.isAddNoCacheQuery);
    try {
      const i = await this.httpRequest(n, {
        Accept: "application/vnd.api+json",
        "Keygen-Version": "1.1"
      }, t);
      return (0, ta.parseUpdateInfo)(i, r, n);
    } catch (i) {
      throw (0, Ws.newError)(`Unable to find latest version on ${this.toString()}, please ensure release exists: ${i.stack || i.message}`, "ERR_UPDATER_LATEST_VERSION_NOT_FOUND");
    }
  }
  resolveFiles(t) {
    return (0, ta.resolveFiles)(t, this.baseUrl);
  }
  toString() {
    const { account: t, product: r, platform: n } = this.configuration;
    return `Keygen (account: ${t}, product: ${r}, platform: ${n}, channel: ${this.channel})`;
  }
}
mi.KeygenProvider = aw;
var gi = {};
Object.defineProperty(gi, "__esModule", { value: !0 });
gi.PrivateGitHubProvider = void 0;
const Yt = ce, ow = Ee, sw = re, Ys = At, zs = ze, lw = wt, cw = se;
class uw extends lw.BaseGitHubProvider {
  constructor(t, r, n, i) {
    super(t, "api.github.com", i), this.updater = r, this.token = n;
  }
  createRequestOptions(t, r) {
    const n = super.createRequestOptions(t, r);
    return n.redirect = "manual", n;
  }
  async getLatestVersion() {
    const t = new Yt.CancellationToken(), r = (0, zs.getChannelFilename)(this.getDefaultChannelName()), n = await this.getLatestVersionInfo(t), i = n.assets.find((s) => s.name === r);
    if (i == null)
      throw (0, Yt.newError)(`Cannot find ${r} in the release ${n.html_url || n.name}`, "ERR_UPDATER_CHANNEL_FILE_NOT_FOUND");
    const a = new Ys.URL(i.url);
    let o;
    try {
      o = (0, ow.load)(await this.httpRequest(a, this.configureHeaders("application/octet-stream"), t));
    } catch (s) {
      throw s instanceof Yt.HttpError && s.statusCode === 404 ? (0, Yt.newError)(`Cannot find ${r} in the latest release artifacts (${a}): ${s.stack || s.message}`, "ERR_UPDATER_CHANNEL_FILE_NOT_FOUND") : s;
    }
    return o.assets = n.assets, o;
  }
  get fileExtraDownloadHeaders() {
    return this.configureHeaders("application/octet-stream");
  }
  configureHeaders(t) {
    return {
      accept: t,
      authorization: `token ${this.token}`
    };
  }
  async getLatestVersionInfo(t) {
    const r = this.updater.allowPrerelease;
    let n = this.basePath;
    r || (n = `${n}/latest`);
    const i = (0, zs.newUrlFromBase)(n, this.baseUrl);
    try {
      const a = JSON.parse(await this.httpRequest(i, this.configureHeaders("application/vnd.github.v3+json"), t));
      return r ? a.find((o) => o.prerelease) || a[0] : a;
    } catch (a) {
      throw (0, Yt.newError)(`Unable to find latest version on GitHub (${i}), please ensure a production release exists: ${a.stack || a.message}`, "ERR_UPDATER_LATEST_VERSION_NOT_FOUND");
    }
  }
  get basePath() {
    return this.computeGithubBasePath(`/repos/${this.options.owner}/${this.options.repo}/releases`);
  }
  resolveFiles(t) {
    return (0, cw.getFileList)(t).map((r) => {
      const n = sw.posix.basename(r.url).replace(/ /g, "-"), i = t.assets.find((a) => a != null && a.name === n);
      if (i == null)
        throw (0, Yt.newError)(`Cannot find asset "${n}" in: ${JSON.stringify(t.assets, null, 2)}`, "ERR_UPDATER_ASSET_NOT_FOUND");
      return {
        url: new Ys.URL(i.url),
        info: r
      };
    });
  }
}
gi.PrivateGitHubProvider = uw;
Object.defineProperty(di, "__esModule", { value: !0 });
di.isUrlProbablySupportMultiRangeRequests = Fu;
di.createClient = gw;
const On = ce, fw = hi, Xs = tn, dw = wt, hw = pi, pw = mi, mw = gi;
function Fu(e) {
  return !e.includes("s3.amazonaws.com");
}
function gw(e, t, r) {
  if (typeof e == "string")
    throw (0, On.newError)("Please pass PublishConfiguration object", "ERR_UPDATER_INVALID_PROVIDER_CONFIGURATION");
  const n = e.provider;
  switch (n) {
    case "github": {
      const i = e, a = (i.private ? process.env.GH_TOKEN || process.env.GITHUB_TOKEN : null) || i.token;
      return a == null ? new dw.GitHubProvider(i, t, r) : new mw.PrivateGitHubProvider(i, t, a, r);
    }
    case "bitbucket":
      return new fw.BitbucketProvider(e, t, r);
    case "gitlab":
      return new hw.GitLabProvider(e, t, r);
    case "keygen":
      return new pw.KeygenProvider(e, t, r);
    case "s3":
    case "spaces":
      return new Xs.GenericProvider({
        provider: "generic",
        url: (0, On.getS3LikeProviderBaseUrl)(e),
        channel: e.channel || null
      }, t, {
        ...r,
        // https://github.com/minio/minio/issues/5285#issuecomment-350428955
        isUseMultipleRangeRequest: !1
      });
    case "generic": {
      const i = e;
      return new Xs.GenericProvider(i, t, {
        ...r,
        isUseMultipleRangeRequest: i.useMultipleRangeRequest !== !1 && Fu(i.url)
      });
    }
    case "custom": {
      const i = e, a = i.updateProvider;
      if (!a)
        throw (0, On.newError)("Custom provider not specified", "ERR_UPDATER_INVALID_PROVIDER_CONFIGURATION");
      return new a(i, t, r);
    }
    default:
      throw (0, On.newError)(`Unsupported provider: ${n}`, "ERR_UPDATER_UNSUPPORTED_PROVIDER");
  }
}
var Ei = {}, rn = {}, dr = {}, qt = {};
Object.defineProperty(qt, "__esModule", { value: !0 });
qt.OperationKind = void 0;
qt.computeOperations = Ew;
var xt;
(function(e) {
  e[e.COPY = 0] = "COPY", e[e.DOWNLOAD = 1] = "DOWNLOAD";
})(xt || (qt.OperationKind = xt = {}));
function Ew(e, t, r) {
  const n = Js(e.files), i = Js(t.files);
  let a = null;
  const o = t.files[0], s = [], l = o.name, m = n.get(l);
  if (m == null)
    throw new Error(`no file ${l} in old blockmap`);
  const c = i.get(l);
  let f = 0;
  const { checksumToOffset: d, checksumToOldSize: g } = vw(n.get(l), m.offset, r);
  let v = o.offset;
  for (let y = 0; y < c.checksums.length; v += c.sizes[y], y++) {
    const A = c.sizes[y], S = c.checksums[y];
    let T = d.get(S);
    T != null && g.get(S) !== A && (r.warn(`Checksum ("${S}") matches, but size differs (old: ${g.get(S)}, new: ${A})`), T = void 0), T === void 0 ? (f++, a != null && a.kind === xt.DOWNLOAD && a.end === v ? a.end += A : (a = {
      kind: xt.DOWNLOAD,
      start: v,
      end: v + A
      // oldBlocks: null,
    }, Ks(a, s, S, y))) : a != null && a.kind === xt.COPY && a.end === T ? a.end += A : (a = {
      kind: xt.COPY,
      start: T,
      end: T + A
      // oldBlocks: [checksum]
    }, Ks(a, s, S, y));
  }
  return f > 0 && r.info(`File${o.name === "file" ? "" : " " + o.name} has ${f} changed blocks`), s;
}
const yw = process.env.DIFFERENTIAL_DOWNLOAD_PLAN_BUILDER_VALIDATE_RANGES === "true";
function Ks(e, t, r, n) {
  if (yw && t.length !== 0) {
    const i = t[t.length - 1];
    if (i.kind === e.kind && e.start < i.end && e.start > i.start) {
      const a = [i.start, i.end, e.start, e.end].reduce((o, s) => o < s ? o : s);
      throw new Error(`operation (block index: ${n}, checksum: ${r}, kind: ${xt[e.kind]}) overlaps previous operation (checksum: ${r}):
abs: ${i.start} until ${i.end} and ${e.start} until ${e.end}
rel: ${i.start - a} until ${i.end - a} and ${e.start - a} until ${e.end - a}`);
    }
  }
  t.push(e);
}
function vw(e, t, r) {
  const n = /* @__PURE__ */ new Map(), i = /* @__PURE__ */ new Map();
  let a = t;
  for (let o = 0; o < e.checksums.length; o++) {
    const s = e.checksums[o], l = e.sizes[o], m = i.get(s);
    if (m === void 0)
      n.set(s, a), i.set(s, l);
    else if (r.debug != null) {
      const c = m === l ? "(same size)" : `(size: ${m}, this size: ${l})`;
      r.debug(`${s} duplicated in blockmap ${c}, it doesn't lead to broken differential downloader, just corresponding block will be skipped)`);
    }
    a += l;
  }
  return { checksumToOffset: n, checksumToOldSize: i };
}
function Js(e) {
  const t = /* @__PURE__ */ new Map();
  for (const r of e)
    t.set(r.name, r);
  return t;
}
Object.defineProperty(dr, "__esModule", { value: !0 });
dr.DataSplitter = void 0;
dr.copyData = xu;
const Pn = ce, ww = _t, _w = Vr, Aw = qt, Qs = Buffer.from(`\r
\r
`);
var ut;
(function(e) {
  e[e.INIT = 0] = "INIT", e[e.HEADER = 1] = "HEADER", e[e.BODY = 2] = "BODY";
})(ut || (ut = {}));
function xu(e, t, r, n, i) {
  const a = (0, ww.createReadStream)("", {
    fd: r,
    autoClose: !1,
    start: e.start,
    // end is inclusive
    end: e.end - 1
  });
  a.on("error", n), a.once("end", i), a.pipe(t, {
    end: !1
  });
}
class Tw extends _w.Writable {
  constructor(t, r, n, i, a, o, s, l) {
    super(), this.out = t, this.options = r, this.partIndexToTaskIndex = n, this.partIndexToLength = a, this.finishHandler = o, this.grandTotalBytes = s, this.onProgress = l, this.start = Date.now(), this.nextUpdate = this.start + 1e3, this.transferred = 0, this.delta = 0, this.partIndex = -1, this.headerListBuffer = null, this.readState = ut.INIT, this.ignoreByteCount = 0, this.remainingPartDataCount = 0, this.actualPartLength = 0, this.boundaryLength = i.length + 4, this.ignoreByteCount = this.boundaryLength - 2;
  }
  get isFinished() {
    return this.partIndex === this.partIndexToLength.length;
  }
  // noinspection JSUnusedGlobalSymbols
  _write(t, r, n) {
    if (this.isFinished) {
      console.error(`Trailing ignored data: ${t.length} bytes`);
      return;
    }
    this.handleData(t).then(() => {
      if (this.onProgress) {
        const i = Date.now();
        (i >= this.nextUpdate || this.transferred === this.grandTotalBytes) && this.grandTotalBytes && (i - this.start) / 1e3 && (this.nextUpdate = i + 1e3, this.onProgress({
          total: this.grandTotalBytes,
          delta: this.delta,
          transferred: this.transferred,
          percent: this.transferred / this.grandTotalBytes * 100,
          bytesPerSecond: Math.round(this.transferred / ((i - this.start) / 1e3))
        }), this.delta = 0);
      }
      n();
    }).catch(n);
  }
  async handleData(t) {
    let r = 0;
    if (this.ignoreByteCount !== 0 && this.remainingPartDataCount !== 0)
      throw (0, Pn.newError)("Internal error", "ERR_DATA_SPLITTER_BYTE_COUNT_MISMATCH");
    if (this.ignoreByteCount > 0) {
      const n = Math.min(this.ignoreByteCount, t.length);
      this.ignoreByteCount -= n, r = n;
    } else if (this.remainingPartDataCount > 0) {
      const n = Math.min(this.remainingPartDataCount, t.length);
      this.remainingPartDataCount -= n, await this.processPartData(t, 0, n), r = n;
    }
    if (r !== t.length) {
      if (this.readState === ut.HEADER) {
        const n = this.searchHeaderListEnd(t, r);
        if (n === -1)
          return;
        r = n, this.readState = ut.BODY, this.headerListBuffer = null;
      }
      for (; ; ) {
        if (this.readState === ut.BODY)
          this.readState = ut.INIT;
        else {
          this.partIndex++;
          let o = this.partIndexToTaskIndex.get(this.partIndex);
          if (o == null)
            if (this.isFinished)
              o = this.options.end;
            else
              throw (0, Pn.newError)("taskIndex is null", "ERR_DATA_SPLITTER_TASK_INDEX_IS_NULL");
          const s = this.partIndex === 0 ? this.options.start : this.partIndexToTaskIndex.get(this.partIndex - 1) + 1;
          if (s < o)
            await this.copyExistingData(s, o);
          else if (s > o)
            throw (0, Pn.newError)("prevTaskIndex must be < taskIndex", "ERR_DATA_SPLITTER_TASK_INDEX_ASSERT_FAILED");
          if (this.isFinished) {
            this.onPartEnd(), this.finishHandler();
            return;
          }
          if (r = this.searchHeaderListEnd(t, r), r === -1) {
            this.readState = ut.HEADER;
            return;
          }
        }
        const n = this.partIndexToLength[this.partIndex], i = r + n, a = Math.min(i, t.length);
        if (await this.processPartStarted(t, r, a), this.remainingPartDataCount = n - (a - r), this.remainingPartDataCount > 0)
          return;
        if (r = i + this.boundaryLength, r >= t.length) {
          this.ignoreByteCount = this.boundaryLength - (t.length - i);
          return;
        }
      }
    }
  }
  copyExistingData(t, r) {
    return new Promise((n, i) => {
      const a = () => {
        if (t === r) {
          n();
          return;
        }
        const o = this.options.tasks[t];
        if (o.kind !== Aw.OperationKind.COPY) {
          i(new Error("Task kind must be COPY"));
          return;
        }
        xu(o, this.out, this.options.oldFileFd, i, () => {
          t++, a();
        });
      };
      a();
    });
  }
  searchHeaderListEnd(t, r) {
    const n = t.indexOf(Qs, r);
    if (n !== -1)
      return n + Qs.length;
    const i = r === 0 ? t : t.slice(r);
    return this.headerListBuffer == null ? this.headerListBuffer = i : this.headerListBuffer = Buffer.concat([this.headerListBuffer, i]), -1;
  }
  onPartEnd() {
    const t = this.partIndexToLength[this.partIndex - 1];
    if (this.actualPartLength !== t)
      throw (0, Pn.newError)(`Expected length: ${t} differs from actual: ${this.actualPartLength}`, "ERR_DATA_SPLITTER_LENGTH_MISMATCH");
    this.actualPartLength = 0;
  }
  processPartStarted(t, r, n) {
    return this.partIndex !== 0 && this.onPartEnd(), this.processPartData(t, r, n);
  }
  processPartData(t, r, n) {
    this.actualPartLength += n - r, this.transferred += n - r, this.delta += n - r;
    const i = this.out;
    return i.write(r === 0 && t.length === n ? t : t.slice(r, n)) ? Promise.resolve() : new Promise((a, o) => {
      i.on("error", o), i.once("drain", () => {
        i.removeListener("error", o), a();
      });
    });
  }
}
dr.DataSplitter = Tw;
var yi = {};
Object.defineProperty(yi, "__esModule", { value: !0 });
yi.executeTasksUsingMultipleRangeRequests = Sw;
yi.checkIsRangesSupported = Ta;
const Aa = ce, Zs = dr, el = qt;
function Sw(e, t, r, n, i) {
  const a = (o) => {
    if (o >= t.length) {
      e.fileMetadataBuffer != null && r.write(e.fileMetadataBuffer), r.end();
      return;
    }
    const s = o + 1e3;
    Cw(e, {
      tasks: t,
      start: o,
      end: Math.min(t.length, s),
      oldFileFd: n
    }, r, () => a(s), i);
  };
  return a;
}
function Cw(e, t, r, n, i) {
  let a = "bytes=", o = 0, s = 0;
  const l = /* @__PURE__ */ new Map(), m = [];
  for (let d = t.start; d < t.end; d++) {
    const g = t.tasks[d];
    g.kind === el.OperationKind.DOWNLOAD && (a += `${g.start}-${g.end - 1}, `, l.set(o, d), o++, m.push(g.end - g.start), s += g.end - g.start);
  }
  if (o <= 1) {
    const d = (g) => {
      if (g >= t.end) {
        n();
        return;
      }
      const v = t.tasks[g++];
      if (v.kind === el.OperationKind.COPY)
        (0, Zs.copyData)(v, r, t.oldFileFd, i, () => d(g));
      else {
        const y = e.createRequestOptions();
        y.headers.Range = `bytes=${v.start}-${v.end - 1}`;
        const A = e.httpExecutor.createRequest(y, (S) => {
          S.on("error", i), Ta(S, i) && (S.pipe(r, {
            end: !1
          }), S.once("end", () => d(g)));
        });
        e.httpExecutor.addErrorAndTimeoutHandlers(A, i), A.end();
      }
    };
    d(t.start);
    return;
  }
  const c = e.createRequestOptions();
  c.headers.Range = a.substring(0, a.length - 2);
  const f = e.httpExecutor.createRequest(c, (d) => {
    if (!Ta(d, i))
      return;
    const g = (0, Aa.safeGetHeader)(d, "content-type"), v = /^multipart\/.+?\s*;\s*boundary=(?:"([^"]+)"|([^\s";]+))\s*$/i.exec(g);
    if (v == null) {
      i(new Error(`Content-Type "multipart/byteranges" is expected, but got "${g}"`));
      return;
    }
    const y = new Zs.DataSplitter(r, t, l, v[1] || v[2], m, n, s, e.options.onProgress);
    y.on("error", i), d.pipe(y), d.on("end", () => {
      setTimeout(() => {
        f.abort(), i(new Error("Response ends without calling any handlers"));
      }, 1e4);
    });
  });
  e.httpExecutor.addErrorAndTimeoutHandlers(f, i), f.end();
}
function Ta(e, t) {
  if (e.statusCode >= 400)
    return t((0, Aa.createHttpError)(e)), !1;
  if (e.statusCode !== 206) {
    const r = (0, Aa.safeGetHeader)(e, "accept-ranges");
    if (r == null || r === "none")
      return t(new Error(`Server doesn't support Accept-Ranges (response code ${e.statusCode})`)), !1;
  }
  return !0;
}
var vi = {};
Object.defineProperty(vi, "__esModule", { value: !0 });
vi.ProgressDifferentialDownloadCallbackTransform = void 0;
const bw = Vr;
var tr;
(function(e) {
  e[e.COPY = 0] = "COPY", e[e.DOWNLOAD = 1] = "DOWNLOAD";
})(tr || (tr = {}));
class Rw extends bw.Transform {
  constructor(t, r, n) {
    super(), this.progressDifferentialDownloadInfo = t, this.cancellationToken = r, this.onProgress = n, this.start = Date.now(), this.transferred = 0, this.delta = 0, this.expectedBytes = 0, this.index = 0, this.operationType = tr.COPY, this.nextUpdate = this.start + 1e3;
  }
  _transform(t, r, n) {
    if (this.cancellationToken.cancelled) {
      n(new Error("cancelled"), null);
      return;
    }
    if (this.operationType == tr.COPY) {
      n(null, t);
      return;
    }
    this.transferred += t.length, this.delta += t.length;
    const i = Date.now();
    i >= this.nextUpdate && this.transferred !== this.expectedBytes && this.transferred !== this.progressDifferentialDownloadInfo.grandTotal && (this.nextUpdate = i + 1e3, this.onProgress({
      total: this.progressDifferentialDownloadInfo.grandTotal,
      delta: this.delta,
      transferred: this.transferred,
      percent: this.transferred / this.progressDifferentialDownloadInfo.grandTotal * 100,
      bytesPerSecond: Math.round(this.transferred / ((i - this.start) / 1e3))
    }), this.delta = 0), n(null, t);
  }
  beginFileCopy() {
    this.operationType = tr.COPY;
  }
  beginRangeDownload() {
    this.operationType = tr.DOWNLOAD, this.expectedBytes += this.progressDifferentialDownloadInfo.expectedByteCounts[this.index++];
  }
  endRangeDownload() {
    this.transferred !== this.progressDifferentialDownloadInfo.grandTotal && this.onProgress({
      total: this.progressDifferentialDownloadInfo.grandTotal,
      delta: this.delta,
      transferred: this.transferred,
      percent: this.transferred / this.progressDifferentialDownloadInfo.grandTotal * 100,
      bytesPerSecond: Math.round(this.transferred / ((Date.now() - this.start) / 1e3))
    });
  }
  // Called when we are 100% done with the connection/download
  _flush(t) {
    if (this.cancellationToken.cancelled) {
      t(new Error("cancelled"));
      return;
    }
    this.onProgress({
      total: this.progressDifferentialDownloadInfo.grandTotal,
      delta: this.delta,
      transferred: this.transferred,
      percent: 100,
      bytesPerSecond: Math.round(this.transferred / ((Date.now() - this.start) / 1e3))
    }), this.delta = 0, this.transferred = 0, t(null);
  }
}
vi.ProgressDifferentialDownloadCallbackTransform = Rw;
Object.defineProperty(rn, "__esModule", { value: !0 });
rn.DifferentialDownloader = void 0;
const _r = ce, ra = Tt, Ow = _t, Pw = dr, Iw = At, In = qt, tl = yi, Nw = vi;
class Dw {
  // noinspection TypeScriptAbstractClassConstructorCanBeMadeProtected
  constructor(t, r, n) {
    this.blockAwareFileInfo = t, this.httpExecutor = r, this.options = n, this.fileMetadataBuffer = null, this.logger = n.logger;
  }
  createRequestOptions() {
    const t = {
      headers: {
        ...this.options.requestHeaders,
        accept: "*/*"
      }
    };
    return (0, _r.configureRequestUrl)(this.options.newUrl, t), (0, _r.configureRequestOptions)(t), t;
  }
  doDownload(t, r) {
    if (t.version !== r.version)
      throw new Error(`version is different (${t.version} - ${r.version}), full download is required`);
    const n = this.logger, i = (0, In.computeOperations)(t, r, n);
    n.debug != null && n.debug(JSON.stringify(i, null, 2));
    let a = 0, o = 0;
    for (const l of i) {
      const m = l.end - l.start;
      l.kind === In.OperationKind.DOWNLOAD ? a += m : o += m;
    }
    const s = this.blockAwareFileInfo.size;
    if (a + o + (this.fileMetadataBuffer == null ? 0 : this.fileMetadataBuffer.length) !== s)
      throw new Error(`Internal error, size mismatch: downloadSize: ${a}, copySize: ${o}, newSize: ${s}`);
    return n.info(`Full: ${rl(s)}, To download: ${rl(a)} (${Math.round(a / (s / 100))}%)`), this.downloadFile(i);
  }
  downloadFile(t) {
    const r = [], n = () => Promise.all(r.map((i) => (0, ra.close)(i.descriptor).catch((a) => {
      this.logger.error(`cannot close file "${i.path}": ${a}`);
    })));
    return this.doDownloadFile(t, r).then(n).catch((i) => n().catch((a) => {
      try {
        this.logger.error(`cannot close files: ${a}`);
      } catch (o) {
        try {
          console.error(o);
        } catch {
        }
      }
      throw i;
    }).then(() => {
      throw i;
    }));
  }
  async doDownloadFile(t, r) {
    const n = await (0, ra.open)(this.options.oldFile, "r");
    r.push({ descriptor: n, path: this.options.oldFile });
    const i = await (0, ra.open)(this.options.newFile, "w");
    r.push({ descriptor: i, path: this.options.newFile });
    const a = (0, Ow.createWriteStream)(this.options.newFile, { fd: i });
    await new Promise((o, s) => {
      const l = [];
      let m;
      if (!this.options.isUseMultipleRangeRequest && this.options.onProgress) {
        const S = [];
        let T = 0;
        for (const x of t)
          x.kind === In.OperationKind.DOWNLOAD && (S.push(x.end - x.start), T += x.end - x.start);
        const D = {
          expectedByteCounts: S,
          grandTotal: T
        };
        m = new Nw.ProgressDifferentialDownloadCallbackTransform(D, this.options.cancellationToken, this.options.onProgress), l.push(m);
      }
      const c = new _r.DigestTransform(this.blockAwareFileInfo.sha512);
      c.isValidateOnEnd = !1, l.push(c), a.on("finish", () => {
        a.close(() => {
          r.splice(1, 1);
          try {
            c.validate();
          } catch (S) {
            s(S);
            return;
          }
          o(void 0);
        });
      }), l.push(a);
      let f = null;
      for (const S of l)
        S.on("error", s), f == null ? f = S : f = f.pipe(S);
      const d = l[0];
      let g;
      if (this.options.isUseMultipleRangeRequest) {
        g = (0, tl.executeTasksUsingMultipleRangeRequests)(this, t, d, n, s), g(0);
        return;
      }
      let v = 0, y = null;
      this.logger.info(`Differential download: ${this.options.newUrl}`);
      const A = this.createRequestOptions();
      A.redirect = "manual", g = (S) => {
        var T, D;
        if (S >= t.length) {
          this.fileMetadataBuffer != null && d.write(this.fileMetadataBuffer), d.end();
          return;
        }
        const x = t[S++];
        if (x.kind === In.OperationKind.COPY) {
          m && m.beginFileCopy(), (0, Pw.copyData)(x, d, n, s, () => g(S));
          return;
        }
        const Z = `bytes=${x.start}-${x.end - 1}`;
        A.headers.range = Z, (D = (T = this.logger) === null || T === void 0 ? void 0 : T.debug) === null || D === void 0 || D.call(T, `download range: ${Z}`), m && m.beginRangeDownload();
        const ae = this.httpExecutor.createRequest(A, (W) => {
          W.on("error", s), W.on("aborted", () => {
            s(new Error("response has been aborted by the server"));
          }), W.statusCode >= 400 && s((0, _r.createHttpError)(W)), W.pipe(d, {
            end: !1
          }), W.once("end", () => {
            m && m.endRangeDownload(), ++v === 100 ? (v = 0, setTimeout(() => g(S), 1e3)) : g(S);
          });
        });
        ae.on("redirect", (W, $e, E) => {
          this.logger.info(`Redirect to ${$w(E)}`), y = E, (0, _r.configureRequestUrl)(new Iw.URL(y), A), ae.followRedirect();
        }), this.httpExecutor.addErrorAndTimeoutHandlers(ae, s), ae.end();
      }, g(0);
    });
  }
  async readRemoteBytes(t, r) {
    const n = Buffer.allocUnsafe(r + 1 - t), i = this.createRequestOptions();
    i.headers.range = `bytes=${t}-${r}`;
    let a = 0;
    if (await this.request(i, (o) => {
      o.copy(n, a), a += o.length;
    }), a !== n.length)
      throw new Error(`Received data length ${a} is not equal to expected ${n.length}`);
    return n;
  }
  request(t, r) {
    return new Promise((n, i) => {
      const a = this.httpExecutor.createRequest(t, (o) => {
        (0, tl.checkIsRangesSupported)(o, i) && (o.on("error", i), o.on("aborted", () => {
          i(new Error("response has been aborted by the server"));
        }), o.on("data", r), o.on("end", () => n()));
      });
      this.httpExecutor.addErrorAndTimeoutHandlers(a, i), a.end();
    });
  }
}
rn.DifferentialDownloader = Dw;
function rl(e, t = " KB") {
  return new Intl.NumberFormat("en").format((e / 1024).toFixed(2)) + t;
}
function $w(e) {
  const t = e.indexOf("?");
  return t < 0 ? e : e.substring(0, t);
}
Object.defineProperty(Ei, "__esModule", { value: !0 });
Ei.GenericDifferentialDownloader = void 0;
const Fw = rn;
class xw extends Fw.DifferentialDownloader {
  download(t, r) {
    return this.doDownload(t, r);
  }
}
Ei.GenericDifferentialDownloader = xw;
var St = {};
(function(e) {
  Object.defineProperty(e, "__esModule", { value: !0 }), e.UpdaterSignal = e.UPDATE_DOWNLOADED = e.DOWNLOAD_PROGRESS = e.CancellationToken = void 0, e.addHandler = n;
  const t = ce;
  Object.defineProperty(e, "CancellationToken", { enumerable: !0, get: function() {
    return t.CancellationToken;
  } }), e.DOWNLOAD_PROGRESS = "download-progress", e.UPDATE_DOWNLOADED = "update-downloaded";
  class r {
    constructor(a) {
      this.emitter = a;
    }
    /**
     * Emitted when an authenticating proxy is [asking for user credentials](https://github.com/electron/electron/blob/master/docs/api/client-request.md#event-login).
     */
    login(a) {
      n(this.emitter, "login", a);
    }
    progress(a) {
      n(this.emitter, e.DOWNLOAD_PROGRESS, a);
    }
    updateDownloaded(a) {
      n(this.emitter, e.UPDATE_DOWNLOADED, a);
    }
    updateCancelled(a) {
      n(this.emitter, "update-cancelled", a);
    }
  }
  e.UpdaterSignal = r;
  function n(i, a, o) {
    i.on(a, o);
  }
})(St);
Object.defineProperty(gt, "__esModule", { value: !0 });
gt.NoOpLogger = gt.AppUpdater = void 0;
const Te = ce, Lw = Wr, Uw = Jn, kw = Cl, He = Tt, Mw = Ee, na = ai, qe = re, Dt = bu, nl = en, Bw = fi, il = Ru, jw = tn, ia = di, aa = Rl, Hw = Ei, zt = St;
class to extends kw.EventEmitter {
  /**
   * Get the update channel. Doesn't return `channel` from the update configuration, only if was previously set.
   */
  get channel() {
    return this._channel;
  }
  /**
   * Set the update channel. Overrides `channel` in the update configuration.
   *
   * `allowDowngrade` will be automatically set to `true`. If this behavior is not suitable for you, simple set `allowDowngrade` explicitly after.
   */
  set channel(t) {
    if (this._channel != null) {
      if (typeof t != "string")
        throw (0, Te.newError)(`Channel must be a string, but got: ${t}`, "ERR_UPDATER_INVALID_CHANNEL");
      if (t.length === 0)
        throw (0, Te.newError)("Channel must be not an empty string", "ERR_UPDATER_INVALID_CHANNEL");
    }
    this._channel = t, this.allowDowngrade = !0;
  }
  /**
   *  Shortcut for explicitly adding auth tokens to request headers
   */
  addAuthHeader(t) {
    this.requestHeaders = Object.assign({}, this.requestHeaders, {
      authorization: t
    });
  }
  // noinspection JSMethodCanBeStatic,JSUnusedGlobalSymbols
  get netSession() {
    return (0, il.getNetSession)();
  }
  /**
   * The logger. You can pass [electron-log](https://github.com/megahertz/electron-log), [winston](https://github.com/winstonjs/winston) or another logger with the following interface: `{ info(), warn(), error() }`.
   * Set it to `null` if you would like to disable a logging feature.
   */
  get logger() {
    return this._logger;
  }
  set logger(t) {
    this._logger = t ?? new Lu();
  }
  // noinspection JSUnusedGlobalSymbols
  /**
   * test only
   * @private
   */
  set updateConfigPath(t) {
    this.clientPromise = null, this._appUpdateConfigPath = t, this.configOnDisk = new na.Lazy(() => this.loadUpdateConfig());
  }
  /**
   * Allows developer to override default logic for determining if an update is supported.
   * The default logic compares the `UpdateInfo` minimum system version against the `os.release()` with `semver` package
   */
  get isUpdateSupported() {
    return this._isUpdateSupported;
  }
  set isUpdateSupported(t) {
    t && (this._isUpdateSupported = t);
  }
  /**
   * Allows developer to override default logic for determining if the user is below the rollout threshold.
   * The default logic compares the staging percentage with numerical representation of user ID.
   * An override can define custom logic, or bypass it if needed.
   */
  get isUserWithinRollout() {
    return this._isUserWithinRollout;
  }
  set isUserWithinRollout(t) {
    t && (this._isUserWithinRollout = t);
  }
  constructor(t, r) {
    super(), this.autoDownload = !0, this.autoInstallOnAppQuit = !0, this.autoRunAppAfterInstall = !0, this.allowPrerelease = !1, this.fullChangelog = !1, this.allowDowngrade = !1, this.disableWebInstaller = !1, this.disableDifferentialDownload = !1, this.forceDevUpdateConfig = !1, this.previousBlockmapBaseUrlOverride = null, this._channel = null, this.downloadedUpdateHelper = null, this.requestHeaders = null, this._logger = console, this.signals = new zt.UpdaterSignal(this), this._appUpdateConfigPath = null, this._isUpdateSupported = (a) => this.checkIfUpdateSupported(a), this._isUserWithinRollout = (a) => this.isStagingMatch(a), this.clientPromise = null, this.stagingUserIdPromise = new na.Lazy(() => this.getOrCreateStagingUserId()), this.configOnDisk = new na.Lazy(() => this.loadUpdateConfig()), this.checkForUpdatesPromise = null, this.downloadPromise = null, this.updateInfoAndProvider = null, this._testOnlyOptions = null, this.on("error", (a) => {
      this._logger.error(`Error: ${a.stack || a.message}`);
    }), r == null ? (this.app = new Bw.ElectronAppAdapter(), this.httpExecutor = new il.ElectronHttpExecutor((a, o) => this.emit("login", a, o))) : (this.app = r, this.httpExecutor = null);
    const n = this.app.version, i = (0, Dt.parse)(n);
    if (i == null)
      throw (0, Te.newError)(`App version is not a valid semver version: "${n}"`, "ERR_UPDATER_INVALID_VERSION");
    this.currentVersion = i, this.allowPrerelease = qw(i), t != null && (this.setFeedURL(t), typeof t != "string" && t.requestHeaders && (this.requestHeaders = t.requestHeaders));
  }
  //noinspection JSMethodCanBeStatic,JSUnusedGlobalSymbols
  getFeedURL() {
    return "Deprecated. Do not use it.";
  }
  /**
   * Configure update provider. If value is `string`, [GenericServerOptions](./publish.md#genericserveroptions) will be set with value as `url`.
   * @param options If you want to override configuration in the `app-update.yml`.
   */
  setFeedURL(t) {
    const r = this.createProviderRuntimeOptions();
    let n;
    typeof t == "string" ? n = new jw.GenericProvider({ provider: "generic", url: t }, this, {
      ...r,
      isUseMultipleRangeRequest: (0, ia.isUrlProbablySupportMultiRangeRequests)(t)
    }) : n = (0, ia.createClient)(t, this, r), this.clientPromise = Promise.resolve(n);
  }
  /**
   * Asks the server whether there is an update.
   * @returns null if the updater is disabled, otherwise info about the latest version
   */
  checkForUpdates() {
    if (!this.isUpdaterActive())
      return Promise.resolve(null);
    let t = this.checkForUpdatesPromise;
    if (t != null)
      return this._logger.info("Checking for update (already in progress)"), t;
    const r = () => this.checkForUpdatesPromise = null;
    return this._logger.info("Checking for update"), t = this.doCheckForUpdates().then((n) => (r(), n)).catch((n) => {
      throw r(), this.emit("error", n, `Cannot check for updates: ${(n.stack || n).toString()}`), n;
    }), this.checkForUpdatesPromise = t, t;
  }
  isUpdaterActive() {
    return this.app.isPackaged || this.forceDevUpdateConfig ? !0 : (this._logger.info("Skip checkForUpdates because application is not packed and dev update config is not forced"), !1);
  }
  // noinspection JSUnusedGlobalSymbols
  checkForUpdatesAndNotify(t) {
    return this.checkForUpdates().then((r) => r != null && r.downloadPromise ? (r.downloadPromise.then(() => {
      const n = to.formatDownloadNotification(r.updateInfo.version, this.app.name, t);
      new kt.Notification(n).show();
    }), r) : (this._logger.debug != null && this._logger.debug("checkForUpdatesAndNotify called, downloadPromise is null"), r));
  }
  static formatDownloadNotification(t, r, n) {
    return n == null && (n = {
      title: "A new update is ready to install",
      body: "{appName} version {version} has been downloaded and will be automatically installed on exit"
    }), n = {
      title: n.title.replace("{appName}", r).replace("{version}", t),
      body: n.body.replace("{appName}", r).replace("{version}", t)
    }, n;
  }
  async isStagingMatch(t) {
    const r = t.stagingPercentage;
    let n = r;
    if (n == null)
      return !0;
    if (n = parseInt(n, 10), isNaN(n))
      return this._logger.warn(`Staging percentage is NaN: ${r}`), !0;
    n = n / 100;
    const i = await this.stagingUserIdPromise.value, o = Te.UUID.parse(i).readUInt32BE(12) / 4294967295;
    return this._logger.info(`Staging percentage: ${n}, percentage: ${o}, user id: ${i}`), o < n;
  }
  computeFinalHeaders(t) {
    return this.requestHeaders != null && Object.assign(t, this.requestHeaders), t;
  }
  async isUpdateAvailable(t) {
    const r = (0, Dt.parse)(t.version);
    if (r == null)
      throw (0, Te.newError)(`This file could not be downloaded, or the latest version (from update server) does not have a valid semver version: "${t.version}"`, "ERR_UPDATER_INVALID_VERSION");
    const n = this.currentVersion;
    if ((0, Dt.eq)(r, n) || !await Promise.resolve(this.isUpdateSupported(t)) || !await Promise.resolve(this.isUserWithinRollout(t)))
      return !1;
    const a = (0, Dt.gt)(r, n), o = (0, Dt.lt)(r, n);
    return a ? !0 : this.allowDowngrade && o;
  }
  checkIfUpdateSupported(t) {
    const r = t == null ? void 0 : t.minimumSystemVersion, n = (0, Uw.release)();
    if (r)
      try {
        if ((0, Dt.lt)(n, r))
          return this._logger.info(`Current OS version ${n} is less than the minimum OS version required ${r} for version ${n}`), !1;
      } catch (i) {
        this._logger.warn(`Failed to compare current OS version(${n}) with minimum OS version(${r}): ${(i.message || i).toString()}`);
      }
    return !0;
  }
  async getUpdateInfoAndProvider() {
    await this.app.whenReady(), this.clientPromise == null && (this.clientPromise = this.configOnDisk.value.then((n) => (0, ia.createClient)(n, this, this.createProviderRuntimeOptions())));
    const t = await this.clientPromise, r = await this.stagingUserIdPromise.value;
    return t.setRequestHeaders(this.computeFinalHeaders({ "x-user-staging-id": r })), {
      info: await t.getLatestVersion(),
      provider: t
    };
  }
  createProviderRuntimeOptions() {
    return {
      isUseMultipleRangeRequest: !0,
      platform: this._testOnlyOptions == null ? process.platform : this._testOnlyOptions.platform,
      executor: this.httpExecutor
    };
  }
  async doCheckForUpdates() {
    this.emit("checking-for-update");
    const t = await this.getUpdateInfoAndProvider(), r = t.info;
    if (!await this.isUpdateAvailable(r))
      return this._logger.info(`Update for version ${this.currentVersion.format()} is not available (latest version: ${r.version}, downgrade is ${this.allowDowngrade ? "allowed" : "disallowed"}).`), this.emit("update-not-available", r), {
        isUpdateAvailable: !1,
        versionInfo: r,
        updateInfo: r
      };
    this.updateInfoAndProvider = t, this.onUpdateAvailable(r);
    const n = new Te.CancellationToken();
    return {
      isUpdateAvailable: !0,
      versionInfo: r,
      updateInfo: r,
      cancellationToken: n,
      downloadPromise: this.autoDownload ? this.downloadUpdate(n) : null
    };
  }
  onUpdateAvailable(t) {
    this._logger.info(`Found version ${t.version} (url: ${(0, Te.asArray)(t.files).map((r) => r.url).join(", ")})`), this.emit("update-available", t);
  }
  /**
   * Start downloading update manually. You can use this method if `autoDownload` option is set to `false`.
   * @returns {Promise<Array<string>>} Paths to downloaded files.
   */
  downloadUpdate(t = new Te.CancellationToken()) {
    const r = this.updateInfoAndProvider;
    if (r == null) {
      const i = new Error("Please check update first");
      return this.dispatchError(i), Promise.reject(i);
    }
    if (this.downloadPromise != null)
      return this._logger.info("Downloading update (already in progress)"), this.downloadPromise;
    this._logger.info(`Downloading update from ${(0, Te.asArray)(r.info.files).map((i) => i.url).join(", ")}`);
    const n = (i) => {
      if (!(i instanceof Te.CancellationError))
        try {
          this.dispatchError(i);
        } catch (a) {
          this._logger.warn(`Cannot dispatch error event: ${a.stack || a}`);
        }
      return i;
    };
    return this.downloadPromise = this.doDownloadUpdate({
      updateInfoAndProvider: r,
      requestHeaders: this.computeRequestHeaders(r.provider),
      cancellationToken: t,
      disableWebInstaller: this.disableWebInstaller,
      disableDifferentialDownload: this.disableDifferentialDownload
    }).catch((i) => {
      throw n(i);
    }).finally(() => {
      this.downloadPromise = null;
    }), this.downloadPromise;
  }
  dispatchError(t) {
    this.emit("error", t, (t.stack || t).toString());
  }
  dispatchUpdateDownloaded(t) {
    this.emit(zt.UPDATE_DOWNLOADED, t);
  }
  async loadUpdateConfig() {
    return this._appUpdateConfigPath == null && (this._appUpdateConfigPath = this.app.appUpdateConfigPath), (0, Mw.load)(await (0, He.readFile)(this._appUpdateConfigPath, "utf-8"));
  }
  computeRequestHeaders(t) {
    const r = t.fileExtraDownloadHeaders;
    if (r != null) {
      const n = this.requestHeaders;
      return n == null ? r : {
        ...r,
        ...n
      };
    }
    return this.computeFinalHeaders({ accept: "*/*" });
  }
  async getOrCreateStagingUserId() {
    const t = qe.join(this.app.userDataPath, ".updaterId");
    try {
      const n = await (0, He.readFile)(t, "utf-8");
      if (Te.UUID.check(n))
        return n;
      this._logger.warn(`Staging user id file exists, but content was invalid: ${n}`);
    } catch (n) {
      n.code !== "ENOENT" && this._logger.warn(`Couldn't read staging user ID, creating a blank one: ${n}`);
    }
    const r = Te.UUID.v5((0, Lw.randomBytes)(4096), Te.UUID.OID);
    this._logger.info(`Generated new staging user ID: ${r}`);
    try {
      await (0, He.outputFile)(t, r);
    } catch (n) {
      this._logger.warn(`Couldn't write out staging user ID: ${n}`);
    }
    return r;
  }
  /** @internal */
  get isAddNoCacheQuery() {
    const t = this.requestHeaders;
    if (t == null)
      return !0;
    for (const r of Object.keys(t)) {
      const n = r.toLowerCase();
      if (n === "authorization" || n === "private-token")
        return !1;
    }
    return !0;
  }
  async getOrCreateDownloadHelper() {
    let t = this.downloadedUpdateHelper;
    if (t == null) {
      const r = (await this.configOnDisk.value).updaterCacheDirName, n = this._logger;
      r == null && n.error("updaterCacheDirName is not specified in app-update.yml Was app build using at least electron-builder 20.34.0?");
      const i = qe.join(this.app.baseCachePath, r || this.app.name);
      n.debug != null && n.debug(`updater cache dir: ${i}`), t = new nl.DownloadedUpdateHelper(i), this.downloadedUpdateHelper = t;
    }
    return t;
  }
  async executeDownload(t) {
    const r = t.fileInfo, n = {
      headers: t.downloadUpdateOptions.requestHeaders,
      cancellationToken: t.downloadUpdateOptions.cancellationToken,
      sha2: r.info.sha2,
      sha512: r.info.sha512
    };
    this.listenerCount(zt.DOWNLOAD_PROGRESS) > 0 && (n.onProgress = (T) => this.emit(zt.DOWNLOAD_PROGRESS, T));
    const i = t.downloadUpdateOptions.updateInfoAndProvider.info, a = i.version, o = r.packageInfo;
    function s() {
      const T = decodeURIComponent(t.fileInfo.url.pathname);
      return T.toLowerCase().endsWith(`.${t.fileExtension.toLowerCase()}`) ? qe.basename(T) : t.fileInfo.info.url;
    }
    const l = await this.getOrCreateDownloadHelper(), m = l.cacheDirForPendingUpdate;
    await (0, He.mkdir)(m, { recursive: !0 });
    const c = s();
    let f = qe.join(m, c);
    const d = o == null ? null : qe.join(m, `package-${a}${qe.extname(o.path) || ".7z"}`), g = async (T) => {
      await l.setDownloadedFile(f, d, i, r, c, T), await t.done({
        ...i,
        downloadedFile: f
      });
      const D = qe.join(m, "current.blockmap");
      return await (0, He.pathExists)(D) && await (0, He.copyFile)(D, qe.join(l.cacheDir, "current.blockmap")), d == null ? [f] : [f, d];
    }, v = this._logger, y = await l.validateDownloadedPath(f, i, r, v);
    if (y != null)
      return f = y, await g(!1);
    const A = async () => (await l.clear().catch(() => {
    }), await (0, He.unlink)(f).catch(() => {
    })), S = await (0, nl.createTempUpdateFile)(`temp-${c}`, m, v);
    try {
      await t.task(S, n, d, A), await (0, Te.retry)(() => (0, He.rename)(S, f), {
        retries: 60,
        interval: 500,
        shouldRetry: (T) => T instanceof Error && /^EBUSY:/.test(T.message) ? !0 : (v.warn(`Cannot rename temp file to final file: ${T.message || T.stack}`), !1)
      });
    } catch (T) {
      throw await A(), T instanceof Te.CancellationError && (v.info("cancelled"), this.emit("update-cancelled", i)), T;
    }
    return v.info(`New version ${a} has been downloaded to ${f}`), await g(!0);
  }
  async differentialDownloadInstaller(t, r, n, i, a) {
    try {
      if (this._testOnlyOptions != null && !this._testOnlyOptions.isUseDifferentialDownload)
        return !0;
      const o = r.updateInfoAndProvider.provider, s = await o.getBlockMapFiles(t.url, this.app.version, r.updateInfoAndProvider.info.version, this.previousBlockmapBaseUrlOverride);
      this._logger.info(`Download block maps (old: "${s[0]}", new: ${s[1]})`);
      const l = async (v) => {
        const y = await this.httpExecutor.downloadToBuffer(v, {
          headers: r.requestHeaders,
          cancellationToken: r.cancellationToken
        });
        if (y == null || y.length === 0)
          throw new Error(`Blockmap "${v.href}" is empty`);
        try {
          return JSON.parse((0, aa.gunzipSync)(y).toString());
        } catch (A) {
          throw new Error(`Cannot parse blockmap "${v.href}", error: ${A}`);
        }
      }, m = {
        newUrl: t.url,
        oldFile: qe.join(this.downloadedUpdateHelper.cacheDir, a),
        logger: this._logger,
        newFile: n,
        isUseMultipleRangeRequest: o.isUseMultipleRangeRequest,
        requestHeaders: r.requestHeaders,
        cancellationToken: r.cancellationToken
      };
      this.listenerCount(zt.DOWNLOAD_PROGRESS) > 0 && (m.onProgress = (v) => this.emit(zt.DOWNLOAD_PROGRESS, v));
      const c = async (v, y) => {
        const A = qe.join(y, "current.blockmap");
        await (0, He.outputFile)(A, (0, aa.gzipSync)(JSON.stringify(v)));
      }, f = async (v) => {
        const y = qe.join(v, "current.blockmap");
        try {
          if (await (0, He.pathExists)(y))
            return JSON.parse((0, aa.gunzipSync)(await (0, He.readFile)(y)).toString());
        } catch (A) {
          this._logger.warn(`Cannot parse blockmap "${y}", error: ${A}`);
        }
        return null;
      }, d = await l(s[1]);
      await c(d, this.downloadedUpdateHelper.cacheDirForPendingUpdate);
      let g = await f(this.downloadedUpdateHelper.cacheDir);
      return g == null && (g = await l(s[0])), await new Hw.GenericDifferentialDownloader(t.info, this.httpExecutor, m).download(g, d), !1;
    } catch (o) {
      if (this._logger.error(`Cannot download differentially, fallback to full download: ${o.stack || o}`), this._testOnlyOptions != null)
        throw o;
      return !0;
    }
  }
}
gt.AppUpdater = to;
function qw(e) {
  const t = (0, Dt.prerelease)(e);
  return t != null && t.length > 0;
}
class Lu {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  info(t) {
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  warn(t) {
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  error(t) {
  }
}
gt.NoOpLogger = Lu;
Object.defineProperty(Ht, "__esModule", { value: !0 });
Ht.BaseUpdater = void 0;
const al = Kn, Gw = gt;
class Vw extends Gw.AppUpdater {
  constructor(t, r) {
    super(t, r), this.quitAndInstallCalled = !1, this.quitHandlerAdded = !1;
  }
  quitAndInstall(t = !1, r = !1) {
    this._logger.info("Install on explicit quitAndInstall"), this.install(t, t ? r : this.autoRunAppAfterInstall) ? setImmediate(() => {
      kt.autoUpdater.emit("before-quit-for-update"), this.app.quit();
    }) : this.quitAndInstallCalled = !1;
  }
  executeDownload(t) {
    return super.executeDownload({
      ...t,
      done: (r) => (this.dispatchUpdateDownloaded(r), this.addQuitHandler(), Promise.resolve())
    });
  }
  get installerPath() {
    return this.downloadedUpdateHelper == null ? null : this.downloadedUpdateHelper.file;
  }
  // must be sync (because quit even handler is not async)
  install(t = !1, r = !1) {
    if (this.quitAndInstallCalled)
      return this._logger.warn("install call ignored: quitAndInstallCalled is set to true"), !1;
    const n = this.downloadedUpdateHelper, i = this.installerPath, a = n == null ? null : n.downloadedFileInfo;
    if (i == null || a == null)
      return this.dispatchError(new Error("No update filepath provided, can't quit and install")), !1;
    this.quitAndInstallCalled = !0;
    try {
      return this._logger.info(`Install: isSilent: ${t}, isForceRunAfter: ${r}`), this.doInstall({
        isSilent: t,
        isForceRunAfter: r,
        isAdminRightsRequired: a.isAdminRightsRequired
      });
    } catch (o) {
      return this.dispatchError(o), !1;
    }
  }
  addQuitHandler() {
    this.quitHandlerAdded || !this.autoInstallOnAppQuit || (this.quitHandlerAdded = !0, this.app.onQuit((t) => {
      if (this.quitAndInstallCalled) {
        this._logger.info("Update installer has already been triggered. Quitting application.");
        return;
      }
      if (!this.autoInstallOnAppQuit) {
        this._logger.info("Update will not be installed on quit because autoInstallOnAppQuit is set to false.");
        return;
      }
      if (t !== 0) {
        this._logger.info(`Update will be not installed on quit because application is quitting with exit code ${t}`);
        return;
      }
      this._logger.info("Auto install update on quit"), this.install(!0, !1);
    }));
  }
  spawnSyncLog(t, r = [], n = {}) {
    this._logger.info(`Executing: ${t} with args: ${r}`);
    const i = (0, al.spawnSync)(t, r, {
      env: { ...process.env, ...n },
      encoding: "utf-8",
      shell: !0
    }), { error: a, status: o, stdout: s, stderr: l } = i;
    if (a != null)
      throw this._logger.error(l), a;
    if (o != null && o !== 0)
      throw this._logger.error(l), new Error(`Command ${t} exited with code ${o}`);
    return s.trim();
  }
  /**
   * This handles both node 8 and node 10 way of emitting error when spawning a process
   *   - node 8: Throws the error
   *   - node 10: Emit the error(Need to listen with on)
   */
  // https://github.com/electron-userland/electron-builder/issues/1129
  // Node 8 sends errors: https://nodejs.org/dist/latest-v8.x/docs/api/errors.html#errors_common_system_errors
  async spawnLog(t, r = [], n = void 0, i = "ignore") {
    return this._logger.info(`Executing: ${t} with args: ${r}`), new Promise((a, o) => {
      try {
        const s = { stdio: i, env: n, detached: !0 }, l = (0, al.spawn)(t, r, s);
        l.on("error", (m) => {
          o(m);
        }), l.unref(), l.pid !== void 0 && a(!0);
      } catch (s) {
        o(s);
      }
    });
  }
}
Ht.BaseUpdater = Vw;
var kr = {}, nn = {};
Object.defineProperty(nn, "__esModule", { value: !0 });
nn.FileWithEmbeddedBlockMapDifferentialDownloader = void 0;
const Xt = Tt, Ww = rn, Yw = Rl;
class zw extends Ww.DifferentialDownloader {
  async download() {
    const t = this.blockAwareFileInfo, r = t.size, n = r - (t.blockMapSize + 4);
    this.fileMetadataBuffer = await this.readRemoteBytes(n, r - 1);
    const i = Uu(this.fileMetadataBuffer.slice(0, this.fileMetadataBuffer.length - 4));
    await this.doDownload(await Xw(this.options.oldFile), i);
  }
}
nn.FileWithEmbeddedBlockMapDifferentialDownloader = zw;
function Uu(e) {
  return JSON.parse((0, Yw.inflateRawSync)(e).toString());
}
async function Xw(e) {
  const t = await (0, Xt.open)(e, "r");
  try {
    const r = (await (0, Xt.fstat)(t)).size, n = Buffer.allocUnsafe(4);
    await (0, Xt.read)(t, n, 0, n.length, r - n.length);
    const i = Buffer.allocUnsafe(n.readUInt32BE(0));
    return await (0, Xt.read)(t, i, 0, i.length, r - n.length - i.length), await (0, Xt.close)(t), Uu(i);
  } catch (r) {
    throw await (0, Xt.close)(t), r;
  }
}
Object.defineProperty(kr, "__esModule", { value: !0 });
kr.AppImageUpdater = void 0;
const ol = ce, sl = Kn, Kw = Tt, Jw = _t, Ar = re, Qw = Ht, Zw = nn, e_ = se, ll = St;
class t_ extends Qw.BaseUpdater {
  constructor(t, r) {
    super(t, r);
  }
  isUpdaterActive() {
    return process.env.APPIMAGE == null && !this.forceDevUpdateConfig ? (process.env.SNAP == null ? this._logger.warn("APPIMAGE env is not defined, current application is not an AppImage") : this._logger.info("SNAP env is defined, updater is disabled"), !1) : super.isUpdaterActive();
  }
  /*** @private */
  doDownloadUpdate(t) {
    const r = t.updateInfoAndProvider.provider, n = (0, e_.findFile)(r.resolveFiles(t.updateInfoAndProvider.info), "AppImage", ["rpm", "deb", "pacman"]);
    return this.executeDownload({
      fileExtension: "AppImage",
      fileInfo: n,
      downloadUpdateOptions: t,
      task: async (i, a) => {
        const o = process.env.APPIMAGE;
        if (o == null)
          throw (0, ol.newError)("APPIMAGE env is not defined", "ERR_UPDATER_OLD_FILE_NOT_FOUND");
        (t.disableDifferentialDownload || await this.downloadDifferential(n, o, i, r, t)) && await this.httpExecutor.download(n.url, i, a), await (0, Kw.chmod)(i, 493);
      }
    });
  }
  async downloadDifferential(t, r, n, i, a) {
    try {
      const o = {
        newUrl: t.url,
        oldFile: r,
        logger: this._logger,
        newFile: n,
        isUseMultipleRangeRequest: i.isUseMultipleRangeRequest,
        requestHeaders: a.requestHeaders,
        cancellationToken: a.cancellationToken
      };
      return this.listenerCount(ll.DOWNLOAD_PROGRESS) > 0 && (o.onProgress = (s) => this.emit(ll.DOWNLOAD_PROGRESS, s)), await new Zw.FileWithEmbeddedBlockMapDifferentialDownloader(t.info, this.httpExecutor, o).download(), !1;
    } catch (o) {
      return this._logger.error(`Cannot download differentially, fallback to full download: ${o.stack || o}`), process.platform === "linux";
    }
  }
  doInstall(t) {
    const r = process.env.APPIMAGE;
    if (r == null)
      throw (0, ol.newError)("APPIMAGE env is not defined", "ERR_UPDATER_OLD_FILE_NOT_FOUND");
    (0, Jw.unlinkSync)(r);
    let n;
    const i = Ar.basename(r), a = this.installerPath;
    if (a == null)
      return this.dispatchError(new Error("No update filepath provided, can't quit and install")), !1;
    Ar.basename(a) === i || !/\d+\.\d+\.\d+/.test(i) ? n = r : n = Ar.join(Ar.dirname(r), Ar.basename(a)), (0, sl.execFileSync)("mv", ["-f", a, n]), n !== r && this.emit("appimage-filename-updated", n);
    const o = {
      ...process.env,
      APPIMAGE_SILENT_INSTALL: "true"
    };
    return t.isForceRunAfter ? this.spawnLog(n, [], o) : (o.APPIMAGE_EXIT_AFTER_INSTALL = "true", (0, sl.execFileSync)(n, [], { env: o })), !0;
  }
}
kr.AppImageUpdater = t_;
var Mr = {}, hr = {};
Object.defineProperty(hr, "__esModule", { value: !0 });
hr.LinuxUpdater = void 0;
const r_ = Ht;
class n_ extends r_.BaseUpdater {
  constructor(t, r) {
    super(t, r);
  }
  /**
   * Returns true if the current process is running as root.
   */
  isRunningAsRoot() {
    var t;
    return ((t = process.getuid) === null || t === void 0 ? void 0 : t.call(process)) === 0;
  }
  /**
   * Sanitizies the installer path for using with command line tools.
   */
  get installerPath() {
    var t, r;
    return (r = (t = super.installerPath) === null || t === void 0 ? void 0 : t.replace(/\\/g, "\\\\").replace(/ /g, "\\ ")) !== null && r !== void 0 ? r : null;
  }
  runCommandWithSudoIfNeeded(t) {
    if (this.isRunningAsRoot())
      return this._logger.info("Running as root, no need to use sudo"), this.spawnSyncLog(t[0], t.slice(1));
    const { name: r } = this.app, n = `"${r} would like to update"`, i = this.sudoWithArgs(n);
    this._logger.info(`Running as non-root user, using sudo to install: ${i}`);
    let a = '"';
    return (/pkexec/i.test(i[0]) || i[0] === "sudo") && (a = ""), this.spawnSyncLog(i[0], [...i.length > 1 ? i.slice(1) : [], `${a}/bin/bash`, "-c", `'${t.join(" ")}'${a}`]);
  }
  sudoWithArgs(t) {
    const r = this.determineSudoCommand(), n = [r];
    return /kdesudo/i.test(r) ? (n.push("--comment", t), n.push("-c")) : /gksudo/i.test(r) ? n.push("--message", t) : /pkexec/i.test(r) && n.push("--disable-internal-agent"), n;
  }
  hasCommand(t) {
    try {
      return this.spawnSyncLog("command", ["-v", t]), !0;
    } catch {
      return !1;
    }
  }
  determineSudoCommand() {
    const t = ["gksudo", "kdesudo", "pkexec", "beesu"];
    for (const r of t)
      if (this.hasCommand(r))
        return r;
    return "sudo";
  }
  /**
   * Detects the package manager to use based on the available commands.
   * Allows overriding the default behavior by setting the ELECTRON_BUILDER_LINUX_PACKAGE_MANAGER environment variable.
   * If the environment variable is set, it will be used directly. (This is useful for testing each package manager logic path.)
   * Otherwise, it checks for the presence of the specified package manager commands in the order provided.
   * @param pms - An array of package manager commands to check for, in priority order.
   * @returns The detected package manager command or "unknown" if none are found.
   */
  detectPackageManager(t) {
    var r;
    const n = (r = process.env.ELECTRON_BUILDER_LINUX_PACKAGE_MANAGER) === null || r === void 0 ? void 0 : r.trim();
    if (n)
      return n;
    for (const i of t)
      if (this.hasCommand(i))
        return i;
    return this._logger.warn(`No package manager found in the list: ${t.join(", ")}. Defaulting to the first one: ${t[0]}`), t[0];
  }
}
hr.LinuxUpdater = n_;
Object.defineProperty(Mr, "__esModule", { value: !0 });
Mr.DebUpdater = void 0;
const i_ = se, cl = St, a_ = hr;
class ro extends a_.LinuxUpdater {
  constructor(t, r) {
    super(t, r);
  }
  /*** @private */
  doDownloadUpdate(t) {
    const r = t.updateInfoAndProvider.provider, n = (0, i_.findFile)(r.resolveFiles(t.updateInfoAndProvider.info), "deb", ["AppImage", "rpm", "pacman"]);
    return this.executeDownload({
      fileExtension: "deb",
      fileInfo: n,
      downloadUpdateOptions: t,
      task: async (i, a) => {
        this.listenerCount(cl.DOWNLOAD_PROGRESS) > 0 && (a.onProgress = (o) => this.emit(cl.DOWNLOAD_PROGRESS, o)), await this.httpExecutor.download(n.url, i, a);
      }
    });
  }
  doInstall(t) {
    const r = this.installerPath;
    if (r == null)
      return this.dispatchError(new Error("No update filepath provided, can't quit and install")), !1;
    if (!this.hasCommand("dpkg") && !this.hasCommand("apt"))
      return this.dispatchError(new Error("Neither dpkg nor apt command found. Cannot install .deb package.")), !1;
    const n = ["dpkg", "apt"], i = this.detectPackageManager(n);
    try {
      ro.installWithCommandRunner(i, r, this.runCommandWithSudoIfNeeded.bind(this), this._logger);
    } catch (a) {
      return this.dispatchError(a), !1;
    }
    return t.isForceRunAfter && this.app.relaunch(), !0;
  }
  static installWithCommandRunner(t, r, n, i) {
    var a;
    if (t === "dpkg")
      try {
        n(["dpkg", "-i", r]);
      } catch (o) {
        i.warn((a = o.message) !== null && a !== void 0 ? a : o), i.warn("dpkg installation failed, trying to fix broken dependencies with apt-get"), n(["apt-get", "install", "-f", "-y"]);
      }
    else if (t === "apt")
      i.warn("Using apt to install a local .deb. This may fail for unsigned packages unless properly configured."), n([
        "apt",
        "install",
        "-y",
        "--allow-unauthenticated",
        // needed for unsigned .debs
        "--allow-downgrades",
        // allow lower version installs
        "--allow-change-held-packages",
        r
      ]);
    else
      throw new Error(`Package manager ${t} not supported`);
  }
}
Mr.DebUpdater = ro;
var Br = {};
Object.defineProperty(Br, "__esModule", { value: !0 });
Br.PacmanUpdater = void 0;
const ul = St, o_ = se, s_ = hr;
class no extends s_.LinuxUpdater {
  constructor(t, r) {
    super(t, r);
  }
  /*** @private */
  doDownloadUpdate(t) {
    const r = t.updateInfoAndProvider.provider, n = (0, o_.findFile)(r.resolveFiles(t.updateInfoAndProvider.info), "pacman", ["AppImage", "deb", "rpm"]);
    return this.executeDownload({
      fileExtension: "pacman",
      fileInfo: n,
      downloadUpdateOptions: t,
      task: async (i, a) => {
        this.listenerCount(ul.DOWNLOAD_PROGRESS) > 0 && (a.onProgress = (o) => this.emit(ul.DOWNLOAD_PROGRESS, o)), await this.httpExecutor.download(n.url, i, a);
      }
    });
  }
  doInstall(t) {
    const r = this.installerPath;
    if (r == null)
      return this.dispatchError(new Error("No update filepath provided, can't quit and install")), !1;
    try {
      no.installWithCommandRunner(r, this.runCommandWithSudoIfNeeded.bind(this), this._logger);
    } catch (n) {
      return this.dispatchError(n), !1;
    }
    return t.isForceRunAfter && this.app.relaunch(), !0;
  }
  static installWithCommandRunner(t, r, n) {
    var i;
    try {
      r(["pacman", "-U", "--noconfirm", t]);
    } catch (a) {
      n.warn((i = a.message) !== null && i !== void 0 ? i : a), n.warn("pacman installation failed, attempting to update package database and retry");
      try {
        r(["pacman", "-Sy", "--noconfirm"]), r(["pacman", "-U", "--noconfirm", t]);
      } catch (o) {
        throw n.error("Retry after pacman -Sy failed"), o;
      }
    }
  }
}
Br.PacmanUpdater = no;
var jr = {};
Object.defineProperty(jr, "__esModule", { value: !0 });
jr.RpmUpdater = void 0;
const fl = St, l_ = se, c_ = hr;
class io extends c_.LinuxUpdater {
  constructor(t, r) {
    super(t, r);
  }
  /*** @private */
  doDownloadUpdate(t) {
    const r = t.updateInfoAndProvider.provider, n = (0, l_.findFile)(r.resolveFiles(t.updateInfoAndProvider.info), "rpm", ["AppImage", "deb", "pacman"]);
    return this.executeDownload({
      fileExtension: "rpm",
      fileInfo: n,
      downloadUpdateOptions: t,
      task: async (i, a) => {
        this.listenerCount(fl.DOWNLOAD_PROGRESS) > 0 && (a.onProgress = (o) => this.emit(fl.DOWNLOAD_PROGRESS, o)), await this.httpExecutor.download(n.url, i, a);
      }
    });
  }
  doInstall(t) {
    const r = this.installerPath;
    if (r == null)
      return this.dispatchError(new Error("No update filepath provided, can't quit and install")), !1;
    const n = ["zypper", "dnf", "yum", "rpm"], i = this.detectPackageManager(n);
    try {
      io.installWithCommandRunner(i, r, this.runCommandWithSudoIfNeeded.bind(this), this._logger);
    } catch (a) {
      return this.dispatchError(a), !1;
    }
    return t.isForceRunAfter && this.app.relaunch(), !0;
  }
  static installWithCommandRunner(t, r, n, i) {
    if (t === "zypper")
      return n(["zypper", "--non-interactive", "--no-refresh", "install", "--allow-unsigned-rpm", "-f", r]);
    if (t === "dnf")
      return n(["dnf", "install", "--nogpgcheck", "-y", r]);
    if (t === "yum")
      return n(["yum", "install", "--nogpgcheck", "-y", r]);
    if (t === "rpm")
      return i.warn("Installing with rpm only (no dependency resolution)."), n(["rpm", "-Uvh", "--replacepkgs", "--replacefiles", "--nodeps", r]);
    throw new Error(`Package manager ${t} not supported`);
  }
}
jr.RpmUpdater = io;
var Hr = {};
Object.defineProperty(Hr, "__esModule", { value: !0 });
Hr.MacUpdater = void 0;
const dl = ce, oa = Tt, u_ = _t, hl = re, f_ = Zf, d_ = gt, h_ = se, pl = Kn, ml = Wr;
class p_ extends d_.AppUpdater {
  constructor(t, r) {
    super(t, r), this.nativeUpdater = kt.autoUpdater, this.squirrelDownloadedUpdate = !1, this.nativeUpdater.on("error", (n) => {
      this._logger.warn(n), this.emit("error", n);
    }), this.nativeUpdater.on("update-downloaded", () => {
      this.squirrelDownloadedUpdate = !0, this.debug("nativeUpdater.update-downloaded");
    });
  }
  debug(t) {
    this._logger.debug != null && this._logger.debug(t);
  }
  closeServerIfExists() {
    this.server && (this.debug("Closing proxy server"), this.server.close((t) => {
      t && this.debug("proxy server wasn't already open, probably attempted closing again as a safety check before quit");
    }));
  }
  async doDownloadUpdate(t) {
    let r = t.updateInfoAndProvider.provider.resolveFiles(t.updateInfoAndProvider.info);
    const n = this._logger, i = "sysctl.proc_translated";
    let a = !1;
    try {
      this.debug("Checking for macOS Rosetta environment"), a = (0, pl.execFileSync)("sysctl", [i], { encoding: "utf8" }).includes(`${i}: 1`), n.info(`Checked for macOS Rosetta environment (isRosetta=${a})`);
    } catch (f) {
      n.warn(`sysctl shell command to check for macOS Rosetta environment failed: ${f}`);
    }
    let o = !1;
    try {
      this.debug("Checking for arm64 in uname");
      const d = (0, pl.execFileSync)("uname", ["-a"], { encoding: "utf8" }).includes("ARM");
      n.info(`Checked 'uname -a': arm64=${d}`), o = o || d;
    } catch (f) {
      n.warn(`uname shell command to check for arm64 failed: ${f}`);
    }
    o = o || process.arch === "arm64" || a;
    const s = (f) => {
      var d;
      return f.url.pathname.includes("arm64") || ((d = f.info.url) === null || d === void 0 ? void 0 : d.includes("arm64"));
    };
    o && r.some(s) ? r = r.filter((f) => o === s(f)) : r = r.filter((f) => !s(f));
    const l = (0, h_.findFile)(r, "zip", ["pkg", "dmg"]);
    if (l == null)
      throw (0, dl.newError)(`ZIP file not provided: ${(0, dl.safeStringifyJson)(r)}`, "ERR_UPDATER_ZIP_FILE_NOT_FOUND");
    const m = t.updateInfoAndProvider.provider, c = "update.zip";
    return this.executeDownload({
      fileExtension: "zip",
      fileInfo: l,
      downloadUpdateOptions: t,
      task: async (f, d) => {
        const g = hl.join(this.downloadedUpdateHelper.cacheDir, c), v = () => (0, oa.pathExistsSync)(g) ? !t.disableDifferentialDownload : (n.info("Unable to locate previous update.zip for differential download (is this first install?), falling back to full download"), !1);
        let y = !0;
        v() && (y = await this.differentialDownloadInstaller(l, t, f, m, c)), y && await this.httpExecutor.download(l.url, f, d);
      },
      done: async (f) => {
        if (!t.disableDifferentialDownload)
          try {
            const d = hl.join(this.downloadedUpdateHelper.cacheDir, c);
            await (0, oa.copyFile)(f.downloadedFile, d);
          } catch (d) {
            this._logger.warn(`Unable to copy file for caching for future differential downloads: ${d.message}`);
          }
        return this.updateDownloaded(l, f);
      }
    });
  }
  async updateDownloaded(t, r) {
    var n;
    const i = r.downloadedFile, a = (n = t.info.size) !== null && n !== void 0 ? n : (await (0, oa.stat)(i)).size, o = this._logger, s = `fileToProxy=${t.url.href}`;
    this.closeServerIfExists(), this.debug(`Creating proxy server for native Squirrel.Mac (${s})`), this.server = (0, f_.createServer)(), this.debug(`Proxy server for native Squirrel.Mac is created (${s})`), this.server.on("close", () => {
      o.info(`Proxy server for native Squirrel.Mac is closed (${s})`);
    });
    const l = (m) => {
      const c = m.address();
      return typeof c == "string" ? c : `http://127.0.0.1:${c == null ? void 0 : c.port}`;
    };
    return await new Promise((m, c) => {
      const f = (0, ml.randomBytes)(64).toString("base64").replace(/\//g, "_").replace(/\+/g, "-"), d = Buffer.from(`autoupdater:${f}`, "ascii"), g = `/${(0, ml.randomBytes)(64).toString("hex")}.zip`;
      this.server.on("request", (v, y) => {
        const A = v.url;
        if (o.info(`${A} requested`), A === "/") {
          if (!v.headers.authorization || v.headers.authorization.indexOf("Basic ") === -1) {
            y.statusCode = 401, y.statusMessage = "Invalid Authentication Credentials", y.end(), o.warn("No authenthication info");
            return;
          }
          const D = v.headers.authorization.split(" ")[1], x = Buffer.from(D, "base64").toString("ascii"), [Z, ae] = x.split(":");
          if (Z !== "autoupdater" || ae !== f) {
            y.statusCode = 401, y.statusMessage = "Invalid Authentication Credentials", y.end(), o.warn("Invalid authenthication credentials");
            return;
          }
          const W = Buffer.from(`{ "url": "${l(this.server)}${g}" }`);
          y.writeHead(200, { "Content-Type": "application/json", "Content-Length": W.length }), y.end(W);
          return;
        }
        if (!A.startsWith(g)) {
          o.warn(`${A} requested, but not supported`), y.writeHead(404), y.end();
          return;
        }
        o.info(`${g} requested by Squirrel.Mac, pipe ${i}`);
        let S = !1;
        y.on("finish", () => {
          S || (this.nativeUpdater.removeListener("error", c), m([]));
        });
        const T = (0, u_.createReadStream)(i);
        T.on("error", (D) => {
          try {
            y.end();
          } catch (x) {
            o.warn(`cannot end response: ${x}`);
          }
          S = !0, this.nativeUpdater.removeListener("error", c), c(new Error(`Cannot pipe "${i}": ${D}`));
        }), y.writeHead(200, {
          "Content-Type": "application/zip",
          "Content-Length": a
        }), T.pipe(y);
      }), this.debug(`Proxy server for native Squirrel.Mac is starting to listen (${s})`), this.server.listen(0, "127.0.0.1", () => {
        this.debug(`Proxy server for native Squirrel.Mac is listening (address=${l(this.server)}, ${s})`), this.nativeUpdater.setFeedURL({
          url: l(this.server),
          headers: {
            "Cache-Control": "no-cache",
            Authorization: `Basic ${d.toString("base64")}`
          }
        }), this.dispatchUpdateDownloaded(r), this.autoInstallOnAppQuit ? (this.nativeUpdater.once("error", c), this.nativeUpdater.checkForUpdates()) : m([]);
      });
    });
  }
  handleUpdateDownloaded() {
    this.autoRunAppAfterInstall ? this.nativeUpdater.quitAndInstall() : this.app.quit(), this.closeServerIfExists();
  }
  quitAndInstall() {
    this.squirrelDownloadedUpdate ? this.handleUpdateDownloaded() : (this.nativeUpdater.on("update-downloaded", () => this.handleUpdateDownloaded()), this.autoInstallOnAppQuit || this.nativeUpdater.checkForUpdates());
  }
}
Hr.MacUpdater = p_;
var qr = {}, ao = {};
Object.defineProperty(ao, "__esModule", { value: !0 });
ao.verifySignature = g_;
const gl = ce, ku = Kn, m_ = Jn, El = re;
function Mu(e, t) {
  return ['set "PSModulePath=" & chcp 65001 >NUL & powershell.exe', ["-NoProfile", "-NonInteractive", "-InputFormat", "None", "-Command", e], {
    shell: !0,
    timeout: t
  }];
}
function g_(e, t, r) {
  return new Promise((n, i) => {
    const a = t.replace(/'/g, "''");
    r.info(`Verifying signature ${a}`), (0, ku.execFile)(...Mu(`"Get-AuthenticodeSignature -LiteralPath '${a}' | ConvertTo-Json -Compress"`, 20 * 1e3), (o, s, l) => {
      var m;
      try {
        if (o != null || l) {
          sa(r, o, l, i), n(null);
          return;
        }
        const c = E_(s);
        if (c.Status === 0) {
          try {
            const v = El.normalize(c.Path), y = El.normalize(t);
            if (r.info(`LiteralPath: ${v}. Update Path: ${y}`), v !== y) {
              sa(r, new Error(`LiteralPath of ${v} is different than ${y}`), l, i), n(null);
              return;
            }
          } catch (v) {
            r.warn(`Unable to verify LiteralPath of update asset due to missing data.Path. Skipping this step of validation. Message: ${(m = v.message) !== null && m !== void 0 ? m : v.stack}`);
          }
          const d = (0, gl.parseDn)(c.SignerCertificate.Subject);
          let g = !1;
          for (const v of e) {
            const y = (0, gl.parseDn)(v);
            if (y.size ? g = Array.from(y.keys()).every((S) => y.get(S) === d.get(S)) : v === d.get("CN") && (r.warn(`Signature validated using only CN ${v}. Please add your full Distinguished Name (DN) to publisherNames configuration`), g = !0), g) {
              n(null);
              return;
            }
          }
        }
        const f = `publisherNames: ${e.join(" | ")}, raw info: ` + JSON.stringify(c, (d, g) => d === "RawData" ? void 0 : g, 2);
        r.warn(`Sign verification failed, installer signed with incorrect certificate: ${f}`), n(f);
      } catch (c) {
        sa(r, c, null, i), n(null);
        return;
      }
    });
  });
}
function E_(e) {
  const t = JSON.parse(e);
  delete t.PrivateKey, delete t.IsOSBinary, delete t.SignatureType;
  const r = t.SignerCertificate;
  return r != null && (delete r.Archived, delete r.Extensions, delete r.Handle, delete r.HasPrivateKey, delete r.SubjectName), t;
}
function sa(e, t, r, n) {
  if (y_()) {
    e.warn(`Cannot execute Get-AuthenticodeSignature: ${t || r}. Ignoring signature validation due to unsupported powershell version. Please upgrade to powershell 3 or higher.`);
    return;
  }
  try {
    (0, ku.execFileSync)(...Mu("ConvertTo-Json test", 10 * 1e3));
  } catch (i) {
    e.warn(`Cannot execute ConvertTo-Json: ${i.message}. Ignoring signature validation due to unsupported powershell version. Please upgrade to powershell 3 or higher.`);
    return;
  }
  t != null && n(t), r && n(new Error(`Cannot execute Get-AuthenticodeSignature, stderr: ${r}. Failing signature validation due to unknown stderr.`));
}
function y_() {
  const e = m_.release();
  return e.startsWith("6.") && !e.startsWith("6.3");
}
Object.defineProperty(qr, "__esModule", { value: !0 });
qr.NsisUpdater = void 0;
const Nn = ce, yl = re, v_ = Ht, w_ = nn, vl = St, __ = se, A_ = Tt, T_ = ao, wl = At;
class S_ extends v_.BaseUpdater {
  constructor(t, r) {
    super(t, r), this._verifyUpdateCodeSignature = (n, i) => (0, T_.verifySignature)(n, i, this._logger);
  }
  /**
   * The verifyUpdateCodeSignature. You can pass [win-verify-signature](https://github.com/beyondkmp/win-verify-trust) or another custom verify function: ` (publisherName: string[], path: string) => Promise<string | null>`.
   * The default verify function uses [windowsExecutableCodeSignatureVerifier](https://github.com/electron-userland/electron-builder/blob/master/packages/electron-updater/src/windowsExecutableCodeSignatureVerifier.ts)
   */
  get verifyUpdateCodeSignature() {
    return this._verifyUpdateCodeSignature;
  }
  set verifyUpdateCodeSignature(t) {
    t && (this._verifyUpdateCodeSignature = t);
  }
  /*** @private */
  doDownloadUpdate(t) {
    const r = t.updateInfoAndProvider.provider, n = (0, __.findFile)(r.resolveFiles(t.updateInfoAndProvider.info), "exe");
    return this.executeDownload({
      fileExtension: "exe",
      downloadUpdateOptions: t,
      fileInfo: n,
      task: async (i, a, o, s) => {
        const l = n.packageInfo, m = l != null && o != null;
        if (m && t.disableWebInstaller)
          throw (0, Nn.newError)(`Unable to download new version ${t.updateInfoAndProvider.info.version}. Web Installers are disabled`, "ERR_UPDATER_WEB_INSTALLER_DISABLED");
        !m && !t.disableWebInstaller && this._logger.warn("disableWebInstaller is set to false, you should set it to true if you do not plan on using a web installer. This will default to true in a future version."), (m || t.disableDifferentialDownload || await this.differentialDownloadInstaller(n, t, i, r, Nn.CURRENT_APP_INSTALLER_FILE_NAME)) && await this.httpExecutor.download(n.url, i, a);
        const c = await this.verifySignature(i);
        if (c != null)
          throw await s(), (0, Nn.newError)(`New version ${t.updateInfoAndProvider.info.version} is not signed by the application owner: ${c}`, "ERR_UPDATER_INVALID_SIGNATURE");
        if (m && await this.differentialDownloadWebPackage(t, l, o, r))
          try {
            await this.httpExecutor.download(new wl.URL(l.path), o, {
              headers: t.requestHeaders,
              cancellationToken: t.cancellationToken,
              sha512: l.sha512
            });
          } catch (f) {
            try {
              await (0, A_.unlink)(o);
            } catch {
            }
            throw f;
          }
      }
    });
  }
  // $certificateInfo = (Get-AuthenticodeSignature 'xxx\yyy.exe'
  // | where {$_.Status.Equals([System.Management.Automation.SignatureStatus]::Valid) -and $_.SignerCertificate.Subject.Contains("CN=siemens.com")})
  // | Out-String ; if ($certificateInfo) { exit 0 } else { exit 1 }
  async verifySignature(t) {
    let r;
    try {
      if (r = (await this.configOnDisk.value).publisherName, r == null)
        return null;
    } catch (n) {
      if (n.code === "ENOENT")
        return null;
      throw n;
    }
    return await this._verifyUpdateCodeSignature(Array.isArray(r) ? r : [r], t);
  }
  doInstall(t) {
    const r = this.installerPath;
    if (r == null)
      return this.dispatchError(new Error("No update filepath provided, can't quit and install")), !1;
    const n = ["--updated"];
    t.isSilent && n.push("/S"), t.isForceRunAfter && n.push("--force-run"), this.installDirectory && n.push(`/D=${this.installDirectory}`);
    const i = this.downloadedUpdateHelper == null ? null : this.downloadedUpdateHelper.packageFile;
    i != null && n.push(`--package-file=${i}`);
    const a = () => {
      this.spawnLog(yl.join(process.resourcesPath, "elevate.exe"), [r].concat(n)).catch((o) => this.dispatchError(o));
    };
    return t.isAdminRightsRequired ? (this._logger.info("isAdminRightsRequired is set to true, run installer using elevate.exe"), a(), !0) : (this.spawnLog(r, n).catch((o) => {
      const s = o.code;
      this._logger.info(`Cannot run installer: error code: ${s}, error message: "${o.message}", will be executed again using elevate if EACCES, and will try to use electron.shell.openItem if ENOENT`), s === "UNKNOWN" || s === "EACCES" ? a() : s === "ENOENT" ? kt.shell.openPath(r).catch((l) => this.dispatchError(l)) : this.dispatchError(o);
    }), !0);
  }
  async differentialDownloadWebPackage(t, r, n, i) {
    if (r.blockMapSize == null)
      return !0;
    try {
      const a = {
        newUrl: new wl.URL(r.path),
        oldFile: yl.join(this.downloadedUpdateHelper.cacheDir, Nn.CURRENT_APP_PACKAGE_FILE_NAME),
        logger: this._logger,
        newFile: n,
        requestHeaders: this.requestHeaders,
        isUseMultipleRangeRequest: i.isUseMultipleRangeRequest,
        cancellationToken: t.cancellationToken
      };
      this.listenerCount(vl.DOWNLOAD_PROGRESS) > 0 && (a.onProgress = (o) => this.emit(vl.DOWNLOAD_PROGRESS, o)), await new w_.FileWithEmbeddedBlockMapDifferentialDownloader(r, this.httpExecutor, a).download();
    } catch (a) {
      return this._logger.error(`Cannot download differentially, fallback to full download: ${a.stack || a}`), process.platform === "win32";
    }
    return !1;
  }
}
qr.NsisUpdater = S_;
(function(e) {
  var t = Se && Se.__createBinding || (Object.create ? function(A, S, T, D) {
    D === void 0 && (D = T);
    var x = Object.getOwnPropertyDescriptor(S, T);
    (!x || ("get" in x ? !S.__esModule : x.writable || x.configurable)) && (x = { enumerable: !0, get: function() {
      return S[T];
    } }), Object.defineProperty(A, D, x);
  } : function(A, S, T, D) {
    D === void 0 && (D = T), A[D] = S[T];
  }), r = Se && Se.__exportStar || function(A, S) {
    for (var T in A) T !== "default" && !Object.prototype.hasOwnProperty.call(S, T) && t(S, A, T);
  };
  Object.defineProperty(e, "__esModule", { value: !0 }), e.NsisUpdater = e.MacUpdater = e.RpmUpdater = e.PacmanUpdater = e.DebUpdater = e.AppImageUpdater = e.Provider = e.NoOpLogger = e.AppUpdater = e.BaseUpdater = void 0;
  const n = Tt, i = re;
  var a = Ht;
  Object.defineProperty(e, "BaseUpdater", { enumerable: !0, get: function() {
    return a.BaseUpdater;
  } });
  var o = gt;
  Object.defineProperty(e, "AppUpdater", { enumerable: !0, get: function() {
    return o.AppUpdater;
  } }), Object.defineProperty(e, "NoOpLogger", { enumerable: !0, get: function() {
    return o.NoOpLogger;
  } });
  var s = se;
  Object.defineProperty(e, "Provider", { enumerable: !0, get: function() {
    return s.Provider;
  } });
  var l = kr;
  Object.defineProperty(e, "AppImageUpdater", { enumerable: !0, get: function() {
    return l.AppImageUpdater;
  } });
  var m = Mr;
  Object.defineProperty(e, "DebUpdater", { enumerable: !0, get: function() {
    return m.DebUpdater;
  } });
  var c = Br;
  Object.defineProperty(e, "PacmanUpdater", { enumerable: !0, get: function() {
    return c.PacmanUpdater;
  } });
  var f = jr;
  Object.defineProperty(e, "RpmUpdater", { enumerable: !0, get: function() {
    return f.RpmUpdater;
  } });
  var d = Hr;
  Object.defineProperty(e, "MacUpdater", { enumerable: !0, get: function() {
    return d.MacUpdater;
  } });
  var g = qr;
  Object.defineProperty(e, "NsisUpdater", { enumerable: !0, get: function() {
    return g.NsisUpdater;
  } }), r(St, e);
  let v;
  function y() {
    if (process.platform === "win32")
      v = new qr.NsisUpdater();
    else if (process.platform === "darwin")
      v = new Hr.MacUpdater();
    else {
      v = new kr.AppImageUpdater();
      try {
        const A = i.join(process.resourcesPath, "package-type");
        if (!(0, n.existsSync)(A))
          return v;
        switch ((0, n.readFileSync)(A).toString().trim()) {
          case "deb":
            v = new Mr.DebUpdater();
            break;
          case "rpm":
            v = new jr.RpmUpdater();
            break;
          case "pacman":
            v = new Br.PacmanUpdater();
            break;
          default:
            break;
        }
      } catch (A) {
        console.warn("Unable to detect 'package-type' for autoUpdater (rpm/deb/pacman support). If you'd like to expand support, please consider contributing to electron-builder", A.message);
      }
    }
    return v;
  }
  Object.defineProperty(e, "autoUpdater", {
    enumerable: !0,
    get: () => v || y()
  });
})(ke);
const Bu = Me.dirname(ed(import.meta.url));
process.env.APP_ROOT = Me.join(Bu, "..");
const Sa = process.env.VITE_DEV_SERVER_URL, W_ = Me.join(process.env.APP_ROOT, "dist-electron"), ju = Me.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = Sa ? Me.join(process.env.APP_ROOT, "public") : ju;
let xe;
const _l = "https://github.com/zerr0o/gemini-super-power/releases";
function Hu() {
  return Xn.getFocusedWindow() ?? xe ?? void 0;
}
function C_(e, t = "export") {
  return e.replace(/[<>:"/\\|?*\x00-\x1F]/g, "-").replace(/\s+/g, " ").trim().slice(0, 80) || t;
}
function qu(e, t) {
  if (t === "utf8")
    return Buffer.from(e, "utf8");
  if (t === "data-url") {
    const r = e.split(",", 2)[1] || "";
    return Buffer.from(r, "base64");
  }
  return Buffer.from(e, "base64");
}
async function b_(e, t) {
  const r = C_(t);
  let n = Me.join(e, r), i = 2;
  for (; ; )
    try {
      await td(n, rd.F_OK), n = Me.join(e, `${r}-${i}`), i += 1;
    } catch {
      return await Pl(n, { recursive: !0 }), n;
    }
}
let Al = !1, Tl = !1, rr = !1;
function Gu(e, t) {
  return pt.isPackaged ? {
    enabled: !0,
    status: e ?? "idle",
    currentVersion: pt.getVersion(),
    availableVersion: null,
    progress: null,
    message: t ?? "Automatic updates are ready.",
    feedUrl: _l
  } : {
    enabled: !1,
    status: "unsupported",
    currentVersion: pt.getVersion(),
    availableVersion: null,
    progress: null,
    message: "Auto updates are disabled in development builds.",
    feedUrl: _l
  };
}
let me = Gu();
function oo(e) {
  const t = e ? [e] : Xn.getAllWindows();
  for (const r of t)
    r.webContents.send("app-updater:state", me);
}
function nt(e) {
  me = {
    ...me,
    ...e,
    currentVersion: pt.getVersion()
  }, oo();
}
function Vu() {
  return me = Gu(me.status, me.message), me.enabled ? (Tl || (Tl = !0, ke.autoUpdater.on("checking-for-update", () => {
    rr = !0, nt({
      status: "checking",
      progress: null,
      message: "Checking for updates..."
    });
  }), ke.autoUpdater.on("update-available", (e) => {
    nt({
      status: "available",
      availableVersion: (e == null ? void 0 : e.version) ?? null,
      progress: 0,
      message: `Update ${(e == null ? void 0 : e.version) ?? "available"} found. Downloading in the background...`
    });
  }), ke.autoUpdater.on("download-progress", (e) => {
    nt({
      status: "downloading",
      progress: typeof (e == null ? void 0 : e.percent) == "number" ? e.percent : null,
      message: `Downloading update${typeof (e == null ? void 0 : e.percent) == "number" ? ` (${Math.round(e.percent)}%)` : "..."}`
    });
  }), ke.autoUpdater.on("update-downloaded", (e) => {
    rr = !1, nt({
      status: "downloaded",
      availableVersion: (e == null ? void 0 : e.version) ?? me.availableVersion,
      progress: 100,
      message: "Update downloaded. It will install on quit, or you can restart now."
    });
  }), ke.autoUpdater.on("update-not-available", () => {
    rr = !1, nt({
      status: "up-to-date",
      availableVersion: null,
      progress: null,
      message: "You already have the latest version."
    });
  }), ke.autoUpdater.on("error", (e) => {
    rr = !1, nt({
      status: "error",
      progress: null,
      message: e instanceof Error ? e.message : "Auto update failed."
    });
  })), Al || (ke.autoUpdater.autoDownload = !0, ke.autoUpdater.autoInstallOnAppQuit = !0, ke.autoUpdater.allowPrerelease = !1, Al = !0, nt({
    status: me.status === "up-to-date" ? "up-to-date" : "idle",
    message: "Automatic updates are enabled."
  })), !0) : (oo(), !1);
}
async function Wu() {
  if (!Vu() || rr || me.status === "downloading")
    return me;
  try {
    await ke.autoUpdater.checkForUpdates();
  } catch (e) {
    rr = !1, nt({
      status: "error",
      progress: null,
      message: e instanceof Error ? e.message : "Auto update failed."
    });
  }
  return me;
}
function Yu() {
  xe = new Xn({
    title: "Gemini Super Power",
    icon: Me.join(process.env.VITE_PUBLIC, "icon.png"),
    autoHideMenuBar: !0,
    webPreferences: {
      preload: Me.join(Bu, "preload.mjs")
    }
  }), xe.setMenuBarVisibility(!1), xe.webContents.on("did-finish-load", () => {
    xe == null || xe.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString()), xe && oo(xe);
  }), Sa ? (xe.loadURL(Sa), xe.webContents.openDevTools({ mode: "detach" })) : xe.loadFile(Me.join(ju, "index.html"));
}
Gr.handle("app-updater:get-state", () => me);
Gr.handle("app-updater:check", async () => (await Wu(), me));
Gr.handle("app-updater:install", () => me.status !== "downloaded" ? !1 : (nt({
  message: "Restarting to install update..."
}), setImmediate(() => {
  ke.autoUpdater.quitAndInstall();
}), !0));
Gr.handle("desktop:save-file", async (e, t) => {
  const r = Hu(), n = {
    title: t.title,
    defaultPath: t.defaultPath,
    filters: t.filters
  }, i = r ? await Ln.showSaveDialog(r, n) : await Ln.showSaveDialog(n);
  return i.canceled || !i.filePath ? null : (await Ol(i.filePath, qu(t.contents, t.encoding)), i.filePath);
});
Gr.handle("desktop:save-directory-files", async (e, t) => {
  const r = Hu(), n = {
    title: t.title,
    properties: ["openDirectory", "createDirectory"]
  }, i = r ? await Ln.showOpenDialog(r, n) : await Ln.showOpenDialog(n);
  if (i.canceled || i.filePaths.length === 0)
    return null;
  const a = await b_(i.filePaths[0], t.folderName);
  for (const o of t.files) {
    const s = Me.join(a, o.relativePath);
    await Pl(Me.dirname(s), { recursive: !0 }), await Ol(s, qu(o.contents, o.encoding));
  }
  return a;
});
pt.on("window-all-closed", () => {
  process.platform !== "darwin" && (pt.quit(), xe = null);
});
pt.on("activate", () => {
  Xn.getAllWindows().length === 0 && Yu();
});
pt.whenReady().then(async () => {
  Jf.setApplicationMenu(null), Yu(), Vu(), me.enabled && setTimeout(() => {
    Wu();
  }, 1400);
});
export {
  W_ as MAIN_DIST,
  ju as RENDERER_DIST,
  Sa as VITE_DEV_SERVER_URL
};
