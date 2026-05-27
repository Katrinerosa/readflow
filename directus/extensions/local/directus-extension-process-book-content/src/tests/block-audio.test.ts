/**
 * Unit tests for block extraction and data-audio injection
 */

import { extractBlocks, injectDataAudioAttributes } from '../block-audio';

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

// ===================== extractBlocks tests =====================

function testBasicExtraction(): void {
  console.log('Testing basic h/p extraction...');

  const blocks = extractBlocks('<h1>Title</h1><p>Paragraph text.</p>');
  assertEqual(blocks.length, 2, 'Should extract 2 blocks');
  assertEqual(blocks[0].tag, 'h1', 'First block should be h1');
  assertEqual(blocks[0].text, 'Title', 'First block text');
  assertEqual(blocks[1].tag, 'p', 'Second block should be p');
  assertEqual(blocks[1].text, 'Paragraph text.', 'Second block text');

  console.log('  Passed');
}

function testMultipleHeadingLevels(): void {
  console.log('Testing multiple heading levels...');

  const blocks = extractBlocks('<h1>H1</h1><h2>H2</h2><h3>H3</h3><h4>H4</h4><h5>H5</h5><h6>H6</h6>');
  assertEqual(blocks.length, 6, 'Should extract 6 heading blocks');
  assertEqual(blocks[0].tag, 'h1', 'h1 tag');
  assertEqual(blocks[5].tag, 'h6', 'h6 tag');

  console.log('  Passed');
}

function testHtmlEntityDecoding(): void {
  console.log('Testing HTML entity decoding...');

  const blocks = extractBlocks('<p>bl&aelig;st l&oslash;d p&aring;</p>');
  assertEqual(blocks[0].text, 'blæst lød på', 'Should decode Danish entities');

  const blocks2 = extractBlocks('<h1>Kapitel 1 &ndash; Heksen</h1>');
  assertEqual(blocks2[0].text, 'Kapitel 1 \u2013 Heksen', 'Should decode ndash');

  console.log('  Passed');
}

function testNestedTagStripping(): void {
  console.log('Testing nested tag stripping...');

  const blocks = extractBlocks('<p>Text with <strong>bold</strong> and <em>italic</em> words.</p>');
  assertEqual(blocks[0].text, 'Text with bold and italic words.', 'Should strip nested tags, keep text');

  console.log('  Passed');
}

function testImageOnlyParagraphs(): void {
  console.log('Testing image-only paragraphs are skipped...');

  const html = '<p>Real text.</p><p><img src="/assets/abc.jpg" /></p><p>More text.</p>';
  const blocks = extractBlocks(html);
  assertEqual(blocks.length, 2, 'Should skip image-only paragraph');
  assertEqual(blocks[0].text, 'Real text.', 'First block');
  assertEqual(blocks[1].text, 'More text.', 'Second block');

  console.log('  Passed');
}

function testEmptyParagraphs(): void {
  console.log('Testing empty paragraphs are skipped...');

  const blocks = extractBlocks('<p></p><p>&nbsp;</p><p>  </p><p>Content</p>');
  assertEqual(blocks.length, 1, 'Should skip empty paragraphs');
  assertEqual(blocks[0].text, 'Content', 'Only real content');

  console.log('  Passed');
}

function testPreservesOrder(): void {
  console.log('Testing document order is preserved...');

  const html = '<h1>Chapter 1</h1><p>First para.</p><p>Second para.</p><h1>Chapter 2</h1><p>Third para.</p>';
  const blocks = extractBlocks(html);
  assertEqual(blocks.length, 5, 'Should extract 5 blocks');
  assertEqual(blocks[0].text, 'Chapter 1', 'Order 1');
  assertEqual(blocks[1].text, 'First para.', 'Order 2');
  assertEqual(blocks[2].text, 'Second para.', 'Order 3');
  assertEqual(blocks[3].text, 'Chapter 2', 'Order 4');
  assertEqual(blocks[4].text, 'Third para.', 'Order 5');

  console.log('  Passed');
}

function testHeadingWithDataAttribute(): void {
  console.log('Testing heading with data-audio attribute...');

  const blocks = extractBlocks('<h1 data-audio="f47ca19f-8362-4959-a202-4d5e98657e7c">Kapitel 1</h1>');
  assertEqual(blocks.length, 1, 'Should extract heading with attributes');
  assertEqual(blocks[0].text, 'Kapitel 1', 'Should get text content');

  console.log('  Passed');
}

function testRealBookContent(): void {
  console.log('Testing real book content snippet...');

  const html = `<h1 data-audio="f47ca19f">Kapitel 1 &ndash; Heksen udenfor nr. 17</h1>
<p>Morgenen smagte af bl&aelig;st. Hele vejen ned ad bakken fra Lunas Hus hus l&oslash;d vinden som en gammel ugle.</p>
<p>Luna trak heksehatten godt ned i panden, og samlede sin udkl&aelig;dnings-kappe om sig.&nbsp;</p>
<p><img src="https://cms.readflow.dk/assets/63193db6.png" /></p>
<p>&ldquo;Du f&oslash;lger efter mig,&rdquo; sagde Luna.</p>`;

  const blocks = extractBlocks(html);
  assertEqual(blocks.length, 4, 'Should extract 4 blocks (skip image-only p)');
  assertEqual(blocks[0].tag, 'h1', 'First is heading');
  assert(blocks[0].text.includes('Kapitel 1'), 'Heading has chapter title');
  assert(blocks[1].text.includes('blæst'), 'Decoded æ in paragraph');
  assert(blocks[2].text.includes('udklædnings-kappe'), 'Decoded æ and kept hyphen');
  assert(blocks[3].text.includes('følger'), 'Decoded ø in quoted text');

  console.log('  Passed');
}

function testEmptyInput(): void {
  console.log('Testing empty and edge cases...');

  assertEqual(extractBlocks('').length, 0, 'Empty string');
  assertEqual(extractBlocks('<div>Not a p or h tag</div>').length, 0, 'Non-matching tags');
  assertEqual(extractBlocks('plain text without tags').length, 0, 'Plain text');

  console.log('  Passed');
}

// ===================== injectDataAudioAttributes tests =====================

function testInjectBasic(): void {
  console.log('Testing basic data-audio injection...');

  const html = '<h1>Title</h1><p>Paragraph text.</p>';
  const audioMap = new Map([
    ['Title', 'uuid-1'],
    ['Paragraph text.', 'uuid-2'],
  ]);

  const result = injectDataAudioAttributes(html, audioMap);
  assertEqual(result, '<h1 data-audio="uuid-1">Title</h1><p data-audio="uuid-2">Paragraph text.</p>', 'Should inject data-audio on both tags');

  console.log('  Passed');
}

function testInjectUpdatesExisting(): void {
  console.log('Testing update of existing data-audio...');

  const html = '<h1 data-audio="old-uuid">Title</h1>';
  const audioMap = new Map([['Title', 'new-uuid']]);

  const result = injectDataAudioAttributes(html, audioMap);
  assertEqual(result, '<h1 data-audio="new-uuid">Title</h1>', 'Should replace old UUID with new');

  console.log('  Passed');
}

function testInjectSkipsImageOnly(): void {
  console.log('Testing injection skips image-only paragraphs...');

  const html = '<p><img src="/assets/abc.jpg" /></p>';
  const audioMap = new Map<string, string>();

  const result = injectDataAudioAttributes(html, audioMap);
  assertEqual(result, html, 'Image-only p should be unchanged');

  console.log('  Passed');
}

function testInjectSkipsEmpty(): void {
  console.log('Testing injection skips empty paragraphs...');

  const html = '<p></p><p>&nbsp;</p>';
  const audioMap = new Map<string, string>();

  const result = injectDataAudioAttributes(html, audioMap);
  assertEqual(result, html, 'Empty paragraphs should be unchanged');

  console.log('  Passed');
}

function testInjectPreservesOtherAttributes(): void {
  console.log('Testing injection preserves other attributes...');

  const html = '<p class="intro" style="color:red">Hello world</p>';
  const audioMap = new Map([['Hello world', 'uuid-x']]);

  const result = injectDataAudioAttributes(html, audioMap);
  assertEqual(result, '<p class="intro" style="color:red" data-audio="uuid-x">Hello world</p>', 'Should keep class and style, add data-audio');

  console.log('  Passed');
}

function testInjectNoMatchLeaveUnchanged(): void {
  console.log('Testing no match in map leaves tag unchanged...');

  const html = '<p>Not in map</p>';
  const audioMap = new Map([['Something else', 'uuid-y']]);

  const result = injectDataAudioAttributes(html, audioMap);
  assertEqual(result, html, 'No match should leave tag unchanged');

  console.log('  Passed');
}

function testInjectRealBookContent(): void {
  console.log('Testing injection with real book content and entities...');

  const html = `<h1>Kapitel 1 &ndash; Heksen</h1>
<p>Morgenen smagte af bl&aelig;st.</p>
<p><img src="/assets/img.png" /></p>
<p>&ldquo;Hej,&rdquo; sagde Luna.</p>`;

  const audioMap = new Map([
    ['Kapitel 1 \u2013 Heksen', 'uuid-h1'],
    ['Morgenen smagte af blæst.', 'uuid-p1'],
    ['\u201cHej,\u201d sagde Luna.', 'uuid-p2'],
  ]);

  const result = injectDataAudioAttributes(html, audioMap);
  assert(result.includes('data-audio="uuid-h1"'), 'h1 should get uuid');
  assert(result.includes('data-audio="uuid-p1"'), 'p1 should get uuid');
  assert(result.includes('data-audio="uuid-p2"'), 'p2 should get uuid');
  assert(!result.includes('<p data-audio"><img'), 'Image p should not get data-audio');

  console.log('  Passed');
}

function testInjectUpdatesExistingWithOtherAttrs(): void {
  console.log('Testing update existing data-audio with other attributes...');

  const html = '<h1 class="chapter" data-audio="old-id" id="ch1">Title</h1>';
  const audioMap = new Map([['Title', 'new-id']]);

  const result = injectDataAudioAttributes(html, audioMap);
  assert(result.includes('data-audio="new-id"'), 'Should have new UUID');
  assert(!result.includes('old-id'), 'Old UUID should be gone');
  assert(result.includes('class="chapter"'), 'class should be preserved');
  assert(result.includes('id="ch1"'), 'id should be preserved');

  console.log('  Passed');
}

function testInjectExactHtmlPreservation(): void {
  console.log('Testing exact HTML preservation (only data-audio changes)...');

  const html = `<h1 data-audio="old-uuid">Kapitel 1 &ndash; Heksen udenfor nr. 17</h1>
<p>Morgenen smagte af bl&aelig;st. Hele vejen ned ad bakken fra Lunas Hus hus l&oslash;d vinden som en gammel ugle.</p>
<p>Luna trak heksehatten godt ned i panden, og samlede sin udkl&aelig;dnings-kappe om sig.&nbsp;</p>
<p><img src="https://cms.readflow.dk/assets/63193db6.png" /></p>
<p>&ldquo;Du f&oslash;lger efter mig,&rdquo; sagde Luna.</p>
<p>  </p>
<p class="highlight" style="font-weight:bold">Wulfric <em>brummede</em> lavt.</p>`;

  const audioMap = new Map([
    ['Kapitel 1 \u2013 Heksen udenfor nr. 17', 'uuid-h1'],
    ['Morgenen smagte af blæst. Hele vejen ned ad bakken fra Lunas Hus hus lød vinden som en gammel ugle.', 'uuid-p1'],
    ['Luna trak heksehatten godt ned i panden, og samlede sin udklædnings-kappe om sig.\u00A0', 'uuid-p2'],
    ['\u201cDu følger efter mig,\u201d sagde Luna.', 'uuid-p3'],
    ['Wulfric brummede lavt.', 'uuid-p4'],
  ]);

  const result = injectDataAudioAttributes(html, audioMap);

  assert(result.includes('bl&aelig;st'), 'Entity &aelig; must stay encoded');
  assert(result.includes('l&oslash;d'), 'Entity &oslash; must stay encoded');
  assert(result.includes('&ndash;'), 'Entity &ndash; must stay encoded');
  assert(result.includes('&ldquo;'), 'Entity &ldquo; must stay encoded');
  assert(result.includes('&rdquo;'), 'Entity &rdquo; must stay encoded');
  assert(result.includes('udkl&aelig;dnings-kappe'), 'Entity in compound word must stay encoded');
  assert(result.includes('&nbsp;'), 'Entity &nbsp; must stay encoded');

  assert(result.includes('<em>brummede</em>'), '<em> tag must be preserved');
  assert(result.includes('<p><img src="https://cms.readflow.dk/assets/63193db6.png" /></p>'), 'Image paragraph must be completely untouched');
  assert(result.includes('<p>  </p>'), 'Whitespace paragraph must be completely untouched');
  assert(result.includes('class="highlight"'), 'class attribute must be preserved');
  assert(result.includes('style="font-weight:bold"'), 'style attribute must be preserved');

  assert(!result.includes('old-uuid'), 'Old data-audio UUID must be removed');
  assert(result.includes('data-audio="uuid-h1"'), 'h1 should get new UUID');
  assert(result.includes('data-audio="uuid-p1"'), 'p1 should get UUID');
  assert(result.includes('data-audio="uuid-p4"'), 'p4 with nested tags should get UUID');

  console.log('  Passed');
}

function testInjectNonMatchedTagsCompletelyUntouched(): void {
  console.log('Testing non-matched tags are byte-identical...');

  const html = '<h2>Only this matches</h2><p>This does not match</p><p class="x">Nor this</p>';
  const audioMap = new Map([['Only this matches', 'uuid-1']]);

  const result = injectDataAudioAttributes(html, audioMap);

  assert(result.includes('<p>This does not match</p>'), 'Non-matched p must be unchanged');
  assert(result.includes('<p class="x">Nor this</p>'), 'Non-matched p with attrs must be unchanged');
  assertEqual(result, '<h2 data-audio="uuid-1">Only this matches</h2><p>This does not match</p><p class="x">Nor this</p>', 'Full output must match exactly');

  console.log('  Passed');
}

function testInjectPreservesWhitespaceInContent(): void {
  console.log('Testing injection preserves inner HTML whitespace...');

  const html = '<p>  Text with  extra   spaces  </p>';
  const audioMap = new Map([['Text with extra spaces', 'uuid-ws']]);

  const result = injectDataAudioAttributes(html, audioMap);
  assertEqual(result, '<p data-audio="uuid-ws">  Text with  extra   spaces  </p>', 'Inner whitespace must be preserved exactly');

  console.log('  Passed');
}

function testInjectPreservesMultilineInnerHtml(): void {
  console.log('Testing injection preserves multiline inner HTML...');

  const innerContent = '\n  Some text with <strong>bold</strong>\n  and <em>italic</em> words.\n';
  const html = `<p>${innerContent}</p>`;
  const audioMap = new Map([['Some text with bold and italic words.', 'uuid-ml']]);

  const result = injectDataAudioAttributes(html, audioMap);
  assert(result.includes(innerContent), 'Multiline inner HTML must be preserved exactly');
  assert(result.includes('data-audio="uuid-ml"'), 'Should get data-audio');

  console.log('  Passed');
}

// Run all tests
function runAllTests(): void {
  console.log('='.repeat(60));
  console.log('Running Block Audio Tests');
  console.log('='.repeat(60));
  console.log('');

  try {
    // extractBlocks tests
    testBasicExtraction();
    testMultipleHeadingLevels();
    testHtmlEntityDecoding();
    testNestedTagStripping();
    testImageOnlyParagraphs();
    testEmptyParagraphs();
    testPreservesOrder();
    testHeadingWithDataAttribute();
    testRealBookContent();
    testEmptyInput();

    // injectDataAudioAttributes tests
    testInjectBasic();
    testInjectUpdatesExisting();
    testInjectSkipsImageOnly();
    testInjectSkipsEmpty();
    testInjectPreservesOtherAttributes();
    testInjectNoMatchLeaveUnchanged();
    testInjectRealBookContent();
    testInjectUpdatesExistingWithOtherAttrs();
    testInjectExactHtmlPreservation();
    testInjectNonMatchedTagsCompletelyUntouched();
    testInjectPreservesWhitespaceInContent();
    testInjectPreservesMultilineInnerHtml();

    console.log('');
    console.log('='.repeat(60));
    console.log('All block audio tests passed!');
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
