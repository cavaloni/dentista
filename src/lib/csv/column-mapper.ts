import { distance } from "fastest-levenshtein";

export type RequiredField = "full_name" | "address" | "channel" | "priority" | "notes";
export type ExtendedField = RequiredField | "first_name" | "last_name";

export type ColumnMapping = {
  csvColumn: string;
  mappedTo: ExtendedField | null;
  confidence: number; // 0-100
  suggestions: Array<{ field: ExtendedField; score: number }>;
};

export type MappingResult = {
  mappings: ColumnMapping[];
  overallConfidence: number;
  needsReview: boolean;
};

// Known variations for each field
const FIELD_VARIATIONS: Record<ExtendedField, string[]> = {
  full_name: [
    // English variations
    "name", "full name", "fullname", "patient name", "patientname",
    "patient", "client name", "clientname", "person", "contact name",
    "customer name", "customer",
    // Dutch variations
    "naam", "volledige naam", "patient naam", "patientnaam",
    "patiënt", "cliënt naam", "cliëntnaam", "persoon", "contact naam",
    "klant naam", "klant", "deelnemer"
  ],
  first_name: [
    // English variations
    "first name", "firstname", "first", "given name", "forename",
    // Dutch variations
    "voornaam", "eerste naam"
  ],
  last_name: [
    // English variations
    "last name", "lastname", "last", "surname", "family name", "familyname",
    // Dutch variations
    "achternaam", "familienaam"
  ],
  address: [
    // English variations
    "phone", "mobile", "cell", "telephone", "number", "phone number",
    "mobile number", "cell number", "contact", "email", "e-mail",
    "whatsapp", "sms", "telefone", "correo",
    // Dutch variations
    "telefoon", "mobiel", "nummer", "telefoonnummer", "mobiel nummer",
    "contact", "e-mail", "whatsapp", "sms", "emailadres", "e-mail adres",
    "gsm", "06 nummer", "belnummer"
  ],
  channel: [
    // English variations
    "channel", "method", "contact method", "communication", "type",
    "contact type", "medium",
    // Dutch variations
    "kanaal", "methode", "contact methode", "communicatie", "type",
    "contact type", "medium", "contact kanaal", "verzend methode",
    "zendwijze", "communicatie kanaal"
  ],
  priority: [
    // English variations
    "priority", "urgency", "importance", "level", "rank",
    // Dutch variations
    "prioriteit", "urgentie", "belangrijkheid", "niveau", "rang",
    "spoed", "dringend", "belangrijk", "normaal", "laag"
  ],
  notes: [
    // English variations
    "notes", "note", "comments", "comment", "remarks", "remark",
    "description", "details", "memo",
    // Dutch variations
    "opmerkingen", "opmerking", "commentaar", "opmerkingen", "aantekeningen",
    "aantekening", "beschrijving", "details", "notitie", "notities",
    "informatie", "extra info", "extra informatie"
  ],
};

/**
 * Normalize a string for comparison
 */
function normalize(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[_\-\s]+/g, " ")
    .replace(/[^\w\s]/g, "");
}

/**
 * Calculate similarity score between two strings (0-100)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const norm1 = normalize(str1);
  const norm2 = normalize(str2);
  
  // Exact match
  if (norm1 === norm2) return 100;
  
  // Contains match
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    const longer = Math.max(norm1.length, norm2.length);
    const shorter = Math.min(norm1.length, norm2.length);
    return Math.round((shorter / longer) * 90);
  }
  
  // Levenshtein distance
  const maxLen = Math.max(norm1.length, norm2.length);
  const dist = distance(norm1, norm2);
  const similarity = ((maxLen - dist) / maxLen) * 100;
  
  return Math.round(similarity);
}

/**
 * Find the best matching field for a CSV column
 */
function findBestMatch(
  csvColumn: string,
  excludeFields: Set<ExtendedField> = new Set()
): { field: ExtendedField; score: number } | null {
  let bestMatch: { field: ExtendedField; score: number } | null = null;
  
  for (const [field, variations] of Object.entries(FIELD_VARIATIONS)) {
    if (excludeFields.has(field as ExtendedField)) continue;
    
    for (const variation of variations) {
      const score = calculateSimilarity(csvColumn, variation);
      
      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { field: field as ExtendedField, score };
      }
    }
  }
  
  return bestMatch;
}

/**
 * Get top N suggestions for a CSV column
 */
function getSuggestions(
  csvColumn: string,
  excludeFields: Set<ExtendedField> = new Set(),
  topN: number = 3
): Array<{ field: ExtendedField; score: number }> {
  const scores: Array<{ field: ExtendedField; score: number }> = [];
  
  for (const [field, variations] of Object.entries(FIELD_VARIATIONS)) {
    if (excludeFields.has(field as ExtendedField)) continue;
    
    let maxScore = 0;
    for (const variation of variations) {
      const score = calculateSimilarity(csvColumn, variation);
      maxScore = Math.max(maxScore, score);
    }
    
    scores.push({ field: field as ExtendedField, score: maxScore });
  }
  
  return scores
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}

/**
 * Auto-map CSV columns to required fields using fuzzy matching
 */
export function autoMapColumns(csvHeaders: string[]): MappingResult {
  const mappings: ColumnMapping[] = [];
  const usedFields = new Set<ExtendedField>();
  
  // First pass: find high-confidence matches
  for (const header of csvHeaders) {
    const bestMatch = findBestMatch(header, usedFields);
    
    if (bestMatch && bestMatch.score >= 70) {
      usedFields.add(bestMatch.field);
      mappings.push({
        csvColumn: header,
        mappedTo: bestMatch.field,
        confidence: bestMatch.score,
        suggestions: getSuggestions(header, usedFields),
      });
    } else {
      mappings.push({
        csvColumn: header,
        mappedTo: null,
        confidence: bestMatch?.score || 0,
        suggestions: getSuggestions(header, usedFields),
      });
    }
  }
  
  // Calculate overall confidence
  const mappedCount = mappings.filter(m => m.mappedTo !== null).length;
  const avgConfidence = mappings.reduce((sum, m) => sum + m.confidence, 0) / mappings.length;
  const overallConfidence = Math.round((mappedCount / csvHeaders.length) * avgConfidence);
  
  // Check if we have full_name OR (first_name AND/OR last_name)
  const hasFullName = usedFields.has("full_name");
  const hasFirstOrLast = usedFields.has("first_name") || usedFields.has("last_name");
  const hasNameField = hasFullName || hasFirstOrLast;
  
  // Determine if manual review is needed
  const needsReview = overallConfidence < 80 || !hasNameField || !usedFields.has("address");
  
  return {
    mappings,
    overallConfidence,
    needsReview,
  };
}

/**
 * Validate that required fields are mapped
 */
export function validateMappings(mappings: ColumnMapping[]): {
  valid: boolean;
  missingFields: string[];
} {
  const mappedFields = new Set(
    mappings.filter(m => m.mappedTo !== null).map(m => m.mappedTo!)
  );
  
  const missingFields: string[] = [];
  
  // Check for name: full_name OR (first_name and/or last_name)
  const hasFullName = mappedFields.has("full_name");
  const hasFirstOrLast = mappedFields.has("first_name") || mappedFields.has("last_name");
  if (!hasFullName && !hasFirstOrLast) {
    missingFields.push("full_name (or first/last name)");
  }
  
  // Check for address
  if (!mappedFields.has("address")) {
    missingFields.push("address");
  }
  
  return {
    valid: missingFields.length === 0,
    missingFields,
  };
}
