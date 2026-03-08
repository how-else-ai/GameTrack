module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './src',
            '@assets': './assets',
            '@game-time-tracker/core': '../../packages/core/src',
          },
          extensions: ['.js', '.jsx', '.ts', '.tsx', '.ttf', '.png'],
        },
      ],
    ],
  };
};
