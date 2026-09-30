const ruleBasedProvider = require('./instructionParsingProvider');

const parseInstruction = async ({
  instruction,
  detectedElements = [],
  replacementImageAvailable = false,
  imageGenerationAvailable = false,
  provider = ruleBasedProvider,
}) => {
  if (!provider || typeof provider.parse !== 'function') {
    throw new Error(
      'Instruction parsing provider must implement parse()'
    );
  }

  if (!Array.isArray(detectedElements)) {
    throw new Error('detectedElements must be an array');
  }

  const result = await provider.parse({
    instruction: typeof instruction === 'string'
      ? instruction.trim()
      : '',
    detectedElements,
    replacementImageAvailable,
    imageGenerationAvailable,
  });

  if (
    !result ||
    !Array.isArray(result.changes) ||
    !Array.isArray(result.warnings)
  ) {
    throw new Error(
      'Instruction provider returned an invalid change list'
    );
  }

  const knownElements = new Map(
    detectedElements
      .filter((element) => element && element.id)
      .map((element) => [element.id, element])
  );

  const warnings = [...result.warnings];

  const changes = [];

  for (const change of result.changes) {
    if (!change || typeof change !== 'object') {
      continue;
    }

    const elementId = String(change.elementId || '').trim();

    if (!elementId) {
      warnings.push(
        'A proposed change did not specify a detected element.'
      );
      continue;
    }

    const element = knownElements.get(elementId);

    if (!element) {
      warnings.push(
        `The requested change could not be matched to detected element "${elementId}".`
      );
      continue;
    }

    changes.push({
      ...change,
      elementId,
    });
  }

  /*
   * Do not treat ordinary warnings as clarification automatically.
   *
   * A clarification is required only when:
   *   1. the provider explicitly says it needs clarification, or
   *   2. no usable changes were produced.
   *
   * Warnings can still be returned to the frontend without
   * unnecessarily stopping the customization pipeline.
   */
  const clarificationRequired =
    Boolean(result.clarificationRequired) ||
    changes.length === 0;

  return {
    changes,
    clarificationRequired,
    warnings,
  };
};

module.exports = {
  parseInstruction,
};