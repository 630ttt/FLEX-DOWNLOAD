const registeredProviders = new Map();

const CONFIG = {
  vision: {
    env: 'AI_VISION_PROVIDER',
    method: 'analyze',
  },

  image: {
    env: 'AI_IMAGE_PROVIDER',
    method: 'inpaint',
  },
};

class AiConfigurationError extends Error {
  constructor(message) {
    super(message);

    this.name = 'AiConfigurationError';
    this.code = 'AI_CONFIGURATION_REQUIRED';
    this.statusCode = 503;
  }
}

/**
 * Register an AI provider manually.
 */
const registerProvider = (kind, name, provider) => {
  if (!CONFIG[kind]) {
    throw new Error(
      `Unknown AI provider kind: ${kind}`
    );
  }

  if (
    !provider ||
    typeof provider[CONFIG[kind].method] !== 'function'
  ) {
    throw new Error(
      `Provider must implement ${CONFIG[kind].method}()`
    );
  }

  registeredProviders.set(
    `${kind}:${name}`,
    provider
  );
};

/**
 * Remove a registered provider.
 */
const unregisterProvider = (kind, name) =>
  registeredProviders.delete(
    `${kind}:${name}`
  );

/**
 * Resolve the API key environment variable for a provider.
 *
 * Gemini:
 *   GEMINI_API_KEY
 *
 * OpenAI:
 *   AI_API_KEY
 *
 * A provider can also explicitly define:
 *
 *   apiKeyEnv: 'SOME_CUSTOM_KEY'
 */
const getProviderApiKeyEnv = (provider) => {
  if (provider?.apiKeyEnv) {
    return provider.apiKeyEnv;
  }

  return 'AI_API_KEY';
};

/**
 * Resolve a configured AI provider.
 */
const resolveProvider = (kind) => {
  const config = CONFIG[kind];

  if (!config) {
    throw new Error(
      `Unknown AI provider kind: ${kind}`
    );
  }

  const name =
    process.env[config.env]?.trim();

  if (!name) {
    throw new AiConfigurationError(
      `${config.env} is not configured. Add a backend ${config.env} provider to enable image customization.`
    );
  }

  let provider =
    registeredProviders.get(
      `${kind}:${name}`
    );

  /*
   * Automatically load:
   *
   * ./providers/openai
   * ./providers/gemini
   * etc.
   */
  if (
    !provider &&
    /^[a-z\d_-]+$/i.test(name)
  ) {
    const adapterPath = `./providers/${name}`;
    try {
      require.resolve(adapterPath);
    } catch (error) {
      if (error.code !== 'MODULE_NOT_FOUND') throw error;
      throw new AiConfigurationError(
        `The configured ${kind} provider "${name}" has no installed backend adapter.`
      );
    }

    try {
      provider = require(adapterPath);

      registeredProviders.set(
        `${kind}:${name}`,
        provider
      );
    } catch (error) {
      error.provider = name;
      throw error;
    }
  }

  if (!provider) {
    throw new AiConfigurationError(
      `The configured ${kind} provider "${name}" has no installed backend adapter.`
    );
  }

  /*
   * Verify that the provider implements the
   * required method for this provider type.
   */
  if (
    typeof provider[config.method] !==
    'function'
  ) {
    throw new AiConfigurationError(
      `The configured ${kind} provider "${name}" does not implement ${config.method}().`
    );
  }

  /*
   * Providers can opt into API-key validation.
   *
   * OpenAI provider:
   *   apiKeyEnv: 'AI_API_KEY'
   *
   * Gemini provider:
   *   apiKeyEnv: 'GEMINI_API_KEY'
   */
  if (provider.requiresApiKey) {
    const apiKeyEnv =
      getProviderApiKeyEnv(provider);

    if (
      !process.env[apiKeyEnv]?.trim()
    ) {
      throw new AiConfigurationError(
        `${apiKeyEnv} is required by the configured ${kind} provider "${name}". Add it to the backend environment.`
      );
    }
  }

  return {
    name,
    provider,
  };
};

module.exports = {
  AiConfigurationError,
  registerProvider,
  unregisterProvider,
  resolveProvider,
};