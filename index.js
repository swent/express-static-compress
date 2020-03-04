const { cwd } = require('process');
const { resolve } = require('path');
const { existsSync, readFileSync } = require('fs');
const pako = require('pako');

const defaultOptions = {
    maxAge: 60 * 60 * 24 * 14,
    bmp: {
        contentType: 'image/bmp',
        compression: 'deflate',
        maxAge: null,
    },
    jpg: {
        contentType: 'image/jpeg',
        compression: null,
        maxAge: null,
    },
    png: {
        contentType: 'image/png',
        compression: null,
        maxAge: null,
    },
    gif: {
        contentType: 'image/gif',
        compression: null,
        maxAge: null,
    },
    ico: {
        contentType: 'image/x-icon',
        compression: null,
        maxAge: null,
    },
    webp: {
        contentType: 'image/webp',
        compression: null,
        maxAge: null,
    },
    svg: {
        contentType: 'image/svg+xml',
        compression: 'deflate',
        maxAge: null,
    },
    html: {
        contentType: 'text/html',
        compression: 'deflate',
        maxAge: null,
    },
    css: {
        contentType: 'text/css',
        compression: 'deflate',
        maxAge: null,
    },
    js: {
        contentType: 'application/javascript',
        compression: 'deflate',
        maxAge: null,
    },
    json: {
        contentType: 'application/json',
        compression: 'deflate',
        maxAge: null,
    },
    docx: {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        compression: 'deflate',
        maxAge: null,
    },
    csv: {
        contentType: 'text/csv',
        compression: 'deflate',
        maxAge: null,
    },
    xlsx: {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        compression: 'deflate',
        maxAge: null,
    },
    woff: {
        contentType: 'font/woff',
        compression: null,
        maxAge: null,
    },
    woff2: {
        contentType: 'font/woff2',
        compression: null,
        maxAge: null,
    },
    otf: {
        contentType: 'font/opentype',
        compression: null,
        maxAge: null,
    },
    ttf: {
        contentType: 'font/ttf',
        compression: null,
        maxAge: null,
    },
    eot: {
        contentType: 'application/vnd.ms-fontobject',
        compression: null,
        maxAge: null,
    },
    wav: {
        contentType: 'audio/x-wav',
        compression: 'deflate',
        maxAge: null,
    },
    mp3: {
        contentType: 'audio/mpeg3',
        compression: null,
        maxAge: null,
    },
    mp4a: {
        contentType: 'audio/mp4',
        compression: null,
        maxAge: null,
    },
    mp4: {
        contentType: 'video/mp4',
        compression: null,
        maxAge: null,
    },
    webm: {
        contentType: 'video/webm',
        compression: null,
        maxAge: null,
    },
    avi: {
        contentType: 'video/x-msvideo',
        compression: null,
        maxAge: null,
    },
    flv: {
        contentType: 'video/x-flv',
        compression: null,
        maxAge: null,
    },
};

function linkOptionsToDefaults(options) {
    options.__proto__ = defaultOptions;
    for (const key in options) {
        if (options.hasOwnProperty(key) && defaultOptions.hasOwnProperty(key) && typeof options[key] === 'object') {
            options[key].__proto__ = defaultOptions[key];
        }
    }
}

function aliasFileType(fileType) {
    const lowerFileType = fileType.toLowerCase();
    switch (lowerFileType) {
        case 'jpeg':
            return 'jpg';
        default:
            return lowerFileType;
    }
}

function getFileTypeContentType(fileType, options) {
    const fileTypeOptions = options[fileType];
    return fileTypeOptions ? fileTypeOptions.contentType : 'text/plain';
}

function getFileTypeCompression(fileType, options) {
    const fileTypeOptions = options[fileType];
    return fileTypeOptions ? fileTypeOptions.compression : 'deflate';
}

function getFileTypeMaxAge(fileType, options) {
    const fileTypeOptions = options[fileType];
    return fileTypeOptions ? (fileTypeOptions.maxAge || options.maxAge) : options.maxAge;
}

function transformUrlToKey(url) {
    return url.replace(/\//g, '-');
}

function createExpressStaticCache(rootDirectory, options) {
    options = options || {};
    linkOptionsToDefaults(options);

    const cache = {};

    const loadIntoCache = function loadIntoCache(url) {
        const key = transformUrlToKey(url);
        const pathParts = [cwd(), rootDirectory].concat(url.substring(1).split('/'));
        const lastIndex = pathParts.length - 1;

        /* Strip ? or # from last part of requested file */
        let index;
        if ((index = pathParts[lastIndex].indexOf('?')) > -1) {
            pathParts[lastIndex] = pathParts[lastIndex].substring(0, index);
        }
        if ((index = pathParts[lastIndex].indexOf('#')) > -1) {
            pathParts[lastIndex] = pathParts[lastIndex].substring(0, index);
        }

        /* Assemble full path */
        const path = resolve.apply(null, pathParts);
        if (existsSync(path)) {
            const typeParts = pathParts[lastIndex].split('.'),
                fileType = typeParts.length > 1 ? aliasFileType(typeParts[typeParts.length - 1]) : null,
                contentType = getFileTypeContentType(fileType, options),
                compression = getFileTypeCompression(fileType, options),
                maxAge = getFileTypeMaxAge(fileType, options);
            return cache[key] = {
                found: true,
                fileType: fileType,
                contentType: contentType,
                compression: compression,
                buffer: compression ? Buffer.from(pako.deflate(readFileSync(path))) : readFileSync(path),
                maxAge: maxAge,
            };
        } else {
            return cache[key] = {
                found: false,
            };
        }
    };

    const respondFromCache = function respondFromCache(cacheEntry, res, next) {
        /* Check if found or not */
        if (cacheEntry.found) {
            res.set('Content-Type', cacheEntry.contentType);
            if (cacheEntry.compression) {
                res.set('Content-Encoding', 'deflate');
            }
            if (cacheEntry.maxAge) {
                res.set('Cache-Control', `max-age=${cacheEntry.maxAge}`);
            }
            res.send(cacheEntry.buffer);
        } else {
            next();
        }
    };

    return function tryLoadingFromCache(req, res, next) {
        const key = transformUrlToKey(req.url);
        let cacheEntry = cache[key];
        /* If path has not been cached, load resource into cache */
        if (!cacheEntry) {
            cacheEntry = loadIntoCache(req.url);
        }
        /* Now that we're certain we loaded the cache, respond from cache */
        respondFromCache(cacheEntry, res, next);
    }
}

module.exports = createExpressStaticCache;
