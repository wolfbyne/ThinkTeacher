var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __markAsModule = (target) => __defProp(target, "__esModule", { value: true });
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[Object.keys(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[Object.keys(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  __markAsModule(target);
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __reExport = (target, module2, desc) => {
  if (module2 && typeof module2 === "object" || typeof module2 === "function") {
    for (let key of __getOwnPropNames(module2))
      if (!__hasOwnProp.call(target, key) && key !== "default")
        __defProp(target, key, { get: () => module2[key], enumerable: !(desc = __getOwnPropDesc(module2, key)) || desc.enumerable });
  }
  return target;
};
var __toModule = (module2) => {
  return __reExport(__markAsModule(__defProp(module2 != null ? __create(__getProtoOf(module2)) : {}, "default", module2 && module2.__esModule && "default" in module2 ? { get: () => module2.default, enumerable: true } : { value: module2, enumerable: true })), module2);
};

// node_modules/@sveltejs/kit/dist/install-fetch.js
function dataUriToBuffer(uri) {
  if (!/^data:/i.test(uri)) {
    throw new TypeError('`uri` does not appear to be a Data URI (must begin with "data:")');
  }
  uri = uri.replace(/\r?\n/g, "");
  const firstComma = uri.indexOf(",");
  if (firstComma === -1 || firstComma <= 4) {
    throw new TypeError("malformed data: URI");
  }
  const meta = uri.substring(5, firstComma).split(";");
  let charset = "";
  let base64 = false;
  const type = meta[0] || "text/plain";
  let typeFull = type;
  for (let i = 1; i < meta.length; i++) {
    if (meta[i] === "base64") {
      base64 = true;
    } else {
      typeFull += `;${meta[i]}`;
      if (meta[i].indexOf("charset=") === 0) {
        charset = meta[i].substring(8);
      }
    }
  }
  if (!meta[0] && !charset.length) {
    typeFull += ";charset=US-ASCII";
    charset = "US-ASCII";
  }
  const encoding = base64 ? "base64" : "ascii";
  const data = unescape(uri.substring(firstComma + 1));
  const buffer = Buffer.from(data, encoding);
  buffer.type = type;
  buffer.typeFull = typeFull;
  buffer.charset = charset;
  return buffer;
}
async function* read(parts) {
  for (const part of parts) {
    if ("stream" in part) {
      yield* part.stream();
    } else {
      yield part;
    }
  }
}
function isFormData(object) {
  return typeof object === "object" && typeof object.append === "function" && typeof object.set === "function" && typeof object.get === "function" && typeof object.getAll === "function" && typeof object.delete === "function" && typeof object.keys === "function" && typeof object.values === "function" && typeof object.entries === "function" && typeof object.constructor === "function" && object[NAME] === "FormData";
}
function getHeader(boundary, name, field) {
  let header = "";
  header += `${dashes}${boundary}${carriage}`;
  header += `Content-Disposition: form-data; name="${name}"`;
  if (isBlob(field)) {
    header += `; filename="${field.name}"${carriage}`;
    header += `Content-Type: ${field.type || "application/octet-stream"}`;
  }
  return `${header}${carriage.repeat(2)}`;
}
async function* formDataIterator(form, boundary) {
  for (const [name, value] of form) {
    yield getHeader(boundary, name, value);
    if (isBlob(value)) {
      yield* value.stream();
    } else {
      yield value;
    }
    yield carriage;
  }
  yield getFooter(boundary);
}
function getFormDataLength(form, boundary) {
  let length = 0;
  for (const [name, value] of form) {
    length += Buffer.byteLength(getHeader(boundary, name, value));
    if (isBlob(value)) {
      length += value.size;
    } else {
      length += Buffer.byteLength(String(value));
    }
    length += carriageLength;
  }
  length += Buffer.byteLength(getFooter(boundary));
  return length;
}
async function consumeBody(data) {
  if (data[INTERNALS$2].disturbed) {
    throw new TypeError(`body used already for: ${data.url}`);
  }
  data[INTERNALS$2].disturbed = true;
  if (data[INTERNALS$2].error) {
    throw data[INTERNALS$2].error;
  }
  let { body } = data;
  if (body === null) {
    return Buffer.alloc(0);
  }
  if (isBlob(body)) {
    body = body.stream();
  }
  if (Buffer.isBuffer(body)) {
    return body;
  }
  if (!(body instanceof import_stream.default)) {
    return Buffer.alloc(0);
  }
  const accum = [];
  let accumBytes = 0;
  try {
    for await (const chunk of body) {
      if (data.size > 0 && accumBytes + chunk.length > data.size) {
        const err = new FetchError(`content size at ${data.url} over limit: ${data.size}`, "max-size");
        body.destroy(err);
        throw err;
      }
      accumBytes += chunk.length;
      accum.push(chunk);
    }
  } catch (error2) {
    if (error2 instanceof FetchBaseError) {
      throw error2;
    } else {
      throw new FetchError(`Invalid response body while trying to fetch ${data.url}: ${error2.message}`, "system", error2);
    }
  }
  if (body.readableEnded === true || body._readableState.ended === true) {
    try {
      if (accum.every((c) => typeof c === "string")) {
        return Buffer.from(accum.join(""));
      }
      return Buffer.concat(accum, accumBytes);
    } catch (error2) {
      throw new FetchError(`Could not create Buffer from response body for ${data.url}: ${error2.message}`, "system", error2);
    }
  } else {
    throw new FetchError(`Premature close of server response while trying to fetch ${data.url}`);
  }
}
function fromRawHeaders(headers = []) {
  return new Headers(headers.reduce((result, value, index2, array) => {
    if (index2 % 2 === 0) {
      result.push(array.slice(index2, index2 + 2));
    }
    return result;
  }, []).filter(([name, value]) => {
    try {
      validateHeaderName(name);
      validateHeaderValue(name, String(value));
      return true;
    } catch {
      return false;
    }
  }));
}
async function fetch(url, options_) {
  return new Promise((resolve2, reject) => {
    const request = new Request(url, options_);
    const options2 = getNodeRequestOptions(request);
    if (!supportedSchemas.has(options2.protocol)) {
      throw new TypeError(`node-fetch cannot load ${url}. URL scheme "${options2.protocol.replace(/:$/, "")}" is not supported.`);
    }
    if (options2.protocol === "data:") {
      const data = src(request.url);
      const response2 = new Response(data, { headers: { "Content-Type": data.typeFull } });
      resolve2(response2);
      return;
    }
    const send = (options2.protocol === "https:" ? import_https.default : import_http.default).request;
    const { signal } = request;
    let response = null;
    const abort = () => {
      const error2 = new AbortError("The operation was aborted.");
      reject(error2);
      if (request.body && request.body instanceof import_stream.default.Readable) {
        request.body.destroy(error2);
      }
      if (!response || !response.body) {
        return;
      }
      response.body.emit("error", error2);
    };
    if (signal && signal.aborted) {
      abort();
      return;
    }
    const abortAndFinalize = () => {
      abort();
      finalize();
    };
    const request_ = send(options2);
    if (signal) {
      signal.addEventListener("abort", abortAndFinalize);
    }
    const finalize = () => {
      request_.abort();
      if (signal) {
        signal.removeEventListener("abort", abortAndFinalize);
      }
    };
    request_.on("error", (err) => {
      reject(new FetchError(`request to ${request.url} failed, reason: ${err.message}`, "system", err));
      finalize();
    });
    request_.on("response", (response_) => {
      request_.setTimeout(0);
      const headers = fromRawHeaders(response_.rawHeaders);
      if (isRedirect(response_.statusCode)) {
        const location = headers.get("Location");
        const locationURL = location === null ? null : new URL(location, request.url);
        switch (request.redirect) {
          case "error":
            reject(new FetchError(`uri requested responds with a redirect, redirect mode is set to error: ${request.url}`, "no-redirect"));
            finalize();
            return;
          case "manual":
            if (locationURL !== null) {
              try {
                headers.set("Location", locationURL);
              } catch (error2) {
                reject(error2);
              }
            }
            break;
          case "follow": {
            if (locationURL === null) {
              break;
            }
            if (request.counter >= request.follow) {
              reject(new FetchError(`maximum redirect reached at: ${request.url}`, "max-redirect"));
              finalize();
              return;
            }
            const requestOptions = {
              headers: new Headers(request.headers),
              follow: request.follow,
              counter: request.counter + 1,
              agent: request.agent,
              compress: request.compress,
              method: request.method,
              body: request.body,
              signal: request.signal,
              size: request.size
            };
            if (response_.statusCode !== 303 && request.body && options_.body instanceof import_stream.default.Readable) {
              reject(new FetchError("Cannot follow redirect with body being a readable stream", "unsupported-redirect"));
              finalize();
              return;
            }
            if (response_.statusCode === 303 || (response_.statusCode === 301 || response_.statusCode === 302) && request.method === "POST") {
              requestOptions.method = "GET";
              requestOptions.body = void 0;
              requestOptions.headers.delete("content-length");
            }
            resolve2(fetch(new Request(locationURL, requestOptions)));
            finalize();
            return;
          }
        }
      }
      response_.once("end", () => {
        if (signal) {
          signal.removeEventListener("abort", abortAndFinalize);
        }
      });
      let body = (0, import_stream.pipeline)(response_, new import_stream.PassThrough(), (error2) => {
        reject(error2);
      });
      if (process.version < "v12.10") {
        response_.on("aborted", abortAndFinalize);
      }
      const responseOptions = {
        url: request.url,
        status: response_.statusCode,
        statusText: response_.statusMessage,
        headers,
        size: request.size,
        counter: request.counter,
        highWaterMark: request.highWaterMark
      };
      const codings = headers.get("Content-Encoding");
      if (!request.compress || request.method === "HEAD" || codings === null || response_.statusCode === 204 || response_.statusCode === 304) {
        response = new Response(body, responseOptions);
        resolve2(response);
        return;
      }
      const zlibOptions = {
        flush: import_zlib.default.Z_SYNC_FLUSH,
        finishFlush: import_zlib.default.Z_SYNC_FLUSH
      };
      if (codings === "gzip" || codings === "x-gzip") {
        body = (0, import_stream.pipeline)(body, import_zlib.default.createGunzip(zlibOptions), (error2) => {
          reject(error2);
        });
        response = new Response(body, responseOptions);
        resolve2(response);
        return;
      }
      if (codings === "deflate" || codings === "x-deflate") {
        const raw = (0, import_stream.pipeline)(response_, new import_stream.PassThrough(), (error2) => {
          reject(error2);
        });
        raw.once("data", (chunk) => {
          if ((chunk[0] & 15) === 8) {
            body = (0, import_stream.pipeline)(body, import_zlib.default.createInflate(), (error2) => {
              reject(error2);
            });
          } else {
            body = (0, import_stream.pipeline)(body, import_zlib.default.createInflateRaw(), (error2) => {
              reject(error2);
            });
          }
          response = new Response(body, responseOptions);
          resolve2(response);
        });
        return;
      }
      if (codings === "br") {
        body = (0, import_stream.pipeline)(body, import_zlib.default.createBrotliDecompress(), (error2) => {
          reject(error2);
        });
        response = new Response(body, responseOptions);
        resolve2(response);
        return;
      }
      response = new Response(body, responseOptions);
      resolve2(response);
    });
    writeToStream(request_, request);
  });
}
var import_http, import_https, import_zlib, import_stream, import_util, import_crypto, import_url, src, Readable, wm, Blob, fetchBlob, FetchBaseError, FetchError, NAME, isURLSearchParameters, isBlob, isAbortSignal, carriage, dashes, carriageLength, getFooter, getBoundary, INTERNALS$2, Body, clone, extractContentType, getTotalBytes, writeToStream, validateHeaderName, validateHeaderValue, Headers, redirectStatus, isRedirect, INTERNALS$1, Response, getSearch, INTERNALS, isRequest, Request, getNodeRequestOptions, AbortError, supportedSchemas;
var init_install_fetch = __esm({
  "node_modules/@sveltejs/kit/dist/install-fetch.js"() {
    init_shims();
    import_http = __toModule(require("http"));
    import_https = __toModule(require("https"));
    import_zlib = __toModule(require("zlib"));
    import_stream = __toModule(require("stream"));
    import_util = __toModule(require("util"));
    import_crypto = __toModule(require("crypto"));
    import_url = __toModule(require("url"));
    src = dataUriToBuffer;
    ({ Readable } = import_stream.default);
    wm = new WeakMap();
    Blob = class {
      constructor(blobParts = [], options2 = {}) {
        let size = 0;
        const parts = blobParts.map((element) => {
          let buffer;
          if (element instanceof Buffer) {
            buffer = element;
          } else if (ArrayBuffer.isView(element)) {
            buffer = Buffer.from(element.buffer, element.byteOffset, element.byteLength);
          } else if (element instanceof ArrayBuffer) {
            buffer = Buffer.from(element);
          } else if (element instanceof Blob) {
            buffer = element;
          } else {
            buffer = Buffer.from(typeof element === "string" ? element : String(element));
          }
          size += buffer.length || buffer.size || 0;
          return buffer;
        });
        const type = options2.type === void 0 ? "" : String(options2.type).toLowerCase();
        wm.set(this, {
          type: /[^\u0020-\u007E]/.test(type) ? "" : type,
          size,
          parts
        });
      }
      get size() {
        return wm.get(this).size;
      }
      get type() {
        return wm.get(this).type;
      }
      async text() {
        return Buffer.from(await this.arrayBuffer()).toString();
      }
      async arrayBuffer() {
        const data = new Uint8Array(this.size);
        let offset = 0;
        for await (const chunk of this.stream()) {
          data.set(chunk, offset);
          offset += chunk.length;
        }
        return data.buffer;
      }
      stream() {
        return Readable.from(read(wm.get(this).parts));
      }
      slice(start = 0, end = this.size, type = "") {
        const { size } = this;
        let relativeStart = start < 0 ? Math.max(size + start, 0) : Math.min(start, size);
        let relativeEnd = end < 0 ? Math.max(size + end, 0) : Math.min(end, size);
        const span = Math.max(relativeEnd - relativeStart, 0);
        const parts = wm.get(this).parts.values();
        const blobParts = [];
        let added = 0;
        for (const part of parts) {
          const size2 = ArrayBuffer.isView(part) ? part.byteLength : part.size;
          if (relativeStart && size2 <= relativeStart) {
            relativeStart -= size2;
            relativeEnd -= size2;
          } else {
            const chunk = part.slice(relativeStart, Math.min(size2, relativeEnd));
            blobParts.push(chunk);
            added += ArrayBuffer.isView(chunk) ? chunk.byteLength : chunk.size;
            relativeStart = 0;
            if (added >= span) {
              break;
            }
          }
        }
        const blob = new Blob([], { type: String(type).toLowerCase() });
        Object.assign(wm.get(blob), { size: span, parts: blobParts });
        return blob;
      }
      get [Symbol.toStringTag]() {
        return "Blob";
      }
      static [Symbol.hasInstance](object) {
        return object && typeof object === "object" && typeof object.stream === "function" && object.stream.length === 0 && typeof object.constructor === "function" && /^(Blob|File)$/.test(object[Symbol.toStringTag]);
      }
    };
    Object.defineProperties(Blob.prototype, {
      size: { enumerable: true },
      type: { enumerable: true },
      slice: { enumerable: true }
    });
    fetchBlob = Blob;
    FetchBaseError = class extends Error {
      constructor(message, type) {
        super(message);
        Error.captureStackTrace(this, this.constructor);
        this.type = type;
      }
      get name() {
        return this.constructor.name;
      }
      get [Symbol.toStringTag]() {
        return this.constructor.name;
      }
    };
    FetchError = class extends FetchBaseError {
      constructor(message, type, systemError) {
        super(message, type);
        if (systemError) {
          this.code = this.errno = systemError.code;
          this.erroredSysCall = systemError.syscall;
        }
      }
    };
    NAME = Symbol.toStringTag;
    isURLSearchParameters = (object) => {
      return typeof object === "object" && typeof object.append === "function" && typeof object.delete === "function" && typeof object.get === "function" && typeof object.getAll === "function" && typeof object.has === "function" && typeof object.set === "function" && typeof object.sort === "function" && object[NAME] === "URLSearchParams";
    };
    isBlob = (object) => {
      return typeof object === "object" && typeof object.arrayBuffer === "function" && typeof object.type === "string" && typeof object.stream === "function" && typeof object.constructor === "function" && /^(Blob|File)$/.test(object[NAME]);
    };
    isAbortSignal = (object) => {
      return typeof object === "object" && object[NAME] === "AbortSignal";
    };
    carriage = "\r\n";
    dashes = "-".repeat(2);
    carriageLength = Buffer.byteLength(carriage);
    getFooter = (boundary) => `${dashes}${boundary}${dashes}${carriage.repeat(2)}`;
    getBoundary = () => (0, import_crypto.randomBytes)(8).toString("hex");
    INTERNALS$2 = Symbol("Body internals");
    Body = class {
      constructor(body, {
        size = 0
      } = {}) {
        let boundary = null;
        if (body === null) {
          body = null;
        } else if (isURLSearchParameters(body)) {
          body = Buffer.from(body.toString());
        } else if (isBlob(body))
          ;
        else if (Buffer.isBuffer(body))
          ;
        else if (import_util.types.isAnyArrayBuffer(body)) {
          body = Buffer.from(body);
        } else if (ArrayBuffer.isView(body)) {
          body = Buffer.from(body.buffer, body.byteOffset, body.byteLength);
        } else if (body instanceof import_stream.default)
          ;
        else if (isFormData(body)) {
          boundary = `NodeFetchFormDataBoundary${getBoundary()}`;
          body = import_stream.default.Readable.from(formDataIterator(body, boundary));
        } else {
          body = Buffer.from(String(body));
        }
        this[INTERNALS$2] = {
          body,
          boundary,
          disturbed: false,
          error: null
        };
        this.size = size;
        if (body instanceof import_stream.default) {
          body.on("error", (err) => {
            const error2 = err instanceof FetchBaseError ? err : new FetchError(`Invalid response body while trying to fetch ${this.url}: ${err.message}`, "system", err);
            this[INTERNALS$2].error = error2;
          });
        }
      }
      get body() {
        return this[INTERNALS$2].body;
      }
      get bodyUsed() {
        return this[INTERNALS$2].disturbed;
      }
      async arrayBuffer() {
        const { buffer, byteOffset, byteLength } = await consumeBody(this);
        return buffer.slice(byteOffset, byteOffset + byteLength);
      }
      async blob() {
        const ct = this.headers && this.headers.get("content-type") || this[INTERNALS$2].body && this[INTERNALS$2].body.type || "";
        const buf = await this.buffer();
        return new fetchBlob([buf], {
          type: ct
        });
      }
      async json() {
        const buffer = await consumeBody(this);
        return JSON.parse(buffer.toString());
      }
      async text() {
        const buffer = await consumeBody(this);
        return buffer.toString();
      }
      buffer() {
        return consumeBody(this);
      }
    };
    Object.defineProperties(Body.prototype, {
      body: { enumerable: true },
      bodyUsed: { enumerable: true },
      arrayBuffer: { enumerable: true },
      blob: { enumerable: true },
      json: { enumerable: true },
      text: { enumerable: true }
    });
    clone = (instance, highWaterMark) => {
      let p1;
      let p2;
      let { body } = instance;
      if (instance.bodyUsed) {
        throw new Error("cannot clone body after it is used");
      }
      if (body instanceof import_stream.default && typeof body.getBoundary !== "function") {
        p1 = new import_stream.PassThrough({ highWaterMark });
        p2 = new import_stream.PassThrough({ highWaterMark });
        body.pipe(p1);
        body.pipe(p2);
        instance[INTERNALS$2].body = p1;
        body = p2;
      }
      return body;
    };
    extractContentType = (body, request) => {
      if (body === null) {
        return null;
      }
      if (typeof body === "string") {
        return "text/plain;charset=UTF-8";
      }
      if (isURLSearchParameters(body)) {
        return "application/x-www-form-urlencoded;charset=UTF-8";
      }
      if (isBlob(body)) {
        return body.type || null;
      }
      if (Buffer.isBuffer(body) || import_util.types.isAnyArrayBuffer(body) || ArrayBuffer.isView(body)) {
        return null;
      }
      if (body && typeof body.getBoundary === "function") {
        return `multipart/form-data;boundary=${body.getBoundary()}`;
      }
      if (isFormData(body)) {
        return `multipart/form-data; boundary=${request[INTERNALS$2].boundary}`;
      }
      if (body instanceof import_stream.default) {
        return null;
      }
      return "text/plain;charset=UTF-8";
    };
    getTotalBytes = (request) => {
      const { body } = request;
      if (body === null) {
        return 0;
      }
      if (isBlob(body)) {
        return body.size;
      }
      if (Buffer.isBuffer(body)) {
        return body.length;
      }
      if (body && typeof body.getLengthSync === "function") {
        return body.hasKnownLength && body.hasKnownLength() ? body.getLengthSync() : null;
      }
      if (isFormData(body)) {
        return getFormDataLength(request[INTERNALS$2].boundary);
      }
      return null;
    };
    writeToStream = (dest, { body }) => {
      if (body === null) {
        dest.end();
      } else if (isBlob(body)) {
        body.stream().pipe(dest);
      } else if (Buffer.isBuffer(body)) {
        dest.write(body);
        dest.end();
      } else {
        body.pipe(dest);
      }
    };
    validateHeaderName = typeof import_http.default.validateHeaderName === "function" ? import_http.default.validateHeaderName : (name) => {
      if (!/^[\^`\-\w!#$%&'*+.|~]+$/.test(name)) {
        const err = new TypeError(`Header name must be a valid HTTP token [${name}]`);
        Object.defineProperty(err, "code", { value: "ERR_INVALID_HTTP_TOKEN" });
        throw err;
      }
    };
    validateHeaderValue = typeof import_http.default.validateHeaderValue === "function" ? import_http.default.validateHeaderValue : (name, value) => {
      if (/[^\t\u0020-\u007E\u0080-\u00FF]/.test(value)) {
        const err = new TypeError(`Invalid character in header content ["${name}"]`);
        Object.defineProperty(err, "code", { value: "ERR_INVALID_CHAR" });
        throw err;
      }
    };
    Headers = class extends URLSearchParams {
      constructor(init2) {
        let result = [];
        if (init2 instanceof Headers) {
          const raw = init2.raw();
          for (const [name, values] of Object.entries(raw)) {
            result.push(...values.map((value) => [name, value]));
          }
        } else if (init2 == null)
          ;
        else if (typeof init2 === "object" && !import_util.types.isBoxedPrimitive(init2)) {
          const method = init2[Symbol.iterator];
          if (method == null) {
            result.push(...Object.entries(init2));
          } else {
            if (typeof method !== "function") {
              throw new TypeError("Header pairs must be iterable");
            }
            result = [...init2].map((pair) => {
              if (typeof pair !== "object" || import_util.types.isBoxedPrimitive(pair)) {
                throw new TypeError("Each header pair must be an iterable object");
              }
              return [...pair];
            }).map((pair) => {
              if (pair.length !== 2) {
                throw new TypeError("Each header pair must be a name/value tuple");
              }
              return [...pair];
            });
          }
        } else {
          throw new TypeError("Failed to construct 'Headers': The provided value is not of type '(sequence<sequence<ByteString>> or record<ByteString, ByteString>)");
        }
        result = result.length > 0 ? result.map(([name, value]) => {
          validateHeaderName(name);
          validateHeaderValue(name, String(value));
          return [String(name).toLowerCase(), String(value)];
        }) : void 0;
        super(result);
        return new Proxy(this, {
          get(target, p, receiver) {
            switch (p) {
              case "append":
              case "set":
                return (name, value) => {
                  validateHeaderName(name);
                  validateHeaderValue(name, String(value));
                  return URLSearchParams.prototype[p].call(receiver, String(name).toLowerCase(), String(value));
                };
              case "delete":
              case "has":
              case "getAll":
                return (name) => {
                  validateHeaderName(name);
                  return URLSearchParams.prototype[p].call(receiver, String(name).toLowerCase());
                };
              case "keys":
                return () => {
                  target.sort();
                  return new Set(URLSearchParams.prototype.keys.call(target)).keys();
                };
              default:
                return Reflect.get(target, p, receiver);
            }
          }
        });
      }
      get [Symbol.toStringTag]() {
        return this.constructor.name;
      }
      toString() {
        return Object.prototype.toString.call(this);
      }
      get(name) {
        const values = this.getAll(name);
        if (values.length === 0) {
          return null;
        }
        let value = values.join(", ");
        if (/^content-encoding$/i.test(name)) {
          value = value.toLowerCase();
        }
        return value;
      }
      forEach(callback) {
        for (const name of this.keys()) {
          callback(this.get(name), name);
        }
      }
      *values() {
        for (const name of this.keys()) {
          yield this.get(name);
        }
      }
      *entries() {
        for (const name of this.keys()) {
          yield [name, this.get(name)];
        }
      }
      [Symbol.iterator]() {
        return this.entries();
      }
      raw() {
        return [...this.keys()].reduce((result, key) => {
          result[key] = this.getAll(key);
          return result;
        }, {});
      }
      [Symbol.for("nodejs.util.inspect.custom")]() {
        return [...this.keys()].reduce((result, key) => {
          const values = this.getAll(key);
          if (key === "host") {
            result[key] = values[0];
          } else {
            result[key] = values.length > 1 ? values : values[0];
          }
          return result;
        }, {});
      }
    };
    Object.defineProperties(Headers.prototype, ["get", "entries", "forEach", "values"].reduce((result, property) => {
      result[property] = { enumerable: true };
      return result;
    }, {}));
    redirectStatus = new Set([301, 302, 303, 307, 308]);
    isRedirect = (code) => {
      return redirectStatus.has(code);
    };
    INTERNALS$1 = Symbol("Response internals");
    Response = class extends Body {
      constructor(body = null, options2 = {}) {
        super(body, options2);
        const status = options2.status || 200;
        const headers = new Headers(options2.headers);
        if (body !== null && !headers.has("Content-Type")) {
          const contentType = extractContentType(body);
          if (contentType) {
            headers.append("Content-Type", contentType);
          }
        }
        this[INTERNALS$1] = {
          url: options2.url,
          status,
          statusText: options2.statusText || "",
          headers,
          counter: options2.counter,
          highWaterMark: options2.highWaterMark
        };
      }
      get url() {
        return this[INTERNALS$1].url || "";
      }
      get status() {
        return this[INTERNALS$1].status;
      }
      get ok() {
        return this[INTERNALS$1].status >= 200 && this[INTERNALS$1].status < 300;
      }
      get redirected() {
        return this[INTERNALS$1].counter > 0;
      }
      get statusText() {
        return this[INTERNALS$1].statusText;
      }
      get headers() {
        return this[INTERNALS$1].headers;
      }
      get highWaterMark() {
        return this[INTERNALS$1].highWaterMark;
      }
      clone() {
        return new Response(clone(this, this.highWaterMark), {
          url: this.url,
          status: this.status,
          statusText: this.statusText,
          headers: this.headers,
          ok: this.ok,
          redirected: this.redirected,
          size: this.size
        });
      }
      static redirect(url, status = 302) {
        if (!isRedirect(status)) {
          throw new RangeError('Failed to execute "redirect" on "response": Invalid status code');
        }
        return new Response(null, {
          headers: {
            location: new URL(url).toString()
          },
          status
        });
      }
      get [Symbol.toStringTag]() {
        return "Response";
      }
    };
    Object.defineProperties(Response.prototype, {
      url: { enumerable: true },
      status: { enumerable: true },
      ok: { enumerable: true },
      redirected: { enumerable: true },
      statusText: { enumerable: true },
      headers: { enumerable: true },
      clone: { enumerable: true }
    });
    getSearch = (parsedURL) => {
      if (parsedURL.search) {
        return parsedURL.search;
      }
      const lastOffset = parsedURL.href.length - 1;
      const hash2 = parsedURL.hash || (parsedURL.href[lastOffset] === "#" ? "#" : "");
      return parsedURL.href[lastOffset - hash2.length] === "?" ? "?" : "";
    };
    INTERNALS = Symbol("Request internals");
    isRequest = (object) => {
      return typeof object === "object" && typeof object[INTERNALS] === "object";
    };
    Request = class extends Body {
      constructor(input, init2 = {}) {
        let parsedURL;
        if (isRequest(input)) {
          parsedURL = new URL(input.url);
        } else {
          parsedURL = new URL(input);
          input = {};
        }
        let method = init2.method || input.method || "GET";
        method = method.toUpperCase();
        if ((init2.body != null || isRequest(input)) && input.body !== null && (method === "GET" || method === "HEAD")) {
          throw new TypeError("Request with GET/HEAD method cannot have body");
        }
        const inputBody = init2.body ? init2.body : isRequest(input) && input.body !== null ? clone(input) : null;
        super(inputBody, {
          size: init2.size || input.size || 0
        });
        const headers = new Headers(init2.headers || input.headers || {});
        if (inputBody !== null && !headers.has("Content-Type")) {
          const contentType = extractContentType(inputBody, this);
          if (contentType) {
            headers.append("Content-Type", contentType);
          }
        }
        let signal = isRequest(input) ? input.signal : null;
        if ("signal" in init2) {
          signal = init2.signal;
        }
        if (signal !== null && !isAbortSignal(signal)) {
          throw new TypeError("Expected signal to be an instanceof AbortSignal");
        }
        this[INTERNALS] = {
          method,
          redirect: init2.redirect || input.redirect || "follow",
          headers,
          parsedURL,
          signal
        };
        this.follow = init2.follow === void 0 ? input.follow === void 0 ? 20 : input.follow : init2.follow;
        this.compress = init2.compress === void 0 ? input.compress === void 0 ? true : input.compress : init2.compress;
        this.counter = init2.counter || input.counter || 0;
        this.agent = init2.agent || input.agent;
        this.highWaterMark = init2.highWaterMark || input.highWaterMark || 16384;
        this.insecureHTTPParser = init2.insecureHTTPParser || input.insecureHTTPParser || false;
      }
      get method() {
        return this[INTERNALS].method;
      }
      get url() {
        return (0, import_url.format)(this[INTERNALS].parsedURL);
      }
      get headers() {
        return this[INTERNALS].headers;
      }
      get redirect() {
        return this[INTERNALS].redirect;
      }
      get signal() {
        return this[INTERNALS].signal;
      }
      clone() {
        return new Request(this);
      }
      get [Symbol.toStringTag]() {
        return "Request";
      }
    };
    Object.defineProperties(Request.prototype, {
      method: { enumerable: true },
      url: { enumerable: true },
      headers: { enumerable: true },
      redirect: { enumerable: true },
      clone: { enumerable: true },
      signal: { enumerable: true }
    });
    getNodeRequestOptions = (request) => {
      const { parsedURL } = request[INTERNALS];
      const headers = new Headers(request[INTERNALS].headers);
      if (!headers.has("Accept")) {
        headers.set("Accept", "*/*");
      }
      let contentLengthValue = null;
      if (request.body === null && /^(post|put)$/i.test(request.method)) {
        contentLengthValue = "0";
      }
      if (request.body !== null) {
        const totalBytes = getTotalBytes(request);
        if (typeof totalBytes === "number" && !Number.isNaN(totalBytes)) {
          contentLengthValue = String(totalBytes);
        }
      }
      if (contentLengthValue) {
        headers.set("Content-Length", contentLengthValue);
      }
      if (!headers.has("User-Agent")) {
        headers.set("User-Agent", "node-fetch");
      }
      if (request.compress && !headers.has("Accept-Encoding")) {
        headers.set("Accept-Encoding", "gzip,deflate,br");
      }
      let { agent } = request;
      if (typeof agent === "function") {
        agent = agent(parsedURL);
      }
      if (!headers.has("Connection") && !agent) {
        headers.set("Connection", "close");
      }
      const search = getSearch(parsedURL);
      const requestOptions = {
        path: parsedURL.pathname + search,
        pathname: parsedURL.pathname,
        hostname: parsedURL.hostname,
        protocol: parsedURL.protocol,
        port: parsedURL.port,
        hash: parsedURL.hash,
        search: parsedURL.search,
        query: parsedURL.query,
        href: parsedURL.href,
        method: request.method,
        headers: headers[Symbol.for("nodejs.util.inspect.custom")](),
        insecureHTTPParser: request.insecureHTTPParser,
        agent
      };
      return requestOptions;
    };
    AbortError = class extends FetchBaseError {
      constructor(message, type = "aborted") {
        super(message, type);
      }
    };
    supportedSchemas = new Set(["data:", "http:", "https:"]);
    Object.defineProperties(globalThis, {
      fetch: {
        enumerable: true,
        value: fetch
      },
      Response: {
        enumerable: true,
        value: Response
      },
      Request: {
        enumerable: true,
        value: Request
      },
      Headers: {
        enumerable: true,
        value: Headers
      }
    });
  }
});

// node_modules/@sveltejs/adapter-netlify/files/shims.js
var init_shims = __esm({
  "node_modules/@sveltejs/adapter-netlify/files/shims.js"() {
    init_install_fetch();
  }
});

// node_modules/cookie/index.js
var require_cookie = __commonJS({
  "node_modules/cookie/index.js"(exports) {
    init_shims();
    "use strict";
    exports.parse = parse;
    exports.serialize = serialize;
    var decode = decodeURIComponent;
    var encode = encodeURIComponent;
    var pairSplitRegExp = /; */;
    var fieldContentRegExp = /^[\u0009\u0020-\u007e\u0080-\u00ff]+$/;
    function parse(str, options2) {
      if (typeof str !== "string") {
        throw new TypeError("argument str must be a string");
      }
      var obj = {};
      var opt = options2 || {};
      var pairs = str.split(pairSplitRegExp);
      var dec = opt.decode || decode;
      for (var i = 0; i < pairs.length; i++) {
        var pair = pairs[i];
        var eq_idx = pair.indexOf("=");
        if (eq_idx < 0) {
          continue;
        }
        var key = pair.substr(0, eq_idx).trim();
        var val = pair.substr(++eq_idx, pair.length).trim();
        if (val[0] == '"') {
          val = val.slice(1, -1);
        }
        if (obj[key] == void 0) {
          obj[key] = tryDecode(val, dec);
        }
      }
      return obj;
    }
    function serialize(name, val, options2) {
      var opt = options2 || {};
      var enc = opt.encode || encode;
      if (typeof enc !== "function") {
        throw new TypeError("option encode is invalid");
      }
      if (!fieldContentRegExp.test(name)) {
        throw new TypeError("argument name is invalid");
      }
      var value = enc(val);
      if (value && !fieldContentRegExp.test(value)) {
        throw new TypeError("argument val is invalid");
      }
      var str = name + "=" + value;
      if (opt.maxAge != null) {
        var maxAge = opt.maxAge - 0;
        if (isNaN(maxAge) || !isFinite(maxAge)) {
          throw new TypeError("option maxAge is invalid");
        }
        str += "; Max-Age=" + Math.floor(maxAge);
      }
      if (opt.domain) {
        if (!fieldContentRegExp.test(opt.domain)) {
          throw new TypeError("option domain is invalid");
        }
        str += "; Domain=" + opt.domain;
      }
      if (opt.path) {
        if (!fieldContentRegExp.test(opt.path)) {
          throw new TypeError("option path is invalid");
        }
        str += "; Path=" + opt.path;
      }
      if (opt.expires) {
        if (typeof opt.expires.toUTCString !== "function") {
          throw new TypeError("option expires is invalid");
        }
        str += "; Expires=" + opt.expires.toUTCString();
      }
      if (opt.httpOnly) {
        str += "; HttpOnly";
      }
      if (opt.secure) {
        str += "; Secure";
      }
      if (opt.sameSite) {
        var sameSite = typeof opt.sameSite === "string" ? opt.sameSite.toLowerCase() : opt.sameSite;
        switch (sameSite) {
          case true:
            str += "; SameSite=Strict";
            break;
          case "lax":
            str += "; SameSite=Lax";
            break;
          case "strict":
            str += "; SameSite=Strict";
            break;
          case "none":
            str += "; SameSite=None";
            break;
          default:
            throw new TypeError("option sameSite is invalid");
        }
      }
      return str;
    }
    function tryDecode(str, decode2) {
      try {
        return decode2(str);
      } catch (e) {
        return str;
      }
    }
  }
});

// node_modules/axios/lib/helpers/bind.js
var require_bind = __commonJS({
  "node_modules/axios/lib/helpers/bind.js"(exports, module2) {
    init_shims();
    "use strict";
    module2.exports = function bind(fn, thisArg) {
      return function wrap() {
        var args = new Array(arguments.length);
        for (var i = 0; i < args.length; i++) {
          args[i] = arguments[i];
        }
        return fn.apply(thisArg, args);
      };
    };
  }
});

// node_modules/axios/lib/utils.js
var require_utils = __commonJS({
  "node_modules/axios/lib/utils.js"(exports, module2) {
    init_shims();
    "use strict";
    var bind = require_bind();
    var toString = Object.prototype.toString;
    function isArray(val) {
      return toString.call(val) === "[object Array]";
    }
    function isUndefined(val) {
      return typeof val === "undefined";
    }
    function isBuffer(val) {
      return val !== null && !isUndefined(val) && val.constructor !== null && !isUndefined(val.constructor) && typeof val.constructor.isBuffer === "function" && val.constructor.isBuffer(val);
    }
    function isArrayBuffer(val) {
      return toString.call(val) === "[object ArrayBuffer]";
    }
    function isFormData2(val) {
      return typeof FormData !== "undefined" && val instanceof FormData;
    }
    function isArrayBufferView(val) {
      var result;
      if (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView) {
        result = ArrayBuffer.isView(val);
      } else {
        result = val && val.buffer && val.buffer instanceof ArrayBuffer;
      }
      return result;
    }
    function isString(val) {
      return typeof val === "string";
    }
    function isNumber(val) {
      return typeof val === "number";
    }
    function isObject(val) {
      return val !== null && typeof val === "object";
    }
    function isPlainObject(val) {
      if (toString.call(val) !== "[object Object]") {
        return false;
      }
      var prototype = Object.getPrototypeOf(val);
      return prototype === null || prototype === Object.prototype;
    }
    function isDate(val) {
      return toString.call(val) === "[object Date]";
    }
    function isFile(val) {
      return toString.call(val) === "[object File]";
    }
    function isBlob2(val) {
      return toString.call(val) === "[object Blob]";
    }
    function isFunction(val) {
      return toString.call(val) === "[object Function]";
    }
    function isStream(val) {
      return isObject(val) && isFunction(val.pipe);
    }
    function isURLSearchParams(val) {
      return typeof URLSearchParams !== "undefined" && val instanceof URLSearchParams;
    }
    function trim(str) {
      return str.replace(/^\s*/, "").replace(/\s*$/, "");
    }
    function isStandardBrowserEnv() {
      if (typeof navigator !== "undefined" && (navigator.product === "ReactNative" || navigator.product === "NativeScript" || navigator.product === "NS")) {
        return false;
      }
      return typeof window !== "undefined" && typeof document !== "undefined";
    }
    function forEach(obj, fn) {
      if (obj === null || typeof obj === "undefined") {
        return;
      }
      if (typeof obj !== "object") {
        obj = [obj];
      }
      if (isArray(obj)) {
        for (var i = 0, l = obj.length; i < l; i++) {
          fn.call(null, obj[i], i, obj);
        }
      } else {
        for (var key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            fn.call(null, obj[key], key, obj);
          }
        }
      }
    }
    function merge() {
      var result = {};
      function assignValue(val, key) {
        if (isPlainObject(result[key]) && isPlainObject(val)) {
          result[key] = merge(result[key], val);
        } else if (isPlainObject(val)) {
          result[key] = merge({}, val);
        } else if (isArray(val)) {
          result[key] = val.slice();
        } else {
          result[key] = val;
        }
      }
      for (var i = 0, l = arguments.length; i < l; i++) {
        forEach(arguments[i], assignValue);
      }
      return result;
    }
    function extend(a, b, thisArg) {
      forEach(b, function assignValue(val, key) {
        if (thisArg && typeof val === "function") {
          a[key] = bind(val, thisArg);
        } else {
          a[key] = val;
        }
      });
      return a;
    }
    function stripBOM(content) {
      if (content.charCodeAt(0) === 65279) {
        content = content.slice(1);
      }
      return content;
    }
    module2.exports = {
      isArray,
      isArrayBuffer,
      isBuffer,
      isFormData: isFormData2,
      isArrayBufferView,
      isString,
      isNumber,
      isObject,
      isPlainObject,
      isUndefined,
      isDate,
      isFile,
      isBlob: isBlob2,
      isFunction,
      isStream,
      isURLSearchParams,
      isStandardBrowserEnv,
      forEach,
      merge,
      extend,
      trim,
      stripBOM
    };
  }
});

// node_modules/axios/lib/helpers/buildURL.js
var require_buildURL = __commonJS({
  "node_modules/axios/lib/helpers/buildURL.js"(exports, module2) {
    init_shims();
    "use strict";
    var utils = require_utils();
    function encode(val) {
      return encodeURIComponent(val).replace(/%3A/gi, ":").replace(/%24/g, "$").replace(/%2C/gi, ",").replace(/%20/g, "+").replace(/%5B/gi, "[").replace(/%5D/gi, "]");
    }
    module2.exports = function buildURL(url, params, paramsSerializer) {
      if (!params) {
        return url;
      }
      var serializedParams;
      if (paramsSerializer) {
        serializedParams = paramsSerializer(params);
      } else if (utils.isURLSearchParams(params)) {
        serializedParams = params.toString();
      } else {
        var parts = [];
        utils.forEach(params, function serialize(val, key) {
          if (val === null || typeof val === "undefined") {
            return;
          }
          if (utils.isArray(val)) {
            key = key + "[]";
          } else {
            val = [val];
          }
          utils.forEach(val, function parseValue(v) {
            if (utils.isDate(v)) {
              v = v.toISOString();
            } else if (utils.isObject(v)) {
              v = JSON.stringify(v);
            }
            parts.push(encode(key) + "=" + encode(v));
          });
        });
        serializedParams = parts.join("&");
      }
      if (serializedParams) {
        var hashmarkIndex = url.indexOf("#");
        if (hashmarkIndex !== -1) {
          url = url.slice(0, hashmarkIndex);
        }
        url += (url.indexOf("?") === -1 ? "?" : "&") + serializedParams;
      }
      return url;
    };
  }
});

// node_modules/axios/lib/core/InterceptorManager.js
var require_InterceptorManager = __commonJS({
  "node_modules/axios/lib/core/InterceptorManager.js"(exports, module2) {
    init_shims();
    "use strict";
    var utils = require_utils();
    function InterceptorManager() {
      this.handlers = [];
    }
    InterceptorManager.prototype.use = function use(fulfilled, rejected) {
      this.handlers.push({
        fulfilled,
        rejected
      });
      return this.handlers.length - 1;
    };
    InterceptorManager.prototype.eject = function eject(id) {
      if (this.handlers[id]) {
        this.handlers[id] = null;
      }
    };
    InterceptorManager.prototype.forEach = function forEach(fn) {
      utils.forEach(this.handlers, function forEachHandler(h) {
        if (h !== null) {
          fn(h);
        }
      });
    };
    module2.exports = InterceptorManager;
  }
});

// node_modules/axios/lib/core/transformData.js
var require_transformData = __commonJS({
  "node_modules/axios/lib/core/transformData.js"(exports, module2) {
    init_shims();
    "use strict";
    var utils = require_utils();
    module2.exports = function transformData(data, headers, fns) {
      utils.forEach(fns, function transform(fn) {
        data = fn(data, headers);
      });
      return data;
    };
  }
});

// node_modules/axios/lib/cancel/isCancel.js
var require_isCancel = __commonJS({
  "node_modules/axios/lib/cancel/isCancel.js"(exports, module2) {
    init_shims();
    "use strict";
    module2.exports = function isCancel(value) {
      return !!(value && value.__CANCEL__);
    };
  }
});

// node_modules/axios/lib/helpers/normalizeHeaderName.js
var require_normalizeHeaderName = __commonJS({
  "node_modules/axios/lib/helpers/normalizeHeaderName.js"(exports, module2) {
    init_shims();
    "use strict";
    var utils = require_utils();
    module2.exports = function normalizeHeaderName(headers, normalizedName) {
      utils.forEach(headers, function processHeader(value, name) {
        if (name !== normalizedName && name.toUpperCase() === normalizedName.toUpperCase()) {
          headers[normalizedName] = value;
          delete headers[name];
        }
      });
    };
  }
});

// node_modules/axios/lib/core/enhanceError.js
var require_enhanceError = __commonJS({
  "node_modules/axios/lib/core/enhanceError.js"(exports, module2) {
    init_shims();
    "use strict";
    module2.exports = function enhanceError(error2, config, code, request, response) {
      error2.config = config;
      if (code) {
        error2.code = code;
      }
      error2.request = request;
      error2.response = response;
      error2.isAxiosError = true;
      error2.toJSON = function toJSON() {
        return {
          message: this.message,
          name: this.name,
          description: this.description,
          number: this.number,
          fileName: this.fileName,
          lineNumber: this.lineNumber,
          columnNumber: this.columnNumber,
          stack: this.stack,
          config: this.config,
          code: this.code
        };
      };
      return error2;
    };
  }
});

// node_modules/axios/lib/core/createError.js
var require_createError = __commonJS({
  "node_modules/axios/lib/core/createError.js"(exports, module2) {
    init_shims();
    "use strict";
    var enhanceError = require_enhanceError();
    module2.exports = function createError(message, config, code, request, response) {
      var error2 = new Error(message);
      return enhanceError(error2, config, code, request, response);
    };
  }
});

// node_modules/axios/lib/core/settle.js
var require_settle = __commonJS({
  "node_modules/axios/lib/core/settle.js"(exports, module2) {
    init_shims();
    "use strict";
    var createError = require_createError();
    module2.exports = function settle(resolve2, reject, response) {
      var validateStatus = response.config.validateStatus;
      if (!response.status || !validateStatus || validateStatus(response.status)) {
        resolve2(response);
      } else {
        reject(createError("Request failed with status code " + response.status, response.config, null, response.request, response));
      }
    };
  }
});

// node_modules/axios/lib/helpers/cookies.js
var require_cookies = __commonJS({
  "node_modules/axios/lib/helpers/cookies.js"(exports, module2) {
    init_shims();
    "use strict";
    var utils = require_utils();
    module2.exports = utils.isStandardBrowserEnv() ? function standardBrowserEnv() {
      return {
        write: function write(name, value, expires, path, domain, secure) {
          var cookie2 = [];
          cookie2.push(name + "=" + encodeURIComponent(value));
          if (utils.isNumber(expires)) {
            cookie2.push("expires=" + new Date(expires).toGMTString());
          }
          if (utils.isString(path)) {
            cookie2.push("path=" + path);
          }
          if (utils.isString(domain)) {
            cookie2.push("domain=" + domain);
          }
          if (secure === true) {
            cookie2.push("secure");
          }
          document.cookie = cookie2.join("; ");
        },
        read: function read2(name) {
          var match = document.cookie.match(new RegExp("(^|;\\s*)(" + name + ")=([^;]*)"));
          return match ? decodeURIComponent(match[3]) : null;
        },
        remove: function remove(name) {
          this.write(name, "", Date.now() - 864e5);
        }
      };
    }() : function nonStandardBrowserEnv() {
      return {
        write: function write() {
        },
        read: function read2() {
          return null;
        },
        remove: function remove() {
        }
      };
    }();
  }
});

// node_modules/axios/lib/helpers/isAbsoluteURL.js
var require_isAbsoluteURL = __commonJS({
  "node_modules/axios/lib/helpers/isAbsoluteURL.js"(exports, module2) {
    init_shims();
    "use strict";
    module2.exports = function isAbsoluteURL(url) {
      return /^([a-z][a-z\d\+\-\.]*:)?\/\//i.test(url);
    };
  }
});

// node_modules/axios/lib/helpers/combineURLs.js
var require_combineURLs = __commonJS({
  "node_modules/axios/lib/helpers/combineURLs.js"(exports, module2) {
    init_shims();
    "use strict";
    module2.exports = function combineURLs(baseURL, relativeURL) {
      return relativeURL ? baseURL.replace(/\/+$/, "") + "/" + relativeURL.replace(/^\/+/, "") : baseURL;
    };
  }
});

// node_modules/axios/lib/core/buildFullPath.js
var require_buildFullPath = __commonJS({
  "node_modules/axios/lib/core/buildFullPath.js"(exports, module2) {
    init_shims();
    "use strict";
    var isAbsoluteURL = require_isAbsoluteURL();
    var combineURLs = require_combineURLs();
    module2.exports = function buildFullPath(baseURL, requestedURL) {
      if (baseURL && !isAbsoluteURL(requestedURL)) {
        return combineURLs(baseURL, requestedURL);
      }
      return requestedURL;
    };
  }
});

// node_modules/axios/lib/helpers/parseHeaders.js
var require_parseHeaders = __commonJS({
  "node_modules/axios/lib/helpers/parseHeaders.js"(exports, module2) {
    init_shims();
    "use strict";
    var utils = require_utils();
    var ignoreDuplicateOf = [
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
    ];
    module2.exports = function parseHeaders(headers) {
      var parsed = {};
      var key;
      var val;
      var i;
      if (!headers) {
        return parsed;
      }
      utils.forEach(headers.split("\n"), function parser(line) {
        i = line.indexOf(":");
        key = utils.trim(line.substr(0, i)).toLowerCase();
        val = utils.trim(line.substr(i + 1));
        if (key) {
          if (parsed[key] && ignoreDuplicateOf.indexOf(key) >= 0) {
            return;
          }
          if (key === "set-cookie") {
            parsed[key] = (parsed[key] ? parsed[key] : []).concat([val]);
          } else {
            parsed[key] = parsed[key] ? parsed[key] + ", " + val : val;
          }
        }
      });
      return parsed;
    };
  }
});

// node_modules/axios/lib/helpers/isURLSameOrigin.js
var require_isURLSameOrigin = __commonJS({
  "node_modules/axios/lib/helpers/isURLSameOrigin.js"(exports, module2) {
    init_shims();
    "use strict";
    var utils = require_utils();
    module2.exports = utils.isStandardBrowserEnv() ? function standardBrowserEnv() {
      var msie = /(msie|trident)/i.test(navigator.userAgent);
      var urlParsingNode = document.createElement("a");
      var originURL;
      function resolveURL(url) {
        var href = url;
        if (msie) {
          urlParsingNode.setAttribute("href", href);
          href = urlParsingNode.href;
        }
        urlParsingNode.setAttribute("href", href);
        return {
          href: urlParsingNode.href,
          protocol: urlParsingNode.protocol ? urlParsingNode.protocol.replace(/:$/, "") : "",
          host: urlParsingNode.host,
          search: urlParsingNode.search ? urlParsingNode.search.replace(/^\?/, "") : "",
          hash: urlParsingNode.hash ? urlParsingNode.hash.replace(/^#/, "") : "",
          hostname: urlParsingNode.hostname,
          port: urlParsingNode.port,
          pathname: urlParsingNode.pathname.charAt(0) === "/" ? urlParsingNode.pathname : "/" + urlParsingNode.pathname
        };
      }
      originURL = resolveURL(window.location.href);
      return function isURLSameOrigin(requestURL) {
        var parsed = utils.isString(requestURL) ? resolveURL(requestURL) : requestURL;
        return parsed.protocol === originURL.protocol && parsed.host === originURL.host;
      };
    }() : function nonStandardBrowserEnv() {
      return function isURLSameOrigin() {
        return true;
      };
    }();
  }
});

// node_modules/axios/lib/adapters/xhr.js
var require_xhr = __commonJS({
  "node_modules/axios/lib/adapters/xhr.js"(exports, module2) {
    init_shims();
    "use strict";
    var utils = require_utils();
    var settle = require_settle();
    var cookies = require_cookies();
    var buildURL = require_buildURL();
    var buildFullPath = require_buildFullPath();
    var parseHeaders = require_parseHeaders();
    var isURLSameOrigin = require_isURLSameOrigin();
    var createError = require_createError();
    module2.exports = function xhrAdapter(config) {
      return new Promise(function dispatchXhrRequest(resolve2, reject) {
        var requestData = config.data;
        var requestHeaders = config.headers;
        if (utils.isFormData(requestData)) {
          delete requestHeaders["Content-Type"];
        }
        var request = new XMLHttpRequest();
        if (config.auth) {
          var username = config.auth.username || "";
          var password = config.auth.password ? unescape(encodeURIComponent(config.auth.password)) : "";
          requestHeaders.Authorization = "Basic " + btoa(username + ":" + password);
        }
        var fullPath = buildFullPath(config.baseURL, config.url);
        request.open(config.method.toUpperCase(), buildURL(fullPath, config.params, config.paramsSerializer), true);
        request.timeout = config.timeout;
        request.onreadystatechange = function handleLoad() {
          if (!request || request.readyState !== 4) {
            return;
          }
          if (request.status === 0 && !(request.responseURL && request.responseURL.indexOf("file:") === 0)) {
            return;
          }
          var responseHeaders = "getAllResponseHeaders" in request ? parseHeaders(request.getAllResponseHeaders()) : null;
          var responseData = !config.responseType || config.responseType === "text" ? request.responseText : request.response;
          var response = {
            data: responseData,
            status: request.status,
            statusText: request.statusText,
            headers: responseHeaders,
            config,
            request
          };
          settle(resolve2, reject, response);
          request = null;
        };
        request.onabort = function handleAbort() {
          if (!request) {
            return;
          }
          reject(createError("Request aborted", config, "ECONNABORTED", request));
          request = null;
        };
        request.onerror = function handleError() {
          reject(createError("Network Error", config, null, request));
          request = null;
        };
        request.ontimeout = function handleTimeout() {
          var timeoutErrorMessage = "timeout of " + config.timeout + "ms exceeded";
          if (config.timeoutErrorMessage) {
            timeoutErrorMessage = config.timeoutErrorMessage;
          }
          reject(createError(timeoutErrorMessage, config, "ECONNABORTED", request));
          request = null;
        };
        if (utils.isStandardBrowserEnv()) {
          var xsrfValue = (config.withCredentials || isURLSameOrigin(fullPath)) && config.xsrfCookieName ? cookies.read(config.xsrfCookieName) : void 0;
          if (xsrfValue) {
            requestHeaders[config.xsrfHeaderName] = xsrfValue;
          }
        }
        if ("setRequestHeader" in request) {
          utils.forEach(requestHeaders, function setRequestHeader(val, key) {
            if (typeof requestData === "undefined" && key.toLowerCase() === "content-type") {
              delete requestHeaders[key];
            } else {
              request.setRequestHeader(key, val);
            }
          });
        }
        if (!utils.isUndefined(config.withCredentials)) {
          request.withCredentials = !!config.withCredentials;
        }
        if (config.responseType) {
          try {
            request.responseType = config.responseType;
          } catch (e) {
            if (config.responseType !== "json") {
              throw e;
            }
          }
        }
        if (typeof config.onDownloadProgress === "function") {
          request.addEventListener("progress", config.onDownloadProgress);
        }
        if (typeof config.onUploadProgress === "function" && request.upload) {
          request.upload.addEventListener("progress", config.onUploadProgress);
        }
        if (config.cancelToken) {
          config.cancelToken.promise.then(function onCanceled(cancel) {
            if (!request) {
              return;
            }
            request.abort();
            reject(cancel);
            request = null;
          });
        }
        if (!requestData) {
          requestData = null;
        }
        request.send(requestData);
      });
    };
  }
});

// node_modules/ms/index.js
var require_ms = __commonJS({
  "node_modules/ms/index.js"(exports, module2) {
    init_shims();
    var s2 = 1e3;
    var m = s2 * 60;
    var h = m * 60;
    var d = h * 24;
    var w = d * 7;
    var y = d * 365.25;
    module2.exports = function(val, options2) {
      options2 = options2 || {};
      var type = typeof val;
      if (type === "string" && val.length > 0) {
        return parse(val);
      } else if (type === "number" && isFinite(val)) {
        return options2.long ? fmtLong(val) : fmtShort(val);
      }
      throw new Error("val is not a non-empty string or a valid number. val=" + JSON.stringify(val));
    };
    function parse(str) {
      str = String(str);
      if (str.length > 100) {
        return;
      }
      var match = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(str);
      if (!match) {
        return;
      }
      var n = parseFloat(match[1]);
      var type = (match[2] || "ms").toLowerCase();
      switch (type) {
        case "years":
        case "year":
        case "yrs":
        case "yr":
        case "y":
          return n * y;
        case "weeks":
        case "week":
        case "w":
          return n * w;
        case "days":
        case "day":
        case "d":
          return n * d;
        case "hours":
        case "hour":
        case "hrs":
        case "hr":
        case "h":
          return n * h;
        case "minutes":
        case "minute":
        case "mins":
        case "min":
        case "m":
          return n * m;
        case "seconds":
        case "second":
        case "secs":
        case "sec":
        case "s":
          return n * s2;
        case "milliseconds":
        case "millisecond":
        case "msecs":
        case "msec":
        case "ms":
          return n;
        default:
          return void 0;
      }
    }
    function fmtShort(ms) {
      var msAbs = Math.abs(ms);
      if (msAbs >= d) {
        return Math.round(ms / d) + "d";
      }
      if (msAbs >= h) {
        return Math.round(ms / h) + "h";
      }
      if (msAbs >= m) {
        return Math.round(ms / m) + "m";
      }
      if (msAbs >= s2) {
        return Math.round(ms / s2) + "s";
      }
      return ms + "ms";
    }
    function fmtLong(ms) {
      var msAbs = Math.abs(ms);
      if (msAbs >= d) {
        return plural(ms, msAbs, d, "day");
      }
      if (msAbs >= h) {
        return plural(ms, msAbs, h, "hour");
      }
      if (msAbs >= m) {
        return plural(ms, msAbs, m, "minute");
      }
      if (msAbs >= s2) {
        return plural(ms, msAbs, s2, "second");
      }
      return ms + " ms";
    }
    function plural(ms, msAbs, n, name) {
      var isPlural = msAbs >= n * 1.5;
      return Math.round(ms / n) + " " + name + (isPlural ? "s" : "");
    }
  }
});

// node_modules/debug/src/common.js
var require_common = __commonJS({
  "node_modules/debug/src/common.js"(exports, module2) {
    init_shims();
    function setup(env) {
      createDebug.debug = createDebug;
      createDebug.default = createDebug;
      createDebug.coerce = coerce;
      createDebug.disable = disable;
      createDebug.enable = enable;
      createDebug.enabled = enabled;
      createDebug.humanize = require_ms();
      createDebug.destroy = destroy;
      Object.keys(env).forEach((key) => {
        createDebug[key] = env[key];
      });
      createDebug.names = [];
      createDebug.skips = [];
      createDebug.formatters = {};
      function selectColor(namespace) {
        let hash2 = 0;
        for (let i = 0; i < namespace.length; i++) {
          hash2 = (hash2 << 5) - hash2 + namespace.charCodeAt(i);
          hash2 |= 0;
        }
        return createDebug.colors[Math.abs(hash2) % createDebug.colors.length];
      }
      createDebug.selectColor = selectColor;
      function createDebug(namespace) {
        let prevTime;
        let enableOverride = null;
        let namespacesCache;
        let enabledCache;
        function debug(...args) {
          if (!debug.enabled) {
            return;
          }
          const self = debug;
          const curr = Number(new Date());
          const ms = curr - (prevTime || curr);
          self.diff = ms;
          self.prev = prevTime;
          self.curr = curr;
          prevTime = curr;
          args[0] = createDebug.coerce(args[0]);
          if (typeof args[0] !== "string") {
            args.unshift("%O");
          }
          let index2 = 0;
          args[0] = args[0].replace(/%([a-zA-Z%])/g, (match, format2) => {
            if (match === "%%") {
              return "%";
            }
            index2++;
            const formatter = createDebug.formatters[format2];
            if (typeof formatter === "function") {
              const val = args[index2];
              match = formatter.call(self, val);
              args.splice(index2, 1);
              index2--;
            }
            return match;
          });
          createDebug.formatArgs.call(self, args);
          const logFn = self.log || createDebug.log;
          logFn.apply(self, args);
        }
        debug.namespace = namespace;
        debug.useColors = createDebug.useColors();
        debug.color = createDebug.selectColor(namespace);
        debug.extend = extend;
        debug.destroy = createDebug.destroy;
        Object.defineProperty(debug, "enabled", {
          enumerable: true,
          configurable: false,
          get: () => {
            if (enableOverride !== null) {
              return enableOverride;
            }
            if (namespacesCache !== createDebug.namespaces) {
              namespacesCache = createDebug.namespaces;
              enabledCache = createDebug.enabled(namespace);
            }
            return enabledCache;
          },
          set: (v) => {
            enableOverride = v;
          }
        });
        if (typeof createDebug.init === "function") {
          createDebug.init(debug);
        }
        return debug;
      }
      function extend(namespace, delimiter) {
        const newDebug = createDebug(this.namespace + (typeof delimiter === "undefined" ? ":" : delimiter) + namespace);
        newDebug.log = this.log;
        return newDebug;
      }
      function enable(namespaces) {
        createDebug.save(namespaces);
        createDebug.namespaces = namespaces;
        createDebug.names = [];
        createDebug.skips = [];
        let i;
        const split = (typeof namespaces === "string" ? namespaces : "").split(/[\s,]+/);
        const len = split.length;
        for (i = 0; i < len; i++) {
          if (!split[i]) {
            continue;
          }
          namespaces = split[i].replace(/\*/g, ".*?");
          if (namespaces[0] === "-") {
            createDebug.skips.push(new RegExp("^" + namespaces.substr(1) + "$"));
          } else {
            createDebug.names.push(new RegExp("^" + namespaces + "$"));
          }
        }
      }
      function disable() {
        const namespaces = [
          ...createDebug.names.map(toNamespace),
          ...createDebug.skips.map(toNamespace).map((namespace) => "-" + namespace)
        ].join(",");
        createDebug.enable("");
        return namespaces;
      }
      function enabled(name) {
        if (name[name.length - 1] === "*") {
          return true;
        }
        let i;
        let len;
        for (i = 0, len = createDebug.skips.length; i < len; i++) {
          if (createDebug.skips[i].test(name)) {
            return false;
          }
        }
        for (i = 0, len = createDebug.names.length; i < len; i++) {
          if (createDebug.names[i].test(name)) {
            return true;
          }
        }
        return false;
      }
      function toNamespace(regexp) {
        return regexp.toString().substring(2, regexp.toString().length - 2).replace(/\.\*\?$/, "*");
      }
      function coerce(val) {
        if (val instanceof Error) {
          return val.stack || val.message;
        }
        return val;
      }
      function destroy() {
        console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
      }
      createDebug.enable(createDebug.load());
      return createDebug;
    }
    module2.exports = setup;
  }
});

// node_modules/debug/src/browser.js
var require_browser = __commonJS({
  "node_modules/debug/src/browser.js"(exports, module2) {
    init_shims();
    exports.formatArgs = formatArgs;
    exports.save = save;
    exports.load = load2;
    exports.useColors = useColors;
    exports.storage = localstorage();
    exports.destroy = (() => {
      let warned = false;
      return () => {
        if (!warned) {
          warned = true;
          console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
        }
      };
    })();
    exports.colors = [
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
    function useColors() {
      if (typeof window !== "undefined" && window.process && (window.process.type === "renderer" || window.process.__nwjs)) {
        return true;
      }
      if (typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) {
        return false;
      }
      return typeof document !== "undefined" && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || typeof window !== "undefined" && window.console && (window.console.firebug || window.console.exception && window.console.table) || typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31 || typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/);
    }
    function formatArgs(args) {
      args[0] = (this.useColors ? "%c" : "") + this.namespace + (this.useColors ? " %c" : " ") + args[0] + (this.useColors ? "%c " : " ") + "+" + module2.exports.humanize(this.diff);
      if (!this.useColors) {
        return;
      }
      const c = "color: " + this.color;
      args.splice(1, 0, c, "color: inherit");
      let index2 = 0;
      let lastC = 0;
      args[0].replace(/%[a-zA-Z%]/g, (match) => {
        if (match === "%%") {
          return;
        }
        index2++;
        if (match === "%c") {
          lastC = index2;
        }
      });
      args.splice(lastC, 0, c);
    }
    exports.log = console.debug || console.log || (() => {
    });
    function save(namespaces) {
      try {
        if (namespaces) {
          exports.storage.setItem("debug", namespaces);
        } else {
          exports.storage.removeItem("debug");
        }
      } catch (error2) {
      }
    }
    function load2() {
      let r;
      try {
        r = exports.storage.getItem("debug");
      } catch (error2) {
      }
      if (!r && typeof process !== "undefined" && "env" in process) {
        r = process.env.DEBUG;
      }
      return r;
    }
    function localstorage() {
      try {
        return localStorage;
      } catch (error2) {
      }
    }
    module2.exports = require_common()(exports);
    var { formatters } = module2.exports;
    formatters.j = function(v) {
      try {
        return JSON.stringify(v);
      } catch (error2) {
        return "[UnexpectedJSONParseError]: " + error2.message;
      }
    };
  }
});

// node_modules/has-flag/index.js
var require_has_flag = __commonJS({
  "node_modules/has-flag/index.js"(exports, module2) {
    init_shims();
    "use strict";
    module2.exports = (flag, argv = process.argv) => {
      const prefix = flag.startsWith("-") ? "" : flag.length === 1 ? "-" : "--";
      const position = argv.indexOf(prefix + flag);
      const terminatorPosition = argv.indexOf("--");
      return position !== -1 && (terminatorPosition === -1 || position < terminatorPosition);
    };
  }
});

// node_modules/supports-color/index.js
var require_supports_color = __commonJS({
  "node_modules/supports-color/index.js"(exports, module2) {
    init_shims();
    "use strict";
    var os = require("os");
    var tty = require("tty");
    var hasFlag = require_has_flag();
    var { env } = process;
    var forceColor;
    if (hasFlag("no-color") || hasFlag("no-colors") || hasFlag("color=false") || hasFlag("color=never")) {
      forceColor = 0;
    } else if (hasFlag("color") || hasFlag("colors") || hasFlag("color=true") || hasFlag("color=always")) {
      forceColor = 1;
    }
    if ("FORCE_COLOR" in env) {
      if (env.FORCE_COLOR === "true") {
        forceColor = 1;
      } else if (env.FORCE_COLOR === "false") {
        forceColor = 0;
      } else {
        forceColor = env.FORCE_COLOR.length === 0 ? 1 : Math.min(parseInt(env.FORCE_COLOR, 10), 3);
      }
    }
    function translateLevel(level) {
      if (level === 0) {
        return false;
      }
      return {
        level,
        hasBasic: true,
        has256: level >= 2,
        has16m: level >= 3
      };
    }
    function supportsColor(haveStream, streamIsTTY) {
      if (forceColor === 0) {
        return 0;
      }
      if (hasFlag("color=16m") || hasFlag("color=full") || hasFlag("color=truecolor")) {
        return 3;
      }
      if (hasFlag("color=256")) {
        return 2;
      }
      if (haveStream && !streamIsTTY && forceColor === void 0) {
        return 0;
      }
      const min = forceColor || 0;
      if (env.TERM === "dumb") {
        return min;
      }
      if (process.platform === "win32") {
        const osRelease = os.release().split(".");
        if (Number(osRelease[0]) >= 10 && Number(osRelease[2]) >= 10586) {
          return Number(osRelease[2]) >= 14931 ? 3 : 2;
        }
        return 1;
      }
      if ("CI" in env) {
        if (["TRAVIS", "CIRCLECI", "APPVEYOR", "GITLAB_CI", "GITHUB_ACTIONS", "BUILDKITE"].some((sign) => sign in env) || env.CI_NAME === "codeship") {
          return 1;
        }
        return min;
      }
      if ("TEAMCITY_VERSION" in env) {
        return /^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(env.TEAMCITY_VERSION) ? 1 : 0;
      }
      if (env.COLORTERM === "truecolor") {
        return 3;
      }
      if ("TERM_PROGRAM" in env) {
        const version = parseInt((env.TERM_PROGRAM_VERSION || "").split(".")[0], 10);
        switch (env.TERM_PROGRAM) {
          case "iTerm.app":
            return version >= 3 ? 3 : 2;
          case "Apple_Terminal":
            return 2;
        }
      }
      if (/-256(color)?$/i.test(env.TERM)) {
        return 2;
      }
      if (/^screen|^xterm|^vt100|^vt220|^rxvt|color|ansi|cygwin|linux/i.test(env.TERM)) {
        return 1;
      }
      if ("COLORTERM" in env) {
        return 1;
      }
      return min;
    }
    function getSupportLevel(stream) {
      const level = supportsColor(stream, stream && stream.isTTY);
      return translateLevel(level);
    }
    module2.exports = {
      supportsColor: getSupportLevel,
      stdout: translateLevel(supportsColor(true, tty.isatty(1))),
      stderr: translateLevel(supportsColor(true, tty.isatty(2)))
    };
  }
});

// node_modules/debug/src/node.js
var require_node = __commonJS({
  "node_modules/debug/src/node.js"(exports, module2) {
    init_shims();
    var tty = require("tty");
    var util = require("util");
    exports.init = init2;
    exports.log = log;
    exports.formatArgs = formatArgs;
    exports.save = save;
    exports.load = load2;
    exports.useColors = useColors;
    exports.destroy = util.deprecate(() => {
    }, "Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
    exports.colors = [6, 2, 3, 4, 5, 1];
    try {
      const supportsColor = require_supports_color();
      if (supportsColor && (supportsColor.stderr || supportsColor).level >= 2) {
        exports.colors = [
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
        ];
      }
    } catch (error2) {
    }
    exports.inspectOpts = Object.keys(process.env).filter((key) => {
      return /^debug_/i.test(key);
    }).reduce((obj, key) => {
      const prop = key.substring(6).toLowerCase().replace(/_([a-z])/g, (_, k) => {
        return k.toUpperCase();
      });
      let val = process.env[key];
      if (/^(yes|on|true|enabled)$/i.test(val)) {
        val = true;
      } else if (/^(no|off|false|disabled)$/i.test(val)) {
        val = false;
      } else if (val === "null") {
        val = null;
      } else {
        val = Number(val);
      }
      obj[prop] = val;
      return obj;
    }, {});
    function useColors() {
      return "colors" in exports.inspectOpts ? Boolean(exports.inspectOpts.colors) : tty.isatty(process.stderr.fd);
    }
    function formatArgs(args) {
      const { namespace: name, useColors: useColors2 } = this;
      if (useColors2) {
        const c = this.color;
        const colorCode = "[3" + (c < 8 ? c : "8;5;" + c);
        const prefix = `  ${colorCode};1m${name} [0m`;
        args[0] = prefix + args[0].split("\n").join("\n" + prefix);
        args.push(colorCode + "m+" + module2.exports.humanize(this.diff) + "[0m");
      } else {
        args[0] = getDate() + name + " " + args[0];
      }
    }
    function getDate() {
      if (exports.inspectOpts.hideDate) {
        return "";
      }
      return new Date().toISOString() + " ";
    }
    function log(...args) {
      return process.stderr.write(util.format(...args) + "\n");
    }
    function save(namespaces) {
      if (namespaces) {
        process.env.DEBUG = namespaces;
      } else {
        delete process.env.DEBUG;
      }
    }
    function load2() {
      return process.env.DEBUG;
    }
    function init2(debug) {
      debug.inspectOpts = {};
      const keys = Object.keys(exports.inspectOpts);
      for (let i = 0; i < keys.length; i++) {
        debug.inspectOpts[keys[i]] = exports.inspectOpts[keys[i]];
      }
    }
    module2.exports = require_common()(exports);
    var { formatters } = module2.exports;
    formatters.o = function(v) {
      this.inspectOpts.colors = this.useColors;
      return util.inspect(v, this.inspectOpts).split("\n").map((str) => str.trim()).join(" ");
    };
    formatters.O = function(v) {
      this.inspectOpts.colors = this.useColors;
      return util.inspect(v, this.inspectOpts);
    };
  }
});

// node_modules/debug/src/index.js
var require_src = __commonJS({
  "node_modules/debug/src/index.js"(exports, module2) {
    init_shims();
    if (typeof process === "undefined" || process.type === "renderer" || process.browser === true || process.__nwjs) {
      module2.exports = require_browser();
    } else {
      module2.exports = require_node();
    }
  }
});

// node_modules/follow-redirects/debug.js
var require_debug = __commonJS({
  "node_modules/follow-redirects/debug.js"(exports, module2) {
    init_shims();
    var debug;
    module2.exports = function() {
      if (!debug) {
        try {
          debug = require_src()("follow-redirects");
        } catch (error2) {
          debug = function() {
          };
        }
      }
      debug.apply(null, arguments);
    };
  }
});

// node_modules/follow-redirects/index.js
var require_follow_redirects = __commonJS({
  "node_modules/follow-redirects/index.js"(exports, module2) {
    init_shims();
    var url = require("url");
    var URL2 = url.URL;
    var http2 = require("http");
    var https2 = require("https");
    var Writable = require("stream").Writable;
    var assert = require("assert");
    var debug = require_debug();
    var events = ["abort", "aborted", "connect", "error", "socket", "timeout"];
    var eventHandlers = Object.create(null);
    events.forEach(function(event) {
      eventHandlers[event] = function(arg1, arg2, arg3) {
        this._redirectable.emit(event, arg1, arg2, arg3);
      };
    });
    var RedirectionError = createErrorType("ERR_FR_REDIRECTION_FAILURE", "");
    var TooManyRedirectsError = createErrorType("ERR_FR_TOO_MANY_REDIRECTS", "Maximum number of redirects exceeded");
    var MaxBodyLengthExceededError = createErrorType("ERR_FR_MAX_BODY_LENGTH_EXCEEDED", "Request body larger than maxBodyLength limit");
    var WriteAfterEndError = createErrorType("ERR_STREAM_WRITE_AFTER_END", "write after end");
    function RedirectableRequest(options2, responseCallback) {
      Writable.call(this);
      this._sanitizeOptions(options2);
      this._options = options2;
      this._ended = false;
      this._ending = false;
      this._redirectCount = 0;
      this._redirects = [];
      this._requestBodyLength = 0;
      this._requestBodyBuffers = [];
      if (responseCallback) {
        this.on("response", responseCallback);
      }
      var self = this;
      this._onNativeResponse = function(response) {
        self._processResponse(response);
      };
      this._performRequest();
    }
    RedirectableRequest.prototype = Object.create(Writable.prototype);
    RedirectableRequest.prototype.abort = function() {
      abortRequest(this._currentRequest);
      this.emit("abort");
    };
    RedirectableRequest.prototype.write = function(data, encoding, callback) {
      if (this._ending) {
        throw new WriteAfterEndError();
      }
      if (!(typeof data === "string" || typeof data === "object" && "length" in data)) {
        throw new TypeError("data should be a string, Buffer or Uint8Array");
      }
      if (typeof encoding === "function") {
        callback = encoding;
        encoding = null;
      }
      if (data.length === 0) {
        if (callback) {
          callback();
        }
        return;
      }
      if (this._requestBodyLength + data.length <= this._options.maxBodyLength) {
        this._requestBodyLength += data.length;
        this._requestBodyBuffers.push({ data, encoding });
        this._currentRequest.write(data, encoding, callback);
      } else {
        this.emit("error", new MaxBodyLengthExceededError());
        this.abort();
      }
    };
    RedirectableRequest.prototype.end = function(data, encoding, callback) {
      if (typeof data === "function") {
        callback = data;
        data = encoding = null;
      } else if (typeof encoding === "function") {
        callback = encoding;
        encoding = null;
      }
      if (!data) {
        this._ended = this._ending = true;
        this._currentRequest.end(null, null, callback);
      } else {
        var self = this;
        var currentRequest = this._currentRequest;
        this.write(data, encoding, function() {
          self._ended = true;
          currentRequest.end(null, null, callback);
        });
        this._ending = true;
      }
    };
    RedirectableRequest.prototype.setHeader = function(name, value) {
      this._options.headers[name] = value;
      this._currentRequest.setHeader(name, value);
    };
    RedirectableRequest.prototype.removeHeader = function(name) {
      delete this._options.headers[name];
      this._currentRequest.removeHeader(name);
    };
    RedirectableRequest.prototype.setTimeout = function(msecs, callback) {
      var self = this;
      if (callback) {
        this.on("timeout", callback);
      }
      function destroyOnTimeout(socket) {
        socket.setTimeout(msecs);
        socket.removeListener("timeout", socket.destroy);
        socket.addListener("timeout", socket.destroy);
      }
      function startTimer(socket) {
        if (self._timeout) {
          clearTimeout(self._timeout);
        }
        self._timeout = setTimeout(function() {
          self.emit("timeout");
          clearTimer();
        }, msecs);
        destroyOnTimeout(socket);
      }
      function clearTimer() {
        clearTimeout(this._timeout);
        if (callback) {
          self.removeListener("timeout", callback);
        }
        if (!this.socket) {
          self._currentRequest.removeListener("socket", startTimer);
        }
      }
      if (this.socket) {
        startTimer(this.socket);
      } else {
        this._currentRequest.once("socket", startTimer);
      }
      this.on("socket", destroyOnTimeout);
      this.once("response", clearTimer);
      this.once("error", clearTimer);
      return this;
    };
    [
      "flushHeaders",
      "getHeader",
      "setNoDelay",
      "setSocketKeepAlive"
    ].forEach(function(method) {
      RedirectableRequest.prototype[method] = function(a, b) {
        return this._currentRequest[method](a, b);
      };
    });
    ["aborted", "connection", "socket"].forEach(function(property) {
      Object.defineProperty(RedirectableRequest.prototype, property, {
        get: function() {
          return this._currentRequest[property];
        }
      });
    });
    RedirectableRequest.prototype._sanitizeOptions = function(options2) {
      if (!options2.headers) {
        options2.headers = {};
      }
      if (options2.host) {
        if (!options2.hostname) {
          options2.hostname = options2.host;
        }
        delete options2.host;
      }
      if (!options2.pathname && options2.path) {
        var searchPos = options2.path.indexOf("?");
        if (searchPos < 0) {
          options2.pathname = options2.path;
        } else {
          options2.pathname = options2.path.substring(0, searchPos);
          options2.search = options2.path.substring(searchPos);
        }
      }
    };
    RedirectableRequest.prototype._performRequest = function() {
      var protocol = this._options.protocol;
      var nativeProtocol = this._options.nativeProtocols[protocol];
      if (!nativeProtocol) {
        this.emit("error", new TypeError("Unsupported protocol " + protocol));
        return;
      }
      if (this._options.agents) {
        var scheme = protocol.substr(0, protocol.length - 1);
        this._options.agent = this._options.agents[scheme];
      }
      var request = this._currentRequest = nativeProtocol.request(this._options, this._onNativeResponse);
      this._currentUrl = url.format(this._options);
      request._redirectable = this;
      for (var e = 0; e < events.length; e++) {
        request.on(events[e], eventHandlers[events[e]]);
      }
      if (this._isRedirect) {
        var i = 0;
        var self = this;
        var buffers = this._requestBodyBuffers;
        (function writeNext(error2) {
          if (request === self._currentRequest) {
            if (error2) {
              self.emit("error", error2);
            } else if (i < buffers.length) {
              var buffer = buffers[i++];
              if (!request.finished) {
                request.write(buffer.data, buffer.encoding, writeNext);
              }
            } else if (self._ended) {
              request.end();
            }
          }
        })();
      }
    };
    RedirectableRequest.prototype._processResponse = function(response) {
      var statusCode = response.statusCode;
      if (this._options.trackRedirects) {
        this._redirects.push({
          url: this._currentUrl,
          headers: response.headers,
          statusCode
        });
      }
      var location = response.headers.location;
      if (location && this._options.followRedirects !== false && statusCode >= 300 && statusCode < 400) {
        abortRequest(this._currentRequest);
        response.destroy();
        if (++this._redirectCount > this._options.maxRedirects) {
          this.emit("error", new TooManyRedirectsError());
          return;
        }
        if ((statusCode === 301 || statusCode === 302) && this._options.method === "POST" || statusCode === 303 && !/^(?:GET|HEAD)$/.test(this._options.method)) {
          this._options.method = "GET";
          this._requestBodyBuffers = [];
          removeMatchingHeaders(/^content-/i, this._options.headers);
        }
        var previousHostName = removeMatchingHeaders(/^host$/i, this._options.headers) || url.parse(this._currentUrl).hostname;
        var redirectUrl = url.resolve(this._currentUrl, location);
        debug("redirecting to", redirectUrl);
        this._isRedirect = true;
        var redirectUrlParts = url.parse(redirectUrl);
        Object.assign(this._options, redirectUrlParts);
        if (redirectUrlParts.hostname !== previousHostName) {
          removeMatchingHeaders(/^authorization$/i, this._options.headers);
        }
        if (typeof this._options.beforeRedirect === "function") {
          var responseDetails = { headers: response.headers };
          try {
            this._options.beforeRedirect.call(null, this._options, responseDetails);
          } catch (err) {
            this.emit("error", err);
            return;
          }
          this._sanitizeOptions(this._options);
        }
        try {
          this._performRequest();
        } catch (cause) {
          var error2 = new RedirectionError("Redirected request failed: " + cause.message);
          error2.cause = cause;
          this.emit("error", error2);
        }
      } else {
        response.responseUrl = this._currentUrl;
        response.redirects = this._redirects;
        this.emit("response", response);
        this._requestBodyBuffers = [];
      }
    };
    function wrap(protocols) {
      var exports2 = {
        maxRedirects: 21,
        maxBodyLength: 10 * 1024 * 1024
      };
      var nativeProtocols = {};
      Object.keys(protocols).forEach(function(scheme) {
        var protocol = scheme + ":";
        var nativeProtocol = nativeProtocols[protocol] = protocols[scheme];
        var wrappedProtocol = exports2[scheme] = Object.create(nativeProtocol);
        function request(input, options2, callback) {
          if (typeof input === "string") {
            var urlStr = input;
            try {
              input = urlToOptions(new URL2(urlStr));
            } catch (err) {
              input = url.parse(urlStr);
            }
          } else if (URL2 && input instanceof URL2) {
            input = urlToOptions(input);
          } else {
            callback = options2;
            options2 = input;
            input = { protocol };
          }
          if (typeof options2 === "function") {
            callback = options2;
            options2 = null;
          }
          options2 = Object.assign({
            maxRedirects: exports2.maxRedirects,
            maxBodyLength: exports2.maxBodyLength
          }, input, options2);
          options2.nativeProtocols = nativeProtocols;
          assert.equal(options2.protocol, protocol, "protocol mismatch");
          debug("options", options2);
          return new RedirectableRequest(options2, callback);
        }
        function get(input, options2, callback) {
          var wrappedRequest = wrappedProtocol.request(input, options2, callback);
          wrappedRequest.end();
          return wrappedRequest;
        }
        Object.defineProperties(wrappedProtocol, {
          request: { value: request, configurable: true, enumerable: true, writable: true },
          get: { value: get, configurable: true, enumerable: true, writable: true }
        });
      });
      return exports2;
    }
    function noop3() {
    }
    function urlToOptions(urlObject) {
      var options2 = {
        protocol: urlObject.protocol,
        hostname: urlObject.hostname.startsWith("[") ? urlObject.hostname.slice(1, -1) : urlObject.hostname,
        hash: urlObject.hash,
        search: urlObject.search,
        pathname: urlObject.pathname,
        path: urlObject.pathname + urlObject.search,
        href: urlObject.href
      };
      if (urlObject.port !== "") {
        options2.port = Number(urlObject.port);
      }
      return options2;
    }
    function removeMatchingHeaders(regex, headers) {
      var lastValue;
      for (var header in headers) {
        if (regex.test(header)) {
          lastValue = headers[header];
          delete headers[header];
        }
      }
      return lastValue;
    }
    function createErrorType(code, defaultMessage) {
      function CustomError(message) {
        Error.captureStackTrace(this, this.constructor);
        this.message = message || defaultMessage;
      }
      CustomError.prototype = new Error();
      CustomError.prototype.constructor = CustomError;
      CustomError.prototype.name = "Error [" + code + "]";
      CustomError.prototype.code = code;
      return CustomError;
    }
    function abortRequest(request) {
      for (var e = 0; e < events.length; e++) {
        request.removeListener(events[e], eventHandlers[events[e]]);
      }
      request.on("error", noop3);
      request.abort();
    }
    module2.exports = wrap({ http: http2, https: https2 });
    module2.exports.wrap = wrap;
  }
});

// node_modules/axios/package.json
var require_package = __commonJS({
  "node_modules/axios/package.json"(exports, module2) {
    module2.exports = {
      name: "axios",
      version: "0.21.1",
      description: "Promise based HTTP client for the browser and node.js",
      main: "index.js",
      scripts: {
        test: "grunt test && bundlesize",
        start: "node ./sandbox/server.js",
        build: "NODE_ENV=production grunt build",
        preversion: "npm test",
        version: "npm run build && grunt version && git add -A dist && git add CHANGELOG.md bower.json package.json",
        postversion: "git push && git push --tags",
        examples: "node ./examples/server.js",
        coveralls: "cat coverage/lcov.info | ./node_modules/coveralls/bin/coveralls.js",
        fix: "eslint --fix lib/**/*.js"
      },
      repository: {
        type: "git",
        url: "https://github.com/axios/axios.git"
      },
      keywords: [
        "xhr",
        "http",
        "ajax",
        "promise",
        "node"
      ],
      author: "Matt Zabriskie",
      license: "MIT",
      bugs: {
        url: "https://github.com/axios/axios/issues"
      },
      homepage: "https://github.com/axios/axios",
      devDependencies: {
        bundlesize: "^0.17.0",
        coveralls: "^3.0.0",
        "es6-promise": "^4.2.4",
        grunt: "^1.0.2",
        "grunt-banner": "^0.6.0",
        "grunt-cli": "^1.2.0",
        "grunt-contrib-clean": "^1.1.0",
        "grunt-contrib-watch": "^1.0.0",
        "grunt-eslint": "^20.1.0",
        "grunt-karma": "^2.0.0",
        "grunt-mocha-test": "^0.13.3",
        "grunt-ts": "^6.0.0-beta.19",
        "grunt-webpack": "^1.0.18",
        "istanbul-instrumenter-loader": "^1.0.0",
        "jasmine-core": "^2.4.1",
        karma: "^1.3.0",
        "karma-chrome-launcher": "^2.2.0",
        "karma-coverage": "^1.1.1",
        "karma-firefox-launcher": "^1.1.0",
        "karma-jasmine": "^1.1.1",
        "karma-jasmine-ajax": "^0.1.13",
        "karma-opera-launcher": "^1.0.0",
        "karma-safari-launcher": "^1.0.0",
        "karma-sauce-launcher": "^1.2.0",
        "karma-sinon": "^1.0.5",
        "karma-sourcemap-loader": "^0.3.7",
        "karma-webpack": "^1.7.0",
        "load-grunt-tasks": "^3.5.2",
        minimist: "^1.2.0",
        mocha: "^5.2.0",
        sinon: "^4.5.0",
        typescript: "^2.8.1",
        "url-search-params": "^0.10.0",
        webpack: "^1.13.1",
        "webpack-dev-server": "^1.14.1"
      },
      browser: {
        "./lib/adapters/http.js": "./lib/adapters/xhr.js"
      },
      jsdelivr: "dist/axios.min.js",
      unpkg: "dist/axios.min.js",
      typings: "./index.d.ts",
      dependencies: {
        "follow-redirects": "^1.10.0"
      },
      bundlesize: [
        {
          path: "./dist/axios.min.js",
          threshold: "5kB"
        }
      ]
    };
  }
});

// node_modules/axios/lib/adapters/http.js
var require_http = __commonJS({
  "node_modules/axios/lib/adapters/http.js"(exports, module2) {
    init_shims();
    "use strict";
    var utils = require_utils();
    var settle = require_settle();
    var buildFullPath = require_buildFullPath();
    var buildURL = require_buildURL();
    var http2 = require("http");
    var https2 = require("https");
    var httpFollow = require_follow_redirects().http;
    var httpsFollow = require_follow_redirects().https;
    var url = require("url");
    var zlib2 = require("zlib");
    var pkg = require_package();
    var createError = require_createError();
    var enhanceError = require_enhanceError();
    var isHttps = /https:?/;
    function setProxy(options2, proxy, location) {
      options2.hostname = proxy.host;
      options2.host = proxy.host;
      options2.port = proxy.port;
      options2.path = location;
      if (proxy.auth) {
        var base64 = Buffer.from(proxy.auth.username + ":" + proxy.auth.password, "utf8").toString("base64");
        options2.headers["Proxy-Authorization"] = "Basic " + base64;
      }
      options2.beforeRedirect = function beforeRedirect(redirection) {
        redirection.headers.host = redirection.host;
        setProxy(redirection, proxy, redirection.href);
      };
    }
    module2.exports = function httpAdapter(config) {
      return new Promise(function dispatchHttpRequest(resolvePromise, rejectPromise) {
        var resolve2 = function resolve3(value) {
          resolvePromise(value);
        };
        var reject = function reject2(value) {
          rejectPromise(value);
        };
        var data = config.data;
        var headers = config.headers;
        if (!headers["User-Agent"] && !headers["user-agent"]) {
          headers["User-Agent"] = "axios/" + pkg.version;
        }
        if (data && !utils.isStream(data)) {
          if (Buffer.isBuffer(data)) {
          } else if (utils.isArrayBuffer(data)) {
            data = Buffer.from(new Uint8Array(data));
          } else if (utils.isString(data)) {
            data = Buffer.from(data, "utf-8");
          } else {
            return reject(createError("Data after transformation must be a string, an ArrayBuffer, a Buffer, or a Stream", config));
          }
          headers["Content-Length"] = data.length;
        }
        var auth = void 0;
        if (config.auth) {
          var username = config.auth.username || "";
          var password = config.auth.password || "";
          auth = username + ":" + password;
        }
        var fullPath = buildFullPath(config.baseURL, config.url);
        var parsed = url.parse(fullPath);
        var protocol = parsed.protocol || "http:";
        if (!auth && parsed.auth) {
          var urlAuth = parsed.auth.split(":");
          var urlUsername = urlAuth[0] || "";
          var urlPassword = urlAuth[1] || "";
          auth = urlUsername + ":" + urlPassword;
        }
        if (auth) {
          delete headers.Authorization;
        }
        var isHttpsRequest = isHttps.test(protocol);
        var agent = isHttpsRequest ? config.httpsAgent : config.httpAgent;
        var options2 = {
          path: buildURL(parsed.path, config.params, config.paramsSerializer).replace(/^\?/, ""),
          method: config.method.toUpperCase(),
          headers,
          agent,
          agents: { http: config.httpAgent, https: config.httpsAgent },
          auth
        };
        if (config.socketPath) {
          options2.socketPath = config.socketPath;
        } else {
          options2.hostname = parsed.hostname;
          options2.port = parsed.port;
        }
        var proxy = config.proxy;
        if (!proxy && proxy !== false) {
          var proxyEnv = protocol.slice(0, -1) + "_proxy";
          var proxyUrl = process.env[proxyEnv] || process.env[proxyEnv.toUpperCase()];
          if (proxyUrl) {
            var parsedProxyUrl = url.parse(proxyUrl);
            var noProxyEnv = process.env.no_proxy || process.env.NO_PROXY;
            var shouldProxy = true;
            if (noProxyEnv) {
              var noProxy = noProxyEnv.split(",").map(function trim(s2) {
                return s2.trim();
              });
              shouldProxy = !noProxy.some(function proxyMatch(proxyElement) {
                if (!proxyElement) {
                  return false;
                }
                if (proxyElement === "*") {
                  return true;
                }
                if (proxyElement[0] === "." && parsed.hostname.substr(parsed.hostname.length - proxyElement.length) === proxyElement) {
                  return true;
                }
                return parsed.hostname === proxyElement;
              });
            }
            if (shouldProxy) {
              proxy = {
                host: parsedProxyUrl.hostname,
                port: parsedProxyUrl.port,
                protocol: parsedProxyUrl.protocol
              };
              if (parsedProxyUrl.auth) {
                var proxyUrlAuth = parsedProxyUrl.auth.split(":");
                proxy.auth = {
                  username: proxyUrlAuth[0],
                  password: proxyUrlAuth[1]
                };
              }
            }
          }
        }
        if (proxy) {
          options2.headers.host = parsed.hostname + (parsed.port ? ":" + parsed.port : "");
          setProxy(options2, proxy, protocol + "//" + parsed.hostname + (parsed.port ? ":" + parsed.port : "") + options2.path);
        }
        var transport;
        var isHttpsProxy = isHttpsRequest && (proxy ? isHttps.test(proxy.protocol) : true);
        if (config.transport) {
          transport = config.transport;
        } else if (config.maxRedirects === 0) {
          transport = isHttpsProxy ? https2 : http2;
        } else {
          if (config.maxRedirects) {
            options2.maxRedirects = config.maxRedirects;
          }
          transport = isHttpsProxy ? httpsFollow : httpFollow;
        }
        if (config.maxBodyLength > -1) {
          options2.maxBodyLength = config.maxBodyLength;
        }
        var req = transport.request(options2, function handleResponse(res) {
          if (req.aborted)
            return;
          var stream = res;
          var lastRequest = res.req || req;
          if (res.statusCode !== 204 && lastRequest.method !== "HEAD" && config.decompress !== false) {
            switch (res.headers["content-encoding"]) {
              case "gzip":
              case "compress":
              case "deflate":
                stream = stream.pipe(zlib2.createUnzip());
                delete res.headers["content-encoding"];
                break;
            }
          }
          var response = {
            status: res.statusCode,
            statusText: res.statusMessage,
            headers: res.headers,
            config,
            request: lastRequest
          };
          if (config.responseType === "stream") {
            response.data = stream;
            settle(resolve2, reject, response);
          } else {
            var responseBuffer = [];
            stream.on("data", function handleStreamData(chunk) {
              responseBuffer.push(chunk);
              if (config.maxContentLength > -1 && Buffer.concat(responseBuffer).length > config.maxContentLength) {
                stream.destroy();
                reject(createError("maxContentLength size of " + config.maxContentLength + " exceeded", config, null, lastRequest));
              }
            });
            stream.on("error", function handleStreamError(err) {
              if (req.aborted)
                return;
              reject(enhanceError(err, config, null, lastRequest));
            });
            stream.on("end", function handleStreamEnd() {
              var responseData = Buffer.concat(responseBuffer);
              if (config.responseType !== "arraybuffer") {
                responseData = responseData.toString(config.responseEncoding);
                if (!config.responseEncoding || config.responseEncoding === "utf8") {
                  responseData = utils.stripBOM(responseData);
                }
              }
              response.data = responseData;
              settle(resolve2, reject, response);
            });
          }
        });
        req.on("error", function handleRequestError(err) {
          if (req.aborted && err.code !== "ERR_FR_TOO_MANY_REDIRECTS")
            return;
          reject(enhanceError(err, config, null, req));
        });
        if (config.timeout) {
          req.setTimeout(config.timeout, function handleRequestTimeout() {
            req.abort();
            reject(createError("timeout of " + config.timeout + "ms exceeded", config, "ECONNABORTED", req));
          });
        }
        if (config.cancelToken) {
          config.cancelToken.promise.then(function onCanceled(cancel) {
            if (req.aborted)
              return;
            req.abort();
            reject(cancel);
          });
        }
        if (utils.isStream(data)) {
          data.on("error", function handleStreamError(err) {
            reject(enhanceError(err, config, null, req));
          }).pipe(req);
        } else {
          req.end(data);
        }
      });
    };
  }
});

// node_modules/axios/lib/defaults.js
var require_defaults = __commonJS({
  "node_modules/axios/lib/defaults.js"(exports, module2) {
    init_shims();
    "use strict";
    var utils = require_utils();
    var normalizeHeaderName = require_normalizeHeaderName();
    var DEFAULT_CONTENT_TYPE = {
      "Content-Type": "application/x-www-form-urlencoded"
    };
    function setContentTypeIfUnset(headers, value) {
      if (!utils.isUndefined(headers) && utils.isUndefined(headers["Content-Type"])) {
        headers["Content-Type"] = value;
      }
    }
    function getDefaultAdapter() {
      var adapter;
      if (typeof XMLHttpRequest !== "undefined") {
        adapter = require_xhr();
      } else if (typeof process !== "undefined" && Object.prototype.toString.call(process) === "[object process]") {
        adapter = require_http();
      }
      return adapter;
    }
    var defaults = {
      adapter: getDefaultAdapter(),
      transformRequest: [function transformRequest(data, headers) {
        normalizeHeaderName(headers, "Accept");
        normalizeHeaderName(headers, "Content-Type");
        if (utils.isFormData(data) || utils.isArrayBuffer(data) || utils.isBuffer(data) || utils.isStream(data) || utils.isFile(data) || utils.isBlob(data)) {
          return data;
        }
        if (utils.isArrayBufferView(data)) {
          return data.buffer;
        }
        if (utils.isURLSearchParams(data)) {
          setContentTypeIfUnset(headers, "application/x-www-form-urlencoded;charset=utf-8");
          return data.toString();
        }
        if (utils.isObject(data)) {
          setContentTypeIfUnset(headers, "application/json;charset=utf-8");
          return JSON.stringify(data);
        }
        return data;
      }],
      transformResponse: [function transformResponse(data) {
        if (typeof data === "string") {
          try {
            data = JSON.parse(data);
          } catch (e) {
          }
        }
        return data;
      }],
      timeout: 0,
      xsrfCookieName: "XSRF-TOKEN",
      xsrfHeaderName: "X-XSRF-TOKEN",
      maxContentLength: -1,
      maxBodyLength: -1,
      validateStatus: function validateStatus(status) {
        return status >= 200 && status < 300;
      }
    };
    defaults.headers = {
      common: {
        "Accept": "application/json, text/plain, */*"
      }
    };
    utils.forEach(["delete", "get", "head"], function forEachMethodNoData(method) {
      defaults.headers[method] = {};
    });
    utils.forEach(["post", "put", "patch"], function forEachMethodWithData(method) {
      defaults.headers[method] = utils.merge(DEFAULT_CONTENT_TYPE);
    });
    module2.exports = defaults;
  }
});

// node_modules/axios/lib/core/dispatchRequest.js
var require_dispatchRequest = __commonJS({
  "node_modules/axios/lib/core/dispatchRequest.js"(exports, module2) {
    init_shims();
    "use strict";
    var utils = require_utils();
    var transformData = require_transformData();
    var isCancel = require_isCancel();
    var defaults = require_defaults();
    function throwIfCancellationRequested(config) {
      if (config.cancelToken) {
        config.cancelToken.throwIfRequested();
      }
    }
    module2.exports = function dispatchRequest(config) {
      throwIfCancellationRequested(config);
      config.headers = config.headers || {};
      config.data = transformData(config.data, config.headers, config.transformRequest);
      config.headers = utils.merge(config.headers.common || {}, config.headers[config.method] || {}, config.headers);
      utils.forEach(["delete", "get", "head", "post", "put", "patch", "common"], function cleanHeaderConfig(method) {
        delete config.headers[method];
      });
      var adapter = config.adapter || defaults.adapter;
      return adapter(config).then(function onAdapterResolution(response) {
        throwIfCancellationRequested(config);
        response.data = transformData(response.data, response.headers, config.transformResponse);
        return response;
      }, function onAdapterRejection(reason) {
        if (!isCancel(reason)) {
          throwIfCancellationRequested(config);
          if (reason && reason.response) {
            reason.response.data = transformData(reason.response.data, reason.response.headers, config.transformResponse);
          }
        }
        return Promise.reject(reason);
      });
    };
  }
});

// node_modules/axios/lib/core/mergeConfig.js
var require_mergeConfig = __commonJS({
  "node_modules/axios/lib/core/mergeConfig.js"(exports, module2) {
    init_shims();
    "use strict";
    var utils = require_utils();
    module2.exports = function mergeConfig(config1, config2) {
      config2 = config2 || {};
      var config = {};
      var valueFromConfig2Keys = ["url", "method", "data"];
      var mergeDeepPropertiesKeys = ["headers", "auth", "proxy", "params"];
      var defaultToConfig2Keys = [
        "baseURL",
        "transformRequest",
        "transformResponse",
        "paramsSerializer",
        "timeout",
        "timeoutMessage",
        "withCredentials",
        "adapter",
        "responseType",
        "xsrfCookieName",
        "xsrfHeaderName",
        "onUploadProgress",
        "onDownloadProgress",
        "decompress",
        "maxContentLength",
        "maxBodyLength",
        "maxRedirects",
        "transport",
        "httpAgent",
        "httpsAgent",
        "cancelToken",
        "socketPath",
        "responseEncoding"
      ];
      var directMergeKeys = ["validateStatus"];
      function getMergedValue(target, source) {
        if (utils.isPlainObject(target) && utils.isPlainObject(source)) {
          return utils.merge(target, source);
        } else if (utils.isPlainObject(source)) {
          return utils.merge({}, source);
        } else if (utils.isArray(source)) {
          return source.slice();
        }
        return source;
      }
      function mergeDeepProperties(prop) {
        if (!utils.isUndefined(config2[prop])) {
          config[prop] = getMergedValue(config1[prop], config2[prop]);
        } else if (!utils.isUndefined(config1[prop])) {
          config[prop] = getMergedValue(void 0, config1[prop]);
        }
      }
      utils.forEach(valueFromConfig2Keys, function valueFromConfig2(prop) {
        if (!utils.isUndefined(config2[prop])) {
          config[prop] = getMergedValue(void 0, config2[prop]);
        }
      });
      utils.forEach(mergeDeepPropertiesKeys, mergeDeepProperties);
      utils.forEach(defaultToConfig2Keys, function defaultToConfig2(prop) {
        if (!utils.isUndefined(config2[prop])) {
          config[prop] = getMergedValue(void 0, config2[prop]);
        } else if (!utils.isUndefined(config1[prop])) {
          config[prop] = getMergedValue(void 0, config1[prop]);
        }
      });
      utils.forEach(directMergeKeys, function merge(prop) {
        if (prop in config2) {
          config[prop] = getMergedValue(config1[prop], config2[prop]);
        } else if (prop in config1) {
          config[prop] = getMergedValue(void 0, config1[prop]);
        }
      });
      var axiosKeys = valueFromConfig2Keys.concat(mergeDeepPropertiesKeys).concat(defaultToConfig2Keys).concat(directMergeKeys);
      var otherKeys = Object.keys(config1).concat(Object.keys(config2)).filter(function filterAxiosKeys(key) {
        return axiosKeys.indexOf(key) === -1;
      });
      utils.forEach(otherKeys, mergeDeepProperties);
      return config;
    };
  }
});

// node_modules/axios/lib/core/Axios.js
var require_Axios = __commonJS({
  "node_modules/axios/lib/core/Axios.js"(exports, module2) {
    init_shims();
    "use strict";
    var utils = require_utils();
    var buildURL = require_buildURL();
    var InterceptorManager = require_InterceptorManager();
    var dispatchRequest = require_dispatchRequest();
    var mergeConfig = require_mergeConfig();
    function Axios(instanceConfig) {
      this.defaults = instanceConfig;
      this.interceptors = {
        request: new InterceptorManager(),
        response: new InterceptorManager()
      };
    }
    Axios.prototype.request = function request(config) {
      if (typeof config === "string") {
        config = arguments[1] || {};
        config.url = arguments[0];
      } else {
        config = config || {};
      }
      config = mergeConfig(this.defaults, config);
      if (config.method) {
        config.method = config.method.toLowerCase();
      } else if (this.defaults.method) {
        config.method = this.defaults.method.toLowerCase();
      } else {
        config.method = "get";
      }
      var chain = [dispatchRequest, void 0];
      var promise = Promise.resolve(config);
      this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
        chain.unshift(interceptor.fulfilled, interceptor.rejected);
      });
      this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
        chain.push(interceptor.fulfilled, interceptor.rejected);
      });
      while (chain.length) {
        promise = promise.then(chain.shift(), chain.shift());
      }
      return promise;
    };
    Axios.prototype.getUri = function getUri(config) {
      config = mergeConfig(this.defaults, config);
      return buildURL(config.url, config.params, config.paramsSerializer).replace(/^\?/, "");
    };
    utils.forEach(["delete", "get", "head", "options"], function forEachMethodNoData(method) {
      Axios.prototype[method] = function(url, config) {
        return this.request(mergeConfig(config || {}, {
          method,
          url,
          data: (config || {}).data
        }));
      };
    });
    utils.forEach(["post", "put", "patch"], function forEachMethodWithData(method) {
      Axios.prototype[method] = function(url, data, config) {
        return this.request(mergeConfig(config || {}, {
          method,
          url,
          data
        }));
      };
    });
    module2.exports = Axios;
  }
});

// node_modules/axios/lib/cancel/Cancel.js
var require_Cancel = __commonJS({
  "node_modules/axios/lib/cancel/Cancel.js"(exports, module2) {
    init_shims();
    "use strict";
    function Cancel(message) {
      this.message = message;
    }
    Cancel.prototype.toString = function toString() {
      return "Cancel" + (this.message ? ": " + this.message : "");
    };
    Cancel.prototype.__CANCEL__ = true;
    module2.exports = Cancel;
  }
});

// node_modules/axios/lib/cancel/CancelToken.js
var require_CancelToken = __commonJS({
  "node_modules/axios/lib/cancel/CancelToken.js"(exports, module2) {
    init_shims();
    "use strict";
    var Cancel = require_Cancel();
    function CancelToken(executor) {
      if (typeof executor !== "function") {
        throw new TypeError("executor must be a function.");
      }
      var resolvePromise;
      this.promise = new Promise(function promiseExecutor(resolve2) {
        resolvePromise = resolve2;
      });
      var token = this;
      executor(function cancel(message) {
        if (token.reason) {
          return;
        }
        token.reason = new Cancel(message);
        resolvePromise(token.reason);
      });
    }
    CancelToken.prototype.throwIfRequested = function throwIfRequested() {
      if (this.reason) {
        throw this.reason;
      }
    };
    CancelToken.source = function source() {
      var cancel;
      var token = new CancelToken(function executor(c) {
        cancel = c;
      });
      return {
        token,
        cancel
      };
    };
    module2.exports = CancelToken;
  }
});

// node_modules/axios/lib/helpers/spread.js
var require_spread = __commonJS({
  "node_modules/axios/lib/helpers/spread.js"(exports, module2) {
    init_shims();
    "use strict";
    module2.exports = function spread2(callback) {
      return function wrap(arr) {
        return callback.apply(null, arr);
      };
    };
  }
});

// node_modules/axios/lib/helpers/isAxiosError.js
var require_isAxiosError = __commonJS({
  "node_modules/axios/lib/helpers/isAxiosError.js"(exports, module2) {
    init_shims();
    "use strict";
    module2.exports = function isAxiosError(payload) {
      return typeof payload === "object" && payload.isAxiosError === true;
    };
  }
});

// node_modules/axios/lib/axios.js
var require_axios = __commonJS({
  "node_modules/axios/lib/axios.js"(exports, module2) {
    init_shims();
    "use strict";
    var utils = require_utils();
    var bind = require_bind();
    var Axios = require_Axios();
    var mergeConfig = require_mergeConfig();
    var defaults = require_defaults();
    function createInstance(defaultConfig) {
      var context = new Axios(defaultConfig);
      var instance = bind(Axios.prototype.request, context);
      utils.extend(instance, Axios.prototype, context);
      utils.extend(instance, context);
      return instance;
    }
    var axios2 = createInstance(defaults);
    axios2.Axios = Axios;
    axios2.create = function create(instanceConfig) {
      return createInstance(mergeConfig(axios2.defaults, instanceConfig));
    };
    axios2.Cancel = require_Cancel();
    axios2.CancelToken = require_CancelToken();
    axios2.isCancel = require_isCancel();
    axios2.all = function all(promises) {
      return Promise.all(promises);
    };
    axios2.spread = require_spread();
    axios2.isAxiosError = require_isAxiosError();
    module2.exports = axios2;
    module2.exports.default = axios2;
  }
});

// node_modules/axios/index.js
var require_axios2 = __commonJS({
  "node_modules/axios/index.js"(exports, module2) {
    init_shims();
    module2.exports = require_axios();
  }
});

// .svelte-kit/netlify/entry.js
__export(exports, {
  handler: () => handler
});
init_shims();

// .svelte-kit/output/server/app.js
init_shims();

// node_modules/@sveltejs/kit/dist/ssr.js
init_shims();
var chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_$";
var unsafeChars = /[<>\b\f\n\r\t\0\u2028\u2029]/g;
var reserved = /^(?:do|if|in|for|int|let|new|try|var|byte|case|char|else|enum|goto|long|this|void|with|await|break|catch|class|const|final|float|short|super|throw|while|yield|delete|double|export|import|native|return|switch|throws|typeof|boolean|default|extends|finally|package|private|abstract|continue|debugger|function|volatile|interface|protected|transient|implements|instanceof|synchronized)$/;
var escaped$1 = {
  "<": "\\u003C",
  ">": "\\u003E",
  "/": "\\u002F",
  "\\": "\\\\",
  "\b": "\\b",
  "\f": "\\f",
  "\n": "\\n",
  "\r": "\\r",
  "	": "\\t",
  "\0": "\\0",
  "\u2028": "\\u2028",
  "\u2029": "\\u2029"
};
var objectProtoOwnPropertyNames = Object.getOwnPropertyNames(Object.prototype).sort().join("\0");
function devalue(value) {
  var counts = new Map();
  function walk(thing) {
    if (typeof thing === "function") {
      throw new Error("Cannot stringify a function");
    }
    if (counts.has(thing)) {
      counts.set(thing, counts.get(thing) + 1);
      return;
    }
    counts.set(thing, 1);
    if (!isPrimitive(thing)) {
      var type = getType(thing);
      switch (type) {
        case "Number":
        case "String":
        case "Boolean":
        case "Date":
        case "RegExp":
          return;
        case "Array":
          thing.forEach(walk);
          break;
        case "Set":
        case "Map":
          Array.from(thing).forEach(walk);
          break;
        default:
          var proto = Object.getPrototypeOf(thing);
          if (proto !== Object.prototype && proto !== null && Object.getOwnPropertyNames(proto).sort().join("\0") !== objectProtoOwnPropertyNames) {
            throw new Error("Cannot stringify arbitrary non-POJOs");
          }
          if (Object.getOwnPropertySymbols(thing).length > 0) {
            throw new Error("Cannot stringify POJOs with symbolic keys");
          }
          Object.keys(thing).forEach(function(key) {
            return walk(thing[key]);
          });
      }
    }
  }
  walk(value);
  var names = new Map();
  Array.from(counts).filter(function(entry) {
    return entry[1] > 1;
  }).sort(function(a, b) {
    return b[1] - a[1];
  }).forEach(function(entry, i) {
    names.set(entry[0], getName(i));
  });
  function stringify(thing) {
    if (names.has(thing)) {
      return names.get(thing);
    }
    if (isPrimitive(thing)) {
      return stringifyPrimitive(thing);
    }
    var type = getType(thing);
    switch (type) {
      case "Number":
      case "String":
      case "Boolean":
        return "Object(" + stringify(thing.valueOf()) + ")";
      case "RegExp":
        return "new RegExp(" + stringifyString(thing.source) + ', "' + thing.flags + '")';
      case "Date":
        return "new Date(" + thing.getTime() + ")";
      case "Array":
        var members = thing.map(function(v, i) {
          return i in thing ? stringify(v) : "";
        });
        var tail = thing.length === 0 || thing.length - 1 in thing ? "" : ",";
        return "[" + members.join(",") + tail + "]";
      case "Set":
      case "Map":
        return "new " + type + "([" + Array.from(thing).map(stringify).join(",") + "])";
      default:
        var obj = "{" + Object.keys(thing).map(function(key) {
          return safeKey(key) + ":" + stringify(thing[key]);
        }).join(",") + "}";
        var proto = Object.getPrototypeOf(thing);
        if (proto === null) {
          return Object.keys(thing).length > 0 ? "Object.assign(Object.create(null)," + obj + ")" : "Object.create(null)";
        }
        return obj;
    }
  }
  var str = stringify(value);
  if (names.size) {
    var params_1 = [];
    var statements_1 = [];
    var values_1 = [];
    names.forEach(function(name, thing) {
      params_1.push(name);
      if (isPrimitive(thing)) {
        values_1.push(stringifyPrimitive(thing));
        return;
      }
      var type = getType(thing);
      switch (type) {
        case "Number":
        case "String":
        case "Boolean":
          values_1.push("Object(" + stringify(thing.valueOf()) + ")");
          break;
        case "RegExp":
          values_1.push(thing.toString());
          break;
        case "Date":
          values_1.push("new Date(" + thing.getTime() + ")");
          break;
        case "Array":
          values_1.push("Array(" + thing.length + ")");
          thing.forEach(function(v, i) {
            statements_1.push(name + "[" + i + "]=" + stringify(v));
          });
          break;
        case "Set":
          values_1.push("new Set");
          statements_1.push(name + "." + Array.from(thing).map(function(v) {
            return "add(" + stringify(v) + ")";
          }).join("."));
          break;
        case "Map":
          values_1.push("new Map");
          statements_1.push(name + "." + Array.from(thing).map(function(_a) {
            var k = _a[0], v = _a[1];
            return "set(" + stringify(k) + ", " + stringify(v) + ")";
          }).join("."));
          break;
        default:
          values_1.push(Object.getPrototypeOf(thing) === null ? "Object.create(null)" : "{}");
          Object.keys(thing).forEach(function(key) {
            statements_1.push("" + name + safeProp(key) + "=" + stringify(thing[key]));
          });
      }
    });
    statements_1.push("return " + str);
    return "(function(" + params_1.join(",") + "){" + statements_1.join(";") + "}(" + values_1.join(",") + "))";
  } else {
    return str;
  }
}
function getName(num) {
  var name = "";
  do {
    name = chars[num % chars.length] + name;
    num = ~~(num / chars.length) - 1;
  } while (num >= 0);
  return reserved.test(name) ? name + "_" : name;
}
function isPrimitive(thing) {
  return Object(thing) !== thing;
}
function stringifyPrimitive(thing) {
  if (typeof thing === "string")
    return stringifyString(thing);
  if (thing === void 0)
    return "void 0";
  if (thing === 0 && 1 / thing < 0)
    return "-0";
  var str = String(thing);
  if (typeof thing === "number")
    return str.replace(/^(-)?0\./, "$1.");
  return str;
}
function getType(thing) {
  return Object.prototype.toString.call(thing).slice(8, -1);
}
function escapeUnsafeChar(c) {
  return escaped$1[c] || c;
}
function escapeUnsafeChars(str) {
  return str.replace(unsafeChars, escapeUnsafeChar);
}
function safeKey(key) {
  return /^[_$a-zA-Z][_$a-zA-Z0-9]*$/.test(key) ? key : escapeUnsafeChars(JSON.stringify(key));
}
function safeProp(key) {
  return /^[_$a-zA-Z][_$a-zA-Z0-9]*$/.test(key) ? "." + key : "[" + escapeUnsafeChars(JSON.stringify(key)) + "]";
}
function stringifyString(str) {
  var result = '"';
  for (var i = 0; i < str.length; i += 1) {
    var char = str.charAt(i);
    var code = char.charCodeAt(0);
    if (char === '"') {
      result += '\\"';
    } else if (char in escaped$1) {
      result += escaped$1[char];
    } else if (code >= 55296 && code <= 57343) {
      var next = str.charCodeAt(i + 1);
      if (code <= 56319 && (next >= 56320 && next <= 57343)) {
        result += char + str[++i];
      } else {
        result += "\\u" + code.toString(16).toUpperCase();
      }
    } else {
      result += char;
    }
  }
  result += '"';
  return result;
}
function noop() {
}
function safe_not_equal(a, b) {
  return a != a ? b == b : a !== b || (a && typeof a === "object" || typeof a === "function");
}
var subscriber_queue = [];
function writable(value, start = noop) {
  let stop;
  const subscribers = [];
  function set(new_value) {
    if (safe_not_equal(value, new_value)) {
      value = new_value;
      if (stop) {
        const run_queue = !subscriber_queue.length;
        for (let i = 0; i < subscribers.length; i += 1) {
          const s2 = subscribers[i];
          s2[1]();
          subscriber_queue.push(s2, value);
        }
        if (run_queue) {
          for (let i = 0; i < subscriber_queue.length; i += 2) {
            subscriber_queue[i][0](subscriber_queue[i + 1]);
          }
          subscriber_queue.length = 0;
        }
      }
    }
  }
  function update(fn) {
    set(fn(value));
  }
  function subscribe(run2, invalidate = noop) {
    const subscriber = [run2, invalidate];
    subscribers.push(subscriber);
    if (subscribers.length === 1) {
      stop = start(set) || noop;
    }
    run2(value);
    return () => {
      const index2 = subscribers.indexOf(subscriber);
      if (index2 !== -1) {
        subscribers.splice(index2, 1);
      }
      if (subscribers.length === 0) {
        stop();
        stop = null;
      }
    };
  }
  return { set, update, subscribe };
}
function hash(value) {
  let hash2 = 5381;
  let i = value.length;
  if (typeof value === "string") {
    while (i)
      hash2 = hash2 * 33 ^ value.charCodeAt(--i);
  } else {
    while (i)
      hash2 = hash2 * 33 ^ value[--i];
  }
  return (hash2 >>> 0).toString(36);
}
var s$1 = JSON.stringify;
async function render_response({
  options: options2,
  $session,
  page_config,
  status,
  error: error2,
  branch,
  page
}) {
  const css2 = new Set(options2.entry.css);
  const js = new Set(options2.entry.js);
  const styles = new Set();
  const serialized_data = [];
  let rendered;
  let is_private = false;
  let maxage;
  if (error2) {
    error2.stack = options2.get_stack(error2);
  }
  if (branch) {
    branch.forEach(({ node, loaded, fetched, uses_credentials }) => {
      if (node.css)
        node.css.forEach((url) => css2.add(url));
      if (node.js)
        node.js.forEach((url) => js.add(url));
      if (node.styles)
        node.styles.forEach((content) => styles.add(content));
      if (fetched && page_config.hydrate)
        serialized_data.push(...fetched);
      if (uses_credentials)
        is_private = true;
      maxage = loaded.maxage;
    });
    const session = writable($session);
    const props = {
      stores: {
        page: writable(null),
        navigating: writable(null),
        session
      },
      page,
      components: branch.map(({ node }) => node.module.default)
    };
    for (let i = 0; i < branch.length; i += 1) {
      props[`props_${i}`] = await branch[i].loaded.props;
    }
    let session_tracking_active = false;
    const unsubscribe = session.subscribe(() => {
      if (session_tracking_active)
        is_private = true;
    });
    session_tracking_active = true;
    try {
      rendered = options2.root.render(props);
    } finally {
      unsubscribe();
    }
  } else {
    rendered = { head: "", html: "", css: { code: "", map: null } };
  }
  const include_js = page_config.router || page_config.hydrate;
  if (!include_js)
    js.clear();
  const links = options2.amp ? styles.size > 0 || rendered.css.code.length > 0 ? `<style amp-custom>${Array.from(styles).concat(rendered.css.code).join("\n")}</style>` : "" : [
    ...Array.from(js).map((dep) => `<link rel="modulepreload" href="${dep}">`),
    ...Array.from(css2).map((dep) => `<link rel="stylesheet" href="${dep}">`)
  ].join("\n		");
  let init2 = "";
  if (options2.amp) {
    init2 = `
		<style amp-boilerplate>body{-webkit-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-moz-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-ms-animation:-amp-start 8s steps(1,end) 0s 1 normal both;animation:-amp-start 8s steps(1,end) 0s 1 normal both}@-webkit-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-moz-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-ms-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-o-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}</style>
		<noscript><style amp-boilerplate>body{-webkit-animation:none;-moz-animation:none;-ms-animation:none;animation:none}</style></noscript>
		<script async src="https://cdn.ampproject.org/v0.js"><\/script>`;
  } else if (include_js) {
    init2 = `<script type="module">
			import { start } from ${s$1(options2.entry.file)};
			start({
				target: ${options2.target ? `document.querySelector(${s$1(options2.target)})` : "document.body"},
				paths: ${s$1(options2.paths)},
				session: ${try_serialize($session, (error3) => {
      throw new Error(`Failed to serialize session data: ${error3.message}`);
    })},
				host: ${page && page.host ? s$1(page.host) : "location.host"},
				route: ${!!page_config.router},
				spa: ${!page_config.ssr},
				trailing_slash: ${s$1(options2.trailing_slash)},
				hydrate: ${page_config.ssr && page_config.hydrate ? `{
					status: ${status},
					error: ${serialize_error(error2)},
					nodes: [
						${branch.map(({ node }) => `import(${s$1(node.entry)})`).join(",\n						")}
					],
					page: {
						host: ${page.host ? s$1(page.host) : "location.host"}, // TODO this is redundant
						path: ${s$1(page.path)},
						query: new URLSearchParams(${s$1(page.query.toString())}),
						params: ${s$1(page.params)}
					}
				}` : "null"}
			});
		<\/script>`;
  }
  if (options2.service_worker) {
    init2 += `<script>
			if ('serviceWorker' in navigator) {
				navigator.serviceWorker.register('${options2.service_worker}');
			}
		<\/script>`;
  }
  const head = [
    rendered.head,
    styles.size && !options2.amp ? `<style data-svelte>${Array.from(styles).join("\n")}</style>` : "",
    links,
    init2
  ].join("\n\n		");
  const body = options2.amp ? rendered.html : `${rendered.html}

			${serialized_data.map(({ url, body: body2, json }) => {
    let attributes = `type="application/json" data-type="svelte-data" data-url="${url}"`;
    if (body2)
      attributes += ` data-body="${hash(body2)}"`;
    return `<script ${attributes}>${json}<\/script>`;
  }).join("\n\n			")}
		`.replace(/^\t{2}/gm, "");
  const headers = {
    "content-type": "text/html"
  };
  if (maxage) {
    headers["cache-control"] = `${is_private ? "private" : "public"}, max-age=${maxage}`;
  }
  if (!options2.floc) {
    headers["permissions-policy"] = "interest-cohort=()";
  }
  return {
    status,
    headers,
    body: options2.template({ head, body })
  };
}
function try_serialize(data, fail) {
  try {
    return devalue(data);
  } catch (err) {
    if (fail)
      fail(err);
    return null;
  }
}
function serialize_error(error2) {
  if (!error2)
    return null;
  let serialized = try_serialize(error2);
  if (!serialized) {
    const { name, message, stack } = error2;
    serialized = try_serialize({ name, message, stack });
  }
  if (!serialized) {
    serialized = "{}";
  }
  return serialized;
}
function normalize(loaded) {
  if (loaded.error) {
    const error2 = typeof loaded.error === "string" ? new Error(loaded.error) : loaded.error;
    const status = loaded.status;
    if (!(error2 instanceof Error)) {
      return {
        status: 500,
        error: new Error(`"error" property returned from load() must be a string or instance of Error, received type "${typeof error2}"`)
      };
    }
    if (!status || status < 400 || status > 599) {
      console.warn('"error" returned from load() without a valid status code \u2014 defaulting to 500');
      return { status: 500, error: error2 };
    }
    return { status, error: error2 };
  }
  if (loaded.redirect) {
    if (!loaded.status || Math.floor(loaded.status / 100) !== 3) {
      return {
        status: 500,
        error: new Error('"redirect" property returned from load() must be accompanied by a 3xx status code')
      };
    }
    if (typeof loaded.redirect !== "string") {
      return {
        status: 500,
        error: new Error('"redirect" property returned from load() must be a string')
      };
    }
  }
  return loaded;
}
function resolve(base, path) {
  const baseparts = path[0] === "/" ? [] : base.slice(1).split("/");
  const pathparts = path[0] === "/" ? path.slice(1).split("/") : path.split("/");
  baseparts.pop();
  for (let i = 0; i < pathparts.length; i += 1) {
    const part = pathparts[i];
    if (part === ".")
      continue;
    else if (part === "..")
      baseparts.pop();
    else
      baseparts.push(part);
  }
  return `/${baseparts.join("/")}`;
}
var s = JSON.stringify;
async function load_node({
  request,
  options: options2,
  state,
  route,
  page,
  node,
  $session,
  context,
  is_leaf,
  is_error,
  status,
  error: error2
}) {
  const { module: module2 } = node;
  let uses_credentials = false;
  const fetched = [];
  let loaded;
  if (module2.load) {
    const load_input = {
      page,
      get session() {
        uses_credentials = true;
        return $session;
      },
      fetch: async (resource, opts = {}) => {
        let url;
        if (typeof resource === "string") {
          url = resource;
        } else {
          url = resource.url;
          opts = {
            method: resource.method,
            headers: resource.headers,
            body: resource.body,
            mode: resource.mode,
            credentials: resource.credentials,
            cache: resource.cache,
            redirect: resource.redirect,
            referrer: resource.referrer,
            integrity: resource.integrity,
            ...opts
          };
        }
        if (options2.read && url.startsWith(options2.paths.assets)) {
          url = url.replace(options2.paths.assets, "");
        }
        if (url.startsWith("//")) {
          throw new Error(`Cannot request protocol-relative URL (${url}) in server-side fetch`);
        }
        let response;
        if (/^[a-zA-Z]+:/.test(url)) {
          const request2 = new (void 0)(url, opts);
          response = await options2.hooks.serverFetch.call(null, request2);
        } else {
          const [path, search] = url.split("?");
          const resolved = resolve(request.path, path);
          const filename = resolved.slice(1);
          const filename_html = `${filename}/index.html`;
          const asset = options2.manifest.assets.find((d) => d.file === filename || d.file === filename_html);
          if (asset) {
            if (options2.read) {
              response = new (void 0)(options2.read(asset.file), {
                headers: {
                  "content-type": asset.type
                }
              });
            } else {
              response = await (void 0)(`http://${page.host}/${asset.file}`, opts);
            }
          }
          if (!response) {
            const headers = { ...opts.headers };
            if (opts.credentials !== "omit") {
              uses_credentials = true;
              headers.cookie = request.headers.cookie;
              if (!headers.authorization) {
                headers.authorization = request.headers.authorization;
              }
            }
            if (opts.body && typeof opts.body !== "string") {
              throw new Error("Request body must be a string");
            }
            const rendered = await respond({
              host: request.host,
              method: opts.method || "GET",
              headers,
              path: resolved,
              rawBody: opts.body,
              query: new URLSearchParams(search)
            }, options2, {
              fetched: url,
              initiator: route
            });
            if (rendered) {
              if (state.prerender) {
                state.prerender.dependencies.set(resolved, rendered);
              }
              response = new (void 0)(rendered.body, {
                status: rendered.status,
                headers: rendered.headers
              });
            }
          }
        }
        if (response) {
          const proxy = new Proxy(response, {
            get(response2, key, receiver) {
              async function text() {
                const body = await response2.text();
                const headers = {};
                for (const [key2, value] of response2.headers) {
                  if (key2 !== "etag" && key2 !== "set-cookie")
                    headers[key2] = value;
                }
                if (!opts.body || typeof opts.body === "string") {
                  fetched.push({
                    url,
                    body: opts.body,
                    json: `{"status":${response2.status},"statusText":${s(response2.statusText)},"headers":${s(headers)},"body":${escape(body)}}`
                  });
                }
                return body;
              }
              if (key === "text") {
                return text;
              }
              if (key === "json") {
                return async () => {
                  return JSON.parse(await text());
                };
              }
              return Reflect.get(response2, key, response2);
            }
          });
          return proxy;
        }
        return response || new (void 0)("Not found", {
          status: 404
        });
      },
      context: { ...context }
    };
    if (is_error) {
      load_input.status = status;
      load_input.error = error2;
    }
    loaded = await module2.load.call(null, load_input);
  } else {
    loaded = {};
  }
  if (!loaded && is_leaf && !is_error)
    return;
  return {
    node,
    loaded: normalize(loaded),
    context: loaded.context || context,
    fetched,
    uses_credentials
  };
}
var escaped = {
  "<": "\\u003C",
  ">": "\\u003E",
  "/": "\\u002F",
  "\\": "\\\\",
  "\b": "\\b",
  "\f": "\\f",
  "\n": "\\n",
  "\r": "\\r",
  "	": "\\t",
  "\0": "\\0",
  "\u2028": "\\u2028",
  "\u2029": "\\u2029"
};
function escape(str) {
  let result = '"';
  for (let i = 0; i < str.length; i += 1) {
    const char = str.charAt(i);
    const code = char.charCodeAt(0);
    if (char === '"') {
      result += '\\"';
    } else if (char in escaped) {
      result += escaped[char];
    } else if (code >= 55296 && code <= 57343) {
      const next = str.charCodeAt(i + 1);
      if (code <= 56319 && next >= 56320 && next <= 57343) {
        result += char + str[++i];
      } else {
        result += `\\u${code.toString(16).toUpperCase()}`;
      }
    } else {
      result += char;
    }
  }
  result += '"';
  return result;
}
async function respond_with_error({ request, options: options2, state, $session, status, error: error2 }) {
  const default_layout = await options2.load_component(options2.manifest.layout);
  const default_error = await options2.load_component(options2.manifest.error);
  const page = {
    host: request.host,
    path: request.path,
    query: request.query,
    params: {}
  };
  const loaded = await load_node({
    request,
    options: options2,
    state,
    route: null,
    page,
    node: default_layout,
    $session,
    context: {},
    is_leaf: false,
    is_error: false
  });
  const branch = [
    loaded,
    await load_node({
      request,
      options: options2,
      state,
      route: null,
      page,
      node: default_error,
      $session,
      context: loaded.context,
      is_leaf: false,
      is_error: true,
      status,
      error: error2
    })
  ];
  try {
    return await render_response({
      options: options2,
      $session,
      page_config: {
        hydrate: options2.hydrate,
        router: options2.router,
        ssr: options2.ssr
      },
      status,
      error: error2,
      branch,
      page
    });
  } catch (error3) {
    options2.handle_error(error3);
    return {
      status: 500,
      headers: {},
      body: error3.stack
    };
  }
}
async function respond$1({ request, options: options2, state, $session, route }) {
  const match = route.pattern.exec(request.path);
  const params = route.params(match);
  const page = {
    host: request.host,
    path: request.path,
    query: request.query,
    params
  };
  let nodes;
  try {
    nodes = await Promise.all(route.a.map((id) => id && options2.load_component(id)));
  } catch (error3) {
    options2.handle_error(error3);
    return await respond_with_error({
      request,
      options: options2,
      state,
      $session,
      status: 500,
      error: error3
    });
  }
  const leaf = nodes[nodes.length - 1].module;
  const page_config = {
    ssr: "ssr" in leaf ? leaf.ssr : options2.ssr,
    router: "router" in leaf ? leaf.router : options2.router,
    hydrate: "hydrate" in leaf ? leaf.hydrate : options2.hydrate
  };
  if (!leaf.prerender && state.prerender && !state.prerender.all) {
    return {
      status: 204,
      headers: {},
      body: null
    };
  }
  let branch;
  let status = 200;
  let error2;
  ssr:
    if (page_config.ssr) {
      let context = {};
      branch = [];
      for (let i = 0; i < nodes.length; i += 1) {
        const node = nodes[i];
        let loaded;
        if (node) {
          try {
            loaded = await load_node({
              request,
              options: options2,
              state,
              route,
              page,
              node,
              $session,
              context,
              is_leaf: i === nodes.length - 1,
              is_error: false
            });
            if (!loaded)
              return;
            if (loaded.loaded.redirect) {
              return {
                status: loaded.loaded.status,
                headers: {
                  location: encodeURI(loaded.loaded.redirect)
                }
              };
            }
            if (loaded.loaded.error) {
              ({ status, error: error2 } = loaded.loaded);
            }
          } catch (e) {
            options2.handle_error(e);
            status = 500;
            error2 = e;
          }
          if (error2) {
            while (i--) {
              if (route.b[i]) {
                const error_node = await options2.load_component(route.b[i]);
                let error_loaded;
                let node_loaded;
                let j = i;
                while (!(node_loaded = branch[j])) {
                  j -= 1;
                }
                try {
                  error_loaded = await load_node({
                    request,
                    options: options2,
                    state,
                    route,
                    page,
                    node: error_node,
                    $session,
                    context: node_loaded.context,
                    is_leaf: false,
                    is_error: true,
                    status,
                    error: error2
                  });
                  if (error_loaded.loaded.error) {
                    continue;
                  }
                  branch = branch.slice(0, j + 1).concat(error_loaded);
                  break ssr;
                } catch (e) {
                  options2.handle_error(e);
                  continue;
                }
              }
            }
            return await respond_with_error({
              request,
              options: options2,
              state,
              $session,
              status,
              error: error2
            });
          }
        }
        branch.push(loaded);
        if (loaded && loaded.loaded.context) {
          context = {
            ...context,
            ...loaded.loaded.context
          };
        }
      }
    }
  try {
    return await render_response({
      options: options2,
      $session,
      page_config,
      status,
      error: error2,
      branch: branch && branch.filter(Boolean),
      page
    });
  } catch (error3) {
    options2.handle_error(error3);
    return await respond_with_error({
      request,
      options: options2,
      state,
      $session,
      status: 500,
      error: error3
    });
  }
}
async function render_page(request, route, options2, state) {
  if (state.initiator === route) {
    return {
      status: 404,
      headers: {},
      body: `Not found: ${request.path}`
    };
  }
  const $session = await options2.hooks.getSession(request);
  if (route) {
    const response = await respond$1({
      request,
      options: options2,
      state,
      $session,
      route
    });
    if (response) {
      return response;
    }
    if (state.fetched) {
      return {
        status: 500,
        headers: {},
        body: `Bad request in load function: failed to fetch ${state.fetched}`
      };
    }
  } else {
    return await respond_with_error({
      request,
      options: options2,
      state,
      $session,
      status: 404,
      error: new Error(`Not found: ${request.path}`)
    });
  }
}
function lowercase_keys(obj) {
  const clone2 = {};
  for (const key in obj) {
    clone2[key.toLowerCase()] = obj[key];
  }
  return clone2;
}
function error(body) {
  return {
    status: 500,
    body,
    headers: {}
  };
}
async function render_route(request, route) {
  const mod = await route.load();
  const handler2 = mod[request.method.toLowerCase().replace("delete", "del")];
  if (handler2) {
    const match = route.pattern.exec(request.path);
    const params = route.params(match);
    const response = await handler2({ ...request, params });
    if (response) {
      if (typeof response !== "object") {
        return error(`Invalid response from route ${request.path}: expected an object, got ${typeof response}`);
      }
      let { status = 200, body, headers = {} } = response;
      headers = lowercase_keys(headers);
      const type = headers["content-type"];
      if (type === "application/octet-stream" && !(body instanceof Uint8Array)) {
        return error(`Invalid response from route ${request.path}: body must be an instance of Uint8Array if content type is application/octet-stream`);
      }
      if (body instanceof Uint8Array && type !== "application/octet-stream") {
        return error(`Invalid response from route ${request.path}: Uint8Array body must be accompanied by content-type: application/octet-stream header`);
      }
      let normalized_body;
      if (typeof body === "object" && (!type || type === "application/json")) {
        headers = { ...headers, "content-type": "application/json" };
        normalized_body = JSON.stringify(body);
      } else {
        normalized_body = body;
      }
      return { status, body: normalized_body, headers };
    }
  }
}
function read_only_form_data() {
  const map = new Map();
  return {
    append(key, value) {
      if (map.has(key)) {
        map.get(key).push(value);
      } else {
        map.set(key, [value]);
      }
    },
    data: new ReadOnlyFormData(map)
  };
}
var ReadOnlyFormData = class {
  #map;
  constructor(map) {
    this.#map = map;
  }
  get(key) {
    const value = this.#map.get(key);
    return value && value[0];
  }
  getAll(key) {
    return this.#map.get(key);
  }
  has(key) {
    return this.#map.has(key);
  }
  *[Symbol.iterator]() {
    for (const [key, value] of this.#map) {
      for (let i = 0; i < value.length; i += 1) {
        yield [key, value[i]];
      }
    }
  }
  *entries() {
    for (const [key, value] of this.#map) {
      for (let i = 0; i < value.length; i += 1) {
        yield [key, value[i]];
      }
    }
  }
  *keys() {
    for (const [key, value] of this.#map) {
      for (let i = 0; i < value.length; i += 1) {
        yield key;
      }
    }
  }
  *values() {
    for (const [, value] of this.#map) {
      for (let i = 0; i < value.length; i += 1) {
        yield value;
      }
    }
  }
};
function parse_body(raw, headers) {
  if (!raw)
    return raw;
  const [type, ...directives] = headers["content-type"].split(/;\s*/);
  if (typeof raw === "string") {
    switch (type) {
      case "text/plain":
        return raw;
      case "application/json":
        return JSON.parse(raw);
      case "application/x-www-form-urlencoded":
        return get_urlencoded(raw);
      case "multipart/form-data": {
        const boundary = directives.find((directive) => directive.startsWith("boundary="));
        if (!boundary)
          throw new Error("Missing boundary");
        return get_multipart(raw, boundary.slice("boundary=".length));
      }
      default:
        throw new Error(`Invalid Content-Type ${type}`);
    }
  }
  return raw;
}
function get_urlencoded(text) {
  const { data, append } = read_only_form_data();
  text.replace(/\+/g, " ").split("&").forEach((str) => {
    const [key, value] = str.split("=");
    append(decodeURIComponent(key), decodeURIComponent(value));
  });
  return data;
}
function get_multipart(text, boundary) {
  const parts = text.split(`--${boundary}`);
  const nope = () => {
    throw new Error("Malformed form data");
  };
  if (parts[0] !== "" || parts[parts.length - 1].trim() !== "--") {
    nope();
  }
  const { data, append } = read_only_form_data();
  parts.slice(1, -1).forEach((part) => {
    const match = /\s*([\s\S]+?)\r\n\r\n([\s\S]*)\s*/.exec(part);
    const raw_headers = match[1];
    const body = match[2].trim();
    let key;
    raw_headers.split("\r\n").forEach((str) => {
      const [raw_header, ...raw_directives] = str.split("; ");
      let [name, value] = raw_header.split(": ");
      name = name.toLowerCase();
      const directives = {};
      raw_directives.forEach((raw_directive) => {
        const [name2, value2] = raw_directive.split("=");
        directives[name2] = JSON.parse(value2);
      });
      if (name === "content-disposition") {
        if (value !== "form-data")
          nope();
        if (directives.filename) {
          throw new Error("File upload is not yet implemented");
        }
        if (directives.name) {
          key = directives.name;
        }
      }
    });
    if (!key)
      nope();
    append(key, body);
  });
  return data;
}
async function respond(incoming, options2, state = {}) {
  if (incoming.path !== "/" && options2.trailing_slash !== "ignore") {
    const has_trailing_slash = incoming.path.endsWith("/");
    if (has_trailing_slash && options2.trailing_slash === "never" || !has_trailing_slash && options2.trailing_slash === "always" && !incoming.path.split("/").pop().includes(".")) {
      const path = has_trailing_slash ? incoming.path.slice(0, -1) : incoming.path + "/";
      const q = incoming.query.toString();
      return {
        status: 301,
        headers: {
          location: encodeURI(path + (q ? `?${q}` : ""))
        }
      };
    }
  }
  try {
    const headers = lowercase_keys(incoming.headers);
    return await options2.hooks.handle({
      request: {
        ...incoming,
        headers,
        body: parse_body(incoming.rawBody, headers),
        params: null,
        locals: {}
      },
      resolve: async (request) => {
        if (state.prerender && state.prerender.fallback) {
          return await render_response({
            options: options2,
            $session: await options2.hooks.getSession(request),
            page_config: { ssr: false, router: true, hydrate: true },
            status: 200,
            error: null,
            branch: [],
            page: null
          });
        }
        for (const route of options2.manifest.routes) {
          if (!route.pattern.test(request.path))
            continue;
          const response = route.type === "endpoint" ? await render_route(request, route) : await render_page(request, route, options2, state);
          if (response) {
            if (response.status === 200) {
              if (!/(no-store|immutable)/.test(response.headers["cache-control"])) {
                const etag = `"${hash(response.body)}"`;
                if (request.headers["if-none-match"] === etag) {
                  return {
                    status: 304,
                    headers: {},
                    body: null
                  };
                }
                response.headers["etag"] = etag;
              }
            }
            return response;
          }
        }
        return await render_page(request, null, options2, state);
      }
    });
  } catch (e) {
    options2.handle_error(e);
    return {
      status: 500,
      headers: {},
      body: options2.dev ? e.stack : e.message
    };
  }
}

// node_modules/svelte/internal/index.mjs
init_shims();
function noop2() {
}
function run(fn) {
  return fn();
}
function blank_object() {
  return Object.create(null);
}
function run_all(fns) {
  fns.forEach(run);
}
function is_function(thing) {
  return typeof thing === "function";
}
function is_empty(obj) {
  return Object.keys(obj).length === 0;
}
var tasks = new Set();
var active_docs = new Set();
var current_component;
function set_current_component(component) {
  current_component = component;
}
function get_current_component() {
  if (!current_component)
    throw new Error("Function called outside component initialization");
  return current_component;
}
function onMount(fn) {
  get_current_component().$$.on_mount.push(fn);
}
function afterUpdate(fn) {
  get_current_component().$$.after_update.push(fn);
}
function setContext(key, context) {
  get_current_component().$$.context.set(key, context);
}
var resolved_promise = Promise.resolve();
var seen_callbacks = new Set();
var outroing = new Set();
var globals = typeof window !== "undefined" ? window : typeof globalThis !== "undefined" ? globalThis : global;
var boolean_attributes = new Set([
  "allowfullscreen",
  "allowpaymentrequest",
  "async",
  "autofocus",
  "autoplay",
  "checked",
  "controls",
  "default",
  "defer",
  "disabled",
  "formnovalidate",
  "hidden",
  "ismap",
  "loop",
  "multiple",
  "muted",
  "nomodule",
  "novalidate",
  "open",
  "playsinline",
  "readonly",
  "required",
  "reversed",
  "selected"
]);
var invalid_attribute_name_character = /[\s'">/=\u{FDD0}-\u{FDEF}\u{FFFE}\u{FFFF}\u{1FFFE}\u{1FFFF}\u{2FFFE}\u{2FFFF}\u{3FFFE}\u{3FFFF}\u{4FFFE}\u{4FFFF}\u{5FFFE}\u{5FFFF}\u{6FFFE}\u{6FFFF}\u{7FFFE}\u{7FFFF}\u{8FFFE}\u{8FFFF}\u{9FFFE}\u{9FFFF}\u{AFFFE}\u{AFFFF}\u{BFFFE}\u{BFFFF}\u{CFFFE}\u{CFFFF}\u{DFFFE}\u{DFFFF}\u{EFFFE}\u{EFFFF}\u{FFFFE}\u{FFFFF}\u{10FFFE}\u{10FFFF}]/u;
function spread(args, classes_to_add) {
  const attributes = Object.assign({}, ...args);
  if (classes_to_add) {
    if (attributes.class == null) {
      attributes.class = classes_to_add;
    } else {
      attributes.class += " " + classes_to_add;
    }
  }
  let str = "";
  Object.keys(attributes).forEach((name) => {
    if (invalid_attribute_name_character.test(name))
      return;
    const value = attributes[name];
    if (value === true)
      str += " " + name;
    else if (boolean_attributes.has(name.toLowerCase())) {
      if (value)
        str += " " + name;
    } else if (value != null) {
      str += ` ${name}="${value}"`;
    }
  });
  return str;
}
var escaped2 = {
  '"': "&quot;",
  "'": "&#39;",
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;"
};
function escape2(html) {
  return String(html).replace(/["'&<>]/g, (match) => escaped2[match]);
}
function escape_attribute_value(value) {
  return typeof value === "string" ? escape2(value) : value;
}
function escape_object(obj) {
  const result = {};
  for (const key in obj) {
    result[key] = escape_attribute_value(obj[key]);
  }
  return result;
}
function each(items, fn) {
  let str = "";
  for (let i = 0; i < items.length; i += 1) {
    str += fn(items[i], i);
  }
  return str;
}
var missing_component = {
  $$render: () => ""
};
function validate_component(component, name) {
  if (!component || !component.$$render) {
    if (name === "svelte:component")
      name += " this={...}";
    throw new Error(`<${name}> is not a valid SSR component. You may need to review your build config to ensure that dependencies are compiled, rather than imported as pre-compiled modules`);
  }
  return component;
}
var on_destroy;
function create_ssr_component(fn) {
  function $$render(result, props, bindings, slots, context) {
    const parent_component = current_component;
    const $$ = {
      on_destroy,
      context: new Map(parent_component ? parent_component.$$.context : context || []),
      on_mount: [],
      before_update: [],
      after_update: [],
      callbacks: blank_object()
    };
    set_current_component({ $$ });
    const html = fn(result, props, bindings, slots);
    set_current_component(parent_component);
    return html;
  }
  return {
    render: (props = {}, { $$slots = {}, context = new Map() } = {}) => {
      on_destroy = [];
      const result = { title: "", head: "", css: new Set() };
      const html = $$render(result, props, {}, $$slots, context);
      run_all(on_destroy);
      return {
        html,
        css: {
          code: Array.from(result.css).map((css2) => css2.code).join("\n"),
          map: null
        },
        head: result.title + result.head
      };
    },
    $$render
  };
}
function add_attribute(name, value, boolean) {
  if (value == null || boolean && !value)
    return "";
  return ` ${name}${value === true ? "" : `=${typeof value === "string" ? JSON.stringify(escape2(value)) : `"${value}"`}`}`;
}
function destroy_component(component, detaching) {
  const $$ = component.$$;
  if ($$.fragment !== null) {
    run_all($$.on_destroy);
    $$.fragment && $$.fragment.d(detaching);
    $$.on_destroy = $$.fragment = null;
    $$.ctx = [];
  }
}
var SvelteElement;
if (typeof HTMLElement === "function") {
  SvelteElement = class extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
    }
    connectedCallback() {
      const { on_mount } = this.$$;
      this.$$.on_disconnect = on_mount.map(run).filter(is_function);
      for (const key in this.$$.slotted) {
        this.appendChild(this.$$.slotted[key]);
      }
    }
    attributeChangedCallback(attr, _oldValue, newValue) {
      this[attr] = newValue;
    }
    disconnectedCallback() {
      run_all(this.$$.on_disconnect);
    }
    $destroy() {
      destroy_component(this, 1);
      this.$destroy = noop2;
    }
    $on(type, callback) {
      const callbacks = this.$$.callbacks[type] || (this.$$.callbacks[type] = []);
      callbacks.push(callback);
      return () => {
        const index2 = callbacks.indexOf(callback);
        if (index2 !== -1)
          callbacks.splice(index2, 1);
      };
    }
    $set($$props) {
      if (this.$$set && !is_empty($$props)) {
        this.$$.skip_bound = true;
        this.$$set($$props);
        this.$$.skip_bound = false;
      }
    }
  };
}

// node_modules/svelte/index.mjs
init_shims();

// .svelte-kit/output/server/app.js
var import_cookie = __toModule(require_cookie());

// node_modules/@lukeed/uuid/dist/index.mjs
init_shims();
var IDX = 256;
var HEX = [];
var BUFFER;
while (IDX--)
  HEX[IDX] = (IDX + 256).toString(16).substring(1);
function v4() {
  var i = 0, num, out = "";
  if (!BUFFER || IDX + 16 > 256) {
    BUFFER = Array(i = 256);
    while (i--)
      BUFFER[i] = 256 * Math.random() | 0;
    i = IDX = 0;
  }
  for (; i < 16; i++) {
    num = BUFFER[IDX + i];
    if (i == 6)
      out += HEX[num & 15 | 64];
    else if (i == 8)
      out += HEX[num & 63 | 128];
    else
      out += HEX[num];
    if (i & 1 && i > 1 && i < 11)
      out += "-";
  }
  IDX++;
  return out;
}

// node_modules/svelte/transition/index.mjs
init_shims();

// node_modules/svelte/easing/index.mjs
init_shims();

// .svelte-kit/output/server/app.js
var import_axios = __toModule(require_axios2());
var css$7 = {
  code: "#svelte-announcer.svelte-1j55zn5{position:absolute;left:0;top:0;clip:rect(0 0 0 0);clip-path:inset(50%);overflow:hidden;white-space:nowrap;width:1px;height:1px}",
  map: `{"version":3,"file":"root.svelte","sources":["root.svelte"],"sourcesContent":["<!-- This file is generated by @sveltejs/kit \u2014 do not edit it! -->\\n<script>\\n\\timport { setContext, afterUpdate, onMount } from 'svelte';\\n\\n\\t// stores\\n\\texport let stores;\\n\\texport let page;\\n\\n\\texport let components;\\n\\texport let props_0 = null;\\n\\texport let props_1 = null;\\n\\texport let props_2 = null;\\n\\texport let props_3 = null;\\n\\n\\tsetContext('__svelte__', stores);\\n\\n\\t$: stores.page.set(page);\\n\\tafterUpdate(stores.page.notify);\\n\\n\\tlet mounted = false;\\n\\tlet navigated = false;\\n\\tlet title = null;\\n\\n\\tonMount(() => {\\n\\t\\tconst unsubscribe = stores.page.subscribe(() => {\\n\\t\\t\\tif (mounted) {\\n\\t\\t\\t\\tnavigated = true;\\n\\t\\t\\t\\ttitle = document.title || 'untitled page';\\n\\t\\t\\t}\\n\\t\\t});\\n\\n\\t\\tmounted = true;\\n\\t\\treturn unsubscribe;\\n\\t});\\n<\/script>\\n\\n<svelte:component this={components[0]} {...(props_0 || {})}>\\n\\t{#if components[1]}\\n\\t\\t<svelte:component this={components[1]} {...(props_1 || {})}>\\n\\t\\t\\t{#if components[2]}\\n\\t\\t\\t\\t<svelte:component this={components[2]} {...(props_2 || {})}>\\n\\t\\t\\t\\t\\t{#if components[3]}\\n\\t\\t\\t\\t\\t\\t<svelte:component this={components[3]} {...(props_3 || {})}/>\\n\\t\\t\\t\\t\\t{/if}\\n\\t\\t\\t\\t</svelte:component>\\n\\t\\t\\t{/if}\\n\\t\\t</svelte:component>\\n\\t{/if}\\n</svelte:component>\\n\\n{#if mounted}\\n\\t<div id=\\"svelte-announcer\\" aria-live=\\"assertive\\" aria-atomic=\\"true\\">\\n\\t\\t{#if navigated}\\n\\t\\t\\t{title}\\n\\t\\t{/if}\\n\\t</div>\\n{/if}\\n\\n<style>\\n\\t#svelte-announcer {\\n\\t\\tposition: absolute;\\n\\t\\tleft: 0;\\n\\t\\ttop: 0;\\n\\t\\tclip: rect(0 0 0 0);\\n\\t\\tclip-path: inset(50%);\\n\\t\\toverflow: hidden;\\n\\t\\twhite-space: nowrap;\\n\\t\\twidth: 1px;\\n\\t\\theight: 1px;\\n\\t}\\n</style>"],"names":[],"mappings":"AA2DC,iBAAiB,eAAC,CAAC,AAClB,QAAQ,CAAE,QAAQ,CAClB,IAAI,CAAE,CAAC,CACP,GAAG,CAAE,CAAC,CACN,IAAI,CAAE,KAAK,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CACnB,SAAS,CAAE,MAAM,GAAG,CAAC,CACrB,QAAQ,CAAE,MAAM,CAChB,WAAW,CAAE,MAAM,CACnB,KAAK,CAAE,GAAG,CACV,MAAM,CAAE,GAAG,AACZ,CAAC"}`
};
var Root = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { stores } = $$props;
  let { page } = $$props;
  let { components } = $$props;
  let { props_0 = null } = $$props;
  let { props_1 = null } = $$props;
  let { props_2 = null } = $$props;
  let { props_3 = null } = $$props;
  setContext("__svelte__", stores);
  afterUpdate(stores.page.notify);
  let mounted = false;
  let navigated = false;
  let title = null;
  onMount(() => {
    const unsubscribe = stores.page.subscribe(() => {
      if (mounted) {
        navigated = true;
        title = document.title || "untitled page";
      }
    });
    mounted = true;
    return unsubscribe;
  });
  if ($$props.stores === void 0 && $$bindings.stores && stores !== void 0)
    $$bindings.stores(stores);
  if ($$props.page === void 0 && $$bindings.page && page !== void 0)
    $$bindings.page(page);
  if ($$props.components === void 0 && $$bindings.components && components !== void 0)
    $$bindings.components(components);
  if ($$props.props_0 === void 0 && $$bindings.props_0 && props_0 !== void 0)
    $$bindings.props_0(props_0);
  if ($$props.props_1 === void 0 && $$bindings.props_1 && props_1 !== void 0)
    $$bindings.props_1(props_1);
  if ($$props.props_2 === void 0 && $$bindings.props_2 && props_2 !== void 0)
    $$bindings.props_2(props_2);
  if ($$props.props_3 === void 0 && $$bindings.props_3 && props_3 !== void 0)
    $$bindings.props_3(props_3);
  $$result.css.add(css$7);
  {
    stores.page.set(page);
  }
  return `


${validate_component(components[0] || missing_component, "svelte:component").$$render($$result, Object.assign(props_0 || {}), {}, {
    default: () => `${components[1] ? `${validate_component(components[1] || missing_component, "svelte:component").$$render($$result, Object.assign(props_1 || {}), {}, {
      default: () => `${components[2] ? `${validate_component(components[2] || missing_component, "svelte:component").$$render($$result, Object.assign(props_2 || {}), {}, {
        default: () => `${components[3] ? `${validate_component(components[3] || missing_component, "svelte:component").$$render($$result, Object.assign(props_3 || {}), {}, {})}` : ``}`
      })}` : ``}`
    })}` : ``}`
  })}

${mounted ? `<div id="${"svelte-announcer"}" aria-live="${"assertive"}" aria-atomic="${"true"}" class="${"svelte-1j55zn5"}">${navigated ? `${escape2(title)}` : ``}</div>` : ``}`;
});
function set_paths(paths) {
}
function set_prerendering(value) {
}
var handle = async ({ request, resolve: resolve2 }) => {
  const cookies = import_cookie.default.parse(request.headers.cookie || "");
  request.locals.userid = cookies.userid || v4();
  if (request.query.has("_method")) {
    request.method = request.query.get("_method").toUpperCase();
  }
  const response = await resolve2(request);
  if (!cookies.userid) {
    response.headers["set-cookie"] = `userid=${request.locals.userid}; Path=/; HttpOnly`;
  }
  return response;
};
var user_hooks = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  handle
});
var template = ({ head, body }) => `<!DOCTYPE html>\r
<html lang="en">\r
	<head>\r
		<meta charset="utf-8" />\r
		<link rel="icon" href="https://tirqswyaxhrjnlhdstky.supabase.co/storage/v1/object/sign/thinkteacher/Favicon.png?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJ0aGlua3RlYWNoZXIvRmF2aWNvbi5wbmciLCJpYXQiOjE2MjUyMTc0NDQsImV4cCI6MTk0MDU3NzQ0NH0.nWu0aMGEBVPxv1Ww4dOGrNDkaOBS6BZKFn-I_Esea8I" />\r
		<meta name="viewport" content="width=device-width, initial-scale=1" />\r
\r
        <!-- Global site tag (gtag.js) - Google Analytics -->\r
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-4WDY2MMJWR"><\/script>\r
        <script>\r
            window.dataLayer = window.dataLayer || [];\r
            function gtag(){dataLayer.push(arguments);}\r
            gtag('js', new Date());\r
\r
            gtag('config', 'G-4WDY2MMJWR');\r
        <\/script>\r
\r
		` + head + '\r\n	</head>\r\n	<body>\r\n\r\n		<div id="svelte">' + body + '</div>\r\n\r\n        <script src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.9.2/dist/umd/popper.min.js" integrity="sha384-IQsoLXl5PILFhosVNubq5LC7Qb9DXgDA9i+tQ8Zj3iwWAwPtgFTxbJ8NT4GN1R8p" crossorigin="anonymous"><\/script>\r\n        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/js/bootstrap.min.js" integrity="sha384-cVKIPhGWiC2Al4u+LWgxfKTRIcfu0JTxR+EQDz/bgldoEyl4H0zUF0QKbrJ0EcQF" crossorigin="anonymous"><\/script>\r\n	</body>\r\n</html>\r\n';
var options = null;
var default_settings = { paths: { "base": "", "assets": "/." } };
function init(settings = default_settings) {
  set_paths(settings.paths);
  set_prerendering(settings.prerendering || false);
  options = {
    amp: false,
    dev: false,
    entry: {
      file: "/./_app/start-082dd1a0.js",
      css: ["/./_app/assets/start-a8cd1609.css", "/./_app/assets/vendor-83544678.css"],
      js: ["/./_app/start-082dd1a0.js", "/./_app/chunks/vendor-687c2ca1.js"]
    },
    fetched: void 0,
    floc: false,
    get_component_path: (id) => "/./_app/" + entry_lookup[id],
    get_stack: (error2) => String(error2),
    handle_error: (error2) => {
      console.error(error2.stack);
      error2.stack = options.get_stack(error2);
    },
    hooks: get_hooks(user_hooks),
    hydrate: true,
    initiator: void 0,
    load_component,
    manifest,
    paths: settings.paths,
    read: settings.read,
    root: Root,
    service_worker: null,
    router: true,
    ssr: true,
    target: "#svelte",
    template,
    trailing_slash: "never"
  };
}
var empty = () => ({});
var manifest = {
  assets: [{ "file": "robots.txt", "size": 70, "type": "text/plain" }],
  layout: "src/routes/__layout.svelte",
  error: "src/routes/__error.svelte",
  routes: [
    {
      type: "page",
      pattern: /^\/$/,
      params: empty,
      a: ["src/routes/__layout.svelte", "src/routes/index.svelte"],
      b: ["src/routes/__error.svelte"]
    },
    {
      type: "page",
      pattern: /^\/forgot-password\/?$/,
      params: empty,
      a: ["src/routes/__layout.svelte", "src/routes/forgot-password.svelte"],
      b: ["src/routes/__error.svelte"]
    },
    {
      type: "page",
      pattern: /^\/reset-password\/?$/,
      params: empty,
      a: ["src/routes/__layout.svelte", "src/routes/reset-password.svelte"],
      b: ["src/routes/__error.svelte"]
    },
    {
      type: "page",
      pattern: /^\/contact-us\/?$/,
      params: empty,
      a: ["src/routes/__layout.svelte", "src/routes/contact-us.svelte"],
      b: ["src/routes/__error.svelte"]
    },
    {
      type: "page",
      pattern: /^\/register\/?$/,
      params: empty,
      a: ["src/routes/__layout.svelte", "src/routes/register.svelte"],
      b: ["src/routes/__error.svelte"]
    },
    {
      type: "page",
      pattern: /^\/about\/?$/,
      params: empty,
      a: ["src/routes/__layout.svelte", "src/routes/about.svelte"],
      b: ["src/routes/__error.svelte"]
    },
    {
      type: "page",
      pattern: /^\/login\/?$/,
      params: empty,
      a: ["src/routes/__layout.svelte", "src/routes/login.svelte"],
      b: ["src/routes/__error.svelte"]
    },
    {
      type: "page",
      pattern: /^\/auth\/?$/,
      params: empty,
      a: ["src/routes/__layout.svelte", "src/routes/auth/__layout.svelte", "src/routes/auth/index.svelte"],
      b: ["src/routes/__error.svelte"]
    },
    {
      type: "page",
      pattern: /^\/auth\/vacancies\/?$/,
      params: empty,
      a: ["src/routes/__layout.svelte", "src/routes/auth/__layout.svelte", "src/routes/auth/vacancies.svelte"],
      b: ["src/routes/__error.svelte"]
    },
    {
      type: "page",
      pattern: /^\/auth\/profile\/?$/,
      params: empty,
      a: ["src/routes/__layout.svelte", "src/routes/auth/__layout.svelte", "src/routes/auth/profile.svelte"],
      b: ["src/routes/__error.svelte"]
    }
  ]
};
var get_hooks = (hooks) => ({
  getSession: hooks.getSession || (() => ({})),
  handle: hooks.handle || (({ request, resolve: resolve2 }) => resolve2(request)),
  serverFetch: hooks.serverFetch || void 0
});
var module_lookup = {
  "src/routes/__layout.svelte": () => Promise.resolve().then(function() {
    return __layout$1;
  }),
  "src/routes/__error.svelte": () => Promise.resolve().then(function() {
    return __error;
  }),
  "src/routes/index.svelte": () => Promise.resolve().then(function() {
    return index$1;
  }),
  "src/routes/forgot-password.svelte": () => Promise.resolve().then(function() {
    return forgotPassword;
  }),
  "src/routes/reset-password.svelte": () => Promise.resolve().then(function() {
    return resetPassword;
  }),
  "src/routes/contact-us.svelte": () => Promise.resolve().then(function() {
    return contactUs;
  }),
  "src/routes/register.svelte": () => Promise.resolve().then(function() {
    return register;
  }),
  "src/routes/about.svelte": () => Promise.resolve().then(function() {
    return about;
  }),
  "src/routes/login.svelte": () => Promise.resolve().then(function() {
    return login;
  }),
  "src/routes/auth/__layout.svelte": () => Promise.resolve().then(function() {
    return __layout;
  }),
  "src/routes/auth/index.svelte": () => Promise.resolve().then(function() {
    return index;
  }),
  "src/routes/auth/vacancies.svelte": () => Promise.resolve().then(function() {
    return vacancies;
  }),
  "src/routes/auth/profile.svelte": () => Promise.resolve().then(function() {
    return profile;
  })
};
var metadata_lookup = { "src/routes/__layout.svelte": { "entry": "/./_app/pages/__layout.svelte-47f2b250.js", "css": ["/./_app/assets/pages/__layout.svelte-29c97dff.css", "/./_app/assets/logo.svelte_svelte&type=style&lang-f5c40672.css", "/./_app/assets/vendor-83544678.css"], "js": ["/./_app/pages/__layout.svelte-47f2b250.js", "/./_app/chunks/vendor-687c2ca1.js"], "styles": null }, "src/routes/__error.svelte": { "entry": "/./_app/pages/__error.svelte-3d35c1f4.js", "css": ["/./_app/assets/vendor-83544678.css"], "js": ["/./_app/pages/__error.svelte-3d35c1f4.js", "/./_app/chunks/vendor-687c2ca1.js"], "styles": null }, "src/routes/index.svelte": { "entry": "/./_app/pages/index.svelte-0369eee4.js", "css": ["/./_app/assets/pages/index.svelte-0ecb39cc.css", "/./_app/assets/logo.svelte_svelte&type=style&lang-f5c40672.css", "/./_app/assets/vendor-83544678.css"], "js": ["/./_app/pages/index.svelte-0369eee4.js", "/./_app/chunks/vendor-687c2ca1.js"], "styles": null }, "src/routes/forgot-password.svelte": { "entry": "/./_app/pages/forgot-password.svelte-1ceae42a.js", "css": ["/./_app/assets/vendor-83544678.css"], "js": ["/./_app/pages/forgot-password.svelte-1ceae42a.js", "/./_app/chunks/vendor-687c2ca1.js"], "styles": null }, "src/routes/reset-password.svelte": { "entry": "/./_app/pages/reset-password.svelte-685f248c.js", "css": ["/./_app/assets/vendor-83544678.css"], "js": ["/./_app/pages/reset-password.svelte-685f248c.js", "/./_app/chunks/vendor-687c2ca1.js"], "styles": null }, "src/routes/contact-us.svelte": { "entry": "/./_app/pages/contact-us.svelte-70f0812f.js", "css": ["/./_app/assets/vendor-83544678.css"], "js": ["/./_app/pages/contact-us.svelte-70f0812f.js", "/./_app/chunks/vendor-687c2ca1.js"], "styles": null }, "src/routes/register.svelte": { "entry": "/./_app/pages/register.svelte-6e2b4e58.js", "css": ["/./_app/assets/vendor-83544678.css"], "js": ["/./_app/pages/register.svelte-6e2b4e58.js", "/./_app/chunks/vendor-687c2ca1.js"], "styles": null }, "src/routes/about.svelte": { "entry": "/./_app/pages/about.svelte-a7b8622c.js", "css": ["/./_app/assets/pages/about.svelte-1df7c761.css", "/./_app/assets/vendor-83544678.css"], "js": ["/./_app/pages/about.svelte-a7b8622c.js", "/./_app/chunks/vendor-687c2ca1.js"], "styles": null }, "src/routes/login.svelte": { "entry": "/./_app/pages/login.svelte-9e493fbe.js", "css": ["/./_app/assets/vendor-83544678.css"], "js": ["/./_app/pages/login.svelte-9e493fbe.js", "/./_app/chunks/vendor-687c2ca1.js"], "styles": null }, "src/routes/auth/__layout.svelte": { "entry": "/./_app/pages/auth/__layout.svelte-94547f2f.js", "css": ["/./_app/assets/vendor-83544678.css"], "js": ["/./_app/pages/auth/__layout.svelte-94547f2f.js", "/./_app/chunks/vendor-687c2ca1.js"], "styles": null }, "src/routes/auth/index.svelte": { "entry": "/./_app/pages/auth/index.svelte-c400dd0d.js", "css": ["/./_app/assets/vendor-83544678.css"], "js": ["/./_app/pages/auth/index.svelte-c400dd0d.js", "/./_app/chunks/vendor-687c2ca1.js"], "styles": null }, "src/routes/auth/vacancies.svelte": { "entry": "/./_app/pages/auth/vacancies.svelte-bca317c0.js", "css": ["/./_app/assets/vendor-83544678.css"], "js": ["/./_app/pages/auth/vacancies.svelte-bca317c0.js", "/./_app/chunks/vendor-687c2ca1.js"], "styles": null }, "src/routes/auth/profile.svelte": { "entry": "/./_app/pages/auth/profile.svelte-c02e6975.js", "css": ["/./_app/assets/vendor-83544678.css"], "js": ["/./_app/pages/auth/profile.svelte-c02e6975.js", "/./_app/chunks/vendor-687c2ca1.js"], "styles": null } };
async function load_component(file) {
  return {
    module: await module_lookup[file](),
    ...metadata_lookup[file]
  };
}
function render(request, {
  prerender: prerender2
} = {}) {
  const host = request.headers["host"];
  return respond({ ...request, host }, options, { prerender: prerender2 });
}
var css$6 = {
  code: "@media screen and (min-width: 992px){li.svelte-xb6lmd{font-size:1.3em;font-weight:500}a.svelte-xb6lmd{display:inline-block;line-height:2.8rem;width:auto}a.svelte-xb6lmd:after{display:block;content:'';border-bottom:solid 3px var(--logo-blue);transform:scaleX(0);transition:transform 250ms ease-in-out}a.fromLeft.svelte-xb6lmd:after{transform-origin:100% 50%}a.fromLeft.svelte-xb6lmd:hover:after{transform:scaleX(1);transform-origin:0% 50%}.hidden-md.svelte-xb6lmd{display:none}}@media screen and (max-width: 992px){img.svelte-xb6lmd{max-width:80px;height:auto}a.svelte-xb6lmd{font-size:1.2em;display:inline-block;line-height:3rem;width:auto;text-align:center}}nav.svelte-xb6lmd{border-bottom:var(--logo-orange) 2px solid}",
  map: `{"version":3,"file":"index.svelte","sources":["index.svelte"],"sourcesContent":["<script>\\r\\n<\/script>\\r\\n\\r\\n<nav class=\\"navbar navbar-expand-lg navbar-light bg-light\\">\\r\\n    <div class=\\"container-fluid justify-content-center\\">\\r\\n        <a class=\\"navbar-brand hidden-md\\" href=\\"/\\">Think Teacher</a>\\r\\n        <button class=\\"navbar-toggler\\" type=\\"button\\" data-bs-toggle=\\"collapse\\" data-bs-target=\\"#navbar\\" aria-controls=\\"navbar\\" aria-expanded=\\"false\\" aria-label=\\"Toggle navigation\\">\\r\\n            <span class=\\"navbar-toggler-icon\\"></span>\\r\\n        </button>\\r\\n        <div class=\\"collapse navbar-collapse\\" id=\\"navbar\\">\\r\\n            <ul class=\\"navbar-nav nav-fill me-auto w-100\\">\\r\\n                <li class=\\"nav-item pt-lg-3\\">\\r\\n                    <a style=\\"width: 10vw;\\" class=\\"nav-link fromLeft\\" sveltekit:prefetch href=\\"/about\\">About</a>\\r\\n                </li>\\r\\n                <li class=\\"nav-item pt-lg-3\\">\\r\\n                    <a style=\\"width: 10vw;\\" class=\\"nav-link fromLeft\\" href=\\"/register\\">Register</a>\\r\\n                </li>\\r\\n                <a class=\\"navbar-brand\\" sveltekit:prefetch href=\\"/\\">\\r\\n                    <img src=\\"https://tirqswyaxhrjnlhdstky.supabase.co/storage/v1/object/sign/thinkteacher/Favicon.png?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJ0aGlua3RlYWNoZXIvRmF2aWNvbi5wbmciLCJpYXQiOjE2MjU1Nzc1MDEsImV4cCI6MTk0MDkzNzUwMX0.awqc470jnyg9IidstlVNYoFdUNmYY6jFbJcHvNm8Nxg\\" alt=\\"ThinkTeacher logo\\" width=\\"100\\" height=\\"100\\" class=\\"center block d-inline-block align-text-center\\">\\r\\n                </a>\\r\\n                <li class=\\"nav-item pt-lg-3\\">\\r\\n                    <a style=\\"width: 10vw;\\" class=\\"nav-link fromLeft\\" href=\\"/login\\">Login</a>\\r\\n                </li>\\r\\n                <li class=\\"nav-item pt-lg-3\\">\\r\\n                    <a style=\\"width: 10vw;\\" class=\\"nav-link fromLeft\\" href=\\"/contact-us\\">Contact</a>\\r\\n                </li>\\r\\n            </ul>\\r\\n        </div>\\r\\n    </div>\\r\\n</nav>\\r\\n\\r\\n<style>\\r\\n\\r\\n    @media screen and (min-width: 992px) {\\r\\n        li {\\r\\n            font-size: 1.3em;\\r\\n            font-weight: 500;\\r\\n        }\\r\\n        a {\\r\\n            display: inline-block;\\r\\n            line-height: 2.8rem;\\r\\n            width: auto;\\r\\n        }\\r\\n        a:after {\\r\\n            display:block;\\r\\n            content: '';\\r\\n            border-bottom: solid 3px var(--logo-blue);\\r\\n            transform: scaleX(0);  \\r\\n            transition: transform 250ms ease-in-out;\\r\\n        }\\r\\n        a.fromLeft:after{ transform-origin: 100% 50%; }\\r\\n        a.fromLeft:hover:after{ transform: scaleX(1); transform-origin:   0% 50%; }\\r\\n        \\r\\n        .hidden-md {\\r\\n            display: none;\\r\\n        }\\r\\n    }\\r\\n\\r\\n    @media screen and (max-width: 992px) {\\r\\n        img {\\r\\n            max-width: 80px;\\r\\n            height: auto;\\r\\n        }\\r\\n        a {\\r\\n            font-size: 1.2em;\\r\\n            display: inline-block;\\r\\n            line-height: 3rem;\\r\\n            width: auto;\\r\\n            text-align: center;\\r\\n        }\\r\\n    }\\r\\n\\r\\n    nav {\\r\\n        border-bottom: var(--logo-orange) 2px solid;\\r\\n    }\\r\\n</style>\\r\\n"],"names":[],"mappings":"AAiCI,OAAO,MAAM,CAAC,GAAG,CAAC,YAAY,KAAK,CAAC,AAAC,CAAC,AAClC,EAAE,cAAC,CAAC,AACA,SAAS,CAAE,KAAK,CAChB,WAAW,CAAE,GAAG,AACpB,CAAC,AACD,CAAC,cAAC,CAAC,AACC,OAAO,CAAE,YAAY,CACrB,WAAW,CAAE,MAAM,CACnB,KAAK,CAAE,IAAI,AACf,CAAC,AACD,eAAC,MAAM,AAAC,CAAC,AACL,QAAQ,KAAK,CACb,OAAO,CAAE,EAAE,CACX,aAAa,CAAE,KAAK,CAAC,GAAG,CAAC,IAAI,WAAW,CAAC,CACzC,SAAS,CAAE,OAAO,CAAC,CAAC,CACpB,UAAU,CAAE,SAAS,CAAC,KAAK,CAAC,WAAW,AAC3C,CAAC,AACD,CAAC,uBAAS,MAAM,CAAC,AAAC,gBAAgB,CAAE,IAAI,CAAC,GAAG,AAAE,CAAC,AAC/C,CAAC,uBAAS,MAAM,MAAM,CAAC,AAAC,SAAS,CAAE,OAAO,CAAC,CAAC,CAAE,gBAAgB,CAAI,EAAE,CAAC,GAAG,AAAE,CAAC,AAE3E,UAAU,cAAC,CAAC,AACR,OAAO,CAAE,IAAI,AACjB,CAAC,AACL,CAAC,AAED,OAAO,MAAM,CAAC,GAAG,CAAC,YAAY,KAAK,CAAC,AAAC,CAAC,AAClC,GAAG,cAAC,CAAC,AACD,SAAS,CAAE,IAAI,CACf,MAAM,CAAE,IAAI,AAChB,CAAC,AACD,CAAC,cAAC,CAAC,AACC,SAAS,CAAE,KAAK,CAChB,OAAO,CAAE,YAAY,CACrB,WAAW,CAAE,IAAI,CACjB,KAAK,CAAE,IAAI,CACX,UAAU,CAAE,MAAM,AACtB,CAAC,AACL,CAAC,AAED,GAAG,cAAC,CAAC,AACD,aAAa,CAAE,IAAI,aAAa,CAAC,CAAC,GAAG,CAAC,KAAK,AAC/C,CAAC"}`
};
var Header = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  $$result.css.add(css$6);
  return `<nav class="${"navbar navbar-expand-lg navbar-light bg-light svelte-xb6lmd"}"><div class="${"container-fluid justify-content-center"}"><a class="${"navbar-brand hidden-md svelte-xb6lmd"}" href="${"/"}">Think Teacher</a>
        <button class="${"navbar-toggler"}" type="${"button"}" data-bs-toggle="${"collapse"}" data-bs-target="${"#navbar"}" aria-controls="${"navbar"}" aria-expanded="${"false"}" aria-label="${"Toggle navigation"}"><span class="${"navbar-toggler-icon"}"></span></button>
        <div class="${"collapse navbar-collapse"}" id="${"navbar"}"><ul class="${"navbar-nav nav-fill me-auto w-100"}"><li class="${"nav-item pt-lg-3 svelte-xb6lmd"}"><a style="${"width: 10vw;"}" class="${"nav-link fromLeft svelte-xb6lmd"}" sveltekit:prefetch href="${"/about"}">About</a></li>
                <li class="${"nav-item pt-lg-3 svelte-xb6lmd"}"><a style="${"width: 10vw;"}" class="${"nav-link fromLeft svelte-xb6lmd"}" href="${"/register"}">Register</a></li>
                <a class="${"navbar-brand svelte-xb6lmd"}" sveltekit:prefetch href="${"/"}"><img src="${"https://tirqswyaxhrjnlhdstky.supabase.co/storage/v1/object/sign/thinkteacher/Favicon.png?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJ0aGlua3RlYWNoZXIvRmF2aWNvbi5wbmciLCJpYXQiOjE2MjU1Nzc1MDEsImV4cCI6MTk0MDkzNzUwMX0.awqc470jnyg9IidstlVNYoFdUNmYY6jFbJcHvNm8Nxg"}" alt="${"ThinkTeacher logo"}" width="${"100"}" height="${"100"}" class="${"center block d-inline-block align-text-center svelte-xb6lmd"}"></a>
                <li class="${"nav-item pt-lg-3 svelte-xb6lmd"}"><a style="${"width: 10vw;"}" class="${"nav-link fromLeft svelte-xb6lmd"}" href="${"/login"}">Login</a></li>
                <li class="${"nav-item pt-lg-3 svelte-xb6lmd"}"><a style="${"width: 10vw;"}" class="${"nav-link fromLeft svelte-xb6lmd"}" href="${"/contact-us"}">Contact</a></li></ul></div></div>
</nav>`;
});
var Path = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { id = "" } = $$props;
  let { data = {} } = $$props;
  if ($$props.id === void 0 && $$bindings.id && id !== void 0)
    $$bindings.id(id);
  if ($$props.data === void 0 && $$bindings.data && data !== void 0)
    $$bindings.data(data);
  return `<path${spread([{ key: "path-" + escape2(id) }, escape_object(data)])}></path>`;
});
var Polygon = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { id = "" } = $$props;
  let { data = {} } = $$props;
  if ($$props.id === void 0 && $$bindings.id && id !== void 0)
    $$bindings.id(id);
  if ($$props.data === void 0 && $$bindings.data && data !== void 0)
    $$bindings.data(data);
  return `<polygon${spread([{ key: "polygon-" + escape2(id) }, escape_object(data)])}></polygon>`;
});
var Raw = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let cursor = 870711;
  function getId() {
    cursor += 1;
    return `fa-${cursor.toString(16)}`;
  }
  let raw;
  let { data } = $$props;
  function getRaw(data2) {
    if (!data2 || !data2.raw) {
      return null;
    }
    let rawData = data2.raw;
    const ids = {};
    rawData = rawData.replace(/\s(?:xml:)?id=["']?([^"')\s]+)/g, (match, id) => {
      const uniqueId = getId();
      ids[id] = uniqueId;
      return ` id="${uniqueId}"`;
    });
    rawData = rawData.replace(/#(?:([^'")\s]+)|xpointer\(id\((['"]?)([^')]+)\2\)\))/g, (match, rawId, _, pointerId) => {
      const id = rawId || pointerId;
      if (!id || !ids[id]) {
        return match;
      }
      return `#${ids[id]}`;
    });
    return rawData;
  }
  if ($$props.data === void 0 && $$bindings.data && data !== void 0)
    $$bindings.data(data);
  raw = getRaw(data);
  return `<g><!-- HTML_TAG_START -->${raw}<!-- HTML_TAG_END --></g>`;
});
var css$5 = {
  code: ".fa-icon.svelte-1dof0an{display:inline-block;fill:currentColor}.fa-flip-horizontal.svelte-1dof0an{transform:scale(-1, 1)}.fa-flip-vertical.svelte-1dof0an{transform:scale(1, -1)}.fa-spin.svelte-1dof0an{animation:svelte-1dof0an-fa-spin 1s 0s infinite linear}.fa-inverse.svelte-1dof0an{color:#fff}.fa-pulse.svelte-1dof0an{animation:svelte-1dof0an-fa-spin 1s infinite steps(8)}@keyframes svelte-1dof0an-fa-spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}",
  map: `{"version":3,"file":"Svg.svelte","sources":["Svg.svelte"],"sourcesContent":["<svg version=\\"1.1\\" class=\\"fa-icon {className}\\"\\n  class:fa-spin={spin} class:fa-pulse={pulse} class:fa-inverse={inverse}\\n  class:fa-flip-horizontal=\\"{flip === 'horizontal'}\\" class:fa-flip-vertical=\\"{flip === 'vertical'}\\"\\n  {x} {y} {width} {height}\\n  aria-label={label}\\n  role=\\"{ label ? 'img' : 'presentation' }\\"\\n  viewBox={box} {style}\\n  >\\n  <slot></slot>\\n</svg>\\n\\n<style>\\n.fa-icon {\\n  display: inline-block;\\n  fill: currentColor;\\n}\\n.fa-flip-horizontal {\\n  transform: scale(-1, 1);\\n}\\n.fa-flip-vertical {\\n  transform: scale(1, -1);\\n}\\n.fa-spin {\\n  animation: fa-spin 1s 0s infinite linear;\\n}\\n.fa-inverse {\\n  color: #fff;\\n}\\n.fa-pulse {\\n  animation: fa-spin 1s infinite steps(8);\\n}\\n@keyframes fa-spin {\\n  0% {\\n    transform: rotate(0deg);\\n  }\\n  100% {\\n    transform: rotate(360deg);\\n  }\\n}\\n</style>\\n\\n<script>\\n  let className;\\n\\n  export { className as class };\\n\\n  export let width;\\n  export let height;\\n  export let box;\\n\\n  export let spin = false;\\n  export let inverse = false;\\n  export let pulse = false;\\n  export let flip = null;\\n\\n  // optionals\\n  export let x = undefined;\\n  export let y = undefined;\\n  export let style = undefined;\\n  export let label = undefined;\\n<\/script>\\n"],"names":[],"mappings":"AAYA,QAAQ,eAAC,CAAC,AACR,OAAO,CAAE,YAAY,CACrB,IAAI,CAAE,YAAY,AACpB,CAAC,AACD,mBAAmB,eAAC,CAAC,AACnB,SAAS,CAAE,MAAM,EAAE,CAAC,CAAC,CAAC,CAAC,AACzB,CAAC,AACD,iBAAiB,eAAC,CAAC,AACjB,SAAS,CAAE,MAAM,CAAC,CAAC,CAAC,EAAE,CAAC,AACzB,CAAC,AACD,QAAQ,eAAC,CAAC,AACR,SAAS,CAAE,sBAAO,CAAC,EAAE,CAAC,EAAE,CAAC,QAAQ,CAAC,MAAM,AAC1C,CAAC,AACD,WAAW,eAAC,CAAC,AACX,KAAK,CAAE,IAAI,AACb,CAAC,AACD,SAAS,eAAC,CAAC,AACT,SAAS,CAAE,sBAAO,CAAC,EAAE,CAAC,QAAQ,CAAC,MAAM,CAAC,CAAC,AACzC,CAAC,AACD,WAAW,sBAAQ,CAAC,AAClB,EAAE,AAAC,CAAC,AACF,SAAS,CAAE,OAAO,IAAI,CAAC,AACzB,CAAC,AACD,IAAI,AAAC,CAAC,AACJ,SAAS,CAAE,OAAO,MAAM,CAAC,AAC3B,CAAC,AACH,CAAC"}`
};
var Svg = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { class: className } = $$props;
  let { width } = $$props;
  let { height } = $$props;
  let { box } = $$props;
  let { spin = false } = $$props;
  let { inverse = false } = $$props;
  let { pulse = false } = $$props;
  let { flip = null } = $$props;
  let { x = void 0 } = $$props;
  let { y = void 0 } = $$props;
  let { style = void 0 } = $$props;
  let { label = void 0 } = $$props;
  if ($$props.class === void 0 && $$bindings.class && className !== void 0)
    $$bindings.class(className);
  if ($$props.width === void 0 && $$bindings.width && width !== void 0)
    $$bindings.width(width);
  if ($$props.height === void 0 && $$bindings.height && height !== void 0)
    $$bindings.height(height);
  if ($$props.box === void 0 && $$bindings.box && box !== void 0)
    $$bindings.box(box);
  if ($$props.spin === void 0 && $$bindings.spin && spin !== void 0)
    $$bindings.spin(spin);
  if ($$props.inverse === void 0 && $$bindings.inverse && inverse !== void 0)
    $$bindings.inverse(inverse);
  if ($$props.pulse === void 0 && $$bindings.pulse && pulse !== void 0)
    $$bindings.pulse(pulse);
  if ($$props.flip === void 0 && $$bindings.flip && flip !== void 0)
    $$bindings.flip(flip);
  if ($$props.x === void 0 && $$bindings.x && x !== void 0)
    $$bindings.x(x);
  if ($$props.y === void 0 && $$bindings.y && y !== void 0)
    $$bindings.y(y);
  if ($$props.style === void 0 && $$bindings.style && style !== void 0)
    $$bindings.style(style);
  if ($$props.label === void 0 && $$bindings.label && label !== void 0)
    $$bindings.label(label);
  $$result.css.add(css$5);
  return `<svg version="${"1.1"}" class="${[
    "fa-icon " + escape2(className) + " svelte-1dof0an",
    (spin ? "fa-spin" : "") + " " + (pulse ? "fa-pulse" : "") + " " + (inverse ? "fa-inverse" : "") + " " + (flip === "horizontal" ? "fa-flip-horizontal" : "") + " " + (flip === "vertical" ? "fa-flip-vertical" : "")
  ].join(" ").trim()}"${add_attribute("x", x, 0)}${add_attribute("y", y, 0)}${add_attribute("width", width, 0)}${add_attribute("height", height, 0)}${add_attribute("aria-label", label, 0)}${add_attribute("role", label ? "img" : "presentation", 0)}${add_attribute("viewBox", box, 0)}${add_attribute("style", style, 0)}>${slots.default ? slots.default({}) : ``}</svg>`;
});
var outerScale = 1;
function normaliseData(data) {
  if ("iconName" in data && "icon" in data) {
    let normalisedData = {};
    let faIcon = data.icon;
    let name = data.iconName;
    let width = faIcon[0];
    let height = faIcon[1];
    let paths = faIcon[4];
    let iconData = { width, height, paths: [{ d: paths }] };
    normalisedData[name] = iconData;
    return normalisedData;
  }
  return data;
}
var Icon = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { class: className = "" } = $$props;
  let { data } = $$props;
  let { scale = 1 } = $$props;
  let { spin = false } = $$props;
  let { inverse = false } = $$props;
  let { pulse = false } = $$props;
  let { flip = null } = $$props;
  let { label = null } = $$props;
  let { self = null } = $$props;
  let { style = null } = $$props;
  let width;
  let height;
  let combinedStyle;
  let box;
  function init2() {
    if (typeof data === "undefined") {
      return;
    }
    const normalisedData = normaliseData(data);
    const [name] = Object.keys(normalisedData);
    const icon = normalisedData[name];
    if (!icon.paths) {
      icon.paths = [];
    }
    if (icon.d) {
      icon.paths.push({ d: icon.d });
    }
    if (!icon.polygons) {
      icon.polygons = [];
    }
    if (icon.points) {
      icon.polygons.push({ points: icon.points });
    }
    self = icon;
  }
  function normalisedScale() {
    let numScale = 1;
    if (typeof scale !== "undefined") {
      numScale = Number(scale);
    }
    if (isNaN(numScale) || numScale <= 0) {
      console.warn('Invalid prop: prop "scale" should be a number over 0.');
      return outerScale;
    }
    return numScale * outerScale;
  }
  function calculateBox() {
    if (self) {
      return `0 0 ${self.width} ${self.height}`;
    }
    return `0 0 ${width} ${height}`;
  }
  function calculateRatio() {
    if (!self) {
      return 1;
    }
    return Math.max(self.width, self.height) / 16;
  }
  function calculateWidth() {
    if (self) {
      return self.width / calculateRatio() * normalisedScale();
    }
    return 0;
  }
  function calculateHeight() {
    if (self) {
      return self.height / calculateRatio() * normalisedScale();
    }
    return 0;
  }
  function calculateStyle() {
    let combined = "";
    if (style !== null) {
      combined += style;
    }
    let size = normalisedScale();
    if (size === 1) {
      if (combined.length === 0) {
        return void 0;
      }
      return combined;
    }
    if (combined !== "" && !combined.endsWith(";")) {
      combined += "; ";
    }
    return `${combined}font-size: ${size}em`;
  }
  if ($$props.class === void 0 && $$bindings.class && className !== void 0)
    $$bindings.class(className);
  if ($$props.data === void 0 && $$bindings.data && data !== void 0)
    $$bindings.data(data);
  if ($$props.scale === void 0 && $$bindings.scale && scale !== void 0)
    $$bindings.scale(scale);
  if ($$props.spin === void 0 && $$bindings.spin && spin !== void 0)
    $$bindings.spin(spin);
  if ($$props.inverse === void 0 && $$bindings.inverse && inverse !== void 0)
    $$bindings.inverse(inverse);
  if ($$props.pulse === void 0 && $$bindings.pulse && pulse !== void 0)
    $$bindings.pulse(pulse);
  if ($$props.flip === void 0 && $$bindings.flip && flip !== void 0)
    $$bindings.flip(flip);
  if ($$props.label === void 0 && $$bindings.label && label !== void 0)
    $$bindings.label(label);
  if ($$props.self === void 0 && $$bindings.self && self !== void 0)
    $$bindings.self(self);
  if ($$props.style === void 0 && $$bindings.style && style !== void 0)
    $$bindings.style(style);
  let $$settled;
  let $$rendered;
  do {
    $$settled = true;
    {
      {
        init2();
        width = calculateWidth();
        height = calculateHeight();
        combinedStyle = calculateStyle();
        box = calculateBox();
      }
    }
    $$rendered = `${validate_component(Svg, "Svg").$$render($$result, {
      label,
      width,
      height,
      box,
      style: combinedStyle,
      spin,
      flip,
      inverse,
      pulse,
      class: className
    }, {}, {
      default: () => `${slots.default ? slots.default({}) : `
    ${self ? `${self.paths ? `${each(self.paths, (path, i) => `${validate_component(Path, "Path").$$render($$result, { id: i, data: path }, {}, {})}`)}` : ``}
      ${self.polygons ? `${each(self.polygons, (polygon, i) => `${validate_component(Polygon, "Polygon").$$render($$result, { id: i, data: polygon }, {}, {})}`)}` : ``}
      ${self.raw ? `${validate_component(Raw, "Raw").$$render($$result, { data: self }, {
        data: ($$value) => {
          self = $$value;
          $$settled = false;
        }
      }, {})}` : ``}` : ``}
  `}`
    })}`;
  } while (!$$settled);
  return $$rendered;
});
var linkedinSquare = { "linkedin-square": { width: 1536, height: 1792, paths: [{ d: "M237 1414h231v-694h-231v694zM483 506q-1-52-36-86t-93-34-94.5 34-36.5 86q0 51 35.5 85.5t92.5 34.5h1q59 0 95-34.5t36-85.5zM1068 1414h231v-398q0-154-73-233t-193-79q-136 0-209 117h2v-101h-231q3 66 0 694h231v-388q0-38 7-56 15-35 45-59.5t74-24.5q116 0 116 157v371zM1536 416v960q0 119-84.5 203.5t-203.5 84.5h-960q-119 0-203.5-84.5t-84.5-203.5v-960q0-119 84.5-203.5t203.5-84.5h960q119 0 203.5 84.5t84.5 203.5z" }] } };
var twitter = { twitter: { width: 1664, height: 1792, paths: [{ d: "M1620 408q-67 98-162 167 1 14 1 42 0 130-38 259.5t-115.5 248.5-184.5 210.5-258 146-323 54.5q-271 0-496-145 35 4 78 4 225 0 401-138-105-2-188-64.5t-114-159.5q33 5 61 5 43 0 85-11-112-23-185.5-111.5t-73.5-205.5v-4q68 38 146 41-66-44-105-115t-39-154q0-88 44-163 121 149 294.5 238.5t371.5 99.5q-8-38-8-74 0-134 94.5-228.5t228.5-94.5q140 0 236 102 109-21 205-78-37 115-142 178 93-10 186-50z" }] } };
var facebook = { facebook: { width: 1024, height: 1792, paths: [{ d: "M959 12v264h-157q-86 0-116 36t-30 108v189h293l-39 296h-254v759h-306v-759h-255v-296h255v-218q0-186 104-288.5t277-102.5q147 0 228 12z" }] } };
var linkedin = { linkedin: { width: 1536, height: 1792, paths: [{ d: "M349 625v991h-330v-991h330zM370 319q1 73-50.5 122t-135.5 49h-2q-82 0-132-49t-50-122q0-74 51.5-122.5t134.5-48.5 133 48.5 51 122.5zM1536 1048v568h-329v-530q0-105-40.5-164.5t-126.5-59.5q-63 0-105.5 34.5t-63.5 85.5q-11 30-11 81v553h-329q2-399 2-647t-1-296l-1-48h329v144h-2q20-32 41-56t56.5-52 87-43.5 114.5-15.5q171 0 275 113.5t104 332.5z" }] } };
var instagram = { instagram: { width: 1536, height: 1792, paths: [{ d: "M1024 896q0-106-75-181t-181-75-181 75-75 181 75 181 181 75 181-75 75-181zM1162 896q0 164-115 279t-279 115-279-115-115-279 115-279 279-115 279 115 115 279zM1270 486q0 38-27 65t-65 27-65-27-27-65 27-65 65-27 65 27 27 65zM768 266q-7 0-76.5-0.5t-105.5 0-96.5 3-103 10-71.5 18.5q-50 20-88 58t-58 88q-11 29-18.5 71.5t-10 103-3 96.5 0 105.5 0.5 76.5-0.5 76.5 0 105.5 3 96.5 10 103 18.5 71.5q20 50 58 88t88 58q29 11 71.5 18.5t103 10 96.5 3 105.5 0 76.5-0.5 76.5 0.5 105.5 0 96.5-3 103-10 71.5-18.5q50-20 88-58t58-88q11-29 18.5-71.5t10-103 3-96.5 0-105.5-0.5-76.5 0.5-76.5 0-105.5-3-96.5-10-103-18.5-71.5q-20-50-58-88t-88-58q-29-11-71.5-18.5t-103-10-96.5-3-105.5 0-76.5 0.5zM1536 896q0 229-5 317-10 208-124 322t-322 124q-88 5-317 5t-317-5q-208-10-322-124t-124-322q-5-88-5-317t5-317q10-208 124-322t322-124q88-5 317-5t317 5q208 10 322 124t124 322q5 88 5 317z" }] } };
var css$4 = {
  code: "h5.svelte-jvjuir.svelte-jvjuir,p.svelte-jvjuir.svelte-jvjuir{color:var(--default-text)}section.svelte-jvjuir>.btn-outline-light.svelte-jvjuir{border-color:var(--logo-orange)}",
  map: `{"version":3,"file":"index.svelte","sources":["index.svelte"],"sourcesContent":["<script>\\r\\n    import Icon from 'svelte-awesome';\\r\\n    import { facebook, twitter, instagram, linkedin } from 'svelte-awesome/icons';\\r\\n\\r\\n    function toTop(){\\r\\n        window.scrollTo({\\r\\n            top: 0,\\r\\n            left: 0,\\r\\n            behavior: 'smooth'\\r\\n        })\\r\\n    }\\r\\n<\/script>\\r\\n\\r\\n<footer class=\\"bg-dark text-center text-black mt-5\\">\\r\\n    <div class=\\"container-fluid p-4\\">\\r\\n      <section class=\\"mb-4\\">\\r\\n        <!-- Facebook -->\\r\\n        <a class=\\"btn btn-outline-light btn-floating m-1\\" href=\\"#!\\" role=\\"button\\"><Icon data={facebook} scale=\\"1.8\\"/></a>  \\r\\n        <!-- Twitter -->\\r\\n        <a class=\\"btn btn-outline-light btn-floating m-1\\" href=\\"#!\\" role=\\"button\\"><Icon data={twitter} scale=\\"1.8\\"/></a>\\r\\n        <!-- Instagram -->\\r\\n        <a class=\\"btn btn-outline-light btn-floating m-1\\" href=\\"#!\\" role=\\"button\\"><Icon data={instagram} scale=\\"1.8\\"/></a>\\r\\n        <!-- Linkedin -->\\r\\n        <a class=\\"btn btn-outline-light btn-floating m-1\\" href=\\"#!\\" role=\\"button\\"><Icon data={linkedin} scale=\\"1.8\\"/></a>\\r\\n      </section>\\r\\n  \\r\\n      <!-- Section: Text -->\\r\\n      <section class=\\"mb-4\\">\\r\\n        <p>\\r\\n          Lorem ipsum dolor sit amet consectetur adipisicing elit. Sunt distinctio earum\\r\\n          repellat quaerat voluptatibus placeat nam, commodi optio pariatur est quia magnam\\r\\n          eum harum corrupti dicta, aliquam sequi voluptate quas.\\r\\n        </p>\\r\\n      </section>\\r\\n  \\r\\n      <!-- Section: Links -->\\r\\n      <section class=\\"\\">\\r\\n        <!--Grid row-->\\r\\n        <div class=\\"row\\">\\r\\n          <!--Grid column-->\\r\\n            <div class=\\"col-lg-3 col-md-6 mb-4 mb-md-0\\">\\r\\n                <h5 class=\\"text-uppercase\\">Socials</h5>\\r\\n    \\r\\n                <ul class=\\"list-unstyled mb-0\\">\\r\\n                    <li>\\r\\n                        <a href=\\"#!\\" class=\\"text-white\\">Facebook</a>\\r\\n                    </li>\\r\\n                    <li>\\r\\n                        <a href=\\"#!\\" class=\\"text-white\\">Twitter</a>\\r\\n                    </li>\\r\\n                    <li>\\r\\n                        <a href=\\"#!\\" class=\\"text-white\\">Instagram</a>\\r\\n                    </li>\\r\\n                    <li>\\r\\n                        <a href=\\"#!\\" class=\\"text-white\\">Linkedin</a>\\r\\n                    </li>\\r\\n                    </ul>\\r\\n            </div>\\r\\n\\r\\n            <div class=\\"col-lg-3 col-md-6 mb-4 mb-md-0\\">\\r\\n                <h5 class=\\"text-uppercase\\">Useful Links</h5>\\r\\n    \\r\\n                <ul class=\\"list-unstyled mb-0\\">\\r\\n                    <li>\\r\\n                        <a href=\\"/login\\" class=\\"text-white\\">Login</a>\\r\\n                    </li>\\r\\n                    <li>\\r\\n                        <a href=\\"/forgot-password\\" class=\\"text-white\\">Forgot Password</a>\\r\\n                    </li>\\r\\n                    <li>\\r\\n                        <a href=\\"/register\\" class=\\"text-white\\">Register</a>\\r\\n                    </li>\\r\\n                    <li>\\r\\n                        <a href=\\"/contact\\" class=\\"text-white\\">Contact</a>\\r\\n                    </li>\\r\\n                </ul>\\r\\n            </div>\\r\\n\\r\\n            <div class=\\"col-lg-3 col-md-6 mb-4 mb-md-0\\">\\r\\n                <h5 class=\\"text-uppercase\\">Legal</h5>\\r\\n    \\r\\n                <ul class=\\"list-unstyled mb-0\\">\\r\\n                    <li>\\r\\n                        <a href=\\"#!\\" class=\\"text-white\\">Privacy Policy</a>\\r\\n                    </li>\\r\\n                    <li>\\r\\n                        <a href=\\"#!\\" class=\\"text-white\\">Link 2</a>\\r\\n                    </li>\\r\\n                    <li>\\r\\n                        <a href=\\"#!\\" class=\\"text-white\\">Link 3</a>\\r\\n                    </li>\\r\\n                </ul>\\r\\n            </div>\\r\\n\\r\\n            <div class=\\"col-lg-3 col-md-6 mb-4 mb-md-0\\">\\r\\n                <button class=\\"mt-3 btn btn-outline-light px-2\\" on:click={toTop}>Scroll to top</button>\\r\\n            </div>\\r\\n            </div>\\r\\n        </section>\\r\\n    </div>\\r\\n  \\r\\n    <!-- Copyright -->\\r\\n    <div class=\\"text-center p-2\\" style=\\"background-color: var(--logo-blue);\\">\\r\\n      \xA9 2021 Copyright:\\r\\n      <a class=\\"text-white\\" href=\\"https://thinkteacher.co.za\\">Think Teacher</a>\\r\\n      <!-- <a class=\\"text-white\\" href=\\"https://splyce.dev\\">Designed: Splyce</a> -->\\r\\n    </div>\\r\\n</footer>\\r\\n\\r\\n<style>\\r\\n    h5, p {\\r\\n        color: var(--default-text);\\r\\n    }\\r\\n    section > .btn-outline-light{\\r\\n        border-color: var(--logo-orange);\\r\\n    }\\r\\n</style>\\r\\n"],"names":[],"mappings":"AA8GI,8BAAE,CAAE,CAAC,4BAAC,CAAC,AACH,KAAK,CAAE,IAAI,cAAc,CAAC,AAC9B,CAAC,AACD,qBAAO,CAAG,gCAAkB,CAAC,AACzB,YAAY,CAAE,IAAI,aAAa,CAAC,AACpC,CAAC"}`
};
var Footer = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  $$result.css.add(css$4);
  return `<footer class="${"bg-dark text-center text-black mt-5"}"><div class="${"container-fluid p-4"}"><section class="${"mb-4 svelte-jvjuir"}">
        <a class="${"btn btn-outline-light btn-floating m-1 svelte-jvjuir"}" href="${"#!"}" role="${"button"}">${validate_component(Icon, "Icon").$$render($$result, { data: facebook, scale: "1.8" }, {}, {})}</a>  
        
        <a class="${"btn btn-outline-light btn-floating m-1 svelte-jvjuir"}" href="${"#!"}" role="${"button"}">${validate_component(Icon, "Icon").$$render($$result, { data: twitter, scale: "1.8" }, {}, {})}</a>
        
        <a class="${"btn btn-outline-light btn-floating m-1 svelte-jvjuir"}" href="${"#!"}" role="${"button"}">${validate_component(Icon, "Icon").$$render($$result, { data: instagram, scale: "1.8" }, {}, {})}</a>
        
        <a class="${"btn btn-outline-light btn-floating m-1 svelte-jvjuir"}" href="${"#!"}" role="${"button"}">${validate_component(Icon, "Icon").$$render($$result, { data: linkedin, scale: "1.8" }, {}, {})}</a></section>
  
      
      <section class="${"mb-4"}"><p class="${"svelte-jvjuir"}">Lorem ipsum dolor sit amet consectetur adipisicing elit. Sunt distinctio earum
          repellat quaerat voluptatibus placeat nam, commodi optio pariatur est quia magnam
          eum harum corrupti dicta, aliquam sequi voluptate quas.
        </p></section>
  
      
      <section class="${""}">
        <div class="${"row"}">
            <div class="${"col-lg-3 col-md-6 mb-4 mb-md-0"}"><h5 class="${"text-uppercase svelte-jvjuir"}">Socials</h5>
    
                <ul class="${"list-unstyled mb-0"}"><li><a href="${"#!"}" class="${"text-white"}">Facebook</a></li>
                    <li><a href="${"#!"}" class="${"text-white"}">Twitter</a></li>
                    <li><a href="${"#!"}" class="${"text-white"}">Instagram</a></li>
                    <li><a href="${"#!"}" class="${"text-white"}">Linkedin</a></li></ul></div>

            <div class="${"col-lg-3 col-md-6 mb-4 mb-md-0"}"><h5 class="${"text-uppercase svelte-jvjuir"}">Useful Links</h5>
    
                <ul class="${"list-unstyled mb-0"}"><li><a href="${"/login"}" class="${"text-white"}">Login</a></li>
                    <li><a href="${"/forgot-password"}" class="${"text-white"}">Forgot Password</a></li>
                    <li><a href="${"/register"}" class="${"text-white"}">Register</a></li>
                    <li><a href="${"/contact"}" class="${"text-white"}">Contact</a></li></ul></div>

            <div class="${"col-lg-3 col-md-6 mb-4 mb-md-0"}"><h5 class="${"text-uppercase svelte-jvjuir"}">Legal</h5>
    
                <ul class="${"list-unstyled mb-0"}"><li><a href="${"#!"}" class="${"text-white"}">Privacy Policy</a></li>
                    <li><a href="${"#!"}" class="${"text-white"}">Link 2</a></li>
                    <li><a href="${"#!"}" class="${"text-white"}">Link 3</a></li></ul></div>

            <div class="${"col-lg-3 col-md-6 mb-4 mb-md-0"}"><button class="${"mt-3 btn btn-outline-light px-2"}">Scroll to top</button></div></div></section></div>
  
    
    <div class="${"text-center p-2"}" style="${"background-color: var(--logo-blue);"}">\xA9 2021 Copyright:
      <a class="${"text-white"}" href="${"https://thinkteacher.co.za"}">Think Teacher</a>
      </div>
</footer>`;
});
var css$3 = {
  code: "#logo-box.svelte-1t71bo9{margin:auto;padding-top:5%;text-align:center;max-width:800px;height:auto}@media screen and (max-width: 800px){#logo-box.svelte-1t71bo9{max-width:360px}}circle.svelte-1t71bo9{transition:ease 0.5s;animation:svelte-1t71bo9-expand 0.8s ease-in-out alternate}@keyframes svelte-1t71bo9-expand{from{r:0%}to{r:none}}",
  map: `{"version":3,"file":"logo.svelte","sources":["logo.svelte"],"sourcesContent":["<script>\\r\\n    import { fade } from 'svelte/transition';\\r\\n<\/script>\\r\\n\\r\\n<div id=\\"logo-box\\">\\r\\n    <svg transition:fade=\\"{{duration:2500}}\\" version=\\"1.1\\" id=\\"thinkTeacherLogo\\" xmlns=\\"http://www.w3.org/2000/svg\\" xmlns:xlink=\\"http://www.w3.org/1999/xlink\\" x=\\"0px\\" y=\\"0px\\"\\r\\n        viewBox=\\"0 0 853.1 198.8\\" style=\\"enable-background:new 0 0 853.1 198.8;\\" xml:space=\\"preserve\\">\\r\\n    <style type=\\"text/css\\">\\r\\n        .st0{fill:#ED8D1B;}\\r\\n        .st1{fill:#1E4EE5;}\\r\\n    </style>\\r\\n        <g>\\r\\n            <g>\\r\\n                <path class=\\"st0\\" d=\\"M253.7,117.9c-4.5,0-8.2-0.7-11-2c-2.8-1.3-4.9-3.5-6.1-6.6c-1.2-3.1-1.8-7.2-1.6-12.4l0.5-24.9h-9.2V61.5\\r\\n                    l9.8-2.6l2.2-16.5h12.9v16.5h13.8V72h-13.8v24.8c0,1.6,0.1,2.9,0.4,4c0.3,1,0.7,1.9,1.3,2.5c0.5,0.6,1.2,1.1,1.9,1.4\\r\\n                    c0.7,0.3,1.5,0.5,2.2,0.5l7.5,0.7v12.1H253.7z\\"/>\\r\\n                <path class=\\"st0\\" d=\\"M272.5,117.9V34.2h16.3v30.8c2.1-1.8,4.9-3.4,8.3-4.8c3.4-1.5,6.9-2.2,10.5-2.2c4.5,0,8,0.9,10.7,2.6\\r\\n                    c2.6,1.8,4.5,4.2,5.7,7.4c1.2,3.2,1.8,6.8,1.8,11v39h-16.3V81c0-1.9-0.4-3.5-1.1-4.7c-0.7-1.2-1.7-2.2-3-2.8\\r\\n                    c-1.2-0.6-2.7-0.9-4.4-0.9c-1.5,0-3,0.2-4.4,0.6c-1.4,0.4-2.8,0.9-4.1,1.6c-1.3,0.7-2.5,1.4-3.7,2.2v41H272.5z\\"/>\\r\\n                <path class=\\"st0\\" d=\\"M337.7,50.2c-1.5,0-2.3-0.7-2.3-2.2V37.2c0-1.5,0.8-2.3,2.3-2.3h12.5c0.7,0,1.2,0.2,1.5,0.7\\r\\n                    c0.4,0.4,0.5,1,0.5,1.6V48c0,1.5-0.7,2.2-2.1,2.2H337.7z M335.8,117.9v-59H352v59H335.8z\\"/>\\r\\n                <path class=\\"st0\\" d=\\"M362.6,117.9v-59H376l2.9,6c2.2-1.8,5-3.5,8.3-4.9c3.3-1.4,6.8-2.1,10.3-2.1c4.8,0,8.6,1,11.2,2.9\\r\\n                    c2.6,1.9,4.5,4.4,5.5,7.6c1.1,3.2,1.6,6.7,1.6,10.6v38.9h-16.3V81.1c0-1.9-0.3-3.5-1-4.7c-0.7-1.2-1.7-2.2-2.9-2.9\\r\\n                    c-1.2-0.7-2.7-1-4.5-1c-1.5,0-3,0.2-4.4,0.5c-1.4,0.4-2.8,0.9-4.1,1.5c-1.3,0.7-2.5,1.4-3.7,2.3v41H362.6z\\"/>\\r\\n                <path class=\\"st0\\" d=\\"M426,117.9V34.1h16.3v45.3h6.9l13-20.4h16.5l-17.4,27.8l19.1,31.2h-16.5L449,94h-6.7v23.8H426z\\"/>\\r\\n                <path class=\\"st1\\" d=\\"M510.2,117.9c-4.5,0-8.2-0.7-11-2c-2.8-1.3-4.9-3.5-6.1-6.6c-1.2-3.1-1.8-7.2-1.6-12.4l0.5-24.9h-9.2V61.5\\r\\n                    l9.8-2.6l2.2-16.5h12.9v16.5h13.8V72h-13.8v24.8c0,1.6,0.1,2.9,0.4,4c0.3,1,0.7,1.9,1.3,2.5c0.5,0.6,1.2,1.1,1.9,1.4\\r\\n                    c0.7,0.3,1.5,0.5,2.2,0.5l7.5,0.7v12.1H510.2z\\"/>\\r\\n                <path class=\\"st1\\" d=\\"M553.5,118.4c-6.5,0-11.7-0.9-15.6-2.6c-3.9-1.7-6.7-4.8-8.4-9.2c-1.7-4.4-2.6-10.5-2.6-18.2\\r\\n                    c0-8,0.8-14.2,2.4-18.6c1.6-4.4,4.3-7.5,8.1-9.2c3.8-1.8,9-2.6,15.5-2.6c5.9,0,10.5,0.6,14.1,1.8c3.5,1.2,6.1,3.2,7.6,6.2\\r\\n                    c1.6,2.9,2.4,7.1,2.4,12.4c0,4-0.8,7.1-2.4,9.4c-1.6,2.3-3.8,4-6.6,4.9c-2.9,1-6.2,1.5-10.1,1.5h-14.8c0.1,3,0.6,5.4,1.4,7.2\\r\\n                    c0.8,1.8,2.2,3.1,4.3,3.8c2.1,0.8,5.1,1.2,9.1,1.2H575v9.6c-2.9,0.6-6,1.2-9.4,1.7C562.2,118.1,558.2,118.4,553.5,118.4z\\r\\n                    M542.9,84.5h13.4c2.2,0,3.8-0.4,4.8-1.3c1-0.9,1.5-2.5,1.5-4.7c0-2.1-0.3-3.8-1-5.1c-0.7-1.3-1.7-2.2-3.1-2.7\\r\\n                    c-1.4-0.5-3.3-0.8-5.6-0.8c-2.5,0-4.5,0.4-5.9,1.3c-1.5,0.8-2.5,2.3-3.2,4.5S542.9,80.6,542.9,84.5z\\"/>\\r\\n                <path class=\\"st1\\" d=\\"M597.6,118.5c-4.5,0-8.1-1.3-10.9-4c-2.8-2.6-4.2-6.3-4.2-11v-5.3c0-4.5,1.6-8.1,4.7-11\\r\\n                    c3.1-2.9,8.1-4.3,14.7-4.3h15v-4.1c0-1.8-0.3-3.4-1-4.6c-0.7-1.2-1.9-2.1-3.7-2.6c-1.8-0.5-4.5-0.8-8.2-0.8h-17.7v-9.4\\r\\n                    c2.9-0.9,6.2-1.6,9.9-2.3c3.8-0.7,8.3-1,13.7-1c4.9,0,9.1,0.6,12.6,1.8c3.5,1.2,6.1,3.2,7.9,6c1.8,2.9,2.7,6.8,2.7,11.9v40.1\\r\\n                    h-12.9l-2.6-6.3c-0.5,0.6-1.4,1.2-2.6,2s-2.8,1.5-4.6,2.3c-1.8,0.8-3.8,1.4-6,1.9S600,118.5,597.6,118.5z M605.8,107.2\\r\\n                    c0.7,0,1.6-0.1,2.5-0.3c0.9-0.2,1.9-0.4,2.9-0.7c1-0.3,1.9-0.5,2.7-0.8c0.8-0.3,1.5-0.5,2.1-0.7c0.5-0.2,0.9-0.4,1-0.4V90.6\\r\\n                    l-9.9,0.7c-2.9,0.2-5,1-6.3,2.2c-1.4,1.2-2,2.9-2,5.1v2.4c0,1.5,0.3,2.7,0.9,3.6c0.6,1,1.5,1.6,2.5,2\\r\\n                    C603.3,107,604.5,107.2,605.8,107.2z\\"/>\\r\\n                <path class=\\"st1\\" d=\\"M666.4,118.5c-3.6,0-6.9-0.5-9.9-1.4c-3-1-5.7-2.5-7.9-4.8c-2.2-2.2-3.9-5.3-5.1-9.1\\r\\n                    c-1.2-3.8-1.8-8.7-1.8-14.6c0-6,0.5-11,1.6-14.9c1.1-4,2.7-7.1,4.9-9.4c2.2-2.3,4.8-3.9,8-4.9c3.1-1,6.7-1.4,10.7-1.4\\r\\n                    c3.6,0,7,0.2,10.3,0.6c3.3,0.4,6.7,1.1,10.3,2.1v9.3h-15.5c-3.4,0-6.1,0.5-8.1,1.5c-2.1,1-3.5,2.8-4.4,5.5\\r\\n                    c-0.9,2.7-1.4,6.5-1.4,11.5c0,4.9,0.5,8.6,1.4,11.2c0.9,2.6,2.4,4.3,4.5,5.2c2.1,0.9,4.9,1.3,8.3,1.3h16.1v9.2\\r\\n                    c-1.8,0.6-4,1.1-6.4,1.6c-2.4,0.5-5,0.8-7.6,1.1C671.6,118.4,669,118.5,666.4,118.5z\\"/>\\r\\n                <path class=\\"st1\\" d=\\"M695.3,117.9V34.2h16.3v30.8c2.1-1.8,4.9-3.4,8.3-4.8c3.4-1.5,6.9-2.2,10.5-2.2c4.5,0,8,0.9,10.7,2.6\\r\\n                    c2.6,1.8,4.5,4.2,5.7,7.4c1.2,3.2,1.8,6.8,1.8,11v39h-16.3V81c0-1.9-0.4-3.5-1.1-4.7c-0.7-1.2-1.7-2.2-3-2.8\\r\\n                    c-1.2-0.6-2.7-0.9-4.4-0.9c-1.5,0-3,0.2-4.4,0.6c-1.4,0.4-2.8,0.9-4.1,1.6c-1.3,0.7-2.5,1.4-3.7,2.2v41H695.3z\\"/>\\r\\n                <path class=\\"st1\\" d=\\"M783.5,118.4c-6.5,0-11.7-0.9-15.6-2.6c-3.9-1.7-6.7-4.8-8.4-9.2c-1.7-4.4-2.6-10.5-2.6-18.2\\r\\n                    c0-8,0.8-14.2,2.4-18.6c1.6-4.4,4.3-7.5,8.1-9.2c3.8-1.8,9-2.6,15.5-2.6c5.9,0,10.5,0.6,14.1,1.8c3.5,1.2,6.1,3.2,7.6,6.2\\r\\n                    c1.6,2.9,2.4,7.1,2.4,12.4c0,4-0.8,7.1-2.4,9.4c-1.6,2.3-3.8,4-6.6,4.9s-6.2,1.5-10.1,1.5h-14.8c0.1,3,0.6,5.4,1.4,7.2\\r\\n                    c0.8,1.8,2.2,3.1,4.3,3.8c2.1,0.8,5.1,1.2,9.1,1.2h17.2v9.6c-2.9,0.6-6,1.2-9.4,1.7C792.3,118.1,788.2,118.4,783.5,118.4z\\r\\n                    M772.9,84.5h13.4c2.2,0,3.8-0.4,4.8-1.3c1-0.9,1.5-2.5,1.5-4.7c0-2.1-0.3-3.8-1-5.1c-0.7-1.3-1.7-2.2-3.1-2.7\\r\\n                    c-1.4-0.5-3.3-0.8-5.6-0.8c-2.5,0-4.5,0.4-5.9,1.3c-1.5,0.8-2.5,2.3-3.2,4.5C773.2,77.6,772.9,80.6,772.9,84.5z\\"/>\\r\\n                <path class=\\"st1\\" d=\\"M815.3,117.9v-59h12.5l3.7,9c2.1-2.7,4.5-5,7.2-6.9c2.7-1.9,5.8-2.9,9.5-2.9c0.8,0,1.6,0,2.5,0.1\\r\\n                    c0.8,0.1,1.6,0.2,2.4,0.4v16.7c-1.1-0.1-2.3-0.3-3.5-0.4c-1.2-0.1-2.4-0.2-3.5-0.2c-2.1,0-4,0.2-5.8,0.7c-1.7,0.5-3.3,1.2-4.7,2.1\\r\\n                    c-1.4,0.9-2.8,2.1-4.1,3.6v36.7H815.3z\\"/>\\r\\n            </g>\\r\\n            <g>\\r\\n                <circle class=\\"st0\\" cx=\\"83.6\\" cy=\\"42.4\\" r=\\"15.1\\"/>\\r\\n                <circle class=\\"st1\\" cx=\\"28.7\\" cy=\\"49.8\\" r=\\"12.6\\"/>\\r\\n                <circle class=\\"st1\\" cx=\\"53.9\\" cy=\\"24.7\\" r=\\"12.6\\"/>\\r\\n                <circle class=\\"st1\\" cx=\\"131.9\\" cy=\\"147.9\\" r=\\"12.6\\"/>\\r\\n                <circle class=\\"st1\\" cx=\\"169.2\\" cy=\\"46.8\\" r=\\"12.6\\"/>\\r\\n                <circle class=\\"st1\\" cx=\\"59.3\\" cy=\\"178.8\\" r=\\"12.6\\"/>\\r\\n                <circle class=\\"st1\\" cx=\\"17.6\\" cy=\\"132.8\\" r=\\"12.6\\"/>\\r\\n                <circle class=\\"st1\\" cx=\\"41.3\\" cy=\\"102.1\\" r=\\"7.5\\"/>\\r\\n                <circle class=\\"st1\\" cx=\\"46.8\\" cy=\\"157.6\\" r=\\"7.5\\"/>\\r\\n                <circle class=\\"st1\\" cx=\\"56.2\\" cy=\\"49.8\\" r=\\"7.5\\"/>\\r\\n                <circle class=\\"st1\\" cx=\\"79.3\\" cy=\\"9.7\\" r=\\"7.5\\"/>\\r\\n                <circle class=\\"st1\\" cx=\\"112.2\\" cy=\\"49.8\\" r=\\"7.5\\"/>\\r\\n                <circle class=\\"st1\\" cx=\\"95.2\\" cy=\\"9.7\\" r=\\"4.3\\"/>\\r\\n                <circle class=\\"st1\\" cx=\\"94.4\\" cy=\\"23\\" r=\\"4.3\\"/>\\r\\n                <circle class=\\"st0\\" cx=\\"107.8\\" cy=\\"4.3\\" r=\\"4.3\\"/>\\r\\n                <circle class=\\"st0\\" cx=\\"123.4\\" cy=\\"42.1\\" r=\\"4.3\\"/>\\r\\n                <circle class=\\"st1\\" cx=\\"125.2\\" cy=\\"54.2\\" r=\\"4.3\\"/>\\r\\n                <circle class=\\"st1\\" cx=\\"22.7\\" cy=\\"70.3\\" r=\\"4.3\\"/>\\r\\n                <circle class=\\"st1\\" cx=\\"77.9\\" cy=\\"157.6\\" r=\\"4.3\\"/>\\r\\n                <circle class=\\"st1\\" cx=\\"33.1\\" cy=\\"115.9\\" r=\\"4.3\\"/>\\r\\n                <circle class=\\"st1\\" cx=\\"46.8\\" cy=\\"124.6\\" r=\\"4.3\\"/>\\r\\n                <circle class=\\"st1\\" cx=\\"53.9\\" cy=\\"111.8\\" r=\\"4.3\\"/>\\r\\n                <circle class=\\"st0\\" cx=\\"60.6\\" cy=\\"99\\" r=\\"4.3\\"/>\\r\\n                <circle class=\\"st1\\" cx=\\"78.4\\" cy=\\"117.8\\" r=\\"4.3\\"/>\\r\\n                <circle class=\\"st1\\" cx=\\"97.8\\" cy=\\"178.8\\" r=\\"4.3\\"/>\\r\\n                <circle class=\\"st1\\" cx=\\"93.5\\" cy=\\"191.4\\" r=\\"4.3\\"/>\\r\\n                <circle class=\\"st1\\" cx=\\"138\\" cy=\\"169.4\\" r=\\"4.3\\"/>\\r\\n                <circle class=\\"st0\\" cx=\\"33.1\\" cy=\\"144.5\\" r=\\"4.3\\"/>\\r\\n                <circle class=\\"st0\\" cx=\\"142.3\\" cy=\\"132.8\\" r=\\"4.3\\"/>\\r\\n                <circle class=\\"st1\\" cx=\\"123.4\\" cy=\\"128.5\\" r=\\"4.3\\"/>\\r\\n                <circle class=\\"st1\\" cx=\\"82.2\\" cy=\\"169.4\\" r=\\"4.3\\"/>\\r\\n                <circle class=\\"st1\\" cx=\\"156.3\\" cy=\\"117.8\\" r=\\"4.3\\"/>\\r\\n                <circle class=\\"st1\\" cx=\\"157.8\\" cy=\\"133.3\\" r=\\"4.3\\"/>\\r\\n                <circle class=\\"st1\\" cx=\\"110\\" cy=\\"32.2\\" r=\\"4.3\\"/>\\r\\n                <circle class=\\"st1\\" cx=\\"170.8\\" cy=\\"166.3\\" r=\\"4.3\\"/>\\r\\n                <circle class=\\"st1\\" cx=\\"143.8\\" cy=\\"34.5\\" r=\\"4.3\\"/>\\r\\n                <circle class=\\"st1\\" cx=\\"161\\" cy=\\"26.3\\" r=\\"4.3\\"/>\\r\\n                <circle class=\\"st1\\" cx=\\"192.3\\" cy=\\"67.4\\" r=\\"4.3\\"/>\\r\\n                <circle class=\\"st1\\" cx=\\"177.4\\" cy=\\"67.4\\" r=\\"4.3\\"/>\\r\\n                <circle class=\\"st1\\" cx=\\"175.8\\" cy=\\"88.2\\" r=\\"4.3\\"/>\\r\\n                <circle class=\\"st1\\" cx=\\"144.5\\" cy=\\"49.8\\" r=\\"7.5\\"/>\\r\\n                <circle class=\\"st0\\" cx=\\"165.2\\" cy=\\"100.7\\" r=\\"7.5\\"/>\\r\\n                <circle class=\\"st1\\" cx=\\"74.7\\" cy=\\"102.1\\" r=\\"7.5\\"/>\\r\\n                <circle class=\\"st1\\" cx=\\"192.3\\" cy=\\"82.3\\" r=\\"7.5\\"/>\\r\\n                <circle class=\\"st1\\" cx=\\"156.6\\" cy=\\"175.4\\" r=\\"7.5\\"/>\\r\\n                <circle class=\\"st1\\" cx=\\"30.1\\" cy=\\"161.9\\" r=\\"7.5\\"/>\\r\\n                <circle class=\\"st0\\" cx=\\"79.3\\" cy=\\"191.4\\" r=\\"7.5\\"/>\\r\\n                <circle class=\\"st1\\" cx=\\"156.6\\" cy=\\"152\\" r=\\"7.5\\"/>\\r\\n                <circle class=\\"st1\\" cx=\\"184.9\\" cy=\\"108.4\\" r=\\"7.5\\"/>\\r\\n                <circle class=\\"st1\\" cx=\\"180.3\\" cy=\\"132.8\\" r=\\"15.1\\"/>\\r\\n                <circle class=\\"st1\\" cx=\\"127.2\\" cy=\\"19.2\\" r=\\"15.1\\"/>\\r\\n                <circle class=\\"st1\\" cx=\\"120.9\\" cy=\\"183\\" r=\\"15.1\\"/>\\r\\n                <circle class=\\"st1\\" cx=\\"66.4\\" cy=\\"136.9\\" r=\\"15.1\\"/>\\r\\n                <circle class=\\"st1\\" cx=\\"15.1\\" cy=\\"93.3\\" r=\\"15.1\\"/>\\r\\n                <circle class=\\"st1\\" cx=\\"134.4\\" cy=\\"109.7\\" r=\\"15.1\\"/>\\r\\n            </g>\\r\\n            <g>\\r\\n                <path class=\\"st1\\" d=\\"M250.3,183.3c-1.6,0-3-0.2-4.4-0.6c-1.3-0.4-2.6-0.9-3.7-1.4c-1.1-0.6-2.1-1.1-3-1.7l-0.9,3.3h-4v-47.3h4.9\\r\\n                    v17.2c1.6-0.9,3.3-1.7,5.3-2.4c2-0.7,3.8-1.1,5.5-1.1c2.6,0,4.8,0.6,6.6,1.7c1.7,1.1,3,2.9,3.9,5.5c0.9,2.5,1.3,5.9,1.3,10.1\\r\\n                    c0,3.4-0.4,6.4-1.2,8.9c-0.8,2.5-2,4.4-3.8,5.8C255.3,182.7,253.1,183.3,250.3,183.3z M248.7,179.2c1.8,0,3.3-0.5,4.6-1.4\\r\\n                    c1.2-0.9,2.1-2.3,2.8-4.2c0.6-1.9,1-4.3,1-7.1c0-3.6-0.4-6.4-1.1-8.2c-0.7-1.8-1.7-3.1-2.9-3.8s-2.7-1-4.3-1c-1.9,0-3.5,0.3-5,0.8\\r\\n                    c-1.5,0.5-3,1.2-4.5,2v20.3c1.3,0.6,2.7,1.2,4.2,1.8C245,178.9,246.8,179.2,248.7,179.2z\\"/>\\r\\n                <path class=\\"st1\\" d=\\"M282.8,183.3c-3.5,0-6.2-0.5-8.2-1.6c-2-1-3.4-2.8-4.3-5.3c-0.9-2.5-1.3-5.9-1.3-10.2c0-4.4,0.4-7.8,1.3-10.3\\r\\n                    c0.9-2.5,2.3-4.2,4.4-5.2c2-1,4.8-1.5,8.2-1.5c2.9,0,5.3,0.3,7.2,1c1.8,0.7,3.2,1.8,4.1,3.4c0.9,1.6,1.3,3.8,1.3,6.6\\r\\n                    c0,1.9-0.4,3.5-1.1,4.7c-0.8,1.2-1.9,2-3.3,2.5c-1.4,0.5-3.1,0.8-5.1,0.8h-12.1c0,2.7,0.3,4.8,0.9,6.5c0.5,1.6,1.5,2.8,2.9,3.5\\r\\n                    c1.4,0.7,3.5,1.1,6.3,1.1h10.7v3c-1.9,0.2-3.8,0.5-5.6,0.6C287.3,183.2,285.2,183.3,282.8,183.3z M273.8,165.2h11.8\\r\\n                    c1.9,0,3.2-0.3,4.1-1c0.9-0.7,1.3-1.9,1.3-3.7c0-1.9-0.3-3.4-0.8-4.4c-0.6-1.1-1.4-1.8-2.6-2.2c-1.2-0.4-2.8-0.7-4.7-0.7\\r\\n                    c-2.3,0-4.1,0.3-5.5,1c-1.3,0.7-2.3,1.9-2.8,3.6C274.1,159.5,273.8,162,273.8,165.2z\\"/>\\r\\n                <path class=\\"st1\\" d=\\"M303.7,183v-33.1h3.8l1.1,3.7c1.6-1.1,3.4-2.1,5.5-2.9c2.1-0.8,4.3-1.3,6.6-1.3c2.4,0,4.4,0.5,5.9,1.6\\r\\n                    c1.5,1,2.6,2.4,3.3,4.1c0.7,1.7,1.1,3.5,1.1,5.5V183h-4.9v-22c0-1.4-0.3-2.7-0.8-3.8s-1.3-2-2.4-2.6c-1-0.6-2.3-0.9-3.8-0.9\\r\\n                    c-1.4,0-2.6,0.1-3.8,0.4c-1.2,0.3-2.3,0.6-3.3,1.1c-1.1,0.5-2.2,1-3.3,1.7v26H303.7z\\"/>\\r\\n                <path class=\\"st1\\" d=\\"M352.9,183.3c-3.5,0-6.2-0.5-8.2-1.6c-2-1-3.4-2.8-4.3-5.3c-0.9-2.5-1.3-5.9-1.3-10.2c0-4.4,0.4-7.8,1.3-10.3\\r\\n                    c0.9-2.5,2.3-4.2,4.4-5.2c2-1,4.8-1.5,8.2-1.5c2.9,0,5.3,0.3,7.2,1c1.8,0.7,3.2,1.8,4.1,3.4c0.9,1.6,1.3,3.8,1.3,6.6\\r\\n                    c0,1.9-0.4,3.5-1.1,4.7c-0.8,1.2-1.9,2-3.3,2.5c-1.4,0.5-3.1,0.8-5.1,0.8h-12.1c0,2.7,0.3,4.8,0.9,6.5c0.5,1.6,1.5,2.8,2.9,3.5\\r\\n                    c1.4,0.7,3.5,1.1,6.3,1.1h10.7v3c-1.9,0.2-3.8,0.5-5.6,0.6C357.3,183.2,355.2,183.3,352.9,183.3z M343.9,165.2h11.8\\r\\n                    c1.9,0,3.2-0.3,4.1-1c0.9-0.7,1.3-1.9,1.3-3.7c0-1.9-0.3-3.4-0.8-4.4c-0.6-1.1-1.4-1.8-2.6-2.2c-1.2-0.4-2.8-0.7-4.7-0.7\\r\\n                    c-2.3,0-4.1,0.3-5.5,1c-1.3,0.7-2.3,1.9-2.8,3.6C344.1,159.5,343.9,162,343.9,165.2z\\"/>\\r\\n                <path class=\\"st1\\" d=\\"M375.4,183v-29.1h-5.1v-3.2l5.1-0.9v-4.4c0-2.3,0.3-4.2,0.8-5.7c0.6-1.5,1.5-2.6,2.9-3.4\\r\\n                    c1.3-0.7,3.2-1.1,5.4-1.1c1.6,0,2.9,0.1,4,0.3c1.1,0.2,2.1,0.4,3,0.7v3.5c-0.9-0.1-1.8-0.2-2.8-0.2c-1-0.1-1.9-0.1-2.8-0.1\\r\\n                    c-1.5,0-2.7,0.2-3.5,0.7s-1.4,1.2-1.7,2.2s-0.5,2.2-0.5,3.7v3.8h19.6v4h-19.6V183H375.4z M398.3,143.9c-0.7,0-1-0.3-1-1v-4.8\\r\\n                    c0-0.7,0.3-1,1-1h3.5c0.3,0,0.5,0.1,0.7,0.3c0.1,0.2,0.2,0.4,0.2,0.7v4.8c0,0.7-0.3,1-0.9,1H398.3z M397.5,183v-33.1h4.9V183\\r\\n                    H397.5z\\"/>\\r\\n                <path class=\\"st1\\" d=\\"M422.8,183c-2.2,0-3.9-0.4-5.3-1.1c-1.4-0.7-2.4-1.8-3.1-3.4c-0.7-1.6-1-3.7-0.9-6.3l0.2-18.4h-5.3v-3.2\\r\\n                    l5.3-0.9l0.8-9.2h3.8v9.2h9.6v4h-9.6v18.4c0,1.4,0.2,2.6,0.5,3.5s0.7,1.5,1.2,2c0.5,0.5,1.1,0.8,1.6,1c0.6,0.2,1.1,0.3,1.7,0.3\\r\\n                    l4,0.4v3.6H422.8z\\"/>\\r\\n                <path class=\\"st1\\" d=\\"M446,183.3c-0.8,0-1.8,0-3-0.1c-1.2,0-2.5-0.1-3.8-0.2c-1.3-0.1-2.5-0.2-3.5-0.3c-1.1-0.1-1.9-0.2-2.5-0.3v-3\\r\\n                    h13.6c1.4,0,2.5-0.1,3.5-0.3c1-0.2,1.8-0.7,2.3-1.4c0.6-0.7,0.8-1.8,0.8-3.2v-1.5c0-1.4-0.5-2.6-1.4-3.4c-1-0.8-2.5-1.2-4.6-1.2\\r\\n                    h-4.7c-1.9,0-3.7-0.2-5.2-0.7c-1.5-0.5-2.7-1.3-3.5-2.5c-0.8-1.2-1.2-2.9-1.2-5v-1.7c0-2.1,0.4-3.8,1.2-5.1c0.8-1.3,2.1-2.3,3.8-3\\r\\n                    c1.7-0.7,3.9-1,6.7-1c1.2,0,2.5,0,4,0.1c1.5,0.1,3,0.2,4.4,0.3c1.4,0.1,2.6,0.3,3.5,0.5v3h-12.8c-2.1,0-3.7,0.4-4.9,1.1\\r\\n                    c-1.1,0.7-1.7,2.1-1.7,4.1v1.4c0,1.3,0.3,2.2,0.8,2.9c0.5,0.6,1.3,1.1,2.3,1.3c1,0.2,2.1,0.3,3.4,0.3h4.7c3,0,5.4,0.7,7,2.1\\r\\n                    c1.7,1.4,2.5,3.4,2.5,6.1v2.3c0,2.2-0.5,4-1.5,5.2c-1,1.2-2.4,2.1-4.2,2.5C450.4,183.1,448.4,183.3,446,183.3z\\"/>\\r\\n                <path class=\\"st1\\" d=\\"M493.8,183.3c-0.8,0-1.8,0-3-0.1c-1.2,0-2.5-0.1-3.8-0.2c-1.3-0.1-2.5-0.2-3.5-0.3c-1.1-0.1-1.9-0.2-2.5-0.3\\r\\n                    v-3h13.6c1.4,0,2.5-0.1,3.5-0.3c1-0.2,1.8-0.7,2.3-1.4c0.6-0.7,0.8-1.8,0.8-3.2v-1.5c0-1.4-0.5-2.6-1.4-3.4\\r\\n                    c-1-0.8-2.5-1.2-4.6-1.2h-4.7c-1.9,0-3.7-0.2-5.2-0.7c-1.5-0.5-2.7-1.3-3.5-2.5c-0.8-1.2-1.2-2.9-1.2-5v-1.7\\r\\n                    c0-2.1,0.4-3.8,1.2-5.1c0.8-1.3,2.1-2.3,3.8-3c1.7-0.7,3.9-1,6.7-1c1.2,0,2.5,0,4,0.1c1.5,0.1,3,0.2,4.4,0.3\\r\\n                    c1.4,0.1,2.6,0.3,3.5,0.5v3h-12.8c-2.1,0-3.7,0.4-4.9,1.1c-1.1,0.7-1.7,2.1-1.7,4.1v1.4c0,1.3,0.3,2.2,0.8,2.9\\r\\n                    c0.5,0.6,1.3,1.1,2.3,1.3c1,0.2,2.1,0.3,3.4,0.3h4.7c3,0,5.4,0.7,7,2.1c1.7,1.4,2.5,3.4,2.5,6.1v2.3c0,2.2-0.5,4-1.5,5.2\\r\\n                    c-1,1.2-2.4,2.1-4.2,2.5C498.2,183.1,496.1,183.3,493.8,183.3z\\"/>\\r\\n                <path class=\\"st1\\" d=\\"M523.2,183.3c-3.2,0-5.6-0.8-7.3-2.5c-1.7-1.7-2.6-4.2-2.6-7.7v-23.3h4.9v22.1c0,2.8,0.6,4.6,1.9,5.6\\r\\n                    c1.3,1,3,1.5,5.3,1.5c1.9,0,3.7-0.3,5.3-0.8c1.6-0.6,3.3-1.3,5-2.3v-26h4.9V183h-3.8l-1.1-3.7c-1.7,1.1-3.6,2-5.7,2.8\\r\\n                    C527.8,182.9,525.6,183.3,523.2,183.3z\\"/>\\r\\n                <path class=\\"st1\\" d=\\"M549.8,197.6v-47.8h4l0.9,3.4c0.7-0.5,1.7-1.1,2.9-1.7c1.2-0.6,2.5-1.1,3.8-1.5c1.4-0.4,2.8-0.6,4.1-0.6\\r\\n                    c2.1,0,4,0.5,5.5,1.4c1.5,0.9,2.7,2.2,3.7,3.8c1,1.6,1.6,3.4,2,5.4c0.4,2,0.6,4.2,0.6,6.4c0,3.7-0.4,6.9-1.3,9.4\\r\\n                    c-0.8,2.5-2.1,4.5-3.9,5.7c-1.7,1.3-4,1.9-6.7,1.9c-1.9,0-3.7-0.3-5.6-0.9c-1.9-0.6-3.6-1.4-5.2-2.3v17.4H549.8z M564.2,179.2\\r\\n                    c1.6,0,3-0.4,4.2-1.2c1.2-0.8,2.2-2.1,3-4c0.7-1.9,1.1-4.5,1.1-7.7c0-3.1-0.4-5.6-1.2-7.5c-0.8-1.9-1.8-3.2-3-4.1\\r\\n                    c-1.2-0.8-2.6-1.3-4.1-1.3c-1.9,0-3.6,0.3-5.2,0.9c-1.6,0.6-3,1.2-4.2,1.9v20.3c1.4,0.8,3,1.4,4.6,1.9\\r\\n                    C561,179,562.6,179.2,564.2,179.2z\\"/>\\r\\n                <path class=\\"st1\\" d=\\"M585.7,197.6v-47.8h4l0.9,3.4c0.7-0.5,1.7-1.1,2.9-1.7c1.2-0.6,2.5-1.1,3.8-1.5c1.4-0.4,2.8-0.6,4.1-0.6\\r\\n                    c2.1,0,4,0.5,5.5,1.4c1.5,0.9,2.7,2.2,3.7,3.8c1,1.6,1.6,3.4,2,5.4c0.4,2,0.6,4.2,0.6,6.4c0,3.7-0.4,6.9-1.3,9.4\\r\\n                    c-0.8,2.5-2.1,4.5-3.9,5.7c-1.7,1.3-4,1.9-6.7,1.9c-1.9,0-3.7-0.3-5.6-0.9c-1.9-0.6-3.6-1.4-5.2-2.3v17.4H585.7z M600.1,179.2\\r\\n                    c1.6,0,3-0.4,4.2-1.2c1.2-0.8,2.2-2.1,3-4c0.7-1.9,1.1-4.5,1.1-7.7c0-3.1-0.4-5.6-1.2-7.5c-0.8-1.9-1.8-3.2-3-4.1\\r\\n                    c-1.2-0.8-2.6-1.3-4.1-1.3c-1.9,0-3.6,0.3-5.2,0.9c-1.6,0.6-3,1.2-4.2,1.9v20.3c1.4,0.8,3,1.4,4.6,1.9\\r\\n                    C596.8,179,598.4,179.2,600.1,179.2z\\"/>\\r\\n                <path class=\\"st1\\" d=\\"M634.7,183.3c-2.4,0-4.5-0.2-6.3-0.7s-3.3-1.4-4.5-2.6c-1.2-1.2-2.1-3-2.7-5.2c-0.6-2.2-0.9-5-0.9-8.5\\r\\n                    c0-3.5,0.3-6.3,0.9-8.5c0.6-2.2,1.5-3.9,2.7-5.1c1.2-1.2,2.7-2.1,4.5-2.5c1.8-0.5,3.9-0.7,6.3-0.7c2.4,0,4.5,0.2,6.3,0.7\\r\\n                    c1.8,0.5,3.3,1.4,4.5,2.6c1.2,1.2,2.1,2.9,2.7,5.1c0.6,2.2,0.9,5,0.9,8.5c0,3.5-0.3,6.3-0.9,8.5c-0.6,2.2-1.5,3.9-2.7,5.1\\r\\n                    c-1.2,1.2-2.7,2.1-4.5,2.6C639.2,183.1,637.1,183.3,634.7,183.3z M634.7,179.3c1.5,0,2.9-0.1,4.1-0.4c1.2-0.3,2.2-0.9,2.9-1.7\\r\\n                    c0.8-0.9,1.4-2.2,1.8-3.9c0.4-1.7,0.6-4,0.6-6.9c0-2.9-0.2-5.2-0.6-6.9c-0.4-1.7-1-3-1.8-3.8c-0.8-0.9-1.8-1.4-2.9-1.7\\r\\n                    c-1.2-0.3-2.5-0.4-4.1-0.4c-1.6,0-2.9,0.1-4.1,0.4c-1.2,0.3-2.1,0.9-2.9,1.7c-0.8,0.9-1.4,2.2-1.8,3.8c-0.4,1.7-0.6,4-0.6,6.9\\r\\n                    c0,2.9,0.2,5.1,0.6,6.9c0.4,1.7,1,3,1.8,3.9c0.8,0.9,1.8,1.4,2.9,1.7S633.1,179.3,634.7,179.3z\\"/>\\r\\n                <path class=\\"st1\\" d=\\"M657.3,183v-33.1h3.7l1.2,5.8c1.5-1.8,3.2-3.2,5-4.4c1.8-1.2,4-1.7,6.4-1.7c0.6,0,1.1,0,1.6,0.1\\r\\n                    c0.5,0,1,0.1,1.5,0.2v5c-0.5-0.1-1.1-0.2-1.7-0.2c-0.6-0.1-1.2-0.1-1.9-0.1c-1.5,0-2.9,0.2-4.1,0.6c-1.2,0.4-2.3,0.9-3.4,1.7\\r\\n                    c-1.1,0.7-2.2,1.7-3.3,2.7V183H657.3z\\"/>\\r\\n                <path class=\\"st1\\" d=\\"M694.4,183c-2.2,0-3.9-0.4-5.3-1.1c-1.4-0.7-2.4-1.8-3.1-3.4s-1-3.7-0.9-6.3l0.2-18.4H680v-3.2l5.3-0.9\\r\\n                    l0.8-9.2h3.8v9.2h9.6v4h-9.6v18.4c0,1.4,0.2,2.6,0.5,3.5c0.3,0.9,0.7,1.5,1.2,2c0.5,0.5,1.1,0.8,1.6,1c0.6,0.2,1.1,0.3,1.7,0.3\\r\\n                    l4,0.4v3.6H694.4z\\"/>\\r\\n                <path class=\\"st1\\" d=\\"M735,183.3c-1.9,0-3.6-0.2-5.2-0.7s-3-1.4-4.2-2.6c-1.2-1.2-2.1-3-2.8-5.1c-0.7-2.2-1-5-1-8.4\\r\\n                    c0-3.4,0.3-6.3,0.9-8.5c0.6-2.2,1.5-3.9,2.7-5.2c1.2-1.2,2.6-2.1,4.2-2.6c1.7-0.5,3.5-0.7,5.5-0.7c1.7,0,3.5,0.1,5.4,0.2\\r\\n                    c1.9,0.1,3.8,0.4,5.6,0.7v2.9h-9.7c-2.1,0-3.9,0.4-5.3,1.1c-1.4,0.7-2.5,2-3.3,3.9c-0.7,1.9-1.1,4.7-1.1,8.3\\r\\n                    c0,3.5,0.4,6.2,1.2,8.1c0.8,1.9,1.9,3.1,3.3,3.8c1.4,0.7,3.2,1,5.3,1h10.1v2.9c-1,0.2-2.1,0.3-3.3,0.5c-1.3,0.2-2.6,0.3-4,0.4\\r\\n                    C737.9,183.3,736.5,183.3,735,183.3z\\"/>\\r\\n                <path class=\\"st1\\" d=\\"M759.8,183.3c-2.4,0-4.4-0.7-6-2.2c-1.6-1.4-2.4-3.5-2.4-6.1v-2.4c0-2.6,0.9-4.7,2.6-6.3s4.3-2.4,7.8-2.4H773\\r\\n                    v-4.1c0-1.4-0.2-2.5-0.7-3.5c-0.5-1-1.3-1.7-2.5-2.3c-1.2-0.5-3-0.8-5.3-0.8h-10.3v-2.9c1.4-0.2,3.1-0.5,5.1-0.7\\r\\n                    c1.9-0.2,4.2-0.3,6.8-0.3c2.7,0,4.9,0.3,6.7,1c1.8,0.7,3.1,1.8,3.9,3.3c0.8,1.5,1.3,3.5,1.3,5.9V183h-3.8l-0.9-3.8\\r\\n                    c-0.2,0.2-0.7,0.5-1.5,0.9c-0.8,0.4-1.9,0.9-3.2,1.4c-1.3,0.5-2.7,1-4.2,1.3C762.7,183.1,761.3,183.3,759.8,183.3z M761.9,179.7\\r\\n                    c0.7,0,1.6,0,2.5-0.2c1-0.2,1.9-0.4,2.9-0.7c1-0.3,1.9-0.5,2.8-0.8c0.8-0.3,1.5-0.5,2.1-0.7c0.5-0.2,0.8-0.3,0.9-0.3v-10.4\\r\\n                    l-10.1,0.4c-2.4,0.1-4,0.7-5.1,1.7c-1,1.1-1.5,2.5-1.5,4.2v1.5c0,1.3,0.3,2.4,0.8,3.2c0.6,0.8,1.3,1.4,2.1,1.7\\r\\n                    S761,179.6,761.9,179.7z\\"/>\\r\\n                <path class=\\"st1\\" d=\\"M787.2,183v-33.1h3.7l1.2,5.8c1.5-1.8,3.2-3.2,5-4.4c1.8-1.2,4-1.7,6.4-1.7c0.6,0,1.1,0,1.6,0.1\\r\\n                    c0.5,0,1,0.1,1.5,0.2v5c-0.5-0.1-1.1-0.2-1.7-0.2c-0.6-0.1-1.2-0.1-1.9-0.1c-1.5,0-2.9,0.2-4.1,0.6c-1.2,0.4-2.3,0.9-3.4,1.7\\r\\n                    c-1.1,0.7-2.2,1.7-3.3,2.7V183H787.2z\\"/>\\r\\n                <path class=\\"st1\\" d=\\"M825.4,183.3c-3.5,0-6.2-0.5-8.2-1.6c-2-1-3.4-2.8-4.3-5.3c-0.9-2.5-1.3-5.9-1.3-10.2c0-4.4,0.4-7.8,1.3-10.3\\r\\n                    c0.9-2.5,2.3-4.2,4.4-5.2s4.8-1.5,8.2-1.5c2.9,0,5.3,0.3,7.2,1c1.8,0.7,3.2,1.8,4.1,3.4c0.9,1.6,1.3,3.8,1.3,6.6\\r\\n                    c0,1.9-0.4,3.5-1.1,4.7c-0.8,1.2-1.9,2-3.3,2.5c-1.4,0.5-3.1,0.8-5.1,0.8h-12.1c0,2.7,0.3,4.8,0.9,6.5c0.5,1.6,1.5,2.8,2.9,3.5\\r\\n                    c1.4,0.7,3.5,1.1,6.3,1.1h10.7v3c-1.9,0.2-3.8,0.5-5.6,0.6C829.8,183.2,827.7,183.3,825.4,183.3z M816.4,165.2h11.8\\r\\n                    c1.9,0,3.2-0.3,4.1-1c0.9-0.7,1.3-1.9,1.3-3.7c0-1.9-0.3-3.4-0.8-4.4c-0.6-1.1-1.4-1.8-2.6-2.2c-1.2-0.4-2.8-0.7-4.7-0.7\\r\\n                    c-2.3,0-4.1,0.3-5.5,1c-1.3,0.7-2.3,1.9-2.8,3.6C816.6,159.5,816.4,162,816.4,165.2z\\"/>\\r\\n            </g>\\r\\n        </g>\\r\\n    </svg>\\r\\n</div>\\r\\n\\r\\n\\r\\n<style>\\r\\n    #logo-box{\\r\\n        margin: auto;\\r\\n        padding-top: 5%;\\r\\n        text-align: center;\\r\\n        max-width: 800px;\\r\\n        height:auto;\\r\\n    }\\r\\n    @media screen and (max-width: 800px) {\\r\\n        #logo-box{\\r\\n            max-width: 360px;\\r\\n        }\\r\\n    }\\r\\n    circle{\\r\\n        transition: ease 0.5s;\\r\\n        animation: expand 0.8s ease-in-out alternate;\\r\\n    }\\r\\n    @keyframes expand {     \\r\\n        from { \\r\\n            r: 0%;\\r\\n        }\\r\\n        to { \\r\\n            r: none;\\r\\n        }\\r\\n    }\\r\\n</style>"],"names":[],"mappings":"AAsNI,wBAAS,CAAC,AACN,MAAM,CAAE,IAAI,CACZ,WAAW,CAAE,EAAE,CACf,UAAU,CAAE,MAAM,CAClB,SAAS,CAAE,KAAK,CAChB,OAAO,IAAI,AACf,CAAC,AACD,OAAO,MAAM,CAAC,GAAG,CAAC,YAAY,KAAK,CAAC,AAAC,CAAC,AAClC,wBAAS,CAAC,AACN,SAAS,CAAE,KAAK,AACpB,CAAC,AACL,CAAC,AACD,qBAAM,CAAC,AACH,UAAU,CAAE,IAAI,CAAC,IAAI,CACrB,SAAS,CAAE,qBAAM,CAAC,IAAI,CAAC,WAAW,CAAC,SAAS,AAChD,CAAC,AACD,WAAW,qBAAO,CAAC,AACf,IAAI,AAAC,CAAC,AACF,CAAC,CAAE,EAAE,AACT,CAAC,AACD,EAAE,AAAC,CAAC,AACA,CAAC,CAAE,IAAI,AACX,CAAC,AACL,CAAC"}`
};
var Logo = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  $$result.css.add(css$3);
  return `<div id="${"logo-box"}" class="${"svelte-1t71bo9"}"><svg version="${"1.1"}" id="${"thinkTeacherLogo"}" xmlns="${"http://www.w3.org/2000/svg"}" xmlns:xlink="${"http://www.w3.org/1999/xlink"}" x="${"0px"}" y="${"0px"}" viewBox="${"0 0 853.1 198.8"}" style="${"enable-background:new 0 0 853.1 198.8;"}" xml:space="${"preserve"}"><style type="${"text/css"}">.st0{fill:#ED8D1B;}
        .st1{fill:#1E4EE5;}
    </style><g><g><path class="${"st0"}" d="${"M253.7,117.9c-4.5,0-8.2-0.7-11-2c-2.8-1.3-4.9-3.5-6.1-6.6c-1.2-3.1-1.8-7.2-1.6-12.4l0.5-24.9h-9.2V61.5\r\n                    l9.8-2.6l2.2-16.5h12.9v16.5h13.8V72h-13.8v24.8c0,1.6,0.1,2.9,0.4,4c0.3,1,0.7,1.9,1.3,2.5c0.5,0.6,1.2,1.1,1.9,1.4\r\n                    c0.7,0.3,1.5,0.5,2.2,0.5l7.5,0.7v12.1H253.7z"}"></path><path class="${"st0"}" d="${"M272.5,117.9V34.2h16.3v30.8c2.1-1.8,4.9-3.4,8.3-4.8c3.4-1.5,6.9-2.2,10.5-2.2c4.5,0,8,0.9,10.7,2.6\r\n                    c2.6,1.8,4.5,4.2,5.7,7.4c1.2,3.2,1.8,6.8,1.8,11v39h-16.3V81c0-1.9-0.4-3.5-1.1-4.7c-0.7-1.2-1.7-2.2-3-2.8\r\n                    c-1.2-0.6-2.7-0.9-4.4-0.9c-1.5,0-3,0.2-4.4,0.6c-1.4,0.4-2.8,0.9-4.1,1.6c-1.3,0.7-2.5,1.4-3.7,2.2v41H272.5z"}"></path><path class="${"st0"}" d="${"M337.7,50.2c-1.5,0-2.3-0.7-2.3-2.2V37.2c0-1.5,0.8-2.3,2.3-2.3h12.5c0.7,0,1.2,0.2,1.5,0.7\r\n                    c0.4,0.4,0.5,1,0.5,1.6V48c0,1.5-0.7,2.2-2.1,2.2H337.7z M335.8,117.9v-59H352v59H335.8z"}"></path><path class="${"st0"}" d="${"M362.6,117.9v-59H376l2.9,6c2.2-1.8,5-3.5,8.3-4.9c3.3-1.4,6.8-2.1,10.3-2.1c4.8,0,8.6,1,11.2,2.9\r\n                    c2.6,1.9,4.5,4.4,5.5,7.6c1.1,3.2,1.6,6.7,1.6,10.6v38.9h-16.3V81.1c0-1.9-0.3-3.5-1-4.7c-0.7-1.2-1.7-2.2-2.9-2.9\r\n                    c-1.2-0.7-2.7-1-4.5-1c-1.5,0-3,0.2-4.4,0.5c-1.4,0.4-2.8,0.9-4.1,1.5c-1.3,0.7-2.5,1.4-3.7,2.3v41H362.6z"}"></path><path class="${"st0"}" d="${"M426,117.9V34.1h16.3v45.3h6.9l13-20.4h16.5l-17.4,27.8l19.1,31.2h-16.5L449,94h-6.7v23.8H426z"}"></path><path class="${"st1"}" d="${"M510.2,117.9c-4.5,0-8.2-0.7-11-2c-2.8-1.3-4.9-3.5-6.1-6.6c-1.2-3.1-1.8-7.2-1.6-12.4l0.5-24.9h-9.2V61.5\r\n                    l9.8-2.6l2.2-16.5h12.9v16.5h13.8V72h-13.8v24.8c0,1.6,0.1,2.9,0.4,4c0.3,1,0.7,1.9,1.3,2.5c0.5,0.6,1.2,1.1,1.9,1.4\r\n                    c0.7,0.3,1.5,0.5,2.2,0.5l7.5,0.7v12.1H510.2z"}"></path><path class="${"st1"}" d="${"M553.5,118.4c-6.5,0-11.7-0.9-15.6-2.6c-3.9-1.7-6.7-4.8-8.4-9.2c-1.7-4.4-2.6-10.5-2.6-18.2\r\n                    c0-8,0.8-14.2,2.4-18.6c1.6-4.4,4.3-7.5,8.1-9.2c3.8-1.8,9-2.6,15.5-2.6c5.9,0,10.5,0.6,14.1,1.8c3.5,1.2,6.1,3.2,7.6,6.2\r\n                    c1.6,2.9,2.4,7.1,2.4,12.4c0,4-0.8,7.1-2.4,9.4c-1.6,2.3-3.8,4-6.6,4.9c-2.9,1-6.2,1.5-10.1,1.5h-14.8c0.1,3,0.6,5.4,1.4,7.2\r\n                    c0.8,1.8,2.2,3.1,4.3,3.8c2.1,0.8,5.1,1.2,9.1,1.2H575v9.6c-2.9,0.6-6,1.2-9.4,1.7C562.2,118.1,558.2,118.4,553.5,118.4z\r\n                    M542.9,84.5h13.4c2.2,0,3.8-0.4,4.8-1.3c1-0.9,1.5-2.5,1.5-4.7c0-2.1-0.3-3.8-1-5.1c-0.7-1.3-1.7-2.2-3.1-2.7\r\n                    c-1.4-0.5-3.3-0.8-5.6-0.8c-2.5,0-4.5,0.4-5.9,1.3c-1.5,0.8-2.5,2.3-3.2,4.5S542.9,80.6,542.9,84.5z"}"></path><path class="${"st1"}" d="${"M597.6,118.5c-4.5,0-8.1-1.3-10.9-4c-2.8-2.6-4.2-6.3-4.2-11v-5.3c0-4.5,1.6-8.1,4.7-11\r\n                    c3.1-2.9,8.1-4.3,14.7-4.3h15v-4.1c0-1.8-0.3-3.4-1-4.6c-0.7-1.2-1.9-2.1-3.7-2.6c-1.8-0.5-4.5-0.8-8.2-0.8h-17.7v-9.4\r\n                    c2.9-0.9,6.2-1.6,9.9-2.3c3.8-0.7,8.3-1,13.7-1c4.9,0,9.1,0.6,12.6,1.8c3.5,1.2,6.1,3.2,7.9,6c1.8,2.9,2.7,6.8,2.7,11.9v40.1\r\n                    h-12.9l-2.6-6.3c-0.5,0.6-1.4,1.2-2.6,2s-2.8,1.5-4.6,2.3c-1.8,0.8-3.8,1.4-6,1.9S600,118.5,597.6,118.5z M605.8,107.2\r\n                    c0.7,0,1.6-0.1,2.5-0.3c0.9-0.2,1.9-0.4,2.9-0.7c1-0.3,1.9-0.5,2.7-0.8c0.8-0.3,1.5-0.5,2.1-0.7c0.5-0.2,0.9-0.4,1-0.4V90.6\r\n                    l-9.9,0.7c-2.9,0.2-5,1-6.3,2.2c-1.4,1.2-2,2.9-2,5.1v2.4c0,1.5,0.3,2.7,0.9,3.6c0.6,1,1.5,1.6,2.5,2\r\n                    C603.3,107,604.5,107.2,605.8,107.2z"}"></path><path class="${"st1"}" d="${"M666.4,118.5c-3.6,0-6.9-0.5-9.9-1.4c-3-1-5.7-2.5-7.9-4.8c-2.2-2.2-3.9-5.3-5.1-9.1\r\n                    c-1.2-3.8-1.8-8.7-1.8-14.6c0-6,0.5-11,1.6-14.9c1.1-4,2.7-7.1,4.9-9.4c2.2-2.3,4.8-3.9,8-4.9c3.1-1,6.7-1.4,10.7-1.4\r\n                    c3.6,0,7,0.2,10.3,0.6c3.3,0.4,6.7,1.1,10.3,2.1v9.3h-15.5c-3.4,0-6.1,0.5-8.1,1.5c-2.1,1-3.5,2.8-4.4,5.5\r\n                    c-0.9,2.7-1.4,6.5-1.4,11.5c0,4.9,0.5,8.6,1.4,11.2c0.9,2.6,2.4,4.3,4.5,5.2c2.1,0.9,4.9,1.3,8.3,1.3h16.1v9.2\r\n                    c-1.8,0.6-4,1.1-6.4,1.6c-2.4,0.5-5,0.8-7.6,1.1C671.6,118.4,669,118.5,666.4,118.5z"}"></path><path class="${"st1"}" d="${"M695.3,117.9V34.2h16.3v30.8c2.1-1.8,4.9-3.4,8.3-4.8c3.4-1.5,6.9-2.2,10.5-2.2c4.5,0,8,0.9,10.7,2.6\r\n                    c2.6,1.8,4.5,4.2,5.7,7.4c1.2,3.2,1.8,6.8,1.8,11v39h-16.3V81c0-1.9-0.4-3.5-1.1-4.7c-0.7-1.2-1.7-2.2-3-2.8\r\n                    c-1.2-0.6-2.7-0.9-4.4-0.9c-1.5,0-3,0.2-4.4,0.6c-1.4,0.4-2.8,0.9-4.1,1.6c-1.3,0.7-2.5,1.4-3.7,2.2v41H695.3z"}"></path><path class="${"st1"}" d="${"M783.5,118.4c-6.5,0-11.7-0.9-15.6-2.6c-3.9-1.7-6.7-4.8-8.4-9.2c-1.7-4.4-2.6-10.5-2.6-18.2\r\n                    c0-8,0.8-14.2,2.4-18.6c1.6-4.4,4.3-7.5,8.1-9.2c3.8-1.8,9-2.6,15.5-2.6c5.9,0,10.5,0.6,14.1,1.8c3.5,1.2,6.1,3.2,7.6,6.2\r\n                    c1.6,2.9,2.4,7.1,2.4,12.4c0,4-0.8,7.1-2.4,9.4c-1.6,2.3-3.8,4-6.6,4.9s-6.2,1.5-10.1,1.5h-14.8c0.1,3,0.6,5.4,1.4,7.2\r\n                    c0.8,1.8,2.2,3.1,4.3,3.8c2.1,0.8,5.1,1.2,9.1,1.2h17.2v9.6c-2.9,0.6-6,1.2-9.4,1.7C792.3,118.1,788.2,118.4,783.5,118.4z\r\n                    M772.9,84.5h13.4c2.2,0,3.8-0.4,4.8-1.3c1-0.9,1.5-2.5,1.5-4.7c0-2.1-0.3-3.8-1-5.1c-0.7-1.3-1.7-2.2-3.1-2.7\r\n                    c-1.4-0.5-3.3-0.8-5.6-0.8c-2.5,0-4.5,0.4-5.9,1.3c-1.5,0.8-2.5,2.3-3.2,4.5C773.2,77.6,772.9,80.6,772.9,84.5z"}"></path><path class="${"st1"}" d="${"M815.3,117.9v-59h12.5l3.7,9c2.1-2.7,4.5-5,7.2-6.9c2.7-1.9,5.8-2.9,9.5-2.9c0.8,0,1.6,0,2.5,0.1\r\n                    c0.8,0.1,1.6,0.2,2.4,0.4v16.7c-1.1-0.1-2.3-0.3-3.5-0.4c-1.2-0.1-2.4-0.2-3.5-0.2c-2.1,0-4,0.2-5.8,0.7c-1.7,0.5-3.3,1.2-4.7,2.1\r\n                    c-1.4,0.9-2.8,2.1-4.1,3.6v36.7H815.3z"}"></path></g><g><circle class="${"st0 svelte-1t71bo9"}" cx="${"83.6"}" cy="${"42.4"}" r="${"15.1"}"></circle><circle class="${"st1 svelte-1t71bo9"}" cx="${"28.7"}" cy="${"49.8"}" r="${"12.6"}"></circle><circle class="${"st1 svelte-1t71bo9"}" cx="${"53.9"}" cy="${"24.7"}" r="${"12.6"}"></circle><circle class="${"st1 svelte-1t71bo9"}" cx="${"131.9"}" cy="${"147.9"}" r="${"12.6"}"></circle><circle class="${"st1 svelte-1t71bo9"}" cx="${"169.2"}" cy="${"46.8"}" r="${"12.6"}"></circle><circle class="${"st1 svelte-1t71bo9"}" cx="${"59.3"}" cy="${"178.8"}" r="${"12.6"}"></circle><circle class="${"st1 svelte-1t71bo9"}" cx="${"17.6"}" cy="${"132.8"}" r="${"12.6"}"></circle><circle class="${"st1 svelte-1t71bo9"}" cx="${"41.3"}" cy="${"102.1"}" r="${"7.5"}"></circle><circle class="${"st1 svelte-1t71bo9"}" cx="${"46.8"}" cy="${"157.6"}" r="${"7.5"}"></circle><circle class="${"st1 svelte-1t71bo9"}" cx="${"56.2"}" cy="${"49.8"}" r="${"7.5"}"></circle><circle class="${"st1 svelte-1t71bo9"}" cx="${"79.3"}" cy="${"9.7"}" r="${"7.5"}"></circle><circle class="${"st1 svelte-1t71bo9"}" cx="${"112.2"}" cy="${"49.8"}" r="${"7.5"}"></circle><circle class="${"st1 svelte-1t71bo9"}" cx="${"95.2"}" cy="${"9.7"}" r="${"4.3"}"></circle><circle class="${"st1 svelte-1t71bo9"}" cx="${"94.4"}" cy="${"23"}" r="${"4.3"}"></circle><circle class="${"st0 svelte-1t71bo9"}" cx="${"107.8"}" cy="${"4.3"}" r="${"4.3"}"></circle><circle class="${"st0 svelte-1t71bo9"}" cx="${"123.4"}" cy="${"42.1"}" r="${"4.3"}"></circle><circle class="${"st1 svelte-1t71bo9"}" cx="${"125.2"}" cy="${"54.2"}" r="${"4.3"}"></circle><circle class="${"st1 svelte-1t71bo9"}" cx="${"22.7"}" cy="${"70.3"}" r="${"4.3"}"></circle><circle class="${"st1 svelte-1t71bo9"}" cx="${"77.9"}" cy="${"157.6"}" r="${"4.3"}"></circle><circle class="${"st1 svelte-1t71bo9"}" cx="${"33.1"}" cy="${"115.9"}" r="${"4.3"}"></circle><circle class="${"st1 svelte-1t71bo9"}" cx="${"46.8"}" cy="${"124.6"}" r="${"4.3"}"></circle><circle class="${"st1 svelte-1t71bo9"}" cx="${"53.9"}" cy="${"111.8"}" r="${"4.3"}"></circle><circle class="${"st0 svelte-1t71bo9"}" cx="${"60.6"}" cy="${"99"}" r="${"4.3"}"></circle><circle class="${"st1 svelte-1t71bo9"}" cx="${"78.4"}" cy="${"117.8"}" r="${"4.3"}"></circle><circle class="${"st1 svelte-1t71bo9"}" cx="${"97.8"}" cy="${"178.8"}" r="${"4.3"}"></circle><circle class="${"st1 svelte-1t71bo9"}" cx="${"93.5"}" cy="${"191.4"}" r="${"4.3"}"></circle><circle class="${"st1 svelte-1t71bo9"}" cx="${"138"}" cy="${"169.4"}" r="${"4.3"}"></circle><circle class="${"st0 svelte-1t71bo9"}" cx="${"33.1"}" cy="${"144.5"}" r="${"4.3"}"></circle><circle class="${"st0 svelte-1t71bo9"}" cx="${"142.3"}" cy="${"132.8"}" r="${"4.3"}"></circle><circle class="${"st1 svelte-1t71bo9"}" cx="${"123.4"}" cy="${"128.5"}" r="${"4.3"}"></circle><circle class="${"st1 svelte-1t71bo9"}" cx="${"82.2"}" cy="${"169.4"}" r="${"4.3"}"></circle><circle class="${"st1 svelte-1t71bo9"}" cx="${"156.3"}" cy="${"117.8"}" r="${"4.3"}"></circle><circle class="${"st1 svelte-1t71bo9"}" cx="${"157.8"}" cy="${"133.3"}" r="${"4.3"}"></circle><circle class="${"st1 svelte-1t71bo9"}" cx="${"110"}" cy="${"32.2"}" r="${"4.3"}"></circle><circle class="${"st1 svelte-1t71bo9"}" cx="${"170.8"}" cy="${"166.3"}" r="${"4.3"}"></circle><circle class="${"st1 svelte-1t71bo9"}" cx="${"143.8"}" cy="${"34.5"}" r="${"4.3"}"></circle><circle class="${"st1 svelte-1t71bo9"}" cx="${"161"}" cy="${"26.3"}" r="${"4.3"}"></circle><circle class="${"st1 svelte-1t71bo9"}" cx="${"192.3"}" cy="${"67.4"}" r="${"4.3"}"></circle><circle class="${"st1 svelte-1t71bo9"}" cx="${"177.4"}" cy="${"67.4"}" r="${"4.3"}"></circle><circle class="${"st1 svelte-1t71bo9"}" cx="${"175.8"}" cy="${"88.2"}" r="${"4.3"}"></circle><circle class="${"st1 svelte-1t71bo9"}" cx="${"144.5"}" cy="${"49.8"}" r="${"7.5"}"></circle><circle class="${"st0 svelte-1t71bo9"}" cx="${"165.2"}" cy="${"100.7"}" r="${"7.5"}"></circle><circle class="${"st1 svelte-1t71bo9"}" cx="${"74.7"}" cy="${"102.1"}" r="${"7.5"}"></circle><circle class="${"st1 svelte-1t71bo9"}" cx="${"192.3"}" cy="${"82.3"}" r="${"7.5"}"></circle><circle class="${"st1 svelte-1t71bo9"}" cx="${"156.6"}" cy="${"175.4"}" r="${"7.5"}"></circle><circle class="${"st1 svelte-1t71bo9"}" cx="${"30.1"}" cy="${"161.9"}" r="${"7.5"}"></circle><circle class="${"st0 svelte-1t71bo9"}" cx="${"79.3"}" cy="${"191.4"}" r="${"7.5"}"></circle><circle class="${"st1 svelte-1t71bo9"}" cx="${"156.6"}" cy="${"152"}" r="${"7.5"}"></circle><circle class="${"st1 svelte-1t71bo9"}" cx="${"184.9"}" cy="${"108.4"}" r="${"7.5"}"></circle><circle class="${"st1 svelte-1t71bo9"}" cx="${"180.3"}" cy="${"132.8"}" r="${"15.1"}"></circle><circle class="${"st1 svelte-1t71bo9"}" cx="${"127.2"}" cy="${"19.2"}" r="${"15.1"}"></circle><circle class="${"st1 svelte-1t71bo9"}" cx="${"120.9"}" cy="${"183"}" r="${"15.1"}"></circle><circle class="${"st1 svelte-1t71bo9"}" cx="${"66.4"}" cy="${"136.9"}" r="${"15.1"}"></circle><circle class="${"st1 svelte-1t71bo9"}" cx="${"15.1"}" cy="${"93.3"}" r="${"15.1"}"></circle><circle class="${"st1 svelte-1t71bo9"}" cx="${"134.4"}" cy="${"109.7"}" r="${"15.1"}"></circle></g><g><path class="${"st1"}" d="${"M250.3,183.3c-1.6,0-3-0.2-4.4-0.6c-1.3-0.4-2.6-0.9-3.7-1.4c-1.1-0.6-2.1-1.1-3-1.7l-0.9,3.3h-4v-47.3h4.9\r\n                    v17.2c1.6-0.9,3.3-1.7,5.3-2.4c2-0.7,3.8-1.1,5.5-1.1c2.6,0,4.8,0.6,6.6,1.7c1.7,1.1,3,2.9,3.9,5.5c0.9,2.5,1.3,5.9,1.3,10.1\r\n                    c0,3.4-0.4,6.4-1.2,8.9c-0.8,2.5-2,4.4-3.8,5.8C255.3,182.7,253.1,183.3,250.3,183.3z M248.7,179.2c1.8,0,3.3-0.5,4.6-1.4\r\n                    c1.2-0.9,2.1-2.3,2.8-4.2c0.6-1.9,1-4.3,1-7.1c0-3.6-0.4-6.4-1.1-8.2c-0.7-1.8-1.7-3.1-2.9-3.8s-2.7-1-4.3-1c-1.9,0-3.5,0.3-5,0.8\r\n                    c-1.5,0.5-3,1.2-4.5,2v20.3c1.3,0.6,2.7,1.2,4.2,1.8C245,178.9,246.8,179.2,248.7,179.2z"}"></path><path class="${"st1"}" d="${"M282.8,183.3c-3.5,0-6.2-0.5-8.2-1.6c-2-1-3.4-2.8-4.3-5.3c-0.9-2.5-1.3-5.9-1.3-10.2c0-4.4,0.4-7.8,1.3-10.3\r\n                    c0.9-2.5,2.3-4.2,4.4-5.2c2-1,4.8-1.5,8.2-1.5c2.9,0,5.3,0.3,7.2,1c1.8,0.7,3.2,1.8,4.1,3.4c0.9,1.6,1.3,3.8,1.3,6.6\r\n                    c0,1.9-0.4,3.5-1.1,4.7c-0.8,1.2-1.9,2-3.3,2.5c-1.4,0.5-3.1,0.8-5.1,0.8h-12.1c0,2.7,0.3,4.8,0.9,6.5c0.5,1.6,1.5,2.8,2.9,3.5\r\n                    c1.4,0.7,3.5,1.1,6.3,1.1h10.7v3c-1.9,0.2-3.8,0.5-5.6,0.6C287.3,183.2,285.2,183.3,282.8,183.3z M273.8,165.2h11.8\r\n                    c1.9,0,3.2-0.3,4.1-1c0.9-0.7,1.3-1.9,1.3-3.7c0-1.9-0.3-3.4-0.8-4.4c-0.6-1.1-1.4-1.8-2.6-2.2c-1.2-0.4-2.8-0.7-4.7-0.7\r\n                    c-2.3,0-4.1,0.3-5.5,1c-1.3,0.7-2.3,1.9-2.8,3.6C274.1,159.5,273.8,162,273.8,165.2z"}"></path><path class="${"st1"}" d="${"M303.7,183v-33.1h3.8l1.1,3.7c1.6-1.1,3.4-2.1,5.5-2.9c2.1-0.8,4.3-1.3,6.6-1.3c2.4,0,4.4,0.5,5.9,1.6\r\n                    c1.5,1,2.6,2.4,3.3,4.1c0.7,1.7,1.1,3.5,1.1,5.5V183h-4.9v-22c0-1.4-0.3-2.7-0.8-3.8s-1.3-2-2.4-2.6c-1-0.6-2.3-0.9-3.8-0.9\r\n                    c-1.4,0-2.6,0.1-3.8,0.4c-1.2,0.3-2.3,0.6-3.3,1.1c-1.1,0.5-2.2,1-3.3,1.7v26H303.7z"}"></path><path class="${"st1"}" d="${"M352.9,183.3c-3.5,0-6.2-0.5-8.2-1.6c-2-1-3.4-2.8-4.3-5.3c-0.9-2.5-1.3-5.9-1.3-10.2c0-4.4,0.4-7.8,1.3-10.3\r\n                    c0.9-2.5,2.3-4.2,4.4-5.2c2-1,4.8-1.5,8.2-1.5c2.9,0,5.3,0.3,7.2,1c1.8,0.7,3.2,1.8,4.1,3.4c0.9,1.6,1.3,3.8,1.3,6.6\r\n                    c0,1.9-0.4,3.5-1.1,4.7c-0.8,1.2-1.9,2-3.3,2.5c-1.4,0.5-3.1,0.8-5.1,0.8h-12.1c0,2.7,0.3,4.8,0.9,6.5c0.5,1.6,1.5,2.8,2.9,3.5\r\n                    c1.4,0.7,3.5,1.1,6.3,1.1h10.7v3c-1.9,0.2-3.8,0.5-5.6,0.6C357.3,183.2,355.2,183.3,352.9,183.3z M343.9,165.2h11.8\r\n                    c1.9,0,3.2-0.3,4.1-1c0.9-0.7,1.3-1.9,1.3-3.7c0-1.9-0.3-3.4-0.8-4.4c-0.6-1.1-1.4-1.8-2.6-2.2c-1.2-0.4-2.8-0.7-4.7-0.7\r\n                    c-2.3,0-4.1,0.3-5.5,1c-1.3,0.7-2.3,1.9-2.8,3.6C344.1,159.5,343.9,162,343.9,165.2z"}"></path><path class="${"st1"}" d="${"M375.4,183v-29.1h-5.1v-3.2l5.1-0.9v-4.4c0-2.3,0.3-4.2,0.8-5.7c0.6-1.5,1.5-2.6,2.9-3.4\r\n                    c1.3-0.7,3.2-1.1,5.4-1.1c1.6,0,2.9,0.1,4,0.3c1.1,0.2,2.1,0.4,3,0.7v3.5c-0.9-0.1-1.8-0.2-2.8-0.2c-1-0.1-1.9-0.1-2.8-0.1\r\n                    c-1.5,0-2.7,0.2-3.5,0.7s-1.4,1.2-1.7,2.2s-0.5,2.2-0.5,3.7v3.8h19.6v4h-19.6V183H375.4z M398.3,143.9c-0.7,0-1-0.3-1-1v-4.8\r\n                    c0-0.7,0.3-1,1-1h3.5c0.3,0,0.5,0.1,0.7,0.3c0.1,0.2,0.2,0.4,0.2,0.7v4.8c0,0.7-0.3,1-0.9,1H398.3z M397.5,183v-33.1h4.9V183\r\n                    H397.5z"}"></path><path class="${"st1"}" d="${"M422.8,183c-2.2,0-3.9-0.4-5.3-1.1c-1.4-0.7-2.4-1.8-3.1-3.4c-0.7-1.6-1-3.7-0.9-6.3l0.2-18.4h-5.3v-3.2\r\n                    l5.3-0.9l0.8-9.2h3.8v9.2h9.6v4h-9.6v18.4c0,1.4,0.2,2.6,0.5,3.5s0.7,1.5,1.2,2c0.5,0.5,1.1,0.8,1.6,1c0.6,0.2,1.1,0.3,1.7,0.3\r\n                    l4,0.4v3.6H422.8z"}"></path><path class="${"st1"}" d="${"M446,183.3c-0.8,0-1.8,0-3-0.1c-1.2,0-2.5-0.1-3.8-0.2c-1.3-0.1-2.5-0.2-3.5-0.3c-1.1-0.1-1.9-0.2-2.5-0.3v-3\r\n                    h13.6c1.4,0,2.5-0.1,3.5-0.3c1-0.2,1.8-0.7,2.3-1.4c0.6-0.7,0.8-1.8,0.8-3.2v-1.5c0-1.4-0.5-2.6-1.4-3.4c-1-0.8-2.5-1.2-4.6-1.2\r\n                    h-4.7c-1.9,0-3.7-0.2-5.2-0.7c-1.5-0.5-2.7-1.3-3.5-2.5c-0.8-1.2-1.2-2.9-1.2-5v-1.7c0-2.1,0.4-3.8,1.2-5.1c0.8-1.3,2.1-2.3,3.8-3\r\n                    c1.7-0.7,3.9-1,6.7-1c1.2,0,2.5,0,4,0.1c1.5,0.1,3,0.2,4.4,0.3c1.4,0.1,2.6,0.3,3.5,0.5v3h-12.8c-2.1,0-3.7,0.4-4.9,1.1\r\n                    c-1.1,0.7-1.7,2.1-1.7,4.1v1.4c0,1.3,0.3,2.2,0.8,2.9c0.5,0.6,1.3,1.1,2.3,1.3c1,0.2,2.1,0.3,3.4,0.3h4.7c3,0,5.4,0.7,7,2.1\r\n                    c1.7,1.4,2.5,3.4,2.5,6.1v2.3c0,2.2-0.5,4-1.5,5.2c-1,1.2-2.4,2.1-4.2,2.5C450.4,183.1,448.4,183.3,446,183.3z"}"></path><path class="${"st1"}" d="${"M493.8,183.3c-0.8,0-1.8,0-3-0.1c-1.2,0-2.5-0.1-3.8-0.2c-1.3-0.1-2.5-0.2-3.5-0.3c-1.1-0.1-1.9-0.2-2.5-0.3\r\n                    v-3h13.6c1.4,0,2.5-0.1,3.5-0.3c1-0.2,1.8-0.7,2.3-1.4c0.6-0.7,0.8-1.8,0.8-3.2v-1.5c0-1.4-0.5-2.6-1.4-3.4\r\n                    c-1-0.8-2.5-1.2-4.6-1.2h-4.7c-1.9,0-3.7-0.2-5.2-0.7c-1.5-0.5-2.7-1.3-3.5-2.5c-0.8-1.2-1.2-2.9-1.2-5v-1.7\r\n                    c0-2.1,0.4-3.8,1.2-5.1c0.8-1.3,2.1-2.3,3.8-3c1.7-0.7,3.9-1,6.7-1c1.2,0,2.5,0,4,0.1c1.5,0.1,3,0.2,4.4,0.3\r\n                    c1.4,0.1,2.6,0.3,3.5,0.5v3h-12.8c-2.1,0-3.7,0.4-4.9,1.1c-1.1,0.7-1.7,2.1-1.7,4.1v1.4c0,1.3,0.3,2.2,0.8,2.9\r\n                    c0.5,0.6,1.3,1.1,2.3,1.3c1,0.2,2.1,0.3,3.4,0.3h4.7c3,0,5.4,0.7,7,2.1c1.7,1.4,2.5,3.4,2.5,6.1v2.3c0,2.2-0.5,4-1.5,5.2\r\n                    c-1,1.2-2.4,2.1-4.2,2.5C498.2,183.1,496.1,183.3,493.8,183.3z"}"></path><path class="${"st1"}" d="${"M523.2,183.3c-3.2,0-5.6-0.8-7.3-2.5c-1.7-1.7-2.6-4.2-2.6-7.7v-23.3h4.9v22.1c0,2.8,0.6,4.6,1.9,5.6\r\n                    c1.3,1,3,1.5,5.3,1.5c1.9,0,3.7-0.3,5.3-0.8c1.6-0.6,3.3-1.3,5-2.3v-26h4.9V183h-3.8l-1.1-3.7c-1.7,1.1-3.6,2-5.7,2.8\r\n                    C527.8,182.9,525.6,183.3,523.2,183.3z"}"></path><path class="${"st1"}" d="${"M549.8,197.6v-47.8h4l0.9,3.4c0.7-0.5,1.7-1.1,2.9-1.7c1.2-0.6,2.5-1.1,3.8-1.5c1.4-0.4,2.8-0.6,4.1-0.6\r\n                    c2.1,0,4,0.5,5.5,1.4c1.5,0.9,2.7,2.2,3.7,3.8c1,1.6,1.6,3.4,2,5.4c0.4,2,0.6,4.2,0.6,6.4c0,3.7-0.4,6.9-1.3,9.4\r\n                    c-0.8,2.5-2.1,4.5-3.9,5.7c-1.7,1.3-4,1.9-6.7,1.9c-1.9,0-3.7-0.3-5.6-0.9c-1.9-0.6-3.6-1.4-5.2-2.3v17.4H549.8z M564.2,179.2\r\n                    c1.6,0,3-0.4,4.2-1.2c1.2-0.8,2.2-2.1,3-4c0.7-1.9,1.1-4.5,1.1-7.7c0-3.1-0.4-5.6-1.2-7.5c-0.8-1.9-1.8-3.2-3-4.1\r\n                    c-1.2-0.8-2.6-1.3-4.1-1.3c-1.9,0-3.6,0.3-5.2,0.9c-1.6,0.6-3,1.2-4.2,1.9v20.3c1.4,0.8,3,1.4,4.6,1.9\r\n                    C561,179,562.6,179.2,564.2,179.2z"}"></path><path class="${"st1"}" d="${"M585.7,197.6v-47.8h4l0.9,3.4c0.7-0.5,1.7-1.1,2.9-1.7c1.2-0.6,2.5-1.1,3.8-1.5c1.4-0.4,2.8-0.6,4.1-0.6\r\n                    c2.1,0,4,0.5,5.5,1.4c1.5,0.9,2.7,2.2,3.7,3.8c1,1.6,1.6,3.4,2,5.4c0.4,2,0.6,4.2,0.6,6.4c0,3.7-0.4,6.9-1.3,9.4\r\n                    c-0.8,2.5-2.1,4.5-3.9,5.7c-1.7,1.3-4,1.9-6.7,1.9c-1.9,0-3.7-0.3-5.6-0.9c-1.9-0.6-3.6-1.4-5.2-2.3v17.4H585.7z M600.1,179.2\r\n                    c1.6,0,3-0.4,4.2-1.2c1.2-0.8,2.2-2.1,3-4c0.7-1.9,1.1-4.5,1.1-7.7c0-3.1-0.4-5.6-1.2-7.5c-0.8-1.9-1.8-3.2-3-4.1\r\n                    c-1.2-0.8-2.6-1.3-4.1-1.3c-1.9,0-3.6,0.3-5.2,0.9c-1.6,0.6-3,1.2-4.2,1.9v20.3c1.4,0.8,3,1.4,4.6,1.9\r\n                    C596.8,179,598.4,179.2,600.1,179.2z"}"></path><path class="${"st1"}" d="${"M634.7,183.3c-2.4,0-4.5-0.2-6.3-0.7s-3.3-1.4-4.5-2.6c-1.2-1.2-2.1-3-2.7-5.2c-0.6-2.2-0.9-5-0.9-8.5\r\n                    c0-3.5,0.3-6.3,0.9-8.5c0.6-2.2,1.5-3.9,2.7-5.1c1.2-1.2,2.7-2.1,4.5-2.5c1.8-0.5,3.9-0.7,6.3-0.7c2.4,0,4.5,0.2,6.3,0.7\r\n                    c1.8,0.5,3.3,1.4,4.5,2.6c1.2,1.2,2.1,2.9,2.7,5.1c0.6,2.2,0.9,5,0.9,8.5c0,3.5-0.3,6.3-0.9,8.5c-0.6,2.2-1.5,3.9-2.7,5.1\r\n                    c-1.2,1.2-2.7,2.1-4.5,2.6C639.2,183.1,637.1,183.3,634.7,183.3z M634.7,179.3c1.5,0,2.9-0.1,4.1-0.4c1.2-0.3,2.2-0.9,2.9-1.7\r\n                    c0.8-0.9,1.4-2.2,1.8-3.9c0.4-1.7,0.6-4,0.6-6.9c0-2.9-0.2-5.2-0.6-6.9c-0.4-1.7-1-3-1.8-3.8c-0.8-0.9-1.8-1.4-2.9-1.7\r\n                    c-1.2-0.3-2.5-0.4-4.1-0.4c-1.6,0-2.9,0.1-4.1,0.4c-1.2,0.3-2.1,0.9-2.9,1.7c-0.8,0.9-1.4,2.2-1.8,3.8c-0.4,1.7-0.6,4-0.6,6.9\r\n                    c0,2.9,0.2,5.1,0.6,6.9c0.4,1.7,1,3,1.8,3.9c0.8,0.9,1.8,1.4,2.9,1.7S633.1,179.3,634.7,179.3z"}"></path><path class="${"st1"}" d="${"M657.3,183v-33.1h3.7l1.2,5.8c1.5-1.8,3.2-3.2,5-4.4c1.8-1.2,4-1.7,6.4-1.7c0.6,0,1.1,0,1.6,0.1\r\n                    c0.5,0,1,0.1,1.5,0.2v5c-0.5-0.1-1.1-0.2-1.7-0.2c-0.6-0.1-1.2-0.1-1.9-0.1c-1.5,0-2.9,0.2-4.1,0.6c-1.2,0.4-2.3,0.9-3.4,1.7\r\n                    c-1.1,0.7-2.2,1.7-3.3,2.7V183H657.3z"}"></path><path class="${"st1"}" d="${"M694.4,183c-2.2,0-3.9-0.4-5.3-1.1c-1.4-0.7-2.4-1.8-3.1-3.4s-1-3.7-0.9-6.3l0.2-18.4H680v-3.2l5.3-0.9\r\n                    l0.8-9.2h3.8v9.2h9.6v4h-9.6v18.4c0,1.4,0.2,2.6,0.5,3.5c0.3,0.9,0.7,1.5,1.2,2c0.5,0.5,1.1,0.8,1.6,1c0.6,0.2,1.1,0.3,1.7,0.3\r\n                    l4,0.4v3.6H694.4z"}"></path><path class="${"st1"}" d="${"M735,183.3c-1.9,0-3.6-0.2-5.2-0.7s-3-1.4-4.2-2.6c-1.2-1.2-2.1-3-2.8-5.1c-0.7-2.2-1-5-1-8.4\r\n                    c0-3.4,0.3-6.3,0.9-8.5c0.6-2.2,1.5-3.9,2.7-5.2c1.2-1.2,2.6-2.1,4.2-2.6c1.7-0.5,3.5-0.7,5.5-0.7c1.7,0,3.5,0.1,5.4,0.2\r\n                    c1.9,0.1,3.8,0.4,5.6,0.7v2.9h-9.7c-2.1,0-3.9,0.4-5.3,1.1c-1.4,0.7-2.5,2-3.3,3.9c-0.7,1.9-1.1,4.7-1.1,8.3\r\n                    c0,3.5,0.4,6.2,1.2,8.1c0.8,1.9,1.9,3.1,3.3,3.8c1.4,0.7,3.2,1,5.3,1h10.1v2.9c-1,0.2-2.1,0.3-3.3,0.5c-1.3,0.2-2.6,0.3-4,0.4\r\n                    C737.9,183.3,736.5,183.3,735,183.3z"}"></path><path class="${"st1"}" d="${"M759.8,183.3c-2.4,0-4.4-0.7-6-2.2c-1.6-1.4-2.4-3.5-2.4-6.1v-2.4c0-2.6,0.9-4.7,2.6-6.3s4.3-2.4,7.8-2.4H773\r\n                    v-4.1c0-1.4-0.2-2.5-0.7-3.5c-0.5-1-1.3-1.7-2.5-2.3c-1.2-0.5-3-0.8-5.3-0.8h-10.3v-2.9c1.4-0.2,3.1-0.5,5.1-0.7\r\n                    c1.9-0.2,4.2-0.3,6.8-0.3c2.7,0,4.9,0.3,6.7,1c1.8,0.7,3.1,1.8,3.9,3.3c0.8,1.5,1.3,3.5,1.3,5.9V183h-3.8l-0.9-3.8\r\n                    c-0.2,0.2-0.7,0.5-1.5,0.9c-0.8,0.4-1.9,0.9-3.2,1.4c-1.3,0.5-2.7,1-4.2,1.3C762.7,183.1,761.3,183.3,759.8,183.3z M761.9,179.7\r\n                    c0.7,0,1.6,0,2.5-0.2c1-0.2,1.9-0.4,2.9-0.7c1-0.3,1.9-0.5,2.8-0.8c0.8-0.3,1.5-0.5,2.1-0.7c0.5-0.2,0.8-0.3,0.9-0.3v-10.4\r\n                    l-10.1,0.4c-2.4,0.1-4,0.7-5.1,1.7c-1,1.1-1.5,2.5-1.5,4.2v1.5c0,1.3,0.3,2.4,0.8,3.2c0.6,0.8,1.3,1.4,2.1,1.7\r\n                    S761,179.6,761.9,179.7z"}"></path><path class="${"st1"}" d="${"M787.2,183v-33.1h3.7l1.2,5.8c1.5-1.8,3.2-3.2,5-4.4c1.8-1.2,4-1.7,6.4-1.7c0.6,0,1.1,0,1.6,0.1\r\n                    c0.5,0,1,0.1,1.5,0.2v5c-0.5-0.1-1.1-0.2-1.7-0.2c-0.6-0.1-1.2-0.1-1.9-0.1c-1.5,0-2.9,0.2-4.1,0.6c-1.2,0.4-2.3,0.9-3.4,1.7\r\n                    c-1.1,0.7-2.2,1.7-3.3,2.7V183H787.2z"}"></path><path class="${"st1"}" d="${"M825.4,183.3c-3.5,0-6.2-0.5-8.2-1.6c-2-1-3.4-2.8-4.3-5.3c-0.9-2.5-1.3-5.9-1.3-10.2c0-4.4,0.4-7.8,1.3-10.3\r\n                    c0.9-2.5,2.3-4.2,4.4-5.2s4.8-1.5,8.2-1.5c2.9,0,5.3,0.3,7.2,1c1.8,0.7,3.2,1.8,4.1,3.4c0.9,1.6,1.3,3.8,1.3,6.6\r\n                    c0,1.9-0.4,3.5-1.1,4.7c-0.8,1.2-1.9,2-3.3,2.5c-1.4,0.5-3.1,0.8-5.1,0.8h-12.1c0,2.7,0.3,4.8,0.9,6.5c0.5,1.6,1.5,2.8,2.9,3.5\r\n                    c1.4,0.7,3.5,1.1,6.3,1.1h10.7v3c-1.9,0.2-3.8,0.5-5.6,0.6C829.8,183.2,827.7,183.3,825.4,183.3z M816.4,165.2h11.8\r\n                    c1.9,0,3.2-0.3,4.1-1c0.9-0.7,1.3-1.9,1.3-3.7c0-1.9-0.3-3.4-0.8-4.4c-0.6-1.1-1.4-1.8-2.6-2.2c-1.2-0.4-2.8-0.7-4.7-0.7\r\n                    c-2.3,0-4.1,0.3-5.5,1c-1.3,0.7-2.3,1.9-2.8,3.6C816.6,159.5,816.4,162,816.4,165.2z"}"></path></g></g></svg>
</div>`;
});
var _layout$1 = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `${validate_component(Header, "Header").$$render($$result, {}, {}, {})}

<div class="${"container"}">${slots.default ? slots.default({}) : ``}</div>

${validate_component(Footer, "Footer").$$render($$result, {}, {}, {})}`;
});
var __layout$1 = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  "default": _layout$1
});
function load({ error: error2, status }) {
  return {
    props: { title: `${status}: ${error2.message}` }
  };
}
var _error = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { title } = $$props;
  if ($$props.title === void 0 && $$bindings.title && title !== void 0)
    $$bindings.title(title);
  return `<div class="${"container p-4 text-center"}"><h1>${escape2(title)}</h1></div>`;
});
var __error = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  "default": _error,
  load
});
var css$2 = {
  code: "#bubbles.svelte-m53d4m{padding:200px 0}.bubble-orange.svelte-m53d4m{width:70px;height:70px;background:var(--logo-orange);border-radius:200px;position:relative}.bubble-blue.svelte-m53d4m{width:70px;height:70px;background:var(--logo-blue);border-radius:200px;position:relative}.x1.svelte-m53d4m{left:50vw;z-index:-9999;transform:scale(0.9);opacity:0.22;animation:svelte-m53d4m-moveclouds 15s linear infinite, svelte-m53d4m-sideWays 4s ease-in-out infinite alternate}.x2.svelte-m53d4m{left:25vw;z-index:-9999;transform:scale(0.6);opacity:0.5;animation:svelte-m53d4m-moveclouds 25s linear infinite, svelte-m53d4m-sideWays 5s ease-in-out infinite alternate}.x3.svelte-m53d4m{left:30vw;z-index:-9999;transform:scale(0.95);opacity:0.31;animation:svelte-m53d4m-moveclouds 20s linear infinite, svelte-m53d4m-sideWays 4s ease-in-out infinite alternate}.x4.svelte-m53d4m{left:90vw;z-index:-9999;transform:scale(0.75);opacity:0.39;animation:svelte-m53d4m-moveclouds 18s linear infinite, svelte-m53d4m-sideWays 7s ease-in-out infinite alternate}.x5.svelte-m53d4m{left:10vw;z-index:-9999;transform:scale(0.8);opacity:0.38;animation:svelte-m53d4m-moveclouds 12s linear infinite, svelte-m53d4m-sideWays 4s ease-in-out infinite alternate}.x6.svelte-m53d4m{left:75vw;z-index:-9999;transform:scale(1.1);opacity:0.32;animation:svelte-m53d4m-moveclouds 14s linear infinite, svelte-m53d4m-sideWays 6s ease-in-out infinite alternate}.x7.svelte-m53d4m{left:5vw;z-index:-9999;transform:scale(0.65);opacity:0.48;animation:svelte-m53d4m-moveclouds 16s linear infinite, svelte-m53d4m-sideWays 4s ease-in-out infinite alternate}.x8.svelte-m53d4m{left:15vw;z-index:-9999;transform:scale(1.05);opacity:0.28;animation:svelte-m53d4m-moveclouds 28s linear infinite, svelte-m53d4m-sideWays 5s ease-in-out infinite alternate}.x9.svelte-m53d4m{left:86vw;z-index:-9999;transform:scale(0.52);opacity:0.54;animation:svelte-m53d4m-moveclouds 16s linear infinite, svelte-m53d4m-sideWays 6s ease-in-out infinite alternate}.x10.svelte-m53d4m{left:42vw;z-index:-9999;transform:scale(0.87);opacity:0.53;animation:svelte-m53d4m-moveclouds 24s linear infinite, svelte-m53d4m-sideWays 3s ease-in-out infinite alternate}@keyframes svelte-m53d4m-moveclouds{0%{top:50px}100%{top:-900px}}@keyframes svelte-m53d4m-sideWays{0%{margin-left:0px}100%{margin-left:75px}}",
  map: '{"version":3,"file":"bubble.svelte","sources":["bubble.svelte"],"sourcesContent":["<div id=\\"bubbles\\">\\r\\n    <div class=\\"bubble-orange x1\\"></div>\\r\\n    <div class=\\"bubble-blue x2\\"></div>\\r\\n    <div class=\\"bubble-orange x3\\"></div>\\r\\n    <div class=\\"bubble-blue x4\\"></div>\\r\\n    <div class=\\"bubble-orange x5\\"></div>\\r\\n    <div class=\\"bubble-blue x6\\"></div>\\r\\n    <div class=\\"bubble-orange x7\\"></div>\\r\\n    <div class=\\"bubble-blue x8\\"></div>\\r\\n    <div class=\\"bubble-orange x9\\"></div>\\r\\n    <div class=\\"bubble-blue x10\\"></div>\\r\\n</div>\\r\\n\\r\\n<style>\\r\\n#bubbles { \\r\\n    /* height: 100%; */\\r\\n    padding: 200px 0;\\r\\n}\\r\\n.bubble-orange {\\r\\n    width: 70px;\\r\\n    height: 70px;\\r\\n    background: var(--logo-orange);\\r\\n    border-radius: 200px;\\r\\n    position: relative;\\r\\n}\\r\\n.bubble-blue {\\r\\n    width: 70px;\\r\\n    height: 70px;\\r\\n    background: var(--logo-blue);\\r\\n    border-radius: 200px;\\r\\n    position: relative;\\r\\n}\\r\\n\\r\\n.x1 {\\r\\n    left: 50vw;\\r\\n    z-index: -9999;\\r\\n    transform: scale(0.9);\\r\\n    opacity: 0.22;\\r\\n    animation: moveclouds 15s linear infinite, sideWays 4s ease-in-out infinite alternate;\\r\\n}\\r\\n.x2 {\\r\\n    left: 25vw;\\r\\n    z-index: -9999;\\r\\n    transform: scale(0.6);\\r\\n    opacity: 0.5;\\r\\n    animation: moveclouds 25s linear infinite, sideWays 5s ease-in-out infinite alternate;\\r\\n}\\r\\n.x3 {\\r\\n    left: 30vw;\\r\\n    z-index: -9999;\\r\\n    transform: scale(0.95);\\r\\n    opacity: 0.31;\\r\\n    animation: moveclouds 20s linear infinite, sideWays 4s ease-in-out infinite alternate;\\r\\n}\\r\\n.x4 {\\r\\n    left: 90vw;\\r\\n    z-index: -9999;\\r\\n    transform: scale(0.75);\\r\\n    opacity: 0.39;\\r\\n    animation: moveclouds 18s linear infinite, sideWays 7s ease-in-out infinite alternate;\\r\\n}\\r\\n.x5 {\\r\\n    left: 10vw;\\r\\n    z-index: -9999;\\r\\n    transform: scale(0.8);\\r\\n    opacity: 0.38; \\r\\n    animation: moveclouds 12s linear infinite, sideWays 4s ease-in-out infinite alternate;\\r\\n}\\r\\n.x6 {\\r\\n    left: 75vw;\\r\\n    z-index: -9999;\\r\\n    transform: scale(1.1);\\r\\n    opacity: 0.32; \\r\\n    animation: moveclouds 14s linear infinite, sideWays 6s ease-in-out infinite alternate;\\r\\n}\\r\\n.x7 {\\r\\n    left: 5vw;\\r\\n    z-index: -9999;\\r\\n    transform: scale(0.65);\\r\\n    opacity: 0.48; \\r\\n    animation: moveclouds 16s linear infinite, sideWays 4s ease-in-out infinite alternate;\\r\\n}\\r\\n.x8 {\\r\\n    left: 15vw;\\r\\n    z-index: -9999;\\r\\n    transform: scale(1.05);\\r\\n    opacity: 0.28; \\r\\n    animation: moveclouds 28s linear infinite, sideWays 5s ease-in-out infinite alternate;\\r\\n}\\r\\n.x9 {\\r\\n    left: 86vw;\\r\\n    z-index: -9999;\\r\\n    transform: scale(0.52);\\r\\n    opacity: 0.54; \\r\\n    animation: moveclouds 16s linear infinite, sideWays 6s ease-in-out infinite alternate;\\r\\n}\\r\\n.x10 {\\r\\n    left: 42vw;\\r\\n    z-index: -9999;\\r\\n    transform: scale(0.87);\\r\\n    opacity: 0.53; \\r\\n    animation: moveclouds 24s linear infinite, sideWays 3s ease-in-out infinite alternate;\\r\\n}\\r\\n\\r\\n@keyframes moveclouds {     \\r\\n    0% { \\r\\n        top: 50px;\\r\\n    }\\r\\n    100% { \\r\\n        top: -900px;\\r\\n    }\\r\\n}\\r\\n\\r\\n@keyframes sideWays {\\r\\n    0% {\\r\\n        margin-left:0px;\\r\\n    }\\r\\n    100% {\\r\\n        margin-left:75px;\\r\\n    }\\r\\n}\\r\\n</style>"],"names":[],"mappings":"AAcA,QAAQ,cAAC,CAAC,AAEN,OAAO,CAAE,KAAK,CAAC,CAAC,AACpB,CAAC,AACD,cAAc,cAAC,CAAC,AACZ,KAAK,CAAE,IAAI,CACX,MAAM,CAAE,IAAI,CACZ,UAAU,CAAE,IAAI,aAAa,CAAC,CAC9B,aAAa,CAAE,KAAK,CACpB,QAAQ,CAAE,QAAQ,AACtB,CAAC,AACD,YAAY,cAAC,CAAC,AACV,KAAK,CAAE,IAAI,CACX,MAAM,CAAE,IAAI,CACZ,UAAU,CAAE,IAAI,WAAW,CAAC,CAC5B,aAAa,CAAE,KAAK,CACpB,QAAQ,CAAE,QAAQ,AACtB,CAAC,AAED,GAAG,cAAC,CAAC,AACD,IAAI,CAAE,IAAI,CACV,OAAO,CAAE,KAAK,CACd,SAAS,CAAE,MAAM,GAAG,CAAC,CACrB,OAAO,CAAE,IAAI,CACb,SAAS,CAAE,wBAAU,CAAC,GAAG,CAAC,MAAM,CAAC,QAAQ,CAAC,CAAC,sBAAQ,CAAC,EAAE,CAAC,WAAW,CAAC,QAAQ,CAAC,SAAS,AACzF,CAAC,AACD,GAAG,cAAC,CAAC,AACD,IAAI,CAAE,IAAI,CACV,OAAO,CAAE,KAAK,CACd,SAAS,CAAE,MAAM,GAAG,CAAC,CACrB,OAAO,CAAE,GAAG,CACZ,SAAS,CAAE,wBAAU,CAAC,GAAG,CAAC,MAAM,CAAC,QAAQ,CAAC,CAAC,sBAAQ,CAAC,EAAE,CAAC,WAAW,CAAC,QAAQ,CAAC,SAAS,AACzF,CAAC,AACD,GAAG,cAAC,CAAC,AACD,IAAI,CAAE,IAAI,CACV,OAAO,CAAE,KAAK,CACd,SAAS,CAAE,MAAM,IAAI,CAAC,CACtB,OAAO,CAAE,IAAI,CACb,SAAS,CAAE,wBAAU,CAAC,GAAG,CAAC,MAAM,CAAC,QAAQ,CAAC,CAAC,sBAAQ,CAAC,EAAE,CAAC,WAAW,CAAC,QAAQ,CAAC,SAAS,AACzF,CAAC,AACD,GAAG,cAAC,CAAC,AACD,IAAI,CAAE,IAAI,CACV,OAAO,CAAE,KAAK,CACd,SAAS,CAAE,MAAM,IAAI,CAAC,CACtB,OAAO,CAAE,IAAI,CACb,SAAS,CAAE,wBAAU,CAAC,GAAG,CAAC,MAAM,CAAC,QAAQ,CAAC,CAAC,sBAAQ,CAAC,EAAE,CAAC,WAAW,CAAC,QAAQ,CAAC,SAAS,AACzF,CAAC,AACD,GAAG,cAAC,CAAC,AACD,IAAI,CAAE,IAAI,CACV,OAAO,CAAE,KAAK,CACd,SAAS,CAAE,MAAM,GAAG,CAAC,CACrB,OAAO,CAAE,IAAI,CACb,SAAS,CAAE,wBAAU,CAAC,GAAG,CAAC,MAAM,CAAC,QAAQ,CAAC,CAAC,sBAAQ,CAAC,EAAE,CAAC,WAAW,CAAC,QAAQ,CAAC,SAAS,AACzF,CAAC,AACD,GAAG,cAAC,CAAC,AACD,IAAI,CAAE,IAAI,CACV,OAAO,CAAE,KAAK,CACd,SAAS,CAAE,MAAM,GAAG,CAAC,CACrB,OAAO,CAAE,IAAI,CACb,SAAS,CAAE,wBAAU,CAAC,GAAG,CAAC,MAAM,CAAC,QAAQ,CAAC,CAAC,sBAAQ,CAAC,EAAE,CAAC,WAAW,CAAC,QAAQ,CAAC,SAAS,AACzF,CAAC,AACD,GAAG,cAAC,CAAC,AACD,IAAI,CAAE,GAAG,CACT,OAAO,CAAE,KAAK,CACd,SAAS,CAAE,MAAM,IAAI,CAAC,CACtB,OAAO,CAAE,IAAI,CACb,SAAS,CAAE,wBAAU,CAAC,GAAG,CAAC,MAAM,CAAC,QAAQ,CAAC,CAAC,sBAAQ,CAAC,EAAE,CAAC,WAAW,CAAC,QAAQ,CAAC,SAAS,AACzF,CAAC,AACD,GAAG,cAAC,CAAC,AACD,IAAI,CAAE,IAAI,CACV,OAAO,CAAE,KAAK,CACd,SAAS,CAAE,MAAM,IAAI,CAAC,CACtB,OAAO,CAAE,IAAI,CACb,SAAS,CAAE,wBAAU,CAAC,GAAG,CAAC,MAAM,CAAC,QAAQ,CAAC,CAAC,sBAAQ,CAAC,EAAE,CAAC,WAAW,CAAC,QAAQ,CAAC,SAAS,AACzF,CAAC,AACD,GAAG,cAAC,CAAC,AACD,IAAI,CAAE,IAAI,CACV,OAAO,CAAE,KAAK,CACd,SAAS,CAAE,MAAM,IAAI,CAAC,CACtB,OAAO,CAAE,IAAI,CACb,SAAS,CAAE,wBAAU,CAAC,GAAG,CAAC,MAAM,CAAC,QAAQ,CAAC,CAAC,sBAAQ,CAAC,EAAE,CAAC,WAAW,CAAC,QAAQ,CAAC,SAAS,AACzF,CAAC,AACD,IAAI,cAAC,CAAC,AACF,IAAI,CAAE,IAAI,CACV,OAAO,CAAE,KAAK,CACd,SAAS,CAAE,MAAM,IAAI,CAAC,CACtB,OAAO,CAAE,IAAI,CACb,SAAS,CAAE,wBAAU,CAAC,GAAG,CAAC,MAAM,CAAC,QAAQ,CAAC,CAAC,sBAAQ,CAAC,EAAE,CAAC,WAAW,CAAC,QAAQ,CAAC,SAAS,AACzF,CAAC,AAED,WAAW,wBAAW,CAAC,AACnB,EAAE,AAAC,CAAC,AACA,GAAG,CAAE,IAAI,AACb,CAAC,AACD,IAAI,AAAC,CAAC,AACF,GAAG,CAAE,MAAM,AACf,CAAC,AACL,CAAC,AAED,WAAW,sBAAS,CAAC,AACjB,EAAE,AAAC,CAAC,AACA,YAAY,GAAG,AACnB,CAAC,AACD,IAAI,AAAC,CAAC,AACF,YAAY,IAAI,AACpB,CAAC,AACL,CAAC"}'
};
create_ssr_component(($$result, $$props, $$bindings, slots) => {
  $$result.css.add(css$2);
  return `<div id="${"bubbles"}" class="${"svelte-m53d4m"}"><div class="${"bubble-orange x1 svelte-m53d4m"}"></div>
    <div class="${"bubble-blue x2 svelte-m53d4m"}"></div>
    <div class="${"bubble-orange x3 svelte-m53d4m"}"></div>
    <div class="${"bubble-blue x4 svelte-m53d4m"}"></div>
    <div class="${"bubble-orange x5 svelte-m53d4m"}"></div>
    <div class="${"bubble-blue x6 svelte-m53d4m"}"></div>
    <div class="${"bubble-orange x7 svelte-m53d4m"}"></div>
    <div class="${"bubble-blue x8 svelte-m53d4m"}"></div>
    <div class="${"bubble-orange x9 svelte-m53d4m"}"></div>
    <div class="${"bubble-blue x10 svelte-m53d4m"}"></div>
</div>`;
});
var css$1 = {
  code: "h1.svelte-h1tb5e{margin-top:5rem;font-size:3em;color:var(--logo-orange)}h2.svelte-h1tb5e{color:var(--text);font-size:2.4em;margin:1rem}",
  map: `{"version":3,"file":"index.svelte","sources":["index.svelte"],"sourcesContent":["<script context=\\"module\\">\\r\\n\\texport const prerender = true;\\r\\n<\/script>\\r\\n\\r\\n<script>\\r\\n    import Bubble from '$lib/Components/bubble.svelte'\\r\\n    import Logo from '$lib/Components/logo.svelte'\\r\\n    import { fade, fly } from 'svelte/transition';\\r\\n    import { onMount } from 'svelte';\\r\\n\\r\\n    let begin = false;\\r\\n    onMount(() => {\\r\\n        begin = true;\\r\\n\\t});\\r\\n<\/script>\\r\\n\\r\\n<svelte:head>\\r\\n\\t<title>Home</title>\\r\\n</svelte:head>\\r\\n\\r\\n<div class=\\"\\">\\r\\n    <Logo />\\r\\n\\r\\n    <div class=\\"text-center\\">\\r\\n        {#if begin}\\r\\n        <h1 in:fade=\\"{{ duration: 500 }}\\">Watch this space!</h1>\\r\\n        <h2 in:fly=\\"{{ x: 200, delay: 500, duration: 1000 }}\\">Internships</h2>\\r\\n        <h2 in:fly=\\"{{ y: 150, delay: 800, duration: 800 }}\\">Discounts</h2>\\r\\n        <h2 in:fly=\\"{{ x: -120, delay: 1000, duration: 600 }}\\">Vacancies</h2>\\r\\n        <h2 in:fly=\\"{{ y: -110, delay: 1200, duration: 400 }}\\">Wellness</h2>\\r\\n        <h2 in:fly=\\"{{ x: 100, delay: 1500, duration: 200 }}\\">Benefits</h2>\\r\\n    {/if}\\r\\n    </div>\\r\\n</div>\\r\\n\\r\\n<!-- <Bubble/> -->\\r\\n\\r\\n<style>\\r\\n    h1{\\r\\n        margin-top: 5rem;\\r\\n        font-size: 3em;\\r\\n        color: var(--logo-orange);\\r\\n    }\\r\\n    h2{\\r\\n        color: var(--text);\\r\\n        font-size: 2.4em;\\r\\n        margin: 1rem;\\r\\n    }\\r\\n</style>\\r\\n"],"names":[],"mappings":"AAsCI,gBAAE,CAAC,AACC,UAAU,CAAE,IAAI,CAChB,SAAS,CAAE,GAAG,CACd,KAAK,CAAE,IAAI,aAAa,CAAC,AAC7B,CAAC,AACD,gBAAE,CAAC,AACC,KAAK,CAAE,IAAI,MAAM,CAAC,CAClB,SAAS,CAAE,KAAK,CAChB,MAAM,CAAE,IAAI,AAChB,CAAC"}`
};
var prerender$2 = true;
var Routes = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let begin = false;
  onMount(() => {
    begin = true;
  });
  $$result.css.add(css$1);
  return `${$$result.head += `${$$result.title = `<title>Home</title>`, ""}`, ""}

<div class="${""}">${validate_component(Logo, "Logo").$$render($$result, {}, {}, {})}

    <div class="${"text-center"}">${begin ? `<h1 class="${"svelte-h1tb5e"}">Watch this space!</h1>
        <h2 class="${"svelte-h1tb5e"}">Internships</h2>
        <h2 class="${"svelte-h1tb5e"}">Discounts</h2>
        <h2 class="${"svelte-h1tb5e"}">Vacancies</h2>
        <h2 class="${"svelte-h1tb5e"}">Wellness</h2>
        <h2 class="${"svelte-h1tb5e"}">Benefits</h2>` : ``}</div></div>

`;
});
var index$1 = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  "default": Routes,
  prerender: prerender$2
});
var Forgot_password = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let email;
  return `${$$result.head += `${$$result.title = `<title>Forgot Password</title>`, ""}`, ""}

<section class="${"vh-50 gradient-custom"}"><div class="${"py-3 h-100"}"><div class="${"row d-flex justify-content-center align-items-center h-100"}"><div class="${"col-12 col-md-8 col-lg-6 col-xl-6"}"><div class="${"card bg-dark text-white"}" style="${"border-radius: 1rem;"}"><div class="${"card-body p-md-4 p-lg-5 text-center"}"><h2 class="${"fw-bold mb-2 text-uppercase"}">Forgot Password</h2>
                    <p class="${"text-white-50 mb-3"}">Please enter your email, where you will receive your reset password link.</p>

                    ${``}

                    ${``}
    
                    <div class="${"form-outline form-white mb-4"}"><label class="${"form-label"}" for="${"Email"}">Email</label>
                        <input type="${"email"}" id="${"Email"}" class="${"form-control form-control-lg"}" placeholder="${"Enter email"}" required${add_attribute("value", email, 1)}></div>
    
                    <button class="${"btn btn-outline-light btn-lg px-4"}" type="${"submit"}">Submit</button></div></div></div></div></div></section>`;
});
var forgotPassword = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  "default": Forgot_password
});
var Reset_password = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let password, passwordConfirmation;
  let urlParams;
  onMount(() => {
    urlParams = new URLSearchParams(window.location.search);
    urlParams.get("code");
  });
  return `${$$result.head += `${$$result.title = `<title>Reset Password</title>`, ""}`, ""}

<section class="${"vh-50 gradient-custom"}"><div class="${"py-3 h-100"}"><div class="${"row d-flex justify-content-center align-items-center h-100"}"><div class="${"col-12 col-md-8 col-lg-6 col-xl-6"}"><div class="${"card bg-dark text-white"}" style="${"border-radius: 1rem;"}"><div class="${"card-body p-md-4 p-lg-5 text-center"}"><h2 class="${"fw-bold mb-2 text-uppercase"}">Forgot Password</h2>
                    <p class="${"text-white-50 mb-3"}">Please enter your new password below.</p>

                    ${``}
    
                    <div class="${"form-outline form-white mb-2 text-left"}"><label class="${"form-label"}" for="${"Password"}">Password</label>
                        <input type="${"password"}" id="${"Password"}" class="${"form-control form-control-lg"}" placeholder="${"Password"}" required${add_attribute("value", password, 1)}></div>      
                    <div class="${"form-outline form-white mb-4 text-left"}"><label class="${"form-label"}" for="${"PasswordConfirm"}">Password Confirmation</label>
                        <input type="${"password"}" id="${"PasswordConfirm"}" class="${"form-control form-control-lg"}" placeholder="${"Password (again)"}" required${add_attribute("value", passwordConfirmation, 1)}></div>
    
                    <button class="${"btn btn-outline-light btn-lg px-4"}" type="${"submit"}">Submit</button></div></div></div></div></div></section>`;
});
var resetPassword = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  "default": Reset_password
});
var prerender$1 = true;
var Contact_us = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `${$$result.head += `${$$result.title = `<title>Contact</title>`, ""}`, ""}

<section class="${"vh-50 gradient-custom"}"><div class="${"py-3 h-100"}"><div class="${"row d-flex justify-content-center align-items-center h-100"}"><div class="${"col-12 col-md-8 col-lg-6 col-xl-6"}"><div class="${"card bg-dark text-white"}" style="${"border-radius: 1rem;"}"><div class="${"card-body p-md-4 p-lg-5 text-center"}"><h2 class="${"fw-bold mb-2 text-uppercase"}">Contact</h2>
                    <p class="${"text-white-50 mb-3"}">Please feel free to contact us.</p>

                    <form name="${"contact"}" method="${"POST"}" netlify-honeypot="${"bot-field"}" data-netlify="${"true"}"><p class="${"hidden"}"><label>Don\u2019t fill this out if you\u2019re human: <input name="${"bot-field"}"></label></p>

                        <input type="${"hidden"}" name="${"form-name"}" value="${"contact"}">

                        <div class="${"form-outline form-white mb-2"}"><label class="${"form-label"}" for="${"Name"}">Name</label>
                            <input type="${"text"}" id="${"Name"}" class="${"form-control form-control-lg"}" placeholder="${"Enter your name"}" required></div>
                        <div class="${"form-outline form-white mb-4"}"><label class="${"form-label"}" for="${"Email"}">Email</label>
                            <input type="${"email"}" id="${"Email"}" class="${"form-control form-control-lg"}" placeholder="${"Enter your email"}" required></div>
                        <div class="${"form-outline form-white mb-4"}"><label class="${"form-label"}" for="${"Message"}">Email</label>
                            <textarea id="${"Message"}" name="${"message"}" class="${"form-control"}" rows="${"8"}" placeholder="${"Enter your message"}" required></textarea></div>
    
                        <button class="${"btn btn-outline-light btn-lg px-4"}" type="${"submit"}">Submit</button></form></div></div></div></div></div></section>`;
});
var contactUs = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  "default": Contact_us,
  prerender: prerender$1
});
var Register = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let username, email, password;
  return `${$$result.head += `${$$result.title = `<title>Register</title>`, ""}`, ""}

<section class="${"vh-50 gradient-custom"}"><div class="${"py-3 h-100"}"><div class="${"row d-flex justify-content-center align-items-center h-100"}"><div class="${"col-12 col-md-8 col-lg-6 col-xl-6"}"><div class="${"card bg-dark text-white"}" style="${"border-radius: 1rem;"}"><div class="${"card-body p-md-4 p-lg-5 text-center"}"><div class="${"mb-md-3 mt-md-2"}"><h2 class="${"fw-bold mb-2 text-uppercase"}">Register</h2>
                    <p class="${"text-white-50 mb-3"}">Please enter your email and password</p>

                    ${`${``}`}
                    
                    <form id="${"register"}"><div class="${"form-outline form-white mb-2"}"><label class="${"form-label"}" for="${"Username"}">Username</label>
                            <input type="${"text"}" name="${"username"}" id="${"username"}" class="${"form-control form-control-lg"}" placeholder="${"Enter username"}" required${add_attribute("value", username, 1)}></div>
                        <div class="${"form-outline form-white mb-2"}"><label class="${"form-label"}" for="${"Email"}">Email</label>
                            <input type="${"email"}" id="${"Email"}" class="${"form-control form-control-lg"}" placeholder="${"Enter email or username"}" required${add_attribute("value", email, 1)}></div>
                        <div class="${"form-outline form-white mb-4 text-left"}"><label class="${"form-label"}" for="${"Password"}">Password</label>
                            <input type="${"password"}" id="${"Password"}" class="${"form-control form-control-lg"}" placeholder="${"Password"}" required${add_attribute("value", password, 1)}></div>
        
                        <button class="${"btn btn-outline-light btn-lg px-4"}" type="${"submit"}">Register</button></form></div>
    
                <div><p class="${"mb-0"}">Already have an account? <a href="${"/login"}" class="${"text-white-50 fw-bold"}">Login</a></p></div></div></div></div></div></div></section>`;
});
var register = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  "default": Register
});
var css = {
  code: "img.svelte-1wku9og{max-width:300px;height:auto;align-self:center}.think.svelte-1wku9og{color:var(--logo-blue);font-weight:900}.card-text.svelte-1wku9og{text-align:justify}",
  map: `{"version":3,"file":"about.svelte","sources":["about.svelte"],"sourcesContent":["<script context=\\"module\\">\\r\\n\\texport const prerender = true;\\r\\n<\/script>\\r\\n\\r\\n<script>\\r\\n    import Icon from 'svelte-awesome';\\r\\n    import { facebook, twitter, linkedin, linkedinSquare } from 'svelte-awesome/icons';\\r\\n<\/script>\\r\\n\\r\\n<svelte:head>\\r\\n\\t<title>About</title>\\r\\n</svelte:head>\\r\\n\\r\\n<h1 class=\\"mb-4 text-center\\">The <span class=\\"think\\">ThinkTeacher</span> Team</h1>\\r\\n\\r\\n<div class=\\"container\\">\\r\\n    <div class=\\"row\\">\\r\\n        <div class=\\"col-sm-12 col-md-7 col-lg-7\\">\\r\\n            <div class=\\"card bg-dark mb-3\\">\\r\\n                <h3 class=\\"card-header\\">Bridget Fleming</h3>\\r\\n                    <div class=\\"card-body\\">\\r\\n                        <h5 class=\\"card-title\\">Founder</h5>\\r\\n                        <h6 class=\\"card-subtitle text-muted\\">MSc</h6>\\r\\n                    </div>\\r\\n                    <img class=\\"d-block user-select-none img-fluid\\" src=\\"https://tirqswyaxhrjnlhdstky.supabase.co/storage/v1/object/sign/thinkteacher/Bio/Bridget.jpg?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJ0aGlua3RlYWNoZXIvQmlvL0JyaWRnZXQuanBnIiwiaWF0IjoxNjI1NzY0MjY1LCJleHAiOjE5NDExMjQyNjV9.xZomw1kpuood2PFxS81KJzDw4VlQTNAAHoVppiO_DHs\\" alt=\\"profile img\\">\\r\\n                    <div class=\\"card-body\\">\\r\\n                        <p class=\\"card-text\\">\\r\\n                            Bridget Fleming is a passionate advocate for using Open Geo-technologies in the classroom. <br><br>\\r\\n                            Having taught secondary school Geography for the past 30 years, primarily in the private sector, Bridget is the IEB NSC Geography Internal Moderator and the founder of the Southern \\r\\n                            African Geography Teachers\u2019 Association (SAGTA). <br><br>\\r\\n                            She has authored many textbooks and digital classroom resources. She left the classroom recently (where she was HOD Geography, St John\u2019s College) to start <span class=\\"think\\">ThinkTeacher</span>, \\r\\n                            an organisation to support, care for and arrange benefits for teachers. This has been her dream and passion for many years, and she is currently gathering her team of change-agents \\r\\n                            to grow human capital. In addition, she is involved with online teacher training and content creation for Curro Online and DigiEd and GIS teacher training for Kartoza.\\r\\n\\r\\n                        </p>\\r\\n                    </div>\\r\\n                <div class=\\"card-footer text-muted\\">\\r\\n                    <a href=\\"https://www.linkedin.com/in/bridget-fleming-a1b33551/\\" class=\\"card-link\\"><Icon data={linkedinSquare} scale=\\"1.8\\"/></a>\\r\\n                </div>\\r\\n            </div>\\r\\n        </div>\\r\\n\\r\\n        <div class=\\"col-sm-12 col-md-5 col-lg-5\\">\\r\\n            <div class=\\"card bg-dark mb-3\\">\\r\\n                <h3 class=\\"card-header\\">Rebecca Maluka</h3>\\r\\n                    <div class=\\"card-body\\">\\r\\n                        <h5 class=\\"card-title\\">Head of Membership</h5>\\r\\n                        <h6 class=\\"card-subtitle text-muted\\">\\r\\n                            Bachelor of Public Administration | \\r\\n                            PG Dip. in Education Management | \\r\\n                            Cert. in Customer Management | \\r\\n                            Cert. in Project Management\\r\\n                        </h6>\\r\\n                    </div>\\r\\n                    <img class=\\"d-block user-select-none img-fluid\\" src=\\"https://tirqswyaxhrjnlhdstky.supabase.co/storage/v1/object/sign/thinkteacher/Bio/Rebecca.jpg?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJ0aGlua3RlYWNoZXIvQmlvL1JlYmVjY2EuanBnIiwiaWF0IjoxNjI1NzY1NDA5LCJleHAiOjE5NDExMjU0MDl9.R3if5ZEbhRmE9mV-2eFpP-QATKO6uCZ88jK4P3SoiQQ\\" alt=\\"profile img\\">\\r\\n                    <div class=\\"card-body\\">\\r\\n                        <p class=\\"card-text\\">\\r\\n                            Rebecca Maluka is a School Operations Manager at one of the leading schools in South Africa and has been in the education field for 14 years. She also has experience in student enrollment within the sales and marketing environment. <br><br>\\r\\n                            She is passionate about education and leadership. She had the opportunity to travel to the US as an ambassador. Rebecca was part of the future leaders\u2019 programme at one the schools at which she worked. She has been involved in numerous non-profit organisations in the community of Alexandra. \\r\\n                            She is driven by her desire for all South African children to have access to quality education and strives to assist young people both to achieve success and to overcome generational barriers.\\r\\n                        </p>\\r\\n                    </div>\\r\\n                <div class=\\"card-footer text-muted\\">\\r\\n                    <a href=\\"https://www.linkedin.com/in/rebecca-maluka-1997a119/\\" class=\\"card-link\\"><Icon data={linkedinSquare} scale=\\"1.8\\"/></a>\\r\\n                </div>\\r\\n            </div>\\r\\n        </div>\\r\\n\\r\\n        <div class=\\"col-sm-12 col-md-5 col-lg-5\\">\\r\\n            <div class=\\"card bg-dark mb-3\\">\\r\\n                <h3 class=\\"card-header\\">Paul Edey</h3>\\r\\n                    <div class=\\"card-body\\">\\r\\n                        <h5 class=\\"card-title\\">Liaison to Head of Schools & Webinars</h5>\\r\\n                        <h6 class=\\"card-subtitle text-muted\\">MEd | BA | HDE (Wits) | Hons (SA) | FDE (RAU) | PMD (GIBS)</h6>\\r\\n                    </div>\\r\\n                    <img class=\\"d-block user-select-none img-fluid\\" src=\\"https://tirqswyaxhrjnlhdstky.supabase.co/storage/v1/object/sign/thinkteacher/Bio/Paul.jpg?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJ0aGlua3RlYWNoZXIvQmlvL1BhdWwuanBnIiwiaWF0IjoxNjI1NzY1NzkyLCJleHAiOjE5NDExMjU3OTJ9.oFg1MQ2D_59BaN7tze_IOUPTb26-1upr-bnvnIcVV30\\" alt=\\"profile img\\">\\r\\n                    <div class=\\"card-body\\">\\r\\n                        <p class=\\"card-text\\">\\r\\n                            In 2020 Paul was appointed as the SAHISA Stakeholder Manager at ISASA. His primary role is to act as a support for school leaders in ISASA schools and as a link between the ISASA office and the SAHISA executive. <br><br>\\r\\n                            With over 40 years in secondary and tertiary level education, Paul has been Headmaster of St David\u2019s Marist Inanda, St Andrew\u2019s College and St John\u2019s College. He is a past chairman of JOCASCO and SAHISA. <br><br>\\r\\n                            As Director of Executive Education at GIBS, Paul led Global Executive Education programmes; this experience exposed him to adult education, issues of leadership, the political economy and strategy. <br><br>\\r\\n                            Paul is <span class=\\"think\\">ThinkTeacher\u2019s</span> mentor to school principals and Head of Leadership programmes. He believes with a committed, motivated teaching corps, South Africa is more likely to become a prosperous and more equitable society.\\r\\n                        </p>\\r\\n                    </div>\\r\\n                <div class=\\"card-footer text-muted\\">\\r\\n                    <a href=\\"https://www.linkedin.com/in/paul-edey-86952814a/\\" class=\\"card-link\\"><Icon data={linkedinSquare} scale=\\"1.8\\"/></a>\\r\\n                </div>\\r\\n            </div>\\r\\n        </div>\\r\\n\\r\\n        <div class=\\"col-sm-12 col-md-7 col-lg-7\\">\\r\\n            <div class=\\"card bg-dark mb-3\\">\\r\\n                <h3 class=\\"card-header\\">Kim Forbes</h3>\\r\\n                    <div class=\\"card-body\\">\\r\\n                        <h5 class=\\"card-title\\">Head of Well-being</h5>\\r\\n                        <h6 class=\\"card-subtitle text-muted\\">\\r\\n                            BA Hons | \\r\\n                            H Dip.Ed. | \\r\\n                            PMD (GIBS) | \\r\\n                            Higher Cert. in Financial Planning | \\r\\n                            Cert. in Digital Marketing\\r\\n                        </h6>\\r\\n                    </div>\\r\\n                    <img class=\\"d-block user-select-none img-fluid\\" src=\\"https://tirqswyaxhrjnlhdstky.supabase.co/storage/v1/object/sign/thinkteacher/Bio/Kim.jpg?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJ0aGlua3RlYWNoZXIvQmlvL0tpbS5qcGciLCJpYXQiOjE2MjU3NjY4MzEsImV4cCI6MTk0MTEyNjgzMX0.8P2A7c2pt0ptsvFGcIyGUiHHJ-juJ3ylvdt6N4U4qxY\\" alt=\\"profile img\\">\\r\\n                    <div class=\\"card-body\\">\\r\\n                        <p class=\\"card-text\\">\\r\\n                            Kim\u2019s commitment to helping people achieve their potential found its expression in her English teaching career. Her love of the power of words transitioned her to a financial publication editor role and writer for a financial planning company. <br><br>\\r\\n                            A combination of these two interests has culminated in Kim\u2019s current Transition Coaching and Writing business. A member of COMENSA, she has a Master Coach qualification.  It is her coaching skills that she will use as she heads up the Wellness component of <span class=\\"think\\">ThinkTeacher</span>, to equip teachers to create a successful and purposeful future. <br><br>\\r\\n                            To expand her business savvy, Kim studied for her PMD through GIBS, and a Higher Certificate in Financial Planning from Milpark Business School. <br><br>\\r\\n                            Kim is a founding member of Third Thursday, uplifting SA communities through raising funds and hosting events; Gill Marcus, Debra Patta, Jonathan Jansen, Ruda Landman, Helen Zille, Michael Mol, Graeme Codrington, Ian von Memerty have featured as speakers. Projects include building Habitat for Humanity houses in Soweto, creating an Iphutheng Primary School library in Alexandra, funding an equipped bus for Mthimkhulu Centre for handicapped children and contributing to the funding of LEAP School, Alexandra, and Lawyers Against Abuse, Diepsloot. <br><br>\\r\\n                            Kim loves South Africa and is committed to working towards a more hopeful and equitable future. \\r\\n                        </p>\\r\\n                    </div>\\r\\n                <div class=\\"card-footer text-muted\\">\\r\\n                    <!-- <a href=\\"https://www.linkedin.com/in/rebecca-maluka-1997a119/\\" class=\\"card-link\\"><Icon data={linkedinSquare} scale=\\"1.8\\"/></a> -->\\r\\n                </div>\\r\\n            </div>\\r\\n        </div>\\r\\n\\r\\n        <div class=\\"col-sm-12 col-md-7 col-lg-7\\">\\r\\n            <div class=\\"card bg-dark mb-3\\">\\r\\n                <h3 class=\\"card-header\\">Zanele Masuku</h3>\\r\\n                    <div class=\\"card-body\\">\\r\\n                        <h5 class=\\"card-title\\">Administration</h5>\\r\\n                        <h6 class=\\"card-subtitle text-muted\\">\\r\\n                            Professional Dip in Business Management and Marketing |\\r\\n                            SAIM Programme in Business Management |\\r\\n                            Higher Dip in Business Management and Marketing |\\r\\n                            Dip in Business Management and Marketing                   \\r\\n                        </h6>\\r\\n                    </div>\\r\\n                    <img class=\\"d-block user-select-none img-fluid\\" src=\\"https://tirqswyaxhrjnlhdstky.supabase.co/storage/v1/object/sign/thinkteacher/Bio/Zanele.png?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJ0aGlua3RlYWNoZXIvQmlvL1phbmVsZS5wbmciLCJpYXQiOjE2MjU3NjczNDMsImV4cCI6MTk0MTEyNzM0M30.q1H3Q_VB5zcZqso_43xwbrzEEgPTetTXKShBiPHB0kI\\" alt=\\"profile img\\">\\r\\n                    <div class=\\"card-body\\">\\r\\n                        <p class=\\"card-text\\">\\r\\n                            Zanele Masuku started her career in the banking sector before becoming a school librarian for four years. <br><br>\\r\\n                            Zanele\u2019s love for accounting inspired her shift to being a bursar in\xA0various schools. She established and ran a Homework Centre, in Manzini, Eswatini, where students aged between 8 and 18 were assisted with their homework across different subjects. <br><br>\\r\\n                            In addition, Zanele founded and managed a consultancy, collecting school fees on behalf of schools and ensuring the financial sustainability of each institution involved. <br><br>\\r\\n                            Zanele manages the administrative tasks for <span class=\\"think\\">ThinkTeacher</span>, ensuring that each team member can operate optimally in their sector of expertise. \\r\\n                        </p>\\r\\n                    </div>\\r\\n                <div class=\\"card-footer text-muted\\">\\r\\n                    <!-- <a href=\\"https://www.linkedin.com/in/rebecca-maluka-1997a119/\\" class=\\"card-link\\"><Icon data={linkedinSquare} scale=\\"1.8\\"/></a> -->\\r\\n                </div>\\r\\n            </div>\\r\\n        </div>\\r\\n        \\r\\n        <div class=\\"col-sm-12 col-md-5 col-lg-5\\">\\r\\n            <div class=\\"card bg-dark mb-3\\">\\r\\n                <h3 class=\\"card-header\\">Ferdie Heunis</h3>\\r\\n                    <div class=\\"card-body\\">\\r\\n                        <h5 class=\\"card-title\\">Head of Marketing</h5>\\r\\n                        <h6 class=\\"card-subtitle text-muted\\">\\r\\n                            BCom (Marketing Mangaement) | BCom Hons (Communication Management) | Gallup Strengths Coaching\\r\\n                        </h6>\\r\\n                    </div>\\r\\n                    <img class=\\"d-block user-select-none img-fluid\\" src=\\"https://tirqswyaxhrjnlhdstky.supabase.co/storage/v1/object/sign/thinkteacher/Bio/Ferdie.png?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJ0aGlua3RlYWNoZXIvQmlvL0ZlcmRpZS5wbmciLCJpYXQiOjE2MjU3Njc0NjQsImV4cCI6MTk0MTEyNzQ2NH0.YQqrWDsYD_OfVHdLElaR1aVw9wWL0VoTlYxj8K8lQKQ\\" alt=\\"profile img\\">\\r\\n                    <div class=\\"card-body\\">\\r\\n                        <p class=\\"card-text\\">\\r\\n                            Ferdie thrives on seeing individuals, teams and organisations develop into authentic entities. He sees himself as an activator: activating people and entities in their uniqueness and empowering them to become leaders, wherever they find themselves. <br><br>\\r\\n                            The future plays a significant role in how he approaches development. That is why, over the past 12 years, he has equipped himself with key personal and leadership development skills that will assist individuals, teams and organisations in seeing a better future, and then working with them to co-create it. <br><br>\\r\\n                            Ferdie\u2019s experience as Marketing Co-ordinator for Chameleon Adventures will stand him in good stead as he heads up the <span class=\\"think\\">ThinkTeacher</span> marketing initiatives which are geared towards making teachers aware that there is an organisation dedicated to supporting, caring for and growing them.\\r\\n                        </p>\\r\\n                    </div>\\r\\n                <div class=\\"card-footer text-muted\\">\\r\\n                    <a href=\\"https://www.linkedin.com/in/ferdie-heunis-8bb3943a/\\" class=\\"card-link\\"><Icon data={linkedinSquare} scale=\\"1.8\\"/></a>\\r\\n                </div>\\r\\n            </div>\\r\\n        </div>\\r\\n\\r\\n        <div class=\\"col-sm-12 col-md-5 col-lg-5\\">\\r\\n            <div class=\\"card bg-dark mb-3\\">\\r\\n                <h3 class=\\"card-header\\">Frances Kerr-Phillips</h3>\\r\\n                    <div class=\\"card-body\\">\\r\\n                        <h5 class=\\"card-title\\">Head of Operations, Content & Internships</h5>\\r\\n                        <h6 class=\\"card-subtitle text-muted\\">\\r\\n                            MA (Hons) | PGCE | MEd\\r\\n                        </h6>\\r\\n                    </div>\\r\\n                    <img class=\\"d-block user-select-none img-fluid\\" src=\\"https://tirqswyaxhrjnlhdstky.supabase.co/storage/v1/object/sign/thinkteacher/Bio/Frances Kerr-Phillips photograph 2.jpg?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJ0aGlua3RlYWNoZXIvQmlvL0ZyYW5jZXMgS2Vyci1QaGlsbGlwcyBwaG90b2dyYXBoIDIuanBnIiwiaWF0IjoxNjI1NzY3NzE2LCJleHAiOjE5NDExMjc3MTZ9.KsHs9cILZIksJjgleeb-U3427yh-Afg-1DuhCG6LPnM\\" alt=\\"profile img\\">\\r\\n                    <div class=\\"card-body\\">\\r\\n                        <p class=\\"card-text\\">\\r\\n                            Frances\u2019 passion for growing top quality South African teachers, and keeping them in the system, is what has led to her involvement with <span class=\\"think\\">ThinkTeacher</span>. <br><br>\\r\\n                            This interest in teacher training and mentoring continues in her current role as the intern mentor at St John\u2019s College. <br><br>\\r\\n                            Frances has 35 years of experience in a diverse range of educational institutions in Southern Africa. During her 8 years as an Assessment Specialist with the Independent Examinations Board (IEB) she visited over 100 schools in the region, and has worked with teachers, examiners, moderators and consultants in a variety of training and mentoring roles. <br><br>\\r\\n                            Frances is currently the Managing Editor for <span class=\\"think\\">ThinkTeacher</span> and will then drive the <span class=\\"think\\">ThinkTeacher</span> internship initiative.\\r\\n                        </p>\\r\\n                    </div>\\r\\n                <div class=\\"card-footer text-muted\\">\\r\\n                    <a href=\\"https://www.linkedin.com/in/frances-kerr-phillips-768a34216/\\" class=\\"card-link\\"><Icon data={linkedinSquare} scale=\\"1.8\\"/></a>\\r\\n                </div>\\r\\n            </div>\\r\\n        </div>\\r\\n\\r\\n        <div class=\\"col-sm-12 col-md-7 col-lg-7\\">\\r\\n            <div class=\\"card bg-dark mb-3\\">\\r\\n                <h3 class=\\"card-header\\">Malcolm Williams</h3>\\r\\n                    <div class=\\"card-body\\">\\r\\n                        <h5 class=\\"card-title\\">Head of Operations</h5>\\r\\n                        <h6 class=\\"card-subtitle text-muted\\">\\r\\n                            MEd\\r\\n                        </h6>\\r\\n                    </div>\\r\\n                    <img class=\\"d-block user-select-none img-fluid\\" src=\\"https://tirqswyaxhrjnlhdstky.supabase.co/storage/v1/object/sign/thinkteacher/Bio/Malcolm.png?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJ0aGlua3RlYWNoZXIvQmlvL01hbGNvbG0ucG5nIiwiaWF0IjoxNjI1NzY3OTcxLCJleHAiOjE5NDExMjc5NzF9.M1B3cACdVsZkHKoY8nI7FzgzhUx_0k4_i0vBVrv5CSE\\" alt=\\"profile img\\">\\r\\n                    <div class=\\"card-body\\">\\r\\n                        <p class=\\"card-text\\">\\r\\n                            Teachers, more than any others, have the capacity to change the lives of individuals and, indeed, the future of a nation. <br><br>\\r\\n                            This belief has driven Malcolm Williams\u2019 career in education, with 18 years as a Head of top schools across the Independent, Public and Cambridge school sectors. <br><br>\\r\\n                            Malcolm thrives on coaching, developing and growing others, and celebrating the success which follows the pursuit of excellence.  As a teacher and family man, Malcolm enjoys building relationships and engaging with others; he believes that positive relationships are the core of the learning experience and of attaining fulfilment. <br><br>\\r\\n                            <span class=\\"think\\">ThinkTeacher\u2019s</span> goal is to ensure that each teacher receives the specific support they may require to be the best they can be as people, and as teachers. As Head of Operations, Malcolm is excited by the opportunity to oversee the range of inputs and support options which <span class=\\"think\\">ThinkTeacher</span> will be offering its members. <br><br>\\r\\n                            Malcolm seeks to live life to the full, savour each moment and experience, and get the job done, properly ... with large dollops of fun thrown in for good measure!\\r\\n                        </p>\\r\\n                    </div>\\r\\n                <div class=\\"card-footer text-muted\\">\\r\\n                    <!-- <a href=\\"https://www.linkedin.com/in/frances-kerr-phillips-768a34216/\\" class=\\"card-link\\"><Icon data={linkedinSquare} scale=\\"1.8\\"/></a> -->\\r\\n                </div>\\r\\n            </div>\\r\\n        </div>\\r\\n\\r\\n    </div>\\r\\n</div>\\r\\n\\r\\n<style>\\r\\n    img {\\r\\n        max-width: 300px;\\r\\n        height: auto;\\r\\n        align-self: center;\\r\\n    }\\r\\n    .think {\\r\\n        color: var(--logo-blue);\\r\\n        font-weight: 900;\\r\\n    }\\r\\n    .card-text {\\r\\n        text-align: justify;\\r\\n    }\\r\\n</style>\\r\\n"],"names":[],"mappings":"AA8NI,GAAG,eAAC,CAAC,AACD,SAAS,CAAE,KAAK,CAChB,MAAM,CAAE,IAAI,CACZ,UAAU,CAAE,MAAM,AACtB,CAAC,AACD,MAAM,eAAC,CAAC,AACJ,KAAK,CAAE,IAAI,WAAW,CAAC,CACvB,WAAW,CAAE,GAAG,AACpB,CAAC,AACD,UAAU,eAAC,CAAC,AACR,UAAU,CAAE,OAAO,AACvB,CAAC"}`
};
var prerender = true;
var About = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  $$result.css.add(css);
  return `${$$result.head += `${$$result.title = `<title>About</title>`, ""}`, ""}

<h1 class="${"mb-4 text-center"}">The <span class="${"think svelte-1wku9og"}">ThinkTeacher</span> Team</h1>

<div class="${"container"}"><div class="${"row"}"><div class="${"col-sm-12 col-md-7 col-lg-7"}"><div class="${"card bg-dark mb-3"}"><h3 class="${"card-header"}">Bridget Fleming</h3>
                    <div class="${"card-body"}"><h5 class="${"card-title"}">Founder</h5>
                        <h6 class="${"card-subtitle text-muted"}">MSc</h6></div>
                    <img class="${"d-block user-select-none img-fluid svelte-1wku9og"}" src="${"https://tirqswyaxhrjnlhdstky.supabase.co/storage/v1/object/sign/thinkteacher/Bio/Bridget.jpg?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJ0aGlua3RlYWNoZXIvQmlvL0JyaWRnZXQuanBnIiwiaWF0IjoxNjI1NzY0MjY1LCJleHAiOjE5NDExMjQyNjV9.xZomw1kpuood2PFxS81KJzDw4VlQTNAAHoVppiO_DHs"}" alt="${"profile img"}">
                    <div class="${"card-body"}"><p class="${"card-text svelte-1wku9og"}">Bridget Fleming is a passionate advocate for using Open Geo-technologies in the classroom. <br><br>
                            Having taught secondary school Geography for the past 30 years, primarily in the private sector, Bridget is the IEB NSC Geography Internal Moderator and the founder of the Southern 
                            African Geography Teachers\u2019 Association (SAGTA). <br><br>
                            She has authored many textbooks and digital classroom resources. She left the classroom recently (where she was HOD Geography, St John\u2019s College) to start <span class="${"think svelte-1wku9og"}">ThinkTeacher</span>, 
                            an organisation to support, care for and arrange benefits for teachers. This has been her dream and passion for many years, and she is currently gathering her team of change-agents 
                            to grow human capital. In addition, she is involved with online teacher training and content creation for Curro Online and DigiEd and GIS teacher training for Kartoza.

                        </p></div>
                <div class="${"card-footer text-muted"}"><a href="${"https://www.linkedin.com/in/bridget-fleming-a1b33551/"}" class="${"card-link"}">${validate_component(Icon, "Icon").$$render($$result, { data: linkedinSquare, scale: "1.8" }, {}, {})}</a></div></div></div>

        <div class="${"col-sm-12 col-md-5 col-lg-5"}"><div class="${"card bg-dark mb-3"}"><h3 class="${"card-header"}">Rebecca Maluka</h3>
                    <div class="${"card-body"}"><h5 class="${"card-title"}">Head of Membership</h5>
                        <h6 class="${"card-subtitle text-muted"}">Bachelor of Public Administration | 
                            PG Dip. in Education Management | 
                            Cert. in Customer Management | 
                            Cert. in Project Management
                        </h6></div>
                    <img class="${"d-block user-select-none img-fluid svelte-1wku9og"}" src="${"https://tirqswyaxhrjnlhdstky.supabase.co/storage/v1/object/sign/thinkteacher/Bio/Rebecca.jpg?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJ0aGlua3RlYWNoZXIvQmlvL1JlYmVjY2EuanBnIiwiaWF0IjoxNjI1NzY1NDA5LCJleHAiOjE5NDExMjU0MDl9.R3if5ZEbhRmE9mV-2eFpP-QATKO6uCZ88jK4P3SoiQQ"}" alt="${"profile img"}">
                    <div class="${"card-body"}"><p class="${"card-text svelte-1wku9og"}">Rebecca Maluka is a School Operations Manager at one of the leading schools in South Africa and has been in the education field for 14 years. She also has experience in student enrollment within the sales and marketing environment. <br><br>
                            She is passionate about education and leadership. She had the opportunity to travel to the US as an ambassador. Rebecca was part of the future leaders\u2019 programme at one the schools at which she worked. She has been involved in numerous non-profit organisations in the community of Alexandra. 
                            She is driven by her desire for all South African children to have access to quality education and strives to assist young people both to achieve success and to overcome generational barriers.
                        </p></div>
                <div class="${"card-footer text-muted"}"><a href="${"https://www.linkedin.com/in/rebecca-maluka-1997a119/"}" class="${"card-link"}">${validate_component(Icon, "Icon").$$render($$result, { data: linkedinSquare, scale: "1.8" }, {}, {})}</a></div></div></div>

        <div class="${"col-sm-12 col-md-5 col-lg-5"}"><div class="${"card bg-dark mb-3"}"><h3 class="${"card-header"}">Paul Edey</h3>
                    <div class="${"card-body"}"><h5 class="${"card-title"}">Liaison to Head of Schools &amp; Webinars</h5>
                        <h6 class="${"card-subtitle text-muted"}">MEd | BA | HDE (Wits) | Hons (SA) | FDE (RAU) | PMD (GIBS)</h6></div>
                    <img class="${"d-block user-select-none img-fluid svelte-1wku9og"}" src="${"https://tirqswyaxhrjnlhdstky.supabase.co/storage/v1/object/sign/thinkteacher/Bio/Paul.jpg?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJ0aGlua3RlYWNoZXIvQmlvL1BhdWwuanBnIiwiaWF0IjoxNjI1NzY1NzkyLCJleHAiOjE5NDExMjU3OTJ9.oFg1MQ2D_59BaN7tze_IOUPTb26-1upr-bnvnIcVV30"}" alt="${"profile img"}">
                    <div class="${"card-body"}"><p class="${"card-text svelte-1wku9og"}">In 2020 Paul was appointed as the SAHISA Stakeholder Manager at ISASA. His primary role is to act as a support for school leaders in ISASA schools and as a link between the ISASA office and the SAHISA executive. <br><br>
                            With over 40 years in secondary and tertiary level education, Paul has been Headmaster of St David\u2019s Marist Inanda, St Andrew\u2019s College and St John\u2019s College. He is a past chairman of JOCASCO and SAHISA. <br><br>
                            As Director of Executive Education at GIBS, Paul led Global Executive Education programmes; this experience exposed him to adult education, issues of leadership, the political economy and strategy. <br><br>
                            Paul is <span class="${"think svelte-1wku9og"}">ThinkTeacher\u2019s</span> mentor to school principals and Head of Leadership programmes. He believes with a committed, motivated teaching corps, South Africa is more likely to become a prosperous and more equitable society.
                        </p></div>
                <div class="${"card-footer text-muted"}"><a href="${"https://www.linkedin.com/in/paul-edey-86952814a/"}" class="${"card-link"}">${validate_component(Icon, "Icon").$$render($$result, { data: linkedinSquare, scale: "1.8" }, {}, {})}</a></div></div></div>

        <div class="${"col-sm-12 col-md-7 col-lg-7"}"><div class="${"card bg-dark mb-3"}"><h3 class="${"card-header"}">Kim Forbes</h3>
                    <div class="${"card-body"}"><h5 class="${"card-title"}">Head of Well-being</h5>
                        <h6 class="${"card-subtitle text-muted"}">BA Hons | 
                            H Dip.Ed. | 
                            PMD (GIBS) | 
                            Higher Cert. in Financial Planning | 
                            Cert. in Digital Marketing
                        </h6></div>
                    <img class="${"d-block user-select-none img-fluid svelte-1wku9og"}" src="${"https://tirqswyaxhrjnlhdstky.supabase.co/storage/v1/object/sign/thinkteacher/Bio/Kim.jpg?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJ0aGlua3RlYWNoZXIvQmlvL0tpbS5qcGciLCJpYXQiOjE2MjU3NjY4MzEsImV4cCI6MTk0MTEyNjgzMX0.8P2A7c2pt0ptsvFGcIyGUiHHJ-juJ3ylvdt6N4U4qxY"}" alt="${"profile img"}">
                    <div class="${"card-body"}"><p class="${"card-text svelte-1wku9og"}">Kim\u2019s commitment to helping people achieve their potential found its expression in her English teaching career. Her love of the power of words transitioned her to a financial publication editor role and writer for a financial planning company. <br><br>
                            A combination of these two interests has culminated in Kim\u2019s current Transition Coaching and Writing business. A member of COMENSA, she has a Master Coach qualification.  It is her coaching skills that she will use as she heads up the Wellness component of <span class="${"think svelte-1wku9og"}">ThinkTeacher</span>, to equip teachers to create a successful and purposeful future. <br><br>
                            To expand her business savvy, Kim studied for her PMD through GIBS, and a Higher Certificate in Financial Planning from Milpark Business School. <br><br>
                            Kim is a founding member of Third Thursday, uplifting SA communities through raising funds and hosting events; Gill Marcus, Debra Patta, Jonathan Jansen, Ruda Landman, Helen Zille, Michael Mol, Graeme Codrington, Ian von Memerty have featured as speakers. Projects include building Habitat for Humanity houses in Soweto, creating an Iphutheng Primary School library in Alexandra, funding an equipped bus for Mthimkhulu Centre for handicapped children and contributing to the funding of LEAP School, Alexandra, and Lawyers Against Abuse, Diepsloot. <br><br>
                            Kim loves South Africa and is committed to working towards a more hopeful and equitable future. 
                        </p></div>
                <div class="${"card-footer text-muted"}"></div></div></div>

        <div class="${"col-sm-12 col-md-7 col-lg-7"}"><div class="${"card bg-dark mb-3"}"><h3 class="${"card-header"}">Zanele Masuku</h3>
                    <div class="${"card-body"}"><h5 class="${"card-title"}">Administration</h5>
                        <h6 class="${"card-subtitle text-muted"}">Professional Dip in Business Management and Marketing |
                            SAIM Programme in Business Management |
                            Higher Dip in Business Management and Marketing |
                            Dip in Business Management and Marketing                   
                        </h6></div>
                    <img class="${"d-block user-select-none img-fluid svelte-1wku9og"}" src="${"https://tirqswyaxhrjnlhdstky.supabase.co/storage/v1/object/sign/thinkteacher/Bio/Zanele.png?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJ0aGlua3RlYWNoZXIvQmlvL1phbmVsZS5wbmciLCJpYXQiOjE2MjU3NjczNDMsImV4cCI6MTk0MTEyNzM0M30.q1H3Q_VB5zcZqso_43xwbrzEEgPTetTXKShBiPHB0kI"}" alt="${"profile img"}">
                    <div class="${"card-body"}"><p class="${"card-text svelte-1wku9og"}">Zanele Masuku started her career in the banking sector before becoming a school librarian for four years. <br><br>
                            Zanele\u2019s love for accounting inspired her shift to being a bursar in\xA0various schools. She established and ran a Homework Centre, in Manzini, Eswatini, where students aged between 8 and 18 were assisted with their homework across different subjects. <br><br>
                            In addition, Zanele founded and managed a consultancy, collecting school fees on behalf of schools and ensuring the financial sustainability of each institution involved. <br><br>
                            Zanele manages the administrative tasks for <span class="${"think svelte-1wku9og"}">ThinkTeacher</span>, ensuring that each team member can operate optimally in their sector of expertise. 
                        </p></div>
                <div class="${"card-footer text-muted"}"></div></div></div>
        
        <div class="${"col-sm-12 col-md-5 col-lg-5"}"><div class="${"card bg-dark mb-3"}"><h3 class="${"card-header"}">Ferdie Heunis</h3>
                    <div class="${"card-body"}"><h5 class="${"card-title"}">Head of Marketing</h5>
                        <h6 class="${"card-subtitle text-muted"}">BCom (Marketing Mangaement) | BCom Hons (Communication Management) | Gallup Strengths Coaching
                        </h6></div>
                    <img class="${"d-block user-select-none img-fluid svelte-1wku9og"}" src="${"https://tirqswyaxhrjnlhdstky.supabase.co/storage/v1/object/sign/thinkteacher/Bio/Ferdie.png?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJ0aGlua3RlYWNoZXIvQmlvL0ZlcmRpZS5wbmciLCJpYXQiOjE2MjU3Njc0NjQsImV4cCI6MTk0MTEyNzQ2NH0.YQqrWDsYD_OfVHdLElaR1aVw9wWL0VoTlYxj8K8lQKQ"}" alt="${"profile img"}">
                    <div class="${"card-body"}"><p class="${"card-text svelte-1wku9og"}">Ferdie thrives on seeing individuals, teams and organisations develop into authentic entities. He sees himself as an activator: activating people and entities in their uniqueness and empowering them to become leaders, wherever they find themselves. <br><br>
                            The future plays a significant role in how he approaches development. That is why, over the past 12 years, he has equipped himself with key personal and leadership development skills that will assist individuals, teams and organisations in seeing a better future, and then working with them to co-create it. <br><br>
                            Ferdie\u2019s experience as Marketing Co-ordinator for Chameleon Adventures will stand him in good stead as he heads up the <span class="${"think svelte-1wku9og"}">ThinkTeacher</span> marketing initiatives which are geared towards making teachers aware that there is an organisation dedicated to supporting, caring for and growing them.
                        </p></div>
                <div class="${"card-footer text-muted"}"><a href="${"https://www.linkedin.com/in/ferdie-heunis-8bb3943a/"}" class="${"card-link"}">${validate_component(Icon, "Icon").$$render($$result, { data: linkedinSquare, scale: "1.8" }, {}, {})}</a></div></div></div>

        <div class="${"col-sm-12 col-md-5 col-lg-5"}"><div class="${"card bg-dark mb-3"}"><h3 class="${"card-header"}">Frances Kerr-Phillips</h3>
                    <div class="${"card-body"}"><h5 class="${"card-title"}">Head of Operations, Content &amp; Internships</h5>
                        <h6 class="${"card-subtitle text-muted"}">MA (Hons) | PGCE | MEd
                        </h6></div>
                    <img class="${"d-block user-select-none img-fluid svelte-1wku9og"}" src="${"https://tirqswyaxhrjnlhdstky.supabase.co/storage/v1/object/sign/thinkteacher/Bio/Frances Kerr-Phillips photograph 2.jpg?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJ0aGlua3RlYWNoZXIvQmlvL0ZyYW5jZXMgS2Vyci1QaGlsbGlwcyBwaG90b2dyYXBoIDIuanBnIiwiaWF0IjoxNjI1NzY3NzE2LCJleHAiOjE5NDExMjc3MTZ9.KsHs9cILZIksJjgleeb-U3427yh-Afg-1DuhCG6LPnM"}" alt="${"profile img"}">
                    <div class="${"card-body"}"><p class="${"card-text svelte-1wku9og"}">Frances\u2019 passion for growing top quality South African teachers, and keeping them in the system, is what has led to her involvement with <span class="${"think svelte-1wku9og"}">ThinkTeacher</span>. <br><br>
                            This interest in teacher training and mentoring continues in her current role as the intern mentor at St John\u2019s College. <br><br>
                            Frances has 35 years of experience in a diverse range of educational institutions in Southern Africa. During her 8 years as an Assessment Specialist with the Independent Examinations Board (IEB) she visited over 100 schools in the region, and has worked with teachers, examiners, moderators and consultants in a variety of training and mentoring roles. <br><br>
                            Frances is currently the Managing Editor for <span class="${"think svelte-1wku9og"}">ThinkTeacher</span> and will then drive the <span class="${"think svelte-1wku9og"}">ThinkTeacher</span> internship initiative.
                        </p></div>
                <div class="${"card-footer text-muted"}"><a href="${"https://www.linkedin.com/in/frances-kerr-phillips-768a34216/"}" class="${"card-link"}">${validate_component(Icon, "Icon").$$render($$result, { data: linkedinSquare, scale: "1.8" }, {}, {})}</a></div></div></div>

        <div class="${"col-sm-12 col-md-7 col-lg-7"}"><div class="${"card bg-dark mb-3"}"><h3 class="${"card-header"}">Malcolm Williams</h3>
                    <div class="${"card-body"}"><h5 class="${"card-title"}">Head of Operations</h5>
                        <h6 class="${"card-subtitle text-muted"}">MEd
                        </h6></div>
                    <img class="${"d-block user-select-none img-fluid svelte-1wku9og"}" src="${"https://tirqswyaxhrjnlhdstky.supabase.co/storage/v1/object/sign/thinkteacher/Bio/Malcolm.png?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJ0aGlua3RlYWNoZXIvQmlvL01hbGNvbG0ucG5nIiwiaWF0IjoxNjI1NzY3OTcxLCJleHAiOjE5NDExMjc5NzF9.M1B3cACdVsZkHKoY8nI7FzgzhUx_0k4_i0vBVrv5CSE"}" alt="${"profile img"}">
                    <div class="${"card-body"}"><p class="${"card-text svelte-1wku9og"}">Teachers, more than any others, have the capacity to change the lives of individuals and, indeed, the future of a nation. <br><br>
                            This belief has driven Malcolm Williams\u2019 career in education, with 18 years as a Head of top schools across the Independent, Public and Cambridge school sectors. <br><br>
                            Malcolm thrives on coaching, developing and growing others, and celebrating the success which follows the pursuit of excellence.  As a teacher and family man, Malcolm enjoys building relationships and engaging with others; he believes that positive relationships are the core of the learning experience and of attaining fulfilment. <br><br>
                            <span class="${"think svelte-1wku9og"}">ThinkTeacher\u2019s</span> goal is to ensure that each teacher receives the specific support they may require to be the best they can be as people, and as teachers. As Head of Operations, Malcolm is excited by the opportunity to oversee the range of inputs and support options which <span class="${"think svelte-1wku9og"}">ThinkTeacher</span> will be offering its members. <br><br>
                            Malcolm seeks to live life to the full, savour each moment and experience, and get the job done, properly ... with large dollops of fun thrown in for good measure!
                        </p></div>
                <div class="${"card-footer text-muted"}"></div></div></div></div>
</div>`;
});
var about = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  "default": About,
  prerender
});
var Login = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let usernameEmail, password;
  return `${$$result.head += `${$$result.title = `<title>Login</title>`, ""}`, ""}

<section class="${"vh-50 gradient-custom"}"><div class="${"py-3 h-100"}"><div class="${"row d-flex justify-content-center align-items-center h-100"}"><div class="${"col-12 col-md-8 col-lg-6 col-xl-6"}"><div class="${"card bg-dark text-white"}" style="${"border-radius: 1rem;"}"><div class="${"card-body p-md-4 p-lg-5 text-center"}"><div class="${"mb-md-3 mt-md-2"}"><h2 class="${"fw-bold mb-2 text-uppercase"}">Login</h2>
                    <p class="${"text-white-50 mb-3"}">Please enter your email and password</p>

                    ${``}
                    
                    <form name="${"login"}"><div class="${"form-outline form-white mb-2"}"><label class="${"form-label"}" for="${"Email"}">Email</label>
                            <input type="${"email"}" id="${"Email"}" class="${"form-control form-control-lg"}" placeholder="${"Enter email or username"}" required${add_attribute("value", usernameEmail, 1)}></div>
                        <div class="${"form-outline form-white mb-2 text-left"}"><label class="${"form-label"}" for="${"Password"}">Password</label>
                            <input type="${"password"}" id="${"Password"}" class="${"form-control form-control-lg"}" placeholder="${"Password"}" required${add_attribute("value", password, 1)}></div>
                        <p class="${"small mb-3 pb-lg-2"}"><a class="${"text-white-50"}" href="${"/forgot-password"}">Forgot password?</a></p>
        
                        <button class="${"btn btn-outline-light btn-lg px-4"}" type="${"submit"}">Login</button></form>
                  
                    <div class="${"d-flex justify-content-center text-center mt-2 pt-1"}"><a href="${"#!"}" class="${"text-white px-2"}">${validate_component(Icon, "Icon").$$render($$result, { data: facebook, scale: "1.4" }, {}, {})}</a>
                        <a href="${"#!"}" class="${"text-white px-2"}">${validate_component(Icon, "Icon").$$render($$result, { data: twitter, scale: "1.4" }, {}, {})}</a>
                        <a href="${"#!"}" class="${"text-white px-2"}">${validate_component(Icon, "Icon").$$render($$result, { data: instagram, scale: "1.4" }, {}, {})}</a></div></div>
    
                <div><p class="${"mb-0"}">Don&#39;t have an account? <a href="${"/register"}" class="${"text-white-50 fw-bold"}">Register</a></p></div></div></div></div></div></div></section>`;
});
var login = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  "default": Login
});
var API_URL = "http://localhost:1337/users/me";
var _layout = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let name = "";
  let errMsg;
  onMount(async () => {
    const res = await import_axios.default.get(API_URL, {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("jwt")
      }
    }).catch(function(error2) {
      if (error2.response) {
        console.log(error2.response.data);
        errMsg = error2.response.data.error + ": " + error2.response.data.message;
      } else {
        console.log("Error", error2.message);
      }
      window.location.replace("/login");
    });
    if (localStorage.getItem("jwt")) {
      name = res.data.username;
    }
  });
  return `<div class="${"pt-2"}">${errMsg !== void 0 ? `<h1>${escape2(errMsg)}</h1>
        <h3>You need to <a href="${"/login"}">login</a></h3>` : ``}

    <h3>Hello, <strong>${escape2(name)}</strong> this is where all the membership content will be available.</h3></div>

<div class="${"container text-center p-3"}"><nav><a href="${"/auth"}">Home</a>
        <a href="${"/auth/vacancies"}">Vacancies</a>
        <a href="${"/auth/profile"}">Profile</a></nav>
    ${slots.default ? slots.default({}) : ``}</div>`;
});
var __layout = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  "default": _layout
});
var Auth = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `<div class="${"container"}"><h1>Main</h1></div>`;
});
var index = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  "default": Auth
});
var Vacancies = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `<h1>Vacancies</h1>`;
});
var vacancies = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  "default": Vacancies
});
var Profile = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `<h1>Profile</h1>`;
});
var profile = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  "default": Profile
});

// .svelte-kit/netlify/entry.js
init();
async function handler(event) {
  const { path, httpMethod, headers, rawQuery, body, isBase64Encoded } = event;
  const query = new URLSearchParams(rawQuery);
  const rawBody = headers["content-type"] === "application/octet-stream" ? new TextEncoder("base64").encode(body) : isBase64Encoded ? Buffer.from(body, "base64").toString() : body;
  const rendered = await render({
    method: httpMethod,
    headers,
    path,
    query,
    rawBody
  });
  if (rendered) {
    return {
      isBase64Encoded: false,
      statusCode: rendered.status,
      headers: rendered.headers,
      body: rendered.body
    };
  }
  return {
    statusCode: 404,
    body: "Not found"
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
/*!
 * cookie
 * Copyright(c) 2012-2014 Roman Shtylman
 * Copyright(c) 2015 Douglas Christopher Wilson
 * MIT Licensed
 */
/*! *****************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
