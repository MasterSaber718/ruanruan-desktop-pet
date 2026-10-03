var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
import { _ as __vitePreload } from "./babylon-72e1e591.js";
import { a as reactExports, c as React, u as useTheme, b as jsxs, j as jsx, B as Box, d as default_1, T as Typography, e as default_1$1, f as default_1$2, A as Avatar, g as default_1$3, M as Menu, h as MenuItem, I as IconButton, i as default_1$4, k as default_1$5, C as CircularProgress, l as default_1$6, m as default_1$7, n as TextField, o as default_1$8, S as Snackbar, p as default_1$9, q as default_1$a, s as default_1$b, t as default_1$c, v as default_1$d, w as Container, x as default_1$e, P as Paper, D as Divider, y as FormControl, z as InputLabel, E as Select, G as FormControlLabel, H as Switch, J as Button, K as default_1$f, L as default_1$g, N as default_1$h, O as Alert, Q as Chip, U as Accordion, V as AccordionSummary, W as default_1$i, X as AccordionDetails, R as React$1, Y as createTheme, Z as ThemeProvider, _ as CssBaseline, F as Fragment } from "./mui-096207bc.js";
import { P as ProtocolConverter, M as MessageRole } from "./ai-3c0f0023.js";
import { u as useMobileLayout, i as isNativePlatform } from "./index-12ae994a.js";
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
const startTransitionImpl = React[START_TRANSITION];
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
const _DeviceOptimizer = class _DeviceOptimizer {
  constructor() {
    __publicField(this, "deviceCapabilities");
    __publicField(this, "optimizationLevel", "high");
    __publicField(this, "textureCache", /* @__PURE__ */ new Map());
    __publicField(this, "MAX_CACHE_SIZE", 100);
    this.deviceCapabilities = this.detectCapabilities();
    const mobile = this.isMobileDevice();
    const { cores } = this.deviceCapabilities.cpu;
    const mem = this.deviceCapabilities.memory.total;
    if (mobile) {
      this.optimizationLevel = cores <= 4 || mem <= 4 ? "low" : "medium";
    } else {
      this.optimizationLevel = this.deviceCapabilities.gpu.hasDedicatedGPU ? "high" : "medium";
    }
    console.log(`[设备优化器] 画质等级: ${this.optimizationLevel.toUpperCase()} (移动端=${mobile}, 核心=${cores}, 内存=${mem}GB)`);
  }
  /**
   * [修复 卡顿] 是否运行在移动设备上。
   * 原实现无视设备差异，一律返回桌面级"ULTRA"参数（4K 阴影贴图 / 8 光源 / 抗锯齿全开），
   * 这些参数放到手机 GPU 上必然掉帧甚至直接渲染失败，是移动端卡顿的系统性根因。
   */
  isMobileDevice() {
    if (typeof window === "undefined")
      return false;
    const w = window;
    if (w.Capacitor?.isNativePlatform?.())
      return true;
    const p = w.Capacitor?.getPlatform?.();
    if (p === "android" || p === "ios")
      return true;
    return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  }
  static getInstance() {
    if (!_DeviceOptimizer.instance) {
      _DeviceOptimizer.instance = new _DeviceOptimizer();
    }
    return _DeviceOptimizer.instance;
  }
  detectCapabilities() {
    const capabilities = {
      memory: {
        total: navigator.deviceMemory || 8,
        available: 2
      },
      gpu: {
        isWebGL2Supported: false,
        isWebGLSupported: false,
        hasDedicatedGPU: false,
        renderer: "Unknown"
      },
      cpu: {
        cores: navigator.hardwareConcurrency || 4,
        basePerformance: 1
      }
    };
    try {
      const canvas = document.createElement("canvas");
      const gl2 = canvas.getContext("webgl2");
      const gl = gl2 || canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      capabilities.gpu.isWebGL2Supported = !!gl2;
      capabilities.gpu.isWebGLSupported = !!gl;
      if (gl) {
        const webgl = gl;
        const debugInfo = webgl.getExtension("WEBGL_debug_renderer_info");
        if (debugInfo) {
          const renderer = webgl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || "Unknown";
          capabilities.gpu.renderer = renderer;
          const lowerRenderer = renderer.toLowerCase();
          const isIntelIntegrated = lowerRenderer.includes("intel") && !lowerRenderer.includes("iris");
          const isAmdIntegrated = lowerRenderer.includes("amd") && (lowerRenderer.includes("integrated") || lowerRenderer.includes("vega") || lowerRenderer.includes("hd graphics") || lowerRenderer.includes("apu"));
          const isNvidia = lowerRenderer.includes("nvidia") || lowerRenderer.includes("geforce") || lowerRenderer.includes("quadro");
          const isAmdDedicated = lowerRenderer.includes("amd") && lowerRenderer.includes("rx");
          const isIntelDedicated = lowerRenderer.includes("iris");
          capabilities.gpu.hasDedicatedGPU = isNvidia || isAmdDedicated || isIntelDedicated || !isIntelIntegrated && !isAmdIntegrated;
        }
      }
      if (gl) {
        const loseCtx = gl.getExtension?.("WEBGL_lose_context");
        loseCtx?.loseContext?.();
      }
      canvas.width = 0;
      canvas.height = 0;
    } catch (e) {
      console.warn("[DeviceOptimizer] GPU检测失败:", e);
    }
    try {
      const testStartTime = Date.now();
      for (let i = 0; i < 1e5; i++) {
        Math.sqrt(i);
      }
      const testDuration = Date.now() - testStartTime;
      capabilities.cpu.basePerformance = Math.max(0.5, Math.min(2, 50 / testDuration));
    } catch (e) {
      console.warn("[设备优化器] CPU性能检测失败:", e);
    }
    return capabilities;
  }
  getDeviceCapabilities() {
    return this.deviceCapabilities;
  }
  getOptimizationLevel() {
    return this.optimizationLevel;
  }
  // 最高画质设置 - 无限制
  get3DRenderSettings() {
    const level = this.optimizationLevel;
    const dpr = window.devicePixelRatio || 1;
    if (level === "low") {
      return {
        useWebGL2: this.deviceCapabilities.gpu.isWebGL2Supported,
        antialiasing: false,
        // 低端机抗锯齿开销高、收益低
        shadows: false,
        // 阴影是最贵的一项，低端机直接关闭
        textureResolution: "low",
        maxLights: 2,
        shadowMapSize: 512,
        pixelRatio: 1
        // 不做超采样，按物理像素 1:1
      };
    }
    if (level === "medium") {
      return {
        useWebGL2: this.deviceCapabilities.gpu.isWebGL2Supported,
        antialiasing: false,
        shadows: true,
        textureResolution: "medium",
        maxLights: 4,
        shadowMapSize: 1024,
        pixelRatio: Math.min(dpr, 1.5)
      };
    }
    return {
      useWebGL2: this.deviceCapabilities.gpu.isWebGL2Supported,
      antialiasing: true,
      shadows: true,
      textureResolution: "high",
      maxLights: 8,
      shadowMapSize: 2048,
      // 桌面端 2048 已足够，4096 收益极低而显存翻 4 倍
      pixelRatio: Math.min(dpr, 2)
    };
  }
  // 最大内存容量 - 无限制
  getMemorySettings() {
    const level = this.optimizationLevel;
    if (level === "low") {
      return { maxHistoryLength: 100, maxWorkingMemoryItems: 20, cleanupIntervalMinutes: 10, maxCacheSize: 20 };
    }
    if (level === "medium") {
      return { maxHistoryLength: 200, maxWorkingMemoryItems: 50, cleanupIntervalMinutes: 30, maxCacheSize: 50 };
    }
    return {
      maxHistoryLength: 500,
      // 更大的历史记录
      maxWorkingMemoryItems: 100,
      // 更多工作内存
      cleanupIntervalMinutes: 60,
      // 更长的清理间隔
      maxCacheSize: this.MAX_CACHE_SIZE
    };
  }
  // 最高性能设置 - 无限制
  getPerformanceSettings() {
    const level = this.optimizationLevel;
    if (level === "low") {
      return { enableAnimations: false, enableRealTimeUpdates: false, maxConcurrentRequests: 2, debounceDelayMs: 33, targetFPS: 30 };
    }
    if (level === "medium") {
      return { enableAnimations: true, enableRealTimeUpdates: true, maxConcurrentRequests: 4, debounceDelayMs: 16, targetFPS: 60 };
    }
    return {
      enableAnimations: true,
      // 始终开启动画
      enableRealTimeUpdates: true,
      // 始终开启实时更新
      maxConcurrentRequests: 16,
      // 更高的并发
      debounceDelayMs: 16,
      // 60FPS对应的延迟
      targetFPS: 60
      // 目标60帧
    };
  }
  // 智能纹理缓存 - 真正的优化
  cacheTexture(key, texture) {
    if (this.textureCache.size >= this.MAX_CACHE_SIZE) {
      const firstKey = this.textureCache.keys().next().value;
      if (firstKey) {
        this.textureCache.delete(firstKey);
      }
    }
    this.textureCache.set(key, texture);
  }
  getCachedTexture(key) {
    return this.textureCache.get(key);
  }
  clearTextureCache() {
    this.textureCache.clear();
  }
  applyOptimizations() {
    const memorySettings = this.getMemorySettings();
    const performanceSettings = this.getPerformanceSettings();
    const isDev = typeof process !== "undefined" && process.env?.NODE_ENV === "development";
    if ((window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") && isDev) {
      window.__deviceOptimizer = {
        capabilities: this.deviceCapabilities,
        optimizationLevel: this.optimizationLevel,
        settings: {
          memory: memorySettings,
          performance: performanceSettings,
          "3d": this.get3DRenderSettings()
        },
        message: "ULTRA画质模式 - 所有特效已开启"
      };
    }
  }
};
__publicField(_DeviceOptimizer, "instance");
let DeviceOptimizer = _DeviceOptimizer;
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
        this.customProviders = list.filter((p) => !!p?.id && !!p?.name && !!p?.baseUrl);
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
        baseUrl: s?.baseUrl || p.baseUrl,
        model: s?.model || p.model,
        apiKey: this.decryptedKeys.get(p.id) ?? "",
        enabled: s?.enabled ?? false
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
        baseUrl: s?.baseUrl || p.baseUrl,
        model: s?.model || p.model,
        apiKeyMasked: masked,
        decryptFailed: this.decryptFailed.has(p.id),
        enabled: s?.enabled ?? false
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
    const salt = existing?.salt || this.generateSalt();
    if (partial.enabled === false) {
      this.configs.set(id, {
        baseUrl: partial.baseUrl ?? existing?.baseUrl ?? this.preset(id).baseUrl,
        model: partial.model ?? existing?.model ?? this.preset(id).model,
        salt,
        encryptedKey: existing?.encryptedKey ?? "",
        encryptedMeta: existing?.encryptedMeta ?? "",
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
        baseUrl: partial.baseUrl ?? existing?.baseUrl ?? this.preset(id).baseUrl,
        model: partial.model ?? existing?.model ?? this.preset(id).model,
        salt,
        encryptedKey: ek,
        encryptedMeta: existing?.encryptedMeta ?? "",
        enabled: partial.enabled ?? existing?.enabled ?? false,
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
        encryptedKey: existingData?.encryptedKey ?? "",
        encryptedMeta: existingData?.encryptedMeta ?? "",
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
      const all = this.getAll();
      const found = all.find((c) => c.id === activeId);
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
function WindowControls() {
  const [isMaximized, setIsMaximized] = reactExports.useState(false);
  const location = useLocation();
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === "dark";
  const onPreview = location.pathname === "/" || location.pathname === "/new-page";
  reactExports.useEffect(() => {
    const wc2 = window.windowControls;
    if (!wc2)
      return;
    wc2.isMaximized?.().then((m) => setIsMaximized(m)).catch(() => {
    });
    const cleanup = wc2.onMaximizeChange?.((m) => setIsMaximized(m));
    return () => {
      cleanup?.();
    };
  }, []);
  if (location.pathname === "/pet")
    return null;
  const wc = window.windowControls;
  const iconColor = isDarkMode || onPreview ? "#ffffff" : "#000000";
  const hoverBg = isDarkMode || onPreview ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.12)";
  const btnBase = {
    width: 44,
    height: 32,
    border: "none",
    background: "transparent",
    color: iconColor,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background 0.15s",
    ...{ WebkitAppRegion: "no-drag" }
  };
  return /* @__PURE__ */ jsxs(
    "div",
    {
      style: {
        position: "fixed",
        top: 0,
        right: 0,
        zIndex: 99999,
        display: "flex",
        height: 36,
        background: "transparent",
        ...{ WebkitAppRegion: "no-drag" },
        pointerEvents: "auto"
      },
      children: [
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => wc?.minimize?.(),
            style: btnBase,
            title: "最小化",
            onMouseEnter: (e) => {
              e.currentTarget.style.background = hoverBg;
            },
            onMouseLeave: (e) => {
              e.currentTarget.style.background = "transparent";
            },
            children: /* @__PURE__ */ jsx("svg", { width: "10", height: "10", viewBox: "0 0 10 10", children: /* @__PURE__ */ jsx("rect", { x: "0", y: "4.5", width: "10", height: "1", fill: "currentColor" }) })
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => wc?.toggleMaximize?.(),
            style: btnBase,
            title: isMaximized ? "退出全屏" : "全屏",
            onMouseEnter: (e) => {
              e.currentTarget.style.background = hoverBg;
            },
            onMouseLeave: (e) => {
              e.currentTarget.style.background = "transparent";
            },
            children: isMaximized ? /* @__PURE__ */ jsxs("svg", { width: "11", height: "11", viewBox: "0 0 11 11", children: [
              /* @__PURE__ */ jsx("rect", { x: "2", y: "0", width: "8", height: "8", fill: "none", stroke: "currentColor", strokeWidth: "1" }),
              /* @__PURE__ */ jsx("rect", { x: "0", y: "2", width: "8", height: "8", fill: "none", stroke: "currentColor", strokeWidth: "1" }),
              /* @__PURE__ */ jsx("rect", { x: "0", y: "2", width: "3", height: "1", fill: "currentColor" }),
              /* @__PURE__ */ jsx("rect", { x: "5", y: "9", width: "3", height: "1", fill: "currentColor" })
            ] }) : /* @__PURE__ */ jsx("svg", { width: "10", height: "10", viewBox: "0 0 10 10", children: /* @__PURE__ */ jsx("rect", { x: "0.5", y: "0.5", width: "9", height: "9", fill: "none", stroke: "currentColor", strokeWidth: "1" }) })
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => wc?.close?.(),
            style: { ...btnBase, width: 44 },
            title: "关闭",
            onMouseEnter: (e) => {
              e.currentTarget.style.background = "#e81123";
              e.currentTarget.style.color = "#fff";
            },
            onMouseLeave: (e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = iconColor;
            },
            children: /* @__PURE__ */ jsx("svg", { width: "10", height: "10", viewBox: "0 0 10 10", children: /* @__PURE__ */ jsx("path", { d: "M0,0 L10,10 M10,0 L0,10", stroke: "currentColor", strokeWidth: "1.2" }) })
          }
        )
      ]
    }
  );
}
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
        onComplete?.();
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
const HOT_WORDS = [
  "阮琳云",
  "琳云",
  "数字人",
  "智能助手",
  "语音助手",
  "桌面助手",
  "虚拟人",
  "你好",
  "请问",
  "谢谢",
  "再见",
  "帮助",
  "打开",
  "关闭",
  "播放",
  "停止",
  "暂停",
  "继续",
  "开始",
  "结束",
  "今天",
  "明天",
  "昨天",
  "天气",
  "几点",
  "时间",
  "日期",
  "星期",
  "什么",
  "为什么",
  "怎么样",
  "怎么",
  "多少",
  "哪里",
  "谁",
  "音乐",
  "歌曲",
  "视频",
  "图片",
  "照片",
  "文件",
  "文档",
  "邮件",
  "短信",
  "电话",
  "聊天",
  "对话",
  "消息",
  "通知",
  "提醒",
  "闹钟",
  "定时",
  "搜索",
  "查询",
  "翻译",
  "计算",
  "保存",
  "删除",
  "取消",
  "确认",
  "发送",
  "设置",
  "语音",
  "文字",
  "模型",
  "角色",
  "任务",
  "主页",
  "返回",
  "上一个",
  "下一个",
  "上一页",
  "下一页",
  "通话",
  "打电话",
  "接电话",
  "挂电话",
  "挂断",
  "接通",
  "静音",
  "免提",
  "扬声器",
  "听筒",
  "关机",
  "重启",
  "注销",
  "锁屏",
  "休眠",
  "睡眠",
  "音量",
  "调高",
  "调低",
  "截图",
  "截屏",
  "回收站",
  "垃圾桶",
  "壁纸",
  "分辨率",
  "终端",
  "命令行",
  "记事本",
  "计算器",
  "画图",
  "浏览器",
  "清理垃圾",
  "清理缓存",
  "清空回收站",
  "倒计时",
  "定时器",
  "计时",
  "分钟",
  "小时",
  "秒钟",
  "几号",
  "星期几",
  "礼拜",
  "新闻",
  "资讯",
  "股票",
  "基金",
  "汇率",
  "价格",
  "热点",
  "头条",
  "微信",
  "邮箱"
];
const HOMOPHONE_RULES = [
  ["软林云|阮林云|阮玲云|阮琳芸|阮灵云|软琳云|阮淋云|阮林芸|阮琳韵|阮凌芸|阮凌韵|阮琳允|阮临云|阮菱云|阮绫云|软淋云", "阮琳云"],
  ["(?<![\\u4e00-\\u9fa5])(?:林云|玲云|淋云)(?![\\u4e00-\\u9fa5])", "琳云"],
  ["只能助手|智能住手|只能住手|智囊助手", "智能助手"],
  ["数字刃|数字认|数值人", "数字人"],
  ["雨音", "语音"],
  ["摸型|磨型", "模型"],
  ["认务", "任务"],
  ["在见", "再见"],
  ["在次", "再次"],
  ["情问", "请问"],
  ["金天", "今天"],
  ["名天", "明天"],
  ["天起", "天气"],
  ["什莫", "什么"],
  ["为什莫|喂什么", "为什么"],
  ["怎莫", "怎么"],
  ["阴乐|因乐", "音乐"],
  ["帮住|邦助", "帮助"],
  ["时坚", "时间"],
  ["去消", "取消"],
  ["记算", "计算"],
  ["收索|搜所", "搜索"],
  ["麦克锋|麦可风|麦客风", "麦克风"]
];
const COMPILED_RULES = HOMOPHONE_RULES.map(
  ([pattern, replacement]) => [new RegExp(pattern, "g"), replacement]
);
function applySpeechFix(text) {
  if (!text)
    return "";
  let fixed = text.trim();
  for (const [re, replacement] of COMPILED_RULES) {
    fixed = fixed.replace(re, replacement);
  }
  fixed = fixed.replace(/([，。！？；：、,.;!?])\1+/g, "$1");
  fixed = fixed.replace(/([\u4e00-\u9fa5])\s+([\u4e00-\u9fa5])/g, "$1$2");
  fixed = fixed.replace(/ {2,}/g, " ");
  return fixed;
}
function buildGrammarString() {
  return "#JSGF V1.0; grammar commands; public <command> = " + HOT_WORDS.join(" | ") + " ;";
}
function pickBestTranscript(result) {
  let best = "";
  let bestConf = -1;
  if (!result || typeof result.length !== "number")
    return "";
  for (let j = 0; j < result.length; j++) {
    const alt = result[j];
    if (!alt)
      continue;
    const conf = typeof alt.confidence === "number" ? alt.confidence : 0;
    if (conf > bestConf) {
      bestConf = conf;
      best = alt.transcript ?? "";
    }
  }
  return best || (result[0]?.transcript ?? "");
}
const aiResponseServiceRef = { current: null };
const ALLOWED_IMAGE_EXT = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".svg"];
const ALLOWED_DOC_EXT = [
  ".txt",
  ".md",
  ".rtf",
  ".doc",
  ".docx",
  ".pdf",
  ".xls",
  ".xlsx",
  ".csv",
  ".et",
  ".ppt",
  ".pptx",
  ".dps",
  ".wps",
  ".odt",
  ".pages"
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
  ".bat",
  ".ps1",
  ".exe",
  ".cmd",
  ".vbs"
];
const MODEL_OPTIONS = [
  { label: "GPT-4o (云端)", value: "gpt-4o" },
  { label: "GPT-3.5-Turbo (云端)", value: "gpt-3.5-turbo" },
  { label: "Claude-3.5 (云端)", value: "claude-3-5-sonnet" },
  { label: "DeepSeek (云端)", value: "deepseek" }
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
    return /* @__PURE__ */ jsx(default_1$9, {});
  if (ext === ".xls" || ext === ".xlsx" || ext === ".csv" || ext === ".et")
    return /* @__PURE__ */ jsx(default_1$a, {});
  if (ext === ".ppt" || ext === ".pptx" || ext === ".dps")
    return /* @__PURE__ */ jsx(default_1$b, {});
  if (ext === ".txt" || ext === ".md" || ext === ".rtf")
    return /* @__PURE__ */ jsx(default_1$c, {});
  if (ext === ".doc" || ext === ".docx" || ext === ".wps" || ext === ".odt")
    return /* @__PURE__ */ jsx(default_1$c, {});
  return /* @__PURE__ */ jsx(default_1$d, {});
};
function MobileLayout({ children }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = reactExports.useState("chat");
  return /* @__PURE__ */ jsxs(Box, { sx: {
    display: "flex",
    flexDirection: "column",
    height: "100dvh",
    overflow: "hidden"
  }, children: [
    /* @__PURE__ */ jsx(Box, { sx: {
      flex: 1,
      overflow: "hidden",
      pb: "56px"
      /* 底部导航栏高度 */
    }, children }),
    /* @__PURE__ */ jsxs(Box, { className: "mobile-bottom-nav", children: [
      /* @__PURE__ */ jsxs(
        Box,
        {
          className: `mobile-bottom-nav-item ${activeTab === "chat" ? "active" : ""}`,
          onClick: () => {
            setActiveTab("chat");
            navigate("/");
          },
          children: [
            /* @__PURE__ */ jsx(default_1, { fontSize: "small" }),
            /* @__PURE__ */ jsx(Typography, { variant: "caption", sx: { fontSize: "0.65rem" }, children: "聊天" })
          ]
        }
      ),
      /* @__PURE__ */ jsxs(
        Box,
        {
          className: `mobile-bottom-nav-item ${activeTab === "pet" ? "active" : ""}`,
          onClick: () => {
            setActiveTab("pet");
            navigate("/pet");
          },
          children: [
            /* @__PURE__ */ jsx(default_1$1, { fontSize: "small" }),
            /* @__PURE__ */ jsx(Typography, { variant: "caption", sx: { fontSize: "0.65rem" }, children: "桌宠" })
          ]
        }
      ),
      /* @__PURE__ */ jsxs(
        Box,
        {
          className: `mobile-bottom-nav-item ${activeTab === "settings" ? "active" : ""}`,
          onClick: () => {
            setActiveTab("settings");
            navigate("/settings");
          },
          children: [
            /* @__PURE__ */ jsx(default_1$2, { fontSize: "small" }),
            /* @__PURE__ */ jsx(Typography, { variant: "caption", sx: { fontSize: "0.65rem" }, children: "设置" })
          ]
        }
      )
    ] })
  ] });
}
const MAX_MESSAGES = 100;
const MAX_IMAGE_DIMENSION = 1280;
async function compressImageToDataUrl(file) {
  const objectUrl = URL.createObjectURL(file);
  let bitmap = null;
  let canvas = null;
  try {
    bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(width, height));
    const targetW = Math.max(1, Math.round(width * scale));
    const targetH = Math.max(1, Math.round(height * scale));
    canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx)
      throw new Error("无法获取 2D 上下文");
    ctx.drawImage(bitmap, 0, 0, targetW, targetH);
    return canvas.toDataURL("image/jpeg", 0.8);
  } catch {
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  } finally {
    bitmap?.close?.();
    URL.revokeObjectURL(objectUrl);
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
      canvas = null;
    }
  }
}
function appendMessage(prev, msg) {
  const next = [...prev, msg];
  return next.length > MAX_MESSAGES ? next.slice(next.length - MAX_MESSAGES) : next;
}
function MobileChat() {
  const [messages, setMessages] = reactExports.useState([
    {
      id: "1",
      text: "主人好！我是阮琳云，有什么可以帮助您的吗？",
      sender: "ai",
      time: (/* @__PURE__ */ new Date()).toLocaleTimeString()
    }
  ]);
  const [inputText, setInputText] = reactExports.useState("");
  const [isLoading, setIsLoading] = reactExports.useState(false);
  const [selectedModel, setSelectedModel] = reactExports.useState(MODEL_OPTIONS[0].value);
  const [modelMenuAnchor, setModelMenuAnchor] = reactExports.useState(null);
  const [snackMsg, setSnackMsg] = reactExports.useState("");
  const [previewImage, setPreviewImage] = reactExports.useState(null);
  const messagesEndRef = reactExports.useRef(null);
  const recognitionRef = reactExports.useRef(null);
  const mountedRef = reactExports.useRef(true);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  reactExports.useEffect(() => {
    scrollToBottom();
  }, [messages]);
  reactExports.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      const rec = recognitionRef.current;
      if (rec) {
        try {
          rec.onresult = null;
          rec.onerror = null;
          rec.onend = null;
          rec.abort?.();
        } catch {
        }
        recognitionRef.current = null;
      }
    };
  }, []);
  const handleFileUpload = () => {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.multiple = true;
    fileInput.accept = [...ALLOWED_IMAGE_EXT, ...ALLOWED_DOC_EXT].join(",");
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
        const names = rejectedFiles.map((f) => f.name).join("、");
        setMessages((prev) => appendMessage(prev, {
          id: (Date.now() + 0.5).toString(),
          text: `⚠️ 以下文件被拒绝上传（仅支持图片和工作类文档，禁止上传脚本或可执行文件）：
${names}`,
          sender: "ai",
          time: (/* @__PURE__ */ new Date()).toLocaleTimeString()
        }));
      }
      for (const imgFile of acceptedImages) {
        try {
          const dataUrl = await compressImageToDataUrl(imgFile);
          if (!mountedRef.current)
            return;
          setMessages((prev) => appendMessage(prev, {
            id: `${Date.now()}_${imgFile.name}`,
            text: "",
            sender: "user",
            time: (/* @__PURE__ */ new Date()).toLocaleTimeString(),
            attachment: { kind: "image", fileName: imgFile.name, fileSize: imgFile.size, dataUrl, mimeType: imgFile.type }
          }));
        } catch (err) {
          console.error("图片读取失败:", imgFile.name, err);
        }
      }
      for (const docFile of acceptedDocs) {
        if (!mountedRef.current)
          return;
        setMessages((prev) => appendMessage(prev, {
          id: `${Date.now()}_${docFile.name}`,
          text: "",
          sender: "user",
          time: (/* @__PURE__ */ new Date()).toLocaleTimeString(),
          attachment: { kind: "document", fileName: docFile.name, fileSize: docFile.size, mimeType: docFile.type }
        }));
      }
    };
    fileInput.click();
  };
  const handleVoiceInput = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setSnackMsg("当前环境不支持语音输入");
      return;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort?.();
      } catch {
      }
      recognitionRef.current = null;
    }
    try {
      const rec = new SR();
      recognitionRef.current = rec;
      rec.lang = "zh-CN";
      rec.interimResults = false;
      rec.maxAlternatives = 3;
      try {
        const SGL = window.SpeechGrammarList || window.webkitSpeechGrammarList;
        if (SGL) {
          const gl = new SGL();
          gl.addFromString(buildGrammarString(), 0.5);
          rec.grammars = gl;
        }
      } catch {
      }
      rec.onresult = (ev) => {
        if (!mountedRef.current)
          return;
        const transcript = applySpeechFix(pickBestTranscript(ev.results[0]));
        if (!transcript)
          return;
        setInputText((prev) => (prev ? prev + " " : "") + transcript);
      };
      rec.onerror = () => {
        if (!mountedRef.current)
          return;
        setSnackMsg("语音识别失败，请重试");
      };
      rec.onend = () => {
        if (recognitionRef.current === rec)
          recognitionRef.current = null;
      };
      rec.start();
    } catch {
      recognitionRef.current = null;
      setSnackMsg("无法启动语音识别");
    }
  };
  const handleCopy = (text) => {
    navigator.clipboard?.writeText(text).then(() => setSnackMsg("已复制")).catch(() => setSnackMsg("复制失败"));
  };
  const handleRegenerate = async (aiMsgId) => {
    const idx = messages.findIndex((m) => m.id === aiMsgId);
    if (idx <= 0)
      return;
    const prevUserMsg = messages[idx - 1];
    if (prevUserMsg.sender !== "user")
      return;
    setIsLoading(true);
    try {
      const text = prevUserMsg.text || prevUserMsg.attachment?.fileName || "";
      const aiResult = await callAI(text);
      setMessages((prev) => prev.map((m) => m.id === aiMsgId ? { ...m, text: aiResult } : m));
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      setMessages((prev) => prev.map((m) => m.id === aiMsgId ? { ...m, text: `抱歉，重新生成失败：${errMsg}` } : m));
    } finally {
      setIsLoading(false);
    }
  };
  const callAI = async (text) => {
    if (!aiResponseServiceRef.current) {
      try {
        const { llmApiService: llmApiService2 } = await __vitePreload(() => Promise.resolve().then(() => LLMApiService$1), true ? void 0 : void 0);
        aiResponseServiceRef.current = llmApiService2;
      } catch (e) {
        console.warn("AI 服务加载失败:", e);
      }
    }
    if (aiResponseServiceRef.current?.isConfigured?.()) {
      const now = /* @__PURE__ */ new Date();
      const timeInfo = `[当前时间] ${now.toLocaleString("zh-CN", { hour12: false })}`;
      const systemPrompt = `你是阮琳云，一个友好、温暖的AI助手。请用中文回复，语气亲切自然。${timeInfo}`;
      const history = messages.slice(-20).map((m) => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: m.text
      }));
      return await aiResponseServiceRef.current.askWithHistory(history, text, systemPrompt, { model: selectedModel });
    }
    return 'AI 模型未配置，请前往"设置"页面配置 API Key 并启用。';
  };
  const handleSend = async () => {
    const text = inputText.trim();
    if (!text)
      return;
    const now = (/* @__PURE__ */ new Date()).toLocaleTimeString();
    setMessages((prev) => appendMessage(prev, { id: Date.now().toString(), text, sender: "user", time: now }));
    setInputText("");
    setIsLoading(true);
    try {
      const aiResult = await callAI(text);
      if (!mountedRef.current)
        return;
      setMessages((prev) => appendMessage(prev, {
        id: (Date.now() + 1).toString(),
        text: aiResult,
        sender: "ai",
        time: (/* @__PURE__ */ new Date()).toLocaleTimeString()
      }));
    } catch (error) {
      if (!mountedRef.current)
        return;
      const errMsg = error instanceof Error ? error.message : String(error);
      setMessages((prev) => appendMessage(prev, {
        id: (Date.now() + 1).toString(),
        text: `抱歉，处理请求时出错：${errMsg}`,
        sender: "ai",
        time: (/* @__PURE__ */ new Date()).toLocaleTimeString()
      }));
    } finally {
      if (mountedRef.current)
        setIsLoading(false);
    }
  };
  return /* @__PURE__ */ jsxs(Box, { className: "mobile-chat-container", children: [
    /* @__PURE__ */ jsxs(Box, { sx: {
      py: 1.5,
      px: 2,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      bgcolor: "background.paper",
      borderBottom: "1px solid rgba(0,0,0,0.08)",
      flexShrink: 0
    }, children: [
      /* @__PURE__ */ jsxs(Box, { sx: { display: "flex", alignItems: "center" }, children: [
        /* @__PURE__ */ jsx(Avatar, { sx: { width: 32, height: 32, bgcolor: "#4f46e5", fontSize: "0.8rem", mr: 1 }, children: "阮" }),
        /* @__PURE__ */ jsx(Typography, { variant: "subtitle1", sx: { fontWeight: 500 }, children: "阮琳云" })
      ] }),
      /* @__PURE__ */ jsxs(
        Box,
        {
          onClick: (e) => setModelMenuAnchor(e.currentTarget),
          sx: { display: "flex", alignItems: "center", gap: 0.5, cursor: "pointer", color: "primary.main" },
          children: [
            /* @__PURE__ */ jsx(default_1$3, { fontSize: "small" }),
            /* @__PURE__ */ jsx(Typography, { variant: "caption", sx: { fontSize: "0.7rem" }, children: MODEL_OPTIONS.find((m) => m.value === selectedModel)?.label || "模型" })
          ]
        }
      ),
      /* @__PURE__ */ jsx(Menu, { anchorEl: modelMenuAnchor, open: !!modelMenuAnchor, onClose: () => setModelMenuAnchor(null), children: MODEL_OPTIONS.map((m) => /* @__PURE__ */ jsx(
        MenuItem,
        {
          selected: m.value === selectedModel,
          onClick: () => {
            setSelectedModel(m.value);
            setModelMenuAnchor(null);
          },
          children: m.label
        },
        m.value
      )) })
    ] }),
    /* @__PURE__ */ jsxs(Box, { className: "mobile-chat-messages", sx: { flex: 1, overflowY: "auto", px: 1.5, py: 1 }, children: [
      messages.map((msg) => /* @__PURE__ */ jsxs(
        Box,
        {
          sx: {
            display: "flex",
            gap: 1,
            mb: 2,
            justifyContent: msg.sender === "user" ? "flex-end" : "flex-start"
          },
          children: [
            msg.sender === "ai" && /* @__PURE__ */ jsx(Avatar, { sx: { bgcolor: "#4f46e5", width: 32, height: 32, fontSize: "0.8rem", flexShrink: 0 }, children: "阮" }),
            /* @__PURE__ */ jsx(Box, { sx: { maxWidth: "78%" }, children: /* @__PURE__ */ jsxs(Box, { sx: {
              p: 1.5,
              borderRadius: "12px",
              bgcolor: msg.sender === "user" ? "#4f46e5" : "background.paper",
              color: msg.sender === "user" ? "white" : "text.primary",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)"
            }, children: [
              msg.attachment && /* @__PURE__ */ jsxs(Box, { sx: { mb: msg.text ? 1 : 0 }, children: [
                msg.attachment.kind === "image" && msg.attachment.dataUrl && /* @__PURE__ */ jsx(
                  Box,
                  {
                    component: "img",
                    src: msg.attachment.dataUrl,
                    alt: msg.attachment.fileName,
                    onClick: () => setPreviewImage(msg.attachment.dataUrl),
                    sx: { width: "100%", maxWidth: 220, borderRadius: "8px", cursor: "pointer", display: "block" }
                  }
                ),
                msg.attachment.kind === "document" && /* @__PURE__ */ jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1, p: 1, bgcolor: "rgba(0,0,0,0.04)", borderRadius: "8px" }, children: [
                  getDocumentIcon(msg.attachment.fileName),
                  /* @__PURE__ */ jsxs(Box, { sx: { minWidth: 0 }, children: [
                    /* @__PURE__ */ jsx(Typography, { variant: "caption", sx: { display: "block", fontSize: "0.75rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }, children: msg.attachment.fileName }),
                    /* @__PURE__ */ jsx(Typography, { variant: "caption", sx: { opacity: 0.6, fontSize: "0.7rem" }, children: formatFileSize(msg.attachment.fileSize) })
                  ] })
                ] })
              ] }),
              msg.text && (msg.sender === "ai" ? /* @__PURE__ */ jsx(TypewriterEffect, { text: msg.text, speed: 25 }) : /* @__PURE__ */ jsx(Typography, { variant: "body2", sx: { lineHeight: 1.5, whiteSpace: "pre-wrap" }, children: msg.text })),
              msg.sender === "ai" && msg.text && /* @__PURE__ */ jsxs(Box, { sx: { display: "flex", gap: 0.5, mt: 0.5, justifyContent: "flex-end" }, children: [
                /* @__PURE__ */ jsx(IconButton, { size: "small", onClick: () => handleCopy(msg.text), sx: { p: 0.5 }, children: /* @__PURE__ */ jsx(default_1$4, { fontSize: "small" }) }),
                /* @__PURE__ */ jsx(IconButton, { size: "small", onClick: () => handleRegenerate(msg.id), sx: { p: 0.5 }, children: /* @__PURE__ */ jsx(default_1$5, { fontSize: "small" }) })
              ] })
            ] }) }),
            msg.sender === "user" && /* @__PURE__ */ jsx(Avatar, { sx: { bgcolor: "#10b981", width: 32, height: 32, fontSize: "0.8rem", flexShrink: 0 }, children: "U" })
          ]
        },
        msg.id
      )),
      isLoading && /* @__PURE__ */ jsxs(Box, { sx: { display: "flex", gap: 1, mb: 2 }, children: [
        /* @__PURE__ */ jsx(Avatar, { sx: { bgcolor: "#4f46e5", width: 32, height: 32, fontSize: "0.8rem" }, children: "阮" }),
        /* @__PURE__ */ jsx(Box, { sx: { p: 1.5, borderRadius: "12px", bgcolor: "background.paper" }, children: /* @__PURE__ */ jsx(CircularProgress, { size: 16 }) })
      ] }),
      /* @__PURE__ */ jsx("div", { ref: messagesEndRef })
    ] }),
    /* @__PURE__ */ jsx(Box, { className: "mobile-chat-input", children: /* @__PURE__ */ jsxs(Box, { sx: { display: "flex", gap: 0.5, alignItems: "flex-end" }, children: [
      /* @__PURE__ */ jsx(IconButton, { onClick: handleFileUpload, sx: { color: "text.secondary", width: 40, height: 40 }, children: /* @__PURE__ */ jsx(default_1$6, { fontSize: "small" }) }),
      /* @__PURE__ */ jsx(IconButton, { onClick: handleVoiceInput, sx: { color: "text.secondary", width: 40, height: 40 }, children: /* @__PURE__ */ jsx(default_1$7, { fontSize: "small" }) }),
      /* @__PURE__ */ jsx(
        TextField,
        {
          multiline: true,
          maxRows: 3,
          value: inputText,
          onChange: (e) => setInputText(e.target.value),
          onKeyDown: (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          },
          placeholder: "输入消息...",
          size: "small",
          sx: {
            flex: 1,
            "& .MuiOutlinedInput-root": {
              borderRadius: "20px",
              fontSize: "0.9rem"
            }
          }
        }
      ),
      /* @__PURE__ */ jsx(
        IconButton,
        {
          onClick: handleSend,
          disabled: !inputText.trim() || isLoading,
          sx: {
            bgcolor: "#4f46e5",
            color: "white",
            width: 44,
            height: 44,
            "&:hover": { bgcolor: "#4338ca" },
            "&:disabled": { bgcolor: "rgba(0,0,0,0.12)" }
          },
          children: /* @__PURE__ */ jsx(default_1$8, { fontSize: "small" })
        }
      )
    ] }) }),
    previewImage && /* @__PURE__ */ jsx(
      Box,
      {
        onClick: () => setPreviewImage(null),
        sx: {
          position: "fixed",
          inset: 0,
          zIndex: 2e3,
          bgcolor: "rgba(0,0,0,0.85)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: 2
        },
        children: /* @__PURE__ */ jsx(Box, { component: "img", src: previewImage, sx: { maxWidth: "100%", maxHeight: "100%", borderRadius: "8px" } })
      }
    ),
    /* @__PURE__ */ jsx(
      Snackbar,
      {
        open: !!snackMsg,
        autoHideDuration: 2e3,
        onClose: () => setSnackMsg(""),
        message: snackMsg,
        anchorOrigin: { vertical: "bottom", horizontal: "center" }
      }
    )
  ] });
}
const REQUEST_TIMEOUT = 9e4;
const PROXY_RETRY_COOLDOWN = 5e3;
const RATE_LIMIT_PER_MINUTE = 60;
const CIRCUIT_BREAKER_COOLDOWN = 6e4;
const CLIENT_MIN_INTERVAL_MS = 1500;
const DEDUP_WINDOW_MS = 3e3;
const CLIENT_COOLDOWN_MS = 1e4;
const API_HOST = typeof window !== "undefined" && window.location && window.location.hostname || "127.0.0.1";
const PROXY_BASE = `http://${API_HOST}:27865/api/v1/ai`;
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
    const request = {
      model: this.model,
      messages: ProtocolConverter.fromUnified(messages),
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 2048,
      top_p: options?.topP,
      frequency_penalty: options?.frequencyPenalty,
      presence_penalty: options?.presencePenalty,
      stop: options?.stopSequences
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
      throw new Error(err.error?.message ?? `OpenAI API 错误 HTTP ${resp.status}`);
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
    const systemMessage = messages.find((m) => m.role === MessageRole.System);
    const userMessages = messages.filter((m) => m.role !== MessageRole.System);
    const request = {
      model: this.model,
      messages: userMessages.map((m) => ({
        role: m.role === MessageRole.User ? "user" : "assistant",
        content: [typeof m.content === "string" ? m.content : m.content.map((c) => c.type === "text" ? c.text : "").join("\n")]
      })),
      system: systemMessage?.content && typeof systemMessage.content === "string" ? systemMessage.content : void 0,
      max_tokens: options?.maxTokens ?? 2048,
      temperature: options?.temperature,
      top_p: options?.topP,
      stop_sequences: options?.stopSequences
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
      throw new Error(err.error?.message ?? `Anthropic API 错误 HTTP ${resp.status}`);
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
          return { ok: true, message: `连接成功 → ${(data.choices?.[0]?.message?.content ?? "").substring(0, 50)}` };
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
      const all = apiConfigService.getAll();
      setProviders(all);
      const visible = all.filter((p) => !LOCAL_MODEL_IDS.includes(p.id));
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
      /* @__PURE__ */ jsx(IconButton, { "aria-label": "返回", sx: { mr: 2 }, onClick: () => navigate("/"), children: /* @__PURE__ */ jsx(default_1$e, {}) }),
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
            startIcon: /* @__PURE__ */ jsx(default_1$f, {}),
            onClick: async () => {
              if (!window.confirm(`确定删除该 provider 吗？

这将同步清除其 API Key、Base URL、模型名称等所有存储信息，且不可恢复。`))
                return;
              const ok = await apiConfigService.removeProvider(selectedProviderId);
              if (ok) {
                const all = apiConfigService.getAll();
                setProviders(all);
                const visible = all.filter((p) => !LOCAL_MODEL_IDS.includes(p.id));
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
            startIcon: testing ? /* @__PURE__ */ jsx(CircularProgress, { size: 18 }) : /* @__PURE__ */ jsx(default_1$g, {}),
            children: "测试连接"
          }
        ),
        /* @__PURE__ */ jsx(
          Button,
          {
            variant: "contained",
            onClick: handleSave,
            color: saved ? "success" : "primary",
            startIcon: saved ? /* @__PURE__ */ jsx(default_1$h, {}) : void 0,
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
        /* @__PURE__ */ jsx(AccordionSummary, { expandIcon: /* @__PURE__ */ jsx(default_1$i, {}), children: /* @__PURE__ */ jsx(Typography, { children: "版本信息" }) }),
        /* @__PURE__ */ jsx(AccordionDetails, { children: /* @__PURE__ */ jsx(Typography, { children: "阮琳云智能助手 v1.0.0 (Android)" }) })
      ] }),
      /* @__PURE__ */ jsxs(Accordion, { children: [
        /* @__PURE__ */ jsx(AccordionSummary, { expandIcon: /* @__PURE__ */ jsx(default_1$i, {}), children: /* @__PURE__ */ jsx(Typography, { children: "安全" }) }),
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
  const [bootProgress, setBootProgress] = reactExports.useState(8);
  const [bootTip, setBootTip] = reactExports.useState("正在启动 DeepSeek Harness…");
  const [waitOverdue, setWaitOverdue] = reactExports.useState(false);
  const [topBarOpen, setTopBarOpen] = reactExports.useState(true);
  const pollRef = reactExports.useRef(null);
  const bootingRef = reactExports.useRef(false);
  const liveCheckRef = reactExports.useRef(false);
  const progTargetRef = reactExports.useRef(8);
  reactExports.useEffect(() => {
    progTargetRef.current = bootProgress;
  }, [bootProgress]);
  reactExports.useEffect(() => {
    let raf = 0;
    let cur = 8;
    const step = () => {
      const t = progTargetRef.current;
      const eff = t >= 100 ? 100 : Math.min(t + 10, 92);
      const diff = eff - cur;
      cur = Math.abs(diff) < 0.05 ? eff : cur + diff * (t >= 100 ? 0.09 : 0.035);
      const w = Math.max(4, Math.min(100, cur)).toFixed(1) + "%";
      document.querySelectorAll("[data-progfill]").forEach((el) => {
        if (el.style.width !== w)
          el.style.width = w;
      });
      const txt = Math.floor(Math.max(4, Math.min(100, cur))) + "%";
      document.querySelectorAll("[data-progpct]").forEach((el) => {
        if (el.textContent !== txt)
          el.textContent = txt;
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
          try {
            const r = await window.dshHarness?.purgeSession?.(String(d.sessionId));
            window.postMessage({ type: "rl-dsh-delete-session-result", sessionId: d.sessionId, ok: !!(r && r.ok), error: r && r.error || null }, "*");
          } catch (err) {
            window.postMessage({ type: "rl-dsh-delete-session-result", sessionId: d.sessionId, ok: false, error: err?.message || "purge failed" }, "*");
          }
        })();
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);
  const buildModelCfg = () => {
    try {
      const active = apiConfigService.getActive?.() || null;
      const list = apiConfigService.getAll?.() || [];
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
      while (Date.now() - t0 < BOOT_HARD_MS) {
        if (await probeLive(url)) {
          setDshUrl(url);
          setDshError(null);
          setBootProgress(86);
          setBootTip("连接成功 · 界面加载中…");
          return true;
        }
        attempts += 1;
        if (attempts % 3 === 0) {
          try {
            const r = await window.dshHarness?.resolveUrl?.();
            if (r?.ok && r.url)
              url = r.url;
          } catch {
          }
          try {
            await window.dshHarness?.start?.(buildModelCfg() || void 0);
          } catch {
          }
        }
        const elapsed = Date.now() - t0;
        if (elapsed >= BOOT_TARGET_MS) {
          if (!waitOverdue)
            setWaitOverdue(true);
          setBootProgress(Math.min(92, 50 + Math.floor((elapsed - BOOT_TARGET_MS) / 100)));
          setBootTip("界面已就绪 · DSH 后台加载中…");
        } else {
          setBootProgress(Math.min(48, 12 + Math.floor(elapsed / 100)));
          setBootTip(`启动中… ${Math.min(48, 12 + Math.floor(elapsed / 100))}%`);
        }
        await sleep(400);
      }
      setWaitOverdue(true);
      setDshError("DSH 后台启动中，稍后自动就绪");
      setBootTip("后台加载中…");
      setBootProgress(92);
      return false;
    } finally {
      liveCheckRef.current = false;
    }
  };
  const startPoll = () => {
    stopPoll();
    let ticks = 0;
    pollRef.current = window.setInterval(async () => {
      ticks += 1;
      const dsh = window.dshHarness;
      if (!dsh) {
        stopPoll();
        return;
      }
      try {
        const r = await dsh.resolveUrl?.();
        if (r?.ok && r.url) {
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
      if (!dsh?.start) {
        setDshError("DeepSeek Harness 桥不可用");
        setWaitOverdue(true);
        return;
      }
      let url = null;
      try {
        const ready = await dsh.resolveUrl?.();
        if (ready?.ok && ready.url)
          url = ready.url;
      } catch {
      }
      if (!url) {
        const st = await dsh.status?.().catch(() => null);
        if (st?.ok && st.url)
          url = st.url;
      }
      setBootProgress(22);
      if (url) {
        const ok = await applyUrlWhenLive(url);
        if (!ok)
          startPoll();
        return;
      }
      startPoll();
      try {
        const result = await dsh.start(buildModelCfg() || void 0);
        if (result?.ok && result.url) {
          stopPoll();
          const ok = await applyUrlWhenLive(result.url);
          if (!ok)
            startPoll();
        }
      } catch {
        startPoll();
      }
    } catch (e) {
      setDshError(e?.message || "启动失败");
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
            setBootProgress(96);
            setBootTip("界面加载完成");
            window.setTimeout(() => {
              setDshUiReady(true);
              setBootProgress(100);
              setBootTip("就绪");
            }, 500);
          },
          onError: () => {
            setDshUrl(null);
            setDshUiReady(false);
            setBootProgress(15);
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
        bgcolor: "#0c0c12"
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
        /* @__PURE__ */ jsx(Box, { sx: { width: 240, maxWidth: "70%", height: 4, borderRadius: 2, bgcolor: "rgba(255,255,255,0.12)", overflow: "hidden" }, children: /* @__PURE__ */ jsx(Box, { sx: {
          width: "4%",
          height: "100%",
          borderRadius: 2,
          bgcolor: "rgba(255,255,255,0.9)"
        }, "data-progfill": "" }) }),
        /* @__PURE__ */ jsxs(Typography, { variant: "body2", sx: { color: "rgba(232,232,232,0.85)", letterSpacing: 1 }, children: [
          bootTip,
          " · ",
          /* @__PURE__ */ jsx("span", { "data-progpct": "", children: "8%" })
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
        /* @__PURE__ */ jsx(Box, { sx: { width: 240, maxWidth: "80%", height: 3, borderRadius: 2, bgcolor: "rgba(255,255,255,0.12)", overflow: "hidden" }, children: /* @__PURE__ */ jsx(Box, { sx: {
          width: "4%",
          height: "100%",
          bgcolor: "rgba(255,255,255,0.85)"
        }, "data-progfill": "" }) }),
        /* @__PURE__ */ jsxs(Typography, { variant: "caption", sx: { color: "rgba(232,232,232,0.8)", letterSpacing: 1 }, children: [
          dshError || bootTip,
          " · ",
          /* @__PURE__ */ jsx("span", { "data-progpct": "", children: "8%" })
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
const SettingsPage = React$1.lazy(() => __vitePreload(() => import("./SettingsPage-58c29de1.js"), true ? ["assets/SettingsPage-58c29de1.js","assets/mui-096207bc.js","assets/babylon-72e1e591.js","assets/ai-3c0f0023.js","assets/index-12ae994a.js","assets/index-f1bb0deb.css"] : void 0));
const NewPage = React$1.lazy(() => __vitePreload(() => import("./NewPage-a0785556.js"), true ? ["assets/NewPage-a0785556.js","assets/babylon-72e1e591.js","assets/mui-096207bc.js","assets/ai-3c0f0023.js","assets/index-12ae994a.js","assets/index-f1bb0deb.css"] : void 0));
const PetPage = React$1.lazy(() => __vitePreload(() => import("./PetPage-710a107c.js"), true ? ["assets/PetPage-710a107c.js","assets/babylon-72e1e591.js","assets/mui-096207bc.js"] : void 0));
const MobilePet = React$1.lazy(() => __vitePreload(() => import("./MobilePet-95e3f91f.js"), true ? ["assets/MobilePet-95e3f91f.js","assets/mui-096207bc.js","assets/babylon-72e1e591.js"] : void 0));
const darkTheme = createTheme({
  palette: {
    mode: "dark"
  }
});
const lightTheme = createTheme({
  palette: {
    mode: "light"
  }
});
function PreviewKeepAlive() {
  const location = useLocation();
  const onPreview = location.pathname === "/new-page" || location.pathname === "/";
  const [mounted, setMounted] = reactExports.useState(true);
  reactExports.useEffect(() => {
    if (onPreview) {
      try {
        window.dispatchEvent(new CustomEvent("rl-preview-visible"));
      } catch {
      }
      console.log("[PreviewMemory] 进入预览（渲染恢复，建模保留）");
      return;
    }
    try {
      window.dispatchEvent(new CustomEvent("rl-preview-hidden"));
    } catch {
    }
    console.log("[PreviewMemory] 离开预览（后台保活 + 暂停渲染）");
  }, [onPreview]);
  if (!mounted)
    return null;
  return /* @__PURE__ */ jsx("div", { style: { display: onPreview ? "block" : "none", position: "fixed", inset: 0, zIndex: 1200 }, children: /* @__PURE__ */ jsx(NewPage, {}) });
}
function ChatKeepAlive() {
  const location = useLocation();
  const onChat = location.pathname === "/chat";
  const [mounted, setMounted] = reactExports.useState(true);
  reactExports.useEffect(() => {
    if (onChat && !mounted)
      setMounted(true);
  }, [onChat, mounted]);
  if (!mounted)
    return null;
  return /* @__PURE__ */ jsx("div", { style: { display: onChat ? "block" : "none", position: "fixed", inset: 0, zIndex: 900 }, children: /* @__PURE__ */ jsx(Box, { sx: {
    bgcolor: "background.default",
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden"
  }, children: /* @__PURE__ */ jsx(HomePage, {}) }) });
}
function App() {
  const [isDarkMode, setIsDarkMode] = reactExports.useState(false);
  const mobileMode = useMobileLayout();
  const theme = isDarkMode ? darkTheme : lightTheme;
  reactExports.useEffect(() => {
    document.documentElement.setAttribute("data-theme", isDarkMode ? "dark" : "light");
    document.documentElement.style.colorScheme = isDarkMode ? "dark" : "light";
  }, [isDarkMode]);
  reactExports.useEffect(() => {
    const deviceOptimizer = DeviceOptimizer.getInstance();
    deviceOptimizer.applyOptimizations();
    console.log("[App] 设备优化器已初始化");
    const runSystemOptimize = async () => {
      try {
        const host = window.location.hostname || "127.0.0.1";
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1e4);
        const resp = await fetch(`http://${host}:27865/api/v1/optimization/optimize`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ priority: "high" }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (resp.ok)
          console.log("[App] 后台设备优化完成");
      } catch {
        console.warn("[App] 后台设备优化跳过（后端未就绪）");
      }
    };
    const t = window.setTimeout(runSystemOptimize, 8e3);
    const iv = window.setInterval(runSystemOptimize, 5 * 60 * 1e3);
    return () => {
      window.clearTimeout(t);
      window.clearInterval(iv);
    };
  }, []);
  reactExports.useEffect(() => {
    if (isNativePlatform()) {
      console.log("[App] 原生平台：跳过 API Key 下发（避免明文外发与 Mixed Content 拦截）");
      return;
    }
    (async () => {
      try {
        await apiConfigService.waitReady();
        const active = apiConfigService.getActive();
        if (!active) {
          console.log("[App] 未检测到已配置的 provider，跳过下发");
          return;
        }
        const isLocal = active.id === "glm_local" || active.id === "qwen_local" || /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?(\/|$)/i.test(active.baseUrl);
        const mode = isLocal ? "builtin" : "cloud";
        if (mode === "cloud" && !active.apiKey) {
          console.log("[App] 云端模式但无 apiKey，跳过下发");
          return;
        }
        const host = window.location.hostname || "127.0.0.1";
        const backendUrl = `http://${host}:27865/api/v1/wechat-bot/ai-mode`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3e3);
        const resp = await fetch(backendUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode, apiKey: active.apiKey || "", baseUrl: active.baseUrl, model: active.model }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (resp.ok) {
          console.log(`[App] AI 模式已下发到后端 (mode=${mode}, provider=${active.id})`);
        } else {
          console.warn(`[App] AI 模式下发失败: HTTP ${resp.status}`);
        }
      } catch (err) {
        console.warn("[App] AI 模式自动下发异常（后端可能未启动，属正常降级）:", err instanceof Error ? err.message : err);
      }
    })();
  }, []);
  return /* @__PURE__ */ jsxs(ThemeProvider, { theme, children: [
    /* @__PURE__ */ jsx(CssBaseline, {}),
    /* @__PURE__ */ jsxs(BrowserRouter, { children: [
      window.windowControls && /* @__PURE__ */ jsx(WindowControls, {}),
      mobileMode ? /* @__PURE__ */ jsx(MobileLayout, { children: /* @__PURE__ */ jsx(React$1.Suspense, { fallback: /* @__PURE__ */ jsxs(Box, { sx: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1.5, height: "100vh", bgcolor: "#12121a", color: "rgba(232,232,232,0.85)" }, children: [
        /* @__PURE__ */ jsx(CircularProgress, { size: 36, thickness: 4, sx: { color: "#fff" } }),
        /* @__PURE__ */ jsx(Box, { sx: { fontSize: 13, letterSpacing: 2 }, children: "加载中…" })
      ] }), children: /* @__PURE__ */ jsxs(Routes, { children: [
        /* @__PURE__ */ jsx(Route, { path: "/", element: /* @__PURE__ */ jsx(MobileChat, {}) }),
        /* @__PURE__ */ jsx(Route, { path: "/settings", element: /* @__PURE__ */ jsx(Box, { sx: { bgcolor: "background.default", minHeight: "100vh", p: 2 }, children: /* @__PURE__ */ jsx(MobileSettingsPage, { isDarkMode, setIsDarkMode }) }) }),
        /* @__PURE__ */ jsx(Route, { path: "/new-page", element: /* @__PURE__ */ jsx(NewPage, {}) }),
        /* @__PURE__ */ jsx(Route, { path: "/pet", element: /* @__PURE__ */ jsx(MobilePet, {}) })
      ] }) }) }) : /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsx(PreviewKeepAlive, {}),
        /* @__PURE__ */ jsx(ChatKeepAlive, {}),
        /* @__PURE__ */ jsx(React$1.Suspense, { fallback: /* @__PURE__ */ jsxs(Box, { sx: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1.5, height: "100vh", bgcolor: "#12121a", color: "rgba(232,232,232,0.85)" }, children: [
          /* @__PURE__ */ jsx(CircularProgress, { size: 36, thickness: 4, sx: { color: "#fff" } }),
          /* @__PURE__ */ jsx(Box, { sx: { fontSize: 13, letterSpacing: 2 }, children: "加载中…" })
        ] }), children: /* @__PURE__ */ jsxs(Routes, { children: [
          /* @__PURE__ */ jsx(Route, { path: "/", element: null }),
          /* @__PURE__ */ jsx(Route, { path: "/chat", element: null }),
          /* @__PURE__ */ jsx(Route, { path: "/settings", element: /* @__PURE__ */ jsx(Box, { sx: {
            bgcolor: "background.default",
            width: "100%",
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column"
          }, children: /* @__PURE__ */ jsx(SettingsPage, { isDarkMode, setIsDarkMode }) }) }),
          /* @__PURE__ */ jsx(Route, { path: "/new-page", element: null }),
          /* @__PURE__ */ jsx(Route, { path: "/pet", element: isNativePlatform() ? /* @__PURE__ */ jsx(MobilePet, {}) : /* @__PURE__ */ jsx(PetPage, {}) })
        ] }) })
      ] })
    ] })
  ] });
}
const App$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: App
}, Symbol.toStringTag, { value: "Module" }));
export {
  App$1 as A,
  BUILTIN_PROVIDERS as B,
  LLMApiService$1 as L,
  apiConfigService as a,
  llmApiService as l,
  useNavigate as u
};
