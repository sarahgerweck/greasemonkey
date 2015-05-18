// ==UserScript==
// @name        LovecraftEmDashes
// @namespace   http://gerweck.org/
// @include     http://www.dagonbytes.com/thelibrary/lovecraft/*.htm
// @version     1
// @grant       none
// @require     https://raw.githubusercontent.com/leecrossley/functional-js/master/functional.min.js
// ==/UserScript==

var Beautifier = (function() {
	var exports = {};

	/** Basic replacement function */
	var replacer = function(x, y) {
		return x.replace(y[0], y[1]);
	};
	var applyRegexes = fjs.curry(function(re, s) {
		return fjs.fold(replacer, s, re);
	});

	/** Helpers for generating small caps */
	var smallCapStyle = 'font-varant: small-caps; font-variant-caps: all-small-caps;';
	exports.smallCapSpan = function(body) {
		return '<span style="' + smallCapStyle + '">' + body + '</span>';
	};

	/** Standard typographic formatting */
	var regexes = [
		[/^'s(\s)/g,             '’s$1'],
		[/([^\s'])'([^']|$)/g,   '$1’$2'],
		[/(^|\s)'(\S)/g,         '$1‘$2'],
		[/(^|\s)"([^\s"])/g,     '$1“$2'],
		[/([^\s"])"([,.\s]|$)/g, '$1”$2'],
		[/(\d)-(\d)/g,           '$1–$2'],
		[/\s+-\s+|--| -- /g,     '—'],
		[/\Q...\E/g,             '…']
	];
	exports.apply = applyRegexes(regexes);

	/** Small-cap typesetting of am & pm */
	var ampmRegexes = [
		[/\bA\.M\./g, exports.smallCapSpan('am')],
		[/\bP\.M\./g, exports.smallCapSpan('pm')]
	];
	exports.ampm = applyRegexes(ampmRegexes);

	return exports;
})();

var TextMapper = function(xpath) {
	var exports = {};

	var forAllNodes = function(mapper) {
		var nodes =
			document.evaluate(xpath, document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
		for (var i = 0; i < nodes.snapshotLength; i++) {
			var node = nodes.snapshotItem(i);
			mapper(node);
		}
	};

	/** Remap just the text of all the matching nodes. */
	exports.data = function(mapper) {
		var dataMapper = function(n) { n.data = mapper(n.data) };
		forAllNodes(dataMapper);
	};

	exports.dataRE = function(re, repl) {
		var mapper = function(s) {
			return s.replace(re, repl);
		};
		exports.data(mapper);
	}

	/** Remap the innerHTML of all matching nodes. */
	exports.html = function(mapper) {
		var htmlMapper = function(n) { n.innerHTML = mapper(n.innerHTML) };
		forAllNodes(htmlMapper);
	};

	return exports;
};

function smallCapCoC() {
	var ccPath = '/html/body/center/table/tbody//*[contains(text(), "headed \“CTHULHU CULT")]';
	var ccNodes =
		document.evaluate(ccPath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
	var ccn = ccNodes.singleNodeValue;

	var newHtml = Beautifier.smallCapSpan('cthulhu cult');
	if (ccn) {
		ccn.innerHTML = ccn.innerHTML.replace(/CTHULHU CULT/g, newHtml);
	}
}

// Apply basic beautification to the page.
var mapper = TextMapper('/html/body/center/table/tbody//text()');
mapper.data(Beautifier.apply);

var fullTextMapper = TextMapper('/html/body/center/table/tbody');
fullTextMapper.html(Beautifier.ampm);

// Beautify a particular bit in Call of Cthulhu with small caps.
smallCapCoC();

mapper.dataRE(/the way clown toward/g, 'the way down toward');
