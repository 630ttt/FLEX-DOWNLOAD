const FIELD_ALIASES = [
  {
    semanticType: 'business_name',
    aliases: [
      'business name',
      'company name',
      'shop name',
      'brand name',
      'business',
      'company',
      'shop',
      'brand',
    ],
  },
  {
    semanticType: 'name',
    aliases: [
      'person name',
      'customer name',
      'name',
    ],
  },
  {
    semanticType: 'heading',
    aliases: [
      'main heading',
      'main title',
      'heading',
      'headline',
      'title',
    ],
  },
  {
    semanticType: 'subheading',
    aliases: [
      'sub heading',
      'subheading',
      'sub title',
      'subtitle',
    ],
  },
  {
    semanticType: 'phone',
    aliases: [
      'phone number',
      'mobile number',
      'contact number',
      'phone',
      'mobile',
      'contact',
    ],
  },
  {
    semanticType: 'offer',
    aliases: [
      'discount percentage',
      'discount amount',
      'offer text',
      'discount',
      'offer',
    ],
  },
  {
    semanticType: 'price',
    aliases: [
      'price',
      'cost',
      'rate',
      'amount',
    ],
  },
  {
    semanticType: 'date',
    aliases: [
      'event date',
      'date',
    ],
  },
  {
    semanticType: 'address',
    aliases: [
      'address',
      'location',
      'place',
    ],
  },
  {
    semanticType: 'website',
    aliases: [
      'website address',
      'web address',
      'web site',
      'website',
      'url',
    ],
  },
  {
    semanticType: 'description',
    aliases: [
      'description text',
      'description',
      'tagline',
      'slogan',
      'details',
    ],
  },
  {
    semanticType: 'call_to_action',
    aliases: [
      'call to action',
      'button text',
      'action text',
      'cta',
    ],
  },
];

// ============================================================
// NORMALIZATION
// ============================================================

const normalize = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/\\\./g, '.')
    .replace(/[“”"']/g, '')
    .replace(/[^a-z0-9%₹$€£.+-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeForComparison = (value) =>
  normalize(value)
    .replace(/\s+/g, ' ')
    .trim();

const cleanValue = (value) =>
  String(value || '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/\\\./g, '.')
    .replace(/[“”]/g, '')
    .trim()
    .slice(0, 240);

const escapeRegex = (value) =>
  String(value).replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&'
  );

// ============================================================
// SEMANTIC MATCHING
// ============================================================

const semanticMatches = (
  element,
  semanticType
) => {
  if (
    !element ||
    element.type !== 'text'
  ) {
    return false;
  }

  const elementSemantic =
    normalize(element.semanticType)
      .replace(/\s+/g, '_');

  if (
    elementSemantic === semanticType
  ) {
    return true;
  }

  const aliases = {
    business_name: [
      'business',
      'business_name',
      'company',
      'company_name',
      'shop',
      'shop_name',
      'brand',
      'brand_name',
    ],

    name: [
      'name',
      'person_name',
      'customer_name',
      'business_name',
    ],

    heading: [
      'heading',
      'main_heading',
      'title',
      'main_title',
      'headline',
    ],

    subheading: [
      'subheading',
      'sub_heading',
      'subtitle',
      'sub_title',
    ],

    offer: [
      'offer',
      'discount',
      'discount_percentage',
      'discount_amount',
      'offer_text',
    ],

    price: [
      'price',
      'cost',
      'rate',
      'amount',
    ],

    date: [
      'date',
      'event_date',
    ],

    address: [
      'address',
      'location',
      'place',
    ],

    website: [
      'website',
      'web_site',
      'url',
      'web_address',
      'website_address',
    ],

    description: [
      'description',
      'description_text',
      'tagline',
      'slogan',
      'details',
    ],

    call_to_action: [
      'call_to_action',
      'cta',
      'button_text',
      'action_text',
    ],
  };

  return (
    aliases[semanticType] || []
  ).includes(elementSemantic);
};

// ============================================================
// FIND SEMANTIC FIELD
// ============================================================

const findField = (clause) => {
  const sortedFields = [
    ...FIELD_ALIASES,
  ];

  for (const field of sortedFields) {
    const sortedAliases =
      [...field.aliases].sort(
        (a, b) =>
          b.length - a.length
      );

    for (const alias of sortedAliases) {
      const pattern = new RegExp(
        `\\b${escapeRegex(alias)}\\b`,
        'i'
      );

      if (
        pattern.test(clause)
      ) {
        return field;
      }
    }
  }

  return null;
};

// ============================================================
// EXTRACT REPLACEMENT
// ============================================================
//
// Supported:
//
// Change heading to MANGO
// Change the heading to MANGO
// Change heading from FRUITS to MANGO
// Change FRUITS to MANGO
// Replace 40% with 50%
// Update Eeshitha as Yamini
// Set name to Yamini
//
// ============================================================

const extractReplacement = (
  clause
) => {
  const cleaned =
    clause
      .trim()
      .replace(/[.!?]+$/, '');

  // ----------------------------------------------------------
  // Explicit field form
  // ----------------------------------------------------------

  let match =
    cleaned.match(
      /^(?:please\s+)?(?:change|replace|update|set|make)\s+(?:the\s+)?(.+?)\s+(?:from\s+(.+?)\s+)?(?:to|as|with|is|:)\s+(.+)$/i
    );

  if (match) {
    return {
      target: cleanValue(
        match[1]
      ),

      oldValue: cleanValue(
        match[2]
      ),

      newValue: cleanValue(
        match[3]
      ),
    };
  }

  // ----------------------------------------------------------
  // Direct replacement
  // ----------------------------------------------------------

  match =
    cleaned.match(
      /^(?:please\s+)?(?:change|replace|update)\s+(.+?)\s+(?:to|with|as)\s+(.+)$/i
    );

  if (match) {
    return {
      target: cleanValue(
        match[1]
      ),

      oldValue: '',

      newValue: cleanValue(
        match[2]
      ),
    };
  }

  return null;
};

// ============================================================
// TEXT SIMILARITY
// ============================================================

const similarityScore = (
  source,
  target
) => {
  const a =
    normalizeForComparison(
      source
    );

  const b =
    normalizeForComparison(
      target
    );

  if (!a || !b) {
    return 0;
  }

  if (a === b) {
    return 1;
  }

  if (
    a.includes(b) ||
    b.includes(a)
  ) {
    return 0.92;
  }

  const aWords =
    new Set(a.split(/\s+/));

  const bWords =
    new Set(b.split(/\s+/));

  const intersection =
    [...aWords].filter(
      (word) =>
        bWords.has(word)
    ).length;

  const union =
    new Set([
      ...aWords,
      ...bWords,
    ]).size;

  return union
    ? intersection / union
    : 0;
};

// ============================================================
// FIND ELEMENT BY EXACT TEXT
// ============================================================

const findExactTextMatches = (
  elements,
  text
) => {
  const normalized =
    normalizeForComparison(
      text
    );

  if (!normalized) {
    return [];
  }

  return elements.filter(
    (element) =>
      element.type === 'text' &&
      normalizeForComparison(
        element.text
      ) === normalized
  );
};

// ============================================================
// FIND ELEMENT BY TEXT
// ============================================================

const findElementByText = (
  elements,
  target,
  oldValue = ''
) => {
  const searchText =
    oldValue || target;

  if (!searchText) {
    return [];
  }

  const normalizedSearch =
    normalizeForComparison(
      searchText
    );

  return elements
    .filter(
      (element) =>
        element.type === 'text'
    )
    .map((element) => ({
      element,

      score:
        similarityScore(
          element.text,
          normalizedSearch
        ),
    }))
    .filter(
      ({ score }) =>
        score >= 0.70
    )
    .sort(
      (a, b) =>
        b.score - a.score
    );
};

// ============================================================
// SEMANTIC CANDIDATES
// ============================================================

const candidateForSemantic = (
  elements,
  semanticType
) =>
  elements.filter(
    (element) =>
      semanticMatches(
        element,
        semanticType
      )
  );

// ============================================================
// GROUP NEARBY TEXT
// ============================================================
//
// Gemini may detect:
//
// Happy
// Birthday
// Eeshitha
//
// as three independent headings.
//
// This helper allows the parser to recognize the combined
// visible phrase:
//
// Happy Birthday Eeshitha
//
// without destroying the original individual elements.
// ============================================================

const buildTextGroups = (
  elements
) => {
  const textElements =
    elements
      .filter(
        (element) =>
          element.type === 'text' &&
          element.bbox
      )
      .map((element) => ({
        element,

        x:
          Number(
            element.bbox.x
          ) || 0,

        y:
          Number(
            element.bbox.y
          ) || 0,

        width:
          Number(
            element.bbox.width
          ) || 0,

        height:
          Number(
            element.bbox.height
          ) || 0,
      }));

  if (!textElements.length) {
    return [];
  }

  const groups = [];

  /*
   * Group elements with the same semantic type that are
   * visually close to each other.
   */
  for (
    const item of textElements
  ) {
    const element =
      item.element;

    let group =
      groups.find(
        (existing) => {
          if (
            existing.semanticType !==
            element.semanticType
          ) {
            return false;
          }

          const minX =
            Math.min(
              existing.x,
              item.x
            );

          const maxRight =
            Math.max(
              existing.right,
              item.x +
                item.width
            );

          const verticalDistance =
            Math.abs(
              item.y -
                existing.bottom
            );

          const horizontalDistance =
            Math.abs(
              item.x -
                existing.right
            );

          const heightReference =
            Math.max(
              existing.height,
              item.height,
              1
            );

          return (
            verticalDistance <=
              heightReference * 1.8 ||
            horizontalDistance <=
              heightReference * 3
          );
        }
      );

    if (!group) {
      group = {
        semanticType:
          element.semanticType,

        elements: [],

        x: item.x,

        y: item.y,

        right:
          item.x +
          item.width,

        bottom:
          item.y +
          item.height,

        height:
          item.height,
      };

      groups.push(group);
    }

    group.elements.push(
      element
    );

    group.x =
      Math.min(
        group.x,
        item.x
      );

    group.y =
      Math.min(
        group.y,
        item.y
      );

    group.right =
      Math.max(
        group.right,
        item.x +
          item.width
      );

    group.bottom =
      Math.max(
        group.bottom,
        item.y +
          item.height
      );

    group.height =
      Math.max(
        group.height,
        item.height
      );
  }

  return groups
    .filter(
      (group) =>
        group.elements.length > 1
    )
    .map((group) => {
      const sorted =
        [...group.elements]
          .sort(
            (a, b) => {
              const ay =
                Number(
                  a.bbox?.y
                ) || 0;

              const by =
                Number(
                  b.bbox?.y
                ) || 0;

              if (
                Math.abs(
                  ay - by
                ) > 5
              ) {
                return ay - by;
              }

              const ax =
                Number(
                  a.bbox?.x
                ) || 0;

              const bx =
                Number(
                  b.bbox?.x
                ) || 0;

              return ax - bx;
            }
          );

      return {
        semanticType:
          group.semanticType,

        text:
          sorted
            .map(
              (element) =>
                cleanValue(
                  element.text
                )
            )
            .filter(Boolean)
            .join(' '),

        elements:
          sorted,

        bbox: {
          x: group.x,
          y: group.y,
          width:
            group.right -
            group.x,
          height:
            group.bottom -
            group.y,
        },
      };
    });
};

// ============================================================
// FIND GROUP BY TEXT
// ============================================================

const findGroupByText = (
  elements,
  target
) => {
  const groups =
    buildTextGroups(
      elements
    );

  if (!target) {
    return [];
  }

  const normalizedTarget =
    normalizeForComparison(
      target
    );

  return groups
    .map((group) => ({
      group,

      score:
        similarityScore(
          group.text,
          normalizedTarget
        ),
    }))
    .filter(
      ({ score }) =>
        score >= 0.75
    )
    .sort(
      (a, b) =>
        b.score - a.score
    );
};

// ============================================================
// RESOLVE TARGET ELEMENT
// ============================================================
//
// Priority:
//
// 1. Exact old value
// 2. Exact target text
// 3. Combined/grouped text
// 4. Partial text
// 5. Semantic field
//
// ============================================================

const resolveTargetElement = ({
  target,
  oldValue,
  field,
  elements,
}) => {
  // ----------------------------------------------------------
  // 1. Explicit old value
  // ----------------------------------------------------------

  if (oldValue) {
    const exactOldMatches =
      findExactTextMatches(
        elements,
        oldValue
      );

    if (
      exactOldMatches.length === 1
    ) {
      return {
        element:
          exactOldMatches[0],

        confidence: 0.99,
      };
    }

    if (
      exactOldMatches.length > 1 &&
      field
    ) {
      const semanticMatchesForOldValue =
        exactOldMatches.filter(
          (element) =>
            semanticMatches(
              element,
              field.semanticType
            )
        );

      if (
        semanticMatchesForOldValue.length ===
        1
      ) {
        return {
          element:
            semanticMatchesForOldValue[0],

          confidence: 0.99,
        };
      }
    }
  }

  // ----------------------------------------------------------
  // 2. Exact target text
  // ----------------------------------------------------------

  if (target) {
    const exactTargetMatches =
      findExactTextMatches(
        elements,
        target
      );

    if (
      exactTargetMatches.length ===
      1
    ) {
      return {
        element:
          exactTargetMatches[0],

        confidence: 0.99,
      };
    }

    /*
     * If multiple elements have the same visible text,
     * semantic field can disambiguate.
     */
    if (
      exactTargetMatches.length >
        1 &&
      field
    ) {
      const semanticMatchesForTarget =
        exactTargetMatches.filter(
          (element) =>
            semanticMatches(
              element,
              field.semanticType
            )
        );

      if (
        semanticMatchesForTarget.length ===
        1
      ) {
        return {
          element:
            semanticMatchesForTarget[0],

          confidence: 0.99,
        };
      }
    }
  }

  // ----------------------------------------------------------
  // 3. Combined/grouped text
  // ----------------------------------------------------------

  if (target) {
    const groupCandidates =
      findGroupByText(
        elements,
        oldValue || target
      );

    if (
      groupCandidates.length
    ) {
      const best =
        groupCandidates[0];

      const equallyGood =
        groupCandidates.filter(
          ({ score }) =>
            score >=
            best.score - 0.04
        );

      if (
        equallyGood.length ===
        1
      ) {
        return {
          grouped: true,

          group:
            best.group,

          confidence:
            Math.min(
              0.96,
              best.score
            ),
        };
      }
    }
  }

  // ----------------------------------------------------------
  // 4. Partial/approximate text
  // ----------------------------------------------------------

  const textCandidates =
    findElementByText(
      elements,
      target,
      oldValue
    );

  if (
    textCandidates.length
  ) {
    const bestScore =
      textCandidates[0].score;

    const equallyGood =
      textCandidates.filter(
        ({ score }) =>
          score >=
          bestScore - 0.04
      );

    if (
      equallyGood.length ===
      1
    ) {
      return {
        element:
          equallyGood[0].element,

        confidence:
          Math.min(
            0.96,
            equallyGood[0].score
          ),
      };
    }
  }

  // ----------------------------------------------------------
  // 5. Semantic field
  // ----------------------------------------------------------

  if (field) {
    const semanticCandidates =
      candidateForSemantic(
        elements,
        field.semanticType
      );

    if (
      semanticCandidates.length ===
      1
    ) {
      return {
        element:
          semanticCandidates[0],

        confidence: 0.90,
      };
    }

    if (
      semanticCandidates.length >
      1
    ) {
      return {
        ambiguous: true,

        candidates:
          semanticCandidates,
      };
    }
  }

  return null;
};

// ============================================================
// SPLIT INSTRUCTION
// ============================================================

const splitInstruction = (
  instruction
) => {
  const parts =
    instruction
      .split(/[,;\n]+/)
      .flatMap(
        (part) =>
          part.split(
            /\s+and\s+(?=(?:please\s+)?(?:change|replace|update|set|make)\b)/i
          )
      );

  return parts
    .map(
      (part) =>
        part.trim()
    )
    .filter(Boolean);
};

// ============================================================
// PARSE TEXT CLAUSE
// ============================================================

const parseTextClause = (
  clause,
  elements
) => {
  const replacement =
    extractReplacement(
      clause
    );

  if (!replacement) {
    return null;
  }

  const {
    target,
    oldValue,
    newValue,
  } = replacement;

  if (
    !target ||
    !newValue
  ) {
    return {
      clarification:
        'I could not confidently identify what should be changed and what the new value should be.',
    };
  }

  const field =
    findField(target);

  const resolved =
    resolveTargetElement({
      target,
      oldValue,
      field,
      elements,
    });

  // ----------------------------------------------------------
  // No target
  // ----------------------------------------------------------

  if (!resolved) {
    return {
      clarification:
        `I could not find a detected text region matching "${target}".`,
    };
  }

  // ----------------------------------------------------------
  // Ambiguous semantic field
  // ----------------------------------------------------------

  if (
    resolved.ambiguous
  ) {
    return {
      clarification:
        `More than one detected ${field.semanticType.replace(
          /_/g,
          ' '
        )} region matches. Please specify the existing text.`,

      candidates:
        resolved.candidates.map(
          (element) => ({
            elementId:
              element.id,

            text:
              element.text,

            bbox:
              element.bbox,
          })
        ),
    };
  }

  // ----------------------------------------------------------
  // Grouped text
  // ----------------------------------------------------------

  if (
    resolved.grouped
  ) {
    const group =
      resolved.group;

    /*
     * If the requested target is one individual word
     * inside a grouped heading, find that exact individual
     * OCR element first.
     *
     * Example:
     *
     * Change Eeshitha to Yamini
     *
     * Group:
     * Happy Birthday Eeshitha
     *
     * We want Eeshitha, not the entire group.
     */
    const individualMatches =
      findExactTextMatches(
        group.elements,
        oldValue || target
      );

    if (
      individualMatches.length ===
      1
    ) {
      return createTextChange(
        individualMatches[0],
        field,
        newValue,
        resolved.confidence
      );
    }

    /*
     * If the complete grouped heading was targeted,
     * return a grouped change.
     */
    if (
      normalizeForComparison(
        group.text
      ) ===
      normalizeForComparison(
        oldValue || target
      )
    ) {
      return {
        change: {
          elementId:
            group.elements[0].id,

          elementIds:
            group.elements.map(
              (element) =>
                element.id
            ),

          semanticType:
            group.semanticType ||
            field?.semanticType ||
            'heading',

          oldValue:
            group.text,

          newValue,

          confidence:
            Math.min(
              0.96,
              resolved.confidence ||
                0.9
            ),

          operation:
            'replace_text_group',
        },
      };
    }

    /*
     * If target only matched approximately, prefer an
     * individual element where possible.
     */
    const partialMatches =
      findElementByText(
        group.elements,
        target,
        oldValue
      );

    if (
      partialMatches.length ===
      1
    ) {
      return createTextChange(
        partialMatches[0].element,
        field,
        newValue,
        partialMatches[0].score
      );
    }
  }

  // ----------------------------------------------------------
  // Normal element
  // ----------------------------------------------------------

  if (!resolved.element) {
    return {
      clarification:
        `I could not confidently identify the text region "${target}".`,
    };
  }

  return createTextChange(
    resolved.element,
    field,
    newValue,
    resolved.confidence
  );
};

// ============================================================
// CREATE TEXT CHANGE
// ============================================================

const createTextChange = (
  element,
  field,
  newValue,
  resolutionConfidence
) => {
  if (
    Number.isFinite(
      Number(
        element.confidence
      )
    ) &&
    Number(
      element.confidence
    ) < 0.55
  ) {
    return {
      clarification:
        `The detected region "${element.text}" has low OCR confidence. Please specify its location.`,

      candidates: [
        {
          elementId:
            element.id,

          text:
            element.text,

          bbox:
            element.bbox,
        },
      ],
    };
  }

  return {
    change: {
      elementId:
        element.id,

      semanticType:
        element.semanticType ||
        field?.semanticType ||
        'unknown',

      oldValue:
        element.text || '',

      newValue,

      confidence:
        Math.min(
          Number(
            element.confidence
          ) || 0.55,

          Number(
            resolutionConfidence
          ) || 0.90,

          0.98
        ),

      operation:
        'replace_text',
    },
  };
};

// ============================================================
// IMAGE REPLACEMENT
// ============================================================

const parseImageReplacement = (
  instruction,
  elements,
  replacementImageAvailable,
  imageGenerationAvailable
) => {
  const wantsImageReplacement =
    /\b(?:replace|change|swap|update)\b[\s\S]*?\b(?:photo|picture|portrait|image)\b/i.test(
      instruction
    );

  if (
    !wantsImageReplacement
  ) {
    return null;
  }

  const imageDescription = instruction.match(
    /\b(?:photo|picture|portrait|image)\b[\s\S]*?\b(?:to|with|into)\s+(.+?)(?=\s*(?:[,;]|\band\s+(?:change|replace|update)\b|$))/i
  )?.[1]?.trim();

  if (!replacementImageAvailable && !(imageGenerationAvailable && imageDescription)) {
    return {
      clarification:
        'Describe what the replacement photo or image should show.',
    };
  }

  const candidates =
    elements.filter(
      (element) =>
        ['image', 'logo'].includes(
          element.type
        ) &&
        !/image\s*not\s*included/i.test(
          element.text || ''
        )
    );

  if (
    candidates.length !==
    1
  ) {
    return {
      clarification:
        candidates.length
          ? 'More than one image region could be replaced. Please specify which photo.'
          : 'No replaceable image region was detected in this design.',
    };
  }

  const element =
    candidates[0];

  if (
    Number.isFinite(
      Number(
        element.confidence
      )
    ) &&
    Number(
      element.confidence
    ) < 0.55
  ) {
    return {
      clarification:
        'The image region was detected with low confidence. Please clarify which photo to replace.',
    };
  }

  return {
    change: {
      elementId:
        element.id,

      semanticType:
        element.semanticType ||
        'image',

      oldValue: '',

      newValue:
        imageDescription || 'uploaded_image',

      confidence:
        Math.min(
          Number(
            element.confidence
          ) || 0.55,
          0.98
        ),

      operation:
        'replace_image',
    },
  };
};

// ============================================================
// MAIN PARSER
// ============================================================

const parse = async ({
  instruction,
  detectedElements,
  replacementImageAvailable = false,
  imageGenerationAvailable = false,
}) => {
  if (
    typeof instruction !==
      'string' ||
    instruction.length >
      2000
  ) {
    throw new Error(
      'Instruction must be 2000 characters or fewer'
    );
  }

  const safeInstruction =
    instruction
      .replace(
        /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,
        ''
      )
      .trim();

  if (
    !safeInstruction
  ) {
    return {
      changes: [],

      clarificationRequired:
        true,

      warnings: [
        'Enter what you want to change.',
      ],
    };
  }

  if (
    !Array.isArray(
      detectedElements
    )
  ) {
    throw new Error(
      'Detected design elements are required'
    );
  }

  const changes = [];
  const warnings = [];

  // ----------------------------------------------------------
  // IMAGE CHANGE
  // ----------------------------------------------------------

  const imageChange =
    parseImageReplacement(
      safeInstruction,
      detectedElements,
      replacementImageAvailable,
      imageGenerationAvailable
    );

  if (imageChange) {
    if (
      imageChange.change
    ) {
      changes.push(
        imageChange.change
      );
    }

    if (
      imageChange.clarification
    ) {
      warnings.push(
        imageChange.clarification
      );
    }
  }

  // ----------------------------------------------------------
  // TEXT CHANGES
  // ----------------------------------------------------------

  const clauses =
    splitInstruction(
      safeInstruction
    );

  let recognized =
    Boolean(imageChange);

  for (
    const clause of clauses
  ) {
    if (
      /\b(?:replace|change|swap|update)\b[\s\S]*?\b(?:photo|picture|portrait|image)\b[\s\S]*?\b(?:to|with|into)\b/i.test(clause)
    ) {
      continue;
    }

    const result =
      parseTextClause(
        clause,
        detectedElements
      );

    if (!result) {
      continue;
    }

    recognized = true;

    if (
      result.change
    ) {
      changes.push(
        result.change
      );
    }

    if (
      result.clarification
    ) {
      warnings.push(
        result.clarification
      );
    }
  }

  // ----------------------------------------------------------
  // UNKNOWN INSTRUCTION
  // ----------------------------------------------------------

  if (!recognized) {
    warnings.push(
      'I could not map that instruction to a supported detected text or image element. Please identify the field or visible text you want changed.'
    );
  }

  // ----------------------------------------------------------
  // REMOVE DUPLICATE ELEMENT CHANGES
  // ----------------------------------------------------------
  //
  // Last instruction wins for the same element.
  //
  // ----------------------------------------------------------

  const uniqueChanges = [
    ...new Map(
      changes.map(
        (change) => [
          change.elementId,
          change,
        ]
      )
    ).values(),
  ];

  // ----------------------------------------------------------
  // CLARIFICATION STATUS
  // ----------------------------------------------------------

  const clarificationRequired =
    uniqueChanges.length === 0 ||
    warnings.some(
      (warning) =>
        /could not|couldn't|more than one|low confidence|please upload|please specify|no replaceable/i.test(
          warning
        )
    );

  return {
    changes:
      uniqueChanges,

    clarificationRequired,

    warnings,
  };
};

// ============================================================
// EXPORT
// ============================================================

module.exports = {
  parse,
};