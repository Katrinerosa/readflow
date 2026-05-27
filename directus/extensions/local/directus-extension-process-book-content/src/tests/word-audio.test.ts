/**
 * Unit tests for word extraction and normalization
 */

import { extractWords } from '../word-audio';

// Test utilities
function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}\n  Expected: ${expected}\n  Actual: ${actual}`);
  }
}

function assertContains(arr: string[], word: string, message: string): void {
  if (!arr.includes(word)) {
    throw new Error(`${message}\n  Expected to contain: ${word}\n  Array: [${arr.join(', ')}]`);
  }
}

function assertNotContains(arr: string[], word: string, message: string): void {
  if (arr.includes(word)) {
    throw new Error(`${message}\n  Expected NOT to contain: ${word}`);
  }
}

// Tests
function testBasicWordExtraction(): void {
  console.log('Testing basic word extraction...');

  const words = extractWords('<p>Hello world</p>');
  assertEqual(words.length, 2, 'Should extract 2 words');
  assertContains(words, 'hello', 'Should contain hello');
  assertContains(words, 'world', 'Should contain world');

  console.log('✓ Basic word extraction tests passed');
}

function testHtmlEntityDecoding(): void {
  console.log('Testing HTML entity decoding in words...');

  const words = extractWords('<p>bl&aelig;st l&oslash;d p&aring;</p>');
  assertContains(words, 'blæst', 'Should decode æ');
  assertContains(words, 'lød', 'Should decode ø');
  assertContains(words, 'på', 'Should decode å');

  const words2 = extractWords('<p>&Oslash;jnene gl&oslash;dede</p>');
  assertContains(words2, 'øjnene', 'Should lowercase decoded Ø');
  assertContains(words2, 'glødede', 'Should decode ø in middle');

  console.log('✓ HTML entity decoding tests passed');
}

function testPunctuationStripping(): void {
  console.log('Testing punctuation stripping...');

  const words = extractWords('<p>skoven. &ldquo;Hej&rdquo; nr. 18 akkurat</p>');
  assertContains(words, 'skoven', 'Should strip trailing period');
  assertContains(words, 'hej', 'Should strip curly quotes');
  assertContains(words, 'nr', 'Should strip trailing period from nr.');
  assertContains(words, '18', 'Should include numbers');
  assertContains(words, 'akkurat', 'Should keep clean words');

  const words2 = extractWords('<p>»Hej…</p>');
  assertContains(words2, 'hej', 'Should strip guillemet and ellipsis');

  console.log('✓ Punctuation stripping tests passed');
}

function testInternalPunctuation(): void {
  console.log('Testing internal punctuation preservation...');

  const words = extractWords('<p>ultra-fokuseret sammensætte</p>');
  assertContains(words, 'ultra-fokuseret', 'Should keep internal hyphen');
  assertContains(words, 'sammensætte', 'Should keep æ in word');

  console.log('✓ Internal punctuation tests passed');
}

function testDeduplication(): void {
  console.log('Testing deduplication...');

  const words = extractWords('<p>Solen solen SOLEN solen.</p>');
  const solenCount = words.filter(w => w === 'solen').length;
  assertEqual(solenCount, 1, 'Should deduplicate case-insensitive');

  console.log('✓ Deduplication tests passed');
}

function testHtmlTagStripping(): void {
  console.log('Testing HTML tag stripping...');

  const words = extractWords(
    '<h1>Title</h1><p>Text with <strong>bold</strong> and <em>italic</em>.</p><img src="/assets/abc.jpg">'
  );
  assertContains(words, 'title', 'Should extract from h1');
  assertContains(words, 'text', 'Should extract from p');
  assertContains(words, 'bold', 'Should extract from strong');
  assertContains(words, 'italic', 'Should extract from em');
  assertNotContains(words, 'img', 'Should not include tag names');
  assertNotContains(words, 'src', 'Should not include attributes');

  console.log('✓ HTML tag stripping tests passed');
}

function testEmptyAndEdgeCases(): void {
  console.log('Testing empty and edge cases...');

  assertEqual(extractWords('').length, 0, 'Empty string should give 0 words');
  assertEqual(extractWords('<p></p>').length, 0, 'Empty tags should give 0 words');
  assertEqual(extractWords('<p>&nbsp;</p>').length, 0, 'Only nbsp should give 0 words');
  assertEqual(extractWords('   ').length, 0, 'Only whitespace should give 0 words');
  assertEqual(extractWords('<p>...</p>').length, 0, 'Only punctuation should give 0 words');

  console.log('✓ Empty and edge case tests passed');
}

function testFullDanishContent(): void {
  console.log('Testing full Danish content...');

  const html = `<h1>Test</h1>
<p>Morgenen smagte af bl&aelig;st. Hele vejen ned ad bakken fra Lunas Hus hus l&oslash;d vinden som en gammel ugle.</p>
<p>Luna trak heksehatten godt ned i panden, og samlede sin udkl&aelig;dnings-kappe om sig.</p>
<p>&ldquo;Du f&oslash;lger efter mig,&rdquo; sagde Luna.</p>`;

  const words = extractWords(html);

  assertContains(words, 'blæst', 'Should have decoded blæst');
  assertContains(words, 'lød', 'Should have decoded lød');
  assertContains(words, 'følger', 'Should have decoded følger');

  assertContains(words, 'udklædnings-kappe', 'Should preserve hyphenated word');

  const nedCount = words.filter(w => w === 'ned').length;
  assertEqual(nedCount, 1, '"ned" appears twice in text but should be deduped');

  assert(words.length > 20, `Should have >20 unique words, got ${words.length}`);
  assert(words.length < 50, `Should have <50 unique words, got ${words.length}`);

  console.log(`  Extracted ${words.length} unique words`);
  console.log('✓ Full Danish content tests passed');
}

// Run all tests
function runAllTests(): void {
  console.log('='.repeat(60));
  console.log('Running Word Audio Tests');
  console.log('='.repeat(60));
  console.log('');

  try {
    testBasicWordExtraction();
    console.log('');
    testHtmlEntityDecoding();
    console.log('');
    testPunctuationStripping();
    console.log('');
    testInternalPunctuation();
    console.log('');
    testDeduplication();
    console.log('');
    testHtmlTagStripping();
    console.log('');
    testEmptyAndEdgeCases();
    console.log('');
    testFullDanishContent();
    console.log('');

    console.log('='.repeat(60));
    console.log('✓ All word audio tests passed!');
    console.log('='.repeat(60));
    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('='.repeat(60));
    console.error('✗ Test failed:');
    console.error(error);
    console.error('='.repeat(60));
    process.exit(1);
  }
}

runAllTests();
