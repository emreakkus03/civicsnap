const path = require('path');

module.exports = {
    webpack: {
        alias: {
            '@core': path.resolve(__dirname, 'src/core'),
            '@components': path.resolve(__dirname, 'src/components'),
            '@pages': path.resolve(__dirname, 'src/pages'),
            '@fonts': path.resolve(__dirname, 'src/fonts'),
            '@lib': path.resolve(__dirname, 'src/lib'),
        },
    },
};