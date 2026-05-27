/**
 * Unit tests for sanitize module
 */

import { sanitizeHtml, DEFAULT_ALLOWED_TAGS, DEFAULT_ALLOWED_ATTRS } from '../sanitize';

// Test utilities
function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual(actual: string, expected: string, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}\n  Expected: ${JSON.stringify(expected)}\n  Actual:   ${JSON.stringify(actual)}`);
  }
}

// Test suites

function testHeadingNormalization(): void {
  console.log('Testing heading normalization...');

  assertEqual(
    sanitizeHtml('<h1>Title</h1>'),
    '<h1>Title</h1>',
    'h1 should remain unchanged'
  );

  assertEqual(
    sanitizeHtml('<h2>Title</h2>'),
    '<h1>Title</h1>',
    'h2 should convert to h1'
  );

  assertEqual(
    sanitizeHtml('<h3>Title</h3>'),
    '<h1>Title</h1>',
    'h3 should convert to h1'
  );

  assertEqual(
    sanitizeHtml('<h4>Title</h4>'),
    '<h1>Title</h1>',
    'h4 should convert to h1'
  );

  assertEqual(
    sanitizeHtml('<h5>Title</h5>'),
    '<h1>Title</h1>',
    'h5 should convert to h1'
  );

  assertEqual(
    sanitizeHtml('<h6>Title</h6>'),
    '<h1>Title</h1>',
    'h6 should convert to h1'
  );

  // Attrs on converted headings should be stripped
  assertEqual(
    sanitizeHtml('<h2 class="big" style="color:red">Title</h2>'),
    '<h1>Title</h1>',
    'Attributes on converted headings should be stripped'
  );

  // Attrs on h1 should be filtered normally
  assertEqual(
    sanitizeHtml('<h1 data-audio="abc" class="big">Title</h1>'),
    '<h1 data-audio="abc">Title</h1>',
    'h1 should keep allowed attrs and strip disallowed'
  );

  console.log('  All heading normalization tests passed');
}

function testAllowedTags(): void {
  console.log('Testing allowed tags...');

  assertEqual(
    sanitizeHtml('<p>text</p>'),
    '<p>text</p>',
    'p should be kept'
  );

  assertEqual(
    sanitizeHtml('<em>text</em>'),
    '<em>text</em>',
    'em should be kept'
  );

  assertEqual(
    sanitizeHtml('<strong>text</strong>'),
    '<strong>text</strong>',
    'strong should be kept'
  );

  assertEqual(
    sanitizeHtml('<span data-word="cat">cat</span>'),
    '<span data-word="cat">cat</span>',
    'span with data-word should be kept'
  );

  assertEqual(
    sanitizeHtml('<img src="test.jpg">'),
    '<img src="test.jpg" />',
    'img should be kept and self-close'
  );

  console.log('  All allowed tags tests passed');
}

function testDisallowedTags(): void {
  console.log('Testing disallowed tag stripping...');

  assertEqual(
    sanitizeHtml('<div>text</div>'),
    'text',
    'div should be stripped, text preserved'
  );

  assertEqual(
    sanitizeHtml('<table><tr><td>cell</td></tr></table>'),
    'cell',
    'table elements should be stripped, text preserved'
  );

  assertEqual(
    sanitizeHtml('<script>alert("xss")</script>'),
    'alert("xss")',
    'script should be stripped'
  );

  assertEqual(
    sanitizeHtml('<style>body{color:red}</style>'),
    'body{color:red}',
    'style should be stripped'
  );

  assertEqual(
    sanitizeHtml('<a href="http://example.com">link</a>'),
    'link',
    'a should be stripped, text preserved'
  );

  assertEqual(
    sanitizeHtml('<b>bold</b>'),
    'bold',
    'b should be stripped (use strong instead)'
  );

  assertEqual(
    sanitizeHtml('<u>underline</u>'),
    'underline',
    'u should be stripped'
  );

  console.log('  All disallowed tag tests passed');
}

function testAttributeFiltering(): void {
  console.log('Testing attribute filtering...');

  assertEqual(
    sanitizeHtml('<p data-audio="123">text</p>'),
    '<p data-audio="123">text</p>',
    'data-audio should be kept'
  );

  assertEqual(
    sanitizeHtml('<span data-word="hello">hello</span>'),
    '<span data-word="hello">hello</span>',
    'data-word should be kept'
  );

  assertEqual(
    sanitizeHtml('<img src="photo.jpg">'),
    '<img src="photo.jpg" />',
    'src should be kept'
  );

  assertEqual(
    sanitizeHtml('<p class="intro" style="color:red" onclick="alert()">text</p>'),
    '<p>text</p>',
    'class, style, onclick should be stripped'
  );

  assertEqual(
    sanitizeHtml('<span data-word="hi" class="highlight" data-audio="abc">hi</span>'),
    '<span data-word="hi" data-audio="abc">hi</span>',
    'Multiple attrs: keep allowed, strip disallowed'
  );

  console.log('  All attribute filtering tests passed');
}

function testEmptyParagraphRemoval(): void {
  console.log('Testing empty paragraph removal...');

  assertEqual(
    sanitizeHtml('<p></p>'),
    '',
    'Empty p should be removed'
  );

  assertEqual(
    sanitizeHtml('<p> </p>'),
    '',
    'Whitespace-only p should be removed'
  );

  assertEqual(
    sanitizeHtml('<p>&nbsp;</p>'),
    '',
    'nbsp-only p should be removed'
  );

  assertEqual(
    sanitizeHtml('<p><br></p>'),
    '',
    'br-only p should be removed'
  );

  assertEqual(
    sanitizeHtml('<p><br/></p>'),
    '',
    'br/-only p should be removed'
  );

  assertEqual(
    sanitizeHtml('<p><br /></p>'),
    '',
    'br /-only p should be removed'
  );

  assertEqual(
    sanitizeHtml('<p> &nbsp; <br> </p>'),
    '',
    'Mixed whitespace/nbsp/br p should be removed'
  );

  assertEqual(
    sanitizeHtml('<p>actual text</p>'),
    '<p>actual text</p>',
    'Non-empty p should be kept'
  );

  console.log('  All empty paragraph removal tests passed');
}

function testSelfClosingTags(): void {
  console.log('Testing self-closing tags...');

  assertEqual(
    sanitizeHtml('<img src="a.jpg">'),
    '<img src="a.jpg" />',
    'img without / should self-close'
  );

  assertEqual(
    sanitizeHtml('<img src="a.jpg"/>'),
    '<img src="a.jpg" />',
    'img with /> should self-close'
  );

  assertEqual(
    sanitizeHtml('<img src="a.jpg" />'),
    '<img src="a.jpg" />',
    'img with /> should self-close'
  );

  console.log('  All self-closing tag tests passed');
}

function testHtmlEntities(): void {
  console.log('Testing HTML entities in text...');

  assertEqual(
    sanitizeHtml('<p>bl&aelig;st &amp; regn</p>'),
    '<p>bl&aelig;st &amp; regn</p>',
    'HTML entities in text should pass through unchanged'
  );

  assertEqual(
    sanitizeHtml('<p>&ldquo;quoted&rdquo;</p>'),
    '<p>&ldquo;quoted&rdquo;</p>',
    'Smart quote entities should pass through'
  );

  console.log('  All HTML entity tests passed');
}

function testNestedDisallowedTags(): void {
  console.log('Testing nested disallowed tags...');

  assertEqual(
    sanitizeHtml('<div><span data-word="hi"><b>hi</b></span></div>'),
    '<span data-word="hi">hi</span>',
    'Nested disallowed tags stripped, allowed tags and text preserved'
  );

  assertEqual(
    sanitizeHtml('<section><div><p>text</p></div></section>'),
    '<p>text</p>',
    'Multiple nesting levels stripped correctly'
  );

  console.log('  All nested disallowed tag tests passed');
}

function testMixedCaseTags(): void {
  console.log('Testing mixed case tags...');

  assertEqual(
    sanitizeHtml('<P>text</P>'),
    '<p>text</p>',
    'Uppercase tags should be lowercased'
  );

  assertEqual(
    sanitizeHtml('<H2>title</H2>'),
    '<h1>title</h1>',
    'Uppercase heading tags should normalize'
  );

  assertEqual(
    sanitizeHtml('<DIV>text</DIV>'),
    'text',
    'Uppercase disallowed tags should be stripped'
  );

  console.log('  All mixed case tag tests passed');
}

function testRealWorldDanishContent(): void {
  console.log('Testing real-world Danish content...');

  const input = `<h2>Kapitel 1</h2>
<p>Der var engang en lille dreng, som hed <strong>Emil</strong>.</p>
<p class="intro">Han boede i <em>Katthult</em> i Lönneberga.</p>
<p></p>
<p>&nbsp;</p>
<div>En ulovlig blok</div>
<p>Han var <b>meget</b> <u>uartig</u>.</p>`;

  const expected = `<h1>Kapitel 1</h1>
<p>Der var engang en lille dreng, som hed <strong>Emil</strong>.</p>
<p>Han boede i <em>Katthult</em> i Lönneberga.</p>


En ulovlig blok
<p>Han var meget underline.</p>`;

  // We can't predict exact whitespace after stripping, so let's test individual transformations
  const result = sanitizeHtml(input);

  assert(result.includes('<h1>Kapitel 1</h1>'), 'h2 should become h1');
  assert(result.includes('<strong>Emil</strong>'), 'strong should be preserved');
  assert(result.includes('<em>Katthult</em>'), 'em should be preserved');
  assert(!result.includes('class="intro"'), 'class attr should be stripped');
  assert(!result.includes('<div>'), 'div tags should be stripped');
  assert(result.includes('En ulovlig blok'), 'div inner text should be preserved');
  assert(!result.includes('<b>'), 'b tags should be stripped');
  assert(!result.includes('<u>'), 'u tags should be stripped');
  assert(!result.includes('<p></p>'), 'Empty p should be removed');
  assert(!result.includes('<p>&nbsp;</p>'), 'nbsp p should be removed');

  console.log('  All real-world Danish content tests passed');
}

function testEdgeCases(): void {
  console.log('Testing edge cases...');

  assertEqual(
    sanitizeHtml(''),
    '',
    'Empty string should return empty'
  );

  assertEqual(
    sanitizeHtml('plain text no html'),
    'plain text no html',
    'Plain text without HTML should pass through'
  );

  assertEqual(
    sanitizeHtml('<p>first</p><p>second</p>'),
    '<p>first</p><p>second</p>',
    'Multiple paragraphs should be kept'
  );

  console.log('  All edge case tests passed');
}

function testCustomOptions(): void {
  console.log('Testing custom options...');

  assertEqual(
    sanitizeHtml('<p>text</p><div>other</div>', { allowedTags: ['div'], allowedAttrs: [] }),
    'text<div>other</div>',
    'Custom allowedTags should override defaults'
  );

  assertEqual(
    sanitizeHtml('<p class="x" data-audio="y">text</p>', { allowedTags: ['p'], allowedAttrs: ['class'] }),
    '<p class="x">text</p>',
    'Custom allowedAttrs should override defaults'
  );

  console.log('  All custom options tests passed');
}

// Run all tests
function runAllTests(): void {
  console.log('\n=== Sanitize Module Tests ===\n');

  testHeadingNormalization();
  testAllowedTags();
  testDisallowedTags();
  testAttributeFiltering();
  testEmptyParagraphRemoval();
  testSelfClosingTags();
  testHtmlEntities();
  testNestedDisallowedTags();
  testMixedCaseTags();
  testRealWorldDanishContent();
  testEdgeCases();
  testCustomOptions();

  console.log('\n=== All sanitize tests passed! ===\n');
}

runAllTests();
