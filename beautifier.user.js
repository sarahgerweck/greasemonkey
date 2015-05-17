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
	var regexes = [
		[/([^\s'])'([^']|$)/g,   '$1’$2'],
		[/(^|\s)'(\S)/g,         '$1‘$2'],
		[/(^|\s)"([^\s"])/g,     '$1“$2'],
		[/([^\s"])"([,.\s]|$)/g, '$1”$2'],
		[/(\d)-(\d)/g,           '$1–$2'],
		[/\s+-\s+|--| -- /g,     '—'],
		[/\Q...\E/g,             '…']
	];
	var replacer = 'x.replace(y[0], y[1])'.lambda();
	exports.apply = function(s) {
		return fjs.fold(replacer, s, regexes);
	};
	return exports;
})();

var TextMapper = function(xpath) {
	var exports = {};

	var currentTextNodes = function() {
		return document.evaluate(xpath, document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
	};

	exports.apply = function(callback) {
		var textNodes = currentTextNodes();
		for (var i = 0; i < textNodes.snapshotLength; i++) {
			var node = textNodes.snapshotItem(i);
			node.data = callback(node.data)
		}
	};

	return exports;
};

function smallCapCoC() {
	var ccPath = '/html/body/center/table/tbody//*[contains(text(), "headed \“CTHULHU CULT")]';
	var ccNodes =
		document.evaluate(ccPath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
	var ccn = ccNodes.singleNodeValue;

	var styles = 'font-varant: small-caps; font-variant-caps: all-small-caps;';
	var newHtml = '<span style="' + styles + '">cthulhu cult</span>';
	if (ccn) {
		ccn.innerHTML = ccn.innerHTML.replace(/CTHULHU CULT/g, newHtml);
	}
}

// Apply basic beautification to the page.
var mapper = TextMapper('/html/body/center/table/tbody//text()');
mapper.apply(Beautifier.apply);

// Beautify a particular bit in Call of Cthulhu with small caps.
smallCapCoC();
