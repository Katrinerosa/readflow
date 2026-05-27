/**
 * Unit tests for word explanation span injection
 */

import { stripWordExplanationSpans, buildEntityAwarePattern, injectWordExplanationSpans } from '../word-explanations';
import { splitHtmlSegments } from '../html';

// Test utilities
function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}\n  Expected: ${JSON.stringify(expected)}\n  Actual: ${JSON.stringify(actual)}`);
  }
}

// ===================== splitHtmlSegments tests =====================

function testSplitHtmlSegments(): void {
  console.log('Testing splitHtmlSegments...');

  const segments = splitHtmlSegments('<p>Hello <strong>world</strong> end</p>');
  // Should split into: '<p>', 'Hello ', '<strong>', 'world', '</strong>', ' end', '</p>'
  assertEqual(segments.length, 7, 'Should have 7 segments');
  assertEqual(segments[0].type, 'tag', 'First is tag');
  assertEqual(segments[1].type, 'text', 'Second is text');
  assertEqual(segments[1].content, 'Hello ', 'Text content preserved');
  assertEqual(segments[2].type, 'tag', 'Third is tag');
  assertEqual(segments[3].type, 'text', 'Fourth is text');
  assertEqual(segments[3].content, 'world', 'Inner text preserved');

  console.log('  Passed');
}

// ===================== stripWordExplanationSpans tests =====================

function testStripBasic(): void {
  console.log('Testing stripWordExplanationSpans — removes wrapping, preserves inner text...');

  const html = '<p>Her er en <span data-word="abc-123">heks</span> i skoven.</p>';
  const result = stripWordExplanationSpans(html);
  assertEqual(result, '<p>Her er en heks i skoven.</p>', 'Should unwrap span, keep text');

  console.log('  Passed');
}

function testStripWithInnerTags(): void {
  console.log('Testing stripWordExplanationSpans — handles inner <em> tags...');

  const html = '<p>Se <span data-word="id1"><em>stor</em></span> hund.</p>';
  const result = stripWordExplanationSpans(html);
  assertEqual(result, '<p>Se <em>stor</em> hund.</p>', 'Should preserve inner em tag');

  console.log('  Passed');
}

function testStripMultiple(): void {
  console.log('Testing stripWordExplanationSpans — multiple spans...');

  const html = '<p><span data-word="a">heks</span> og <span data-word="b">trold</span></p>';
  const result = stripWordExplanationSpans(html);
  assertEqual(result, '<p>heks og trold</p>', 'Should strip all data-word spans');

  console.log('  Passed');
}

// ===================== buildEntityAwarePattern tests =====================

function testPatternPlainAscii(): void {
  console.log('Testing buildEntityAwarePattern — plain ASCII word...');

  const pattern = buildEntityAwarePattern('heks');
  const re = new RegExp(pattern, 'i');
  assert(re.test('heks'), 'Should match lowercase');
  assert(re.test('Heks'), 'Should match capitalized');
  assert(!re.test('hex'), 'Should not match partial');

  console.log('  Passed');
}

function testPatternAeMatch(): void {
  console.log('Testing buildEntityAwarePattern — word with æ matches &aelig;...');

  const pattern = buildEntityAwarePattern('blæst');
  const re = new RegExp(pattern, 'i');
  assert(re.test('blæst'), 'Should match literal æ');
  assert(re.test('bl&aelig;st'), 'Should match &aelig; entity');
  assert(re.test('bl&#230;st'), 'Should match &#230; entity');
  assert(re.test('bl&#xe6;st'), 'Should match &#xe6; entity');
  assert(re.test('Bl&aelig;st'), 'Should match capitalized with entity');

  console.log('  Passed');
}

function testPatternOeMatch(): void {
  console.log('Testing buildEntityAwarePattern — word with ø matches &oslash;...');

  const pattern = buildEntityAwarePattern('lød');
  const re = new RegExp(pattern, 'i');
  assert(re.test('lød'), 'Should match literal ø');
  assert(re.test('l&oslash;d'), 'Should match &oslash; entity');
  assert(re.test('l&#248;d'), 'Should match &#248; entity');

  console.log('  Passed');
}

// ===================== injectWordExplanationSpans tests =====================

function testInjectBasicWord(): void {
  console.log('Testing injectWordExplanationSpans — basic single word wrap...');

  const html = '<p>Der var en heks i skoven.</p>';
  const explanations = [{ id: 'uuid-1', word: 'heks', variants: null }];
  const result = injectWordExplanationSpans(html, explanations);
  assertEqual(result.html, '<p>Der var en <span data-word="uuid-1">heks</span> i skoven.</p>', 'Should wrap word');
  assertEqual(result.explanations_matched, 1, 'One explanation matched');
  assertEqual(result.spans_injected, 1, 'One span injected');

  console.log('  Passed');
}

function testInjectVariant(): void {
  console.log('Testing injectWordExplanationSpans — variant matching...');

  const html = '<p>Heksene fløj afsted.</p>';
  const explanations = [{ id: 'uuid-1', word: 'heks', variants: ['heksene', 'heksen'] }];
  const result = injectWordExplanationSpans(html, explanations);
  assert(result.html.includes('<span data-word="uuid-1">Heksene</span>'), 'Should wrap variant');
  assertEqual(result.spans_injected, 1, 'One span injected for variant');

  console.log('  Passed');
}

function testInjectCaseInsensitive(): void {
  console.log('Testing injectWordExplanationSpans — case-insensitive, preserves case...');

  const html = '<p>HEKS og heks og Heks.</p>';
  const explanations = [{ id: 'uuid-1', word: 'heks', variants: null }];
  const result = injectWordExplanationSpans(html, explanations);
  assert(result.html.includes('<span data-word="uuid-1">HEKS</span>'), 'Should preserve uppercase');
  assert(result.html.includes('<span data-word="uuid-1">heks</span>'), 'Should preserve lowercase');
  assert(result.html.includes('<span data-word="uuid-1">Heks</span>'), 'Should preserve capitalized');
  assertEqual(result.spans_injected, 3, 'Three spans injected');

  console.log('  Passed');
}

function testInjectEntityAware(): void {
  console.log('Testing injectWordExplanationSpans — entity-aware: bl&aelig;st matched...');

  const html = '<p>Morgenen smagte af bl&aelig;st.</p>';
  const explanations = [{ id: 'uuid-1', word: 'blæst', variants: null }];
  const result = injectWordExplanationSpans(html, explanations);
  assert(result.html.includes('<span data-word="uuid-1">bl&aelig;st</span>'), 'Should wrap entity-encoded word');
  assertEqual(result.spans_injected, 1, 'One span injected');

  console.log('  Passed');
}

function testInjectLongerFirst(): void {
  console.log('Testing injectWordExplanationSpans — longer words first...');

  const html = '<p>Morgenmaden var god. Mad er godt.</p>';
  const explanations = [
    { id: 'uuid-1', word: 'mad', variants: null },
    { id: 'uuid-2', word: 'morgenmaden', variants: null },
  ];
  const result = injectWordExplanationSpans(html, explanations);
  assert(result.html.includes('<span data-word="uuid-2">Morgenmaden</span>'), 'Should wrap morgenmaden as whole word');
  assert(result.html.includes('<span data-word="uuid-1">Mad</span>'), 'Should wrap standalone mad');
  // "mad" inside "Morgenmaden" should NOT be wrapped
  assert(!result.html.includes('Morgen<span'), 'Should not split morgenmaden');

  console.log('  Passed');
}

function testInjectNoMatchInsideAttributes(): void {
  console.log('Testing injectWordExplanationSpans — no match inside HTML attributes...');

  const html = '<p class="heks-style">Der var en heks.</p>';
  const explanations = [{ id: 'uuid-1', word: 'heks', variants: null }];
  const result = injectWordExplanationSpans(html, explanations);
  assert(result.html.includes('class="heks-style"'), 'Attribute should be untouched');
  assert(result.html.includes('<span data-word="uuid-1">heks</span>'), 'Text content should be wrapped');

  console.log('  Passed');
}

function testInjectIdempotent(): void {
  console.log('Testing injectWordExplanationSpans — idempotent (strip+inject)...');

  const html = '<p>Der var en <span data-word="old-uuid">heks</span> i skoven.</p>';
  const explanations = [{ id: 'new-uuid', word: 'heks', variants: null }];
  // First strip, then inject
  const stripped = stripWordExplanationSpans(html);
  const result = injectWordExplanationSpans(stripped, explanations);
  assertEqual(result.html, '<p>Der var en <span data-word="new-uuid">heks</span> i skoven.</p>', 'Should re-wrap with new UUID');

  console.log('  Passed');
}

function testInjectPreservesDataAudio(): void {
  console.log('Testing injectWordExplanationSpans — preserves data-audio attrs...');

  const html = '<p data-audio="audio-uuid">Der var en heks.</p>';
  const explanations = [{ id: 'uuid-1', word: 'heks', variants: null }];
  const result = injectWordExplanationSpans(html, explanations);
  assert(result.html.includes('data-audio="audio-uuid"'), 'data-audio should be preserved');
  assert(result.html.includes('<span data-word="uuid-1">heks</span>'), 'Word should be wrapped');

  console.log('  Passed');
}

function testInjectAdjacentPunctuation(): void {
  console.log('Testing injectWordExplanationSpans — word adjacent to punctuation...');

  const html = '<p>Er det en heks? Ja, en heks!</p>';
  const explanations = [{ id: 'uuid-1', word: 'heks', variants: null }];
  const result = injectWordExplanationSpans(html, explanations);
  assert(result.html.includes('<span data-word="uuid-1">heks</span>?'), 'Should wrap before question mark');
  assert(result.html.includes('<span data-word="uuid-1">heks</span>!'), 'Should wrap before exclamation');
  assertEqual(result.spans_injected, 2, 'Two spans injected');

  console.log('  Passed');
}

function testInjectRealDanishContent(): void {
  console.log('Testing injectWordExplanationSpans — real Danish book content end-to-end...');

  const html = `<h1 data-audio="f47ca19f">Kapitel 1 &ndash; Heksen udenfor nr. 17</h1>
<p data-audio="p1">Morgenen smagte af bl&aelig;st. Hele vejen ned ad bakken fra Lunas hus l&oslash;d vinden som en gammel ugle.</p>
<p data-audio="p2">Luna trak heksehatten godt ned i panden, og samlede sin udkl&aelig;dnings-kappe om sig.&nbsp;</p>
<p><img src="https://cms.readflow.dk/assets/63193db6.png" /></p>
<p data-audio="p3">&ldquo;Du f&oslash;lger efter mig,&rdquo; sagde Luna.</p>`;

  const explanations = [
    { id: 'exp-1', word: 'blæst', variants: null },
    { id: 'exp-2', word: 'heksehatten', variants: ['heksehat'] },
    { id: 'exp-3', word: 'udklædnings-kappe', variants: null },
  ];

  const stripped = stripWordExplanationSpans(html);
  const result = injectWordExplanationSpans(stripped, explanations);

  assert(result.html.includes('<span data-word="exp-1">bl&aelig;st</span>'), 'blæst should be wrapped with entity preserved');
  assert(result.html.includes('<span data-word="exp-2">heksehatten</span>'), 'heksehatten should be wrapped');
  assert(result.html.includes('<span data-word="exp-3">udkl&aelig;dnings-kappe</span>'), 'udklædnings-kappe should be wrapped with entity');
  assert(result.html.includes('data-audio="f47ca19f"'), 'data-audio preserved on h1');
  assert(result.html.includes('data-audio="p1"'), 'data-audio preserved on p');
  assert(result.html.includes('<img src='), 'Image tag untouched');
  assertEqual(result.explanations_matched, 3, 'Three explanations matched');

  console.log('  Passed');
}

function testInjectNoMatchReturnsOriginal(): void {
  console.log('Testing injectWordExplanationSpans — no matches returns original...');

  const html = '<p>Ingen ord matcher her.</p>';
  const explanations = [{ id: 'uuid-1', word: 'zebra', variants: null }];
  const result = injectWordExplanationSpans(html, explanations);
  assertEqual(result.html, html, 'HTML should be unchanged');
  assertEqual(result.explanations_matched, 0, 'Zero matched');
  assertEqual(result.spans_injected, 0, 'Zero injected');

  console.log('  Passed');
}

function testInjectEmptyExplanations(): void {
  console.log('Testing injectWordExplanationSpans — empty explanations array...');

  const html = '<p>Hello world.</p>';
  const result = injectWordExplanationSpans(html, []);
  assertEqual(result.html, html, 'HTML should be unchanged');

  console.log('  Passed');
}

function testInjectWordBoundary(): void {
  console.log('Testing injectWordExplanationSpans — respects word boundaries...');

  const html = '<p>Det er uhekseagtigt.</p>';
  const explanations = [{ id: 'uuid-1', word: 'heks', variants: null }];
  const result = injectWordExplanationSpans(html, explanations);
  // "heks" inside "uhekseagtigt" should NOT match - it's not a standalone word
  assertEqual(result.spans_injected, 0, 'Should not match inside compound word');

  console.log('  Passed');
}

function testInjectMultipleExplanations(): void {
  console.log('Testing injectWordExplanationSpans — multiple different explanations...');

  const html = '<p>Heksen og trolden var venner.</p>';
  const explanations = [
    { id: 'uuid-1', word: 'heksen', variants: null },
    { id: 'uuid-2', word: 'trolden', variants: null },
  ];
  const result = injectWordExplanationSpans(html, explanations);
  assert(result.html.includes('<span data-word="uuid-1">Heksen</span>'), 'heksen wrapped');
  assert(result.html.includes('<span data-word="uuid-2">trolden</span>'), 'trolden wrapped');
  assertEqual(result.explanations_matched, 2, 'Two matched');
  assertEqual(result.spans_injected, 2, 'Two injected');

  console.log('  Passed');
}

// Run all tests
function runAllTests(): void {
  console.log('='.repeat(60));
  console.log('Running Word Explanation Tests');
  console.log('='.repeat(60));
  console.log('');

  try {
    // splitHtmlSegments
    testSplitHtmlSegments();

    // stripWordExplanationSpans
    testStripBasic();
    testStripWithInnerTags();
    testStripMultiple();

    // buildEntityAwarePattern
    testPatternPlainAscii();
    testPatternAeMatch();
    testPatternOeMatch();

    // injectWordExplanationSpans
    testInjectBasicWord();
    testInjectVariant();
    testInjectCaseInsensitive();
    testInjectEntityAware();
    testInjectLongerFirst();
    testInjectNoMatchInsideAttributes();
    testInjectIdempotent();
    testInjectPreservesDataAudio();
    testInjectAdjacentPunctuation();
    testInjectRealDanishContent();
    testInjectNoMatchReturnsOriginal();
    testInjectEmptyExplanations();
    testInjectWordBoundary();
    testInjectMultipleExplanations();

    console.log('');
    console.log('='.repeat(60));
    console.log('All word explanation tests passed!');
    console.log('='.repeat(60));
    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('='.repeat(60));
    console.error('Test failed:');
    console.error(error);
    console.error('='.repeat(60));
    process.exit(1);
  }
}

runAllTests();
