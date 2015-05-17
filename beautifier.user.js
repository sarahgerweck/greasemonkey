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

var mapper = TextMapper('/html/body/center/table/tbody//text()');
mapper.apply(Beautifier.apply);

// Doesn't work because it doesn't get parsed as HTML. :-(
// mapper.apply(function(text) {
//   return text.replace(/CTHULHU CULT/g, '<span style="font-varant: small-caps;">cthulhu cult</span>');
// })
