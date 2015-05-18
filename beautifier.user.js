// ==UserScript==
// @name        LovecraftEmDashes
// @namespace   http://gerweck.org/
// @include     http://www.dagonbytes.com/thelibrary/lovecraft/*.htm
// @version     1
// @grant       none
// @require     https://raw.githubusercontent.com/leecrossley/functional-js/master/functional.min.js
// ==/UserScript==

var RegexUtil = (function() {
	var exports = {};

	/** Basic replacement function */
	var replacer = function(x, y) {
		return x.replace(y[0], y[1]);
	};

	/** Apply many regexes in sequence */
	exports.multiRegex = fjs.curry(function(re, s) {
		return fjs.fold(replacer, s, re);
	});

	return exports;
})();

var Beautifier = (function() {
	var exports = {};

	/* Import a helper function from regex utils. */
	var applyRegexes = RegexUtil.multiRegex;

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

	var forUniqueNode = function(mapper) {
		var ccNodes =
			document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
		var ccn = ccNodes.singleNodeValue;
		if (ccn) {
			mapper(ccn);
		}
	};

	var dataMapperBuilder = fjs.curry(function(mapper, n) {
		n.data = mapper(n.data);
	});

	var htmlMapperBuilder = fjs.curry(function(mapper, n) {
		n.innerHTML = mapper(n.innerHTML);
	});

	var builder = function(nodeLister, mapperBuilder) {
		var fullFn = function(mapper) {
			nodeLister(mapperBuilder(mapper));
		}
		return fullFn;
	};

	var mapAllBuilder = function (b) {
		return builder(forAllNodes, b);
	}

	var mapUniqueBuilder = function(b) {
		return builder(forUniqueNode, b);
	}

	/** Remap just the text of all the matching nodes. */
	exports.data = mapAllBuilder(dataMapperBuilder);

	exports.dataRE = function(re, repl) {
		var mapper = function(s) {
			return s.replace(re, repl);
		};
		exports.data(mapper);
	};

	exports.dataMultiRE = function(regexes) {
		var mapper = RegexUtil.multiRegex(regexes);
		exports.data(mapper);
	};

	/** Remap the innerHTML of all matching nodes. */
	exports.html = mapAllBuilder(htmlMapperBuilder);

	/* TODO: There are lots of versions of very similar code here.
	 * I should probably be building an object for each of the four
	 * basic map types: data, uniqueData, html, uniqueHtml. Each of
	 * these four objects would inherit the same basic interface:
	 * genericMapper, singleRE, multiRE.
	 */
	exports.uniqueHtml = mapUniqueBuilder(htmlMapperBuilder);
	exports.uniqueHtmlRE = function(re, repl) {
		var mapper = function(s) {
			return s.replace(re, repl);
		};
		exports.uniqueHtml(mapper);
	};
	exports.uniqueHtmlMultiRE = function(regexes) {
		var mapper = RegexUtil.multiRegex(regexes);
		exports.uniqueHtml(mapper);
	};

	return exports;
};

function smallCapCoC() {
	var ccPath = '/html/body/center/table/tbody//*[contains(text(), "headed \“CTHULHU CULT")]';
	var newHtml = Beautifier.smallCapSpan('cthulhu cult')
	TextMapper(ccPath).uniqueHtmlRE(/CTHULHU CULT/g, newHtml);
}

// Apply basic beautification to the page.
var mapper = TextMapper('/html/body/center/table/tbody//text()');
mapper.data(Beautifier.apply);

var fullTextMapper = TextMapper('/html/body/center/table/tbody');
fullTextMapper.html(Beautifier.ampm);

// Beautify a particular bit in Call of Cthulhu with small caps.
smallCapCoC();

mapper.dataMultiRE([
	[/the way clown toward/g, 'the way down toward'],
	[/stung th disappointment/g, 'stung with disappointment'],
	[/Persuad-g/g, 'Persuading']
]);
