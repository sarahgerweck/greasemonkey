// ==UserScript==
// @name        LovecraftEmDashes
// @namespace   http://gerweck.org/
// @include     http://www.dagonbytes.com/thelibrary/lovecraft/*.htm
// @version     1
// @grant       none
// @require     http://osteele.com/sources/javascript/functional/functional.min.js
// @require     https://raw.githubusercontent.com/leecrossley/functional-js/master/functional.min.js
// ==/UserScript==
var Beautifier = (function() {
	var exports = {};

	/** Basic replacement function */
	var replacer = 'x.replace(y[0], y[1])'.lambda();

	/** Helpers for generating small caps */
	var smallCapStyle = 'font-varant: small-caps; font-variant-caps: all-small-caps;';
	exports.smallCapSpan = function(body) {
		return '<span style="' + smallCapStyle + '">' + body + '</span>';
	};

	/** Standard typographic formatting */
	var regexes = [
		[/([^\s'])'([^']|$)/g,   '$1’$2'],
		[/(^|\s)'(\S)/g,         '$1‘$2'],
		[/(^|\s)"([^\s"])/g,     '$1“$2'],
		[/([^\s"])"([,.\s]|$)/g, '$1”$2'],
		[/(\d)-(\d)/g,           '$1–$2'],
		[/\s+-\s+|--| -- /g,     '—'],
		[/\Q...\E/g,             '…']
	];
	exports.apply = function(s) {
		return fjs.fold(replacer, s, regexes);
	};

	/** Small-cap typesetting of am & pm */
	var ampmRegexes = [
		[/\bA\.M\./g, exports.smallCapSpan('am')],
		[/\bP\.M\./g, exports.smallCapSpan('pm')]
	];
	exports.ampm = function(s) {
		return fjs.fold(replacer, s, ampmRegexes);
	};

	return exports;
})();

var TextMapper = function(xpath) {
	var exports = {};

	var currentNodes = function() {
		return document.evaluate(xpath, document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
	};

	/** Remap just the text of all the matching nodes. */
	exports.data = function(callback) {
		var textNodes = currentNodes();
		for (var i = 0; i < textNodes.snapshotLength; i++) {
			var node = textNodes.snapshotItem(i);
			node.data = callback(node.data)
		}
	};

	/** Remap the innerHTML of all matching nodes. */
	exports.html = function(mapper) {
		var nodes = document.evaluate(xpath, document, null, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null);
		var node = nodes.iterateNext();
		while (node) {
			node.innerHTML = mapper(node.innerHTML)
			node = nodes.iterateNext();
		}
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

// Beautify a particular bit in Call of Cthulhu with small caps.
smallCapCoC();

var fullTextMapper = TextMapper('/html/body/center/table/tbody');
fullTextMapper.html(Beautifier.ampm);
