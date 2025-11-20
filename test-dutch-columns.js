import { autoMapColumns } from '../src/lib/csv/column-mapper';

// Test Dutch column names
console.log('Testing Dutch column name mapping...');

const dutchHeaders = [
  'Naam',
  'Telefoonnummer',
  'Kanaal',
  'Prioriteit',
  'Opmerkingen'
];

const result = autoMapColumns(dutchHeaders);

console.log('Mapping Results:');
console.log(JSON.stringify(result, null, 2));

console.log('\nDetailed Mappings:');
result.mappings.forEach(mapping => {
  console.log(`${mapping.csvColumn} -> ${mapping.mappedTo} (confidence: ${mapping.confidence}%)`);
});

console.log(`\nOverall confidence: ${result.overallConfidence}%`);
console.log(`Needs review: ${result.needsReview}`);

// Test with mixed English/Dutch headers
console.log('\n\nTesting mixed English/Dutch headers...');
const mixedHeaders = [
  'Patient Naam',
  'mobiel',
  'contact methode',
  'urgentie',
  'extra informatie'
];

const mixedResult = autoMapColumns(mixedHeaders);
console.log('Mixed Headers Results:');
mixedResult.mappings.forEach(mapping => {
  console.log(`${mapping.csvColumn} -> ${mapping.mappedTo} (confidence: ${mapping.confidence}%)`);
});

console.log(`\nMixed headers overall confidence: ${mixedResult.overallConfidence}%`);
console.log(`Mixed headers needs review: ${mixedResult.needsReview}`);