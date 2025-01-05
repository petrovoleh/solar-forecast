const path = require('path');

module.exports = {
    entry: './src/index.js',
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'dist'),
    },
    devServer: {
        client: {
            webSocketURL: {
                hostname: '193.219.91.103',
                port: 13415, // Replace with your custom port
                protocol: 'ws',
            },
        },
    },
};
