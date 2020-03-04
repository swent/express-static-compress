# express-static-compress
High performance static assets cache for express that also supports compression and maxAge cache-control.

## Example
```javascript
const expressCache = require('express-static-compress');
const express = require('express');

const app = express();

app.use('/resources', expressCache('wwwresources-static-folder'));
```

## Options
The cache will decently choose compression based on file type (currently only deflate is supported).
Default maxAge cache-control is 14 days.
Options can be set as second argument:

```javascript
expressCache('wwwresources-static-folder', {
    maxAge: 60 * 60 * 24 * 365
});

expressCache('wwwresources-static-folder', {
    png: {
        compression: 'deflate'
    },
    css: {
        maxAge: 60 * 60
    }
});
```

Use value `null` to disable cache-control / compression.
