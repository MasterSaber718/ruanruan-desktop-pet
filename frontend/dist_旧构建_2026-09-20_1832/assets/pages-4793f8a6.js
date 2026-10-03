var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
import { _ as __vitePreload } from "./babylon-fa4505fb.js";
import { R as React, r as reactExports, j as jsx, a as React$1, b as jsxs, C as Container, B as Box, I as IconButton, d as default_1, T as Typography, P as Paper, D as Divider, F as FormControl, c as InputLabel, S as Select, M as MenuItem, e as TextField, f as FormControlLabel, g as Switch, h as Button, i as default_1$1, k as CircularProgress, l as default_1$2, m as default_1$3, A as Alert, n as Chip, o as Accordion, p as AccordionSummary, q as default_1$4, s as AccordionDetails, u as useTheme, t as default_1$5, v as default_1$6, w as Dialog, x as DialogTitle, y as default_1$7, z as DialogContent, E as DialogActions, G as Fragment, H as default_1$8, J as default_1$9, K as default_1$a, L as default_1$b, N as Tooltip, O as default_1$c, Q as default_1$d, U as default_1$e, V as default_1$f, W as default_1$g, X as default_1$h, Y as default_1$i, Z as default_1$j, _ as default_1$k, $ as default_1$l, a0 as default_1$m, a1 as default_1$n } from "./mui-bbeacffb.js";
const BabylonModelViewer$1 = React.lazy(() => __vitePreload(() => import("./BabylonModelViewer-5e24a907.js"), true ? ["assets/BabylonModelViewer-5e24a907.js","assets/mui-bbeacffb.js","assets/babylon-fa4505fb.js"] : void 0));
async function buildModelData(meta) {
  await fetch(meta.url + "?t=" + Date.now());
  const textureFiles = [];
  for (const tex of meta.textureFiles || []) {
    try {
      const r = await fetch(tex.url + "?t=" + Date.now());
      if (!r.ok)
        continue;
      const d = await r.arrayBuffer();
      if (!d.byteLength)
        continue;
      textureFiles.push({
        name: tex.name,
        path: tex.path || tex.name,
        data: d,
        webkitRelativePath: tex.webkitRelativePath || ""
      });
    } catch {
    }
  }
  return {
    name: meta.name,
    url: meta.url,
    modelWebkitRelativePath: meta.modelWebkitRelativePath || meta.name,
    textureFiles
  };
}
function PetPage() {
  const [modelData, setModelData] = reactExports.useState(null);
  const [error, setError] = reactExports.useState(null);
  const loadedUrlRef = reactExports.useRef(null);
  const showCalledRef = reactExports.useRef(false);
  reactExports.useEffect(() => {
    try {
      document.documentElement.style.background = "transparent";
      document.body.style.background = "transparent";
    } catch {
    }
    let off = null;
    const dp = window.desktopPet;
    (async () => {
      var _a;
      if (!(dp == null ? void 0 : dp.getModel)) {
        setError("preload 未注入 desktopPet");
        return;
      }
      const meta = await dp.getModel();
      if ((meta == null ? void 0 : meta.url) && loadedUrlRef.current !== meta.url) {
        const data = await buildModelData(meta);
        loadedUrlRef.current = meta.url;
        setModelData(data);
      }
      off = ((_a = dp.onModelUpdated) == null ? void 0 : _a.call(dp, async (newMeta) => {
        if (!(newMeta == null ? void 0 : newMeta.url) || loadedUrlRef.current === newMeta.url)
          return;
        const data = await buildModelData(newMeta);
        loadedUrlRef.current = newMeta.url;
        setModelData(data);
      })) || null;
    })().catch((e) => setError((e == null ? void 0 : e.message) || String(e)));
    return () => {
      try {
        off == null ? void 0 : off();
      } catch {
      }
    };
  }, []);
  const onModelLoaded = reactExports.useCallback(() => {
    var _a, _b;
    try {
      if (!showCalledRef.current) {
        showCalledRef.current = true;
        (_b = (_a = window.desktopPet) == null ? void 0 : _a.showWindow) == null ? void 0 : _b.call(_a);
      }
    } catch {
    }
  }, []);
  if (error && !modelData) {
    return /* @__PURE__ */ jsx("div", { style: { width: "100%", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", color: "#f66", fontSize: 14, padding: 20, textAlign: "center" }, children: error });
  }
  if (!modelData) {
    return /* @__PURE__ */ jsx("div", { style: { width: "100%", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", color: "#ccc", fontSize: 14 }, children: "等待模型数据..." });
  }
  return /* @__PURE__ */ jsx(React.Suspense, { fallback: /* @__PURE__ */ jsx("div", { style: { width: "100%", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", color: "#ccc", fontSize: 14 }, children: "加载3D引擎中..." }), children: /* @__PURE__ */ jsx(
    BabylonModelViewer$1,
    {
      modelData,
      desktopPetMode: true,
      physicsEnabled: true,
      windEnabled: true,
      onModelLoaded,
      onModelError: (err) => {
        console.error("[PetPage] model error", err);
      },
      onClose: () => {
        var _a, _b;
        try {
          (_b = (_a = window.desktopPet) == null ? void 0 : _a.hide) == null ? void 0 : _b.call(_a);
        } catch {
        }
      }
    }
  ) });
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
const API_HOST$1 = typeof window !== "undefined" && window.location && window.location.hostname || "127.0.0.1";
const PROXY_BASE = `http://${API_HOST$1}:27865/api/v1/ai`;
function sanitizeInput(input) {
  const cleaned = input.trim();
  if (!cleaned)
    throw new Error("输入为空");
  return cleaned.length > 8e3 ? cleaned.slice(0, 8e3) : cleaned;
}
function sanitizeMessageContent(content) {
  if (typeof content === "string")
    return sanitizeInput(content);
  if (!Array.isArray(content) || content.length === 0)
    throw new Error("输入为空");
  return content.map((part) => {
    if (part && typeof part === "object" && part.type === "text" && typeof part.text === "string") {
      return { ...part, text: part.text.trim().slice(0, 8e3) };
    }
    return part;
  });
}
function contentToText(content) {
  if (typeof content === "string")
    return content;
  if (!Array.isArray(content))
    return "";
  return content.map((p) => p && p.type === "text" && typeof p.text === "string" ? p.text : "").filter(Boolean).join("\n");
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
    const body = systemPrompt ? [{ role: "system", content: sanitizeInput(systemPrompt) }, ...messages.map((m) => ({ ...m, content: sanitizeMessageContent(m.content) }))] : messages.map((m) => ({ ...m, content: sanitizeMessageContent(m.content) }));
    const trimmed = body.slice(-20);
    const provider = apiConfigService.getActive();
    if (!provider)
      throw new Error(this.getCircuitBreakerReason() ?? "请先在设置中配置并启用AI模型API");
    if (!this.rateLimiter.consume())
      throw new RateLimitError("请求频繁，请稍后（60次/分钟）", 60, "frontend_limit");
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (lastUserMsg && !this.checkDedup(contentToText(lastUserMsg.content))) {
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
      ...userMessage && userMessage.trim() ? [{ role: "user", content: userMessage }] : []
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
function HomePage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === "dark";
  const [dshUrl, setDshUrl] = reactExports.useState(null);
  const [dshError, setDshError] = reactExports.useState(null);
  const [dshUiReady, setDshUiReady] = reactExports.useState(false);
  const [bootProgress, setBootProgress] = reactExports.useState(3);
  const [bootTip, setBootTip] = reactExports.useState("正在启动 DeepSeek Harness…");
  const [waitOverdue, setWaitOverdue] = reactExports.useState(false);
  const [topBarOpen, setTopBarOpen] = reactExports.useState(true);
  const pollRef = reactExports.useRef(null);
  const bootingRef = reactExports.useRef(false);
  const liveCheckRef = reactExports.useRef(false);
  const progTargetRef = reactExports.useRef(3);
  const progEventAtRef = reactExports.useRef(Date.now());
  reactExports.useEffect(() => {
    progTargetRef.current = bootProgress;
    progEventAtRef.current = Date.now();
  }, [bootProgress]);
  reactExports.useEffect(() => {
    let raf = 0;
    let cur = 3;
    const step = () => {
      const t = progTargetRef.current;
      const diff = t - cur;
      if (Math.abs(diff) < 0.15)
        cur = t;
      else
        cur += diff * (diff > 12 ? 0.1 : 0.055);
      const w = Math.max(3, Math.min(100, cur)).toFixed(1) + "%";
      document.querySelectorAll("[data-progfill]").forEach((el) => {
        if (el.style.width !== w)
          el.style.width = w;
      });
      const txt = Math.floor(Math.max(0, Math.min(100, cur))) + "%";
      document.querySelectorAll("[data-progpct]").forEach((el) => {
        if (el.textContent !== txt)
          el.textContent = txt;
      });
      const waiting = progTargetRef.current < 100 && Date.now() - progEventAtRef.current > 900;
      document.querySelectorAll("[data-progsweep]").forEach((el) => {
        const want = waiting ? "1" : "0";
        if (el.style.opacity !== want)
          el.style.opacity = want;
        const anim = waiting ? "rl-sweep 1.15s linear infinite" : "none";
        if (el.style.animation !== anim)
          el.style.animation = anim;
      });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);
  reactExports.useEffect(() => {
    try {
      window.dispatchEvent(new CustomEvent("rl-topbar", { detail: { collapsed: !topBarOpen } }));
    } catch {
    }
  }, [topBarOpen]);
  reactExports.useEffect(() => {
    const onMsg = (e) => {
      const d = e.data;
      if (d && typeof d === "object" && d.type === "rl-dsh-ready") {
        setDshUiReady(true);
        setDshError(null);
        setBootProgress(100);
        setBootTip("就绪");
        try {
          window.dispatchEvent(new CustomEvent("rl-dsh-ready", { detail: { ts: Date.now() } }));
        } catch {
        }
        return;
      }
      if (d && typeof d === "object" && d.type === "rl-dsh-delete-session" && d.sessionId) {
        console.log("[HomePage] 收到 DSH 会话删除请求:", d.sessionId);
        (async () => {
          var _a, _b;
          try {
            const r = await ((_b = (_a = window.dshHarness) == null ? void 0 : _a.purgeSession) == null ? void 0 : _b.call(_a, String(d.sessionId)));
            window.postMessage({ type: "rl-dsh-delete-session-result", sessionId: d.sessionId, ok: !!(r && r.ok), error: r && r.error || null }, "*");
          } catch (err) {
            window.postMessage({ type: "rl-dsh-delete-session-result", sessionId: d.sessionId, ok: false, error: (err == null ? void 0 : err.message) || "purge failed" }, "*");
          }
        })();
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);
  const buildModelCfg = () => {
    var _a, _b;
    try {
      const active = ((_a = apiConfigService.getActive) == null ? void 0 : _a.call(apiConfigService)) || null;
      const list = ((_b = apiConfigService.getAll) == null ? void 0 : _b.call(apiConfigService)) || [];
      const picked = active || list.find((c) => c.enabled) || null;
      if (picked && picked.baseUrl) {
        return {
          providerId: picked.id,
          name: picked.name || picked.id,
          baseUrl: picked.baseUrl,
          model: picked.model || "deepseek-chat",
          apiKey: picked.apiKey || "",
          contextWindow: 8192,
          maxTicks: 2048,
          maxTokens: 2048
        };
      }
    } catch {
    }
    return null;
  };
  const stopPoll = () => {
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const probeLive = async (url) => {
    try {
      const ctrl = new AbortController();
      const timer = window.setTimeout(() => ctrl.abort(), 1200);
      await fetch(url, { method: "GET", mode: "no-cors", cache: "no-store", signal: ctrl.signal });
      window.clearTimeout(timer);
      return true;
    } catch {
      return false;
    }
  };
  const applyUrlWhenLive = async (url) => {
    var _a, _b, _c, _d;
    if (liveCheckRef.current)
      return false;
    liveCheckRef.current = true;
    const BOOT_TARGET_MS = 5e3;
    const BOOT_HARD_MS = 1e4;
    const t0 = Date.now();
    try {
      setWaitOverdue(false);
      setBootTip("正在连接 DeepSeek Harness…");
      let attempts = 0;
      let lastTipAt = 0;
      while (Date.now() - t0 < BOOT_HARD_MS) {
        if (await probeLive(url)) {
          setDshUrl(url);
          setDshError(null);
          setBootProgress(45);
          setBootTip("服务已连接 · 界面加载中…");
          return true;
        }
        attempts += 1;
        if (attempts % 3 === 0) {
          try {
            const r = await ((_b = (_a = window.dshHarness) == null ? void 0 : _a.resolveUrl) == null ? void 0 : _b.call(_a));
            if ((r == null ? void 0 : r.ok) && r.url)
              url = r.url;
          } catch {
          }
          try {
            await ((_d = (_c = window.dshHarness) == null ? void 0 : _c.start) == null ? void 0 : _d.call(_c, buildModelCfg() || void 0));
          } catch {
          }
        }
        const elapsed = Date.now() - t0;
        if (elapsed >= BOOT_TARGET_MS) {
          if (!waitOverdue)
            setWaitOverdue(true);
          if (elapsed - lastTipAt > 4e3) {
            lastTipAt = elapsed;
            setBootTip("界面已就绪 · DSH 后台加载中…");
          }
        } else {
          setBootTip("正在连接 DeepSeek Harness…");
        }
        await sleep(400);
      }
      setWaitOverdue(true);
      setDshError("DSH 后台启动中，稍后自动就绪");
      setBootTip("后台加载中…");
      return false;
    } finally {
      liveCheckRef.current = false;
    }
  };
  const startPoll = () => {
    stopPoll();
    let ticks = 0;
    pollRef.current = window.setInterval(async () => {
      var _a;
      ticks += 1;
      const dsh = window.dshHarness;
      if (!dsh) {
        stopPoll();
        return;
      }
      try {
        const r = await ((_a = dsh.resolveUrl) == null ? void 0 : _a.call(dsh));
        if ((r == null ? void 0 : r.ok) && r.url) {
          stopPoll();
          const ok = await applyUrlWhenLive(r.url);
          if (!ok) {
            startPoll();
          }
          return;
        }
      } catch {
      }
      if (ticks % 5 === 0) {
        try {
          await dsh.start(buildModelCfg() || void 0);
        } catch {
        }
      }
      if (ticks >= 40) {
        stopPoll();
        setWaitOverdue(true);
        setDshError("DSH 后台仍忙，可点重试");
        setBootTip("后台加载中…");
      }
    }, 1e3);
  };
  const bootDsh = async () => {
    var _a, _b;
    if (bootingRef.current)
      return;
    bootingRef.current = true;
    setDshError(null);
    setDshUiReady(false);
    setWaitOverdue(false);
    setBootProgress(10);
    setBootTip("正在启动 DeepSeek Harness…");
    try {
      const dsh = window.dshHarness;
      if (!(dsh == null ? void 0 : dsh.start)) {
        setDshError("DeepSeek Harness 桥不可用");
        setWaitOverdue(true);
        return;
      }
      let url = null;
      try {
        const ready = await ((_a = dsh.resolveUrl) == null ? void 0 : _a.call(dsh));
        if ((ready == null ? void 0 : ready.ok) && ready.url)
          url = ready.url;
      } catch {
      }
      if (!url) {
        const st = await ((_b = dsh.status) == null ? void 0 : _b.call(dsh).catch(() => null));
        if ((st == null ? void 0 : st.ok) && st.url)
          url = st.url;
      }
      setBootProgress(30);
      setBootTip(url ? "服务已就绪 · 正在握手…" : "DSH 启动中 · 正在等待服务…");
      if (url) {
        const ok = await applyUrlWhenLive(url);
        if (!ok)
          startPoll();
        return;
      }
      startPoll();
      try {
        const result = await dsh.start(buildModelCfg() || void 0);
        if ((result == null ? void 0 : result.ok) && result.url) {
          stopPoll();
          const ok = await applyUrlWhenLive(result.url);
          if (!ok)
            startPoll();
        }
      } catch {
        startPoll();
      }
    } catch (e) {
      setDshError((e == null ? void 0 : e.message) || "启动失败");
      startPoll();
    } finally {
      bootingRef.current = false;
    }
  };
  reactExports.useEffect(() => {
    bootDsh();
    return () => {
      stopPoll();
    };
  }, []);
  const collapsed = !topBarOpen;
  const showOverlay = !dshUiReady && !waitOverdue;
  const showInlineLoad = !dshUiReady && waitOverdue;
  const barBg = collapsed ? isDarkMode ? "#1a1a1a" : "#e8eaed" : isDarkMode ? "#121212" : "#ffffff";
  return /* @__PURE__ */ jsxs(Box, { sx: {
    width: "100%",
    height: "100%",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    bgcolor: isDarkMode ? "#0e0e0e" : "#f0f2f5",
    position: "relative"
  }, children: [
    /* @__PURE__ */ jsxs(
      Box,
      {
        className: "rl-topbar",
        "data-state": collapsed ? "collapsed" : "open",
        sx: {
          py: collapsed ? 0.25 : 0.75,
          px: collapsed ? 1 : 2,
          borderBottom: `1px solid ${isDarkMode ? "#333" : "#d0d4da"}`,
          bgcolor: barBg,
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "flex-start" : "center",
          position: "relative",
          width: "100%",
          boxSizing: "border-box",
          flexShrink: 0,
          minHeight: collapsed ? 28 : 44,
          zIndex: 30,
          transition: "min-height 0.12s ease, padding 0.12s ease, background 0.12s ease",
          pointerEvents: "auto",
          ...{ WebkitAppRegion: "no-drag" }
        },
        children: [
          /* @__PURE__ */ jsxs(Box, { sx: {
            position: collapsed ? "static" : "absolute",
            left: collapsed ? void 0 : 8,
            top: collapsed ? void 0 : "50%",
            transform: collapsed ? void 0 : "translateY(-50%)",
            display: "flex",
            alignItems: "center",
            gap: 0.25,
            zIndex: 2,
            pointerEvents: "auto",
            ...{ WebkitAppRegion: "no-drag" }
          }, children: [
            /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                "aria-label": "回主页",
                title: "回主页",
                onClick: (e) => {
                  e.stopPropagation();
                  navigate("/");
                },
                style: {
                  width: collapsed ? 30 : 34,
                  height: collapsed ? 26 : 34,
                  border: "none",
                  background: "transparent",
                  color: isDarkMode ? "#fff" : "#1a1a1a",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                  fontSize: 16,
                  lineHeight: 1,
                  ...{ WebkitAppRegion: "no-drag" }
                },
                children: "⌂"
              }
            ),
            /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                "aria-label": collapsed ? "展开白栏" : "收起白栏",
                title: collapsed ? "展开白栏（固定显示）" : "收起白栏（改状态）",
                "data-rl-topbar-toggle": collapsed ? "expand" : "collapse",
                onClick: (e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setTopBarOpen(collapsed);
                },
                style: {
                  width: 32,
                  height: collapsed ? 26 : 32,
                  border: "none",
                  background: collapsed ? "rgba(225,29,72,0.12)" : "transparent",
                  color: "#e11d48",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                  fontSize: 16,
                  fontWeight: 700,
                  lineHeight: 1,
                  fontFamily: "sans-serif",
                  borderRadius: 4,
                  ...{ WebkitAppRegion: "no-drag" }
                },
                children: collapsed ? "∨" : "∧"
              }
            ),
            collapsed && /* @__PURE__ */ jsx(
              Typography,
              {
                variant: "caption",
                sx: { color: isDarkMode ? "#ddd" : "#444", userSelect: "none", pointerEvents: "none", opacity: 0.9, ml: 0.5 },
                children: "阮琳云"
              }
            )
          ] }),
          !collapsed && /* @__PURE__ */ jsx(
            Typography,
            {
              variant: "subtitle1",
              sx: { color: isDarkMode ? "white" : "text.primary", fontWeight: 500, userSelect: "none", pointerEvents: "none" },
              children: "阮琳云"
            }
          )
        ]
      }
    ),
    /* @__PURE__ */ jsx(Box, { sx: {
      flex: 1,
      minHeight: 0,
      display: "flex",
      flexDirection: "column",
      bgcolor: isDarkMode ? "#0e0e0e" : "#f0f2f5"
    }, children: /* @__PURE__ */ jsxs(Box, { sx: { flex: 1, minHeight: 0, overflow: "hidden", position: "relative", bgcolor: "#0c0c12" }, children: [
      dshUrl ? /* @__PURE__ */ jsx(
        "iframe",
        {
          src: dshUrl,
          style: {
            width: "100%",
            height: "100%",
            border: "none",
            background: "#0c0c12",
            display: "block"
          },
          title: "DeepSeek Harness",
          allow: "clipboard-read; clipboard-write; microphone",
          onLoad: () => {
            if (dshUiReady)
              return;
            setBootProgress(78);
            setBootTip("界面渲染中…");
            window.setTimeout(() => {
              setDshUiReady(true);
              setBootProgress(100);
              setBootTip("就绪");
            }, 700);
          },
          onError: () => {
            setDshUrl(null);
            setDshUiReady(false);
            setBootProgress(8);
            setBootTip("连接中断，重试中…");
            startPoll();
          }
        },
        dshUrl
      ) : null,
      showOverlay && /* @__PURE__ */ jsxs(Box, { sx: {
        position: "absolute",
        inset: 0,
        zIndex: 15,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 2,
        bgcolor: "#0c0c12",
        "@keyframes rl-sweep": { from: { transform: "translateX(-100%)" }, to: { transform: "translateX(320%)" } }
      }, children: [
        /* @__PURE__ */ jsx(Box, { sx: {
          width: 40,
          height: 40,
          borderRadius: "50%",
          border: "3px solid rgba(255,255,255,0.12)",
          borderTopColor: "rgba(255,255,255,0.92)",
          borderRightColor: "rgba(255,255,255,0.35)",
          animation: "rl-spin 0.85s cubic-bezier(0.45,0.05,0.35,1) infinite",
          "@keyframes rl-spin": { to: { transform: "rotate(360deg)" } }
        } }),
        /* @__PURE__ */ jsxs(Box, { sx: { position: "relative", width: 240, maxWidth: "70%", height: 4, borderRadius: 2, bgcolor: "rgba(255,255,255,0.12)", overflow: "hidden" }, children: [
          /* @__PURE__ */ jsx(Box, { sx: {
            position: "absolute",
            left: 0,
            top: 0,
            width: "3%",
            height: "100%",
            borderRadius: 2,
            bgcolor: "rgba(255,255,255,0.9)"
          }, "data-progfill": "" }),
          /* @__PURE__ */ jsx(Box, { sx: {
            position: "absolute",
            left: 0,
            top: 0,
            height: "100%",
            width: "36%",
            borderRadius: 2,
            opacity: 0,
            pointerEvents: "none",
            background: "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.55) 50%, rgba(255,255,255,0) 100%)"
          }, "data-progsweep": "" })
        ] }),
        /* @__PURE__ */ jsxs(Typography, { variant: "body2", sx: { color: "rgba(232,232,232,0.85)", letterSpacing: 1 }, children: [
          bootTip,
          " · ",
          /* @__PURE__ */ jsx("span", { "data-progpct": "", children: "0%" })
        ] })
      ] }),
      showInlineLoad && /* @__PURE__ */ jsxs(Box, { sx: {
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        zIndex: 8,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 1,
        pt: 3,
        px: 2,
        bgcolor: "transparent",
        pointerEvents: "none"
      }, children: [
        /* @__PURE__ */ jsxs(Box, { sx: { position: "relative", width: 240, maxWidth: "80%", height: 3, borderRadius: 2, bgcolor: "rgba(255,255,255,0.12)", overflow: "hidden" }, children: [
          /* @__PURE__ */ jsx(Box, { sx: {
            position: "absolute",
            left: 0,
            top: 0,
            width: "3%",
            height: "100%",
            bgcolor: "rgba(255,255,255,0.85)"
          }, "data-progfill": "" }),
          /* @__PURE__ */ jsx(Box, { sx: {
            position: "absolute",
            left: 0,
            top: 0,
            height: "100%",
            width: "36%",
            borderRadius: 2,
            opacity: 0,
            pointerEvents: "none",
            background: "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.55) 50%, rgba(255,255,255,0) 100%)"
          }, "data-progsweep": "" })
        ] }),
        /* @__PURE__ */ jsxs(Typography, { variant: "caption", sx: { color: "rgba(232,232,232,0.8)", letterSpacing: 1 }, children: [
          dshError || bootTip,
          " · ",
          /* @__PURE__ */ jsx("span", { "data-progpct": "", children: "0%" })
        ] }),
        !!dshError && /* @__PURE__ */ jsx(
          Typography,
          {
            component: "button",
            variant: "caption",
            onClick: () => {
              setDshError(null);
              setDshUiReady(false);
              setWaitOverdue(false);
              bootDsh();
            },
            style: {
              cursor: "pointer",
              border: "none",
              background: "transparent",
              color: "rgba(232,232,232,0.75)",
              textDecoration: "underline",
              pointerEvents: "auto"
            },
            children: "重试"
          }
        )
      ] })
    ] }) })
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
const API_HOST = typeof window !== "undefined" && window.location && window.location.hostname || "127.0.0.1";
const API_BASE_URL = `http://${API_HOST}:27865/api/v1/wechat-bot`;
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
  const [wechatState, setWechatState] = reactExports.useState(null);
  const [wechatEnabled, setWechatEnabled] = reactExports.useState(false);
  const [wechatBusy, setWechatBusy] = reactExports.useState(false);
  const [wechatError, setWechatError] = reactExports.useState(null);
  const [wechatSuccess, setWechatSuccess] = reactExports.useState(null);
  const [loginUrl, setLoginUrl] = reactExports.useState(null);
  const [listenInput, setListenInput] = reactExports.useState("");
  const [listenList, setListenList] = reactExports.useState([]);
  const [devMode, setDevMode] = reactExports.useState(() => {
    try {
      return localStorage.getItem("ruanlinyun_dev_mode") === "true";
    } catch {
      return false;
    }
  });
  const handleDevModeChange = (on) => {
    setDevMode(on);
    try {
      localStorage.setItem("ruanlinyun_dev_mode", String(on));
    } catch {
    }
  };
  const [dshResident, setDshResident] = reactExports.useState(true);
  const [residentStage, setResidentStage] = reactExports.useState(0);
  const residentToastTimer = reactExports.useRef(null);
  const closeResidentFlow = () => {
    if (residentToastTimer.current) {
      window.clearTimeout(residentToastTimer.current);
      residentToastTimer.current = null;
    }
    setResidentStage(0);
  };
  reactExports.useEffect(() => () => {
    if (residentToastTimer.current)
      window.clearTimeout(residentToastTimer.current);
  }, []);
  const applyResident = async (on) => {
    try {
      const dsh = window.dshHarness;
      if (dsh == null ? void 0 : dsh.residentSet)
        await dsh.residentSet(on);
    } catch (e) {
      console.warn("[Settings] residentSet fail", e);
    }
    setDshResident(on);
  };
  const handleResidentToggle = (on) => {
    if (on) {
      void applyResident(true);
      return;
    }
    setResidentStage(1);
  };
  const confirmResidentOff = async () => {
    await applyResident(false);
    setResidentStage(3);
    residentToastTimer.current = window.setTimeout(() => {
      setResidentStage(0);
      residentToastTimer.current = null;
    }, 500);
  };
  reactExports.useEffect(() => {
    const init = async () => {
      await apiConfigService.waitReady();
      const all3 = apiConfigService.getAll();
      setProviders(all3);
      try {
        const dsh = window.dshHarness;
        if (dsh == null ? void 0 : dsh.providersSync) {
          const sync = await dsh.providersSync({
            fullSync: true,
            providers: all3.map((c) => ({
              id: c.id,
              name: c.name,
              baseUrl: c.baseUrl,
              model: c.model,
              apiKey: c.apiKey || "",
              enabled: c.enabled
            }))
          });
          if ((sync == null ? void 0 : sync.ok) && sync.activeId) {
            try {
              localStorage.setItem("ruanlinyun_settings_provider", sync.activeId);
            } catch {
            }
          }
        }
      } catch (e) {
        console.warn("[Settings] providers sync fail", e);
      }
      try {
        let lastId = localStorage.getItem("ruanlinyun_settings_provider");
        const dsh = window.dshHarness;
        if (dsh == null ? void 0 : dsh.providersGet) {
          const st = await dsh.providersGet();
          if ((st == null ? void 0 : st.ok) && st.activeId)
            lastId = st.activeId;
        }
        const pick = all3.find((c) => c.id === lastId) || all3.find((c) => c.enabled) || all3[0];
        if (pick)
          loadProvider(pick.id, all3);
      } catch {
        if (all3.length > 0)
          loadProvider(all3[0].id, all3);
      }
      try {
        const harness = window.dshHarness;
        if (harness == null ? void 0 : harness.residentGet) {
          const rs = await harness.residentGet();
          if (rs == null ? void 0 : rs.ok)
            setDshResident(rs.enabled !== false);
        }
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
      try {
        localStorage.setItem("ruanlinyun_settings_provider", p.id);
      } catch {
      }
      const dsh = window.dshHarness;
      if (dsh == null ? void 0 : dsh.providersSetActive) {
        dsh.providersSetActive(p.id).then((r) => {
          if ((r == null ? void 0 : r.ok) && r.activeId) {
            try {
              localStorage.setItem("ruanlinyun_settings_provider", r.activeId);
            } catch {
            }
          }
        }).catch(() => {
        });
      }
    }
  };
  const apiKeyOptional = selectedProviderId === "glm_local" || selectedProviderId === "qwen_local" || /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?(\/|$)/i.test(baseUrl);
  const handleSave = async () => {
    await apiConfigService.update(selectedProviderId, { apiKey, baseUrl, model, enabled });
    const allNow = apiConfigService.getAll();
    setProviders(allNow);
    setSaved(true);
    try {
      localStorage.setItem("ruanlinyun_settings_provider", selectedProviderId);
    } catch {
    }
    setTimeout(() => setSaved(false), 2e3);
    try {
      const dsh = window.dshHarness;
      if (dsh == null ? void 0 : dsh.providersSync) {
        const sync = await dsh.providersSync({
          fullSync: true,
          activeId: selectedProviderId,
          providers: allNow.map((c) => ({
            id: c.id,
            name: c.name,
            baseUrl: c.baseUrl,
            model: c.model,
            apiKey: c.apiKey || "",
            enabled: c.enabled
          }))
        });
        console.log("[Settings] synced to DSH", sync == null ? void 0 : sync.activeId);
      }
    } catch (e) {
      console.warn("[Settings] DSH sync fail", e);
    }
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
  return /* @__PURE__ */ jsxs(Box, { sx: { width: "100%", px: { xs: 2, md: 3 }, py: 2, boxSizing: "border-box" }, children: [
    /* @__PURE__ */ jsxs(Box, { sx: { display: "flex", alignItems: "center", mb: 1 }, children: [
      /* @__PURE__ */ jsx(IconButton, { "aria-label": "返回", sx: { mr: 1 }, onClick: () => navigate((() => {
        try {
          return sessionStorage.getItem("settingsFrom") || "/";
        } catch {
          return "/";
        }
      })()), children: /* @__PURE__ */ jsx(default_1, {}) }),
      /* @__PURE__ */ jsx(Typography, { variant: "h5", sx: { fontWeight: 600 }, children: "设置" }),
      /* @__PURE__ */ jsx(Box, { sx: { flexGrow: 1 } }),
      /* @__PURE__ */ jsx(Typography, { variant: "caption", sx: { color: "text.secondary", pr: 0.5 }, children: "阮云小宠 v1.0.0" })
    ] }),
    /* @__PURE__ */ jsxs(Box, { sx: {
      display: "grid",
      gridTemplateColumns: { xs: "1fr", md: "minmax(0,1.15fr) minmax(0,0.85fr)" },
      gap: 2,
      alignItems: "start",
      mb: 2
    }, children: [
      /* @__PURE__ */ jsxs(Paper, { elevation: 3, sx: { p: 3 }, children: [
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
            size: "small",
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
        /* @__PURE__ */ jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1, mb: 2, flexWrap: "wrap" }, children: [
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
              size: "small",
              startIcon: /* @__PURE__ */ jsx(default_1$1, {}),
              onClick: async () => {
                if (!window.confirm(`确定删除该 provider 吗？

软件与 DSH 共享列表将同步删除（删除优先，不会复活）。`))
                  return;
                const delId = selectedProviderId;
                const ok = await apiConfigService.removeProvider(delId);
                if (ok) {
                  try {
                    const dsh = window.dshHarness;
                    if (dsh == null ? void 0 : dsh.providersDelete)
                      await dsh.providersDelete(delId);
                  } catch (e) {
                    console.warn("[Settings] DSH delete fail", e);
                  }
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
              size: "small",
              onClick: handleTest,
              disabled: testing || !apiKeyOptional && !apiKey.trim(),
              startIcon: testing ? /* @__PURE__ */ jsx(CircularProgress, { size: 16 }) : /* @__PURE__ */ jsx(default_1$2, {}),
              children: "测试连接"
            }
          ),
          /* @__PURE__ */ jsx(
            Button,
            {
              variant: "contained",
              size: "small",
              onClick: handleSave,
              color: saved ? "success" : "primary",
              startIcon: saved ? /* @__PURE__ */ jsx(default_1$3, {}) : void 0,
              children: saved ? "已保存" : "保存"
            }
          )
        ] }),
        testResult && /* @__PURE__ */ jsx(Alert, { severity: testResult.ok ? "success" : "error", sx: { mb: 2 }, children: testResult.message }),
        /* @__PURE__ */ jsx(Box, { sx: { display: "flex", gap: 0.75, flexWrap: "wrap" }, children: providers.map((p) => /* @__PURE__ */ jsx(
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
      /* @__PURE__ */ jsxs(Box, { sx: { display: "flex", flexDirection: "column", gap: 2 }, children: [
        /* @__PURE__ */ jsxs(Paper, { elevation: 3, sx: { p: 2 }, children: [
          /* @__PURE__ */ jsx(Typography, { variant: "subtitle1", sx: { fontWeight: 600, mb: 1 }, children: "通用设置" }),
          /* @__PURE__ */ jsx(Divider, { sx: { mb: 1.5 } }),
          /* @__PURE__ */ jsx(
            FormControlLabel,
            {
              sx: { mx: 0, display: "flex" },
              control: /* @__PURE__ */ jsx(Switch, { size: "small", checked: isDarkMode, onChange: (e) => setIsDarkMode(e.target.checked), color: "primary" }),
              label: /* @__PURE__ */ jsx(Typography, { variant: "body2", children: "深色模式" })
            }
          ),
          /* @__PURE__ */ jsx(
            FormControlLabel,
            {
              sx: { mx: 0, display: "flex", mt: 0.5 },
              control: /* @__PURE__ */ jsx(Switch, { size: "small", checked: dshResident, onChange: (e) => handleResidentToggle(e.target.checked), color: "primary" }),
              label: /* @__PURE__ */ jsxs(Box, { children: [
                /* @__PURE__ */ jsx(Typography, { variant: "body2", children: "DSH 常驻服务" }),
                /* @__PURE__ */ jsx(Typography, { variant: "caption", sx: { color: "#666" }, children: dshResident ? "已开启 · 关闭软件后仍后台常驻，下次秒开" : "已关闭 · 随软件一起退出，下次需冷启动" })
              ] })
            }
          )
        ] }),
        devMode && /* @__PURE__ */ jsxs(Accordion, { elevation: 3, defaultExpanded: false, sx: { borderRadius: 1, overflow: "hidden", "&:before": { display: "none" } }, children: [
          /* @__PURE__ */ jsxs(AccordionSummary, { expandIcon: /* @__PURE__ */ jsx(default_1$4, {}), sx: { minHeight: 44, "& .MuiAccordionSummary-content": { my: 0.5 } }, children: [
            /* @__PURE__ */ jsx(Typography, { variant: "subtitle1", sx: { flexGrow: 1, fontWeight: 600 }, children: "机器人" }),
            wechatBusy && /* @__PURE__ */ jsx(CircularProgress, { size: 16, sx: { mr: 1 } }),
            wechatState && /* @__PURE__ */ jsx(
              Chip,
              {
                size: "small",
                sx: { mr: 1, height: 22 },
                color: wechatState.status === "running" ? "success" : wechatState.status === "error" ? "error" : wechatState.status === "idle" ? "warning" : "default",
                label: wechatState.status === "running" ? "运行中" : wechatState.status === "stopped" ? "已停止" : wechatState.status === "error" ? "错误" : "未登录"
              }
            )
          ] }),
          /* @__PURE__ */ jsxs(AccordionDetails, { sx: { pt: 1, px: 2, pb: 2 }, children: [
            /* @__PURE__ */ jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1, mb: 1.5, flexWrap: "wrap" }, children: [
              /* @__PURE__ */ jsx(
                FormControlLabel,
                {
                  sx: { mx: 0 },
                  control: /* @__PURE__ */ jsx(Switch, { size: "small", checked: wechatEnabled, onChange: (e) => handleWechatToggle(e.target.checked), color: "primary", disabled: wechatBusy }),
                  label: /* @__PURE__ */ jsx(Typography, { variant: "body2", children: wechatEnabled ? "已启用" : "已关闭" })
                }
              ),
              /* @__PURE__ */ jsx(Box, { sx: { flexGrow: 1 } }),
              wechatState && (wechatState.status === "idle" || wechatState.status === "error") && /* @__PURE__ */ jsx(Button, { size: "small", variant: "contained", color: "warning", startIcon: /* @__PURE__ */ jsx(default_1$5, {}), onClick: handleOpenLoginUrl, children: "扫码登录" }),
              /* @__PURE__ */ jsx(Button, { size: "small", variant: "outlined", startIcon: /* @__PURE__ */ jsx(default_1$6, {}), onClick: handleWechatReset, disabled: wechatBusy, children: "清空历史" })
            ] }),
            /* @__PURE__ */ jsx(Alert, { severity: "info", sx: { mb: 1, py: 0.5, "& .MuiAlert-message": { fontSize: 12 } }, children: "通过 wechatbot-webhook 收发消息；首次需扫码登录微信小号。" }),
            wechatState && wechatState.status === "idle" && /* @__PURE__ */ jsx(Alert, { severity: "warning", sx: { mb: 1, py: 0.5, "& .MuiAlert-message": { fontSize: 12 } }, children: "登录态可能已过期，请重新扫码。" }),
            wechatState && /* @__PURE__ */ jsxs(Box, { sx: { mb: 1, p: 1, bgcolor: "background.default", borderRadius: 1 }, children: [
              /* @__PURE__ */ jsxs(Typography, { variant: "caption", display: "block", children: [
                /* @__PURE__ */ jsx("strong", { children: "插件" }),
                " ",
                wechatState.plugin || "wechatbot-webhook",
                wechatState.name ? ` · ${wechatState.name}` : ""
              ] }),
              (wechatState.incoming_count !== void 0 || wechatState.outgoing_count !== void 0) && /* @__PURE__ */ jsxs(Typography, { variant: "caption", display: "block", sx: { mt: 0.25 }, children: [
                /* @__PURE__ */ jsx("strong", { children: "收/发" }),
                " ",
                wechatState.incoming_count || 0,
                " / ",
                wechatState.outgoing_count || 0
              ] }),
              wechatState.last_message && /* @__PURE__ */ jsxs(Typography, { variant: "caption", display: "block", sx: { mt: 0.25 }, noWrap: true, children: [
                /* @__PURE__ */ jsx("strong", { children: "最近" }),
                " ",
                wechatState.last_message
              ] }),
              wechatState.last_error && /* @__PURE__ */ jsxs(Typography, { variant: "caption", display: "block", color: "error", sx: { mt: 0.25 }, noWrap: true, children: [
                /* @__PURE__ */ jsx("strong", { children: "错误" }),
                " ",
                wechatState.last_error
              ] })
            ] }),
            /* @__PURE__ */ jsxs(Box, { sx: { p: 1, bgcolor: "background.default", borderRadius: 1 }, children: [
              /* @__PURE__ */ jsxs(Typography, { variant: "caption", display: "block", sx: { mb: 0.75 }, children: [
                /* @__PURE__ */ jsx("strong", { children: "监听列表" }),
                "（仅响应列表内好友/群，为空则不响应）"
              ] }),
              /* @__PURE__ */ jsxs(Box, { sx: { display: "flex", gap: 0.75, mb: 0.75 }, children: [
                /* @__PURE__ */ jsx(
                  TextField,
                  {
                    size: "small",
                    placeholder: "好友昵称或群名",
                    value: listenInput,
                    onChange: (e) => setListenInput(e.target.value),
                    sx: { flexGrow: 1, "& .MuiInputBase-input": { fontSize: 13, py: 0.75 } },
                    onKeyDown: (e) => {
                      if (e.key === "Enter")
                        handleAddListen();
                    }
                  }
                ),
                /* @__PURE__ */ jsx(Button, { size: "small", variant: "contained", onClick: handleAddListen, disabled: wechatBusy || !listenInput.trim(), children: "添加" })
              ] }),
              /* @__PURE__ */ jsx(Box, { sx: { display: "flex", gap: 0.5, flexWrap: "wrap" }, children: listenList.length === 0 ? /* @__PURE__ */ jsx(Typography, { variant: "caption", color: "text.secondary", children: "暂无监听对象" }) : listenList.map((name) => /* @__PURE__ */ jsx(Chip, { label: name, size: "small", onDelete: () => handleRemoveListen(name), disabled: wechatBusy }, name)) })
            ] }),
            wechatError && /* @__PURE__ */ jsx(Alert, { severity: "error", sx: { mt: 1 }, onClose: () => setWechatError(null), children: wechatError }),
            wechatSuccess && /* @__PURE__ */ jsx(Alert, { severity: "success", sx: { mt: 1 }, onClose: () => setWechatSuccess(null), children: wechatSuccess })
          ] })
        ] }),
        /* @__PURE__ */ jsxs(Paper, { elevation: 3, sx: { p: 2 }, children: [
          /* @__PURE__ */ jsx(Typography, { variant: "subtitle1", sx: { fontWeight: 600, mb: 1 }, children: "关于" }),
          /* @__PURE__ */ jsx(Divider, { sx: { mb: 1.5 } }),
          /* @__PURE__ */ jsxs(Accordion, { defaultExpanded: true, sx: { "&:before": { display: "none" } }, children: [
            /* @__PURE__ */ jsx(AccordionSummary, { expandIcon: /* @__PURE__ */ jsx(default_1$4, {}), children: /* @__PURE__ */ jsx(Typography, { variant: "body2", children: "版本信息" }) }),
            /* @__PURE__ */ jsx(AccordionDetails, { sx: { pt: 0 }, children: /* @__PURE__ */ jsx(Typography, { variant: "body2", children: "阮云小宠 v1.0.0" }) })
          ] }),
          /* @__PURE__ */ jsxs(Accordion, { defaultExpanded: true, sx: { "&:before": { display: "none" } }, children: [
            /* @__PURE__ */ jsx(AccordionSummary, { expandIcon: /* @__PURE__ */ jsx(default_1$4, {}), children: /* @__PURE__ */ jsx(Typography, { variant: "body2", children: "开发者模式" }) }),
            /* @__PURE__ */ jsx(AccordionDetails, { sx: { pt: 0 }, children: /* @__PURE__ */ jsx(DeveloperModePanel, { devMode, onChange: handleDevModeChange }) })
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs(Dialog, { open: residentStage > 0, onClose: closeResidentFlow, maxWidth: "xs", fullWidth: true, children: [
      /* @__PURE__ */ jsxs(DialogTitle, { sx: { display: "flex", alignItems: "center", pr: 1, pb: 1 }, children: [
        /* @__PURE__ */ jsxs("span", { children: [
          residentStage === 1 && "关闭 DSH 常驻服务？",
          residentStage === 2 && "再问一次…",
          residentStage === 3 && "DSH 常驻服务已关闭"
        ] }),
        /* @__PURE__ */ jsx(Box, { sx: { flexGrow: 1 } }),
        /* @__PURE__ */ jsx(IconButton, { size: "small", onClick: closeResidentFlow, "aria-label": "关闭", children: /* @__PURE__ */ jsx(default_1$7, { fontSize: "small" }) })
      ] }),
      /* @__PURE__ */ jsxs(DialogContent, { dividers: true, children: [
        residentStage === 1 && /* @__PURE__ */ jsxs(Box, { children: [
          /* @__PURE__ */ jsx(Typography, { variant: "body2", sx: { mb: 1 }, children: /* @__PURE__ */ jsx("strong", { children: "它是做什么的" }) }),
          /* @__PURE__ */ jsxs(Typography, { variant: "body2", sx: { color: "#444", mb: 1.5 }, children: [
            "DSH（DeepSeek Harness）是阮云小宠的大脑服务。开启常驻后，关掉软件它仍会在系统托盘里 安静地后台运行，下次打开软件可以",
            /* @__PURE__ */ jsx("strong", { children: "秒开" }),
            "（省掉约 30 秒冷启动）；托盘图标 可以随时打开 DSH 页面或退出它。"
          ] }),
          /* @__PURE__ */ jsx(Typography, { variant: "body2", sx: { mb: 1 }, children: /* @__PURE__ */ jsx("strong", { children: "关掉会怎么样" }) }),
          /* @__PURE__ */ jsxs(Typography, { variant: "body2", sx: { color: "#444" }, children: [
            "· 关闭软件时 DSH 会",
            /* @__PURE__ */ jsx("strong", { children: "一起退出" }),
            '，后台不再驻留任何东西（更"干净"，也更费启动时间）',
            /* @__PURE__ */ jsx("br", {}),
            "· 下次打开软件需要",
            /* @__PURE__ */ jsx("strong", { children: "重新冷启动" }),
            "，约 30 秒",
            /* @__PURE__ */ jsx("br", {}),
            "· 软件运行期间不受影响，聊天和 DSH 页面照常可用"
          ] })
        ] }),
        residentStage === 2 && /* @__PURE__ */ jsx(Typography, { variant: "body2", sx: { color: "#444", lineHeight: 1.9 }, children: "亲爱的用户，您真的要关闭小软软的DSH常驻服务吗？呜呜呜，小软软会乖乖的，不要关掉我好不好……(っ﹏⊂)" }),
        residentStage === 3 && /* @__PURE__ */ jsx(Typography, { variant: "body2", sx: { color: "#444" }, children: "DSH常驻服务已成功关闭……(っ﹏⊂) 呜呜" })
      ] }),
      /* @__PURE__ */ jsxs(DialogActions, { sx: { px: 3, py: 1.5 }, children: [
        residentStage === 1 && /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx(Button, { color: "warning", variant: "contained", onClick: () => setResidentStage(2), children: "执意关闭（不推荐）" }),
          /* @__PURE__ */ jsx(Button, { onClick: closeResidentFlow, children: "取消" })
        ] }),
        residentStage === 2 && /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx(Button, { color: "error", variant: "contained", onClick: confirmResidentOff, children: "强行关闭" }),
          /* @__PURE__ */ jsx(Button, { onClick: closeResidentFlow, children: "取消" })
        ] })
      ] })
    ] })
  ] });
}
function DeveloperModePanel({ devMode, onChange }) {
  return /* @__PURE__ */ jsxs(Box, { children: [
    /* @__PURE__ */ jsxs(Box, { sx: { display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }, children: [
      /* @__PURE__ */ jsx(Typography, { variant: "body2", children: "启用开发者功能（实验性）" }),
      /* @__PURE__ */ jsx(Switch, { size: "small", checked: devMode, onChange: (e) => onChange(e.target.checked) })
    ] }),
    /* @__PURE__ */ jsx(Typography, { variant: "caption", sx: { color: "#666", display: "block" }, children: "开启后开放开发者专属功能（机器人卡片、日志查看、接口调试等）。" })
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
const CTRL_URL = "http://127.0.0.1:5175/api/speech-bridge/control";
const FINAL_URL = "http://127.0.0.1:5175/api/speech-bridge/final";
const STATUS_URL = "http://127.0.0.1:5175/api/speech-bridge/status";
const VOICE_ENABLED_KEY = "ruanlinyun_voice_enabled";
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
    __publicField(this, "userDisabled", (() => {
      try {
        return localStorage.getItem(VOICE_ENABLED_KEY) === "false";
      } catch {
        return false;
      }
    })());
    /** [v113] 消费者计数：聊天麦/通话共享一路 Edge */
    __publicField(this, "consumers", 0);
  }
  getState() {
    return this.state;
  }
  getStatus() {
    return { ...this.status };
  }
  isUserDisabled() {
    return this.userDisabled;
  }
  setUserDisabled(off) {
    this.userDisabled = !!off;
    try {
      localStorage.setItem(VOICE_ENABLED_KEY, off ? "false" : "true");
    } catch {
    }
    console.log("[SpeechManager] userDisabled=" + this.userDisabled);
    if (off)
      this.stop();
  }
  subscribe(handler) {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }
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
  async start(lang) {
    this.consumers += 1;
    if (this.userDisabled) {
      this.consumers = Math.max(0, this.consumers - 1);
      console.log("[SpeechManager] 用户已关闭语音，忽略 start");
      this.emitState();
      return;
    }
    if (this.state === "running") {
      console.log("[SpeechManager] already running, consumers=" + this.consumers);
      return;
    }
    this.lang = lang || this.lang || "zh-CN";
    this.state = "running";
    this.skipPending = false;
    await this.pushControl({ enabled: true, muted: false, lang: this.lang });
    try {
      const api = window.speechBridge;
      if (api && api.start)
        await api.start(this.lang);
    } catch (e) {
      console.warn("[SpeechManager] Edge start IPC fail", e);
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
    console.log("[SpeechManager] Edge 语音桥已启用 lang=" + this.lang + " consumers=" + this.consumers);
    this.emitState();
  }
  async pauseForTts() {
    if (this.state !== "running")
      return;
    await this.pushControl({ enabled: true, muted: true });
    try {
      const api = window.speechBridge;
      if (api && api.setControl)
        await api.setControl({ enabled: true, muted: true });
    } catch {
    }
    console.log("[SpeechManager] pause for TTS");
    this.emitState();
  }
  async resumeAfterTts() {
    if (this.userDisabled)
      return;
    if (this.state !== "running")
      return;
    await this.pushControl({ enabled: true, muted: false, lang: this.lang });
    try {
      const api = window.speechBridge;
      if (api && api.setControl)
        await api.setControl({ enabled: true, muted: false, lang: this.lang });
    } catch {
    }
    console.log("[SpeechManager] resume after TTS");
    this.emitState();
  }
  async mute() {
    if (this.state === "stopped")
      return;
    this.state = "muted";
    await this.pushControl({ enabled: true, muted: true });
    try {
      const api = window.speechBridge;
      if (api && api.setControl)
        await api.setControl({ enabled: true, muted: true });
    } catch {
    }
    console.log("[SpeechManager] muted");
    this.emitState();
  }
  async unmute() {
    if (this.userDisabled || this.state === "stopped")
      return;
    this.state = "running";
    await this.pushControl({ enabled: true, muted: false, lang: this.lang });
    try {
      const api = window.speechBridge;
      if (api && api.setControl)
        await api.setControl({ enabled: true, muted: false, lang: this.lang });
    } catch {
    }
    console.log("[SpeechManager] unmuted");
    this.emitState();
  }
  interrupt() {
    this.skipPending = true;
    console.log("[SpeechManager] interrupt");
  }
  /** 减一个使用者；无人用时才真停 */
  async release() {
    this.consumers = Math.max(0, this.consumers - 1);
    console.log("[SpeechManager] release consumers=" + this.consumers);
    if (this.consumers === 0)
      await this.stop();
  }
  async stop() {
    this.consumers = 0;
    this.state = "stopped";
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
    console.log("[SpeechManager] stopped");
    this.emitState();
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
const BabylonModelViewer = React.lazy(() => __vitePreload(() => import("./BabylonModelViewer-5e24a907.js"), true ? ["assets/BabylonModelViewer-5e24a907.js","assets/mui-bbeacffb.js","assets/babylon-fa4505fb.js"] : void 0));
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
function visionImagePart(dataUrl) {
  return { type: "image_url", image_url: { url: dataUrl } };
}
let dshMemoBusy = false;
async function companionAskAI(userText, imageDataUrl) {
  if (dshMemoBusy)
    throw new Error("上一条还在思考，稍等");
  dshMemoBusy = true;
  try {
    const { askHub } = await __vitePreload(() => import("./companionAI-5de9696d.js"), true ? ["assets/companionAI-5de9696d.js","assets/babylon-fa4505fb.js"] : void 0);
    const r = await askHub({
      scene: "companion",
      from: "preview",
      userText,
      imageDataUrl
    });
    if (!r.ok && r.text === "")
      throw new Error(r.error || "AI 空回复");
    console.log("[companionAskAI] hub route=" + (r.route || "") + " len=" + (r.text || "").length);
    return r.text || "（AI 空回复）";
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
  const [chatLog, setChatLog] = reactExports.useState([]);
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
      if (speechManager.isUserDisabled && speechManager.isUserDisabled()) {
        console.log("[NewPage] 用户已关闭语音总开关，不自动通话");
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
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        if (!currentModel && defaultModelEnabled) {
          setModelLoading(true);
          setLoadingProgress(8);
          const v81Api = window.__newPageAPI;
          let loaded = false;
          if (v81Api == null ? void 0 : v81Api.loadFromCache) {
            const r = await v81Api.loadFromCache();
            loaded = !!(r == null ? void 0 : r.ok);
            console.log("[启动编排][优先级1] 模型(缓存): " + (loaded ? "命中" : "未命中(" + ((r == null ? void 0 : r.err) || "") + ")"));
          }
          if (!loaded && !cancelled) {
            setLoadingProgress(25);
            const dm = window.defaultModel;
            if (dm == null ? void 0 : dm.load) {
              const lr = await dm.load();
              if ((lr == null ? void 0 : lr.ok) && lr.meta && !cancelled) {
                setLoadingProgress(45);
                const modelResp = await fetch(lr.meta.url + "?t=" + Date.now());
                const data = await modelResp.arrayBuffer();
                setLoadingProgress(70);
                const texs = [];
                const texList = lr.meta.textureFiles || [];
                for (let ti = 0; ti < texList.length; ti++) {
                  if (cancelled)
                    break;
                  const t = texList[ti];
                  try {
                    const tr = await fetch(t.url + "?t=" + Date.now());
                    if (tr.ok)
                      texs.push({ name: t.name, path: t.path || t.name, data: await tr.arrayBuffer(), webkitRelativePath: t.webkitRelativePath || "" });
                  } catch {
                  }
                  if (texList.length > 0)
                    setLoadingProgress(70 + Math.round(25 * ((ti + 1) / texList.length)));
                }
                if (!cancelled) {
                  openModelPreviewRef.current(lr.meta.name || "model.pmx", data, texs, lr.meta.url, void 0);
                  loaded = true;
                  console.log("[启动编排][优先级1] 模型(默认目录): " + (lr.meta.name || ""));
                }
              }
            }
          }
          if (!cancelled) {
            if (!loaded)
              console.log("[启动编排][优先级1] 无模型 → 跳过，继续下一项");
            setLoadingProgress(100);
            setModelLoading(false);
          }
        } else if (!defaultModelEnabled) {
          console.log("[启动编排][优先级1] 默认模型开关关闭 → 跳过");
        }
        if (!cancelled && localStorage.getItem("ruanlinyun_3d_wallpaper_enabled") !== "false") {
          const wm = window.wallpaperMode;
          if (wm && typeof wm.getStatus === "function") {
            const st = await wm.getStatus();
            if (!(st == null ? void 0 : st.active) && typeof wm.enter === "function") {
              await wm.enter();
              setWallpaperEnabled(true);
              console.log("[启动编排][优先级2] 壁纸模式已默认进入");
            }
          }
        }
        if (!cancelled && desktopPetEnabled && currentModel) {
          console.log("[启动编排] 桌宠随 openModelPreview 正规链同步显示");
        }
        console.log("[启动编排] 感知状态: cam=" + flags.cam + " screen=" + flags.screen);
      } catch (e) {
        console.warn("[启动编排] 异常:", e);
        if (!cancelled)
          setModelLoading(false);
      }
    }, 80);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      setModelLoading(false);
    };
  }, []);
  const UNIFIED_KEY = "ruanlinyun_unified_messages";
  const unifiedPush = (who, text, extra) => {
    try {
      const sender = who === "user" ? "me" : who;
      if (sender !== "me" && sender !== "ai")
        return;
      const raw = localStorage.getItem(UNIFIED_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      arr.push({ id: String(Date.now()) + "_" + Math.random().toString(36).slice(2, 6), text, sender, time: (/* @__PURE__ */ new Date()).toLocaleTimeString(), ...extra || {} });
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
        setChatLog(() => unified.slice(-60).map((m) => ({
          cls: m.sender === "me" || m.sender === "user" ? "me" : m.sender === "sys" ? "sys" : "ai",
          text: m.text,
          id: m.id
        })));
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
  const detectSearchIntent = (text) => {
    if (!/查|搜|搜索|查找|了解一下|最新|新闻|天气|什么是|怎么/.test(text))
      return null;
    if (detectSeeIntent(text))
      return null;
    return text.trim();
  };
  const isAutomationGoal = (text) => {
    const t = (text || "").trim();
    if (!t)
      return false;
    if (detectSeeIntent(t))
      return false;
    return /(天气|气温|听歌|放歌|来一首|听音乐|播放音乐|打开|关闭|关掉|启动|退出|帮我开|帮我关)/.test(t);
  };
  const runGuiAutomation = async (goal) => {
    const api = window.guiAgent;
    if (!api || !api.run)
      return { ok: false, result: "自动化桥未就绪（需重启应用）" };
    try {
      const r = await api.run(goal);
      if (r && r.ok)
        return { ok: true, result: String(r.result || "已完成") };
      return { ok: false, result: String(r && r.error || r && r.result || "自动化失败") };
    } catch (e) {
      return { ok: false, result: (e == null ? void 0 : e.message) || String(e) };
    }
  };
  const browserSearchBrief = async (query) => {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 25e3);
      const resp = await fetch("http://127.0.0.1:5180/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
        signal: ctrl.signal
      });
      clearTimeout(t);
      const j = await resp.json();
      if (!resp.ok || !(j == null ? void 0 : j.ok))
        return "";
      const items = (j.items || []).slice(0, 4);
      if (!items.length)
        return "";
      const lines = items.map((it, i) => `${i + 1}. ${it.title || ""}${it.snippet ? " — " + it.snippet : ""}`);
      return "（浏览器检索摘要）\n" + lines.join("\n");
    } catch (e) {
      console.warn("[NewPage] browser-search 不可用:", (e == null ? void 0 : e.message) || e);
      return "";
    }
  };
  const APP_LAUNCH_MAP = {
    blender: "C:\\Program Files\\Blender Foundation\\Blender 4.2\\blender.exe",
    酷狗音乐: "酷狗",
    酷狗: "C:\\Users\\Administrator\\Desktop\\不有clawd\\KGMusic\\KuGou.exe",
    kugou: "C:\\Users\\Administrator\\Desktop\\不有clawd\\KGMusic\\KuGou.exe"
  };
  const tryLaunchFromSpeech = (text) => {
    const t = (text || "").toLowerCase();
    if (/(放一首|放歌|播放音乐|唱一首|听歌|来一首)/.test(t) || /(播放|放)/.test(t) && /(歌|音乐|曲)/.test(t)) {
      try {
        const mc = window.mediaControl;
        if (mc) {
          mc({ action: "play" }).then((r) => {
            console.log("[NewPage] media play", r);
            addMsg("sys", r && r.ok ? "已发送播放（会先确保酷狗在跑）" : "播放失败：" + (r && r.error));
          });
          return "media";
        }
      } catch (e) {
        addMsg("sys", "播放失败：" + e.message);
      }
      return null;
    }
    if (!/(打开|启动|open|运行|帮我开)/.test(t))
      return null;
    const keys = Object.keys(APP_LAUNCH_MAP);
    let matchedKey = null;
    for (const key of keys) {
      if (t.includes(key.toLowerCase())) {
        matchedKey = key;
        break;
      }
    }
    if (!matchedKey) {
      if (/酷狗|kugou|kg音乐/.test(t))
        matchedKey = "酷狗";
      else if (/blender/.test(t))
        matchedKey = "blender";
    }
    if (!matchedKey)
      return null;
    const p = APP_LAUNCH_MAP[matchedKey] || matchedKey;
    try {
      const api = window.launchApp;
      if (!api) {
        addMsg("sys", "打开失败：launchApp 桥未就绪（需重启应用）");
        return null;
      }
      api(p).then((r) => {
        console.log("[NewPage] launch", matchedKey, r);
        if (r && r.ok)
          addMsg("sys", "已打开 " + matchedKey);
        else
          addMsg("sys", "打开失败：" + (r && r.error));
      }).catch((e) => addMsg("sys", "打开失败：" + e.message));
      return matchedKey;
    } catch (e) {
      addMsg("sys", "打开失败：" + e.message);
      return null;
    }
  };
  const onCallFinal = async (text) => {
    var _a;
    console.log("[NewPage] onCallFinal:", text);
    if (!isAutomationGoal(text))
      tryLaunchFromSpeech(text);
    if (replyingRef.current) {
      invalidateAITurn("user-barge-in");
      speechManager.interrupt();
      setCallPhase("listening");
    }
    const myGen = ++aiTurnRef.current;
    replyingRef.current = true;
    gCall.replying = true;
    setCallPhase("thinking");
    setCallStatus("思考中…");
    addMsg("me", text);
    try {
      let seeImage = null;
      let seeLabel = "";
      let searchBrief = "";
      let autoResult = null;
      try {
        const want = detectSeeIntent(text);
        if (want) {
          seeLabel = want === "screen" ? "屏幕截图" : "摄像头";
          seeImage = await aiAutoCapture(want);
          if (myGen !== aiTurnRef.current)
            return;
          addMsg("sys", (want === "screen" ? "🖥 " : "📷 ") + "已截取" + seeLabel + "，发给服务器识别…");
        } else if (isAutomationGoal(text)) {
          addMsg("sys", "🤖 自动化执行中…");
          autoResult = await runGuiAutomation(text);
          if (myGen !== aiTurnRef.current)
            return;
          addMsg("sys", autoResult.ok ? "✓ " + autoResult.result.slice(0, 200) : "⚠ " + autoResult.result);
        } else {
          const q = detectSearchIntent(text);
          if (q) {
            searchBrief = await browserSearchBrief(q);
            if (myGen !== aiTurnRef.current)
              return;
            if (searchBrief)
              addMsg("sys", "🔎 已用浏览器检索相关信息");
          }
        }
      } catch (e) {
        console.warn("[NewPage] 感知失败（不阻断对话）:", (e == null ? void 0 : e.message) || e);
      }
      if (myGen !== aiTurnRef.current) {
        console.log("[NewPage] 感知后轮次已失效，丢弃 gen=" + myGen);
        return;
      }
      let sendText = text;
      let reply = "";
      if (seeImage) {
        sendText = text + "\n（附上当前" + seeLabel + "，请直接看图回答）";
        reply = await companionAskAI(sendText, seeImage || void 0);
      } else if (autoResult && autoResult.ok) {
        reply = autoResult.result;
        try {
          const polished = await companionAskAI(
            "用户说：" + text + "\n自动化已完成，原始结果：" + autoResult.result + "\n请用一句口语转述给用户，不要重复步骤。"
          );
          if (polished && !polished.startsWith("（AI"))
            reply = polished;
        } catch {
        }
      } else if (autoResult && !autoResult.ok) {
        reply = await companionAskAI(text + "\n（自动化尝试失败：" + autoResult.result + "，请说明并给替代建议）");
      } else if (searchBrief) {
        sendText = text + "\n" + searchBrief + "\n（请结合以上检索摘要回答，简洁）";
        reply = await companionAskAI(sendText, void 0);
      } else {
        reply = await companionAskAI(text, void 0);
      }
      if (myGen !== aiTurnRef.current) {
        console.log("[NewPage] 丢弃迟到AI回复 gen=" + myGen + " 当前=" + aiTurnRef.current + " len=" + String(reply || "").length);
        return;
      }
      addMsg("ai", reply);
      setCallPhase("speaking");
      setCallStatus("说话中…");
      ttsPlayingRef.current = true;
      gCall.ttsPlaying = true;
      speechManager.pauseForTts();
      await companionSpeakTTS(reply);
      if (myGen === aiTurnRef.current && (micGateRef.current || gCall.micGate)) {
        speechManager.resumeAfterTts();
      }
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
  const lastScreenShotRef = reactExports.useRef(null);
  const lastCamShotRef = reactExports.useRef(null);
  const SCREEN_CACHE_MS = 3e4;
  const CAM_CACHE_MS = 6e4;
  const aiAutoCapture = async (what) => {
    const cache = what === "screen" ? lastScreenShotRef.current : lastCamShotRef.current;
    const ttl = what === "screen" ? SCREEN_CACHE_MS : CAM_CACHE_MS;
    if (cache && Date.now() - cache.at < ttl)
      return cache.dataUrl;
    const dataUrl = what === "screen" ? await seeScreen() : await seeCamera();
    if (what === "screen")
      lastScreenShotRef.current = { dataUrl, at: Date.now() };
    else
      lastCamShotRef.current = { dataUrl, at: Date.now() };
    return dataUrl;
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
      return cv.toDataURL("image/jpeg", 0.85);
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
    return r.dataUrl;
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
      // [可用性优先] 预览区始终显示 3D；桌宠窗口可另开，互不影响「用户必须能看见」
      /* @__PURE__ */ jsx(React.Suspense, { fallback: /* @__PURE__ */ jsxs("div", { style: { width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, color: "rgba(232,232,232,0.78)", fontSize: 13, letterSpacing: 2 }, children: [
        /* @__PURE__ */ jsx("div", { className: "rl-natural-spinner", style: { width: 40, height: 40, borderRadius: "50%", border: "3px solid rgba(255,255,255,0.12)", borderTopColor: "rgba(255,255,255,0.92)", borderRightColor: "rgba(255,255,255,0.35)", animation: "rl-spin 0.85s cubic-bezier(0.45,0.05,0.35,1) infinite" } }),
        /* @__PURE__ */ jsx("div", { children: "正在加载 3D 引擎…" })
      ] }), children: /* @__PURE__ */ jsx(
        BabylonModelViewer,
        {
          modelData: currentModel,
          physicsEnabled,
          windEnabled,
          desktopPetMode: false
        },
        `model-${currentModel.name}`
      ) })
    ) : modelLoading ? (
      // [v165] 启动/加载中：自然转圈，避免黑屏干等
      /* @__PURE__ */ jsxs(Box, { sx: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 1.5,
        width: "100%",
        height: "100%",
        color: "rgba(232,232,232,0.85)"
      }, children: [
        /* @__PURE__ */ jsx(Box, { sx: {
          width: 40,
          height: 40,
          borderRadius: "50%",
          border: "3px solid rgba(255,255,255,0.12)",
          borderTopColor: "rgba(255,255,255,0.92)",
          borderRightColor: "rgba(255,255,255,0.35)",
          animation: "rl-spin 0.85s cubic-bezier(0.45,0.05,0.35,1) infinite",
          "@keyframes rl-spin": { to: { transform: "rotate(360deg)" } },
          boxShadow: "0 0 24px rgba(255,255,255,0.06)"
        } }),
        /* @__PURE__ */ jsxs(Typography, { variant: "body2", sx: { letterSpacing: 2, opacity: 0.85, animation: "rl-breathe 1.6s ease-in-out infinite", "@keyframes rl-breathe": { "0%,100%": { opacity: 0.55 }, "50%": { opacity: 0.95 } } }, children: [
          "正在加载模型… ",
          Math.round(loadingProgress),
          "%"
        ] })
      ] })
    ) : (
      // 未导入且未在加载：旋转立方体占位场景（CSS 3D 实现，无需加载 Babylon.js）
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
      display: callUI === "hidden" ? "none" : "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 0.75
      // 6px：间隔小，但能分辨两层
    }, children: [
      /* @__PURE__ */ jsx(Box, { sx: {
        width: 432,
        // 288 × 1.5
        height: 120,
        // 6 行 × 20px
        boxSizing: "border-box",
        px: 1.5,
        py: 0.75,
        borderRadius: 2,
        bgcolor: "transparent",
        border: "none",
        boxShadow: "none",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end"
      }, children: chatLog.length === 0 ? /* @__PURE__ */ jsx(Typography, { sx: { fontSize: 13, lineHeight: "20px", color: "#ffffff", textAlign: "center", textShadow: "0 1px 3px rgba(0,0,0,0.75)" }, children: "通话记录…（我 / AI）" }) : chatLog.slice(-6).map((m, i) => /* @__PURE__ */ jsx(Typography, { sx: {
        fontSize: 13,
        lineHeight: "20px",
        fontWeight: m.cls === "me" ? 700 : 600,
        color: "#ffffff",
        textShadow: "0 1px 3px rgba(0,0,0,0.85)",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis"
      }, children: (m.cls === "me" ? "我：" : m.cls === "ai" ? "AI：" : "") + m.text }, i)) }),
      /* @__PURE__ */ jsxs(Box, { sx: {
        minWidth: 288,
        alignItems: "center",
        gap: 1.5,
        px: 2.5,
        py: 1.2,
        borderRadius: 26,
        bgcolor: "rgba(224, 242, 241, 0.35)",
        border: "1px solid rgba(0, 137, 123, 0.45)",
        boxShadow: "0 8px 28px rgba(0,0,0,0.22)",
        display: "flex",
        backdropFilter: "blur(6px)"
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
        }, sx: { color: micOn ? "#00796b" : "#bdbdbd" }, title: micOn ? "麦克风开启中（点击关闭）" : "麦克风已关（点击开启）", children: micOn ? /* @__PURE__ */ jsx(default_1$8, { fontSize: "small" }) : /* @__PURE__ */ jsx(default_1$9, { fontSize: "small" }) }),
        /* @__PURE__ */ jsx(Button, { size: "small", variant: "contained", onClick: () => cleanupCall({ userHangup: true, reason: "user-button" }), sx: { bgcolor: "#e53935", "&:hover": { bgcolor: "#c62828" }, textTransform: "none", px: 1.5, minWidth: 0 }, children: "挂断" })
      ] })
    ] }),
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
        children: /* @__PURE__ */ jsx(default_1$a, {})
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
              /* @__PURE__ */ jsx(default_1$a, { fontSize: "small" }),
              /* @__PURE__ */ jsx(Typography, { variant: "subtitle2", sx: { fontWeight: "bold", letterSpacing: 0.5 }, children: "控制台" })
            ] }),
            /* @__PURE__ */ jsx(
              IconButton,
              {
                "aria-label": "收起控制台",
                onClick: () => setConsoleOpen(false),
                size: "small",
                sx: { color: "#ffffff", p: 0.5 },
                children: /* @__PURE__ */ jsx(default_1$b, { fontSize: "small", sx: { transform: "rotate(180deg)" } })
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
                startIcon: /* @__PURE__ */ jsx(default_1$c, {}),
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
                startIcon: modelLoading ? /* @__PURE__ */ jsx(CircularProgress, { size: 16, color: "inherit" }) : /* @__PURE__ */ jsx(default_1$d, {}),
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
            /* @__PURE__ */ jsx(
              Button,
              {
                variant: "contained",
                fullWidth: true,
                startIcon: /* @__PURE__ */ jsx(default_1$e, {}),
                onClick: () => {
                  if (callState === "incall") {
                    cleanupCall({ userHangup: true, reason: "user-panel" });
                  } else {
                    startCall();
                  }
                },
                sx: {
                  justifyContent: "flex-start",
                  bgcolor: callState === "incall" ? "#e53935" : "#00897b",
                  color: "#fff",
                  textTransform: "none",
                  fontWeight: "bold",
                  py: 1.1,
                  "&:hover": { bgcolor: callState === "incall" ? "#c62828" : "#00695c" }
                },
                children: callState === "incall" ? "挂断通话" : "语音通话"
              }
            ),
            /* @__PURE__ */ jsxs(Accordion, { elevation: 0, defaultExpanded: true, sx: { border: "1px solid", borderColor: "divider", borderRadius: 1, mb: 1 }, children: [
              /* @__PURE__ */ jsx(AccordionSummary, { children: /* @__PURE__ */ jsxs(Box, { sx: { display: "flex", alignItems: "center", width: "100%", minWidth: 0 }, children: [
                /* @__PURE__ */ jsx(Typography, { variant: "body2", sx: { fontWeight: "bold", flexGrow: 1 }, children: "默认选项" }),
                /* @__PURE__ */ jsx(
                  IconButton,
                  {
                    size: "small",
                    "aria-label": "设置",
                    onClick: (e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      try {
                        sessionStorage.setItem("settingsFrom", window.location.pathname || "/");
                      } catch {
                      }
                      navigate("/settings");
                    },
                    sx: { p: 0.35, mr: 0.5, color: "text.secondary", "&:hover": { color: "#1976d2", bgcolor: "action.hover" } },
                    children: /* @__PURE__ */ jsx(default_1$f, { fontSize: "small" })
                  }
                ),
                /* @__PURE__ */ jsx(default_1$4, { fontSize: "small", sx: { color: "text.secondary" } })
              ] }) }),
              /* @__PURE__ */ jsxs(AccordionDetails, { sx: { pt: 1, px: 1, pb: 1 }, children: [
                /* @__PURE__ */ jsx(Box, { sx: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0.5 }, children: [
                  { label: "风力效果", icon: /* @__PURE__ */ jsx(default_1$g, { fontSize: "small" }), on: windEnabled && physicsEnabled, disabled: !physicsEnabled, toggle: () => handleWindToggle(!(windEnabled && physicsEnabled)) },
                  { label: "物理模组", icon: /* @__PURE__ */ jsx(default_1$h, { fontSize: "small" }), on: physicsEnabled, disabled: false, toggle: () => handlePhysicsToggle(!physicsEnabled) },
                  { label: "启动问候", icon: /* @__PURE__ */ jsx(default_1$i, { fontSize: "small" }), on: !greetDisabled, disabled: false, toggle: () => {
                    const n = !greetDisabled;
                    setGreetDisabled(n);
                    try {
                      localStorage.setItem("ruanlinyun_greet_disabled", String(n));
                    } catch {
                    }
                  } },
                  { label: "桌面宠物", icon: /* @__PURE__ */ jsx(default_1$j, { fontSize: "small" }), on: desktopPetEnabled, disabled: false, toggle: () => handleDesktopPetToggle(!desktopPetEnabled) },
                  { label: "摄像头", icon: /* @__PURE__ */ jsx(default_1$k, { fontSize: "small" }), on: flags.cam, disabled: false, toggle: () => toggleFlag("cam") },
                  { label: "屏幕识别", icon: /* @__PURE__ */ jsx(default_1$l, { fontSize: "small" }), on: flags.screen, disabled: false, toggle: () => toggleFlag("screen") }
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
                    /* @__PURE__ */ jsx(default_1$m, { fontSize: "small", sx: { color: wallpaperEnabled ? "#1976d2" : "#1a1a1a" } }),
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
                    startIcon: /* @__PURE__ */ jsx(default_1$n, {}),
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
                    /* @__PURE__ */ jsx(default_1$n, { fontSize: "small", sx: { color: defaultModelEnabled ? "#00897b" : "#9e9e9e" } }),
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
  default: NewPage,
  visionImagePart
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
  useNavigate as a,
  apiConfigService as b,
  Route as c,
  useLocation as u
};
