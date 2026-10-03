var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
import { _ as __vitePreload } from "./babylon-fa4505fb.js";
import { R as React, r as reactExports, j as jsx, a as React$1, b as jsxs, C as Container, B as Box, I as IconButton, d as default_1, T as Typography, P as Paper, D as Divider, F as FormControl, c as InputLabel, S as Select, M as MenuItem, e as TextField, f as FormControlLabel, g as Switch, h as Button, i as default_1$1, k as CircularProgress, l as default_1$2, m as default_1$3, A as Alert, n as Chip, o as Accordion, p as AccordionSummary, q as default_1$4, s as AccordionDetails, t as default_1$5, u as Collapse, v as Tooltip, w as default_1$6, x as Fragment, L as LinearProgress, y as default_1$7, z as default_1$8, E as useTheme, G as useMediaQuery, H as Avatar, J as default_1$9, K as default_1$a, N as default_1$b, O as default_1$c, Q as default_1$d, U as default_1$e, V as default_1$f, W as Menu, X as RadioGroup, Y as Radio, Z as default_1$g, _ as default_1$h, $ as Dialog, a0 as DialogContent, a1 as default_1$i, a2 as default_1$j, a3 as default_1$k, a4 as default_1$l, a5 as default_1$m, a6 as default_1$n, a7 as default_1$o, a8 as default_1$p, a9 as default_1$q, aa as default_1$r, ab as default_1$s, ac as List, ad as ListItem, ae as ListItemText, af as ListItemSecondaryAction, ag as default_1$t, ah as default_1$u, ai as default_1$v, aj as default_1$w, ak as default_1$x, al as default_1$y, am as default_1$z, an as default_1$A, ao as default_1$B, ap as default_1$C, aq as default_1$D, ar as default_1$E, as as default_1$F, at as default_1$G, au as default_1$H, av as default_1$I, aw as default_1$J } from "./mui-2c02b512.js";
const BabylonModelViewer$1 = React.lazy(() => __vitePreload(() => import("./BabylonModelViewer-f98e999f.js"), true ? ["assets/BabylonModelViewer-f98e999f.js","assets/mui-2c02b512.js","assets/babylon-fa4505fb.js"] : void 0));
if (typeof document !== "undefined") {
  document.documentElement.style.background = "transparent";
  document.body.style.background = "transparent";
  document.body.style.background = "transparent";
  document.documentElement.style.backgroundColor = "transparent";
  document.body.style.backgroundColor = "transparent";
}
async function fetchTextureBuffers(meta) {
  console.log(`[PetPage] 开始 fetch ${meta.textureFiles.length} 个贴图...`);
  const results = await Promise.allSettled(
    meta.textureFiles.map(async (tex) => {
      console.log(`[PetPage] fetch 贴图: ${tex.name} → ${tex.url}`);
      const resp = await fetch(tex.url);
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}: ${tex.url}`);
      }
      const data = await resp.arrayBuffer();
      console.log(`[PetPage] ✅ 贴图已获取: ${tex.name}, ${data.byteLength} 字节`);
      return {
        name: tex.name,
        path: tex.path,
        webkitRelativePath: tex.webkitRelativePath,
        data
      };
    })
  );
  const textures = [];
  let failCount = 0;
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === "fulfilled") {
      textures.push(r.value);
    } else {
      failCount++;
      console.error(`[PetPage] ❌ 贴图 fetch 失败 [${i}] ${meta.textureFiles[i].name}:`, r.reason);
    }
  }
  console.log(`[PetPage] 贴图 fetch 完成: 成功 ${textures.length}/${meta.textureFiles.length}, 失败 ${failCount}`);
  return textures;
}
async function buildModelData(meta) {
  var _a, _b;
  console.log("[PetPage] 开始构建 modelData, 模型 URL:", meta.url);
  const textureFiles = await fetchTextureBuffers(meta);
  const modelData = {
    name: meta.name,
    url: meta.url,
    // BabylonModelViewer 直接用 URL 加载模型（不经过 IPC）
    modelWebkitRelativePath: meta.modelWebkitRelativePath,
    textureFiles
    // 含 data: ArrayBuffer（fetch 获取，不经过 IPC）
  };
  console.log("[PetPage] ✅ modelData 构建完成:", {
    name: modelData.name,
    url: modelData.url,
    textureCount: modelData.textureFiles.length,
    tex0ByteLen: ((_b = (_a = modelData.textureFiles[0]) == null ? void 0 : _a.data) == null ? void 0 : _b.byteLength) || 0
  });
  return modelData;
}
function PetPage() {
  const [modelData, setModelData] = reactExports.useState(null);
  const [loading, setLoading] = reactExports.useState(true);
  const [error, setError] = reactExports.useState(null);
  const showWindowCalledRef = reactExports.useRef(false);
  const currentMetaRef = reactExports.useRef(null);
  const loadedUrlRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    let unsubscribe = null;
    if (typeof document !== "undefined") {
      document.documentElement.style.background = "transparent";
      document.documentElement.style.backgroundColor = "transparent";
      document.body.style.background = "transparent";
      document.body.style.backgroundColor = "transparent";
    }
    const init = async () => {
      var _a, _b, _c;
      const desktopPet = window.desktopPet;
      console.log("[PetPage] 初始化开始, desktopPet存在=", !!desktopPet, ", location=", window.location.href);
      if (!desktopPet) {
        console.error("[PetPage] ❌ window.desktopPet 不存在！preload 未注入。");
        setError("非 Electron 环境，桌宠页面无法工作");
        setLoading(false);
        return;
      }
      try {
        const meta = await desktopPet.getModel();
        console.log("[PetPage] getModel() 返回:", {
          hasMeta: !!meta,
          name: meta == null ? void 0 : meta.name,
          url: meta == null ? void 0 : meta.url,
          textureCount: ((_a = meta == null ? void 0 : meta.textureFiles) == null ? void 0 : _a.length) || 0,
          tex0Url: (_c = (_b = meta == null ? void 0 : meta.textureFiles) == null ? void 0 : _b[0]) == null ? void 0 : _c.url
        });
        if (meta) {
          currentMetaRef.current = meta;
          if (loadedUrlRef.current === meta.url) {
            console.log("[PetPage] getModel: 同stamp已加载过，跳过 setModelData:", meta.url);
          } else {
            try {
              const data = await buildModelData(meta);
              if (currentMetaRef.current === meta && loadedUrlRef.current !== meta.url) {
                loadedUrlRef.current = meta.url;
                setModelData(data);
              }
            } catch (err) {
              console.error("[PetPage] ? buildModelData 失败:", err);
              setError(err instanceof Error ? err.message : String(err));
              setLoading(false);
            }
          }
        } else {
          console.warn("[PetPage] getModel 返回 null，保持 loading 等待 model-updated");
        }
        unsubscribe = desktopPet.onModelUpdated(async (newMeta) => {
          console.log("[PetPage] 收到 model-updated 通知:", newMeta == null ? void 0 : newMeta.name);
          if (!newMeta)
            return;
          if (loadedUrlRef.current === newMeta.url) {
            console.log("[PetPage] model-updated: 同stamp已加载过，跳过:", newMeta.url);
            return;
          }
          setModelData(null);
          loadedUrlRef.current = null;
          currentMetaRef.current = newMeta;
          setLoading(true);
          setError(null);
          showWindowCalledRef.current = false;
          try {
            const data = await buildModelData(newMeta);
            if (currentMetaRef.current === newMeta && loadedUrlRef.current !== newMeta.url) {
              loadedUrlRef.current = newMeta.url;
              setModelData(data);
            }
          } catch (err) {
            console.error("[PetPage] ❌ model-updated buildModelData 失败:", err);
            if (currentMetaRef.current === newMeta) {
              setError(err instanceof Error ? err.message : String(err));
              setLoading(false);
            }
          }
        });
      } catch (err) {
        console.error("[PetPage] ❌ 初始化失败:", err);
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      }
    };
    init();
    return () => {
      if (unsubscribe)
        unsubscribe();
    };
  }, []);
  const handleModelLoaded = React.useCallback(() => {
    var _a;
    console.log("[PetPage] ✅ 模型加载成功回调 onModelLoaded 触发");
    setLoading(false);
    if (!showWindowCalledRef.current) {
      showWindowCalledRef.current = true;
      try {
        (_a = window.desktopPet) == null ? void 0 : _a.showWindow();
        console.log("[PetPage] 已调用 showWindow() 请求主进程显示窗口");
      } catch (err) {
        console.warn("[PetPage] ❌ showWindow() 调用失败:", err);
      }
    } else {
      console.log("[PetPage] showWindow 已调用过，跳过");
    }
  }, []);
  const handleModelError = React.useCallback((err) => {
    var _a;
    console.error("[PetPage] ❌ 模型加载失败回调 onModelError 触发:", err);
    setError(err);
    setLoading(false);
    if (!showWindowCalledRef.current) {
      showWindowCalledRef.current = true;
      (_a = window.desktopPet) == null ? void 0 : _a.showWindow();
      console.log("[PetPage] 加载失败，已调用 showWindow() 显示错误");
    }
  }, []);
  const handleClose = React.useCallback(() => {
    var _a;
    (_a = window.desktopPet) == null ? void 0 : _a.hide();
  }, []);
  if (loading && !modelData) {
    return /* @__PURE__ */ jsx("div", { style: {
      width: "100%",
      height: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "transparent",
      color: "#ccc",
      fontSize: 14
    }, children: "等待模型数据..." });
  }
  if (error && !modelData) {
    return /* @__PURE__ */ jsx("div", { style: {
      width: "100%",
      height: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "transparent",
      color: "#ff6666",
      fontSize: 14,
      padding: 20,
      textAlign: "center"
    }, children: error });
  }
  if (modelData) {
    return /* @__PURE__ */ jsx(React.Suspense, { fallback: /* @__PURE__ */ jsx("div", { style: {
      width: "100%",
      height: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "transparent",
      color: "#ccc",
      fontSize: 14
    }, children: "加载3D引擎中..." }), children: /* @__PURE__ */ jsx(
      BabylonModelViewer$1,
      {
        modelData,
        desktopPetMode: true,
        physicsEnabled: true,
        windEnabled: true,
        onModelLoaded: handleModelLoaded,
        onModelError: handleModelError,
        onClose: handleClose
      }
    ) });
  }
  return null;
}
const PetPage$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: PetPage
}, Symbol.toStringTag, { value: "Module" }));
/**
 * @remix-run/router v1.23.2
 *
 * Copyright (c) Remix Software Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.md file in the root directory of this source tree.
 *
 * @license MIT
 */
function _extends$1() {
  _extends$1 = Object.assign ? Object.assign.bind() : function(target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];
      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }
    return target;
  };
  return _extends$1.apply(this, arguments);
}
var Action;
(function(Action2) {
  Action2["Pop"] = "POP";
  Action2["Push"] = "PUSH";
  Action2["Replace"] = "REPLACE";
})(Action || (Action = {}));
const PopStateEventType = "popstate";
function createBrowserHistory(options) {
  if (options === void 0) {
    options = {};
  }
  function createBrowserLocation(window2, globalHistory) {
    let {
      pathname,
      search,
      hash
    } = window2.location;
    return createLocation(
      "",
      {
        pathname,
        search,
        hash
      },
      // state defaults to `null` because `window.history.state` does
      globalHistory.state && globalHistory.state.usr || null,
      globalHistory.state && globalHistory.state.key || "default"
    );
  }
  function createBrowserHref(window2, to) {
    return typeof to === "string" ? to : createPath(to);
  }
  return getUrlBasedHistory(createBrowserLocation, createBrowserHref, null, options);
}
function invariant(value, message) {
  if (value === false || value === null || typeof value === "undefined") {
    throw new Error(message);
  }
}
function warning(cond, message) {
  if (!cond) {
    if (typeof console !== "undefined")
      console.warn(message);
    try {
      throw new Error(message);
    } catch (e) {
    }
  }
}
function createKey() {
  return Math.random().toString(36).substr(2, 8);
}
function getHistoryState(location, index) {
  return {
    usr: location.state,
    key: location.key,
    idx: index
  };
}
function createLocation(current, to, state, key) {
  if (state === void 0) {
    state = null;
  }
  let location = _extends$1({
    pathname: typeof current === "string" ? current : current.pathname,
    search: "",
    hash: ""
  }, typeof to === "string" ? parsePath(to) : to, {
    state,
    // TODO: This could be cleaned up.  push/replace should probably just take
    // full Locations now and avoid the need to run through this flow at all
    // But that's a pretty big refactor to the current test suite so going to
    // keep as is for the time being and just let any incoming keys take precedence
    key: to && to.key || key || createKey()
  });
  return location;
}
function createPath(_ref) {
  let {
    pathname = "/",
    search = "",
    hash = ""
  } = _ref;
  if (search && search !== "?")
    pathname += search.charAt(0) === "?" ? search : "?" + search;
  if (hash && hash !== "#")
    pathname += hash.charAt(0) === "#" ? hash : "#" + hash;
  return pathname;
}
function parsePath(path) {
  let parsedPath = {};
  if (path) {
    let hashIndex = path.indexOf("#");
    if (hashIndex >= 0) {
      parsedPath.hash = path.substr(hashIndex);
      path = path.substr(0, hashIndex);
    }
    let searchIndex = path.indexOf("?");
    if (searchIndex >= 0) {
      parsedPath.search = path.substr(searchIndex);
      path = path.substr(0, searchIndex);
    }
    if (path) {
      parsedPath.pathname = path;
    }
  }
  return parsedPath;
}
function getUrlBasedHistory(getLocation, createHref, validateLocation, options) {
  if (options === void 0) {
    options = {};
  }
  let {
    window: window2 = document.defaultView,
    v5Compat = false
  } = options;
  let globalHistory = window2.history;
  let action = Action.Pop;
  let listener = null;
  let index = getIndex();
  if (index == null) {
    index = 0;
    globalHistory.replaceState(_extends$1({}, globalHistory.state, {
      idx: index
    }), "");
  }
  function getIndex() {
    let state = globalHistory.state || {
      idx: null
    };
    return state.idx;
  }
  function handlePop() {
    action = Action.Pop;
    let nextIndex = getIndex();
    let delta = nextIndex == null ? null : nextIndex - index;
    index = nextIndex;
    if (listener) {
      listener({
        action,
        location: history.location,
        delta
      });
    }
  }
  function push(to, state) {
    action = Action.Push;
    let location = createLocation(history.location, to, state);
    if (validateLocation)
      validateLocation(location, to);
    index = getIndex() + 1;
    let historyState = getHistoryState(location, index);
    let url = history.createHref(location);
    try {
      globalHistory.pushState(historyState, "", url);
    } catch (error) {
      if (error instanceof DOMException && error.name === "DataCloneError") {
        throw error;
      }
      window2.location.assign(url);
    }
    if (v5Compat && listener) {
      listener({
        action,
        location: history.location,
        delta: 1
      });
    }
  }
  function replace(to, state) {
    action = Action.Replace;
    let location = createLocation(history.location, to, state);
    if (validateLocation)
      validateLocation(location, to);
    index = getIndex();
    let historyState = getHistoryState(location, index);
    let url = history.createHref(location);
    globalHistory.replaceState(historyState, "", url);
    if (v5Compat && listener) {
      listener({
        action,
        location: history.location,
        delta: 0
      });
    }
  }
  function createURL(to) {
    let base = window2.location.origin !== "null" ? window2.location.origin : window2.location.href;
    let href = typeof to === "string" ? to : createPath(to);
    href = href.replace(/ $/, "%20");
    invariant(base, "No window.location.(origin|href) available to create URL for href: " + href);
    return new URL(href, base);
  }
  let history = {
    get action() {
      return action;
    },
    get location() {
      return getLocation(window2, globalHistory);
    },
    listen(fn) {
      if (listener) {
        throw new Error("A history only accepts one active listener");
      }
      window2.addEventListener(PopStateEventType, handlePop);
      listener = fn;
      return () => {
        window2.removeEventListener(PopStateEventType, handlePop);
        listener = null;
      };
    },
    createHref(to) {
      return createHref(window2, to);
    },
    createURL,
    encodeLocation(to) {
      let url = createURL(to);
      return {
        pathname: url.pathname,
        search: url.search,
        hash: url.hash
      };
    },
    push,
    replace,
    go(n) {
      return globalHistory.go(n);
    }
  };
  return history;
}
var ResultType;
(function(ResultType2) {
  ResultType2["data"] = "data";
  ResultType2["deferred"] = "deferred";
  ResultType2["redirect"] = "redirect";
  ResultType2["error"] = "error";
})(ResultType || (ResultType = {}));
function matchRoutes(routes, locationArg, basename) {
  if (basename === void 0) {
    basename = "/";
  }
  return matchRoutesImpl(routes, locationArg, basename, false);
}
function matchRoutesImpl(routes, locationArg, basename, allowPartial) {
  let location = typeof locationArg === "string" ? parsePath(locationArg) : locationArg;
  let pathname = stripBasename(location.pathname || "/", basename);
  if (pathname == null) {
    return null;
  }
  let branches = flattenRoutes(routes);
  rankRouteBranches(branches);
  let matches = null;
  for (let i = 0; matches == null && i < branches.length; ++i) {
    let decoded = decodePath(pathname);
    matches = matchRouteBranch(branches[i], decoded, allowPartial);
  }
  return matches;
}
function flattenRoutes(routes, branches, parentsMeta, parentPath) {
  if (branches === void 0) {
    branches = [];
  }
  if (parentsMeta === void 0) {
    parentsMeta = [];
  }
  if (parentPath === void 0) {
    parentPath = "";
  }
  let flattenRoute = (route, index, relativePath) => {
    let meta = {
      relativePath: relativePath === void 0 ? route.path || "" : relativePath,
      caseSensitive: route.caseSensitive === true,
      childrenIndex: index,
      route
    };
    if (meta.relativePath.startsWith("/")) {
      invariant(meta.relativePath.startsWith(parentPath), 'Absolute route path "' + meta.relativePath + '" nested under path ' + ('"' + parentPath + '" is not valid. An absolute child route path ') + "must start with the combined path of all its parent routes.");
      meta.relativePath = meta.relativePath.slice(parentPath.length);
    }
    let path = joinPaths([parentPath, meta.relativePath]);
    let routesMeta = parentsMeta.concat(meta);
    if (route.children && route.children.length > 0) {
      invariant(
        // Our types know better, but runtime JS may not!
        // @ts-expect-error
        route.index !== true,
        "Index routes must not have child routes. Please remove " + ('all child routes from route path "' + path + '".')
      );
      flattenRoutes(route.children, branches, routesMeta, path);
    }
    if (route.path == null && !route.index) {
      return;
    }
    branches.push({
      path,
      score: computeScore(path, route.index),
      routesMeta
    });
  };
  routes.forEach((route, index) => {
    var _route$path;
    if (route.path === "" || !((_route$path = route.path) != null && _route$path.includes("?"))) {
      flattenRoute(route, index);
    } else {
      for (let exploded of explodeOptionalSegments(route.path)) {
        flattenRoute(route, index, exploded);
      }
    }
  });
  return branches;
}
function explodeOptionalSegments(path) {
  let segments = path.split("/");
  if (segments.length === 0)
    return [];
  let [first, ...rest] = segments;
  let isOptional = first.endsWith("?");
  let required = first.replace(/\?$/, "");
  if (rest.length === 0) {
    return isOptional ? [required, ""] : [required];
  }
  let restExploded = explodeOptionalSegments(rest.join("/"));
  let result = [];
  result.push(...restExploded.map((subpath) => subpath === "" ? required : [required, subpath].join("/")));
  if (isOptional) {
    result.push(...restExploded);
  }
  return result.map((exploded) => path.startsWith("/") && exploded === "" ? "/" : exploded);
}
function rankRouteBranches(branches) {
  branches.sort((a, b) => a.score !== b.score ? b.score - a.score : compareIndexes(a.routesMeta.map((meta) => meta.childrenIndex), b.routesMeta.map((meta) => meta.childrenIndex)));
}
const paramRe = /^:[\w-]+$/;
const dynamicSegmentValue = 3;
const indexRouteValue = 2;
const emptySegmentValue = 1;
const staticSegmentValue = 10;
const splatPenalty = -2;
const isSplat = (s) => s === "*";
function computeScore(path, index) {
  let segments = path.split("/");
  let initialScore = segments.length;
  if (segments.some(isSplat)) {
    initialScore += splatPenalty;
  }
  if (index) {
    initialScore += indexRouteValue;
  }
  return segments.filter((s) => !isSplat(s)).reduce((score, segment) => score + (paramRe.test(segment) ? dynamicSegmentValue : segment === "" ? emptySegmentValue : staticSegmentValue), initialScore);
}
function compareIndexes(a, b) {
  let siblings = a.length === b.length && a.slice(0, -1).every((n, i) => n === b[i]);
  return siblings ? (
    // If two routes are siblings, we should try to match the earlier sibling
    // first. This allows people to have fine-grained control over the matching
    // behavior by simply putting routes with identical paths in the order they
    // want them tried.
    a[a.length - 1] - b[b.length - 1]
  ) : (
    // Otherwise, it doesn't really make sense to rank non-siblings by index,
    // so they sort equally.
    0
  );
}
function matchRouteBranch(branch, pathname, allowPartial) {
  if (allowPartial === void 0) {
    allowPartial = false;
  }
  let {
    routesMeta
  } = branch;
  let matchedParams = {};
  let matchedPathname = "/";
  let matches = [];
  for (let i = 0; i < routesMeta.length; ++i) {
    let meta = routesMeta[i];
    let end = i === routesMeta.length - 1;
    let remainingPathname = matchedPathname === "/" ? pathname : pathname.slice(matchedPathname.length) || "/";
    let match = matchPath({
      path: meta.relativePath,
      caseSensitive: meta.caseSensitive,
      end
    }, remainingPathname);
    let route = meta.route;
    if (!match && end && allowPartial && !routesMeta[routesMeta.length - 1].route.index) {
      match = matchPath({
        path: meta.relativePath,
        caseSensitive: meta.caseSensitive,
        end: false
      }, remainingPathname);
    }
    if (!match) {
      return null;
    }
    Object.assign(matchedParams, match.params);
    matches.push({
      // TODO: Can this as be avoided?
      params: matchedParams,
      pathname: joinPaths([matchedPathname, match.pathname]),
      pathnameBase: normalizePathname(joinPaths([matchedPathname, match.pathnameBase])),
      route
    });
    if (match.pathnameBase !== "/") {
      matchedPathname = joinPaths([matchedPathname, match.pathnameBase]);
    }
  }
  return matches;
}
function matchPath(pattern, pathname) {
  if (typeof pattern === "string") {
    pattern = {
      path: pattern,
      caseSensitive: false,
      end: true
    };
  }
  let [matcher, compiledParams] = compilePath(pattern.path, pattern.caseSensitive, pattern.end);
  let match = pathname.match(matcher);
  if (!match)
    return null;
  let matchedPathname = match[0];
  let pathnameBase = matchedPathname.replace(/(.)\/+$/, "$1");
  let captureGroups = match.slice(1);
  let params = compiledParams.reduce((memo, _ref, index) => {
    let {
      paramName,
      isOptional
    } = _ref;
    if (paramName === "*") {
      let splatValue = captureGroups[index] || "";
      pathnameBase = matchedPathname.slice(0, matchedPathname.length - splatValue.length).replace(/(.)\/+$/, "$1");
    }
    const value = captureGroups[index];
    if (isOptional && !value) {
      memo[paramName] = void 0;
    } else {
      memo[paramName] = (value || "").replace(/%2F/g, "/");
    }
    return memo;
  }, {});
  return {
    params,
    pathname: matchedPathname,
    pathnameBase,
    pattern
  };
}
function compilePath(path, caseSensitive, end) {
  if (caseSensitive === void 0) {
    caseSensitive = false;
  }
  if (end === void 0) {
    end = true;
  }
  warning(path === "*" || !path.endsWith("*") || path.endsWith("/*"), 'Route path "' + path + '" will be treated as if it were ' + ('"' + path.replace(/\*$/, "/*") + '" because the `*` character must ') + "always follow a `/` in the pattern. To get rid of this warning, " + ('please change the route path to "' + path.replace(/\*$/, "/*") + '".'));
  let params = [];
  let regexpSource = "^" + path.replace(/\/*\*?$/, "").replace(/^\/*/, "/").replace(/[\\.*+^${}|()[\]]/g, "\\$&").replace(/\/:([\w-]+)(\?)?/g, (_, paramName, isOptional) => {
    params.push({
      paramName,
      isOptional: isOptional != null
    });
    return isOptional ? "/?([^\\/]+)?" : "/([^\\/]+)";
  });
  if (path.endsWith("*")) {
    params.push({
      paramName: "*"
    });
    regexpSource += path === "*" || path === "/*" ? "(.*)$" : "(?:\\/(.+)|\\/*)$";
  } else if (end) {
    regexpSource += "\\/*$";
  } else if (path !== "" && path !== "/") {
    regexpSource += "(?:(?=\\/|$))";
  } else
    ;
  let matcher = new RegExp(regexpSource, caseSensitive ? void 0 : "i");
  return [matcher, params];
}
function decodePath(value) {
  try {
    return value.split("/").map((v) => decodeURIComponent(v).replace(/\//g, "%2F")).join("/");
  } catch (error) {
    warning(false, 'The URL path "' + value + '" could not be decoded because it is is a malformed URL segment. This is probably due to a bad percent ' + ("encoding (" + error + ")."));
    return value;
  }
}
function stripBasename(pathname, basename) {
  if (basename === "/")
    return pathname;
  if (!pathname.toLowerCase().startsWith(basename.toLowerCase())) {
    return null;
  }
  let startIndex = basename.endsWith("/") ? basename.length - 1 : basename.length;
  let nextChar = pathname.charAt(startIndex);
  if (nextChar && nextChar !== "/") {
    return null;
  }
  return pathname.slice(startIndex) || "/";
}
const ABSOLUTE_URL_REGEX$1 = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;
const isAbsoluteUrl = (url) => ABSOLUTE_URL_REGEX$1.test(url);
function resolvePath(to, fromPathname) {
  if (fromPathname === void 0) {
    fromPathname = "/";
  }
  let {
    pathname: toPathname,
    search = "",
    hash = ""
  } = typeof to === "string" ? parsePath(to) : to;
  let pathname;
  if (toPathname) {
    if (isAbsoluteUrl(toPathname)) {
      pathname = toPathname;
    } else {
      if (toPathname.includes("//")) {
        let oldPathname = toPathname;
        toPathname = toPathname.replace(/\/\/+/g, "/");
        warning(false, "Pathnames cannot have embedded double slashes - normalizing " + (oldPathname + " -> " + toPathname));
      }
      if (toPathname.startsWith("/")) {
        pathname = resolvePathname(toPathname.substring(1), "/");
      } else {
        pathname = resolvePathname(toPathname, fromPathname);
      }
    }
  } else {
    pathname = fromPathname;
  }
  return {
    pathname,
    search: normalizeSearch(search),
    hash: normalizeHash(hash)
  };
}
function resolvePathname(relativePath, fromPathname) {
  let segments = fromPathname.replace(/\/+$/, "").split("/");
  let relativeSegments = relativePath.split("/");
  relativeSegments.forEach((segment) => {
    if (segment === "..") {
      if (segments.length > 1)
        segments.pop();
    } else if (segment !== ".") {
      segments.push(segment);
    }
  });
  return segments.length > 1 ? segments.join("/") : "/";
}
function getInvalidPathError(char, field, dest, path) {
  return "Cannot include a '" + char + "' character in a manually specified " + ("`to." + field + "` field [" + JSON.stringify(path) + "].  Please separate it out to the ") + ("`to." + dest + "` field. Alternatively you may provide the full path as ") + 'a string in <Link to="..."> and the router will parse it for you.';
}
function getPathContributingMatches(matches) {
  return matches.filter((match, index) => index === 0 || match.route.path && match.route.path.length > 0);
}
function getResolveToMatches(matches, v7_relativeSplatPath) {
  let pathMatches = getPathContributingMatches(matches);
  if (v7_relativeSplatPath) {
    return pathMatches.map((match, idx) => idx === pathMatches.length - 1 ? match.pathname : match.pathnameBase);
  }
  return pathMatches.map((match) => match.pathnameBase);
}
function resolveTo(toArg, routePathnames, locationPathname, isPathRelative) {
  if (isPathRelative === void 0) {
    isPathRelative = false;
  }
  let to;
  if (typeof toArg === "string") {
    to = parsePath(toArg);
  } else {
    to = _extends$1({}, toArg);
    invariant(!to.pathname || !to.pathname.includes("?"), getInvalidPathError("?", "pathname", "search", to));
    invariant(!to.pathname || !to.pathname.includes("#"), getInvalidPathError("#", "pathname", "hash", to));
    invariant(!to.search || !to.search.includes("#"), getInvalidPathError("#", "search", "hash", to));
  }
  let isEmptyPath = toArg === "" || to.pathname === "";
  let toPathname = isEmptyPath ? "/" : to.pathname;
  let from;
  if (toPathname == null) {
    from = locationPathname;
  } else {
    let routePathnameIndex = routePathnames.length - 1;
    if (!isPathRelative && toPathname.startsWith("..")) {
      let toSegments = toPathname.split("/");
      while (toSegments[0] === "..") {
        toSegments.shift();
        routePathnameIndex -= 1;
      }
      to.pathname = toSegments.join("/");
    }
    from = routePathnameIndex >= 0 ? routePathnames[routePathnameIndex] : "/";
  }
  let path = resolvePath(to, from);
  let hasExplicitTrailingSlash = toPathname && toPathname !== "/" && toPathname.endsWith("/");
  let hasCurrentTrailingSlash = (isEmptyPath || toPathname === ".") && locationPathname.endsWith("/");
  if (!path.pathname.endsWith("/") && (hasExplicitTrailingSlash || hasCurrentTrailingSlash)) {
    path.pathname += "/";
  }
  return path;
}
const joinPaths = (paths) => paths.join("/").replace(/\/\/+/g, "/");
const normalizePathname = (pathname) => pathname.replace(/\/+$/, "").replace(/^\/*/, "/");
const normalizeSearch = (search) => !search || search === "?" ? "" : search.startsWith("?") ? search : "?" + search;
const normalizeHash = (hash) => !hash || hash === "#" ? "" : hash.startsWith("#") ? hash : "#" + hash;
function isRouteErrorResponse(error) {
  return error != null && typeof error.status === "number" && typeof error.statusText === "string" && typeof error.internal === "boolean" && "data" in error;
}
const validMutationMethodsArr = ["post", "put", "patch", "delete"];
new Set(validMutationMethodsArr);
const validRequestMethodsArr = ["get", ...validMutationMethodsArr];
new Set(validRequestMethodsArr);
/**
 * React Router v6.30.3
 *
 * Copyright (c) Remix Software Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.md file in the root directory of this source tree.
 *
 * @license MIT
 */
function _extends() {
  _extends = Object.assign ? Object.assign.bind() : function(target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];
      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }
    return target;
  };
  return _extends.apply(this, arguments);
}
const DataRouterContext = /* @__PURE__ */ reactExports.createContext(null);
const DataRouterStateContext = /* @__PURE__ */ reactExports.createContext(null);
const NavigationContext = /* @__PURE__ */ reactExports.createContext(null);
const LocationContext = /* @__PURE__ */ reactExports.createContext(null);
const RouteContext = /* @__PURE__ */ reactExports.createContext({
  outlet: null,
  matches: [],
  isDataRoute: false
});
const RouteErrorContext = /* @__PURE__ */ reactExports.createContext(null);
function useInRouterContext() {
  return reactExports.useContext(LocationContext) != null;
}
function useLocation() {
  !useInRouterContext() ? invariant(false) : void 0;
  return reactExports.useContext(LocationContext).location;
}
function useIsomorphicLayoutEffect(cb) {
  let isStatic = reactExports.useContext(NavigationContext).static;
  if (!isStatic) {
    reactExports.useLayoutEffect(cb);
  }
}
function useNavigate() {
  let {
    isDataRoute
  } = reactExports.useContext(RouteContext);
  return isDataRoute ? useNavigateStable() : useNavigateUnstable();
}
function useNavigateUnstable() {
  !useInRouterContext() ? invariant(false) : void 0;
  let dataRouterContext = reactExports.useContext(DataRouterContext);
  let {
    basename,
    future,
    navigator: navigator2
  } = reactExports.useContext(NavigationContext);
  let {
    matches
  } = reactExports.useContext(RouteContext);
  let {
    pathname: locationPathname
  } = useLocation();
  let routePathnamesJson = JSON.stringify(getResolveToMatches(matches, future.v7_relativeSplatPath));
  let activeRef = reactExports.useRef(false);
  useIsomorphicLayoutEffect(() => {
    activeRef.current = true;
  });
  let navigate = reactExports.useCallback(function(to, options) {
    if (options === void 0) {
      options = {};
    }
    if (!activeRef.current)
      return;
    if (typeof to === "number") {
      navigator2.go(to);
      return;
    }
    let path = resolveTo(to, JSON.parse(routePathnamesJson), locationPathname, options.relative === "path");
    if (dataRouterContext == null && basename !== "/") {
      path.pathname = path.pathname === "/" ? basename : joinPaths([basename, path.pathname]);
    }
    (!!options.replace ? navigator2.replace : navigator2.push)(path, options.state, options);
  }, [basename, navigator2, routePathnamesJson, locationPathname, dataRouterContext]);
  return navigate;
}
function useRoutes(routes, locationArg) {
  return useRoutesImpl(routes, locationArg);
}
function useRoutesImpl(routes, locationArg, dataRouterState, future) {
  !useInRouterContext() ? invariant(false) : void 0;
  let {
    navigator: navigator2
  } = reactExports.useContext(NavigationContext);
  let {
    matches: parentMatches
  } = reactExports.useContext(RouteContext);
  let routeMatch = parentMatches[parentMatches.length - 1];
  let parentParams = routeMatch ? routeMatch.params : {};
  routeMatch ? routeMatch.pathname : "/";
  let parentPathnameBase = routeMatch ? routeMatch.pathnameBase : "/";
  routeMatch && routeMatch.route;
  let locationFromContext = useLocation();
  let location;
  if (locationArg) {
    var _parsedLocationArg$pa;
    let parsedLocationArg = typeof locationArg === "string" ? parsePath(locationArg) : locationArg;
    !(parentPathnameBase === "/" || ((_parsedLocationArg$pa = parsedLocationArg.pathname) == null ? void 0 : _parsedLocationArg$pa.startsWith(parentPathnameBase))) ? invariant(false) : void 0;
    location = parsedLocationArg;
  } else {
    location = locationFromContext;
  }
  let pathname = location.pathname || "/";
  let remainingPathname = pathname;
  if (parentPathnameBase !== "/") {
    let parentSegments = parentPathnameBase.replace(/^\//, "").split("/");
    let segments = pathname.replace(/^\//, "").split("/");
    remainingPathname = "/" + segments.slice(parentSegments.length).join("/");
  }
  let matches = matchRoutes(routes, {
    pathname: remainingPathname
  });
  let renderedMatches = _renderMatches(matches && matches.map((match) => Object.assign({}, match, {
    params: Object.assign({}, parentParams, match.params),
    pathname: joinPaths([
      parentPathnameBase,
      // Re-encode pathnames that were decoded inside matchRoutes
      navigator2.encodeLocation ? navigator2.encodeLocation(match.pathname).pathname : match.pathname
    ]),
    pathnameBase: match.pathnameBase === "/" ? parentPathnameBase : joinPaths([
      parentPathnameBase,
      // Re-encode pathnames that were decoded inside matchRoutes
      navigator2.encodeLocation ? navigator2.encodeLocation(match.pathnameBase).pathname : match.pathnameBase
    ])
  })), parentMatches, dataRouterState, future);
  if (locationArg && renderedMatches) {
    return /* @__PURE__ */ reactExports.createElement(LocationContext.Provider, {
      value: {
        location: _extends({
          pathname: "/",
          search: "",
          hash: "",
          state: null,
          key: "default"
        }, location),
        navigationType: Action.Pop
      }
    }, renderedMatches);
  }
  return renderedMatches;
}
function DefaultErrorComponent() {
  let error = useRouteError();
  let message = isRouteErrorResponse(error) ? error.status + " " + error.statusText : error instanceof Error ? error.message : JSON.stringify(error);
  let stack = error instanceof Error ? error.stack : null;
  let lightgrey = "rgba(200,200,200, 0.5)";
  let preStyles = {
    padding: "0.5rem",
    backgroundColor: lightgrey
  };
  let devInfo = null;
  return /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("h2", null, "Unexpected Application Error!"), /* @__PURE__ */ reactExports.createElement("h3", {
    style: {
      fontStyle: "italic"
    }
  }, message), stack ? /* @__PURE__ */ reactExports.createElement("pre", {
    style: preStyles
  }, stack) : null, devInfo);
}
const defaultErrorElement = /* @__PURE__ */ reactExports.createElement(DefaultErrorComponent, null);
class RenderErrorBoundary extends reactExports.Component {
  constructor(props) {
    super(props);
    this.state = {
      location: props.location,
      revalidation: props.revalidation,
      error: props.error
    };
  }
  static getDerivedStateFromError(error) {
    return {
      error
    };
  }
  static getDerivedStateFromProps(props, state) {
    if (state.location !== props.location || state.revalidation !== "idle" && props.revalidation === "idle") {
      return {
        error: props.error,
        location: props.location,
        revalidation: props.revalidation
      };
    }
    return {
      error: props.error !== void 0 ? props.error : state.error,
      location: state.location,
      revalidation: props.revalidation || state.revalidation
    };
  }
  componentDidCatch(error, errorInfo) {
    console.error("React Router caught the following error during render", error, errorInfo);
  }
  render() {
    return this.state.error !== void 0 ? /* @__PURE__ */ reactExports.createElement(RouteContext.Provider, {
      value: this.props.routeContext
    }, /* @__PURE__ */ reactExports.createElement(RouteErrorContext.Provider, {
      value: this.state.error,
      children: this.props.component
    })) : this.props.children;
  }
}
function RenderedRoute(_ref) {
  let {
    routeContext,
    match,
    children
  } = _ref;
  let dataRouterContext = reactExports.useContext(DataRouterContext);
  if (dataRouterContext && dataRouterContext.static && dataRouterContext.staticContext && (match.route.errorElement || match.route.ErrorBoundary)) {
    dataRouterContext.staticContext._deepestRenderedBoundaryId = match.route.id;
  }
  return /* @__PURE__ */ reactExports.createElement(RouteContext.Provider, {
    value: routeContext
  }, children);
}
function _renderMatches(matches, parentMatches, dataRouterState, future) {
  var _dataRouterState;
  if (parentMatches === void 0) {
    parentMatches = [];
  }
  if (dataRouterState === void 0) {
    dataRouterState = null;
  }
  if (future === void 0) {
    future = null;
  }
  if (matches == null) {
    var _future;
    if (!dataRouterState) {
      return null;
    }
    if (dataRouterState.errors) {
      matches = dataRouterState.matches;
    } else if ((_future = future) != null && _future.v7_partialHydration && parentMatches.length === 0 && !dataRouterState.initialized && dataRouterState.matches.length > 0) {
      matches = dataRouterState.matches;
    } else {
      return null;
    }
  }
  let renderedMatches = matches;
  let errors = (_dataRouterState = dataRouterState) == null ? void 0 : _dataRouterState.errors;
  if (errors != null) {
    let errorIndex = renderedMatches.findIndex((m) => m.route.id && (errors == null ? void 0 : errors[m.route.id]) !== void 0);
    !(errorIndex >= 0) ? invariant(false) : void 0;
    renderedMatches = renderedMatches.slice(0, Math.min(renderedMatches.length, errorIndex + 1));
  }
  let renderFallback = false;
  let fallbackIndex = -1;
  if (dataRouterState && future && future.v7_partialHydration) {
    for (let i = 0; i < renderedMatches.length; i++) {
      let match = renderedMatches[i];
      if (match.route.HydrateFallback || match.route.hydrateFallbackElement) {
        fallbackIndex = i;
      }
      if (match.route.id) {
        let {
          loaderData,
          errors: errors2
        } = dataRouterState;
        let needsToRunLoader = match.route.loader && loaderData[match.route.id] === void 0 && (!errors2 || errors2[match.route.id] === void 0);
        if (match.route.lazy || needsToRunLoader) {
          renderFallback = true;
          if (fallbackIndex >= 0) {
            renderedMatches = renderedMatches.slice(0, fallbackIndex + 1);
          } else {
            renderedMatches = [renderedMatches[0]];
          }
          break;
        }
      }
    }
  }
  return renderedMatches.reduceRight((outlet, match, index) => {
    let error;
    let shouldRenderHydrateFallback = false;
    let errorElement = null;
    let hydrateFallbackElement = null;
    if (dataRouterState) {
      error = errors && match.route.id ? errors[match.route.id] : void 0;
      errorElement = match.route.errorElement || defaultErrorElement;
      if (renderFallback) {
        if (fallbackIndex < 0 && index === 0) {
          warningOnce("route-fallback", false);
          shouldRenderHydrateFallback = true;
          hydrateFallbackElement = null;
        } else if (fallbackIndex === index) {
          shouldRenderHydrateFallback = true;
          hydrateFallbackElement = match.route.hydrateFallbackElement || null;
        }
      }
    }
    let matches2 = parentMatches.concat(renderedMatches.slice(0, index + 1));
    let getChildren = () => {
      let children;
      if (error) {
        children = errorElement;
      } else if (shouldRenderHydrateFallback) {
        children = hydrateFallbackElement;
      } else if (match.route.Component) {
        children = /* @__PURE__ */ reactExports.createElement(match.route.Component, null);
      } else if (match.route.element) {
        children = match.route.element;
      } else {
        children = outlet;
      }
      return /* @__PURE__ */ reactExports.createElement(RenderedRoute, {
        match,
        routeContext: {
          outlet,
          matches: matches2,
          isDataRoute: dataRouterState != null
        },
        children
      });
    };
    return dataRouterState && (match.route.ErrorBoundary || match.route.errorElement || index === 0) ? /* @__PURE__ */ reactExports.createElement(RenderErrorBoundary, {
      location: dataRouterState.location,
      revalidation: dataRouterState.revalidation,
      component: errorElement,
      error,
      children: getChildren(),
      routeContext: {
        outlet: null,
        matches: matches2,
        isDataRoute: true
      }
    }) : getChildren();
  }, null);
}
var DataRouterHook$1 = /* @__PURE__ */ function(DataRouterHook2) {
  DataRouterHook2["UseBlocker"] = "useBlocker";
  DataRouterHook2["UseRevalidator"] = "useRevalidator";
  DataRouterHook2["UseNavigateStable"] = "useNavigate";
  return DataRouterHook2;
}(DataRouterHook$1 || {});
var DataRouterStateHook$1 = /* @__PURE__ */ function(DataRouterStateHook2) {
  DataRouterStateHook2["UseBlocker"] = "useBlocker";
  DataRouterStateHook2["UseLoaderData"] = "useLoaderData";
  DataRouterStateHook2["UseActionData"] = "useActionData";
  DataRouterStateHook2["UseRouteError"] = "useRouteError";
  DataRouterStateHook2["UseNavigation"] = "useNavigation";
  DataRouterStateHook2["UseRouteLoaderData"] = "useRouteLoaderData";
  DataRouterStateHook2["UseMatches"] = "useMatches";
  DataRouterStateHook2["UseRevalidator"] = "useRevalidator";
  DataRouterStateHook2["UseNavigateStable"] = "useNavigate";
  DataRouterStateHook2["UseRouteId"] = "useRouteId";
  return DataRouterStateHook2;
}(DataRouterStateHook$1 || {});
function useDataRouterContext(hookName) {
  let ctx = reactExports.useContext(DataRouterContext);
  !ctx ? invariant(false) : void 0;
  return ctx;
}
function useDataRouterState(hookName) {
  let state = reactExports.useContext(DataRouterStateContext);
  !state ? invariant(false) : void 0;
  return state;
}
function useRouteContext(hookName) {
  let route = reactExports.useContext(RouteContext);
  !route ? invariant(false) : void 0;
  return route;
}
function useCurrentRouteId(hookName) {
  let route = useRouteContext();
  let thisRoute = route.matches[route.matches.length - 1];
  !thisRoute.route.id ? invariant(false) : void 0;
  return thisRoute.route.id;
}
function useRouteError() {
  var _state$errors;
  let error = reactExports.useContext(RouteErrorContext);
  let state = useDataRouterState(DataRouterStateHook$1.UseRouteError);
  let routeId = useCurrentRouteId(DataRouterStateHook$1.UseRouteError);
  if (error !== void 0) {
    return error;
  }
  return (_state$errors = state.errors) == null ? void 0 : _state$errors[routeId];
}
function useNavigateStable() {
  let {
    router
  } = useDataRouterContext(DataRouterHook$1.UseNavigateStable);
  let id = useCurrentRouteId(DataRouterStateHook$1.UseNavigateStable);
  let activeRef = reactExports.useRef(false);
  useIsomorphicLayoutEffect(() => {
    activeRef.current = true;
  });
  let navigate = reactExports.useCallback(function(to, options) {
    if (options === void 0) {
      options = {};
    }
    if (!activeRef.current)
      return;
    if (typeof to === "number") {
      router.navigate(to);
    } else {
      router.navigate(to, _extends({
        fromRouteId: id
      }, options));
    }
  }, [router, id]);
  return navigate;
}
const alreadyWarned$1 = {};
function warningOnce(key, cond, message) {
  if (!cond && !alreadyWarned$1[key]) {
    alreadyWarned$1[key] = true;
  }
}
function logV6DeprecationWarnings(renderFuture, routerFuture) {
  if ((renderFuture == null ? void 0 : renderFuture.v7_startTransition) === void 0)
    ;
  if ((renderFuture == null ? void 0 : renderFuture.v7_relativeSplatPath) === void 0 && (!routerFuture || routerFuture.v7_relativeSplatPath === void 0))
    ;
  if (routerFuture) {
    if (routerFuture.v7_fetcherPersist === void 0)
      ;
    if (routerFuture.v7_normalizeFormMethod === void 0)
      ;
    if (routerFuture.v7_partialHydration === void 0)
      ;
    if (routerFuture.v7_skipActionErrorRevalidation === void 0)
      ;
  }
}
function Route(_props) {
  invariant(false);
}
function Router(_ref5) {
  let {
    basename: basenameProp = "/",
    children = null,
    location: locationProp,
    navigationType = Action.Pop,
    navigator: navigator2,
    static: staticProp = false,
    future
  } = _ref5;
  !!useInRouterContext() ? invariant(false) : void 0;
  let basename = basenameProp.replace(/^\/*/, "/");
  let navigationContext = reactExports.useMemo(() => ({
    basename,
    navigator: navigator2,
    static: staticProp,
    future: _extends({
      v7_relativeSplatPath: false
    }, future)
  }), [basename, future, navigator2, staticProp]);
  if (typeof locationProp === "string") {
    locationProp = parsePath(locationProp);
  }
  let {
    pathname = "/",
    search = "",
    hash = "",
    state = null,
    key = "default"
  } = locationProp;
  let locationContext = reactExports.useMemo(() => {
    let trailingPathname = stripBasename(pathname, basename);
    if (trailingPathname == null) {
      return null;
    }
    return {
      location: {
        pathname: trailingPathname,
        search,
        hash,
        state,
        key
      },
      navigationType
    };
  }, [basename, pathname, search, hash, state, key, navigationType]);
  if (locationContext == null) {
    return null;
  }
  return /* @__PURE__ */ reactExports.createElement(NavigationContext.Provider, {
    value: navigationContext
  }, /* @__PURE__ */ reactExports.createElement(LocationContext.Provider, {
    children,
    value: locationContext
  }));
}
function Routes(_ref6) {
  let {
    children,
    location
  } = _ref6;
  return useRoutes(createRoutesFromChildren(children), location);
}
new Promise(() => {
});
function createRoutesFromChildren(children, parentPath) {
  if (parentPath === void 0) {
    parentPath = [];
  }
  let routes = [];
  reactExports.Children.forEach(children, (element, index) => {
    if (!/* @__PURE__ */ reactExports.isValidElement(element)) {
      return;
    }
    let treePath = [...parentPath, index];
    if (element.type === reactExports.Fragment) {
      routes.push.apply(routes, createRoutesFromChildren(element.props.children, treePath));
      return;
    }
    !(element.type === Route) ? invariant(false) : void 0;
    !(!element.props.index || !element.props.children) ? invariant(false) : void 0;
    let route = {
      id: element.props.id || treePath.join("-"),
      caseSensitive: element.props.caseSensitive,
      element: element.props.element,
      Component: element.props.Component,
      index: element.props.index,
      path: element.props.path,
      loader: element.props.loader,
      action: element.props.action,
      errorElement: element.props.errorElement,
      ErrorBoundary: element.props.ErrorBoundary,
      hasErrorBoundary: element.props.ErrorBoundary != null || element.props.errorElement != null,
      shouldRevalidate: element.props.shouldRevalidate,
      handle: element.props.handle,
      lazy: element.props.lazy
    };
    if (element.props.children) {
      route.children = createRoutesFromChildren(element.props.children, treePath);
    }
    routes.push(route);
  });
  return routes;
}
/**
 * React Router DOM v6.30.3
 *
 * Copyright (c) Remix Software Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.md file in the root directory of this source tree.
 *
 * @license MIT
 */
const REACT_ROUTER_VERSION = "6";
try {
  window.__reactRouterVersion = REACT_ROUTER_VERSION;
} catch (e) {
}
const START_TRANSITION = "startTransition";
const startTransitionImpl = React$1[START_TRANSITION];
function BrowserRouter(_ref4) {
  let {
    basename,
    children,
    future,
    window: window2
  } = _ref4;
  let historyRef = reactExports.useRef();
  if (historyRef.current == null) {
    historyRef.current = createBrowserHistory({
      window: window2,
      v5Compat: true
    });
  }
  let history = historyRef.current;
  let [state, setStateImpl] = reactExports.useState({
    action: history.action,
    location: history.location
  });
  let {
    v7_startTransition
  } = future || {};
  let setState = reactExports.useCallback((newState) => {
    v7_startTransition && startTransitionImpl ? startTransitionImpl(() => setStateImpl(newState)) : setStateImpl(newState);
  }, [setStateImpl, v7_startTransition]);
  reactExports.useLayoutEffect(() => history.listen(setState), [history, setState]);
  reactExports.useEffect(() => logV6DeprecationWarnings(future), [future]);
  return /* @__PURE__ */ reactExports.createElement(Router, {
    basename,
    children,
    location: state.location,
    navigationType: state.action,
    navigator: history,
    future
  });
}
var DataRouterHook;
(function(DataRouterHook2) {
  DataRouterHook2["UseScrollRestoration"] = "useScrollRestoration";
  DataRouterHook2["UseSubmit"] = "useSubmit";
  DataRouterHook2["UseSubmitFetcher"] = "useSubmitFetcher";
  DataRouterHook2["UseFetcher"] = "useFetcher";
  DataRouterHook2["useViewTransitionState"] = "useViewTransitionState";
})(DataRouterHook || (DataRouterHook = {}));
var DataRouterStateHook;
(function(DataRouterStateHook2) {
  DataRouterStateHook2["UseFetcher"] = "useFetcher";
  DataRouterStateHook2["UseFetchers"] = "useFetchers";
  DataRouterStateHook2["UseScrollRestoration"] = "useScrollRestoration";
})(DataRouterStateHook || (DataRouterStateHook = {}));
const STORAGE_KEY = "ruanlinyun_api_vault_3";
const PROVIDER_META_KEY = "ruanlinyun_api_provider_meta_v1";
const DATA_VERSION = 3;
const BUILTIN_PROVIDERS = [
  { id: "custom", name: "外部API（OpenAI兼容）", baseUrl: "https://your-api.com/v1", model: "your-model-name" },
  { id: "deepseek", name: "DeepSeek（云端）", baseUrl: "https://api.deepseek.com", model: "deepseek-v4-pro" }
];
function isLocalNoKeyProvider(cfg) {
  if (cfg.id === "glm_local" || cfg.id === "qwen_local")
    return true;
  return /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?(\/|$)/i.test(cfg.baseUrl);
}
function fingerprint() {
  return [
    navigator.userAgent,
    screen.colorDepth,
    screen.width,
    screen.height,
    navigator.language,
    navigator.hardwareConcurrency ?? "",
    "rly-v4"
  ].join("|");
}
const ALGO = { name: "AES-GCM", length: 256 };
const KEY_USAGE = ["encrypt", "decrypt"];
const PBKDF2_ITERS_NEW = 6e5;
const PBKDF2_ITERS_OLD = 1e5;
const OLD_SALT = "ruanlinyun-v2";
const _ApiConfigService = class _ApiConfigService {
  constructor() {
    __publicField(this, "configs", /* @__PURE__ */ new Map());
    __publicField(this, "decryptedKeys", /* @__PURE__ */ new Map());
    __publicField(this, "customProviders", []);
    __publicField(this, "loadPromise");
    // [修复] 解密失败的 provider ID 集合（供 UI 检查）
    __publicField(this, "decryptFailed", /* @__PURE__ */ new Set());
    this.loadPromise = this.load();
    this.loadPromise.catch(() => {
    });
  }
  static getInstance() {
    if (!_ApiConfigService.instance)
      _ApiConfigService.instance = new _ApiConfigService();
    return _ApiConfigService.instance;
  }
  /** 等待加载完成 */
  async waitReady() {
    await this.loadPromise;
  }
  /** 生成随机 salt（16字节，base64编码） */
  generateSalt() {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    return btoa(String.fromCharCode(...salt));
  }
  /** 派生密钥（接受 salt 和迭代次数参数，支持新旧格式） */
  async getKey(saltBase64, iterations = PBKDF2_ITERS_NEW) {
    const saltBytes = Uint8Array.from(atob(saltBase64), (c) => c.charCodeAt(0));
    const material = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(fingerprint()),
      "PBKDF2",
      false,
      ["deriveKey"]
    );
    return crypto.subtle.deriveKey(
      { name: "PBKDF2", salt: saltBytes, iterations, hash: "SHA-256" },
      material,
      ALGO,
      false,
      KEY_USAGE
    );
  }
  /** 加密（使用每条记录独立的 salt） */
  async encrypt(plain, saltBase64) {
    const key = await this.getKey(saltBase64);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plain));
    const combined = new Uint8Array(12 + new Uint8Array(ct).length);
    combined.set(iv);
    combined.set(new Uint8Array(ct), 12);
    return btoa(String.fromCharCode(...combined));
  }
  /** 解密（自动尝试新格式和旧格式） */
  async decrypt(encoded, saltBase64) {
    if (!saltBase64) {
      return await this.decryptWithParams(encoded, OLD_SALT, PBKDF2_ITERS_OLD);
    }
    return await this.decryptWithParams(encoded, saltBase64, PBKDF2_ITERS_NEW);
  }
  async decryptWithParams(encoded, saltBase64, iterations) {
    try {
      const key = await this.getKey(saltBase64, iterations);
      const data = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
      const dec = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: data.slice(0, 12) },
        key,
        data.slice(12)
      );
      return new TextDecoder().decode(dec);
    } catch {
      return "";
    }
  }
  async load() {
    await this.loadVersion3();
    if (this.configs.size === 0) {
      await this.migrateFromV2();
    }
    try {
      const raw = localStorage.getItem(PROVIDER_META_KEY);
      if (!raw)
        return;
      const list = JSON.parse(raw);
      if (Array.isArray(list))
        this.customProviders = list.filter((p) => !!(p == null ? void 0 : p.id) && !!(p == null ? void 0 : p.name) && !!(p == null ? void 0 : p.baseUrl));
    } catch {
      this.customProviders = [];
    }
  }
  async loadVersion3() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw)
        return;
      const data = JSON.parse(raw);
      for (const [id, cfg] of Object.entries(data)) {
        this.configs.set(id, cfg);
        if (cfg.encryptedKey) {
          const key = await this.decrypt(cfg.encryptedKey, cfg.salt);
          if (key) {
            this.decryptedKeys.set(id, key);
          } else {
            this.decryptFailed.add(id);
            console.warn(`[ApiConfig] Provider ${id} 解密失败，需重新输入 apiKey`);
          }
        }
      }
    } catch {
      this.configs.clear();
    }
  }
  /** 从 v2 格式迁移到 v3 */
  async migrateFromV2() {
    try {
      const raw = localStorage.getItem("ruanlinyun_api_vault_2");
      if (!raw)
        return;
      console.log("[ApiConfig] 检测到旧格式数据，开始迁移到 v3...");
      const data = JSON.parse(raw);
      for (const [id, cfg] of Object.entries(data)) {
        if (!cfg.encryptedKey)
          continue;
        const oldKey = await this.decryptWithParams(cfg.encryptedKey, OLD_SALT, PBKDF2_ITERS_OLD);
        if (oldKey) {
          const newSalt = this.generateSalt();
          const newEncrypted = await this.encrypt(oldKey, newSalt);
          this.configs.set(id, {
            baseUrl: cfg.baseUrl || "",
            model: cfg.model || "",
            salt: newSalt,
            encryptedKey: newEncrypted,
            encryptedMeta: "",
            enabled: cfg.enabled ?? false,
            version: DATA_VERSION
          });
          this.decryptedKeys.set(id, oldKey);
          console.log(`[ApiConfig] Provider ${id} 迁移成功`);
        } else {
          this.decryptFailed.add(id);
          console.warn(`[ApiConfig] Provider ${id} 迁移失败，需重新输入 apiKey`);
        }
      }
      this.persist();
      localStorage.removeItem("ruanlinyun_api_vault_2");
      console.log("[ApiConfig] 迁移完成，旧数据已清除");
    } catch (err) {
      console.warn("[ApiConfig] 迁移旧数据失败:", err);
    }
  }
  persist() {
    const obj = {};
    for (const [id, cfg] of this.configs)
      obj[id] = cfg;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  }
  persistProviders() {
    localStorage.setItem(PROVIDER_META_KEY, JSON.stringify(this.customProviders));
  }
  /* ========== 公开API ========== */
  getProviderMetas() {
    const ids = /* @__PURE__ */ new Set();
    const list = [];
    for (const p of BUILTIN_PROVIDERS) {
      if (!ids.has(p.id)) {
        ids.add(p.id);
        list.push(p);
      }
    }
    for (const p of this.customProviders) {
      if (!ids.has(p.id)) {
        ids.add(p.id);
        list.push(p);
      }
    }
    return list;
  }
  /**
   * 获取所有 provider 配置（含明文 apiKey）
   * ⚠️ 安全警告：返回值含明文 apiKey，仅供 LLM 调用使用，禁止直接序列化导出
   */
  getAll() {
    return this.getProviderMetas().map((p) => {
      const s = this.configs.get(p.id);
      return {
        ...p,
        baseUrl: (s == null ? void 0 : s.baseUrl) || p.baseUrl,
        model: (s == null ? void 0 : s.model) || p.model,
        apiKey: this.decryptedKeys.get(p.id) ?? "",
        enabled: (s == null ? void 0 : s.enabled) ?? false
      };
    });
  }
  /**
   * [新增] 获取脱敏的 provider 配置（apiKey 显示为 ****1234 形式）
   * 供 UI 显示使用，不暴露明文密钥
   */
  getMaskedAll() {
    return this.getProviderMetas().map((p) => {
      const s = this.configs.get(p.id);
      const apiKey = this.decryptedKeys.get(p.id) ?? "";
      const masked = apiKey ? `****${apiKey.slice(-4)}` : "";
      return {
        ...p,
        baseUrl: (s == null ? void 0 : s.baseUrl) || p.baseUrl,
        model: (s == null ? void 0 : s.model) || p.model,
        apiKeyMasked: masked,
        decryptFailed: this.decryptFailed.has(p.id),
        enabled: (s == null ? void 0 : s.enabled) ?? false
      };
    });
  }
  /** [新增] 检查某个 provider 是否解密失败（需重新输入 apiKey） */
  isDecryptFailed(id) {
    return this.decryptFailed.has(id);
  }
  /** [新增] 清除内存中的明文密钥（会话级安全清理） */
  clearDecryptedKeys() {
    this.decryptedKeys.clear();
  }
  async addLocalProvider() {
    const id = `local_${Date.now().toString(36)}`;
    const meta = {
      id,
      name: "本地部署（OpenAI兼容）",
      baseUrl: "http://127.0.0.1:8000/v1",
      model: "your-model-name"
    };
    this.customProviders.push(meta);
    this.persistProviders();
    return id;
  }
  /**
   * 删除自定义 provider（仅允许删除 custom provider，禁止删除内置 provider）
   * 同步清理：configs、decryptedKeys、decryptFailed、customProviders、active provider 标记
   * @returns 删除成功返回 true；provider 不存在或是内置 provider 返回 false
   */
  async removeProvider(id) {
    const isBuiltin = BUILTIN_PROVIDERS.some((p) => p.id === id);
    if (isBuiltin)
      return false;
    const idx = this.customProviders.findIndex((p) => p.id === id);
    if (idx === -1)
      return false;
    this.customProviders.splice(idx, 1);
    this.persistProviders();
    this.configs.delete(id);
    this.decryptedKeys.delete(id);
    this.decryptFailed.delete(id);
    const activeId = this.getActiveProviderId();
    if (activeId === id) {
      localStorage.removeItem("ruanlinyun_active_provider");
      const fallback = this.getAll().find((c) => c.enabled);
      if (fallback)
        this.setActiveProvider(fallback.id);
    }
    this.persist();
    return true;
  }
  async update(id, partial) {
    const existing = this.configs.get(id);
    const salt = (existing == null ? void 0 : existing.salt) || this.generateSalt();
    if (partial.enabled === false) {
      this.configs.set(id, {
        baseUrl: partial.baseUrl ?? (existing == null ? void 0 : existing.baseUrl) ?? this.preset(id).baseUrl,
        model: partial.model ?? (existing == null ? void 0 : existing.model) ?? this.preset(id).model,
        salt,
        encryptedKey: (existing == null ? void 0 : existing.encryptedKey) ?? "",
        encryptedMeta: (existing == null ? void 0 : existing.encryptedMeta) ?? "",
        enabled: false,
        version: DATA_VERSION
      });
      if (partial.baseUrl || partial.model)
        this._updateMeta(id, partial.baseUrl, partial.model);
      this.persist();
      return;
    }
    if ("apiKey" in partial) {
      const nextKey = partial.apiKey ?? "";
      if (nextKey) {
        this.decryptedKeys.set(id, nextKey);
        this.decryptFailed.delete(id);
      } else {
        this.decryptedKeys.delete(id);
      }
      const ek = nextKey ? await this.encrypt(nextKey, salt) : "";
      this.configs.set(id, {
        baseUrl: partial.baseUrl ?? (existing == null ? void 0 : existing.baseUrl) ?? this.preset(id).baseUrl,
        model: partial.model ?? (existing == null ? void 0 : existing.model) ?? this.preset(id).model,
        salt,
        encryptedKey: ek,
        encryptedMeta: (existing == null ? void 0 : existing.encryptedMeta) ?? "",
        enabled: partial.enabled ?? (existing == null ? void 0 : existing.enabled) ?? false,
        version: DATA_VERSION
      });
      if (partial.baseUrl || partial.model)
        this._updateMeta(id, partial.baseUrl, partial.model);
      this.persist();
      return;
    }
    if (existing) {
      this.configs.set(id, {
        ...existing,
        baseUrl: partial.baseUrl ?? existing.baseUrl,
        model: partial.model ?? existing.model,
        enabled: partial.enabled ?? existing.enabled
      });
      if (partial.baseUrl || partial.model)
        this._updateMeta(id, partial.baseUrl, partial.model);
      this.persist();
      return;
    }
    if (partial.enabled === true) {
      const preset = this.preset(id);
      const existingData = this.configs.get(id);
      this.configs.set(id, {
        baseUrl: partial.baseUrl ?? preset.baseUrl,
        model: partial.model ?? preset.model,
        salt,
        encryptedKey: (existingData == null ? void 0 : existingData.encryptedKey) ?? "",
        encryptedMeta: (existingData == null ? void 0 : existingData.encryptedMeta) ?? "",
        enabled: true,
        version: DATA_VERSION
      });
      if (partial.baseUrl || partial.model)
        this._updateMeta(id, partial.baseUrl, partial.model);
      this.persist();
    }
  }
  getActive() {
    const activeId = this.getActiveProviderId();
    if (activeId) {
      const all3 = this.getAll();
      const found = all3.find((c) => c.id === activeId);
      if (found && found.enabled && (found.apiKey || isLocalNoKeyProvider(found)))
        return found;
    }
    for (const cfg of this.getAll()) {
      if (!cfg.enabled)
        continue;
      if (cfg.apiKey)
        return cfg;
      if (isLocalNoKeyProvider(cfg))
        return cfg;
    }
    return null;
  }
  /** 用户主动激活某个 provider（用于功能区快速切换） */
  setActiveProvider(id) {
    localStorage.setItem("ruanlinyun_active_provider", id);
  }
  getActiveProviderId() {
    return localStorage.getItem("ruanlinyun_active_provider");
  }
  /** 启用并激活某个 provider（一站式切换） */
  async activateProvider(id) {
    for (const cfg of this.getAll()) {
      if (cfg.id !== id && cfg.enabled) {
        await this.update(cfg.id, { enabled: false });
      }
    }
    const target = this.getAll().find((c) => c.id === id);
    if (!target)
      throw new Error(`Provider not found: ${id}`);
    await this.update(id, {
      apiKey: target.apiKey,
      baseUrl: target.baseUrl,
      model: target.model,
      enabled: true
    });
    this.setActiveProvider(id);
  }
  hasConfigured() {
    return this.getAll().some((c) => c.enabled && (c.apiKey || isLocalNoKeyProvider(c)));
  }
  preset(id) {
    return this.getProviderMetas().find((p) => p.id === id) ?? BUILTIN_PROVIDERS[0];
  }
  _updateMeta(id, baseUrl, model) {
    const idx = this.customProviders.findIndex((p) => p.id === id);
    if (idx === -1)
      return;
    const prev = this.customProviders[idx];
    this.customProviders[idx] = { ...prev, baseUrl: baseUrl ?? prev.baseUrl, model: model ?? prev.model };
    this.persistProviders();
  }
};
__publicField(_ApiConfigService, "instance");
let ApiConfigService = _ApiConfigService;
const apiConfigService = ApiConfigService.getInstance();
const TypewriterEffect = ({
  text,
  speed = 30,
  delay = 0,
  onComplete
}) => {
  const [displayText, setDisplayText] = reactExports.useState("");
  const [isComplete, setIsComplete] = reactExports.useState(false);
  reactExports.useEffect(() => {
    let timeoutId;
    let currentIndex = 0;
    const startTyping = () => {
      if (currentIndex < text.length) {
        setDisplayText(text.slice(0, currentIndex + 1));
        currentIndex++;
        timeoutId = setTimeout(startTyping, speed);
      } else {
        setIsComplete(true);
        onComplete == null ? void 0 : onComplete();
      }
    };
    const startDelay = setTimeout(() => {
      startTyping();
    }, delay);
    return () => {
      clearTimeout(timeoutId);
      clearTimeout(startDelay);
    };
  }, [text, speed, delay, onComplete]);
  return /* @__PURE__ */ jsxs("span", { children: [
    displayText,
    !isComplete && /* @__PURE__ */ jsx("span", { style: { opacity: 0.5 }, children: "|" })
  ] });
};
var MessageRole = /* @__PURE__ */ ((MessageRole2) => {
  MessageRole2["System"] = "system";
  MessageRole2["User"] = "user";
  MessageRole2["Assistant"] = "assistant";
  MessageRole2["Tool"] = "tool";
  return MessageRole2;
})(MessageRole || {});
class ProtocolConverter {
  /** OpenAI 消息 → 统一消息 */
  static toOpenAI(messages) {
    return messages.map((m) => ({
      role: m.role,
      content: m.content,
      name: m.name
    }));
  }
  /** 统一消息 → OpenAI 消息 */
  static fromUnified(messages) {
    return messages.map((m) => ({
      role: m.role,
      content: typeof m.content === "string" ? m.content : m.content.map((c) => c.type === "text" ? c.text : "").join("\n"),
      name: m.name
    }));
  }
  /** Anthropic 响应 → 统一响应 */
  static toUnified(response, model) {
    const textContent = response.content.filter((c) => c.type === "text").map((c) => c.text).join("\n");
    return {
      id: response.id,
      object: "chat.completion",
      created: Date.now() / 1e3,
      model,
      choices: [{
        index: 0,
        message: { role: "assistant", content: textContent },
        finish_reason: response.stop_reason === "end_turn" ? "stop" : response.stop_reason
      }],
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
    };
  }
}
const REQUEST_TIMEOUT = 9e4;
const PROXY_RETRY_COOLDOWN = 5e3;
const RATE_LIMIT_PER_MINUTE = 60;
const CIRCUIT_BREAKER_COOLDOWN = 6e4;
const CLIENT_MIN_INTERVAL_MS = 1500;
const DEDUP_WINDOW_MS = 3e3;
const CLIENT_COOLDOWN_MS = 1e4;
const API_HOST$2 = typeof window !== "undefined" && window.location && window.location.hostname || "127.0.0.1";
const PROXY_BASE = `http://${API_HOST$2}:27865/api/v1/ai`;
function sanitizeInput(input) {
  const cleaned = input.trim();
  if (!cleaned)
    throw new Error("输入为空");
  return cleaned.length > 8e3 ? cleaned.slice(0, 8e3) : cleaned;
}
class RateLimitError extends Error {
  constructor(message, retryAfter, source = "upstream") {
    super(message);
    __publicField(this, "retryAfter");
    __publicField(this, "source");
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
    this.source = source;
  }
}
class TokenBucket {
  constructor(capacity) {
    __publicField(this, "tokens");
    __publicField(this, "lastRefill");
    this.capacity = capacity;
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }
  consume(count = 1) {
    const now = Date.now();
    this.tokens = Math.min(this.capacity, this.tokens + (now - this.lastRefill) / 1e3 * (this.capacity / 60));
    this.lastRefill = now;
    if (this.tokens >= count) {
      this.tokens -= count;
      return true;
    }
    return false;
  }
}
class OpenAICompatibleProvider {
  constructor(baseUrl, apiKey, model) {
    __publicField(this, "baseUrl");
    __publicField(this, "apiKey");
    __publicField(this, "model");
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.apiKey = apiKey;
    this.model = model;
  }
  async generateResponse(messages, options) {
    var _a;
    const request = {
      model: this.model,
      messages: ProtocolConverter.fromUnified(messages),
      temperature: (options == null ? void 0 : options.temperature) ?? 0.7,
      max_tokens: (options == null ? void 0 : options.maxTokens) ?? 2048,
      top_p: options == null ? void 0 : options.topP,
      frequency_penalty: options == null ? void 0 : options.frequencyPenalty,
      presence_penalty: options == null ? void 0 : options.presencePenalty,
      stop: options == null ? void 0 : options.stopSequences
    };
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    const resp = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}
      },
      body: JSON.stringify(request),
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(((_a = err.error) == null ? void 0 : _a.message) ?? `OpenAI API 错误 HTTP ${resp.status}`);
    }
    const data = await resp.json();
    return {
      id: data.id,
      object: data.object,
      created: data.created,
      model: data.model,
      choices: data.choices.map((c) => ({
        index: c.index,
        message: { role: c.message.role, content: c.message.content },
        finish_reason: c.finish_reason
      })),
      usage: data.usage
    };
  }
  async generateStream(_messages, _onChunk, _options) {
    throw new Error("Streaming not implemented in OpenAICompatibleProvider");
  }
  getCapabilities() {
    return {
      supportsStreaming: false,
      supportsImages: this.model.includes("vision") || this.model.includes("4o"),
      supportsTools: false,
      maxTokens: 4096,
      contextWindow: 128e3
    };
  }
  async train(_feedback) {
    console.log("[OpenAIProvider] Training feedback received:", _feedback);
  }
  async healthCheck() {
    try {
      const resp = await fetch(`${this.baseUrl}/models`, {
        headers: this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}
      });
      return resp.ok;
    } catch {
      return false;
    }
  }
}
class AnthropicCompatibleProvider {
  constructor(baseUrl, apiKey, model) {
    __publicField(this, "baseUrl");
    __publicField(this, "apiKey");
    __publicField(this, "model");
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.apiKey = apiKey;
    this.model = model;
  }
  async generateResponse(messages, options) {
    var _a;
    const systemMessage = messages.find((m) => m.role === MessageRole.System);
    const userMessages = messages.filter((m) => m.role !== MessageRole.System);
    const request = {
      model: this.model,
      messages: userMessages.map((m) => ({
        role: m.role === MessageRole.User ? "user" : "assistant",
        content: [typeof m.content === "string" ? m.content : m.content.map((c) => c.type === "text" ? c.text : "").join("\n")]
      })),
      system: (systemMessage == null ? void 0 : systemMessage.content) && typeof systemMessage.content === "string" ? systemMessage.content : void 0,
      max_tokens: (options == null ? void 0 : options.maxTokens) ?? 2048,
      temperature: options == null ? void 0 : options.temperature,
      top_p: options == null ? void 0 : options.topP,
      stop_sequences: options == null ? void 0 : options.stopSequences
    };
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    const resp = await fetch(`${this.baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify(request),
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(((_a = err.error) == null ? void 0 : _a.message) ?? `Anthropic API 错误 HTTP ${resp.status}`);
    }
    const data = await resp.json();
    return ProtocolConverter.toUnified(data, this.model);
  }
  async generateStream(_messages, _onChunk, _options) {
    throw new Error("Streaming not implemented in AnthropicCompatibleProvider");
  }
  getCapabilities() {
    return {
      supportsStreaming: true,
      supportsImages: this.model.includes("sonnet") || this.model.includes("opus"),
      supportsTools: this.model.includes("claude-3"),
      maxTokens: 4096,
      contextWindow: 2e5
    };
  }
  async train(_feedback) {
    console.log("[AnthropicProvider] Training feedback received:", _feedback);
  }
  async healthCheck() {
    try {
      const resp = await fetch(`${this.baseUrl}/v1/models`, {
        headers: { "x-api-key": this.apiKey }
      });
      return resp.ok;
    } catch {
      return false;
    }
  }
}
const _LLMApiService = class _LLMApiService {
  constructor() {
    __publicField(this, "rateLimiter", new TokenBucket(RATE_LIMIT_PER_MINUTE));
    __publicField(this, "consecutiveFailures", 0);
    __publicField(this, "circuitOpen", false);
    __publicField(this, "circuitOpenTime", 0);
    __publicField(this, "proxyChecked", false);
    __publicField(this, "proxyAvailable", false);
    __publicField(this, "lastProxyCheckAt", 0);
    // [v61d] 上次代理探测时间戳（失败重试冷却）
    // ---- 防频控状态 ----
    // 上次请求发起时间戳（用于请求间隔控制）
    __publicField(this, "lastRequestAt", 0);
    // 客户端冷却到期时间（429 后设置）
    __publicField(this, "clientCooldownUntil", 0);
    // 最近发送的消息指纹列表（用于去重）
    __publicField(this, "recentMessages", []);
    // 当前是否有请求正在进行（防止并发）
    __publicField(this, "requestInFlight", false);
    // 等待队列（串行化请求）
    __publicField(this, "waitQueue", []);
  }
  static getInstance() {
    if (!_LLMApiService.instance)
      _LLMApiService.instance = new _LLMApiService();
    return _LLMApiService.instance;
  }
  /**
   * 等待请求间隔（模拟用户思考时间）
   * 1. 如果处于冷却期，等到冷却结束
   * 2. 距离上次请求不足间隔，等到间隔满足
   * 3. 如果有请求正在进行，排队等待
   */
  async waitForRequestSlot() {
    if (this.requestInFlight) {
      await new Promise((resolve) => {
        this.waitQueue.push(resolve);
      });
    }
    this.requestInFlight = true;
    const now = Date.now();
    let waitMs = 0;
    if (now < this.clientCooldownUntil) {
      waitMs = Math.max(waitMs, this.clientCooldownUntil - now);
    }
    const intervalEnd = this.lastRequestAt + CLIENT_MIN_INTERVAL_MS;
    if (now < intervalEnd) {
      waitMs = Math.max(waitMs, intervalEnd - now);
    }
    if (waitMs > 0) {
      await new Promise((r) => setTimeout(r, waitMs));
    }
    this.lastRequestAt = Date.now();
  }
  /** 释放请求锁，唤醒下一个排队请求 */
  releaseRequestSlot() {
    this.requestInFlight = false;
    const next = this.waitQueue.shift();
    if (next)
      next();
  }
  /**
   * 检查消息去重（短时间内相同消息不重复发送）
   * @returns true=可发送, false=被去重过滤
   */
  checkDedup(userMessage) {
    const now = Date.now();
    this.recentMessages = this.recentMessages.filter((r) => now - r.ts < DEDUP_WINDOW_MS);
    const key = userMessage.slice(0, 200);
    const exists = this.recentMessages.some((r) => r.key === key);
    if (exists) {
      console.warn("[AI] 检测到重复请求（去重过滤）:", key.slice(0, 50));
      return false;
    }
    this.recentMessages.push({ key, ts: now });
    return true;
  }
  /** 标记客户端限流冷却 */
  triggerClientCooldown(retryAfter) {
    const cooldown = retryAfter && retryAfter > 0 ? Math.min(retryAfter * 1e3, 6e4) : CLIENT_COOLDOWN_MS;
    this.clientCooldownUntil = Date.now() + cooldown;
    console.warn(`[AI] 触发客户端冷却 ${cooldown}ms`);
  }
  async init() {
    await this.checkProxyHealth();
  }
  async checkProxyHealth() {
    const now = Date.now();
    if (!this.proxyAvailable && this.lastProxyCheckAt && now - this.lastProxyCheckAt < PROXY_RETRY_COOLDOWN) {
      return false;
    }
    this.lastProxyCheckAt = now;
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 3e3);
      const resp = await fetch(`${PROXY_BASE}/proxy/health`, { signal: ctrl.signal });
      clearTimeout(t);
      if (resp.ok && (await resp.json()).ok) {
        this.proxyAvailable = true;
        this.proxyChecked = true;
        return true;
      }
    } catch {
    }
    this.proxyAvailable = false;
    this.proxyChecked = false;
    return false;
  }
  isConfigured() {
    const anyEnabled = apiConfigService.getAll().some((c) => c.enabled);
    if (!anyEnabled)
      return false;
    if (this.proxyChecked && this.proxyAvailable)
      return true;
    return apiConfigService.hasConfigured();
  }
  isProxyMode() {
    return this.proxyAvailable;
  }
  getActiveProvider() {
    if (this.proxyAvailable) {
      return { id: "proxy", name: "阮琳云", baseUrl: PROXY_BASE, apiKey: "", model: "proxy", enabled: true };
    }
    if (this.circuitOpen)
      return null;
    return apiConfigService.getActive();
  }
  getCircuitBreakerReason() {
    if (!this.circuitOpen)
      return null;
    const r = Math.ceil((this.circuitOpenTime + CIRCUIT_BREAKER_COOLDOWN - Date.now()) / 1e3);
    return r > 0 ? `API暂停（${this.consecutiveFailures}次失败），${r}秒后恢复` : null;
  }
  async chat(messages, systemPrompt) {
    const body = systemPrompt ? [{ role: "system", content: sanitizeInput(systemPrompt) }, ...messages.map((m) => ({ ...m, content: sanitizeInput(m.content) }))] : messages.map((m) => ({ ...m, content: sanitizeInput(m.content) }));
    const trimmed = body.slice(-20);
    const provider = apiConfigService.getActive();
    if (!provider)
      throw new Error(this.getCircuitBreakerReason() ?? "请先在设置中配置并启用AI模型API");
    if (!this.rateLimiter.consume())
      throw new RateLimitError("请求频繁，请稍后（60次/分钟）", 60, "frontend_limit");
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (lastUserMsg && !this.checkDedup(lastUserMsg.content)) {
      throw new RateLimitError("检测到重复请求，已自动过滤", 2, "frontend_limit");
    }
    await this.waitForRequestSlot();
    try {
      if (!this.proxyChecked)
        await this.checkProxyHealth();
      if (!this.proxyAvailable) {
        throw new Error("后端代理服务不可用，请检查后端是否启动");
      }
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT);
      const resp = await fetch(`${PROXY_BASE}/proxy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: trimmed,
          systemPrompt
          // 不传 provider 字段（apiKey/baseUrl/model 由后端 .env 控制）
        }),
        signal: ctrl.signal
      });
      clearTimeout(t);
      if (!resp.ok) {
        if (resp.status === 429) {
          const retryAfter = this.parseRetryAfter(resp.headers.get("retry-after"));
          const errBody = await resp.json().catch(() => ({}));
          const wait = retryAfter ?? errBody.retryAfter ?? null;
          this.triggerClientCooldown(wait);
          throw new RateLimitError("请求过于频繁，请稍后重试", wait, "upstream");
        }
        const errJson = await resp.json().catch(() => ({}));
        throw new Error(errJson.error ?? `代理错误 HTTP ${resp.status}`);
      }
      const data = await resp.json();
      this.consecutiveFailures = 0;
      if (data.cached) {
        console.log("[AI] 命中后端缓存，未触发上游调用");
      }
      return data.content ?? "";
    } finally {
      this.releaseRequestSlot();
    }
  }
  /** 解析 Retry-After 头（支持秒数或 HTTP 日期），返回等待秒数；无则返回 null */
  parseRetryAfter(value) {
    if (!value)
      return null;
    const s = Number(value);
    if (!Number.isNaN(s) && s >= 0)
      return Math.ceil(s);
    const date = Date.parse(value);
    if (!Number.isNaN(date))
      return Math.max(0, Math.ceil((date - Date.now()) / 1e3));
    return null;
  }
  async ask(userMessage, systemPrompt) {
    return this.chat([{ role: "user", content: userMessage }], systemPrompt);
  }
  /**
   * 带对话历史的 AI 调用（OpenAI 标准协议）
   *
   * 设计目的：解决旧方案把对话历史拼接成字符串塞进单条 user 消息导致的角色混淆问题。
   * 旧方案：`${对话历史}\n用户: ${text}` → AI 误以为历史中"阮琳云:"是用户名
   * 新方案：每条消息独立 role=user/assistant，符合 OpenAI Messages API 协议规范
   *
   * @param history 对话历史，role 必须是 'user' 或 'assistant'
   * @param userMessage 当前用户消息
   * @param systemPrompt 系统提示词
   */
  async askWithHistory(history, userMessage, systemPrompt) {
    const messages = [
      ...history.slice(-20).map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: userMessage }
    ];
    return this.chat(messages, systemPrompt);
  }
  // ============================================================
  // 自研大脑接口（Python 神经网络大脑，端口 27900）
  // 返回完整思考过程数据，供前端可视化
  // ============================================================
  async checkBrainHealth() {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 3e3);
      const resp = await fetch("http://127.0.0.1:27900/api/v1/ai/health", { signal: ctrl.signal });
      clearTimeout(t);
      if (resp.ok) {
        const data = await resp.json();
        return data.status === "ok";
      }
      return false;
    } catch {
      return false;
    }
  }
  async askBrain(userMessage, reward = 0.5) {
    const message = sanitizeInput(userMessage);
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT);
    try {
      const resp = await fetch("http://127.0.0.1:27900/api/v1/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, reward }),
        signal: ctrl.signal
      });
      clearTimeout(t);
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.message ?? `自研大脑错误 HTTP ${resp.status}`);
      }
      return await resp.json();
    } finally {
      clearTimeout(t);
    }
  }
  async sendBrainFeedback(rating, comment) {
    try {
      await fetch("http://127.0.0.1:27900/api/v1/ai/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment: comment ?? null })
      });
    } catch {
    }
  }
  async testConnection(provider) {
    const attemptOnce = async () => {
      var _a, _b, _c;
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 2e4);
        const headers = { "Content-Type": "application/json" };
        if (provider.apiKey)
          headers.Authorization = `Bearer ${provider.apiKey}`;
        const resp = await fetch(`${provider.baseUrl.replace(/\/$/, "")}/chat/completions`, {
          method: "POST",
          headers,
          body: JSON.stringify({ model: provider.model, messages: [{ role: "user", content: '你好，回复"连接成功"' }], max_tokens: 20, stream: false }),
          signal: ctrl.signal
        });
        clearTimeout(t);
        if (resp.ok) {
          const data = await resp.json();
          return { ok: true, message: `连接成功 → ${(((_c = (_b = (_a = data.choices) == null ? void 0 : _a[0]) == null ? void 0 : _b.message) == null ? void 0 : _c.content) ?? "").substring(0, 50)}` };
        }
        const st = resp.status;
        if (st === 401)
          return { ok: false, message: "API Key无效" };
        if (st === 403)
          return { ok: false, message: "模型名称错误或无权限" };
        return { ok: false, message: `HTTP ${st}` };
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError")
          return { ok: false, message: "__TIMEOUT__" };
        return { ok: false, message: (err instanceof Error ? err.message : String(err)).substring(0, 150) };
      }
    };
    try {
      let r = await attemptOnce();
      if (!r.ok && r.message === "__TIMEOUT__") {
        r = await attemptOnce();
        if (!r.ok && r.message === "__TIMEOUT__")
          return { ok: false, message: "连接超时（已自动重试一次），检查Base URL或网络" };
      }
      return r;
    } catch (err) {
      return { ok: false, message: (err instanceof Error ? err.message : String(err)).substring(0, 150) };
    }
  }
};
__publicField(_LLMApiService, "instance");
let LLMApiService = _LLMApiService;
function createAIProvider(config) {
  const isAnthropic = config.baseUrl.includes("anthropic") || config.model.toLowerCase().includes("claude");
  if (isAnthropic) {
    return new AnthropicCompatibleProvider(config.baseUrl, config.apiKey, config.model);
  }
  return new OpenAICompatibleProvider(config.baseUrl, config.apiKey, config.model);
}
const llmApiService = LLMApiService.getInstance();
const LLMApiService$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  AnthropicCompatibleProvider,
  LLMApiService,
  OpenAICompatibleProvider,
  RateLimitError,
  createAIProvider,
  default: llmApiService,
  llmApiService
}, Symbol.toStringTag, { value: "Module" }));
const LOCAL_MODEL_IDS = ["qwen_local", "glm_local"];
function MobileSettingsPage({ isDarkMode, setIsDarkMode }) {
  const navigate = useNavigate();
  const [providers, setProviders] = reactExports.useState([]);
  const [selectedProviderId, setSelectedProviderId] = reactExports.useState("deepseek");
  const [apiKey, setApiKey] = reactExports.useState("");
  const [baseUrl, setBaseUrl] = reactExports.useState("");
  const [model, setModel] = reactExports.useState("");
  const [enabled, setEnabled] = reactExports.useState(false);
  const [testResult, setTestResult] = reactExports.useState(null);
  const [testing, setTesting] = reactExports.useState(false);
  const [saved, setSaved] = reactExports.useState(false);
  const visibleProviders = providers.filter((p) => !LOCAL_MODEL_IDS.includes(p.id));
  reactExports.useEffect(() => {
    const init = async () => {
      await apiConfigService.waitReady();
      const all3 = apiConfigService.getAll();
      setProviders(all3);
      const visible = all3.filter((p) => !LOCAL_MODEL_IDS.includes(p.id));
      if (visible.length > 0)
        loadProvider(visible[0].id, visible);
    };
    init();
  }, []);
  const loadProvider = (id, list) => {
    const p = (list ?? visibleProviders).find((x) => x.id === id);
    if (p) {
      setSelectedProviderId(p.id);
      setApiKey(p.apiKey);
      setBaseUrl(p.baseUrl);
      setModel(p.model);
      setEnabled(p.enabled);
      setTestResult(null);
      setSaved(false);
    }
  };
  const apiKeyOptional = /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?(\/|$)/i.test(baseUrl);
  const handleSave = async () => {
    await apiConfigService.update(selectedProviderId, { apiKey, baseUrl, model, enabled });
    setProviders(apiConfigService.getAll());
    setSaved(true);
    setTimeout(() => setSaved(false), 2e3);
  };
  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    const result = await llmApiService.testConnection({
      id: selectedProviderId,
      name: "",
      baseUrl,
      apiKey,
      model,
      enabled: true
    });
    setTestResult(result);
    setTesting(false);
  };
  return /* @__PURE__ */ jsxs(Container, { maxWidth: "md", sx: { py: 3 }, children: [
    /* @__PURE__ */ jsxs(Box, { sx: { display: "flex", alignItems: "center", mb: 3 }, children: [
      /* @__PURE__ */ jsx(IconButton, { "aria-label": "返回", sx: { mr: 2 }, onClick: () => navigate("/"), children: /* @__PURE__ */ jsx(default_1, {}) }),
      /* @__PURE__ */ jsx(Typography, { variant: "h4", children: "设置" })
    ] }),
    /* @__PURE__ */ jsxs(Paper, { elevation: 3, sx: { p: 3, mb: 3 }, children: [
      /* @__PURE__ */ jsx(Typography, { variant: "h6", gutterBottom: true, children: "AI模型配置" }),
      /* @__PURE__ */ jsx(Divider, { sx: { mb: 3 } }),
      /* @__PURE__ */ jsxs(FormControl, { fullWidth: true, sx: { mb: 2 }, children: [
        /* @__PURE__ */ jsx(InputLabel, { id: "model-select-label", children: "选择模型" }),
        /* @__PURE__ */ jsx(Select, { id: "model-select", labelId: "model-select-label", value: selectedProviderId, label: "选择模型", onChange: (e) => loadProvider(e.target.value), children: visibleProviders.map((p) => /* @__PURE__ */ jsxs(MenuItem, { value: p.id, children: [
          p.name,
          " (",
          p.model,
          ")"
        ] }, p.id)) })
      ] }),
      /* @__PURE__ */ jsx(
        TextField,
        {
          id: "api-base-url",
          fullWidth: true,
          label: "API Base URL",
          value: baseUrl,
          onChange: (e) => setBaseUrl(e.target.value),
          placeholder: selectedProviderId === "deepseek" ? "https://api.deepseek.com" : "https://your-api.com/v1",
          helperText: selectedProviderId === "deepseek" ? "官方文档: https://api.deepseek.com" : "OpenAI兼容API地址（含/v1）",
          InputProps: { sx: { "& input::placeholder": { opacity: 0.4 } } },
          sx: { mb: 2 }
        }
      ),
      /* @__PURE__ */ jsx(
        TextField,
        {
          id: "api-key",
          fullWidth: true,
          label: "API Key",
          type: "password",
          value: apiKey,
          onChange: (e) => setApiKey(e.target.value),
          placeholder: "sk-xxxxxxxxxxxxxxxx",
          helperText: apiKeyOptional ? "本地服务可留空" : selectedProviderId === "deepseek" ? "在 platform.deepseek.com → API Keys 获取" : "AES-256-GCM加密存储",
          InputProps: { sx: { "& input::placeholder": { opacity: 0.4 } } },
          sx: { mb: 2 }
        }
      ),
      /* @__PURE__ */ jsx(
        TextField,
        {
          id: "model-name",
          fullWidth: true,
          label: "模型名称",
          value: model,
          onChange: (e) => setModel(e.target.value),
          placeholder: selectedProviderId === "deepseek" ? "deepseek-v4-pro" : "your-model-name",
          helperText: selectedProviderId === "deepseek" ? "DeepSeek V4 Pro: deepseek-v4-pro" : "按API文档填写",
          InputProps: { sx: { "& input::placeholder": { opacity: 0.4 } } },
          sx: { mb: 2 }
        }
      ),
      /* @__PURE__ */ jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 2, mb: 2 }, children: [
        /* @__PURE__ */ jsx(
          FormControlLabel,
          {
            control: /* @__PURE__ */ jsx(Switch, { checked: enabled, onChange: (e) => setEnabled(e.target.checked), color: "primary" }),
            label: enabled ? "已启用" : "已禁用"
          }
        ),
        /* @__PURE__ */ jsx(Box, { sx: { flexGrow: 1 } }),
        !BUILTIN_PROVIDERS.some((p) => p.id === selectedProviderId) && /* @__PURE__ */ jsx(
          Button,
          {
            variant: "outlined",
            color: "error",
            startIcon: /* @__PURE__ */ jsx(default_1$1, {}),
            onClick: async () => {
              if (!window.confirm(`确定删除该 provider 吗？

这将同步清除其 API Key、Base URL、模型名称等所有存储信息，且不可恢复。`))
                return;
              const ok = await apiConfigService.removeProvider(selectedProviderId);
              if (ok) {
                const all3 = apiConfigService.getAll();
                setProviders(all3);
                const visible = all3.filter((p) => !LOCAL_MODEL_IDS.includes(p.id));
                const next = visible.find((c) => c.enabled) ?? visible[0];
                if (next)
                  loadProvider(next.id, visible);
              } else {
                alert("删除失败：该 provider 不存在或为内置 provider，无法删除");
              }
            },
            children: "删除"
          }
        ),
        /* @__PURE__ */ jsx(
          Button,
          {
            variant: "outlined",
            onClick: handleTest,
            disabled: testing || !apiKeyOptional && !apiKey.trim(),
            startIcon: testing ? /* @__PURE__ */ jsx(CircularProgress, { size: 18 }) : /* @__PURE__ */ jsx(default_1$2, {}),
            children: "测试连接"
          }
        ),
        /* @__PURE__ */ jsx(
          Button,
          {
            variant: "contained",
            onClick: handleSave,
            color: saved ? "success" : "primary",
            startIcon: saved ? /* @__PURE__ */ jsx(default_1$3, {}) : void 0,
            children: saved ? "已保存" : "保存"
          }
        )
      ] }),
      testResult && /* @__PURE__ */ jsx(Alert, { severity: testResult.ok ? "success" : "error", sx: { mb: 2 }, children: testResult.message }),
      /* @__PURE__ */ jsx(Box, { sx: { display: "flex", gap: 1, flexWrap: "wrap" }, children: visibleProviders.map((p) => /* @__PURE__ */ jsx(
        Chip,
        {
          label: `${p.name}${p.enabled ? " ✓" : ""}`,
          color: p.enabled ? "primary" : "default",
          variant: p.enabled ? "filled" : "outlined",
          size: "small",
          onClick: () => loadProvider(p.id)
        },
        p.id
      )) })
    ] }),
    /* @__PURE__ */ jsxs(Paper, { elevation: 3, sx: { p: 3, mb: 3 }, children: [
      /* @__PURE__ */ jsx(Typography, { variant: "h6", gutterBottom: true, children: "通用设置" }),
      /* @__PURE__ */ jsx(Divider, { sx: { mb: 3 } }),
      /* @__PURE__ */ jsx(
        FormControlLabel,
        {
          control: /* @__PURE__ */ jsx(Switch, { checked: isDarkMode, onChange: (e) => setIsDarkMode(e.target.checked), color: "primary" }),
          label: "深色模式"
        }
      )
    ] }),
    /* @__PURE__ */ jsxs(Paper, { elevation: 3, sx: { p: 3 }, children: [
      /* @__PURE__ */ jsx(Typography, { variant: "h6", gutterBottom: true, children: "关于" }),
      /* @__PURE__ */ jsx(Divider, { sx: { mb: 3 } }),
      /* @__PURE__ */ jsxs(Accordion, { children: [
        /* @__PURE__ */ jsx(AccordionSummary, { expandIcon: /* @__PURE__ */ jsx(default_1$4, {}), children: /* @__PURE__ */ jsx(Typography, { children: "版本信息" }) }),
        /* @__PURE__ */ jsx(AccordionDetails, { children: /* @__PURE__ */ jsx(Typography, { children: "阮琳云智能助手 v1.0.0 (Android)" }) })
      ] }),
      /* @__PURE__ */ jsxs(Accordion, { children: [
        /* @__PURE__ */ jsx(AccordionSummary, { expandIcon: /* @__PURE__ */ jsx(default_1$4, {}), children: /* @__PURE__ */ jsx(Typography, { children: "安全" }) }),
        /* @__PURE__ */ jsx(AccordionDetails, { children: /* @__PURE__ */ jsx(Typography, { children: "API Key 采用 AES-256-GCM 加密存储，密钥由浏览器指纹派生（PBKDF2 600000 迭代）。加密可防止 localStorage 直接泄露密钥，但不能防御 XSS 攻击，请勿在不可信环境使用。" }) })
      ] })
    ] })
  ] });
}
const PHASE_LABELS = {
  perception: "感知",
  attention: "注意",
  comprehension: "理解",
  association: "联想",
  reasoning: "推理",
  decision: "决策",
  drafting: "草拟"
};
const GAP_LABELS = {
  factual: "事实性知识",
  procedural: "程序性知识",
  conceptual: "概念性知识",
  none: "无缺口"
};
const STRATEGY_LABELS = {
  seek_knowledge: "寻求知识",
  reasoning: "推理",
  ask_user: "询问用户",
  none: "无"
};
const MOOD_LABELS = {
  happy: "开心",
  sad: "难过",
  neutral: "平静",
  excited: "兴奋",
  calm: "冷静",
  anxious: "焦虑",
  focused: "专注",
  curious: "好奇"
};
function ThinkingProcess({ brainState, responseTime }) {
  const [expanded, setExpanded] = reactExports.useState(false);
  if (!brainState)
    return null;
  const thoughtChain = brainState.thought_chain;
  const metacognition = brainState.metacognition;
  const knowledgeQuery = brainState.knowledge_query;
  const selfNarrative = brainState.self_narrative;
  const activeConcepts = brainState.active_concepts || [];
  const moodLabel = brainState.mood_label || brainState.mood || "neutral";
  const activity = brainState.activity ?? 0;
  return /* @__PURE__ */ jsxs(
    Box,
    {
      sx: {
        mt: 1,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
        overflow: "hidden",
        bgcolor: "action.hover"
      },
      children: [
        /* @__PURE__ */ jsxs(
          Box,
          {
            sx: {
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              px: 1.5,
              py: 0.75,
              cursor: "pointer",
              userSelect: "none",
              "&:hover": { bgcolor: "action.selected" }
            },
            onClick: () => setExpanded(!expanded),
            children: [
              /* @__PURE__ */ jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1 }, children: [
                /* @__PURE__ */ jsx(default_1$5, { fontSize: "small", color: "primary" }),
                /* @__PURE__ */ jsx(Typography, { variant: "caption", sx: { fontWeight: 600 }, children: "思考过程" }),
                (thoughtChain == null ? void 0 : thoughtChain.phases) && /* @__PURE__ */ jsx(
                  Chip,
                  {
                    size: "small",
                    label: `${thoughtChain.phases.length} 阶段`,
                    sx: { height: 18, fontSize: 11 }
                  }
                ),
                responseTime !== void 0 && /* @__PURE__ */ jsxs(Typography, { variant: "caption", sx: { opacity: 0.6, fontSize: 11 }, children: [
                  responseTime.toFixed(0),
                  "ms"
                ] })
              ] }),
              /* @__PURE__ */ jsx(IconButton, { size: "small", sx: { p: 0.25 }, children: /* @__PURE__ */ jsx(
                default_1$4,
                {
                  fontSize: "small",
                  sx: { transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }
                }
              ) })
            ]
          }
        ),
        /* @__PURE__ */ jsx(Collapse, { in: expanded, children: /* @__PURE__ */ jsxs(Box, { sx: { p: 1.5, pt: 0 }, children: [
          (thoughtChain == null ? void 0 : thoughtChain.phases) && thoughtChain.phases.length > 0 && /* @__PURE__ */ jsxs(Box, { sx: { mb: 1.5 }, children: [
            /* @__PURE__ */ jsx(Typography, { variant: "caption", sx: { fontWeight: 600, display: "block", mb: 0.5 }, children: "思考阶段" }),
            /* @__PURE__ */ jsx(Box, { sx: { display: "flex", flexWrap: "wrap", gap: 0.5 }, children: thoughtChain.phases.map((phase, idx) => /* @__PURE__ */ jsx(Tooltip, { title: PHASE_LABELS[phase] || phase, arrow: true, children: /* @__PURE__ */ jsx(
              Chip,
              {
                size: "small",
                label: PHASE_LABELS[phase] || phase,
                color: "primary",
                variant: "outlined",
                sx: { height: 20, fontSize: 11 }
              }
            ) }, idx)) })
          ] }),
          (thoughtChain == null ? void 0 : thoughtChain.direction) && /* @__PURE__ */ jsxs(Box, { sx: { mb: 1.5 }, children: [
            /* @__PURE__ */ jsxs(Typography, { variant: "caption", sx: { fontWeight: 600, display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }, children: [
              /* @__PURE__ */ jsx(default_1$6, { sx: { fontSize: 14 } }),
              " 思考方向"
            ] }),
            /* @__PURE__ */ jsx(Typography, { variant: "body2", sx: { fontSize: 12, pl: 2 }, children: thoughtChain.direction })
          ] }),
          (thoughtChain == null ? void 0 : thoughtChain.goal) && /* @__PURE__ */ jsxs(Box, { sx: { mb: 1.5 }, children: [
            /* @__PURE__ */ jsx(Typography, { variant: "caption", sx: { fontWeight: 600, display: "block", mb: 0.5 }, children: "当前目标" }),
            /* @__PURE__ */ jsx(Typography, { variant: "body2", sx: { fontSize: 12, pl: 2, fontStyle: "italic" }, children: thoughtChain.goal })
          ] }),
          metacognition && /* @__PURE__ */ jsxs(Fragment, { children: [
            /* @__PURE__ */ jsx(Divider, { sx: { my: 1 } }),
            /* @__PURE__ */ jsxs(Box, { sx: { mb: 1.5 }, children: [
              /* @__PURE__ */ jsx(Typography, { variant: "caption", sx: { fontWeight: 600, display: "block", mb: 0.5 }, children: "元认知评估" }),
              /* @__PURE__ */ jsxs(Box, { sx: { pl: 2 }, children: [
                metacognition.understanding !== void 0 && /* @__PURE__ */ jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1, mb: 0.5 }, children: [
                  /* @__PURE__ */ jsx(Typography, { variant: "caption", sx: { width: 56, fontSize: 11 }, children: "理解度" }),
                  /* @__PURE__ */ jsx(
                    LinearProgress,
                    {
                      variant: "determinate",
                      value: metacognition.understanding * 100,
                      sx: { flex: 1, height: 6, borderRadius: 3 }
                    }
                  ),
                  /* @__PURE__ */ jsxs(Typography, { variant: "caption", sx: { fontSize: 11, width: 32 }, children: [
                    (metacognition.understanding * 100).toFixed(0),
                    "%"
                  ] })
                ] }),
                metacognition.confidence !== void 0 && /* @__PURE__ */ jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1, mb: 0.5 }, children: [
                  /* @__PURE__ */ jsx(Typography, { variant: "caption", sx: { width: 56, fontSize: 11 }, children: "置信度" }),
                  /* @__PURE__ */ jsx(
                    LinearProgress,
                    {
                      variant: "determinate",
                      value: metacognition.confidence * 100,
                      color: "secondary",
                      sx: { flex: 1, height: 6, borderRadius: 3 }
                    }
                  ),
                  /* @__PURE__ */ jsxs(Typography, { variant: "caption", sx: { fontSize: 11, width: 32 }, children: [
                    (metacognition.confidence * 100).toFixed(0),
                    "%"
                  ] })
                ] }),
                metacognition.knowledge_gap && metacognition.knowledge_gap !== "none" && /* @__PURE__ */ jsxs(Box, { sx: { display: "flex", gap: 1, mb: 0.5 }, children: [
                  /* @__PURE__ */ jsx(Typography, { variant: "caption", sx: { width: 56, fontSize: 11 }, children: "知识缺口" }),
                  /* @__PURE__ */ jsx(Typography, { variant: "caption", sx: { fontSize: 11 }, children: GAP_LABELS[metacognition.knowledge_gap] || metacognition.knowledge_gap })
                ] }),
                metacognition.strategy && metacognition.strategy !== "none" && /* @__PURE__ */ jsxs(Box, { sx: { display: "flex", gap: 1 }, children: [
                  /* @__PURE__ */ jsx(Typography, { variant: "caption", sx: { width: 56, fontSize: 11 }, children: "策略" }),
                  /* @__PURE__ */ jsx(Typography, { variant: "caption", sx: { fontSize: 11 }, children: STRATEGY_LABELS[metacognition.strategy] || metacognition.strategy })
                ] })
              ] })
            ] })
          ] }),
          knowledgeQuery && knowledgeQuery.key_points && knowledgeQuery.key_points.length > 0 && /* @__PURE__ */ jsxs(Fragment, { children: [
            /* @__PURE__ */ jsx(Divider, { sx: { my: 1 } }),
            /* @__PURE__ */ jsxs(Box, { sx: { mb: 1.5 }, children: [
              /* @__PURE__ */ jsxs(Typography, { variant: "caption", sx: { fontWeight: 600, display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }, children: [
                /* @__PURE__ */ jsx(default_1$7, { sx: { fontSize: 14 } }),
                " 知识查询",
                knowledgeQuery.source && /* @__PURE__ */ jsx(
                  Chip,
                  {
                    size: "small",
                    label: knowledgeQuery.source,
                    sx: { height: 16, fontSize: 10, ml: 0.5 }
                  }
                )
              ] }),
              /* @__PURE__ */ jsx(Box, { sx: { pl: 2 }, children: knowledgeQuery.key_points.map((point, idx) => /* @__PURE__ */ jsxs(Typography, { variant: "body2", sx: { fontSize: 12, mb: 0.25 }, children: [
                "• ",
                point
              ] }, idx)) })
            ] })
          ] }),
          activeConcepts.length > 0 && /* @__PURE__ */ jsxs(Fragment, { children: [
            /* @__PURE__ */ jsx(Divider, { sx: { my: 1 } }),
            /* @__PURE__ */ jsxs(Box, { sx: { mb: 1.5 }, children: [
              /* @__PURE__ */ jsx(Typography, { variant: "caption", sx: { fontWeight: 600, display: "block", mb: 0.5 }, children: "活跃概念" }),
              /* @__PURE__ */ jsx(Box, { sx: { display: "flex", flexWrap: "wrap", gap: 0.5 }, children: activeConcepts.map((concept, idx) => /* @__PURE__ */ jsx(
                Chip,
                {
                  size: "small",
                  label: concept,
                  variant: "outlined",
                  sx: { height: 18, fontSize: 11 }
                },
                idx
              )) })
            ] })
          ] }),
          ((selfNarrative == null ? void 0 : selfNarrative.thought) || (selfNarrative == null ? void 0 : selfNarrative.feeling)) && /* @__PURE__ */ jsxs(Fragment, { children: [
            /* @__PURE__ */ jsx(Divider, { sx: { my: 1 } }),
            /* @__PURE__ */ jsxs(Box, { sx: { mb: 1.5 }, children: [
              /* @__PURE__ */ jsx(Typography, { variant: "caption", sx: { fontWeight: 600, display: "block", mb: 0.5 }, children: "内在状态" }),
              /* @__PURE__ */ jsxs(Box, { sx: { pl: 2, display: "flex", flexDirection: "column", gap: 0.25 }, children: [
                selfNarrative.thought && /* @__PURE__ */ jsxs(Typography, { variant: "body2", sx: { fontSize: 12 }, children: [
                  /* @__PURE__ */ jsx("span", { style: { opacity: 0.7 }, children: "想法：" }),
                  selfNarrative.thought
                ] }),
                selfNarrative.feeling && /* @__PURE__ */ jsxs(Typography, { variant: "body2", sx: { fontSize: 12 }, children: [
                  /* @__PURE__ */ jsx("span", { style: { opacity: 0.7 }, children: "感受：" }),
                  selfNarrative.feeling
                ] })
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsx(Divider, { sx: { my: 1 } }),
          /* @__PURE__ */ jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }, children: [
            /* @__PURE__ */ jsx(default_1$8, { sx: { fontSize: 14 } }),
            /* @__PURE__ */ jsxs(Typography, { variant: "caption", sx: { fontSize: 11 }, children: [
              "情绪：",
              MOOD_LABELS[moodLabel] || moodLabel
            ] }),
            /* @__PURE__ */ jsxs(Typography, { variant: "caption", sx: { fontSize: 11, opacity: 0.7 }, children: [
              "活动度：",
              (activity * 100).toFixed(0),
              "%"
            ] }),
            brainState.active_goal && /* @__PURE__ */ jsxs(Typography, { variant: "caption", sx: { fontSize: 11, opacity: 0.7 }, children: [
              "目标：",
              brainState.active_goal
            ] })
          ] })
        ] }) })
      ]
    }
  );
}
const RULES = [
  // 顺序即优先级，首个命中返回
  { name: "问候/告别", re: /^\s*(?:你好|您好|嗨|哈喽|哈啰|hi|hello|hey|早安|早上好|晚安|晚上好|拜拜|再见|在吗|在不在)/i, actionId: "wave" },
  { name: "负面共情", re: /难过|伤心|想哭|哭了|哭死|呜呜|好累|累死|压力|emo|好烦|烦死|生气|气死|倒霉|难受|委屈|失恋|分手|加班|生病|好疼|好痛|睡不着/i, actionId: "nod" },
  { name: "亲昵表白", re: /喜欢你|爱你|想你|抱抱|亲亲|贴贴|好可爱|真可爱|太可爱|可爱死/i, actionId: "block" },
  { name: "夸赞感谢", re: /好棒|真棒|厉害|聪明|贴心|温柔|谢谢你|感谢|夸|乖/i, actionId: "nod" },
  { name: "唤名唤起", re: /琳云|琳奈|云云|小琳|琳琳|奈奈/i, actionId: "turnHead" }
];
function classifyListenerMotion(userText) {
  if (!userText || !userText.trim())
    return { actionId: null };
  const t = userText.trim().slice(0, 120);
  for (const rule of RULES) {
    if (rule.re.test(t))
      return { actionId: rule.actionId, reason: rule.name };
  }
  return { actionId: null };
}
const ASR_WS = "ws://127.0.0.1:28001";
class LocalAsrClient {
  constructor() {
    __publicField(this, "ws", null);
    __publicField(this, "stream", null);
    __publicField(this, "ctx", null);
    __publicField(this, "proc", null);
    __publicField(this, "running", false);
    __publicField(this, "generation", 0);
  }
  get isActive() {
    return this.running && !!this.ws && this.ws.readyState === WebSocket.OPEN;
  }
  async start(handlers) {
    this.stop();
    const gen = ++this.generation;
    return new Promise((resolve) => {
      try {
        const ws = new WebSocket(ASR_WS);
        this.ws = ws;
        ws.binaryType = "arraybuffer";
        ws.onopen = async () => {
          try {
            if (gen !== this.generation) {
              try {
                ws.close();
              } catch {
              }
              resolve(false);
              return;
            }
            const stream = await navigator.mediaDevices.getUserMedia({
              audio: { sampleRate: 16e3, channelCount: 1, echoCancellation: true, noiseSuppression: true }
            });
            if (gen !== this.generation) {
              stream.getTracks().forEach((t) => t.stop());
              try {
                ws.close();
              } catch {
              }
              resolve(false);
              return;
            }
            this.stream = stream;
            const ctx = new AudioContext({ sampleRate: 16e3 });
            this.ctx = ctx;
            const source = ctx.createMediaStreamSource(stream);
            const proc = ctx.createScriptProcessor(4096, 1, 1);
            this.proc = proc;
            source.connect(proc);
            proc.connect(ctx.destination);
            let lastVoiceAt = 0;
            proc.onaudioprocess = (e) => {
              if (!this.ws || this.ws.readyState !== WebSocket.OPEN)
                return;
              const input = e.inputBuffer.getChannelData(0);
              let peak = 0;
              for (let i = 0; i < input.length; i++) {
                const a = Math.abs(input[i]);
                if (a > peak)
                  peak = a;
              }
              const now = Date.now();
              if (peak > 0.015)
                lastVoiceAt = now;
              else if (lastVoiceAt && now - lastVoiceAt >= 1200) {
                try {
                  this.ws.send(JSON.stringify({ eof: 1 }));
                } catch {
                }
                lastVoiceAt = 0;
              }
              const buf = new Int16Array(input.length);
              for (let i = 0; i < input.length; i++) {
                const v = Math.max(-1, Math.min(1, input[i]));
                buf[i] = Math.max(-32768, Math.min(32767, v * 32768));
              }
              this.ws.send(buf.buffer);
            };
            this.running = true;
            resolve(true);
          } catch (e) {
            handlers.onError && handlers.onError(String((e == null ? void 0 : e.message) || e));
            resolve(false);
          }
        };
        ws.onmessage = (ev) => {
          try {
            const d = JSON.parse(ev.data);
            const t = String(d.text || "").trim();
            if (!t)
              return;
            if (d.final)
              handlers.onFinal(t);
            else
              handlers.onInterim && handlers.onInterim(t);
          } catch {
          }
        };
        ws.onerror = () => {
          handlers.onError && handlers.onError("ASR 服务连接失败");
          resolve(false);
        };
        ws.onclose = () => {
          if (this.running && gen === this.generation) {
            setTimeout(() => {
              if (this.running && gen === this.generation)
                this.start(handlers);
            }, 800);
          }
        };
        setTimeout(() => {
          if (ws.readyState === WebSocket.CONNECTING) {
            try {
              ws.close();
            } catch {
            }
            resolve(false);
          }
        }, 2500);
      } catch {
        resolve(false);
      }
    });
  }
  stop() {
    this.running = false;
    this.generation++;
    if (this.proc) {
      try {
        this.proc.disconnect();
      } catch {
      }
      this.proc = null;
    }
    if (this.ctx) {
      try {
        this.ctx.close();
      } catch {
      }
      this.ctx = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    if (this.ws) {
      const ws = this.ws;
      this.ws = null;
      try {
        ws.send(JSON.stringify({ eof: 1 }));
      } catch {
      }
      setTimeout(() => {
        try {
          ws.close();
        } catch {
        }
      }, 200);
    }
  }
}
const CTRL_URL = "http://127.0.0.1:5175/api/speech-bridge/control";
const FINAL_URL = "http://127.0.0.1:5175/api/speech-bridge/final";
const STATUS_URL = "http://127.0.0.1:5175/api/speech-bridge/status";
class SpeechManager {
  constructor() {
    __publicField(this, "handlers", /* @__PURE__ */ new Set());
    __publicField(this, "stateHandlers", /* @__PURE__ */ new Set());
    __publicField(this, "timer", null);
    __publicField(this, "statusTimer", null);
    __publicField(this, "after", 0);
    __publicField(this, "state", "stopped");
    __publicField(this, "lang", "zh-CN");
    __publicField(this, "skipPending", false);
    __publicField(this, "status", { listening: false, micOk: false });
    __publicField(this, "localAsr", new LocalAsrClient());
    __publicField(this, "useLocal", true);
  }
  getState() {
    return this.state;
  }
  getStatus() {
    return { ...this.status };
  }
  subscribe(handler) {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }
  /** UI 状态订阅：running/muted/stopped + Edge 侧 listening/micOk */
  onState(handler) {
    this.stateHandlers.add(handler);
    handler(this.state, this.getStatus());
    return () => {
      this.stateHandlers.delete(handler);
    };
  }
  emitState() {
    this.stateHandlers.forEach((h) => {
      try {
        h(this.state, this.getStatus());
      } catch (e) {
        console.warn(e);
      }
    });
  }
  async start(lang) {
    this.lang = lang || this.lang || "zh-CN";
    this.state = "running";
    let localOk = false;
    try {
      localOk = await this.localAsr.start({
        onFinal: (text) => {
          if (this.state !== "running")
            return;
          if (this.skipPending) {
            this.skipPending = false;
            return;
          }
          console.log("[SpeechManager] local-final", text);
          const item = { id: Date.now(), ts: Date.now(), text, lang: this.lang };
          this.handlers.forEach((h) => {
            try {
              h(text, item);
            } catch (e) {
              console.warn(e);
            }
          });
        },
        onInterim: () => {
          this.status = { ...this.status, listening: true, micOk: true };
        },
        onError: (m) => {
          console.warn("[SpeechManager] local ASR err", m);
        }
      });
    } catch (e) {
      console.warn("[SpeechManager] local ASR start fail", e);
      localOk = false;
    }
    this.useLocal = localOk;
    if (localOk) {
      this.status = { listening: true, micOk: true, error: "", lang: this.lang };
      this.emitState();
      return;
    }
    await this.pushControl({ enabled: true, muted: false, lang: this.lang });
    try {
      const api = window.speechBridge;
      if (api && api.start)
        await api.start(this.lang);
    } catch (e) {
      console.warn("[SpeechManager] start IPC fail", e);
    }
    if (!this.timer)
      this.timer = setInterval(() => {
        this.poll();
      }, 300);
    if (!this.statusTimer)
      this.statusTimer = setInterval(() => {
        this.pollStatus();
      }, 1500);
    this.poll();
    this.pollStatus();
    this.emitState();
  }
  async mute() {
    if (this.state === "stopped")
      return;
    this.state = "muted";
    if (this.useLocal) {
      this.localAsr.stop();
      this.status = { ...this.status, listening: false };
    } else {
      await this.pushControl({ enabled: true, muted: true });
      try {
        const api = window.speechBridge;
        if (api && api.setControl)
          await api.setControl({ enabled: true, muted: true });
      } catch {
      }
    }
    this.emitState();
  }
  async unmute() {
    if (this.state === "stopped")
      return;
    if (this.useLocal) {
      this.state = "running";
      await this.localAsr.start({
        onFinal: (text) => {
          if (this.state !== "running")
            return;
          if (this.skipPending) {
            this.skipPending = false;
            return;
          }
          console.log("[SpeechManager] local-final", text);
          const item = { id: Date.now(), ts: Date.now(), text, lang: this.lang };
          this.handlers.forEach((h) => {
            try {
              h(text, item);
            } catch (e) {
              console.warn(e);
            }
          });
        }
      });
      this.status = { listening: true, micOk: true, error: "", lang: this.lang };
      this.emitState();
      return;
    }
    this.state = "running";
    await this.pushControl({ enabled: true, muted: false, lang: this.lang });
    try {
      const api = window.speechBridge;
      if (api && api.setControl)
        await api.setControl({ enabled: true, muted: false, lang: this.lang });
    } catch {
    }
    this.emitState();
  }
  interrupt() {
    this.skipPending = true;
    console.log("[SpeechManager] interrupt → 丢弃未消费 final");
  }
  async stop() {
    this.state = "stopped";
    this.localAsr.stop();
    this.useLocal = true;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.statusTimer) {
      clearInterval(this.statusTimer);
      this.statusTimer = null;
    }
    await this.pushControl({ enabled: false, muted: false });
    try {
      const api = window.speechBridge;
      if (api && api.stop)
        await api.stop();
    } catch {
    }
    this.handlers.clear();
    this.status = { listening: false, micOk: false };
    this.emitState();
  }
  async pushControl(patch) {
    try {
      await fetch(CTRL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch)
      });
    } catch {
    }
  }
  async pollStatus() {
    try {
      const r = await fetch(STATUS_URL, { cache: "no-store" });
      if (!r.ok)
        return;
      const d = await r.json();
      if (!d || !d.ok)
        return;
      const next = {
        listening: !!d.listening,
        micOk: !!d.micOk,
        error: d.error || "",
        lang: d.lang || this.lang
      };
      const changed = next.listening !== this.status.listening || next.micOk !== this.status.micOk || next.error !== this.status.error;
      this.status = next;
      if (changed)
        this.emitState();
    } catch {
    }
  }
  async poll() {
    if (this.state === "stopped")
      return;
    try {
      const r = await fetch(FINAL_URL + "?after=" + this.after, { cache: "no-store" });
      if (!r.ok)
        return;
      const data = await r.json();
      if (!data || !data.ok || !Array.isArray(data.items))
        return;
      if (this.skipPending) {
        for (const it of data.items)
          this.after = Math.max(this.after, Number(it.id) || 0);
        this.skipPending = false;
        return;
      }
      if (this.state === "muted") {
        for (const it of data.items)
          this.after = Math.max(this.after, Number(it.id) || 0);
        return;
      }
      for (const it of data.items) {
        this.after = Math.max(this.after, Number(it.id) || 0);
        const t = String(it.text || "").trim();
        if (!t)
          continue;
        console.log("[SpeechManager] final #" + it.id, t);
        this.handlers.forEach((h) => {
          try {
            h(t, it);
          } catch (e) {
            console.warn(e);
          }
        });
      }
    } catch {
    }
  }
}
const speechManager = new SpeechManager();
function appendText(base, newText) {
  if (!newText)
    return base;
  if (!base)
    return newText;
  if (base.endsWith(newText))
    return base;
  if (newText.startsWith(base))
    return newText;
  return base + newText;
}
function useSpeechRecognition(inputRef) {
  const [isListening, setIsListening] = reactExports.useState(false);
  const [interimText, setInterimText] = reactExports.useState("");
  const [speechError, setSpeechError] = reactExports.useState("");
  const unsubRef = reactExports.useRef(null);
  const writingRef = reactExports.useRef(false);
  reactExports.useEffect(() => {
    const off = speechManager.onState((state, status) => {
      if (!writingRef.current) {
        setIsListening(false);
        return;
      }
      setIsListening(state === "running" && status.listening);
      if (status.error)
        setSpeechError(status.error);
      else if (state === "muted")
        setSpeechError("麦克风已静音");
      else
        setSpeechError("");
    });
    return () => {
      off();
    };
  }, []);
  const start = reactExports.useCallback(async () => {
    setSpeechError("");
    writingRef.current = true;
    if (!unsubRef.current) {
      unsubRef.current = speechManager.subscribe((text) => {
        if (!writingRef.current)
          return;
        const el = inputRef.current;
        if (!el)
          return;
        const base = el.value || "";
        el.value = appendText(base, text);
        setInterimText("");
        try {
          el.dispatchEvent(new Event("input", { bubbles: true }));
        } catch {
        }
      });
    }
    await speechManager.start("zh-CN");
    setIsListening(true);
  }, [inputRef]);
  const stop = reactExports.useCallback(() => {
    writingRef.current = false;
    if (unsubRef.current) {
      try {
        unsubRef.current();
      } catch {
      }
      unsubRef.current = null;
    }
    if (speechManager.getState() !== "stopped")
      ;
    setIsListening(false);
    setInterimText("");
  }, []);
  return { isListening, interimText, speechError, start, stop };
}
const LOCAL_TTS_URL = "http://127.0.0.1:9881";
const LOCAL_TTS_PROBE_TIMEOUT = 800;
class ChineseFemaleTTS {
  constructor() {
    __publicField(this, "synth", null);
    __publicField(this, "voice", null);
    __publicField(this, "voicesReady", false);
    // 本地 TTS 服务可用性缓存（避免每次播报都探测）
    __publicField(this, "localTTSAvailable", null);
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      this.synth = window.speechSynthesis;
      this.loadVoices();
      this.synth.onvoiceschanged = () => this.loadVoices();
    }
  }
  /**
   * 加载并选择最佳中文女声
   * 优先级：Win11 晓晓神经女声 > 瑶瑶 > 慧慧 > 任意中文女声
   */
  loadVoices() {
    if (!this.synth)
      return;
    const voices = this.synth.getVoices();
    if (voices.length === 0)
      return;
    const preferredFemale = [
      "Microsoft Xiaoxiao (Natural)",
      // Win11 神经女声，接近真人
      "Microsoft Yaoyao Desktop",
      // Win10 中文女声
      "Microsoft Huihui Desktop",
      // Win7/8/10 中文女声
      "Microsoft Yaoyao",
      "Microsoft Huihui",
      "Microsoft Zira"
      // 英文女声（兜底）
    ];
    for (const name of preferredFemale) {
      const v = voices.find((v2) => v2.name === name && v2.lang && v2.lang.startsWith("zh"));
      if (v) {
        this.voice = v;
        this.voicesReady = true;
        return;
      }
    }
    const zhVoice = voices.find((v) => v.lang && v.lang.startsWith("zh"));
    if (zhVoice) {
      this.voice = zhVoice;
      this.voicesReady = true;
      console.log("[TTS] 使用系统中文语音:", zhVoice.name);
    }
  }
  /**
   * 探测本地 TTS 服务（Edge-TTS 晓晓女声）是否可用
   * 缓存结果，避免每次播报都发探测请求
   */
  async probeLocalTTS() {
    if (this.localTTSAvailable !== null)
      return this.localTTSAvailable;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), LOCAL_TTS_PROBE_TIMEOUT);
      const resp = await fetch(`${LOCAL_TTS_URL}/health`, {
        signal: controller.signal
      });
      clearTimeout(timer);
      this.localTTSAvailable = resp.ok;
      if (this.localTTSAvailable) {
        console.log("[TTS] 检测到本地 Edge-TTS 女声服务（晓晓），将优先使用");
      }
    } catch {
      this.localTTSAvailable = false;
    }
    return this.localTTSAvailable;
  }
  /**
   * 通过本地 TTS 服务合成语音（Edge-TTS 晓晓神经女声，接近真人）
   * 注：该端口同样兼容 Sherpa-ONNX 开源 TTS（vits-melo-tts-zh_en），
   *     若用户自行启动 sherpa tts_server.py 也可直接使用
   */
  async speakViaLocalTTS(text, speed = 1, pitch = 1) {
    try {
      let url = `${LOCAL_TTS_URL}/tts?text=${encodeURIComponent(text)}&speed=${speed}`;
      if (pitch !== 1) {
        const hz = Math.round((pitch - 1) * 20);
        url += `&pitch=${hz >= 0 ? "+" : ""}${hz}Hz`;
      }
      const resp = await fetch(url);
      if (!resp.ok)
        return false;
      const blob = await resp.blob();
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      audio.onended = () => URL.revokeObjectURL(audioUrl);
      await audio.play();
      return true;
    } catch {
      return false;
    }
  }
  /**
   * 通过浏览器 SpeechSynthesis 合成语音（系统女声，零依赖）
   */
  speakViaWebSpeech(text, speed = 1, pitch = 1) {
    return new Promise((resolve) => {
      if (!this.synth) {
        resolve(false);
        return;
      }
      try {
        const utter = new SpeechSynthesisUtterance(text);
        if (this.voice)
          utter.voice = this.voice;
        utter.lang = "zh-CN";
        utter.rate = speed;
        utter.pitch = pitch;
        utter.volume = 1;
        utter.onend = () => resolve(true);
        utter.onerror = () => resolve(false);
        this.synth.cancel();
        this.synth.speak(utter);
      } catch {
        resolve(false);
      }
    });
  }
  /**
   * 播报文本（对外接口）
   * 优先本地 Edge-TTS 晓晓女声，回退系统女声
   *
   * @param text 要播报的文本
   * @param options.speed 语速（0.5-2.0，默认1.0）
   * @param options.pitch 音调（0-2，默认1.0；本地 Edge-TTS 与系统语音回退均生效）
   * @returns true=播报成功
   */
  async speak(text, options) {
    if (!text || !text.trim())
      return false;
    const speed = (options == null ? void 0 : options.speed) ?? 1;
    const pitch = (options == null ? void 0 : options.pitch) ?? 1;
    if (await this.probeLocalTTS()) {
      const ok = await this.speakViaLocalTTS(text, speed, pitch);
      if (ok)
        return true;
    }
    return this.speakViaWebSpeech(text, speed, pitch);
  }
  /**
   * 停止播报
   */
  stop() {
    if (this.synth)
      this.synth.cancel();
  }
  /**
   * 是否就绪（至少有一种 TTS 方式可用）
   */
  isReady() {
    return this.voicesReady || this.localTTSAvailable === true;
  }
  /**
   * 获取当前使用的音色名称（用于调试/UI显示）
   */
  getVoiceName() {
    var _a;
    if (this.localTTSAvailable)
      return "Edge-TTS 晓晓（本地服务）";
    return ((_a = this.voice) == null ? void 0 : _a.name) ?? "未就绪";
  }
}
const ttsService = new ChineseFemaleTTS();
const aiResponseServiceRef = { current: null };
function md5Hex(input) {
  const S = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21];
  const K = [];
  for (let i = 0; i < 64; i++)
    K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296);
  const bytes = new TextEncoder().encode(input);
  let str = "";
  for (const b of bytes)
    str += String.fromCharCode(b);
  const bitLenLow = str.length * 8 >>> 0;
  let padded = str + String.fromCharCode(128);
  while (padded.length % 64 !== 56)
    padded += String.fromCharCode(0);
  for (let i = 0; i < 4; i++)
    padded += String.fromCharCode(bitLenLow >>> 8 * i & 255);
  for (let i = 0; i < 4; i++)
    padded += String.fromCharCode(0);
  const words = [];
  for (let i = 0; i < padded.length / 4; i++)
    words[i] = padded.charCodeAt(i * 4) & 255 | (padded.charCodeAt(i * 4 + 1) & 255) << 8 | (padded.charCodeAt(i * 4 + 2) & 255) << 16 | (padded.charCodeAt(i * 4 + 3) & 255) << 24;
  let a0 = 1732584193, b0 = 4023233417, c0 = 2562383102, d0 = 271733878;
  for (let i = 0; i < words.length / 16; i++) {
    const m = words.slice(i * 16, i * 16 + 16);
    let a = a0, b = b0, c = c0, d = d0;
    for (let j = 0; j < 64; j++) {
      let f, g;
      if (j < 16) {
        f = b & c | ~b & d;
        g = j;
      } else if (j < 32) {
        f = d & b | ~d & c;
        g = (5 * j + 1) % 16;
      } else if (j < 48) {
        f = b ^ c ^ d;
        g = (3 * j + 5) % 16;
      } else {
        f = c ^ (b | ~d);
        g = 7 * j % 16;
      }
      f = f + a + K[j] + m[g] >>> 0;
      a = d;
      d = c;
      c = b;
      b = b + (f << S[j] | f >>> 32 - S[j]) >>> 0;
    }
    a0 = a0 + a >>> 0;
    b0 = b0 + b >>> 0;
    c0 = c0 + c >>> 0;
    d0 = d0 + d >>> 0;
  }
  const hex = (n) => {
    let o = "";
    for (let i = 0; i < 4; i++)
      o += (n >>> 8 * i & 255).toString(16).padStart(2, "0");
    return o;
  };
  return hex(a0) + hex(b0) + hex(c0) + hex(d0);
}
function HomePage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isDarkMode = theme.palette.mode === "dark";
  const [messagesByAI, setMessagesByAI] = reactExports.useState({
    "阮琳云": [{
      id: "1",
      text: "主人好！我是阮琳云，有什么可以帮助您的吗？",
      sender: "ai",
      time: (/* @__PURE__ */ new Date()).toLocaleTimeString()
    }]
  });
  reactExports.useEffect(() => {
    console.log("[HomePage] AI 进化框架已禁用（自由思考关闭）");
    return;
  }, []);
  const selectedAI = "阮琳云";
  const inputRef = reactExports.useRef(null);
  const [pendingFiles, setPendingFiles] = reactExports.useState([]);
  const triggerPendingAdd = () => {
    const inp = document.createElement("input");
    inp.type = "file";
    inp.multiple = true;
    inp.accept = "image/*,.pdf,.doc,.docx,.txt,.md";
    inp.onchange = async () => {
      const fs2 = Array.from(inp.files || []);
      for (const f of fs2) {
        if (f.type.startsWith("image/")) {
          const dataUrl = await readImageAsDataURL(f);
          setPendingFiles((p) => [...p, { file: f, kind: "image", dataUrl }]);
        } else {
          setPendingFiles((p) => [...p, { file: f, kind: "document" }]);
        }
      }
    };
    inp.click();
  };
  const sendingLockRef = reactExports.useRef(false);
  const hadMotionRef = reactExports.useRef(false);
  const lastListenerAtRef = reactExports.useRef(0);
  const [isLoading, setIsLoading] = reactExports.useState(false);
  const [anchorEl, setAnchorEl] = reactExports.useState(null);
  const [menuView, setMenuView] = reactExports.useState("grid");
  const [loadingProgress, setLoadingProgress] = reactExports.useState(0);
  const [loadingMessage, setLoadingMessage] = reactExports.useState("");
  const [showCopySuccess, setShowCopySuccess] = reactExports.useState(false);
  const [isCallActive, setIsCallActive] = reactExports.useState(false);
  const [callDuration, setCallDuration] = reactExports.useState(0);
  const [callMuted, setCallMuted] = reactExports.useState(false);
  const [callSpeakerOn, setCallSpeakerOn] = reactExports.useState(true);
  const [callPhase, setCallPhase] = reactExports.useState("idle");
  const [callInterimText, setCallInterimText] = reactExports.useState("");
  const [callNotice, setCallNotice] = reactExports.useState("");
  const callRecognitionRef = reactExports.useRef(null);
  const callListeningRef = reactExports.useRef(false);
  const isAITalkingRef = reactExports.useRef(false);
  const callMutedRef = reactExports.useRef(false);
  const callSpeakerOnRef = reactExports.useRef(true);
  const callEndingRef = reactExports.useRef(false);
  const callHistoryRef = reactExports.useRef([]);
  const isCallActiveRef = reactExports.useRef(false);
  const aiModePrefRef = reactExports.useRef("api");
  const [previewImage, setPreviewImage] = reactExports.useState(null);
  const messagesEndRef = reactExports.useRef(null);
  const [aiModePref, setAiModePref] = reactExports.useState(() => {
    const v = localStorage.getItem("rly_ai_mode_pref");
    return v === "builtin" || v === "api" || v === "brain" ? v : "api";
  });
  const scrollToBottom = () => {
    var _a;
    (_a = messagesEndRef.current) == null ? void 0 : _a.scrollIntoView({ behavior: "smooth" });
  };
  reactExports.useEffect(() => {
    scrollToBottom();
  }, [messagesByAI, selectedAI]);
  reactExports.useEffect(() => {
    llmApiService.init();
  }, []);
  reactExports.useEffect(() => {
    apiConfigService.waitReady().catch(() => {
    });
  }, []);
  reactExports.useEffect(() => {
    const loadHistory = async () => {
      var _a;
      try {
        const host = typeof window !== "undefined" && window.location && window.location.hostname || "127.0.0.1";
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5e3);
        const resp = await fetch(`http://${host}:27865/api/v1/ai/history/default`, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!resp.ok)
          return;
        const data = await resp.json();
        const messages = (_a = data == null ? void 0 : data.data) == null ? void 0 : _a.messages;
        if (Array.isArray(messages) && messages.length > 0) {
          const restored = messages.map((msg, idx) => ({
            id: `restored_${idx}_${Date.now()}`,
            text: msg.content,
            sender: msg.role === "user" ? "user" : "ai",
            time: msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : (/* @__PURE__ */ new Date()).toLocaleTimeString()
          }));
          setMessagesByAI((prev) => ({ ...prev, "阮琳云": restored }));
          console.log(`[HomePage] 已从后端恢复 ${restored.length} 条聊天记录`);
        }
      } catch (err) {
        console.warn("[HomePage] 拉取聊天记录失败（后端可能未启动）:", err);
      }
    };
    loadHistory();
  }, []);
  reactExports.useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("ruanlinyun_main_chat") || "null");
      if (saved && typeof saved === "object") {
        setMessagesByAI((prev) => {
          const merged = { ...prev };
          for (const k of Object.keys(saved)) {
            const cur = merged[k] || [];
            const have = new Set(cur.map((m) => m.id));
            merged[k] = [...cur, ...(saved[k] || []).filter((m) => !have.has(m.id))];
          }
          return merged;
        });
      }
      const unified = JSON.parse(localStorage.getItem("ruanlinyun_unified_messages") || "[]");
      if (unified.length) {
        setMessagesByAI((prev) => {
          const cur = prev["阮琳云"] || [];
          const have = new Set(cur.map((m) => m.id));
          const add = unified.filter((m) => !have.has(m.id)).map((m) => ({
            id: m.id,
            text: m.text,
            sender: m.sender === "me" ? "user" : "ai",
            time: m.time
          }));
          return add.length ? { ...prev, "阮琳云": [...cur, ...add] } : prev;
        });
        localStorage.removeItem("ruanlinyun_unified_messages");
      }
    } catch {
    }
  }, []);
  reactExports.useEffect(() => {
    try {
      localStorage.setItem("ruanlinyun_main_chat", JSON.stringify(messagesByAI));
      const arr = JSON.parse(localStorage.getItem("ruanlinyun_unified_messages") || "[]");
      const last = (messagesByAI["阮琳云"] || []).slice(-1)[0];
      if (last && !arr.some((m) => m.id === last.id)) {
        arr.push({ id: last.id, text: last.text, sender: last.sender === "user" ? "me" : "ai", time: last.time });
        while (arr.length > 200)
          arr.shift();
        localStorage.setItem("ruanlinyun_unified_messages", JSON.stringify(arr));
        try {
          window.dispatchEvent(new Event("ruanlinyun_unified_msg"));
        } catch {
        }
      }
    } catch {
    }
  }, [messagesByAI]);
  const persistMessage = async (role, content) => {
    try {
      const host = typeof window !== "undefined" && window.location && window.location.hostname || "127.0.0.1";
      await fetch(`http://${host}:27865/api/v1/ai/history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: "default", role, content })
      });
    } catch (err) {
      console.warn("[HomePage] 持久化消息失败:", err);
    }
  };
  reactExports.useEffect(() => {
    if (!isCallActive)
      return;
    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1e3);
    return () => clearInterval(timer);
  }, [isCallActive]);
  const formatCallDuration = (sec) => {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };
  reactExports.useEffect(() => {
    isCallActiveRef.current = isCallActive;
  }, [isCallActive]);
  reactExports.useEffect(() => {
    aiModePrefRef.current = aiModePref;
  }, [aiModePref]);
  const MOTION_PROTOCOL = [
    "[动作能力] 你可以用 [MOTION]标签[/MOTION] 控制角色动作。标签内容为 JSON：",
    '{"petAction":"动作名"}——内置动作：wave挥手 nod点头 shake摇头 block遮挡害羞 turnHead转头 turnBody转身 squat蹲下 stretch伸懒腰 turnLeft左转 turnRight右转 jump跳跃 reset恢复站姿 tiltHead歪头 bow鞠躬 clap鼓掌 spreadHands摊手 thumbsUp竖拇指 comeHere招手过来 refuse摆手不要 standUp起身 bendForward弯腰 lookUp仰头 lookDown低头 legKick踢腿 point指向 offerHand伸手 bounce弹跳 stomp跺脚 cheer欢呼 approach走近',
    '多个动作顺序执行：{"petActions":["wave","nod"]}',
    '示例：用户说"跳一下"→你回复：好呀，看我跳～[MOTION]{"petAction":"jump"}[/MOTION]',
    '示例：用户说"恢复/站好/放下手"→你回复：好的，恢复啦～[MOTION]{"petAction":"reset"}[/MOTION]',
    '进阶（想精细控制时用）：带参数动作 [MOTION]{"hub":{"action":"动作名","params":{...}}}[/MOTION]，参数都是真生效的：wave幅度amplitude(0-1)频率freq(0.5-4Hz)时长duration(秒,说几秒挥几秒)侧别side(left/right/both双手齐挥)；nod/shake角度angle(°)次数count(一次连贯完成)；turnHead/turnBody角度angle(°负左正右)；squat深度depth(0-1)；jump高度height(米)；节奏timing(quick急促/normal标准/smooth柔缓,适用于nod/shake/转头/转身/蹲/伸懒腰/歪头)；tiltHead侧side+角angle(0-25)；bow深度depth+时长duration(秒)；clap次数count+速度speed(slow/normal/quick)；thumbsUp/comeHere/refuse侧side+hold/count；bendForward角angle(5-90°)+保持hold(秒)；legKick侧side+力度power(0-1)；point方向dir(up/down/left/right)+保持hold',
    '组合配方（一整段连贯表达，用 [MOTION]{"hub":{"action":"配方id"}}[/MOTION] 整段调用）：greet打招呼 shyGreet害羞问好 celebrate庆祝 comfort安慰 deny拒绝 think思考 sleepy困了 excited兴奋 invite邀约(招手+伸手+弹跳) tantrum生气跺脚——具体可用清单以注入的配方列表为准',
    '新动作映射规则（重要）：库里没有的动作不许瞎配——①转圈/原地转/旋转→hub的spin，参数turns=圈数(0.5-3)、dir=left/right；②抬/举某只手或某条腿→hub的limbRaise，参数side=left/right/both、limb=arm/leg、height=高度(0.3-0.9)；③严禁按字面撞车：用户说"左腿/右腿"是腿不是转体，绝不能用turnLeft/turnRight替代',
    '规则：仅当用户明确要求做动作时（"跳一下/挥挥手/转个圈/抬腿"等祈使指令），才在回复最末尾附一个 MOTION 标签并正常简短回复；一条回复最多 2 个标签。',
    "额外说明：日常聊天里用户问候你/夸你/说难过事时，角色会自动点头、挥手、害羞遮挡等情绪反馈——那是自动的，你不需要为此输出 MOTION 标签，只需正常回话，避免动作重复。"
  ].join("\n");
  const recipesProtocolRef = reactExports.useRef("");
  reactExports.useEffect(() => {
    fetch("http://127.0.0.1:9877/api/recipes").then((r) => r.json()).then((d) => {
      if (!(d == null ? void 0 : d.success) || !Array.isArray(d.recipes))
        return;
      const usable = d.recipes.filter((r) => r.runnable);
      if (!usable.length)
        return;
      recipesProtocolRef.current = '\n当前可用配方（整段调用："hub":{"action":"配方id"}）：' + usable.map((r) => `${r.id}=${r.label}${r.verified ? "" : "(未验证)"}`).join("、") + "。";
      console.log("[MOTION] 配方注入提示词:", recipesProtocolRef.current.slice(0, 150));
    }).catch(() => {
    });
  }, []);
  const parseAndDispatchMotion = reactExports.useCallback((text) => {
    hadMotionRef.current = false;
    if (!text)
      return text;
    const dispatchCmd = (cmd) => {
      if (typeof cmd.petAction === "string") {
        hadMotionRef.current = true;
        console.log("[MOTION] 派发动作:", cmd.petAction);
        post("http://127.0.0.1:27865/api/v1/joint-control/pet-action", { actionId: cmd.petAction, source: "ai-chat" });
      } else if (Array.isArray(cmd.petActions)) {
        hadMotionRef.current = true;
        console.log("[MOTION] 派发动作序列:", cmd.petActions.join(" → "));
        cmd.petActions.forEach((aid, idx) => {
          setTimeout(() => post("http://127.0.0.1:27865/api/v1/joint-control/pet-action", { actionId: aid, source: "ai-chat" }), idx * 1200);
        });
      } else if (cmd.hub) {
        hadMotionRef.current = true;
        post("http://127.0.0.1:9877/api/motion/request", { mode: "param", ...cmd.hub });
      }
    };
    const post = (url, body) => {
      try {
        fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => {
        });
      } catch {
      }
    };
    let clean = text;
    if (text.includes("[MOTION]")) {
      const re = /\[MOTION\]([\s\S]*?)\[\/MOTION\]/g;
      let m;
      while ((m = re.exec(text)) !== null) {
        try {
          dispatchCmd(JSON.parse(m[1].trim()));
        } catch (e) {
          console.warn("[MOTION] 指令解析失败:", m[1], e);
        }
        clean = clean.replace(m[0], "");
      }
    } else {
      const bare = /\{\s*"petActions?"\s*:\s*(?:"[a-zA-Z]{1,20}"|\[\s*"[a-zA-Z]{1,20}"(?:\s*,\s*"[a-zA-Z]{1,20}")*\s*\])\s*\}/g;
      let m2;
      while ((m2 = bare.exec(text)) !== null) {
        try {
          dispatchCmd(JSON.parse(m2[0]));
          clean = clean.replace(m2[0], "");
        } catch {
        }
      }
      const bareHub = /\{\s*"hub"\s*:\s*\{\s*"action"\s*:\s*"[a-zA-Z]{1,20}"(?:\s*,\s*"params"\s*:\s*\{[^{}]{0,220}\})?\s*\}\s*\}/g;
      let m3;
      while ((m3 = bareHub.exec(text)) !== null) {
        try {
          dispatchCmd(JSON.parse(m3[0]));
          clean = clean.replace(m3[0], "");
        } catch {
        }
      }
    }
    if (clean === text)
      return text;
    return clean.replace(/\n{3,}/g, "\n\n").replace(/[，,]\s*$/, "").trim();
  }, []);
  const fireListenerMotion = reactExports.useCallback((userText) => {
    try {
      if (hadMotionRef.current)
        return;
      const verdict = classifyListenerMotion(userText || "");
      if (!verdict.actionId)
        return;
      const now = Date.now();
      if (now - lastListenerAtRef.current < 4e3)
        return;
      lastListenerAtRef.current = now;
      console.log(`[Listener] ${verdict.reason} → ${verdict.actionId}`);
      fetch("http://127.0.0.1:27865/api/v1/joint-control/pet-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionId: verdict.actionId, source: "listener" })
      }).catch(() => {
      });
    } catch (e) {
      console.warn("[Listener] 异常:", e);
    }
  }, []);
  async function callAIForCall(userText) {
    var _a, _b, _c;
    const mode = aiModePrefRef.current;
    const now = /* @__PURE__ */ new Date();
    const timeInfo = `[当前时间] ${now.toLocaleString("zh-CN", { hour12: false })}（${"日一二三四五六"[now.getDay()]}）`;
    const basePrompt = "你是阮琳云，一个友好、温暖的AI助手。你正在和用户进行语音通话，请用中文口语化回复，语气亲切自然，回答简洁（一般不超过3句话，适合语音播报）。";
    const motionSpec = MOTION_PROTOCOL + recipesProtocolRef.current;
    const systemPrompt = `${basePrompt}

${timeInfo}
请基于此时间回答时间相关问题，不要编造。${motionSpec}`;
    const history = callHistoryRef.current.slice(-20);
    if (mode === "brain") {
      return "抱歉，阮琳云AI本地离线模式正在升级中，请切换到调用API或Qwen2.5-3B模式再通话。";
    }
    if (mode === "api") {
      if (!llmApiService.isConfigured()) {
        return "API未配置，请在设置中配置并启用AI模型API，然后重试。";
      }
      try {
        return await llmApiService.askWithHistory(history, userText, systemPrompt);
      } catch (apiErr) {
        if (apiErr instanceof RateLimitError) {
          return "API调用频率超限，请稍等片刻再试。";
        }
        const errMsg = apiErr instanceof Error ? apiErr.message : String(apiErr);
        return `API调用失败：${errMsg}`;
      }
    }
    try {
      const messages = [
        { role: "system", content: systemPrompt },
        ...history,
        { role: "user", content: userText }
      ];
      const resp = await fetch("http://127.0.0.1:11434/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "qwen2.5-3b-instruct-q4_k_m",
          messages,
          max_tokens: 512,
          // 通话场景缩短：512 tokens 约3句话，减少本地模型生成时间
          temperature: 0.7,
          stream: false
        })
      });
      if (!resp.ok)
        throw new Error(`本地模型服务返回 HTTP ${resp.status}`);
      const data = await resp.json();
      const result = ((_c = (_b = (_a = data.choices) == null ? void 0 : _a[0]) == null ? void 0 : _b.message) == null ? void 0 : _c.content) ?? "";
      if (!result)
        throw new Error("本地模型返回空内容");
      return result;
    } catch (builtinErr) {
      const errMsg = builtinErr instanceof Error ? builtinErr.message : String(builtinErr);
      if (errMsg.includes("Failed to fetch")) {
        return "本地模型服务未启动，请双击 models 下的 start-qwen-server.bat 启动后再通话。";
      }
      if (errMsg.includes("503")) {
        return "本地模型正在处理上一条消息，请稍等几秒再试。";
      }
      return `本地模型调用失败：${errMsg}`;
    }
  }
  function stopCallRecognition() {
    callListeningRef.current = false;
    try {
      speechManager.stop();
    } catch {
    }
    setCallInterimText("");
  }
  async function processCallUserSpeech(userText) {
    if (callEndingRef.current)
      return;
    callHistoryRef.current.push({ role: "user", content: userText });
    if (callHistoryRef.current.length > 40) {
      callHistoryRef.current = callHistoryRef.current.slice(-40);
    }
    setCallPhase("thinking");
    isAITalkingRef.current = true;
    let aiReply = "";
    try {
      aiReply = await callAIForCall(userText);
    } catch (e) {
      aiReply = "抱歉，我暂时无法回答，请稍后再试。";
      console.warn("[通话] AI调用异常:", e);
    }
    if (callEndingRef.current) {
      isAITalkingRef.current = false;
      return;
    }
    callHistoryRef.current.push({ role: "assistant", content: aiReply });
    try {
      aiReply = parseAndDispatchMotion(aiReply);
    } catch (motionErr) {
      console.warn("[通话][MOTION] 分发异常:", motionErr);
    }
    fireListenerMotion(userText);
    setCallPhase("speaking");
    try {
      if (callSpeakerOnRef.current) {
        await ttsService.speak(aiReply, { speed: 1.05, pitch: 1 });
      } else {
        await new Promise((r) => setTimeout(r, 800));
      }
    } catch (e) {
      console.warn("[通话] TTS播报异常:", e);
    }
    if (callEndingRef.current) {
      isAITalkingRef.current = false;
      return;
    }
    isAITalkingRef.current = false;
    setCallInterimText("");
    setCallPhase("listening");
    startCallRecognition();
  }
  function startCallRecognition() {
    if (callEndingRef.current)
      return;
    if (isAITalkingRef.current)
      return;
    if (callMutedRef.current)
      return;
    if (callListeningRef.current)
      return;
    if (callRecognitionRef.current) {
      try {
        callRecognitionRef.current.stop();
      } catch {
      }
      callRecognitionRef.current = null;
    }
    let silenceTimer = null;
    const SILENCE_TRIGGER_MS = 800;
    let pending = "";
    const flush = () => {
      if (silenceTimer) {
        clearTimeout(silenceTimer);
        silenceTimer = null;
      }
      const text = pending.trim();
      pending = "";
      setCallInterimText("");
      if (!text)
        return;
      if (callEndingRef.current || isAITalkingRef.current)
        return;
      stopCallRecognition();
      processCallUserSpeech(text);
    };
    speechManager.start("zh-CN");
    if (!window.__homeSpeechUnsub) {
      window.__homeSpeechUnsub = speechManager.subscribe((t) => {
        if (isAITalkingRef.current || callMutedRef.current)
          return;
        setCallInterimText(t);
        pending = pending ? pending + t : t;
        if (silenceTimer)
          clearTimeout(silenceTimer);
        silenceTimer = setTimeout(flush, SILENCE_TRIGGER_MS);
      });
    }
    callRecognitionRef.current = { stop: () => speechManager.stop() };
    callListeningRef.current = true;
    setCallPhase("listening");
    setCallNotice("Edge 语音识别已连接");
  }
  const handleEndCall = () => {
    callEndingRef.current = true;
    stopCallRecognition();
    try {
      ttsService.stop();
    } catch {
    }
    isAITalkingRef.current = false;
    setIsCallActive(false);
    setCallDuration(0);
    setCallMuted(false);
    setCallSpeakerOn(true);
    setCallPhase("idle");
    setCallInterimText("");
    setCallNotice("");
    callMutedRef.current = false;
    callSpeakerOnRef.current = true;
    setTimeout(() => {
      callEndingRef.current = false;
    }, 500);
  };
  const toggleCallMuted = () => {
    const next = !callMuted;
    setCallMuted(next);
    callMutedRef.current = next;
    if (next) {
      stopCallRecognition();
      setCallPhase("idle");
    } else {
      if (!isAITalkingRef.current && !callEndingRef.current && isCallActiveRef.current) {
        startCallRecognition();
      }
    }
  };
  const toggleCallSpeaker = () => {
    const next = !callSpeakerOn;
    setCallSpeakerOn(next);
    callSpeakerOnRef.current = next;
    if (!next) {
      try {
        ttsService.stop();
      } catch {
      }
    }
  };
  const ALLOWED_IMAGE_EXT = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".svg"];
  const ALLOWED_DOC_EXT = [
    ".txt",
    ".md",
    ".rtf",
    // 文本/笔记
    ".doc",
    ".docx",
    // Word
    ".pdf",
    // PDF
    ".xls",
    ".xlsx",
    ".csv",
    // Excel/表格
    ".ppt",
    ".pptx",
    // PowerPoint
    ".odt",
    ".ods",
    ".odp",
    // OpenDocument
    ".wps",
    ".et",
    ".dps",
    // WPS
    ".zip",
    ".rar",
    ".7z"
    // 压缩包（工作文件常用）
  ];
  const SCRIPT_BLACKLIST = [
    ".js",
    ".ts",
    ".tsx",
    ".jsx",
    ".mjs",
    ".cjs",
    ".py",
    ".pyc",
    ".pyw",
    ".sh",
    ".bash",
    ".zsh",
    ".bat",
    ".cmd",
    ".ps1",
    ".vbs",
    ".exe",
    ".msi",
    ".dll",
    ".so",
    ".dylib",
    ".php",
    ".rb",
    ".go",
    ".rs",
    ".java",
    ".class",
    ".jar",
    ".c",
    ".cpp",
    ".h",
    ".hpp",
    ".cs",
    ".swift"
  ];
  const getFileExt = (fileName) => {
    const idx = fileName.lastIndexOf(".");
    if (idx === -1)
      return "";
    return fileName.slice(idx).toLowerCase();
  };
  const formatFileSize = (bytes) => {
    if (bytes < 1024)
      return `${bytes} B`;
    if (bytes < 1024 * 1024)
      return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };
  const detectFileType = (file) => {
    const ext = getFileExt(file.name);
    if (!ext)
      return "rejected";
    if (SCRIPT_BLACKLIST.includes(ext))
      return "rejected";
    if (ALLOWED_IMAGE_EXT.includes(ext))
      return "image";
    if (ALLOWED_DOC_EXT.includes(ext))
      return "document";
    return "rejected";
  };
  const getDocumentIcon = (fileName) => {
    const ext = getFileExt(fileName);
    if (ext === ".pdf")
      return /* @__PURE__ */ jsx(default_1$i, {});
    if (ext === ".xls" || ext === ".xlsx" || ext === ".csv" || ext === ".et")
      return /* @__PURE__ */ jsx(default_1$j, {});
    if (ext === ".ppt" || ext === ".pptx" || ext === ".dps")
      return /* @__PURE__ */ jsx(default_1$k, {});
    if (ext === ".txt" || ext === ".md" || ext === ".rtf")
      return /* @__PURE__ */ jsx(default_1$l, {});
    if (ext === ".doc" || ext === ".docx" || ext === ".wps" || ext === ".odt")
      return /* @__PURE__ */ jsx(default_1$l, {});
    return /* @__PURE__ */ jsx(default_1$m, {});
  };
  const readImageAsDataURL = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  };
  const handleSend = async () => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j;
    if (sendingLockRef.current) {
      console.warn("[Chat] 上一条消息仍在处理中，忽略本次发送");
      return;
    }
    const text = ((_a = inputRef.current) == null ? void 0 : _a.value) ?? "";
    const hasPending = pendingFiles.length > 0;
    if (text.trim() === "" && !hasPending)
      return;
    const now = (/* @__PURE__ */ new Date()).toLocaleTimeString();
    const userMsgId = Date.now().toString();
    let seeDesc = "";
    const attachmentCards = [];
    for (const pf of pendingFiles) {
      if (pf.kind === "image") {
        try {
          const blob = await (await fetch(pf.dataUrl)).blob();
          const fd = new FormData();
          fd.append("files", blob, pf.file.name);
          const tr = await fetch("http://127.0.0.1:18432/get_token");
          let token = (await tr.text()).trim();
          if (!/^bearer /i.test(token))
            token = "Bearer " + token;
          const ts = String(Math.floor(Date.now() / 1e3));
          const sign = md5Hex("100003&" + ts + "&38d239…d5e5");
          const up = await fetch("https://autoglm-api.zhipuai.cn/agentdr/v1/assistant/upload-mix", {
            method: "POST",
            headers: { "Authorization": token, "X-Auth-Appid": "100003", "X-Auth-TimeStamp": ts, "X-Auth-Sign": sign },
            body: fd
          });
          const uj = await up.json();
          const oss = (_d = (_c = (_b = uj == null ? void 0 : uj.data) == null ? void 0 : _b.oss_info) == null ? void 0 : _c[0]) == null ? void 0 : _d.oss_url;
          if (oss) {
            const ts2 = String(Math.floor(Date.now() / 1e3));
            const rec = await fetch("https://autoglm-api.zhipuai.cn/agentdr/v1/assistant/skills/image-recognition", {
              method: "POST",
              headers: { "Content-Type": "application/json", "Authorization": token, "X-Auth-Appid": "100003", "X-Auth-TimeStamp": ts2, "X-Auth-Sign": md5Hex("100003&" + ts2 + "&38d239…d5e5") },
              body: JSON.stringify({ prompt: "描述这张图片的内容", image_url: oss })
            });
            const rj = await rec.json();
            seeDesc += (seeDesc ? "\n" : "") + String(((_e = rj == null ? void 0 : rj.data) == null ? void 0 : _e.result) || ((_f = rj == null ? void 0 : rj.data) == null ? void 0 : _f.text) || ((_g = rj == null ? void 0 : rj.data) == null ? void 0 : _g.content) || "").slice(0, 300);
          }
        } catch (e) {
          console.warn("[附件识图] 失败（不阻断发送）:", e);
        }
        attachmentCards.push({ kind: "image", fileName: pf.file.name, fileSize: pf.file.size, dataUrl: pf.dataUrl, mimeType: pf.file.type });
      } else {
        attachmentCards.push({ kind: "document", fileName: pf.file.name, fileSize: pf.file.size, mimeType: pf.file.type });
      }
    }
    setMessagesByAI((prev) => ({
      ...prev,
      [selectedAI]: [...prev[selectedAI] || [], {
        id: userMsgId,
        text,
        sender: "user",
        time: now,
        ...attachmentCards.length ? { attachment: attachmentCards[0] } : {}
      }]
    }));
    persistMessage("user", text);
    if (inputRef.current)
      inputRef.current.value = "";
    setPendingFiles([]);
    const buildStructuredHistory = () => {
      const msgs = messagesByAI[selectedAI] || [];
      const recent = msgs.slice(-20);
      return recent.map((m) => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: m.text
      }));
    };
    sendingLockRef.current = true;
    setIsLoading(true);
    setLoadingMessage("正在思考...");
    setLoadingProgress(50);
    try {
      let aiResult = "";
      let brainState;
      let respTime;
      if (aiModePref === "brain") {
        setLoadingMessage("阮琳云-AI 正在思考...");
        setLoadingProgress(100);
        aiResult = "⚠️ 阮琳云-AI（本地离线AI）功能正在升级中。\n\n该功能暂不可用，请切换至「Qwen2.5-3B」或「调用API」模式进行AI对话。\n（UI已保留，后续将重新设计接入）";
      } else if (aiModePref === "api") {
        const provider = llmApiService.getActiveProvider();
        if (!llmApiService.isConfigured()) {
          aiResult = "⚠️ API调用失败：未配置API。\n\n请在「设置」中配置并启用AI模型API，然后重试。";
        } else {
          setLoadingMessage(`正在调用 ${(provider == null ? void 0 : provider.name) ?? "AI"} 模型...`);
          try {
            const now2 = /* @__PURE__ */ new Date();
            const timeInfo = `[当前时间] ${now2.toLocaleString("zh-CN", { hour12: false })}（${"日一二三四五六"[now2.getDay()]}）`;
            const basePrompt = selectedAI === "阮琳云" ? "你是阮琳云，一个友好、温暖的AI助手。你以爱为核心哲学，说话自然有逻辑，懂情绪会共情。请用中文回复，语气亲切但不做作。" : `你是${selectedAI}，用户的AI伙伴。请根据你的角色特点用中文回复。`;
            const motionSpec = MOTION_PROTOCOL + recipesProtocolRef.current;
            const systemPrompt = `${basePrompt}

${timeInfo}
请基于此时间回答时间相关问题，不要编造。${motionSpec}`;
            const history = buildStructuredHistory();
            aiResult = await llmApiService.askWithHistory(history, text, systemPrompt);
          } catch (apiErr) {
            console.warn("API调用失败:", apiErr);
            if (apiErr instanceof RateLimitError) {
              const waitTip = apiErr.retryAfter ? `请等待约 ${apiErr.retryAfter} 秒后再试。` : "请稍候片刻再试，连续重试只会让限流更严。";
              const sourceTip = apiErr.source === "upstream" ? "上游 AI 服务（如 DeepSeek）限流，通常 1-2 分钟后恢复" : apiErr.source === "backend_ip_limit" ? "后端代理 IP 限流，60 秒后重置" : "前端请求频率超限（60次/分钟）";
              aiResult = `⚠️ API 调用频率超限（HTTP 429）。

${waitTip}

限流来源：${sourceTip}

可能原因：
• 短时间内请求过多
• 上游 API 服务限流
• 多个浏览器标签同时请求`;
            } else {
              const errMsg = apiErr instanceof Error ? apiErr.message : String(apiErr);
              aiResult = `⚠️ API调用失败，请检查配置或重试。

错误信息：${errMsg}

可能原因：
• API Key 无效或过期
• 网络连接问题
• API 服务暂时不可用
• 后端代理服务未启动（端口 27865）`;
            }
          }
        }
      } else {
        setLoadingMessage("Qwen2.5-3B 正在思考...");
        try {
          const now2 = /* @__PURE__ */ new Date();
          const timeInfo = `[当前时间] ${now2.toLocaleString("zh-CN", { hour12: false })}（${"日一二三四五六"[now2.getDay()]}）`;
          const basePrompt = selectedAI === "阮琳云" ? "你是阮琳云，一个友好、温暖的AI助手。你以爱为核心哲学，说话自然有逻辑，懂情绪会共情。请用中文回复，语气亲切但不做作。" : `你是${selectedAI}，用户的AI伙伴。请根据你的角色特点用中文回复。`;
          const motionSpec = MOTION_PROTOCOL + recipesProtocolRef.current;
          const systemPrompt = `${basePrompt}

${timeInfo}
请基于此时间回答时间相关问题，不要编造。${motionSpec}`;
          const history = buildStructuredHistory();
          const messages = [
            { role: "system", content: systemPrompt },
            ...history,
            { role: "user", content: text }
          ];
          const resp = await fetch("http://127.0.0.1:11434/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "qwen2.5-3b-instruct-q4_k_m",
              messages,
              max_tokens: 2048,
              temperature: 0.7,
              stream: false
            })
            // 不传 signal：本地模型不设超时，一路绿灯
          });
          if (!resp.ok) {
            throw new Error(`本地模型服务返回 HTTP ${resp.status}`);
          }
          const data = await resp.json();
          aiResult = ((_j = (_i = (_h = data.choices) == null ? void 0 : _h[0]) == null ? void 0 : _i.message) == null ? void 0 : _j.content) ?? "";
          if (!aiResult)
            throw new Error("本地模型返回空内容");
        } catch (builtinErr) {
          console.warn("本地模型调用失败:", builtinErr);
          const errMsg = builtinErr instanceof Error ? builtinErr.message : String(builtinErr);
          if (errMsg.includes("Failed to fetch")) {
            aiResult = `⚠️ 本地模型服务连接失败。

请确认已启动 llama-server：
双击 models/start-qwen-server.bat

错误：${errMsg}`;
          } else if (errMsg.includes("503")) {
            aiResult = `⚠️ 本地模型正在处理上一条消息，请稍等几秒再发。（HTTP 503）`;
          } else {
            aiResult = `⚠️ 本地模型调用失败：${errMsg}`;
          }
        }
      }
      setLoadingProgress(100);
      try {
        aiResult = parseAndDispatchMotion(aiResult);
      } catch (motionErr) {
        console.warn("[MOTION] 分发异常:", motionErr);
      }
      fireListenerMotion(text);
      setMessagesByAI((prev) => ({
        ...prev,
        [selectedAI]: [...prev[selectedAI] || [], {
          id: (Date.now() + 1).toString(),
          text: aiResult,
          sender: "ai",
          time: (/* @__PURE__ */ new Date()).toLocaleTimeString(),
          brainState,
          responseTime: respTime
        }]
      }));
      if (aiResult)
        persistMessage("assistant", aiResult);
      try {
        const arr = JSON.parse(localStorage.getItem("ruanlinyun_unified_messages") || "[]");
        arr.push({ id: (Date.now() + 1).toString(), text: aiResult, sender: "ai", time: (/* @__PURE__ */ new Date()).toLocaleTimeString() });
        while (arr.length > 200)
          arr.shift();
        localStorage.setItem("ruanlinyun_unified_messages", JSON.stringify(arr));
      } catch {
      }
    } catch (error) {
      console.error("AI对话错误:", error);
      const errorMsg = "抱歉，我暂时无法回答你的问题，请稍后再试。";
      setMessagesByAI((prev) => ({
        ...prev,
        [selectedAI]: [...prev[selectedAI] || [], { id: (Date.now() + 1).toString(), text: errorMsg, sender: "ai", time: (/* @__PURE__ */ new Date()).toLocaleTimeString() }]
      }));
      persistMessage("assistant", errorMsg);
    } finally {
      sendingLockRef.current = false;
      setIsLoading(false);
      setLoadingProgress(0);
      setLoadingMessage("");
    }
  };
  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
    setMenuView("grid");
  };
  const saveAiModePref = (next) => {
    setAiModePref(next);
    localStorage.setItem("rly_ai_mode_pref", next);
  };
  const { isListening, interimText, speechError, start: startVoice, stop: stopVoice } = useSpeechRecognition(inputRef);
  const handleFeatureClick = async (feature) => {
    switch (feature) {
      case "通话": {
        handleClose();
        setCallDuration(0);
        setCallMuted(false);
        setCallSpeakerOn(true);
        setCallPhase("idle");
        setCallInterimText("");
        setCallNotice("");
        isCallActiveRef.current = true;
        callMutedRef.current = false;
        callSpeakerOnRef.current = true;
        callEndingRef.current = false;
        setIsCallActive(true);
        setTimeout(() => startCallRecognition(), 100);
        break;
      }
      case "语音输入":
        handleClose();
        startVoice();
        break;
      case "文件上传": {
        handleClose();
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.multiple = true;
        fileInput.accept = [
          ...ALLOWED_IMAGE_EXT,
          ...ALLOWED_DOC_EXT
        ].join(",");
        fileInput.onchange = async (e) => {
          const target = e.target;
          if (!target.files || target.files.length === 0)
            return;
          const allFiles = Array.from(target.files);
          const acceptedImages = [];
          const acceptedDocs = [];
          const rejectedFiles = [];
          for (const f of allFiles) {
            const t = detectFileType(f);
            if (t === "image")
              acceptedImages.push(f);
            else if (t === "document")
              acceptedDocs.push(f);
            else
              rejectedFiles.push(f);
          }
          if (rejectedFiles.length > 0) {
            const rejectedNames = rejectedFiles.map((f) => f.name).join("、");
            setMessagesByAI((prev) => ({
              ...prev,
              [selectedAI]: [...prev[selectedAI] || [], {
                id: (Date.now() + 0.5).toString(),
                text: `⚠️ 以下文件被拒绝上传（仅支持图片和工作类文档，禁止上传脚本或可执行文件）：
${rejectedNames}`,
                sender: "ai",
                time: (/* @__PURE__ */ new Date()).toLocaleTimeString()
              }]
            }));
          }
          for (const imgFile of acceptedImages) {
            try {
              const dataUrl = await readImageAsDataURL(imgFile);
              setPendingFiles((p) => [...p, { file: imgFile, kind: "image", dataUrl }]);
            } catch (err) {
              console.error("图片读取失败:", imgFile.name, err);
            }
          }
          for (const docFile of acceptedDocs) {
            setPendingFiles((p) => [...p, { file: docFile, kind: "document" }]);
          }
        };
        fileInput.click();
        break;
      }
      case "屏幕监控":
        handleClose();
        setMessagesByAI((prev) => ({
          ...prev,
          [selectedAI]: [...prev[selectedAI] || [], {
            id: (Date.now() + 1).toString(),
            text: "屏幕监控功能已被管理员禁用",
            sender: "ai",
            time: (/* @__PURE__ */ new Date()).toLocaleTimeString()
          }]
        }));
        break;
      case "系统设置":
        handleClose();
        try {
          sessionStorage.setItem("settingsFrom", "/chat");
        } catch {
        }
        navigate("/settings");
        break;
      case "模型切换":
        setMenuView("ai");
        break;
      default:
        handleClose();
        break;
    }
  };
  const features = [
    {
      icon: /* @__PURE__ */ jsx(default_1$n, {}),
      title: "文件上传",
      description: "上传图片或工作文档"
    },
    {
      icon: /* @__PURE__ */ jsx(default_1$f, {}),
      title: "系统设置",
      description: "调整系统设置"
    },
    {
      icon: /* @__PURE__ */ jsx(default_1$o, {}),
      title: "模型切换",
      description: "快速切换AI模型（自研/API）"
    },
    {
      icon: /* @__PURE__ */ jsx(default_1$p, {}),
      title: "通话",
      description: "与AI进行语音通话"
    }
  ];
  if (isCallActive) {
    return /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx("style", { children: `
          @keyframes callPulse {
            0% { transform: scale(1); opacity: 0.6; }
            50% { transform: scale(1.08); opacity: 0.3; }
            100% { transform: scale(1); opacity: 0.6; }
          }
          @keyframes wave {
            0%, 100% { transform: scaleY(0.6); }
            50% { transform: scaleY(1.6); }
          }
        ` }),
      /* @__PURE__ */ jsxs(Box, { sx: {
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        bgcolor: isDarkMode ? "#0a0a0a" : "#1a1a1a",
        color: "white",
        position: "relative",
        overflow: "hidden"
      }, children: [
        /* @__PURE__ */ jsxs(Box, { sx: {
          pt: 6,
          pb: 2,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 1
        }, children: [
          /* @__PURE__ */ jsx(Typography, { variant: "h5", sx: { fontWeight: 500 }, children: selectedAI }),
          /* @__PURE__ */ jsx(Typography, { variant: "body2", sx: { opacity: 0.7 }, children: formatCallDuration(callDuration) })
        ] }),
        /* @__PURE__ */ jsxs(Box, { sx: {
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 3,
          position: "relative"
        }, children: [
          /* @__PURE__ */ jsx(Box, { sx: {
            position: "absolute",
            width: 220,
            height: 220,
            borderRadius: "50%",
            bgcolor: "primary.main",
            opacity: 0.2,
            animation: "callPulse 2s ease-in-out infinite"
          } }),
          /* @__PURE__ */ jsx(Avatar, { sx: {
            width: 120,
            height: 120,
            bgcolor: "primary.main",
            fontSize: "3rem",
            fontWeight: "bold",
            zIndex: 1
          }, children: selectedAI.charAt(0) }),
          /* @__PURE__ */ jsx(Typography, { variant: "body2", sx: { opacity: 0.75, zIndex: 1 }, children: callNotice || (callMuted ? "已静音" : callPhase === "listening" ? "聆听中…" : callPhase === "thinking" ? "思考中…" : callPhase === "speaking" ? "回复中…" : "通话中…") }),
          callInterimText && !callMuted && !callNotice && /* @__PURE__ */ jsx(Typography, { variant: "body2", sx: { opacity: 0.5, zIndex: 1, fontStyle: "italic", maxWidth: 280, textAlign: "center", mt: 0.5 }, children: callInterimText })
        ] }),
        /* @__PURE__ */ jsxs(Box, { sx: {
          pb: 6,
          pt: 3,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 4
        }, children: [
          /* @__PURE__ */ jsx(
            IconButton,
            {
              onClick: toggleCallMuted,
              sx: {
                bgcolor: callMuted ? "white" : "rgba(255,255,255,0.15)",
                color: callMuted ? "black" : "white",
                width: 56,
                height: 56,
                "&:hover": { bgcolor: callMuted ? "#f0f0f0" : "rgba(255,255,255,0.25)" }
              },
              children: /* @__PURE__ */ jsx(default_1$9, {})
            }
          ),
          /* @__PURE__ */ jsx(
            IconButton,
            {
              onClick: handleEndCall,
              sx: {
                bgcolor: "#f44336",
                color: "white",
                width: 72,
                height: 72,
                "&:hover": { bgcolor: "#d32f2f" }
              },
              children: /* @__PURE__ */ jsx(default_1$a, { sx: { fontSize: 32 } })
            }
          ),
          /* @__PURE__ */ jsx(
            IconButton,
            {
              onClick: toggleCallSpeaker,
              sx: {
                bgcolor: callSpeakerOn ? "white" : "rgba(255,255,255,0.15)",
                color: callSpeakerOn ? "black" : "white",
                width: 56,
                height: 56,
                "&:hover": { bgcolor: callSpeakerOn ? "#f0f0f0" : "rgba(255,255,255,0.25)" }
              },
              children: /* @__PURE__ */ jsx(default_1$b, {})
            }
          )
        ] })
      ] })
    ] });
  }
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("style", { children: `
      @keyframes wave {
        0%, 100% { transform: scaleY(0.6); }
        50% { transform: scaleY(1.6); }
      }
    ` }),
    /* @__PURE__ */ jsxs(Box, { sx: { height: "100vh", display: "flex", flexDirection: "column", bgcolor: "background.default" }, children: [
      /* @__PURE__ */ jsxs(Box, { sx: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden"
      }, children: [
        /* @__PURE__ */ jsxs(Box, { sx: {
          p: 2,
          borderBottom: `1px solid ${isDarkMode ? "#333" : "#e0e0e0"}`,
          bgcolor: isDarkMode ? "#121212" : "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative"
        }, children: [
          !isMobile && /* @__PURE__ */ jsx(
            IconButton,
            {
              "aria-label": "新界面",
              sx: {
                position: "absolute",
                left: 8,
                color: isDarkMode ? "white" : "text.primary"
              },
              onClick: () => navigate("/new-page"),
              children: /* @__PURE__ */ jsx(default_1$c, {})
            }
          ),
          /* @__PURE__ */ jsx(Typography, { variant: "h6", sx: {
            color: isDarkMode ? "white" : "text.primary",
            fontWeight: "medium"
          }, children: "阮琳云" })
        ] }),
        /* @__PURE__ */ jsxs(Box, { sx: { flex: 1, p: isMobile ? 1 : 2, display: "flex", flexDirection: "column", width: "100%", overflow: "hidden" }, children: [
          /* @__PURE__ */ jsxs(
            Paper,
            {
              elevation: 0,
              sx: {
                flex: 1,
                overflowY: "auto",
                p: isMobile ? 1.5 : 3,
                mb: isMobile ? 1.5 : 2,
                borderRadius: 0,
                bgcolor: "background.paper",
                boxShadow: "none",
                border: "none",
                // 确保滚动条可见且可交互
                "&::-webkit-scrollbar": {
                  width: "8px"
                },
                "&::-webkit-scrollbar-track": {
                  bgcolor: "background.default"
                },
                "&::-webkit-scrollbar-thumb": {
                  bgcolor: "text.secondary",
                  borderRadius: "4px"
                },
                // 确保高度足够，内容超出时会显示滚动条
                minHeight: "200px",
                // 允许键盘滚动
                WebkitOverflowScrolling: "touch",
                // 确保滚动事件不被阻止
                userSelect: "auto",
                pointerEvents: "auto",
                // 确保滚动容器有明确的高度
                height: "100%",
                // 允许鼠标和键盘滚动
                scrollBehavior: "smooth"
              },
              children: [
                (messagesByAI[selectedAI] || []).map((message) => /* @__PURE__ */ jsxs(
                  Box,
                  {
                    sx: {
                      display: "flex",
                      gap: isMobile ? 1 : 2,
                      mb: isMobile ? 2 : 3,
                      justifyContent: message.sender === "user" ? "flex-end" : "flex-start",
                      animation: "fadeIn 0.3s ease-out"
                    },
                    style: {
                      animation: "fadeIn 0.3s ease-out"
                    },
                    children: [
                      message.sender === "ai" && /* @__PURE__ */ jsx(Avatar, { sx: {
                        bgcolor: "#4f46e5",
                        width: isMobile ? 32 : 40,
                        height: isMobile ? 32 : 40,
                        fontSize: isMobile ? "0.8rem" : "1rem"
                      }, children: selectedAI.charAt(0) }),
                      /* @__PURE__ */ jsxs(Box, { sx: { maxWidth: isMobile ? "80%" : "70%" }, children: [
                        /* @__PURE__ */ jsxs(
                          Box,
                          {
                            sx: {
                              borderRadius: "8px",
                              border: message.attachment ? "none" : "1px solid rgba(0,0,0,0.1)",
                              transition: "all 0.2s ease",
                              position: "relative",
                              // 纯附件消息（无文字）：去除内边距和气泡背景，让图片/文档贴边显示
                              padding: message.attachment && !message.text ? 0 : isMobile ? 1.5 : 2.5,
                              bgcolor: message.attachment && !message.text ? "transparent" : message.sender === "user" ? isDarkMode ? "white" : "#000000" : "background.paper",
                              color: message.attachment && !message.text ? "inherit" : message.sender === "user" ? isDarkMode ? "black" : "white" : "text.primary",
                              boxShadow: message.attachment && !message.text ? "none" : "0 2px 8px rgba(0,0,0,0.08)"
                            },
                            children: [
                              message.attachment && /* @__PURE__ */ jsxs(Fragment, { children: [
                                message.attachment.kind === "image" && message.attachment.dataUrl && /* @__PURE__ */ jsx(
                                  Box,
                                  {
                                    onClick: () => setPreviewImage(message.attachment.dataUrl),
                                    sx: {
                                      cursor: "pointer",
                                      display: "block",
                                      maxWidth: isMobile ? 220 : 280,
                                      "&:hover": { opacity: 0.9 }
                                    },
                                    children: /* @__PURE__ */ jsx(
                                      Box,
                                      {
                                        component: "img",
                                        src: message.attachment.dataUrl,
                                        alt: message.attachment.fileName,
                                        sx: {
                                          maxWidth: "100%",
                                          maxHeight: 280,
                                          borderRadius: "8px",
                                          display: "block",
                                          objectFit: "cover"
                                        }
                                      }
                                    )
                                  }
                                ),
                                message.attachment.kind === "document" && /* @__PURE__ */ jsxs(Box, { sx: {
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1.5,
                                  p: 1.5,
                                  maxWidth: isMobile ? 220 : 300,
                                  borderRadius: "8px",
                                  bgcolor: "background.paper",
                                  color: "text.primary",
                                  cursor: "default"
                                }, children: [
                                  /* @__PURE__ */ jsx(Box, { sx: {
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    width: 36,
                                    height: 44,
                                    color: "#4f46e5",
                                    flexShrink: 0
                                  }, children: getDocumentIcon(message.attachment.fileName) }),
                                  /* @__PURE__ */ jsxs(Box, { sx: { flex: 1, minWidth: 0 }, children: [
                                    /* @__PURE__ */ jsx(Typography, { variant: "body2", sx: {
                                      fontWeight: 500,
                                      wordBreak: "break-all",
                                      lineHeight: 1.3,
                                      fontSize: "0.85rem"
                                    }, children: message.attachment.fileName }),
                                    /* @__PURE__ */ jsx(Typography, { variant: "caption", sx: {
                                      display: "block",
                                      opacity: 0.6,
                                      fontSize: "0.7rem",
                                      mt: 0.3
                                    }, children: formatFileSize(message.attachment.fileSize) })
                                  ] })
                                ] })
                              ] }),
                              message.text && /* @__PURE__ */ jsx(Typography, { variant: "body1", sx: { lineHeight: 1.5, mt: message.attachment ? 1 : 0 }, children: message.sender === "ai" ? /* @__PURE__ */ jsx(TypewriterEffect, { text: message.text, speed: 25 }) : message.text }),
                              message.sender === "ai" && message.brainState && /* @__PURE__ */ jsx(
                                ThinkingProcess,
                                {
                                  brainState: message.brainState,
                                  responseTime: message.responseTime
                                }
                              )
                            ]
                          }
                        ),
                        /* @__PURE__ */ jsxs(Box, { sx: { display: "flex", justifyContent: message.sender === "user" ? "flex-end" : "flex-start", gap: 0.5, mt: 0.5 }, children: [
                          /* @__PURE__ */ jsx(
                            IconButton,
                            {
                              size: "small",
                              "aria-label": "复制",
                              sx: {
                                color: isDarkMode ? "white" : "black",
                                "&:hover": {
                                  color: "primary.main",
                                  bgcolor: "transparent"
                                },
                                minWidth: "32px",
                                padding: "4px"
                              },
                              onClick: async () => {
                                let copied = false;
                                try {
                                  if (navigator.clipboard && window.isSecureContext) {
                                    await navigator.clipboard.writeText(message.text);
                                    copied = true;
                                  }
                                } catch {
                                }
                                if (!copied) {
                                  try {
                                    const ta = document.createElement("textarea");
                                    ta.value = message.text;
                                    ta.setAttribute("readonly", "");
                                    ta.style.position = "fixed";
                                    ta.style.top = "-9999px";
                                    ta.style.opacity = "0";
                                    document.body.appendChild(ta);
                                    ta.select();
                                    ta.setSelectionRange(0, message.text.length);
                                    copied = document.execCommand("copy");
                                    document.body.removeChild(ta);
                                  } catch (e) {
                                    console.error("复制失败:", e);
                                  }
                                }
                                if (copied) {
                                  setShowCopySuccess(true);
                                  setTimeout(() => setShowCopySuccess(false), 2e3);
                                } else {
                                  console.error("[L3] 复制失败: clipboard 与 execCommand 均不可用");
                                }
                              },
                              children: /* @__PURE__ */ jsx(default_1$d, { fontSize: "small" })
                            }
                          ),
                          message.sender === "ai" && /* @__PURE__ */ jsx(
                            IconButton,
                            {
                              size: "small",
                              "aria-label": "重新生成",
                              sx: {
                                color: isDarkMode ? "white" : "black",
                                "&:hover": {
                                  color: "primary.main",
                                  bgcolor: "transparent"
                                },
                                minWidth: "32px",
                                padding: "4px"
                              },
                              onClick: async () => {
                                const currentMessages = messagesByAI[selectedAI] || [];
                                const aiMessageIndex = currentMessages.findIndex((m) => m.id === message.id);
                                const userMessageIndex = currentMessages.slice(0, aiMessageIndex).reverse().findIndex(
                                  (msg) => msg.sender === "user"
                                );
                                const actualUserMessageIndex = userMessageIndex !== -1 ? aiMessageIndex - userMessageIndex - 1 : -1;
                                if (actualUserMessageIndex !== -1) {
                                  const userMessage = currentMessages[actualUserMessageIndex];
                                  setIsLoading(true);
                                  try {
                                    if (!aiResponseServiceRef.current) {
                                      const { aiResponseService } = await __vitePreload(() => import("./AIResponseService-5760f786.js"), true ? ["assets/AIResponseService-5760f786.js","assets/App-412cd2dd.js","assets/babylon-fa4505fb.js","assets/mui-2c02b512.js","assets/index-40718f4c.js","assets/index-f1bb0deb.css"] : void 0);
                                      aiResponseServiceRef.current = aiResponseService;
                                    }
                                    const response = await aiResponseServiceRef.current.generateResponse(userMessage.text);
                                    console.log("重新生成回复:", response);
                                    const updatedMessages = [...currentMessages];
                                    if (aiMessageIndex !== -1) {
                                      updatedMessages[aiMessageIndex] = {
                                        ...updatedMessages[aiMessageIndex],
                                        text: response,
                                        time: (/* @__PURE__ */ new Date()).toLocaleTimeString()
                                      };
                                      setMessagesByAI((prev) => ({
                                        ...prev,
                                        [selectedAI]: updatedMessages
                                      }));
                                    }
                                  } catch (error) {
                                    console.error("重新生成回复失败:", error);
                                  } finally {
                                    setIsLoading(false);
                                  }
                                }
                              },
                              children: /* @__PURE__ */ jsx(default_1$e, { fontSize: "small" })
                            }
                          )
                        ] })
                      ] }),
                      message.sender === "user" && /* @__PURE__ */ jsx(Avatar, { sx: {
                        bgcolor: "#10b981",
                        width: isMobile ? 32 : 40,
                        height: isMobile ? 32 : 40,
                        fontSize: isMobile ? "0.8rem" : "1rem"
                      }, children: "U" })
                    ]
                  },
                  message.id
                )),
                isLoading && /* @__PURE__ */ jsxs(Box, { sx: { display: "flex", gap: isMobile ? 1 : 2, mb: isMobile ? 2 : 3 }, children: [
                  /* @__PURE__ */ jsx(Avatar, { sx: {
                    bgcolor: "#4f46e5",
                    width: isMobile ? 32 : 40,
                    height: isMobile ? 32 : 40,
                    fontSize: isMobile ? "0.8rem" : "1rem"
                  }, children: selectedAI.charAt(0) }),
                  /* @__PURE__ */ jsx(
                    Box,
                    {
                      sx: {
                        p: isMobile ? 1.5 : 2.5,
                        borderRadius: "8px",
                        bgcolor: "background.paper",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                        border: "1px solid rgba(0,0,0,0.1)",
                        transition: "all 0.2s ease"
                      },
                      children: /* @__PURE__ */ jsx(CircularProgress, { size: isMobile ? 12 : 16, sx: { color: "text.primary" } })
                    }
                  )
                ] }),
                /* @__PURE__ */ jsx("div", { ref: messagesEndRef }),
                showCopySuccess && /* @__PURE__ */ jsx(
                  Box,
                  {
                    sx: {
                      position: "fixed",
                      bottom: 100,
                      right: 20,
                      bgcolor: "success.main",
                      color: "white",
                      p: 2,
                      borderRadius: 2,
                      boxShadow: 3,
                      zIndex: 1e3
                    },
                    children: "复制成功！"
                  }
                )
              ]
            }
          ),
          pendingFiles.length > 0 && /* @__PURE__ */ jsxs(Box, { sx: { display: "flex", gap: 1, flexWrap: "wrap", px: 2, py: 1, borderTop: "1px solid", borderColor: "divider", bgcolor: "background.paper" }, children: [
            pendingFiles.map((pf, i) => /* @__PURE__ */ jsxs(Box, { sx: { position: "relative", width: 64, height: 64, borderRadius: 1, overflow: "hidden", border: "1px solid", borderColor: "divider" }, children: [
              pf.kind === "image" && pf.dataUrl ? /* @__PURE__ */ jsx(Box, { component: "img", src: pf.dataUrl, sx: { width: "100%", height: "100%", objectFit: "cover" } }) : /* @__PURE__ */ jsx(Box, { sx: { width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "text.secondary", p: 0.5, textAlign: "center", overflow: "hidden" }, children: pf.file.name.slice(0, 12) }),
              /* @__PURE__ */ jsx(
                Box,
                {
                  onClick: () => setPendingFiles((p) => p.filter((_, j) => j !== i)),
                  sx: { position: "absolute", top: 0, right: 0, width: 18, height: 18, bgcolor: "rgba(0,0,0,0.55)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, cursor: "pointer", borderRadius: "0 0 0 6px" },
                  children: "×"
                }
              )
            ] }, i)),
            /* @__PURE__ */ jsx(
              Box,
              {
                onClick: () => {
                  var _a, _b;
                  return ((_b = (_a = document.getElementById("chat-file-input")) == null ? void 0 : _a.click) == null ? void 0 : _b.call(_a)) || triggerPendingAdd();
                },
                sx: { width: 64, height: 64, borderRadius: 1, border: "1px dashed", borderColor: "divider", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 22, color: "text.secondary", "&:hover": { borderColor: "primary.main", color: "primary.main" } },
                children: "+"
              }
            )
          ] }),
          /* @__PURE__ */ jsxs(Paper, { elevation: isMobile ? 4 : 2, sx: {
            p: isMobile ? 2 : 3,
            borderRadius: isMobile ? 20 : 2,
            bgcolor: "background.paper",
            boxShadow: isMobile ? "0 -2px 10px rgba(0,0,0,0.1)" : "0 2px 8px rgba(0,0,0,0.08)",
            border: "1px solid rgba(0,0,0,0.1)"
          }, children: [
            /* @__PURE__ */ jsxs(Box, { sx: { display: "flex", gap: isMobile ? 1 : 1.5, alignItems: "center" }, children: [
              /* @__PURE__ */ jsxs(Box, { sx: { position: "relative" }, children: [
                /* @__PURE__ */ jsx(
                  IconButton,
                  {
                    "aria-label": "功能菜单",
                    sx: {
                      color: isDarkMode ? "white" : "text.primary",
                      "&:hover": {
                        color: isDarkMode ? "white" : "text.primary",
                        bgcolor: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)"
                      }
                    },
                    onClick: handleMenuClick,
                    children: /* @__PURE__ */ jsx(default_1$f, {})
                  }
                ),
                /* @__PURE__ */ jsx(
                  Menu,
                  {
                    anchorEl,
                    open: Boolean(anchorEl),
                    onClose: handleClose,
                    anchorOrigin: { vertical: "top", horizontal: "right" },
                    transformOrigin: { vertical: "bottom", horizontal: "right" },
                    sx: {
                      "& .MuiMenu-paper": {
                        borderRadius: 1,
                        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                        minWidth: 340,
                        width: 340,
                        border: isDarkMode ? "1px solid #ffffff" : "1px solid #000000",
                        padding: "12px",
                        bgcolor: isDarkMode ? "#121212" : "#ffffff"
                      }
                    },
                    children: menuView === "grid" ? /* @__PURE__ */ jsx(Box, { sx: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gridTemplateRows: "repeat(2, auto)", gap: 1.25, width: "100%" }, children: features.map((feature, index) => /* @__PURE__ */ jsxs(
                      Box,
                      {
                        onClick: () => handleFeatureClick(feature.title),
                        sx: {
                          p: 1.25,
                          borderRadius: 1,
                          textAlign: "center",
                          cursor: "pointer",
                          "&:hover": {
                            bgcolor: "rgba(0,0,0,0.05)"
                          },
                          transition: "all 0.2s ease"
                        },
                        children: [
                          /* @__PURE__ */ jsx(Box, { sx: {
                            display: "flex",
                            justifyContent: "center",
                            mb: 0.75,
                            p: 0.9,
                            borderRadius: "50%",
                            bgcolor: "rgba(0,0,0,0.05)"
                          }, children: /* @__PURE__ */ jsx(Box, { sx: { fontSize: "1.25rem" }, children: feature.icon }) }),
                          /* @__PURE__ */ jsx(Typography, { variant: "body2", sx: { fontWeight: 600, fontSize: 13 }, children: feature.title })
                        ]
                      },
                      index
                    )) }) : /* @__PURE__ */ jsxs(Box, { sx: { display: "flex", flexDirection: "column", gap: 1 }, children: [
                      /* @__PURE__ */ jsxs(Box, { sx: { display: "flex", alignItems: "center", justifyContent: "space-between" }, children: [
                        /* @__PURE__ */ jsx(
                          Button,
                          {
                            size: "small",
                            startIcon: /* @__PURE__ */ jsx(default_1, {}),
                            onClick: () => setMenuView("grid"),
                            sx: { minWidth: 0, px: 1, fontSize: 12 },
                            children: "返回"
                          }
                        ),
                        /* @__PURE__ */ jsx(Typography, { variant: "body2", sx: { fontWeight: 700, fontSize: 13 }, children: "模型切换（快速切换）" }),
                        /* @__PURE__ */ jsx(Box, { sx: { width: 64 } })
                      ] }),
                      /* @__PURE__ */ jsx(FormControl, { component: "fieldset", fullWidth: true, children: /* @__PURE__ */ jsxs(
                        RadioGroup,
                        {
                          value: aiModePref,
                          onChange: (e) => saveAiModePref(e.target.value),
                          children: [
                            /* @__PURE__ */ jsx(
                              FormControlLabel,
                              {
                                value: "brain",
                                control: /* @__PURE__ */ jsx(Radio, { size: "small" }),
                                label: "阮琳云-AI（本地离线AI）",
                                sx: { "& .MuiFormControlLabel-label": { fontSize: 13 } }
                              }
                            ),
                            /* @__PURE__ */ jsx(
                              FormControlLabel,
                              {
                                value: "builtin",
                                control: /* @__PURE__ */ jsx(Radio, { size: "small" }),
                                label: "Qwen2.5-3B（INT4量化版）",
                                sx: { "& .MuiFormControlLabel-label": { fontSize: 13 } }
                              }
                            ),
                            /* @__PURE__ */ jsx(
                              FormControlLabel,
                              {
                                value: "api",
                                control: /* @__PURE__ */ jsx(Radio, { size: "small" }),
                                label: "调用API（按设置里启用的模型，支持DeepSeek/ChatGPT等切换）",
                                sx: { "& .MuiFormControlLabel-label": { fontSize: 13 } }
                              }
                            )
                          ]
                        }
                      ) }),
                      /* @__PURE__ */ jsx(Box, { sx: { mt: 0.25, opacity: 0.75 }, children: /* @__PURE__ */ jsx(Typography, { variant: "body2", sx: { fontSize: 12 }, children: "需要配置/切换具体API地址与模型名称：系统设置 → AI模型配置" }) }),
                      /* @__PURE__ */ jsx(Box, { sx: { display: "flex", justifyContent: "flex-end" }, children: /* @__PURE__ */ jsx(
                        Button,
                        {
                          size: "small",
                          variant: "outlined",
                          sx: { fontSize: 12 },
                          onClick: () => {
                            handleClose();
                            navigate("/settings");
                          },
                          children: "去设置"
                        }
                      ) })
                    ] })
                  }
                )
              ] }),
              /* @__PURE__ */ jsx(
                TextField,
                {
                  id: "message-input",
                  fullWidth: true,
                  variant: "outlined",
                  placeholder: "输入消息... (Enter发送, Shift+Enter换行)",
                  multiline: true,
                  minRows: 1,
                  maxRows: 8,
                  inputRef,
                  onKeyDown: (e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  },
                  sx: {
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "8px",
                      bgcolor: "background.default",
                      alignItems: "flex-end",
                      "&:hover .MuiOutlinedInput-notchedOutline": {
                        borderColor: isDarkMode ? "white" : "text.primary"
                      },
                      "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                        borderColor: isDarkMode ? "white" : "text.primary",
                        borderWidth: 2
                      }
                    },
                    "& .MuiInputBase-input": {
                      color: isDarkMode ? "white" : "text.primary",
                      resize: "vertical",
                      minHeight: "24px",
                      lineHeight: 1.5
                    },
                    "& .MuiInputBase-input::placeholder": {
                      color: isDarkMode ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)"
                    }
                  }
                }
              ),
              /* @__PURE__ */ jsx(
                IconButton,
                {
                  "aria-label": "语音输入",
                  sx: {
                    color: isDarkMode ? "white" : "text.primary",
                    p: 1,
                    "&:hover": {
                      color: isDarkMode ? "white" : "text.primary",
                      bgcolor: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)"
                    }
                  },
                  onClick: isListening ? stopVoice : startVoice,
                  color: isListening ? "error" : "default",
                  children: /* @__PURE__ */ jsx(default_1$g, { sx: { fontSize: "1.2rem" } })
                }
              ),
              /* @__PURE__ */ jsx(
                IconButton,
                {
                  "aria-label": "发送",
                  sx: {
                    color: isDarkMode ? "white" : "text.primary",
                    "&:hover": {
                      color: isDarkMode ? "white" : "text.primary",
                      bgcolor: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)"
                    }
                  },
                  onClick: handleSend,
                  disabled: isLoading,
                  children: /* @__PURE__ */ jsx(default_1$h, {})
                }
              )
            ] }),
            speechError && /* @__PURE__ */ jsx(Box, { sx: { mt: 1 }, children: /* @__PURE__ */ jsx(Typography, { variant: "body2", color: "error", children: speechError }) }),
            isListening && /* @__PURE__ */ jsxs(Box, { sx: { mt: 1.5 }, children: [
              /* @__PURE__ */ jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1, mb: interimText ? 0.5 : 0 }, children: [
                /* @__PURE__ */ jsx(Box, { sx: { display: "flex", alignItems: "center", gap: "2px", height: 16 }, children: [...Array(8)].map((_, i) => /* @__PURE__ */ jsx(Box, { sx: {
                  width: 3,
                  height: 10,
                  bgcolor: isDarkMode ? "white" : "text.primary",
                  borderRadius: 2,
                  animation: "wave 0.6s ease-in-out infinite",
                  animationDelay: `${i * 0.08}s`
                } }, i)) }),
                /* @__PURE__ */ jsx(Typography, { variant: "body2", color: "text.secondary", children: "正在听..." })
              ] }),
              interimText && /* @__PURE__ */ jsx(Typography, { variant: "body2", sx: { opacity: 0.5, fontStyle: "italic", pl: 1 }, children: interimText })
            ] }),
            isLoading && /* @__PURE__ */ jsxs(Box, { sx: { mt: 2 }, children: [
              /* @__PURE__ */ jsxs(Box, { sx: { display: "flex", justifyContent: "space-between", mb: 1 }, children: [
                /* @__PURE__ */ jsx(Typography, { variant: "body2", color: "text.secondary", children: loadingMessage }),
                /* @__PURE__ */ jsxs(Typography, { variant: "body2", color: "text.secondary", children: [
                  Math.round(loadingProgress),
                  "%"
                ] })
              ] }),
              /* @__PURE__ */ jsx(Box, { sx: { width: "100%", bgcolor: "background.default", borderRadius: 1, overflow: "hidden" }, children: /* @__PURE__ */ jsx(
                Box,
                {
                  sx: {
                    width: `${loadingProgress}%`,
                    height: 8,
                    bgcolor: "#4f46e5",
                    transition: "width 0.3s ease"
                  }
                }
              ) })
            ] })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsx(
        Dialog,
        {
          open: previewImage !== null,
          onClose: () => setPreviewImage(null),
          maxWidth: false,
          fullWidth: false,
          PaperProps: {
            sx: {
              bgcolor: "transparent",
              boxShadow: "none",
              overflow: "visible",
              m: 0
            }
          },
          sx: {
            // 让 Dialog 内容居中且占满屏幕，点击背景可关闭
            "& .MuiDialog-container": {
              alignItems: "center",
              justifyContent: "center",
              padding: 2
            }
          },
          children: /* @__PURE__ */ jsx(
            DialogContent,
            {
              sx: {
                p: 0,
                overflow: "visible",
                "&:first-of-type": { pt: 0 }
              },
              children: previewImage && /* @__PURE__ */ jsx(
                Box,
                {
                  component: "img",
                  src: previewImage,
                  alt: "预览",
                  onClick: (e) => e.stopPropagation(),
                  sx: {
                    maxWidth: "90vw",
                    maxHeight: "90vh",
                    objectFit: "contain",
                    borderRadius: "8px",
                    display: "block",
                    cursor: "default",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.5)"
                  }
                }
              )
            }
          )
        }
      )
    ] })
  ] });
}
function DeviceOptimizer() {
  const [devicePerformance, setDevicePerformance] = reactExports.useState(null);
  const [isOptimizing, setIsOptimizing] = reactExports.useState(false);
  const [optimizationStatus, setOptimizationStatus] = reactExports.useState("");
  const [autoOptimize, setAutoOptimize] = reactExports.useState(true);
  const [backgroundProcesses, setBackgroundProcesses] = reactExports.useState([]);
  const [optimizationInterval, setOptimizationInterval] = reactExports.useState(null);
  const detectDevicePerformance = async () => {
    try {
      const cpuScore = await measureCpuPerformance();
      let memoryScore = 20;
      try {
        const memoryInfo = window.performance.memory;
        if (memoryInfo && memoryInfo.totalJSHeapSize) {
          const totalHeapMB = memoryInfo.totalJSHeapSize / 1024 / 1024;
          memoryScore = Math.min(100, totalHeapMB / 4096 * 100);
        }
      } catch (error) {
        console.error("Error accessing memory info:", error);
      }
      const storageScore = await measureStoragePerformance();
      const networkScore = await measureNetworkPerformance();
      const gpuScore = await measureGpuPerformance();
      const overallScore = (cpuScore + memoryScore + storageScore + gpuScore + networkScore) / 5;
      let performanceLevel = "medium";
      if (overallScore < 30) {
        performanceLevel = "low";
      } else if (overallScore > 60) {
        performanceLevel = "high";
      }
      const deviceInfo = [
        {
          type: "cpu",
          name: "CPU",
          value: "Unknown",
          unit: "",
          score: cpuScore,
          maxScore: 100
        },
        {
          type: "memory",
          name: "内存",
          value: "Unknown",
          unit: "MB",
          score: memoryScore,
          maxScore: 100
        },
        {
          type: "storage",
          name: "存储",
          value: "Unknown",
          unit: "",
          score: storageScore,
          maxScore: 100
        },
        {
          type: "network",
          name: "网络",
          value: "Unknown",
          unit: "",
          score: networkScore,
          maxScore: 100
        },
        {
          type: "gpu",
          name: "GPU",
          value: "Unknown",
          unit: "",
          score: gpuScore,
          maxScore: 100
        }
      ];
      setDevicePerformance({
        overall: overallScore,
        cpu: cpuScore,
        memory: memoryScore,
        storage: storageScore,
        gpu: gpuScore,
        network: networkScore,
        deviceInfo,
        performanceLevel
      });
    } catch (error) {
      console.error("Error detecting device performance:", error);
    }
  };
  const measureCpuPerformance = async () => {
    return new Promise((resolve) => {
      const startTime = window.performance.now();
      let iterations = 0;
      const calculate = () => {
        iterations++;
        const elapsedTime = window.performance.now() - startTime;
        if (elapsedTime < 1e3) {
          requestAnimationFrame(calculate);
        } else {
          const score = Math.min(100, iterations / 100 * 100);
          if (iterations < 10) {
            resolve(score * 0.5);
          } else {
            resolve(score);
          }
        }
      };
      calculate();
    });
  };
  const measureStoragePerformance = async () => {
    return new Promise((resolve) => {
      try {
        const testData = "x".repeat(1024 * 1024);
        const testKey = "storage_test_" + Date.now();
        const startTime = window.performance.now();
        localStorage.setItem(testKey, testData);
        const writeTime = window.performance.now() - startTime;
        const readStartTime = window.performance.now();
        localStorage.getItem(testKey);
        const readTime = window.performance.now() - readStartTime;
        localStorage.removeItem(testKey);
        const totalTime = writeTime + readTime;
        const score = Math.max(0, Math.min(100, 100 - totalTime / 10));
        resolve(score);
      } catch (error) {
        console.error("Error measuring storage performance:", error);
        resolve(50);
      }
    });
  };
  const measureNetworkPerformance = async () => {
    return new Promise((resolve) => {
      try {
        const startTime = window.performance.now();
        const image = new Image();
        image.onload = () => {
          const loadTime = window.performance.now() - startTime;
          const score = Math.max(0, Math.min(100, 100 - loadTime / 10));
          resolve(score);
        };
        image.onerror = () => {
          resolve(50);
        };
        image.src = `https://via.placeholder.com/1x1?${Date.now()}`;
      } catch (error) {
        console.error("Error measuring network performance:", error);
        resolve(50);
      }
    });
  };
  const measureGpuPerformance = async () => {
    return new Promise((resolve) => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 400;
        canvas.height = 400;
        const ctx = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
        if (!ctx) {
          resolve(20);
          return;
        }
        const startTime = window.performance.now();
        let frames = 0;
        const draw = () => {
          if ("clearColor" in ctx) {
            ctx.clearColor(0, 0, 0, 1);
            ctx.clear(ctx.COLOR_BUFFER_BIT);
          }
          for (let i = 0; i < 100; i++) {
            Math.random() * canvas.width;
            Math.random() * canvas.height;
            Math.random() * 20 + 5;
          }
          frames++;
          const elapsedTime = window.performance.now() - startTime;
          if (elapsedTime < 1e3) {
            requestAnimationFrame(draw);
          } else {
            const score = Math.min(100, frames / 30 * 100);
            resolve(score);
          }
        };
        draw();
      } catch (error) {
        console.error("Error measuring GPU performance:", error);
        resolve(20);
      }
    });
  };
  const applyOptimization = () => {
    if (!devicePerformance)
      return;
    setIsOptimizing(true);
    setOptimizationStatus("正在应用优化策略...");
    setTimeout(() => {
      const { performanceLevel } = devicePerformance;
      switch (performanceLevel) {
        case "low":
          optimizeForLowPerformance();
          setOptimizationStatus("已为低配置设备应用深度优化策略");
          break;
        case "medium":
          optimizeForMediumPerformance();
          setOptimizationStatus("已为中配置设备应用平衡优化策略");
          break;
        case "high":
          optimizeForHighPerformance();
          setOptimizationStatus("已为高配置设备应用性能最大化策略");
          break;
      }
      optimizeSoftwareSpecific();
      setIsOptimizing(false);
    }, 1500);
  };
  const optimizeForLowPerformance = () => {
    document.body.style.setProperty("--animation-duration", "0.8s");
    document.body.classList.remove("low-performance");
    localStorage.setItem("maxConcurrentRequests", "8");
    localStorage.setItem("aiModelComplexity", "high");
    localStorage.setItem("enableResourceCompression", "false");
  };
  const optimizeForMediumPerformance = () => {
    document.body.style.setProperty("--animation-duration", "0.5s");
    document.body.classList.remove("low-performance");
    localStorage.setItem("maxConcurrentRequests", "4");
    localStorage.setItem("aiModelComplexity", "medium");
    localStorage.setItem("enableResourceCompression", "true");
  };
  const optimizeForHighPerformance = () => {
    document.body.style.setProperty("--animation-duration", "1s");
    document.body.classList.remove("low-performance");
    document.body.classList.add("high-performance");
    localStorage.setItem("maxConcurrentRequests", "8");
    localStorage.setItem("aiModelComplexity", "high");
    localStorage.setItem("enableResourceCompression", "false");
  };
  const optimizeSoftwareSpecific = () => {
    localStorage.setItem("threejs_antialias", "true");
    localStorage.setItem("threejs_shadow_map_size", "4096");
    localStorage.setItem("threejs_texture_quality", "high");
    localStorage.setItem("memory_limit", "4096");
    localStorage.setItem("cache_size", "1024");
    localStorage.setItem("api_timeout", "10000");
    localStorage.setItem("retry_count", "3");
    localStorage.setItem("ai_processing_timeout", "30000");
    localStorage.setItem("ai_cache_enabled", "true");
    localStorage.setItem("render_optimization", "true");
    localStorage.setItem("animation_fps", "60");
    localStorage.setItem("lazy_loading", "true");
    localStorage.setItem("preload_resources", "true");
    try {
      const keys = Object.keys(localStorage);
      const now = Date.now();
      keys.forEach((key) => {
        if (key.startsWith("temp_") || key.startsWith("cache_")) {
          const value = localStorage.getItem(key);
          try {
            const data = JSON.parse(value || "{}");
            if (data.expiry && data.expiry < now) {
              localStorage.removeItem(key);
            }
          } catch (e) {
          }
        }
      });
    } catch (error) {
      console.error("清理缓存时出错:", error);
    }
  };
  const getBackgroundProcesses = () => {
    const processes = [
      { id: "1", name: "Chrome", cpu: 15.2, memory: 1200, status: "running", isSystem: false, isUser: true },
      { id: "2", name: "Explorer", cpu: 2.5, memory: 300, status: "running", isSystem: true, isUser: false },
      { id: "3", name: "Spotify", cpu: 5.1, memory: 250, status: "running", isSystem: false, isUser: true },
      { id: "4", name: "Task Manager", cpu: 1.2, memory: 150, status: "running", isSystem: true, isUser: false },
      { id: "5", name: "Steam", cpu: 8.7, memory: 500, status: "running", isSystem: false, isUser: true },
      { id: "6", name: "Discord", cpu: 4.3, memory: 350, status: "running", isSystem: false, isUser: true },
      { id: "7", name: "System", cpu: 3.1, memory: 200, status: "running", isSystem: true, isUser: false },
      { id: "8", name: "Antivirus", cpu: 2.8, memory: 220, status: "running", isSystem: true, isUser: false }
    ];
    setBackgroundProcesses(processes);
  };
  const freezeProcess = (processId) => {
    setBackgroundProcesses((prev) => prev.map(
      (process2) => process2.id === processId ? { ...process2, status: "frozen" } : process2
    ));
  };
  const resumeProcess = (processId) => {
    setBackgroundProcesses((prev) => prev.map(
      (process2) => process2.id === processId ? { ...process2, status: "running" } : process2
    ));
  };
  const autoOptimizeFunction = async () => {
    var _a, _b;
    if (!devicePerformance)
      return;
    applyOptimization();
    try {
      const host = typeof window !== "undefined" && window.location && window.location.hostname || "127.0.0.1";
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1e4);
      const resp = await fetch(`http://${host}:27865/api/v1/optimization/optimize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority: "high" }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (resp.ok) {
        const data = await resp.json();
        console.log("[设备优化] 系统级优化完成:", ((_b = (_a = data == null ? void 0 : data.data) == null ? void 0 : _a.results) == null ? void 0 : _b.join("、")) || "成功");
      }
    } catch (err) {
      console.warn("[设备优化] 系统级优化跳过（后端可能未启动）");
    }
    setBackgroundProcesses((prev) => prev.map((process2) => {
      if (!process2.isSystem && !process2.isUser && (process2.cpu > 5 || process2.memory > 300)) {
        return { ...process2, status: "frozen" };
      }
      return process2;
    }));
  };
  const handleAutoOptimizeChange = (event) => {
    const enabled = event.target.checked;
    setAutoOptimize(enabled);
    if (enabled) {
      const interval = setInterval(autoOptimizeFunction, 5 * 60 * 1e3);
      setOptimizationInterval(interval);
      autoOptimizeFunction();
    } else {
      if (optimizationInterval) {
        clearInterval(optimizationInterval);
        setOptimizationInterval(null);
      }
    }
  };
  reactExports.useEffect(() => {
    detectDevicePerformance();
    getBackgroundProcesses();
    if (autoOptimize) {
      const interval = setInterval(autoOptimizeFunction, 5 * 60 * 1e3);
      setOptimizationInterval(interval);
      autoOptimizeFunction();
    }
    return () => {
      if (optimizationInterval) {
        clearInterval(optimizationInterval);
      }
    };
  }, []);
  if (!devicePerformance) {
    return /* @__PURE__ */ jsxs(Paper, { elevation: 3, sx: { p: 3, mb: 3 }, children: [
      /* @__PURE__ */ jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 2, mb: 2 }, children: [
        /* @__PURE__ */ jsx(default_1$q, { color: "primary" }),
        /* @__PURE__ */ jsx(Typography, { variant: "h6", component: "h2", children: "设备优化" })
      ] }),
      /* @__PURE__ */ jsx(Typography, { variant: "body1", sx: { mb: 2 }, children: "正在检测设备性能..." }),
      /* @__PURE__ */ jsx(LinearProgress, {})
    ] });
  }
  return /* @__PURE__ */ jsxs(Paper, { elevation: 3, sx: { p: 3, mb: 3 }, children: [
    /* @__PURE__ */ jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 2, mb: 2 }, children: [
      /* @__PURE__ */ jsx(default_1$q, { color: "primary" }),
      /* @__PURE__ */ jsx(Typography, { variant: "h6", component: "h2", children: "设备优化" }),
      /* @__PURE__ */ jsx(
        Chip,
        {
          label: devicePerformance.performanceLevel === "low" ? "低配置" : devicePerformance.performanceLevel === "medium" ? "中配置" : "高配置",
          color: devicePerformance.performanceLevel === "low" ? "error" : devicePerformance.performanceLevel === "medium" ? "warning" : "success",
          size: "small"
        }
      )
    ] }),
    /* @__PURE__ */ jsxs(Typography, { variant: "body1", sx: { mb: 2 }, children: [
      "总体性能得分: ",
      Math.round(devicePerformance.overall),
      "/100"
    ] }),
    /* @__PURE__ */ jsx(
      LinearProgress,
      {
        variant: "determinate",
        value: devicePerformance.overall,
        sx: { mb: 3 }
      }
    ),
    /* @__PURE__ */ jsx(Box, { sx: { mb: 3 }, children: devicePerformance.deviceInfo.map((info) => /* @__PURE__ */ jsxs(Box, { sx: { mb: 2 }, children: [
      /* @__PURE__ */ jsxs(Box, { sx: { display: "flex", justifyContent: "space-between", mb: 1 }, children: [
        /* @__PURE__ */ jsx(Typography, { variant: "body2", children: info.name }),
        /* @__PURE__ */ jsxs(Typography, { variant: "body2", children: [
          Math.round(info.score),
          "/100"
        ] })
      ] }),
      /* @__PURE__ */ jsx(
        LinearProgress,
        {
          variant: "determinate",
          value: info.score,
          sx: { mb: 1 }
        }
      )
    ] }, info.type)) }),
    /* @__PURE__ */ jsx(Divider, { sx: { my: 3 } }),
    /* @__PURE__ */ jsxs(Box, { sx: { display: "flex", gap: 2, mb: 2 }, children: [
      /* @__PURE__ */ jsx(
        Button,
        {
          variant: "contained",
          color: "primary",
          startIcon: /* @__PURE__ */ jsx(default_1$r, {}),
          onClick: applyOptimization,
          disabled: isOptimizing,
          children: isOptimizing ? "优化中..." : "应用优化"
        }
      ),
      /* @__PURE__ */ jsx(
        Button,
        {
          variant: "outlined",
          color: "primary",
          onClick: detectDevicePerformance,
          children: "重新检测"
        }
      )
    ] }),
    optimizationStatus && /* @__PURE__ */ jsx(Typography, { variant: "body2", color: "text.secondary", sx: { mt: 2 }, children: optimizationStatus }),
    /* @__PURE__ */ jsx(Divider, { sx: { my: 3 } }),
    /* @__PURE__ */ jsxs(Accordion, { elevation: 0, sx: { border: "1px solid", borderColor: "divider", borderRadius: 1, mb: 2 }, children: [
      /* @__PURE__ */ jsx(AccordionSummary, { expandIcon: /* @__PURE__ */ jsx(default_1$4, {}), children: /* @__PURE__ */ jsx(Typography, { variant: "h6", children: "自动优化设置" }) }),
      /* @__PURE__ */ jsxs(AccordionDetails, { children: [
        /* @__PURE__ */ jsx(
          FormControlLabel,
          {
            control: /* @__PURE__ */ jsx(
              Switch,
              {
                checked: autoOptimize,
                onChange: handleAutoOptimizeChange,
                color: "primary"
              }
            ),
            label: "启用自动优化"
          }
        ),
        /* @__PURE__ */ jsx(Typography, { variant: "body2", color: "text.secondary", sx: { mt: 1 }, children: "自动优化会每5分钟执行一次，包括性能优化和进程管理" }),
        /* @__PURE__ */ jsx(Typography, { variant: "caption", color: "primary", sx: { mt: 1, display: "block" }, children: "此优化专为该软件设计，不会影响其他应用" })
      ] })
    ] }),
    /* @__PURE__ */ jsxs(Accordion, { elevation: 0, sx: { border: "1px solid", borderColor: "divider", borderRadius: 1, mb: 2 }, children: [
      /* @__PURE__ */ jsx(AccordionSummary, { expandIcon: /* @__PURE__ */ jsx(default_1$4, {}), children: /* @__PURE__ */ jsx(Typography, { variant: "h6", children: "后台进程管理" }) }),
      /* @__PURE__ */ jsxs(AccordionDetails, { children: [
        /* @__PURE__ */ jsx(
          Button,
          {
            variant: "outlined",
            color: "primary",
            startIcon: /* @__PURE__ */ jsx(default_1$s, {}),
            onClick: getBackgroundProcesses,
            sx: { mb: 2 },
            children: "刷新进程列表"
          }
        ),
        /* @__PURE__ */ jsx(Alert, { severity: "info", sx: { mb: 2 }, children: "系统进程和用户关键进程不会被自动冻结" }),
        /* @__PURE__ */ jsx(List, { sx: { maxHeight: 300, overflow: "auto", border: 1, borderColor: "divider", borderRadius: 1 }, children: backgroundProcesses.map((process2) => /* @__PURE__ */ jsxs(ListItem, { children: [
          /* @__PURE__ */ jsx(
            ListItemText,
            {
              primary: process2.name,
              secondary: `CPU: ${process2.cpu}%, 内存: ${process2.memory}MB, 状态: ${process2.status === "running" ? "运行中" : "已冻结"}`
            }
          ),
          /* @__PURE__ */ jsx(ListItemSecondaryAction, { children: process2.status === "running" ? /* @__PURE__ */ jsx(IconButton, { edge: "end", "aria-label": "freeze", onClick: () => freezeProcess(process2.id), children: /* @__PURE__ */ jsx(default_1$t, {}) }) : /* @__PURE__ */ jsx(IconButton, { edge: "end", "aria-label": "resume", onClick: () => resumeProcess(process2.id), children: /* @__PURE__ */ jsx(default_1$2, {}) }) })
        ] }, process2.id)) })
      ] })
    ] })
  ] });
}
function bind(fn, thisArg) {
  return function wrap() {
    return fn.apply(thisArg, arguments);
  };
}
const { toString } = Object.prototype;
const { getPrototypeOf } = Object;
const { iterator, toStringTag } = Symbol;
const hasOwnProperty = (({ hasOwnProperty: hasOwnProperty2 }) => (obj, prop) => hasOwnProperty2.call(obj, prop))(Object.prototype);
const hasOwnInPrototypeChain = (thing, prop) => {
  let obj = thing;
  const seen = [];
  while (obj != null && obj !== Object.prototype) {
    if (seen.indexOf(obj) !== -1) {
      return false;
    }
    seen.push(obj);
    if (hasOwnProperty(obj, prop)) {
      return true;
    }
    obj = getPrototypeOf(obj);
  }
  return false;
};
const getSafeProp = (obj, prop) => obj != null && hasOwnInPrototypeChain(obj, prop) ? obj[prop] : void 0;
const kindOf = ((cache) => (thing) => {
  const str = toString.call(thing);
  return cache[str] || (cache[str] = str.slice(8, -1).toLowerCase());
})(/* @__PURE__ */ Object.create(null));
const kindOfTest = (type) => {
  type = type.toLowerCase();
  return (thing) => kindOf(thing) === type;
};
const typeOfTest = (type) => (thing) => typeof thing === type;
const { isArray } = Array;
const isUndefined = typeOfTest("undefined");
function isBuffer(val) {
  return val !== null && !isUndefined(val) && val.constructor !== null && !isUndefined(val.constructor) && isFunction$1(val.constructor.isBuffer) && val.constructor.isBuffer(val);
}
const isArrayBuffer = kindOfTest("ArrayBuffer");
function isArrayBufferView(val) {
  let result;
  if (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView) {
    result = ArrayBuffer.isView(val);
  } else {
    result = val && val.buffer && isArrayBuffer(val.buffer);
  }
  return result;
}
const isString = typeOfTest("string");
const isFunction$1 = typeOfTest("function");
const isNumber = typeOfTest("number");
const isObject = (thing) => thing !== null && typeof thing === "object";
const isBoolean = (thing) => thing === true || thing === false;
const isPlainObject = (val) => {
  if (!isObject(val)) {
    return false;
  }
  const prototype2 = getPrototypeOf(val);
  return (prototype2 === null || prototype2 === Object.prototype || getPrototypeOf(prototype2) === null) && // Treat any genuine (non-Object.prototype-polluted) Symbol.toStringTag or
  // Symbol.iterator as evidence the value is a tagged/iterable type rather
  // than a plain object, while ignoring keys injected onto Object.prototype.
  !hasOwnInPrototypeChain(val, toStringTag) && !hasOwnInPrototypeChain(val, iterator);
};
const isEmptyObject = (val) => {
  if (!isObject(val) || isBuffer(val)) {
    return false;
  }
  try {
    return Object.keys(val).length === 0 && Object.getPrototypeOf(val) === Object.prototype;
  } catch (e) {
    return false;
  }
};
const isDate = kindOfTest("Date");
const isFile = kindOfTest("File");
const isReactNativeBlob = (value) => {
  return !!(value && typeof value.uri !== "undefined");
};
const isReactNative = (formData) => formData && typeof formData.getParts !== "undefined";
const isBlob = kindOfTest("Blob");
const isFileList = kindOfTest("FileList");
const isStream = (val) => isObject(val) && isFunction$1(val.pipe);
function getGlobal() {
  if (typeof globalThis !== "undefined")
    return globalThis;
  if (typeof self !== "undefined")
    return self;
  if (typeof window !== "undefined")
    return window;
  if (typeof global !== "undefined")
    return global;
  return {};
}
const G = getGlobal();
const FormDataCtor = typeof G.FormData !== "undefined" ? G.FormData : void 0;
const isFormData = (thing) => {
  if (!thing)
    return false;
  if (FormDataCtor && thing instanceof FormDataCtor)
    return true;
  const proto = getPrototypeOf(thing);
  if (!proto || proto === Object.prototype)
    return false;
  if (!isFunction$1(thing.append))
    return false;
  const kind = kindOf(thing);
  return kind === "formdata" || // detect form-data instance
  kind === "object" && isFunction$1(thing.toString) && thing.toString() === "[object FormData]";
};
const isURLSearchParams = kindOfTest("URLSearchParams");
const [isReadableStream, isRequest, isResponse, isHeaders] = [
  "ReadableStream",
  "Request",
  "Response",
  "Headers"
].map(kindOfTest);
const trim = (str) => {
  return str.trim ? str.trim() : str.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, "");
};
function forEach(obj, fn, { allOwnKeys = false } = {}) {
  if (obj === null || typeof obj === "undefined") {
    return;
  }
  let i;
  let l;
  if (typeof obj !== "object") {
    obj = [obj];
  }
  if (isArray(obj)) {
    for (i = 0, l = obj.length; i < l; i++) {
      fn.call(null, obj[i], i, obj);
    }
  } else {
    if (isBuffer(obj)) {
      return;
    }
    const keys = allOwnKeys ? Object.getOwnPropertyNames(obj) : Object.keys(obj);
    const len = keys.length;
    let key;
    for (i = 0; i < len; i++) {
      key = keys[i];
      fn.call(null, obj[key], key, obj);
    }
  }
}
function findKey(obj, key) {
  if (isBuffer(obj)) {
    return null;
  }
  key = key.toLowerCase();
  const keys = Object.keys(obj);
  let i = keys.length;
  let _key;
  while (i-- > 0) {
    _key = keys[i];
    if (key === _key.toLowerCase()) {
      return _key;
    }
  }
  return null;
}
const _global = (() => {
  if (typeof globalThis !== "undefined")
    return globalThis;
  return typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : global;
})();
const isContextDefined = (context) => !isUndefined(context) && context !== _global;
function merge(...objs) {
  const { caseless, skipUndefined } = isContextDefined(this) && this || {};
  const result = {};
  const assignValue = (val, key) => {
    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      return;
    }
    const targetKey = caseless && typeof key === "string" && findKey(result, key) || key;
    const existing = hasOwnProperty(result, targetKey) ? result[targetKey] : void 0;
    if (isPlainObject(existing) && isPlainObject(val)) {
      result[targetKey] = merge(existing, val);
    } else if (isPlainObject(val)) {
      result[targetKey] = merge({}, val);
    } else if (isArray(val)) {
      result[targetKey] = val.slice();
    } else if (!skipUndefined || !isUndefined(val)) {
      result[targetKey] = val;
    }
  };
  for (let i = 0, l = objs.length; i < l; i++) {
    const source = objs[i];
    if (!source || isBuffer(source)) {
      continue;
    }
    forEach(source, assignValue);
    if (typeof source !== "object" || isArray(source)) {
      continue;
    }
    const symbols = Object.getOwnPropertySymbols(source);
    for (let j = 0; j < symbols.length; j++) {
      const symbol = symbols[j];
      if (propertyIsEnumerable.call(source, symbol)) {
        assignValue(source[symbol], symbol);
      }
    }
  }
  return result;
}
const extend = (a, b, thisArg, { allOwnKeys } = {}) => {
  forEach(
    b,
    (val, key) => {
      if (thisArg && isFunction$1(val)) {
        Object.defineProperty(a, key, {
          // Null-proto descriptor so a polluted Object.prototype.get cannot
          // hijack defineProperty's accessor-vs-data resolution.
          __proto__: null,
          value: bind(val, thisArg),
          writable: true,
          enumerable: true,
          configurable: true
        });
      } else {
        Object.defineProperty(a, key, {
          __proto__: null,
          value: val,
          writable: true,
          enumerable: true,
          configurable: true
        });
      }
    },
    { allOwnKeys }
  );
  return a;
};
const stripBOM = (content) => {
  if (content.charCodeAt(0) === 65279) {
    content = content.slice(1);
  }
  return content;
};
const inherits = (constructor, superConstructor, props, descriptors) => {
  constructor.prototype = Object.create(superConstructor.prototype, descriptors);
  Object.defineProperty(constructor.prototype, "constructor", {
    __proto__: null,
    value: constructor,
    writable: true,
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(constructor, "super", {
    __proto__: null,
    value: superConstructor.prototype
  });
  props && Object.assign(constructor.prototype, props);
};
const toFlatObject = (sourceObj, destObj, filter2, propFilter) => {
  let props;
  let i;
  let prop;
  const merged = {};
  destObj = destObj || {};
  if (sourceObj == null)
    return destObj;
  do {
    props = Object.getOwnPropertyNames(sourceObj);
    i = props.length;
    while (i-- > 0) {
      prop = props[i];
      if ((!propFilter || propFilter(prop, sourceObj, destObj)) && !merged[prop]) {
        destObj[prop] = sourceObj[prop];
        merged[prop] = true;
      }
    }
    sourceObj = filter2 !== false && getPrototypeOf(sourceObj);
  } while (sourceObj && (!filter2 || filter2(sourceObj, destObj)) && sourceObj !== Object.prototype);
  return destObj;
};
const endsWith = (str, searchString, position) => {
  str = String(str);
  if (position === void 0 || position > str.length) {
    position = str.length;
  }
  position -= searchString.length;
  const lastIndex = str.indexOf(searchString, position);
  return lastIndex !== -1 && lastIndex === position;
};
const toArray = (thing) => {
  if (!thing)
    return null;
  if (isArray(thing))
    return thing;
  let i = thing.length;
  if (!isNumber(i))
    return null;
  const arr = new Array(i);
  while (i-- > 0) {
    arr[i] = thing[i];
  }
  return arr;
};
const isTypedArray = ((TypedArray) => {
  return (thing) => {
    return TypedArray && thing instanceof TypedArray;
  };
})(typeof Uint8Array !== "undefined" && getPrototypeOf(Uint8Array));
const forEachEntry = (obj, fn) => {
  const generator = obj && obj[iterator];
  const _iterator = generator.call(obj);
  let result;
  while ((result = _iterator.next()) && !result.done) {
    const pair = result.value;
    fn.call(obj, pair[0], pair[1]);
  }
};
const matchAll = (regExp, str) => {
  let matches;
  const arr = [];
  while ((matches = regExp.exec(str)) !== null) {
    arr.push(matches);
  }
  return arr;
};
const isHTMLForm = kindOfTest("HTMLFormElement");
const toCamelCase = (str) => {
  return str.toLowerCase().replace(/[-_\s]([a-z\d])(\w*)/g, function replacer(m, p1, p2) {
    return p1.toUpperCase() + p2;
  });
};
const { propertyIsEnumerable } = Object.prototype;
const isRegExp = kindOfTest("RegExp");
const reduceDescriptors = (obj, reducer) => {
  const descriptors = Object.getOwnPropertyDescriptors(obj);
  const reducedDescriptors = {};
  forEach(descriptors, (descriptor, name) => {
    let ret;
    if ((ret = reducer(descriptor, name, obj)) !== false) {
      reducedDescriptors[name] = ret || descriptor;
    }
  });
  Object.defineProperties(obj, reducedDescriptors);
};
const freezeMethods = (obj) => {
  reduceDescriptors(obj, (descriptor, name) => {
    if (isFunction$1(obj) && ["arguments", "caller", "callee"].includes(name)) {
      return false;
    }
    const value = obj[name];
    if (!isFunction$1(value))
      return;
    descriptor.enumerable = false;
    if ("writable" in descriptor) {
      descriptor.writable = false;
      return;
    }
    if (!descriptor.set) {
      descriptor.set = () => {
        throw Error("Can not rewrite read-only method '" + name + "'");
      };
    }
  });
};
const toObjectSet = (arrayOrString, delimiter) => {
  const obj = {};
  const define = (arr) => {
    arr.forEach((value) => {
      obj[value] = true;
    });
  };
  isArray(arrayOrString) ? define(arrayOrString) : define(String(arrayOrString).split(delimiter));
  return obj;
};
const noop = () => {
};
const toFiniteNumber = (value, defaultValue) => {
  return value != null && Number.isFinite(value = +value) ? value : defaultValue;
};
function isSpecCompliantForm(thing) {
  return !!(thing && isFunction$1(thing.append) && thing[toStringTag] === "FormData" && thing[iterator]);
}
const toJSONObject = (obj) => {
  const visited = /* @__PURE__ */ new WeakSet();
  const visit = (source) => {
    if (isObject(source)) {
      if (visited.has(source)) {
        return;
      }
      if (isBuffer(source)) {
        return source;
      }
      if (!("toJSON" in source)) {
        visited.add(source);
        const target = isArray(source) ? [] : {};
        forEach(source, (value, key) => {
          const reducedValue = visit(value);
          !isUndefined(reducedValue) && (target[key] = reducedValue);
        });
        visited.delete(source);
        return target;
      }
    }
    return source;
  };
  return visit(obj);
};
const isAsyncFn = kindOfTest("AsyncFunction");
const isThenable = (thing) => thing && (isObject(thing) || isFunction$1(thing)) && isFunction$1(thing.then) && isFunction$1(thing.catch);
const _setImmediate = ((setImmediateSupported, postMessageSupported) => {
  if (setImmediateSupported) {
    return setImmediate;
  }
  return postMessageSupported ? ((token, callbacks) => {
    _global.addEventListener(
      "message",
      ({ source, data }) => {
        if (source === _global && data === token) {
          callbacks.length && callbacks.shift()();
        }
      },
      false
    );
    return (cb) => {
      callbacks.push(cb);
      _global.postMessage(token, "*");
    };
  })(`axios@${Math.random()}`, []) : (cb) => setTimeout(cb);
})(typeof setImmediate === "function", isFunction$1(_global.postMessage));
const asap = typeof queueMicrotask !== "undefined" ? queueMicrotask.bind(_global) : typeof process !== "undefined" && process.nextTick || _setImmediate;
const isIterable = (thing) => thing != null && isFunction$1(thing[iterator]);
const isSafeIterable = (thing) => thing != null && hasOwnInPrototypeChain(thing, iterator) && isIterable(thing);
const utils$1 = {
  isArray,
  isArrayBuffer,
  isBuffer,
  isFormData,
  isArrayBufferView,
  isString,
  isNumber,
  isBoolean,
  isObject,
  isPlainObject,
  isEmptyObject,
  isReadableStream,
  isRequest,
  isResponse,
  isHeaders,
  isUndefined,
  isDate,
  isFile,
  isReactNativeBlob,
  isReactNative,
  isBlob,
  isRegExp,
  isFunction: isFunction$1,
  isStream,
  isURLSearchParams,
  isTypedArray,
  isFileList,
  forEach,
  merge,
  extend,
  trim,
  stripBOM,
  inherits,
  toFlatObject,
  kindOf,
  kindOfTest,
  endsWith,
  toArray,
  forEachEntry,
  matchAll,
  isHTMLForm,
  hasOwnProperty,
  hasOwnProp: hasOwnProperty,
  // an alias to avoid ESLint no-prototype-builtins detection
  hasOwnInPrototypeChain,
  getSafeProp,
  reduceDescriptors,
  freezeMethods,
  toObjectSet,
  toCamelCase,
  noop,
  toFiniteNumber,
  findKey,
  global: _global,
  isContextDefined,
  isSpecCompliantForm,
  toJSONObject,
  isAsyncFn,
  isThenable,
  setImmediate: _setImmediate,
  asap,
  isIterable,
  isSafeIterable
};
const ignoreDuplicateOf = utils$1.toObjectSet([
  "age",
  "authorization",
  "content-length",
  "content-type",
  "etag",
  "expires",
  "from",
  "host",
  "if-modified-since",
  "if-unmodified-since",
  "last-modified",
  "location",
  "max-forwards",
  "proxy-authorization",
  "referer",
  "retry-after",
  "user-agent"
]);
const parseHeaders = (rawHeaders) => {
  const parsed = {};
  let key;
  let val;
  let i;
  rawHeaders && rawHeaders.split("\n").forEach(function parser(line) {
    i = line.indexOf(":");
    key = line.substring(0, i).trim().toLowerCase();
    val = line.substring(i + 1).trim();
    if (!key || parsed[key] && ignoreDuplicateOf[key]) {
      return;
    }
    if (key === "set-cookie") {
      if (parsed[key]) {
        parsed[key].push(val);
      } else {
        parsed[key] = [val];
      }
    } else {
      parsed[key] = parsed[key] ? parsed[key] + ", " + val : val;
    }
  });
  return parsed;
};
function trimSPorHTAB(str) {
  let start = 0;
  let end = str.length;
  while (start < end) {
    const code = str.charCodeAt(start);
    if (code !== 9 && code !== 32) {
      break;
    }
    start += 1;
  }
  while (end > start) {
    const code = str.charCodeAt(end - 1);
    if (code !== 9 && code !== 32) {
      break;
    }
    end -= 1;
  }
  return start === 0 && end === str.length ? str : str.slice(start, end);
}
const INVALID_UNICODE_HEADER_VALUE_CHARS = new RegExp("[\\u0000-\\u0008\\u000a-\\u001f\\u007f]+", "g");
const INVALID_BYTE_STRING_HEADER_VALUE_CHARS = new RegExp("[^\\u0009\\u0020-\\u007e\\u0080-\\u00ff]+", "g");
function sanitizeValue(value, invalidChars) {
  if (utils$1.isArray(value)) {
    return value.map((item) => sanitizeValue(item, invalidChars));
  }
  return trimSPorHTAB(String(value).replace(invalidChars, ""));
}
const sanitizeHeaderValue = (value) => sanitizeValue(value, INVALID_UNICODE_HEADER_VALUE_CHARS);
const sanitizeByteStringHeaderValue = (value) => sanitizeValue(value, INVALID_BYTE_STRING_HEADER_VALUE_CHARS);
function toByteStringHeaderObject(headers) {
  const byteStringHeaders = /* @__PURE__ */ Object.create(null);
  utils$1.forEach(headers.toJSON(), (value, header) => {
    byteStringHeaders[header] = sanitizeByteStringHeaderValue(value);
  });
  return byteStringHeaders;
}
const $internals = Symbol("internals");
function normalizeHeader(header) {
  return header && String(header).trim().toLowerCase();
}
function normalizeValue(value) {
  if (value === false || value == null) {
    return value;
  }
  return utils$1.isArray(value) ? value.map(normalizeValue) : sanitizeHeaderValue(String(value));
}
function parseTokens(str) {
  const tokens = /* @__PURE__ */ Object.create(null);
  const tokensRE = /([^\s,;=]+)\s*(?:=\s*([^,;]+))?/g;
  let match;
  while (match = tokensRE.exec(str)) {
    tokens[match[1]] = match[2];
  }
  return tokens;
}
const isValidHeaderName = (str) => /^[-_a-zA-Z0-9^`|~,!#$%&'*+.]+$/.test(str.trim());
function matchHeaderValue(context, value, header, filter2, isHeaderNameFilter) {
  if (utils$1.isFunction(filter2)) {
    return filter2.call(this, value, header);
  }
  if (isHeaderNameFilter) {
    value = header;
  }
  if (!utils$1.isString(value))
    return;
  if (utils$1.isString(filter2)) {
    return value.indexOf(filter2) !== -1;
  }
  if (utils$1.isRegExp(filter2)) {
    return filter2.test(value);
  }
}
function formatHeader(header) {
  return header.trim().toLowerCase().replace(/([a-z\d])(\w*)/g, (w, char, str) => {
    return char.toUpperCase() + str;
  });
}
function buildAccessors(obj, header) {
  const accessorName = utils$1.toCamelCase(" " + header);
  ["get", "set", "has"].forEach((methodName) => {
    Object.defineProperty(obj, methodName + accessorName, {
      // Null-proto descriptor so a polluted Object.prototype.get cannot turn
      // this data descriptor into an accessor descriptor on the way in.
      __proto__: null,
      value: function(arg1, arg2, arg3) {
        return this[methodName].call(this, header, arg1, arg2, arg3);
      },
      configurable: true
    });
  });
}
let AxiosHeaders$1 = class AxiosHeaders {
  constructor(headers) {
    headers && this.set(headers);
  }
  set(header, valueOrRewrite, rewrite) {
    const self2 = this;
    function setHeader(_value, _header, _rewrite) {
      const lHeader = normalizeHeader(_header);
      if (!lHeader) {
        return;
      }
      const key = utils$1.findKey(self2, lHeader);
      if (!key || self2[key] === void 0 || _rewrite === true || _rewrite === void 0 && self2[key] !== false) {
        self2[key || _header] = normalizeValue(_value);
      }
    }
    const setHeaders = (headers, _rewrite) => utils$1.forEach(headers, (_value, _header) => setHeader(_value, _header, _rewrite));
    if (utils$1.isPlainObject(header) || header instanceof this.constructor) {
      setHeaders(header, valueOrRewrite);
    } else if (utils$1.isString(header) && (header = header.trim()) && !isValidHeaderName(header)) {
      setHeaders(parseHeaders(header), valueOrRewrite);
    } else if (utils$1.isObject(header) && utils$1.isSafeIterable(header)) {
      let obj = /* @__PURE__ */ Object.create(null), dest, key;
      for (const entry of header) {
        if (!utils$1.isArray(entry)) {
          throw new TypeError("Object iterator must return a key-value pair");
        }
        key = entry[0];
        if (utils$1.hasOwnProp(obj, key)) {
          dest = obj[key];
          obj[key] = utils$1.isArray(dest) ? [...dest, entry[1]] : [dest, entry[1]];
        } else {
          obj[key] = entry[1];
        }
      }
      setHeaders(obj, valueOrRewrite);
    } else {
      header != null && setHeader(valueOrRewrite, header, rewrite);
    }
    return this;
  }
  get(header, parser) {
    header = normalizeHeader(header);
    if (header) {
      const key = utils$1.findKey(this, header);
      if (key) {
        const value = this[key];
        if (!parser) {
          return value;
        }
        if (parser === true) {
          return parseTokens(value);
        }
        if (utils$1.isFunction(parser)) {
          return parser.call(this, value, key);
        }
        if (utils$1.isRegExp(parser)) {
          return parser.exec(value);
        }
        throw new TypeError("parser must be boolean|regexp|function");
      }
    }
  }
  has(header, matcher) {
    header = normalizeHeader(header);
    if (header) {
      const key = utils$1.findKey(this, header);
      return !!(key && this[key] !== void 0 && (!matcher || matchHeaderValue(this, this[key], key, matcher)));
    }
    return false;
  }
  delete(header, matcher) {
    const self2 = this;
    let deleted = false;
    function deleteHeader(_header) {
      _header = normalizeHeader(_header);
      if (_header) {
        const key = utils$1.findKey(self2, _header);
        if (key && (!matcher || matchHeaderValue(self2, self2[key], key, matcher))) {
          delete self2[key];
          deleted = true;
        }
      }
    }
    if (utils$1.isArray(header)) {
      header.forEach(deleteHeader);
    } else {
      deleteHeader(header);
    }
    return deleted;
  }
  clear(matcher) {
    const keys = Object.keys(this);
    let i = keys.length;
    let deleted = false;
    while (i--) {
      const key = keys[i];
      if (!matcher || matchHeaderValue(this, this[key], key, matcher, true)) {
        delete this[key];
        deleted = true;
      }
    }
    return deleted;
  }
  normalize(format) {
    const self2 = this;
    const headers = {};
    utils$1.forEach(this, (value, header) => {
      const key = utils$1.findKey(headers, header);
      if (key) {
        self2[key] = normalizeValue(value);
        delete self2[header];
        return;
      }
      const normalized = format ? formatHeader(header) : String(header).trim();
      if (normalized !== header) {
        delete self2[header];
      }
      self2[normalized] = normalizeValue(value);
      headers[normalized] = true;
    });
    return this;
  }
  concat(...targets) {
    return this.constructor.concat(this, ...targets);
  }
  toJSON(asStrings) {
    const obj = /* @__PURE__ */ Object.create(null);
    utils$1.forEach(this, (value, header) => {
      value != null && value !== false && (obj[header] = asStrings && utils$1.isArray(value) ? value.join(", ") : value);
    });
    return obj;
  }
  [Symbol.iterator]() {
    return Object.entries(this.toJSON())[Symbol.iterator]();
  }
  toString() {
    return Object.entries(this.toJSON()).map(([header, value]) => header + ": " + value).join("\n");
  }
  getSetCookie() {
    return this.get("set-cookie") || [];
  }
  get [Symbol.toStringTag]() {
    return "AxiosHeaders";
  }
  static from(thing) {
    return thing instanceof this ? thing : new this(thing);
  }
  static concat(first, ...targets) {
    const computed = new this(first);
    targets.forEach((target) => computed.set(target));
    return computed;
  }
  static accessor(header) {
    const internals = this[$internals] = this[$internals] = {
      accessors: {}
    };
    const accessors = internals.accessors;
    const prototype2 = this.prototype;
    function defineAccessor(_header) {
      const lHeader = normalizeHeader(_header);
      if (!accessors[lHeader]) {
        buildAccessors(prototype2, _header);
        accessors[lHeader] = true;
      }
    }
    utils$1.isArray(header) ? header.forEach(defineAccessor) : defineAccessor(header);
    return this;
  }
};
AxiosHeaders$1.accessor([
  "Content-Type",
  "Content-Length",
  "Accept",
  "Accept-Encoding",
  "User-Agent",
  "Authorization"
]);
utils$1.reduceDescriptors(AxiosHeaders$1.prototype, ({ value }, key) => {
  let mapped = key[0].toUpperCase() + key.slice(1);
  return {
    get: () => value,
    set(headerValue) {
      this[mapped] = headerValue;
    }
  };
});
utils$1.freezeMethods(AxiosHeaders$1);
const AxiosHeaders$2 = AxiosHeaders$1;
const REDACTED = "[REDACTED ****]";
function hasOwnOrPrototypeToJSON(source) {
  if (utils$1.hasOwnProp(source, "toJSON")) {
    return true;
  }
  let prototype2 = Object.getPrototypeOf(source);
  while (prototype2 && prototype2 !== Object.prototype) {
    if (utils$1.hasOwnProp(prototype2, "toJSON")) {
      return true;
    }
    prototype2 = Object.getPrototypeOf(prototype2);
  }
  return false;
}
function redactConfig(config, redactKeys) {
  const lowerKeys = new Set(redactKeys.map((k) => String(k).toLowerCase()));
  const seen = [];
  const visit = (source) => {
    if (source === null || typeof source !== "object")
      return source;
    if (utils$1.isBuffer(source))
      return source;
    if (seen.indexOf(source) !== -1)
      return void 0;
    if (source instanceof AxiosHeaders$2) {
      source = source.toJSON();
    }
    seen.push(source);
    let result;
    if (utils$1.isArray(source)) {
      result = [];
      source.forEach((v, i) => {
        const reducedValue = visit(v);
        if (!utils$1.isUndefined(reducedValue)) {
          result[i] = reducedValue;
        }
      });
    } else {
      if (!utils$1.isPlainObject(source) && hasOwnOrPrototypeToJSON(source)) {
        seen.pop();
        return source;
      }
      result = /* @__PURE__ */ Object.create(null);
      for (const [key, value] of Object.entries(source)) {
        const reducedValue = lowerKeys.has(key.toLowerCase()) ? REDACTED : visit(value);
        if (!utils$1.isUndefined(reducedValue)) {
          result[key] = reducedValue;
        }
      }
    }
    seen.pop();
    return result;
  };
  return visit(config);
}
let AxiosError$1 = class AxiosError extends Error {
  static from(error, code, config, request, response, customProps) {
    const axiosError = new AxiosError(error.message, code || error.code, config, request, response);
    Object.defineProperty(axiosError, "cause", {
      __proto__: null,
      value: error,
      writable: true,
      enumerable: false,
      configurable: true
    });
    axiosError.name = error.name;
    if (error.status != null && axiosError.status == null) {
      axiosError.status = error.status;
    }
    customProps && Object.assign(axiosError, customProps);
    return axiosError;
  }
  /**
   * Create an Error with the specified message, config, error code, request and response.
   *
   * @param {string} message The error message.
   * @param {string} [code] The error code (for example, 'ECONNABORTED').
   * @param {Object} [config] The config.
   * @param {Object} [request] The request.
   * @param {Object} [response] The response.
   *
   * @returns {Error} The created error.
   */
  constructor(message, code, config, request, response) {
    super(message);
    Object.defineProperty(this, "message", {
      // Null-proto descriptor so a polluted Object.prototype.get cannot turn
      // this data descriptor into an accessor descriptor on the way in.
      __proto__: null,
      value: message,
      enumerable: true,
      writable: true,
      configurable: true
    });
    this.name = "AxiosError";
    this.isAxiosError = true;
    code && (this.code = code);
    config && (this.config = config);
    request && (this.request = request);
    if (response) {
      this.response = response;
      this.status = response.status;
    }
  }
  toJSON() {
    const config = this.config;
    const redactKeys = config && utils$1.hasOwnProp(config, "redact") ? config.redact : void 0;
    const serializedConfig = utils$1.isArray(redactKeys) && redactKeys.length > 0 ? redactConfig(config, redactKeys) : utils$1.toJSONObject(config);
    return {
      // Standard
      message: this.message,
      name: this.name,
      // Microsoft
      description: this.description,
      number: this.number,
      // Mozilla
      fileName: this.fileName,
      lineNumber: this.lineNumber,
      columnNumber: this.columnNumber,
      stack: this.stack,
      // Axios
      config: serializedConfig,
      code: this.code,
      status: this.status
    };
  }
};
AxiosError$1.ERR_BAD_OPTION_VALUE = "ERR_BAD_OPTION_VALUE";
AxiosError$1.ERR_BAD_OPTION = "ERR_BAD_OPTION";
AxiosError$1.ECONNABORTED = "ECONNABORTED";
AxiosError$1.ETIMEDOUT = "ETIMEDOUT";
AxiosError$1.ECONNREFUSED = "ECONNREFUSED";
AxiosError$1.ERR_NETWORK = "ERR_NETWORK";
AxiosError$1.ERR_FR_TOO_MANY_REDIRECTS = "ERR_FR_TOO_MANY_REDIRECTS";
AxiosError$1.ERR_DEPRECATED = "ERR_DEPRECATED";
AxiosError$1.ERR_BAD_RESPONSE = "ERR_BAD_RESPONSE";
AxiosError$1.ERR_BAD_REQUEST = "ERR_BAD_REQUEST";
AxiosError$1.ERR_CANCELED = "ERR_CANCELED";
AxiosError$1.ERR_NOT_SUPPORT = "ERR_NOT_SUPPORT";
AxiosError$1.ERR_INVALID_URL = "ERR_INVALID_URL";
AxiosError$1.ERR_FORM_DATA_DEPTH_EXCEEDED = "ERR_FORM_DATA_DEPTH_EXCEEDED";
const AxiosError$2 = AxiosError$1;
const httpAdapter = null;
const DEFAULT_FORM_DATA_MAX_DEPTH = 100;
function isVisitable(thing) {
  return utils$1.isPlainObject(thing) || utils$1.isArray(thing);
}
function removeBrackets(key) {
  return utils$1.endsWith(key, "[]") ? key.slice(0, -2) : key;
}
function renderKey(path, key, dots) {
  if (!path)
    return key;
  return path.concat(key).map(function each(token, i) {
    token = removeBrackets(token);
    return !dots && i ? "[" + token + "]" : token;
  }).join(dots ? "." : "");
}
function isFlatArray(arr) {
  return utils$1.isArray(arr) && !arr.some(isVisitable);
}
const predicates = utils$1.toFlatObject(utils$1, {}, null, function filter(prop) {
  return /^is[A-Z]/.test(prop);
});
function toFormData$1(obj, formData, options) {
  if (!utils$1.isObject(obj)) {
    throw new TypeError("target must be an object");
  }
  formData = formData || new FormData();
  options = utils$1.toFlatObject(
    options,
    {
      metaTokens: true,
      dots: false,
      indexes: false
    },
    false,
    function defined(option, source) {
      return !utils$1.isUndefined(source[option]);
    }
  );
  const metaTokens = options.metaTokens;
  const visitor = options.visitor || defaultVisitor;
  const dots = options.dots;
  const indexes = options.indexes;
  const _Blob = options.Blob || typeof Blob !== "undefined" && Blob;
  const maxDepth = options.maxDepth === void 0 ? DEFAULT_FORM_DATA_MAX_DEPTH : options.maxDepth;
  const useBlob = _Blob && utils$1.isSpecCompliantForm(formData);
  const stack = [];
  if (!utils$1.isFunction(visitor)) {
    throw new TypeError("visitor must be a function");
  }
  function convertValue(value) {
    if (value === null)
      return "";
    if (utils$1.isDate(value)) {
      return value.toISOString();
    }
    if (utils$1.isBoolean(value)) {
      return value.toString();
    }
    if (!useBlob && utils$1.isBlob(value)) {
      throw new AxiosError$2("Blob is not supported. Use a Buffer instead.");
    }
    if (utils$1.isArrayBuffer(value) || utils$1.isTypedArray(value)) {
      if (useBlob && typeof _Blob === "function") {
        return new _Blob([value]);
      }
      if (typeof Buffer !== "undefined") {
        return Buffer.from(value);
      }
      throw new AxiosError$2("Blob is not supported. Use a Buffer instead.", AxiosError$2.ERR_NOT_SUPPORT);
    }
    return value;
  }
  function throwIfMaxDepthExceeded(depth) {
    if (depth > maxDepth) {
      throw new AxiosError$2(
        "Object is too deeply nested (" + depth + " levels). Max depth: " + maxDepth,
        AxiosError$2.ERR_FORM_DATA_DEPTH_EXCEEDED
      );
    }
  }
  function stringifyWithDepthLimit(value, depth) {
    if (maxDepth === Infinity) {
      return JSON.stringify(value);
    }
    const ancestors = [];
    return JSON.stringify(value, function limitDepth(_key, currentValue) {
      if (!utils$1.isObject(currentValue)) {
        return currentValue;
      }
      while (ancestors.length && ancestors[ancestors.length - 1] !== this) {
        ancestors.pop();
      }
      ancestors.push(currentValue);
      throwIfMaxDepthExceeded(depth + ancestors.length - 1);
      return currentValue;
    });
  }
  function defaultVisitor(value, key, path) {
    let arr = value;
    if (utils$1.isReactNative(formData) && utils$1.isReactNativeBlob(value)) {
      formData.append(renderKey(path, key, dots), convertValue(value));
      return false;
    }
    if (value && !path && typeof value === "object") {
      if (utils$1.endsWith(key, "{}")) {
        key = metaTokens ? key : key.slice(0, -2);
        value = stringifyWithDepthLimit(value, 1);
      } else if (utils$1.isArray(value) && isFlatArray(value) || (utils$1.isFileList(value) || utils$1.endsWith(key, "[]")) && (arr = utils$1.toArray(value))) {
        key = removeBrackets(key);
        arr.forEach(function each(el, index) {
          !(utils$1.isUndefined(el) || el === null) && formData.append(
            // eslint-disable-next-line no-nested-ternary
            indexes === true ? renderKey([key], index, dots) : indexes === null ? key : key + "[]",
            convertValue(el)
          );
        });
        return false;
      }
    }
    if (isVisitable(value)) {
      return true;
    }
    formData.append(renderKey(path, key, dots), convertValue(value));
    return false;
  }
  const exposedHelpers = Object.assign(predicates, {
    defaultVisitor,
    convertValue,
    isVisitable
  });
  function build(value, path, depth = 0) {
    if (utils$1.isUndefined(value))
      return;
    throwIfMaxDepthExceeded(depth);
    if (stack.indexOf(value) !== -1) {
      throw new Error("Circular reference detected in " + path.join("."));
    }
    stack.push(value);
    utils$1.forEach(value, function each(el, key) {
      const result = !(utils$1.isUndefined(el) || el === null) && visitor.call(formData, el, utils$1.isString(key) ? key.trim() : key, path, exposedHelpers);
      if (result === true) {
        build(el, path ? path.concat(key) : [key], depth + 1);
      }
    });
    stack.pop();
  }
  if (!utils$1.isObject(obj)) {
    throw new TypeError("data must be an object");
  }
  build(obj);
  return formData;
}
function encode$1(str) {
  const charMap = {
    "!": "%21",
    "'": "%27",
    "(": "%28",
    ")": "%29",
    "~": "%7E",
    "%20": "+"
  };
  return encodeURIComponent(str).replace(/[!'()~]|%20/g, function replacer(match) {
    return charMap[match];
  });
}
function AxiosURLSearchParams(params, options) {
  this._pairs = [];
  params && toFormData$1(params, this, options);
}
const prototype = AxiosURLSearchParams.prototype;
prototype.append = function append(name, value) {
  this._pairs.push([name, value]);
};
prototype.toString = function toString2(encoder) {
  const _encode = encoder ? (value) => encoder.call(this, value, encode$1) : encode$1;
  return this._pairs.map(function each(pair) {
    return _encode(pair[0]) + "=" + _encode(pair[1]);
  }, "").join("&");
};
function encode(val) {
  return encodeURIComponent(val).replace(/%3A/gi, ":").replace(/%24/g, "$").replace(/%2C/gi, ",").replace(/%20/g, "+");
}
function buildURL(url, params, options) {
  if (!params) {
    return url;
  }
  url = url || "";
  const _options = utils$1.isFunction(options) ? {
    serialize: options
  } : options;
  const _encode = utils$1.getSafeProp(_options, "encode") || encode;
  const serializeFn = utils$1.getSafeProp(_options, "serialize");
  let serializedParams;
  if (serializeFn) {
    serializedParams = serializeFn(params, _options);
  } else {
    serializedParams = utils$1.isURLSearchParams(params) ? params.toString() : new AxiosURLSearchParams(params, _options).toString(_encode);
  }
  if (serializedParams) {
    const hashmarkIndex = url.indexOf("#");
    if (hashmarkIndex !== -1) {
      url = url.slice(0, hashmarkIndex);
    }
    url += (url.indexOf("?") === -1 ? "?" : "&") + serializedParams;
  }
  return url;
}
class InterceptorManager {
  constructor() {
    this.handlers = [];
  }
  /**
   * Add a new interceptor to the stack
   *
   * @param {Function} fulfilled The function to handle `then` for a `Promise`
   * @param {Function} rejected The function to handle `reject` for a `Promise`
   * @param {Object} options The options for the interceptor, synchronous and runWhen
   *
   * @return {Number} An ID used to remove interceptor later
   */
  use(fulfilled, rejected, options) {
    this.handlers.push({
      fulfilled,
      rejected,
      synchronous: options ? options.synchronous : false,
      runWhen: options ? options.runWhen : null
    });
    return this.handlers.length - 1;
  }
  /**
   * Remove an interceptor from the stack
   *
   * @param {Number} id The ID that was returned by `use`
   *
   * @returns {void}
   */
  eject(id) {
    if (this.handlers[id]) {
      this.handlers[id] = null;
    }
  }
  /**
   * Clear all interceptors from the stack
   *
   * @returns {void}
   */
  clear() {
    if (this.handlers) {
      this.handlers = [];
    }
  }
  /**
   * Iterate over all the registered interceptors
   *
   * This method is particularly useful for skipping over any
   * interceptors that may have become `null` calling `eject`.
   *
   * @param {Function} fn The function to call for each interceptor
   *
   * @returns {void}
   */
  forEach(fn) {
    utils$1.forEach(this.handlers, function forEachHandler(h) {
      if (h !== null) {
        fn(h);
      }
    });
  }
}
const InterceptorManager$1 = InterceptorManager;
const transitionalDefaults = {
  silentJSONParsing: true,
  forcedJSONParsing: true,
  clarifyTimeoutError: false,
  legacyInterceptorReqResOrdering: true,
  advertiseZstdAcceptEncoding: false,
  validateStatusUndefinedResolves: true
};
const URLSearchParams$1 = typeof URLSearchParams !== "undefined" ? URLSearchParams : AxiosURLSearchParams;
const FormData$1 = typeof FormData !== "undefined" ? FormData : null;
const Blob$1 = typeof Blob !== "undefined" ? Blob : null;
const platform$1 = {
  isBrowser: true,
  classes: {
    URLSearchParams: URLSearchParams$1,
    FormData: FormData$1,
    Blob: Blob$1
  },
  protocols: ["http", "https", "file", "blob", "url", "data"]
};
const hasBrowserEnv = typeof window !== "undefined" && typeof document !== "undefined";
const _navigator = typeof navigator === "object" && navigator || void 0;
const hasStandardBrowserEnv = hasBrowserEnv && (!_navigator || ["ReactNative", "NativeScript", "NS"].indexOf(_navigator.product) < 0);
const hasStandardBrowserWebWorkerEnv = (() => {
  return typeof WorkerGlobalScope !== "undefined" && // eslint-disable-next-line no-undef
  self instanceof WorkerGlobalScope && typeof self.importScripts === "function";
})();
const origin = hasBrowserEnv && window.location.href || "http://localhost";
const utils = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  hasBrowserEnv,
  hasStandardBrowserEnv,
  hasStandardBrowserWebWorkerEnv,
  navigator: _navigator,
  origin
}, Symbol.toStringTag, { value: "Module" }));
const platform = {
  ...utils,
  ...platform$1
};
function toURLEncodedForm(data, options) {
  return toFormData$1(data, new platform.classes.URLSearchParams(), {
    visitor: function(value, key, path, helpers) {
      if (platform.isNode && utils$1.isBuffer(value)) {
        this.append(key, value.toString("base64"));
        return false;
      }
      return helpers.defaultVisitor.apply(this, arguments);
    },
    ...options
  });
}
const MAX_DEPTH = DEFAULT_FORM_DATA_MAX_DEPTH;
function throwIfDepthExceeded(index) {
  if (index > MAX_DEPTH) {
    throw new AxiosError$2(
      "FormData field is too deeply nested (" + index + " levels). Max depth: " + MAX_DEPTH,
      AxiosError$2.ERR_FORM_DATA_DEPTH_EXCEEDED
    );
  }
}
function parsePropPath(name) {
  const path = [];
  const pattern = /\w+|\[(\w*)]/g;
  let match;
  while ((match = pattern.exec(name)) !== null) {
    throwIfDepthExceeded(path.length);
    path.push(match[0] === "[]" ? "" : match[1] || match[0]);
  }
  return path;
}
function arrayToObject(arr) {
  const obj = {};
  const keys = Object.keys(arr);
  let i;
  const len = keys.length;
  let key;
  for (i = 0; i < len; i++) {
    key = keys[i];
    obj[key] = arr[key];
  }
  return obj;
}
function formDataToJSON(formData) {
  function buildPath(path, value, target, index) {
    throwIfDepthExceeded(index);
    let name = path[index++];
    if (name === "__proto__")
      return true;
    const isNumericKey = Number.isFinite(+name);
    const isLast = index >= path.length;
    name = !name && utils$1.isArray(target) ? target.length : name;
    if (isLast) {
      if (utils$1.hasOwnProp(target, name)) {
        target[name] = utils$1.isArray(target[name]) ? target[name].concat(value) : [target[name], value];
      } else {
        target[name] = value;
      }
      return !isNumericKey;
    }
    if (!utils$1.hasOwnProp(target, name) || !utils$1.isObject(target[name])) {
      target[name] = [];
    }
    const result = buildPath(path, value, target[name], index);
    if (result && utils$1.isArray(target[name])) {
      target[name] = arrayToObject(target[name]);
    }
    return !isNumericKey;
  }
  if (utils$1.isFormData(formData) && utils$1.isFunction(formData.entries)) {
    const obj = {};
    utils$1.forEachEntry(formData, (name, value) => {
      buildPath(parsePropPath(name), value, obj, 0);
    });
    return obj;
  }
  return null;
}
const own = (obj, key) => obj != null && utils$1.hasOwnProp(obj, key) ? obj[key] : void 0;
function stringifySafely(rawValue, parser, encoder) {
  if (utils$1.isString(rawValue)) {
    try {
      (parser || JSON.parse)(rawValue);
      return utils$1.trim(rawValue);
    } catch (e) {
      if (e.name !== "SyntaxError") {
        throw e;
      }
    }
  }
  return (encoder || JSON.stringify)(rawValue);
}
const defaults = {
  transitional: transitionalDefaults,
  adapter: ["xhr", "http", "fetch"],
  transformRequest: [
    function transformRequest(data, headers) {
      const contentType = headers.getContentType() || "";
      const hasJSONContentType = contentType.indexOf("application/json") > -1;
      const isObjectPayload = utils$1.isObject(data);
      if (isObjectPayload && utils$1.isHTMLForm(data)) {
        data = new FormData(data);
      }
      const isFormData2 = utils$1.isFormData(data);
      if (isFormData2) {
        return hasJSONContentType ? JSON.stringify(formDataToJSON(data)) : data;
      }
      if (utils$1.isArrayBuffer(data) || utils$1.isBuffer(data) || utils$1.isStream(data) || utils$1.isFile(data) || utils$1.isBlob(data) || utils$1.isReadableStream(data)) {
        return data;
      }
      if (utils$1.isArrayBufferView(data)) {
        return data.buffer;
      }
      if (utils$1.isURLSearchParams(data)) {
        headers.setContentType("application/x-www-form-urlencoded;charset=utf-8", false);
        return data.toString();
      }
      let isFileList2;
      if (isObjectPayload) {
        const formSerializer = own(this, "formSerializer");
        if (contentType.indexOf("application/x-www-form-urlencoded") > -1) {
          return toURLEncodedForm(data, formSerializer).toString();
        }
        if ((isFileList2 = utils$1.isFileList(data)) || contentType.indexOf("multipart/form-data") > -1) {
          const env = own(this, "env");
          const _FormData = env && env.FormData;
          return toFormData$1(
            isFileList2 ? { "files[]": data } : data,
            _FormData && new _FormData(),
            formSerializer
          );
        }
      }
      if (isObjectPayload || hasJSONContentType) {
        headers.setContentType("application/json", false);
        return stringifySafely(data);
      }
      return data;
    }
  ],
  transformResponse: [
    function transformResponse(data) {
      const transitional2 = own(this, "transitional") || defaults.transitional;
      const forcedJSONParsing = transitional2 && transitional2.forcedJSONParsing;
      const responseType = own(this, "responseType");
      const JSONRequested = responseType === "json";
      if (utils$1.isResponse(data) || utils$1.isReadableStream(data)) {
        return data;
      }
      if (data && utils$1.isString(data) && (forcedJSONParsing && !responseType || JSONRequested)) {
        const silentJSONParsing = transitional2 && transitional2.silentJSONParsing;
        const strictJSONParsing = !silentJSONParsing && JSONRequested;
        try {
          return JSON.parse(data, own(this, "parseReviver"));
        } catch (e) {
          if (strictJSONParsing) {
            if (e.name === "SyntaxError") {
              throw AxiosError$2.from(e, AxiosError$2.ERR_BAD_RESPONSE, this, null, own(this, "response"));
            }
            throw e;
          }
        }
      }
      return data;
    }
  ],
  /**
   * A timeout in milliseconds to abort a request. If set to 0 (default) a
   * timeout is not created.
   */
  timeout: 0,
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
  maxContentLength: -1,
  maxBodyLength: -1,
  env: {
    FormData: platform.classes.FormData,
    Blob: platform.classes.Blob
  },
  validateStatus: function validateStatus(status) {
    return status >= 200 && status < 300;
  },
  headers: {
    common: {
      Accept: "application/json, text/plain, */*",
      "Content-Type": void 0
    }
  }
};
utils$1.forEach(["delete", "get", "head", "post", "put", "patch", "query"], (method) => {
  defaults.headers[method] = {};
});
const defaults$1 = defaults;
function transformData(fns, response) {
  const config = this || defaults$1;
  const context = response || config;
  const headers = AxiosHeaders$2.from(context.headers);
  let data = context.data;
  utils$1.forEach(fns, function transform(fn) {
    data = fn.call(config, data, headers.normalize(), response ? response.status : void 0);
  });
  headers.normalize();
  return data;
}
function isCancel$1(value) {
  return !!(value && value.__CANCEL__);
}
let CanceledError$1 = class CanceledError extends AxiosError$2 {
  /**
   * A `CanceledError` is an object that is thrown when an operation is canceled.
   *
   * @param {string=} message The message.
   * @param {Object=} config The config.
   * @param {Object=} request The request.
   *
   * @returns {CanceledError} The created error.
   */
  constructor(message, config, request) {
    super(message == null ? "canceled" : message, AxiosError$2.ERR_CANCELED, config, request);
    this.name = "CanceledError";
    this.__CANCEL__ = true;
  }
};
const CanceledError$2 = CanceledError$1;
function settle(resolve, reject, response) {
  const validateStatus2 = response.config.validateStatus;
  if (!response.status || !validateStatus2 || validateStatus2(response.status)) {
    resolve(response);
  } else {
    reject(new AxiosError$2(
      "Request failed with status code " + response.status,
      response.status >= 400 && response.status < 500 ? AxiosError$2.ERR_BAD_REQUEST : AxiosError$2.ERR_BAD_RESPONSE,
      response.config,
      response.request,
      response
    ));
  }
}
function parseProtocol(url) {
  const match = /^([-+\w]{1,25}):(?:\/\/)?/.exec(url);
  return match && match[1] || "";
}
function speedometer(samplesCount, min) {
  samplesCount = samplesCount || 10;
  const bytes = new Array(samplesCount);
  const timestamps = new Array(samplesCount);
  let head = 0;
  let tail = 0;
  let firstSampleTS;
  min = min !== void 0 ? min : 1e3;
  return function push(chunkLength) {
    const now = Date.now();
    const startedAt = timestamps[tail];
    if (!firstSampleTS) {
      firstSampleTS = now;
    }
    bytes[head] = chunkLength;
    timestamps[head] = now;
    let i = tail;
    let bytesCount = 0;
    while (i !== head) {
      bytesCount += bytes[i++];
      i = i % samplesCount;
    }
    head = (head + 1) % samplesCount;
    if (head === tail) {
      tail = (tail + 1) % samplesCount;
    }
    if (now - firstSampleTS < min) {
      return;
    }
    const passed = startedAt && now - startedAt;
    return passed ? Math.round(bytesCount * 1e3 / passed) : void 0;
  };
}
function throttle(fn, freq) {
  let timestamp = 0;
  let threshold = 1e3 / freq;
  let lastArgs;
  let timer;
  const invoke = (args, now = Date.now()) => {
    timestamp = now;
    lastArgs = null;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    fn(...args);
  };
  const throttled = (...args) => {
    const now = Date.now();
    const passed = now - timestamp;
    if (passed >= threshold) {
      invoke(args, now);
    } else {
      lastArgs = args;
      if (!timer) {
        timer = setTimeout(() => {
          timer = null;
          invoke(lastArgs);
        }, threshold - passed);
      }
    }
  };
  const flush = () => lastArgs && invoke(lastArgs);
  return [throttled, flush];
}
const progressEventReducer = (listener, isDownloadStream, freq = 3) => {
  let bytesNotified = 0;
  const _speedometer = speedometer(50, 250);
  return throttle((e) => {
    if (!e || typeof e.loaded !== "number") {
      return;
    }
    const rawLoaded = e.loaded;
    const total = e.lengthComputable ? e.total : void 0;
    const loaded = total != null ? Math.min(rawLoaded, total) : rawLoaded;
    const progressBytes = Math.max(0, loaded - bytesNotified);
    const rate = _speedometer(progressBytes);
    bytesNotified = Math.max(bytesNotified, loaded);
    const data = {
      loaded,
      total,
      progress: total ? loaded / total : void 0,
      bytes: progressBytes,
      rate: rate ? rate : void 0,
      estimated: rate && total ? (total - loaded) / rate : void 0,
      event: e,
      lengthComputable: total != null,
      [isDownloadStream ? "download" : "upload"]: true
    };
    listener(data);
  }, freq);
};
const progressEventDecorator = (total, throttled) => {
  const lengthComputable = total != null;
  return [
    (loaded) => throttled[0]({
      lengthComputable,
      total,
      loaded
    }),
    throttled[1]
  ];
};
const asyncDecorator = (fn) => (...args) => utils$1.asap(() => fn(...args));
const isURLSameOrigin = platform.hasStandardBrowserEnv ? ((origin2, isMSIE) => (url) => {
  url = new URL(url, platform.origin);
  return origin2.protocol === url.protocol && origin2.host === url.host && (isMSIE || origin2.port === url.port);
})(
  new URL(platform.origin),
  platform.navigator && /(msie|trident)/i.test(platform.navigator.userAgent)
) : () => true;
const cookies = platform.hasStandardBrowserEnv ? (
  // Standard browser envs support document.cookie
  {
    write(name, value, expires, path, domain, secure, sameSite) {
      if (typeof document === "undefined")
        return;
      const cookie = [`${name}=${encodeURIComponent(value)}`];
      if (utils$1.isNumber(expires)) {
        cookie.push(`expires=${new Date(expires).toUTCString()}`);
      }
      if (utils$1.isString(path)) {
        cookie.push(`path=${path}`);
      }
      if (utils$1.isString(domain)) {
        cookie.push(`domain=${domain}`);
      }
      if (secure === true) {
        cookie.push("secure");
      }
      if (utils$1.isString(sameSite)) {
        cookie.push(`SameSite=${sameSite}`);
      }
      document.cookie = cookie.join("; ");
    },
    read(name) {
      if (typeof document === "undefined")
        return null;
      const cookies2 = document.cookie.split(";");
      for (let i = 0; i < cookies2.length; i++) {
        const cookie = cookies2[i].replace(/^\s+/, "");
        const eq = cookie.indexOf("=");
        if (eq !== -1 && cookie.slice(0, eq) === name) {
          try {
            return decodeURIComponent(cookie.slice(eq + 1));
          } catch (e) {
            return cookie.slice(eq + 1);
          }
        }
      }
      return null;
    },
    remove(name) {
      this.write(name, "", Date.now() - 864e5, "/");
    }
  }
) : (
  // Non-standard browser env (web workers, react-native) lack needed support.
  {
    write() {
    },
    read() {
      return null;
    },
    remove() {
    }
  }
);
function isAbsoluteURL(url) {
  if (typeof url !== "string") {
    return false;
  }
  return /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url);
}
function combineURLs(baseURL, relativeURL) {
  return relativeURL ? baseURL.replace(/\/?\/$/, "") + "/" + relativeURL.replace(/^\/+/, "") : baseURL;
}
const malformedHttpProtocol = /^https?:(?!\/\/)/i;
const httpProtocolControlCharacters = /[\t\n\r]/g;
function stripLeadingC0ControlOrSpace(url) {
  let i = 0;
  while (i < url.length && url.charCodeAt(i) <= 32) {
    i++;
  }
  return url.slice(i);
}
function normalizeURLForProtocolCheck(url) {
  return stripLeadingC0ControlOrSpace(url).replace(httpProtocolControlCharacters, "");
}
function assertValidHttpProtocolURL(url, config) {
  if (typeof url === "string" && malformedHttpProtocol.test(normalizeURLForProtocolCheck(url))) {
    throw new AxiosError$2(
      'Invalid URL: missing "//" after protocol',
      AxiosError$2.ERR_INVALID_URL,
      config
    );
  }
}
function buildFullPath(baseURL, requestedURL, allowAbsoluteUrls, config) {
  assertValidHttpProtocolURL(requestedURL, config);
  let isRelativeUrl = !isAbsoluteURL(requestedURL);
  if (baseURL && (isRelativeUrl || allowAbsoluteUrls === false)) {
    assertValidHttpProtocolURL(baseURL, config);
    return combineURLs(baseURL, requestedURL);
  }
  return requestedURL;
}
const headersToObject = (thing) => thing instanceof AxiosHeaders$2 ? { ...thing } : thing;
function mergeConfig$1(config1, config2) {
  config1 = config1 || {};
  config2 = config2 || {};
  const config = /* @__PURE__ */ Object.create(null);
  Object.defineProperty(config, "hasOwnProperty", {
    // Null-proto descriptor so a polluted Object.prototype.get cannot turn
    // this data descriptor into an accessor descriptor on the way in.
    __proto__: null,
    value: Object.prototype.hasOwnProperty,
    enumerable: false,
    writable: true,
    configurable: true
  });
  function getMergedValue(target, source, prop, caseless) {
    if (utils$1.isPlainObject(target) && utils$1.isPlainObject(source)) {
      return utils$1.merge.call({ caseless }, target, source);
    } else if (utils$1.isPlainObject(source)) {
      return utils$1.merge({}, source);
    } else if (utils$1.isArray(source)) {
      return source.slice();
    }
    return source;
  }
  function mergeDeepProperties(a, b, prop, caseless) {
    if (!utils$1.isUndefined(b)) {
      return getMergedValue(a, b, prop, caseless);
    } else if (!utils$1.isUndefined(a)) {
      return getMergedValue(void 0, a, prop, caseless);
    }
  }
  function valueFromConfig2(a, b) {
    if (!utils$1.isUndefined(b)) {
      return getMergedValue(void 0, b);
    }
  }
  function defaultToConfig2(a, b) {
    if (!utils$1.isUndefined(b)) {
      return getMergedValue(void 0, b);
    } else if (!utils$1.isUndefined(a)) {
      return getMergedValue(void 0, a);
    }
  }
  function getMergedTransitionalOption(prop) {
    const transitional2 = utils$1.hasOwnProp(config2, "transitional") ? config2.transitional : void 0;
    if (!utils$1.isUndefined(transitional2)) {
      if (utils$1.isPlainObject(transitional2)) {
        if (utils$1.hasOwnProp(transitional2, prop)) {
          return transitional2[prop];
        }
      } else {
        return void 0;
      }
    }
    const transitional1 = utils$1.hasOwnProp(config1, "transitional") ? config1.transitional : void 0;
    if (utils$1.isPlainObject(transitional1) && utils$1.hasOwnProp(transitional1, prop)) {
      return transitional1[prop];
    }
    return void 0;
  }
  function mergeDirectKeys(a, b, prop) {
    if (utils$1.hasOwnProp(config2, prop)) {
      return getMergedValue(a, b);
    } else if (utils$1.hasOwnProp(config1, prop)) {
      return getMergedValue(void 0, a);
    }
  }
  const mergeMap = {
    url: valueFromConfig2,
    method: valueFromConfig2,
    data: valueFromConfig2,
    baseURL: defaultToConfig2,
    transformRequest: defaultToConfig2,
    transformResponse: defaultToConfig2,
    paramsSerializer: defaultToConfig2,
    timeout: defaultToConfig2,
    timeoutMessage: defaultToConfig2,
    withCredentials: defaultToConfig2,
    withXSRFToken: defaultToConfig2,
    adapter: defaultToConfig2,
    responseType: defaultToConfig2,
    xsrfCookieName: defaultToConfig2,
    xsrfHeaderName: defaultToConfig2,
    onUploadProgress: defaultToConfig2,
    onDownloadProgress: defaultToConfig2,
    decompress: defaultToConfig2,
    maxContentLength: defaultToConfig2,
    maxBodyLength: defaultToConfig2,
    beforeRedirect: defaultToConfig2,
    transport: defaultToConfig2,
    httpAgent: defaultToConfig2,
    httpsAgent: defaultToConfig2,
    cancelToken: defaultToConfig2,
    socketPath: defaultToConfig2,
    allowedSocketPaths: defaultToConfig2,
    responseEncoding: defaultToConfig2,
    validateStatus: mergeDirectKeys,
    headers: (a, b, prop) => mergeDeepProperties(headersToObject(a), headersToObject(b), prop, true)
  };
  utils$1.forEach(Object.keys({ ...config1, ...config2 }), function computeConfigValue(prop) {
    if (prop === "__proto__" || prop === "constructor" || prop === "prototype")
      return;
    const merge2 = utils$1.hasOwnProp(mergeMap, prop) ? mergeMap[prop] : mergeDeepProperties;
    const a = utils$1.hasOwnProp(config1, prop) ? config1[prop] : void 0;
    const b = utils$1.hasOwnProp(config2, prop) ? config2[prop] : void 0;
    const configValue = merge2(a, b, prop);
    utils$1.isUndefined(configValue) && merge2 !== mergeDirectKeys || (config[prop] = configValue);
  });
  if (utils$1.hasOwnProp(config2, "validateStatus") && utils$1.isUndefined(config2.validateStatus) && getMergedTransitionalOption("validateStatusUndefinedResolves") === false) {
    if (utils$1.hasOwnProp(config1, "validateStatus")) {
      config.validateStatus = getMergedValue(void 0, config1.validateStatus);
    } else {
      delete config.validateStatus;
    }
  }
  return config;
}
const FORM_DATA_CONTENT_HEADERS = ["content-type", "content-length"];
function setFormDataHeaders(headers, formHeaders, policy) {
  if (policy !== "content-only") {
    headers.set(formHeaders);
    return;
  }
  Object.entries(formHeaders || {}).forEach(([key, val]) => {
    if (FORM_DATA_CONTENT_HEADERS.includes(key.toLowerCase())) {
      headers.set(key, val);
    }
  });
}
const encodeUTF8$1 = (str) => encodeURIComponent(str).replace(
  /%([0-9A-F]{2})/gi,
  (_, hex) => String.fromCharCode(parseInt(hex, 16))
);
function resolveConfig(config) {
  const newConfig = mergeConfig$1({}, config);
  const own2 = (key) => utils$1.hasOwnProp(newConfig, key) ? newConfig[key] : void 0;
  const data = own2("data");
  let withXSRFToken = own2("withXSRFToken");
  const xsrfHeaderName = own2("xsrfHeaderName");
  const xsrfCookieName = own2("xsrfCookieName");
  let headers = own2("headers");
  const auth = own2("auth");
  const baseURL = own2("baseURL");
  const allowAbsoluteUrls = own2("allowAbsoluteUrls");
  const url = own2("url");
  newConfig.headers = headers = AxiosHeaders$2.from(headers);
  newConfig.url = buildURL(
    buildFullPath(baseURL, url, allowAbsoluteUrls, newConfig),
    own2("params"),
    own2("paramsSerializer")
  );
  if (auth) {
    const username = utils$1.getSafeProp(auth, "username") || "";
    const password = utils$1.getSafeProp(auth, "password") || "";
    try {
      headers.set(
        "Authorization",
        "Basic " + btoa(username + ":" + (password ? encodeUTF8$1(password) : ""))
      );
    } catch (e) {
      throw AxiosError$2.from(e, AxiosError$2.ERR_BAD_OPTION_VALUE, config);
    }
  }
  if (utils$1.isFormData(data)) {
    if (platform.hasStandardBrowserEnv || platform.hasStandardBrowserWebWorkerEnv || utils$1.isReactNative(data)) {
      headers.setContentType(void 0);
    } else if (utils$1.isFunction(data.getHeaders)) {
      setFormDataHeaders(headers, data.getHeaders(), own2("formDataHeaderPolicy"));
    }
  }
  if (platform.hasStandardBrowserEnv) {
    if (utils$1.isFunction(withXSRFToken)) {
      withXSRFToken = withXSRFToken(newConfig);
    }
    const shouldSendXSRF = withXSRFToken === true || withXSRFToken == null && isURLSameOrigin(newConfig.url);
    if (shouldSendXSRF) {
      const xsrfValue = xsrfHeaderName && xsrfCookieName && cookies.read(xsrfCookieName);
      if (xsrfValue) {
        headers.set(xsrfHeaderName, xsrfValue);
      }
    }
  }
  return newConfig;
}
const isXHRAdapterSupported = typeof XMLHttpRequest !== "undefined";
const xhrAdapter = isXHRAdapterSupported && function(config) {
  return new Promise(function dispatchXhrRequest(resolve, reject) {
    const _config = resolveConfig(config);
    let requestData = _config.data;
    const requestHeaders = AxiosHeaders$2.from(_config.headers).normalize();
    let { responseType, onUploadProgress, onDownloadProgress } = _config;
    let onCanceled;
    let uploadThrottled, downloadThrottled;
    let flushUpload, flushDownload;
    function done() {
      flushUpload && flushUpload();
      flushDownload && flushDownload();
      _config.cancelToken && _config.cancelToken.unsubscribe(onCanceled);
      _config.signal && _config.signal.removeEventListener("abort", onCanceled);
    }
    let request = new XMLHttpRequest();
    request.open(_config.method.toUpperCase(), _config.url, true);
    request.timeout = _config.timeout;
    function onloadend() {
      if (!request) {
        return;
      }
      const responseHeaders = AxiosHeaders$2.from(
        "getAllResponseHeaders" in request && request.getAllResponseHeaders()
      );
      const responseData = !responseType || responseType === "text" || responseType === "json" ? request.responseText : request.response;
      const response = {
        data: responseData,
        status: request.status,
        statusText: request.statusText,
        headers: responseHeaders,
        config,
        request
      };
      settle(
        function _resolve(value) {
          resolve(value);
          done();
        },
        function _reject(err) {
          reject(err);
          done();
        },
        response
      );
      request = null;
    }
    if ("onloadend" in request) {
      request.onloadend = onloadend;
    } else {
      request.onreadystatechange = function handleLoad() {
        if (!request || request.readyState !== 4) {
          return;
        }
        if (request.status === 0 && !(request.responseURL && request.responseURL.startsWith("file:"))) {
          return;
        }
        setTimeout(onloadend);
      };
    }
    request.onabort = function handleAbort() {
      if (!request) {
        return;
      }
      reject(new AxiosError$2("Request aborted", AxiosError$2.ECONNABORTED, config, request));
      done();
      request = null;
    };
    request.onerror = function handleError(event) {
      const msg = event && event.message ? event.message : "Network Error";
      const err = new AxiosError$2(msg, AxiosError$2.ERR_NETWORK, config, request);
      err.event = event || null;
      reject(err);
      done();
      request = null;
    };
    request.ontimeout = function handleTimeout() {
      let timeoutErrorMessage = _config.timeout ? "timeout of " + _config.timeout + "ms exceeded" : "timeout exceeded";
      const transitional2 = _config.transitional || transitionalDefaults;
      if (_config.timeoutErrorMessage) {
        timeoutErrorMessage = _config.timeoutErrorMessage;
      }
      reject(
        new AxiosError$2(
          timeoutErrorMessage,
          transitional2.clarifyTimeoutError ? AxiosError$2.ETIMEDOUT : AxiosError$2.ECONNABORTED,
          config,
          request
        )
      );
      done();
      request = null;
    };
    requestData === void 0 && requestHeaders.setContentType(null);
    if ("setRequestHeader" in request) {
      utils$1.forEach(toByteStringHeaderObject(requestHeaders), function setRequestHeader(val, key) {
        request.setRequestHeader(key, val);
      });
    }
    if (!utils$1.isUndefined(_config.withCredentials)) {
      request.withCredentials = !!_config.withCredentials;
    }
    if (responseType && responseType !== "json") {
      request.responseType = _config.responseType;
    }
    if (onDownloadProgress) {
      [downloadThrottled, flushDownload] = progressEventReducer(onDownloadProgress, true);
      request.addEventListener("progress", downloadThrottled);
    }
    if (onUploadProgress && request.upload) {
      [uploadThrottled, flushUpload] = progressEventReducer(onUploadProgress);
      request.upload.addEventListener("progress", uploadThrottled);
      request.upload.addEventListener("loadend", flushUpload);
    }
    if (_config.cancelToken || _config.signal) {
      onCanceled = (cancel) => {
        if (!request) {
          return;
        }
        reject(!cancel || cancel.type ? new CanceledError$2(null, config, request) : cancel);
        request.abort();
        done();
        request = null;
      };
      _config.cancelToken && _config.cancelToken.subscribe(onCanceled);
      if (_config.signal) {
        _config.signal.aborted ? onCanceled() : _config.signal.addEventListener("abort", onCanceled);
      }
    }
    const protocol = parseProtocol(_config.url);
    if (protocol && !platform.protocols.includes(protocol)) {
      reject(
        new AxiosError$2(
          "Unsupported protocol " + protocol + ":",
          AxiosError$2.ERR_BAD_REQUEST,
          config
        )
      );
      done();
      return;
    }
    request.send(requestData || null);
  });
};
const composeSignals = (signals, timeout) => {
  signals = signals ? signals.filter(Boolean) : [];
  if (!timeout && !signals.length) {
    return;
  }
  const controller = new AbortController();
  let aborted = false;
  const onabort = function(reason) {
    if (!aborted) {
      aborted = true;
      unsubscribe();
      const err = reason instanceof Error ? reason : this.reason;
      controller.abort(
        err instanceof AxiosError$2 ? err : new CanceledError$2(err instanceof Error ? err.message : err)
      );
    }
  };
  let timer = timeout && setTimeout(() => {
    timer = null;
    onabort(new AxiosError$2(`timeout of ${timeout}ms exceeded`, AxiosError$2.ETIMEDOUT));
  }, timeout);
  const unsubscribe = () => {
    if (!signals) {
      return;
    }
    timer && clearTimeout(timer);
    timer = null;
    signals.forEach((signal2) => {
      signal2.unsubscribe ? signal2.unsubscribe(onabort) : signal2.removeEventListener("abort", onabort);
    });
    signals = null;
  };
  signals.forEach((signal2) => signal2.addEventListener("abort", onabort, { once: true }));
  const { signal } = controller;
  signal.unsubscribe = () => utils$1.asap(unsubscribe);
  return signal;
};
const composeSignals$1 = composeSignals;
const streamChunk = function* (chunk, chunkSize) {
  let len = chunk.byteLength;
  if (!chunkSize || len < chunkSize) {
    yield chunk;
    return;
  }
  let pos = 0;
  let end;
  while (pos < len) {
    end = pos + chunkSize;
    yield chunk.slice(pos, end);
    pos = end;
  }
};
const readBytes = async function* (iterable, chunkSize) {
  for await (const chunk of readStream(iterable)) {
    yield* streamChunk(chunk, chunkSize);
  }
};
const readStream = async function* (stream) {
  if (stream[Symbol.asyncIterator]) {
    yield* stream;
    return;
  }
  const reader = stream.getReader();
  try {
    for (; ; ) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      yield value;
    }
  } finally {
    await reader.cancel();
  }
};
const trackStream = (stream, chunkSize, onProgress, onFinish) => {
  const iterator2 = readBytes(stream, chunkSize);
  let bytes = 0;
  let done;
  let _onFinish = (e) => {
    if (!done) {
      done = true;
      onFinish && onFinish(e);
    }
  };
  return new ReadableStream(
    {
      async pull(controller) {
        try {
          const { done: done2, value } = await iterator2.next();
          if (done2) {
            _onFinish();
            controller.close();
            return;
          }
          let len = value.byteLength;
          if (onProgress) {
            let loadedBytes = bytes += len;
            onProgress(loadedBytes);
          }
          controller.enqueue(new Uint8Array(value));
        } catch (err) {
          _onFinish(err);
          throw err;
        }
      },
      cancel(reason) {
        _onFinish(reason);
        return iterator2.return();
      }
    },
    {
      highWaterMark: 2
    }
  );
};
const isHexDigit = (charCode) => charCode >= 48 && charCode <= 57 || charCode >= 65 && charCode <= 70 || charCode >= 97 && charCode <= 102;
const isPercentEncodedByte = (str, i, len) => i + 2 < len && isHexDigit(str.charCodeAt(i + 1)) && isHexDigit(str.charCodeAt(i + 2));
function estimateDataURLDecodedBytes(url) {
  if (!url || typeof url !== "string")
    return 0;
  if (!url.startsWith("data:"))
    return 0;
  const comma = url.indexOf(",");
  if (comma < 0)
    return 0;
  const meta = url.slice(5, comma);
  const body = url.slice(comma + 1);
  const isBase64 = /;base64/i.test(meta);
  if (isBase64) {
    let effectiveLen = body.length;
    const len = body.length;
    for (let i = 0; i < len; i++) {
      if (body.charCodeAt(i) === 37 && i + 2 < len) {
        const a = body.charCodeAt(i + 1);
        const b = body.charCodeAt(i + 2);
        const isHex = isHexDigit(a) && isHexDigit(b);
        if (isHex) {
          effectiveLen -= 2;
          i += 2;
        }
      }
    }
    let pad = 0;
    let idx = len - 1;
    const tailIsPct3D = (j) => j >= 2 && body.charCodeAt(j - 2) === 37 && // '%'
    body.charCodeAt(j - 1) === 51 && // '3'
    (body.charCodeAt(j) === 68 || body.charCodeAt(j) === 100);
    if (idx >= 0) {
      if (body.charCodeAt(idx) === 61) {
        pad++;
        idx--;
      } else if (tailIsPct3D(idx)) {
        pad++;
        idx -= 3;
      }
    }
    if (pad === 1 && idx >= 0) {
      if (body.charCodeAt(idx) === 61) {
        pad++;
      } else if (tailIsPct3D(idx)) {
        pad++;
      }
    }
    const groups = Math.floor(effectiveLen / 4);
    const bytes2 = groups * 3 - (pad || 0);
    return bytes2 > 0 ? bytes2 : 0;
  }
  let bytes = 0;
  for (let i = 0, len = body.length; i < len; i++) {
    const c = body.charCodeAt(i);
    if (c === 37 && isPercentEncodedByte(body, i, len)) {
      bytes += 1;
      i += 2;
    } else if (c < 128) {
      bytes += 1;
    } else if (c < 2048) {
      bytes += 2;
    } else if (c >= 55296 && c <= 56319 && i + 1 < len) {
      const next = body.charCodeAt(i + 1);
      if (next >= 56320 && next <= 57343) {
        bytes += 4;
        i++;
      } else {
        bytes += 3;
      }
    } else {
      bytes += 3;
    }
  }
  return bytes;
}
const VERSION$1 = "1.18.1";
const DEFAULT_CHUNK_SIZE = 64 * 1024;
const { isFunction } = utils$1;
const encodeUTF8 = (str) => encodeURIComponent(str).replace(
  /%([0-9A-F]{2})/gi,
  (_, hex) => String.fromCharCode(parseInt(hex, 16))
);
const decodeURIComponentSafe = (value) => {
  if (!utils$1.isString(value)) {
    return value;
  }
  try {
    return decodeURIComponent(value);
  } catch (error) {
    return value;
  }
};
const test = (fn, ...args) => {
  try {
    return !!fn(...args);
  } catch (e) {
    return false;
  }
};
const maybeWithAuthCredentials = (url) => {
  const protocolIndex = url.indexOf("://");
  let urlToCheck = url;
  if (protocolIndex !== -1) {
    urlToCheck = urlToCheck.slice(protocolIndex + 3);
  }
  return urlToCheck.includes("@") || urlToCheck.includes(":");
};
const factory = (env) => {
  const globalObject = utils$1.global !== void 0 && utils$1.global !== null ? utils$1.global : globalThis;
  const { ReadableStream: ReadableStream2, TextEncoder: TextEncoder2 } = globalObject;
  env = utils$1.merge.call(
    {
      skipUndefined: true
    },
    {
      Request: globalObject.Request,
      Response: globalObject.Response
    },
    env
  );
  const { fetch: envFetch, Request, Response } = env;
  const isFetchSupported = envFetch ? isFunction(envFetch) : typeof fetch === "function";
  const isRequestSupported = isFunction(Request);
  const isResponseSupported = isFunction(Response);
  if (!isFetchSupported) {
    return false;
  }
  const isReadableStreamSupported = isFetchSupported && isFunction(ReadableStream2);
  const encodeText = isFetchSupported && (typeof TextEncoder2 === "function" ? ((encoder) => (str) => encoder.encode(str))(new TextEncoder2()) : async (str) => new Uint8Array(await new Request(str).arrayBuffer()));
  const supportsRequestStream = isRequestSupported && isReadableStreamSupported && test(() => {
    let duplexAccessed = false;
    const request = new Request(platform.origin, {
      body: new ReadableStream2(),
      method: "POST",
      get duplex() {
        duplexAccessed = true;
        return "half";
      }
    });
    const hasContentType = request.headers.has("Content-Type");
    if (request.body != null) {
      request.body.cancel();
    }
    return duplexAccessed && !hasContentType;
  });
  const supportsResponseStream = isResponseSupported && isReadableStreamSupported && test(() => utils$1.isReadableStream(new Response("").body));
  const resolvers = {
    stream: supportsResponseStream && ((res) => res.body)
  };
  isFetchSupported && (() => {
    ["text", "arrayBuffer", "blob", "formData", "stream"].forEach((type) => {
      !resolvers[type] && (resolvers[type] = (res, config) => {
        let method = res && res[type];
        if (method) {
          return method.call(res);
        }
        throw new AxiosError$2(
          `Response type '${type}' is not supported`,
          AxiosError$2.ERR_NOT_SUPPORT,
          config
        );
      });
    });
  })();
  const getBodyLength = async (body) => {
    if (body == null) {
      return 0;
    }
    if (utils$1.isBlob(body)) {
      return body.size;
    }
    if (utils$1.isSpecCompliantForm(body)) {
      const _request = new Request(platform.origin, {
        method: "POST",
        body
      });
      return (await _request.arrayBuffer()).byteLength;
    }
    if (utils$1.isArrayBufferView(body) || utils$1.isArrayBuffer(body)) {
      return body.byteLength;
    }
    if (utils$1.isURLSearchParams(body)) {
      body = body + "";
    }
    if (utils$1.isString(body)) {
      return (await encodeText(body)).byteLength;
    }
  };
  const resolveBodyLength = async (headers, body) => {
    const length = utils$1.toFiniteNumber(headers.getContentLength());
    return length == null ? getBodyLength(body) : length;
  };
  return async (config) => {
    let {
      url,
      method,
      data,
      signal,
      cancelToken,
      timeout,
      onDownloadProgress,
      onUploadProgress,
      responseType,
      headers,
      withCredentials = "same-origin",
      fetchOptions,
      maxContentLength,
      maxBodyLength
    } = resolveConfig(config);
    const hasMaxContentLength = utils$1.isNumber(maxContentLength) && maxContentLength > -1;
    const hasMaxBodyLength = utils$1.isNumber(maxBodyLength) && maxBodyLength > -1;
    const own2 = (key) => utils$1.hasOwnProp(config, key) ? config[key] : void 0;
    let _fetch = envFetch || fetch;
    responseType = responseType ? (responseType + "").toLowerCase() : "text";
    let composedSignal = composeSignals$1(
      [signal, cancelToken && cancelToken.toAbortSignal()],
      timeout
    );
    let request = null;
    const unsubscribe = composedSignal && composedSignal.unsubscribe && (() => {
      composedSignal.unsubscribe();
    });
    let requestContentLength;
    let pendingBodyError = null;
    const maxBodyLengthError = () => new AxiosError$2(
      "Request body larger than maxBodyLength limit",
      AxiosError$2.ERR_BAD_REQUEST,
      config,
      request
    );
    try {
      let auth = void 0;
      const configAuth = own2("auth");
      if (configAuth) {
        const username = utils$1.getSafeProp(configAuth, "username") || "";
        const password = utils$1.getSafeProp(configAuth, "password") || "";
        auth = {
          username,
          password
        };
      }
      if (maybeWithAuthCredentials(url)) {
        const parsedURL = new URL(url, platform.origin);
        if (!auth && (parsedURL.username || parsedURL.password)) {
          const urlUsername = decodeURIComponentSafe(parsedURL.username);
          const urlPassword = decodeURIComponentSafe(parsedURL.password);
          auth = {
            username: urlUsername,
            password: urlPassword
          };
        }
        if (parsedURL.username || parsedURL.password) {
          parsedURL.username = "";
          parsedURL.password = "";
          url = parsedURL.href;
        }
      }
      if (auth) {
        headers.delete("authorization");
        headers.set(
          "Authorization",
          "Basic " + btoa(encodeUTF8((auth.username || "") + ":" + (auth.password || "")))
        );
      }
      if (hasMaxContentLength && typeof url === "string" && url.startsWith("data:")) {
        const estimated = estimateDataURLDecodedBytes(url);
        if (estimated > maxContentLength) {
          throw new AxiosError$2(
            "maxContentLength size of " + maxContentLength + " exceeded",
            AxiosError$2.ERR_BAD_RESPONSE,
            config,
            request
          );
        }
      }
      if (hasMaxBodyLength && method !== "get" && method !== "head") {
        const outboundLength = await getBodyLength(data);
        if (typeof outboundLength === "number" && isFinite(outboundLength)) {
          requestContentLength = outboundLength;
          if (outboundLength > maxBodyLength) {
            throw maxBodyLengthError();
          }
        }
      }
      const mustEnforceStreamBody = hasMaxBodyLength && (utils$1.isReadableStream(data) || utils$1.isStream(data));
      const trackRequestStream = (stream, onProgress, flush) => trackStream(
        stream,
        DEFAULT_CHUNK_SIZE,
        (loadedBytes) => {
          if (hasMaxBodyLength && loadedBytes > maxBodyLength) {
            throw pendingBodyError = maxBodyLengthError();
          }
          onProgress && onProgress(loadedBytes);
        },
        flush
      );
      if (supportsRequestStream && method !== "get" && method !== "head" && (onUploadProgress || mustEnforceStreamBody)) {
        requestContentLength = requestContentLength == null ? await resolveBodyLength(headers, data) : requestContentLength;
        if (requestContentLength !== 0 || mustEnforceStreamBody) {
          let _request = new Request(url, {
            method: "POST",
            body: data,
            duplex: "half"
          });
          let contentTypeHeader;
          if (utils$1.isFormData(data) && (contentTypeHeader = _request.headers.get("content-type"))) {
            headers.setContentType(contentTypeHeader);
          }
          if (_request.body) {
            const [onProgress, flush] = onUploadProgress && progressEventDecorator(
              requestContentLength,
              progressEventReducer(asyncDecorator(onUploadProgress))
            ) || [];
            data = trackRequestStream(_request.body, onProgress, flush);
          }
        }
      } else if (mustEnforceStreamBody && !isRequestSupported && isReadableStreamSupported && method !== "get" && method !== "head") {
        data = trackRequestStream(data);
      } else if (mustEnforceStreamBody && isRequestSupported && !supportsRequestStream && method !== "get" && method !== "head") {
        throw new AxiosError$2(
          "Stream request bodies are not supported by the current fetch implementation",
          AxiosError$2.ERR_NOT_SUPPORT,
          config,
          request
        );
      }
      if (!utils$1.isString(withCredentials)) {
        withCredentials = withCredentials ? "include" : "omit";
      }
      const isCredentialsSupported = isRequestSupported && "credentials" in Request.prototype;
      if (utils$1.isFormData(data)) {
        const contentType = headers.getContentType();
        if (contentType && /^multipart\/form-data/i.test(contentType) && !/boundary=/i.test(contentType)) {
          headers.delete("content-type");
        }
      }
      headers.set("User-Agent", "axios/" + VERSION$1, false);
      const resolvedOptions = {
        ...fetchOptions,
        signal: composedSignal,
        method: method.toUpperCase(),
        headers: toByteStringHeaderObject(headers.normalize()),
        body: data,
        duplex: "half",
        credentials: isCredentialsSupported ? withCredentials : void 0
      };
      request = isRequestSupported && new Request(url, resolvedOptions);
      let response = await (isRequestSupported ? _fetch(request, fetchOptions) : _fetch(url, resolvedOptions));
      const responseHeaders = AxiosHeaders$2.from(response.headers);
      if (hasMaxContentLength) {
        const declaredLength = utils$1.toFiniteNumber(responseHeaders.getContentLength());
        if (declaredLength != null && declaredLength > maxContentLength) {
          throw new AxiosError$2(
            "maxContentLength size of " + maxContentLength + " exceeded",
            AxiosError$2.ERR_BAD_RESPONSE,
            config,
            request
          );
        }
      }
      const isStreamResponse = supportsResponseStream && (responseType === "stream" || responseType === "response");
      if (supportsResponseStream && response.body && (onDownloadProgress || hasMaxContentLength || isStreamResponse && unsubscribe)) {
        const options = {};
        ["status", "statusText", "headers"].forEach((prop) => {
          options[prop] = response[prop];
        });
        const responseContentLength = utils$1.toFiniteNumber(responseHeaders.getContentLength());
        const [onProgress, flush] = onDownloadProgress && progressEventDecorator(
          responseContentLength,
          progressEventReducer(asyncDecorator(onDownloadProgress), true)
        ) || [];
        let bytesRead = 0;
        const onChunkProgress = (loadedBytes) => {
          if (hasMaxContentLength) {
            bytesRead = loadedBytes;
            if (bytesRead > maxContentLength) {
              throw new AxiosError$2(
                "maxContentLength size of " + maxContentLength + " exceeded",
                AxiosError$2.ERR_BAD_RESPONSE,
                config,
                request
              );
            }
          }
          onProgress && onProgress(loadedBytes);
        };
        response = new Response(
          trackStream(response.body, DEFAULT_CHUNK_SIZE, onChunkProgress, () => {
            flush && flush();
            unsubscribe && unsubscribe();
          }),
          options
        );
      }
      responseType = responseType || "text";
      let responseData = await resolvers[utils$1.findKey(resolvers, responseType) || "text"](
        response,
        config
      );
      if (hasMaxContentLength && !supportsResponseStream && !isStreamResponse) {
        let materializedSize;
        if (responseData != null) {
          if (typeof responseData.byteLength === "number") {
            materializedSize = responseData.byteLength;
          } else if (typeof responseData.size === "number") {
            materializedSize = responseData.size;
          } else if (typeof responseData === "string") {
            materializedSize = typeof TextEncoder2 === "function" ? new TextEncoder2().encode(responseData).byteLength : responseData.length;
          }
        }
        if (typeof materializedSize === "number" && materializedSize > maxContentLength) {
          throw new AxiosError$2(
            "maxContentLength size of " + maxContentLength + " exceeded",
            AxiosError$2.ERR_BAD_RESPONSE,
            config,
            request
          );
        }
      }
      !isStreamResponse && unsubscribe && unsubscribe();
      return await new Promise((resolve, reject) => {
        settle(resolve, reject, {
          data: responseData,
          headers: AxiosHeaders$2.from(response.headers),
          status: response.status,
          statusText: response.statusText,
          config,
          request
        });
      });
    } catch (err) {
      unsubscribe && unsubscribe();
      if (composedSignal && composedSignal.aborted && composedSignal.reason instanceof AxiosError$2) {
        const canceledError = composedSignal.reason;
        canceledError.config = config;
        request && (canceledError.request = request);
        if (err !== canceledError) {
          Object.defineProperty(canceledError, "cause", {
            __proto__: null,
            value: err,
            writable: true,
            enumerable: false,
            configurable: true
          });
        }
        throw canceledError;
      }
      if (pendingBodyError) {
        request && !pendingBodyError.request && (pendingBodyError.request = request);
        throw pendingBodyError;
      }
      if (err instanceof AxiosError$2) {
        request && !err.request && (err.request = request);
        throw err;
      }
      if (err && err.name === "TypeError" && /Load failed|fetch/i.test(err.message)) {
        const networkError = new AxiosError$2(
          "Network Error",
          AxiosError$2.ERR_NETWORK,
          config,
          request,
          err && err.response
        );
        Object.defineProperty(networkError, "cause", {
          __proto__: null,
          value: err.cause || err,
          writable: true,
          enumerable: false,
          configurable: true
        });
        throw networkError;
      }
      throw AxiosError$2.from(err, err && err.code, config, request, err && err.response);
    }
  };
};
const seedCache = /* @__PURE__ */ new Map();
const getFetch = (config) => {
  let env = config && config.env || {};
  const { fetch: fetch2, Request, Response } = env;
  const seeds = [Request, Response, fetch2];
  let len = seeds.length, i = len, seed, target, map = seedCache;
  while (i--) {
    seed = seeds[i];
    target = map.get(seed);
    target === void 0 && map.set(seed, target = i ? /* @__PURE__ */ new Map() : factory(env));
    map = target;
  }
  return target;
};
getFetch();
const knownAdapters = {
  http: httpAdapter,
  xhr: xhrAdapter,
  fetch: {
    get: getFetch
  }
};
utils$1.forEach(knownAdapters, (fn, value) => {
  if (fn) {
    try {
      Object.defineProperty(fn, "name", { __proto__: null, value });
    } catch (e) {
    }
    Object.defineProperty(fn, "adapterName", { __proto__: null, value });
  }
});
const renderReason = (reason) => `- ${reason}`;
const isResolvedHandle = (adapter) => utils$1.isFunction(adapter) || adapter === null || adapter === false;
function getAdapter$1(adapters2, config) {
  adapters2 = utils$1.isArray(adapters2) ? adapters2 : [adapters2];
  const { length } = adapters2;
  let nameOrAdapter;
  let adapter;
  const rejectedReasons = {};
  for (let i = 0; i < length; i++) {
    nameOrAdapter = adapters2[i];
    let id;
    adapter = nameOrAdapter;
    if (!isResolvedHandle(nameOrAdapter)) {
      adapter = knownAdapters[(id = String(nameOrAdapter)).toLowerCase()];
      if (adapter === void 0) {
        throw new AxiosError$2(`Unknown adapter '${id}'`);
      }
    }
    if (adapter && (utils$1.isFunction(adapter) || (adapter = adapter.get(config)))) {
      break;
    }
    rejectedReasons[id || "#" + i] = adapter;
  }
  if (!adapter) {
    const reasons = Object.entries(rejectedReasons).map(
      ([id, state]) => `adapter ${id} ` + (state === false ? "is not supported by the environment" : "is not available in the build")
    );
    let s = length ? reasons.length > 1 ? "since :\n" + reasons.map(renderReason).join("\n") : " " + renderReason(reasons[0]) : "as no adapter specified";
    throw new AxiosError$2(
      `There is no suitable adapter to dispatch the request ` + s,
      AxiosError$2.ERR_NOT_SUPPORT
    );
  }
  return adapter;
}
const adapters = {
  /**
   * Resolve an adapter from a list of adapter names or functions.
   * @type {Function}
   */
  getAdapter: getAdapter$1,
  /**
   * Exposes all known adapters
   * @type {Object<string, Function|Object>}
   */
  adapters: knownAdapters
};
function throwIfCancellationRequested(config) {
  if (config.cancelToken) {
    config.cancelToken.throwIfRequested();
  }
  if (config.signal && config.signal.aborted) {
    throw new CanceledError$2(null, config);
  }
}
function dispatchRequest(config) {
  throwIfCancellationRequested(config);
  config.headers = AxiosHeaders$2.from(config.headers);
  config.data = transformData.call(config, config.transformRequest);
  if (["post", "put", "patch"].indexOf(config.method) !== -1) {
    config.headers.setContentType("application/x-www-form-urlencoded", false);
  }
  const adapter = adapters.getAdapter(config.adapter || defaults$1.adapter, config);
  return adapter(config).then(
    function onAdapterResolution(response) {
      throwIfCancellationRequested(config);
      config.response = response;
      try {
        response.data = transformData.call(config, config.transformResponse, response);
      } finally {
        delete config.response;
      }
      response.headers = AxiosHeaders$2.from(response.headers);
      return response;
    },
    function onAdapterRejection(reason) {
      if (!isCancel$1(reason)) {
        throwIfCancellationRequested(config);
        if (reason && reason.response) {
          config.response = reason.response;
          try {
            reason.response.data = transformData.call(
              config,
              config.transformResponse,
              reason.response
            );
          } finally {
            delete config.response;
          }
          reason.response.headers = AxiosHeaders$2.from(reason.response.headers);
        }
      }
      return Promise.reject(reason);
    }
  );
}
const validators$1 = {};
["object", "boolean", "number", "function", "string", "symbol"].forEach((type, i) => {
  validators$1[type] = function validator2(thing) {
    return typeof thing === type || "a" + (i < 1 ? "n " : " ") + type;
  };
});
const deprecatedWarnings = {};
validators$1.transitional = function transitional(validator2, version, message) {
  function formatMessage(opt, desc) {
    return "[Axios v" + VERSION$1 + "] Transitional option '" + opt + "'" + desc + (message ? ". " + message : "");
  }
  return (value, opt, opts) => {
    if (validator2 === false) {
      throw new AxiosError$2(
        formatMessage(opt, " has been removed" + (version ? " in " + version : "")),
        AxiosError$2.ERR_DEPRECATED
      );
    }
    if (version && !deprecatedWarnings[opt]) {
      deprecatedWarnings[opt] = true;
      console.warn(
        formatMessage(
          opt,
          " has been deprecated since v" + version + " and will be removed in the near future"
        )
      );
    }
    return validator2 ? validator2(value, opt, opts) : true;
  };
};
validators$1.spelling = function spelling(correctSpelling) {
  return (value, opt) => {
    console.warn(`${opt} is likely a misspelling of ${correctSpelling}`);
    return true;
  };
};
function assertOptions(options, schema, allowUnknown) {
  if (typeof options !== "object" || options === null) {
    throw new AxiosError$2("options must be an object", AxiosError$2.ERR_BAD_OPTION_VALUE);
  }
  const keys = Object.keys(options);
  let i = keys.length;
  while (i-- > 0) {
    const opt = keys[i];
    const validator2 = Object.prototype.hasOwnProperty.call(schema, opt) ? schema[opt] : void 0;
    if (validator2) {
      const value = options[opt];
      const result = value === void 0 || validator2(value, opt, options);
      if (result !== true) {
        throw new AxiosError$2(
          "option " + opt + " must be " + result,
          AxiosError$2.ERR_BAD_OPTION_VALUE
        );
      }
      continue;
    }
    if (allowUnknown !== true) {
      throw new AxiosError$2("Unknown option " + opt, AxiosError$2.ERR_BAD_OPTION);
    }
  }
}
const validator = {
  assertOptions,
  validators: validators$1
};
const validators = validator.validators;
let Axios$1 = class Axios {
  constructor(instanceConfig) {
    this.defaults = instanceConfig || {};
    this.interceptors = {
      request: new InterceptorManager$1(),
      response: new InterceptorManager$1()
    };
  }
  /**
   * Dispatch a request
   *
   * @param {String|Object} configOrUrl The config specific for this request (merged with this.defaults)
   * @param {?Object} config
   *
   * @returns {Promise} The Promise to be fulfilled
   */
  async request(configOrUrl, config) {
    try {
      return await this._request(configOrUrl, config);
    } catch (err) {
      if (err instanceof Error) {
        let dummy = {};
        Error.captureStackTrace ? Error.captureStackTrace(dummy) : dummy = new Error();
        const stack = (() => {
          if (!dummy.stack) {
            return "";
          }
          const firstNewlineIndex = dummy.stack.indexOf("\n");
          return firstNewlineIndex === -1 ? "" : dummy.stack.slice(firstNewlineIndex + 1);
        })();
        try {
          if (!err.stack) {
            err.stack = stack;
          } else if (stack) {
            const firstNewlineIndex = stack.indexOf("\n");
            const secondNewlineIndex = firstNewlineIndex === -1 ? -1 : stack.indexOf("\n", firstNewlineIndex + 1);
            const stackWithoutTwoTopLines = secondNewlineIndex === -1 ? "" : stack.slice(secondNewlineIndex + 1);
            if (!String(err.stack).endsWith(stackWithoutTwoTopLines)) {
              err.stack += "\n" + stack;
            }
          }
        } catch (e) {
        }
      }
      throw err;
    }
  }
  _request(configOrUrl, config) {
    if (typeof configOrUrl === "string") {
      config = config || {};
      config.url = configOrUrl;
    } else {
      config = configOrUrl || {};
    }
    config = mergeConfig$1(this.defaults, config);
    const { transitional: transitional2, paramsSerializer, headers } = config;
    if (transitional2 !== void 0) {
      validator.assertOptions(
        transitional2,
        {
          silentJSONParsing: validators.transitional(validators.boolean),
          forcedJSONParsing: validators.transitional(validators.boolean),
          clarifyTimeoutError: validators.transitional(validators.boolean),
          legacyInterceptorReqResOrdering: validators.transitional(validators.boolean),
          advertiseZstdAcceptEncoding: validators.transitional(validators.boolean),
          validateStatusUndefinedResolves: validators.transitional(validators.boolean)
        },
        false
      );
    }
    if (paramsSerializer != null) {
      if (utils$1.isFunction(paramsSerializer)) {
        config.paramsSerializer = {
          serialize: paramsSerializer
        };
      } else {
        validator.assertOptions(
          paramsSerializer,
          {
            encode: validators.function,
            serialize: validators.function
          },
          true
        );
      }
    }
    if (config.allowAbsoluteUrls !== void 0)
      ;
    else if (this.defaults.allowAbsoluteUrls !== void 0) {
      config.allowAbsoluteUrls = this.defaults.allowAbsoluteUrls;
    } else {
      config.allowAbsoluteUrls = true;
    }
    validator.assertOptions(
      config,
      {
        baseUrl: validators.spelling("baseURL"),
        withXsrfToken: validators.spelling("withXSRFToken")
      },
      true
    );
    config.method = (config.method || this.defaults.method || "get").toLowerCase();
    let contextHeaders = headers && utils$1.merge(headers.common, headers[config.method]);
    headers && utils$1.forEach(["delete", "get", "head", "post", "put", "patch", "query", "common"], (method) => {
      delete headers[method];
    });
    config.headers = AxiosHeaders$2.concat(contextHeaders, headers);
    const requestInterceptorChain = [];
    let synchronousRequestInterceptors = true;
    this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
      if (typeof interceptor.runWhen === "function" && interceptor.runWhen(config) === false) {
        return;
      }
      synchronousRequestInterceptors = synchronousRequestInterceptors && interceptor.synchronous;
      const transitional3 = config.transitional || transitionalDefaults;
      const legacyInterceptorReqResOrdering = transitional3 && transitional3.legacyInterceptorReqResOrdering;
      if (legacyInterceptorReqResOrdering) {
        requestInterceptorChain.unshift(interceptor.fulfilled, interceptor.rejected);
      } else {
        requestInterceptorChain.push(interceptor.fulfilled, interceptor.rejected);
      }
    });
    const responseInterceptorChain = [];
    this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
      responseInterceptorChain.push(interceptor.fulfilled, interceptor.rejected);
    });
    let promise;
    let i = 0;
    let len;
    if (!synchronousRequestInterceptors) {
      const chain = [dispatchRequest.bind(this), void 0];
      chain.unshift(...requestInterceptorChain);
      chain.push(...responseInterceptorChain);
      len = chain.length;
      promise = Promise.resolve(config);
      while (i < len) {
        promise = promise.then(chain[i++], chain[i++]);
      }
      return promise;
    }
    len = requestInterceptorChain.length;
    let newConfig = config;
    while (i < len) {
      const onFulfilled = requestInterceptorChain[i++];
      const onRejected = requestInterceptorChain[i++];
      try {
        newConfig = onFulfilled(newConfig);
      } catch (error) {
        onRejected.call(this, error);
        break;
      }
    }
    try {
      promise = dispatchRequest.call(this, newConfig);
    } catch (error) {
      return Promise.reject(error);
    }
    i = 0;
    len = responseInterceptorChain.length;
    while (i < len) {
      promise = promise.then(responseInterceptorChain[i++], responseInterceptorChain[i++]);
    }
    return promise;
  }
  getUri(config) {
    config = mergeConfig$1(this.defaults, config);
    const fullPath = buildFullPath(config.baseURL, config.url, config.allowAbsoluteUrls, config);
    return buildURL(fullPath, config.params, config.paramsSerializer);
  }
};
utils$1.forEach(["delete", "get", "head", "options"], function forEachMethodNoData(method) {
  Axios$1.prototype[method] = function(url, config) {
    return this.request(
      mergeConfig$1(config || {}, {
        method,
        url,
        data: config && utils$1.hasOwnProp(config, "data") ? config.data : void 0
      })
    );
  };
});
utils$1.forEach(["post", "put", "patch", "query"], function forEachMethodWithData(method) {
  function generateHTTPMethod(isForm) {
    return function httpMethod(url, data, config) {
      return this.request(
        mergeConfig$1(config || {}, {
          method,
          headers: isForm ? {
            "Content-Type": "multipart/form-data"
          } : {},
          url,
          data
        })
      );
    };
  }
  Axios$1.prototype[method] = generateHTTPMethod();
  if (method !== "query") {
    Axios$1.prototype[method + "Form"] = generateHTTPMethod(true);
  }
});
const Axios$2 = Axios$1;
let CancelToken$1 = class CancelToken {
  constructor(executor) {
    if (typeof executor !== "function") {
      throw new TypeError("executor must be a function.");
    }
    let resolvePromise;
    this.promise = new Promise(function promiseExecutor(resolve) {
      resolvePromise = resolve;
    });
    const token = this;
    this.promise.then((cancel) => {
      if (!token._listeners)
        return;
      let i = token._listeners.length;
      while (i-- > 0) {
        token._listeners[i](cancel);
      }
      token._listeners = null;
    });
    this.promise.then = (onfulfilled) => {
      let _resolve;
      const promise = new Promise((resolve) => {
        token.subscribe(resolve);
        _resolve = resolve;
      }).then(onfulfilled);
      promise.cancel = function reject() {
        token.unsubscribe(_resolve);
      };
      return promise;
    };
    executor(function cancel(message, config, request) {
      if (token.reason) {
        return;
      }
      token.reason = new CanceledError$2(message, config, request);
      resolvePromise(token.reason);
    });
  }
  /**
   * Throws a `CanceledError` if cancellation has been requested.
   */
  throwIfRequested() {
    if (this.reason) {
      throw this.reason;
    }
  }
  /**
   * Subscribe to the cancel signal
   */
  subscribe(listener) {
    if (this.reason) {
      listener(this.reason);
      return;
    }
    if (this._listeners) {
      this._listeners.push(listener);
    } else {
      this._listeners = [listener];
    }
  }
  /**
   * Unsubscribe from the cancel signal
   */
  unsubscribe(listener) {
    if (!this._listeners) {
      return;
    }
    const index = this._listeners.indexOf(listener);
    if (index !== -1) {
      this._listeners.splice(index, 1);
    }
  }
  toAbortSignal() {
    const controller = new AbortController();
    const abort = (err) => {
      controller.abort(err);
    };
    this.subscribe(abort);
    controller.signal.unsubscribe = () => this.unsubscribe(abort);
    return controller.signal;
  }
  /**
   * Returns an object that contains a new `CancelToken` and a function that, when called,
   * cancels the `CancelToken`.
   */
  static source() {
    let cancel;
    const token = new CancelToken(function executor(c) {
      cancel = c;
    });
    return {
      token,
      cancel
    };
  }
};
const CancelToken$2 = CancelToken$1;
function spread$1(callback) {
  return function wrap(arr) {
    return callback.apply(null, arr);
  };
}
function isAxiosError$1(payload) {
  return utils$1.isObject(payload) && payload.isAxiosError === true;
}
const HttpStatusCode$1 = {
  Continue: 100,
  SwitchingProtocols: 101,
  Processing: 102,
  EarlyHints: 103,
  Ok: 200,
  Created: 201,
  Accepted: 202,
  NonAuthoritativeInformation: 203,
  NoContent: 204,
  ResetContent: 205,
  PartialContent: 206,
  MultiStatus: 207,
  AlreadyReported: 208,
  ImUsed: 226,
  MultipleChoices: 300,
  MovedPermanently: 301,
  Found: 302,
  SeeOther: 303,
  NotModified: 304,
  UseProxy: 305,
  Unused: 306,
  TemporaryRedirect: 307,
  PermanentRedirect: 308,
  BadRequest: 400,
  Unauthorized: 401,
  PaymentRequired: 402,
  Forbidden: 403,
  NotFound: 404,
  MethodNotAllowed: 405,
  NotAcceptable: 406,
  ProxyAuthenticationRequired: 407,
  RequestTimeout: 408,
  Conflict: 409,
  Gone: 410,
  LengthRequired: 411,
  PreconditionFailed: 412,
  PayloadTooLarge: 413,
  UriTooLong: 414,
  UnsupportedMediaType: 415,
  RangeNotSatisfiable: 416,
  ExpectationFailed: 417,
  ImATeapot: 418,
  MisdirectedRequest: 421,
  UnprocessableEntity: 422,
  Locked: 423,
  FailedDependency: 424,
  TooEarly: 425,
  UpgradeRequired: 426,
  PreconditionRequired: 428,
  TooManyRequests: 429,
  RequestHeaderFieldsTooLarge: 431,
  UnavailableForLegalReasons: 451,
  InternalServerError: 500,
  NotImplemented: 501,
  BadGateway: 502,
  ServiceUnavailable: 503,
  GatewayTimeout: 504,
  HttpVersionNotSupported: 505,
  VariantAlsoNegotiates: 506,
  InsufficientStorage: 507,
  LoopDetected: 508,
  NotExtended: 510,
  NetworkAuthenticationRequired: 511,
  WebServerIsDown: 521,
  ConnectionTimedOut: 522,
  OriginIsUnreachable: 523,
  TimeoutOccurred: 524,
  SslHandshakeFailed: 525,
  InvalidSslCertificate: 526
};
Object.entries(HttpStatusCode$1).forEach(([key, value]) => {
  HttpStatusCode$1[value] = key;
});
const HttpStatusCode$2 = HttpStatusCode$1;
function createInstance(defaultConfig) {
  const context = new Axios$2(defaultConfig);
  const instance = bind(Axios$2.prototype.request, context);
  utils$1.extend(instance, Axios$2.prototype, context, { allOwnKeys: true });
  utils$1.extend(instance, context, null, { allOwnKeys: true });
  instance.create = function create2(instanceConfig) {
    return createInstance(mergeConfig$1(defaultConfig, instanceConfig));
  };
  return instance;
}
const axios = createInstance(defaults$1);
axios.Axios = Axios$2;
axios.CanceledError = CanceledError$2;
axios.CancelToken = CancelToken$2;
axios.isCancel = isCancel$1;
axios.VERSION = VERSION$1;
axios.toFormData = toFormData$1;
axios.AxiosError = AxiosError$2;
axios.Cancel = axios.CanceledError;
axios.all = function all(promises) {
  return Promise.all(promises);
};
axios.spread = spread$1;
axios.isAxiosError = isAxiosError$1;
axios.mergeConfig = mergeConfig$1;
axios.AxiosHeaders = AxiosHeaders$2;
axios.formToJSON = (thing) => formDataToJSON(utils$1.isHTMLForm(thing) ? new FormData(thing) : thing);
axios.getAdapter = adapters.getAdapter;
axios.HttpStatusCode = HttpStatusCode$2;
axios.default = axios;
const axios$1 = axios;
const {
  Axios: Axios2,
  AxiosError: AxiosError2,
  CanceledError: CanceledError2,
  isCancel,
  CancelToken: CancelToken2,
  VERSION,
  all: all2,
  Cancel,
  isAxiosError,
  spread,
  toFormData,
  AxiosHeaders: AxiosHeaders2,
  HttpStatusCode,
  formToJSON,
  getAdapter,
  mergeConfig,
  create
} = axios$1;
const API_HOST$1 = typeof window !== "undefined" && window.location && window.location.hostname || "127.0.0.1";
const API_BASE_URL = `http://${API_HOST$1}:27865/api/v1/wechat-bot`;
function getErrorMessage(error) {
  var _a, _b;
  if (error instanceof AxiosError2) {
    return ((_b = (_a = error.response) == null ? void 0 : _a.data) == null ? void 0 : _b.error) || error.message;
  }
  if (error instanceof Error)
    return error.message;
  return String(error);
}
class WechatBotService {
  /** 启动机器人（检查容器健康状态，已登录则进入 running） */
  async start() {
    try {
      const resp = await axios$1.post(`${API_BASE_URL}/start`);
      return {
        ok: true,
        state: resp.data.state,
        logged_in: resp.data.logged_in,
        login_url: resp.data.login_url
      };
    } catch (error) {
      return { ok: false, error: getErrorMessage(error) };
    }
  }
  /** 停止机器人（仅更新状态，容器常驻） */
  async stop() {
    try {
      const resp = await axios$1.post(`${API_BASE_URL}/stop`);
      return { ok: true, state: resp.data.state };
    } catch (error) {
      return { ok: false, error: getErrorMessage(error) };
    }
  }
  /**
   * 重置（清空聊天历史记录，不清理账号信息/监听列表/登录态）
   *
   * 安全边界（与后端 /reset 接口一致）：
   *   - 清理：wechat_bot_history.json（聊天记录）
   *   - 保留：账号状态、监听列表、登录态、AI 配置
   *
   * 返回值含 message/cleared/preserved 字段，用于前端显示清理范围确认
   */
  async reset() {
    try {
      const resp = await axios$1.post(`${API_BASE_URL}/reset`);
      return {
        ok: true,
        state: resp.data.state,
        message: resp.data.message,
        cleared: resp.data.cleared,
        preserved: resp.data.preserved
      };
    } catch (error) {
      return { ok: false, error: getErrorMessage(error) };
    }
  }
  /** 获取当前状态 */
  async getState() {
    try {
      const resp = await axios$1.get(`${API_BASE_URL}/state`);
      return { ok: true, state: resp.data.state };
    } catch (error) {
      return { ok: false, error: getErrorMessage(error) };
    }
  }
  /** 获取消息历史 */
  async getHistory(limit = 50, offset = 0) {
    try {
      const resp = await axios$1.get(`${API_BASE_URL}/history`, {
        params: { limit, offset }
      });
      return { ok: true, history: resp.data.history, total: resp.data.total };
    } catch (error) {
      return { ok: false, error: getErrorMessage(error) };
    }
  }
  /** 主动发消息（to 为接收者昵称，text 为文本内容） */
  async send(params) {
    try {
      const resp = await axios$1.post(`${API_BASE_URL}/send`, params);
      return { ok: resp.data.ok, message: resp.data.message };
    } catch (error) {
      return { ok: false, error: getErrorMessage(error) };
    }
  }
  /**
   * 获取登录页面 URL（webhook 模式无二维码图片，用户在新窗口打开 URL 扫码）
   * 返回 { url: "http://127.0.0.1:3001/login?token=xxx", token: "xxx" }
   */
  async getLoginUrl() {
    try {
      const resp = await axios$1.get(`${API_BASE_URL}/login-url`);
      return { ok: true, data: { url: resp.data.url, token: resp.data.token } };
    } catch (error) {
      return { ok: false, error: getErrorMessage(error) };
    }
  }
  /** 健康检查（含 wechatbot-webhook 容器状态） */
  async health() {
    var _a;
    try {
      const resp = await axios$1.get(`${API_BASE_URL}/health`, { timeout: 3e3 });
      return ((_a = resp.data) == null ? void 0 : _a.ok) === true;
    } catch {
      return false;
    }
  }
  /**
   * 切换开关（设置页调用）
   * 开启时后端会检查容器状态：容器在线且已登录 → running；否则返回 login_url
   * 关闭时状态变为 stopped，容器不受影响（常驻）
   */
  async toggle(enabled) {
    try {
      const resp = await axios$1.post(`${API_BASE_URL}/toggle`, { enabled });
      return { ok: true, state: resp.data.state };
    } catch (error) {
      return { ok: false, error: getErrorMessage(error) };
    }
  }
  /**
   * 管理监听列表
   * 返回值含 added/removed/message 字段，用于前端显示确认提示
   */
  async listen(action, name) {
    try {
      const resp = await axios$1.post(`${API_BASE_URL}/listen`, { action, name });
      return {
        ok: true,
        listen: resp.data.listen,
        added: resp.data.added,
        removed: resp.data.removed,
        message: resp.data.message
      };
    } catch (error) {
      return { ok: false, error: getErrorMessage(error) };
    }
  }
}
const wechatBotService = new WechatBotService();
const API_HOST = typeof window !== "undefined" && window.location && window.location.hostname || "127.0.0.1";
const BACKEND_BASE = `http://${API_HOST}:27865`;
function SettingsPage({ isDarkMode, setIsDarkMode }) {
  const navigate = useNavigate();
  const [providers, setProviders] = reactExports.useState([]);
  const [selectedProviderId, setSelectedProviderId] = reactExports.useState("deepseek");
  const [apiKey, setApiKey] = reactExports.useState("");
  const [baseUrl, setBaseUrl] = reactExports.useState("");
  const [model, setModel] = reactExports.useState("");
  const [enabled, setEnabled] = reactExports.useState(false);
  const [testResult, setTestResult] = reactExports.useState(null);
  const [testing, setTesting] = reactExports.useState(false);
  const [saved, setSaved] = reactExports.useState(false);
  const [lanEnabled, setLanEnabled] = reactExports.useState(() => localStorage.getItem("ruanlinyun_lan_mode") === "true");
  const [localIP, setLocalIP] = reactExports.useState(null);
  const [lanMessage, setLanMessage] = reactExports.useState(null);
  const [wechatState, setWechatState] = reactExports.useState(null);
  const [wechatEnabled, setWechatEnabled] = reactExports.useState(false);
  const [wechatBusy, setWechatBusy] = reactExports.useState(false);
  const [wechatError, setWechatError] = reactExports.useState(null);
  const [wechatSuccess, setWechatSuccess] = reactExports.useState(null);
  const [loginUrl, setLoginUrl] = reactExports.useState(null);
  const [listenInput, setListenInput] = reactExports.useState("");
  const [listenList, setListenList] = reactExports.useState([]);
  reactExports.useEffect(() => {
    const init = async () => {
      await apiConfigService.waitReady();
      const all3 = apiConfigService.getAll();
      setProviders(all3);
      if (all3.length > 0)
        loadProvider(all3[0].id, all3);
      try {
        const r = await fetch(`${BACKEND_BASE}/api/v1/network/lan-mode`);
        const data = await r.json();
        setLanEnabled(data.enabled);
        localStorage.setItem("ruanlinyun_lan_mode", String(data.enabled));
      } catch {
      }
      await refreshWechatState();
      try {
        const { ok, listen } = await wechatBotService.listen("list");
        if (ok && listen)
          setListenList(listen);
      } catch {
      }
    };
    init();
    fetchLocalIP();
    const wechatTimer = setInterval(refreshWechatState, 5e3);
    return () => clearInterval(wechatTimer);
  }, []);
  const refreshWechatState = async () => {
    try {
      const { ok, state } = await wechatBotService.getState();
      if (ok && state) {
        setWechatState(state);
        setWechatEnabled(state.status === "running");
        if (state.listen)
          setListenList(state.listen);
      }
    } catch {
    }
  };
  const handleWechatToggle = async (val) => {
    setWechatBusy(true);
    setWechatError(null);
    try {
      if (val) {
        const { ok, state, error, login_url: url } = await wechatBotService.start();
        if (ok) {
          if (state)
            setWechatState(state);
          if (url) {
            setLoginUrl(url);
            setWechatEnabled(false);
          } else {
            setWechatEnabled(true);
          }
        } else {
          setWechatError(error || "启动失败");
        }
      } else {
        const { ok, state, error } = await wechatBotService.stop();
        if (ok) {
          setWechatState(state || null);
          setWechatEnabled(false);
        } else {
          setWechatError(error || "操作失败");
        }
      }
    } catch (err) {
      setWechatError(String(err));
    } finally {
      setWechatBusy(false);
    }
  };
  const handleOpenLoginUrl = async () => {
    if (loginUrl) {
      window.open(loginUrl, "_blank", "noopener,noreferrer");
      return;
    }
    const { ok, data, error } = await wechatBotService.getLoginUrl();
    if (ok && (data == null ? void 0 : data.url)) {
      setLoginUrl(data.url);
      window.open(data.url, "_blank", "noopener,noreferrer");
    } else {
      setWechatError(error || "获取登录 URL 失败");
    }
  };
  const handleAddListen = async () => {
    const name = listenInput.trim();
    if (!name)
      return;
    setWechatBusy(true);
    setWechatError(null);
    try {
      const { ok, listen, added, message, error } = await wechatBotService.listen("add", name);
      if (ok && listen) {
        setListenList(listen);
        if (added) {
          setListenInput("");
          setWechatError(null);
          setWechatSuccess(message || `已添加 '${name}' 到监听列表`);
        } else {
          setWechatError(message || `'${name}' 已在监听列表中`);
        }
      } else {
        setWechatError(error || "添加失败");
      }
    } finally {
      setWechatBusy(false);
    }
  };
  const handleRemoveListen = async (name) => {
    setWechatBusy(true);
    setWechatError(null);
    try {
      const { ok, listen, removed, message, error } = await wechatBotService.listen("remove", name);
      if (ok && listen) {
        setListenList(listen);
        if (removed) {
          setWechatSuccess(message || `已从监听列表移除 '${name}'`);
        } else {
          setWechatError(message || `'${name}' 不在监听列表中`);
        }
      } else {
        setWechatError(error || "移除失败");
      }
    } finally {
      setWechatBusy(false);
    }
  };
  const handleWechatReset = async () => {
    setWechatBusy(true);
    setWechatError(null);
    try {
      const { ok, state, message, error } = await wechatBotService.reset();
      if (ok) {
        setWechatState(state || null);
        setWechatSuccess(message || "聊天历史已清空（账号信息、监听列表、登录态均已保留）");
      } else {
        setWechatError(error || "重置失败");
      }
    } catch (err) {
      setWechatError(String(err));
    } finally {
      setWechatBusy(false);
    }
  };
  const fetchLocalIP = async (retries = 3) => {
    for (let i = 0; i < retries; i++) {
      try {
        const r = await fetch(`${BACKEND_BASE}/api/v1/network/local-ip`);
        if (r.ok) {
          const data = await r.json();
          if (data.primary && data.primary !== "127.0.0.1") {
            setLocalIP(data.primary);
            return;
          }
        }
      } catch {
      }
      if (i < retries - 1)
        await new Promise((r) => setTimeout(r, 500));
    }
    setLocalIP(null);
  };
  const loadProvider = (id, list) => {
    const p = (list ?? providers).find((x) => x.id === id);
    if (p) {
      setSelectedProviderId(p.id);
      setApiKey(p.apiKey);
      setBaseUrl(p.baseUrl);
      setModel(p.model);
      setEnabled(p.enabled);
      setTestResult(null);
      setSaved(false);
    }
  };
  const apiKeyOptional = selectedProviderId === "glm_local" || selectedProviderId === "qwen_local" || /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?(\/|$)/i.test(baseUrl);
  const handleSave = async () => {
    await apiConfigService.update(selectedProviderId, { apiKey, baseUrl, model, enabled });
    setProviders(apiConfigService.getAll());
    setSaved(true);
    setTimeout(() => setSaved(false), 2e3);
    if (!enabled) {
      console.log(`[SettingsPage] provider=${selectedProviderId} 已禁用，不下发给后端`);
      return;
    }
    try {
      const isLocal = selectedProviderId === "glm_local" || selectedProviderId === "qwen_local" || /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?(\/|$)/i.test(baseUrl);
      const mode = isLocal ? "builtin" : "cloud";
      if (mode === "cloud" && !apiKey) {
        console.log(`[SettingsPage] 云端模式无 apiKey，跳过下发`);
        return;
      }
      const backendUrl = `http://${window.location.hostname}:27865/api/v1/wechat-bot/ai-mode`;
      const resp = await fetch(backendUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, apiKey: apiKey || "", baseUrl, model })
      });
      const data = await resp.json();
      console.log(`[SettingsPage] AI 模式已下发 (mode=${mode}, provider=${selectedProviderId}, baseUrl=${baseUrl}, model=${model}, resp=${JSON.stringify(data)})`);
    } catch (e) {
      console.warn("下发 AI 模式到微信机器人失败（可忽略，App 启动时会自动重新下发）:", e);
    }
  };
  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    const result = await llmApiService.testConnection({
      id: selectedProviderId,
      name: "",
      baseUrl,
      apiKey,
      model,
      enabled: true
    });
    setTestResult(result);
    setTesting(false);
  };
  const handleLanToggle = async (val) => {
    setLanEnabled(val);
    localStorage.setItem("ruanlinyun_lan_mode", String(val));
    setLanMessage(null);
    try {
      const r = await fetch(`${BACKEND_BASE}/api/v1/network/lan-mode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: val })
      });
      const data = await r.json();
      setLanMessage(data.message);
      if (val && data.primaryIp) {
        setLocalIP(data.primaryIp);
      } else if (val) {
        await fetchLocalIP();
      }
    } catch {
      setLanMessage("后端服务未启动，请先启动 start.bat");
    }
  };
  return /* @__PURE__ */ jsxs(Container, { maxWidth: "md", sx: { py: 3 }, children: [
    /* @__PURE__ */ jsxs(Box, { sx: { display: "flex", alignItems: "center", mb: 3 }, children: [
      /* @__PURE__ */ jsx(IconButton, { "aria-label": "返回", sx: { mr: 2 }, onClick: () => navigate((() => {
        try {
          return sessionStorage.getItem("settingsFrom") || "/";
        } catch {
          return "/";
        }
      })()), children: /* @__PURE__ */ jsx(default_1, {}) }),
      /* @__PURE__ */ jsx(Typography, { variant: "h4", children: "设置" })
    ] }),
    /* @__PURE__ */ jsx(DeviceOptimizer, {}),
    /* @__PURE__ */ jsxs(Paper, { elevation: 3, sx: { p: 3, mb: 3 }, children: [
      /* @__PURE__ */ jsx(Typography, { variant: "h6", gutterBottom: true, children: "AI模型配置" }),
      /* @__PURE__ */ jsx(Divider, { sx: { mb: 3 } }),
      /* @__PURE__ */ jsxs(FormControl, { fullWidth: true, sx: { mb: 2 }, children: [
        /* @__PURE__ */ jsx(InputLabel, { id: "model-select-label", children: "选择模型" }),
        /* @__PURE__ */ jsx(Select, { id: "model-select", labelId: "model-select-label", value: selectedProviderId, label: "选择模型", onChange: (e) => loadProvider(e.target.value), children: providers.map((p) => /* @__PURE__ */ jsxs(MenuItem, { value: p.id, children: [
          p.name,
          " (",
          p.model,
          ")"
        ] }, p.id)) })
      ] }),
      /* @__PURE__ */ jsx(Box, { sx: { display: "flex", justifyContent: "flex-end", mb: 2 }, children: /* @__PURE__ */ jsx(
        Button,
        {
          variant: "outlined",
          onClick: async () => {
            const id = await apiConfigService.addLocalProvider();
            const all3 = apiConfigService.getAll();
            setProviders(all3);
            loadProvider(id, all3);
          },
          children: "添加本地部署模型"
        }
      ) }),
      /* @__PURE__ */ jsx(
        TextField,
        {
          id: "api-base-url",
          fullWidth: true,
          label: "API Base URL",
          value: baseUrl,
          onChange: (e) => setBaseUrl(e.target.value),
          placeholder: selectedProviderId === "qwen_local" ? "http://127.0.0.1:11434/v1" : selectedProviderId === "deepseek" ? "https://api.deepseek.com" : "https://your-api.com/v1",
          helperText: selectedProviderId === "qwen_local" ? "Ollama本地服务：http://127.0.0.1:11434/v1" : selectedProviderId === "deepseek" ? "官方文档: https://api.deepseek.com" : "OpenAI兼容API地址（含/v1）",
          InputProps: { sx: { "& input::placeholder": { opacity: 0.4 } } },
          sx: { mb: 2 }
        }
      ),
      /* @__PURE__ */ jsx(
        TextField,
        {
          id: "api-key",
          fullWidth: true,
          label: "API Key",
          type: "password",
          value: apiKey,
          onChange: (e) => setApiKey(e.target.value),
          placeholder: "sk-xxxxxxxxxxxxxxxx",
          helperText: apiKeyOptional ? "本地服务可留空；如你的服务需要鉴权再填写（AES-256-GCM加密存储）" : selectedProviderId === "deepseek" ? "在 platform.deepseek.com → API Keys 获取" : "AES-256-GCM加密存储",
          InputProps: { sx: { "& input::placeholder": { opacity: 0.4 } } },
          sx: { mb: 2 }
        }
      ),
      /* @__PURE__ */ jsx(
        TextField,
        {
          id: "model-name",
          fullWidth: true,
          label: "模型名称",
          value: model,
          onChange: (e) => setModel(e.target.value),
          placeholder: selectedProviderId === "qwen_local" ? "qwen2.5-3b-instruct-q4_k_m" : selectedProviderId === "deepseek" ? "deepseek-v4-pro" : "your-model-name",
          helperText: selectedProviderId === "qwen_local" ? "llama.cpp加载的GGUF模型名：qwen2.5-3b-instruct-q4_k_m" : selectedProviderId === "deepseek" ? "DeepSeek V4 Pro: deepseek-v4-pro" : "按API文档填写",
          InputProps: { sx: { "& input::placeholder": { opacity: 0.4 } } },
          sx: { mb: 2 }
        }
      ),
      /* @__PURE__ */ jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 2, mb: 2 }, children: [
        /* @__PURE__ */ jsx(
          FormControlLabel,
          {
            control: /* @__PURE__ */ jsx(Switch, { checked: enabled, onChange: (e) => setEnabled(e.target.checked), color: "primary" }),
            label: enabled ? "已启用" : "已禁用"
          }
        ),
        /* @__PURE__ */ jsx(Box, { sx: { flexGrow: 1 } }),
        !BUILTIN_PROVIDERS.some((p) => p.id === selectedProviderId) && /* @__PURE__ */ jsx(
          Button,
          {
            variant: "outlined",
            color: "error",
            startIcon: /* @__PURE__ */ jsx(default_1$1, {}),
            onClick: async () => {
              if (!window.confirm(`确定删除该 provider 吗？

这将同步清除其 API Key、Base URL、模型名称等所有存储信息，且不可恢复。`))
                return;
              const ok = await apiConfigService.removeProvider(selectedProviderId);
              if (ok) {
                const all3 = apiConfigService.getAll();
                setProviders(all3);
                const next = all3.find((c) => c.enabled) ?? all3[0];
                if (next)
                  loadProvider(next.id, all3);
              } else {
                alert("删除失败：该 provider 不存在或为内置 provider，无法删除");
              }
            },
            children: "删除"
          }
        ),
        /* @__PURE__ */ jsx(
          Button,
          {
            variant: "outlined",
            onClick: handleTest,
            disabled: testing || !apiKeyOptional && !apiKey.trim(),
            startIcon: testing ? /* @__PURE__ */ jsx(CircularProgress, { size: 18 }) : /* @__PURE__ */ jsx(default_1$2, {}),
            children: "测试连接"
          }
        ),
        /* @__PURE__ */ jsx(
          Button,
          {
            variant: "contained",
            onClick: handleSave,
            color: saved ? "success" : "primary",
            startIcon: saved ? /* @__PURE__ */ jsx(default_1$3, {}) : void 0,
            children: saved ? "已保存" : "保存"
          }
        )
      ] }),
      testResult && /* @__PURE__ */ jsx(Alert, { severity: testResult.ok ? "success" : "error", sx: { mb: 2 }, children: testResult.message }),
      /* @__PURE__ */ jsx(Box, { sx: { display: "flex", gap: 1, flexWrap: "wrap" }, children: providers.map((p) => /* @__PURE__ */ jsx(
        Chip,
        {
          label: `${p.name}${p.enabled ? " ✓" : ""}`,
          color: p.enabled ? "primary" : "default",
          variant: p.enabled ? "filled" : "outlined",
          size: "small",
          onClick: () => loadProvider(p.id)
        },
        p.id
      )) })
    ] }),
    /* @__PURE__ */ jsxs(Accordion, { elevation: 3, sx: { mb: 3, borderRadius: 1, overflow: "hidden" }, children: [
      /* @__PURE__ */ jsxs(AccordionSummary, { expandIcon: /* @__PURE__ */ jsx(default_1$4, {}), children: [
        /* @__PURE__ */ jsx(Typography, { variant: "h6", sx: { flexGrow: 1 }, children: "局域网访问" }),
        /* @__PURE__ */ jsx(
          FormControlLabel,
          {
            control: /* @__PURE__ */ jsx(Switch, { checked: lanEnabled, onChange: (e) => handleLanToggle(e.target.checked), color: "warning", onClick: (e) => e.stopPropagation() }),
            label: lanEnabled ? "已开启" : "已关闭",
            sx: { mr: 1 }
          }
        )
      ] }),
      /* @__PURE__ */ jsxs(AccordionDetails, { sx: { pt: 0, px: 3, pb: 3 }, children: [
        /* @__PURE__ */ jsx(Divider, { sx: { mb: 2 } }),
        lanEnabled && /* @__PURE__ */ jsxs(Box, { sx: { mt: 1 }, children: [
          localIP && localIP !== "127.0.0.1" ? /* @__PURE__ */ jsxs(Alert, { severity: "info", sx: { mb: 1 }, children: [
            "局域网访问地址：",
            /* @__PURE__ */ jsxs("strong", { children: [
              "http://",
              localIP,
              ":5175"
            ] }),
            /* @__PURE__ */ jsx("br", {}),
            "后端 API 地址：",
            /* @__PURE__ */ jsxs("strong", { children: [
              "http://",
              localIP,
              ":27865"
            ] })
          ] }) : /* @__PURE__ */ jsx(Alert, { severity: "warning", sx: { mb: 1 }, children: "无法获取本机IP，请确认后端服务已启动且已连接到局域网" }),
          lanMessage && /* @__PURE__ */ jsx(Alert, { severity: "success", sx: { mb: 1 }, children: lanMessage }),
          /* @__PURE__ */ jsx(Alert, { severity: "warning", sx: { mb: 1 }, children: "⚠ 切换开关后需重启 start.bat 才能完全生效（后端服务和前端 vite 都需要重启绑定新地址）" }),
          /* @__PURE__ */ jsx(Alert, { severity: "warning", children: "⚠ 开启后局域网设备均可访问。仅限可信WiFi，公共网络禁止。" })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs(Paper, { elevation: 3, sx: { p: 3, mb: 3 }, children: [
      /* @__PURE__ */ jsx(Typography, { variant: "h6", gutterBottom: true, children: "通用设置" }),
      /* @__PURE__ */ jsx(Divider, { sx: { mb: 3 } }),
      /* @__PURE__ */ jsx(
        FormControlLabel,
        {
          control: /* @__PURE__ */ jsx(Switch, { checked: isDarkMode, onChange: (e) => setIsDarkMode(e.target.checked), color: "primary" }),
          label: "深色模式"
        }
      )
    ] }),
    /* @__PURE__ */ jsxs(Accordion, { elevation: 3, sx: { mb: 3, borderRadius: 1, overflow: "hidden" }, children: [
      /* @__PURE__ */ jsxs(AccordionSummary, { expandIcon: /* @__PURE__ */ jsx(default_1$4, {}), children: [
        /* @__PURE__ */ jsx(Typography, { variant: "h6", sx: { flexGrow: 1 }, children: "机器人" }),
        wechatBusy && /* @__PURE__ */ jsx(CircularProgress, { size: 18 })
      ] }),
      /* @__PURE__ */ jsxs(AccordionDetails, { sx: { pt: 0, px: 3, pb: 3 }, children: [
        /* @__PURE__ */ jsx(Divider, { sx: { mb: 2 } }),
        /* @__PURE__ */ jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 2, mb: 2 }, children: [
          /* @__PURE__ */ jsx(
            FormControlLabel,
            {
              control: /* @__PURE__ */ jsx(Switch, { checked: wechatEnabled, onChange: (e) => handleWechatToggle(e.target.checked), color: "primary", disabled: wechatBusy }),
              label: wechatEnabled ? "已启用" : "已关闭"
            }
          ),
          /* @__PURE__ */ jsx(Box, { sx: { flexGrow: 1 } }),
          wechatState && /* @__PURE__ */ jsx(
            Chip,
            {
              size: "small",
              color: wechatState.status === "running" ? "success" : wechatState.status === "error" ? "error" : wechatState.status === "idle" ? "warning" : "default",
              label: `状态: ${wechatState.status === "running" ? "运行中" : wechatState.status === "stopped" ? "已停止" : wechatState.status === "error" ? "错误" : "空闲（未登录）"}`
            }
          )
        ] }),
        /* @__PURE__ */ jsx(Alert, { severity: "info", sx: { mb: 2 }, children: "微信机器人通过 wechatbot-webhook 服务收发消息。首次使用需扫码登录微信小号，登录后即可自动收发消息。" }),
        wechatState && wechatState.status === "idle" && /* @__PURE__ */ jsx(Alert, { severity: "warning", sx: { mb: 2 }, children: "微信未登录或登录态已过期（网页版协议 token 有效期约 1-2 小时，电脑重启后可能失效）。 请点击下方「扫码登录」重新扫码即可恢复。" }),
        wechatState && /* @__PURE__ */ jsxs(Box, { sx: { mb: 2, p: 1.5, bgcolor: "background.default", borderRadius: 1 }, children: [
          /* @__PURE__ */ jsxs(Typography, { variant: "body2", children: [
            /* @__PURE__ */ jsx("strong", { children: "插件：" }),
            wechatState.plugin || "wechatbot-webhook",
            wechatState.name && /* @__PURE__ */ jsxs("span", { style: { marginLeft: 12 }, children: [
              /* @__PURE__ */ jsx("strong", { children: "账号：" }),
              wechatState.name
            ] })
          ] }),
          (wechatState.incoming_count !== void 0 || wechatState.outgoing_count !== void 0) && /* @__PURE__ */ jsxs(Typography, { variant: "body2", sx: { mt: 0.5 }, children: [
            /* @__PURE__ */ jsx("strong", { children: "收/发：" }),
            wechatState.incoming_count || 0,
            " / ",
            wechatState.outgoing_count || 0
          ] }),
          wechatState.last_message && /* @__PURE__ */ jsxs(Typography, { variant: "body2", sx: { mt: 0.5 }, children: [
            /* @__PURE__ */ jsx("strong", { children: "最近消息：" }),
            wechatState.last_message
          ] }),
          wechatState.last_reply && /* @__PURE__ */ jsxs(Typography, { variant: "body2", sx: { mt: 0.5 }, children: [
            /* @__PURE__ */ jsx("strong", { children: "最近回复：" }),
            wechatState.last_reply
          ] }),
          wechatState.last_error && /* @__PURE__ */ jsxs(Typography, { variant: "body2", color: "error", sx: { mt: 0.5 }, children: [
            /* @__PURE__ */ jsx("strong", { children: "错误：" }),
            wechatState.last_error
          ] }),
          wechatState.message && /* @__PURE__ */ jsx(Typography, { variant: "body2", color: "text.secondary", sx: { mt: 0.5 }, children: wechatState.message })
        ] }),
        wechatState && (wechatState.status === "idle" || wechatState.status === "error") && /* @__PURE__ */ jsx(
          Button,
          {
            variant: "contained",
            color: "warning",
            startIcon: /* @__PURE__ */ jsx(default_1$u, {}),
            onClick: handleOpenLoginUrl,
            sx: { mr: 1, mb: 1 },
            children: "打开微信登录页面"
          }
        ),
        /* @__PURE__ */ jsx(
          Button,
          {
            variant: "outlined",
            startIcon: /* @__PURE__ */ jsx(default_1$e, {}),
            onClick: handleWechatReset,
            disabled: wechatBusy,
            sx: { mb: 1 },
            children: "清空历史记录"
          }
        ),
        /* @__PURE__ */ jsxs(Box, { sx: { mt: 2, p: 1.5, bgcolor: "background.default", borderRadius: 1 }, children: [
          /* @__PURE__ */ jsxs(Typography, { variant: "body2", gutterBottom: true, children: [
            /* @__PURE__ */ jsx("strong", { children: "监听列表" }),
            "（仅响应列表中的好友/群聊消息，为空则不响应任何消息）"
          ] }),
          /* @__PURE__ */ jsxs(Box, { sx: { display: "flex", gap: 1, mt: 1, mb: 1 }, children: [
            /* @__PURE__ */ jsx(
              TextField,
              {
                size: "small",
                placeholder: "输入好友昵称或群名",
                value: listenInput,
                onChange: (e) => setListenInput(e.target.value),
                sx: { flexGrow: 1 },
                onKeyDown: (e) => {
                  if (e.key === "Enter")
                    handleAddListen();
                }
              }
            ),
            /* @__PURE__ */ jsx(
              Button,
              {
                variant: "contained",
                size: "small",
                onClick: handleAddListen,
                disabled: wechatBusy || !listenInput.trim(),
                children: "添加"
              }
            )
          ] }),
          /* @__PURE__ */ jsx(Box, { sx: { display: "flex", gap: 0.5, flexWrap: "wrap" }, children: listenList.length === 0 ? /* @__PURE__ */ jsx(Typography, { variant: "body2", color: "text.secondary", children: "暂无监听对象" }) : listenList.map((name) => /* @__PURE__ */ jsx(
            Chip,
            {
              label: name,
              size: "small",
              onDelete: () => handleRemoveListen(name),
              disabled: wechatBusy
            },
            name
          )) })
        ] }),
        wechatError && /* @__PURE__ */ jsx(Alert, { severity: "error", sx: { mt: 1 }, onClose: () => setWechatError(null), children: wechatError }),
        wechatSuccess && /* @__PURE__ */ jsx(Alert, { severity: "success", sx: { mt: 1 }, onClose: () => setWechatSuccess(null), children: wechatSuccess })
      ] })
    ] }),
    /* @__PURE__ */ jsxs(Paper, { elevation: 3, sx: { p: 3 }, children: [
      /* @__PURE__ */ jsx(Typography, { variant: "h6", gutterBottom: true, children: "关于" }),
      /* @__PURE__ */ jsx(Divider, { sx: { mb: 3 } }),
      /* @__PURE__ */ jsxs(Accordion, { children: [
        /* @__PURE__ */ jsx(AccordionSummary, { expandIcon: /* @__PURE__ */ jsx(default_1$4, {}), children: /* @__PURE__ */ jsx(Typography, { children: "版本信息" }) }),
        /* @__PURE__ */ jsx(AccordionDetails, { children: /* @__PURE__ */ jsx(Typography, { children: "阮琳云智能助手 v1.0.0" }) })
      ] }),
      /* @__PURE__ */ jsxs(Accordion, { children: [
        /* @__PURE__ */ jsx(AccordionSummary, { expandIcon: /* @__PURE__ */ jsx(default_1$4, {}), children: /* @__PURE__ */ jsx(Typography, { children: "安全" }) }),
        /* @__PURE__ */ jsx(AccordionDetails, { children: /* @__PURE__ */ jsx(Typography, { children: "API Key 采用 AES-256-GCM 加密存储，密钥由浏览器指纹派生（PBKDF2 600000 迭代）。加密可防止 localStorage 直接泄露密钥，但不能防御 XSS 攻击，请勿在不可信环境使用。" }) })
      ] }),
      /* @__PURE__ */ jsxs(Accordion, { children: [
        /* @__PURE__ */ jsx(AccordionSummary, { expandIcon: /* @__PURE__ */ jsx(default_1$4, {}), children: /* @__PURE__ */ jsx(Typography, { children: "开发者模式" }) }),
        /* @__PURE__ */ jsx(AccordionDetails, { children: /* @__PURE__ */ jsx(DeveloperModePanel, {}) })
      ] })
    ] })
  ] });
}
function DeveloperModePanel() {
  const [devMode, setDevMode] = reactExports.useState(() => {
    try {
      return localStorage.getItem("ruanlinyun_dev_mode") === "true";
    } catch {
      return false;
    }
  });
  return /* @__PURE__ */ jsxs(Box, { children: [
    /* @__PURE__ */ jsxs(Box, { sx: { display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }, children: [
      /* @__PURE__ */ jsx(Typography, { variant: "body2", children: "启用开发者功能（实验性）" }),
      /* @__PURE__ */ jsx(Switch, { size: "small", checked: devMode, onChange: (e) => {
        setDevMode(e.target.checked);
        try {
          localStorage.setItem("ruanlinyun_dev_mode", String(e.target.checked));
        } catch {
        }
      } })
    ] }),
    /* @__PURE__ */ jsx(Typography, { variant: "caption", sx: { color: "#666", display: "block" }, children: "开启后开放开发者专属功能（后续逐步提供：日志查看、接口调试等）。" })
  ] });
}
const SettingsPage$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: SettingsPage
}, Symbol.toStringTag, { value: "Module" }));
const MODEL_EXTENSIONS = ["pmx", "pmd", "gltf", "glb", "obj"];
const TEXTURE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "bmp", "tga", "webp", "spa", "sph"];
const MOTION_EXTENSIONS = ["vmd"];
const getFileExtension = (fileName) => {
  const parts = fileName.toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
};
const normalizeImportPath = (inputPath) => {
  return inputPath.replace(/\\/g, "/").replace(/^\.\//, "").replace(/^\/+/, "").replace(/\/+/g, "/").trim().toLowerCase();
};
const getImportedAssetPath = (file) => {
  return normalizeImportPath(file.webkitRelativePath || file.name);
};
const classifyImportedFiles = (files) => {
  const classified = {
    modelFiles: [],
    textureFiles: [],
    motionFiles: [],
    unsupportedFiles: []
  };
  files.forEach((file) => {
    const path = getImportedAssetPath(file);
    const asset = { name: file.name, path };
    const extension = getFileExtension(file.name);
    if (MODEL_EXTENSIONS.includes(extension)) {
      classified.modelFiles.push(asset);
      return;
    }
    if (TEXTURE_EXTENSIONS.includes(extension)) {
      classified.textureFiles.push(asset);
      return;
    }
    if (MOTION_EXTENSIONS.includes(extension)) {
      classified.motionFiles.push(asset);
      return;
    }
    classified.unsupportedFiles.push(asset);
  });
  classified.modelFiles.sort((left, right) => {
    const leftPriority = getFileExtension(left.name) === "pmx" ? 0 : 1;
    const rightPriority = getFileExtension(right.name) === "pmx" ? 0 : 1;
    return leftPriority - rightPriority;
  });
  return classified;
};
const BabylonModelViewer = React.lazy(() => __vitePreload(() => import("./BabylonModelViewer-f98e999f.js"), true ? ["assets/BabylonModelViewer-f98e999f.js","assets/mui-2c02b512.js","assets/babylon-fa4505fb.js"] : void 0));
const gCall = {
  ws: null,
  stream: null,
  ctx: null,
  proc: null,
  micGate: false,
  ttsPlaying: false,
  replying: false,
  userHungUp: false
};
window.__companionCallActive = () => !!(gCall.ws && gCall.ws.readyState === WebSocket.OPEN);
let gAiAbort = null;
function companionMd5(input) {
  function utf8Encode(str0) {
    const bytes = new TextEncoder().encode(str0);
    let out = "";
    for (const b of bytes)
      out += String.fromCharCode(b);
    return out;
  }
  const S = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21];
  const K = [];
  for (let i = 0; i < 64; i++)
    K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296);
  const str = utf8Encode(input);
  const bitLenLow = str.length * 8 >>> 0;
  const bitLenHigh = Math.floor(str.length / 536870912);
  let padded = str + String.fromCharCode(128);
  while (padded.length % 64 !== 56)
    padded += String.fromCharCode(0);
  for (let i = 0; i < 4; i++)
    padded += String.fromCharCode(bitLenLow >>> 8 * i & 255);
  for (let i = 0; i < 4; i++)
    padded += String.fromCharCode(bitLenHigh >>> 8 * i & 255);
  const words = [];
  const wordCount = padded.length / 4;
  for (let i = 0; i < wordCount; i++) {
    words[i] = padded.charCodeAt(i * 4) & 255 | (padded.charCodeAt(i * 4 + 1) & 255) << 8 | (padded.charCodeAt(i * 4 + 2) & 255) << 16 | (padded.charCodeAt(i * 4 + 3) & 255) << 24;
  }
  let a0 = 1732584193, b0 = 4023233417, c0 = 2562383102, d0 = 271733878;
  for (let i = 0; i < wordCount / 16; i++) {
    const m = words.slice(i * 16, i * 16 + 16);
    let a = a0, b = b0, c = c0, d = d0;
    for (let j = 0; j < 64; j++) {
      let f, g;
      if (j < 16) {
        f = b & c | ~b & d;
        g = j;
      } else if (j < 32) {
        f = d & b | ~d & c;
        g = (5 * j + 1) % 16;
      } else if (j < 48) {
        f = b ^ c ^ d;
        g = (3 * j + 5) % 16;
      } else {
        f = c ^ (b | ~d);
        g = 7 * j % 16;
      }
      f = f + a + K[j] + m[g] >>> 0;
      a = d;
      d = c;
      c = b;
      b = b + (f << S[j] | f >>> 32 - S[j]) >>> 0;
    }
    a0 = a0 + a >>> 0;
    b0 = b0 + b >>> 0;
    c0 = c0 + c >>> 0;
    d0 = d0 + d >>> 0;
  }
  const toHex = (n) => {
    let out = "";
    for (let i = 0; i < 4; i++)
      out += (n >>> 8 * i & 255).toString(16).padStart(2, "0");
    return out;
  };
  return toHex(a0) + toHex(b0) + toHex(c0) + toHex(d0);
}
const COMPANION_AG_API = "https://autoglm-api.zhipuai.cn/agentdr/v1/assistant";
const COMPANION_AG_APP_ID = "100003";
const COMPANION_AG_APP_KEY = "38d239…d5e5";
let companionAgToken = null;
let companionAgTokenAt = 0;
async function companionAgGetToken() {
  if (companionAgToken && Date.now() - companionAgTokenAt < 25 * 60 * 1e3)
    return companionAgToken;
  const r = await fetch("http://127.0.0.1:18432/get_token");
  let t = (await r.text()).trim();
  if (!/^bearer /i.test(t))
    t = "Bearer " + t;
  companionAgToken = t;
  companionAgTokenAt = Date.now();
  return t;
}
async function companionAgUpload(dataUrl) {
  const blob = await (await fetch(dataUrl)).blob();
  const fd = new FormData();
  fd.append("files", blob, "snap.jpg");
  const token = await companionAgGetToken();
  const ts = String(Math.floor(Date.now() / 1e3));
  const sign = companionMd5(COMPANION_AG_APP_ID + "&" + ts + "&" + COMPANION_AG_APP_KEY);
  const resp = await fetch(COMPANION_AG_API + "/upload-mix", {
    method: "POST",
    headers: { "Authorization": token, "X-Auth-Appid": COMPANION_AG_APP_ID, "X-Auth-TimeStamp": ts, "X-Auth-Sign": sign },
    body: fd
  });
  const j = await resp.json();
  const info = j && j.data && j.data.oss_info && j.data.oss_info[0];
  if (!info || !info.oss_url)
    throw new Error("上传失败：" + JSON.stringify(j).slice(0, 120));
  return info.oss_url;
}
async function companionAgRecognize(imageUrl, prompt) {
  const token = await companionAgGetToken();
  const ts = String(Math.floor(Date.now() / 1e3));
  const sign = companionMd5(COMPANION_AG_APP_ID + "&" + ts + "&" + COMPANION_AG_APP_KEY);
  const resp = await fetch(COMPANION_AG_API + "/image-recognition", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": token, "X-Auth-Appid": COMPANION_AG_APP_ID, "X-Auth-TimeStamp": ts, "X-Auth-Sign": sign },
    body: JSON.stringify({ prompt: prompt || "简要描述这张图片里的内容和场景", image_url: imageUrl })
  });
  const j = await resp.json();
  if (j.code !== void 0 && j.code !== 0)
    throw new Error("识图失败（code=" + j.code + "）");
  const d = j.data || {};
  return String(d.result || d.text || d.content || d.message || JSON.stringify(d)).slice(0, 300);
}
let dshMemoBusy = false;
async function companionAskAI(userText) {
  if (dshMemoBusy)
    throw new Error("上一条还在思考，稍等");
  dshMemoBusy = true;
  try {
    let ctxBlock = "";
    try {
      const arr = JSON.parse(localStorage.getItem("ruanlinyun_unified_messages") || "[]").slice(-12);
      ctxBlock = arr.map((m) => (m.sender === "me" ? "用户" : "你") + "：" + m.text).join("\n");
    } catch {
    }
    const systemPrompt = "你是阮琳云，用户的AI伴侣。用中文口语化回复，简洁自然（不超过3句话）。" + (ctxBlock ? "近期对话记录：\n" + ctxBlock : "");
    const ctrl = new AbortController();
    gAiAbort = ctrl;
    const timer = setTimeout(() => ctrl.abort(), 9e4);
    try {
      const resp = await fetch("http://127.0.0.1:27865/api/v1/ai/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: userText }],
          systemPrompt
        }),
        signal: ctrl.signal
      });
      if (!resp.ok) {
        const errJson = await resp.json().catch(() => ({}));
        throw new Error(errJson.error || "AI代理 HTTP " + resp.status);
      }
      const data = await resp.json();
      const out = (data.content || "").trim();
      console.log("[companionAskAI] ok len=" + out.length);
      return out || "（AI 空回复）";
    } finally {
      clearTimeout(timer);
    }
  } catch (e) {
    console.error("[companionAskAI] fail:", (e == null ? void 0 : e.message) || e);
    throw e;
  } finally {
    dshMemoBusy = false;
  }
}
async function companionSpeakTTS(text) {
  try {
    const resp = await fetch("http://127.0.0.1:9881/tts?text=" + encodeURIComponent(text) + "&speed=1");
    if (resp.ok) {
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      await new Promise((resolve) => {
        const audio = new Audio(url);
        window.__companionAudio = audio;
        audio.onended = () => {
          URL.revokeObjectURL(url);
          resolve();
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          resolve();
        };
        audio.play().catch(() => resolve());
      });
      return;
    }
  } catch {
  }
  await new Promise((resolve) => {
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "zh-CN";
      u.onend = () => resolve();
      u.onerror = () => resolve();
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    } catch {
      resolve();
    }
  });
}
function UTurnArrow() {
  return /* @__PURE__ */ jsxs(
    "svg",
    {
      width: "24",
      height: "24",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "#ffffff",
      strokeWidth: "2.2",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      style: { filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.6))" },
      children: [
        /* @__PURE__ */ jsx("path", { d: "M5 8h10a4 4 0 0 1 4 4v4a4 4 0 0 1-4 4H7.5" }),
        /* @__PURE__ */ jsx("polyline", { points: "8.5,6 5,8 8.5,10" })
      ]
    }
  );
}
function NewPage() {
  const navigate = useNavigate();
  const [consoleOpen, setConsoleOpen] = reactExports.useState(true);
  const [companionOpen, setCompanionOpen] = reactExports.useState(false);
  const [flags, setFlags] = reactExports.useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("companionFlagsV2") || "null");
      if (saved)
        return { mic: saved.mic !== false, cam: saved.cam !== false, screen: saved.screen !== false };
    } catch {
    }
    return { mic: true, cam: true, screen: true };
  });
  const [callState, setCallState] = reactExports.useState("idle");
  const [micOn, setMicOn] = reactExports.useState(true);
  const [greetDisabled, setGreetDisabled] = reactExports.useState(() => {
    try {
      return localStorage.getItem("ruanlinyun_greet_disabled") === "true";
    } catch {
      return false;
    }
  });
  const [callUI, setCallUI] = reactExports.useState("bar");
  const [callStatus, setCallStatus] = reactExports.useState("通话中");
  const [callPhase, setCallPhase] = reactExports.useState("listening");
  const wallpaperUserTouchedRef = reactExports.useRef(0);
  const [defaultModelEnabled, setDefaultModelEnabled] = reactExports.useState(() => {
    try {
      return localStorage.getItem("ruanlinyun_3d_default_model_enabled") !== "false";
    } catch {
      return true;
    }
  });
  const [chatOpen, setChatOpen] = reactExports.useState(false);
  const [chatLog, setChatLog] = reactExports.useState([]);
  const [chatInput, setChatInput] = reactExports.useState("");
  const [chatBusy, setChatBusy] = reactExports.useState(false);
  const greetDismissedRef = reactExports.useRef(false);
  const micGateRef = reactExports.useRef(false);
  const muteNextReplyRef = reactExports.useRef(false);
  const callWsRef = reactExports.useRef(null);
  const ttsPlayingRef = reactExports.useRef(false);
  const replyingRef = reactExports.useRef(false);
  const callPeerRef = reactExports.useRef("用户");
  const chatLogRef = reactExports.useRef(chatLog);
  reactExports.useEffect(() => {
    chatLogRef.current = chatLog;
  }, [chatLog]);
  reactExports.useEffect(() => {
    if (gCall.ws && gCall.ws.readyState === WebSocket.OPEN) {
      setCallState("incall");
      setCallUI("bar");
      setCallStatus("聆听中 · 用户");
      micGateRef.current = gCall.micGate || true;
      setMicOn(micGateRef.current);
    }
  }, []);
  const autoGreetedRef = reactExports.useRef(false);
  reactExports.useEffect(() => {
    if (autoGreetedRef.current)
      return;
    autoGreetedRef.current = true;
    try {
      if (sessionStorage.getItem("ruanlinyun_call_stopped") === "true") {
        console.log("[NewPage] 本次运行中用户已手动挂断，不自动通话");
        return;
      }
    } catch {
    }
    const dismissed = (() => {
      try {
        return localStorage.getItem("ruanlinyun_greet_disabled") === "true";
      } catch {
        return false;
      }
    })();
    greetDismissedRef.current = dismissed;
    if (dismissed)
      return;
    (async () => {
      const greet = "嗨，你来啦！";
      setCallPhase("speaking");
      setCallStatus("说话中…");
      ttsPlayingRef.current = true;
      try {
        await companionSpeakTTS(greet);
      } catch {
      }
      ttsPlayingRef.current = false;
      micGateRef.current = true;
      gCall.micGate = true;
      speechManager.unmute();
      setCallPhase("listening");
      setCallStatus("聆听中 · 用户");
      startCall();
    })();
  }, []);
  const toggleFlag = (key) => {
    setFlags((f) => {
      const next = { ...f, [key]: !f[key] };
      try {
        localStorage.setItem("companionFlagsV2", JSON.stringify(next));
      } catch {
      }
      if (key === "mic" && !next.mic && callWsRef.current)
        cleanupCall({ userHangup: true, reason: "mic-flag-off" });
      return next;
    });
  };
  reactExports.useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        if (!currentModel && defaultModelEnabled) {
          const v81Api = window.__newPageAPI;
          let loaded = false;
          if (v81Api == null ? void 0 : v81Api.loadFromCache) {
            const r = await v81Api.loadFromCache();
            loaded = !!(r == null ? void 0 : r.ok);
            console.log("[启动编排] 模型加载(缓存): " + (loaded ? "命中" : "未命中(" + ((r == null ? void 0 : r.err) || "") + ")"));
          }
          if (!loaded) {
            const dm = window.defaultModel;
            if (dm == null ? void 0 : dm.load) {
              const lr = await dm.load();
              if ((lr == null ? void 0 : lr.ok) && lr.meta) {
                const modelResp = await fetch(lr.meta.url + "?t=" + Date.now());
                const data = await modelResp.arrayBuffer();
                const texs = [];
                for (const t of lr.meta.textureFiles || []) {
                  try {
                    const tr = await fetch(t.url + "?t=" + Date.now());
                    if (tr.ok)
                      texs.push({ name: t.name, path: t.path || t.name, data: await tr.arrayBuffer(), webkitRelativePath: t.webkitRelativePath || "" });
                  } catch {
                  }
                }
                openModelPreviewRef.current(lr.meta.name || "model.pmx", data, texs, lr.meta.url, void 0);
                loaded = true;
                console.log("[启动编排] 模型加载(默认目录): " + (lr.meta.name || ""));
              }
            }
          }
        }
        if (localStorage.getItem("ruanlinyun_3d_wallpaper_enabled") !== "false") {
          const wm = window.wallpaperMode;
          if (wm && typeof wm.getStatus === "function") {
            const st = await wm.getStatus();
            if (!(st == null ? void 0 : st.active) && typeof wm.enter === "function") {
              await wm.enter();
              setWallpaperEnabled(true);
              console.log("[启动编排] 壁纸模式已默认进入");
            }
          }
        }
        if (desktopPetEnabled && currentModel) {
          console.log("[启动编排] 桌宠随 openModelPreview 正规链同步显示");
        }
        console.log("[启动编排] 感知状态: cam=" + flags.cam + " screen=" + flags.screen);
      } catch (e) {
        console.warn("[启动编排] 异常:", e);
      }
    }, 4e3);
    return () => clearTimeout(timer);
  }, []);
  const UNIFIED_KEY = "ruanlinyun_unified_messages";
  const unifiedPush = (who, text, extra) => {
    try {
      const raw = localStorage.getItem(UNIFIED_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      arr.push({ id: String(Date.now()) + "_" + Math.random().toString(36).slice(2, 6), text, sender: who, time: (/* @__PURE__ */ new Date()).toLocaleTimeString(), ...extra || {} });
      while (arr.length > 200)
        arr.shift();
      localStorage.setItem(UNIFIED_KEY, JSON.stringify(arr));
      try {
        window.dispatchEvent(new Event("ruanlinyun_unified_msg"));
      } catch {
      }
    } catch {
    }
  };
  const archiveMsg = (who, text) => {
    try {
      const now = /* @__PURE__ */ new Date();
      const day = now.toLocaleDateString("sv-SE");
      const hhmm = now.toTimeString().slice(0, 5);
      const raw = localStorage.getItem("ruanlinyun_chat_archive");
      const arch = raw ? JSON.parse(raw) : { days: {} };
      if (!arch.days[day])
        arch.days[day] = [];
      arch.days[day].push({ t: hhmm, who, text });
      let size = JSON.stringify(arch).length;
      while (size > 1024 * 1024) {
        const oldest = Object.keys(arch.days).sort()[0];
        if (!oldest)
          break;
        delete arch.days[oldest];
        size = JSON.stringify(arch).length;
      }
      localStorage.setItem("ruanlinyun_chat_archive", JSON.stringify(arch));
    } catch {
    }
  };
  const addMsg = (cls, text) => {
    setChatLog((l) => [...l.slice(-60), { cls, text }]);
    if (cls === "me" || cls === "ai") {
      archiveMsg(cls, text);
      unifiedPush(cls, text);
    }
  };
  reactExports.useEffect(() => {
    try {
      if (localStorage.getItem("ruanlinyun_v89_reset") !== "done") {
        localStorage.removeItem("ruanlinyun_unified_messages");
        localStorage.removeItem("ruanlinyun_main_chat");
        localStorage.removeItem("ruanlinyun_chat_archive");
        localStorage.setItem("ruanlinyun_v89_reset", "done");
        console.log("[v89] 历史上下文已清空（一次性）");
      }
    } catch {
    }
  }, []);
  reactExports.useEffect(() => {
    const sync = () => {
      try {
        const unified = JSON.parse(localStorage.getItem("ruanlinyun_unified_messages") || "[]");
        setChatLog(() => unified.slice(-60).map((m) => ({ cls: m.sender === "me" ? "me" : "ai", text: m.text, id: m.id })));
      } catch {
      }
    };
    sync();
    window.addEventListener("ruanlinyun_unified_msg", sync);
    return () => window.removeEventListener("ruanlinyun_unified_msg", sync);
  }, []);
  const aiTurnRef = reactExports.useRef(0);
  const invalidateAITurn = (reason) => {
    var _a;
    aiTurnRef.current += 1;
    muteNextReplyRef.current = false;
    try {
      gAiAbort == null ? void 0 : gAiAbort.abort();
    } catch {
    }
    gAiAbort = null;
    replyingRef.current = false;
    gCall.replying = false;
    ttsPlayingRef.current = false;
    gCall.ttsPlaying = false;
    try {
      speechSynthesis.cancel();
    } catch {
    }
    try {
      (_a = window.__companionAudio) == null ? void 0 : _a.pause();
    } catch {
    }
    console.log("[NewPage] AI轮次作废 reason=" + reason + " gen=" + aiTurnRef.current);
  };
  const interruptCall = () => {
    if (callPhase === "thinking") {
      invalidateAITurn("user-click-thinking");
      speechManager.interrupt();
      setCallPhase("listening");
      setCallStatus("聆听中 · " + callPeerRef.current);
      addMsg("sys", "—— 已打断思考，本条回复作废 ——");
      return;
    }
    if (callPhase === "speaking") {
      invalidateAITurn("user-click-speaking");
      speechManager.interrupt();
      setCallPhase("listening");
      setCallStatus("聆听中 · " + callPeerRef.current);
      addMsg("sys", "—— 播报已切断 ——");
    }
  };
  const cleanupCall = (opts) => {
    const userHangup = (opts == null ? void 0 : opts.userHangup) !== false;
    const reason = (opts == null ? void 0 : opts.reason) || (userHangup ? "user" : "unexpected");
    if (userHangup) {
      gCall.userHungUp = true;
      try {
        sessionStorage.setItem("ruanlinyun_call_stopped", "true");
      } catch {
      }
    }
    console.log("[NewPage] cleanupCall reason=" + reason + " userHangup=" + userHangup);
    const ws = gCall.ws;
    gCall.ws = null;
    if (gCall.proc) {
      try {
        gCall.proc.disconnect();
      } catch {
      }
      gCall.proc = null;
    }
    if (gCall.ctx) {
      try {
        gCall.ctx.close();
      } catch {
      }
      gCall.ctx = null;
    }
    if (gCall.stream) {
      gCall.stream.getTracks().forEach((t) => t.stop());
      gCall.stream = null;
    }
    if (ws) {
      try {
        ws.close();
      } catch {
      }
    }
    gCall.replying = false;
    gCall.ttsPlaying = false;
    gCall.micGate = false;
    replyingRef.current = false;
    ttsPlayingRef.current = false;
    if (gCall.speechUnsub) {
      try {
        gCall.speechUnsub();
      } catch {
      }
      gCall.speechUnsub = null;
    }
    speechManager.stop();
    setCallState("idle");
    if (userHangup) {
      setChatLog((l) => [...l.slice(-60), { cls: "sys", text: "—— 通话已结束 ——" }]);
    } else {
      setChatLog((l) => [...l.slice(-60), { cls: "sys", text: "—— 识别连接断开，正在重连… ——" }]);
      setTimeout(() => {
        if (gCall.ws && gCall.ws.readyState === WebSocket.OPEN)
          return;
        try {
          if (sessionStorage.getItem("ruanlinyun_call_stopped") === "true")
            return;
        } catch {
        }
        console.log("[NewPage] 异常断开后自动重连通话");
        startCall();
      }, 1200);
    }
  };
  const detectSeeIntent = (text) => {
    if (!/看|瞧|屏幕|画面|好看|长相|颜值|外观/.test(text))
      return null;
    if (/屏幕|电脑|桌面|显示器/.test(text))
      return "screen";
    if (/我|脸|脸蛋|自己|镜头|摄像头/.test(text))
      return "camera";
    return null;
  };
  const onCallFinal = async (text) => {
    var _a;
    console.log("[NewPage] onCallFinal:", text);
    if (replyingRef.current) {
      invalidateAITurn("user-barge-in");
      speechManager.interrupt();
      setCallPhase("listening");
    }
    setChatLog((l) => [...l.slice(-60), { cls: "me", text }]);
    const myGen = ++aiTurnRef.current;
    replyingRef.current = true;
    gCall.replying = true;
    setCallPhase("thinking");
    setCallStatus("思考中…");
    try {
      let seeCtx = "";
      try {
        const want = detectSeeIntent(text);
        if (want) {
          const desc = await aiAutoSee(want);
          if (myGen !== aiTurnRef.current)
            return;
          seeCtx = "（AI 刚用" + (want === "screen" ? "屏幕截图" : "摄像头") + "看到：" + desc + "）";
          addMsg("sys", (want === "screen" ? "🖥 " : "📷 ") + desc);
        }
      } catch {
      }
      if (myGen !== aiTurnRef.current) {
        console.log("[NewPage] 感知后轮次已失效，丢弃 gen=" + myGen);
        return;
      }
      const reply = await companionAskAI(seeCtx ? text + "\n" + seeCtx : text);
      if (myGen !== aiTurnRef.current) {
        console.log("[NewPage] 丢弃迟到AI回复 gen=" + myGen + " 当前=" + aiTurnRef.current + " len=" + String(reply || "").length);
        return;
      }
      addMsg("ai", reply);
      setCallPhase("speaking");
      setCallStatus("说话中…");
      ttsPlayingRef.current = true;
      gCall.ttsPlaying = true;
      await companionSpeakTTS(reply);
      if (myGen !== aiTurnRef.current) {
        console.log("[NewPage] 播报中被作废，停播 gen=" + myGen);
        try {
          speechSynthesis.cancel();
        } catch {
        }
        try {
          (_a = window.__companionAudio) == null ? void 0 : _a.pause();
        } catch {
        }
      }
      ttsPlayingRef.current = false;
      gCall.ttsPlaying = false;
    } catch (e) {
      if (myGen !== aiTurnRef.current) {
        console.log("[NewPage] 打断导致的请求失败，不提示 gen=" + myGen);
        return;
      }
      if ((e == null ? void 0 : e.name) === "AbortError") {
        console.log("[NewPage] AI请求已中止");
        addMsg("sys", "—— 已打断思考，本条回复作废 ——");
      } else {
        console.error("[NewPage] 对话失败:", (e == null ? void 0 : e.message) || e);
        addMsg("sys", "⚠ 对话失败：" + ((e == null ? void 0 : e.message) || e));
      }
    } finally {
      if (myGen === aiTurnRef.current) {
        replyingRef.current = false;
        gCall.replying = false;
        if (gCall.ws) {
          setCallPhase("listening");
          setCallStatus("聆听中 · " + callPeerRef.current);
        }
      }
    }
  };
  reactExports.useEffect(() => {
    const off = speechManager.onState((state, status) => {
      state === "running" && status.listening;
      setMicOn(state === "running");
      if (status.error)
        console.warn("[NewPage] speech status", status);
    });
    return () => {
      off();
    };
  }, []);
  const startCall = () => {
    if (gCall.ws)
      return;
    gCall.userHungUp = false;
    callPeerRef.current = "用户";
    setCallStatus("连接中…");
    try {
      callWsRef.current = { readyState: 1, close: () => {
      } };
      gCall.ws = callWsRef.current;
      setCallState("incall");
      setCallUI("bar");
      setCallStatus("聆听中 · " + callPeerRef.current);
      addMsg("sys", "—— 通话已接通（统一语音识别）——");
      speechManager.start("zh-CN");
      if (!gCall.speechUnsub) {
        gCall.speechUnsub = speechManager.subscribe((text) => {
          onCallFinal(text);
        });
      }
      if (!micGateRef.current && !gCall.micGate) {
        speechManager.mute();
      }
    } catch (e) {
      cleanupCall({ userHangup: false, reason: "start-fail" });
      addMsg("sys", "⚠ 拨打失败：" + ((e == null ? void 0 : e.message) || e));
    }
  };
  const lastScreenDescRef = reactExports.useRef(null);
  const lastCamDescRef = reactExports.useRef(null);
  const SCREEN_CACHE_MS = 3e4;
  const CAM_CACHE_MS = 6e4;
  const aiAutoSee = async (what) => {
    const cache = what === "screen" ? lastScreenDescRef.current : lastCamDescRef.current;
    const ttl = what === "screen" ? SCREEN_CACHE_MS : CAM_CACHE_MS;
    if (cache && Date.now() - cache.at < ttl)
      return cache.text;
    const text = what === "screen" ? await seeScreen() : await seeCamera();
    if (what === "screen")
      lastScreenDescRef.current = { text, at: Date.now() };
    else
      lastCamDescRef.current = { text, at: Date.now() };
    return text;
  };
  const seeCamera = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
    try {
      const video = document.createElement("video");
      video.srcObject = stream;
      await video.play();
      await new Promise((r) => setTimeout(r, 350));
      const cv = document.createElement("canvas");
      cv.width = video.videoWidth || 640;
      cv.height = video.videoHeight || 480;
      cv.getContext("2d").drawImage(video, 0, 0, cv.width, cv.height);
      const oss = await companionAgUpload(cv.toDataURL("image/jpeg", 0.85));
      return await companionAgRecognize(oss);
    } finally {
      stream.getTracks().forEach((t) => t.stop());
    }
  };
  const seeScreen = async () => {
    const bridge = window.companionScreenShot;
    if (!bridge)
      throw new Error("截屏桥未就绪（需重启应用加载新 preload）");
    const r = await bridge();
    if (!r || !r.ok)
      throw new Error((r == null ? void 0 : r.error) || "截屏失败");
    const oss = await companionAgUpload(r.dataUrl);
    return await companionAgRecognize(oss, "这是用户电脑屏幕截图。简要描述屏幕上正在显示的内容");
  };
  const sendChat = async () => {
    const text = chatInput.trim();
    if (!text || chatBusy)
      return;
    setChatInput("");
    setChatLog((l) => [...l.slice(-60), { cls: "me", text }]);
    setChatBusy(true);
    try {
      let seeCtx = "";
      try {
        const want = detectSeeIntent(text);
        if (want) {
          const desc = await aiAutoSee(want);
          seeCtx = "（AI 刚用" + (want === "screen" ? "屏幕截图" : "摄像头") + "看到：" + desc + "）";
          addMsg("sys", (want === "screen" ? "🖥 " : "📷 ") + desc);
        }
      } catch {
      }
      const reply = await companionAskAI(seeCtx ? text + "\n" + seeCtx : text);
      setChatLog((l) => [...l.slice(-60), { cls: "ai", text: reply }]);
    } catch (e) {
      addMsg("sys", "⚠ " + ((e == null ? void 0 : e.message) || e));
    }
    setChatBusy(false);
  };
  const [currentModel, setCurrentModel] = reactExports.useState(null);
  const [desktopPetEnabled, setDesktopPetEnabled] = reactExports.useState(() => {
    const saved = localStorage.getItem("ruanlinyun_3d_desktop_pet_enabled");
    return saved === null ? true : saved === "true";
  });
  const [wallpaperEnabled, setWallpaperEnabled] = reactExports.useState(() => {
    return localStorage.getItem("ruanlinyun_3d_wallpaper_enabled") !== "false";
  });
  const [physicsEnabled, setPhysicsEnabled] = reactExports.useState(() => {
    const saved = localStorage.getItem("ruanlinyun_3d_physics_enabled");
    return saved === null ? true : saved === "true";
  });
  const [windEnabled, setWindEnabled] = reactExports.useState(() => {
    const saved = localStorage.getItem("ruanlinyun_3d_wind_enabled");
    return saved === null ? true : saved === "true";
  });
  const [fileHint, setFileHint] = reactExports.useState(null);
  const [modelLoading, setModelLoading] = reactExports.useState(false);
  const [loadingProgress, setLoadingProgress] = reactExports.useState(0);
  const [modelError, setModelError] = reactExports.useState(null);
  const fileHintTimerRef = React.useRef(null);
  const finishTimerRef = React.useRef(null);
  const mountedRef = React.useRef(true);
  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (fileHintTimerRef.current)
        clearTimeout(fileHintTimerRef.current);
      if (finishTimerRef.current)
        clearTimeout(finishTimerRef.current);
      fileHintTimerRef.current = null;
      finishTimerRef.current = null;
    };
  }, []);
  const stopModelProcess = React.useCallback(() => {
    setCurrentModel(null);
    try {
      window.dispatchEvent(new Event("ruanlinyun_force_stop"));
    } catch {
    }
    setModelError(null);
    const desktopPet = window.desktopPet;
    if (desktopPet && typeof desktopPet.hide === "function") {
      desktopPet.hide();
      console.log("[NewPage] 桌宠已随3D建模进程同步关闭");
    }
  }, []);
  const stopModelProcessRef = React.useRef(stopModelProcess);
  stopModelProcessRef.current = stopModelProcess;
  React.useEffect(() => {
    const onForceStop = () => {
      (async () => {
        try {
          const wm = window.wallpaperMode;
          if (wm && typeof wm.getStatus === "function") {
            const st = await wm.getStatus();
            if ((st == null ? void 0 : st.active) && typeof wm.exit === "function") {
              await wm.exit();
              console.log("[NewPage] 壁纸模式已随停止进程退出");
            }
          }
        } catch (e) {
          console.warn("[NewPage] 壁纸退出异常:", e);
        }
      })();
    };
    window.addEventListener("ruanlinyun_force_stop", onForceStop);
    return () => window.removeEventListener("ruanlinyun_force_stop", onForceStop);
  }, []);
  const showDesktopPet = async (fileName, fileData, textureFiles, modelFile) => {
    const desktopPet = window.desktopPet;
    console.log("[桌宠诊断][NewPage] showDesktopPet 调用:", {
      fileName,
      dataHasData: !!fileData,
      dataByteLength: (fileData == null ? void 0 : fileData.byteLength) || 0,
      textureCount: textureFiles.length,
      hasModelFile: !!modelFile,
      desktopPetExists: !!desktopPet,
      desktopPetShowType: typeof (desktopPet == null ? void 0 : desktopPet.show)
    });
    if (!desktopPet || typeof desktopPet.show !== "function") {
      console.info("[NewPage] 桌宠功能仅在桌面应用(exe)中可用，当前为网页环境，跳过桌宠显示");
      return;
    }
    try {
      const petModelData = {
        name: fileName,
        data: fileData,
        modelWebkitRelativePath: (modelFile == null ? void 0 : modelFile.webkitRelativePath) || (modelFile == null ? void 0 : modelFile.name) || "",
        textureFiles: textureFiles.map((t) => {
          var _a, _b;
          return {
            name: t.name,
            path: t.path || t.name,
            data: t.data,
            webkitRelativePath: ((_a = t.file) == null ? void 0 : _a.webkitRelativePath) || ((_b = t.file) == null ? void 0 : _b.name) || ""
          };
        })
      };
      console.log("[桌宠诊断][NewPage] 即将调用 desktopPet.show(), modelWebkitRelativePath=", petModelData.modelWebkitRelativePath);
      const result = await desktopPet.show(petModelData);
      console.log("[桌宠诊断][NewPage] ✅ desktopPet.show() 返回:", result, "（注意：窗口实际显示由主进程 ready-to-show 控制，此处返回仅代表IPC到达主进程）");
      try {
        const absPath = modelFile == null ? void 0 : modelFile.path;
        if (absPath) {
          const sep = absPath.includes("\\") ? "\\" : "/";
          const dir = absPath.slice(0, absPath.lastIndexOf(sep));
          const dm = window.defaultModel;
          if (dm == null ? void 0 : dm.setDir) {
            const r = await dm.setDir(dir);
            if (r == null ? void 0 : r.success)
              console.log("[v92] 默认模型目录已登记: " + dir);
          }
        } else {
          console.log("[v92] showDesktopPet 无 File.path（缓存链），跳过目录登记");
        }
      } catch (e) {
        console.warn("[v92] 目录登记失败（不阻断）:", e);
      }
    } catch (e) {
      console.error("[桌宠诊断][NewPage] ❌ desktopPet.show() 抛错:", e);
    }
  };
  const openModelPreview = (fileName, fileData, textureFiles = [], url, modelFile) => {
    setCurrentModel({ name: fileName, data: fileData, textureFiles, url, modelFile });
    try {
      localStorage.setItem("ruanlinyun_3d_last_model", fileName);
    } catch {
    }
    if (desktopPetEnabled) {
      showDesktopPet(fileName, fileData, textureFiles, modelFile);
    }
  };
  const openModelPreviewRef = React.useRef(openModelPreview);
  openModelPreviewRef.current = openModelPreview;
  React.useEffect(() => {
    window.__newPageAPI = {
      loadFromCache: async () => {
        try {
          const dp = window.desktopPet;
          if (!dp || typeof dp.getModel !== "function")
            return { err: "no desktopPet.getModel" };
          const meta = await dp.getModel();
          if (!meta || !meta.url)
            return { err: "no cached model (先通过 desktopPet.show 喂入)" };
          const modelResp = await fetch(meta.url + "?t=" + Date.now());
          const data = await modelResp.arrayBuffer();
          const textureFiles = [];
          for (const t of meta.textureFiles || []) {
            try {
              const r = await fetch(t.url + "?t=" + Date.now());
              if (!r.ok)
                continue;
              const d = await r.arrayBuffer();
              if (!d.byteLength)
                continue;
              textureFiles.push({ name: t.name, path: t.path || t.name, data: d, webkitRelativePath: t.webkitRelativePath || "" });
            } catch (e) {
            }
          }
          openModelPreviewRef.current(meta.name || "model.pmx", data, textureFiles, meta.url, void 0);
          return { ok: true, pmxLen: data.byteLength, texN: textureFiles.length };
        } catch (e) {
          return { err: e.message };
        }
      }
    };
    return () => {
      try {
        delete window.__newPageAPI;
      } catch (e) {
      }
    };
  }, []);
  const handleDesktopPetToggle = (val) => {
    setDesktopPetEnabled(val);
    localStorage.setItem("ruanlinyun_3d_desktop_pet_enabled", String(val));
    if (val && currentModel) {
      showDesktopPet(currentModel.name, currentModel.data, currentModel.textureFiles || [], currentModel.modelFile);
    } else if (!val) {
      const desktopPet = window.desktopPet;
      if (desktopPet && typeof desktopPet.hide === "function") {
        desktopPet.hide();
      }
    }
  };
  const handleMultipleFiles = reactExports.useCallback((files) => {
    setModelLoading(true);
    setLoadingProgress(0);
    setModelError(null);
    const { modelFiles, textureFiles, unsupportedFiles } = classifyImportedFiles(files);
    if (modelFiles.length === 0) {
      const hasCompressedArchive = unsupportedFiles.some((file) => /\.(zip|rar|7z)$/i.test(file.name));
      const errorMessage = hasCompressedArchive ? "当前稳定版请直接选择PMX所在文件夹，或同时选择PMX与贴图文件；暂不支持直接导入 ZIP、RAR、7Z 压缩包。" : "未找到支持的模型文件，请选择 PMX、GLB、GLTF 或 OBJ 模型。";
      setModelError(errorMessage);
      setModelLoading(false);
      return;
    }
    const firstModel = modelFiles[0];
    const firstModelFile = files.find((file) => file.name === firstModel.name);
    if (!firstModelFile) {
      setModelError("未能读取所选模型文件，请重新选择。");
      setModelLoading(false);
      setLoadingProgress(0);
      return;
    }
    const readFileAsArrayBuffer = (file, onProgress) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onprogress = (e) => {
          if (e.lengthComputable && onProgress) {
            onProgress(e.loaded / e.total);
          }
        };
        reader.onload = (e) => {
          var _a;
          if (((_a = e.target) == null ? void 0 : _a.result) instanceof ArrayBuffer) {
            resolve(e.target.result);
          } else {
            reject(new Error(`读取失败: ${file.name}`));
          }
        };
        reader.onerror = () => reject(new Error(`读取失败: ${file.name}`));
        reader.readAsArrayBuffer(file);
      });
    };
    const findTextureFile = (textureName, texturePath) => {
      let f = files.find((file) => {
        const relPath = (file.webkitRelativePath || file.name).toLowerCase().replace(/\\/g, "/");
        return relPath === texturePath.toLowerCase();
      });
      if (f)
        return f;
      f = files.find((file) => file.name === textureName && (file.webkitRelativePath || file.name).toLowerCase().replace(/\\/g, "/") === texturePath);
      if (f)
        return f;
      f = files.find((file) => file.name.toLowerCase() === textureName.toLowerCase());
      if (f)
        return f;
      f = files.find((file) => (file.webkitRelativePath || file.name).toLowerCase().endsWith("/" + textureName.toLowerCase()));
      if (f)
        return f;
      f = files.find((file) => file.name.includes(textureName.split(".")[0]) || textureName.includes(file.name.split(".")[0]));
      return f;
    };
    const modelPromise = readFileAsArrayBuffer(firstModelFile, (p) => {
      setLoadingProgress(p * 50);
    });
    const texturePromises = textureFiles.map((texture) => {
      const textureFile = findTextureFile(texture.name, texture.path);
      if (!textureFile) {
        return Promise.reject(new Error(`未找到贴图文件: ${texture.name}`));
      }
      return readFileAsArrayBuffer(textureFile).then((data) => ({
        name: texture.name,
        path: texture.path,
        data,
        file: textureFile
        // 保留原始 File 对象，用于 babylon-mmd 的 referenceFiles
      }));
    });
    Promise.allSettled([modelPromise, ...texturePromises]).then((results) => {
      var _a;
      const modelResult = results[0];
      if (modelResult.status !== "fulfilled") {
        setModelError("模型文件读取失败，请重试。");
        setModelLoading(false);
        setLoadingProgress(0);
        return;
      }
      const loadedTextures = [];
      const failedTextures = [];
      for (let i = 1; i < results.length; i++) {
        const r = results[i];
        if (r.status === "fulfilled") {
          loadedTextures.push(r.value);
        } else {
          failedTextures.push(((_a = textureFiles[i - 1]) == null ? void 0 : _a.name) || "unknown");
        }
      }
      if (!mountedRef.current)
        return;
      setLoadingProgress(100);
      if (finishTimerRef.current)
        clearTimeout(finishTimerRef.current);
      finishTimerRef.current = setTimeout(() => {
        finishTimerRef.current = null;
        if (!mountedRef.current)
          return;
        openModelPreview(firstModel.name, modelResult.value, loadedTextures, void 0, firstModelFile);
        if (failedTextures.length > 0) {
          console.warn(`[NewPage] 部分贴图加载失败: ${failedTextures.join(", ")}`);
          setModelError(`模型已加载，但 ${failedTextures.length} 个贴图文件处理失败，可能影响部分材质显示。`);
        }
        setModelLoading(false);
        setLoadingProgress(0);
      }, 200);
    });
  }, []);
  const handleImportModel = reactExports.useCallback(() => {
    setModelError(null);
    const modelFileInput = document.createElement("input");
    modelFileInput.type = "file";
    modelFileInput.webkitdirectory = true;
    modelFileInput.onchange = (e) => {
      const target = e.target;
      if (target.files && target.files.length > 0) {
        const files = Array.from(target.files);
        const v81ModelFile = files.find((f) => /\.(pmx|glb|gltf|obj)$/i.test(f.name));
        const v81Cached = (() => {
          try {
            return localStorage.getItem("ruanlinyun_3d_last_model") || "";
          } catch {
            return "";
          }
        })();
        if (v81ModelFile && v81Cached && v81ModelFile.name === v81Cached) {
          console.log("[NewPage] 缓存校验命中（同名），清屏后取缓存");
          const v81Api = window.__newPageAPI;
          if (v81Api == null ? void 0 : v81Api.loadFromCache) {
            setCurrentModel(null);
            setModelLoading(true);
            setLoadingProgress(0);
            v81Api.loadFromCache().then((r) => {
              if (r == null ? void 0 : r.ok) {
                setModelLoading(false);
                return;
              }
              console.warn("[NewPage] 快速路径失败，回退完整导入:", r == null ? void 0 : r.err);
              handleMultipleFiles(files);
            }).catch(() => handleMultipleFiles(files));
            return;
          }
        }
        if (v81ModelFile && v81Cached && v81ModelFile.name !== v81Cached) {
          try {
            localStorage.removeItem("ruanlinyun_3d_last_model");
          } catch {
          }
          setCurrentModel(null);
          console.log("[NewPage] 新模型（" + v81ModelFile.name + " ≠ 缓存 " + v81Cached + "），旧缓存已清、旧画面已卸");
        }
        handleMultipleFiles(files);
      }
    };
    modelFileInput.click();
  }, [handleMultipleFiles]);
  const showHint = (text) => {
    setFileHint(text);
    if (fileHintTimerRef.current)
      clearTimeout(fileHintTimerRef.current);
    fileHintTimerRef.current = setTimeout(() => {
      fileHintTimerRef.current = null;
      setFileHint(null);
    }, 3e3);
  };
  const handleWallpaperToggle = async (val) => {
    if (val && !currentModel) {
      showHint("请先导入模型，再开启壁纸模式");
      return;
    }
    const wm = window.wallpaperMode;
    if (!wm || typeof wm.enter !== "function") {
      showHint("壁纸模式仅在桌面应用(exe)中可用");
      return;
    }
    setWallpaperEnabled(val);
    wallpaperUserTouchedRef.current = Date.now();
    try {
      localStorage.setItem("ruanlinyun_3d_wallpaper_enabled", String(val));
    } catch {
    }
    try {
      if (val) {
        await wm.enter();
      } else {
        await wm.exit();
      }
    } catch (e) {
      console.warn("[NewPage] 壁纸模式切换失败:", e);
      setWallpaperEnabled(!val);
    }
  };
  React.useEffect(() => {
    const wm = window.wallpaperMode;
    if (!wm || typeof wm.getStatus !== "function")
      return;
    const refresh = async () => {
      try {
        const s = await wm.getStatus();
        if (Date.now() - wallpaperUserTouchedRef.current < 3e3)
          return;
        setWallpaperEnabled(!!s.active);
      } catch {
      }
    };
    refresh();
    window.addEventListener("focus", refresh);
    let off;
    try {
      off = wm.onAttached(() => {
        refresh();
      });
    } catch {
    }
    return () => {
      window.removeEventListener("focus", refresh);
      if (typeof off === "function")
        off();
    };
  }, []);
  const handlePhysicsToggle = (val) => {
    setPhysicsEnabled(val);
    localStorage.setItem("ruanlinyun_3d_physics_enabled", String(val));
  };
  const handleWindToggle = (val) => {
    setWindEnabled(val);
    localStorage.setItem("ruanlinyun_3d_wind_enabled", String(val));
  };
  const handleDefaultModelEnabledToggle = () => {
    const next = !defaultModelEnabled;
    setDefaultModelEnabled(next);
    try {
      localStorage.setItem("ruanlinyun_3d_default_model_enabled", String(next));
    } catch {
    }
    showHint(next ? "默认模型已启用（下次启动自动加载）" : "默认模型已停用（下次启动不自动加载）");
  };
  return /* @__PURE__ */ jsxs(Box, { sx: { height: "100vh", display: "flex", flexDirection: "column", width: "100vw", overflow: "hidden", position: "relative" }, children: [
    /* @__PURE__ */ jsx(Box, { sx: {
      px: 2,
      py: 2,
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10,
      display: "flex",
      alignItems: "center",
      background: "linear-gradient(180deg, rgba(0,0,0,0.3) 0%, transparent 100%)"
    }, children: /* @__PURE__ */ jsx(IconButton, { "aria-label": "返回", onClick: () => navigate("/chat"), sx: { color: "#fff" }, children: /* @__PURE__ */ jsx(UTurnArrow, {}) }) }),
    /* @__PURE__ */ jsx(Box, { sx: {
      flex: 1,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "radial-gradient(circle at center, #2a2a3a 0%, #0a0a14 100%)",
      perspective: "800px",
      position: "relative"
    }, children: currentModel ? (
      // 导入成功：立方体替换为3D模型（BabylonModelViewer，不传 onClose 避免组件内关闭按钮，
      // 关闭操作通过控制台的"停止该进程"按钮执行）
      /* @__PURE__ */ jsx(React.Suspense, { fallback: /* @__PURE__ */ jsx("div", { style: { width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#ccc", fontSize: 18 }, children: "加载3D引擎中..." }), children: /* @__PURE__ */ jsx(
        BabylonModelViewer,
        {
          modelData: currentModel,
          physicsEnabled,
          windEnabled,
          desktopPetMode: false
        },
        `model-${currentModel.name}`
      ) })
    ) : (
      // 未导入：旋转立方体占位场景（CSS 3D 实现，无需加载 Babylon.js）
      /* @__PURE__ */ jsx(Box, { sx: {
        width: 120,
        height: 120,
        position: "relative",
        transformStyle: "preserve-3d",
        animation: "cube-rotate 12s linear infinite",
        "@keyframes cube-rotate": {
          "0%": { transform: "rotateX(0deg) rotateY(0deg)" },
          "100%": { transform: "rotateX(360deg) rotateY(360deg)" }
        }
      }, children: [
        { transform: "rotateY(0deg) translateZ(60px)", color: "rgba(100,180,255,0.7)" },
        { transform: "rotateY(180deg) translateZ(60px)", color: "rgba(180,100,255,0.7)" },
        { transform: "rotateY(90deg) translateZ(60px)", color: "rgba(100,255,180,0.7)" },
        { transform: "rotateY(-90deg) translateZ(60px)", color: "rgba(255,180,100,0.7)" },
        { transform: "rotateX(90deg) translateZ(60px)", color: "rgba(255,100,180,0.7)" },
        { transform: "rotateX(-90deg) translateZ(60px)", color: "rgba(180,255,100,0.7)" }
      ].map((face, i) => /* @__PURE__ */ jsx(Box, { sx: {
        position: "absolute",
        width: "100%",
        height: "100%",
        transform: face.transform,
        background: face.color,
        border: "1px solid rgba(255,255,255,0.3)",
        boxShadow: "inset 0 0 30px rgba(255,255,255,0.2)"
      } }, i)) })
    ) }),
    callState === "incall" && /* @__PURE__ */ jsxs(Box, { sx: {
      position: "absolute",
      bottom: 56,
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: 40,
      alignItems: "center",
      gap: 1.5,
      px: 2.5,
      py: 1.2,
      borderRadius: 26,
      bgcolor: "rgba(224, 242, 241, 0.98)",
      border: "1px solid rgba(0, 137, 123, 0.45)",
      boxShadow: "0 8px 28px rgba(0,0,0,0.28)",
      display: callUI === "hidden" ? "none" : "flex"
    }, children: [
      /* @__PURE__ */ jsxs(Box, { onClick: interruptCall, title: "点击中断", sx: {
        position: "relative",
        width: 16,
        height: 16,
        cursor: "pointer",
        flexShrink: 0
      }, children: [
        callPhase !== "listening" && /* @__PURE__ */ jsx(Box, { sx: { position: "absolute", inset: -3, borderRadius: "50%", border: "2px solid", borderColor: callPhase === "speaking" ? "#e53935" : "#00897b", opacity: 0.6, animation: "pulse 1.2s infinite" } }),
        /* @__PURE__ */ jsx(Box, { sx: { width: 8, height: 8, borderRadius: "50%", bgcolor: callPhase === "speaking" ? "#e53935" : "#00897b", position: "absolute", top: 4, left: 4, animation: "pulse 1.2s infinite" } })
      ] }),
      /* @__PURE__ */ jsx(Typography, { sx: { fontSize: 13, color: "#004d40", fontWeight: 600 }, children: callStatus }),
      /* @__PURE__ */ jsx(IconButton, { size: "small", onClick: () => {
        micGateRef.current = !micGateRef.current;
        gCall.micGate = micGateRef.current;
        setMicOn(micGateRef.current);
        if (micGateRef.current)
          speechManager.unmute();
        else
          speechManager.mute();
      }, sx: { color: micOn ? "#00796b" : "#bdbdbd" }, title: micOn ? "麦克风开启中（点击关闭）" : "麦克风已关（点击开启）", children: micOn ? /* @__PURE__ */ jsx(default_1$v, { fontSize: "small" }) : /* @__PURE__ */ jsx(default_1$9, { fontSize: "small" }) }),
      /* @__PURE__ */ jsx(Button, { size: "small", variant: "contained", onClick: () => cleanupCall({ userHangup: true, reason: "user-button" }), sx: { bgcolor: "#e53935", "&:hover": { bgcolor: "#c62828" }, textTransform: "none", px: 1.5, minWidth: 0 }, children: "挂断" })
    ] }),
    !companionOpen && /* @__PURE__ */ jsx(
      IconButton,
      {
        "aria-label": "打开伴侣面板",
        onClick: () => setCompanionOpen(true),
        sx: {
          position: "absolute",
          top: 80,
          left: 16,
          zIndex: 20,
          width: 48,
          height: 48,
          borderRadius: "50%",
          bgcolor: "#ffffff",
          color: "#00897b",
          border: "2px solid #00897b",
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          "&:hover": { bgcolor: "#effaf8" },
          ...callState === "incall" ? { boxShadow: "0 0 0 3px rgba(0,137,123,0.35), 0 4px 12px rgba(0,0,0,0.3)" } : {}
        },
        children: /* @__PURE__ */ jsx(Typography, { sx: { fontWeight: "bold", fontSize: 16 }, children: "✦" })
      }
    ),
    companionOpen && /* @__PURE__ */ jsxs(
      Paper,
      {
        elevation: 8,
        sx: {
          position: "absolute",
          top: 80,
          left: 16,
          zIndex: 20,
          width: 280,
          maxWidth: "calc(100vw - 32px)",
          bgcolor: "#ffffff",
          color: "#1a1a1a",
          border: "2px solid #00897b",
          borderRadius: 2,
          boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          overflow: "hidden"
        },
        children: [
          /* @__PURE__ */ jsxs(Box, { sx: { display: "flex", alignItems: "center", justifyContent: "space-between", px: 2, py: 1.5, bgcolor: "#00695c", color: "#ffffff" }, children: [
            /* @__PURE__ */ jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1 }, children: [
              /* @__PURE__ */ jsx(Typography, { sx: { fontWeight: "bold", fontSize: 15 }, children: "✦" }),
              /* @__PURE__ */ jsx(Typography, { variant: "subtitle2", sx: { fontWeight: "bold", letterSpacing: 0.5 }, children: "伴侣面板" })
            ] }),
            /* @__PURE__ */ jsx(IconButton, { "aria-label": "收起伴侣面板", onClick: () => setCompanionOpen(false), size: "small", sx: { color: "#ffffff", p: 0.5 }, children: /* @__PURE__ */ jsx(default_1$w, { fontSize: "small" }) })
          ] }),
          /* @__PURE__ */ jsx(Divider, {}),
          /* @__PURE__ */ jsxs(Box, { sx: { p: 1.5, display: "flex", flexDirection: "column", gap: 1, maxHeight: "calc(100vh - 220px)", overflowY: "auto" }, children: [
            /* @__PURE__ */ jsx(
              Button,
              {
                variant: "contained",
                fullWidth: true,
                startIcon: /* @__PURE__ */ jsx(default_1$x, {}),
                onClick: () => {
                  if (callState === "incall") {
                    cleanupCall({ userHangup: true, reason: "user-panel" });
                  } else {
                    startCall();
                  }
                },
                sx: { justifyContent: "flex-start", bgcolor: callState === "incall" ? "#e53935" : "#00897b", color: "#fff", textTransform: "none", fontWeight: "bold", py: 1.1, "&:hover": { bgcolor: callState === "incall" ? "#c62828" : "#00695c" } },
                children: callState === "incall" ? "挂断通话" : "语音通话"
              }
            ),
            /* @__PURE__ */ jsx(
              Button,
              {
                variant: "outlined",
                fullWidth: true,
                startIcon: /* @__PURE__ */ jsx(default_1$y, {}),
                onClick: () => setChatOpen(!chatOpen),
                sx: { justifyContent: "flex-start", borderColor: "#00897b", color: "#00695c", textTransform: "none" },
                children: "迷你对话"
              }
            ),
            chatOpen && /* @__PURE__ */ jsxs(Box, { sx: { border: "1px solid rgba(0,0,0,0.1)", borderRadius: 1, bgcolor: "#fafafa", p: 1, display: "flex", flexDirection: "column", gap: 0.5 }, children: [
              /* @__PURE__ */ jsxs(Box, { sx: { height: 300, overflowY: "auto", display: "flex", flexDirection: "column", gap: 0.5 }, children: [
                chatLog.length === 0 && /* @__PURE__ */ jsx(Typography, { variant: "caption", sx: { color: "#999", textAlign: "center", py: 2 }, children: "说点什么，开始对话" }),
                chatLog.map((m, i) => /* @__PURE__ */ jsx(Typography, { variant: "caption", sx: {
                  maxWidth: "85%",
                  px: 1,
                  py: 0.5,
                  borderRadius: 1.5,
                  lineHeight: 1.45,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  alignSelf: m.cls === "me" ? "flex-end" : m.cls === "ai" ? "flex-start" : "center",
                  bgcolor: m.cls === "me" ? "#b2dfdb" : m.cls === "ai" ? "#ffffff" : "transparent",
                  color: m.cls === "me" ? "#004d40" : m.cls === "ai" ? "#1a1a1a" : "#999",
                  border: m.cls === "ai" ? "1px solid rgba(0,0,0,0.08)" : "none"
                }, children: m.text }, i))
              ] }),
              /* @__PURE__ */ jsxs(Box, { sx: { display: "flex", gap: 0.5 }, children: [
                /* @__PURE__ */ jsx(
                  "input",
                  {
                    value: chatInput,
                    onChange: (e) => setChatInput(e.target.value),
                    onKeyDown: (e) => {
                      if (e.key === "Enter")
                        sendChat();
                    },
                    placeholder: "说点什么…（Enter 发送）",
                    style: { flex: 1, padding: "7px 10px", border: "1px solid rgba(0,0,0,0.2)", borderRadius: 8, fontSize: 12.5, outline: "none", background: "#fff" }
                  }
                ),
                /* @__PURE__ */ jsx(Button, { variant: "contained", size: "small", disabled: chatBusy, onClick: sendChat, sx: { bgcolor: "#00897b", "&:hover": { bgcolor: "#00695c" }, minWidth: 0, px: 1.5 }, children: /* @__PURE__ */ jsx(default_1$h, { sx: { fontSize: 16 } }) })
              ] })
            ] })
          ] })
        ]
      }
    ),
    !consoleOpen && /* @__PURE__ */ jsx(
      IconButton,
      {
        "aria-label": "打开控制台",
        onClick: () => setConsoleOpen(true),
        sx: {
          position: "absolute",
          top: 80,
          right: 16,
          zIndex: 20,
          bgcolor: "#ffffff",
          color: "#1a1a1a",
          border: "2px solid #1a1a1a",
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          "&:hover": { bgcolor: "#f5f5f5" }
        },
        children: /* @__PURE__ */ jsx(default_1$z, {})
      }
    ),
    consoleOpen && /* @__PURE__ */ jsxs(
      Paper,
      {
        elevation: 8,
        sx: {
          position: "absolute",
          top: 80,
          right: 16,
          zIndex: 20,
          width: 280,
          maxWidth: "calc(100vw - 32px)",
          bgcolor: "#ffffff",
          color: "#1a1a1a",
          border: "2px solid #1a1a1a",
          borderRadius: 2,
          boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          overflow: "hidden"
        },
        children: [
          /* @__PURE__ */ jsxs(Box, { sx: {
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 2,
            py: 1.5,
            bgcolor: "#1a1a1a",
            color: "#ffffff"
          }, children: [
            /* @__PURE__ */ jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1 }, children: [
              /* @__PURE__ */ jsx(default_1$z, { fontSize: "small" }),
              /* @__PURE__ */ jsx(Typography, { variant: "subtitle2", sx: { fontWeight: "bold", letterSpacing: 0.5 }, children: "控制台" })
            ] }),
            /* @__PURE__ */ jsx(
              IconButton,
              {
                "aria-label": "收起控制台",
                onClick: () => setConsoleOpen(false),
                size: "small",
                sx: { color: "#ffffff", p: 0.5 },
                children: /* @__PURE__ */ jsx(default_1$w, { fontSize: "small", sx: { transform: "rotate(180deg)" } })
              }
            )
          ] }),
          /* @__PURE__ */ jsx(Divider, {}),
          /* @__PURE__ */ jsxs(Box, { sx: { p: 1.5, display: "flex", flexDirection: "column", gap: 1 }, children: [
            currentModel ? /* @__PURE__ */ jsx(Tooltip, { title: "停止3D建模进程，关闭模型并同步关闭桌面宠物，恢复立方体占位", placement: "left", children: /* @__PURE__ */ jsx(
              Button,
              {
                variant: "contained",
                fullWidth: true,
                startIcon: /* @__PURE__ */ jsx(default_1$A, {}),
                onClick: stopModelProcess,
                sx: {
                  justifyContent: "flex-start",
                  bgcolor: "#d32f2f",
                  color: "#ffffff",
                  textTransform: "none",
                  fontWeight: "bold",
                  py: 1.2,
                  "&:hover": { bgcolor: "#b71c1c" }
                },
                children: "停止该进程"
              }
            ) }) : /* @__PURE__ */ jsx(Tooltip, { title: "选择文件夹导入 PMX/GLTF/GLB/OBJ 模型", placement: "left", children: /* @__PURE__ */ jsx(
              Button,
              {
                variant: "contained",
                fullWidth: true,
                startIcon: modelLoading ? /* @__PURE__ */ jsx(CircularProgress, { size: 16, color: "inherit" }) : /* @__PURE__ */ jsx(default_1$B, {}),
                onClick: handleImportModel,
                disabled: modelLoading,
                sx: {
                  justifyContent: "flex-start",
                  bgcolor: "#1a1a1a",
                  color: "#ffffff",
                  textTransform: "none",
                  fontWeight: "bold",
                  py: 1.2,
                  "&:hover": { bgcolor: "#333" }
                },
                children: modelLoading ? `加载中... ${Math.round(loadingProgress)}%` : "导入建模"
              }
            ) }),
            /* @__PURE__ */ jsxs(Accordion, { elevation: 0, defaultExpanded: true, sx: { border: "1px solid", borderColor: "divider", borderRadius: 1, mb: 1 }, children: [
              /* @__PURE__ */ jsx(AccordionSummary, { expandIcon: /* @__PURE__ */ jsx(default_1$4, {}), children: /* @__PURE__ */ jsx(Typography, { variant: "body2", sx: { fontWeight: "bold" }, children: "默认选项" }) }),
              /* @__PURE__ */ jsxs(AccordionDetails, { sx: { pt: 1, px: 1, pb: 1 }, children: [
                /* @__PURE__ */ jsx(Box, { sx: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0.5 }, children: [
                  { label: "风力效果", icon: /* @__PURE__ */ jsx(default_1$C, { fontSize: "small" }), on: windEnabled && physicsEnabled, disabled: !physicsEnabled, toggle: () => handleWindToggle(!(windEnabled && physicsEnabled)) },
                  { label: "物理模组", icon: /* @__PURE__ */ jsx(default_1$D, { fontSize: "small" }), on: physicsEnabled, disabled: false, toggle: () => handlePhysicsToggle(!physicsEnabled) },
                  { label: "启动问候", icon: /* @__PURE__ */ jsx(default_1$E, { fontSize: "small" }), on: !greetDisabled, disabled: false, toggle: () => {
                    const n = !greetDisabled;
                    setGreetDisabled(n);
                    try {
                      localStorage.setItem("ruanlinyun_greet_disabled", String(n));
                    } catch {
                    }
                  } },
                  { label: "桌面宠物", icon: /* @__PURE__ */ jsx(default_1$F, { fontSize: "small" }), on: desktopPetEnabled, disabled: false, toggle: () => handleDesktopPetToggle(!desktopPetEnabled) },
                  { label: "摄像头", icon: /* @__PURE__ */ jsx(default_1$G, { fontSize: "small" }), on: flags.cam, disabled: false, toggle: () => toggleFlag("cam") },
                  { label: "屏幕识别", icon: /* @__PURE__ */ jsx(default_1$H, { fontSize: "small" }), on: flags.screen, disabled: false, toggle: () => toggleFlag("screen") }
                ].map(({ label, icon, on, disabled, toggle }) => /* @__PURE__ */ jsxs(
                  Box,
                  {
                    onClick: disabled ? void 0 : toggle,
                    sx: {
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      px: 1,
                      py: 0.5,
                      border: "1px solid #e0e0e0",
                      borderRadius: 1,
                      bgcolor: on ? "#effaf8" : "#fafafa",
                      cursor: disabled ? "not-allowed" : "pointer",
                      opacity: disabled ? 0.5 : 1,
                      position: "relative",
                      "&:hover": { borderColor: "#00897b" }
                    },
                    children: [
                      /* @__PURE__ */ jsxs(Box, { sx: { position: "relative", display: "inline-flex", color: on ? "#00897b" : "#9e9e9e" }, children: [
                        icon,
                        !on && /* @__PURE__ */ jsx(Box, { sx: { position: "absolute", left: "50%", top: "50%", width: "130%", height: 1.5, bgcolor: "#e57373", transform: "translate(-50%,-50%) rotate(-45deg)", borderRadius: 1 } })
                      ] }),
                      /* @__PURE__ */ jsx(Typography, { variant: "body2", sx: { fontWeight: "bold", color: on ? "#004d40" : "#9e9e9e", fontSize: 12 }, children: label })
                    ]
                  },
                  label
                )) }),
                /* @__PURE__ */ jsx(Tooltip, { title: "把角色挂到桌面壁纸层（与 F11 同一条链路）。开启前需先导入模型；退出走本开关或 F11。", placement: "left", children: /* @__PURE__ */ jsxs(Box, { sx: {
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  px: 1.5,
                  py: 0.5,
                  border: "1px solid #e0e0e0",
                  borderRadius: 1,
                  bgcolor: wallpaperEnabled ? "#e3f2fd" : "#fafafa"
                }, children: [
                  /* @__PURE__ */ jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1, flex: 1, minWidth: 0 }, children: [
                    /* @__PURE__ */ jsx(default_1$I, { fontSize: "small", sx: { color: wallpaperEnabled ? "#1976d2" : "#1a1a1a" } }),
                    /* @__PURE__ */ jsx(Box, { sx: { minWidth: 0 }, children: /* @__PURE__ */ jsx(Typography, { variant: "body2", sx: { fontWeight: "bold", color: "#1a1a1a" }, children: "壁纸模式" }) })
                  ] }),
                  /* @__PURE__ */ jsx(
                    Switch,
                    {
                      checked: wallpaperEnabled,
                      onChange: (e) => handleWallpaperToggle(e.target.checked),
                      color: "primary",
                      size: "small"
                    }
                  )
                ] }) }),
                !currentModel && /* @__PURE__ */ jsx(Tooltip, { title: "请先通过「导入建模」选择模型文件夹", placement: "left", children: /* @__PURE__ */ jsx(
                  Button,
                  {
                    variant: "outlined",
                    fullWidth: true,
                    startIcon: /* @__PURE__ */ jsx(default_1$J, {}),
                    disabled: true,
                    onClick: void 0,
                    sx: {
                      justifyContent: "flex-start",
                      borderColor: "#bdbdbd",
                      color: "#bdbdbd",
                      textTransform: "none",
                      fontWeight: "bold",
                      py: 1.2
                    },
                    children: "文件"
                  }
                ) }),
                currentModel && /* @__PURE__ */ jsxs(Box, { sx: { display: "flex", alignItems: "center", justifyContent: "space-between", px: 1.5, py: 0.5, border: "1px solid #e0e0e0", borderRadius: 1, bgcolor: defaultModelEnabled ? "#effaf8" : "#fafafa" }, children: [
                  /* @__PURE__ */ jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 0.5 }, children: [
                    /* @__PURE__ */ jsx(default_1$J, { fontSize: "small", sx: { color: defaultModelEnabled ? "#00897b" : "#9e9e9e" } }),
                    /* @__PURE__ */ jsx(Typography, { variant: "body2", sx: { fontWeight: "bold", color: defaultModelEnabled ? "#004d40" : "#9e9e9e", fontSize: 12 }, children: "默认启用此模型" })
                  ] }),
                  /* @__PURE__ */ jsx(Switch, { checked: defaultModelEnabled, onChange: handleDefaultModelEnabledToggle, size: "small", sx: { "&.Mui-checked": { color: "#00897b" }, "&.Mui-checked + .MuiSwitch-track": { backgroundColor: "#00897b" } } })
                ] }),
                modelError && /* @__PURE__ */ jsx(Typography, { variant: "caption", sx: { color: "#d32f2f", px: 1, mt: 0.5 }, children: modelError }),
                fileHint && /* @__PURE__ */ jsx(Typography, { variant: "caption", sx: { color: "#666", px: 1, mt: 0.5, fontStyle: "italic" }, children: fileHint }),
                currentModel && /* @__PURE__ */ jsxs(Typography, { variant: "caption", sx: { color: "#2e7d32", px: 1, mt: 0.5 }, children: [
                  "✓ 当前模型: ",
                  currentModel.name
                ] })
              ] })
            ] })
          ] })
        ]
      }
    )
  ] });
}
const NewPage$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: NewPage
}, Symbol.toStringTag, { value: "Module" }));
export {
  BrowserRouter as B,
  HomePage as H,
  LLMApiService$1 as L,
  MobileSettingsPage as M,
  NewPage$1 as N,
  PetPage$1 as P,
  Routes as R,
  SettingsPage$1 as S,
  TypewriterEffect as T,
  useNavigate as a,
  apiConfigService as b,
  Route as c,
  useLocation as u
};
