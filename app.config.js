const { expo: baseConfig } = require('./app.json');

const SENTRY_PLUGIN = '@sentry/react-native';

function withoutSentryPlugin(plugin) {
  return Array.isArray(plugin)
    ? plugin[0] !== SENTRY_PLUGIN
    : plugin !== SENTRY_PLUGIN;
}

module.exports = ({ config }) => {
  const organization = process.env.SENTRY_ORG || process.env.SENTRY_ORGANIZATION;
  const project = process.env.SENTRY_PROJECT;
  const url = process.env.SENTRY_URL || 'https://sentry.io/';

  const plugins = [...(baseConfig.plugins || []).filter(withoutSentryPlugin)];

  if (organization && project) {
    plugins.push([
      SENTRY_PLUGIN,
      {
        organization,
        project,
        url,
      },
    ]);
  }

  return {
    ...config,
    ...baseConfig,
    plugins,
  };
};
