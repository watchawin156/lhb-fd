var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// C:/Users/WindPC/AppData/Roaming/npm/node_modules/wrangler/node_modules/unenv/dist/runtime/_internal/utils.mjs
// @__NO_SIDE_EFFECTS__
function createNotImplementedError(name) {
  return new Error(`[unenv] ${name} is not implemented yet!`);
}
__name(createNotImplementedError, "createNotImplementedError");
// @__NO_SIDE_EFFECTS__
function notImplemented(name) {
  const fn = /* @__PURE__ */ __name(() => {
    throw /* @__PURE__ */ createNotImplementedError(name);
  }, "fn");
  return Object.assign(fn, { __unenv__: true });
}
__name(notImplemented, "notImplemented");
// @__NO_SIDE_EFFECTS__
function notImplementedClass(name) {
  return class {
    __unenv__ = true;
    constructor() {
      throw new Error(`[unenv] ${name} is not implemented yet!`);
    }
  };
}
__name(notImplementedClass, "notImplementedClass");

// C:/Users/WindPC/AppData/Roaming/npm/node_modules/wrangler/node_modules/unenv/dist/runtime/node/internal/perf_hooks/performance.mjs
var _timeOrigin = globalThis.performance?.timeOrigin ?? Date.now();
var _performanceNow = globalThis.performance?.now ? globalThis.performance.now.bind(globalThis.performance) : () => Date.now() - _timeOrigin;
var nodeTiming = {
  name: "node",
  entryType: "node",
  startTime: 0,
  duration: 0,
  nodeStart: 0,
  v8Start: 0,
  bootstrapComplete: 0,
  environment: 0,
  loopStart: 0,
  loopExit: 0,
  idleTime: 0,
  uvMetricsInfo: {
    loopCount: 0,
    events: 0,
    eventsWaiting: 0
  },
  detail: void 0,
  toJSON() {
    return this;
  }
};
var PerformanceEntry = class {
  static {
    __name(this, "PerformanceEntry");
  }
  __unenv__ = true;
  detail;
  entryType = "event";
  name;
  startTime;
  constructor(name, options) {
    this.name = name;
    this.startTime = options?.startTime || _performanceNow();
    this.detail = options?.detail;
  }
  get duration() {
    return _performanceNow() - this.startTime;
  }
  toJSON() {
    return {
      name: this.name,
      entryType: this.entryType,
      startTime: this.startTime,
      duration: this.duration,
      detail: this.detail
    };
  }
};
var PerformanceMark = class PerformanceMark2 extends PerformanceEntry {
  static {
    __name(this, "PerformanceMark");
  }
  entryType = "mark";
  constructor() {
    super(...arguments);
  }
  get duration() {
    return 0;
  }
};
var PerformanceMeasure = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceMeasure");
  }
  entryType = "measure";
};
var PerformanceResourceTiming = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceResourceTiming");
  }
  entryType = "resource";
  serverTiming = [];
  connectEnd = 0;
  connectStart = 0;
  decodedBodySize = 0;
  domainLookupEnd = 0;
  domainLookupStart = 0;
  encodedBodySize = 0;
  fetchStart = 0;
  initiatorType = "";
  name = "";
  nextHopProtocol = "";
  redirectEnd = 0;
  redirectStart = 0;
  requestStart = 0;
  responseEnd = 0;
  responseStart = 0;
  secureConnectionStart = 0;
  startTime = 0;
  transferSize = 0;
  workerStart = 0;
  responseStatus = 0;
};
var PerformanceObserverEntryList = class {
  static {
    __name(this, "PerformanceObserverEntryList");
  }
  __unenv__ = true;
  getEntries() {
    return [];
  }
  getEntriesByName(_name, _type) {
    return [];
  }
  getEntriesByType(type) {
    return [];
  }
};
var Performance = class {
  static {
    __name(this, "Performance");
  }
  __unenv__ = true;
  timeOrigin = _timeOrigin;
  eventCounts = /* @__PURE__ */ new Map();
  _entries = [];
  _resourceTimingBufferSize = 0;
  navigation = void 0;
  timing = void 0;
  timerify(_fn, _options) {
    throw createNotImplementedError("Performance.timerify");
  }
  get nodeTiming() {
    return nodeTiming;
  }
  eventLoopUtilization() {
    return {};
  }
  markResourceTiming() {
    return new PerformanceResourceTiming("");
  }
  onresourcetimingbufferfull = null;
  now() {
    if (this.timeOrigin === _timeOrigin) {
      return _performanceNow();
    }
    return Date.now() - this.timeOrigin;
  }
  clearMarks(markName) {
    this._entries = markName ? this._entries.filter((e) => e.name !== markName) : this._entries.filter((e) => e.entryType !== "mark");
  }
  clearMeasures(measureName) {
    this._entries = measureName ? this._entries.filter((e) => e.name !== measureName) : this._entries.filter((e) => e.entryType !== "measure");
  }
  clearResourceTimings() {
    this._entries = this._entries.filter((e) => e.entryType !== "resource" || e.entryType !== "navigation");
  }
  getEntries() {
    return this._entries;
  }
  getEntriesByName(name, type) {
    return this._entries.filter((e) => e.name === name && (!type || e.entryType === type));
  }
  getEntriesByType(type) {
    return this._entries.filter((e) => e.entryType === type);
  }
  mark(name, options) {
    const entry = new PerformanceMark(name, options);
    this._entries.push(entry);
    return entry;
  }
  measure(measureName, startOrMeasureOptions, endMark) {
    let start;
    let end;
    if (typeof startOrMeasureOptions === "string") {
      start = this.getEntriesByName(startOrMeasureOptions, "mark")[0]?.startTime;
      end = this.getEntriesByName(endMark, "mark")[0]?.startTime;
    } else {
      start = Number.parseFloat(startOrMeasureOptions?.start) || this.now();
      end = Number.parseFloat(startOrMeasureOptions?.end) || this.now();
    }
    const entry = new PerformanceMeasure(measureName, {
      startTime: start,
      detail: {
        start,
        end
      }
    });
    this._entries.push(entry);
    return entry;
  }
  setResourceTimingBufferSize(maxSize) {
    this._resourceTimingBufferSize = maxSize;
  }
  addEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.addEventListener");
  }
  removeEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.removeEventListener");
  }
  dispatchEvent(event) {
    throw createNotImplementedError("Performance.dispatchEvent");
  }
  toJSON() {
    return this;
  }
};
var PerformanceObserver = class {
  static {
    __name(this, "PerformanceObserver");
  }
  __unenv__ = true;
  static supportedEntryTypes = [];
  _callback = null;
  constructor(callback) {
    this._callback = callback;
  }
  takeRecords() {
    return [];
  }
  disconnect() {
    throw createNotImplementedError("PerformanceObserver.disconnect");
  }
  observe(options) {
    throw createNotImplementedError("PerformanceObserver.observe");
  }
  bind(fn) {
    return fn;
  }
  runInAsyncScope(fn, thisArg, ...args) {
    return fn.call(thisArg, ...args);
  }
  asyncId() {
    return 0;
  }
  triggerAsyncId() {
    return 0;
  }
  emitDestroy() {
    return this;
  }
};
var performance = globalThis.performance && "addEventListener" in globalThis.performance ? globalThis.performance : new Performance();

// C:/Users/WindPC/AppData/Roaming/npm/node_modules/wrangler/node_modules/@cloudflare/unenv-preset/dist/runtime/polyfill/performance.mjs
globalThis.performance = performance;
globalThis.Performance = Performance;
globalThis.PerformanceEntry = PerformanceEntry;
globalThis.PerformanceMark = PerformanceMark;
globalThis.PerformanceMeasure = PerformanceMeasure;
globalThis.PerformanceObserver = PerformanceObserver;
globalThis.PerformanceObserverEntryList = PerformanceObserverEntryList;
globalThis.PerformanceResourceTiming = PerformanceResourceTiming;

// C:/Users/WindPC/AppData/Roaming/npm/node_modules/wrangler/node_modules/unenv/dist/runtime/node/console.mjs
import { Writable } from "node:stream";

// C:/Users/WindPC/AppData/Roaming/npm/node_modules/wrangler/node_modules/unenv/dist/runtime/mock/noop.mjs
var noop_default = Object.assign(() => {
}, { __unenv__: true });

// C:/Users/WindPC/AppData/Roaming/npm/node_modules/wrangler/node_modules/unenv/dist/runtime/node/console.mjs
var _console = globalThis.console;
var _ignoreErrors = true;
var _stderr = new Writable();
var _stdout = new Writable();
var log = _console?.log ?? noop_default;
var info = _console?.info ?? log;
var trace = _console?.trace ?? info;
var debug = _console?.debug ?? log;
var table = _console?.table ?? log;
var error = _console?.error ?? log;
var warn = _console?.warn ?? error;
var createTask = _console?.createTask ?? /* @__PURE__ */ notImplemented("console.createTask");
var clear = _console?.clear ?? noop_default;
var count = _console?.count ?? noop_default;
var countReset = _console?.countReset ?? noop_default;
var dir = _console?.dir ?? noop_default;
var dirxml = _console?.dirxml ?? noop_default;
var group = _console?.group ?? noop_default;
var groupEnd = _console?.groupEnd ?? noop_default;
var groupCollapsed = _console?.groupCollapsed ?? noop_default;
var profile = _console?.profile ?? noop_default;
var profileEnd = _console?.profileEnd ?? noop_default;
var time = _console?.time ?? noop_default;
var timeEnd = _console?.timeEnd ?? noop_default;
var timeLog = _console?.timeLog ?? noop_default;
var timeStamp = _console?.timeStamp ?? noop_default;
var Console = _console?.Console ?? /* @__PURE__ */ notImplementedClass("console.Console");
var _times = /* @__PURE__ */ new Map();
var _stdoutErrorHandler = noop_default;
var _stderrErrorHandler = noop_default;

// C:/Users/WindPC/AppData/Roaming/npm/node_modules/wrangler/node_modules/@cloudflare/unenv-preset/dist/runtime/node/console.mjs
var workerdConsole = globalThis["console"];
var {
  assert,
  clear: clear2,
  // @ts-expect-error undocumented public API
  context,
  count: count2,
  countReset: countReset2,
  // @ts-expect-error undocumented public API
  createTask: createTask2,
  debug: debug2,
  dir: dir2,
  dirxml: dirxml2,
  error: error2,
  group: group2,
  groupCollapsed: groupCollapsed2,
  groupEnd: groupEnd2,
  info: info2,
  log: log2,
  profile: profile2,
  profileEnd: profileEnd2,
  table: table2,
  time: time2,
  timeEnd: timeEnd2,
  timeLog: timeLog2,
  timeStamp: timeStamp2,
  trace: trace2,
  warn: warn2
} = workerdConsole;
Object.assign(workerdConsole, {
  Console,
  _ignoreErrors,
  _stderr,
  _stderrErrorHandler,
  _stdout,
  _stdoutErrorHandler,
  _times
});
var console_default = workerdConsole;

// C:/Users/WindPC/AppData/Roaming/npm/node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-console
globalThis.console = console_default;

// C:/Users/WindPC/AppData/Roaming/npm/node_modules/wrangler/node_modules/unenv/dist/runtime/node/internal/process/hrtime.mjs
var hrtime = /* @__PURE__ */ Object.assign(/* @__PURE__ */ __name(function hrtime2(startTime) {
  const now = Date.now();
  const seconds = Math.trunc(now / 1e3);
  const nanos = now % 1e3 * 1e6;
  if (startTime) {
    let diffSeconds = seconds - startTime[0];
    let diffNanos = nanos - startTime[0];
    if (diffNanos < 0) {
      diffSeconds = diffSeconds - 1;
      diffNanos = 1e9 + diffNanos;
    }
    return [diffSeconds, diffNanos];
  }
  return [seconds, nanos];
}, "hrtime"), { bigint: /* @__PURE__ */ __name(function bigint() {
  return BigInt(Date.now() * 1e6);
}, "bigint") });

// C:/Users/WindPC/AppData/Roaming/npm/node_modules/wrangler/node_modules/unenv/dist/runtime/node/internal/process/process.mjs
import { EventEmitter } from "node:events";

// C:/Users/WindPC/AppData/Roaming/npm/node_modules/wrangler/node_modules/unenv/dist/runtime/node/internal/tty/read-stream.mjs
var ReadStream = class {
  static {
    __name(this, "ReadStream");
  }
  fd;
  isRaw = false;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  setRawMode(mode) {
    this.isRaw = mode;
    return this;
  }
};

// C:/Users/WindPC/AppData/Roaming/npm/node_modules/wrangler/node_modules/unenv/dist/runtime/node/internal/tty/write-stream.mjs
var WriteStream = class {
  static {
    __name(this, "WriteStream");
  }
  fd;
  columns = 80;
  rows = 24;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  clearLine(dir3, callback) {
    callback && callback();
    return false;
  }
  clearScreenDown(callback) {
    callback && callback();
    return false;
  }
  cursorTo(x, y, callback) {
    callback && typeof callback === "function" && callback();
    return false;
  }
  moveCursor(dx, dy, callback) {
    callback && callback();
    return false;
  }
  getColorDepth(env2) {
    return 1;
  }
  hasColors(count3, env2) {
    return false;
  }
  getWindowSize() {
    return [this.columns, this.rows];
  }
  write(str, encoding, cb) {
    if (str instanceof Uint8Array) {
      str = new TextDecoder().decode(str);
    }
    try {
      console.log(str);
    } catch {
    }
    cb && typeof cb === "function" && cb();
    return false;
  }
};

// C:/Users/WindPC/AppData/Roaming/npm/node_modules/wrangler/node_modules/unenv/dist/runtime/node/internal/process/node-version.mjs
var NODE_VERSION = "22.14.0";

// C:/Users/WindPC/AppData/Roaming/npm/node_modules/wrangler/node_modules/unenv/dist/runtime/node/internal/process/process.mjs
var Process = class _Process extends EventEmitter {
  static {
    __name(this, "Process");
  }
  env;
  hrtime;
  nextTick;
  constructor(impl) {
    super();
    this.env = impl.env;
    this.hrtime = impl.hrtime;
    this.nextTick = impl.nextTick;
    for (const prop of [...Object.getOwnPropertyNames(_Process.prototype), ...Object.getOwnPropertyNames(EventEmitter.prototype)]) {
      const value = this[prop];
      if (typeof value === "function") {
        this[prop] = value.bind(this);
      }
    }
  }
  // --- event emitter ---
  emitWarning(warning, type, code) {
    console.warn(`${code ? `[${code}] ` : ""}${type ? `${type}: ` : ""}${warning}`);
  }
  emit(...args) {
    return super.emit(...args);
  }
  listeners(eventName) {
    return super.listeners(eventName);
  }
  // --- stdio (lazy initializers) ---
  #stdin;
  #stdout;
  #stderr;
  get stdin() {
    return this.#stdin ??= new ReadStream(0);
  }
  get stdout() {
    return this.#stdout ??= new WriteStream(1);
  }
  get stderr() {
    return this.#stderr ??= new WriteStream(2);
  }
  // --- cwd ---
  #cwd = "/";
  chdir(cwd2) {
    this.#cwd = cwd2;
  }
  cwd() {
    return this.#cwd;
  }
  // --- dummy props and getters ---
  arch = "";
  platform = "";
  argv = [];
  argv0 = "";
  execArgv = [];
  execPath = "";
  title = "";
  pid = 200;
  ppid = 100;
  get version() {
    return `v${NODE_VERSION}`;
  }
  get versions() {
    return { node: NODE_VERSION };
  }
  get allowedNodeEnvironmentFlags() {
    return /* @__PURE__ */ new Set();
  }
  get sourceMapsEnabled() {
    return false;
  }
  get debugPort() {
    return 0;
  }
  get throwDeprecation() {
    return false;
  }
  get traceDeprecation() {
    return false;
  }
  get features() {
    return {};
  }
  get release() {
    return {};
  }
  get connected() {
    return false;
  }
  get config() {
    return {};
  }
  get moduleLoadList() {
    return [];
  }
  constrainedMemory() {
    return 0;
  }
  availableMemory() {
    return 0;
  }
  uptime() {
    return 0;
  }
  resourceUsage() {
    return {};
  }
  // --- noop methods ---
  ref() {
  }
  unref() {
  }
  // --- unimplemented methods ---
  umask() {
    throw createNotImplementedError("process.umask");
  }
  getBuiltinModule() {
    return void 0;
  }
  getActiveResourcesInfo() {
    throw createNotImplementedError("process.getActiveResourcesInfo");
  }
  exit() {
    throw createNotImplementedError("process.exit");
  }
  reallyExit() {
    throw createNotImplementedError("process.reallyExit");
  }
  kill() {
    throw createNotImplementedError("process.kill");
  }
  abort() {
    throw createNotImplementedError("process.abort");
  }
  dlopen() {
    throw createNotImplementedError("process.dlopen");
  }
  setSourceMapsEnabled() {
    throw createNotImplementedError("process.setSourceMapsEnabled");
  }
  loadEnvFile() {
    throw createNotImplementedError("process.loadEnvFile");
  }
  disconnect() {
    throw createNotImplementedError("process.disconnect");
  }
  cpuUsage() {
    throw createNotImplementedError("process.cpuUsage");
  }
  setUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.setUncaughtExceptionCaptureCallback");
  }
  hasUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.hasUncaughtExceptionCaptureCallback");
  }
  initgroups() {
    throw createNotImplementedError("process.initgroups");
  }
  openStdin() {
    throw createNotImplementedError("process.openStdin");
  }
  assert() {
    throw createNotImplementedError("process.assert");
  }
  binding() {
    throw createNotImplementedError("process.binding");
  }
  // --- attached interfaces ---
  permission = { has: /* @__PURE__ */ notImplemented("process.permission.has") };
  report = {
    directory: "",
    filename: "",
    signal: "SIGUSR2",
    compact: false,
    reportOnFatalError: false,
    reportOnSignal: false,
    reportOnUncaughtException: false,
    getReport: /* @__PURE__ */ notImplemented("process.report.getReport"),
    writeReport: /* @__PURE__ */ notImplemented("process.report.writeReport")
  };
  finalization = {
    register: /* @__PURE__ */ notImplemented("process.finalization.register"),
    unregister: /* @__PURE__ */ notImplemented("process.finalization.unregister"),
    registerBeforeExit: /* @__PURE__ */ notImplemented("process.finalization.registerBeforeExit")
  };
  memoryUsage = Object.assign(() => ({
    arrayBuffers: 0,
    rss: 0,
    external: 0,
    heapTotal: 0,
    heapUsed: 0
  }), { rss: /* @__PURE__ */ __name(() => 0, "rss") });
  // --- undefined props ---
  mainModule = void 0;
  domain = void 0;
  // optional
  send = void 0;
  exitCode = void 0;
  channel = void 0;
  getegid = void 0;
  geteuid = void 0;
  getgid = void 0;
  getgroups = void 0;
  getuid = void 0;
  setegid = void 0;
  seteuid = void 0;
  setgid = void 0;
  setgroups = void 0;
  setuid = void 0;
  // internals
  _events = void 0;
  _eventsCount = void 0;
  _exiting = void 0;
  _maxListeners = void 0;
  _debugEnd = void 0;
  _debugProcess = void 0;
  _fatalException = void 0;
  _getActiveHandles = void 0;
  _getActiveRequests = void 0;
  _kill = void 0;
  _preload_modules = void 0;
  _rawDebug = void 0;
  _startProfilerIdleNotifier = void 0;
  _stopProfilerIdleNotifier = void 0;
  _tickCallback = void 0;
  _disconnect = void 0;
  _handleQueue = void 0;
  _pendingMessage = void 0;
  _channel = void 0;
  _send = void 0;
  _linkedBinding = void 0;
};

// C:/Users/WindPC/AppData/Roaming/npm/node_modules/wrangler/node_modules/@cloudflare/unenv-preset/dist/runtime/node/process.mjs
var globalProcess = globalThis["process"];
var getBuiltinModule = globalProcess.getBuiltinModule;
var workerdProcess = getBuiltinModule("node:process");
var isWorkerdProcessV2 = globalThis.Cloudflare.compatibilityFlags.enable_nodejs_process_v2;
var unenvProcess = new Process({
  env: globalProcess.env,
  // `hrtime` is only available from workerd process v2
  hrtime: isWorkerdProcessV2 ? workerdProcess.hrtime : hrtime,
  // `nextTick` is available from workerd process v1
  nextTick: workerdProcess.nextTick
});
var { exit, features, platform } = workerdProcess;
var {
  // Always implemented by workerd
  env,
  // Only implemented in workerd v2
  hrtime: hrtime3,
  // Always implemented by workerd
  nextTick
} = unenvProcess;
var {
  _channel,
  _disconnect,
  _events,
  _eventsCount,
  _handleQueue,
  _maxListeners,
  _pendingMessage,
  _send,
  assert: assert2,
  disconnect,
  mainModule
} = unenvProcess;
var {
  // @ts-expect-error `_debugEnd` is missing typings
  _debugEnd,
  // @ts-expect-error `_debugProcess` is missing typings
  _debugProcess,
  // @ts-expect-error `_exiting` is missing typings
  _exiting,
  // @ts-expect-error `_fatalException` is missing typings
  _fatalException,
  // @ts-expect-error `_getActiveHandles` is missing typings
  _getActiveHandles,
  // @ts-expect-error `_getActiveRequests` is missing typings
  _getActiveRequests,
  // @ts-expect-error `_kill` is missing typings
  _kill,
  // @ts-expect-error `_linkedBinding` is missing typings
  _linkedBinding,
  // @ts-expect-error `_preload_modules` is missing typings
  _preload_modules,
  // @ts-expect-error `_rawDebug` is missing typings
  _rawDebug,
  // @ts-expect-error `_startProfilerIdleNotifier` is missing typings
  _startProfilerIdleNotifier,
  // @ts-expect-error `_stopProfilerIdleNotifier` is missing typings
  _stopProfilerIdleNotifier,
  // @ts-expect-error `_tickCallback` is missing typings
  _tickCallback,
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  arch,
  argv,
  argv0,
  availableMemory,
  // @ts-expect-error `binding` is missing typings
  binding,
  channel,
  chdir,
  config,
  connected,
  constrainedMemory,
  cpuUsage,
  cwd,
  debugPort,
  dlopen,
  // @ts-expect-error `domain` is missing typings
  domain,
  emit,
  emitWarning,
  eventNames,
  execArgv,
  execPath,
  exitCode,
  finalization,
  getActiveResourcesInfo,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getMaxListeners,
  getuid,
  hasUncaughtExceptionCaptureCallback,
  // @ts-expect-error `initgroups` is missing typings
  initgroups,
  kill,
  listenerCount,
  listeners,
  loadEnvFile,
  memoryUsage,
  // @ts-expect-error `moduleLoadList` is missing typings
  moduleLoadList,
  off,
  on,
  once,
  // @ts-expect-error `openStdin` is missing typings
  openStdin,
  permission,
  pid,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  // @ts-expect-error `reallyExit` is missing typings
  reallyExit,
  ref,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  send,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setMaxListeners,
  setSourceMapsEnabled,
  setuid,
  setUncaughtExceptionCaptureCallback,
  sourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  throwDeprecation,
  title,
  traceDeprecation,
  umask,
  unref,
  uptime,
  version,
  versions
} = isWorkerdProcessV2 ? workerdProcess : unenvProcess;
var _process = {
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  hasUncaughtExceptionCaptureCallback,
  setUncaughtExceptionCaptureCallback,
  loadEnvFile,
  sourceMapsEnabled,
  arch,
  argv,
  argv0,
  chdir,
  config,
  connected,
  constrainedMemory,
  availableMemory,
  cpuUsage,
  cwd,
  debugPort,
  dlopen,
  disconnect,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exit,
  finalization,
  features,
  getBuiltinModule,
  getActiveResourcesInfo,
  getMaxListeners,
  hrtime: hrtime3,
  kill,
  listeners,
  listenerCount,
  memoryUsage,
  nextTick,
  on,
  off,
  once,
  pid,
  platform,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  setMaxListeners,
  setSourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  title,
  throwDeprecation,
  traceDeprecation,
  umask,
  uptime,
  version,
  versions,
  // @ts-expect-error old API
  domain,
  initgroups,
  moduleLoadList,
  reallyExit,
  openStdin,
  assert: assert2,
  binding,
  send,
  exitCode,
  channel,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getuid,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setuid,
  permission,
  mainModule,
  _events,
  _eventsCount,
  _exiting,
  _maxListeners,
  _debugEnd,
  _debugProcess,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _kill,
  _preload_modules,
  _rawDebug,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  _disconnect,
  _handleQueue,
  _pendingMessage,
  _channel,
  _send,
  _linkedBinding
};
var process_default = _process;

// C:/Users/WindPC/AppData/Roaming/npm/node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-process
globalThis.process = process_default;

// api/transactions/[id].ts
var onRequestPut = /* @__PURE__ */ __name(async ({ params, request, env: env2 }) => {
  try {
    const id = params.id;
    const body = await request.json();
    const extra = {};
    const knownKeys = ["date", "docNo", "description", "fundType", "income", "expense", "payer", "payee", "payeeType", "bankId", "incomeRefId"];
    for (const k of Object.keys(body)) {
      if (!knownKeys.includes(k)) extra[k] = body[k];
    }
    await env2.DB.prepare(
      `UPDATE transactions SET
        date = ?, doc_no = ?, description = ?, fund_type = ?,
        income = ?, expense = ?, payer = ?, payee = ?,
        payee_type = ?, bank_id = ?, income_ref_id = ?,
        extra_json = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(
      body.date,
      body.docNo || null,
      body.description || null,
      body.fundType,
      body.income || 0,
      body.expense || 0,
      body.payer || null,
      body.payee || null,
      body.payeeType || null,
      body.bankId || null,
      body.incomeRefId || null,
      Object.keys(extra).length > 0 ? JSON.stringify(extra) : null,
      id
    ).run();
    return Response.json({ success: true, id });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}, "onRequestPut");
var onRequestDelete = /* @__PURE__ */ __name(async ({ params, env: env2 }) => {
  try {
    const id = params.id;
    await env2.DB.prepare("DELETE FROM transactions WHERE id = ?").bind(id).run();
    return Response.json({ success: true });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}, "onRequestDelete");
var onRequestOptions = /* @__PURE__ */ __name(async () => {
  return new Response(null, { status: 204 });
}, "onRequestOptions");

// api/audit-logs.ts
var onRequestGet = /* @__PURE__ */ __name(async ({ env: env2 }) => {
  try {
    const { results } = await env2.DB.prepare(
      `SELECT * FROM audit_logs
             WHERE timestamp >= datetime('now', '-1 year')
             ORDER BY timestamp DESC LIMIT 1000`
    ).all();
    return Response.json(results.map((r) => ({
      id: r.id,
      timestamp: r.timestamp,
      user: r.user_name,
      action: r.action,
      details: r.details,
      module: r.module
    })));
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}, "onRequestGet");
var onRequestPost = /* @__PURE__ */ __name(async ({ request, env: env2 }) => {
  try {
    const body = await request.json();
    const { meta } = await env2.DB.prepare(
      `INSERT INTO audit_logs (timestamp, user_name, action, details, module)
       VALUES (datetime('now', '+7 hours'), ?, ?, ?, ?)`
    ).bind(
      body.user || "\u0E40\u0E08\u0E49\u0E32\u0E2B\u0E19\u0E49\u0E32\u0E17\u0E35\u0E48\u0E01\u0E32\u0E23\u0E40\u0E07\u0E34\u0E19",
      body.action || "",
      body.details || "",
      body.module || ""
    ).run();
    await env2.DB.prepare(
      `DELETE FROM audit_logs WHERE timestamp < datetime('now', '-1 year')`
    ).run();
    return Response.json({ id: meta.last_row_id }, { status: 201 });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}, "onRequestPost");
var onRequestDelete2 = /* @__PURE__ */ __name(async ({ env: env2 }) => {
  try {
    await env2.DB.prepare("DELETE FROM audit_logs").run();
    await env2.DB.prepare("DELETE FROM transactions").run();
    return Response.json({ success: true });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}, "onRequestDelete");
var onRequestOptions2 = /* @__PURE__ */ __name(async () => {
  return new Response(null, { status: 204 });
}, "onRequestOptions");

// api/backup.ts
var TELEGRAM_BOT_TOKEN = "8505492579:AAHWRjIcdINKMetnp1bKcXt0xecVSoChSr8";
var TELEGRAM_CHAT_ID = "-1002301809285";
var CRC32_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
    t[i] = c;
  }
  return t;
})();
function crc32(data) {
  let c = 4294967295;
  for (let i = 0; i < data.length; i++) c = CRC32_TABLE[(c ^ data[i]) & 255] ^ c >>> 8;
  return (c ^ 4294967295) >>> 0;
}
__name(crc32, "crc32");
function buildZip(files) {
  const enc = new TextEncoder();
  const now = /* @__PURE__ */ new Date();
  const dosDate = now.getFullYear() - 1980 << 9 | now.getMonth() + 1 << 5 | now.getDate();
  const dosTime = now.getHours() << 11 | now.getMinutes() << 5 | now.getSeconds() >> 1;
  const localHeaders = [];
  const centralDirs = [];
  let offset = 0;
  for (const { name, data } of files) {
    const nameB = enc.encode(name);
    const crc = crc32(data);
    const size = data.length;
    const lh = new Uint8Array(30 + nameB.length);
    const lv = new DataView(lh.buffer);
    lv.setUint32(0, 67324752, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0, true);
    lv.setUint16(8, 0, true);
    lv.setUint16(10, dosTime, true);
    lv.setUint16(12, dosDate, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, size, true);
    lv.setUint32(22, size, true);
    lv.setUint16(26, nameB.length, true);
    lv.setUint16(28, 0, true);
    lh.set(nameB, 30);
    const cd = new Uint8Array(46 + nameB.length);
    const cv = new DataView(cd.buffer);
    cv.setUint32(0, 33639248, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, dosTime, true);
    cv.setUint16(14, dosDate, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, size, true);
    cv.setUint32(24, size, true);
    cv.setUint16(28, nameB.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    cd.set(nameB, 46);
    offset += lh.length + data.length;
    localHeaders.push(lh, data);
    centralDirs.push(cd);
  }
  const cdOffset = offset;
  const cdSize = centralDirs.reduce((s, e) => s + e.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 101010256, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, cdSize, true);
  ev.setUint32(16, cdOffset, true);
  ev.setUint16(20, 0, true);
  const all = [...localHeaders, ...centralDirs, eocd];
  const total = all.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(total);
  let pos = 0;
  for (const p of all) {
    out.set(p, pos);
    pos += p.length;
  }
  return out;
}
__name(buildZip, "buildZip");
function getFiscalYear(dateStr) {
  const d = new Date(dateStr || "");
  if (isNaN(d.getTime())) return null;
  const m = d.getMonth() + 1;
  const y = d.getFullYear();
  return ((m >= 10 ? y + 1 : y) + 543).toString();
}
__name(getFiscalYear, "getFiscalYear");
var FUNDS = {
  "fund-subsidy": "\u0E40\u0E07\u0E34\u0E19\u0E2D\u0E38\u0E14\u0E2B\u0E19\u0E38\u0E19\u0E23\u0E32\u0E22\u0E2B\u0E31\u0E27",
  "fund-15y-book": "\u0E04\u0E48\u0E32\u0E2B\u0E19\u0E31\u0E07\u0E2A\u0E37\u0E2D\u0E40\u0E23\u0E35\u0E22\u0E19",
  "fund-15y-supply": "\u0E04\u0E48\u0E32\u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C\u0E01\u0E32\u0E23\u0E40\u0E23\u0E35\u0E22\u0E19",
  "fund-15y-uniform": "\u0E04\u0E48\u0E32\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E41\u0E1A\u0E1A\u0E19\u0E31\u0E01\u0E40\u0E23\u0E35\u0E22\u0E19",
  "fund-15y-activity": "\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21\u0E1E\u0E31\u0E12\u0E19\u0E32\u0E04\u0E38\u0E13\u0E20\u0E32\u0E1E",
  "fund-poor": "\u0E40\u0E07\u0E34\u0E19\u0E1B\u0E31\u0E08\u0E08\u0E31\u0E22\u0E1E\u0E37\u0E49\u0E19\u0E10\u0E32\u0E19\u0E22\u0E32\u0E01\u0E08\u0E19",
  "fund-state": "\u0E40\u0E07\u0E34\u0E19\u0E23\u0E32\u0E22\u0E44\u0E14\u0E49\u0E41\u0E1C\u0E48\u0E19\u0E14\u0E34\u0E19",
  "fund-lunch": "\u0E40\u0E07\u0E34\u0E19\u0E2D\u0E32\u0E2B\u0E32\u0E23\u0E01\u0E25\u0E32\u0E07\u0E27\u0E31\u0E19",
  "fund-eef": "\u0E40\u0E07\u0E34\u0E19 \u0E01\u0E2A\u0E28.",
  "fund-school-income": "\u0E40\u0E07\u0E34\u0E19\u0E23\u0E32\u0E22\u0E44\u0E14\u0E49\u0E2A\u0E16\u0E32\u0E19\u0E28\u0E36\u0E01\u0E29\u0E32",
  "fund-tax": "\u0E40\u0E07\u0E34\u0E19\u0E20\u0E32\u0E29\u0E35 1%"
};
function buildCSV(rows, columns) {
  const header = columns.map((c) => `"${c.label}"`).join(",");
  const lines = rows.map(
    (r) => columns.map((c) => {
      const v = r[c.key] ?? "";
      return typeof v === "number" ? v.toFixed(2) : `"${String(v).replace(/"/g, '""')}"`;
    }).join(",")
  );
  return "\uFEFF" + [header, ...lines].join("\r\n");
}
__name(buildCSV, "buildCSV");
var onRequestPost2 = /* @__PURE__ */ __name(async ({ env: env2 }) => {
  try {
    const enc = new TextEncoder();
    const now = /* @__PURE__ */ new Date();
    const thaiDate = new Intl.DateTimeFormat("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Bangkok"
    }).format(now);
    const stamp = now.toISOString().slice(0, 10).replace(/-/g, "");
    const [txResult, settingsRow, logsResult] = await Promise.all([
      env2.DB.prepare("SELECT * FROM transactions ORDER BY date ASC, id ASC").all(),
      env2.DB.prepare("SELECT * FROM school_settings WHERE id = 1").first(),
      env2.DB.prepare(`SELECT * FROM audit_logs WHERE timestamp >= datetime('now', '-1 year') ORDER BY timestamp DESC LIMIT 1000`).all()
    ]);
    const transactions = txResult.results;
    const settings = settingsRow;
    const logs = logsResult.results;
    const schoolName = settings?.school_name_th || "\u0E42\u0E23\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19";
    const folderName = `backup-${stamp}`;
    const backupJson = JSON.stringify({ version: "1.0", exportedAt: now.toISOString(), settings, transactions, auditLogs: logs }, null, 2);
    let sql = `-- LHB School Finance Backup
-- Generated: ${now.toISOString()}
-- School: ${schoolName}

`;
    sql += `BEGIN TRANSACTION;

DELETE FROM transactions;

`;
    for (const tx of transactions) {
      const cols = ["id", "date", "doc_no", "description", "fund_type", "income", "expense", "payer", "payee", "payee_type", "bank_id", "income_ref_id", "extra_json"];
      const vals = cols.map((c) => {
        const v = tx[c];
        if (v === null || v === void 0) return "NULL";
        if (typeof v === "number") return v;
        return `'${String(v).replace(/'/g, "''")}'`;
      }).join(", ");
      sql += `INSERT INTO transactions (${cols.join(", ")}) VALUES (${vals});
`;
    }
    sql += `
COMMIT;
`;
    const byFyFund = {};
    for (const tx of transactions) {
      const fy = getFiscalYear(tx.date) || "\u0E44\u0E21\u0E48\u0E23\u0E30\u0E1A\u0E38";
      const fund = tx.fund_type || "other";
      if (!byFyFund[fy]) byFyFund[fy] = {};
      if (!byFyFund[fy][fund]) byFyFund[fy][fund] = [];
      byFyFund[fy][fund].push(tx);
    }
    const csvCols = [
      { key: "date", label: "\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48" },
      { key: "doc_no", label: "\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48\u0E40\u0E2D\u0E01\u0E2A\u0E32\u0E23" },
      { key: "description", label: "\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23" },
      { key: "income", label: "\u0E23\u0E31\u0E1A (\u0E1A\u0E32\u0E17)" },
      { key: "expense", label: "\u0E08\u0E48\u0E32\u0E22 (\u0E1A\u0E32\u0E17)" },
      { key: "payer", label: "\u0E1C\u0E39\u0E49\u0E08\u0E48\u0E32\u0E22/\u0E1C\u0E39\u0E49\u0E23\u0E31\u0E1A" }
    ];
    const zipFiles = [];
    const readme = `\u0E44\u0E1F\u0E25\u0E4C\u0E2A\u0E33\u0E23\u0E2D\u0E07\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25 ${schoolName}
\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E2A\u0E33\u0E23\u0E2D\u0E07: ${thaiDate}
\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E17\u0E31\u0E49\u0E07\u0E2B\u0E21\u0E14: ${transactions.length}

\u0E42\u0E04\u0E23\u0E07\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E44\u0E1F\u0E25\u0E4C:
  backup.json  \u2192 Restore \u0E1C\u0E48\u0E32\u0E19\u0E2B\u0E19\u0E49\u0E32 \u0E15\u0E31\u0E49\u0E07\u0E04\u0E48\u0E32\u0E23\u0E30\u0E1A\u0E1A > \u0E42\u0E2B\u0E25\u0E14\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E01\u0E25\u0E31\u0E1A
  backup.sql   \u2192 Restore \u0E14\u0E49\u0E27\u0E22: wrangler d1 execute lhb-fd-db --file=backup.sql --remote
  csv/         \u2192 \u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E41\u0E22\u0E01\u0E1B\u0E35\u0E07\u0E1A \u0E41\u0E22\u0E01\u0E2B\u0E21\u0E27\u0E14\u0E40\u0E07\u0E34\u0E19 (\u0E40\u0E1B\u0E34\u0E14\u0E14\u0E49\u0E27\u0E22 Excel)`;
    zipFiles.push({ name: `${folderName}/README.txt`, data: enc.encode(readme) });
    zipFiles.push({ name: `${folderName}/backup.json`, data: enc.encode(backupJson) });
    zipFiles.push({ name: `${folderName}/backup.sql`, data: enc.encode(sql) });
    for (const [fy, fundMap] of Object.entries(byFyFund).sort()) {
      const allTxInFy = Object.values(fundMap).flat().sort((a, b) => a.date?.localeCompare(b.date || "") || 0);
      zipFiles.push({
        name: `${folderName}/csv/\u0E1B\u0E35\u0E07\u0E1A-${fy}/\u0E17\u0E38\u0E01\u0E2B\u0E21\u0E27\u0E14-${fy}.csv`,
        data: enc.encode(buildCSV(allTxInFy, csvCols))
      });
      for (const [fundKey, rows] of Object.entries(fundMap).sort()) {
        const fundName = FUNDS[fundKey] || fundKey;
        const sortedRows = [...rows].sort((a, b) => a.date?.localeCompare(b.date || "") || 0);
        zipFiles.push({
          name: `${folderName}/csv/\u0E1B\u0E35\u0E07\u0E1A-${fy}/${fundName}.csv`,
          data: enc.encode(buildCSV(sortedRows, csvCols))
        });
      }
    }
    const zipBytes = buildZip(zipFiles);
    const zipFilename = `lhb-backup-${stamp}.zip`;
    const formData = new FormData();
    formData.append("chat_id", TELEGRAM_CHAT_ID);
    formData.append(
      "caption",
      `\u{1F4E6} \u0E2A\u0E33\u0E23\u0E2D\u0E07\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25 ${schoolName}
\u{1F5D3} ${thaiDate}
\u{1F4CA} ${transactions.length} \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23

\u{1F4C1} \u0E1B\u0E23\u0E30\u0E01\u0E2D\u0E1A\u0E14\u0E49\u0E27\u0E22:
\u2022 backup.json (Restore \u0E1C\u0E48\u0E32\u0E19 UI)
\u2022 backup.sql (Restore \u0E1C\u0E48\u0E32\u0E19 wrangler)
\u2022 CSV \u0E41\u0E22\u0E01\u0E1B\u0E35\u0E07\u0E1A ${Object.keys(byFyFund).join(", ")}`
    );
    formData.append("document", new Blob([zipBytes], { type: "application/zip" }), zipFilename);
    const tgRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`, {
      method: "POST",
      body: formData
    });
    const tgJson = await tgRes.json();
    return Response.json({
      success: true,
      message: "\u0E2A\u0E48\u0E07\u0E2A\u0E33\u0E23\u0E2D\u0E07\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E44\u0E1B Telegram \u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08",
      filename: zipFilename,
      files: zipFiles.length,
      transactions: transactions.length,
      fiscalYears: Object.keys(byFyFund),
      telegram: { ok: tgJson.ok }
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}, "onRequestPost");
var onRequestGet2 = /* @__PURE__ */ __name(async ({ request, env: env2 }) => {
  const url = new URL(request.url);
  if (url.searchParams.get("action") === "export") {
    const [txResult, settingsRow, logsResult] = await Promise.all([
      env2.DB.prepare("SELECT * FROM transactions ORDER BY date ASC").all(),
      env2.DB.prepare("SELECT * FROM school_settings WHERE id = 1").first(),
      env2.DB.prepare(`SELECT * FROM audit_logs WHERE timestamp >= datetime('now', '-1 year') ORDER BY timestamp DESC LIMIT 1000`).all()
    ]);
    const data = { version: "1.0", exportedAt: (/* @__PURE__ */ new Date()).toISOString(), settings: settingsRow, transactions: txResult.results, auditLogs: logsResult.results };
    return new Response(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="lhb-backup-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.json"`
      }
    });
  }
  return Response.json({ error: "Unknown action" }, { status: 400 });
}, "onRequestGet");
var onRequestPut2 = /* @__PURE__ */ __name(async ({ request, env: env2 }) => {
  try {
    const body = await request.json();
    if (!body.transactions || !Array.isArray(body.transactions)) {
      return Response.json({ error: "\u0E44\u0E1F\u0E25\u0E4C backup \u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07 (\u0E15\u0E49\u0E2D\u0E07\u0E21\u0E35 transactions array)" }, { status: 400 });
    }
    await env2.DB.prepare("DELETE FROM transactions").run();
    const txs = body.transactions;
    if (txs.length > 0) {
      for (let i = 0; i < txs.length; i += 50) {
        const chunk = txs.slice(i, i + 50);
        await env2.DB.batch(chunk.map(
          (tx) => env2.DB.prepare(
            `INSERT OR REPLACE INTO transactions (id,date,doc_no,description,fund_type,income,expense,payer,payee,payee_type,bank_id,income_ref_id,extra_json)
                         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
          ).bind(
            tx.id ?? null,
            tx.date ?? null,
            tx.doc_no ?? null,
            tx.description ?? null,
            tx.fund_type ?? null,
            tx.income ?? 0,
            tx.expense ?? 0,
            tx.payer ?? null,
            tx.payee ?? null,
            tx.payee_type ?? null,
            tx.bank_id ?? null,
            tx.income_ref_id ?? null,
            tx.extra_json ?? null
          )
        ));
      }
    }
    if (body.settings) {
      const s = body.settings;
      await env2.DB.prepare(
        `INSERT OR REPLACE INTO school_settings (id,school_name_th,school_name_en,address,director_name,finance_officer,auditor,affiliation,bank_accounts,extra)
                 VALUES (1,?,?,?,?,?,?,?,?,?)`
      ).bind(
        s.school_name_th ?? null,
        s.school_name_en ?? null,
        s.address ?? null,
        s.director_name ?? null,
        s.finance_officer ?? null,
        s.auditor ?? null,
        s.affiliation ?? null,
        s.bank_accounts ?? null,
        s.extra ?? null
      ).run();
    }
    await env2.DB.prepare(
      `INSERT INTO audit_logs (timestamp,user_name,action,details,module) VALUES (datetime('now','+7 hours'),'\u0E23\u0E30\u0E1A\u0E1A','RESTORE_BACKUP',?,'settings')`
    ).bind(`Restore \u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08: ${txs.length} \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23`).run();
    return Response.json({ success: true, restored: txs.length, message: `Restore \u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08: ${txs.length} \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23` });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}, "onRequestPut");
var onRequestOptions3 = /* @__PURE__ */ __name(async () => new Response(null, { status: 204 }), "onRequestOptions");

// api/settings.ts
var onRequestGet3 = /* @__PURE__ */ __name(async ({ env: env2 }) => {
  try {
    const row = await env2.DB.prepare("SELECT * FROM school_settings WHERE id = 1").first();
    if (!row) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({
      schoolNameTH: row.school_name_th,
      schoolNameEN: row.school_name_en,
      address: row.address,
      directorName: row.director_name,
      financeOfficerName: row.finance_officer_name,
      auditorName: row.auditor_name,
      affiliation: row.affiliation,
      bankAccounts: row.bank_accounts_json ? JSON.parse(row.bank_accounts_json) : []
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}, "onRequestGet");
var onRequestPost3 = /* @__PURE__ */ __name(async ({ request, env: env2 }) => {
  try {
    const body = await request.json();
    await env2.DB.prepare(
      `INSERT INTO school_settings (id, school_name_th, school_name_en, address, director_name, finance_officer_name, auditor_name, affiliation, bank_accounts_json, updated_at)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(id) DO UPDATE SET
         school_name_th = excluded.school_name_th,
         school_name_en = excluded.school_name_en,
         address = excluded.address,
         director_name = excluded.director_name,
         finance_officer_name = excluded.finance_officer_name,
         auditor_name = excluded.auditor_name,
         affiliation = excluded.affiliation,
         bank_accounts_json = excluded.bank_accounts_json,
         updated_at = excluded.updated_at`
    ).bind(
      body.schoolNameTH || "",
      body.schoolNameEN || "",
      body.address || "",
      body.directorName || "",
      body.financeOfficerName || "",
      body.auditorName || "",
      body.affiliation || "",
      JSON.stringify(body.bankAccounts || [])
    ).run();
    return Response.json({ success: true });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}, "onRequestPost");
var onRequestOptions4 = /* @__PURE__ */ __name(async () => {
  return new Response(null, { status: 204 });
}, "onRequestOptions");

// api/telegram-send.ts
var TELEGRAM_BOT_TOKEN2 = "8505492579:AAHWRjIcdINKMetnp1bKcXt0xecVSoChSr8";
var TELEGRAM_CHAT_ID2 = "-1002301809285";
var onRequestPost4 = /* @__PURE__ */ __name(async ({ request }) => {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const caption = formData.get("caption") || "\u0E2A\u0E33\u0E23\u0E2D\u0E07\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25";
    const filename = formData.get("filename") || "backup.zip";
    if (!file) {
      return Response.json({ error: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E44\u0E1F\u0E25\u0E4C" }, { status: 400 });
    }
    const tgForm = new FormData();
    tgForm.append("chat_id", TELEGRAM_CHAT_ID2);
    tgForm.append("caption", caption);
    tgForm.append("document", file, filename);
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN2}/sendDocument`, {
      method: "POST",
      body: tgForm
    });
    const result = await res.json();
    if (!result.ok) {
      return Response.json({ error: result.description || "Telegram error" }, { status: 500 });
    }
    return Response.json({ success: true, message_id: result.result?.message_id });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}, "onRequestPost");
var onRequestOptions5 = /* @__PURE__ */ __name(async () => new Response(null, { status: 204 }), "onRequestOptions");

// api/transactions.ts
function txFromRow(row) {
  return {
    id: row.id,
    date: row.date,
    docNo: row.doc_no,
    description: row.description,
    fundType: row.fund_type,
    income: row.income || 0,
    expense: row.expense || 0,
    payer: row.payer,
    payee: row.payee,
    payeeType: row.payee_type,
    bankId: row.bank_id,
    incomeRefId: row.income_ref_id,
    ...row.extra_json ? JSON.parse(row.extra_json) : {}
  };
}
__name(txFromRow, "txFromRow");
var onRequestGet4 = /* @__PURE__ */ __name(async ({ env: env2 }) => {
  try {
    const { results } = await env2.DB.prepare(
      "SELECT * FROM transactions ORDER BY date ASC, id ASC"
    ).all();
    return Response.json(results.map(txFromRow));
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}, "onRequestGet");
var onRequestPost5 = /* @__PURE__ */ __name(async ({ request, env: env2 }) => {
  try {
    const body = await request.json();
    const extra = {};
    const knownKeys = ["date", "docNo", "description", "fundType", "income", "expense", "payer", "payee", "payeeType", "bankId", "incomeRefId"];
    for (const k of Object.keys(body)) {
      if (!knownKeys.includes(k)) extra[k] = body[k];
    }
    const { meta } = await env2.DB.prepare(
      `INSERT INTO transactions (date, doc_no, description, fund_type, income, expense, payer, payee, payee_type, bank_id, income_ref_id, extra_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      body.date,
      body.docNo || null,
      body.description || null,
      body.fundType,
      body.income || 0,
      body.expense || 0,
      body.payer || null,
      body.payee || null,
      body.payeeType || null,
      body.bankId || null,
      body.incomeRefId || null,
      Object.keys(extra).length > 0 ? JSON.stringify(extra) : null
    ).run();
    return Response.json({ id: meta.last_row_id, ...body }, { status: 201 });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}, "onRequestPost");
var onRequestOptions6 = /* @__PURE__ */ __name(async () => {
  return new Response(null, { status: 204 });
}, "onRequestOptions");

// api/_middleware.ts
var onRequest = /* @__PURE__ */ __name(async ({ next }) => {
  const response = await next();
  const newResponse = new Response(response.body, response);
  newResponse.headers.set("Access-Control-Allow-Origin", "*");
  newResponse.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  newResponse.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return newResponse;
}, "onRequest");

// ../.wrangler/tmp/pages-AK0HLz/functionsRoutes-0.7268429771625498.mjs
var routes = [
  {
    routePath: "/api/transactions/:id",
    mountPath: "/api/transactions",
    method: "DELETE",
    middlewares: [],
    modules: [onRequestDelete]
  },
  {
    routePath: "/api/transactions/:id",
    mountPath: "/api/transactions",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions]
  },
  {
    routePath: "/api/transactions/:id",
    mountPath: "/api/transactions",
    method: "PUT",
    middlewares: [],
    modules: [onRequestPut]
  },
  {
    routePath: "/api/audit-logs",
    mountPath: "/api",
    method: "DELETE",
    middlewares: [],
    modules: [onRequestDelete2]
  },
  {
    routePath: "/api/audit-logs",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet]
  },
  {
    routePath: "/api/audit-logs",
    mountPath: "/api",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions2]
  },
  {
    routePath: "/api/audit-logs",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost]
  },
  {
    routePath: "/api/backup",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet2]
  },
  {
    routePath: "/api/backup",
    mountPath: "/api",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions3]
  },
  {
    routePath: "/api/backup",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost2]
  },
  {
    routePath: "/api/backup",
    mountPath: "/api",
    method: "PUT",
    middlewares: [],
    modules: [onRequestPut2]
  },
  {
    routePath: "/api/settings",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet3]
  },
  {
    routePath: "/api/settings",
    mountPath: "/api",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions4]
  },
  {
    routePath: "/api/settings",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost3]
  },
  {
    routePath: "/api/telegram-send",
    mountPath: "/api",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions5]
  },
  {
    routePath: "/api/telegram-send",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost4]
  },
  {
    routePath: "/api/transactions",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet4]
  },
  {
    routePath: "/api/transactions",
    mountPath: "/api",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions6]
  },
  {
    routePath: "/api/transactions",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost5]
  },
  {
    routePath: "/api",
    mountPath: "/api",
    method: "",
    middlewares: [onRequest],
    modules: []
  }
];

// C:/Users/WindPC/AppData/Roaming/npm/node_modules/wrangler/node_modules/path-to-regexp/dist.es2015/index.js
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count3 = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count3--;
          if (count3 === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count3++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count3)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");

// C:/Users/WindPC/AppData/Roaming/npm/node_modules/wrangler/templates/pages-template-worker.ts
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env2, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context2 = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env: env2,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: /* @__PURE__ */ __name(() => {
            isFailOpen = true;
          }, "passThroughOnException")
        };
        const response = await handler(context2);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env2["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error3) {
      if (isFailOpen) {
        const response = await env2["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error3;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");
export {
  pages_template_worker_default as default
};
