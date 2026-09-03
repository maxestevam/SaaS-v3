var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) =>
  __defProp(target, "name", { value, configurable: true });
var __commonJS = (cb, mod) =>
  function __require() {
    return (
      mod ||
        (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod),
      mod.exports
    );
  };
var __copyProps = (to, from, except, desc) => {
  if ((from && typeof from === "object") || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, {
          get: () => from[key],
          enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable,
        });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (
  (target = mod != null ? __create(__getProtoOf(mod)) : {}),
  __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule
      ? __defProp(target, "default", { value: mod, enumerable: true })
      : target,
    mod
  )
);

// (disabled):crypto
var require_crypto = __commonJS({
  "(disabled):crypto"() {},
});

// node_modules/hono/dist/compose.js
var compose = /* @__PURE__ */ __name((middleware, onError, onNotFound) => {
  return (context, next) => {
    let index = -1;
    return dispatch(0);
    async function dispatch(i) {
      if (i <= index) {
        throw new Error("next() called multiple times");
      }
      index = i;
      let res;
      let isError = false;
      let handler;
      if (middleware[i]) {
        handler = middleware[i][0][0];
        context.req.routeIndex = i;
      } else {
        handler = (i === middleware.length && next) || void 0;
      }
      if (handler) {
        try {
          res = await handler(context, () => dispatch(i + 1));
        } catch (err) {
          if (err instanceof Error && onError) {
            context.error = err;
            res = await onError(err, context);
            isError = true;
          } else {
            throw err;
          }
        }
      } else {
        if (context.finalized === false && onNotFound) {
          res = await onNotFound(context);
        }
      }
      if (res && (context.finalized === false || isError)) {
        context.res = res;
      }
      return context;
    }
    __name(dispatch, "dispatch");
  };
}, "compose");

// node_modules/hono/dist/request/constants.js
var GET_MATCH_RESULT = /* @__PURE__ */ Symbol();

// node_modules/hono/dist/utils/body.js
var parseBody = /* @__PURE__ */ __name(
  async (request, options = /* @__PURE__ */ Object.create(null)) => {
    const { all: all2 = false, dot = false } = options;
    const headers =
      request instanceof HonoRequest ? request.raw.headers : request.headers;
    const contentType = headers.get("Content-Type");
    if (
      contentType?.startsWith("multipart/form-data") ||
      contentType?.startsWith("application/x-www-form-urlencoded")
    ) {
      return parseFormData(request, { all: all2, dot });
    }
    return {};
  },
  "parseBody"
);
async function parseFormData(request, options) {
  const formData = await request.formData();
  if (formData) {
    return convertFormDataToBodyData(formData, options);
  }
  return {};
}
__name(parseFormData, "parseFormData");
function convertFormDataToBodyData(formData, options) {
  const form = /* @__PURE__ */ Object.create(null);
  formData.forEach((value, key) => {
    const shouldParseAllValues = options.all || key.endsWith("[]");
    if (!shouldParseAllValues) {
      form[key] = value;
    } else {
      handleParsingAllValues(form, key, value);
    }
  });
  if (options.dot) {
    Object.entries(form).forEach(([key, value]) => {
      const shouldParseDotValues = key.includes(".");
      if (shouldParseDotValues) {
        handleParsingNestedValues(form, key, value);
        delete form[key];
      }
    });
  }
  return form;
}
__name(convertFormDataToBodyData, "convertFormDataToBodyData");
var handleParsingAllValues = /* @__PURE__ */ __name((form, key, value) => {
  if (form[key] !== void 0) {
    if (Array.isArray(form[key])) {
      form[key].push(value);
    } else {
      form[key] = [form[key], value];
    }
  } else {
    if (!key.endsWith("[]")) {
      form[key] = value;
    } else {
      form[key] = [value];
    }
  }
}, "handleParsingAllValues");
var handleParsingNestedValues = /* @__PURE__ */ __name((form, key, value) => {
  if (/(?:^|\.)__proto__\./.test(key)) {
    return;
  }
  let nestedForm = form;
  const keys = key.split(".");
  keys.forEach((key2, index) => {
    if (index === keys.length - 1) {
      nestedForm[key2] = value;
    } else {
      if (
        !nestedForm[key2] ||
        typeof nestedForm[key2] !== "object" ||
        Array.isArray(nestedForm[key2]) ||
        nestedForm[key2] instanceof File
      ) {
        nestedForm[key2] = /* @__PURE__ */ Object.create(null);
      }
      nestedForm = nestedForm[key2];
    }
  });
}, "handleParsingNestedValues");

// node_modules/hono/dist/utils/url.js
var splitPath = /* @__PURE__ */ __name(path => {
  const paths = path.split("/");
  if (paths[0] === "") {
    paths.shift();
  }
  return paths;
}, "splitPath");
var splitRoutingPath = /* @__PURE__ */ __name(routePath => {
  const { groups, path } = extractGroupsFromPath(routePath);
  const paths = splitPath(path);
  return replaceGroupMarks(paths, groups);
}, "splitRoutingPath");
var extractGroupsFromPath = /* @__PURE__ */ __name(path => {
  const groups = [];
  path = path.replace(/\{[^}]+\}/g, (match2, index) => {
    const mark = `@${index}`;
    groups.push([mark, match2]);
    return mark;
  });
  return { groups, path };
}, "extractGroupsFromPath");
var replaceGroupMarks = /* @__PURE__ */ __name((paths, groups) => {
  for (let i = groups.length - 1; i >= 0; i--) {
    const [mark] = groups[i];
    for (let j = paths.length - 1; j >= 0; j--) {
      if (paths[j].includes(mark)) {
        paths[j] = paths[j].replace(mark, groups[i][1]);
        break;
      }
    }
  }
  return paths;
}, "replaceGroupMarks");
var patternCache = {};
var getPattern = /* @__PURE__ */ __name((label, next) => {
  if (label === "*") {
    return "*";
  }
  const match2 = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (match2) {
    const cacheKey = `${label}#${next}`;
    if (!patternCache[cacheKey]) {
      if (match2[2]) {
        patternCache[cacheKey] =
          next && next[0] !== ":" && next[0] !== "*"
            ? [cacheKey, match2[1], new RegExp(`^${match2[2]}(?=/${next})`)]
            : [label, match2[1], new RegExp(`^${match2[2]}$`)];
      } else {
        patternCache[cacheKey] = [label, match2[1], true];
      }
    }
    return patternCache[cacheKey];
  }
  return null;
}, "getPattern");
var tryDecode = /* @__PURE__ */ __name((str, decoder2) => {
  try {
    return decoder2(str);
  } catch {
    return str.replace(/(?:%[0-9A-Fa-f]{2})+/g, match2 => {
      try {
        return decoder2(match2);
      } catch {
        return match2;
      }
    });
  }
}, "tryDecode");
var tryDecodeURI = /* @__PURE__ */ __name(
  str => tryDecode(str, decodeURI),
  "tryDecodeURI"
);
var getPath = /* @__PURE__ */ __name(request => {
  const url = request.url;
  const start = url.indexOf("/", url.indexOf(":") + 4);
  let i = start;
  for (; i < url.length; i++) {
    const charCode = url.charCodeAt(i);
    if (charCode === 37) {
      const queryIndex = url.indexOf("?", i);
      const hashIndex = url.indexOf("#", i);
      const end =
        queryIndex === -1
          ? hashIndex === -1
            ? void 0
            : hashIndex
          : hashIndex === -1
          ? queryIndex
          : Math.min(queryIndex, hashIndex);
      const path = url.slice(start, end);
      return tryDecodeURI(
        path.includes("%25") ? path.replace(/%25/g, "%2525") : path
      );
    } else if (charCode === 63 || charCode === 35) {
      break;
    }
  }
  return url.slice(start, i);
}, "getPath");
var getPathNoStrict = /* @__PURE__ */ __name(request => {
  const result = getPath(request);
  return result.length > 1 && result.at(-1) === "/"
    ? result.slice(0, -1)
    : result;
}, "getPathNoStrict");
var mergePath = /* @__PURE__ */ __name((base, sub, ...rest) => {
  if (rest.length) {
    sub = mergePath(sub, ...rest);
  }
  return `${base?.[0] === "/" ? "" : "/"}${base}${
    sub === "/"
      ? ""
      : `${base?.at(-1) === "/" ? "" : "/"}${
          sub?.[0] === "/" ? sub.slice(1) : sub
        }`
  }`;
}, "mergePath");
var checkOptionalParameter = /* @__PURE__ */ __name(path => {
  if (path.charCodeAt(path.length - 1) !== 63 || !path.includes(":")) {
    return null;
  }
  const segments = path.split("/");
  const results = [];
  let basePath = "";
  segments.forEach(segment => {
    if (segment !== "" && !/\:/.test(segment)) {
      basePath += "/" + segment;
    } else if (/\:/.test(segment)) {
      if (/\?/.test(segment)) {
        if (results.length === 0 && basePath === "") {
          results.push("/");
        } else {
          results.push(basePath);
        }
        const optionalSegment = segment.replace("?", "");
        basePath += "/" + optionalSegment;
        results.push(basePath);
      } else {
        basePath += "/" + segment;
      }
    }
  });
  return results.filter((v, i, a) => a.indexOf(v) === i);
}, "checkOptionalParameter");
var _decodeURI = /* @__PURE__ */ __name(value => {
  if (!/[%+]/.test(value)) {
    return value;
  }
  if (value.indexOf("+") !== -1) {
    value = value.replace(/\+/g, " ");
  }
  return value.indexOf("%") !== -1
    ? tryDecode(value, decodeURIComponent_)
    : value;
}, "_decodeURI");
var _getQueryParam = /* @__PURE__ */ __name((url, key, multiple) => {
  let encoded;
  if (!multiple && key && !/[%+]/.test(key)) {
    let keyIndex2 = url.indexOf("?", 8);
    if (keyIndex2 === -1) {
      return void 0;
    }
    if (!url.startsWith(key, keyIndex2 + 1)) {
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    while (keyIndex2 !== -1) {
      const trailingKeyCode = url.charCodeAt(keyIndex2 + key.length + 1);
      if (trailingKeyCode === 61) {
        const valueIndex = keyIndex2 + key.length + 2;
        const endIndex = url.indexOf("&", valueIndex);
        return _decodeURI(
          url.slice(valueIndex, endIndex === -1 ? void 0 : endIndex)
        );
      } else if (trailingKeyCode == 38 || isNaN(trailingKeyCode)) {
        return "";
      }
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    encoded = /[%+]/.test(url);
    if (!encoded) {
      return void 0;
    }
  }
  const results = {};
  encoded ??= /[%+]/.test(url);
  let keyIndex = url.indexOf("?", 8);
  while (keyIndex !== -1) {
    const nextKeyIndex = url.indexOf("&", keyIndex + 1);
    let valueIndex = url.indexOf("=", keyIndex);
    if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) {
      valueIndex = -1;
    }
    let name = url.slice(
      keyIndex + 1,
      valueIndex === -1
        ? nextKeyIndex === -1
          ? void 0
          : nextKeyIndex
        : valueIndex
    );
    if (encoded) {
      name = _decodeURI(name);
    }
    keyIndex = nextKeyIndex;
    if (name === "") {
      continue;
    }
    let value;
    if (valueIndex === -1) {
      value = "";
    } else {
      value = url.slice(
        valueIndex + 1,
        nextKeyIndex === -1 ? void 0 : nextKeyIndex
      );
      if (encoded) {
        value = _decodeURI(value);
      }
    }
    if (multiple) {
      if (!(results[name] && Array.isArray(results[name]))) {
        results[name] = [];
      }
      results[name].push(value);
    } else {
      results[name] ??= value;
    }
  }
  return key ? results[key] : results;
}, "_getQueryParam");
var getQueryParam = _getQueryParam;
var getQueryParams = /* @__PURE__ */ __name((url, key) => {
  return _getQueryParam(url, key, true);
}, "getQueryParams");
var decodeURIComponent_ = decodeURIComponent;

// node_modules/hono/dist/request.js
var tryDecodeURIComponent = /* @__PURE__ */ __name(
  str => tryDecode(str, decodeURIComponent_),
  "tryDecodeURIComponent"
);
var HonoRequest = class {
  static {
    __name(this, "HonoRequest");
  }
  /**
   * `.raw` can get the raw Request object.
   *
   * @see {@link https://hono.dev/docs/api/request#raw}
   *
   * @example
   * ```ts
   * // For Cloudflare Workers
   * app.post('/', async (c) => {
   *   const metadata = c.req.raw.cf?.hostMetadata?
   *   ...
   * })
   * ```
   */
  raw;
  #validatedData;
  // Short name of validatedData
  #matchResult;
  routeIndex = 0;
  /**
   * `.path` can get the pathname of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#path}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const pathname = c.req.path // `/about/me`
   * })
   * ```
   */
  path;
  bodyCache = {};
  constructor(request, path = "/", matchResult = [[]]) {
    this.raw = request;
    this.path = path;
    this.#matchResult = matchResult;
    this.#validatedData = {};
  }
  param(key) {
    return key ? this.#getDecodedParam(key) : this.#getAllDecodedParams();
  }
  #getDecodedParam(key) {
    const paramKey = this.#matchResult[0][this.routeIndex][1][key];
    const param = this.#getParamValue(paramKey);
    return param && /\%/.test(param) ? tryDecodeURIComponent(param) : param;
  }
  #getAllDecodedParams() {
    const decoded = {};
    const keys = Object.keys(this.#matchResult[0][this.routeIndex][1]);
    for (const key of keys) {
      const value = this.#getParamValue(
        this.#matchResult[0][this.routeIndex][1][key]
      );
      if (value !== void 0) {
        decoded[key] = /\%/.test(value) ? tryDecodeURIComponent(value) : value;
      }
    }
    return decoded;
  }
  #getParamValue(paramKey) {
    return this.#matchResult[1] ? this.#matchResult[1][paramKey] : paramKey;
  }
  query(key) {
    return getQueryParam(this.url, key);
  }
  queries(key) {
    return getQueryParams(this.url, key);
  }
  header(name) {
    if (name) {
      return this.raw.headers.get(name) ?? void 0;
    }
    const headerData = {};
    this.raw.headers.forEach((value, key) => {
      headerData[key] = value;
    });
    return headerData;
  }
  async parseBody(options) {
    return parseBody(this, options);
  }
  #cachedBody = /* @__PURE__ */ __name(key => {
    const { bodyCache, raw: raw2 } = this;
    const cachedBody = bodyCache[key];
    if (cachedBody) {
      return cachedBody;
    }
    const anyCachedKey = Object.keys(bodyCache)[0];
    if (anyCachedKey) {
      return bodyCache[anyCachedKey].then(body => {
        if (anyCachedKey === "json") {
          body = JSON.stringify(body);
        }
        return new Response(body)[key]();
      });
    }
    return (bodyCache[key] = raw2[key]());
  }, "#cachedBody");
  /**
   * `.json()` can parse Request body of type `application/json`
   *
   * @see {@link https://hono.dev/docs/api/request#json}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.json()
   * })
   * ```
   */
  json() {
    return this.#cachedBody("text").then(text => JSON.parse(text));
  }
  /**
   * `.text()` can parse Request body of type `text/plain`
   *
   * @see {@link https://hono.dev/docs/api/request#text}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.text()
   * })
   * ```
   */
  text() {
    return this.#cachedBody("text");
  }
  /**
   * `.arrayBuffer()` parse Request body as an `ArrayBuffer`
   *
   * @see {@link https://hono.dev/docs/api/request#arraybuffer}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.arrayBuffer()
   * })
   * ```
   */
  arrayBuffer() {
    return this.#cachedBody("arrayBuffer");
  }
  /**
   * Parses the request body as a `Blob`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.blob();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#blob
   */
  blob() {
    return this.#cachedBody("blob");
  }
  /**
   * Parses the request body as `FormData`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.formData();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#formdata
   */
  formData() {
    return this.#cachedBody("formData");
  }
  /**
   * Adds validated data to the request.
   *
   * @param target - The target of the validation.
   * @param data - The validated data to add.
   */
  addValidatedData(target, data) {
    this.#validatedData[target] = data;
  }
  valid(target) {
    return this.#validatedData[target];
  }
  /**
   * `.url()` can get the request url strings.
   *
   * @see {@link https://hono.dev/docs/api/request#url}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const url = c.req.url // `http://localhost:8787/about/me`
   *   ...
   * })
   * ```
   */
  get url() {
    return this.raw.url;
  }
  /**
   * `.method()` can get the method name of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#method}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const method = c.req.method // `GET`
   * })
   * ```
   */
  get method() {
    return this.raw.method;
  }
  get [GET_MATCH_RESULT]() {
    return this.#matchResult;
  }
  /**
   * `.matchedRoutes()` can return a matched route in the handler
   *
   * @deprecated
   *
   * Use matchedRoutes helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#matchedroutes}
   *
   * @example
   * ```ts
   * app.use('*', async function logger(c, next) {
   *   await next()
   *   c.req.matchedRoutes.forEach(({ handler, method, path }, i) => {
   *     const name = handler.name || (handler.length < 2 ? '[handler]' : '[middleware]')
   *     console.log(
   *       method,
   *       ' ',
   *       path,
   *       ' '.repeat(Math.max(10 - path.length, 0)),
   *       name,
   *       i === c.req.routeIndex ? '<- respond from here' : ''
   *     )
   *   })
   * })
   * ```
   */
  get matchedRoutes() {
    return this.#matchResult[0].map(([[, route]]) => route);
  }
  /**
   * `routePath()` can retrieve the path registered within the handler
   *
   * @deprecated
   *
   * Use routePath helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#routepath}
   *
   * @example
   * ```ts
   * app.get('/posts/:id', (c) => {
   *   return c.json({ path: c.req.routePath })
   * })
   * ```
   */
  get routePath() {
    return this.#matchResult[0].map(([[, route]]) => route)[this.routeIndex]
      .path;
  }
};

// node_modules/hono/dist/utils/html.js
var HtmlEscapedCallbackPhase = {
  Stringify: 1,
  BeforeStream: 2,
  Stream: 3,
};
var raw = /* @__PURE__ */ __name((value, callbacks) => {
  const escapedString = new String(value);
  escapedString.isEscaped = true;
  escapedString.callbacks = callbacks;
  return escapedString;
}, "raw");
var resolveCallback = /* @__PURE__ */ __name(
  async (str, phase, preserveCallbacks, context, buffer) => {
    if (typeof str === "object" && !(str instanceof String)) {
      if (!(str instanceof Promise)) {
        str = str.toString();
      }
      if (str instanceof Promise) {
        str = await str;
      }
    }
    const callbacks = str.callbacks;
    if (!callbacks?.length) {
      return Promise.resolve(str);
    }
    if (buffer) {
      buffer[0] += str;
    } else {
      buffer = [str];
    }
    const resStr = Promise.all(
      callbacks.map(c => c({ phase, buffer, context }))
    ).then(res =>
      Promise.all(
        res
          .filter(Boolean)
          .map(str2 => resolveCallback(str2, phase, false, context, buffer))
      ).then(() => buffer[0])
    );
    if (preserveCallbacks) {
      return raw(await resStr, callbacks);
    } else {
      return resStr;
    }
  },
  "resolveCallback"
);

// node_modules/hono/dist/context.js
var TEXT_PLAIN = "text/plain; charset=UTF-8";
var setDefaultContentType = /* @__PURE__ */ __name((contentType, headers) => {
  return {
    "Content-Type": contentType,
    ...headers,
  };
}, "setDefaultContentType");
var createResponseInstance = /* @__PURE__ */ __name(
  (body, init) => new Response(body, init),
  "createResponseInstance"
);
var Context = class {
  static {
    __name(this, "Context");
  }
  #rawRequest;
  #req;
  /**
   * `.env` can get bindings (environment variables, secrets, KV namespaces, D1 database, R2 bucket etc.) in Cloudflare Workers.
   *
   * @see {@link https://hono.dev/docs/api/context#env}
   *
   * @example
   * ```ts
   * // Environment object for Cloudflare Workers
   * app.get('*', async c => {
   *   const counter = c.env.COUNTER
   * })
   * ```
   */
  env = {};
  #var;
  finalized = false;
  /**
   * `.error` can get the error object from the middleware if the Handler throws an error.
   *
   * @see {@link https://hono.dev/docs/api/context#error}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   await next()
   *   if (c.error) {
   *     // do something...
   *   }
   * })
   * ```
   */
  error;
  #status;
  #executionCtx;
  #res;
  #layout;
  #renderer;
  #notFoundHandler;
  #preparedHeaders;
  #matchResult;
  #path;
  /**
   * Creates an instance of the Context class.
   *
   * @param req - The Request object.
   * @param options - Optional configuration options for the context.
   */
  constructor(req, options) {
    this.#rawRequest = req;
    if (options) {
      this.#executionCtx = options.executionCtx;
      this.env = options.env;
      this.#notFoundHandler = options.notFoundHandler;
      this.#path = options.path;
      this.#matchResult = options.matchResult;
    }
  }
  /**
   * `.req` is the instance of {@link HonoRequest}.
   */
  get req() {
    this.#req ??= new HonoRequest(
      this.#rawRequest,
      this.#path,
      this.#matchResult
    );
    return this.#req;
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#event}
   * The FetchEvent associated with the current request.
   *
   * @throws Will throw an error if the context does not have a FetchEvent.
   */
  get event() {
    if (this.#executionCtx && "respondWith" in this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no FetchEvent");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#executionctx}
   * The ExecutionContext associated with the current request.
   *
   * @throws Will throw an error if the context does not have an ExecutionContext.
   */
  get executionCtx() {
    if (this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no ExecutionContext");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#res}
   * The Response object for the current request.
   */
  get res() {
    return (this.#res ||= createResponseInstance(null, {
      headers: (this.#preparedHeaders ??= new Headers()),
    }));
  }
  /**
   * Sets the Response object for the current request.
   *
   * @param _res - The Response object to set.
   */
  set res(_res) {
    if (this.#res && _res) {
      _res = createResponseInstance(_res.body, _res);
      for (const [k, v] of this.#res.headers.entries()) {
        if (k === "content-type") {
          continue;
        }
        if (k === "set-cookie") {
          const cookies = this.#res.headers.getSetCookie();
          _res.headers.delete("set-cookie");
          for (const cookie of cookies) {
            _res.headers.append("set-cookie", cookie);
          }
        } else {
          _res.headers.set(k, v);
        }
      }
    }
    this.#res = _res;
    this.finalized = true;
  }
  /**
   * `.render()` can create a response within a layout.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   return c.render('Hello!')
   * })
   * ```
   */
  render = /* @__PURE__ */ __name((...args) => {
    this.#renderer ??= content => this.html(content);
    return this.#renderer(...args);
  }, "render");
  /**
   * Sets the layout for the response.
   *
   * @param layout - The layout to set.
   * @returns The layout function.
   */
  setLayout = /* @__PURE__ */ __name(
    layout => (this.#layout = layout),
    "setLayout"
  );
  /**
   * Gets the current layout for the response.
   *
   * @returns The current layout function.
   */
  getLayout = /* @__PURE__ */ __name(() => this.#layout, "getLayout");
  /**
   * `.setRenderer()` can set the layout in the custom middleware.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```tsx
   * app.use('*', async (c, next) => {
   *   c.setRenderer((content) => {
   *     return c.html(
   *       <html>
   *         <body>
   *           <p>{content}</p>
   *         </body>
   *       </html>
   *     )
   *   })
   *   await next()
   * })
   * ```
   */
  setRenderer = /* @__PURE__ */ __name(renderer => {
    this.#renderer = renderer;
  }, "setRenderer");
  /**
   * `.header()` can set headers.
   *
   * @see {@link https://hono.dev/docs/api/context#header}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  header = /* @__PURE__ */ __name((name, value, options) => {
    if (this.finalized) {
      this.#res = createResponseInstance(this.#res.body, this.#res);
    }
    const headers = this.#res
      ? this.#res.headers
      : (this.#preparedHeaders ??= new Headers());
    if (value === void 0) {
      headers.delete(name);
    } else if (options?.append) {
      headers.append(name, value);
    } else {
      headers.set(name, value);
    }
  }, "header");
  status = /* @__PURE__ */ __name(status => {
    this.#status = status;
  }, "status");
  /**
   * `.set()` can set the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   c.set('message', 'Hono is hot!!')
   *   await next()
   * })
   * ```
   */
  set = /* @__PURE__ */ __name((key, value) => {
    this.#var ??= /* @__PURE__ */ new Map();
    this.#var.set(key, value);
  }, "set");
  /**
   * `.get()` can use the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   const message = c.get('message')
   *   return c.text(`The message is "${message}"`)
   * })
   * ```
   */
  get = /* @__PURE__ */ __name(key => {
    return this.#var ? this.#var.get(key) : void 0;
  }, "get");
  /**
   * `.var` can access the value of a variable.
   *
   * @see {@link https://hono.dev/docs/api/context#var}
   *
   * @example
   * ```ts
   * const result = c.var.client.oneMethod()
   * ```
   */
  // c.var.propName is a read-only
  get var() {
    if (!this.#var) {
      return {};
    }
    return Object.fromEntries(this.#var);
  }
  #newResponse(data, arg, headers) {
    const responseHeaders = this.#res
      ? new Headers(this.#res.headers)
      : this.#preparedHeaders ?? new Headers();
    if (typeof arg === "object" && "headers" in arg) {
      const argHeaders =
        arg.headers instanceof Headers ? arg.headers : new Headers(arg.headers);
      for (const [key, value] of argHeaders) {
        if (key.toLowerCase() === "set-cookie") {
          responseHeaders.append(key, value);
        } else {
          responseHeaders.set(key, value);
        }
      }
    }
    if (headers) {
      for (const [k, v] of Object.entries(headers)) {
        if (typeof v === "string") {
          responseHeaders.set(k, v);
        } else {
          responseHeaders.delete(k);
          for (const v2 of v) {
            responseHeaders.append(k, v2);
          }
        }
      }
    }
    const status = typeof arg === "number" ? arg : arg?.status ?? this.#status;
    return createResponseInstance(data, { status, headers: responseHeaders });
  }
  newResponse = /* @__PURE__ */ __name(
    (...args) => this.#newResponse(...args),
    "newResponse"
  );
  /**
   * `.body()` can return the HTTP response.
   * You can set headers with `.header()` and set HTTP status code with `.status`.
   * This can also be set in `.text()`, `.json()` and so on.
   *
   * @see {@link https://hono.dev/docs/api/context#body}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *   // Set HTTP status code
   *   c.status(201)
   *
   *   // Return the response body
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  body = /* @__PURE__ */ __name(
    (data, arg, headers) => this.#newResponse(data, arg, headers),
    "body"
  );
  /**
   * `.text()` can render text as `Content-Type:text/plain`.
   *
   * @see {@link https://hono.dev/docs/api/context#text}
   *
   * @example
   * ```ts
   * app.get('/say', (c) => {
   *   return c.text('Hello!')
   * })
   * ```
   */
  text = /* @__PURE__ */ __name((text, arg, headers) => {
    return !this.#preparedHeaders &&
      !this.#status &&
      !arg &&
      !headers &&
      !this.finalized
      ? new Response(text)
      : this.#newResponse(
          text,
          arg,
          setDefaultContentType(TEXT_PLAIN, headers)
        );
  }, "text");
  /**
   * `.json()` can render JSON as `Content-Type:application/json`.
   *
   * @see {@link https://hono.dev/docs/api/context#json}
   *
   * @example
   * ```ts
   * app.get('/api', (c) => {
   *   return c.json({ message: 'Hello!' })
   * })
   * ```
   */
  json = /* @__PURE__ */ __name((object, arg, headers) => {
    return this.#newResponse(
      JSON.stringify(object),
      arg,
      setDefaultContentType("application/json", headers)
    );
  }, "json");
  html = /* @__PURE__ */ __name((html, arg, headers) => {
    const res = /* @__PURE__ */ __name(
      html2 =>
        this.#newResponse(
          html2,
          arg,
          setDefaultContentType("text/html; charset=UTF-8", headers)
        ),
      "res"
    );
    return typeof html === "object"
      ? resolveCallback(
          html,
          HtmlEscapedCallbackPhase.Stringify,
          false,
          {}
        ).then(res)
      : res(html);
  }, "html");
  /**
   * `.redirect()` can Redirect, default status code is 302.
   *
   * @see {@link https://hono.dev/docs/api/context#redirect}
   *
   * @example
   * ```ts
   * app.get('/redirect', (c) => {
   *   return c.redirect('/')
   * })
   * app.get('/redirect-permanently', (c) => {
   *   return c.redirect('/', 301)
   * })
   * ```
   */
  redirect = /* @__PURE__ */ __name((location, status) => {
    const locationString = String(location);
    this.header(
      "Location",
      // Multibyes should be encoded
      // eslint-disable-next-line no-control-regex
      !/[^\x00-\xFF]/.test(locationString)
        ? locationString
        : encodeURI(locationString)
    );
    return this.newResponse(null, status ?? 302);
  }, "redirect");
  /**
   * `.notFound()` can return the Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/context#notfound}
   *
   * @example
   * ```ts
   * app.get('/notfound', (c) => {
   *   return c.notFound()
   * })
   * ```
   */
  notFound = /* @__PURE__ */ __name(() => {
    this.#notFoundHandler ??= () => createResponseInstance();
    return this.#notFoundHandler(this);
  }, "notFound");
};

// node_modules/hono/dist/router.js
var METHOD_NAME_ALL = "ALL";
var METHOD_NAME_ALL_LOWERCASE = "all";
var METHODS = ["get", "post", "put", "delete", "options", "patch"];
var MESSAGE_MATCHER_IS_ALREADY_BUILT =
  "Can not add a route since the matcher is already built.";
var UnsupportedPathError = class extends Error {
  static {
    __name(this, "UnsupportedPathError");
  }
};

// node_modules/hono/dist/utils/constants.js
var COMPOSED_HANDLER = "__COMPOSED_HANDLER";

// node_modules/hono/dist/hono-base.js
var notFoundHandler = /* @__PURE__ */ __name(c => {
  return c.text("404 Not Found", 404);
}, "notFoundHandler");
var errorHandler = /* @__PURE__ */ __name((err, c) => {
  if ("getResponse" in err) {
    const res = err.getResponse();
    return c.newResponse(res.body, res);
  }
  console.error(err);
  return c.text("Internal Server Error", 500);
}, "errorHandler");
var Hono = class _Hono {
  static {
    __name(this, "_Hono");
  }
  get;
  post;
  put;
  delete;
  options;
  patch;
  all;
  on;
  use;
  /*
    This class is like an abstract class and does not have a router.
    To use it, inherit the class and implement router in the constructor.
  */
  router;
  getPath;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  _basePath = "/";
  #path = "/";
  routes = [];
  constructor(options = {}) {
    const allMethods = [...METHODS, METHOD_NAME_ALL_LOWERCASE];
    allMethods.forEach(method => {
      this[method] = (args1, ...args) => {
        if (typeof args1 === "string") {
          this.#path = args1;
        } else {
          this.#addRoute(method, this.#path, args1);
        }
        args.forEach(handler => {
          this.#addRoute(method, this.#path, handler);
        });
        return this;
      };
    });
    this.on = (method, path, ...handlers) => {
      for (const p of [path].flat()) {
        this.#path = p;
        for (const m of [method].flat()) {
          handlers.map(handler => {
            this.#addRoute(m.toUpperCase(), this.#path, handler);
          });
        }
      }
      return this;
    };
    this.use = (arg1, ...handlers) => {
      if (typeof arg1 === "string") {
        this.#path = arg1;
      } else {
        this.#path = "*";
        handlers.unshift(arg1);
      }
      handlers.forEach(handler => {
        this.#addRoute(METHOD_NAME_ALL, this.#path, handler);
      });
      return this;
    };
    const { strict, ...optionsWithoutStrict } = options;
    Object.assign(this, optionsWithoutStrict);
    this.getPath =
      strict ?? true ? options.getPath ?? getPath : getPathNoStrict;
  }
  #clone() {
    const clone = new _Hono({
      router: this.router,
      getPath: this.getPath,
    });
    clone.errorHandler = this.errorHandler;
    clone.#notFoundHandler = this.#notFoundHandler;
    clone.routes = this.routes;
    return clone;
  }
  #notFoundHandler = notFoundHandler;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  errorHandler = errorHandler;
  /**
   * `.route()` allows grouping other Hono instance in routes.
   *
   * @see {@link https://hono.dev/docs/api/routing#grouping}
   *
   * @param {string} path - base Path
   * @param {Hono} app - other Hono instance
   * @returns {Hono} routed Hono instance
   *
   * @example
   * ```ts
   * const app = new Hono()
   * const app2 = new Hono()
   *
   * app2.get("/user", (c) => c.text("user"))
   * app.route("/api", app2) // GET /api/user
   * ```
   */
  route(path, app2) {
    const subApp = this.basePath(path);
    app2.routes.map(r => {
      let handler;
      if (app2.errorHandler === errorHandler) {
        handler = r.handler;
      } else {
        handler = /* @__PURE__ */ __name(
          async (c, next) =>
            (await compose([], app2.errorHandler)(c, () => r.handler(c, next)))
              .res,
          "handler"
        );
        handler[COMPOSED_HANDLER] = r.handler;
      }
      subApp.#addRoute(r.method, r.path, handler);
    });
    return this;
  }
  /**
   * `.basePath()` allows base paths to be specified.
   *
   * @see {@link https://hono.dev/docs/api/routing#base-path}
   *
   * @param {string} path - base Path
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * const api = new Hono().basePath('/api')
   * ```
   */
  basePath(path) {
    const subApp = this.#clone();
    subApp._basePath = mergePath(this._basePath, path);
    return subApp;
  }
  /**
   * `.onError()` handles an error and returns a customized Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#error-handling}
   *
   * @param {ErrorHandler} handler - request Handler for error
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.onError((err, c) => {
   *   console.error(`${err}`)
   *   return c.text('Custom Error Message', 500)
   * })
   * ```
   */
  onError = /* @__PURE__ */ __name(handler => {
    this.errorHandler = handler;
    return this;
  }, "onError");
  /**
   * `.notFound()` allows you to customize a Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#not-found}
   *
   * @param {NotFoundHandler} handler - request handler for not-found
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.notFound((c) => {
   *   return c.text('Custom 404 Message', 404)
   * })
   * ```
   */
  notFound = /* @__PURE__ */ __name(handler => {
    this.#notFoundHandler = handler;
    return this;
  }, "notFound");
  /**
   * `.mount()` allows you to mount applications built with other frameworks into your Hono application.
   *
   * @see {@link https://hono.dev/docs/api/hono#mount}
   *
   * @param {string} path - base Path
   * @param {Function} applicationHandler - other Request Handler
   * @param {MountOptions} [options] - options of `.mount()`
   * @returns {Hono} mounted Hono instance
   *
   * @example
   * ```ts
   * import { Router as IttyRouter } from 'itty-router'
   * import { Hono } from 'hono'
   * // Create itty-router application
   * const ittyRouter = IttyRouter()
   * // GET /itty-router/hello
   * ittyRouter.get('/hello', () => new Response('Hello from itty-router'))
   *
   * const app = new Hono()
   * app.mount('/itty-router', ittyRouter.handle)
   * ```
   *
   * @example
   * ```ts
   * const app = new Hono()
   * // Send the request to another application without modification.
   * app.mount('/app', anotherApp, {
   *   replaceRequest: (req) => req,
   * })
   * ```
   */
  mount(path, applicationHandler, options) {
    let replaceRequest;
    let optionHandler;
    if (options) {
      if (typeof options === "function") {
        optionHandler = options;
      } else {
        optionHandler = options.optionHandler;
        if (options.replaceRequest === false) {
          replaceRequest = /* @__PURE__ */ __name(
            request => request,
            "replaceRequest"
          );
        } else {
          replaceRequest = options.replaceRequest;
        }
      }
    }
    const getOptions = optionHandler
      ? c => {
          const options2 = optionHandler(c);
          return Array.isArray(options2) ? options2 : [options2];
        }
      : c => {
          let executionContext = void 0;
          try {
            executionContext = c.executionCtx;
          } catch {}
          return [c.env, executionContext];
        };
    replaceRequest ||= (() => {
      const mergedPath = mergePath(this._basePath, path);
      const pathPrefixLength = mergedPath === "/" ? 0 : mergedPath.length;
      return request => {
        const url = new URL(request.url);
        url.pathname = url.pathname.slice(pathPrefixLength) || "/";
        return new Request(url, request);
      };
    })();
    const handler = /* @__PURE__ */ __name(async (c, next) => {
      const res = await applicationHandler(
        replaceRequest(c.req.raw),
        ...getOptions(c)
      );
      if (res) {
        return res;
      }
      await next();
    }, "handler");
    this.#addRoute(METHOD_NAME_ALL, mergePath(path, "*"), handler);
    return this;
  }
  #addRoute(method, path, handler) {
    method = method.toUpperCase();
    path = mergePath(this._basePath, path);
    const r = { basePath: this._basePath, path, method, handler };
    this.router.add(method, path, [handler, r]);
    this.routes.push(r);
  }
  #handleError(err, c) {
    if (err instanceof Error) {
      return this.errorHandler(err, c);
    }
    throw err;
  }
  #dispatch(request, executionCtx, env, method) {
    if (method === "HEAD") {
      return (async () =>
        new Response(
          null,
          await this.#dispatch(request, executionCtx, env, "GET")
        ))();
    }
    const path = this.getPath(request, { env });
    const matchResult = this.router.match(method, path);
    const c = new Context(request, {
      path,
      matchResult,
      env,
      executionCtx,
      notFoundHandler: this.#notFoundHandler,
    });
    if (matchResult[0].length === 1) {
      let res;
      try {
        res = matchResult[0][0][0][0](c, async () => {
          c.res = await this.#notFoundHandler(c);
        });
      } catch (err) {
        return this.#handleError(err, c);
      }
      return res instanceof Promise
        ? res
            .then(
              resolved =>
                resolved || (c.finalized ? c.res : this.#notFoundHandler(c))
            )
            .catch(err => this.#handleError(err, c))
        : res ?? this.#notFoundHandler(c);
    }
    const composed = compose(
      matchResult[0],
      this.errorHandler,
      this.#notFoundHandler
    );
    return (async () => {
      try {
        const context = await composed(c);
        if (!context.finalized) {
          throw new Error(
            "Context is not finalized. Did you forget to return a Response object or `await next()`?"
          );
        }
        return context.res;
      } catch (err) {
        return this.#handleError(err, c);
      }
    })();
  }
  /**
   * `.fetch()` will be entry point of your app.
   *
   * @see {@link https://hono.dev/docs/api/hono#fetch}
   *
   * @param {Request} request - request Object of request
   * @param {Env} Env - env Object
   * @param {ExecutionContext} - context of execution
   * @returns {Response | Promise<Response>} response of request
   *
   */
  fetch = /* @__PURE__ */ __name((request, ...rest) => {
    return this.#dispatch(request, rest[1], rest[0], request.method);
  }, "fetch");
  /**
   * `.request()` is a useful method for testing.
   * You can pass a URL or pathname to send a GET request.
   * app will return a Response object.
   * ```ts
   * test('GET /hello is ok', async () => {
   *   const res = await app.request('/hello')
   *   expect(res.status).toBe(200)
   * })
   * ```
   * @see https://hono.dev/docs/api/hono#request
   */
  request = /* @__PURE__ */ __name((input, requestInit, Env, executionCtx) => {
    if (input instanceof Request) {
      return this.fetch(
        requestInit ? new Request(input, requestInit) : input,
        Env,
        executionCtx
      );
    }
    input = input.toString();
    return this.fetch(
      new Request(
        /^https?:\/\//.test(input)
          ? input
          : `http://localhost${mergePath("/", input)}`,
        requestInit
      ),
      Env,
      executionCtx
    );
  }, "request");
  /**
   * `.fire()` automatically adds a global fetch event listener.
   * This can be useful for environments that adhere to the Service Worker API, such as non-ES module Cloudflare Workers.
   * @deprecated
   * Use `fire` from `hono/service-worker` instead.
   * ```ts
   * import { Hono } from 'hono'
   * import { fire } from 'hono/service-worker'
   *
   * const app = new Hono()
   * // ...
   * fire(app)
   * ```
   * @see https://hono.dev/docs/api/hono#fire
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
   * @see https://developers.cloudflare.com/workers/reference/migrate-to-module-workers/
   */
  fire = /* @__PURE__ */ __name(() => {
    addEventListener("fetch", event => {
      event.respondWith(
        this.#dispatch(event.request, event, void 0, event.request.method)
      );
    });
  }, "fire");
};

// node_modules/hono/dist/router/reg-exp-router/matcher.js
var emptyParam = [];
function match(method, path) {
  const matchers = this.buildAllMatchers();
  const match2 = /* @__PURE__ */ __name((method2, path2) => {
    const matcher = matchers[method2] || matchers[METHOD_NAME_ALL];
    const staticMatch = matcher[2][path2];
    if (staticMatch) {
      return staticMatch;
    }
    const match3 = path2.match(matcher[0]);
    if (!match3) {
      return [[], emptyParam];
    }
    const index = match3.indexOf("", 1);
    return [matcher[1][index], match3];
  }, "match2");
  this.match = match2;
  return match2(method, path);
}
__name(match, "match");

// node_modules/hono/dist/router/reg-exp-router/node.js
var LABEL_REG_EXP_STR = "[^/]+";
var ONLY_WILDCARD_REG_EXP_STR = ".*";
var TAIL_WILDCARD_REG_EXP_STR = "(?:|/.*)";
var PATH_ERROR = /* @__PURE__ */ Symbol();
var regExpMetaChars = new Set(".\\+*[^]$()");
function compareKey(a, b) {
  if (a.length === 1) {
    return b.length === 1 ? (a < b ? -1 : 1) : -1;
  }
  if (b.length === 1) {
    return 1;
  }
  if (a === ONLY_WILDCARD_REG_EXP_STR || a === TAIL_WILDCARD_REG_EXP_STR) {
    return 1;
  } else if (
    b === ONLY_WILDCARD_REG_EXP_STR ||
    b === TAIL_WILDCARD_REG_EXP_STR
  ) {
    return -1;
  }
  if (a === LABEL_REG_EXP_STR) {
    return 1;
  } else if (b === LABEL_REG_EXP_STR) {
    return -1;
  }
  return a.length === b.length ? (a < b ? -1 : 1) : b.length - a.length;
}
__name(compareKey, "compareKey");
var Node = class _Node {
  static {
    __name(this, "_Node");
  }
  #index;
  #varIndex;
  #children = /* @__PURE__ */ Object.create(null);
  insert(tokens, index, paramMap, context, pathErrorCheckOnly) {
    if (tokens.length === 0) {
      if (this.#index !== void 0) {
        throw PATH_ERROR;
      }
      if (pathErrorCheckOnly) {
        return;
      }
      this.#index = index;
      return;
    }
    const [token, ...restTokens] = tokens;
    const pattern =
      token === "*"
        ? restTokens.length === 0
          ? ["", "", ONLY_WILDCARD_REG_EXP_STR]
          : ["", "", LABEL_REG_EXP_STR]
        : token === "/*"
        ? ["", "", TAIL_WILDCARD_REG_EXP_STR]
        : token.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
    let node;
    if (pattern) {
      const name = pattern[1];
      let regexpStr = pattern[2] || LABEL_REG_EXP_STR;
      if (name && pattern[2]) {
        if (regexpStr === ".*") {
          throw PATH_ERROR;
        }
        regexpStr = regexpStr.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:");
        if (/\((?!\?:)/.test(regexpStr)) {
          throw PATH_ERROR;
        }
      }
      node = this.#children[regexpStr];
      if (!node) {
        if (
          Object.keys(this.#children).some(
            k =>
              k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
          )
        ) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[regexpStr] = new _Node();
        if (name !== "") {
          node.#varIndex = context.varIndex++;
        }
      }
      if (!pathErrorCheckOnly && name !== "") {
        paramMap.push([name, node.#varIndex]);
      }
    } else {
      node = this.#children[token];
      if (!node) {
        if (
          Object.keys(this.#children).some(
            k =>
              k.length > 1 &&
              k !== ONLY_WILDCARD_REG_EXP_STR &&
              k !== TAIL_WILDCARD_REG_EXP_STR
          )
        ) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[token] = new _Node();
      }
    }
    node.insert(restTokens, index, paramMap, context, pathErrorCheckOnly);
  }
  buildRegExpStr() {
    const childKeys = Object.keys(this.#children).sort(compareKey);
    const strList = childKeys.map(k => {
      const c = this.#children[k];
      return (
        (typeof c.#varIndex === "number"
          ? `(${k})@${c.#varIndex}`
          : regExpMetaChars.has(k)
          ? `\\${k}`
          : k) + c.buildRegExpStr()
      );
    });
    if (typeof this.#index === "number") {
      strList.unshift(`#${this.#index}`);
    }
    if (strList.length === 0) {
      return "";
    }
    if (strList.length === 1) {
      return strList[0];
    }
    return "(?:" + strList.join("|") + ")";
  }
};

// node_modules/hono/dist/router/reg-exp-router/trie.js
var Trie = class {
  static {
    __name(this, "Trie");
  }
  #context = { varIndex: 0 };
  #root = new Node();
  insert(path, index, pathErrorCheckOnly) {
    const paramAssoc = [];
    const groups = [];
    for (let i = 0; ; ) {
      let replaced = false;
      path = path.replace(/\{[^}]+\}/g, m => {
        const mark = `@\\${i}`;
        groups[i] = [mark, m];
        i++;
        replaced = true;
        return mark;
      });
      if (!replaced) {
        break;
      }
    }
    const tokens = path.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
    for (let i = groups.length - 1; i >= 0; i--) {
      const [mark] = groups[i];
      for (let j = tokens.length - 1; j >= 0; j--) {
        if (tokens[j].indexOf(mark) !== -1) {
          tokens[j] = tokens[j].replace(mark, groups[i][1]);
          break;
        }
      }
    }
    this.#root.insert(
      tokens,
      index,
      paramAssoc,
      this.#context,
      pathErrorCheckOnly
    );
    return paramAssoc;
  }
  buildRegExp() {
    let regexp = this.#root.buildRegExpStr();
    if (regexp === "") {
      return [/^$/, [], []];
    }
    let captureIndex = 0;
    const indexReplacementMap = [];
    const paramReplacementMap = [];
    regexp = regexp.replace(
      /#(\d+)|@(\d+)|\.\*\$/g,
      (_, handlerIndex, paramIndex) => {
        if (handlerIndex !== void 0) {
          indexReplacementMap[++captureIndex] = Number(handlerIndex);
          return "$()";
        }
        if (paramIndex !== void 0) {
          paramReplacementMap[Number(paramIndex)] = ++captureIndex;
          return "";
        }
        return "";
      }
    );
    return [new RegExp(`^${regexp}`), indexReplacementMap, paramReplacementMap];
  }
};

// node_modules/hono/dist/router/reg-exp-router/router.js
var nullMatcher = [/^$/, [], /* @__PURE__ */ Object.create(null)];
var wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
function buildWildcardRegExp(path) {
  return (wildcardRegExpCache[path] ??= new RegExp(
    path === "*"
      ? ""
      : `^${path.replace(/\/\*$|([.\\+*[^\]$()])/g, (_, metaChar) =>
          metaChar ? `\\${metaChar}` : "(?:|/.*)"
        )}$`
  ));
}
__name(buildWildcardRegExp, "buildWildcardRegExp");
function clearWildcardRegExpCache() {
  wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
}
__name(clearWildcardRegExpCache, "clearWildcardRegExpCache");
function buildMatcherFromPreprocessedRoutes(routes) {
  const trie = new Trie();
  const handlerData = [];
  if (routes.length === 0) {
    return nullMatcher;
  }
  const routesWithStaticPathFlag = routes
    .map(route => [!/\*|\/:/.test(route[0]), ...route])
    .sort(([isStaticA, pathA], [isStaticB, pathB]) =>
      isStaticA ? 1 : isStaticB ? -1 : pathA.length - pathB.length
    );
  const staticMap = /* @__PURE__ */ Object.create(null);
  for (let i = 0, j = -1, len = routesWithStaticPathFlag.length; i < len; i++) {
    const [pathErrorCheckOnly, path, handlers] = routesWithStaticPathFlag[i];
    if (pathErrorCheckOnly) {
      staticMap[path] = [
        handlers.map(([h]) => [h, /* @__PURE__ */ Object.create(null)]),
        emptyParam,
      ];
    } else {
      j++;
    }
    let paramAssoc;
    try {
      paramAssoc = trie.insert(path, j, pathErrorCheckOnly);
    } catch (e) {
      throw e === PATH_ERROR ? new UnsupportedPathError(path) : e;
    }
    if (pathErrorCheckOnly) {
      continue;
    }
    handlerData[j] = handlers.map(([h, paramCount]) => {
      const paramIndexMap = /* @__PURE__ */ Object.create(null);
      paramCount -= 1;
      for (; paramCount >= 0; paramCount--) {
        const [key, value] = paramAssoc[paramCount];
        paramIndexMap[key] = value;
      }
      return [h, paramIndexMap];
    });
  }
  const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp();
  for (let i = 0, len = handlerData.length; i < len; i++) {
    for (let j = 0, len2 = handlerData[i].length; j < len2; j++) {
      const map = handlerData[i][j]?.[1];
      if (!map) {
        continue;
      }
      const keys = Object.keys(map);
      for (let k = 0, len3 = keys.length; k < len3; k++) {
        map[keys[k]] = paramReplacementMap[map[keys[k]]];
      }
    }
  }
  const handlerMap = [];
  for (const i in indexReplacementMap) {
    handlerMap[i] = handlerData[indexReplacementMap[i]];
  }
  return [regexp, handlerMap, staticMap];
}
__name(
  buildMatcherFromPreprocessedRoutes,
  "buildMatcherFromPreprocessedRoutes"
);
function findMiddleware(middleware, path) {
  if (!middleware) {
    return void 0;
  }
  for (const k of Object.keys(middleware).sort((a, b) => b.length - a.length)) {
    if (buildWildcardRegExp(k).test(path)) {
      return [...middleware[k]];
    }
  }
  return void 0;
}
__name(findMiddleware, "findMiddleware");
var RegExpRouter = class {
  static {
    __name(this, "RegExpRouter");
  }
  name = "RegExpRouter";
  #middleware;
  #routes;
  constructor() {
    this.#middleware = {
      [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null),
    };
    this.#routes = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
  }
  add(method, path, handler) {
    const middleware = this.#middleware;
    const routes = this.#routes;
    if (!middleware || !routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    if (!middleware[method]) {
      [middleware, routes].forEach(handlerMap => {
        handlerMap[method] = /* @__PURE__ */ Object.create(null);
        Object.keys(handlerMap[METHOD_NAME_ALL]).forEach(p => {
          handlerMap[method][p] = [...handlerMap[METHOD_NAME_ALL][p]];
        });
      });
    }
    if (path === "/*") {
      path = "*";
    }
    const paramCount = (path.match(/\/:/g) || []).length;
    if (/\*$/.test(path)) {
      const re = buildWildcardRegExp(path);
      if (method === METHOD_NAME_ALL) {
        Object.keys(middleware).forEach(m => {
          middleware[m][path] ||=
            findMiddleware(middleware[m], path) ||
            findMiddleware(middleware[METHOD_NAME_ALL], path) ||
            [];
        });
      } else {
        middleware[method][path] ||=
          findMiddleware(middleware[method], path) ||
          findMiddleware(middleware[METHOD_NAME_ALL], path) ||
          [];
      }
      Object.keys(middleware).forEach(m => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(middleware[m]).forEach(p => {
            re.test(p) && middleware[m][p].push([handler, paramCount]);
          });
        }
      });
      Object.keys(routes).forEach(m => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(routes[m]).forEach(
            p => re.test(p) && routes[m][p].push([handler, paramCount])
          );
        }
      });
      return;
    }
    const paths = checkOptionalParameter(path) || [path];
    for (let i = 0, len = paths.length; i < len; i++) {
      const path2 = paths[i];
      Object.keys(routes).forEach(m => {
        if (method === METHOD_NAME_ALL || method === m) {
          routes[m][path2] ||= [
            ...(findMiddleware(middleware[m], path2) ||
              findMiddleware(middleware[METHOD_NAME_ALL], path2) ||
              []),
          ];
          routes[m][path2].push([handler, paramCount - len + i + 1]);
        }
      });
    }
  }
  match = match;
  buildAllMatchers() {
    const matchers = /* @__PURE__ */ Object.create(null);
    Object.keys(this.#routes)
      .concat(Object.keys(this.#middleware))
      .forEach(method => {
        matchers[method] ||= this.#buildMatcher(method);
      });
    this.#middleware = this.#routes = void 0;
    clearWildcardRegExpCache();
    return matchers;
  }
  #buildMatcher(method) {
    const routes = [];
    let hasOwnRoute = method === METHOD_NAME_ALL;
    [this.#middleware, this.#routes].forEach(r => {
      const ownRoute = r[method]
        ? Object.keys(r[method]).map(path => [path, r[method][path]])
        : [];
      if (ownRoute.length !== 0) {
        hasOwnRoute ||= true;
        routes.push(...ownRoute);
      } else if (method !== METHOD_NAME_ALL) {
        routes.push(
          ...Object.keys(r[METHOD_NAME_ALL]).map(path => [
            path,
            r[METHOD_NAME_ALL][path],
          ])
        );
      }
    });
    if (!hasOwnRoute) {
      return null;
    } else {
      return buildMatcherFromPreprocessedRoutes(routes);
    }
  }
};

// node_modules/hono/dist/router/smart-router/router.js
var SmartRouter = class {
  static {
    __name(this, "SmartRouter");
  }
  name = "SmartRouter";
  #routers = [];
  #routes = [];
  constructor(init) {
    this.#routers = init.routers;
  }
  add(method, path, handler) {
    if (!this.#routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    this.#routes.push([method, path, handler]);
  }
  match(method, path) {
    if (!this.#routes) {
      throw new Error("Fatal error");
    }
    const routers = this.#routers;
    const routes = this.#routes;
    const len = routers.length;
    let i = 0;
    let res;
    for (; i < len; i++) {
      const router = routers[i];
      try {
        for (let i2 = 0, len2 = routes.length; i2 < len2; i2++) {
          router.add(...routes[i2]);
        }
        res = router.match(method, path);
      } catch (e) {
        if (e instanceof UnsupportedPathError) {
          continue;
        }
        throw e;
      }
      this.match = router.match.bind(router);
      this.#routers = [router];
      this.#routes = void 0;
      break;
    }
    if (i === len) {
      throw new Error("Fatal error");
    }
    this.name = `SmartRouter + ${this.activeRouter.name}`;
    return res;
  }
  get activeRouter() {
    if (this.#routes || this.#routers.length !== 1) {
      throw new Error("No active router has been determined yet.");
    }
    return this.#routers[0];
  }
};

// node_modules/hono/dist/router/trie-router/node.js
var emptyParams = /* @__PURE__ */ Object.create(null);
var hasChildren = /* @__PURE__ */ __name(children => {
  for (const _ in children) {
    return true;
  }
  return false;
}, "hasChildren");
var Node2 = class _Node2 {
  static {
    __name(this, "_Node");
  }
  #methods;
  #children;
  #patterns;
  #order = 0;
  #params = emptyParams;
  constructor(method, handler, children) {
    this.#children = children || /* @__PURE__ */ Object.create(null);
    this.#methods = [];
    if (method && handler) {
      const m = /* @__PURE__ */ Object.create(null);
      m[method] = { handler, possibleKeys: [], score: 0 };
      this.#methods = [m];
    }
    this.#patterns = [];
  }
  insert(method, path, handler) {
    this.#order = ++this.#order;
    let curNode = this;
    const parts = splitRoutingPath(path);
    const possibleKeys = [];
    for (let i = 0, len = parts.length; i < len; i++) {
      const p = parts[i];
      const nextP = parts[i + 1];
      const pattern = getPattern(p, nextP);
      const key = Array.isArray(pattern) ? pattern[0] : p;
      if (key in curNode.#children) {
        curNode = curNode.#children[key];
        if (pattern) {
          possibleKeys.push(pattern[1]);
        }
        continue;
      }
      curNode.#children[key] = new _Node2();
      if (pattern) {
        curNode.#patterns.push(pattern);
        possibleKeys.push(pattern[1]);
      }
      curNode = curNode.#children[key];
    }
    curNode.#methods.push({
      [method]: {
        handler,
        possibleKeys: possibleKeys.filter((v, i, a) => a.indexOf(v) === i),
        score: this.#order,
      },
    });
    return curNode;
  }
  #pushHandlerSets(handlerSets, node, method, nodeParams, params) {
    for (let i = 0, len = node.#methods.length; i < len; i++) {
      const m = node.#methods[i];
      const handlerSet = m[method] || m[METHOD_NAME_ALL];
      const processedSet = {};
      if (handlerSet !== void 0) {
        handlerSet.params = /* @__PURE__ */ Object.create(null);
        handlerSets.push(handlerSet);
        if (nodeParams !== emptyParams || (params && params !== emptyParams)) {
          for (
            let i2 = 0, len2 = handlerSet.possibleKeys.length;
            i2 < len2;
            i2++
          ) {
            const key = handlerSet.possibleKeys[i2];
            const processed = processedSet[handlerSet.score];
            handlerSet.params[key] =
              params?.[key] && !processed
                ? params[key]
                : nodeParams[key] ?? params?.[key];
            processedSet[handlerSet.score] = true;
          }
        }
      }
    }
  }
  search(method, path) {
    const handlerSets = [];
    this.#params = emptyParams;
    const curNode = this;
    let curNodes = [curNode];
    const parts = splitPath(path);
    const curNodesQueue = [];
    const len = parts.length;
    let partOffsets = null;
    for (let i = 0; i < len; i++) {
      const part = parts[i];
      const isLast = i === len - 1;
      const tempNodes = [];
      for (let j = 0, len2 = curNodes.length; j < len2; j++) {
        const node = curNodes[j];
        const nextNode = node.#children[part];
        if (nextNode) {
          nextNode.#params = node.#params;
          if (isLast) {
            if (nextNode.#children["*"]) {
              this.#pushHandlerSets(
                handlerSets,
                nextNode.#children["*"],
                method,
                node.#params
              );
            }
            this.#pushHandlerSets(handlerSets, nextNode, method, node.#params);
          } else {
            tempNodes.push(nextNode);
          }
        }
        for (let k = 0, len3 = node.#patterns.length; k < len3; k++) {
          const pattern = node.#patterns[k];
          const params =
            node.#params === emptyParams ? {} : { ...node.#params };
          if (pattern === "*") {
            const astNode = node.#children["*"];
            if (astNode) {
              this.#pushHandlerSets(handlerSets, astNode, method, node.#params);
              astNode.#params = params;
              tempNodes.push(astNode);
            }
            continue;
          }
          const [key, name, matcher] = pattern;
          if (!part && !(matcher instanceof RegExp)) {
            continue;
          }
          const child = node.#children[key];
          if (matcher instanceof RegExp) {
            if (partOffsets === null) {
              partOffsets = new Array(len);
              let offset = path[0] === "/" ? 1 : 0;
              for (let p = 0; p < len; p++) {
                partOffsets[p] = offset;
                offset += parts[p].length + 1;
              }
            }
            const restPathString = path.substring(partOffsets[i]);
            const m = matcher.exec(restPathString);
            if (m) {
              params[name] = m[0];
              this.#pushHandlerSets(
                handlerSets,
                child,
                method,
                node.#params,
                params
              );
              if (hasChildren(child.#children)) {
                child.#params = params;
                const componentCount = m[0].match(/\//)?.length ?? 0;
                const targetCurNodes = (curNodesQueue[componentCount] ||= []);
                targetCurNodes.push(child);
              }
              continue;
            }
          }
          if (matcher === true || matcher.test(part)) {
            params[name] = part;
            if (isLast) {
              this.#pushHandlerSets(
                handlerSets,
                child,
                method,
                params,
                node.#params
              );
              if (child.#children["*"]) {
                this.#pushHandlerSets(
                  handlerSets,
                  child.#children["*"],
                  method,
                  params,
                  node.#params
                );
              }
            } else {
              child.#params = params;
              tempNodes.push(child);
            }
          }
        }
      }
      const shifted = curNodesQueue.shift();
      curNodes = shifted ? tempNodes.concat(shifted) : tempNodes;
    }
    if (handlerSets.length > 1) {
      handlerSets.sort((a, b) => {
        return a.score - b.score;
      });
    }
    return [handlerSets.map(({ handler, params }) => [handler, params])];
  }
};

// node_modules/hono/dist/router/trie-router/router.js
var TrieRouter = class {
  static {
    __name(this, "TrieRouter");
  }
  name = "TrieRouter";
  #node;
  constructor() {
    this.#node = new Node2();
  }
  add(method, path, handler) {
    const results = checkOptionalParameter(path);
    if (results) {
      for (let i = 0, len = results.length; i < len; i++) {
        this.#node.insert(method, results[i], handler);
      }
      return;
    }
    this.#node.insert(method, path, handler);
  }
  match(method, path) {
    return this.#node.search(method, path);
  }
};

// node_modules/hono/dist/hono.js
var Hono2 = class extends Hono {
  static {
    __name(this, "Hono");
  }
  /**
   * Creates an instance of the Hono class.
   *
   * @param options - Optional configuration options for the Hono instance.
   */
  constructor(options = {}) {
    super(options);
    this.router =
      options.router ??
      new SmartRouter({
        routers: [new RegExpRouter(), new TrieRouter()],
      });
  }
};

// node_modules/hono/dist/middleware/cors/index.js
var cors = /* @__PURE__ */ __name(options => {
  const defaults = {
    origin: "*",
    allowMethods: ["GET", "HEAD", "PUT", "POST", "DELETE", "PATCH"],
    allowHeaders: [],
    exposeHeaders: [],
  };
  const opts = {
    ...defaults,
    ...options,
  };
  const findAllowOrigin = (optsOrigin => {
    if (typeof optsOrigin === "string") {
      if (optsOrigin === "*") {
        if (opts.credentials) {
          return origin => origin || null;
        }
        return () => optsOrigin;
      } else {
        return origin => (optsOrigin === origin ? origin : null);
      }
    } else if (typeof optsOrigin === "function") {
      return optsOrigin;
    } else {
      return origin => (optsOrigin.includes(origin) ? origin : null);
    }
  })(opts.origin);
  const findAllowMethods = (optsAllowMethods => {
    if (typeof optsAllowMethods === "function") {
      return optsAllowMethods;
    } else if (Array.isArray(optsAllowMethods)) {
      return () => optsAllowMethods;
    } else {
      return () => [];
    }
  })(opts.allowMethods);
  return /* @__PURE__ */ __name(async function cors2(c, next) {
    function set(key, value) {
      c.res.headers.set(key, value);
    }
    __name(set, "set");
    const allowOrigin = await findAllowOrigin(c.req.header("origin") || "", c);
    if (allowOrigin) {
      set("Access-Control-Allow-Origin", allowOrigin);
    }
    if (opts.credentials) {
      set("Access-Control-Allow-Credentials", "true");
    }
    if (opts.exposeHeaders?.length) {
      set("Access-Control-Expose-Headers", opts.exposeHeaders.join(","));
    }
    if (c.req.method === "OPTIONS") {
      if (opts.origin !== "*" || opts.credentials) {
        set("Vary", "Origin");
      }
      if (opts.maxAge != null) {
        set("Access-Control-Max-Age", opts.maxAge.toString());
      }
      const allowMethods = await findAllowMethods(
        c.req.header("origin") || "",
        c
      );
      if (allowMethods.length) {
        set("Access-Control-Allow-Methods", allowMethods.join(","));
      }
      let headers = opts.allowHeaders;
      if (!headers?.length) {
        const requestHeaders = c.req.header("Access-Control-Request-Headers");
        if (requestHeaders) {
          headers = requestHeaders.split(/\s*,\s*/);
        }
      }
      if (headers?.length) {
        set("Access-Control-Allow-Headers", headers.join(","));
        c.res.headers.append("Vary", "Access-Control-Request-Headers");
      }
      c.res.headers.delete("Content-Length");
      c.res.headers.delete("Content-Type");
      return new Response(null, {
        headers: c.res.headers,
        status: 204,
        statusText: "No Content",
      });
    }
    await next();
    if (opts.origin !== "*" || opts.credentials) {
      c.header("Vary", "Origin", { append: true });
    }
  }, "cors2");
}, "cors");

// node_modules/bcryptjs/index.js
var import_crypto = __toESM(require_crypto(), 1);
var randomFallback = null;
function randomBytes(len) {
  try {
    return crypto.getRandomValues(new Uint8Array(len));
  } catch {}
  try {
    return import_crypto.default.randomBytes(len);
  } catch {}
  if (!randomFallback) {
    throw Error(
      "Neither WebCryptoAPI nor a crypto module is available. Use bcrypt.setRandomFallback to set an alternative"
    );
  }
  return randomFallback(len);
}
__name(randomBytes, "randomBytes");
function setRandomFallback(random) {
  randomFallback = random;
}
__name(setRandomFallback, "setRandomFallback");
function genSaltSync(rounds, seed_length) {
  rounds = rounds || GENSALT_DEFAULT_LOG2_ROUNDS;
  if (typeof rounds !== "number")
    throw Error(
      "Illegal arguments: " + typeof rounds + ", " + typeof seed_length
    );
  if (rounds < 4) rounds = 4;
  else if (rounds > 31) rounds = 31;
  var salt = [];
  salt.push("$2b$");
  if (rounds < 10) salt.push("0");
  salt.push(rounds.toString());
  salt.push("$");
  salt.push(base64_encode(randomBytes(BCRYPT_SALT_LEN), BCRYPT_SALT_LEN));
  return salt.join("");
}
__name(genSaltSync, "genSaltSync");
function genSalt(rounds, seed_length, callback) {
  if (typeof seed_length === "function")
    (callback = seed_length), (seed_length = void 0);
  if (typeof rounds === "function") (callback = rounds), (rounds = void 0);
  if (typeof rounds === "undefined") rounds = GENSALT_DEFAULT_LOG2_ROUNDS;
  else if (typeof rounds !== "number")
    throw Error("illegal arguments: " + typeof rounds);
  function _async(callback2) {
    nextTick(function () {
      try {
        callback2(null, genSaltSync(rounds));
      } catch (err) {
        callback2(err);
      }
    });
  }
  __name(_async, "_async");
  if (callback) {
    if (typeof callback !== "function")
      throw Error("Illegal callback: " + typeof callback);
    _async(callback);
  } else
    return new Promise(function (resolve, reject) {
      _async(function (err, res) {
        if (err) {
          reject(err);
          return;
        }
        resolve(res);
      });
    });
}
__name(genSalt, "genSalt");
function hashSync(password, salt) {
  if (typeof salt === "undefined") salt = GENSALT_DEFAULT_LOG2_ROUNDS;
  if (typeof salt === "number") salt = genSaltSync(salt);
  if (typeof password !== "string" || typeof salt !== "string")
    throw Error("Illegal arguments: " + typeof password + ", " + typeof salt);
  return _hash(password, salt);
}
__name(hashSync, "hashSync");
function hash(password, salt, callback, progressCallback) {
  function _async(callback2) {
    if (typeof password === "string" && typeof salt === "number")
      genSalt(salt, function (err, salt2) {
        _hash(password, salt2, callback2, progressCallback);
      });
    else if (typeof password === "string" && typeof salt === "string")
      _hash(password, salt, callback2, progressCallback);
    else
      nextTick(
        callback2.bind(
          this,
          Error("Illegal arguments: " + typeof password + ", " + typeof salt)
        )
      );
  }
  __name(_async, "_async");
  if (callback) {
    if (typeof callback !== "function")
      throw Error("Illegal callback: " + typeof callback);
    _async(callback);
  } else
    return new Promise(function (resolve, reject) {
      _async(function (err, res) {
        if (err) {
          reject(err);
          return;
        }
        resolve(res);
      });
    });
}
__name(hash, "hash");
function safeStringCompare(known, unknown) {
  var diff = known.length ^ unknown.length;
  for (var i = 0; i < known.length; ++i) {
    diff |= known.charCodeAt(i) ^ unknown.charCodeAt(i);
  }
  return diff === 0;
}
__name(safeStringCompare, "safeStringCompare");
function compareSync(password, hash2) {
  if (typeof password !== "string" || typeof hash2 !== "string")
    throw Error("Illegal arguments: " + typeof password + ", " + typeof hash2);
  if (hash2.length !== 60) return false;
  return safeStringCompare(
    hashSync(password, hash2.substring(0, hash2.length - 31)),
    hash2
  );
}
__name(compareSync, "compareSync");
function compare(password, hashValue, callback, progressCallback) {
  function _async(callback2) {
    if (typeof password !== "string" || typeof hashValue !== "string") {
      nextTick(
        callback2.bind(
          this,
          Error(
            "Illegal arguments: " + typeof password + ", " + typeof hashValue
          )
        )
      );
      return;
    }
    if (hashValue.length !== 60) {
      nextTick(callback2.bind(this, null, false));
      return;
    }
    hash(
      password,
      hashValue.substring(0, 29),
      function (err, comp) {
        if (err) callback2(err);
        else callback2(null, safeStringCompare(comp, hashValue));
      },
      progressCallback
    );
  }
  __name(_async, "_async");
  if (callback) {
    if (typeof callback !== "function")
      throw Error("Illegal callback: " + typeof callback);
    _async(callback);
  } else
    return new Promise(function (resolve, reject) {
      _async(function (err, res) {
        if (err) {
          reject(err);
          return;
        }
        resolve(res);
      });
    });
}
__name(compare, "compare");
function getRounds(hash2) {
  if (typeof hash2 !== "string")
    throw Error("Illegal arguments: " + typeof hash2);
  return parseInt(hash2.split("$")[2], 10);
}
__name(getRounds, "getRounds");
function getSalt(hash2) {
  if (typeof hash2 !== "string")
    throw Error("Illegal arguments: " + typeof hash2);
  if (hash2.length !== 60)
    throw Error("Illegal hash length: " + hash2.length + " != 60");
  return hash2.substring(0, 29);
}
__name(getSalt, "getSalt");
function truncates(password) {
  if (typeof password !== "string")
    throw Error("Illegal arguments: " + typeof password);
  return utf8Length(password) > 72;
}
__name(truncates, "truncates");
var nextTick =
  typeof setImmediate === "function"
    ? setImmediate
    : typeof scheduler === "object" && typeof scheduler.postTask === "function"
    ? scheduler.postTask.bind(scheduler)
    : setTimeout;
function utf8Length(string) {
  var len = 0,
    c = 0;
  for (var i = 0; i < string.length; ++i) {
    c = string.charCodeAt(i);
    if (c < 128) len += 1;
    else if (c < 2048) len += 2;
    else if (
      (c & 64512) === 55296 &&
      (string.charCodeAt(i + 1) & 64512) === 56320
    ) {
      ++i;
      len += 4;
    } else len += 3;
  }
  return len;
}
__name(utf8Length, "utf8Length");
function utf8Array(string) {
  var offset = 0,
    c1,
    c2;
  var buffer = new Array(utf8Length(string));
  for (var i = 0, k = string.length; i < k; ++i) {
    c1 = string.charCodeAt(i);
    if (c1 < 128) {
      buffer[offset++] = c1;
    } else if (c1 < 2048) {
      buffer[offset++] = (c1 >> 6) | 192;
      buffer[offset++] = (c1 & 63) | 128;
    } else if (
      (c1 & 64512) === 55296 &&
      ((c2 = string.charCodeAt(i + 1)) & 64512) === 56320
    ) {
      c1 = 65536 + ((c1 & 1023) << 10) + (c2 & 1023);
      ++i;
      buffer[offset++] = (c1 >> 18) | 240;
      buffer[offset++] = ((c1 >> 12) & 63) | 128;
      buffer[offset++] = ((c1 >> 6) & 63) | 128;
      buffer[offset++] = (c1 & 63) | 128;
    } else {
      buffer[offset++] = (c1 >> 12) | 224;
      buffer[offset++] = ((c1 >> 6) & 63) | 128;
      buffer[offset++] = (c1 & 63) | 128;
    }
  }
  return buffer;
}
__name(utf8Array, "utf8Array");
var BASE64_CODE =
  "./ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".split("");
var BASE64_INDEX = [
  -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
  -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
  -1, -1, -1, -1, -1, -1, -1, -1, 0, 1, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63,
  -1, -1, -1, -1, -1, -1, -1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
  16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, -1, -1, -1, -1, -1, -1, 28,
  29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47,
  48, 49, 50, 51, 52, 53, -1, -1, -1, -1, -1,
];
function base64_encode(b, len) {
  var off = 0,
    rs = [],
    c1,
    c2;
  if (len <= 0 || len > b.length) throw Error("Illegal len: " + len);
  while (off < len) {
    c1 = b[off++] & 255;
    rs.push(BASE64_CODE[(c1 >> 2) & 63]);
    c1 = (c1 & 3) << 4;
    if (off >= len) {
      rs.push(BASE64_CODE[c1 & 63]);
      break;
    }
    c2 = b[off++] & 255;
    c1 |= (c2 >> 4) & 15;
    rs.push(BASE64_CODE[c1 & 63]);
    c1 = (c2 & 15) << 2;
    if (off >= len) {
      rs.push(BASE64_CODE[c1 & 63]);
      break;
    }
    c2 = b[off++] & 255;
    c1 |= (c2 >> 6) & 3;
    rs.push(BASE64_CODE[c1 & 63]);
    rs.push(BASE64_CODE[c2 & 63]);
  }
  return rs.join("");
}
__name(base64_encode, "base64_encode");
function base64_decode(s, len) {
  var off = 0,
    slen = s.length,
    olen = 0,
    rs = [],
    c1,
    c2,
    c3,
    c4,
    o,
    code;
  if (len <= 0) throw Error("Illegal len: " + len);
  while (off < slen - 1 && olen < len) {
    code = s.charCodeAt(off++);
    c1 = code < BASE64_INDEX.length ? BASE64_INDEX[code] : -1;
    code = s.charCodeAt(off++);
    c2 = code < BASE64_INDEX.length ? BASE64_INDEX[code] : -1;
    if (c1 == -1 || c2 == -1) break;
    o = (c1 << 2) >>> 0;
    o |= (c2 & 48) >> 4;
    rs.push(String.fromCharCode(o));
    if (++olen >= len || off >= slen) break;
    code = s.charCodeAt(off++);
    c3 = code < BASE64_INDEX.length ? BASE64_INDEX[code] : -1;
    if (c3 == -1) break;
    o = ((c2 & 15) << 4) >>> 0;
    o |= (c3 & 60) >> 2;
    rs.push(String.fromCharCode(o));
    if (++olen >= len || off >= slen) break;
    code = s.charCodeAt(off++);
    c4 = code < BASE64_INDEX.length ? BASE64_INDEX[code] : -1;
    o = ((c3 & 3) << 6) >>> 0;
    o |= c4;
    rs.push(String.fromCharCode(o));
    ++olen;
  }
  var res = [];
  for (off = 0; off < olen; off++) res.push(rs[off].charCodeAt(0));
  return res;
}
__name(base64_decode, "base64_decode");
var BCRYPT_SALT_LEN = 16;
var GENSALT_DEFAULT_LOG2_ROUNDS = 10;
var BLOWFISH_NUM_ROUNDS = 16;
var MAX_EXECUTION_TIME = 100;
var P_ORIG = [
  608135816, 2242054355, 320440878, 57701188, 2752067618, 698298832, 137296536,
  3964562569, 1160258022, 953160567, 3193202383, 887688300, 3232508343,
  3380367581, 1065670069, 3041331479, 2450970073, 2306472731,
];
var S_ORIG = [
  3509652390, 2564797868, 805139163, 3491422135, 3101798381, 1780907670,
  3128725573, 4046225305, 614570311, 3012652279, 134345442, 2240740374,
  1667834072, 1901547113, 2757295779, 4103290238, 227898511, 1921955416,
  1904987480, 2182433518, 2069144605, 3260701109, 2620446009, 720527379,
  3318853667, 677414384, 3393288472, 3101374703, 2390351024, 1614419982,
  1822297739, 2954791486, 3608508353, 3174124327, 2024746970, 1432378464,
  3864339955, 2857741204, 1464375394, 1676153920, 1439316330, 715854006,
  3033291828, 289532110, 2706671279, 2087905683, 3018724369, 1668267050,
  732546397, 1947742710, 3462151702, 2609353502, 2950085171, 1814351708,
  2050118529, 680887927, 999245976, 1800124847, 3300911131, 1713906067,
  1641548236, 4213287313, 1216130144, 1575780402, 4018429277, 3917837745,
  3693486850, 3949271944, 596196993, 3549867205, 258830323, 2213823033,
  772490370, 2760122372, 1774776394, 2652871518, 566650946, 4142492826,
  1728879713, 2882767088, 1783734482, 3629395816, 2517608232, 2874225571,
  1861159788, 326777828, 3124490320, 2130389656, 2716951837, 967770486,
  1724537150, 2185432712, 2364442137, 1164943284, 2105845187, 998989502,
  3765401048, 2244026483, 1075463327, 1455516326, 1322494562, 910128902,
  469688178, 1117454909, 936433444, 3490320968, 3675253459, 1240580251,
  122909385, 2157517691, 634681816, 4142456567, 3825094682, 3061402683,
  2540495037, 79693498, 3249098678, 1084186820, 1583128258, 426386531,
  1761308591, 1047286709, 322548459, 995290223, 1845252383, 2603652396,
  3431023940, 2942221577, 3202600964, 3727903485, 1712269319, 422464435,
  3234572375, 1170764815, 3523960633, 3117677531, 1434042557, 442511882,
  3600875718, 1076654713, 1738483198, 4213154764, 2393238008, 3677496056,
  1014306527, 4251020053, 793779912, 2902807211, 842905082, 4246964064,
  1395751752, 1040244610, 2656851899, 3396308128, 445077038, 3742853595,
  3577915638, 679411651, 2892444358, 2354009459, 1767581616, 3150600392,
  3791627101, 3102740896, 284835224, 4246832056, 1258075500, 768725851,
  2589189241, 3069724005, 3532540348, 1274779536, 3789419226, 2764799539,
  1660621633, 3471099624, 4011903706, 913787905, 3497959166, 737222580,
  2514213453, 2928710040, 3937242737, 1804850592, 3499020752, 2949064160,
  2386320175, 2390070455, 2415321851, 4061277028, 2290661394, 2416832540,
  1336762016, 1754252060, 3520065937, 3014181293, 791618072, 3188594551,
  3933548030, 2332172193, 3852520463, 3043980520, 413987798, 3465142937,
  3030929376, 4245938359, 2093235073, 3534596313, 375366246, 2157278981,
  2479649556, 555357303, 3870105701, 2008414854, 3344188149, 4221384143,
  3956125452, 2067696032, 3594591187, 2921233993, 2428461, 544322398, 577241275,
  1471733935, 610547355, 4027169054, 1432588573, 1507829418, 2025931657,
  3646575487, 545086370, 48609733, 2200306550, 1653985193, 298326376,
  1316178497, 3007786442, 2064951626, 458293330, 2589141269, 3591329599,
  3164325604, 727753846, 2179363840, 146436021, 1461446943, 4069977195,
  705550613, 3059967265, 3887724982, 4281599278, 3313849956, 1404054877,
  2845806497, 146425753, 1854211946, 1266315497, 3048417604, 3681880366,
  3289982499, 290971e4, 1235738493, 2632868024, 2414719590, 3970600049,
  1771706367, 1449415276, 3266420449, 422970021, 1963543593, 2690192192,
  3826793022, 1062508698, 1531092325, 1804592342, 2583117782, 2714934279,
  4024971509, 1294809318, 4028980673, 1289560198, 2221992742, 1669523910,
  35572830, 157838143, 1052438473, 1016535060, 1802137761, 1753167236,
  1386275462, 3080475397, 2857371447, 1040679964, 2145300060, 2390574316,
  1461121720, 2956646967, 4031777805, 4028374788, 33600511, 2920084762,
  1018524850, 629373528, 3691585981, 3515945977, 2091462646, 2486323059,
  586499841, 988145025, 935516892, 3367335476, 2599673255, 2839830854,
  265290510, 3972581182, 2759138881, 3795373465, 1005194799, 847297441,
  406762289, 1314163512, 1332590856, 1866599683, 4127851711, 750260880,
  613907577, 1450815602, 3165620655, 3734664991, 3650291728, 3012275730,
  3704569646, 1427272223, 778793252, 1343938022, 2676280711, 2052605720,
  1946737175, 3164576444, 3914038668, 3967478842, 3682934266, 1661551462,
  3294938066, 4011595847, 840292616, 3712170807, 616741398, 312560963,
  711312465, 1351876610, 322626781, 1910503582, 271666773, 2175563734,
  1594956187, 70604529, 3617834859, 1007753275, 1495573769, 4069517037,
  2549218298, 2663038764, 504708206, 2263041392, 3941167025, 2249088522,
  1514023603, 1998579484, 1312622330, 694541497, 2582060303, 2151582166,
  1382467621, 776784248, 2618340202, 3323268794, 2497899128, 2784771155,
  503983604, 4076293799, 907881277, 423175695, 432175456, 1378068232,
  4145222326, 3954048622, 3938656102, 3820766613, 2793130115, 2977904593,
  26017576, 3274890735, 3194772133, 1700274565, 1756076034, 4006520079,
  3677328699, 720338349, 1533947780, 354530856, 688349552, 3973924725,
  1637815568, 332179504, 3949051286, 53804574, 2852348879, 3044236432,
  1282449977, 3583942155, 3416972820, 4006381244, 1617046695, 2628476075,
  3002303598, 1686838959, 431878346, 2686675385, 1700445008, 1080580658,
  1009431731, 832498133, 3223435511, 2605976345, 2271191193, 2516031870,
  1648197032, 4164389018, 2548247927, 300782431, 375919233, 238389289,
  3353747414, 2531188641, 2019080857, 1475708069, 455242339, 2609103871,
  448939670, 3451063019, 1395535956, 2413381860, 1841049896, 1491858159,
  885456874, 4264095073, 4001119347, 1565136089, 3898914787, 1108368660,
  540939232, 1173283510, 2745871338, 3681308437, 4207628240, 3343053890,
  4016749493, 1699691293, 1103962373, 3625875870, 2256883143, 3830138730,
  1031889488, 3479347698, 1535977030, 4236805024, 3251091107, 2132092099,
  1774941330, 1199868427, 1452454533, 157007616, 2904115357, 342012276,
  595725824, 1480756522, 206960106, 497939518, 591360097, 863170706, 2375253569,
  3596610801, 1814182875, 2094937945, 3421402208, 1082520231, 3463918190,
  2785509508, 435703966, 3908032597, 1641649973, 2842273706, 3305899714,
  1510255612, 2148256476, 2655287854, 3276092548, 4258621189, 236887753,
  3681803219, 274041037, 1734335097, 3815195456, 3317970021, 1899903192,
  1026095262, 4050517792, 356393447, 2410691914, 3873677099, 3682840055,
  3913112168, 2491498743, 4132185628, 2489919796, 1091903735, 1979897079,
  3170134830, 3567386728, 3557303409, 857797738, 1136121015, 1342202287,
  507115054, 2535736646, 337727348, 3213592640, 1301675037, 2528481711,
  1895095763, 1721773893, 3216771564, 62756741, 2142006736, 835421444,
  2531993523, 1442658625, 3659876326, 2882144922, 676362277, 1392781812,
  170690266, 3921047035, 1759253602, 3611846912, 1745797284, 664899054,
  1329594018, 3901205900, 3045908486, 2062866102, 2865634940, 3543621612,
  3464012697, 1080764994, 553557557, 3656615353, 3996768171, 991055499,
  499776247, 1265440854, 648242737, 3940784050, 980351604, 3713745714,
  1749149687, 3396870395, 4211799374, 3640570775, 1161844396, 3125318951,
  1431517754, 545492359, 4268468663, 3499529547, 1437099964, 2702547544,
  3433638243, 2581715763, 2787789398, 1060185593, 1593081372, 2418618748,
  4260947970, 69676912, 2159744348, 86519011, 2512459080, 3838209314,
  1220612927, 3339683548, 133810670, 1090789135, 1078426020, 1569222167,
  845107691, 3583754449, 4072456591, 1091646820, 628848692, 1613405280,
  3757631651, 526609435, 236106946, 48312990, 2942717905, 3402727701,
  1797494240, 859738849, 992217954, 4005476642, 2243076622, 3870952857,
  3732016268, 765654824, 3490871365, 2511836413, 1685915746, 3888969200,
  1414112111, 2273134842, 3281911079, 4080962846, 172450625, 2569994100,
  980381355, 4109958455, 2819808352, 2716589560, 2568741196, 3681446669,
  3329971472, 1835478071, 660984891, 3704678404, 4045999559, 3422617507,
  3040415634, 1762651403, 1719377915, 3470491036, 2693910283, 3642056355,
  3138596744, 1364962596, 2073328063, 1983633131, 926494387, 3423689081,
  2150032023, 4096667949, 1749200295, 3328846651, 309677260, 2016342300,
  1779581495, 3079819751, 111262694, 1274766160, 443224088, 298511866,
  1025883608, 3806446537, 1145181785, 168956806, 3641502830, 3584813610,
  1689216846, 3666258015, 3200248200, 1692713982, 2646376535, 4042768518,
  1618508792, 1610833997, 3523052358, 4130873264, 2001055236, 3610705100,
  2202168115, 4028541809, 2961195399, 1006657119, 2006996926, 3186142756,
  1430667929, 3210227297, 1314452623, 4074634658, 4101304120, 2273951170,
  1399257539, 3367210612, 3027628629, 1190975929, 2062231137, 2333990788,
  2221543033, 2438960610, 1181637006, 548689776, 2362791313, 3372408396,
  3104550113, 3145860560, 296247880, 1970579870, 3078560182, 3769228297,
  1714227617, 3291629107, 3898220290, 166772364, 1251581989, 493813264,
  448347421, 195405023, 2709975567, 677966185, 3703036547, 1463355134,
  2715995803, 1338867538, 1343315457, 2802222074, 2684532164, 233230375,
  2599980071, 2000651841, 3277868038, 1638401717, 4028070440, 3237316320,
  6314154, 819756386, 300326615, 590932579, 1405279636, 3267499572, 3150704214,
  2428286686, 3959192993, 3461946742, 1862657033, 1266418056, 963775037,
  2089974820, 2263052895, 1917689273, 448879540, 3550394620, 3981727096,
  150775221, 3627908307, 1303187396, 508620638, 2975983352, 2726630617,
  1817252668, 1876281319, 1457606340, 908771278, 3720792119, 3617206836,
  2455994898, 1729034894, 1080033504, 976866871, 3556439503, 2881648439,
  1522871579, 1555064734, 1336096578, 3548522304, 2579274686, 3574697629,
  3205460757, 3593280638, 3338716283, 3079412587, 564236357, 2993598910,
  1781952180, 1464380207, 3163844217, 3332601554, 1699332808, 1393555694,
  1183702653, 3581086237, 1288719814, 691649499, 2847557200, 2895455976,
  3193889540, 2717570544, 1781354906, 1676643554, 2592534050, 3230253752,
  1126444790, 2770207658, 2633158820, 2210423226, 2615765581, 2414155088,
  3127139286, 673620729, 2805611233, 1269405062, 4015350505, 3341807571,
  4149409754, 1057255273, 2012875353, 2162469141, 2276492801, 2601117357,
  993977747, 3918593370, 2654263191, 753973209, 36408145, 2530585658, 25011837,
  3520020182, 2088578344, 530523599, 2918365339, 1524020338, 1518925132,
  3760827505, 3759777254, 1202760957, 3985898139, 3906192525, 674977740,
  4174734889, 2031300136, 2019492241, 3983892565, 4153806404, 3822280332,
  352677332, 2297720250, 60907813, 90501309, 3286998549, 1016092578, 2535922412,
  2839152426, 457141659, 509813237, 4120667899, 652014361, 1966332200,
  2975202805, 55981186, 2327461051, 676427537, 3255491064, 2882294119,
  3433927263, 1307055953, 942726286, 933058658, 2468411793, 3933900994,
  4215176142, 1361170020, 2001714738, 2830558078, 3274259782, 1222529897,
  1679025792, 2729314320, 3714953764, 1770335741, 151462246, 3013232138,
  1682292957, 1483529935, 471910574, 1539241949, 458788160, 3436315007,
  1807016891, 3718408830, 978976581, 1043663428, 3165965781, 1927990952,
  4200891579, 2372276910, 3208408903, 3533431907, 1412390302, 2931980059,
  4132332400, 1947078029, 3881505623, 4168226417, 2941484381, 1077988104,
  1320477388, 886195818, 18198404, 3786409e3, 2509781533, 112762804, 3463356488,
  1866414978, 891333506, 18488651, 661792760, 1628790961, 3885187036,
  3141171499, 876946877, 2693282273, 1372485963, 791857591, 2686433993,
  3759982718, 3167212022, 3472953795, 2716379847, 445679433, 3561995674,
  3504004811, 3574258232, 54117162, 3331405415, 2381918588, 3769707343,
  4154350007, 1140177722, 4074052095, 668550556, 3214352940, 367459370,
  261225585, 2610173221, 4209349473, 3468074219, 3265815641, 314222801,
  3066103646, 3808782860, 282218597, 3406013506, 3773591054, 379116347,
  1285071038, 846784868, 2669647154, 3771962079, 3550491691, 2305946142,
  453669953, 1268987020, 3317592352, 3279303384, 3744833421, 2610507566,
  3859509063, 266596637, 3847019092, 517658769, 3462560207, 3443424879,
  370717030, 4247526661, 2224018117, 4143653529, 4112773975, 2788324899,
  2477274417, 1456262402, 2901442914, 1517677493, 1846949527, 2295493580,
  3734397586, 2176403920, 1280348187, 1908823572, 3871786941, 846861322,
  1172426758, 3287448474, 3383383037, 1655181056, 3139813346, 901632758,
  1897031941, 2986607138, 3066810236, 3447102507, 1393639104, 373351379,
  950779232, 625454576, 3124240540, 4148612726, 2007998917, 544563296,
  2244738638, 2330496472, 2058025392, 1291430526, 424198748, 50039436, 29584100,
  3605783033, 2429876329, 2791104160, 1057563949, 3255363231, 3075367218,
  3463963227, 1469046755, 985887462,
];
var C_ORIG = [
  1332899944, 1700884034, 1701343084, 1684370003, 1668446532, 1869963892,
];
function _encipher(lr, off, P, S) {
  var n,
    l = lr[off],
    r = lr[off + 1];
  l ^= P[0];
  n = S[l >>> 24];
  n += S[256 | ((l >> 16) & 255)];
  n ^= S[512 | ((l >> 8) & 255)];
  n += S[768 | (l & 255)];
  r ^= n ^ P[1];
  n = S[r >>> 24];
  n += S[256 | ((r >> 16) & 255)];
  n ^= S[512 | ((r >> 8) & 255)];
  n += S[768 | (r & 255)];
  l ^= n ^ P[2];
  n = S[l >>> 24];
  n += S[256 | ((l >> 16) & 255)];
  n ^= S[512 | ((l >> 8) & 255)];
  n += S[768 | (l & 255)];
  r ^= n ^ P[3];
  n = S[r >>> 24];
  n += S[256 | ((r >> 16) & 255)];
  n ^= S[512 | ((r >> 8) & 255)];
  n += S[768 | (r & 255)];
  l ^= n ^ P[4];
  n = S[l >>> 24];
  n += S[256 | ((l >> 16) & 255)];
  n ^= S[512 | ((l >> 8) & 255)];
  n += S[768 | (l & 255)];
  r ^= n ^ P[5];
  n = S[r >>> 24];
  n += S[256 | ((r >> 16) & 255)];
  n ^= S[512 | ((r >> 8) & 255)];
  n += S[768 | (r & 255)];
  l ^= n ^ P[6];
  n = S[l >>> 24];
  n += S[256 | ((l >> 16) & 255)];
  n ^= S[512 | ((l >> 8) & 255)];
  n += S[768 | (l & 255)];
  r ^= n ^ P[7];
  n = S[r >>> 24];
  n += S[256 | ((r >> 16) & 255)];
  n ^= S[512 | ((r >> 8) & 255)];
  n += S[768 | (r & 255)];
  l ^= n ^ P[8];
  n = S[l >>> 24];
  n += S[256 | ((l >> 16) & 255)];
  n ^= S[512 | ((l >> 8) & 255)];
  n += S[768 | (l & 255)];
  r ^= n ^ P[9];
  n = S[r >>> 24];
  n += S[256 | ((r >> 16) & 255)];
  n ^= S[512 | ((r >> 8) & 255)];
  n += S[768 | (r & 255)];
  l ^= n ^ P[10];
  n = S[l >>> 24];
  n += S[256 | ((l >> 16) & 255)];
  n ^= S[512 | ((l >> 8) & 255)];
  n += S[768 | (l & 255)];
  r ^= n ^ P[11];
  n = S[r >>> 24];
  n += S[256 | ((r >> 16) & 255)];
  n ^= S[512 | ((r >> 8) & 255)];
  n += S[768 | (r & 255)];
  l ^= n ^ P[12];
  n = S[l >>> 24];
  n += S[256 | ((l >> 16) & 255)];
  n ^= S[512 | ((l >> 8) & 255)];
  n += S[768 | (l & 255)];
  r ^= n ^ P[13];
  n = S[r >>> 24];
  n += S[256 | ((r >> 16) & 255)];
  n ^= S[512 | ((r >> 8) & 255)];
  n += S[768 | (r & 255)];
  l ^= n ^ P[14];
  n = S[l >>> 24];
  n += S[256 | ((l >> 16) & 255)];
  n ^= S[512 | ((l >> 8) & 255)];
  n += S[768 | (l & 255)];
  r ^= n ^ P[15];
  n = S[r >>> 24];
  n += S[256 | ((r >> 16) & 255)];
  n ^= S[512 | ((r >> 8) & 255)];
  n += S[768 | (r & 255)];
  l ^= n ^ P[16];
  lr[off] = r ^ P[BLOWFISH_NUM_ROUNDS + 1];
  lr[off + 1] = l;
  return lr;
}
__name(_encipher, "_encipher");
function _streamtoword(data, offp) {
  for (var i = 0, word = 0; i < 4; ++i)
    (word = (word << 8) | (data[offp] & 255)),
      (offp = (offp + 1) % data.length);
  return { key: word, offp };
}
__name(_streamtoword, "_streamtoword");
function _key(key, P, S) {
  var offset = 0,
    lr = [0, 0],
    plen = P.length,
    slen = S.length,
    sw;
  for (var i = 0; i < plen; i++)
    (sw = _streamtoword(key, offset)),
      (offset = sw.offp),
      (P[i] = P[i] ^ sw.key);
  for (i = 0; i < plen; i += 2)
    (lr = _encipher(lr, 0, P, S)), (P[i] = lr[0]), (P[i + 1] = lr[1]);
  for (i = 0; i < slen; i += 2)
    (lr = _encipher(lr, 0, P, S)), (S[i] = lr[0]), (S[i + 1] = lr[1]);
}
__name(_key, "_key");
function _ekskey(data, key, P, S) {
  var offp = 0,
    lr = [0, 0],
    plen = P.length,
    slen = S.length,
    sw;
  for (var i = 0; i < plen; i++)
    (sw = _streamtoword(key, offp)), (offp = sw.offp), (P[i] = P[i] ^ sw.key);
  offp = 0;
  for (i = 0; i < plen; i += 2)
    (sw = _streamtoword(data, offp)),
      (offp = sw.offp),
      (lr[0] ^= sw.key),
      (sw = _streamtoword(data, offp)),
      (offp = sw.offp),
      (lr[1] ^= sw.key),
      (lr = _encipher(lr, 0, P, S)),
      (P[i] = lr[0]),
      (P[i + 1] = lr[1]);
  for (i = 0; i < slen; i += 2)
    (sw = _streamtoword(data, offp)),
      (offp = sw.offp),
      (lr[0] ^= sw.key),
      (sw = _streamtoword(data, offp)),
      (offp = sw.offp),
      (lr[1] ^= sw.key),
      (lr = _encipher(lr, 0, P, S)),
      (S[i] = lr[0]),
      (S[i + 1] = lr[1]);
}
__name(_ekskey, "_ekskey");
function _crypt(b, salt, rounds, callback, progressCallback) {
  var cdata = C_ORIG.slice(),
    clen = cdata.length,
    err;
  if (rounds < 4 || rounds > 31) {
    err = Error("Illegal number of rounds (4-31): " + rounds);
    if (callback) {
      nextTick(callback.bind(this, err));
      return;
    } else throw err;
  }
  if (salt.length !== BCRYPT_SALT_LEN) {
    err = Error(
      "Illegal salt length: " + salt.length + " != " + BCRYPT_SALT_LEN
    );
    if (callback) {
      nextTick(callback.bind(this, err));
      return;
    } else throw err;
  }
  rounds = (1 << rounds) >>> 0;
  var P,
    S,
    i = 0,
    j;
  if (typeof Int32Array === "function") {
    P = new Int32Array(P_ORIG);
    S = new Int32Array(S_ORIG);
  } else {
    P = P_ORIG.slice();
    S = S_ORIG.slice();
  }
  _ekskey(salt, b, P, S);
  function next() {
    if (progressCallback) progressCallback(i / rounds);
    if (i < rounds) {
      var start = Date.now();
      for (; i < rounds; ) {
        i = i + 1;
        _key(b, P, S);
        _key(salt, P, S);
        if (Date.now() - start > MAX_EXECUTION_TIME) break;
      }
    } else {
      for (i = 0; i < 64; i++)
        for (j = 0; j < clen >> 1; j++) _encipher(cdata, j << 1, P, S);
      var ret = [];
      for (i = 0; i < clen; i++)
        ret.push(((cdata[i] >> 24) & 255) >>> 0),
          ret.push(((cdata[i] >> 16) & 255) >>> 0),
          ret.push(((cdata[i] >> 8) & 255) >>> 0),
          ret.push((cdata[i] & 255) >>> 0);
      if (callback) {
        callback(null, ret);
        return;
      } else return ret;
    }
    if (callback) nextTick(next);
  }
  __name(next, "next");
  if (typeof callback !== "undefined") {
    next();
  } else {
    var res;
    while (true) if (typeof (res = next()) !== "undefined") return res || [];
  }
}
__name(_crypt, "_crypt");
function _hash(password, salt, callback, progressCallback) {
  var err;
  if (typeof password !== "string" || typeof salt !== "string") {
    err = Error("Invalid string / salt: Not a string");
    if (callback) {
      nextTick(callback.bind(this, err));
      return;
    } else throw err;
  }
  var minor, offset;
  if (salt.charAt(0) !== "$" || salt.charAt(1) !== "2") {
    err = Error("Invalid salt version: " + salt.substring(0, 2));
    if (callback) {
      nextTick(callback.bind(this, err));
      return;
    } else throw err;
  }
  if (salt.charAt(2) === "$") (minor = String.fromCharCode(0)), (offset = 3);
  else {
    minor = salt.charAt(2);
    if (
      (minor !== "a" && minor !== "b" && minor !== "y") ||
      salt.charAt(3) !== "$"
    ) {
      err = Error("Invalid salt revision: " + salt.substring(2, 4));
      if (callback) {
        nextTick(callback.bind(this, err));
        return;
      } else throw err;
    }
    offset = 4;
  }
  if (salt.charAt(offset + 2) > "$") {
    err = Error("Missing salt rounds");
    if (callback) {
      nextTick(callback.bind(this, err));
      return;
    } else throw err;
  }
  var r1 = parseInt(salt.substring(offset, offset + 1), 10) * 10,
    r2 = parseInt(salt.substring(offset + 1, offset + 2), 10),
    rounds = r1 + r2,
    real_salt = salt.substring(offset + 3, offset + 25);
  password += minor >= "a" ? "\0" : "";
  var passwordb = utf8Array(password),
    saltb = base64_decode(real_salt, BCRYPT_SALT_LEN);
  function finish(bytes) {
    var res = [];
    res.push("$2");
    if (minor >= "a") res.push(minor);
    res.push("$");
    if (rounds < 10) res.push("0");
    res.push(rounds.toString());
    res.push("$");
    res.push(base64_encode(saltb, saltb.length));
    res.push(base64_encode(bytes, C_ORIG.length * 4 - 1));
    return res.join("");
  }
  __name(finish, "finish");
  if (typeof callback == "undefined")
    return finish(_crypt(passwordb, saltb, rounds));
  else {
    _crypt(
      passwordb,
      saltb,
      rounds,
      function (err2, bytes) {
        if (err2) callback(err2, null);
        else callback(null, finish(bytes));
      },
      progressCallback
    );
  }
}
__name(_hash, "_hash");
function encodeBase64(bytes, length) {
  return base64_encode(bytes, length);
}
__name(encodeBase64, "encodeBase64");
function decodeBase64(string, length) {
  return base64_decode(string, length);
}
__name(decodeBase64, "decodeBase64");
var bcryptjs_default = {
  setRandomFallback,
  genSaltSync,
  genSalt,
  hashSync,
  hash,
  compareSync,
  compare,
  getRounds,
  getSalt,
  truncates,
  encodeBase64,
  decodeBase64,
};

// src/utils/hash.js
function toHex(buffer) {
  return [...new Uint8Array(buffer)]
    .map(item => item.toString(16).padStart(2, "0"))
    .join("");
}
__name(toHex, "toHex");
async function sha256(value) {
  const payload = new TextEncoder().encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", payload);
  return toHex(hashBuffer);
}
__name(sha256, "sha256");
async function hashPassword(plainPassword) {
  return bcryptjs_default.hash(plainPassword, 10);
}
__name(hashPassword, "hashPassword");
async function checkPassword(plainPassword, passwordHash) {
  return bcryptjs_default.compare(plainPassword, passwordHash);
}
__name(checkPassword, "checkPassword");
function randomToken() {
  return `${crypto.randomUUID()}-${crypto.randomUUID()}`;
}
__name(randomToken, "randomToken");

// node_modules/jose/dist/webapi/lib/buffer_utils.js
var encoder = new TextEncoder();
var decoder = new TextDecoder();
var MAX_INT32 = 2 ** 32;
function concat(...buffers) {
  const size = buffers.reduce((acc, { length }) => acc + length, 0);
  const buf = new Uint8Array(size);
  let i = 0;
  for (const buffer of buffers) {
    buf.set(buffer, i);
    i += buffer.length;
  }
  return buf;
}
__name(concat, "concat");
function encode(string) {
  const bytes = new Uint8Array(string.length);
  for (let i = 0; i < string.length; i++) {
    const code = string.charCodeAt(i);
    if (code > 127) {
      throw new TypeError("non-ASCII string encountered in encode()");
    }
    bytes[i] = code;
  }
  return bytes;
}
__name(encode, "encode");

// node_modules/jose/dist/webapi/lib/base64.js
function encodeBase642(input) {
  if (Uint8Array.prototype.toBase64) {
    return input.toBase64();
  }
  const CHUNK_SIZE = 32768;
  const arr = [];
  for (let i = 0; i < input.length; i += CHUNK_SIZE) {
    arr.push(
      String.fromCharCode.apply(null, input.subarray(i, i + CHUNK_SIZE))
    );
  }
  return btoa(arr.join(""));
}
__name(encodeBase642, "encodeBase64");
function decodeBase642(encoded) {
  if (Uint8Array.fromBase64) {
    return Uint8Array.fromBase64(encoded);
  }
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
__name(decodeBase642, "decodeBase64");

// node_modules/jose/dist/webapi/util/base64url.js
function decode(input) {
  if (Uint8Array.fromBase64) {
    return Uint8Array.fromBase64(
      typeof input === "string" ? input : decoder.decode(input),
      {
        alphabet: "base64url",
      }
    );
  }
  let encoded = input;
  if (encoded instanceof Uint8Array) {
    encoded = decoder.decode(encoded);
  }
  encoded = encoded.replace(/-/g, "+").replace(/_/g, "/");
  try {
    return decodeBase642(encoded);
  } catch {
    throw new TypeError("The input to be decoded is not correctly encoded.");
  }
}
__name(decode, "decode");
function encode2(input) {
  let unencoded = input;
  if (typeof unencoded === "string") {
    unencoded = encoder.encode(unencoded);
  }
  if (Uint8Array.prototype.toBase64) {
    return unencoded.toBase64({ alphabet: "base64url", omitPadding: true });
  }
  return encodeBase642(unencoded)
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}
__name(encode2, "encode");

// node_modules/jose/dist/webapi/lib/crypto_key.js
var unusable = /* @__PURE__ */ __name(
  (name, prop = "algorithm.name") =>
    new TypeError(
      `CryptoKey does not support this operation, its ${prop} must be ${name}`
    ),
  "unusable"
);
var isAlgorithm = /* @__PURE__ */ __name(
  (algorithm, name) => algorithm.name === name,
  "isAlgorithm"
);
function getHashLength(hash2) {
  return parseInt(hash2.name.slice(4), 10);
}
__name(getHashLength, "getHashLength");
function checkHashLength(algorithm, expected) {
  const actual = getHashLength(algorithm.hash);
  if (actual !== expected) throw unusable(`SHA-${expected}`, "algorithm.hash");
}
__name(checkHashLength, "checkHashLength");
function getNamedCurve(alg) {
  switch (alg) {
    case "ES256":
      return "P-256";
    case "ES384":
      return "P-384";
    case "ES512":
      return "P-521";
    default:
      throw new Error("unreachable");
  }
}
__name(getNamedCurve, "getNamedCurve");
function checkUsage(key, usage) {
  if (usage && !key.usages.includes(usage)) {
    throw new TypeError(
      `CryptoKey does not support this operation, its usages must include ${usage}.`
    );
  }
}
__name(checkUsage, "checkUsage");
function checkSigCryptoKey(key, alg, usage) {
  switch (alg) {
    case "HS256":
    case "HS384":
    case "HS512": {
      if (!isAlgorithm(key.algorithm, "HMAC")) throw unusable("HMAC");
      checkHashLength(key.algorithm, parseInt(alg.slice(2), 10));
      break;
    }
    case "RS256":
    case "RS384":
    case "RS512": {
      if (!isAlgorithm(key.algorithm, "RSASSA-PKCS1-v1_5"))
        throw unusable("RSASSA-PKCS1-v1_5");
      checkHashLength(key.algorithm, parseInt(alg.slice(2), 10));
      break;
    }
    case "PS256":
    case "PS384":
    case "PS512": {
      if (!isAlgorithm(key.algorithm, "RSA-PSS")) throw unusable("RSA-PSS");
      checkHashLength(key.algorithm, parseInt(alg.slice(2), 10));
      break;
    }
    case "Ed25519":
    case "EdDSA": {
      if (!isAlgorithm(key.algorithm, "Ed25519")) throw unusable("Ed25519");
      break;
    }
    case "ML-DSA-44":
    case "ML-DSA-65":
    case "ML-DSA-87": {
      if (!isAlgorithm(key.algorithm, alg)) throw unusable(alg);
      break;
    }
    case "ES256":
    case "ES384":
    case "ES512": {
      if (!isAlgorithm(key.algorithm, "ECDSA")) throw unusable("ECDSA");
      const expected = getNamedCurve(alg);
      const actual = key.algorithm.namedCurve;
      if (actual !== expected) throw unusable(expected, "algorithm.namedCurve");
      break;
    }
    default:
      throw new TypeError("CryptoKey does not support this operation");
  }
  checkUsage(key, usage);
}
__name(checkSigCryptoKey, "checkSigCryptoKey");

// node_modules/jose/dist/webapi/lib/invalid_key_input.js
function message(msg, actual, ...types) {
  types = types.filter(Boolean);
  if (types.length > 2) {
    const last = types.pop();
    msg += `one of type ${types.join(", ")}, or ${last}.`;
  } else if (types.length === 2) {
    msg += `one of type ${types[0]} or ${types[1]}.`;
  } else {
    msg += `of type ${types[0]}.`;
  }
  if (actual == null) {
    msg += ` Received ${actual}`;
  } else if (typeof actual === "function" && actual.name) {
    msg += ` Received function ${actual.name}`;
  } else if (typeof actual === "object" && actual != null) {
    if (actual.constructor?.name) {
      msg += ` Received an instance of ${actual.constructor.name}`;
    }
  }
  return msg;
}
__name(message, "message");
var invalidKeyInput = /* @__PURE__ */ __name(
  (actual, ...types) => message("Key must be ", actual, ...types),
  "invalidKeyInput"
);
var withAlg = /* @__PURE__ */ __name(
  (alg, actual, ...types) =>
    message(`Key for the ${alg} algorithm must be `, actual, ...types),
  "withAlg"
);

// node_modules/jose/dist/webapi/util/errors.js
var JOSEError = class extends Error {
  static {
    __name(this, "JOSEError");
  }
  static code = "ERR_JOSE_GENERIC";
  code = "ERR_JOSE_GENERIC";
  constructor(message2, options) {
    super(message2, options);
    this.name = this.constructor.name;
    Error.captureStackTrace?.(this, this.constructor);
  }
};
var JWTClaimValidationFailed = class extends JOSEError {
  static {
    __name(this, "JWTClaimValidationFailed");
  }
  static code = "ERR_JWT_CLAIM_VALIDATION_FAILED";
  code = "ERR_JWT_CLAIM_VALIDATION_FAILED";
  claim;
  reason;
  payload;
  constructor(
    message2,
    payload,
    claim = "unspecified",
    reason = "unspecified"
  ) {
    super(message2, { cause: { claim, reason, payload } });
    this.claim = claim;
    this.reason = reason;
    this.payload = payload;
  }
};
var JWTExpired = class extends JOSEError {
  static {
    __name(this, "JWTExpired");
  }
  static code = "ERR_JWT_EXPIRED";
  code = "ERR_JWT_EXPIRED";
  claim;
  reason;
  payload;
  constructor(
    message2,
    payload,
    claim = "unspecified",
    reason = "unspecified"
  ) {
    super(message2, { cause: { claim, reason, payload } });
    this.claim = claim;
    this.reason = reason;
    this.payload = payload;
  }
};
var JOSEAlgNotAllowed = class extends JOSEError {
  static {
    __name(this, "JOSEAlgNotAllowed");
  }
  static code = "ERR_JOSE_ALG_NOT_ALLOWED";
  code = "ERR_JOSE_ALG_NOT_ALLOWED";
};
var JOSENotSupported = class extends JOSEError {
  static {
    __name(this, "JOSENotSupported");
  }
  static code = "ERR_JOSE_NOT_SUPPORTED";
  code = "ERR_JOSE_NOT_SUPPORTED";
};
var JWSInvalid = class extends JOSEError {
  static {
    __name(this, "JWSInvalid");
  }
  static code = "ERR_JWS_INVALID";
  code = "ERR_JWS_INVALID";
};
var JWTInvalid = class extends JOSEError {
  static {
    __name(this, "JWTInvalid");
  }
  static code = "ERR_JWT_INVALID";
  code = "ERR_JWT_INVALID";
};
var JWSSignatureVerificationFailed = class extends JOSEError {
  static {
    __name(this, "JWSSignatureVerificationFailed");
  }
  static code = "ERR_JWS_SIGNATURE_VERIFICATION_FAILED";
  code = "ERR_JWS_SIGNATURE_VERIFICATION_FAILED";
  constructor(message2 = "signature verification failed", options) {
    super(message2, options);
  }
};

// node_modules/jose/dist/webapi/lib/is_key_like.js
var isCryptoKey = /* @__PURE__ */ __name(key => {
  if (key?.[Symbol.toStringTag] === "CryptoKey") return true;
  try {
    return key instanceof CryptoKey;
  } catch {
    return false;
  }
}, "isCryptoKey");
var isKeyObject = /* @__PURE__ */ __name(
  key => key?.[Symbol.toStringTag] === "KeyObject",
  "isKeyObject"
);
var isKeyLike = /* @__PURE__ */ __name(
  key => isCryptoKey(key) || isKeyObject(key),
  "isKeyLike"
);

// node_modules/jose/dist/webapi/lib/helpers.js
function assertNotSet(value, name) {
  if (value) {
    throw new TypeError(`${name} can only be called once`);
  }
}
__name(assertNotSet, "assertNotSet");
function decodeBase64url(value, label, ErrorClass) {
  try {
    return decode(value);
  } catch {
    throw new ErrorClass(`Failed to base64url decode the ${label}`);
  }
}
__name(decodeBase64url, "decodeBase64url");

// node_modules/jose/dist/webapi/lib/type_checks.js
var isObjectLike = /* @__PURE__ */ __name(
  value => typeof value === "object" && value !== null,
  "isObjectLike"
);
function isObject(input) {
  if (
    !isObjectLike(input) ||
    Object.prototype.toString.call(input) !== "[object Object]"
  ) {
    return false;
  }
  if (Object.getPrototypeOf(input) === null) {
    return true;
  }
  let proto = input;
  while (Object.getPrototypeOf(proto) !== null) {
    proto = Object.getPrototypeOf(proto);
  }
  return Object.getPrototypeOf(input) === proto;
}
__name(isObject, "isObject");
function isDisjoint(...headers) {
  const sources = headers.filter(Boolean);
  if (sources.length === 0 || sources.length === 1) {
    return true;
  }
  let acc;
  for (const header of sources) {
    const parameters = Object.keys(header);
    if (!acc || acc.size === 0) {
      acc = new Set(parameters);
      continue;
    }
    for (const parameter of parameters) {
      if (acc.has(parameter)) {
        return false;
      }
      acc.add(parameter);
    }
  }
  return true;
}
__name(isDisjoint, "isDisjoint");
var isJWK = /* @__PURE__ */ __name(
  key => isObject(key) && typeof key.kty === "string",
  "isJWK"
);
var isPrivateJWK = /* @__PURE__ */ __name(
  key =>
    key.kty !== "oct" &&
    ((key.kty === "AKP" && typeof key.priv === "string") ||
      typeof key.d === "string"),
  "isPrivateJWK"
);
var isPublicJWK = /* @__PURE__ */ __name(
  key => key.kty !== "oct" && key.d === void 0 && key.priv === void 0,
  "isPublicJWK"
);
var isSecretJWK = /* @__PURE__ */ __name(
  key => key.kty === "oct" && typeof key.k === "string",
  "isSecretJWK"
);

// node_modules/jose/dist/webapi/lib/signing.js
function checkKeyLength(alg, key) {
  if (alg.startsWith("RS") || alg.startsWith("PS")) {
    const { modulusLength } = key.algorithm;
    if (typeof modulusLength !== "number" || modulusLength < 2048) {
      throw new TypeError(
        `${alg} requires key modulusLength to be 2048 bits or larger`
      );
    }
  }
}
__name(checkKeyLength, "checkKeyLength");
function subtleAlgorithm(alg, algorithm) {
  const hash2 = `SHA-${alg.slice(-3)}`;
  switch (alg) {
    case "HS256":
    case "HS384":
    case "HS512":
      return { hash: hash2, name: "HMAC" };
    case "PS256":
    case "PS384":
    case "PS512":
      return {
        hash: hash2,
        name: "RSA-PSS",
        saltLength: parseInt(alg.slice(-3), 10) >> 3,
      };
    case "RS256":
    case "RS384":
    case "RS512":
      return { hash: hash2, name: "RSASSA-PKCS1-v1_5" };
    case "ES256":
    case "ES384":
    case "ES512":
      return { hash: hash2, name: "ECDSA", namedCurve: algorithm.namedCurve };
    case "Ed25519":
    case "EdDSA":
      return { name: "Ed25519" };
    case "ML-DSA-44":
    case "ML-DSA-65":
    case "ML-DSA-87":
      return { name: alg };
    default:
      throw new JOSENotSupported(
        `alg ${alg} is not supported either by JOSE or your javascript runtime`
      );
  }
}
__name(subtleAlgorithm, "subtleAlgorithm");
async function getSigKey(alg, key, usage) {
  if (key instanceof Uint8Array) {
    if (!alg.startsWith("HS")) {
      throw new TypeError(
        invalidKeyInput(key, "CryptoKey", "KeyObject", "JSON Web Key")
      );
    }
    return crypto.subtle.importKey(
      "raw",
      key,
      { hash: `SHA-${alg.slice(-3)}`, name: "HMAC" },
      false,
      [usage]
    );
  }
  checkSigCryptoKey(key, alg, usage);
  return key;
}
__name(getSigKey, "getSigKey");
async function sign(alg, key, data) {
  const cryptoKey = await getSigKey(alg, key, "sign");
  checkKeyLength(alg, cryptoKey);
  const signature = await crypto.subtle.sign(
    subtleAlgorithm(alg, cryptoKey.algorithm),
    cryptoKey,
    data
  );
  return new Uint8Array(signature);
}
__name(sign, "sign");
async function verify(alg, key, signature, data) {
  const cryptoKey = await getSigKey(alg, key, "verify");
  checkKeyLength(alg, cryptoKey);
  const algorithm = subtleAlgorithm(alg, cryptoKey.algorithm);
  try {
    return await crypto.subtle.verify(algorithm, cryptoKey, signature, data);
  } catch {
    return false;
  }
}
__name(verify, "verify");

// node_modules/jose/dist/webapi/lib/jwk_to_key.js
var unsupportedAlg =
  'Invalid or unsupported JWK "alg" (Algorithm) Parameter value';
function subtleMapping(jwk) {
  let algorithm;
  let keyUsages;
  switch (jwk.kty) {
    case "AKP": {
      switch (jwk.alg) {
        case "ML-DSA-44":
        case "ML-DSA-65":
        case "ML-DSA-87":
          algorithm = { name: jwk.alg };
          keyUsages = jwk.priv ? ["sign"] : ["verify"];
          break;
        default:
          throw new JOSENotSupported(unsupportedAlg);
      }
      break;
    }
    case "RSA": {
      switch (jwk.alg) {
        case "PS256":
        case "PS384":
        case "PS512":
          algorithm = { name: "RSA-PSS", hash: `SHA-${jwk.alg.slice(-3)}` };
          keyUsages = jwk.d ? ["sign"] : ["verify"];
          break;
        case "RS256":
        case "RS384":
        case "RS512":
          algorithm = {
            name: "RSASSA-PKCS1-v1_5",
            hash: `SHA-${jwk.alg.slice(-3)}`,
          };
          keyUsages = jwk.d ? ["sign"] : ["verify"];
          break;
        case "RSA-OAEP":
        case "RSA-OAEP-256":
        case "RSA-OAEP-384":
        case "RSA-OAEP-512":
          algorithm = {
            name: "RSA-OAEP",
            hash: `SHA-${parseInt(jwk.alg.slice(-3), 10) || 1}`,
          };
          keyUsages = jwk.d ? ["decrypt", "unwrapKey"] : ["encrypt", "wrapKey"];
          break;
        default:
          throw new JOSENotSupported(unsupportedAlg);
      }
      break;
    }
    case "EC": {
      switch (jwk.alg) {
        case "ES256":
        case "ES384":
        case "ES512":
          algorithm = {
            name: "ECDSA",
            namedCurve: { ES256: "P-256", ES384: "P-384", ES512: "P-521" }[
              jwk.alg
            ],
          };
          keyUsages = jwk.d ? ["sign"] : ["verify"];
          break;
        case "ECDH-ES":
        case "ECDH-ES+A128KW":
        case "ECDH-ES+A192KW":
        case "ECDH-ES+A256KW":
          algorithm = { name: "ECDH", namedCurve: jwk.crv };
          keyUsages = jwk.d ? ["deriveBits"] : [];
          break;
        default:
          throw new JOSENotSupported(unsupportedAlg);
      }
      break;
    }
    case "OKP": {
      switch (jwk.alg) {
        case "Ed25519":
        case "EdDSA":
          algorithm = { name: "Ed25519" };
          keyUsages = jwk.d ? ["sign"] : ["verify"];
          break;
        case "ECDH-ES":
        case "ECDH-ES+A128KW":
        case "ECDH-ES+A192KW":
        case "ECDH-ES+A256KW":
          algorithm = { name: jwk.crv };
          keyUsages = jwk.d ? ["deriveBits"] : [];
          break;
        default:
          throw new JOSENotSupported(unsupportedAlg);
      }
      break;
    }
    default:
      throw new JOSENotSupported(
        'Invalid or unsupported JWK "kty" (Key Type) Parameter value'
      );
  }
  return { algorithm, keyUsages };
}
__name(subtleMapping, "subtleMapping");
async function jwkToKey(jwk) {
  if (!jwk.alg) {
    throw new TypeError(
      '"alg" argument is required when "jwk.alg" is not present'
    );
  }
  const { algorithm, keyUsages } = subtleMapping(jwk);
  const keyData = { ...jwk };
  if (keyData.kty !== "AKP") {
    delete keyData.alg;
  }
  delete keyData.use;
  return crypto.subtle.importKey(
    "jwk",
    keyData,
    algorithm,
    jwk.ext ?? (jwk.d || jwk.priv ? false : true),
    jwk.key_ops ?? keyUsages
  );
}
__name(jwkToKey, "jwkToKey");

// node_modules/jose/dist/webapi/lib/normalize_key.js
var unusableForAlg =
  "given KeyObject instance cannot be used for this algorithm";
var cache;
var handleJWK = /* @__PURE__ */ __name(
  async (key, jwk, alg, freeze = false) => {
    cache ||= /* @__PURE__ */ new WeakMap();
    let cached = cache.get(key);
    if (cached?.[alg]) {
      return cached[alg];
    }
    const cryptoKey = await jwkToKey({ ...jwk, alg });
    if (freeze) Object.freeze(key);
    if (!cached) {
      cache.set(key, { [alg]: cryptoKey });
    } else {
      cached[alg] = cryptoKey;
    }
    return cryptoKey;
  },
  "handleJWK"
);
var handleKeyObject = /* @__PURE__ */ __name((keyObject, alg) => {
  cache ||= /* @__PURE__ */ new WeakMap();
  let cached = cache.get(keyObject);
  if (cached?.[alg]) {
    return cached[alg];
  }
  const isPublic = keyObject.type === "public";
  const extractable = isPublic ? true : false;
  let cryptoKey;
  if (keyObject.asymmetricKeyType === "x25519") {
    switch (alg) {
      case "ECDH-ES":
      case "ECDH-ES+A128KW":
      case "ECDH-ES+A192KW":
      case "ECDH-ES+A256KW":
        break;
      default:
        throw new TypeError(unusableForAlg);
    }
    cryptoKey = keyObject.toCryptoKey(
      keyObject.asymmetricKeyType,
      extractable,
      isPublic ? [] : ["deriveBits"]
    );
  }
  if (keyObject.asymmetricKeyType === "ed25519") {
    if (alg !== "EdDSA" && alg !== "Ed25519") {
      throw new TypeError(unusableForAlg);
    }
    cryptoKey = keyObject.toCryptoKey(
      keyObject.asymmetricKeyType,
      extractable,
      [isPublic ? "verify" : "sign"]
    );
  }
  switch (keyObject.asymmetricKeyType) {
    case "ml-dsa-44":
    case "ml-dsa-65":
    case "ml-dsa-87": {
      if (alg !== keyObject.asymmetricKeyType.toUpperCase()) {
        throw new TypeError(unusableForAlg);
      }
      cryptoKey = keyObject.toCryptoKey(
        keyObject.asymmetricKeyType,
        extractable,
        [isPublic ? "verify" : "sign"]
      );
    }
  }
  if (keyObject.asymmetricKeyType === "rsa") {
    let hash2;
    switch (alg) {
      case "RSA-OAEP":
        hash2 = "SHA-1";
        break;
      case "RS256":
      case "PS256":
      case "RSA-OAEP-256":
        hash2 = "SHA-256";
        break;
      case "RS384":
      case "PS384":
      case "RSA-OAEP-384":
        hash2 = "SHA-384";
        break;
      case "RS512":
      case "PS512":
      case "RSA-OAEP-512":
        hash2 = "SHA-512";
        break;
      default:
        throw new TypeError(unusableForAlg);
    }
    if (alg.startsWith("RSA-OAEP")) {
      return keyObject.toCryptoKey(
        {
          name: "RSA-OAEP",
          hash: hash2,
        },
        extractable,
        isPublic ? ["encrypt"] : ["decrypt"]
      );
    }
    cryptoKey = keyObject.toCryptoKey(
      {
        name: alg.startsWith("PS") ? "RSA-PSS" : "RSASSA-PKCS1-v1_5",
        hash: hash2,
      },
      extractable,
      [isPublic ? "verify" : "sign"]
    );
  }
  if (keyObject.asymmetricKeyType === "ec") {
    const nist = /* @__PURE__ */ new Map([
      ["prime256v1", "P-256"],
      ["secp384r1", "P-384"],
      ["secp521r1", "P-521"],
    ]);
    const namedCurve = nist.get(keyObject.asymmetricKeyDetails?.namedCurve);
    if (!namedCurve) {
      throw new TypeError(unusableForAlg);
    }
    const expectedCurve = { ES256: "P-256", ES384: "P-384", ES512: "P-521" };
    if (expectedCurve[alg] && namedCurve === expectedCurve[alg]) {
      cryptoKey = keyObject.toCryptoKey(
        {
          name: "ECDSA",
          namedCurve,
        },
        extractable,
        [isPublic ? "verify" : "sign"]
      );
    }
    if (alg.startsWith("ECDH-ES")) {
      cryptoKey = keyObject.toCryptoKey(
        {
          name: "ECDH",
          namedCurve,
        },
        extractable,
        isPublic ? [] : ["deriveBits"]
      );
    }
  }
  if (!cryptoKey) {
    throw new TypeError(unusableForAlg);
  }
  if (!cached) {
    cache.set(keyObject, { [alg]: cryptoKey });
  } else {
    cached[alg] = cryptoKey;
  }
  return cryptoKey;
}, "handleKeyObject");
async function normalizeKey(key, alg) {
  if (key instanceof Uint8Array) {
    return key;
  }
  if (isCryptoKey(key)) {
    return key;
  }
  if (isKeyObject(key)) {
    if (key.type === "secret") {
      return key.export();
    }
    if ("toCryptoKey" in key && typeof key.toCryptoKey === "function") {
      try {
        return handleKeyObject(key, alg);
      } catch (err) {
        if (err instanceof TypeError) {
          throw err;
        }
      }
    }
    let jwk = key.export({ format: "jwk" });
    return handleJWK(key, jwk, alg);
  }
  if (isJWK(key)) {
    if (key.k) {
      return decode(key.k);
    }
    return handleJWK(key, key, alg, true);
  }
  throw new Error("unreachable");
}
__name(normalizeKey, "normalizeKey");

// node_modules/jose/dist/webapi/lib/validate_crit.js
function validateCrit(
  Err,
  recognizedDefault,
  recognizedOption,
  protectedHeader,
  joseHeader
) {
  if (joseHeader.crit !== void 0 && protectedHeader?.crit === void 0) {
    throw new Err(
      '"crit" (Critical) Header Parameter MUST be integrity protected'
    );
  }
  if (!protectedHeader || protectedHeader.crit === void 0) {
    return /* @__PURE__ */ new Set();
  }
  if (
    !Array.isArray(protectedHeader.crit) ||
    protectedHeader.crit.length === 0 ||
    protectedHeader.crit.some(
      input => typeof input !== "string" || input.length === 0
    )
  ) {
    throw new Err(
      '"crit" (Critical) Header Parameter MUST be an array of non-empty strings when present'
    );
  }
  let recognized;
  if (recognizedOption !== void 0) {
    recognized = new Map([
      ...Object.entries(recognizedOption),
      ...recognizedDefault.entries(),
    ]);
  } else {
    recognized = recognizedDefault;
  }
  for (const parameter of protectedHeader.crit) {
    if (!recognized.has(parameter)) {
      throw new JOSENotSupported(
        `Extension Header Parameter "${parameter}" is not recognized`
      );
    }
    if (joseHeader[parameter] === void 0) {
      throw new Err(`Extension Header Parameter "${parameter}" is missing`);
    }
    if (recognized.get(parameter) && protectedHeader[parameter] === void 0) {
      throw new Err(
        `Extension Header Parameter "${parameter}" MUST be integrity protected`
      );
    }
  }
  return new Set(protectedHeader.crit);
}
__name(validateCrit, "validateCrit");

// node_modules/jose/dist/webapi/lib/validate_algorithms.js
function validateAlgorithms(option, algorithms) {
  if (
    algorithms !== void 0 &&
    (!Array.isArray(algorithms) || algorithms.some(s => typeof s !== "string"))
  ) {
    throw new TypeError(`"${option}" option must be an array of strings`);
  }
  if (!algorithms) {
    return void 0;
  }
  return new Set(algorithms);
}
__name(validateAlgorithms, "validateAlgorithms");

// node_modules/jose/dist/webapi/lib/check_key_type.js
var tag = /* @__PURE__ */ __name(key => key?.[Symbol.toStringTag], "tag");
var jwkMatchesOp = /* @__PURE__ */ __name((alg, key, usage) => {
  if (key.use !== void 0) {
    let expected;
    switch (usage) {
      case "sign":
      case "verify":
        expected = "sig";
        break;
      case "encrypt":
      case "decrypt":
        expected = "enc";
        break;
    }
    if (key.use !== expected) {
      throw new TypeError(
        `Invalid key for this operation, its "use" must be "${expected}" when present`
      );
    }
  }
  if (key.alg !== void 0 && key.alg !== alg) {
    throw new TypeError(
      `Invalid key for this operation, its "alg" must be "${alg}" when present`
    );
  }
  if (Array.isArray(key.key_ops)) {
    let expectedKeyOp;
    switch (true) {
      case usage === "sign" || usage === "verify":
      case alg === "dir":
      case alg.includes("CBC-HS"):
        expectedKeyOp = usage;
        break;
      case alg.startsWith("PBES2"):
        expectedKeyOp = "deriveBits";
        break;
      case /^A\d{3}(?:GCM)?(?:KW)?$/.test(alg):
        if (!alg.includes("GCM") && alg.endsWith("KW")) {
          expectedKeyOp = usage === "encrypt" ? "wrapKey" : "unwrapKey";
        } else {
          expectedKeyOp = usage;
        }
        break;
      case usage === "encrypt" && alg.startsWith("RSA"):
        expectedKeyOp = "wrapKey";
        break;
      case usage === "decrypt":
        expectedKeyOp = alg.startsWith("RSA") ? "unwrapKey" : "deriveBits";
        break;
    }
    if (expectedKeyOp && key.key_ops?.includes?.(expectedKeyOp) === false) {
      throw new TypeError(
        `Invalid key for this operation, its "key_ops" must include "${expectedKeyOp}" when present`
      );
    }
  }
  return true;
}, "jwkMatchesOp");
var symmetricTypeCheck = /* @__PURE__ */ __name((alg, key, usage) => {
  if (key instanceof Uint8Array) return;
  if (isJWK(key)) {
    if (isSecretJWK(key) && jwkMatchesOp(alg, key, usage)) return;
    throw new TypeError(
      `JSON Web Key for symmetric algorithms must have JWK "kty" (Key Type) equal to "oct" and the JWK "k" (Key Value) present`
    );
  }
  if (!isKeyLike(key)) {
    throw new TypeError(
      withAlg(alg, key, "CryptoKey", "KeyObject", "JSON Web Key", "Uint8Array")
    );
  }
  if (key.type !== "secret") {
    throw new TypeError(
      `${tag(key)} instances for symmetric algorithms must be of type "secret"`
    );
  }
}, "symmetricTypeCheck");
var asymmetricTypeCheck = /* @__PURE__ */ __name((alg, key, usage) => {
  if (isJWK(key)) {
    switch (usage) {
      case "decrypt":
      case "sign":
        if (isPrivateJWK(key) && jwkMatchesOp(alg, key, usage)) return;
        throw new TypeError(
          `JSON Web Key for this operation must be a private JWK`
        );
      case "encrypt":
      case "verify":
        if (isPublicJWK(key) && jwkMatchesOp(alg, key, usage)) return;
        throw new TypeError(
          `JSON Web Key for this operation must be a public JWK`
        );
    }
  }
  if (!isKeyLike(key)) {
    throw new TypeError(
      withAlg(alg, key, "CryptoKey", "KeyObject", "JSON Web Key")
    );
  }
  if (key.type === "secret") {
    throw new TypeError(
      `${tag(
        key
      )} instances for asymmetric algorithms must not be of type "secret"`
    );
  }
  if (key.type === "public") {
    switch (usage) {
      case "sign":
        throw new TypeError(
          `${tag(
            key
          )} instances for asymmetric algorithm signing must be of type "private"`
        );
      case "decrypt":
        throw new TypeError(
          `${tag(
            key
          )} instances for asymmetric algorithm decryption must be of type "private"`
        );
    }
  }
  if (key.type === "private") {
    switch (usage) {
      case "verify":
        throw new TypeError(
          `${tag(
            key
          )} instances for asymmetric algorithm verifying must be of type "public"`
        );
      case "encrypt":
        throw new TypeError(
          `${tag(
            key
          )} instances for asymmetric algorithm encryption must be of type "public"`
        );
    }
  }
}, "asymmetricTypeCheck");
function checkKeyType(alg, key, usage) {
  switch (alg.substring(0, 2)) {
    case "A1":
    case "A2":
    case "di":
    case "HS":
    case "PB":
      symmetricTypeCheck(alg, key, usage);
      break;
    default:
      asymmetricTypeCheck(alg, key, usage);
  }
}
__name(checkKeyType, "checkKeyType");

// node_modules/jose/dist/webapi/jws/flattened/verify.js
async function flattenedVerify(jws, key, options) {
  if (!isObject(jws)) {
    throw new JWSInvalid("Flattened JWS must be an object");
  }
  if (jws.protected === void 0 && jws.header === void 0) {
    throw new JWSInvalid(
      'Flattened JWS must have either of the "protected" or "header" members'
    );
  }
  if (jws.protected !== void 0 && typeof jws.protected !== "string") {
    throw new JWSInvalid("JWS Protected Header incorrect type");
  }
  if (jws.payload === void 0) {
    throw new JWSInvalid("JWS Payload missing");
  }
  if (typeof jws.signature !== "string") {
    throw new JWSInvalid("JWS Signature missing or incorrect type");
  }
  if (jws.header !== void 0 && !isObject(jws.header)) {
    throw new JWSInvalid("JWS Unprotected Header incorrect type");
  }
  let parsedProt = {};
  if (jws.protected) {
    try {
      const protectedHeader = decode(jws.protected);
      parsedProt = JSON.parse(decoder.decode(protectedHeader));
    } catch {
      throw new JWSInvalid("JWS Protected Header is invalid");
    }
  }
  if (!isDisjoint(parsedProt, jws.header)) {
    throw new JWSInvalid(
      "JWS Protected and JWS Unprotected Header Parameter names must be disjoint"
    );
  }
  const joseHeader = {
    ...parsedProt,
    ...jws.header,
  };
  const extensions = validateCrit(
    JWSInvalid,
    /* @__PURE__ */ new Map([["b64", true]]),
    options?.crit,
    parsedProt,
    joseHeader
  );
  let b64 = true;
  if (extensions.has("b64")) {
    b64 = parsedProt.b64;
    if (typeof b64 !== "boolean") {
      throw new JWSInvalid(
        'The "b64" (base64url-encode payload) Header Parameter must be a boolean'
      );
    }
  }
  const { alg } = joseHeader;
  if (typeof alg !== "string" || !alg) {
    throw new JWSInvalid(
      'JWS "alg" (Algorithm) Header Parameter missing or invalid'
    );
  }
  const algorithms =
    options && validateAlgorithms("algorithms", options.algorithms);
  if (algorithms && !algorithms.has(alg)) {
    throw new JOSEAlgNotAllowed(
      '"alg" (Algorithm) Header Parameter value not allowed'
    );
  }
  if (b64) {
    if (typeof jws.payload !== "string") {
      throw new JWSInvalid("JWS Payload must be a string");
    }
  } else if (
    typeof jws.payload !== "string" &&
    !(jws.payload instanceof Uint8Array)
  ) {
    throw new JWSInvalid(
      "JWS Payload must be a string or an Uint8Array instance"
    );
  }
  let resolvedKey = false;
  if (typeof key === "function") {
    key = await key(parsedProt, jws);
    resolvedKey = true;
  }
  checkKeyType(alg, key, "verify");
  const data = concat(
    jws.protected !== void 0 ? encode(jws.protected) : new Uint8Array(),
    encode("."),
    typeof jws.payload === "string"
      ? b64
        ? encode(jws.payload)
        : encoder.encode(jws.payload)
      : jws.payload
  );
  const signature = decodeBase64url(jws.signature, "signature", JWSInvalid);
  const k = await normalizeKey(key, alg);
  const verified = await verify(alg, k, signature, data);
  if (!verified) {
    throw new JWSSignatureVerificationFailed();
  }
  let payload;
  if (b64) {
    payload = decodeBase64url(jws.payload, "payload", JWSInvalid);
  } else if (typeof jws.payload === "string") {
    payload = encoder.encode(jws.payload);
  } else {
    payload = jws.payload;
  }
  const result = { payload };
  if (jws.protected !== void 0) {
    result.protectedHeader = parsedProt;
  }
  if (jws.header !== void 0) {
    result.unprotectedHeader = jws.header;
  }
  if (resolvedKey) {
    return { ...result, key: k };
  }
  return result;
}
__name(flattenedVerify, "flattenedVerify");

// node_modules/jose/dist/webapi/jws/compact/verify.js
async function compactVerify(jws, key, options) {
  if (jws instanceof Uint8Array) {
    jws = decoder.decode(jws);
  }
  if (typeof jws !== "string") {
    throw new JWSInvalid("Compact JWS must be a string or Uint8Array");
  }
  const {
    0: protectedHeader,
    1: payload,
    2: signature,
    length,
  } = jws.split(".");
  if (length !== 3) {
    throw new JWSInvalid("Invalid Compact JWS");
  }
  const verified = await flattenedVerify(
    { payload, protected: protectedHeader, signature },
    key,
    options
  );
  const result = {
    payload: verified.payload,
    protectedHeader: verified.protectedHeader,
  };
  if (typeof key === "function") {
    return { ...result, key: verified.key };
  }
  return result;
}
__name(compactVerify, "compactVerify");

// node_modules/jose/dist/webapi/lib/jwt_claims_set.js
var epoch = /* @__PURE__ */ __name(
  date => Math.floor(date.getTime() / 1e3),
  "epoch"
);
var minute = 60;
var hour = minute * 60;
var day = hour * 24;
var week = day * 7;
var year = day * 365.25;
var REGEX =
  /^(\+|\-)? ?(\d+|\d+\.\d+) ?(seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)(?: (ago|from now))?$/i;
function secs(str) {
  const matched = REGEX.exec(str);
  if (!matched || (matched[4] && matched[1])) {
    throw new TypeError("Invalid time period format");
  }
  const value = parseFloat(matched[2]);
  const unit = matched[3].toLowerCase();
  let numericDate;
  switch (unit) {
    case "sec":
    case "secs":
    case "second":
    case "seconds":
    case "s":
      numericDate = Math.round(value);
      break;
    case "minute":
    case "minutes":
    case "min":
    case "mins":
    case "m":
      numericDate = Math.round(value * minute);
      break;
    case "hour":
    case "hours":
    case "hr":
    case "hrs":
    case "h":
      numericDate = Math.round(value * hour);
      break;
    case "day":
    case "days":
    case "d":
      numericDate = Math.round(value * day);
      break;
    case "week":
    case "weeks":
    case "w":
      numericDate = Math.round(value * week);
      break;
    default:
      numericDate = Math.round(value * year);
      break;
  }
  if (matched[1] === "-" || matched[4] === "ago") {
    return -numericDate;
  }
  return numericDate;
}
__name(secs, "secs");
function validateInput(label, input) {
  if (!Number.isFinite(input)) {
    throw new TypeError(`Invalid ${label} input`);
  }
  return input;
}
__name(validateInput, "validateInput");
var normalizeTyp = /* @__PURE__ */ __name(value => {
  if (value.includes("/")) {
    return value.toLowerCase();
  }
  return `application/${value.toLowerCase()}`;
}, "normalizeTyp");
var checkAudiencePresence = /* @__PURE__ */ __name((audPayload, audOption) => {
  if (typeof audPayload === "string") {
    return audOption.includes(audPayload);
  }
  if (Array.isArray(audPayload)) {
    return audOption.some(Set.prototype.has.bind(new Set(audPayload)));
  }
  return false;
}, "checkAudiencePresence");
function validateClaimsSet(protectedHeader, encodedPayload, options = {}) {
  let payload;
  try {
    payload = JSON.parse(decoder.decode(encodedPayload));
  } catch {}
  if (!isObject(payload)) {
    throw new JWTInvalid("JWT Claims Set must be a top-level JSON object");
  }
  const { typ } = options;
  if (
    typ &&
    (typeof protectedHeader.typ !== "string" ||
      normalizeTyp(protectedHeader.typ) !== normalizeTyp(typ))
  ) {
    throw new JWTClaimValidationFailed(
      'unexpected "typ" JWT header value',
      payload,
      "typ",
      "check_failed"
    );
  }
  const {
    requiredClaims = [],
    issuer,
    subject,
    audience,
    maxTokenAge,
  } = options;
  const presenceCheck = [...requiredClaims];
  if (maxTokenAge !== void 0) presenceCheck.push("iat");
  if (audience !== void 0) presenceCheck.push("aud");
  if (subject !== void 0) presenceCheck.push("sub");
  if (issuer !== void 0) presenceCheck.push("iss");
  for (const claim of new Set(presenceCheck.reverse())) {
    if (!(claim in payload)) {
      throw new JWTClaimValidationFailed(
        `missing required "${claim}" claim`,
        payload,
        claim,
        "missing"
      );
    }
  }
  if (
    issuer &&
    !(Array.isArray(issuer) ? issuer : [issuer]).includes(payload.iss)
  ) {
    throw new JWTClaimValidationFailed(
      'unexpected "iss" claim value',
      payload,
      "iss",
      "check_failed"
    );
  }
  if (subject && payload.sub !== subject) {
    throw new JWTClaimValidationFailed(
      'unexpected "sub" claim value',
      payload,
      "sub",
      "check_failed"
    );
  }
  if (
    audience &&
    !checkAudiencePresence(
      payload.aud,
      typeof audience === "string" ? [audience] : audience
    )
  ) {
    throw new JWTClaimValidationFailed(
      'unexpected "aud" claim value',
      payload,
      "aud",
      "check_failed"
    );
  }
  let tolerance;
  switch (typeof options.clockTolerance) {
    case "string":
      tolerance = secs(options.clockTolerance);
      break;
    case "number":
      tolerance = options.clockTolerance;
      break;
    case "undefined":
      tolerance = 0;
      break;
    default:
      throw new TypeError("Invalid clockTolerance option type");
  }
  const { currentDate } = options;
  const now = epoch(currentDate || /* @__PURE__ */ new Date());
  if (
    (payload.iat !== void 0 || maxTokenAge) &&
    typeof payload.iat !== "number"
  ) {
    throw new JWTClaimValidationFailed(
      '"iat" claim must be a number',
      payload,
      "iat",
      "invalid"
    );
  }
  if (payload.nbf !== void 0) {
    if (typeof payload.nbf !== "number") {
      throw new JWTClaimValidationFailed(
        '"nbf" claim must be a number',
        payload,
        "nbf",
        "invalid"
      );
    }
    if (payload.nbf > now + tolerance) {
      throw new JWTClaimValidationFailed(
        '"nbf" claim timestamp check failed',
        payload,
        "nbf",
        "check_failed"
      );
    }
  }
  if (payload.exp !== void 0) {
    if (typeof payload.exp !== "number") {
      throw new JWTClaimValidationFailed(
        '"exp" claim must be a number',
        payload,
        "exp",
        "invalid"
      );
    }
    if (payload.exp <= now - tolerance) {
      throw new JWTExpired(
        '"exp" claim timestamp check failed',
        payload,
        "exp",
        "check_failed"
      );
    }
  }
  if (maxTokenAge) {
    const age = now - payload.iat;
    const max =
      typeof maxTokenAge === "number" ? maxTokenAge : secs(maxTokenAge);
    if (age - tolerance > max) {
      throw new JWTExpired(
        '"iat" claim timestamp check failed (too far in the past)',
        payload,
        "iat",
        "check_failed"
      );
    }
    if (age < 0 - tolerance) {
      throw new JWTClaimValidationFailed(
        '"iat" claim timestamp check failed (it should be in the past)',
        payload,
        "iat",
        "check_failed"
      );
    }
  }
  return payload;
}
__name(validateClaimsSet, "validateClaimsSet");
var JWTClaimsBuilder = class {
  static {
    __name(this, "JWTClaimsBuilder");
  }
  #payload;
  constructor(payload) {
    if (!isObject(payload)) {
      throw new TypeError("JWT Claims Set MUST be an object");
    }
    this.#payload = structuredClone(payload);
  }
  data() {
    return encoder.encode(JSON.stringify(this.#payload));
  }
  get iss() {
    return this.#payload.iss;
  }
  set iss(value) {
    this.#payload.iss = value;
  }
  get sub() {
    return this.#payload.sub;
  }
  set sub(value) {
    this.#payload.sub = value;
  }
  get aud() {
    return this.#payload.aud;
  }
  set aud(value) {
    this.#payload.aud = value;
  }
  set jti(value) {
    this.#payload.jti = value;
  }
  set nbf(value) {
    if (typeof value === "number") {
      this.#payload.nbf = validateInput("setNotBefore", value);
    } else if (value instanceof Date) {
      this.#payload.nbf = validateInput("setNotBefore", epoch(value));
    } else {
      this.#payload.nbf = epoch(/* @__PURE__ */ new Date()) + secs(value);
    }
  }
  set exp(value) {
    if (typeof value === "number") {
      this.#payload.exp = validateInput("setExpirationTime", value);
    } else if (value instanceof Date) {
      this.#payload.exp = validateInput("setExpirationTime", epoch(value));
    } else {
      this.#payload.exp = epoch(/* @__PURE__ */ new Date()) + secs(value);
    }
  }
  set iat(value) {
    if (value === void 0) {
      this.#payload.iat = epoch(/* @__PURE__ */ new Date());
    } else if (value instanceof Date) {
      this.#payload.iat = validateInput("setIssuedAt", epoch(value));
    } else if (typeof value === "string") {
      this.#payload.iat = validateInput(
        "setIssuedAt",
        epoch(/* @__PURE__ */ new Date()) + secs(value)
      );
    } else {
      this.#payload.iat = validateInput("setIssuedAt", value);
    }
  }
};

// node_modules/jose/dist/webapi/jwt/verify.js
async function jwtVerify(jwt, key, options) {
  const verified = await compactVerify(jwt, key, options);
  if (
    verified.protectedHeader.crit?.includes("b64") &&
    verified.protectedHeader.b64 === false
  ) {
    throw new JWTInvalid("JWTs MUST NOT use unencoded payload");
  }
  const payload = validateClaimsSet(
    verified.protectedHeader,
    verified.payload,
    options
  );
  const result = { payload, protectedHeader: verified.protectedHeader };
  if (typeof key === "function") {
    return { ...result, key: verified.key };
  }
  return result;
}
__name(jwtVerify, "jwtVerify");

// node_modules/jose/dist/webapi/jws/flattened/sign.js
var FlattenedSign = class {
  static {
    __name(this, "FlattenedSign");
  }
  #payload;
  #protectedHeader;
  #unprotectedHeader;
  constructor(payload) {
    if (!(payload instanceof Uint8Array)) {
      throw new TypeError("payload must be an instance of Uint8Array");
    }
    this.#payload = payload;
  }
  setProtectedHeader(protectedHeader) {
    assertNotSet(this.#protectedHeader, "setProtectedHeader");
    this.#protectedHeader = protectedHeader;
    return this;
  }
  setUnprotectedHeader(unprotectedHeader) {
    assertNotSet(this.#unprotectedHeader, "setUnprotectedHeader");
    this.#unprotectedHeader = unprotectedHeader;
    return this;
  }
  async sign(key, options) {
    if (!this.#protectedHeader && !this.#unprotectedHeader) {
      throw new JWSInvalid(
        "either setProtectedHeader or setUnprotectedHeader must be called before #sign()"
      );
    }
    if (!isDisjoint(this.#protectedHeader, this.#unprotectedHeader)) {
      throw new JWSInvalid(
        "JWS Protected and JWS Unprotected Header Parameter names must be disjoint"
      );
    }
    const joseHeader = {
      ...this.#protectedHeader,
      ...this.#unprotectedHeader,
    };
    const extensions = validateCrit(
      JWSInvalid,
      /* @__PURE__ */ new Map([["b64", true]]),
      options?.crit,
      this.#protectedHeader,
      joseHeader
    );
    let b64 = true;
    if (extensions.has("b64")) {
      b64 = this.#protectedHeader.b64;
      if (typeof b64 !== "boolean") {
        throw new JWSInvalid(
          'The "b64" (base64url-encode payload) Header Parameter must be a boolean'
        );
      }
    }
    const { alg } = joseHeader;
    if (typeof alg !== "string" || !alg) {
      throw new JWSInvalid(
        'JWS "alg" (Algorithm) Header Parameter missing or invalid'
      );
    }
    checkKeyType(alg, key, "sign");
    let payloadS;
    let payloadB;
    if (b64) {
      payloadS = encode2(this.#payload);
      payloadB = encode(payloadS);
    } else {
      payloadB = this.#payload;
      payloadS = "";
    }
    let protectedHeaderString;
    let protectedHeaderBytes;
    if (this.#protectedHeader) {
      protectedHeaderString = encode2(JSON.stringify(this.#protectedHeader));
      protectedHeaderBytes = encode(protectedHeaderString);
    } else {
      protectedHeaderString = "";
      protectedHeaderBytes = new Uint8Array();
    }
    const data = concat(protectedHeaderBytes, encode("."), payloadB);
    const k = await normalizeKey(key, alg);
    const signature = await sign(alg, k, data);
    const jws = {
      signature: encode2(signature),
      payload: payloadS,
    };
    if (this.#unprotectedHeader) {
      jws.header = this.#unprotectedHeader;
    }
    if (this.#protectedHeader) {
      jws.protected = protectedHeaderString;
    }
    return jws;
  }
};

// node_modules/jose/dist/webapi/jws/compact/sign.js
var CompactSign = class {
  static {
    __name(this, "CompactSign");
  }
  #flattened;
  constructor(payload) {
    this.#flattened = new FlattenedSign(payload);
  }
  setProtectedHeader(protectedHeader) {
    this.#flattened.setProtectedHeader(protectedHeader);
    return this;
  }
  async sign(key, options) {
    const jws = await this.#flattened.sign(key, options);
    if (jws.payload === void 0) {
      throw new TypeError(
        "use the flattened module for creating JWS with b64: false"
      );
    }
    return `${jws.protected}.${jws.payload}.${jws.signature}`;
  }
};

// node_modules/jose/dist/webapi/jwt/sign.js
var SignJWT = class {
  static {
    __name(this, "SignJWT");
  }
  #protectedHeader;
  #jwt;
  constructor(payload = {}) {
    this.#jwt = new JWTClaimsBuilder(payload);
  }
  setIssuer(issuer) {
    this.#jwt.iss = issuer;
    return this;
  }
  setSubject(subject) {
    this.#jwt.sub = subject;
    return this;
  }
  setAudience(audience) {
    this.#jwt.aud = audience;
    return this;
  }
  setJti(jwtId) {
    this.#jwt.jti = jwtId;
    return this;
  }
  setNotBefore(input) {
    this.#jwt.nbf = input;
    return this;
  }
  setExpirationTime(input) {
    this.#jwt.exp = input;
    return this;
  }
  setIssuedAt(input) {
    this.#jwt.iat = input;
    return this;
  }
  setProtectedHeader(protectedHeader) {
    this.#protectedHeader = protectedHeader;
    return this;
  }
  async sign(key, options) {
    const sig = new CompactSign(this.#jwt.data());
    sig.setProtectedHeader(this.#protectedHeader);
    if (
      Array.isArray(this.#protectedHeader?.crit) &&
      this.#protectedHeader.crit.includes("b64") &&
      this.#protectedHeader.b64 === false
    ) {
      throw new JWTInvalid("JWTs MUST NOT use unencoded payload");
    }
    return sig.sign(key, options);
  }
};

// src/utils/jwt.js
function secretKey(secret) {
  return new TextEncoder().encode(secret);
}
__name(secretKey, "secretKey");
async function signAccessToken(payload, env) {
  const now = Math.floor(Date.now() / 1e3);
  return new SignJWT({ ...payload, tokenType: "access" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(now + env.ACCESS_TOKEN_TTL)
    .setJti(crypto.randomUUID())
    .sign(secretKey(env.JWT_SECRET));
}
__name(signAccessToken, "signAccessToken");
async function signRefreshToken(payload, env) {
  const now = Math.floor(Date.now() / 1e3);
  return new SignJWT({ ...payload, tokenType: "refresh" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(now + env.REFRESH_TOKEN_TTL)
    .setJti(crypto.randomUUID())
    .sign(secretKey(env.JWT_SECRET));
}
__name(signRefreshToken, "signRefreshToken");
async function verifyJwt(token, env) {
  const result = await jwtVerify(token, secretKey(env.JWT_SECRET));
  return result.payload;
}
__name(verifyJwt, "verifyJwt");
async function verifyAccessToken(env, token) {
  const payload = await verifyJwt(token, env);
  if (payload.tokenType !== "access") {
    throw new Error("Invalid token type");
  }
  return payload;
}
__name(verifyAccessToken, "verifyAccessToken");

// src/utils/errors.js
var ApiError = class extends Error {
  static {
    __name(this, "ApiError");
  }
  constructor(
    status = 400,
    code = "bad_request",
    message2 = "Requisicao invalida.",
    details = null
  ) {
    super(message2);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
};
function ensure(
  condition,
  status = 400,
  code = "bad_request",
  message2 = "Requisicao invalida.",
  details = null
) {
  if (!condition) {
    throw new ApiError(status, code, message2, details);
  }
}
__name(ensure, "ensure");
function isApiError(error) {
  return error instanceof ApiError;
}
__name(isApiError, "isApiError");

// src/db/d1.js
function normalizeBindings(value) {
  return Array.isArray(value) ? value : [];
}
__name(normalizeBindings, "normalizeBindings");
function getDb(c) {
  const db = c.env?.DB || c.get("db");
  if (!db) {
    throw new ApiError(500, "db_missing", "Binding DB (D1) nao encontrado.");
  }
  return db;
}
__name(getDb, "getDb");
async function all(c, sql, bindings) {
  const db = getDb(c);
  const { results } = await db
    .prepare(sql)
    .bind(...normalizeBindings(bindings))
    .all();
  return results || [];
}
__name(all, "all");
async function first(c, sql, bindings) {
  const db = getDb(c);
  return db
    .prepare(sql)
    .bind(...normalizeBindings(bindings))
    .first();
}
__name(first, "first");
async function run(c, sql, bindings) {
  const db = getDb(c);
  return db
    .prepare(sql)
    .bind(...normalizeBindings(bindings))
    .run();
}
__name(run, "run");

// src/db/repositories/authRepository.js
function findAuthUserByEmail(c, tenantId, email) {
  return first(
    c,
    `
      SELECT id, tenant_id, email, password_hash, name, phone, avatar, role, created_at, updated_at
      FROM auth_users
      WHERE tenant_id = ? AND lower(email) = lower(?)
      LIMIT 1
    `,
    [tenantId, email]
  );
}
__name(findAuthUserByEmail, "findAuthUserByEmail");
function findAuthUserById(c, tenantId, userId) {
  return first(
    c,
    `
      SELECT id, tenant_id, email, password_hash, name, phone, avatar, role, created_at, updated_at
      FROM auth_users
      WHERE tenant_id = ? AND id = ?
      LIMIT 1
    `,
    [tenantId, userId]
  );
}
__name(findAuthUserById, "findAuthUserById");
async function insertAuthUser(c, payload) {
  const now = payload.createdAt || /* @__PURE__ */ new Date().toISOString();
  await run(
    c,
    `
      INSERT INTO auth_users (
        id, tenant_id, email, password_hash, name, phone, avatar, role, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      payload.id,
      payload.tenantId,
      payload.email,
      payload.passwordHash,
      payload.name || null,
      payload.phone || null,
      payload.avatar || null,
      payload.role || "owner",
      now,
      payload.updatedAt || now,
    ]
  );
}
__name(insertAuthUser, "insertAuthUser");
function touchAuthUserLogin(c, userId, tenantId) {
  const now = /* @__PURE__ */ new Date().toISOString();
  return run(
    c,
    `
      UPDATE auth_users
      SET last_login_at = ?, updated_at = ?
      WHERE id = ? AND tenant_id = ?
    `,
    [now, now, userId, tenantId]
  );
}
__name(touchAuthUserLogin, "touchAuthUserLogin");
function insertRefreshToken(c, payload) {
  return run(
    c,
    `
      INSERT INTO refresh_tokens (
        id, tenant_id, user_id, token_hash, user_agent, ip_address, expires_at, revoked_at, rotated_from, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      payload.id,
      payload.tenantId,
      payload.userId,
      payload.tokenHash,
      payload.userAgent || null,
      payload.ipAddress || null,
      payload.expiresAt,
      null,
      payload.rotatedFrom || null,
      payload.createdAt || /* @__PURE__ */ new Date().toISOString(),
    ]
  );
}
__name(insertRefreshToken, "insertRefreshToken");
function findRefreshTokenByHash(c, tenantId, tokenHash) {
  return first(
    c,
    `
      SELECT *
      FROM refresh_tokens
      WHERE tenant_id = ? AND token_hash = ?
      LIMIT 1
    `,
    [tenantId, tokenHash]
  );
}
__name(findRefreshTokenByHash, "findRefreshTokenByHash");
function revokeRefreshTokenByHash(c, tenantId, tokenHash) {
  return run(
    c,
    `
      UPDATE refresh_tokens
      SET revoked_at = COALESCE(revoked_at, ?)
      WHERE tenant_id = ? AND token_hash = ?
    `,
    [/* @__PURE__ */ new Date().toISOString(), tenantId, tokenHash]
  );
}
__name(revokeRefreshTokenByHash, "revokeRefreshTokenByHash");
function revokeAllUserRefreshTokens(c, tenantId, userId) {
  return run(
    c,
    `
      UPDATE refresh_tokens
      SET revoked_at = COALESCE(revoked_at, ?)
      WHERE tenant_id = ? AND user_id = ?
    `,
    [/* @__PURE__ */ new Date().toISOString(), tenantId, userId]
  );
}
__name(revokeAllUserRefreshTokens, "revokeAllUserRefreshTokens");
function insertPasswordReset(c, payload) {
  return run(
    c,
    `
      INSERT INTO password_resets (id, tenant_id, user_id, token_hash, expires_at, used_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      payload.id,
      payload.tenantId,
      payload.userId,
      payload.tokenHash,
      payload.expiresAt,
      null,
      payload.createdAt || /* @__PURE__ */ new Date().toISOString(),
    ]
  );
}
__name(insertPasswordReset, "insertPasswordReset");
function findPasswordResetByHash(c, tenantId, tokenHash) {
  return first(
    c,
    `
      SELECT *
      FROM password_resets
      WHERE tenant_id = ? AND token_hash = ?
      LIMIT 1
    `,
    [tenantId, tokenHash]
  );
}
__name(findPasswordResetByHash, "findPasswordResetByHash");
function usePasswordResetToken(c, tenantId, tokenHash) {
  return run(
    c,
    `
      UPDATE password_resets
      SET used_at = COALESCE(used_at, ?)
      WHERE tenant_id = ? AND token_hash = ?
    `,
    [/* @__PURE__ */ new Date().toISOString(), tenantId, tokenHash]
  );
}
__name(usePasswordResetToken, "usePasswordResetToken");
function updateAuthUserPassword(c, tenantId, userId, passwordHash) {
  return run(
    c,
    `
      UPDATE auth_users
      SET password_hash = ?, updated_at = ?
      WHERE tenant_id = ? AND id = ?
    `,
    [passwordHash, /* @__PURE__ */ new Date().toISOString(), tenantId, userId]
  );
}
__name(updateAuthUserPassword, "updateAuthUserPassword");
function updateAuthUserProfileByEmail(c, tenantId, email, payload) {
  return run(
    c,
    `
      UPDATE auth_users
      SET
        name = COALESCE(?, name),
        avatar = COALESCE(?, avatar),
        updated_at = ?
      WHERE tenant_id = ? AND lower(email) = lower(?)
    `,
    [
      payload?.name || null,
      payload?.avatar || null,
      /* @__PURE__ */ new Date().toISOString(),
      tenantId,
      email,
    ]
  );
}
__name(updateAuthUserProfileByEmail, "updateAuthUserProfileByEmail");

// src/db/repositories/subscriptionRepository.js
async function getCurrentSubscription(c, tenantId) {
  return first(
    c,
    `
      SELECT *
      FROM subscriptions
      WHERE tenant_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [tenantId]
  );
}
__name(getCurrentSubscription, "getCurrentSubscription");
async function createSubscription(c, payload) {
  await run(
    c,
    `
      INSERT INTO subscriptions (
        id,
        tenant_id,
        plan_id,
        provider,
        provider_subscription_id,
        status,
        trial_ends_at,
        current_period_start,
        current_period_end,
        canceled_at,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      payload.id,
      payload.tenantId,
      payload.planId,
      payload.provider || "manual",
      payload.providerSubscriptionId || null,
      payload.status || "active",
      payload.trialEndsAt || null,
      payload.currentPeriodStart || null,
      payload.currentPeriodEnd || null,
      payload.canceledAt || null,
      payload.createdAt,
      payload.updatedAt,
    ]
  );
}
__name(createSubscription, "createSubscription");
async function updateSubscription(c, subscriptionId, tenantId, patch) {
  const existing = await first(
    c,
    `
      SELECT *
      FROM subscriptions
      WHERE id = ? AND tenant_id = ?
      LIMIT 1
    `,
    [subscriptionId, tenantId]
  );
  if (!existing) return null;
  const next = {
    ...existing,
    ...patch,
  };
  await run(
    c,
    `
      UPDATE subscriptions
      SET
        plan_id = ?,
        provider = ?,
        provider_subscription_id = ?,
        status = ?,
        trial_ends_at = ?,
        current_period_start = ?,
        current_period_end = ?,
        canceled_at = ?,
        updated_at = ?
      WHERE id = ? AND tenant_id = ?
    `,
    [
      next.plan_id || next.planId,
      next.provider,
      next.provider_subscription_id || next.providerSubscriptionId || null,
      next.status,
      next.trial_ends_at || next.trialEndsAt || null,
      next.current_period_start || next.currentPeriodStart || null,
      next.current_period_end || next.currentPeriodEnd || null,
      next.canceled_at || next.canceledAt || null,
      patch.updatedAt || /* @__PURE__ */ new Date().toISOString(),
      subscriptionId,
      tenantId,
    ]
  );
  return first(
    c,
    `
      SELECT *
      FROM subscriptions
      WHERE id = ? AND tenant_id = ?
      LIMIT 1
    `,
    [subscriptionId, tenantId]
  );
}
__name(updateSubscription, "updateSubscription");

// src/db/repositories/planRepository.js
function safeParseJson(value) {
  if (!value) return {};
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}
__name(safeParseJson, "safeParseJson");
function parsePlan(row) {
  if (!row) return null;
  return {
    ...row,
    limits: safeParseJson(row.limits_json),
    features: safeParseJson(row.features_json),
  };
}
__name(parsePlan, "parsePlan");
async function listPlans(c) {
  const rows = await all(
    c,
    "SELECT * FROM plans WHERE active = 1 ORDER BY price_cents ASC",
    []
  );
  return rows.map(parsePlan);
}
__name(listPlans, "listPlans");
async function findPlanById(c, planId) {
  const row = await first(c, "SELECT * FROM plans WHERE id = ? LIMIT 1", [
    planId,
  ]);
  return parsePlan(row);
}
__name(findPlanById, "findPlanById");

// src/services/authService.js
function sanitizeAuthUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name || "",
    avatar: user.avatar || null,
    phone: user.phone || null,
    role: user.role || "owner",
  };
}
__name(sanitizeAuthUser, "sanitizeAuthUser");
function safeUrl(value) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}
__name(safeUrl, "safeUrl");
function resolveGoogleRedirectUri(c) {
  const env = c.get("env");
  if (env.GOOGLE_REDIRECT_URI) return env.GOOGLE_REDIRECT_URI;
  const host = c.req.header("x-forwarded-host") || c.req.header("host");
  const protocol = c.req.header("x-forwarded-proto") || "https";
  if (host) {
    return `${protocol}://${host}/api/auth/google/callback`;
  }
  const fallback = safeUrl(env.PUBLIC_BASE_URL);
  if (fallback) {
    fallback.pathname = "/api/auth/google/callback";
    fallback.search = "";
    fallback.hash = "";
    return fallback.toString();
  }
  return "http://localhost:8787/api/auth/google/callback";
}
__name(resolveGoogleRedirectUri, "resolveGoogleRedirectUri");
async function ensureTenantSubscription(c, tenantId) {
  const env = c.get("env");
  const hasSubscription = await getCurrentSubscription(c, tenantId);
  if (hasSubscription) return;
  const starterPlan = await findPlanById(c, "starter");
  const now = /* @__PURE__ */ new Date().toISOString();
  await createSubscription(c, {
    id: crypto.randomUUID(),
    tenantId,
    planId: starterPlan?.id || "starter",
    provider: "trial",
    status: "trialing",
    trialEndsAt: new Date(
      Date.now() + env.TRIAL_DAYS * 24 * 60 * 60 * 1e3
    ).toISOString(),
    currentPeriodStart: now,
    currentPeriodEnd: new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1e3
    ).toISOString(),
    createdAt: now,
    updatedAt: now,
  });
}
__name(ensureTenantSubscription, "ensureTenantSubscription");
async function createSession(c, authUser) {
  const tenant = c.get("tenant");
  const env = c.get("env");
  const now = Date.now();
  const refreshExpiresAt = new Date(
    now + env.REFRESH_TOKEN_TTL * 1e3
  ).toISOString();
  const ua = c.req.header("user-agent") || "unknown";
  const ip =
    c.req.header("cf-connecting-ip") ||
    c.req.header("x-forwarded-for") ||
    "unknown";
  const accessToken = await signAccessToken(
    {
      sub: authUser.id,
      email: authUser.email,
      name: authUser.name || "",
      role: authUser.role || "owner",
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
    },
    env
  );
  const rawRefreshToken = await signRefreshToken(
    {
      sub: authUser.id,
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
    },
    env
  );
  const refreshTokenHash = await sha256(rawRefreshToken);
  const refreshCreatedAt = /* @__PURE__ */ new Date().toISOString();
  await insertRefreshToken(c, {
    id: crypto.randomUUID(),
    tenantId: tenant.id,
    userId: authUser.id,
    tokenHash: refreshTokenHash,
    userAgent: ua,
    ipAddress: ip,
    expiresAt: refreshExpiresAt,
    rotatedFrom: null,
    createdAt: refreshCreatedAt,
  });
  await touchAuthUserLogin(c, authUser.id, tenant.id);
  return {
    token: accessToken,
    refreshToken: rawRefreshToken,
    user: sanitizeAuthUser(authUser),
  };
}
__name(createSession, "createSession");
async function login(c, input) {
  const tenant = c.get("tenant");
  const email = (input?.email || "").trim().toLowerCase();
  const password = input?.password || "";
  ensure(
    email && password,
    400,
    "validation_error",
    "Email e senha sao obrigatorios."
  );
  const authUser = await findAuthUserByEmail(c, tenant.id, email);
  ensure(authUser, 401, "invalid_credentials", "Email ou senha incorretos.");
  const validPassword = await checkPassword(password, authUser.password_hash);
  ensure(
    validPassword,
    401,
    "invalid_credentials",
    "Email ou senha incorretos."
  );
  return createSession(c, authUser);
}
__name(login, "login");
async function register(c, input) {
  const tenant = c.get("tenant");
  const email = (input?.email || "").trim().toLowerCase();
  const password = input?.password || "";
  const phone = (input?.phone || "").trim() || null;
  const name =
    (input?.name || "").trim() || (email ? email.split("@")[0] : "Usuario");
  ensure(
    email && password,
    400,
    "validation_error",
    "Email e senha sao obrigatorios."
  );
  ensure(
    password.length >= 6,
    400,
    "validation_error",
    "A senha deve ter ao menos 6 caracteres."
  );
  const existing = await findAuthUserByEmail(c, tenant.id, email);
  ensure(!existing, 409, "email_exists", "Este email ja esta cadastrado.");
  const createdUser = {
    id: crypto.randomUUID(),
    tenantId: tenant.id,
    email,
    passwordHash: await hashPassword(password),
    name,
    phone,
    role: "owner",
  };
  await insertAuthUser(c, createdUser);
  await ensureTenantSubscription(c, tenant.id);
  const authUser = await findAuthUserById(c, tenant.id, createdUser.id);
  return createSession(c, authUser);
}
__name(register, "register");
function startGoogleAuth(c, state) {
  const env = c.get("env");
  ensure(
    env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET,
    500,
    "google_not_configured",
    "Google OAuth nao configurado."
  );
  ensure(state, 400, "validation_error", "State OAuth invalido.");
  const redirectUri = resolveGoogleRedirectUri(c);
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", env.GOOGLE_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("state", state);
  return authUrl.toString();
}
__name(startGoogleAuth, "startGoogleAuth");
async function exchangeGoogleCode(c, code) {
  const env = c.get("env");
  const redirectUri = resolveGoogleRedirectUri(c);
  const body = new URLSearchParams({
    code,
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const payload = await response.json().catch(() => ({}));
  ensure(
    response.ok,
    401,
    "google_auth_failed",
    payload?.error_description || "Falha ao autenticar com Google."
  );
  ensure(
    payload?.access_token,
    401,
    "google_auth_failed",
    "Token do Google nao retornado."
  );
  return payload.access_token;
}
__name(exchangeGoogleCode, "exchangeGoogleCode");
async function fetchGoogleProfile(accessToken) {
  const response = await fetch(
    "https://www.googleapis.com/oauth2/v3/userinfo",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  const payload = await response.json().catch(() => ({}));
  ensure(
    response.ok,
    401,
    "google_auth_failed",
    "Nao foi possivel obter perfil do Google."
  );
  return payload;
}
__name(fetchGoogleProfile, "fetchGoogleProfile");
async function loginWithGoogleCode(c, code) {
  const tenant = c.get("tenant");
  ensure(code, 400, "validation_error", "Codigo OAuth nao informado.");
  const accessToken = await exchangeGoogleCode(c, code);
  const profile = await fetchGoogleProfile(accessToken);
  const email = String(profile?.email || "")
    .trim()
    .toLowerCase();
  ensure(email, 400, "google_auth_failed", "Email do Google nao informado.");
  let authUser = await findAuthUserByEmail(c, tenant.id, email);
  if (!authUser) {
    const createdUser = {
      id: crypto.randomUUID(),
      tenantId: tenant.id,
      email,
      passwordHash: await hashPassword(randomToken()),
      name: (profile?.name || "").trim() || email.split("@")[0],
      avatar: profile?.picture || null,
      role: "owner",
    };
    await insertAuthUser(c, createdUser);
    await ensureTenantSubscription(c, tenant.id);
    authUser = await findAuthUserById(c, tenant.id, createdUser.id);
  } else {
    await updateAuthUserProfileByEmail(c, tenant.id, email, {
      name: (profile?.name || "").trim() || authUser.name || "",
      avatar: profile?.picture || authUser.avatar || null,
    });
    authUser = await findAuthUserById(c, tenant.id, authUser.id);
  }
  ensure(
    authUser,
    401,
    "google_auth_failed",
    "Falha ao criar sessao do usuario Google."
  );
  return createSession(c, authUser);
}
__name(loginWithGoogleCode, "loginWithGoogleCode");
async function refreshSession(c, input) {
  const tenant = c.get("tenant");
  const providedRefreshToken = input?.refreshToken || "";
  ensure(
    providedRefreshToken,
    400,
    "validation_error",
    "refreshToken e obrigatorio."
  );
  let payload;
  try {
    payload = await verifyJwt(providedRefreshToken, c.get("env"));
  } catch {
    ensure(false, 401, "invalid_refresh_token", "Refresh token invalido.");
  }
  ensure(
    payload.tokenType === "refresh",
    401,
    "invalid_refresh_token",
    "Refresh token invalido."
  );
  ensure(
    payload.tenantId === tenant.id,
    403,
    "tenant_mismatch",
    "Token invalido para este tenant."
  );
  const refreshHash = await sha256(providedRefreshToken);
  const stored = await findRefreshTokenByHash(c, tenant.id, refreshHash);
  ensure(stored, 401, "invalid_refresh_token", "Refresh token invalido.");
  ensure(
    !stored.revoked_at,
    401,
    "invalid_refresh_token",
    "Refresh token revogado."
  );
  ensure(
    new Date(stored.expires_at).getTime() > Date.now(),
    401,
    "invalid_refresh_token",
    "Refresh token expirado."
  );
  await revokeRefreshTokenByHash(c, tenant.id, refreshHash);
  const authUser = await findAuthUserById(c, tenant.id, stored.user_id);
  ensure(authUser, 401, "invalid_refresh_token", "Usuario nao encontrado.");
  return createSession(c, authUser);
}
__name(refreshSession, "refreshSession");
async function logout(c, input) {
  const tenant = c.get("tenant");
  const refreshToken2 = input?.refreshToken || "";
  if (!refreshToken2) return { ok: true };
  const refreshHash = await sha256(refreshToken2);
  await revokeRefreshTokenByHash(c, tenant.id, refreshHash);
  return { ok: true };
}
__name(logout, "logout");
async function beginPasswordRecovery(c, input) {
  const tenant = c.get("tenant");
  const env = c.get("env");
  const email = (input?.email || "").trim().toLowerCase();
  ensure(email, 400, "validation_error", "Email e obrigatorio.");
  const user = await findAuthUserByEmail(c, tenant.id, email);
  if (!user) {
    return { ok: true };
  }
  const rawToken = randomToken();
  const tokenHash = await sha256(rawToken);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1e3).toISOString();
  await insertPasswordReset(c, {
    id: crypto.randomUUID(),
    tenantId: tenant.id,
    userId: user.id,
    tokenHash,
    expiresAt,
  });
  if (env.RESEND_API_KEY && env.RESEND_FROM_EMAIL && env.PUBLIC_BASE_URL) {
    const url = `${env.PUBLIC_BASE_URL.replace(
      /\/$/,
      ""
    )}/login?resetToken=${encodeURIComponent(rawToken)}`;
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.RESEND_FROM_EMAIL,
        to: [email],
        subject: "Recuperacao de senha",
        html: `<p>Use o link para redefinir sua senha:</p><p><a href="${url}">${url}</a></p>`,
      }),
    });
  }
  return { ok: true };
}
__name(beginPasswordRecovery, "beginPasswordRecovery");
async function resetPassword(c, input) {
  const tenant = c.get("tenant");
  const resetToken = input?.token || "";
  const nextPassword = input?.password || "";
  ensure(
    resetToken && nextPassword,
    400,
    "validation_error",
    "Token e senha sao obrigatorios."
  );
  ensure(
    nextPassword.length >= 6,
    400,
    "validation_error",
    "A senha deve ter ao menos 6 caracteres."
  );
  const tokenHash = await sha256(resetToken);
  const record = await findPasswordResetByHash(c, tenant.id, tokenHash);
  ensure(record, 400, "invalid_reset_token", "Token de reset invalido.");
  ensure(
    !record.used_at,
    400,
    "invalid_reset_token",
    "Token de reset ja utilizado."
  );
  ensure(
    new Date(record.expires_at).getTime() > Date.now(),
    400,
    "invalid_reset_token",
    "Token de reset expirado."
  );
  const newHash = await hashPassword(nextPassword);
  await updateAuthUserPassword(c, tenant.id, record.user_id, newHash);
  await usePasswordResetToken(c, tenant.id, tokenHash);
  await revokeAllUserRefreshTokens(c, tenant.id, record.user_id);
  return { ok: true };
}
__name(resetPassword, "resetPassword");

// src/controllers/baseController.js
async function parseJsonBody(c) {
  try {
    return await c.req.json();
  } catch {
    throw new ApiError(400, "invalid_json", "Body JSON invalido.");
  }
}
__name(parseJsonBody, "parseJsonBody");
function parseQuery(c) {
  const url = new URL(c.req.url);
  return Object.fromEntries(url.searchParams.entries());
}
__name(parseQuery, "parseQuery");
function sendOk(c, payload, status = 200) {
  return c.json(payload, status);
}
__name(sendOk, "sendOk");
function sendCreated(c, payload) {
  return c.json(payload, 201);
}
__name(sendCreated, "sendCreated");
function ok(c, payload, status = 200) {
  return sendOk(c, payload, status);
}
__name(ok, "ok");
function handleControllerError(c, error) {
  if (isApiError(error)) {
    return c.json(
      {
        message: error.message,
        code: error.code,
        details: error.details || null,
      },
      error.status
    );
  }
  console.error("[controller:error]", error);
  return c.json(
    {
      message: "Falha interna no servidor.",
      code: "internal_error",
      details: null,
    },
    500
  );
}
__name(handleControllerError, "handleControllerError");
function withController(handler) {
  return async c => {
    try {
      return await handler(c);
    } catch (error) {
      return handleControllerError(c, error);
    }
  };
}
__name(withController, "withController");
function withJsonBody(handler, required = true) {
  return withController(async c => {
    let payload = {};
    if (required) {
      payload = await parseJsonBody(c);
    } else if (
      c.req.header("content-length") &&
      c.req.header("content-length") !== "0"
    ) {
      payload = await parseJsonBody(c);
    }
    return handler(c, payload);
  });
}
__name(withJsonBody, "withJsonBody");
var parseBody2 = parseJsonBody;

// src/controllers/authController.js
function readCookie(c, name) {
  const header = c.req.header("cookie") || "";
  const pair = header
    .split(";")
    .map(item => item.trim())
    .find(item => item.startsWith(`${name}=`));
  if (!pair) return null;
  return decodeURIComponent(pair.slice(name.length + 1));
}
__name(readCookie, "readCookie");
function buildOAuthCookie(name, value, maxAge, secure = true) {
  return `${name}=${encodeURIComponent(
    value
  )}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge};${
    secure ? " Secure;" : ""
  }`;
}
__name(buildOAuthCookie, "buildOAuthCookie");
var login2 = withController(async c => {
  const payload = await parseJsonBody(c);
  const result = await login(c, payload);
  return sendOk(c, result);
});
var register2 = withController(async c => {
  const payload = await parseJsonBody(c);
  const result = await register(c, payload);
  return sendCreated(c, result);
});
var refreshToken = withController(async c => {
  const payload = await parseJsonBody(c);
  const result = await refreshSession(c, payload);
  return sendOk(c, result);
});
var logout2 = withController(async c => {
  const payload = await parseJsonBody(c);
  const result = await logout(c, payload);
  return sendOk(c, result);
});
var recoverPassword = withController(async c => {
  const payload = await parseJsonBody(c);
  const result = await beginPasswordRecovery(c, payload);
  return sendOk(c, result);
});
var resetPassword2 = withController(async c => {
  const payload = await parseJsonBody(c);
  const result = await resetPassword(c, payload);
  return sendOk(c, result);
});
var startGoogleAuth2 = withController(async c => {
  const state = crypto.randomUUID();
  const redirectToGoogle = startGoogleAuth(c, state);
  const secure = (c.req.header("x-forwarded-proto") || "https") === "https";
  c.header(
    "Set-Cookie",
    buildOAuthCookie("affily_google_oauth_state", state, 600, secure)
  );
  return c.redirect(redirectToGoogle, 302);
});
var handleGoogleCallback = withController(async c => {
  const code = c.req.query("code") || "";
  const state = c.req.query("state") || "";
  const expectedState = readCookie(c, "affily_google_oauth_state") || "";
  const secure = (c.req.header("x-forwarded-proto") || "https") === "https";
  c.header(
    "Set-Cookie",
    buildOAuthCookie("affily_google_oauth_state", "", 0, secure)
  );
  if (!state || !expectedState || state !== expectedState) {
    return c.json(
      {
        message: "State OAuth invalido.",
        code: "google_state_invalid",
      },
      401
    );
  }
  const session = await loginWithGoogleCode(c, code);
  return sendOk(c, session);
});

// src/middlewares/rateLimitMiddleware.js
function nowWindow(windowSeconds) {
  return Math.floor(Date.now() / 1e3 / windowSeconds) * windowSeconds;
}
__name(nowWindow, "nowWindow");
function createRateLimit({ routeKey, limit = 30, windowSeconds = 60 }) {
  return /* @__PURE__ */ __name(async function rateLimit(c, next) {
    const tenant = c.get("tenant");
    if (!tenant) {
      throw new ApiError(400, "tenant_not_resolved", "Tenant nao resolvido.");
    }
    const ip =
      c.req.header("cf-connecting-ip") ||
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
      "0.0.0.0";
    const windowStart = nowWindow(windowSeconds);
    const id = `${tenant.id}:${routeKey}:${ip}:${windowStart}`;
    await run(
      c,
      `
        INSERT INTO rate_limits (id, tenant_id, ip, route_key, window_start, counter, updated_at)
        VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
        ON CONFLICT(tenant_id, ip, route_key, window_start)
        DO UPDATE SET
          counter = counter + 1,
          updated_at = CURRENT_TIMESTAMP
      `,
      [id, tenant.id, ip, routeKey, windowStart]
    );
    const rows = await all(
      c,
      `SELECT counter FROM rate_limits WHERE tenant_id = ? AND ip = ? AND route_key = ? AND window_start = ? LIMIT 1`,
      [tenant.id, ip, routeKey, windowStart]
    );
    const current = Number(rows?.[0]?.counter || 0);
    if (current > limit) {
      throw new ApiError(
        429,
        "rate_limited",
        "Muitas requisicoes. Tente novamente em instantes."
      );
    }
    await next();
  }, "rateLimit");
}
__name(createRateLimit, "createRateLimit");

// src/routes/authRoutes.js
var authRoutes = new Hono2();
authRoutes.get("/google", startGoogleAuth2);
authRoutes.get("/google/callback", handleGoogleCallback);
authRoutes.post(
  "/login",
  createRateLimit({ routeKey: "auth-login", limit: 8, windowSeconds: 60 }),
  login2
);
authRoutes.post(
  "/register",
  createRateLimit({ routeKey: "auth-register", limit: 8, windowSeconds: 60 }),
  register2
);
authRoutes.post("/refresh", refreshToken);
authRoutes.post("/logout", logout2);
authRoutes.post(
  "/recover",
  createRateLimit({ routeKey: "auth-recover", limit: 5, windowSeconds: 60 }),
  recoverPassword
);
authRoutes.post(
  "/reset",
  createRateLimit({ routeKey: "auth-reset", limit: 5, windowSeconds: 60 }),
  resetPassword2
);
var authRoutes_default = authRoutes;

// src/middlewares/authMiddleware.js
function extractBearer(c) {
  const authHeader = c.req.header("authorization") || "";
  return authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
}
__name(extractBearer, "extractBearer");
async function protect(c, next) {
  const token = extractBearer(c);
  if (!token) {
    throw new ApiError(401, "unauthorized", "Token ausente.");
  }
  let payload;
  try {
    payload = await verifyAccessToken(c.get("env"), token);
  } catch {
    throw new ApiError(401, "unauthorized", "Token invalido ou expirado.");
  }
  const tenant = c.get("tenant");
  if (!tenant) {
    throw new ApiError(400, "tenant_not_resolved", "Tenant nao resolvido.");
  }
  if (payload.tenantId !== tenant.id) {
    throw new ApiError(
      403,
      "tenant_mismatch",
      "Token invalido para este tenant."
    );
  }
  c.set("auth", payload);
  await next();
}
__name(protect, "protect");

// src/db/repositories/productRepository.js
function mapProduct(row) {
  if (!row) return null;
  return {
    id: row.id,
    tenantId: row.tenant_id,
    storeId: row.store_id,
    categoryId: row.category_id,
    link: row.link || "",
    categoria: row.categoria || "geral",
    sazonalidade: row.sazonalidade || "sempre",
    name: row.name,
    image: row.image,
    price: Number(row.price || 0),
    originalPrice: Number(row.original_price || 0),
    discount: Number(row.discount || 0),
    seller: row.seller || "Loja Oficial",
    metrics: {
      clicks: Number(row.metrics_clicks || 0),
      conversion: Number(row.metrics_conversion || 0),
      trend: Number(row.metrics_trend || 0),
    },
    seasonal: row.seasonal_json ? JSON.parse(row.seasonal_json) : {},
    active: Boolean(row.active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
__name(mapProduct, "mapProduct");
async function listProductsByTenant(c, tenantId, storeId) {
  if (storeId) {
    const rows2 = await all(
      c,
      `SELECT * FROM products WHERE tenant_id = ? AND store_id = ? ORDER BY created_at DESC`,
      [tenantId, storeId]
    );
    return rows2.map(mapProduct);
  }
  const rows = await all(
    c,
    `SELECT * FROM products WHERE tenant_id = ? ORDER BY created_at DESC`,
    [tenantId]
  );
  return rows.map(mapProduct);
}
__name(listProductsByTenant, "listProductsByTenant");
async function createProductRow(c, payload) {
  await run(
    c,
    `INSERT INTO products (
      id, tenant_id, store_id, category_id, link, categoria, sazonalidade, name, image, price, original_price, discount,
      seller, metrics_clicks, metrics_conversion, metrics_trend, seasonal_json, active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.id,
      payload.tenantId,
      payload.storeId,
      payload.categoryId || null,
      payload.link || "",
      payload.categoria || "geral",
      payload.sazonalidade || "sempre",
      payload.name,
      payload.image || null,
      Number(payload.price || 0),
      Number(payload.originalPrice || payload.price || 0),
      Number(payload.discount || 0),
      payload.seller || "Loja Oficial",
      Number(payload.metrics?.clicks || 0),
      Number(payload.metrics?.conversion || 0),
      Number(payload.metrics?.trend || 0),
      JSON.stringify(payload.seasonal || {}),
      payload.active ? 1 : 0,
      payload.createdAt,
      payload.updatedAt,
    ]
  );
  return findProductById(c, payload.tenantId, payload.id);
}
__name(createProductRow, "createProductRow");
async function findProductById(c, tenantId, productId) {
  const row = await first(
    c,
    `SELECT * FROM products WHERE tenant_id = ? AND id = ? LIMIT 1`,
    [tenantId, productId]
  );
  return mapProduct(row);
}
__name(findProductById, "findProductById");
async function updateProductById(c, tenantId, productId, payload) {
  await run(
    c,
    `UPDATE products SET
      store_id = ?,
      category_id = ?,
      link = ?,
      categoria = ?,
      sazonalidade = ?,
      name = ?,
      image = ?,
      price = ?,
      original_price = ?,
      discount = ?,
      seller = ?,
      metrics_clicks = ?,
      metrics_conversion = ?,
      metrics_trend = ?,
      seasonal_json = ?,
      active = ?,
      updated_at = ?
    WHERE tenant_id = ? AND id = ?`,
    [
      payload.storeId,
      payload.categoryId || null,
      payload.link || "",
      payload.categoria || "geral",
      payload.sazonalidade || "sempre",
      payload.name,
      payload.image || null,
      Number(payload.price || 0),
      Number(payload.originalPrice || payload.price || 0),
      Number(payload.discount || 0),
      payload.seller || "Loja Oficial",
      Number(payload.metrics?.clicks || 0),
      Number(payload.metrics?.conversion || 0),
      Number(payload.metrics?.trend || 0),
      JSON.stringify(payload.seasonal || {}),
      payload.active ? 1 : 0,
      payload.updatedAt,
      tenantId,
      productId,
    ]
  );
  return findProductById(c, tenantId, productId);
}
__name(updateProductById, "updateProductById");
async function deleteProductById(c, tenantId, productId) {
  const current = await findProductById(c, tenantId, productId);
  if (!current) return null;
  await run(c, `DELETE FROM products WHERE tenant_id = ? AND id = ?`, [
    tenantId,
    productId,
  ]);
  return current;
}
__name(deleteProductById, "deleteProductById");

// src/db/repositories/settingsRepository.js
function parseData(raw2, fallback) {
  if (!raw2) return fallback;
  try {
    const parsed = JSON.parse(raw2);
    return parsed && typeof parsed === "object" ? parsed : fallback;
  } catch {
    return fallback;
  }
}
__name(parseData, "parseData");
async function getSettings(c, table, tenantId, fallback = {}) {
  const row = await first(
    c,
    `SELECT data FROM ${table} WHERE tenant_id = ? LIMIT 1`,
    [tenantId]
  );
  return parseData(row?.data, fallback);
}
__name(getSettings, "getSettings");
async function upsertSettings(c, table, tenantId, data) {
  await run(
    c,
    `
      INSERT INTO ${table} (tenant_id, data, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(tenant_id) DO UPDATE SET
        data = excluded.data,
        updated_at = CURRENT_TIMESTAMP
    `,
    [tenantId, JSON.stringify(data || {})]
  );
  return getSettings(c, table, tenantId, {});
}
__name(upsertSettings, "upsertSettings");
function getProductSettings(c, tenantId, fallback = {}) {
  return getSettings(c, "product_settings", tenantId, fallback);
}
__name(getProductSettings, "getProductSettings");
function updateProductSettings(c, tenantId, data) {
  return upsertSettings(c, "product_settings", tenantId, data);
}
__name(updateProductSettings, "updateProductSettings");
function getAdsSettings(c, tenantId, fallback = {}) {
  return getSettings(c, "ads_settings", tenantId, fallback);
}
__name(getAdsSettings, "getAdsSettings");
function updateAdsSettings(c, tenantId, data) {
  return upsertSettings(c, "ads_settings", tenantId, data);
}
__name(updateAdsSettings, "updateAdsSettings");

// src/db/repositories/storeRepository.js
function toStore(row) {
  if (!row) return null;
  return {
    id: row.id,
    tenantId: row.tenant_id,
    planId: row.plan_id || "starter",
    name: row.name,
    slug: row.slug,
    subdomainSlug: row.subdomain_slug || null,
    tagline: row.tagline || "",
    description: row.description || "",
    logo: row.logo || null,
    colorPrimary: row.color_primary || "#0f172a",
    colorSecondary: row.color_secondary || "#22c55e",
    branding: row.branding || "AFFILY",
    social: row.social || "",
    theme: row.theme || "studio",
    font: row.font || "inter",
    showRatings: Boolean(row.show_ratings),
    showSalesCount: Boolean(row.show_sales_count),
    darkMode: Boolean(row.dark_mode),
    active: Boolean(row.active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
__name(toStore, "toStore");
async function listStoresByTenant(c, tenantId) {
  const rows = await all(
    c,
    `
      SELECT *
      FROM stores
      WHERE tenant_id = ?
      ORDER BY datetime(created_at) ASC
    `,
    [tenantId]
  );
  return rows.map(toStore);
}
__name(listStoresByTenant, "listStoresByTenant");
async function listStores(c, tenantId) {
  return listStoresByTenant(c, tenantId);
}
__name(listStores, "listStores");
async function findStoreById(c, tenantId, id) {
  const row = await first(
    c,
    `
      SELECT *
      FROM stores
      WHERE tenant_id = ? AND id = ?
    `,
    [tenantId, id]
  );
  return toStore(row);
}
__name(findStoreById, "findStoreById");
async function countStoresByTenant(c, tenantId) {
  const row = await first(
    c,
    `
      SELECT COUNT(*) AS total
      FROM stores
      WHERE tenant_id = ?
    `,
    [tenantId]
  );
  return Number(row?.total || 0);
}
__name(countStoresByTenant, "countStoresByTenant");
async function findStoreBySlug(c, tenantId, slug) {
  const row = await first(
    c,
    `
      SELECT *
      FROM stores
      WHERE tenant_id = ? AND slug = ?
    `,
    [tenantId, slug]
  );
  return toStore(row);
}
__name(findStoreBySlug, "findStoreBySlug");
async function findStoreBySubdomainSlug(c, subdomainSlug) {
  if (!subdomainSlug) return null;
  const row = await first(
    c,
    `
      SELECT *
      FROM stores
      WHERE subdomain_slug = ?
      LIMIT 1
    `,
    [subdomainSlug]
  );
  return toStore(row);
}
__name(findStoreBySubdomainSlug, "findStoreBySubdomainSlug");
async function findStoreByLegacySlug(c, slug) {
  if (!slug) return null;
  const countRow = await first(
    c,
    `
      SELECT COUNT(*) AS total
      FROM stores
      WHERE slug = ?
    `,
    [slug]
  );
  if (Number(countRow?.total || 0) !== 1) return null;
  const row = await first(
    c,
    `
      SELECT *
      FROM stores
      WHERE slug = ?
      ORDER BY datetime(created_at) ASC
      LIMIT 1
    `,
    [slug]
  );
  return toStore(row);
}
__name(findStoreByLegacySlug, "findStoreByLegacySlug");
async function findStoreByAnySubdomainSlug(c, subdomainSlug, excludeId = null) {
  if (!subdomainSlug) return null;
  if (excludeId) {
    const row = await first(
      c,
      `
        SELECT *
        FROM stores
        WHERE subdomain_slug = ? AND id != ?
        LIMIT 1
      `,
      [subdomainSlug, excludeId]
    );
    return toStore(row);
  }
  return findStoreBySubdomainSlug(c, subdomainSlug);
}
__name(findStoreByAnySubdomainSlug, "findStoreByAnySubdomainSlug");
async function insertStore(c, payload) {
  await run(
    c,
    `
      INSERT INTO stores (
        id,
        tenant_id,
        plan_id,
        name,
        slug,
        subdomain_slug,
        tagline,
        description,
        logo,
        color_primary,
        color_secondary,
        branding,
        social,
        theme,
        font,
        show_ratings,
        show_sales_count,
        dark_mode,
        active,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      payload.id,
      payload.tenantId,
      payload.planId,
      payload.name,
      payload.slug,
      payload.subdomainSlug,
      payload.tagline,
      payload.description,
      payload.logo,
      payload.colorPrimary,
      payload.colorSecondary,
      payload.branding,
      payload.social,
      payload.theme,
      payload.font,
      payload.showRatings ? 1 : 0,
      payload.showSalesCount ? 1 : 0,
      payload.darkMode ? 1 : 0,
      payload.active ? 1 : 0,
      payload.createdAt,
      payload.updatedAt,
    ]
  );
}
__name(insertStore, "insertStore");
async function updateStore(c, payload) {
  await run(
    c,
    `
      UPDATE stores
      SET
        plan_id = ?,
        name = ?,
        slug = ?,
        subdomain_slug = ?,
        tagline = ?,
        description = ?,
        logo = ?,
        color_primary = ?,
        color_secondary = ?,
        branding = ?,
        social = ?,
        theme = ?,
        font = ?,
        show_ratings = ?,
        show_sales_count = ?,
        dark_mode = ?,
        active = ?,
        updated_at = ?
      WHERE tenant_id = ? AND id = ?
    `,
    [
      payload.planId,
      payload.name,
      payload.slug,
      payload.subdomainSlug,
      payload.tagline,
      payload.description,
      payload.logo,
      payload.colorPrimary,
      payload.colorSecondary,
      payload.branding,
      payload.social,
      payload.theme,
      payload.font,
      payload.showRatings ? 1 : 0,
      payload.showSalesCount ? 1 : 0,
      payload.darkMode ? 1 : 0,
      payload.active ? 1 : 0,
      payload.updatedAt,
      payload.tenantId,
      payload.id,
    ]
  );
}
__name(updateStore, "updateStore");
async function removeStore(c, tenantId, id) {
  const current = await findStoreById(c, tenantId, id);
  if (!current) return null;
  await run(c, `DELETE FROM stores WHERE tenant_id = ? AND id = ?`, [
    tenantId,
    id,
  ]);
  return current;
}
__name(removeStore, "removeStore");

// src/db/repositories/categoryRepository.js
function mapCategory(row) {
  if (!row) return null;
  return {
    id: row.id,
    storeId: row.store_id,
    name: row.name,
    slug: row.slug,
    icon: row.icon || "category",
    order: Number(row.order_index || 1),
    active: Boolean(row.active),
    color: row.color || "#6366f1",
    preferencesMap: row.preferences_map || "{}",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
__name(mapCategory, "mapCategory");
async function listCategories(c, tenantId, storeId) {
  const rows = await all(
    c,
    `
      SELECT *
      FROM categories
      WHERE tenant_id = ? AND (? IS NULL OR store_id = ?)
      ORDER BY order_index ASC, created_at DESC
    `,
    [tenantId, storeId || null, storeId || null]
  );
  return rows.map(mapCategory);
}
__name(listCategories, "listCategories");
async function findCategoryById(c, tenantId, id) {
  const row = await first(
    c,
    `SELECT * FROM categories WHERE tenant_id = ? AND id = ? LIMIT 1`,
    [tenantId, id]
  );
  return mapCategory(row);
}
__name(findCategoryById, "findCategoryById");
async function findCategoryBySlug(c, tenantId, storeId, slug) {
  const row = await first(
    c,
    `SELECT * FROM categories WHERE tenant_id = ? AND store_id = ? AND slug = ? LIMIT 1`,
    [tenantId, storeId, slug]
  );
  return mapCategory(row);
}
__name(findCategoryBySlug, "findCategoryBySlug");
async function createCategory(c, payload) {
  await run(
    c,
    `
      INSERT INTO categories (
        id, tenant_id, store_id, name, slug, icon, order_index, active, color, preferences_map, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      payload.id,
      payload.tenantId,
      payload.storeId,
      payload.name,
      payload.slug,
      payload.icon || "category",
      Number(payload.order || 1),
      payload.active ? 1 : 0,
      payload.color || "#6366f1",
      payload.preferencesMap || "{}",
      payload.createdAt,
      payload.updatedAt,
    ]
  );
  return findCategoryById(c, payload.tenantId, payload.id);
}
__name(createCategory, "createCategory");
async function updateCategory(c, payload) {
  await run(
    c,
    `
      UPDATE categories
      SET
        store_id = ?,
        name = ?,
        slug = ?,
        icon = ?,
        order_index = ?,
        active = ?,
        color = ?,
        preferences_map = ?,
        updated_at = ?
      WHERE tenant_id = ? AND id = ?
    `,
    [
      payload.storeId,
      payload.name,
      payload.slug,
      payload.icon || "category",
      Number(payload.order || 1),
      payload.active ? 1 : 0,
      payload.color || "#6366f1",
      payload.preferencesMap || "{}",
      payload.updatedAt,
      payload.tenantId,
      payload.id,
    ]
  );
  return findCategoryById(c, payload.tenantId, payload.id);
}
__name(updateCategory, "updateCategory");
async function removeCategory(c, tenantId, id) {
  const current = await findCategoryById(c, tenantId, id);
  if (!current) return null;
  await run(c, `DELETE FROM categories WHERE tenant_id = ? AND id = ?`, [
    tenantId,
    id,
  ]);
  return current;
}
__name(removeCategory, "removeCategory");

// src/db/repositories/bannerRepository.js
function mapBanner(row) {
  return {
    id: row.id,
    storeId: row.store_id,
    title: row.title,
    cta: row.cta,
    positions: JSON.parse(row.positions_json || "[]"),
    type: row.type || "mobile",
    priority: Number(row.priority || 1),
    schedule: row.schedule || null,
    image: row.image || "",
    active: Boolean(row.active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
__name(mapBanner, "mapBanner");
function normalize(payload = {}) {
  return {
    title: payload.title?.trim() || "Novo banner",
    cta: payload.cta?.trim() || "Saiba mais",
    positions: Array.isArray(payload.positions)
      ? payload.positions
      : ["home-top"],
    type: payload.type || "mobile",
    priority: Number(payload.priority || 1),
    schedule: payload.schedule || null,
    image: payload.image || "",
    active: payload.active ?? true,
  };
}
__name(normalize, "normalize");
async function listBanners(c, tenantId, storeId) {
  if (!storeId) {
    const rows2 = await all(
      c,
      "SELECT * FROM banners WHERE tenant_id = ? ORDER BY priority ASC, created_at DESC",
      [tenantId]
    );
    return rows2.map(mapBanner);
  }
  const rows = await all(
    c,
    "SELECT * FROM banners WHERE tenant_id = ? AND store_id = ? ORDER BY priority ASC, created_at DESC",
    [tenantId, storeId]
  );
  return rows.map(mapBanner);
}
__name(listBanners, "listBanners");
async function createBanner(c, tenantId, storeId, payload) {
  const data = normalize(payload);
  const id = payload.id || crypto.randomUUID();
  await run(
    c,
    `INSERT INTO banners (
      id, tenant_id, store_id, title, cta, positions_json, type, priority, schedule, image, active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      tenantId,
      storeId,
      data.title,
      data.cta,
      JSON.stringify(data.positions),
      data.type,
      data.priority,
      data.schedule,
      data.image,
      data.active ? 1 : 0,
    ]
  );
  const row = await first(
    c,
    "SELECT * FROM banners WHERE id = ? AND tenant_id = ? LIMIT 1",
    [id, tenantId]
  );
  return mapBanner(row);
}
__name(createBanner, "createBanner");
async function updateBanner(c, tenantId, bannerId, payload) {
  const current = await first(
    c,
    "SELECT * FROM banners WHERE id = ? AND tenant_id = ? LIMIT 1",
    [bannerId, tenantId]
  );
  if (!current) return null;
  const data = { ...mapBanner(current), ...payload };
  await run(
    c,
    `UPDATE banners
     SET title = ?,
         cta = ?,
         positions_json = ?,
         type = ?,
         priority = ?,
         schedule = ?,
         image = ?,
         active = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND tenant_id = ?`,
    [
      data.title,
      data.cta,
      JSON.stringify(data.positions || []),
      data.type,
      Number(data.priority || 1),
      data.schedule || null,
      data.image || "",
      data.active ? 1 : 0,
      bannerId,
      tenantId,
    ]
  );
  const row = await first(
    c,
    "SELECT * FROM banners WHERE id = ? AND tenant_id = ? LIMIT 1",
    [bannerId, tenantId]
  );
  return mapBanner(row);
}
__name(updateBanner, "updateBanner");
async function deleteBanner(c, tenantId, bannerId) {
  const row = await first(
    c,
    "SELECT * FROM banners WHERE id = ? AND tenant_id = ? LIMIT 1",
    [bannerId, tenantId]
  );
  if (!row) return null;
  await run(c, "DELETE FROM banners WHERE id = ? AND tenant_id = ?", [
    bannerId,
    tenantId,
  ]);
  return mapBanner(row);
}
__name(deleteBanner, "deleteBanner");

// src/db/repositories/adRepository.js
function parseJson(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}
__name(parseJson, "parseJson");
function normalizeModel(row) {
  return {
    id: row.id,
    name: row.name,
    pricingModel: row.pricing_model,
    basePrice: Number(row.base_price ?? 0),
    allowedPositions: parseJson(row.allowed_positions_json, []),
    maxImages: Number(row.max_images ?? 0),
    maxVideoDuration: row.max_video_duration
      ? Number(row.max_video_duration)
      : void 0,
    description: row.description || "",
  };
}
__name(normalizeModel, "normalizeModel");
function normalizeAd(row) {
  return {
    id: row.id,
    storeId: row.store_id,
    modelId: row.model_id,
    name: row.name,
    model: row.model,
    duration: Number(row.duration ?? 0),
    device: row.device || "all",
    value: Number(row.value ?? 0),
    metrics: {
      impressions: Number(row.metrics_impressions ?? 0),
      clicks: Number(row.metrics_clicks ?? 0),
      ctr: Number(row.metrics_ctr ?? 0),
    },
    paid: Number(row.paid ?? 0) === 1,
    split: Number(row.split ?? 0),
    paymentLink: row.payment_link || "",
    active: Number(row.active ?? 1) === 1,
    advertiser: row.advertiser || "",
    startDate: row.start_date || null,
    endDate: row.end_date || null,
  };
}
__name(normalizeAd, "normalizeAd");
async function listAdModels(c, tenantId) {
  const rows = await all(
    c,
    `
      SELECT *
      FROM ad_models
      WHERE tenant_id = ?
      ORDER BY created_at ASC
    `,
    [tenantId]
  );
  return rows.map(normalizeModel);
}
__name(listAdModels, "listAdModels");
async function createAdModel(c, tenantId, payload) {
  await run(
    c,
    `
      INSERT INTO ad_models (
        id,
        tenant_id,
        name,
        pricing_model,
        base_price,
        allowed_positions_json,
        max_images,
        max_video_duration,
        description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      payload.id,
      tenantId,
      payload.name,
      payload.pricingModel,
      payload.basePrice,
      JSON.stringify(payload.allowedPositions || []),
      payload.maxImages ?? 0,
      payload.maxVideoDuration ?? null,
      payload.description || null,
    ]
  );
  const row = await first(
    c,
    "SELECT * FROM ad_models WHERE id = ? AND tenant_id = ?",
    [payload.id, tenantId]
  );
  return normalizeModel(row);
}
__name(createAdModel, "createAdModel");
async function updateAdModel(c, tenantId, id, payload) {
  const fields = [];
  const bindings = [];
  const map = {
    name: "name",
    pricingModel: "pricing_model",
    basePrice: "base_price",
    maxImages: "max_images",
    maxVideoDuration: "max_video_duration",
    description: "description",
  };
  for (const [key, column] of Object.entries(map)) {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      fields.push(`${column} = ?`);
      bindings.push(payload[key]);
    }
  }
  if (Object.prototype.hasOwnProperty.call(payload, "allowedPositions")) {
    fields.push("allowed_positions_json = ?");
    bindings.push(JSON.stringify(payload.allowedPositions || []));
  }
  if (!fields.length) {
    const current = await first(
      c,
      "SELECT * FROM ad_models WHERE id = ? AND tenant_id = ?",
      [id, tenantId]
    );
    return current ? normalizeModel(current) : null;
  }
  bindings.push(id, tenantId);
  await run(
    c,
    `
      UPDATE ad_models
      SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND tenant_id = ?
    `,
    bindings
  );
  const row = await first(
    c,
    "SELECT * FROM ad_models WHERE id = ? AND tenant_id = ?",
    [id, tenantId]
  );
  return row ? normalizeModel(row) : null;
}
__name(updateAdModel, "updateAdModel");
async function removeAdModel(c, tenantId, id) {
  const row = await first(
    c,
    "SELECT * FROM ad_models WHERE id = ? AND tenant_id = ?",
    [id, tenantId]
  );
  if (!row) return null;
  await run(c, "DELETE FROM ad_models WHERE id = ? AND tenant_id = ?", [
    id,
    tenantId,
  ]);
  return normalizeModel(row);
}
__name(removeAdModel, "removeAdModel");
async function listAds(c, tenantId, storeId) {
  const rows = await all(
    c,
    `
      SELECT *
      FROM ads
      WHERE tenant_id = ? AND (? IS NULL OR store_id = ?)
      ORDER BY created_at DESC
    `,
    [tenantId, storeId || null, storeId || null]
  );
  return rows.map(normalizeAd);
}
__name(listAds, "listAds");
async function createAd(c, tenantId, payload) {
  await run(
    c,
    `
      INSERT INTO ads (
        id,
        tenant_id,
        store_id,
        model_id,
        name,
        model,
        duration,
        device,
        value,
        metrics_impressions,
        metrics_clicks,
        metrics_ctr,
        paid,
        split,
        payment_link,
        active,
        advertiser,
        start_date,
        end_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      payload.id,
      tenantId,
      payload.storeId,
      payload.modelId || null,
      payload.name,
      payload.model || "CPC",
      payload.duration ?? 7,
      payload.device || "all",
      payload.value ?? 0,
      payload.metrics?.impressions ?? 0,
      payload.metrics?.clicks ?? 0,
      payload.metrics?.ctr ?? 0,
      payload.paid ? 1 : 0,
      payload.split ?? 0,
      payload.paymentLink || null,
      payload.active ?? true ? 1 : 0,
      payload.advertiser || null,
      payload.startDate || null,
      payload.endDate || null,
    ]
  );
  const row = await first(
    c,
    "SELECT * FROM ads WHERE id = ? AND tenant_id = ?",
    [payload.id, tenantId]
  );
  return normalizeAd(row);
}
__name(createAd, "createAd");
async function updateAd(c, tenantId, id, payload) {
  const fields = [];
  const bindings = [];
  const map = {
    storeId: "store_id",
    modelId: "model_id",
    name: "name",
    model: "model",
    duration: "duration",
    device: "device",
    value: "value",
    paid: "paid",
    split: "split",
    paymentLink: "payment_link",
    active: "active",
    advertiser: "advertiser",
    startDate: "start_date",
    endDate: "end_date",
  };
  for (const [key, column] of Object.entries(map)) {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      fields.push(`${column} = ?`);
      if (key === "paid" || key === "active") {
        bindings.push(payload[key] ? 1 : 0);
      } else {
        bindings.push(payload[key]);
      }
    }
  }
  if (Object.prototype.hasOwnProperty.call(payload, "metrics")) {
    fields.push(
      "metrics_impressions = ?",
      "metrics_clicks = ?",
      "metrics_ctr = ?"
    );
    bindings.push(payload.metrics?.impressions ?? 0);
    bindings.push(payload.metrics?.clicks ?? 0);
    bindings.push(payload.metrics?.ctr ?? 0);
  }
  if (!fields.length) {
    const current = await first(
      c,
      "SELECT * FROM ads WHERE id = ? AND tenant_id = ?",
      [id, tenantId]
    );
    return current ? normalizeAd(current) : null;
  }
  bindings.push(id, tenantId);
  await run(
    c,
    `
      UPDATE ads
      SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND tenant_id = ?
    `,
    bindings
  );
  const row = await first(
    c,
    "SELECT * FROM ads WHERE id = ? AND tenant_id = ?",
    [id, tenantId]
  );
  return row ? normalizeAd(row) : null;
}
__name(updateAd, "updateAd");
async function removeAd(c, tenantId, id) {
  const row = await first(
    c,
    "SELECT * FROM ads WHERE id = ? AND tenant_id = ?",
    [id, tenantId]
  );
  if (!row) return null;
  await run(c, "DELETE FROM ads WHERE id = ? AND tenant_id = ?", [
    id,
    tenantId,
  ]);
  return normalizeAd(row);
}
__name(removeAd, "removeAd");

// src/services/planService.js
function normalizePlanForFrontend(plan) {
  return {
    id: plan.id,
    name: plan.name,
    price: Number(plan.price_cents || 0) / 100,
    limits: Object.fromEntries(
      Object.entries(plan.limits || {}).map(([key, value]) => [
        key,
        value === null || value === void 0 ? Infinity : Number(value),
      ])
    ),
    features: plan.features || {},
  };
}
__name(normalizePlanForFrontend, "normalizePlanForFrontend");
async function getCurrentPlanWithSubscription(c, tenantId) {
  const subscription = await getCurrentSubscription(c, tenantId);
  if (!subscription) return null;
  const plan = await findPlanById(c, subscription.plan_id);
  if (!plan) return null;
  const trialEndsAt = subscription.trial_ends_at
    ? new Date(subscription.trial_ends_at).getTime()
    : 0;
  const trialDaysLeft =
    trialEndsAt > Date.now()
      ? Math.ceil((trialEndsAt - Date.now()) / (24 * 60 * 60 * 1e3))
      : 0;
  return {
    subscription,
    plan: normalizePlanForFrontend(plan),
    trialDaysLeft,
  };
}
__name(getCurrentPlanWithSubscription, "getCurrentPlanWithSubscription");
async function getPlansPayload(c) {
  const tenant = c.get("tenant");
  const plans = await listPlans(c);
  const planCatalog = Object.fromEntries(
    plans.map(plan => [plan.id, normalizePlanForFrontend(plan)])
  );
  const current = await getCurrentPlanWithSubscription(c, tenant.id);
  const currentPlanId = current?.plan?.id || plans[0]?.id || "starter";
  return {
    currentPlanId,
    trialDaysLeft: current?.trialDaysLeft || 0,
    planCatalog,
  };
}
__name(getPlansPayload, "getPlansPayload");
async function updateCurrentPlanForTenant(c, planId) {
  const tenant = c.get("tenant");
  ensure(planId, 400, "validation_error", "planId e obrigatorio.");
  const targetPlan = await findPlanById(c, planId);
  ensure(targetPlan, 400, "validation_error", "Plano informado nao existe.");
  const subscription = await getCurrentSubscription(c, tenant.id);
  ensure(
    subscription,
    404,
    "subscription_not_found",
    "Assinatura nao encontrada para este tenant."
  );
  await updateSubscription(c, subscription.id, tenant.id, {
    planId: targetPlan.id,
    status: subscription.status === "canceled" ? "active" : subscription.status,
    updatedAt: /* @__PURE__ */ new Date().toISOString(),
  });
  return { currentPlanId: targetPlan.id };
}
__name(updateCurrentPlanForTenant, "updateCurrentPlanForTenant");
async function updateTrialDaysForTenant(c, trialDaysLeft) {
  const tenant = c.get("tenant");
  const days = Number(trialDaysLeft);
  ensure(
    Number.isFinite(days) && days >= 0,
    400,
    "validation_error",
    "trialDaysLeft deve ser um numero valido."
  );
  const subscription = await getCurrentSubscription(c, tenant.id);
  ensure(
    subscription,
    404,
    "subscription_not_found",
    "Assinatura nao encontrada para este tenant."
  );
  const trialEndsAt =
    days === 0
      ? /* @__PURE__ */ new Date().toISOString()
      : new Date(Date.now() + days * 24 * 60 * 60 * 1e3).toISOString();
  await updateSubscription(c, subscription.id, tenant.id, {
    trialEndsAt,
    status:
      days > 0
        ? "trialing"
        : subscription.status === "trialing"
        ? "active"
        : subscription.status,
    updatedAt: /* @__PURE__ */ new Date().toISOString(),
  });
  return { trialDaysLeft: days };
}
__name(updateTrialDaysForTenant, "updateTrialDaysForTenant");
async function getPlans(c) {
  return getPlansPayload(c);
}
__name(getPlans, "getPlans");
async function updateCurrentPlan(c, planId) {
  return updateCurrentPlanForTenant(c, planId);
}
__name(updateCurrentPlan, "updateCurrentPlan");
async function updateTrialDays(c, trialDaysLeft) {
  return updateTrialDaysForTenant(c, trialDaysLeft);
}
__name(updateTrialDays, "updateTrialDays");

// src/services/limitService.js
function normalizeLimit(value) {
  if (value === null || value === void 0) return Infinity;
  return Number(value);
}
__name(normalizeLimit, "normalizeLimit");
async function enforceResourceLimit(c, tenantId, resource, nextUsageCount) {
  const planData = await getCurrentPlanWithSubscription(c, tenantId);
  if (!planData) return;
  const trialActive = Number(planData.trialDaysLeft) > 0;
  if (trialActive) return;
  const limit = normalizeLimit(planData.plan?.limits?.[resource]);
  if (!Number.isFinite(limit)) return;
  ensure(
    nextUsageCount <= limit,
    403,
    "limit_exceeded",
    `Limite de ${resource} atingido para o plano atual.`,
    {
      resource,
      limit,
      usage: nextUsageCount,
      planId: planData.plan?.id,
    }
  );
}
__name(enforceResourceLimit, "enforceResourceLimit");
async function calculateUsageByResource(c, tenantId, resource, storeId = null) {
  if (resource === "stores") {
    const stores = await listStores(c, tenantId);
    return stores.length;
  }
  if (resource === "products") {
    const products = await listProductsByTenant(c, tenantId, storeId);
    return products.length;
  }
  if (resource === "categories") {
    const categories = await listCategories(c, tenantId, storeId);
    return categories.length;
  }
  if (resource === "banners") {
    const banners = await listBanners(c, tenantId, storeId);
    return banners.length;
  }
  if (resource === "ads") {
    const ads = await listAds(c, tenantId, storeId);
    return ads.length;
  }
  return 0;
}
__name(calculateUsageByResource, "calculateUsageByResource");

// src/db/repositories/tenantSettingsRepository.js
var DEFAULT_SETTINGS = {
  products: {
    hidePrice: false,
    hideDiscount: false,
    hideSeller: false,
    productsPerPage: 20,
    adsBetweenItems: 5,
    showRanking: true,
  },
  categories: {
    showIcons: true,
    highlightBehavior: "first",
    orderMode: "manual",
  },
  banners: {
    maxPerDevice: 5,
    autoplay: true,
    enabledPositions: ["home-top", "home-middle", "home-bottom"],
  },
  ads: {
    allowedModels: ["CPM", "CPC"],
    maxDuration: 30,
    defaultDevice: "all",
  },
};
async function getSettings2(c, tenantId) {
  const row = await first(
    c,
    "SELECT settings_json FROM tenant_settings WHERE tenant_id = ? LIMIT 1",
    [tenantId]
  );
  if (!row?.settings_json) return DEFAULT_SETTINGS;
  try {
    const parsed = JSON.parse(row.settings_json);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}
__name(getSettings2, "getSettings");

// src/services/backupService.js
function safeJson(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}
__name(safeJson, "safeJson");
function toBool(value) {
  return Number(value) === 1;
}
__name(toBool, "toBool");
function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
__name(toNumber, "toNumber");
function slugify(value, fallback = "item") {
  const normalized = String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || fallback;
}
__name(slugify, "slugify");
function toStoreBlock(store, tenant) {
  return {
    id: store.id,
    name: store.name,
    slug: store.slug,
    subdomain_slug: store.subdomain_slug || store.slug || null,
    logo: store.logo || null,
    cover: null,
    description: store.description || "",
    affiliate: {
      platform: "manual",
      ownerId: tenant.id,
      commissionAvg: null,
    },
    status: {
      active: toBool(store.active),
      reason: null,
    },
    theme: {
      mode: toBool(store.dark_mode),
      primaryColor: store.color_primary || "#0f172a",
      secondaryColor: store.color_secondary || "#22c55e",
      borderRadius: "12px",
    },
    social: {
      instagram: store.social || null,
      tiktok: null,
    },
    stats: {
      totalClicks: 0,
      totalSales: 0,
      conversionRate: 0,
    },
    createdAt: store.created_at,
  };
}
__name(toStoreBlock, "toStoreBlock");
function toSettingsBlock(storeSettings) {
  return {
    currency: "BRL",
    locale: "pt-BR",
    features: {
      enableAds: true,
      enableSearch: true,
      enableFilters: true,
      enableRecommendations: true,
    },
    ui: {
      productsPerPage: Number(storeSettings?.products?.productsPerPage || 20),
      defaultView: "grid",
      showBadges: true,
    },
  };
}
__name(toSettingsBlock, "toSettingsBlock");
function toCategoryRow(row) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    icon: row.icon || "category",
    order: Number(row.order_index || 1),
    highlight: Number(row.order_index || 1) === 1,
    active: toBool(row.active),
  };
}
__name(toCategoryRow, "toCategoryRow");
function toPreferenceMap(categories) {
  return categories.map(row => {
    const pref = safeJson(row.preferences_map, {});
    return {
      id: row.id,
      label: pref.label || row.name,
      description: pref.description || "",
      icon: pref.icon || row.icon || "category",
      color: pref.color || row.color || "#6366f1",
    };
  });
}
__name(toPreferenceMap, "toPreferenceMap");
function toBannerRow(row) {
  const scheduleRaw = row.schedule || null;
  return {
    id: row.id,
    title: row.title,
    subtitle: null,
    image: row.image || null,
    cta: row.cta || "Saiba mais",
    link: "#",
    positions: safeJson(row.positions_json, []),
    priority: Number(row.priority || 1),
    metrics: {
      clicks: 0,
      views: 0,
    },
    schedule: scheduleRaw
      ? {
          start: scheduleRaw,
          end: scheduleRaw,
        }
      : null,
    active: toBool(row.active),
  };
}
__name(toBannerRow, "toBannerRow");
function toAdRow(row) {
  return {
    id: row.id,
    type: "image",
    title: row.name,
    media: {
      image: null,
    },
    link: row.payment_link || "#",
    positions: ["sidebar"],
    priority: 1,
    pricing: {
      model: String(row.model || "CPC").toLowerCase(),
      price: toNumber(row.value),
    },
    targeting: {
      categories: [],
      devices: [row.device || "all"],
    },
    metrics: {
      clicks: toNumber(row.metrics_clicks),
      views: toNumber(row.metrics_impressions),
      ctr: toNumber(row.metrics_ctr),
    },
    active: toBool(row.active),
  };
}
__name(toAdRow, "toAdRow");
function toProductRow(row) {
  const price = toNumber(row.price);
  const oldPrice = toNumber(row.original_price || row.price);
  const explicitDiscount = toNumber(row.discount);
  const derivedDiscount =
    oldPrice > 0
      ? Math.max(
          0,
          Math.min(100, Math.round(((oldPrice - price) / oldPrice) * 100))
        )
      : 0;
  const seasonal = safeJson(row.seasonal_json, {});
  const seasonalTags = Array.isArray(seasonal)
    ? seasonal
    : Object.keys(seasonal).filter(k => seasonal[k]);
  return {
    id: row.id,
    title: row.name,
    slug: slugify(row.name, row.id),
    categoryId: row.category_id || null,
    pricing: {
      price,
      oldPrice,
      discountPercent: explicitDiscount || derivedDiscount,
      installments: {
        max: 6,
        value: Number((price / 6).toFixed(2)),
      },
    },
    media: {
      image: row.image || null,
      gallery: row.image ? [row.image] : [],
      video: null,
    },
    affiliateLink: row.link || "",
    metrics: {
      rating: 0,
      reviews: 0,
      sold: 0,
      clicks: toNumber(row.metrics_clicks),
      conversionRate: toNumber(row.metrics_conversion),
    },
    ranking: {
      score: toNumber(row.metrics_trend),
      trendScore: toNumber(row.metrics_trend),
      position: null,
    },
    seller: {
      name: row.seller || "Loja Oficial",
      location: null,
      verified: false,
      logo: null,
    },
    flags: {
      featured: false,
      sponsored: false,
      trending: false,
      bestSeller: false,
    },
    badges: [],
    inventory: {
      stock: 0,
      availability: "in_stock",
    },
    seo: {
      title: row.name,
      description: "",
    },
    createdAt: row.created_at,
    active: toBool(row.active),
    seasonal: seasonalTags,
  };
}
__name(toProductRow, "toProductRow");
function buildRecommendations(products) {
  return products.slice(0, 8).map(product => ({
    productId: product.id,
    score: product.ranking?.score || 0,
    reason: "top_performance",
  }));
}
__name(buildRecommendations, "buildRecommendations");
async function collectStoreSnapshot(c, tenantId, storeId) {
  const tenant = await first(c, "SELECT * FROM tenants WHERE id = ? LIMIT 1", [
    tenantId,
  ]);
  const store = await first(
    c,
    "SELECT * FROM stores WHERE tenant_id = ? AND id = ? LIMIT 1",
    [tenantId, storeId]
  );
  if (!tenant || !store) return null;
  const [
    categoriesRows,
    bannersRows,
    adsRows,
    productsRows,
    storeUsersRows,
    settingsByTenant,
    plansPayload,
    currentPlan,
  ] = await Promise.all([
    all(
      c,
      "SELECT * FROM categories WHERE tenant_id = ? AND store_id = ? ORDER BY order_index ASC",
      [tenantId, storeId]
    ),
    all(
      c,
      "SELECT * FROM banners WHERE tenant_id = ? AND store_id = ? ORDER BY priority ASC",
      [tenantId, storeId]
    ),
    all(
      c,
      "SELECT * FROM ads WHERE tenant_id = ? AND store_id = ? ORDER BY created_at DESC",
      [tenantId, storeId]
    ),
    all(
      c,
      "SELECT * FROM products WHERE tenant_id = ? AND store_id = ? ORDER BY created_at DESC",
      [tenantId, storeId]
    ),
    all(
      c,
      "SELECT * FROM users WHERE tenant_id = ? AND store_id = ? ORDER BY created_at DESC",
      [tenantId, storeId]
    ),
    getSettings2(c, tenantId),
    getPlansPayload(c),
    getCurrentPlanWithSubscription(c, tenantId),
  ]);
  const storeSettings = settingsByTenant || {};
  const storeBlock = toStoreBlock(store, tenant);
  const categories = categoriesRows.map(toCategoryRow);
  const banners = bannersRows.map(toBannerRow);
  const ads = adsRows.map(toAdRow);
  const products = productsRows.map(toProductRow);
  const preferencesMap = toPreferenceMap(categoriesRows);
  const statsFromProducts = products.reduce(
    (acc, product) => {
      acc.totalClicks += toNumber(product.metrics?.clicks);
      return acc;
    },
    { totalClicks: 0 }
  );
  storeBlock.stats.totalClicks = statsFromProducts.totalClicks;
  const users = storeUsersRows.map(row => ({
    id: row.id,
    phone: row.phone || "",
    name: row.name || null,
    email: row.email || null,
    isGuest: toBool(row.is_guest),
    createdAt: row.created_at,
    lastActive: row.last_active || row.created_at,
    preferences: safeJson(row.preferences_json, {
      categories: [],
      notifications: false,
      darkMode: false,
    }),
    favorites: safeJson(row.favorites_json, []),
    clickHistory: safeJson(row.click_history_json, []),
  }));
  const plans = {
    currentPlanId: currentPlan?.plan?.id || plansPayload.currentPlanId,
    trialDaysLeft:
      currentPlan?.trialDaysLeft ?? plansPayload.trialDaysLeft ?? 0,
    planCatalog: plansPayload.planCatalog || {},
  };
  return {
    store: storeBlock,
    settings: toSettingsBlock(storeSettings),
    preferencesMap,
    categories,
    banners,
    ads,
    products,
    users,
    plans,
    recommendations: buildRecommendations(products),
    generatedAt: /* @__PURE__ */ new Date().toISOString(),
    schemaVersion: "2026-04-r2-v1",
  };
}
__name(collectStoreSnapshot, "collectStoreSnapshot");
async function putStoreSnapshot(c, objectKey, snapshot) {
  const bucket = c.env?.BACKUP_BUCKET;
  if (!bucket) return;
  await bucket.put(objectKey, JSON.stringify(snapshot, null, 2), {
    httpMetadata: {
      contentType: "application/json",
    },
  });
}
__name(putStoreSnapshot, "putStoreSnapshot");
async function backupStoreToR2(c, tenantId, storeId) {
  const bucket = c.env?.BACKUP_BUCKET;
  if (!bucket) return;
  const snapshot = await collectStoreSnapshot(c, tenantId, storeId);
  if (!snapshot) return;
  const domain = `${snapshot.store?.subdomain_slug}.${c.env["APP_ROOT_DOMAIN"]}`;
  const filenameBase = domain;
  const objectKey = `${filenameBase}.json`;
  await putStoreSnapshot(c, objectKey, snapshot);
}
__name(backupStoreToR2, "backupStoreToR2");
async function backupStoreBySubdomainSlug(c, tenantId, storeId, subdomainSlug) {
  const bucket = c.env?.BACKUP_BUCKET;
  if (!bucket) return;
  const normalizedSubdomain = slugify(subdomainSlug, "");
  if (!normalizedSubdomain) return;
  const snapshot = await collectStoreSnapshot(c, tenantId, storeId);
  if (!snapshot) return;
  await putStoreSnapshot(c, `${normalizedSubdomain}.json`, snapshot);
  await putStoreSnapshot(
    c,
    `history/${normalizedSubdomain}-${Date.now()}.json`,
    snapshot
  );
}
__name(backupStoreBySubdomainSlug, "backupStoreBySubdomainSlug");
async function backupTenantSnapshot(c, tenantId) {
  const stores = await all(c, "SELECT id FROM stores WHERE tenant_id = ?", [
    tenantId,
  ]);
  await Promise.all(
    stores.map(store => backupStoreToR2(c, tenantId, store.id))
  );
}
__name(backupTenantSnapshot, "backupTenantSnapshot");

// src/services/productService.js
var DEFAULT_PRODUCT_SETTINGS = {
  showPrices: true,
  showTags: true,
  productsPerPage: 20,
};
function normalizeCreatePayload(payload) {
  return {
    id: payload.id || crypto.randomUUID(),
    storeId: payload.storeId,
    categoryId: payload.categoryId || null,
    link: payload.link || "",
    categoria: (payload.categoria || "geral").toString().toLowerCase(),
    sazonalidade: (payload.sazonalidade || "sempre").toString().toLowerCase(),
    name: payload.name || "Novo produto",
    image:
      payload.image ||
      `https://picsum.photos/seed/${crypto.randomUUID()}/120/120`,
    price: Number(payload.price ?? 0),
    originalPrice: Number(payload.originalPrice ?? payload.price ?? 0),
    discount: Number(payload.discount ?? 0),
    seller: payload.seller || "Loja Oficial",
    metrics: payload.metrics || { clicks: 0, conversion: 0, trend: 50 },
    seasonal: payload.seasonal || {},
    active: payload.active ?? true,
  };
}
__name(normalizeCreatePayload, "normalizeCreatePayload");
async function listProducts(c, storeId) {
  const tenant = c.get("tenant");
  return listProductsByTenant(c, tenant.id, storeId || null);
}
__name(listProducts, "listProducts");
async function createProduct(c, payload) {
  const tenant = c.get("tenant");
  ensure(
    payload?.storeId,
    400,
    "validation_error",
    "storeId e obrigatorio para criar produto."
  );
  const store = await findStoreById(c, tenant.id, payload.storeId);
  ensure(store, 404, "store_not_found", "Loja informada nao encontrada.");
  const usage = await calculateUsageByResource(c, tenant.id, "products");
  await enforceResourceLimit(c, tenant.id, "products", usage + 1);
  const now = /* @__PURE__ */ new Date().toISOString();
  const product = normalizeCreatePayload(payload);
  const created = await createProductRow(c, {
    ...product,
    tenantId: tenant.id,
    createdAt: now,
    updatedAt: now,
  });
  await backupTenantSnapshot(c, tenant.id);
  return created;
}
__name(createProduct, "createProduct");
async function updateProduct(c, id, payload) {
  const tenant = c.get("tenant");
  const current = await findProductById(c, tenant.id, id);
  ensure(current, 404, "product_not_found", "Produto nao encontrado.");
  const nextStoreId = payload?.storeId || current.storeId;
  const store = await findStoreById(c, tenant.id, nextStoreId);
  ensure(store, 404, "store_not_found", "Loja informada nao encontrada.");
  const next = {
    ...current,
    ...payload,
    id: current.id,
    storeId: nextStoreId,
    updatedAt: /* @__PURE__ */ new Date().toISOString(),
  };
  const updated = await updateProductById(c, tenant.id, id, next);
  await backupTenantSnapshot(c, tenant.id);
  return updated;
}
__name(updateProduct, "updateProduct");
async function removeProduct(c, id) {
  const tenant = c.get("tenant");
  const removed = await deleteProductById(c, tenant.id, id);
  ensure(removed, 404, "product_not_found", "Produto nao encontrado.");
  await backupTenantSnapshot(c, tenant.id);
  return removed;
}
__name(removeProduct, "removeProduct");
async function getProductsSettings(c) {
  const tenant = c.get("tenant");
  return getProductSettings(c, tenant.id, DEFAULT_PRODUCT_SETTINGS);
}
__name(getProductsSettings, "getProductsSettings");
async function updateProductsSettings(c, payload) {
  const tenant = c.get("tenant");
  ensure(
    payload && typeof payload === "object" && !Array.isArray(payload),
    400,
    "validation_error",
    "Payload invalido."
  );
  const next = {
    ...DEFAULT_PRODUCT_SETTINGS,
    ...payload,
  };
  return updateProductSettings(c, tenant.id, next);
}
__name(updateProductsSettings, "updateProductsSettings");

// src/controllers/productsController.js
var listProducts2 = withController(async c => {
  const storeId = c.req.query("storeId");
  const products = await listProducts(c, storeId);
  return c.json(products, 200);
});
var createProduct2 = withController(async c => {
  const payload = await c.req.json();
  const created = await createProduct(c, payload);
  return c.json(created, 201);
});
var updateProduct2 = withController(async c => {
  const id = c.req.param("id");
  const payload = await c.req.json();
  const updated = await updateProduct(c, id, payload);
  return c.json(updated, 200);
});
var deleteProduct = withController(async c => {
  const id = c.req.param("id");
  const removed = await removeProduct(c, id);
  return c.json(removed, 200);
});
var getProductsSettings2 = withController(async c => {
  const settings = await getProductsSettings(c);
  return c.json(settings, 200);
});
var updateProductsSettings2 = withController(async c => {
  const payload = await c.req.json();
  const settings = await updateProductsSettings(c, payload);
  return c.json(settings, 200);
});

// src/routes/productRoutes.js
var productRoutes = new Hono2();
productRoutes.use("*", protect);
productRoutes.get("/settings", getProductsSettings2);
productRoutes.put("/settings", updateProductsSettings2);
productRoutes.get("/", listProducts2);
productRoutes.post(
  "/",
  createRateLimit({
    routeKey: "products-create",
    limit: 20,
    windowSeconds: 60,
  }),
  createProduct2
);
productRoutes.put("/:id", updateProduct2);
productRoutes.delete("/:id", deleteProduct);
var productRoutes_default = productRoutes;

// src/db/repositories/subdomainChangeRepository.js
async function countSubdomainChangesInCurrentMonth(c, storeId) {
  const row = await first(
    c,
    `
      SELECT COUNT(*) AS total
      FROM subdomain_changes
      WHERE store_id = ?
        AND strftime('%Y-%m', changed_at) = strftime('%Y-%m', 'now')
    `,
    [storeId]
  );
  return Number(row?.total || 0);
}
__name(
  countSubdomainChangesInCurrentMonth,
  "countSubdomainChangesInCurrentMonth"
);
async function registerSubdomainChange(
  c,
  storeId,
  changedAt = /* @__PURE__ */ new Date().toISOString()
) {
  await run(
    c,
    `
      INSERT INTO subdomain_changes (store_id, changed_at)
      VALUES (?, ?)
    `,
    [storeId, changedAt]
  );
}
__name(registerSubdomainChange, "registerSubdomainChange");

// src/services/cloudflareService.js
var CLOUDFLARE_API_BASE = "https://api.cloudflare.com/client/v4";
var DEFAULT_ROOT_DOMAIN = "affily-loja.com";
var DEFAULT_PAGES_PROJECT = "affily-loja";
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
__name(wait, "wait");
function readEnv(runtimeEnv, key, fallback = "") {
  if (
    runtimeEnv &&
    runtimeEnv[key] !== void 0 &&
    runtimeEnv[key] !== null &&
    runtimeEnv[key] !== ""
  ) {
    return runtimeEnv[key];
  }
  const processEnv = globalThis?.process?.env || {};
  if (
    processEnv[key] !== void 0 &&
    processEnv[key] !== null &&
    processEnv[key] !== ""
  ) {
    return processEnv[key];
  }
  return fallback;
}
__name(readEnv, "readEnv");
function normalizeSubdomain(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)+/g, "");
}
__name(normalizeSubdomain, "normalizeSubdomain");
function buildDomain(subdomain, rootDomain = DEFAULT_ROOT_DOMAIN) {
  return `${normalizeSubdomain(subdomain)}.${String(
    rootDomain || DEFAULT_ROOT_DOMAIN
  ).toLowerCase()}`;
}
__name(buildDomain, "buildDomain");
function getCloudflareConfig(runtimeEnv) {
  const pagesProjectName = readEnv(
    runtimeEnv,
    "CLOUDFLARE_PAGES_PROJECT",
    DEFAULT_PAGES_PROJECT
  );
  return {
    apiToken: readEnv(runtimeEnv, "CLOUDFLARE_API_TOKEN", ""),
    zoneId: readEnv(runtimeEnv, "CLOUDFLARE_ZONE_ID", ""),
    accountId: readEnv(runtimeEnv, "CLOUDFLARE_ACCOUNT_ID", ""),
    rootDomain: readEnv(runtimeEnv, "APP_ROOT_DOMAIN", DEFAULT_ROOT_DOMAIN),
    pagesProjectName,
    pagesTarget: readEnv(
      runtimeEnv,
      "CLOUDFLARE_PAGES_TARGET",
      `${pagesProjectName}.pages.dev`
    ),
  };
}
__name(getCloudflareConfig, "getCloudflareConfig");
function isConfigured(config) {
  return Boolean(config.apiToken && config.zoneId && config.accountId);
}
__name(isConfigured, "isConfigured");
function parseErrorMessage(payload, fallback) {
  if (
    !payload?.errors ||
    !Array.isArray(payload.errors) ||
    payload.errors.length === 0
  )
    return fallback;
  const first2 = payload.errors[0];
  return first2?.message || fallback;
}
__name(parseErrorMessage, "parseErrorMessage");
async function cloudflareRequest(config, endpoint, options = {}, attempt = 1) {
  const response = await fetch(`${CLOUDFLARE_API_BASE}${endpoint}`, {
    method: options.method || "GET",
    headers: {
      Authorization: `Bearer ${config.apiToken}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : void 0,
  });
  const raw2 = await response.text();
  let payload = {};
  try {
    payload = raw2 ? JSON.parse(raw2) : {};
  } catch {
    payload = {
      success: false,
      errors: [{ message: raw2 || "Resposta invalida da Cloudflare API." }],
    };
  }
  const failed = !response.ok || payload?.success === false;
  if (failed) {
    const status = response.status;
    const message2 = parseErrorMessage(
      payload,
      `Cloudflare request failed (${status})`
    );
    const retryable = status === 429 || status >= 500;
    if (retryable && attempt < 4) {
      const backoffMs = 250 * 2 ** (attempt - 1);
      console.warn(
        `[cloudflare] retry ${attempt} after ${status}: ${message2}`
      );
      await wait(backoffMs);
      return cloudflareRequest(config, endpoint, options, attempt + 1);
    }
    throw new Error(message2);
  }
  return payload?.result;
}
__name(cloudflareRequest, "cloudflareRequest");
function isAlreadyExistsError(error) {
  const message2 = String(error?.message || "").toLowerCase();
  return (
    message2.includes("already exists") || message2.includes("j\xE1 existe")
  );
}
__name(isAlreadyExistsError, "isAlreadyExistsError");
function isNotFoundError(error) {
  const message2 = String(error?.message || "").toLowerCase();
  return message2.includes("not found") || message2.includes("does not exist");
}
__name(isNotFoundError, "isNotFoundError");
async function listDnsRecords(config, fqdn) {
  return cloudflareRequest(
    config,
    `/zones/${config.zoneId}/dns_records?type=CNAME&name=${encodeURIComponent(
      fqdn
    )}`,
    { method: "GET" }
  );
}
__name(listDnsRecords, "listDnsRecords");
async function createDnsRecord(config, fqdn) {
  const list = await listDnsRecords(config, fqdn);
  if (Array.isArray(list) && list.length > 0) {
    const current = list[0];
    const hasExpectedTarget =
      String(current?.content || "").toLowerCase() ===
      String(config.pagesTarget).toLowerCase();
    if (hasExpectedTarget) return current;
    return cloudflareRequest(
      config,
      `/zones/${config.zoneId}/dns_records/${current.id}`,
      {
        method: "PUT",
        body: {
          type: "CNAME",
          name: fqdn,
          content: config.pagesTarget,
          proxied: false,
          ttl: 1,
        },
      }
    );
  }
  return cloudflareRequest(config, `/zones/${config.zoneId}/dns_records`, {
    method: "POST",
    body: {
      type: "CNAME",
      name: fqdn,
      content: config.pagesTarget,
      proxied: false,
      ttl: 1,
    },
  });
}
__name(createDnsRecord, "createDnsRecord");
async function deleteDnsRecord(config, fqdn) {
  const list = await listDnsRecords(config, fqdn);
  if (!Array.isArray(list) || list.length === 0) return;
  await Promise.all(
    list.map(record =>
      cloudflareRequest(
        config,
        `/zones/${config.zoneId}/dns_records/${record.id}`,
        {
          method: "DELETE",
        }
      )
    )
  );
}
__name(deleteDnsRecord, "deleteDnsRecord");
async function createPagesDomain(config, fqdn) {
  try {
    return await cloudflareRequest(
      config,
      `/accounts/${config.accountId}/pages/projects/${config.pagesProjectName}/domains`,
      {
        method: "POST",
        body: { name: fqdn },
      }
    );
  } catch (error) {
    if (isAlreadyExistsError(error)) return { alreadyExists: true };
    throw error;
  }
}
__name(createPagesDomain, "createPagesDomain");
async function deletePagesDomain(config, fqdn) {
  try {
    return await cloudflareRequest(
      config,
      `/accounts/${config.accountId}/pages/projects/${
        config.pagesProjectName
      }/domains/${encodeURIComponent(fqdn)}`,
      {
        method: "DELETE",
      }
    );
  } catch (error) {
    if (isNotFoundError(error)) return { notFound: true };
    throw error;
  }
}
__name(deletePagesDomain, "deletePagesDomain");
function parseDomainArgs(runtimeEnvOrSubdomain, maybeSubdomain) {
  if (
    typeof runtimeEnvOrSubdomain === "string" ||
    runtimeEnvOrSubdomain === null ||
    runtimeEnvOrSubdomain === void 0
  ) {
    return {
      runtimeEnv: null,
      subdomain: runtimeEnvOrSubdomain,
    };
  }
  return {
    runtimeEnv: runtimeEnvOrSubdomain,
    subdomain: maybeSubdomain,
  };
}
__name(parseDomainArgs, "parseDomainArgs");
function parseUpdateArgs(runtimeEnvOrOldSub, maybeOldSub, maybeNewSub) {
  if (
    typeof runtimeEnvOrOldSub === "string" ||
    runtimeEnvOrOldSub === null ||
    runtimeEnvOrOldSub === void 0
  ) {
    return {
      runtimeEnv: null,
      oldSub: runtimeEnvOrOldSub,
      newSub: maybeOldSub,
    };
  }
  return {
    runtimeEnv: runtimeEnvOrOldSub,
    oldSub: maybeOldSub,
    newSub: maybeNewSub,
  };
}
__name(parseUpdateArgs, "parseUpdateArgs");
async function createSubdomain(runtimeEnvOrSubdomain, maybeSubdomain) {
  const { runtimeEnv, subdomain } = parseDomainArgs(
    runtimeEnvOrSubdomain,
    maybeSubdomain
  );
  const normalized = normalizeSubdomain(subdomain);
  if (!normalized) throw new Error("Subdominio invalido.");
  const config = getCloudflareConfig(runtimeEnv);
  const fqdn = buildDomain(normalized, config.rootDomain);
  if (!isConfigured(config)) {
    console.warn(
      "[cloudflare] configuracao ausente. Pulando provisionamento para",
      fqdn
    );
    return { domain: fqdn, skipped: true };
  }
  console.info("[cloudflare] creating DNS + custom domain for", fqdn);
  await createDnsRecord(config, fqdn);
  await createPagesDomain(config, fqdn);
  return { domain: fqdn, skipped: false };
}
__name(createSubdomain, "createSubdomain");
async function deleteSubdomain(runtimeEnvOrSubdomain, maybeSubdomain) {
  const { runtimeEnv, subdomain } = parseDomainArgs(
    runtimeEnvOrSubdomain,
    maybeSubdomain
  );
  const normalized = normalizeSubdomain(subdomain);
  if (!normalized) return { skipped: true };
  const config = getCloudflareConfig(runtimeEnv);
  const fqdn = buildDomain(normalized, config.rootDomain);
  if (!isConfigured(config)) return { domain: fqdn, skipped: true };
  console.info("[cloudflare] deleting DNS + custom domain for", fqdn);
  await deletePagesDomain(config, fqdn);
  await deleteDnsRecord(config, fqdn);
  return { domain: fqdn, skipped: false };
}
__name(deleteSubdomain, "deleteSubdomain");
async function updateSubdomain(runtimeEnvOrOldSub, maybeOldSub, maybeNewSub) {
  const { runtimeEnv, oldSub, newSub } = parseUpdateArgs(
    runtimeEnvOrOldSub,
    maybeOldSub,
    maybeNewSub
  );
  const oldNormalized = normalizeSubdomain(oldSub);
  const newNormalized = normalizeSubdomain(newSub);
  if (!newNormalized) throw new Error("Novo subdominio invalido.");
  if (oldNormalized === newNormalized) {
    return createSubdomain(runtimeEnv, newNormalized);
  }
  await deleteSubdomain(runtimeEnv, oldNormalized);
  return createSubdomain(runtimeEnv, newNormalized);
}
__name(updateSubdomain, "updateSubdomain");

// src/services/storeService.js
var SUBDOMAIN_SLUG_REGEX = /^[a-z0-9-]{3,63}$/;
var MAX_SUBDOMAIN_CHANGES_PER_MONTH = 2;
function sanitizePathSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}
__name(sanitizePathSlug, "sanitizePathSlug");
function sanitizeSubdomainSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)+/g, "");
}
__name(sanitizeSubdomainSlug, "sanitizeSubdomainSlug");
function validateSubdomainSlug(value) {
  const normalized = sanitizeSubdomainSlug(value);
  ensure(normalized, 400, "validation_error", "Subdominio obrigatorio.");
  ensure(
    SUBDOMAIN_SLUG_REGEX.test(normalized),
    400,
    "validation_error",
    "Subdominio invalido. Use de 3 a 63 caracteres [a-z0-9-]."
  );
  return normalized;
}
__name(validateSubdomainSlug, "validateSubdomainSlug");
function hasOwn(payload, key) {
  return Object.prototype.hasOwnProperty.call(payload || {}, key);
}
__name(hasOwn, "hasOwn");
function pickSubdomainSlug(payload, fallback) {
  if (hasOwn(payload, "subdomain_slug")) return payload.subdomain_slug;
  if (hasOwn(payload, "subdomainSlug")) return payload.subdomainSlug;
  return fallback;
}
__name(pickSubdomainSlug, "pickSubdomainSlug");
function asCloudflareError(error, action = "configurar") {
  return new ApiError(
    502,
    "cloudflare_provision_failed",
    `Falha ao ${action} subdominio na Cloudflare.`,
    {
      providerMessage: String(error?.message || "Erro desconhecido"),
    }
  );
}
__name(asCloudflareError, "asCloudflareError");
function mapStoreWriteError(error) {
  const message2 = String(error?.message || "").toLowerCase();
  if (message2.includes("stores.subdomain_slug")) {
    throw new ApiError(
      409,
      "subdomain_slug_taken",
      "Este subdominio ja esta em uso."
    );
  }
  if (
    message2.includes("stores.tenant_id, stores.slug") ||
    message2.includes("stores.slug")
  ) {
    throw new ApiError(409, "slug_taken", "Ja existe uma loja com esta URL.");
  }
  throw error;
}
__name(mapStoreWriteError, "mapStoreWriteError");
function buildStorePayload(payload) {
  const slug = sanitizePathSlug(
    payload.slug || payload.name || `loja-${Date.now()}`
  );
  const subdomainSlug = validateSubdomainSlug(
    pickSubdomainSlug(
      payload,
      payload.slug || payload.name || `loja-${Date.now()}`
    )
  );
  return {
    id: payload.id || crypto.randomUUID(),
    name: payload.name || "Nova loja",
    slug,
    subdomainSlug,
    tagline: payload.tagline || "",
    description: payload.description || "",
    logo: payload.logo || null,
    colorPrimary: payload.colorPrimary || "#0f172a",
    colorSecondary: payload.colorSecondary || "#22c55e",
    branding: payload.branding || "AFFILY",
    social: payload.social || "",
    theme: payload.theme || "studio",
    font: payload.font || "inter",
    showRatings: payload.showRatings ?? true,
    showSalesCount: payload.showSalesCount ?? true,
    darkMode: payload.darkMode ?? false,
    active: payload.active ?? true,
    planId: payload.planId || "starter",
  };
}
__name(buildStorePayload, "buildStorePayload");
async function listStoresForTenant(c) {
  const tenant = c.get("tenant");
  return listStoresByTenant(c, tenant.id);
}
__name(listStoresForTenant, "listStoresForTenant");
async function createStoreForTenant(c, payload) {
  const tenant = c.get("tenant");
  ensure(
    payload?.name?.trim(),
    400,
    "validation_error",
    "Nome da loja e obrigatorio."
  );
  const usage = await calculateUsageByResource(c, tenant.id, "stores");
  await enforceResourceLimit(c, tenant.id, "stores", usage + 1);
  const store = buildStorePayload(payload);
  const existingSlug = await findStoreBySlug(c, tenant.id, store.slug);
  ensure(!existingSlug, 409, "slug_taken", "Ja existe uma loja com esta URL.");
  const existingSubdomainSlug = await findStoreByAnySubdomainSlug(
    c,
    store.subdomainSlug
  );
  ensure(
    !existingSubdomainSlug,
    409,
    "subdomain_slug_taken",
    "Este subdominio ja esta em uso."
  );
  const now = /* @__PURE__ */ new Date().toISOString();
  try {
    await createSubdomain(c.get("env"), store.subdomainSlug);
  } catch (error) {
    throw asCloudflareError(error, "configurar");
  }
  try {
    await insertStore(c, {
      ...store,
      tenantId: tenant.id,
      createdAt: now,
      updatedAt: now,
    });
  } catch (error) {
    await deleteSubdomain(c.get("env"), store.subdomainSlug).catch(
      cleanupError => {
        console.warn(
          "[store] failed to rollback subdomain after db error:",
          cleanupError?.message || cleanupError
        );
      }
    );
    mapStoreWriteError(error);
  }
  const created = await findStoreById(c, tenant.id, store.id);
  await backupTenantSnapshot(c, tenant.id);
  return created;
}
__name(createStoreForTenant, "createStoreForTenant");
async function updateStoreForTenant(c, id, payload) {
  const tenant = c.get("tenant");
  const current = await findStoreById(c, tenant.id, id);
  ensure(current, 404, "store_not_found", "Loja nao encontrada.");
  const legacySlug =
    hasOwn(payload, "slug") || hasOwn(payload, "slug_path")
      ? sanitizePathSlug(payload?.slug || payload?.slug_path || current.slug)
      : current.slug;
  const next = {
    ...current,
    ...payload,
    id: current.id,
    slug: legacySlug,
    subdomainSlug: validateSubdomainSlug(
      pickSubdomainSlug(payload, current.subdomainSlug || current.slug)
    ),
    updatedAt: /* @__PURE__ */ new Date().toISOString(),
  };
  ensure(next.slug, 400, "validation_error", "Slug da loja invalido.");
  const existingSlug = await findStoreBySlug(c, tenant.id, next.slug);
  ensure(
    !existingSlug || existingSlug.id === id,
    409,
    "slug_taken",
    "Ja existe uma loja com esta URL."
  );
  const existingSubdomainSlug = await findStoreByAnySubdomainSlug(
    c,
    next.subdomainSlug,
    id
  );
  ensure(
    !existingSubdomainSlug,
    409,
    "subdomain_slug_taken",
    "Este subdominio ja esta em uso."
  );
  const currentSubdomain = current.subdomainSlug || current.slug;
  const subdomainChanged = currentSubdomain !== next.subdomainSlug;
  if (subdomainChanged) {
    const currentMonthChanges = await countSubdomainChangesInCurrentMonth(
      c,
      current.id
    );
    ensure(
      currentMonthChanges < MAX_SUBDOMAIN_CHANGES_PER_MONTH,
      400,
      "subdomain_change_limit_reached",
      "Limite mensal de alteracoes do subdominio atingido."
    );
    try {
      await updateSubdomain(c.get("env"), currentSubdomain, next.subdomainSlug);
    } catch (error) {
      throw asCloudflareError(error, "atualizar");
    }
  }
  let updated = null;
  try {
    updated = await updateStore(c, next);
  } catch (error) {
    if (subdomainChanged) {
      await updateSubdomain(
        c.get("env"),
        next.subdomainSlug,
        currentSubdomain
      ).catch(rollbackError => {
        console.warn(
          "[store] failed to rollback subdomain after update error:",
          rollbackError?.message || rollbackError
        );
      });
    }
    mapStoreWriteError(error);
  }
  if (subdomainChanged) {
    await backupStoreBySubdomainSlug(
      c,
      tenant.id,
      current.id,
      next.subdomainSlug
    );
    await registerSubdomainChange(c, current.id);
  }
  await backupTenantSnapshot(c, tenant.id);
  return updated;
}
__name(updateStoreForTenant, "updateStoreForTenant");
async function removeStoreForTenant(c, id) {
  const tenant = c.get("tenant");
  const total = await countStoresByTenant(c, tenant.id);
  ensure(
    total > 1,
    400,
    "cannot_delete_last_store",
    "Nao e permitido remover a unica loja do tenant."
  );
  const removed = await removeStore(c, tenant.id, id);
  ensure(removed, 404, "store_not_found", "Loja nao encontrada.");
  const subdomainToDelete = removed.subdomainSlug || removed.slug;
  await deleteSubdomain(c.get("env"), subdomainToDelete).catch(error => {
    console.warn(
      "[store] failed to cleanup deleted store subdomain:",
      error?.message || error
    );
  });
  await backupTenantSnapshot(c, tenant.id);
  return removed;
}
__name(removeStoreForTenant, "removeStoreForTenant");
async function checkStoreSubdomainAvailabilityForTenant(
  c,
  subdomainSlug,
  excludeId = null
) {
  const normalized = validateSubdomainSlug(subdomainSlug);
  const existing = await findStoreByAnySubdomainSlug(
    c,
    normalized,
    excludeId || null
  );
  return {
    available: !existing,
    subdomain_slug: normalized,
  };
}
__name(
  checkStoreSubdomainAvailabilityForTenant,
  "checkStoreSubdomainAvailabilityForTenant"
);

// src/controllers/storesController.js
var listStores2 = withController(async c => {
  const stores = await listStoresForTenant(c);
  return sendOk(c, stores);
});
var createStore = withController(async c => {
  const payload = await parseJsonBody(c);
  const store = await createStoreForTenant(c, payload);
  return sendCreated(c, store);
});
var updateStore2 = withController(async c => {
  const id = c.req.param("id");
  const payload = await parseJsonBody(c);
  const store = await updateStoreForTenant(c, id, payload);
  return sendOk(c, store);
});
var checkSubdomainAvailability = withController(async c => {
  const subdomainSlug =
    c.req.query("subdomain_slug") || c.req.query("subdomainSlug");
  const excludeId =
    c.req.query("excludeId") || c.req.query("exclude_id") || null;
  const result = await checkStoreSubdomainAvailabilityForTenant(
    c,
    subdomainSlug,
    excludeId
  );
  return sendOk(c, result);
});
var deleteStore = withController(async c => {
  const id = c.req.param("id");
  const removed = await removeStoreForTenant(c, id);
  return sendOk(c, removed);
});

// src/routes/storeRoutes.js
var storeRoutes = new Hono2();
storeRoutes.use("*", protect);
storeRoutes.get("/", listStores2);
storeRoutes.get("/subdomain-availability", checkSubdomainAvailability);
storeRoutes.post("/", createStore);
storeRoutes.put("/:id", updateStore2);
storeRoutes.delete("/:id", deleteStore);
var storeRoutes_default = storeRoutes;

// src/db/repositories/userRepository.js
function safeJsonParse(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}
__name(safeJsonParse, "safeJsonParse");
function toUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    tenantId: row.tenant_id,
    storeId: row.store_id,
    phone: row.phone || "",
    name: row.name || null,
    email: row.email || null,
    isGuest: Boolean(row.is_guest),
    createdAt: row.created_at,
    lastActive: row.last_active || row.created_at,
    preferences: safeJsonParse(row.preferences_json, {
      categories: [],
      notifications: false,
      darkMode: false,
    }),
    favorites: safeJsonParse(row.favorites_json, []),
    clickHistory: safeJsonParse(row.click_history_json, []),
  };
}
__name(toUser, "toUser");
async function listUsersByTenant(c, tenantId, storeId) {
  if (storeId) {
    const rows2 = await all(
      c,
      `
        SELECT *
        FROM users
        WHERE tenant_id = ? AND store_id = ?
        ORDER BY datetime(created_at) DESC
      `,
      [tenantId, storeId]
    );
    return rows2.map(toUser);
  }
  const rows = await all(
    c,
    `
      SELECT *
      FROM users
      WHERE tenant_id = ?
      ORDER BY datetime(created_at) DESC
    `,
    [tenantId]
  );
  return rows.map(toUser);
}
__name(listUsersByTenant, "listUsersByTenant");
async function findUserById(c, tenantId, id) {
  const row = await first(
    c,
    `
      SELECT *
      FROM users
      WHERE tenant_id = ? AND id = ?
    `,
    [tenantId, id]
  );
  return toUser(row);
}
__name(findUserById, "findUserById");
async function insertUser(c, payload) {
  await run(
    c,
    `
      INSERT INTO users (
        id,
        tenant_id,
        store_id,
        phone,
        name,
        email,
        is_guest,
        created_at,
        last_active,
        preferences_json,
        favorites_json,
        click_history_json
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      payload.id,
      payload.tenantId,
      payload.storeId,
      payload.phone,
      payload.name,
      payload.email,
      payload.isGuest ? 1 : 0,
      payload.createdAt,
      payload.lastActive,
      JSON.stringify(
        payload.preferences || {
          categories: [],
          notifications: false,
          darkMode: false,
        }
      ),
      JSON.stringify(payload.favorites || []),
      JSON.stringify(payload.clickHistory || []),
    ]
  );
}
__name(insertUser, "insertUser");
async function updateUser(c, payload) {
  await run(
    c,
    `
      UPDATE users
      SET
        store_id = ?,
        phone = ?,
        name = ?,
        email = ?,
        is_guest = ?,
        last_active = ?,
        preferences_json = ?,
        favorites_json = ?,
        click_history_json = ?
      WHERE tenant_id = ? AND id = ?
    `,
    [
      payload.storeId,
      payload.phone,
      payload.name,
      payload.email,
      payload.isGuest ? 1 : 0,
      payload.lastActive,
      JSON.stringify(
        payload.preferences || {
          categories: [],
          notifications: false,
          darkMode: false,
        }
      ),
      JSON.stringify(payload.favorites || []),
      JSON.stringify(payload.clickHistory || []),
      payload.tenantId,
      payload.id,
    ]
  );
}
__name(updateUser, "updateUser");

// src/services/userService.js
function buildUserPayload(payload, current = null) {
  return {
    id: current?.id || payload.id || crypto.randomUUID(),
    storeId: payload.storeId || current?.storeId || null,
    phone: payload.phone ?? current?.phone ?? "",
    name: payload.name ?? current?.name ?? null,
    email: payload.email ?? current?.email ?? null,
    isGuest: payload.isGuest ?? current?.isGuest ?? false,
    createdAt:
      current?.createdAt ||
      payload.createdAt ||
      /* @__PURE__ */ new Date().toISOString().split("T")[0],
    lastActive:
      payload.lastActive ||
      current?.lastActive ||
      /* @__PURE__ */ new Date().toISOString().split("T")[0],
    preferences: payload.preferences ||
      current?.preferences || {
        categories: [],
        notifications: false,
        darkMode: false,
      },
    favorites: payload.favorites || current?.favorites || [],
    clickHistory: payload.clickHistory || current?.clickHistory || [],
  };
}
__name(buildUserPayload, "buildUserPayload");
async function listUsers(c, storeId) {
  const tenant = c.get("tenant");
  return listUsersByTenant(c, tenant.id, storeId || null);
}
__name(listUsers, "listUsers");
async function createUser(c, payload) {
  const tenant = c.get("tenant");
  ensure(
    payload?.storeId,
    400,
    "validation_error",
    "storeId e obrigatorio para criar usuario."
  );
  const store = await findStoreById(c, tenant.id, payload.storeId);
  ensure(store, 404, "store_not_found", "Loja informada nao encontrada.");
  const user = buildUserPayload(payload);
  await insertUser(c, {
    ...user,
    tenantId: tenant.id,
  });
  const created = await findUserById(c, tenant.id, user.id);
  await backupTenantSnapshot(c, tenant.id);
  return created;
}
__name(createUser, "createUser");
async function updateUser2(c, id, payload) {
  const tenant = c.get("tenant");
  const current = await findUserById(c, tenant.id, id);
  ensure(current, 404, "user_not_found", "Usuario nao encontrado.");
  const next = buildUserPayload(payload, current);
  if (next.storeId) {
    const store = await findStoreById(c, tenant.id, next.storeId);
    ensure(store, 404, "store_not_found", "Loja informada nao encontrada.");
  }
  await updateUser(c, {
    ...next,
    tenantId: tenant.id,
    id,
  });
  const updated = await findUserById(c, tenant.id, id);
  await backupTenantSnapshot(c, tenant.id);
  return updated;
}
__name(updateUser2, "updateUser");

// src/controllers/usersController.js
var listUsers2 = withController(async c => {
  const storeId = c.req.query("storeId");
  const users = await listUsers(c, storeId);
  return sendOk(c, users);
});
var createUser2 = withController(async c => {
  const payload = await parseJsonBody(c);
  const user = await createUser(c, payload);
  return sendCreated(c, user);
});
var updateUser3 = withController(async c => {
  const id = c.req.param("id");
  const payload = await parseJsonBody(c);
  const user = await updateUser2(c, id, payload);
  return sendOk(c, user);
});

// src/routes/userRoutes.js
var userRoutes = new Hono2();
userRoutes.use("*", protect);
userRoutes.get("/", listUsers2);
userRoutes.post(
  "/",
  createRateLimit({ routeKey: "users-create", limit: 30, windowSeconds: 60 }),
  createUser2
);
userRoutes.put(
  "/:id",
  createRateLimit({ routeKey: "users-update", limit: 60, windowSeconds: 60 }),
  updateUser3
);
var userRoutes_default = userRoutes;

// src/controllers/plansController.js
var getPlansController = withController(async c => {
  const payload = await getPlans(c);
  return sendOk(c, payload);
});
var updateCurrentPlan2 = withController(async c => {
  const body = await parseJsonBody(c);
  const payload = await updateCurrentPlan(c, body?.planId);
  return sendOk(c, payload);
});
var updateTrialDays2 = withController(async c => {
  const body = await parseJsonBody(c);
  const payload = await updateTrialDays(c, body?.trialDaysLeft);
  return sendOk(c, payload);
});

// src/routes/planRoutes.js
var planRoutes = new Hono2();
planRoutes.use("*", protect);
planRoutes.get("/", getPlansController);
planRoutes.put(
  "/current",
  createRateLimit({ routeKey: "plans-current", limit: 20, windowSeconds: 60 }),
  updateCurrentPlan2
);
planRoutes.put(
  "/trial",
  createRateLimit({ routeKey: "plans-trial", limit: 20, windowSeconds: 60 }),
  updateTrialDays2
);
var planRoutes_default = planRoutes;

// src/services/categoryService.js
function sanitizeSlug(value) {
  return (value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
__name(sanitizeSlug, "sanitizeSlug");
function normalizePayload(payload) {
  return {
    id: payload.id || crypto.randomUUID(),
    name: (payload.name || "Categoria").trim(),
    slug: sanitizeSlug(payload.slug || payload.name || "categoria"),
    icon: payload.icon || "category",
    order: Number(payload.order || 1),
    active: payload.active ?? true,
    color: payload.color || "#6366f1",
    preferencesMap:
      typeof payload.preferencesMap === "string"
        ? payload.preferencesMap
        : JSON.stringify(payload.preferencesMap || {}),
  };
}
__name(normalizePayload, "normalizePayload");
async function listCategories2(c, storeId) {
  const tenant = c.get("tenant");
  ensure(storeId, 400, "validation_error", "storeId e obrigatorio.");
  return listCategories(c, tenant.id, storeId);
}
__name(listCategories2, "listCategories");
async function createCategory2(c, payload) {
  const tenant = c.get("tenant");
  ensure(
    payload?.storeId,
    400,
    "validation_error",
    "storeId e obrigatorio para criar categoria."
  );
  const store = await findStoreById(c, tenant.id, payload.storeId);
  ensure(store, 404, "store_not_found", "Loja informada nao encontrada.");
  const usage = await calculateUsageByResource(
    c,
    tenant.id,
    "categories",
    payload.storeId
  );
  await enforceResourceLimit(c, tenant.id, "categories", usage + 1);
  const normalized = normalizePayload(payload);
  const existing = await findCategoryBySlug(
    c,
    tenant.id,
    payload.storeId,
    normalized.slug
  );
  ensure(
    !existing,
    409,
    "slug_conflict",
    "Ja existe uma categoria com este slug."
  );
  const now = /* @__PURE__ */ new Date().toISOString();
  await createCategory(c, {
    ...normalized,
    tenantId: tenant.id,
    storeId: payload.storeId,
    createdAt: now,
    updatedAt: now,
  });
  const created = await findCategoryById(c, tenant.id, normalized.id);
  await backupTenantSnapshot(c, tenant.id);
  return created;
}
__name(createCategory2, "createCategory");
async function updateCategory2(c, id, payload) {
  const tenant = c.get("tenant");
  const current = await findCategoryById(c, tenant.id, id);
  ensure(current, 404, "category_not_found", "Categoria nao encontrada.");
  const normalized = {
    ...current,
    ...payload,
    id: current.id,
    slug: sanitizeSlug(payload.slug || payload.name || current.slug),
    order: Number(payload.order ?? current.order ?? 1),
    preferencesMap:
      typeof payload.preferencesMap === "undefined"
        ? current.preferencesMap
        : typeof payload.preferencesMap === "string"
        ? payload.preferencesMap
        : JSON.stringify(payload.preferencesMap || {}),
    updatedAt: /* @__PURE__ */ new Date().toISOString(),
  };
  if (normalized.slug !== current.slug) {
    const sameSlug = await findCategoryBySlug(
      c,
      tenant.id,
      current.storeId,
      normalized.slug
    );
    ensure(
      !sameSlug || sameSlug.id === id,
      409,
      "slug_conflict",
      "Ja existe uma categoria com este slug."
    );
  }
  await updateCategory(c, {
    ...normalized,
    tenantId: tenant.id,
    storeId: current.storeId,
  });
  const updated = await findCategoryById(c, tenant.id, id);
  await backupTenantSnapshot(c, tenant.id);
  return updated;
}
__name(updateCategory2, "updateCategory");
async function deleteCategory(c, id) {
  const tenant = c.get("tenant");
  const removed = await removeCategory(c, tenant.id, id);
  ensure(removed, 404, "category_not_found", "Categoria nao encontrada.");
  await backupTenantSnapshot(c, tenant.id);
  return removed;
}
__name(deleteCategory, "deleteCategory");

// src/controllers/categoriesController.js
var listCategoriesController = withController(async c => {
  const storeId = c.req.query("storeId");
  const items = await listCategories2(c, storeId);
  return sendOk(c, items);
});
var createCategoryController = withController(async c => {
  const payload = await parseJsonBody(c);
  const created = await createCategory2(c, payload);
  return sendCreated(c, created);
});
var updateCategoryController = withController(async c => {
  const id = c.req.param("id");
  const payload = await parseJsonBody(c);
  const updated = await updateCategory2(c, id, payload);
  return sendOk(c, updated);
});
var deleteCategoryController = withController(async c => {
  const id = c.req.param("id");
  const removed = await deleteCategory(c, id);
  return sendOk(c, removed);
});

// src/routes/categoryRoutes.js
var categoryRoutes = new Hono2();
categoryRoutes.use("*", protect);
categoryRoutes.get("/", listCategoriesController);
categoryRoutes.post("/", createCategoryController);
categoryRoutes.put("/:id", updateCategoryController);
categoryRoutes.delete("/:id", deleteCategoryController);
var categoryRoutes_default = categoryRoutes;

// src/services/bannerService.js
async function listBannersForTenant(c, storeId) {
  const tenant = c.get("tenant");
  ensure(storeId, 400, "validation_error", "storeId e obrigatorio.");
  return listBanners(c, tenant.id, storeId);
}
__name(listBannersForTenant, "listBannersForTenant");
async function createBannerForTenant(c, payload) {
  const tenant = c.get("tenant");
  const storeId = payload?.storeId;
  ensure(storeId, 400, "validation_error", "storeId e obrigatorio.");
  const store = await findStoreById(c, tenant.id, storeId);
  ensure(store, 404, "store_not_found", "Loja nao encontrada.");
  const usage = await calculateUsageByResource(
    c,
    tenant.id,
    "banners",
    storeId
  );
  await enforceResourceLimit(c, tenant.id, "banners", usage + 1);
  const created = await createBanner(c, tenant.id, storeId, {
    ...payload,
    id: payload?.id || crypto.randomUUID(),
  });
  await backupTenantSnapshot(c, tenant.id);
  return created;
}
__name(createBannerForTenant, "createBannerForTenant");
async function updateBannerForTenant(c, bannerId, payload) {
  const tenant = c.get("tenant");
  const updated = await updateBanner(c, tenant.id, bannerId, payload || {});
  ensure(updated, 404, "banner_not_found", "Banner nao encontrado.");
  await backupTenantSnapshot(c, tenant.id);
  return updated;
}
__name(updateBannerForTenant, "updateBannerForTenant");
async function removeBannerForTenant(c, bannerId) {
  const tenant = c.get("tenant");
  const removed = await deleteBanner(c, tenant.id, bannerId);
  ensure(removed, 404, "banner_not_found", "Banner nao encontrado.");
  await backupTenantSnapshot(c, tenant.id);
  return removed;
}
__name(removeBannerForTenant, "removeBannerForTenant");

// src/controllers/bannersController.js
var listBannersController = withController(async c => {
  const query = parseQuery(c);
  const items = await listBannersForTenant(c, query.storeId);
  return sendOk(c, items);
});
var createBannerController = withController(async c => {
  const payload = await parseBody2(c);
  const created = await createBannerForTenant(c, payload);
  return sendCreated(c, created);
});
var updateBannerController = withController(async c => {
  const id = c.req.param("id");
  const payload = await parseBody2(c);
  const updated = await updateBannerForTenant(c, id, payload);
  return sendOk(c, updated);
});
var deleteBannerController = withController(async c => {
  const id = c.req.param("id");
  const removed = await removeBannerForTenant(c, id);
  return sendOk(c, removed);
});

// src/routes/bannerRoutes.js
var bannerRoutes = new Hono2();
bannerRoutes.use("*", protect);
bannerRoutes.get("/", listBannersController);
bannerRoutes.post("/", createBannerController);
bannerRoutes.put("/:id", updateBannerController);
bannerRoutes.delete("/:id", deleteBannerController);
var bannerRoutes_default = bannerRoutes;

// src/services/adService.js
var DEFAULT_ADS_SETTINGS = {
  enabled: true,
  maxDuration: 30,
  defaultDevice: "all",
};
function normalizeAdInput(payload = {}) {
  return {
    id: payload.id || crypto.randomUUID(),
    storeId: payload.storeId,
    modelId: payload.modelId || null,
    name: payload.name || "Novo anuncio",
    model: payload.model || "CPC",
    duration: Number(payload.duration || 7),
    device: payload.device || "all",
    value: Number(payload.value || 0),
    metrics: {
      impressions: Number(payload.metrics?.impressions || 0),
      clicks: Number(payload.metrics?.clicks || 0),
      ctr: Number(payload.metrics?.ctr || 0),
    },
    paid: Boolean(payload.paid),
    split: Number(payload.split || 0),
    paymentLink: payload.paymentLink || null,
    active: payload.active ?? true,
    advertiser: payload.advertiser || "",
    startDate: payload.startDate || null,
    endDate: payload.endDate || null,
  };
}
__name(normalizeAdInput, "normalizeAdInput");
async function listAdsByStore(c, storeId) {
  const tenant = c.get("tenant");
  return listAds(c, tenant.id, storeId || null);
}
__name(listAdsByStore, "listAdsByStore");
async function createAdForStore(c, payload) {
  const tenant = c.get("tenant");
  const storeId = payload?.storeId;
  ensure(storeId, 400, "validation_error", "storeId e obrigatorio.");
  const store = await findStoreById(c, tenant.id, storeId);
  ensure(store, 404, "store_not_found", "Loja nao encontrada.");
  const usage = await calculateUsageByResource(c, tenant.id, "ads", storeId);
  await enforceResourceLimit(c, tenant.id, "ads", usage + 1);
  const created = await createAd(c, tenant.id, normalizeAdInput(payload));
  await backupTenantSnapshot(c, tenant.id);
  return created;
}
__name(createAdForStore, "createAdForStore");
async function updateAdForStore(c, id, payload) {
  const tenant = c.get("tenant");
  const updated = await updateAd(c, tenant.id, id, payload || {});
  ensure(updated, 404, "ad_not_found", "Anuncio nao encontrado.");
  await backupTenantSnapshot(c, tenant.id);
  return updated;
}
__name(updateAdForStore, "updateAdForStore");
async function removeAdFromStore(c, id) {
  const tenant = c.get("tenant");
  const removed = await removeAd(c, tenant.id, id);
  ensure(removed, 404, "ad_not_found", "Anuncio nao encontrado.");
  await backupTenantSnapshot(c, tenant.id);
  return removed;
}
__name(removeAdFromStore, "removeAdFromStore");
async function listModels(c) {
  const tenant = c.get("tenant");
  return listAdModels(c, tenant.id);
}
__name(listModels, "listModels");
async function createModel(c, payload) {
  const tenant = c.get("tenant");
  const created = await createAdModel(c, tenant.id, {
    id: payload.id || crypto.randomUUID(),
    name: payload.name,
    pricingModel: payload.pricingModel,
    basePrice: Number(payload.basePrice || 0),
    allowedPositions: payload.allowedPositions || [],
    maxImages: Number(payload.maxImages || 0),
    maxVideoDuration: payload.maxVideoDuration
      ? Number(payload.maxVideoDuration)
      : null,
    description: payload.description || "",
  });
  await backupTenantSnapshot(c, tenant.id);
  return created;
}
__name(createModel, "createModel");
async function updateModel(c, id, payload) {
  const tenant = c.get("tenant");
  const updated = await updateAdModel(c, tenant.id, id, payload || {});
  ensure(
    updated,
    404,
    "ad_model_not_found",
    "Modelo de anuncio nao encontrado."
  );
  await backupTenantSnapshot(c, tenant.id);
  return updated;
}
__name(updateModel, "updateModel");
async function removeModel(c, id) {
  const tenant = c.get("tenant");
  const removed = await removeAdModel(c, tenant.id, id);
  ensure(
    removed,
    404,
    "ad_model_not_found",
    "Modelo de anuncio nao encontrado."
  );
  await backupTenantSnapshot(c, tenant.id);
  return removed;
}
__name(removeModel, "removeModel");
async function getAdsSettings2(c) {
  const tenant = c.get("tenant");
  return getAdsSettings(c, tenant.id, DEFAULT_ADS_SETTINGS);
}
__name(getAdsSettings2, "getAdsSettings");
async function updateAdsSettings2(c, payload) {
  const tenant = c.get("tenant");
  ensure(
    payload && typeof payload === "object" && !Array.isArray(payload),
    400,
    "validation_error",
    "Payload invalido."
  );
  const next = {
    ...DEFAULT_ADS_SETTINGS,
    ...payload,
  };
  return updateAdsSettings(c, tenant.id, next);
}
__name(updateAdsSettings2, "updateAdsSettings");

// src/controllers/adsController.js
var listAdsController = withJsonBody(async c => {
  const storeId = c.req.query("storeId") || null;
  const result = await listAdsByStore(c, storeId);
  return c.json(result, 200);
}, false);
var createAdController = withJsonBody(async (c, payload) => {
  const created = await createAdForStore(c, payload);
  return c.json(created, 201);
});
var updateAdController = withJsonBody(async (c, payload) => {
  const id = c.req.param("id");
  const updated = await updateAdForStore(c, id, payload);
  return c.json(updated, 200);
});
var deleteAdController = withJsonBody(async c => {
  const id = c.req.param("id");
  const removed = await removeAdFromStore(c, id);
  return c.json(removed, 200);
}, false);
var listAdModelsController = withJsonBody(async c => {
  const result = await listModels(c);
  return c.json(result, 200);
}, false);
var createAdModelController = withJsonBody(async (c, payload) => {
  const created = await createModel(c, payload);
  return c.json(created, 201);
});
var updateAdModelController = withJsonBody(async (c, payload) => {
  const id = c.req.param("id");
  const updated = await updateModel(c, id, payload);
  return c.json(updated, 200);
});
var deleteAdModelController = withJsonBody(async c => {
  const id = c.req.param("id");
  const removed = await removeModel(c, id);
  return c.json(removed, 200);
}, false);
var getAdsSettingsController = withJsonBody(async c => {
  const result = await getAdsSettings2(c);
  return c.json(result, 200);
}, false);
var updateAdsSettingsController = withJsonBody(async (c, payload) => {
  const result = await updateAdsSettings2(c, payload);
  return c.json(result, 200);
});

// src/routes/adRoutes.js
var adRoutes = new Hono2();
adRoutes.use("*", protect);
adRoutes.get("/settings", getAdsSettingsController);
adRoutes.put("/settings", updateAdsSettingsController);
adRoutes.get("/", listAdsController);
adRoutes.post("/", createAdController);
adRoutes.put("/:id", updateAdController);
adRoutes.delete("/:id", deleteAdController);
adRoutes.get("/models", listAdModelsController);
adRoutes.post("/models", createAdModelController);
adRoutes.put("/models/:id", updateAdModelController);
adRoutes.delete("/models/:id", deleteAdModelController);
var adRoutes_default = adRoutes;

// src/db/repositories/invoiceRepository.js
function mapInvoice(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    subscriptionId: row.subscription_id || null,
    provider: row.provider,
    providerPaymentId: row.provider_payment_id || null,
    amountCents: Number(row.amount_cents || 0),
    currency: row.currency || "BRL",
    status: row.status,
    invoiceUrl: row.invoice_url || null,
    rawPayload: row.raw_payload_json ? JSON.parse(row.raw_payload_json) : null,
    createdAt: row.created_at,
    paidAt: row.paid_at || null,
  };
}
__name(mapInvoice, "mapInvoice");
async function createInvoice(c, payload) {
  await run(
    c,
    `
      INSERT INTO invoices (
        id,
        tenant_id,
        subscription_id,
        provider,
        provider_payment_id,
        amount_cents,
        currency,
        status,
        invoice_url,
        raw_payload_json,
        created_at,
        paid_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      payload.id,
      payload.tenantId,
      payload.subscriptionId || null,
      payload.provider || "mercadopago",
      payload.providerPaymentId || null,
      Number(payload.amountCents || 0),
      payload.currency || "BRL",
      payload.status || "pending",
      payload.invoiceUrl || null,
      payload.rawPayload ? JSON.stringify(payload.rawPayload) : null,
      payload.createdAt,
      payload.paidAt || null,
    ]
  );
}
__name(createInvoice, "createInvoice");
async function listInvoicesByTenant(c, tenantId) {
  const rows = await all(
    c,
    `
      SELECT *
      FROM invoices
      WHERE tenant_id = ?
      ORDER BY datetime(created_at) DESC
    `,
    [tenantId]
  );
  return rows.map(mapInvoice);
}
__name(listInvoicesByTenant, "listInvoicesByTenant");

// src/db/repositories/webhookRepository.js
function findWebhookEvent(c, provider, externalId) {
  return first(
    c,
    `
      SELECT *
      FROM webhook_events
      WHERE provider = ? AND external_id = ?
      LIMIT 1
    `,
    [provider, externalId]
  );
}
__name(findWebhookEvent, "findWebhookEvent");
async function createWebhookEvent(c, payload) {
  await run(
    c,
    `
      INSERT INTO webhook_events (
        id,
        tenant_id,
        provider,
        event_type,
        external_id,
        payload_json,
        processed_at,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      payload.id,
      payload.tenantId || null,
      payload.provider,
      payload.eventType,
      payload.externalId,
      payload.payloadJson,
      payload.processedAt || null,
      payload.createdAt,
    ]
  );
}
__name(createWebhookEvent, "createWebhookEvent");

// src/services/billingService.js
async function createMercadoPagoPreference(env, payload) {
  if (!env.MERCADO_PAGO_ACCESS_TOKEN) {
    return {
      id: `mock_pref_${crypto.randomUUID()}`,
      init_point: `${
        env.PUBLIC_BASE_URL || "http://localhost:5173"
      }/app/planos?mockCheckout=1&planId=${payload.planId}`,
    };
  }
  const response = await fetch(
    "https://api.mercadopago.com/checkout/preferences",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.MERCADO_PAGO_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [
          {
            title: payload.planName,
            quantity: 1,
            unit_price: payload.amount,
            currency_id: "BRL",
          },
        ],
        metadata: payload.metadata,
        back_urls: {
          success: `${env.PUBLIC_BASE_URL || ""}/app/planos?status=success`,
          failure: `${env.PUBLIC_BASE_URL || ""}/app/planos?status=failure`,
        },
        auto_return: "approved",
      }),
    }
  );
  ensure(
    response.ok,
    502,
    "mercadopago_error",
    "Falha ao criar checkout no Mercado Pago."
  );
  return response.json();
}
__name(createMercadoPagoPreference, "createMercadoPagoPreference");
async function startCheckout(c, input) {
  const tenant = c.get("tenant");
  const env = c.get("env");
  const planId = input?.planId;
  ensure(planId, 400, "validation_error", "planId e obrigatorio.");
  const plan = await findPlanById(c, planId);
  ensure(plan, 404, "plan_not_found", "Plano nao encontrado.");
  const preference = await createMercadoPagoPreference(env, {
    planId: plan.id,
    planName: plan.name,
    amount: Number(plan.price_cents || 0) / 100,
    metadata: {
      tenantId: tenant.id,
      planId: plan.id,
    },
  });
  return {
    preferenceId: preference.id,
    checkoutUrl: preference.init_point,
  };
}
__name(startCheckout, "startCheckout");
async function handleWebhook(c, payload) {
  const eventId = String(payload?.id || payload?.data?.id || "");
  const eventType = String(payload?.type || payload?.action || "unknown");
  ensure(eventId, 400, "validation_error", "Webhook sem identificador.");
  const alreadyDone = await findWebhookEvent(c, "mercadopago", eventId);
  if (alreadyDone) {
    return { ok: true, duplicated: true };
  }
  const metadata = payload?.data?.metadata || payload?.metadata || {};
  const tenantId = metadata.tenantId || c.get("tenant")?.id;
  const planId = metadata.planId;
  const status = String(
    payload?.data?.status || payload?.status || ""
  ).toLowerCase();
  if (tenantId && planId && (status === "approved" || status === "paid")) {
    const subscription = await getCurrentSubscription(c, tenantId);
    if (subscription) {
      await updateSubscription(c, subscription.id, tenantId, {
        planId,
        status: "active",
        provider: "mercadopago",
        updatedAt: /* @__PURE__ */ new Date().toISOString(),
      });
    }
    const plan = await findPlanById(c, planId);
    if (plan) {
      await createInvoice(c, {
        id: crypto.randomUUID(),
        tenantId,
        subscriptionId: subscription?.id || null,
        provider: "mercadopago",
        providerPaymentId: String(payload?.data?.id || eventId),
        amountCents: Number(plan.price_cents || 0),
        currency: plan.currency || "BRL",
        status: "paid",
        invoiceUrl:
          payload?.data?.transaction_details?.external_resource_url || null,
        rawPayload: payload,
        createdAt: /* @__PURE__ */ new Date().toISOString(),
        paidAt: /* @__PURE__ */ new Date().toISOString(),
      });
    }
  }
  await createWebhookEvent(c, {
    id: crypto.randomUUID(),
    tenantId: tenantId || null,
    provider: "mercadopago",
    eventType,
    externalId: eventId,
    payloadJson: JSON.stringify(payload),
    processedAt: /* @__PURE__ */ new Date().toISOString(),
    createdAt: /* @__PURE__ */ new Date().toISOString(),
  });
  return { ok: true };
}
__name(handleWebhook, "handleWebhook");
async function getInvoices(c) {
  const tenant = c.get("tenant");
  return listInvoicesByTenant(c, tenant.id);
}
__name(getInvoices, "getInvoices");

// src/controllers/billingController.js
async function createCheckoutController(c) {
  const payload = await c.req.json();
  const result = await startCheckout(c, payload);
  return ok(c, result, 200);
}
__name(createCheckoutController, "createCheckoutController");
async function webhookController(c) {
  const payload = await c.req.json();
  const result = await handleWebhook(c, payload);
  return ok(c, result, 200);
}
__name(webhookController, "webhookController");
async function listInvoicesController(c) {
  const invoices = await getInvoices(c);
  return ok(c, invoices, 200);
}
__name(listInvoicesController, "listInvoicesController");

// src/routes/billingRoutes.js
var billingRoutes = new Hono2();
billingRoutes.post(
  "/checkout",
  protect,
  createRateLimit({
    routeKey: "billing-checkout",
    limit: 10,
    windowSeconds: 60,
  }),
  createCheckoutController
);
billingRoutes.post(
  "/webhook",
  createRateLimit({
    routeKey: "billing-webhook",
    limit: 30,
    windowSeconds: 60,
  }),
  webhookController
);
billingRoutes.get("/invoices", protect, listInvoicesController);
var billingRoutes_default = billingRoutes;

// src/db/repositories/sazonalRepository.js
function toBoolInt(value) {
  return Number(value) === 1 ? 1 : 0;
}
__name(toBoolInt, "toBoolInt");
function toSazonal(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    nome: row.nome,
    status: toBoolInt(row.status),
    date_start: row.date_start || null,
    date_end: row.date_end || null,
  };
}
__name(toSazonal, "toSazonal");
function toSazonalStoreRow(row) {
  if (!row) return null;
  const globalStatus = toBoolInt(row.status);
  const storeStatus =
    row.store_status === null || row.store_status === void 0
      ? 0
      : toBoolInt(row.store_status);
  const effectiveDateStart = row.store_date_start ?? row.date_start ?? null;
  const effectiveDateEnd = row.store_date_end ?? row.date_end ?? null;
  return {
    id: Number(row.id),
    nome: row.nome,
    status: storeStatus || globalStatus,
    store_status: storeStatus,
    date_start: row.date_start || null,
    date_end: row.date_end || null,
    store_date_start: row.store_date_start || null,
    store_date_end: row.store_date_end || null,
    // ✅ RESULTADO FINAL (o que você vai usar no front)
    effective_date_start: effectiveDateStart,
    effective_date_end: effectiveDateEnd,
    effective_status: globalStatus === 0 ? 0 : storeStatus,
  };
}
__name(toSazonalStoreRow, "toSazonalStoreRow");
async function listSazonais(c) {
  const rows = await all(
    c,
    `
      SELECT id, nome, status, date_start, date_end
      FROM sazonais
      ORDER BY id ASC
    `,
    []
  );
  return rows.map(toSazonal);
}
__name(listSazonais, "listSazonais");
async function findSazonalById(c, id) {
  const row = await first(
    c,
    `
      SELECT id, nome, status, date_start, date_end
      FROM sazonais
      WHERE id = ?
      LIMIT 1
    `,
    [id]
  );
  return toSazonal(row);
}
__name(findSazonalById, "findSazonalById");
async function createSazonal(c, payload) {
  const result = await run(
    c,
    `
      INSERT INTO sazonais (nome, status, date_start, date_end)
      VALUES (?, ?, ?, ?)
    `,
    [
      payload.nome,
      payload.status ? 1 : 0,
      payload.date_start || null,
      payload.date_end || null,
    ]
  );
  const createdId = result?.meta?.last_row_id;
  return findSazonalById(c, createdId);
}
__name(createSazonal, "createSazonal");
async function updateSazonal(c, id, payload) {
  await run(
    c,
    `
      UPDATE sazonais
      SET
        nome = ?,
        status = ?,
        date_start = ?,
        date_end = ?
      WHERE id = ?
    `,
    [
      payload.nome,
      payload.status ? 1 : 0,
      payload.date_start || null,
      payload.date_end || null,
      id,
    ]
  );
  return findSazonalById(c, id);
}
__name(updateSazonal, "updateSazonal");
async function listSazonaisByStore(c, storeId) {
  const rows = await all(
    c,
    `
      SELECT
        s.id,
        s.nome,
        s.status,
        s.date_start,
        s.date_end,
        ss.status AS store_status,
        ss.date_start AS store_date_start,
        ss.date_end AS store_date_end
      FROM sazonais s
      LEFT JOIN sazonais_store ss
        ON ss.id_sazonal = s.id
       AND ss.id_store = ?
      ORDER BY s.id ASC
    `,
    [storeId]
  );
  return rows.map(toSazonalStoreRow);
}
__name(listSazonaisByStore, "listSazonaisByStore");
async function upsertSazonalStore(c, storeId, sazonalId, payload) {
  await run(
    c,
    `
      INSERT INTO sazonais_store (id_store, id_sazonal, status, date_start, date_end)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id_store, id_sazonal) DO UPDATE SET
        status = excluded.status,
        date_start = excluded.date_start,
        date_end = excluded.date_end
    `,
    [
      storeId,
      sazonalId,
      payload.status ? 1 : 0,
      payload.date_start || null,
      payload.date_end || null,
    ]
  );
  const row = await first(
    c,
    `
      SELECT
        s.id,
        s.nome,
        s.status,
        s.date_start,
        s.date_end,
        ss.status AS store_status,
        ss.date_start AS store_date_start,
        ss.date_end AS store_date_end
      FROM sazonais s
      LEFT JOIN sazonais_store ss
        ON ss.id_sazonal = s.id
       AND ss.id_store = ?
      WHERE s.id = ?
      LIMIT 1
    `,
    [storeId, sazonalId]
  );
  return toSazonalStoreRow(row);
}
__name(upsertSazonalStore, "upsertSazonalStore");

// src/services/sazonalService.js
function normalizeStatus(value, fallback = 0) {
  if (value === void 0 || value === null || value === "") return fallback;
  return Number(value) === 1 ? 1 : 0;
}
__name(normalizeStatus, "normalizeStatus");
function normalizeDate(value) {
  if (!value) return null;
  const [day2, month] = value.split("-").map(Number);
  if (!day2 || !month || day2 < 1 || day2 > 31 || month < 1 || month > 12) {
    return null;
  }
  return `${String(day2).padStart(2, "0")}-${String(month).padStart(2, "0")}`;
}
__name(normalizeDate, "normalizeDate");
function normalizeSazonalPayload(payload, fallback = {}) {
  const nome = String(payload?.nome ?? fallback.nome ?? "")
    .trim()
    .slice(0, 120);
  const status = normalizeStatus(payload?.status, fallback.status ?? 1);
  const dateStart = normalizeDate(
    payload?.date_start ?? fallback.date_start ?? null
  );
  const dateEnd = normalizeDate(payload?.date_end ?? fallback.date_end ?? null);
  return {
    nome,
    status,
    date_start: dateStart,
    date_end: dateEnd,
  };
}
__name(normalizeSazonalPayload, "normalizeSazonalPayload");
function normalizeSazonalStorePayload(payload, fallback = {}) {
  const status = normalizeStatus(payload?.status, fallback.status ?? 0);
  const dateStart = normalizeDate(
    payload?.date_start ?? fallback.date_start ?? null
  );
  const dateEnd = normalizeDate(payload?.date_end ?? fallback.date_end ?? null);
  return {
    status,
    date_start: dateStart,
    date_end: dateEnd,
  };
}
__name(normalizeSazonalStorePayload, "normalizeSazonalStorePayload");
async function listGlobalSazonais(c) {
  return listSazonais(c);
}
__name(listGlobalSazonais, "listGlobalSazonais");
async function createGlobalSazonal(c, payload) {
  const normalized = normalizeSazonalPayload(payload, {});
  ensure(
    normalized.nome,
    400,
    "validation_error",
    "Nome do sazonal e obrigatorio."
  );
  return createSazonal(c, normalized);
}
__name(createGlobalSazonal, "createGlobalSazonal");
async function updateGlobalSazonal(c, id, payload) {
  const current = await findSazonalById(c, id);
  ensure(current, 404, "sazonal_not_found", "Sazonal nao encontrado.");
  const normalized = normalizeSazonalPayload(payload, current);
  ensure(
    normalized.nome,
    400,
    "validation_error",
    "Nome do sazonal e obrigatorio."
  );
  return updateSazonal(c, id, normalized);
}
__name(updateGlobalSazonal, "updateGlobalSazonal");
async function listSazonaisForStore(c, storeId) {
  const tenant = c.get("tenant");
  const store = await findStoreById(c, tenant.id, storeId);
  ensure(store, 404, "store_not_found", "Loja nao encontrada.");
  return listSazonaisByStore(c, storeId);
}
__name(listSazonaisForStore, "listSazonaisForStore");
async function updateSazonalForStore(c, storeId, sazonalId, payload) {
  const tenant = c.get("tenant");
  const store = await findStoreById(c, tenant.id, storeId);
  ensure(store, 404, "store_not_found", "Loja nao encontrada.");
  const sazonal = await findSazonalById(c, sazonalId);
  ensure(sazonal, 404, "sazonal_not_found", "Sazonal nao encontrado.");
  const normalized = normalizeSazonalStorePayload(payload, {});
  if (Number(sazonal.status) === 0) {
    normalized.status = 0;
  }
  return upsertSazonalStore(c, storeId, sazonalId, normalized);
}
__name(updateSazonalForStore, "updateSazonalForStore");

// src/controllers/sazonaisController.js
var getSazonais = withController(async c => {
  const result = await listGlobalSazonais(c);
  return sendOk(c, result);
});
var createSazonal2 = withController(async c => {
  const payload = await parseJsonBody(c);
  const created = await createGlobalSazonal(c, payload);
  return sendCreated(c, created);
});
var updateSazonal2 = withController(async c => {
  const id = Number(c.req.param("id"));
  const payload = await parseJsonBody(c);
  const updated = await updateGlobalSazonal(c, id, payload);
  return sendOk(c, updated);
});
var getSazonaisByStore = withController(async c => {
  const idStore = c.req.param("id_store");
  const result = await listSazonaisForStore(c, idStore);
  return sendOk(c, result);
});
var updateSazonalByStore = withController(async c => {
  const idStore = c.req.param("id_store");
  const idSazonal = Number(c.req.param("id_sazonal"));
  const payload = await parseJsonBody(c);
  const updated = await updateSazonalForStore(c, idStore, idSazonal, payload);
  return sendOk(c, updated);
});

// src/routes/sazonaisRoutes.js
var sazonaisRoutes = new Hono2();
sazonaisRoutes.use("*", protect);
sazonaisRoutes.get("/", getSazonais);
sazonaisRoutes.post("/", createSazonal2);
sazonaisRoutes.put("/:id", updateSazonal2);
sazonaisRoutes.get("/store/:id_store", getSazonaisByStore);
sazonaisRoutes.put("/store/:id_store/:id_sazonal", updateSazonalByStore);
var sazonaisRoutes_default = sazonaisRoutes;

// src/routes/index.js
function nowIso() {
  return /* @__PURE__ */ new Date().toISOString();
}
__name(nowIso, "nowIso");
function registerRoutes(app2) {
  app2.get("/api/health", c => {
    return c.json({
      ok: true,
      timestamp: nowIso(),
    });
  });
  app2.route("/api/auth", authRoutes_default);
  app2.route("/api/products", productRoutes_default);
  app2.route("/api/stores", storeRoutes_default);
  app2.route("/api/users", userRoutes_default);
  app2.route("/api/plans", planRoutes_default);
  app2.route("/api/categories", categoryRoutes_default);
  app2.route("/api/banners", bannerRoutes_default);
  app2.route("/api/ads", adRoutes_default);
  app2.route("/api/sazonais", sazonaisRoutes_default);
  app2.route("/api/billing", billingRoutes_default);
}
__name(registerRoutes, "registerRoutes");

// src/utils/env.js
var DEFAULTS = {
  APP_ROOT_DOMAIN: "affily-loja.com",
  DEFAULT_TENANT_SLUG: "demo",
  JWT_SECRET: "affily-dev-secret-change-me",
  ACCESS_TOKEN_TTL: 60 * 15,
  REFRESH_TOKEN_TTL: 60 * 60 * 24 * 30,
  CORS_ORIGINS: "http://localhost:5173",
  TRIAL_DAYS: 7,
  CLOUDFLARE_PAGES_PROJECT: "affily-loja",
  GOOGLE_CLIENT_ID: "",
  GOOGLE_CLIENT_SECRET: "",
  GOOGLE_REDIRECT_URI: "",
};
function normalizeNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
__name(normalizeNumber, "normalizeNumber");
function read(key, runtimeEnv) {
  return runtimeEnv?.[key] ?? DEFAULTS[key];
}
__name(read, "read");
function getEnv(runtimeEnv) {
  return {
    APP_ROOT_DOMAIN: read("APP_ROOT_DOMAIN", runtimeEnv),
    DEFAULT_TENANT_SLUG: read("DEFAULT_TENANT_SLUG", runtimeEnv),
    JWT_SECRET: read("JWT_SECRET", runtimeEnv),
    CORS_ORIGINS: read("CORS_ORIGINS", runtimeEnv),
    ACCESS_TOKEN_TTL: normalizeNumber(
      read("ACCESS_TOKEN_TTL", runtimeEnv),
      DEFAULTS.ACCESS_TOKEN_TTL
    ),
    REFRESH_TOKEN_TTL: normalizeNumber(
      read("REFRESH_TOKEN_TTL", runtimeEnv),
      DEFAULTS.REFRESH_TOKEN_TTL
    ),
    TRIAL_DAYS: normalizeNumber(
      read("TRIAL_DAYS", runtimeEnv),
      DEFAULTS.TRIAL_DAYS
    ),
    MERCADO_PAGO_ACCESS_TOKEN: runtimeEnv?.MERCADO_PAGO_ACCESS_TOKEN || "",
    MERCADO_PAGO_WEBHOOK_SECRET: runtimeEnv?.MERCADO_PAGO_WEBHOOK_SECRET || "",
    RESEND_API_KEY: runtimeEnv?.RESEND_API_KEY || "",
    RESEND_FROM_EMAIL: runtimeEnv?.RESEND_FROM_EMAIL || "",
    PUBLIC_BASE_URL: runtimeEnv?.PUBLIC_BASE_URL || "",
    CLOUDFLARE_API_TOKEN: runtimeEnv?.CLOUDFLARE_API_TOKEN || "",
    CLOUDFLARE_ZONE_ID: runtimeEnv?.CLOUDFLARE_ZONE_ID || "",
    CLOUDFLARE_ACCOUNT_ID: runtimeEnv?.CLOUDFLARE_ACCOUNT_ID || "",
    CLOUDFLARE_PAGES_PROJECT: read("CLOUDFLARE_PAGES_PROJECT", runtimeEnv),
    CLOUDFLARE_PAGES_TARGET: runtimeEnv?.CLOUDFLARE_PAGES_TARGET || "",
    GOOGLE_CLIENT_ID: read("GOOGLE_CLIENT_ID", runtimeEnv),
    GOOGLE_CLIENT_SECRET: read("GOOGLE_CLIENT_SECRET", runtimeEnv),
    GOOGLE_REDIRECT_URI: read("GOOGLE_REDIRECT_URI", runtimeEnv),
  };
}
__name(getEnv, "getEnv");

// src/middlewares/tenantMiddleware.js
function getHost(c) {
  const explicitHost = c.req.header("x-tenant-host");
  if (explicitHost && explicitHost.trim())
    return explicitHost.trim().toLowerCase();
  const forwardedHost = c.req.header("x-forwarded-host");
  if (forwardedHost) return forwardedHost.trim().toLowerCase();
  const host = c.req.header("host");
  return (host || "").trim().toLowerCase();
}
__name(getHost, "getHost");
function extractSubdomain(host, rootDomain) {
  if (!host || !rootDomain) return null;
  const cleanHost = host.split(":")[0];
  const cleanRoot = rootDomain.toLowerCase();
  if (!cleanHost.endsWith(`.${cleanRoot}`)) return null;
  const withoutRoot = cleanHost.slice(0, -(cleanRoot.length + 1));
  return withoutRoot || null;
}
__name(extractSubdomain, "extractSubdomain");
async function resolveTenant(c, next) {
  const env = getEnv(c.env);
  const host = getHost(c);
  var fallbackSlug = c.req.header("x-tenant-slug") || env.DEFAULT_TENANT_SLUG;
  const localHost =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.endsWith(".localhost") ||
    host.startsWith("localhost:") ||
    host.startsWith("127.0.0.1:") ||
    host.startsWith("192.168.100.2:");
  if (localHost) {
    const tenant2 =
      (await first(
        c,
        "SELECT * FROM tenants WHERE subdomain = ? AND status = ? LIMIT 1",
        [fallbackSlug, "active"]
      )) || null;
    if (!tenant2) {
      throw new ApiError(404, "tenant_not_found", "Tenant nao encontrado.");
    }
    c.set("tenant", tenant2);
    await next();
    return;
  }
  let tenant =
    (await first(
      c,
      "SELECT * FROM tenants WHERE domain = ? AND status = ? LIMIT 1",
      [host, "active"]
    )) || null;
  if (!tenant) {
    const subdomain =
      extractSubdomain(host, env.APP_ROOT_DOMAIN) || fallbackSlug;
    tenant =
      (await first(
        c,
        "SELECT * FROM tenants WHERE subdomain = ? AND status = ? LIMIT 1",
        [subdomain, "active"]
      )) || null;
  }
  if (!tenant) {
    const resolvedStore = c.get("store") || c.get("storeTenant");
    if (resolvedStore?.tenantId) {
      tenant =
        (await first(
          c,
          "SELECT * FROM tenants WHERE id = ? AND status = ? LIMIT 1",
          [resolvedStore.tenantId, "active"]
        )) || null;
    }
  }
  if (!tenant) {
    throw new ApiError(404, "tenant_not_found", "Tenant nao encontrado.");
  }
  c.set("tenant", tenant);
  await next();
}
__name(resolveTenant, "resolveTenant");

// src/middlewares/storeTenantMiddleware.js
function sanitizeHost(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .split(":")[0];
}
__name(sanitizeHost, "sanitizeHost");
function extractSubdomain2(host, rootDomain) {
  const normalizedHost = sanitizeHost(host);
  const normalizedRoot = String(rootDomain || "").toLowerCase();
  if (!normalizedHost || !normalizedRoot) return null;
  if (normalizedHost === normalizedRoot) return null;
  if (!normalizedHost.endsWith(`.${normalizedRoot}`)) return null;
  return normalizedHost.slice(0, -(normalizedRoot.length + 1)) || null;
}
__name(extractSubdomain2, "extractSubdomain");
async function resolveStoreTenant(c, next) {
  const explicitHost =
    c.req.header("x-store-host") || c.req.header("x-tenant-host");
  const forwardedHost = c.req.header("x-forwarded-host");
  const directHost = c.req.header("host");
  const host = sanitizeHost(explicitHost || forwardedHost || directHost);
  const rootDomain =
    c.get("env")?.APP_ROOT_DOMAIN ||
    process.env.APP_ROOT_DOMAIN ||
    "affily-loja.com";
  const explicitSubdomain = c.req.header("x-store-subdomain");
  const derivedSubdomain =
    explicitSubdomain || extractSubdomain2(host, rootDomain);
  let storeTenant = null;
  if (derivedSubdomain) {
    try {
      storeTenant = await findStoreBySubdomainSlug(c, derivedSubdomain);
      if (!storeTenant) {
        storeTenant = await findStoreByLegacySlug(c, derivedSubdomain);
      }
    } catch (error) {
      console.error(
        "[tenant] failed to resolve subdomain:",
        error?.message || error
      );
    }
  }
  c.set("store", storeTenant);
  c.set("storeTenant", storeTenant);
  c.set("storeSubdomain", derivedSubdomain || null);
  c.set("requestHost", host);
  await next();
}
__name(resolveStoreTenant, "resolveStoreTenant");

// src/middlewares/securityMiddleware.js
async function securityHeaders(c, next) {
  await next();
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  c.header("X-XSS-Protection", "1; mode=block");
  c.header("Permissions-Policy", "camera=(), geolocation=(), microphone=()");
}
__name(securityHeaders, "securityHeaders");

// src/middlewares/errorMiddleware.js
async function errorHandler2(c, next) {
  try {
    await next();
  } catch (error) {
    if (isApiError(error)) {
      return c.json(
        {
          error: {
            code: error.code,
            message: error.message,
            details: error.details || null,
          },
        },
        error.status
      );
    }
    console.error("[server:error]", error);
    return c.json(
      {
        error: {
          code: "internal_error",
          message: "Falha interna no servidor.",
        },
      },
      500
    );
  }
}
__name(errorHandler2, "errorHandler");

// src/app.js
function normalizeCorsOrigins(value) {
  const origins = (value || "")
    .split(",")
    .map(item => item.trim())
    .filter(Boolean);
  if (!origins.length) return "*";
  if (origins.includes("*")) return "*";
  return origins;
}
__name(normalizeCorsOrigins, "normalizeCorsOrigins");
function isAllowedOrigin(origin, allowed) {
  return allowed.some(allowedOrigin => {
    if (allowedOrigin === "*") return true;
    if (allowedOrigin.includes("*")) {
      const pattern = new RegExp(
        "^" + allowedOrigin.replace(/\./g, "\\.").replace("*", ".*") + "$"
      );
      return pattern.test(origin);
    }
    return allowedOrigin === origin;
  });
}
__name(isAllowedOrigin, "isAllowedOrigin");
function createApp() {
  const app2 = new Hono2();
  app2.use(
    "*",
    cors({
      origin: /* @__PURE__ */ __name((origin, c) => {
        const allowed = normalizeCorsOrigins(c.env?.CORS_ORIGINS || "");
        if (allowed === "*") return "*";
        if (!origin) return "*";
        if (isAllowedOrigin(origin, allowed)) {
          return origin;
        }
        return null;
      }, "origin"),
      allowHeaders: [
        "Content-Type",
        "Authorization",
        "X-Tenant-Host",
        "X-Tenant-Slug",
        "X-Store-Subdomain",
      ],
      allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      // opcional (melhora performance de preflight)
      maxAge: 86400,
    })
  );
  app2.options("*", c => {
    return new Response(null, {
      status: 204,
      headers: c.res.headers,
    });
  });
  app2.use("*", errorHandler2);
  app2.use("*", async (c, next) => {
    c.set("env", getEnv(c.env));
    await next();
  });
  app2.use("*", securityHeaders);
  app2.use("/api/*", async (c, next) => {
    if (c.req.method === "OPTIONS") return next();
    if (c.req.path === "/api/health") {
      return next();
    }
    await resolveStoreTenant(c, next);
  });
  app2.use("/api/*", async (c, next) => {
    if (c.req.method === "OPTIONS") return next();
    if (c.req.path === "/api/health") {
      return next();
    }
    await resolveTenant(c, next);
  });
  app2.get("/", c => {
    return c.json({
      name: "Affily API",
      runtime: "cloudflare-workers",
      status: "ok",
    });
  });
  registerRoutes(app2);
  return app2;
}
__name(createApp, "createApp");

// worker.js
var app = createApp();
var worker_default = {
  fetch(request, env, ctx) {
    return app.fetch(request, env, ctx);
  },
};
export { worker_default as default };
//# sourceMappingURL=worker.js.map
