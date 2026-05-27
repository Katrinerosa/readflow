/**
 * Unit tests for analyze module
 */

import { decode } from 'html-entities';
import { extractAssetIds, calculateLIX, getLIXLevel, calculateLET } from '../analyze';

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

function assertInRange(actual: number, min: number, max: number, message: string): void {
  if (actual < min || actual > max) {
    throw new Error(`${message}\n  Expected: ${min}-${max}\n  Actual: ${actual}`);
  }
}

// Test suites
function testHtmlEntityDecoding(): void {
  console.log('Testing HTML entity decoding...');

  assertEqual(decode('bl&aelig;st'), 'blæst', 'Should decode &aelig; to æ');
  assertEqual(decode('l&oslash;d'), 'lød', 'Should decode &oslash; to ø');
  assertEqual(decode('p&aring;'), 'på', 'Should decode &aring; to å');
  assertEqual(decode('&Oslash;jnene'), 'Øjnene', 'Should decode &Oslash; to Ø');
  assertEqual(decode('&ndash;'), '–', 'Should decode &ndash; to en-dash');

  assertEqual(decode('&#230;'), 'æ', 'Should decode numeric entity &#230;');
  assertEqual(decode('&#248;'), 'ø', 'Should decode numeric entity &#248;');
  assertEqual(decode('&#xe6;'), 'æ', 'Should decode hex entity &#xe6;');

  const input = 'Morgenen smagte af bl&aelig;st. Hele vejen ned ad bakken fra Lunas Hus hus l&oslash;d vinden';
  const decoded = decode(input);
  assert(decoded.includes('blæst'), 'Should decode æ in context');
  assert(decoded.includes('lød'), 'Should decode ø in context');

  const quoteDecode = decode('&ldquo;Du&rdquo;');
  assert(quoteDecode.includes('Du'), 'Should decode quotes around text');

  assertEqual(decode('&nbsp;'), '\u00A0', 'Should decode &nbsp;');
  assertEqual(decode('&amp;'), '&', 'Should decode &amp;');

  console.log('✓ HTML entity decoding tests passed');
}

function testLixCalculation(): void {
  console.log('Testing LIX calculation...');

  const danishText = decode(
    'Morgenen smagte af blæst. Hele vejen ned ad bakken fra Lunas Hus hus lød vinden som en gammel ugle.'
  );
  const lix = calculateLIX(danishText);
  assertInRange(lix, 10, 50, 'LIX for simple Danish text should be reasonable');

  const simpleText = 'The cat sat. The dog ran. The sun was hot.';
  const simpleLix = calculateLIX(simpleText);
  assert(simpleLix < 30, 'Simple text should have low LIX');

  const complexText = 'The extraordinary environmental circumstances necessitated comprehensive investigation.';
  const complexLix = calculateLIX(complexText);
  assert(complexLix > 40, 'Complex text should have high LIX');

  assertEqual(getLIXLevel(20), 'easy', 'LIX 20 should be easy');
  assertEqual(getLIXLevel(28), 'easy', 'LIX 28 should be easy');
  assertEqual(getLIXLevel(30), 'medium', 'LIX 30 should be medium');
  assertEqual(getLIXLevel(38), 'medium', 'LIX 38 should be medium');
  assertEqual(getLIXLevel(45), 'hard', 'LIX 45 should be hard');

  assertEqual(calculateLIX(''), 0, 'Empty text should have LIX 0');
  assert(calculateLIX('Word.') > 0, 'Single word should have positive LIX');

  console.log('✓ LIX calculation tests passed');
}

function testLettalCalculation(): void {
  console.log('Testing LET-tal calculation...');

  const verySimple = 'The cat sat on the mat.';
  const letSimple = calculateLET(verySimple, 6, 0);
  assertInRange(letSimple, 6, 12, 'Simple text should have low LET-tal');

  const medium = 'The quick brown fox jumps over the lazy dog. ' +
    'This sentence is a bit longer and more complex. ' +
    'We need several sentences to test properly.';
  const letMedium = calculateLET(medium, 30, 1);
  assertInRange(letMedium, 10, 18, 'Medium text should have medium LET-tal');

  const complex = Array(200).fill('extraordinary').join(' ') + '.';
  const letComplex = calculateLET(complex, 200, 0);
  assertInRange(letComplex, 15, 24, 'Complex text should have high LET-tal');

  const textWithManyImages = 'The cat sat on the mat.';
  const letWithImages = calculateLET(textWithManyImages, 6, 5);
  const letWithoutImages = calculateLET(textWithManyImages, 6, 0);
  assert(letWithImages < letWithoutImages, 'More images should reduce LET-tal');

  assertEqual(calculateLET('', 0, 0), 6, 'Empty text should have minimum LET-tal of 6');

  console.log('✓ LET-tal calculation tests passed');
}

function testAssetExtraction(): void {
  console.log('Testing asset ID extraction...');

  const html1 = '<img src="http://localhost:8055/assets/55ae71df-885d-4a6a-a334-16609054b201.jpg">';
  const assets1 = extractAssetIds(html1);
  assertEqual(assets1.length, 1, 'Should extract one asset');
  assertEqual(assets1[0], '55ae71df-885d-4a6a-a334-16609054b201', 'Should extract correct UUID');

  const html2 = `
    <img src="/assets/55ae71df-885d-4a6a-a334-16609054b201.jpg">
    <img src="/assets/12345678-1234-1234-1234-123456789012.png">
  `;
  const assets2 = extractAssetIds(html2);
  assertEqual(assets2.length, 2, 'Should extract two assets');

  const html3 = `
    <img src="/assets/55ae71df-885d-4a6a-a334-16609054b201.jpg">
    <img src="/assets/55ae71df-885d-4a6a-a334-16609054b201.jpg">
  `;
  const assets3 = extractAssetIds(html3);
  assertEqual(assets3.length, 1, 'Should deduplicate assets');

  const html4 = '<p>Just text, no images</p>';
  const assets4 = extractAssetIds(html4);
  assertEqual(assets4.length, 0, 'Should extract no assets from text-only HTML');

  console.log('✓ Asset extraction tests passed');
}

function testFullAnalysis(): void {
  console.log('Testing full analysis workflow...');

  const testHtml = `<h1>Test</h1>
<p data-audio="123">Morgenen smagte af bl&aelig;st. Hele vejen ned ad bakken fra Lunas Hus hus l&oslash;d vinden som en gammel ugle, og bladene raslede hen over fortovet som hemmeligheder p&aring; flugt.</p>
<p>Luna trak heksehatten godt ned i panden, og samlede sin udkl&aelig;dnings-kappe om sig.</p>
<p>Wulfric luntede halvt bagved, halvt ved siden af &ndash; s&aring;dan som ulve g&oslash;r, n&aring;r de b&aring;de vil passe p&aring; og lade som om, de bare tilf&aelig;ldigvis skal samme vej.</p>
<p>&ldquo;Du f&oslash;lger efter mig,&rdquo; sagde Luna.</p>
<p>&ldquo;Jeg f&oslash;lger dig i skole &ndash; bagfra,&rdquo; brummede Wulfric. &ldquo;Det er mit job som din barnepige.&rdquo;</p>
<p>De passerede nummer 17, hvor en plastik heks hang i en snor og drejede i vinden. &Oslash;jnene gl&oslash;dede r&oslash;dt, men kun n&aring;r batterierne virkede. At d&oslash;mme efter det svage lys i &oslash;jnene sang batterierne p&aring; sidste vers.</p>
<p><img src="http://localhost:8055/assets/55ae71df-885d-4a6a-a334-16609054b201.jpg?width=1200&amp;height=800"></p>
<p>adasdas&nbsp;</p>
<p>&nbsp;sdasdas</p>`;

  const decodedHtml = decode(testHtml, { level: 'all' });

  const textOnly = decodedHtml
    .replace(/<img[^>]*>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  assert(textOnly.includes('blæst'), 'Should contain decoded æ');
  assert(textOnly.includes('lød'), 'Should contain decoded ø');
  assert(textOnly.includes('på'), 'Should contain decoded å');
  assert(textOnly.includes('Øjnene'), 'Should contain decoded Ø');

  const chapterCount = (testHtml.match(/<h1[^>]*>/gi) || []).length;
  assertEqual(chapterCount, 1, 'Should count 1 chapter');

  const imageCount = (testHtml.match(/<img[^>]*>/gi) || []).length;
  assertEqual(imageCount, 1, 'Should count 1 image');

  const assetIds = extractAssetIds(testHtml);
  assertEqual(assetIds.length, 1, 'Should extract 1 asset');

  const words = textOnly.split(/\s+/).filter(w => w.length > 0);
  assert(words.length > 80, 'Should have reasonable word count');

  const lix = calculateLIX(textOnly);
  assertInRange(lix, 20, 60, 'LIX should be in reasonable range');

  const lettal = calculateLET(textOnly, words.length, imageCount);
  assertInRange(lettal, 6, 24, 'LET-tal should be in valid range (6-24)');

  console.log(`  Word count: ${words.length}`);
  console.log(`  LIX: ${lix} (${getLIXLevel(lix)})`);
  console.log(`  LET-tal: ${lettal}`);
  console.log('✓ Full analysis tests passed');
}

// Run all tests
function runAllTests(): void {
  console.log('='.repeat(60));
  console.log('Running Analyze Tests');
  console.log('='.repeat(60));
  console.log('');

  try {
    testHtmlEntityDecoding();
    console.log('');
    testLixCalculation();
    console.log('');
    testLettalCalculation();
    console.log('');
    testAssetExtraction();
    console.log('');
    testFullAnalysis();
    console.log('');

    console.log('='.repeat(60));
    console.log('✓ All analyze tests passed!');
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
