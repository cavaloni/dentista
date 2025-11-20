import { distance } from "fastest-levenshtein";

export type RequiredField = "full_name" | "address" | "channel" | "priority" | "notes";

export type ColumnMapping = {
  csvColumn: string;
  mappedTo: RequiredField | null;
  confidence: number; // 0-100
  suggestions: Array<{ field: RequiredField; score: number }>;
};

export type MappingResult = {
  mappings: ColumnMapping[];
  overallConfidence: number;
  needsReview: boolean;
};

// Known variations for each field
const FIELD_VARIATIONS: Record<RequiredField, string[]> = {
  full_name: [
    // English variations
    "name", "full name", "fullname", "patient name", "patientname",
    "patient", "client name", "clientname", "person", "contact name",
    "first name", "last name", "customer name", "customer",
    // Dutch variations
    "naam", "volledige naam", "patient naam", "patientnaam",
    "patiënt", "cliënt naam", "cliëntnaam", "persoon", "contact naam",
    "voornaam", "achternaam", "klant naam", "klant", "deelnemer"
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
  excludeFields: Set<RequiredField> = new Set()
): { field: RequiredField; score: number } | null {
  let bestMatch: { field: RequiredField; score: number } | null = null;
  
  for (const [field, variations] of Object.entries(FIELD_VARIATIONS)) {
    if (excludeFields.has(field as RequiredField)) continue;
    
    for (const variation of variations) {
      const score = calculateSimilarity(csvColumn, variation);
      
      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { field: field as RequiredField, score };
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
  excludeFields: Set<RequiredField> = new Set(),
  topN: number = 3
): Array<{ field: RequiredField; score: number }> {
  const scores: Array<{ field: RequiredField; score: number }> = [];
  
  for (const [field, variations] of Object.entries(FIELD_VARIATIONS)) {
    if (excludeFields.has(field as RequiredField)) continue;
    
    let maxScore = 0;
    for (const variation of variations) {
      const score = calculateSimilarity(csvColumn, variation);
      maxScore = Math.max(maxScore, score);
    }
    
    scores.push({ field: field as RequiredField, score: maxScore });
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
  const usedFields = new Set<RequiredField>();
  
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
  
  // Determine if manual review is needed
  const needsReview = overallConfidence < 80 || !usedFields.has("full_name") || !usedFields.has("address");
  
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
  missingFields: RequiredField[];
} {
  const requiredFields: RequiredField[] = ["full_name", "address"];
  const mappedFields = new Set(
    mappings.filter(m => m.mappedTo !== null).map(m => m.mappedTo!)
  );
  
  const missingFields = requiredFields.filter(f => !mappedFields.has(f));
  
  return {
    valid: missingFields.length === 0,
    missingFields,
  };
}
